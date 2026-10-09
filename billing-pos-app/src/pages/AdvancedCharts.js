import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { exportMultipleSheets, exportMasterPDF, exportToCSV } from '../utils/exportUtils';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart as RechartsPieChart, ResponsiveContainer,
  Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import {
  Activity, BarChart3, Download, FileSpreadsheet, FileText, Image,
  PieChart, RefreshCw, Search, TrendingUp,
} from 'lucide-react';
import { format, startOfMonth, startOfQuarter, startOfYear, subDays } from 'date-fns';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be123c', '#4f46e5', '#65a30d', '#9333ea'];
const PRICE_BUCKETS = [
  { label: '0-499', min: 0, max: 499 },
  { label: '500-999', min: 500, max: 999 },
  { label: '1000-1499', min: 1000, max: 1499 },
  { label: '1500-1999', min: 1500, max: 1999 },
  { label: '2000-2999', min: 2000, max: 2999 },
  { label: '3000+', min: 3000, max: Infinity },
];

const money = (value) => Number(Number(value || 0).toFixed(2));
const qty = (value) => Number(Number(value || 0).toFixed(3));
const safeText = (value, fallback = 'Unknown') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const endOfDay = (date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

const bucketForPrice = (price) => PRICE_BUCKETS.find((bucket) => price >= bucket.min && price <= bucket.max)?.label || 'Other';

const upsert = (map, key, base, line) => {
  if (!map.has(key)) {
    map.set(key, {
      ...base,
      quantity: 0,
      revenue: 0,
      grossRevenue: 0,
      discount: 0,
      tax: 0,
      invoices: new Set(),
      customers: new Set(),
    });
  }
  const row = map.get(key);
  row.quantity += line.quantity;
  row.grossRevenue += line.grossRevenue;
  row.discount += line.discount;
  row.tax += line.tax;
  row.revenue += line.netRevenue;
  row.invoices.add(line.invoiceId);
  if (line.customerName) row.customers.add(line.customerName);
  return row;
};

const finalizeRows = (rows) => rows.map((row) => ({
  ...row,
  quantity: qty(row.quantity),
  revenue: money(row.revenue),
  grossRevenue: money(row.grossRevenue),
  discount: money(row.discount),
  tax: money(row.tax),
  invoiceCount: row.invoices?.size || row.invoiceCount || 0,
  customerCount: row.customers?.size || row.customerCount || 0,
  avgPrice: row.quantity > 0 ? money(row.revenue / row.quantity) : 0,
  share: 0,
})).map((row) => {
  const clean = { ...row };
  delete clean.invoices;
  delete clean.customers;
  return clean;
});

const withShare = (rows, key = 'revenue') => {
  const total = rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? Number(((Number(row[key] || 0) / total) * 100).toFixed(1)) : 0,
  }));
};

const findProduct = (productsById, productsByName, item) => (
  productsById.get(String(item.productId || '')) ||
  productsByName.get(String(item.name || '').toLowerCase()) ||
  null
);

const findVariant = (variantsById, product, item) => {
  const byId = variantsById.get(String(item.variantId || ''));
  if (byId) return byId;
  if (!Array.isArray(product?.variants)) return null;
  return product.variants.find((variant) => String(variant?.id) === String(item.variantId || '')) || null;
};

function getRange(range, customFrom, customTo) {
  const today = new Date();
  switch (range) {
    case 'today': return { from: new Date(format(today, 'yyyy-MM-dd')), to: today };
    case '7days': return { from: subDays(today, 7), to: today };
    case '30days': return { from: subDays(today, 30), to: today };
    case '90days': return { from: subDays(today, 90), to: today };
    case 'quarter': return { from: startOfQuarter(today), to: today };
    case 'year': return { from: startOfYear(today), to: today };
    case 'custom': return { from: new Date(customFrom), to: new Date(customTo) };
    default: return { from: startOfMonth(today), to: today };
  }
}

function buildAnalytics({ invoices, products, variants, returns, expenses, dateFrom, dateTo }) {
  const productsById = new Map(products.map((product) => [String(product.id), product]));
  const productsByName = new Map(products.map((product) => [String(product.name || '').toLowerCase(), product]));
  const variantsById = new Map(variants.map((variant) => [String(variant.id), variant]));
  const from = new Date(dateFrom);
  const to = endOfDay(dateTo);
  const validInvoices = invoices.filter((invoice) => {
    const date = new Date(invoice.date);
    return date >= from && date <= to && invoice.status !== 'Refund';
  });

  const categoryMap = new Map();
  const productMap = new Map();
  const sizeMap = new Map();
  const sizeNoPriceMap = new Map();
  const priceMap = new Map();
  const priceRangeMap = new Map();
  const sizePriceMap = new Map();
  const paymentMap = new Map();
  const customerMap = new Map();
  const dayMap = new Map();
  const lineRows = [];

  validInvoices.forEach((invoice) => {
    const invoiceDate = new Date(invoice.date);
    const day = format(invoiceDate, 'yyyy-MM-dd');
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const grossInvoice = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
    const discountRatio = grossInvoice > 0 ? Number(invoice.discountAmt || 0) / grossInvoice : 0;
    const taxRatio = grossInvoice > 0 ? Number(invoice.taxAmt || 0) / grossInvoice : 0;

    if (!dayMap.has(day)) {
      dayMap.set(day, { name: day, revenue: 0, grossRevenue: 0, orders: 0, quantity: 0, low: Infinity, high: 0, open: null, close: null });
    }
    const dayRow = dayMap.get(day);
    dayRow.orders += 1;
    dayRow.revenue += Number(invoice.total || 0);
    dayRow.grossRevenue += grossInvoice;

    if (Array.isArray(invoice.paymentBreakdown) && invoice.paymentBreakdown.length > 0) {
      invoice.paymentBreakdown.forEach((payment) => {
        const method = safeText(payment?.method, 'Other');
        paymentMap.set(method, (paymentMap.get(method) || 0) + Number(payment?.amount || 0));
      });
    } else {
      const method = safeText(invoice.paymentMode, 'Cash');
      paymentMap.set(method, (paymentMap.get(method) || 0) + Number(invoice.total || 0));
    }

    const customerKey = safeText(invoice.customerName || invoice.customerId, 'Walk-in');
    if (!customerMap.has(customerKey)) customerMap.set(customerKey, { name: customerKey, revenue: 0, orders: 0 });
    customerMap.get(customerKey).revenue += Number(invoice.total || 0);
    customerMap.get(customerKey).orders += 1;

    items.forEach((item) => {
      const product = findProduct(productsById, productsByName, item);
      const variant = findVariant(variantsById, product, item);
      const productName = safeText(product?.name || item.name, 'Unknown Product');
      const category = safeText(product?.category, 'Uncategorized');
      const size = safeText(item.size || variant?.size || variant?.label || product?.defaultSize, 'No Size');
      const salePrice = money(item.price);
      const quantity = qty(item.qty);
      const grossRevenue = money(salePrice * quantity);
      const discount = money(grossRevenue * discountRatio);
      const tax = money(grossRevenue * taxRatio);
      const netRevenue = money(grossRevenue - discount + tax);
      const line = {
        invoiceId: invoice.id || invoice.invoiceNumber,
        customerName: invoice.customerName,
        quantity,
        grossRevenue,
        discount,
        tax,
        netRevenue,
      };

      dayRow.quantity += quantity;
      dayRow.low = Math.min(dayRow.low, salePrice);
      dayRow.high = Math.max(dayRow.high, salePrice);
      if (dayRow.open === null) dayRow.open = salePrice;
      dayRow.close = salePrice;

      upsert(categoryMap, category, { name: category, category }, line);
      upsert(productMap, productName, { name: productName, productName, category }, line);
      upsert(sizeMap, size, { name: size, size }, line);
      upsert(sizeNoPriceMap, size, { name: size, size }, line);
      upsert(priceMap, String(salePrice), { name: String(salePrice), salePrice }, line);
      upsert(priceRangeMap, bucketForPrice(salePrice), { name: bucketForPrice(salePrice), priceRange: bucketForPrice(salePrice) }, line);
      upsert(sizePriceMap, `${size} @ ${salePrice}`, { name: `${size} @ ${salePrice}`, size, salePrice }, line);

      lineRows.push({
        Date: format(invoiceDate, 'dd-MM-yyyy'),
        Invoice: invoice.invoiceNumber || invoice.id || '',
        Customer: safeText(invoice.customerName, 'Walk-in'),
        Product: productName,
        Category: category,
        Size: size,
        SalePrice: salePrice,
        Qty: quantity,
        GrossRevenue: grossRevenue,
        Discount: discount,
        Tax: tax,
        NetRevenue: netRevenue,
        Payment: invoice.paymentMode || 'Cash',
      });
    });
  });

  const sortRevenue = (rows) => rows.sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
  const category = withShare(sortRevenue(finalizeRows(Array.from(categoryMap.values()))));
  const product = withShare(sortRevenue(finalizeRows(Array.from(productMap.values()))));
  const size = withShare(sortRevenue(finalizeRows(Array.from(sizeMap.values()))));
  const sizeNoPrice = withShare(finalizeRows(Array.from(sizeNoPriceMap.values())).sort((a, b) => b.quantity - a.quantity), 'quantity');
  const price = withShare(finalizeRows(Array.from(priceMap.values())).sort((a, b) => Number(a.salePrice) - Number(b.salePrice)));
  const priceRange = withShare(sortRevenue(finalizeRows(Array.from(priceRangeMap.values()))));
  const sizePrice = withShare(sortRevenue(finalizeRows(Array.from(sizePriceMap.values()))));
  const payment = withShare(Array.from(paymentMap.entries()).map(([name, value]) => ({ name, revenue: money(value), value: money(value), share: 0 })));
  const customersRanked = withShare(Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue));
  const revenueTrend = Array.from(dayMap.values()).sort((a, b) => a.name.localeCompare(b.name)).map((row) => ({
    ...row,
    revenue: money(row.revenue),
    grossRevenue: money(row.grossRevenue),
    avgOrder: row.orders ? money(row.revenue / row.orders) : 0,
    low: Number.isFinite(row.low) ? money(row.low) : 0,
    high: money(row.high),
    open: money(row.open || 0),
    close: money(row.close || 0),
    quantity: qty(row.quantity),
  }));

  const totalRevenue = validInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const totalGross = lineRows.reduce((sum, row) => sum + Number(row.GrossRevenue || 0), 0);
  const totalQty = lineRows.reduce((sum, row) => sum + Number(row.Qty || 0), 0);
  const totalExpenses = expenses.filter((expense) => {
    const date = new Date(expense.date);
    return date >= from && date <= to;
  }).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const returnCount = returns.filter((entry) => {
    const date = new Date(entry.date || entry.returnDate || entry.createdAt || entry.updatedAt || '');
    return !Number.isNaN(date.getTime()) && date >= from && date <= to;
  }).length;

  const summary = [
    { Metric: 'Invoices', Value: validInvoices.length },
    { Metric: 'Items Sold', Value: qty(totalQty) },
    { Metric: 'Gross Item Revenue', Value: money(totalGross) },
    { Metric: 'Sales Revenue', Value: money(totalRevenue) },
    { Metric: 'Average Bill Value', Value: validInvoices.length ? money(totalRevenue / validInvoices.length) : 0 },
    { Metric: 'Expenses', Value: money(totalExpenses) },
    { Metric: 'Estimated Net After Expenses', Value: money(totalRevenue - totalExpenses) },
    { Metric: 'Return Records', Value: returnCount },
    { Metric: 'Active Customers', Value: customersRanked.length },
  ];

  return {
    summary,
    category,
    product,
    size,
    sizeNoPrice,
    price,
    priceRange,
    sizePrice,
    payment,
    customers: customersRanked,
    revenueTrend,
    lineRows,
    inventory: products.map((productItem) => ({
      Product: productItem.name || '',
      Category: productItem.category || '',
      Stock: productItem.stock || 0,
      MinStock: productItem.minStock || 0,
      CostPrice: productItem.costPrice || 0,
      SellingPrice: productItem.price || 0,
      StockValue: money(Number(productItem.costPrice || 0) * Number(productItem.stock || 0)),
      Status: Number(productItem.stock || 0) <= Number(productItem.minStock || 5) ? 'Low Stock' : 'In Stock',
    })),
  };
}

function StatCard({ title, value, helper }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400">{title}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-[340px] flex flex-col items-center justify-center text-center text-gray-400">
      <BarChart3 size={44} className="mb-3 opacity-50" />
      <p className="font-semibold">No chart data for this range</p>
      <p className="text-xs mt-1">Try a wider date range or create invoices first.</p>
    </div>
  );
}

function CandlestickChart({ data, currency }) {
  const width = 900;
  const height = 320;
  const padding = { top: 18, right: 30, bottom: 42, left: 64 };
  const values = data.flatMap((row) => [row.open, row.high, row.low, row.close]).filter((value) => Number(value) > 0);
  if (!values.length) return <EmptyState />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const xStep = plotW / Math.max(1, data.length);
  const y = (value) => padding.top + ((max - value) / span) * plotH;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label="Price candlestick chart">
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const value = max - span * tick;
          const yy = padding.top + plotH * tick;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={yy} y2={yy} stroke="#e5e7eb" strokeDasharray="4 4" />
              <text x={padding.left - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="#6b7280">{formatCurrency(value, currency)}</text>
            </g>
          );
        })}
        {data.map((row, index) => {
          const center = padding.left + index * xStep + xStep / 2;
          const up = row.close >= row.open;
          const color = up ? '#059669' : '#dc2626';
          const bodyTop = y(Math.max(row.open, row.close));
          const bodyBottom = y(Math.min(row.open, row.close));
          const bodyHeight = Math.max(3, bodyBottom - bodyTop);
          return (
            <g key={row.name}>
              <line x1={center} x2={center} y1={y(row.high)} y2={y(row.low)} stroke={color} strokeWidth="2" />
              <rect x={center - Math.max(4, xStep * 0.22)} y={bodyTop} width={Math.max(8, xStep * 0.44)} height={bodyHeight} fill={color} rx="2" />
              {index % Math.ceil(data.length / 8 || 1) === 0 && (
                <text x={center} y={height - 18} textAnchor="middle" fontSize="10" fill="#6b7280">{format(new Date(row.name), 'dd MMM')}</text>
              )}
            </g>
          );
        })}
        <text x={padding.left} y={height - 4} fontSize="10" fill="#6b7280">Open, high, low, close sale prices by day</text>
      </svg>
    </div>
  );
}

export default function AdvancedCharts() {
  const { invoices, products, variants, returns, expenses, company } = useApp();
  const [range, setRange] = useState('month');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeReport, setActiveReport] = useState('category');
  const [chartType, setChartType] = useState('donut');
  const chartRef = useRef(null);
  const { from, to } = useMemo(() => getRange(range, customFrom, customTo), [range, customFrom, customTo]);
  const analytics = useMemo(() => buildAnalytics({
    invoices,
    products,
    variants,
    returns,
    expenses,
    dateFrom: from,
    dateTo: to,
  }), [invoices, products, variants, returns, expenses, from, to]);

  const reportOptions = [
    { key: 'category', label: 'Revenue by Category', data: analytics.category, valueKey: 'revenue' },
    { key: 'product', label: 'Most Demanding Items', data: analytics.product, valueKey: 'revenue' },
    { key: 'size', label: 'Demanding Size Revenue', data: analytics.size, valueKey: 'revenue' },
    { key: 'sizeNoPrice', label: 'Hot Size No Price Matter', data: analytics.sizeNoPrice, valueKey: 'quantity' },
    { key: 'priceRange', label: 'Price Range Breakdown', data: analytics.priceRange, valueKey: 'revenue' },
    { key: 'price', label: 'Price Wise Sales', data: analytics.price, valueKey: 'revenue' },
    { key: 'sizePrice', label: 'Size Plus Price Wise', data: analytics.sizePrice, valueKey: 'revenue' },
    { key: 'payment', label: 'Demand Payments', data: analytics.payment, valueKey: 'revenue' },
    { key: 'revenueTrend', label: 'Sales Revenue Trend', data: analytics.revenueTrend, valueKey: 'revenue' },
    { key: 'customers', label: 'Customer Demand', data: analytics.customers, valueKey: 'revenue' },
  ];
  const selected = reportOptions.find((item) => item.key === activeReport) || reportOptions[0];
  const chartData = selected.data.slice(0, activeReport === 'revenueTrend' ? 60 : 12);
  const hasData = chartData.length > 0;
  const top = analytics.product[0];
  const topSize = analytics.sizeNoPrice[0];
  const topPrice = analytics.priceRange[0];
  const totalRevenue = Number(analytics.summary.find((row) => row.Metric === 'Sales Revenue')?.Value || 0);
  const totalItems = Number(analytics.summary.find((row) => row.Metric === 'Items Sold')?.Value || 0);

  const workbookSheets = useMemo(() => ({
    Summary: analytics.summary,
    'Category Revenue': analytics.category,
    'Product Demand': analytics.product,
    'Size Revenue': analytics.size,
    'Size Qty No Price': analytics.sizeNoPrice,
    'Price Points': analytics.price,
    'Price Ranges': analytics.priceRange,
    'Size Price Mix': analytics.sizePrice,
    Payments: analytics.payment,
    Customers: analytics.customers,
    'Revenue Trend': analytics.revenueTrend,
    'Invoice Line Audit': analytics.lineRows,
    Inventory: analytics.inventory,
  }), [analytics]);

  const exportSvg = () => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendexa-${activeReport}-chart.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPng = () => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const image = new window.Image();
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(900, svg.viewBox?.baseVal?.width || svg.clientWidth || 900);
      canvas.height = Math.max(420, svg.viewBox?.baseVal?.height || svg.clientHeight || 420);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `vendexa-${activeReport}-chart.png`;
      link.click();
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  const renderChart = () => {
    if (!hasData) return <EmptyState />;
    if (chartType === 'candlestick') return <CandlestickChart data={analytics.revenueTrend.slice(-40)} currency={company.currency} />;
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => selected.valueKey === 'quantity' ? value : formatCurrency(value, company.currency)} />
            <Bar dataKey={selected.valueKey} radius={[6, 6, 0, 0]}>
              {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={activeReport === 'revenueTrend' ? analytics.revenueTrend : chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => selected.valueKey === 'quantity' ? value : formatCurrency(value, company.currency)} />
            <Area type="monotone" dataKey={selected.valueKey} stroke="#2563eb" fill="#bfdbfe" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === 'treemap') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <Treemap
            data={chartData}
            dataKey={selected.valueKey}
            nameKey="name"
            stroke="#fff"
            content={({ x, y, width, height, name, index }) => (
              <g>
                <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} rx={4} />
                {width > 40 && height > 20 && (
                  <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#fff" fontWeight={600}>
                    {String(name || '').slice(0, 12)}
                  </text>
                )}
              </g>
            )}
          />
        </ResponsiveContainer>
      );
    }
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={activeReport === 'revenueTrend' ? analytics.revenueTrend : chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => selected.valueKey === 'quantity' ? value : formatCurrency(value, company.currency)} />
            <Legend />
            <Bar dataKey="quantity" fill="#dbeafe" radius={[5, 5, 0, 0]} />
            <Line type="monotone" dataKey={selected.valueKey} stroke="#2563eb" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={360}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            dataKey={selected.valueKey}
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={135}
            paddingAngle={2}
            label={({ name, share }) => `${name} ${share || 0}%`}
            labelLine={false}
          >
            {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => selected.valueKey === 'quantity' ? value : formatCurrency(value, company.currency)} />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advanced Chart Analytics</h1>
          <p className="text-sm text-gray-500">Quick and deep analysis for revenue, sales demand, size, price, payments, hot items, and inventory movement.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportMultipleSheets(workbookSheets, `vendexa-advanced-chart-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)} className="btn-primary text-sm"><FileSpreadsheet size={16} /> Excel</button>
          <button onClick={() => exportMasterPDF(workbookSheets, `vendexa-advanced-chart-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`, company)} className="btn-secondary text-sm"><FileText size={16} /> PDF</button>
          <button onClick={() => exportToCSV(selected.data, `vendexa-${activeReport}-report.csv`)} className="btn-secondary text-sm"><Download size={16} /> CSV</button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {[
            ['today', 'Today'],
            ['7days', '7 Days'],
            ['30days', '30 Days'],
            ['month', 'Month'],
            ['90days', '90 Days'],
            ['quarter', 'Quarter'],
            ['year', 'Year'],
            ['custom', 'Custom'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setRange(key)} className={`px-3 py-2 rounded-lg text-xs font-medium ${range === key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{label}</button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="input" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
            <input type="date" className="input" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Sales Revenue" value={formatCurrency(totalRevenue, company.currency)} helper={`${analytics.summary[0]?.Value || 0} invoices`} />
        <StatCard title="Items Sold" value={totalItems.toLocaleString('en-IN')} helper="All billed quantities" />
        <StatCard title="Top Item" value={top?.name || 'No data'} helper={top ? formatCurrency(top.revenue, company.currency) : ''} />
        <StatCard title="Hot Size" value={topSize?.name || 'No data'} helper={topSize ? `${topSize.quantity} pcs` : ''} />
        <StatCard title="Best Price Range" value={topPrice?.name || 'No data'} helper={topPrice ? formatCurrency(topPrice.revenue, company.currency) : ''} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        <div className="card p-3 space-y-2">
          <div className="flex items-center gap-2 px-2 py-1 text-sm font-semibold"><Search size={16} /> Reports Covered</div>
          {reportOptions.map((item) => (
            <button key={item.key} onClick={() => setActiveReport(item.key)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeReport === item.key ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="card p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div>
              <h2 className="font-semibold">{selected.label}</h2>
              <p className="text-xs text-gray-500">{format(from, 'dd MMM yyyy')} to {format(to, 'dd MMM yyyy')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['donut', PieChart, 'Pie'],
                ['bar', BarChart3, 'Bar'],
                ['area', Activity, 'Area'],
                ['line', TrendingUp, 'Combo'],
                ['treemap', RefreshCw, 'Map'],
                ['candlestick', BarChart3, 'Candle'],
              ].map(([key, Icon, label]) => (
                <button key={key} onClick={() => setChartType(key)} className={`btn-secondary py-1 text-xs ${chartType === key ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20' : ''}`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
              <button onClick={exportPng} className="btn-secondary py-1 text-xs"><Image size={13} /> PNG</button>
              <button onClick={exportSvg} className="btn-secondary py-1 text-xs"><Download size={13} /> SVG</button>
            </div>
          </div>
          <div ref={chartRef}>{renderChart()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Quick Analysis</h3>
          <div className="space-y-3 text-sm">
            <p><span className="font-semibold text-primary-600">{top?.name || 'No item'}</span> is leading current demand.</p>
            <p><span className="font-semibold text-emerald-600">{topSize?.name || 'No size'}</span> is the hottest size when price is ignored.</p>
            <p><span className="font-semibold text-amber-600">{topPrice?.name || 'No price range'}</span> is the strongest price range.</p>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Deep Analysis</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>Use category and product charts for buying decisions, size charts for stock depth, and price charts for pricing strategy.</p>
            <p>Compare Hot Size No Price Matter with Size Plus Price Wise to separate pure size demand from price-driven demand.</p>
            <p>Payment demand highlights cash, UPI, card, credit, and split payment dependency for counter planning.</p>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Action Signals</h3>
          <div className="space-y-2 text-sm">
            {analytics.inventory.filter((item) => item.Status === 'Low Stock').slice(0, 5).map((item) => (
              <div key={item.Product} className="flex justify-between gap-3">
                <span className="truncate">{item.Product}</span>
                <span className="badge-red">Low {item.Stock}</span>
              </div>
            ))}
            {analytics.inventory.filter((item) => item.Status === 'Low Stock').length === 0 && <p className="text-gray-400">No low stock signals in product master.</p>}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold">Selected Report Data</h3>
          <span className="text-xs text-gray-400">{selected.data.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Name', 'Qty', 'Revenue', 'Share', 'Invoices', 'Avg Price'].map((head) => <th key={head} className="table-head">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {selected.data.slice(0, 25).map((row) => (
                <tr key={`${row.name}-${row.salePrice || ''}`}>
                  <td className="table-cell font-medium">{row.name}</td>
                  <td className="table-cell">{row.quantity ?? '-'}</td>
                  <td className="table-cell font-semibold">{formatCurrency(row.revenue || row.value || 0, company.currency)}</td>
                  <td className="table-cell">{row.share || 0}%</td>
                  <td className="table-cell">{row.invoiceCount || '-'}</td>
                  <td className="table-cell">{row.avgPrice ? formatCurrency(row.avgPrice, company.currency) : '-'}</td>
                </tr>
              ))}
              {selected.data.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No rows available</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

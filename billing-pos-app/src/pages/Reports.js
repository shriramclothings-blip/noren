import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, exportCSV } from '../utils/helpers';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { format, startOfMonth, startOfQuarter, startOfYear, eachDayOfInterval, subDays, startOfDay } from 'date-fns';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { buildSalesExcelReport, exportSalesExcelReport } from '../utils/salesExcelReport';

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];

export default function Reports() {
  const { invoices, products, variants, returns, expenses, customers, company } = useApp();
  const [tab, setTab] = useState('sales');
  const [dateRange, setDateRange] = useState('month'); // today, yesterday, 7days, 30days, 90days, quarter, year, custom
  const [customDateFrom, setCustomDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customDateTo, setCustomDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Memoized date range — prevents filteredInvoices/filteredExpenses from recomputing every render
  const { from: dateFrom, to: dateTo } = useMemo(() => {
    const today = new Date();
    let from, to = today;

    switch (dateRange) {
      case 'today':
        from = startOfDay(today);
        break;
      case 'yesterday':
        from = startOfDay(subDays(today, 1));
        to = new Date(subDays(today, 1).toISOString().split('T')[0] + 'T23:59:59');
        break;
      case '7days':
        from = subDays(today, 7);
        break;
      case '30days':
        from = subDays(today, 30);
        break;
      case '90days':
        from = subDays(today, 90);
        break;
      case 'quarter':
        from = startOfDay(startOfQuarter(today));
        break;
      case '180days':
        from = subDays(today, 180);
        break;
      case '365days':
        from = subDays(today, 365);
        break;
      case 'year':
        from = startOfDay(startOfYear(today));
        break;
      case 'custom':
        from = new Date(customDateFrom);
        to = new Date(customDateTo);
        break;
      default: // month
        from = startOfDay(startOfMonth(today));
    }

    return { from, to };
  }, [dateRange, customDateFrom, customDateTo]);

  const reportRangeLabel = useMemo(() => {
    const labels = {
      today: 'Today',
      yesterday: 'Yesterday',
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      '90days': 'Last 90 Days',
      quarter: 'Current Quarter',
      '180days': 'Last 6 Months',
      '365days': 'Last 365 Days',
      year: 'Current Year',
      custom: 'Custom Range',
      month: 'Current Month',
    };
    return `${labels[dateRange] || 'Selected Range'} (${format(dateFrom, 'dd-MM-yyyy')} to ${format(dateTo, 'dd-MM-yyyy')})`;
  }, [dateRange, dateFrom, dateTo]);

  const handleSalesWorkbookExport = () => {
    const reportData = buildSalesExcelReport({
      invoices,
      products,
      variants,
      returns,
      company,
      dateFrom,
      dateTo,
      rangeLabel: reportRangeLabel,
    });
    const safeRange = reportRangeLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80);
    exportSalesExcelReport(reportData, `sales-performance-report-${safeRange || format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    const d = new Date(inv.date);
    return d >= dateFrom && d <= new Date(dateTo.toISOString().split('T')[0] + 'T23:59:59') && inv.status !== 'Refund';
  }), [invoices, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const d = new Date(e.date);
    return d >= dateFrom && d <= new Date(dateTo.toISOString().split('T')[0] + 'T23:59:59');
  }), [expenses, dateFrom, dateTo]);

  const totalSales = filteredInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const grossProfit = filteredInvoices.reduce((s, inv) => {
    return s + inv.items.reduce((is, item) => {
      const prod = products.find(p => p.id === item.productId);
      return is + ((item.price - (prod?.costPrice || 0)) * item.qty);
    }, 0);
  }, 0);
  const netProfit = grossProfit - totalExpenses;
  const totalTax = filteredInvoices.reduce((s, i) => s + (i.taxAmt || 0), 0);
  const avgOrderValue = filteredInvoices.length > 0 ? totalSales / filteredInvoices.length : 0;

  // Daily sales chart
  const dailySales = useMemo(() => {
    const days = eachDayOfInterval({ start: dateFrom, end: dateTo }).slice(-30);
    return days.map(day => {
      const dayStr = format(day, 'MMM d');
      const dayInv = filteredInvoices.filter(inv => format(new Date(inv.date), 'MMM d') === dayStr);
      return { day: format(day, 'dd'), sales: dayInv.reduce((s, i) => s + (i.total || 0), 0), orders: dayInv.length };
    });
  }, [filteredInvoices, dateFrom, dateTo]);

  // Top products
  const topProducts = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => inv.items?.forEach(item => {
      if (!map[item.name]) map[item.name] = { revenue: 0, qty: 0 };
      map[item.name].revenue += item.price * item.qty;
      map[item.name].qty += item.qty;
    }));
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10).map(([name, v]) => ({ name, ...v }));
  }, [filteredInvoices]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => inv.items?.forEach(item => {
      const prod = products.find(p => p.name === item.name);
      const cat = prod?.category || 'Other';
      map[cat] = (map[cat] || 0) + (item.price * item.qty);
    }));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices, products]);

  // GST summary - uses per-invoice taxBreakdown for accuracy with mixed-rate carts
  const gstSummary = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => {
      // Prefer taxBreakdown[] for accurate mixed-rate GST reporting
      if (Array.isArray(inv.taxBreakdown) && inv.taxBreakdown.length > 0) {
        inv.taxBreakdown.forEach(tb => {
          const rate = tb.rate || 0;
          if (!map[rate]) map[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
          map[rate].taxable += tb.taxable || 0;
          map[rate].cgst += (tb.tax || 0) / 2;
          map[rate].sgst += (tb.tax || 0) / 2;
          map[rate].total += tb.tax || 0;
        });
      } else {
        // Fallback for legacy invoices without taxBreakdown
        const rate = inv.taxRate || 0;
        if (!map[rate]) map[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
        const taxable = (inv.subtotal || 0) - (inv.discountAmt || 0);
        map[rate].taxable += taxable;
        map[rate].cgst += (inv.taxAmt || 0) / 2;
        map[rate].sgst += (inv.taxAmt || 0) / 2;
        map[rate].total += inv.taxAmt || 0;
      }
    });
    return Object.entries(map).map(([rate, v]) => ({ rate: `${rate}%`, ...v }));
  }, [filteredInvoices]);

  // Payment mode breakdown
  const paymentBreakdown = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => {
      if (Array.isArray(inv.paymentBreakdown) && inv.paymentBreakdown.length > 0) {
        inv.paymentBreakdown.forEach((p) => {
          const k = String(p?.method || 'Other');
          map[k] = (map[k] || 0) + (Number(p?.amount) || 0);
        });
        return;
      }
      map[inv.paymentMode] = (map[inv.paymentMode] || 0) + (inv.total || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices]);

  const TABS = ['sales', 'profit', 'gst', 'inventory', 'customers'];

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      </div>

      {/* Date Range Filters */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: '90days', label: 'Last 90 Days' },
            { id: 'quarter', label: 'This Quarter' },
            { id: '180days', label: 'Last 6 Months' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom' },
          ].map(range => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                dateRange === range.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex gap-2">
            <input type="date" className="input flex-1" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} />
            <input type="date" className="input flex-1" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-primary-500" /><span className="text-xs text-gray-400">Total Revenue</span></div><p className="text-xl font-bold text-primary-600">{formatCurrency(totalSales, company.currency)}</p></div>
        <div className="card p-4"><div className="flex items-center gap-2 mb-1"><Package size={16} className="text-blue-500" /><span className="text-xs text-gray-400">Total Orders</span></div><p className="text-xl font-bold text-blue-600">{filteredInvoices.length}</p></div>
        <div className="card p-4"><div className="flex items-center gap-2 mb-1"><DollarSign size={16} className="text-emerald-500" /><span className="text-xs text-gray-400">Avg Order Value</span></div><p className="text-xl font-bold text-emerald-600">{formatCurrency(avgOrderValue, company.currency)}</p></div>
        <div className="card p-4"><div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-red-500" /><span className="text-xs text-gray-400">Expenses</span></div><p className="text-xl font-bold text-red-500">{formatCurrency(totalExpenses, company.currency)}</p></div>
        <div className="card p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className={netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} /><span className="text-xs text-gray-400">Net Profit</span></div><p className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(netProfit, company.currency)}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white dark:bg-gray-700 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Daily Sales Trend</h3>
              {(() => {
                const rows = filteredInvoices.map(i => ({ Invoice: i.invoiceNumber, Customer: i.customerName, Date: formatDate(i.date), Total: i.total, Payment: i.paymentMode, Status: i.status }));
                return (
                  <div className="flex gap-2">
                    <button onClick={handleSalesWorkbookExport} className="btn-primary py-1 text-xs"><Download size={12} /> Sales Workbook</button>
                    <button onClick={() => exportCSV(rows, 'sales-report.csv')} className="btn-secondary py-1 text-xs"><Download size={12} /> CSV</button>
                    <button onClick={() => exportToExcel(rows, 'sales-report.xlsx', 'Sales')} className="btn-secondary py-1 text-xs"><Download size={12} /> Excel</button>
                    <button onClick={() => exportToPDF(rows, 'sales-report.pdf', company)} className="btn-secondary py-1 text-xs"><Download size={12} /> PDF</button>
                  </div>
                );
              })()}
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailySales}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => formatCurrency(v, company.currency)} />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Top Selling Products</h3>
              <div className="space-y-2">
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-0.5"><span className="truncate">{p.name}</span><span className="font-semibold">{formatCurrency(p.revenue, company.currency)}</span></div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
                {topProducts.length === 0 && <p className="text-gray-400 text-sm">No sales data</p>}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Best Selling Categories</h3>
              <div className="space-y-2">
                {categoryBreakdown.sort((a, b) => b.value - a.value).slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-0.5"><span className="truncate">{c.name}</span><span className="font-semibold">{formatCurrency(c.value, company.currency)}</span></div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"><div className="h-full bg-accent-500 rounded-full" style={{ width: `${(c.value / (categoryBreakdown[0]?.value || 1)) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Payment Methods</h3>
              {paymentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={paymentBreakdown} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v, company.currency)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center mt-12">No data</p>}
            </div>
          </div>
        </div>
      )}

      {/* Profit Tab */}
      {tab === 'profit' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">Profit & Loss Statement</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Gross Sales', value: totalSales, color: 'text-primary-600' },
              { label: 'Cost of Goods Sold', value: -(totalSales - grossProfit), color: 'text-red-500' },
              { label: 'Gross Profit', value: grossProfit, color: 'text-emerald-600', bold: true },
              { label: 'Operating Expenses', value: -totalExpenses, color: 'text-red-500' },
              { label: 'Net Profit / Loss', value: netProfit, color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-500', bold: true },
            ].map(row => (
              <div key={row.label} className={`flex justify-between py-2 ${row.bold ? 'border-t border-gray-200 dark:border-gray-700 font-bold text-base' : ''}`}>
                <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                <span className={row.color}>{formatCurrency(Math.abs(row.value), company.currency)}</span>
              </div>
            ))}
          </div>
          <div className={`p-4 rounded-xl ${netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <p className="text-sm text-gray-500">Profit Margin</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* GST Tab */}
      {tab === 'gst' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold">GST Summary Report</h3>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(gstSummary, 'gst-report.csv')} className="btn-secondary py-1 text-xs"><Download size={12} /> CSV</button>
              <button onClick={() => exportToExcel(gstSummary, 'gst-report.xlsx', 'GST')} className="btn-secondary py-1 text-xs"><Download size={12} /> Excel</button>
              <button onClick={() => exportToPDF(gstSummary, 'gst-report.pdf', company)} className="btn-secondary py-1 text-xs"><Download size={12} /> PDF</button>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Tax Rate','Taxable Amount','CGST','SGST','Total GST'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {gstSummary.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-8">No GST data</td></tr>}
              {gstSummary.map(g => (
                <tr key={g.rate}>
                  <td className="table-cell font-medium">{g.rate}</td>
                  <td className="table-cell">{formatCurrency(g.taxable, company.currency)}</td>
                  <td className="table-cell">{formatCurrency(g.cgst, company.currency)}</td>
                  <td className="table-cell">{formatCurrency(g.sgst, company.currency)}</td>
                  <td className="table-cell font-semibold text-primary-600">{formatCurrency(g.total, company.currency)}</td>
                </tr>
              ))}
              {gstSummary.length > 0 && (
                <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                  <td className="table-cell">Total</td>
                  <td className="table-cell">{formatCurrency(gstSummary.reduce((s, g) => s + g.taxable, 0), company.currency)}</td>
                  <td className="table-cell">{formatCurrency(gstSummary.reduce((s, g) => s + g.cgst, 0), company.currency)}</td>
                  <td className="table-cell">{formatCurrency(gstSummary.reduce((s, g) => s + g.sgst, 0), company.currency)}</td>
                  <td className="table-cell text-primary-600">{formatCurrency(totalTax, company.currency)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold">Inventory Report</h3>
            <div className="flex gap-2">
              {(() => {
                const invRows = products.map(p => ({
                  Name: p.name || '',
                  Category: p.category || '',
                  SKU: p.sku || '',
                  Barcode: p.barcode || '',
                  Stock: p.stock ?? 0,
                  'Min Stock': p.minStock || 0,
                  'Cost Price': p.costPrice || 0,
                  'Selling Price': p.price || 0,
                  'Stock Value': ((p.costPrice || 0) * (p.stock || 0)).toFixed(2),
                  Status: p.archived ? 'Archived' : (p.stock || 0) === 0 ? 'Out of Stock' : (p.stock || 0) <= (p.minStock || 5) ? 'Low Stock' : 'In Stock',
                }));
                return (
                  <>
                    <button onClick={() => exportCSV(invRows, 'inventory-report.csv')} className="btn-secondary py-1 text-xs"><Download size={12} /> CSV</button>
                    <button onClick={() => exportToExcel(invRows, 'inventory-report.xlsx', 'Inventory')} className="btn-secondary py-1 text-xs"><Download size={12} /> Excel</button>
                    <button onClick={() => exportToPDF(invRows, 'inventory-report.pdf', company)} className="btn-secondary py-1 text-xs"><Download size={12} /> PDF</button>
                  </>
                );
              })()}
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Product','Category','Stock','Min Stock','Cost Price','Selling Price','Stock Value','Status'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell"><span className="badge-blue">{p.category || '-'}</span></td>
                  <td className="table-cell font-semibold">{p.stock ?? '∞'}</td>
                  <td className="table-cell text-gray-400">{p.minStock || 5}</td>
                  <td className="table-cell">{formatCurrency(p.costPrice || 0, company.currency)}</td>
                  <td className="table-cell">{formatCurrency(p.price, company.currency)}</td>
                  <td className="table-cell font-semibold">{formatCurrency((p.costPrice || 0) * (p.stock || 0), company.currency)}</td>
                  <td className="table-cell">
                    <span className={p.stock <= (p.minStock || 5) ? 'badge-red' : 'badge-green'}>
                      {p.stock <= (p.minStock || 5) ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customers Tab */}
      {tab === 'customers' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold">Customer Report</h3>
            {(() => {
              const rows = customers.map(c => {
                const custInv = invoices.filter(i => i.customerId === c.id);
                return {
                  Name: c.name, Phone: c.phone,
                  Orders: c.total_orders || custInv.length,
                  TotalSpent: c.total_spent || custInv.reduce((s, i) => s + (i.total || 0), 0),
                  LastPurchase: c.last_purchase ? formatDate(c.last_purchase) : (custInv.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date ? formatDate(custInv[0].date) : ''),
                  Dues: c.dues || 0, Points: c.points || 0,
                };
              });
              return (
                <div className="flex gap-2">
                  <button onClick={() => exportCSV(rows, 'customers-report.csv')} className="btn-secondary py-1 text-xs"><Download size={12} /> CSV</button>
                  <button onClick={() => exportToExcel(rows, 'customers-report.xlsx', 'Customers')} className="btn-secondary py-1 text-xs"><Download size={12} /> Excel</button>
                  <button onClick={() => exportToPDF(rows, 'customers-report.pdf', company)} className="btn-secondary py-1 text-xs"><Download size={12} /> PDF</button>
                </div>
              );
            })()}
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Customer', 'Phone', 'Orders', 'Total Spent', 'Last Purchase', 'Dues', 'Points'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {customers.sort((a, b) => {
                const aSpent = a.total_spent || invoices.filter(i => i.customerId === a.id).reduce((s, i) => s + i.total, 0);
                const bSpent = b.total_spent || invoices.filter(i => i.customerId === b.id).reduce((s, i) => s + i.total, 0);
                return bSpent - aSpent;
              }).map(c => {
                const custInv = invoices.filter(i => i.customerId === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
                const totalOrders = c.total_orders || custInv.length;
                const totalSpent = c.total_spent || custInv.reduce((s, i) => s + (i.total || 0), 0);
                const lastPurchase = c.last_purchase || custInv[0]?.date;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium">{c.name}</td>
                    <td className="table-cell">{c.phone || '—'}</td>
                    <td className="table-cell text-center font-semibold text-primary-600">{totalOrders}</td>
                    <td className="table-cell font-semibold text-emerald-600">{formatCurrency(totalSpent, company.currency)}</td>
                    <td className="table-cell text-xs text-gray-500">{lastPurchase ? formatDate(lastPurchase) : '—'}</td>
                    <td className="table-cell text-red-500">{formatCurrency(c.dues || 0, company.currency)}</td>
                    <td className="table-cell">{c.points || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

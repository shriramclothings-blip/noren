import * as XLSX from 'xlsx';
import { format, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';

const money = (value) => Number(Number(value || 0).toFixed(2));
const qty = (value) => Number(Number(value || 0).toFixed(3));
const safeText = (value, fallback = '') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const getInclusiveEnd = (date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getDaysBetween = (from, to) => {
  const days = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const findProduct = (productsById, productsByName, item) => {
  const byId = productsById.get(String(item.productId || ''));
  if (byId) return byId;
  return productsByName.get(String(item.name || '').toLowerCase()) || null;
};

const findVariant = (variantsById, product, item) => {
  const variant = variantsById.get(String(item.variantId || ''));
  if (variant) return variant;
  if (!Array.isArray(product?.variants)) return null;
  return product.variants.find((entry) => String(entry?.id) === String(item.variantId || '')) || null;
};

const buildKey = (...parts) => parts.map((part) => safeText(part, 'NA')).join('||');

const upsertMetric = (map, key, base, line) => {
  if (!map.has(key)) {
    map.set(key, {
      ...base,
      QuantitySold: 0,
      GrossRevenue: 0,
      DiscountAllocated: 0,
      NetRevenue: 0,
      TaxAllocated: 0,
      InvoiceCount: 0,
      Customers: new Set(),
      InvoiceIds: new Set(),
    });
  }
  const row = map.get(key);
  row.QuantitySold += line.quantity;
  row.GrossRevenue += line.grossRevenue;
  row.DiscountAllocated += line.discountAllocated;
  row.NetRevenue += line.netRevenue;
  row.TaxAllocated += line.taxAllocated;
  row.InvoiceIds.add(line.invoiceId);
  if (line.customerName) row.Customers.add(line.customerName);
  row.InvoiceCount = row.InvoiceIds.size;
  return row;
};

const finalizeMetricRows = (rows) => rows.map((row) => {
  const invoiceIds = row.InvoiceIds;
  const customers = row.Customers;
  const finalRow = {
    ...row,
    QuantitySold: qty(row.QuantitySold),
    GrossRevenue: money(row.GrossRevenue),
    DiscountAllocated: money(row.DiscountAllocated),
    NetRevenue: money(row.NetRevenue),
    TaxAllocated: money(row.TaxAllocated),
    InvoiceCount: invoiceIds?.size || row.InvoiceCount || 0,
    CustomerCount: customers?.size || 0,
    AvgNetPrice: row.QuantitySold > 0 ? money(row.NetRevenue / row.QuantitySold) : 0,
  };
  delete finalRow.InvoiceIds;
  delete finalRow.Customers;
  return finalRow;
});

const buildWorksheet = (rows) => {
  const data = rows?.length ? rows : [{ Note: 'No data for selected date range' }];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0] || {});
  worksheet['!cols'] = keys.map((key) => ({
    wch: Math.min(42, Math.max(
      key.length + 2,
      ...data.map((row) => String(row[key] ?? '').length + 2),
      12
    )),
  }));
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  return worksheet;
};

const appendWorksheet = (workbook, worksheet, sheetName) => {
  const safeName = sheetName.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
};

const appendSheet = (workbook, rows, sheetName) => {
  const safeName = sheetName.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, buildWorksheet(rows), safeName);
};

const getPaymentBuckets = (invoice) => {
  const buckets = { gpay: 0, cash: 0 };
  const applyPayment = (method, amount) => {
    const name = String(method || '').toLowerCase();
    const value = Number(amount || 0);
    if (!value) return;
    if (name.includes('gpay') || name.includes('google') || name.includes('upi') || name.includes('online')) {
      buckets.gpay += value;
    } else {
      buckets.cash += value;
    }
  };

  if (Array.isArray(invoice.paymentBreakdown) && invoice.paymentBreakdown.length > 0) {
    invoice.paymentBreakdown.forEach((payment) => applyPayment(payment?.method, payment?.amount));
  } else {
    applyPayment(invoice.paymentMode || 'Cash', invoice.total || 0);
  }
  return buckets;
};

const buildReturnNotesByDay = (salesReturns = [], from, to) => {
  const map = new Map();
  const start = new Date(from);
  const end = getInclusiveEnd(to);
  salesReturns.forEach((entry) => {
    const date = new Date(entry.date || entry.returnDate || entry.createdAt || entry.updatedAt || '');
    if (Number.isNaN(date.getTime()) || date < start || date > end) return;
    const dayKey = format(date, 'yyyy-MM-dd');
    const quantity = Number(entry.quantity || entry.qty || entry.returnQty || 0);
    const product = safeText(entry.productName || entry.name || entry.itemName || entry.reason, 'return');
    const note = `${quantity || ''} ${product}`.trim();
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey).push(note);
  });
  return map;
};

const buildDailySalesMatrixWorksheet = ({
  from,
  to,
  validInvoices,
  productsById,
  productsByName,
  variantsById,
  salesReturns = [],
}) => {
  const matrix = new Map();
  const dayTotals = new Map();
  const categoryPriceMap = new Map();
  const returnNotes = buildReturnNotesByDay(salesReturns, from, to);

  validInvoices.forEach((invoice) => {
    const invoiceDate = new Date(invoice.date);
    const dayKey = format(invoiceDate, 'yyyy-MM-dd');
    const payments = getPaymentBuckets(invoice);
    if (!dayTotals.has(dayKey)) dayTotals.set(dayKey, { gpay: 0, cash: 0, final: 0 });
    const totals = dayTotals.get(dayKey);
    totals.gpay += payments.gpay;
    totals.cash += payments.cash;
    totals.final += Number(invoice.total || 0);

    (invoice.items || []).forEach((item) => {
      const product = findProduct(productsById, productsByName, item);
      const variant = findVariant(variantsById, product, item);
      const category = safeText(product?.category, safeText(product?.name || item.name, 'Other'));
      const salePrice = money(item.price);
      const quantity = qty(item.qty);
      const columnKey = buildKey(category, salePrice);

      if (!categoryPriceMap.has(category)) categoryPriceMap.set(category, new Set());
      categoryPriceMap.get(category).add(salePrice);
      if (!matrix.has(dayKey)) matrix.set(dayKey, new Map());
      const dayRow = matrix.get(dayKey);
      dayRow.set(columnKey, qty((dayRow.get(columnKey) || 0) + quantity));

      if (variant?.size && !category.toLowerCase().includes(String(variant.size).toLowerCase())) {
        // Size is preserved in the detailed sheets; the matrix follows the user's category/price register format.
      }
    });
  });

  const categoryGroups = Array.from(categoryPriceMap.entries())
    .map(([category, prices]) => ({ category, prices: Array.from(prices).sort((a, b) => a - b) }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const header1 = ['', ''];
  const header2 = ['Date', 'day'];
  const merges = [];
  let colIndex = 2;

  categoryGroups.forEach((group) => {
    const startCol = colIndex;
    group.prices.forEach((price) => {
      header1.push(group.category);
      header2.push(price);
      colIndex += 1;
    });
    if (colIndex - 1 > startCol) merges.push({ s: { r: 1, c: startCol }, e: { r: 1, c: colIndex - 1 } });
  });

  const returnCol = colIndex;
  header1.push('Return', 'Total', 'Total', 'Total');
  header2.push('', 'Gpay', 'Cash', 'Final');
  merges.push({ s: { r: 1, c: returnCol + 1 }, e: { r: 1, c: returnCol + 3 } });

  const rows = [
    Array(header2.length).fill(''),
    header1,
    header2,
  ];
  rows[0][Math.max(0, header2.length - 7)] = format(from, 'MMM yy');

  getDaysBetween(from, to).forEach((day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayRow = matrix.get(dayKey) || new Map();
    const totals = dayTotals.get(dayKey) || { gpay: 0, cash: 0, final: 0 };
    const row = [Number(format(day, 'd')), format(day, 'EEE').toLowerCase()];

    categoryGroups.forEach((group) => {
      group.prices.forEach((price) => {
        const value = dayRow.get(buildKey(group.category, price)) || '';
        row.push(value || '');
      });
    });

    row.push((returnNotes.get(dayKey) || []).join(', '));
    row.push(money(totals.gpay));
    row.push(money(totals.cash));
    row.push(money(totals.final));
    rows.push(row);
  });

  const totalsRow = ['Total', ''];
  categoryGroups.forEach((group) => {
    group.prices.forEach((price) => {
      const columnKey = buildKey(group.category, price);
      const total = Array.from(matrix.values()).reduce((sum, dayRow) => sum + Number(dayRow.get(columnKey) || 0), 0);
      totalsRow.push(qty(total) || '');
    });
  });
  totalsRow.push('');
  totalsRow.push(money(Array.from(dayTotals.values()).reduce((sum, day) => sum + day.gpay, 0)));
  totalsRow.push(money(Array.from(dayTotals.values()).reduce((sum, day) => sum + day.cash, 0)));
  totalsRow.push(money(Array.from(dayTotals.values()).reduce((sum, day) => sum + day.final, 0)));
  rows.push(totalsRow);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = rows[2].map((heading, index) => {
    if (index === 0 || index === 1) return { wch: 8 };
    if (heading === 'Final') return { wch: 12 };
    if (heading === 'Cash' || heading === 'Gpay') return { wch: 11 };
    if (index === returnCol) return { wch: 18 };
    return { wch: 7 };
  });
  worksheet['!freeze'] = { xSplit: 2, ySplit: 3 };
  return worksheet;
};

export const buildSalesExcelReport = ({
  invoices = [],
  products = [],
  variants = [],
  returns = [],
  company = {},
  dateFrom,
  dateTo,
  rangeLabel = 'Selected Range',
}) => {
  const from = new Date(dateFrom);
  const to = getInclusiveEnd(dateTo || dateFrom || new Date());
  const productsById = new Map(products.map((product) => [String(product.id), product]));
  const productsByName = new Map(products.map((product) => [String(product.name || '').toLowerCase(), product]));
  const variantsById = new Map(variants.map((variant) => [String(variant.id), variant]));

  const validInvoices = invoices
    .filter((invoice) => invoice?.status !== 'Refund')
    .filter((invoice) => {
      const date = new Date(invoice.date);
      return date >= from && date <= to;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const productSizePrice = new Map();
  const categoryMap = new Map();
  const monthlyMap = new Map();
  const quarterlyMap = new Map();
  const yearlyMap = new Map();
  const pricePointMap = new Map();
  const invoiceLineRows = [];

  validInvoices.forEach((invoice) => {
    const invoiceDate = new Date(invoice.date);
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const grossInvoice = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
    const discountRatio = grossInvoice > 0 ? Number(invoice.discountAmt || 0) / grossInvoice : 0;
    const taxRatio = grossInvoice > 0 ? Number(invoice.taxAmt || 0) / grossInvoice : 0;

    items.forEach((item) => {
      const product = findProduct(productsById, productsByName, item);
      const variant = findVariant(variantsById, product, item);
      const productName = safeText(product?.name || item.name, 'Unknown Product');
      const category = safeText(product?.category, 'Uncategorized');
      const size = safeText(item.size || variant?.size || variant?.label || product?.defaultSize, 'No Size');
      const sku = safeText(variant?.sku || product?.sku);
      const barcode = safeText(variant?.barcode || product?.barcode);
      const salePrice = money(item.price);
      const quantity = qty(item.qty);
      const grossRevenue = money(salePrice * quantity);
      const discountAllocated = money(grossRevenue * discountRatio);
      const taxAllocated = money(grossRevenue * taxRatio);
      const netRevenue = money(grossRevenue - discountAllocated + taxAllocated);
      const line = {
        invoiceId: invoice.id || invoice.invoiceNumber,
        customerName: safeText(invoice.customerName),
        quantity,
        grossRevenue,
        discountAllocated,
        taxAllocated,
        netRevenue,
      };

      const productBase = {
        ProductName: productName,
        Category: category,
        Size: size,
        SalePrice: salePrice,
        SKU: sku,
        Barcode: barcode,
      };
      upsertMetric(productSizePrice, buildKey(product?.id || productName, size, salePrice), productBase, line);
      upsertMetric(pricePointMap, buildKey(salePrice, productName, size), { SalePrice: salePrice, ProductName: productName, Size: size, Category: category }, line);
      upsertMetric(categoryMap, category, { Category: category }, line);

      const monthLabel = format(startOfMonth(invoiceDate), 'yyyy-MM');
      upsertMetric(monthlyMap, monthLabel, { Month: monthLabel }, line);
      const quarterDate = startOfQuarter(invoiceDate);
      const quarterLabel = `${format(quarterDate, 'yyyy')}-Q${Math.floor(quarterDate.getMonth() / 3) + 1}`;
      upsertMetric(quarterlyMap, quarterLabel, { Quarter: quarterLabel }, line);
      const yearLabel = format(startOfYear(invoiceDate), 'yyyy');
      upsertMetric(yearlyMap, yearLabel, { Year: yearLabel }, line);

      invoiceLineRows.push({
        Date: format(invoiceDate, 'dd-MM-yyyy'),
        InvoiceNumber: invoice.invoiceNumber || invoice.id || '',
        Customer: safeText(invoice.customerName, 'Walk-in'),
        ProductName: productName,
        Category: category,
        Size: size,
        SalePrice: salePrice,
        Quantity: quantity,
        GrossRevenue: grossRevenue,
        DiscountAllocated: discountAllocated,
        TaxAllocated: taxAllocated,
        NetRevenue: netRevenue,
        PaymentMode: invoice.paymentMode || '',
        SKU: sku,
        Barcode: barcode,
        ProductId: product?.id || item.productId || '',
        VariantId: item.variantId || '',
      });
    });
  });

  const productRows = finalizeMetricRows(Array.from(productSizePrice.values()))
    .sort((a, b) => b.NetRevenue - a.NetRevenue || b.QuantitySold - a.QuantitySold);
  const categoryRows = finalizeMetricRows(Array.from(categoryMap.values()))
    .sort((a, b) => b.NetRevenue - a.NetRevenue);
  const pricePointRows = finalizeMetricRows(Array.from(pricePointMap.values()))
    .sort((a, b) => b.SalePrice - a.SalePrice || b.NetRevenue - a.NetRevenue);
  const monthlyRows = finalizeMetricRows(Array.from(monthlyMap.values())).sort((a, b) => String(a.Month).localeCompare(String(b.Month)));
  const quarterlyRows = finalizeMetricRows(Array.from(quarterlyMap.values())).sort((a, b) => String(a.Quarter).localeCompare(String(b.Quarter)));
  const yearlyRows = finalizeMetricRows(Array.from(yearlyMap.values())).sort((a, b) => String(a.Year).localeCompare(String(b.Year)));
  const dailyMatrixWorksheet = buildDailySalesMatrixWorksheet({
    from,
    to,
    validInvoices,
    productsById,
    productsByName,
    variantsById,
    salesReturns: returns,
  });

  const totalQuantity = productRows.reduce((sum, row) => sum + Number(row.QuantitySold || 0), 0);
  const grossRevenue = validInvoices.reduce((sum, invoice) => sum + Number(invoice.subtotal || 0), 0);
  const netRevenue = validInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const discount = validInvoices.reduce((sum, invoice) => sum + Number(invoice.discountAmt || 0), 0);
  const tax = validInvoices.reduce((sum, invoice) => sum + Number(invoice.taxAmt || 0), 0);

  const summaryRows = [
    { Metric: 'Company', Value: company.name || 'Business' },
    { Metric: 'Report Range', Value: rangeLabel },
    { Metric: 'From Date', Value: format(from, 'dd-MM-yyyy') },
    { Metric: 'To Date', Value: format(to, 'dd-MM-yyyy') },
    { Metric: 'Generated On', Value: format(new Date(), 'dd-MM-yyyy HH:mm') },
    { Metric: 'Total Invoices', Value: validInvoices.length },
    { Metric: 'Total Items Sold', Value: qty(totalQuantity) },
    { Metric: 'Unique Product/Size/Price Rows', Value: productRows.length },
    { Metric: 'Gross Item Revenue', Value: money(grossRevenue || invoiceLineRows.reduce((sum, row) => sum + row.GrossRevenue, 0)) },
    { Metric: 'Total Discount', Value: money(discount) },
    { Metric: 'Total GST/Tax', Value: money(tax) },
    { Metric: 'Total Revenue', Value: money(netRevenue || invoiceLineRows.reduce((sum, row) => sum + row.NetRevenue, 0)) },
    { Metric: 'Average Invoice Value', Value: validInvoices.length ? money(netRevenue / validInvoices.length) : 0 },
  ];

  const documentationRows = [
    { Section: 'Daily Sales Matrix', Detail: 'This first sheet follows the register format: Date/day rows, category groups, sale-price columns, Return notes, GPay, Cash, and Final daily totals.' },
    { Section: 'Purpose', Detail: 'This workbook explains sales by product, size, selling price, category, invoice line, month, quarter, year, and selected date range.' },
    { Section: 'Product Size Price Sales', Detail: 'Use this sheet to answer questions like: Shirt, size M, sale price 500, sold 10 pcs in this date range.' },
    { Section: 'Price Points', Detail: 'Groups every sold item by sale price, product, and size so price-wise movement is easy to read.' },
    { Section: 'Revenue Calculation', Detail: 'GrossRevenue is item price multiplied by quantity. DiscountAllocated and TaxAllocated are distributed proportionally from the invoice. NetRevenue is gross minus allocated discount plus allocated tax.' },
    { Section: 'Date Filters', Detail: 'The workbook uses the same report date selector: today, last days, current month, custom range, quarter, or year depending on your selection.' },
    { Section: 'Returned Bills', Detail: 'Invoices with Refund status are excluded from sales totals.' },
    { Section: 'Industrial Usage', Detail: 'Review Summary first, then Product Size Price Sales for item movement, Category Sales for department totals, Period sheets for trend, and Invoice Line Detail for audit.' },
  ];

  return {
    'Daily Sales Matrix': { __worksheet: dailyMatrixWorksheet },
    Summary: summaryRows,
    'Product Size Price Sales': productRows,
    'Category Sales': categoryRows,
    'Price Points': pricePointRows,
    'Monthly Trend': monthlyRows,
    'Quarterly Trend': quarterlyRows,
    'Yearly Trend': yearlyRows,
    'Invoice Line Detail': invoiceLineRows,
    Documentation: documentationRows,
  };
};

export const exportSalesExcelReport = (reportData, filename) => {
  try {
    const workbook = XLSX.utils.book_new();
    Object.entries(reportData).forEach(([sheetName, rows]) => {
      if (rows?.__worksheet) appendWorksheet(workbook, rows.__worksheet, sheetName);
      else appendSheet(workbook, rows, sheetName);
    });
    workbook.Props = {
      Title: 'Industrial Sales Performance Report',
      Subject: 'Product, size, price, category, and period sales analysis',
      Author: 'VENDEXA RetailOS',
      CreatedDate: new Date(),
    };
    XLSX.writeFile(workbook, filename);
    return { success: true };
  } catch (error) {
    console.error('Sales Excel report failed:', error);
    return { success: false, error: error.message };
  }
};

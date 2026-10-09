import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  subMonths, 
  startOfMonth, 
  endOfMonth 
} from 'date-fns';

/**
 * Filter invoices by date range
 */
export const filterByDateRange = (invoices, rangeType = 'today', customStart = null, customEnd = null) => {
  const now = new Date();
  let start, end;
  
  switch (rangeType) {
    case 'today':
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case 'yesterday':
      start = startOfDay(subDays(now, 1));
      end = endOfDay(subDays(now, 1));
      break;
    case '7days':
      start = startOfDay(subDays(now, 6));
      end = endOfDay(now);
      break;
    case '30days':
      start = startOfDay(subDays(now, 29));
      end = endOfDay(now);
      break;
    case '90days':
      start = startOfDay(subDays(now, 89));
      end = endOfDay(now);
      break;
    case '180days':
      start = startOfDay(subDays(now, 179));
      end = endOfDay(now);
      break;
    case '1year':
      start = startOfDay(subDays(now, 364));
      end = endOfDay(now);
      break;
    case 'thismonth':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'lastmonth':
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    case 'custom':
      start = customStart ? startOfDay(new Date(customStart)) : startOfDay(now);
      end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
      break;
    default:
      start = startOfDay(now);
      end = endOfDay(now);
  }
  
  return invoices.filter(inv => {
    const invDate = new Date(inv.date);
    return invDate >= start && invDate <= end;
  });
};

/**
 * Calculate revenue analytics
 */
export const calculateRevenueAnalytics = (invoices) => {
  const validInvoices = invoices.filter(i => i.status !== 'Refund' && i.total);
  
  return {
    totalRevenue: validInvoices.reduce((sum, i) => sum + (i.total || 0), 0),
    totalOrders: validInvoices.length,
    averageOrderValue: validInvoices.length > 0 
      ? validInvoices.reduce((sum, i) => sum + (i.total || 0), 0) / validInvoices.length 
      : 0,
    paidOrders: validInvoices.filter(i => i.status === 'Paid').length,
    unpaidOrders: validInvoices.filter(i => i.status === 'Unpaid').length,
    totalTax: validInvoices.reduce((sum, i) => sum + (i.taxAmt || 0), 0),
    totalDiscount: validInvoices.reduce((sum, i) => sum + (i.discountAmt || 0), 0),
  };
};

/**
 * Get top selling products
 */
export const getTopSellingProducts = (invoices, limit = 10) => {
  const productMap = {};
  
  invoices.forEach(inv => {
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = {
            id: item.productId,
            name: item.name,
            quantity: 0,
            revenue: 0,
            orders: 0,
          };
        }
        productMap[item.productId].quantity += item.qty || 0;
        productMap[item.productId].revenue += (item.price || 0) * (item.qty || 0);
        productMap[item.productId].orders += 1;
      });
    }
  });
  
  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};

/**
 * Get top customers
 */
export const getTopCustomers = (invoices, limit = 10) => {
  const customerMap = {};
  
  invoices.forEach(inv => {
    if (inv.customerId && inv.customerId !== 'walking') {
      if (!customerMap[inv.customerId]) {
        customerMap[inv.customerId] = {
          id: inv.customerId,
          name: inv.customerName,
          totalSpent: 0,
          orderCount: 0,
          lastPurchase: null,
        };
      }
      customerMap[inv.customerId].totalSpent += inv.total || 0;
      customerMap[inv.customerId].orderCount += 1;
      customerMap[inv.customerId].lastPurchase = inv.date;
    }
  });
  
  return Object.values(customerMap)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
};

/**
 * Get sales by category
 */
export const getSalesByCategory = (products, invoices) => {
  const categoryMap = {};
  
  invoices.forEach(inv => {
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const category = product?.category || 'Uncategorized';
        
        if (!categoryMap[category]) {
          categoryMap[category] = {
            category,
            quantity: 0,
            revenue: 0,
            orders: 0,
          };
        }
        categoryMap[category].quantity += item.qty || 0;
        categoryMap[category].revenue += (item.price || 0) * (item.qty || 0);
        categoryMap[category].orders += 1;
      });
    }
  });
  
  return Object.values(categoryMap)
    .sort((a, b) => b.revenue - a.revenue);
};

/**
 * Get daily sales trend (for charts)
 */
export const getDailySalesTrend = (invoices, days = 7) => {
  const trendMap = {};
  const now = new Date();
  
  // Initialize all days
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);
    const dateStr = date.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
    trendMap[dateStr] = {
      date: dateStr,
      revenue: 0,
      orders: 0,
      transactions: [],
    };
  }
  
  // Populate data
  invoices.forEach(inv => {
    if (inv.status !== 'Refund') {
      const invDate = new Date(inv.date);
      const dateStr = invDate.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
      
      if (trendMap[dateStr]) {
        trendMap[dateStr].revenue += inv.total || 0;
        trendMap[dateStr].orders += 1;
        trendMap[dateStr].transactions.push({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.total,
          customer: inv.customerName,
        });
      }
    }
  });
  
  return Object.values(trendMap);
};

/**
 * Export report data
 */
export const generateReportData = (invoices, products, customers, format = 'revenue') => {
  switch (format) {
    case 'revenue':
      return getDailySalesTrend(invoices, 30);
    
    case 'products':
      return getTopSellingProducts(invoices, 100);
    
    case 'customers':
      return getTopCustomers(invoices, 100);
    
    case 'categories':
      return getSalesByCategory(products, invoices);
    
    case 'invoices':
      return invoices.map(inv => ({
        'Invoice No': inv.invoiceNumber,
        'Customer': inv.customerName || 'Walking Customer',
        'Date': new Date(inv.date).toLocaleDateString('en-IN'),
        'Items': inv.items?.length || 0,
        'Subtotal': inv.subtotal,
        'Discount': inv.discountAmt || 0,
        'Tax': inv.taxAmt || 0,
        'Total': inv.total,
        'Payment': inv.paymentMode,
        'Status': inv.status,
      }));
    
    default:
      return [];
  }
};

/**
 * Generate analytics summary
 */
export const getAnalyticsSummary = (invoices, dateRange = 'today') => {
  const filtered = filterByDateRange(invoices, dateRange);
  const analytics = calculateRevenueAnalytics(filtered);
  
  return {
    dateRange,
    ...analytics,
    topProducts: getTopSellingProducts(filtered, 5),
    topCustomers: getTopCustomers(filtered, 5),
    trend: getDailySalesTrend(filtered, 7),
  };
};

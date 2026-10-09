const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Parse natural language query and detect intent
 * Returns: { type, confidence, template, params }
 */
function parseIntent(query, contextHints) {
  const q = query.toLowerCase();

  // Sales & Revenue Intents
  if (matchesKeywords(q, ['sales', 'revenue', 'today', 'this week', 'this month', 'this quarter', 'last 7 days', 'last 30 days'])) {
    if (matchesKeywords(q, ['store', 'location', 'branch'])) {
      return { type: 'sales_by_store', confidence: 0.85, template: 'sales_by_store' };
    }
    if (matchesKeywords(q, ['product', 'sku', 'item'])) {
      return { type: 'sales_by_product', confidence: 0.85, template: 'sales_by_product' };
    }
    if (matchesKeywords(q, ['category'])) {
      return { type: 'sales_by_category', confidence: 0.85, template: 'sales_by_category' };
    }
    return { type: 'total_sales', confidence: 0.9, template: 'total_sales' };
  }

  // Inventory Intents
  if (matchesKeywords(q, ['stock', 'inventory', 'low stock', 'out of stock', 'quantity'])) {
    if (matchesKeywords(q, ['low', 'below', 'less than'])) {
      return { type: 'low_stock', confidence: 0.85, template: 'low_stock' };
    }
    if (matchesKeywords(q, ['out of', 'zero'])) {
      return { type: 'out_of_stock', confidence: 0.85, template: 'out_of_stock' };
    }
    return { type: 'stock_status', confidence: 0.8, template: 'stock_status' };
  }

  // Customer Intents
  if (matchesKeywords(q, ['customer', 'client', 'buyer', 'purchase'])) {
    if (matchesKeywords(q, ['top', 'best', 'highest'])) {
      return { type: 'top_customers', confidence: 0.85, template: 'top_customers' };
    }
    if (matchesKeywords(q, ['spending', 'spent', 'ltv', 'value'])) {
      return { type: 'customer_ltv', confidence: 0.8, template: 'customer_ltv' };
    }
    return { type: 'customer_summary', confidence: 0.75, template: 'customer_summary' };
  }

  // Expense Intents
  if (matchesKeywords(q, ['expense', 'spending', 'cost', 'bill'])) {
    if (matchesKeywords(q, ['category'])) {
      return { type: 'expenses_by_category', confidence: 0.8, template: 'expenses_by_category' };
    }
    return { type: 'total_expenses', confidence: 0.85, template: 'total_expenses' };
  }

  // Profitability Intents
  if (matchesKeywords(q, ['profit', 'margin', 'cogs', 'cost of goods', 'gross margin', 'net margin'])) {
    if (matchesKeywords(q, ['by product'])) {
      return { type: 'profit_by_product', confidence: 0.75, template: 'profit_by_product' };
    }
    return { type: 'overall_profit', confidence: 0.75, template: 'overall_profit' };
  }

  // Refunds & Returns Intents
  if (matchesKeywords(q, ['refund', 'return', 'exchange', 'void'])) {
    return { type: 'refunds_summary', confidence: 0.8, template: 'refunds_summary' };
  }

  // KPI Intents
  if (matchesKeywords(q, ['aov', 'average order value', 'conversion', 'kpi', 'metric'])) {
    return { type: 'kpis', confidence: 0.75, template: 'kpis' };
  }

  // Trends
  if (matchesKeywords(q, ['trend', 'growth', 'decline', 'compare', 'change'])) {
    return { type: 'trends', confidence: 0.7, template: 'trends' };
  }

  // Default: generic analysis
  return { type: 'generic', confidence: 0.5, template: 'generic' };
}

/**
 * Helper: match keywords in query
 */
function matchesKeywords(query, keywords) {
  return keywords.some(kw => query.includes(kw.toLowerCase()));
}

/**
 * Get SQL template for a given intent
 */
function getSqlTemplate(intent) {
  const templates = {
    total_sales: `
      SELECT 
        COUNT(*) as invoice_count,
        SUM(total) as total_sales,
        AVG(total) as avg_order_value,
        MIN(total) as min_order,
        MAX(total) as max_order
      FROM invoices
      WHERE date >= datetime('now', '-30 days') AND status != 'Refund'
    `,
    sales_by_product: `
      SELECT 
        p.id, p.name, p.category,
        SUM(inv_items.qty) as qty_sold,
        SUM(inv_items.total) as revenue
      FROM invoices i
      JOIN (SELECT productId, qty, total FROM invoices WHERE status != 'Refund') inv_items ON i.id = inv_items.id
      JOIN products p ON inv_items.productId = p.id
      WHERE i.date >= datetime('now', '-30 days')
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 20
    `,
    sales_by_category: `
      SELECT 
        p.category,
        COUNT(*) as items_sold,
        SUM(inv_items.total) as revenue
      FROM invoices i
      JOIN (SELECT productId, total FROM invoices WHERE status != 'Refund') inv_items ON i.id = inv_items.id
      JOIN products p ON inv_items.productId = p.id
      WHERE i.date >= datetime('now', '-30 days')
      GROUP BY p.category
      ORDER BY revenue DESC
    `,
    low_stock: `
      SELECT id, name, stock, price, reorder_point
      FROM products
      WHERE stock <= 10
      ORDER BY stock ASC
      LIMIT 50
    `,
    out_of_stock: `
      SELECT id, name, stock, price
      FROM products
      WHERE stock = 0
      ORDER BY id DESC
    `,
    top_customers: `
      SELECT id, name, phone, email, total_spent, total_orders, dues
      FROM customers
      ORDER BY total_spent DESC
      LIMIT 20
    `,
    customer_ltv: `
      SELECT 
        id, name, phone,
        total_spent as lifetime_value,
        total_orders as order_count,
        total_spent / NULLIF(total_orders, 0) as avg_order_value
      FROM customers
      WHERE total_spent > 0
      ORDER BY total_spent DESC
      LIMIT 50
    `,
    total_expenses: `
      SELECT 
        COUNT(*) as expense_count,
        SUM(amount) as total_expenses,
        AVG(amount) as avg_expense,
        GROUP_CONCAT(DISTINCT category) as categories
      FROM expenses
      WHERE date >= datetime('now', '-30 days')
    `,
    expenses_by_category: `
      SELECT category, COUNT(*) as count, SUM(amount) as total
      FROM expenses
      WHERE date >= datetime('now', '-30 days')
      GROUP BY category
      ORDER BY total DESC
    `,
    overall_profit: `
      SELECT 
        COUNT(DISTINCT i.id) as invoices,
        SUM(i.total) as gross_revenue,
        SUM(p.total) as cogs,
        SUM(i.total) - SUM(p.total) as gross_profit,
        ((SUM(i.total) - SUM(p.total)) / SUM(i.total) * 100) as gross_margin_pct
      FROM invoices i
      LEFT JOIN purchases p ON 1=1
      WHERE i.date >= datetime('now', '-30 days') AND i.status != 'Refund'
    `,
    refunds_summary: `
      SELECT 
        COUNT(*) as refund_count,
        SUM(ABS(total)) as refund_amount,
        AVG(ABS(total)) as avg_refund
      FROM invoices
      WHERE status = 'Refund' AND date >= datetime('now', '-30 days')
    `,
    kpis: `
      SELECT 
        COUNT(*) as transaction_count,
        SUM(total) as gmv,
        AVG(total) as aov,
        COUNT(DISTINCT customerId) as unique_customers,
        (SELECT COUNT(DISTINCT customerId) FROM invoices i2 WHERE i2.date >= datetime('now', '-30 days')) as new_customers_30d
      FROM invoices
      WHERE date >= datetime('now', '-30 days') AND status != 'Refund'
    `,
    generic: `
      SELECT COUNT(*) as record_count FROM invoices
    `,
  };
  return templates[intent] || templates.generic;
}

module.exports = {
  parseIntent,
  getSqlTemplate,
};

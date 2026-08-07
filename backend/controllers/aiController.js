'use strict';

const { pool } = require('../config/db');
const https    = require('https');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

// Helper: call Gemini
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) {
    throw new Error('Gemini API key not configured. Add GEMINI_API_KEY to Render environment variables.');
  }

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024, topP: 0.9 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      `${GEMINI_URL}?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode !== 200) {
              const errMsg = json.error?.message || ('Gemini HTTP ' + res.statusCode);
              return reject(new Error(errMsg));
            }
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return reject(new Error('Gemini returned empty response'));
            resolve(text.trim());
          } catch (e) {
            reject(new Error('Failed to parse Gemini response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Gemini timeout')); });
    req.write(body);
    req.end();
  });
}

// Helper: fetch all live business metrics
async function fetchLiveMetrics(businessId) {
  const bId    = businessId ? parseInt(businessId) : null;
  const oWhere = bId ? ('AND o.business_id = ' + bId) : '';
  const sWhere = bId ? ('AND s.business_id = ' + bId) : '';
  const eWhere = bId ? ('AND e.business_id = ' + bId) : '';
  const iWhere = bId ? ('AND i.business_id = ' + bId) : '';
  const nowStr = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const [
    ordersRow, usersRow, productsRow, sessionsRow,
    posRow, expenseRow, inventoryRow, newUsersRow,
    topProductsRow, lowStockRow, recentOrdersRow,
    utmLinksRow, utmClicksTodayRow,
  ] = await Promise.all([
    pool.query(`SELECT
      COUNT(*) FILTER (WHERE DATE(o.created_at)=CURRENT_DATE) AS today,
      COUNT(*) FILTER (WHERE o.created_at>=DATE_TRUNC('week',NOW())) AS this_week,
      COUNT(*) FILTER (WHERE o.created_at>=DATE_TRUNC('month',NOW())) AS this_month,
      COUNT(*) FILTER (WHERE o.status='pending') AS pending,
      COUNT(*) FILTER (WHERE o.status='delivered') AS delivered,
      COALESCE(SUM(o.total) FILTER (WHERE DATE(o.created_at)=CURRENT_DATE AND o.payment_status='paid'),0) AS revenue_today,
      COALESCE(SUM(o.total) FILTER (WHERE o.created_at>=DATE_TRUNC('month',NOW()) AND o.payment_status='paid'),0) AS revenue_month
      FROM src_orders o WHERE 1=1 ` + oWhere),

    pool.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE DATE(u.created_at)=CURRENT_DATE) AS today,
      COUNT(*) FILTER (WHERE u.created_at>=DATE_TRUNC('week',NOW())) AS this_week,
      COUNT(*) FILTER (WHERE u.created_at>=DATE_TRUNC('month',NOW())) AS this_month,
      COUNT(*) FILTER (WHERE u.role='user') AS customers,
      COUNT(*) FILTER (WHERE u.is_banned=TRUE) AS banned
      FROM src_users u`),

    pool.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE p.status='approved') AS approved,
      COUNT(*) FILTER (WHERE p.status='pending') AS pending,
      COUNT(*) FILTER (WHERE p.is_featured=TRUE) AS featured
      FROM src_products p WHERE p.deleted_at IS NULL`),

    pool.query(`SELECT COUNT(*) AS active FROM src_login_sessions WHERE is_active=TRUE`),

    pool.query(`SELECT
      COUNT(*) FILTER (WHERE DATE(s.created_at)=CURRENT_DATE AND s.status='completed') AS bills_today,
      COALESCE(SUM(s.total) FILTER (WHERE DATE(s.created_at)=CURRENT_DATE AND s.status='completed'),0) AS pos_today,
      COALESCE(SUM(s.total) FILTER (WHERE s.created_at>=DATE_TRUNC('month',NOW()) AND s.status='completed'),0) AS pos_month
      FROM src_erp_sales s WHERE 1=1 ` + sWhere),

    pool.query(`SELECT COALESCE(SUM(e.amount),0) AS total FROM src_erp_expenses e
      WHERE e.expense_date>=DATE_TRUNC('month',CURRENT_DATE) ` + eWhere),

    pool.query(`SELECT
      COUNT(*) AS total_items,
      COUNT(*) FILTER (WHERE i.current_stock<=i.reorder_level) AS low_stock,
      COUNT(*) FILTER (WHERE i.current_stock=0) AS out_of_stock,
      COALESCE(SUM(i.current_stock*i.purchase_price),0) AS inventory_value
      FROM src_erp_inventory_items i WHERE i.status='active' ` + iWhere),

    pool.query(`SELECT u.name, u.email FROM src_users u
      WHERE DATE(u.created_at)=CURRENT_DATE ORDER BY u.created_at DESC LIMIT 5`),

    pool.query(`SELECT COALESCE(inv.title, si.title) AS name,
      SUM(si.quantity) AS qty, SUM(si.line_total) AS rev
      FROM src_erp_sale_items si
      JOIN src_erp_sales s ON s.id=si.sale_id
      LEFT JOIN src_erp_inventory_items inv ON inv.id=si.inventory_item_id
      WHERE s.status='completed' AND s.created_at>=DATE_TRUNC('month',NOW()) ` + sWhere + `
      GROUP BY COALESCE(inv.title,si.title) ORDER BY rev DESC LIMIT 5`),

    pool.query(`SELECT i.title, i.sku, i.current_stock, i.reorder_level
      FROM src_erp_inventory_items i
      WHERE i.current_stock<=i.reorder_level AND i.status='active' ` + iWhere + `
      ORDER BY i.current_stock ASC LIMIT 8`),

    pool.query(`SELECT o.order_id, o.full_name, o.total, o.status, o.payment_status
      FROM src_orders o WHERE 1=1 ` + oWhere + ` ORDER BY o.created_at DESC LIMIT 5`),

    pool.query(`SELECT l.name, l.source, l.medium, l.campaign,
      l.total_clicks, l.unique_clicks
      FROM src_utm_links l WHERE l.is_active = TRUE
      ORDER BY l.total_clicks DESC LIMIT 10`),

    pool.query(`SELECT COUNT(*) AS today FROM src_utm_clicks
      WHERE DATE(clicked_at) = CURRENT_DATE`),
  ]);

  const o   = ordersRow.rows[0]    || {};
  const u   = usersRow.rows[0]     || {};
  const p   = productsRow.rows[0]  || {};
  const s   = sessionsRow.rows[0]  || {};
  const pos = posRow.rows[0]       || {};
  const exp = expenseRow.rows[0]   || {};
  const inv = inventoryRow.rows[0] || {};

  const revToday = (parseFloat(o.revenue_today)||0) + (parseFloat(pos.pos_today)||0);
  const revMonth = (parseFloat(o.revenue_month)||0) + (parseFloat(pos.pos_month)||0);
  const expenses = parseFloat(exp.total) || 0;

  const utmLinks = utmLinksRow.rows || [];
  const utmClicksToday = parseInt(utmClicksTodayRow.rows[0]?.today || 0);
  const utmTotalClicks = utmLinks.reduce((sum, l) => sum + (parseInt(l.total_clicks) || 0), 0);

  return {
    datetime: nowStr,
    orders: {
      today: parseInt(o.today)||0,
      this_week: parseInt(o.this_week)||0,
      this_month: parseInt(o.this_month)||0,
      pending: parseInt(o.pending)||0,
      delivered: parseInt(o.delivered)||0,
    },
    revenue: {
      today: revToday.toFixed(2),
      this_month: revMonth.toFixed(2),
      pos_bills_today: parseInt(pos.bills_today)||0,
      expenses_month: expenses.toFixed(2),
      profit_estimate: (revMonth - expenses).toFixed(2),
    },
    users: {
      total: parseInt(u.total)||0,
      customers: parseInt(u.customers)||0,
      new_today: parseInt(u.today)||0,
      new_this_week: parseInt(u.this_week)||0,
      new_this_month: parseInt(u.this_month)||0,
    },
    products: {
      total: parseInt(p.total)||0,
      approved: parseInt(p.approved)||0,
      pending_approval: parseInt(p.pending)||0,
    },
    inventory: {
      total_items: parseInt(inv.total_items)||0,
      low_stock: parseInt(inv.low_stock)||0,
      out_of_stock: parseInt(inv.out_of_stock)||0,
      value: parseFloat(inv.inventory_value||0).toFixed(2),
    },
    active_sessions: parseInt(s.active)||0,
    new_users_today: newUsersRow.rows.map(r => ({ name: r.name, email: r.email })),
    top_products: topProductsRow.rows.map(r => ({ name: r.name, qty: parseInt(r.qty), rev: parseFloat(r.rev).toFixed(2) })),
    low_stock_items: lowStockRow.rows.map(r => ({ name: r.title, sku: r.sku, stock: r.current_stock, reorder: r.reorder_level })),
    recent_orders: recentOrdersRow.rows.map(r => ({ id: r.order_id, name: r.full_name, amount: r.total, status: r.status })),
    utm: {
      total_links: utmLinks.length,
      total_clicks_all: utmTotalClicks,
      clicks_today: utmClicksToday,
      top_source: utmLinks[0]?.source || null,
      links: utmLinks.map(l => ({
        name: l.name,
        source: l.source,
        medium: l.medium,
        campaign: l.campaign || null,
        total_clicks: parseInt(l.total_clicks) || 0,
        unique_clicks: parseInt(l.unique_clicks) || 0,
      })),
    },
  };
}

// Build UTM section string for prompts
function buildUtmSection(utm) {
  if (!utm || utm.total_links === 0) {
    return 'UTM TRACKING: No tracking links have been created yet.';
  }
  const lines = utm.links.map((l, i) =>
    (i + 1) + '. "' + l.name + '" | Source: ' + (l.source || 'unknown') +
    ' | Medium: ' + (l.medium || 'unknown') +
    (l.campaign ? (' | Campaign: ' + l.campaign) : '') +
    ' | Clicks: ' + l.total_clicks + ' total, ' + l.unique_clicks + ' unique'
  ).join('\n');

  return 'UTM TRACKING LINKS (your marketing performance data):\n' +
    '- Active tracking links: ' + utm.total_links + '\n' +
    '- Total clicks (all time): ' + utm.total_clicks_all + '\n' +
    '- Clicks today: ' + utm.clicks_today + '\n' +
    '- Top source: ' + (utm.top_source || 'none') + '\n' +
    '- Link breakdown:\n' + lines;
}

// POST /api/erp/ai/brief
const getBrief = async (req, res) => {
  try {
    const businessId = req.tenant?.business_id || req.user?.business_id;
    const metrics    = await fetchLiveMetrics(businessId);
    const utmSection = buildUtmSection(metrics.utm);

    const prompt =
      'You are NOREN\'s AI business assistant. You have DIRECT ACCESS to the following live business data. ' +
      'This data is coming from the NOREN database in real time. Use it fully in your response.\n\n' +
      'Today is ' + metrics.datetime + '.\n\n' +
      'ORDERS:\n' +
      '- Today: ' + metrics.orders.today + ' | This week: ' + metrics.orders.this_week + ' | This month: ' + metrics.orders.this_month + '\n' +
      '- Pending: ' + metrics.orders.pending + ' | Delivered: ' + metrics.orders.delivered + '\n\n' +
      'REVENUE:\n' +
      '- Today: Rs.' + metrics.revenue.today + ' | This month: Rs.' + metrics.revenue.this_month + '\n' +
      '- Expenses: Rs.' + metrics.revenue.expenses_month + ' | Profit estimate: Rs.' + metrics.revenue.profit_estimate + '\n\n' +
      'USERS:\n' +
      '- New today: ' + metrics.users.new_today + ' | New this week: ' + metrics.users.new_this_week + ' | Total: ' + metrics.users.total + '\n' +
      (metrics.new_users_today.length > 0 ? '- New user names: ' + metrics.new_users_today.map(u => u.name).join(', ') + '\n' : '') + '\n' +
      'INVENTORY:\n' +
      '- Low stock: ' + metrics.inventory.low_stock + ' | Out of stock: ' + metrics.inventory.out_of_stock + '\n' +
      (metrics.low_stock_items.length > 0 ? '- Critical: ' + metrics.low_stock_items.slice(0,3).map(i => i.name + ' (' + i.stock + ' left)').join(', ') + '\n' : '') + '\n' +
      'TOP PRODUCTS THIS MONTH:\n' +
      metrics.top_products.map((p,i) => (i+1) + '. ' + p.name + ' - ' + p.qty + ' sold - Rs.' + p.rev).join('\n') + '\n\n' +
      'ACTIVE SESSIONS: ' + metrics.active_sessions + ' users online\n\n' +
      utmSection + '\n\n' +
      'Give a sharp spoken business briefing under 200 words. Start with "Good morning/afternoon/evening, here is your NOREN update." ' +
      'Cover the most important numbers. Flag anything critical. End with one suggestion. No bullet points, no markdown, speak naturally.';

    const response = await callGemini(prompt);
    res.json({ brief: response, metrics });
  } catch (err) {
    console.error('AI brief error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/erp/ai/chat
const chat = async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ message: 'message required' });

  try {
    const businessId = req.tenant?.business_id || req.user?.business_id;
    const metrics    = await fetchLiveMetrics(businessId);
    const utmSection = buildUtmSection(metrics.utm);

    const conversationHistory = history.slice(-6).map(m =>
      (m.role === 'user' ? 'Admin' : 'NOREN AI') + ': ' + m.content
    ).join('\n');

    const prompt =
      'You are NOREN\'s AI business assistant. You have DIRECT DATABASE ACCESS to the following live data. ' +
      'Always use this data when answering. NEVER say you do not have access to any of this data.\n\n' +
      'LIVE NOREN BUSINESS DATA (' + metrics.datetime + '):\n\n' +
      'Revenue today: Rs.' + metrics.revenue.today + ' | This month: Rs.' + metrics.revenue.this_month + '\n' +
      'Orders today: ' + metrics.orders.today + ' | Pending: ' + metrics.orders.pending + ' | This month: ' + metrics.orders.this_month + '\n' +
      'New users today: ' + metrics.users.new_today + ' | Total users: ' + metrics.users.total + '\n' +
      'Low stock items: ' + metrics.inventory.low_stock + ' | Out of stock: ' + metrics.inventory.out_of_stock + '\n' +
      'Active sessions: ' + metrics.active_sessions + '\n' +
      'Top products: ' + metrics.top_products.slice(0,3).map(p => p.name).join(', ') + '\n\n' +
      utmSection + '\n\n' +
      (conversationHistory ? 'Recent conversation:\n' + conversationHistory + '\n\n' : '') +
      'Admin asks: ' + message + '\n\n' +
      'Answer directly using the data above. Be concise — 2 to 4 sentences. No markdown. No bullet points. Speak naturally.';

    const response = await callGemini(prompt);
    res.json({ response, metrics });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getBrief, chat };

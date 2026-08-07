'use strict';

const { pool } = require('../config/db');
const https    = require('https');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ── Helper: call Gemini API ───────────────────────────────────────────────────
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) throw new Error('Gemini API key not configured');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
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
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
            resolve(text.trim());
          } catch {
            reject(new Error('Invalid Gemini response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Gemini timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Fetch all live business metrics ──────────────────────────────────────────
async function fetchLiveMetrics(businessId) {
  const scope   = businessId ? `AND business_id = ${parseInt(businessId)}` : '';
  const bScope  = businessId ? `WHERE business_id = ${parseInt(businessId)}` : '';
  const nowStr  = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const [
    ordersRow, usersRow, productsRow, sessionsRow,
    posRow, expenseRow, inventoryRow, newUsersRow,
    topProductsRow, lowStockRow, recentOrdersRow,
  ] = await Promise.all([
    // Commerce orders
    pool.query(`SELECT
      COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE) AS today,
      COUNT(*) FILTER (WHERE created_at>=DATE_TRUNC('week',NOW())) AS this_week,
      COUNT(*) FILTER (WHERE created_at>=DATE_TRUNC('month',NOW())) AS this_month,
      COUNT(*) FILTER (WHERE status='pending') AS pending,
      COUNT(*) FILTER (WHERE status='delivered') AS delivered,
      COALESCE(SUM(total) FILTER (WHERE DATE(created_at)=CURRENT_DATE AND payment_status='paid'),0) AS revenue_today,
      COALESCE(SUM(total) FILTER (WHERE created_at>=DATE_TRUNC('month',NOW()) AND payment_status='paid'),0) AS revenue_month
      FROM src_orders WHERE 1=1 ${scope}`),

    // Users
    pool.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE) AS today,
      COUNT(*) FILTER (WHERE created_at>=DATE_TRUNC('week',NOW())) AS this_week,
      COUNT(*) FILTER (WHERE created_at>=DATE_TRUNC('month',NOW())) AS this_month,
      COUNT(*) FILTER (WHERE role='user') AS customers,
      COUNT(*) FILTER (WHERE is_banned=TRUE) AS banned
      FROM src_users`),

    // Products
    pool.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status='approved') AS approved,
      COUNT(*) FILTER (WHERE status='pending') AS pending,
      COUNT(*) FILTER (WHERE is_featured=TRUE) AS featured,
      COUNT(*) FILTER (WHERE is_trending=TRUE) AS trending
      FROM src_products WHERE deleted_at IS NULL`),

    // Active login sessions
    pool.query(`SELECT COUNT(*) AS active FROM src_login_sessions WHERE is_active=TRUE`),

    // POS / ERP sales
    pool.query(`SELECT
      COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE AND status='completed') AS bills_today,
      COALESCE(SUM(total) FILTER (WHERE DATE(created_at)=CURRENT_DATE AND status='completed'),0) AS pos_today,
      COALESCE(SUM(total) FILTER (WHERE created_at>=DATE_TRUNC('month',NOW()) AND status='completed'),0) AS pos_month
      FROM src_erp_sales WHERE 1=1 ${scope}`),

    // Expenses this month
    pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM src_erp_expenses
      WHERE expense_date>=DATE_TRUNC('month',CURRENT_DATE) ${scope}`),

    // Inventory
    pool.query(`SELECT
      COUNT(*) AS total_items,
      COUNT(*) FILTER (WHERE current_stock<=reorder_level) AS low_stock,
      COUNT(*) FILTER (WHERE current_stock=0) AS out_of_stock,
      COALESCE(SUM(current_stock*purchase_price),0) AS inventory_value
      FROM src_erp_inventory_items WHERE status='active' ${scope}`),

    // New users today
    pool.query(`SELECT name, email, created_at FROM src_users
      WHERE DATE(created_at)=CURRENT_DATE ORDER BY created_at DESC LIMIT 5`),

    // Top products this month
    pool.query(`SELECT COALESCE(i.title,si.title) AS name, SUM(si.quantity) AS qty, SUM(si.line_total) AS rev
      FROM src_erp_sale_items si
      JOIN src_erp_sales s ON s.id=si.sale_id
      LEFT JOIN src_erp_inventory_items i ON i.id=si.inventory_item_id
      WHERE s.status='completed' AND s.created_at>=DATE_TRUNC('month',NOW()) ${scope}
      GROUP BY COALESCE(i.title,si.title) ORDER BY rev DESC LIMIT 5`),

    // Low stock items
    pool.query(`SELECT title, sku, current_stock, reorder_level FROM src_erp_inventory_items
      WHERE current_stock<=reorder_level AND status='active' ${scope}
      ORDER BY current_stock ASC LIMIT 8`),

    // Recent orders
    pool.query(`SELECT order_id, full_name, total, status, payment_status, created_at FROM src_orders
      WHERE 1=1 ${scope} ORDER BY created_at DESC LIMIT 5`),
  ]);

  const o  = ordersRow.rows[0]    || {};
  const u  = usersRow.rows[0]     || {};
  const p  = productsRow.rows[0]  || {};
  const s  = sessionsRow.rows[0]  || {};
  const pos = posRow.rows[0]      || {};
  const exp = expenseRow.rows[0]  || {};
  const inv = inventoryRow.rows[0]|| {};

  const revToday = (parseFloat(o.revenue_today)||0) + (parseFloat(pos.pos_today)||0);
  const revMonth = (parseFloat(o.revenue_month)||0) + (parseFloat(pos.pos_month)||0);
  const expenses = parseFloat(exp.total) || 0;

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
      banned: parseInt(u.banned)||0,
    },
    products: {
      total: parseInt(p.total)||0,
      approved: parseInt(p.approved)||0,
      pending_approval: parseInt(p.pending)||0,
      featured: parseInt(p.featured)||0,
      trending: parseInt(p.trending)||0,
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
    recent_orders: recentOrdersRow.rows.map(r => ({ id: r.order_id, name: r.full_name, amount: r.total, status: r.status, payment: r.payment_status })),
  };
}

// ── POST /api/erp/ai/brief ────────────────────────────────────────────────────
// Returns a spoken business briefing using live data
const getBrief = async (req, res) => {
  try {
    const businessId = req.tenant?.business_id || req.user?.business_id;
    const metrics    = await fetchLiveMetrics(businessId);

    const prompt = `You are NOREN's AI business assistant — confident, professional, concise. Speak like a sharp business advisor.

Today is ${metrics.datetime}.

Here is the live business data for NOREN Fashion:

ORDERS:
- Today: ${metrics.orders.today} orders
- This week: ${metrics.orders.this_week} orders
- This month: ${metrics.orders.this_month} orders
- Pending: ${metrics.orders.pending}
- Delivered: ${metrics.orders.delivered}

REVENUE:
- Today: ₹${metrics.revenue.today}
- This month: ₹${metrics.revenue.this_month}
- POS Bills today: ${metrics.revenue.pos_bills_today}
- Expenses this month: ₹${metrics.revenue.expenses_month}
- Profit estimate: ₹${metrics.revenue.profit_estimate}

USERS & CUSTOMERS:
- Total registered users: ${metrics.users.total}
- New today: ${metrics.users.new_today}
- New this week: ${metrics.users.new_this_week}
- New this month: ${metrics.users.new_this_month}
${metrics.new_users_today.length > 0 ? `- New users today: ${metrics.new_users_today.map(u => u.name).join(', ')}` : ''}

PRODUCTS:
- Total: ${metrics.products.total}
- Approved: ${metrics.products.approved}
- Pending approval: ${metrics.products.pending_approval}
- Featured: ${metrics.products.featured}

INVENTORY:
- Total items: ${metrics.inventory.total_items}
- Low stock: ${metrics.inventory.low_stock}
- Out of stock: ${metrics.inventory.out_of_stock}
- Inventory value: ₹${metrics.inventory.value}
${metrics.low_stock_items.length > 0 ? `- Critical low stock: ${metrics.low_stock_items.slice(0,3).map(i => `${i.name} (${i.stock} left)`).join(', ')}` : ''}

TOP PRODUCTS THIS MONTH:
${metrics.top_products.map((p,i) => `${i+1}. ${p.name} — ${p.qty} sold — ₹${p.rev}`).join('\n')}

ACTIVE SESSIONS: ${metrics.active_sessions} users online right now

Give a sharp, professional spoken briefing. Start with "Good [morning/afternoon/evening], here's your NOREN business update." Cover the most important metrics, flag anything critical (low stock, pending orders, no sales today if applicable). Keep it under 200 words. Speak directly — no bullet points, no markdown, just natural flowing speech. End with one actionable suggestion.`;

    const response = await callGemini(prompt);
    res.json({ brief: response, metrics });
  } catch (err) {
    console.error('AI brief error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/erp/ai/chat ─────────────────────────────────────────────────────
// Answers any admin question with live business context
const chat = async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ message: 'message required' });

  try {
    const businessId = req.tenant?.business_id || req.user?.business_id;
    const metrics    = await fetchLiveMetrics(businessId);

    const contextBlock = `CURRENT LIVE NOREN BUSINESS DATA (${metrics.datetime}):
Revenue today: ₹${metrics.revenue.today} | This month: ₹${metrics.revenue.this_month}
Orders today: ${metrics.orders.today} | Pending: ${metrics.orders.pending}
New users today: ${metrics.users.new_today} | Total users: ${metrics.users.total}
Low stock items: ${metrics.inventory.low_stock} | Out of stock: ${metrics.inventory.out_of_stock}
Active sessions: ${metrics.active_sessions}
Top products: ${metrics.top_products.slice(0,3).map(p => p.name).join(', ')}`;

    const conversationHistory = history.slice(-6).map(m =>
      `${m.role === 'user' ? 'Admin' : 'NOREN AI'}: ${m.content}`
    ).join('\n');

    const prompt = `You are NOREN's AI business assistant — sharp, professional, helpful. You have access to live business data.

${contextBlock}

${conversationHistory ? `Recent conversation:\n${conversationHistory}\n` : ''}
Admin asks: ${message}

Answer directly and professionally. If the question is about business data, use the live data above. Keep responses concise — 2-4 sentences max unless they ask for detail. No markdown, no bullet points. Speak naturally as if in a business meeting. If you don't have specific data they asked for, say so and suggest where to find it.`;

    const response = await callGemini(prompt);
    res.json({ response, metrics });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getBrief, chat };

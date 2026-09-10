'use strict';
/**
 * NOREN Monitor API  —  /api/monitor/*
 * ──────────────────────────────────────
 * All endpoints query the LIVE database and the in-memory event bus.
 * No mocks, no demo data — everything is real.
 *
 * Routes:
 *   GET  /api/monitor/stats        — DB counts + in-memory snapshot
 *   GET  /api/monitor/db           — DB failover state + pool health
 *   GET  /api/monitor/errors       — recent 4xx/5xx log
 *   GET  /api/monitor/activity     — recent named events (orders, emails…)
 *   GET  /api/monitor/routes       — top API routes by hit count
 *   GET  /api/monitor/services     — check every external service (DB, email, cloud)
 */

const router  = require('express').Router();
const { pool } = require('../config/db');
const mon     = require('../monitor');

// ── Simple secret guard (set MONITOR_SECRET in .env, or leave open for internal use) ──
const MONITOR_SECRET = process.env.MONITOR_SECRET || null;

function guard(req, res, next) {
  if (!MONITOR_SECRET) return next();
  const token = req.headers['x-monitor-key'] || req.query.key;
  if (token === MONITOR_SECRET) return next();
  return res.status(401).json({ error: 'Unauthorized — x-monitor-key required' });
}

router.use(guard);

// ────────────────────────────────────────────────────────────────────────────
//  Helper: safe DB query — returns null on failure instead of throwing
// ────────────────────────────────────────────────────────────────────────────
async function safeQuery(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    return null;
  }
}

async function safeCount(sql, params = []) {
  const rows = await safeQuery(sql, params);
  if (!rows) return null;
  return parseInt(rows[0]?.count ?? rows[0]?.total ?? 0, 10);
}

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/monitor/stats
//  Returns everything the dashboard needs in one shot:
//    - live DB counts (orders, users, products, sellers, queries, employees…)
//    - in-memory event bus snapshot (uptime, request rates, status counts)
// ────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const [
    totalOrders,
    pendingOrders,
    todayOrders,
    totalRevenue,
    todayRevenue,
    totalUsers,
    newUsersToday,
    totalProducts,
    activeProducts,
    pendingProducts,
    totalSellers,
    activeSellers,
    pendingQueries,
    totalQueries,
    totalEmployees,
    totalInventoryItems,
    lowStockItems,
    pendingReturns,
    totalNotifications,
    unreadNotifications,
    totalShipments,
    activeShipments,
    newsletterSubs,
    totalPOSBills,
    todayPOSRevenue,
    dbActiveIndex,
  ] = await Promise.all([
    // Orders
    safeCount(`SELECT COUNT(*) FROM src_orders`),
    safeCount(`SELECT COUNT(*) FROM src_orders WHERE status='pending'`),
    safeCount(`SELECT COUNT(*) FROM src_orders WHERE created_at >= CURRENT_DATE`),
    safeCount(`SELECT COALESCE(SUM(total),0) AS count FROM src_orders WHERE payment_status='paid'`),
    safeCount(`SELECT COALESCE(SUM(total),0) AS count FROM src_orders WHERE payment_status='paid' AND created_at >= CURRENT_DATE`),
    // Users
    safeCount(`SELECT COUNT(*) FROM src_users`),
    safeCount(`SELECT COUNT(*) FROM src_users WHERE created_at >= CURRENT_DATE`),
    // Products
    safeCount(`SELECT COUNT(*) FROM src_products WHERE deleted_at IS NULL`),
    safeCount(`SELECT COUNT(*) FROM src_products WHERE status='approved' AND deleted_at IS NULL`),
    safeCount(`SELECT COUNT(*) FROM src_products WHERE status='pending' AND deleted_at IS NULL`),
    // Sellers
    safeCount(`SELECT COUNT(*) FROM src_users WHERE role='seller'`),
    safeCount(`SELECT COUNT(*) FROM src_users WHERE role='seller' AND is_banned=FALSE`),
    // Queries / Contact
    safeCount(`SELECT COUNT(*) FROM src_queries WHERE status='pending'`),
    safeCount(`SELECT COUNT(*) FROM src_queries`),
    // Employees
    safeCount(`SELECT COUNT(*) FROM src_erp_employees`).catch(() =>
      safeCount(`SELECT COUNT(*) FROM src_users WHERE role='employee'`)
    ),
    // Inventory
    safeCount(`SELECT COUNT(*) FROM src_erp_inventory_items`).catch(() => null),
    safeCount(`SELECT COUNT(*) FROM src_erp_inventory_items WHERE quantity <= reorder_level`).catch(() => null),
    // Returns
    safeCount(`SELECT COUNT(*) FROM src_erp_returns WHERE status='pending'`).catch(() => null),
    // Notifications
    safeCount(`SELECT COUNT(*) FROM src_notifications`),
    safeCount(`SELECT COUNT(*) FROM src_notifications WHERE is_read=FALSE`),
    // Shipments
    safeCount(`SELECT COUNT(*) FROM src_shipments`).catch(() => null),
    safeCount(`SELECT COUNT(*) FROM src_shipments WHERE status NOT IN ('delivered','cancelled')`).catch(() => null),
    // Newsletter
    safeCount(`SELECT COUNT(*) FROM src_newsletter_subscribers`).catch(() =>
      safeCount(`SELECT COUNT(*) FROM src_newsletter_subscriptions`).catch(() => null)
    ),
    // POS
    safeCount(`SELECT COUNT(*) FROM src_erp_pos_bills`).catch(() => null),
    safeCount(`SELECT COALESCE(SUM(total),0) AS count FROM src_erp_pos_bills WHERE created_at >= CURRENT_DATE`).catch(() => null),
    // DB state
    Promise.resolve(require('../config/db')._activeIndex ?? 0),
  ]);

  // Recent orders (last 10)
  const recentOrders = await safeQuery(
    `SELECT order_id, full_name, total, status, payment_status, created_at
     FROM src_orders ORDER BY created_at DESC LIMIT 10`
  );

  // Recent signups (last 5)
  const recentUsers = await safeQuery(
    `SELECT name, email, role, created_at FROM src_users ORDER BY created_at DESC LIMIT 5`
  );

  // Recent queries (last 5)
  const recentQueryRows = await safeQuery(
    `SELECT ticket_id, name, subject, status, created_at FROM src_queries ORDER BY created_at DESC LIMIT 5`
  );

  // Order status breakdown
  const orderStatusRows = await safeQuery(
    `SELECT status, COUNT(*) AS cnt FROM src_orders GROUP BY status ORDER BY cnt DESC`
  );

  // In-memory snapshot
  const snap = mon.getSnapshot();

  res.json({
    ts: new Date().toISOString(),
    db: {
      activeNode:  (dbActiveIndex || 0) + 1,
      status:      totalOrders !== null ? 'connected' : 'error',
    },
    orders: {
      total:     totalOrders,
      pending:   pendingOrders,
      today:     todayOrders,
      revenue:   totalRevenue,
      todayRevenue,
      statusBreakdown: orderStatusRows || [],
      recent:    recentOrders || [],
    },
    users: {
      total:    totalUsers,
      newToday: newUsersToday,
      recent:   recentUsers || [],
    },
    products: {
      total:   totalProducts,
      active:  activeProducts,
      pending: pendingProducts,
    },
    sellers: {
      total:  totalSellers,
      active: activeSellers,
    },
    queries: {
      total:   totalQueries,
      pending: pendingQueries,
      recent:  recentQueryRows || [],
    },
    employees:    { total: totalEmployees },
    inventory:    { total: totalInventoryItems, lowStock: lowStockItems },
    returns:      { pending: pendingReturns },
    notifications:{ total: totalNotifications, unread: unreadNotifications },
    shipments:    { total: totalShipments, active: activeShipments },
    newsletter:   { subscribers: newsletterSubs },
    pos:          { bills: totalPOSBills, todayRevenue: todayPOSRevenue },
    // In-memory request metrics
    server: {
      uptime:        snap.uptime,
      startedAt:     snap.startedAt,
      totalRequests: snap.totalRequests,
      statusCounts:  snap.statusCounts,
      methodCounts:  snap.methodCounts,
      perMinute:     snap.perMinute,
      errorRate:     snap.errorRate,
      topRoutes:     snap.topRoutes,
    },
  });
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/monitor/db
//  Live database failover status
// ────────────────────────────────────────────────────────────────────────────
router.get('/db', async (req, res) => {
  const dbModule = require('../config/db');
  const activeIndex = dbModule.activeIndex ?? 0;

  // Ping each configured DB node
  const RAW = [
    process.env.DATABASE_URL_1,
    process.env.DATABASE_URL_2,
    process.env.DATABASE_URL_3,
  ].filter(Boolean);

  const checks = await Promise.all(
    RAW.map(async (_, i) => {
      const start = Date.now();
      try {
        if (i === activeIndex) {
          await pool.query('SELECT 1');
          return { node: i + 1, status: 'ok', latencyMs: Date.now() - start, active: true };
        }
        return { node: i + 1, status: 'standby', latencyMs: null, active: false };
      } catch (e) {
        return { node: i + 1, status: 'error', error: e.message, latencyMs: Date.now() - start, active: false };
      }
    })
  );

  // Active DB query timing
  const queryStart = Date.now();
  const testQuery  = await safeQuery('SELECT NOW() AS server_time, version() AS pg_version');
  const queryMs    = Date.now() - queryStart;

  res.json({
    ts:          new Date().toISOString(),
    activeNode:  activeIndex + 1,
    latencyMs:   queryMs,
    serverTime:  testQuery?.[0]?.server_time || null,
    pgVersion:   testQuery?.[0]?.pg_version?.split(' ').slice(0, 2).join(' ') || null,
    nodes:       checks,
  });
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/monitor/errors
//  Last 100 4xx/5xx requests
// ────────────────────────────────────────────────────────────────────────────
router.get('/errors', (req, res) => {
  res.json({
    ts:     new Date().toISOString(),
    count:  mon._errors.length,
    errors: [...mon._errors].reverse(),
  });
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/monitor/activity
//  Named business events: orders placed, emails sent, OTPs, logins…
// ────────────────────────────────────────────────────────────────────────────
router.get('/activity', (req, res) => {
  res.json({
    ts:       new Date().toISOString(),
    count:    mon._activity.length,
    activity: [...mon._activity].reverse(),
  });
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/monitor/routes
//  All API routes sorted by hit count
// ────────────────────────────────────────────────────────────────────────────
router.get('/routes', (req, res) => {
  res.json({
    ts:     new Date().toISOString(),
    routes: mon.getTopRoutes(50),
  });
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/monitor/services
//  Checks every external service: DB, Cloudinary, Resend email, VAPID
// ────────────────────────────────────────────────────────────────────────────
router.get('/services', async (req, res) => {
  const services = [];

  // 1. Database
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    services.push({ name: 'PostgreSQL (Primary)', status: 'ok', latencyMs: Date.now() - dbStart });
  } catch (e) {
    services.push({ name: 'PostgreSQL (Primary)', status: 'error', error: e.message, latencyMs: Date.now() - dbStart });
  }

  // 2. Cloudinary
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (cloudName) {
    const cStart = Date.now();
    try {
      const cloudinary = require('../config/cloudinary');
      await cloudinary.api.ping();
      services.push({ name: 'Cloudinary CDN', status: 'ok', latencyMs: Date.now() - cStart });
    } catch (e) {
      services.push({ name: 'Cloudinary CDN', status: 'error', error: e.message, latencyMs: Date.now() - cStart });
    }
  } else {
    services.push({ name: 'Cloudinary CDN', status: 'unconfigured' });
  }

  // 3. Resend Email
  services.push({
    name: 'Resend Email',
    status: process.env.RESEND_API_KEY ? 'configured' : 'unconfigured',
  });

  // 4. VAPID Push
  services.push({
    name: 'Web Push (VAPID)',
    status: process.env.VAPID_PUBLIC_KEY ? 'configured' : 'unconfigured',
  });

  // 5. Delhivery Shipping
  services.push({
    name: 'Delhivery Shipping',
    status: process.env.DELHIVERY_API_TOKEN ? 'configured' : 'unconfigured',
  });

  // 6. Google OAuth
  services.push({
    name: 'Google OAuth',
    status: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'unconfigured',
  });

  // 7. Paytm Payments
  services.push({
    name: 'Paytm Payments',
    status: process.env.PAYTM_MID ? 'configured' : 'unconfigured',
  });

  res.json({ ts: new Date().toISOString(), services });
});

module.exports = router;

'use strict';
/**
 * NOREN Monitor API  —  /api/monitor/*
 * ──────────────────────────────────────
 * All endpoints query the LIVE database and the in-memory event bus.
 * No mocks, no demo data — everything is real.
 *
 * Routes:
 *   GET  /api/monitor/stats          — DB counts + in-memory snapshot
 *   GET  /api/monitor/db             — DB failover state + pool health
 *   POST /api/monitor/db/switch      — Force-switch active DB node
 *   POST /api/monitor/db/ping-all    — Ping every DB node simultaneously
 *   GET  /api/monitor/db/tables      — List tables + row counts on active DB
 *   POST /api/monitor/db/copy        — Copy all data from one node to another (SSE stream)
 *   GET  /api/monitor/errors         — recent 4xx/5xx log
 *   GET  /api/monitor/activity       — recent named events (orders, emails…)
 *   GET  /api/monitor/routes         — top API routes by hit count
 *   GET  /api/monitor/services       — check every external service
 *   GET  /api/monitor/system/health  — full system health (memory, CPU, env, process)
 *   POST /api/monitor/system/shutdown — graceful server shutdown (requires MONITOR_SECRET)
 */

const router  = require('express').Router();
const os      = require('os');
const { pool, forceSwitch, pingAllNodes, copyDatabase, getPoolStats, RAW_URLS } = require('../config/db');
const mon     = require('../monitor');
const loginBlock = require('../services/loginBlockService');

// ── Simple secret guard (set MONITOR_SECRET in .env, or leave open for internal use) ──
const MONITOR_SECRET = process.env.MONITOR_SECRET || null;

// Guard for write operations (switch, copy, shutdown)
function guardWrite(req, res, next) {
  if (!MONITOR_SECRET) {
    console.log('[Monitor] No MONITOR_SECRET set - allowing request');
    return next();
  }
  const token = req.headers['x-monitor-key'] || req.query.key || req.body?.secret;
  console.log('[Monitor] guardWrite check:', { 
    hasHeader: !!req.headers['x-monitor-key'], 
    hasQuery: !!req.query.key, 
    hasBody: !!req.body?.secret,
    secretMatch: token === MONITOR_SECRET 
  });
  if (token === MONITOR_SECRET) return next();
  return res.status(401).json({ error: 'Unauthorized — x-monitor-key required', hint: 'Set MONITOR_SECRET in .env and provide it in request body as "secret"' });
}

// Read-only endpoints are open, write operations are protected
// (This allows the dashboard to load, but requires auth for critical operations)

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

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/monitor/db/switch
//  Force the active DB node to a specific index (1-based from the client).
//  Body: { node: 1|2|3, confirm: true }
// ════════════════════════════════════════════════════════════════════════════
router.post('/db/switch', guardWrite, async (req, res) => {
  const { node, confirm, secret } = req.body || {};
  
  console.log('[Monitor] DB switch request:', { node, confirm, hasSecret: !!secret, bodyKeys: Object.keys(req.body || {}) });
  
  if (!confirm) return res.status(400).json({ ok: false, error: 'Must send confirm:true to execute a DB switch.' });

  const targetIndex = parseInt(node, 10) - 1;   // client sends 1-based
  if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= (RAW_URLS?.length || 3)) {
    return res.status(400).json({ ok: false, error: `Invalid node ${node}. Must be 1–${RAW_URLS?.length || 3}.` });
  }

  const result = await forceSwitch(targetIndex);

  // Record in activity log + broadcast
  const ev = mon.recordActivity({
    type:   'db_switch',
    label:  `DB Switch: DB${result.from} → DB${result.to}`,
    detail: result.ok ? 'Manual switch successful' : result.error,
    level:  result.ok ? 'warn' : 'error',
    meta:   result,
  });
  try {
    const io = require('../realtime').get?.();
    if (io) io.of('/monitor').emit('activity', ev);
    if (io) io.of('/monitor').emit('db_switched', result);
  } catch (_) {}

  if (result.ok) {
    console.log(`🎛️  Monitor: DB switched to DB${result.to}`);
    return res.json({ ok: true, message: `Switched to DB${result.to}`, ...result });
  } else {
    return res.status(500).json({ ok: false, error: result.error, ...result });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/monitor/db/ping-all
//  Simultaneously pings every configured DB node and returns latency.
// ════════════════════════════════════════════════════════════════════════════
router.post('/db/ping-all', guardWrite, async (req, res) => {
  const results = await pingAllNodes();
  res.json({ ts: new Date().toISOString(), nodes: results });
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/monitor/db/tables
//  Lists all tables on the ACTIVE DB with row counts and sizes.
// ════════════════════════════════════════════════════════════════════════════
router.get('/db/tables', async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT
        t.tablename                                           AS table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)))  AS total_size,
        pg_total_relation_size(quote_ident(t.tablename))     AS size_bytes,
        COALESCE(s.n_live_tup, 0)                            AS row_count,
        COALESCE(s.n_dead_tup, 0)                            AS dead_rows,
        s.last_vacuum,
        s.last_analyze
      FROM pg_tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename
      WHERE t.schemaname = 'public'
      ORDER BY size_bytes DESC NULLS LAST
    `);
    res.json({ ts: new Date().toISOString(), count: rows.rows.length, tables: rows.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/monitor/db/copy
//  Copy all tables from one DB node to another.
//  Uses Server-Sent Events so the client sees real-time progress.
//  Body: { from: 1|2|3, to: 1|2|3, confirm: true }
// ════════════════════════════════════════════════════════════════════════════
router.post('/db/copy', guardWrite, async (req, res) => {
  const { from, to, confirm } = req.body || {};

  if (!confirm) {
    return res.status(400).json({ ok: false, error: 'Must send confirm:true. This is a destructive operation.' });
  }

  const fi = parseInt(from, 10) - 1;  // 1-based → 0-based
  const ti = parseInt(to,   10) - 1;

  if (fi === ti) return res.status(400).json({ ok: false, error: 'Source and destination cannot be the same node.' });

  const maxNodes = RAW_URLS?.length || 3;
  if (fi < 0 || fi >= maxNodes) return res.status(400).json({ ok: false, error: `Invalid from node ${from}` });
  if (ti < 0 || ti >= maxNodes) return res.status(400).json({ ok: false, error: `Invalid to node ${to}` });

  // Stream progress via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (type, data) => {
    try { res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
  };

  send('start', { from: fi + 1, to: ti + 1, ts: new Date().toISOString() });

  // Record activity
  mon.recordActivity({
    type:   'db_copy',
    label:  `DB Copy Started: DB${fi + 1} → DB${ti + 1}`,
    detail: `Copying all tables from DB${fi + 1} to DB${ti + 1}`,
    level:  'warn',
  });

  const result = await copyDatabase(fi, ti, (msg) => {
    send('progress', { msg, ts: new Date().toISOString() });
    // Also push to monitor namespace
    try {
      const io = require('../realtime').get?.();
      if (io) io.of('/monitor').emit('activity', {
        type: 'db_copy', label: 'DB Copy', detail: msg, level: 'info', ts: new Date().toISOString(),
      });
    } catch (_) {}
  });

  send('done', { ...result, ts: new Date().toISOString() });

  mon.recordActivity({
    type:   'db_copy',
    label:  `DB Copy ${result.ok ? 'Complete' : 'Failed'}: DB${fi + 1} → DB${ti + 1}`,
    detail: `${result.copied ?? 0} tables copied, ${result.errors ?? 0} errors`,
    level:  result.ok ? 'success' : 'error',
  });

  res.end();
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/monitor/system/health
//  Returns full system health: process memory, CPU load, env config status,
//  Node.js version, uptime, and per-pool connection stats.
// ════════════════════════════════════════════════════════════════════════════
router.get('/system/health', (req, res) => {
  const mem   = process.memoryUsage();
  const cpus  = os.cpus();
  const snap  = mon.getSnapshot();
  const pools = getPoolStats();

  // CPU load average (1 / 5 / 15 min)
  const loadAvg = os.loadavg();

  // Check which env vars are configured (boolean only — no values)
  const envChecks = {
    DATABASE_URL_1:      !!process.env.DATABASE_URL_1,
    DATABASE_URL_2:      !!process.env.DATABASE_URL_2,
    DATABASE_URL_3:      !!process.env.DATABASE_URL_3,
    JWT_SECRET:          !!process.env.JWT_SECRET,
    RESEND_API_KEY:      !!process.env.RESEND_API_KEY,
    CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
    VAPID_PUBLIC_KEY:    !!process.env.VAPID_PUBLIC_KEY,
    GOOGLE_CLIENT_ID:    !!process.env.GOOGLE_CLIENT_ID,
    PAYTM_MID:           !!process.env.PAYTM_MID,
    DELHIVERY_API_TOKEN: !!process.env.DELHIVERY_API_TOKEN,
    FRONTEND_URL:        !!process.env.FRONTEND_URL,
    RENDER_EXTERNAL_URL: !!process.env.RENDER_EXTERNAL_URL,
    MONITOR_SECRET:      !!process.env.MONITOR_SECRET,
  };

  res.json({
    ts:       new Date().toISOString(),
    status:   'ok',
    process: {
      pid:        process.pid,
      nodeVersion: process.version,
      platform:   process.platform,
      arch:       process.arch,
      uptime:     Math.floor(process.uptime()),
      env:        process.env.NODE_ENV || 'development',
    },
    memory: {
      rss:        (mem.rss         / 1024 / 1024).toFixed(1) + ' MB',
      heapUsed:   (mem.heapUsed    / 1024 / 1024).toFixed(1) + ' MB',
      heapTotal:  (mem.heapTotal   / 1024 / 1024).toFixed(1) + ' MB',
      external:   (mem.external    / 1024 / 1024).toFixed(1) + ' MB',
      heapPercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1) + '%',
      rssMB:      parseFloat((mem.rss / 1024 / 1024).toFixed(1)),
      heapUsedMB: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(1)),
      heapTotalMB:parseFloat((mem.heapTotal / 1024 / 1024).toFixed(1)),
    },
    os: {
      hostname:  os.hostname(),
      platform:  os.platform(),
      arch:      os.arch(),
      cpuCount:  cpus.length,
      cpuModel:  cpus[0]?.model || 'Unknown',
      totalMemGB:(os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      freeMemGB: (os.freemem()  / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      loadAvg:   { '1m': loadAvg[0].toFixed(2), '5m': loadAvg[1].toFixed(2), '15m': loadAvg[2].toFixed(2) },
    },
    database: {
      configuredNodes: RAW_URLS?.length || 0,
      pools,
    },
    monitor: {
      uptime:        snap.uptime,
      totalRequests: snap.totalRequests,
      errorRate:     snap.errorRate,
      bufferedEvents:mon._events.length,
      bufferedErrors:mon._errors.length,
    },
    envChecks,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/monitor/system/shutdown
//  Gracefully shuts down the server process.
//  Requires MONITOR_SECRET in body AND in the guard header.
//  Double-confirmation: { confirm: true, reason: '...' }
// ════════════════════════════════════════════════════════════════════════════
router.post('/system/shutdown', guardWrite, (req, res) => {
  const { confirm, reason, secret } = req.body || {};

  // Hard require MONITOR_SECRET for this endpoint — no matter what
  const expected = process.env.MONITOR_SECRET;
  if (!expected) {
    return res.status(403).json({ ok: false, error: 'MONITOR_SECRET not configured. Set it in .env to enable shutdown.' });
  }
  if (secret !== expected) {
    return res.status(403).json({ ok: false, error: 'Invalid MONITOR_SECRET.' });
  }
  if (!confirm) {
    return res.status(400).json({ ok: false, error: 'Must send confirm:true to initiate shutdown.' });
  }

  const msg = `🔴 Server shutdown initiated via Monitor API. Reason: ${reason || 'No reason provided'}`;
  console.warn(msg);

  mon.recordActivity({
    type:   'shutdown',
    label:  'Server Shutdown',
    detail: reason || 'Initiated from Monitor Dashboard',
    level:  'error',
  });

  // Broadcast to all monitor clients
  try {
    const io = require('../realtime').get?.();
    if (io) {
      io.of('/monitor').emit('activity', {
        type: 'shutdown', label: '🔴 Server Shutting Down', detail: reason || 'Monitor shutdown', level: 'error', ts: new Date().toISOString(),
      });
      io.of('/monitor').emit('server_shutdown', { reason, ts: new Date().toISOString() });
    }
  } catch (_) {}

  res.json({ ok: true, message: 'Shutdown initiated. Server will exit in 3 seconds.', ts: new Date().toISOString() });

  // Give the response time to flush, then exit cleanly
  setTimeout(() => {
    console.warn('🔴 Process exiting by Monitor shutdown command.');
    process.exit(0);
  }, 3000);
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/monitor/db/pool-stats
//  Returns live connection pool stats for all nodes
// ════════════════════════════════════════════════════════════════════════════
router.get('/db/pool-stats', (req, res) => {
  res.json({ ts: new Date().toISOString(), pools: getPoolStats() });
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/monitor/login-block/status
//  Check if login service is blocked
// ════════════════════════════════════════════════════════════════════════════
router.get('/login-block/status', async (req, res) => {
  try {
    const status = await loginBlock.getStatus();
    res.json({ ok: true, ...status, ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/monitor/login-block/block
//  Block all login services across all portals
//  Body: { secret, reason, confirm: true }
// ════════════════════════════════════════════════════════════════════════════
router.post('/login-block/block', guardWrite, async (req, res) => {
  const { secret, reason, confirm } = req.body || {};
  
  console.log('[Monitor] Login block request:', { hasSecret: !!secret, hasReason: !!reason, confirm });
  
  if (!confirm) {
    return res.status(400).json({ ok: false, error: 'Must send confirm:true to block login service' });
  }
  
  // Double-check MONITOR_SECRET (already checked in guardWrite, but critical operation)
  const expected = process.env.MONITOR_SECRET;
  if (expected && secret !== expected) {
    return res.status(403).json({ ok: false, error: 'Invalid MONITOR_SECRET' });
  }
  
  // Extract admin ID from JWT if available
  let adminId = null;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (_) {}
  }
  
  const result = await loginBlock.block(adminId, reason || 'Emergency block via Monitor Dashboard');
  
  if (result.ok) {
    console.warn(`🚫 [Monitor] LOGIN SERVICE BLOCKED: ${reason || 'No reason provided'}`);
    return res.json({ ok: true, message: 'Login service blocked across all portals', ...result });
  } else {
    return res.status(500).json({ ok: false, error: result.error });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/monitor/login-block/resume
//  Resume all login services
//  Body: { secret, reason, confirm: true }
// ════════════════════════════════════════════════════════════════════════════
router.post('/login-block/resume', guardWrite, async (req, res) => {
  const { secret, reason, confirm } = req.body || {};
  
  console.log('[Monitor] Login resume request:', { hasSecret: !!secret, hasReason: !!reason, confirm });
  
  if (!confirm) {
    return res.status(400).json({ ok: false, error: 'Must send confirm:true to resume login service' });
  }
  
  // Double-check MONITOR_SECRET
  const expected = process.env.MONITOR_SECRET;
  if (expected && secret !== expected) {
    return res.status(403).json({ ok: false, error: 'Invalid MONITOR_SECRET' });
  }
  
  // Extract admin ID from JWT if available
  let adminId = null;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (_) {}
  }
  
  const result = await loginBlock.resume(adminId, reason || 'Resumed via Monitor Dashboard');
  
  if (result.ok) {
    console.log(`✅ [Monitor] LOGIN SERVICE RESUMED: ${reason || 'No reason provided'}`);
    return res.json({ ok: true, message: 'Login service resumed', ...result });
  } else {
    return res.status(500).json({ ok: false, error: result.error });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/monitor/login-block/history
//  Get login block history (last 20 changes)
// ════════════════════════════════════════════════════════════════════════════
router.get('/login-block/history', async (req, res) => {
  try {
    const history = await loginBlock.getHistory();
    res.json({ ok: true, history, ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;

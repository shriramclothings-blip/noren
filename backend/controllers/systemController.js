'use strict';

const { pool } = require('../config/db');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

// GET /api/erp/system/health  (super_admin only)
const getSystemHealth = async (req, res) => {
  try {
    const [bizRes, storeRes, userRes, prodRes, salesRes, invRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM src_businesses WHERE is_active = TRUE`),
      pool.query(`SELECT COUNT(*) FROM src_stores WHERE is_active = TRUE`),
      pool.query(`SELECT COUNT(*) FROM src_users WHERE is_banned = FALSE`),
      pool.query(`SELECT COUNT(*) FROM src_erp_inventory_items WHERE status = 'active'`),
      pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue FROM src_erp_sales WHERE status = 'completed'`),
      pool.query(`SELECT COALESCE(SUM(current_stock * purchase_price),0) AS inventory_value FROM src_erp_inventory_items`),
    ]);

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    res.json({
      businesses:      parseInt(bizRes.rows[0].count),
      stores:          parseInt(storeRes.rows[0].count),
      users:           parseInt(userRes.rows[0].count),
      active_products: parseInt(prodRes.rows[0].count),
      total_sales:     parseInt(salesRes.rows[0].count),
      total_revenue:   parseFloat(salesRes.rows[0].revenue),
      inventory_value: parseFloat(invRes.rows[0].inventory_value),
      uptime:          `${hours}h ${minutes}m ${seconds}s`,
      uptime_seconds:  uptimeSeconds,
      timestamp:       new Date(),
    });
  } catch (err) {
    console.error('getSystemHealth error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/system/global-revenue  (super_admin only)
const getGlobalRevenue = async (req, res) => {
  try {
    const monthlyRes = await pool.query(`
      SELECT b.name AS business_name,
             TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') AS month,
             COALESCE(SUM(s.total), 0) AS revenue,
             COUNT(s.id) AS bills
      FROM src_erp_sales s
      JOIN src_businesses b ON b.id = s.business_id
      WHERE s.status = 'completed'
        AND s.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY b.name, DATE_TRUNC('month', s.created_at)
      ORDER BY month ASC, b.name ASC
    `);

    const totalRes = await pool.query(`
      SELECT COALESCE(SUM(total), 0) AS cumulative_revenue
      FROM src_erp_sales WHERE status = 'completed'
    `);

    const currentMonthRes = await pool.query(`
      SELECT b.name, COALESCE(SUM(s.total), 0) AS revenue
      FROM src_erp_sales s
      JOIN src_businesses b ON b.id = s.business_id
      WHERE s.status = 'completed'
        AND s.created_at >= DATE_TRUNC('month', NOW())
      GROUP BY b.name
      ORDER BY revenue DESC
    `);

    res.json({
      monthly_breakdown: monthlyRes.rows,
      current_month:     currentMonthRes.rows,
      cumulative_revenue: parseFloat(totalRes.rows[0].cumulative_revenue),
    });
  } catch (err) {
    console.error('getGlobalRevenue error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/system/users  (super_admin only)
const getAllUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const params = [];
    let where = 'WHERE 1=1';
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_users u ${where}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.is_banned,
              b.name AS business_name,
              s.name AS store_name,
              u.created_at,
              (SELECT logged_in_at FROM src_login_sessions
               WHERE user_id = u.id ORDER BY logged_in_at DESC LIMIT 1) AS last_login,
              (SELECT COUNT(*) > 0 FROM src_login_sessions
               WHERE user_id = u.id AND is_active = TRUE LIMIT 1) AS has_active_session
       FROM src_users u
       LEFT JOIN src_businesses b ON b.id = u.business_id
       LEFT JOIN src_stores s ON s.id = u.store_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ users: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('getAllUsers error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/sessions/live  (super_admin / admin only)
const getLiveSessions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const params = [];
    let extra = '';
    if (search) {
      params.push(`%${search}%`);
      extra = `AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR ls.ip_address ILIKE $${params.length})`;
    }

    let whereScope = '';
    if (req.user.role !== 'super_admin') {
      const businessId = getScopedBusinessId(req);
      params.push(businessId);
      whereScope = `AND u.business_id = $${params.length}`;
    }

    const countParams = [...params];
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_login_sessions ls
       LEFT JOIN src_users u ON u.id = ls.user_id
       WHERE ls.is_active = TRUE ${extra} ${whereScope}`,
      countParams
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT
         ls.id, ls.user_id, ls.ip_address, ls.user_agent,
         ls.device_type, ls.browser, ls.browser_version, ls.os,
         ls.auth_method, ls.is_suspicious,
         ls.city, ls.region, ls.country, ls.country_code,
         ls.timezone, ls.isp, ls.latitude, ls.longitude, ls.location,
         ls.logged_in_at, ls.logged_out_at, ls.is_active,
         u.name AS user_name, u.email AS user_email, u.role AS user_role,
         u.avatar_url AS user_avatar,
         b.name AS business_name
       FROM src_login_sessions ls
       LEFT JOIN src_users u ON u.id = ls.user_id
       LEFT JOIN src_businesses b ON b.id = u.business_id
       WHERE ls.is_active = TRUE ${extra} ${whereScope}
       ORDER BY ls.logged_in_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ sessions: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('getLiveSessions error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/erp/sessions/:sessionId  — force-terminate a session
const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      `UPDATE src_login_sessions SET is_active = FALSE, logged_out_at = NOW()
       WHERE id = $1 AND is_active = TRUE RETURNING id, user_id`,
      [sessionId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Session not found or already inactive' });
    res.json({ message: 'Session terminated', session_id: sessionId, user_id: result.rows[0].user_id });
  } catch (err) {
    console.error('terminateSession error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/sessions/history  — full login history for all users (admin) or self (user)
const getLoginHistory = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 30);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const isAdmin = ['super_admin','admin','business_owner','store_admin'].includes(req.user.role);
    const targetUserId = req.query.userId || null;

    // Non-admins can only see their own history
    if (!isAdmin && targetUserId && String(targetUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const params = [];
    const conditions = [];

    // Scope to specific user if requested or if non-admin
    if (!isAdmin) {
      params.push(req.user.id);
      conditions.push(`ls.user_id = $${params.length}`);
    } else if (targetUserId) {
      params.push(targetUserId);
      conditions.push(`ls.user_id = $${params.length}`);
    }

    // Scope to business for non-super_admin
    if (isAdmin && req.user.role !== 'super_admin') {
      const businessId = getScopedBusinessId(req);
      if (businessId) {
        params.push(businessId);
        conditions.push(`u.business_id = $${params.length}`);
      }
    }

    // Search
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR ls.ip_address ILIKE $${params.length} OR ls.location ILIKE $${params.length})`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countParams = [...params];
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_login_sessions ls LEFT JOIN src_users u ON u.id = ls.user_id ${where}`,
      countParams
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT
         ls.id, ls.user_id,
         ls.ip_address, ls.user_agent,
         ls.device_type, ls.browser, ls.browser_version, ls.os,
         ls.auth_method, ls.is_suspicious,
         ls.city, ls.region, ls.country, ls.country_code,
         ls.timezone, ls.isp, ls.latitude, ls.longitude, ls.location,
         ls.logged_in_at, ls.logged_out_at, ls.is_active,
         CASE
           WHEN ls.logged_out_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (ls.logged_out_at - ls.logged_in_at))::INTEGER
           ELSE NULL
         END AS duration_seconds,
         u.name AS user_name, u.email AS user_email,
         u.role AS user_role, u.avatar_url AS user_avatar
       FROM src_login_sessions ls
       LEFT JOIN src_users u ON u.id = ls.user_id
       ${where}
       ORDER BY ls.logged_in_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ sessions: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('getLoginHistory error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/communications/call-logs  — own call logs
const getCallLogs = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const { call_type, from, to } = req.query;

    const params = [businessId, req.user.id, req.user.id];
    let where = `WHERE cl.business_id = $1 AND (cl.caller_id = $2 OR cl.callee_id = $3)`;
    if (call_type) { params.push(call_type); where += ` AND cl.call_type = $${params.length}`; }
    if (from) { params.push(from); where += ` AND cl.created_at >= $${params.length}::date`; }
    if (to)   { params.push(to);   where += ` AND cl.created_at < ($${params.length}::date + INTERVAL '1 day')`; }

    const countRes = await pool.query(`SELECT COUNT(*) FROM src_erp_call_logs cl ${where}`, params);
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT cl.*,
              u1.name AS caller_name, u1.avatar_url AS caller_avatar,
              u2.name AS callee_name, u2.avatar_url AS callee_avatar
       FROM src_erp_call_logs cl
       LEFT JOIN src_users u1 ON u1.id = cl.caller_id
       LEFT JOIN src_users u2 ON u2.id = cl.callee_id
       ${where}
       ORDER BY cl.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ call_logs: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('getCallLogs error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/communications/call-logs/all  (admin/super_admin) — all call logs for business
const getAllCallLogs = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT cl.*,
              u1.name AS caller_name,
              u2.name AS callee_name
       FROM src_erp_call_logs cl
       LEFT JOIN src_users u1 ON u1.id = cl.caller_id
       LEFT JOIN src_users u2 ON u2.id = cl.callee_id
       WHERE cl.business_id = $1
       ORDER BY cl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, limit, offset]
    );
    res.json({ call_logs: result.rows });
  } catch (err) {
    console.error('getAllCallLogs error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/dashboard/role — role-specific dashboard data
const getRoleDashboard = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    const role = req.user?.role;

    if (role === 'super_admin' || role === 'admin') {
      const [bizRes, userRes, salesRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM src_businesses WHERE is_active = TRUE`),
        pool.query(`SELECT COUNT(*) FROM src_users WHERE is_banned = FALSE`),
        pool.query(`SELECT COALESCE(SUM(total),0) AS total_revenue, COUNT(*) AS total_bills FROM src_erp_sales WHERE status = 'completed'`),
      ]);
      const topBiz = await pool.query(`
        SELECT b.name, COALESCE(SUM(s.total),0) AS revenue
        FROM src_erp_sales s JOIN src_businesses b ON b.id = s.business_id
        WHERE s.status = 'completed' AND s.created_at >= DATE_TRUNC('month', NOW())
        GROUP BY b.name ORDER BY revenue DESC LIMIT 5
      `);
      return res.json({
        role, businesses: parseInt(bizRes.rows[0].count), total_users: parseInt(userRes.rows[0].count),
        total_revenue: parseFloat(salesRes.rows[0].total_revenue), total_bills: parseInt(salesRes.rows[0].total_bills),
        top_businesses: topBiz.rows,
      });
    }

    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    if (role === 'business_owner') {
      const [salesRes, storeRes, expRes] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS bills FROM src_erp_sales WHERE status='completed' AND business_id=$1 AND created_at >= DATE_TRUNC('month', NOW())`, [businessId]),
        pool.query(`SELECT s.name, COALESCE(SUM(sale.total),0) AS revenue FROM src_stores s LEFT JOIN src_erp_sales sale ON sale.store_id = s.id AND sale.status='completed' AND sale.created_at >= DATE_TRUNC('month', NOW()) WHERE s.business_id=$1 GROUP BY s.name ORDER BY revenue DESC`, [businessId]),
        pool.query(`SELECT COALESCE(SUM(amount),0) AS expenses FROM src_erp_expenses WHERE business_id=$1 AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)`, [businessId]),
      ]);
      const trend = await pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', s.created_at),'YYYY-MM') AS month, COALESCE(SUM(s.total),0) AS revenue
        FROM src_erp_sales s WHERE s.business_id=$1 AND s.status='completed' AND s.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', s.created_at) ORDER BY month ASC
      `, [businessId]);
      return res.json({
        role, revenue_this_month: parseFloat(salesRes.rows[0].revenue),
        bills_this_month: parseInt(salesRes.rows[0].bills),
        expenses_this_month: parseFloat(expRes.rows[0].expenses),
        profit_estimate: parseFloat(salesRes.rows[0].revenue) - parseFloat(expRes.rows[0].expenses),
        store_breakdown: storeRes.rows,
        revenue_trend: trend.rows,
      });
    }

    if (role === 'store_admin' || role === 'store_manager') {
      const storeId = req.user.store_id;
      const scope = storeId ? [businessId, storeId] : [businessId];
      const storeClause = storeId ? 'AND store_id = $2' : '';
      const [todayRes, lowStockRes, cashierRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS bills, COALESCE(SUM(total),0) AS revenue FROM src_erp_sales WHERE status='completed' AND business_id=$1 ${storeClause} AND DATE(created_at)=CURRENT_DATE`, scope),
        pool.query(`SELECT COUNT(*) AS low_stock FROM src_erp_inventory_items WHERE business_id=$1 AND current_stock <= reorder_level AND status='active'`, [businessId]),
        pool.query(`SELECT u.name, COUNT(s.id) AS bills FROM src_erp_sales s JOIN src_users u ON u.id=s.cashier_id WHERE s.business_id=$1 ${storeClause} AND DATE(s.created_at)=CURRENT_DATE GROUP BY u.name ORDER BY bills DESC LIMIT 5`, scope),
      ]);
      return res.json({
        role, bills_today: parseInt(todayRes.rows[0].bills),
        revenue_today: parseFloat(todayRes.rows[0].revenue),
        low_stock_items: parseInt(lowStockRes.rows[0].low_stock),
        cashier_activity: cashierRes.rows,
      });
    }

    if (role === 'warehouse_manager') {
      const whId = req.user.warehouse_id;
      const [stockRes, pendingRes, outRes] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(current_stock*purchase_price),0) AS stock_value FROM src_erp_inventory_items WHERE business_id=$1`, [businessId]),
        pool.query(`SELECT COUNT(*) FROM src_erp_transfer_requests WHERE business_id=$1 AND status='pending_approval'`, [businessId]),
        pool.query(`SELECT COUNT(*) FROM src_erp_inventory_items WHERE business_id=$1 AND current_stock=0`, [businessId]),
      ]);
      return res.json({
        role, stock_value: parseFloat(stockRes.rows[0].stock_value),
        pending_transfers: parseInt(pendingRes.rows[0].count),
        out_of_stock: parseInt(outRes.rows[0].count),
      });
    }

    if (role === 'accountant') {
      const [salesRes, expRes, gstRes] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(total),0) AS revenue, COALESCE(SUM(tax_amount),0) AS tax FROM src_erp_sales WHERE status='completed' AND business_id=$1 AND created_at >= DATE_TRUNC('month', NOW())`, [businessId]),
        pool.query(`SELECT category, COALESCE(SUM(amount),0) AS total FROM src_erp_expenses WHERE business_id=$1 AND expense_date >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY category`, [businessId]),
        pool.query(`SELECT COALESCE(SUM(tax_amount),0) AS gst_liability FROM src_erp_sales WHERE business_id=$1 AND status='completed' AND created_at >= DATE_TRUNC('month', NOW())`, [businessId]),
      ]);
      return res.json({
        role, revenue_this_month: parseFloat(salesRes.rows[0].revenue),
        expenses_by_category: expRes.rows,
        gst_liability: parseFloat(gstRes.rows[0].gst_liability),
        profit_estimate: parseFloat(salesRes.rows[0].revenue) - expRes.rows.reduce((s, r) => s + parseFloat(r.total), 0),
      });
    }

    // cashier / employee
    const [billsRes, attRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS bills, COALESCE(SUM(total),0) AS revenue FROM src_erp_sales WHERE cashier_id=$1 AND status='completed' AND DATE(created_at)=CURRENT_DATE`, [req.user.id]),
      pool.query(`SELECT status, COUNT(*) AS count FROM src_erp_attendance WHERE employee_id=$1 AND attendance_date >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY status`, [req.user.id]),
    ]);
    return res.json({
      role, bills_today: parseInt(billsRes.rows[0].bills),
      revenue_today: parseFloat(billsRes.rows[0].revenue),
      attendance_summary: attRes.rows,
    });

  } catch (err) {
    console.error('getRoleDashboard error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/erp/sessions/backfill-geo  (super_admin only)
// Backfills latitude/longitude/city/region/country for sessions that have
// an IP but no geo data yet. Runs in batches of 40 to stay within ip-api.com
// rate limits. Safe to call multiple times — skips already-resolved rows.
const backfillSessionGeo = async (req, res) => {
  try {
    const { fetchGeoLocation } = require('../services/sessionService');

    // Find sessions with IP but missing geo, up to 200 at a time
    const { rows } = await pool.query(
      `SELECT id, ip_address FROM src_login_sessions
       WHERE ip_address IS NOT NULL
         AND ip_address NOT IN ('127.0.0.1', '::1', 'Localhost')
         AND (latitude IS NULL OR longitude IS NULL)
       ORDER BY logged_in_at DESC
       LIMIT 200`
    );

    if (!rows.length) {
      return res.json({ message: 'No sessions need backfilling', updated: 0 });
    }

    let updated = 0;
    // Process in batches of 5 concurrently to avoid hammering the geo API
    const BATCH = 5;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await Promise.all(batch.map(async (row) => {
        const geo = await fetchGeoLocation(row.ip_address);
        if (!geo.lat && !geo.lon && !geo.city) return; // no data returned
        await pool.query(
          `UPDATE src_login_sessions
           SET city=$1, region=$2, country=$3, country_code=$4,
               timezone=$5, isp=$6, latitude=$7, longitude=$8,
               location=$9
           WHERE id=$10`,
          [
            geo.city, geo.region, geo.country, geo.country_code,
            geo.timezone, geo.isp, geo.lat, geo.lon,
            [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || null,
            row.id,
          ]
        );
        updated++;
      }));
      // Small delay between batches to respect rate limits
      if (i + BATCH < rows.length) await new Promise(r => setTimeout(r, 300));
    }

    res.json({ message: `Backfilled geo for ${updated} of ${rows.length} sessions`, updated, total: rows.length });
  } catch (err) {
    console.error('backfillSessionGeo error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getSystemHealth,
  getGlobalRevenue,
  getAllUsers,
  getLiveSessions,
  terminateSession,
  getLoginHistory,
  getCallLogs,
  getAllCallLogs,
  getRoleDashboard,
  backfillSessionGeo,
};

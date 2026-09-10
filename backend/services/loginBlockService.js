'use strict';
/**
 * Login Block Service — Emergency login shutdown across all portals
 * ────────────────────────────────────────────────────────────────
 * Provides instant toggle to block all authentication attempts system-wide.
 * State persists in database + in-memory cache for performance.
 * 
 * Usage:
 *   await loginBlock.block(adminId, reason)     → Block all logins
 *   await loginBlock.resume(adminId, reason)    → Resume logins
 *   await loginBlock.isBlocked()                → Check if blocked (fast)
 *   await loginBlock.getStatus()                → Get full status
 */

const { pool } = require('../config/db');

// ── In-memory cache for instant checks (no DB hit on every auth request) ──
let cachedState = {
  isBlocked: false,
  reason: null,
  blockedAt: null,
  blockedBy: null,
  lastSync: null,
};

// ── Ensure table exists ────────────────────────────────────────────────────
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_login_block (
        id            SERIAL PRIMARY KEY,
        is_blocked    BOOLEAN NOT NULL DEFAULT false,
        reason        TEXT,
        blocked_at    TIMESTAMP,
        blocked_by    INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        resumed_at    TIMESTAMP,
        resumed_by    INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        updated_at    TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Ensure at least one row exists
    const check = await pool.query('SELECT COUNT(*) as cnt FROM system_login_block');
    if (parseInt(check.rows[0].cnt) === 0) {
      await pool.query(`INSERT INTO system_login_block (is_blocked, reason) VALUES (false, NULL)`);
    }
    
    // Load initial state into cache
    await syncCache();
  } catch (e) {
    console.error('❌ [LoginBlock] Failed to ensure table:', e.message);
  }
}

// ── Sync in-memory cache with database ─────────────────────────────────────
async function syncCache() {
  try {
    const res = await pool.query(`
      SELECT is_blocked, reason, blocked_at, blocked_by, updated_at
      FROM system_login_block
      ORDER BY id DESC
      LIMIT 1
    `);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      cachedState = {
        isBlocked: row.is_blocked,
        reason: row.reason,
        blockedAt: row.blocked_at,
        blockedBy: row.blocked_by,
        lastSync: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('❌ [LoginBlock] Cache sync failed:', e.message);
  }
}

// ── Fast in-memory check (no DB query) ─────────────────────────────────────
function isBlocked() {
  return cachedState.isBlocked;
}

// ── Get full status (includes DB user details) ─────────────────────────────
async function getStatus() {
  await syncCache(); // Refresh from DB
  
  if (!cachedState.isBlocked) {
    return {
      isBlocked: false,
      message: 'Login service is active',
      cachedState,
    };
  }
  
  // Fetch user who blocked
  let blockedByUser = null;
  if (cachedState.blockedBy) {
    try {
      const userRes = await pool.query(
        'SELECT id, name, email, role FROM src_users WHERE id = $1',
        [cachedState.blockedBy]
      );
      if (userRes.rows.length > 0) blockedByUser = userRes.rows[0];
    } catch (_) {}
  }
  
  return {
    isBlocked: true,
    reason: cachedState.reason,
    blockedAt: cachedState.blockedAt,
    blockedBy: blockedByUser,
    message: 'ALL LOGIN SERVICES BLOCKED',
    cachedState,
  };
}

// ── Block all logins ───────────────────────────────────────────────────────
async function block(adminId, reason = 'Emergency block via Monitor Dashboard') {
  try {
    await pool.query(`
      UPDATE system_login_block
      SET is_blocked = true,
          reason = $1,
          blocked_at = NOW(),
          blocked_by = $2,
          updated_at = NOW()
    `, [reason, adminId]);
    
    await syncCache();
    
    // Emit to monitor
    try {
      const mon = require('../monitor');
      const ev = mon.recordActivity({
        type: 'login_block',
        label: '🚫 Login Service BLOCKED',
        detail: reason,
        level: 'error',
        meta: { adminId, reason },
      });
      const io = require('../realtime').get?.();
      if (io) io.of('/monitor').emit('activity', ev);
    } catch (_) {}
    
    console.warn(`🚫 [LoginBlock] ALL LOGINS BLOCKED by admin ${adminId}: ${reason}`);
    return { ok: true, message: 'Login service blocked', state: cachedState };
  } catch (e) {
    console.error('❌ [LoginBlock] Failed to block:', e.message);
    return { ok: false, error: e.message };
  }
}

// ── Resume logins ──────────────────────────────────────────────────────────
async function resume(adminId, reason = 'Resumed via Monitor Dashboard') {
  try {
    await pool.query(`
      UPDATE system_login_block
      SET is_blocked = false,
          reason = NULL,
          resumed_at = NOW(),
          resumed_by = $1,
          updated_at = NOW()
    `, [adminId]);
    
    await syncCache();
    
    // Emit to monitor
    try {
      const mon = require('../monitor');
      const ev = mon.recordActivity({
        type: 'login_resume',
        label: '✅ Login Service RESUMED',
        detail: reason,
        level: 'success',
        meta: { adminId, reason },
      });
      const io = require('../realtime').get?.();
      if (io) io.of('/monitor').emit('activity', ev);
    } catch (_) {}
    
    console.log(`✅ [LoginBlock] Login service RESUMED by admin ${adminId}: ${reason}`);
    return { ok: true, message: 'Login service resumed', state: cachedState };
  } catch (e) {
    console.error('❌ [LoginBlock] Failed to resume:', e.message);
    return { ok: false, error: e.message };
  }
}

// ── Get block history (last 20 changes) ────────────────────────────────────
async function getHistory() {
  try {
    const res = await pool.query(`
      SELECT 
        lb.id,
        lb.is_blocked,
        lb.reason,
        lb.blocked_at,
        lb.blocked_by,
        lb.resumed_at,
        lb.resumed_by,
        lb.updated_at,
        u1.name as blocked_by_name,
        u1.email as blocked_by_email,
        u2.name as resumed_by_name,
        u2.email as resumed_by_email
      FROM system_login_block lb
      LEFT JOIN src_users u1 ON u1.id = lb.blocked_by
      LEFT JOIN src_users u2 ON u2.id = lb.resumed_by
      ORDER BY lb.updated_at DESC
      LIMIT 20
    `);
    return res.rows;
  } catch (e) {
    console.error('❌ [LoginBlock] Failed to get history:', e.message);
    return [];
  }
}

// ── Initialize on module load ──────────────────────────────────────────────
ensureTable().catch(e => console.error('❌ [LoginBlock] Init failed:', e.message));

module.exports = {
  isBlocked,
  getStatus,
  block,
  resume,
  getHistory,
  syncCache,
};

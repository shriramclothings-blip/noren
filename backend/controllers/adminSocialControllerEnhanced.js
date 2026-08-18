/**
 * Enhanced Admin Social Controller
 * 
 * Comprehensive moderation, user management, and analytics for the social platform
 */

const { pool } = require('../config/db');

// ─── LOGGER ───────────────────────────────────────────────────────────────
const logAdminAction = async (adminId, action, targetType, targetId, reason, details) => {
  try {
    await pool.query(
      `INSERT INTO src_social_audit_logs (admin_id, action, target_type, target_id, reason, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [adminId, action, targetType, targetId, reason, JSON.stringify(details || {}), null, null]
    );
  } catch (err) {
    console.error('logAdminAction error:', err.message);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  ANALYTICS & METRICS
// ═════════════════════════════════════════════════════════════════════════════

const getSocialDashboardMetrics = async (req, res) => {
  try {
    const dateRangeQuery = req.query.days ? `AND created_at > NOW() - INTERVAL '${parseInt(req.query.days)} days'` : '';

    const [
      totalUsersRes,
      activeUsersRes,
      newUsersRes,
      postsRes,
      reelsRes,
      storiesRes,
      messagesRes,
      callsRes,
      reportsRes,
      bannedUsersRes,
      avgEngagementRes,
      storageRes
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM src_users WHERE is_banned = FALSE'),
      pool.query(`SELECT COUNT(DISTINCT user_id) as count FROM src_social_notifications ${dateRangeQuery}`),
      pool.query(`SELECT COUNT(*) as count FROM src_users WHERE is_banned = FALSE AND created_at > NOW() - INTERVAL '30 days'`),
      pool.query('SELECT COUNT(*) as count FROM src_social_posts'),
      pool.query('SELECT COUNT(*) as count FROM src_social_reels'),
      pool.query('SELECT COUNT(*) as count FROM src_social_stories WHERE expires_at > NOW()'),
      pool.query('SELECT COUNT(*) as count FROM src_social_messages'),
      pool.query('SELECT COUNT(*) as count FROM src_social_calls'),
      pool.query("SELECT COUNT(*) as count FROM src_social_reports WHERE status = 'pending'"),
      pool.query('SELECT COUNT(*) as count FROM src_users WHERE is_banned = TRUE'),
      pool.query(`
        SELECT 
          AVG((COALESCE(posts_count, 0) + COALESCE(reels_count, 0)) / NULLIF(followers_count, 0)) as avg_engagement
        FROM src_users
        WHERE is_banned = FALSE AND followers_count > 0
      `),
      pool.query('SELECT SUM(file_size) as total_size FROM src_social_post_media UNION SELECT SUM(media_duration) FROM src_social_reels')
    ]);

    res.json({
      users: {
        total_active: parseInt(totalUsersRes.rows[0].count),
        active_this_period: parseInt(activeUsersRes.rows[0].count),
        new_last_30days: parseInt(newUsersRes.rows[0].count),
        banned: parseInt(bannedUsersRes.rows[0].count)
      },
      content: {
        posts: parseInt(postsRes.rows[0].count),
        reels: parseInt(reelsRes.rows[0].count),
        active_stories: parseInt(storiesRes.rows[0].count),
        total_messages: parseInt(messagesRes.rows[0].count),
        total_calls: parseInt(callsRes.rows[0].count),
        average_engagement: parseFloat(avgEngagementRes.rows[0].avg_engagement || 0).toFixed(2)
      },
      moderation: {
        pending_reports: parseInt(reportsRes.rows[0].count)
      },
      platform: {
        storage_usage_bytes: parseInt(storageRes.rows[0]?.total_size || 0)
      }
    });
  } catch (err) {
    console.error('getSocialDashboardMetrics error:', err.message);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
};

// ─── ANALYTICS WITH DATE RANGE ─────────────────────────────────────────────
const getAnalyticsTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Daily active users
    const dauRes = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as count
      FROM src_social_notifications
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Daily posts
    const postsRes = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM src_social_posts
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Daily messages
    const messagesRes = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM src_social_messages
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      daily_active_users: dauRes.rows,
      daily_posts: postsRes.rows,
      daily_messages: messagesRes.rows
    });
  } catch (err) {
    console.error('getAnalyticsTrends error:', err.message);
    res.status(500).json({ message: 'Failed to fetch trends' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

// List users with search and filter
const listUsers = async (req, res) => {
  try {
    const search = req.query.search || '';
    const status = req.query.status || 'all'; // all, active, banned, new
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
      SELECT id, name, email, username, avatar_url, followers_count, posts_count,
             is_verified, is_banned, is_private, created_at,
             COUNT(*) OVER() as total_count
      FROM src_users
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR username ILIKE $${params.length})`;
    }

    if (status === 'banned') {
      query += ` AND is_banned = TRUE`;
    } else if (status === 'verified') {
      query += ` AND is_verified = TRUE`;
    } else if (status === 'new') {
      query += ` AND created_at > NOW() - INTERVAL '7 days'`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const usersRes = await pool.query(query, params);
    const totalCount = usersRes.rows[0]?.total_count || 0;

    res.json({
      users: usersRes.rows.map(u => ({ ...u, total_count: undefined })),
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    });
  } catch (err) {
    console.error('listUsers error:', err.message);
    res.status(500).json({ message: 'Failed to list users' });
  }
};

// Get user details with moderation history
const getUserDetails = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const [userRes, reportsRes, actionsRes, followersRes] = await Promise.all([
      pool.query(
        `SELECT * FROM src_users WHERE id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT * FROM src_social_reports WHERE reporter_id = $1 OR (target_type = 'user' AND target_id = $1)`,
        [userId]
      ),
      pool.query(
        `SELECT * FROM src_social_audit_logs WHERE (admin_id = $1 OR target_id = $1) ORDER BY created_at DESC LIMIT 20`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM src_social_follows WHERE following_id = $1 AND status = 'accepted'`,
        [userId]
      )
    ]);

    if (!userRes.rows.length) return res.status(404).json({ message: 'User not found' });

    const user = userRes.rows[0];
    res.json({
      ...user,
      reports_against: reportsRes.rows.length,
      reports: reportsRes.rows,
      moderation_history: actionsRes.rows,
      followers: parseInt(followersRes.rows[0].count)
    });
  } catch (err) {
    console.error('getUserDetails error:', err.message);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
};

// Ban/unban user
const manageUserStatus = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = req.user.id;
    const { action, reason, duration_days } = req.body;

    if (!['ban', 'unban', 'verify', 'unverify'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    let updateQuery = '';
    switch (action) {
      case 'ban':
        updateQuery = 'UPDATE src_users SET is_banned = TRUE WHERE id = $1';
        break;
      case 'unban':
        updateQuery = 'UPDATE src_users SET is_banned = FALSE WHERE id = $1';
        break;
      case 'verify':
        updateQuery = 'UPDATE src_users SET is_verified = TRUE WHERE id = $1';
        break;
      case 'unverify':
        updateQuery = 'UPDATE src_users SET is_verified = FALSE WHERE id = $1';
        break;
    }

    await pool.query(updateQuery, [userId]);
    await logAdminAction(adminId, `${action}_user`, 'user', userId, reason, { duration_days });

    res.json({ message: `User ${action}ned successfully` });
  } catch (err) {
    console.error('manageUserStatus error:', err.message);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  CONTENT MODERATION
// ═════════════════════════════════════════════════════════════════════════════

// List content (posts, reels, comments)
const listContent = async (req, res) => {
  try {
    const type = req.query.type || 'all'; // post, reel, comment, message
    const status = req.query.status || 'active'; // active, removed, flagged
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = '';
    let params = [];

    if (type === 'post' || type === 'all') {
      query += `
        SELECT 'post' as content_type, p.id, p.user_id, u.name, u.avatar_url, 
               p.caption, p.likes_count, p.created_at
        FROM src_social_posts p
        JOIN src_users u ON p.user_id = u.id
      `;
      params = [limit, offset];
    } else if (type === 'reel') {
      query += `
        SELECT 'reel' as content_type, r.id, r.user_id, u.name, u.avatar_url,
               r.caption, r.likes_count, r.created_at
        FROM src_social_reels r
        JOIN src_users u ON r.user_id = u.id
      `;
    } else if (type === 'comment') {
      query += `
        SELECT 'comment' as content_type, c.id, c.user_id, u.name, u.avatar_url,
               c.comment_text, c.likes_count, c.created_at
        FROM src_social_comments c
        JOIN src_users u ON c.user_id = u.id
        WHERE c.is_hidden = FALSE
      `;
    }

    if (query) {
      query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
      const contentRes = await pool.query(query, params);
      res.json({ content: contentRes.rows, limit, offset });
    } else {
      res.json({ content: [], limit, offset });
    }
  } catch (err) {
    console.error('listContent error:', err.message);
    res.status(500).json({ message: 'Failed to list content' });
  }
};

// Take action on content
const manageContent = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { content_type, content_id, action, reason } = req.body;

    if (!['remove', 'restore', 'flag'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (action === 'remove') {
      if (content_type === 'post') {
        await pool.query('UPDATE src_social_posts SET is_deleted = TRUE WHERE id = $1', [content_id]);
      } else if (content_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET is_deleted = TRUE WHERE id = $1', [content_id]);
      } else if (content_type === 'comment') {
        await pool.query('UPDATE src_social_comments SET is_hidden = TRUE WHERE id = $1', [content_id]);
      }
    } else if (action === 'restore') {
      if (content_type === 'post') {
        await pool.query('UPDATE src_social_posts SET is_deleted = FALSE WHERE id = $1', [content_id]);
      } else if (content_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET is_deleted = FALSE WHERE id = $1', [content_id]);
      } else if (content_type === 'comment') {
        await pool.query('UPDATE src_social_comments SET is_hidden = FALSE WHERE id = $1', [content_id]);
      }
    }

    await logAdminAction(adminId, `${action}_content`, content_type, content_id, reason);
    res.json({ message: `Content ${action}ed successfully` });
  } catch (err) {
    console.error('manageContent error:', err.message);
    res.status(500).json({ message: 'Failed to manage content' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  REPORT MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

const listReports = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const category = req.query.category || null;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
      SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.category, r.reason,
             r.status, r.moderator_id, r.action_taken, r.moderator_note, r.created_at, r.resolved_at,
             u.name AS reporter_name, u.email AS reporter_email,
             mod.name AS moderator_name,
             COUNT(*) OVER() as total_count
      FROM src_social_reports r
      JOIN src_users u ON u.id = r.reporter_id
      LEFT JOIN src_users mod ON mod.id = r.moderator_id
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'all') {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND r.category = $${params.length}`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const reportsRes = await pool.query(query, params);
    const totalCount = reportsRes.rows[0]?.total_count || 0;

    res.json({
      reports: reportsRes.rows.map(r => ({ ...r, total_count: undefined })),
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    });
  } catch (err) {
    console.error('listReports error:', err.message);
    res.status(500).json({ message: 'Failed to list reports' });
  }
};

const resolveReport = async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const adminId = req.user.id;
    const { status, action_taken, moderator_note } = req.body;

    await pool.query(
      `UPDATE src_social_reports
       SET status = $1, moderator_id = $2, action_taken = $3, moderator_note = $4, resolved_at = NOW()
       WHERE id = $5`,
      [status || 'resolved', adminId, action_taken || 'none', moderator_note || '', reportId]
    );

    await logAdminAction(adminId, 'resolve_report', 'report', reportId, `Resolved with action: ${action_taken}`);

    res.json({ message: 'Report resolved' });
  } catch (err) {
    console.error('resolveReport error:', err.message);
    res.status(500).json({ message: 'Failed to resolve report' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  FEATURE FLAGS
// ═════════════════════════════════════════════════════════════════════════════

const getFeatureFlags = async (req, res) => {
  try {
    const flagsRes = await pool.query(
      'SELECT * FROM src_social_feature_flags ORDER BY key ASC'
    );

    res.json({ feature_flags: flagsRes.rows });
  } catch (err) {
    console.error('getFeatureFlags error:', err.message);
    res.status(500).json({ message: 'Failed to fetch feature flags' });
  }
};

const updateFeatureFlag = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { key, enabled } = req.body;

    await pool.query(
      `UPDATE src_social_feature_flags SET enabled = $1, updated_at = NOW() WHERE key = $2`,
      [enabled, key]
    );

    await logAdminAction(adminId, 'update_feature_flag', 'feature_flag', 0, `${key} = ${enabled}`);

    res.json({ message: 'Feature flag updated' });
  } catch (err) {
    console.error('updateFeatureFlag error:', err.message);
    res.status(500).json({ message: 'Failed to update feature flag' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ═════════════════════════════════════════════════════════════════════════════

const getAuditLogs = async (req, res) => {
  try {
    const adminId = req.query.admin_id;
    const action = req.query.action;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    let query = 'SELECT * FROM src_social_audit_logs WHERE 1=1';
    const params = [];

    if (adminId) {
      params.push(adminId);
      query += ` AND admin_id = $${params.length}`;
    }

    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const logsRes = await pool.query(query, params);

    res.json({
      logs: logsRes.rows,
      limit,
      offset,
      hasMore: logsRes.rows.length === limit
    });
  } catch (err) {
    console.error('getAuditLogs error:', err.message);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};

module.exports = {
  // Analytics
  getSocialDashboardMetrics,
  getAnalyticsTrends,

  // User Management
  listUsers,
  getUserDetails,
  manageUserStatus,

  // Content Moderation
  listContent,
  manageContent,

  // Report Management
  listReports,
  resolveReport,

  // Feature Flags
  getFeatureFlags,
  updateFeatureFlag,

  // Audit Logs
  getAuditLogs
};

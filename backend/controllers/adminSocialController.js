const { pool } = require('../config/db');

// Helper to log admin moderation actions
const logAdminAction = async (adminId, action, targetType, targetId, details) => {
  try {
    await pool.query(
      `INSERT INTO src_activity_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, targetType, targetId, typeof details === 'object' ? JSON.stringify(details) : details]
    );
  } catch (err) {
    console.error('logAdminAction error:', err.message);
  }
};

// ─── SOCIAL DASHBOARD ANALYTICS ──────────────────────────────────────────────
const getSocialDashboardMetrics = async (req, res) => {
  try {
    const totalUsersRes = await pool.query('SELECT COUNT(*) FROM src_users WHERE is_banned = FALSE');
    const postsRes = await pool.query('SELECT COUNT(*) FROM src_social_posts');
    const reelsRes = await pool.query('SELECT COUNT(*) FROM src_social_reels');
    const storiesRes = await pool.query('SELECT COUNT(*) FROM src_social_stories WHERE expires_at > NOW()');
    const messagesRes = await pool.query('SELECT COUNT(*) FROM src_private_chat_messages');
    const reportsRes = await pool.query("SELECT COUNT(*) FROM src_social_reports WHERE status = 'pending'");
    const bannedUsersRes = await pool.query('SELECT COUNT(*) FROM src_users WHERE is_banned = TRUE');

    res.json({
      metrics: {
        total_social_users: parseInt(totalUsersRes.rows[0].count) || 0,
        total_posts: parseInt(postsRes.rows[0].count) || 0,
        total_reels: parseInt(reelsRes.rows[0].count) || 0,
        active_stories: parseInt(storiesRes.rows[0].count) || 0,
        total_messages: parseInt(messagesRes.rows[0].count) || 0,
        pending_reports: parseInt(reportsRes.rows[0].count) || 0,
        banned_accounts: parseInt(bannedUsersRes.rows[0].count) || 0,
      }
    });
  } catch (err) {
    console.error('getSocialDashboardMetrics error:', err.message);
    res.status(500).json({ message: 'Failed to fetch social metrics' });
  }
};

// ─── MODERATION QUEUE ───────────────────────────────────────────────────────
const listReports = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const category = req.query.category || null;

    let query = `
      SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.category, r.reason,
             r.status, r.moderator_id, r.action_taken, r.moderator_note, r.created_at,
             u.name AS reporter_name, u.email AS reporter_email,
             mod.name AS moderator_name
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

    query += ` ORDER BY r.created_at DESC LIMIT 50`;

    const reportsRes = await pool.query(query, params);
    res.json(reportsRes.rows);
  } catch (err) {
    console.error('listReports error:', err.message);
    res.status(500).json({ message: 'Failed to list reports' });
  }
};

const resolveReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    const adminId = req.user.id;
    const { status, action_taken, moderator_note } = req.body;

    await pool.query(
      `UPDATE src_social_reports
       SET status = $1, moderator_id = $2, action_taken = $3, moderator_note = $4, updated_at = NOW()
       WHERE id = $5`,
      [status || 'resolved', adminId, action_taken || 'none', moderator_note || '', reportId]
    );

    await logAdminAction(adminId, 'resolve_report', 'report', reportId, { status, action_taken, moderator_note });
    res.json({ message: 'Report updated' });
  } catch (err) {
    console.error('resolveReport error:', err.message);
    res.status(500).json({ message: 'Failed to resolve report' });
  }
};

// ─── ADMIN CONTENT MANAGEMENT ─────────────────────────────────────────────
const manageContent = async (req, res) => {
  try {
    const { target_type, target_id, action } = req.body;
    const adminId = req.user.id;

    if (action === 'delete' || action === 'remove') {
      if (target_type === 'post') {
        await pool.query('DELETE FROM src_social_posts WHERE id = $1', [target_id]);
      } else if (target_type === 'reel') {
        await pool.query('DELETE FROM src_social_reels WHERE id = $1', [target_id]);
      } else if (target_type === 'story') {
        await pool.query('DELETE FROM src_social_stories WHERE id = $1', [target_id]);
      } else if (target_type === 'comment') {
        await pool.query('DELETE FROM src_social_comments WHERE id = $1', [target_id]);
      }
    } else if (action === 'hide') {
      if (target_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET is_hidden = TRUE WHERE id = $1', [target_id]);
      } else if (target_type === 'comment') {
        await pool.query('UPDATE src_social_comments SET is_hidden = TRUE WHERE id = $1', [target_id]);
      }
    } else if (action === 'restore') {
      if (target_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET is_hidden = FALSE WHERE id = $1', [target_id]);
      } else if (target_type === 'comment') {
        await pool.query('UPDATE src_social_comments SET is_hidden = FALSE WHERE id = $1', [target_id]);
      }
    }

    await logAdminAction(adminId, `${action}_content`, target_type, target_id, { action });
    res.json({ message: `Content action '${action}' completed` });
  } catch (err) {
    console.error('manageContent error:', err.message);
    res.status(500).json({ message: 'Failed to perform content action' });
  }
};

// ─── ADMIN USER MANAGEMENT ────────────────────────────────────────────────
const manageSocialUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.user.id;
    const { action, is_verified, is_banned } = req.body;

    if (action === 'toggle_verification') {
      await pool.query('UPDATE src_users SET is_verified = $1 WHERE id = $2', [!!is_verified, targetUserId]);
      await logAdminAction(adminId, 'toggle_verification', 'user', targetUserId, { is_verified });
    } else if (action === 'ban') {
      await pool.query('UPDATE src_users SET is_banned = TRUE WHERE id = $1', [targetUserId]);
      await logAdminAction(adminId, 'ban_user', 'user', targetUserId, { is_banned: true });
    } else if (action === 'unban') {
      await pool.query('UPDATE src_users SET is_banned = FALSE WHERE id = $1', [targetUserId]);
      await logAdminAction(adminId, 'unban_user', 'user', targetUserId, { is_banned: false });
    }

    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('manageSocialUser error:', err.message);
    res.status(500).json({ message: 'Failed to manage user' });
  }
};

// ─── FEATURE FLAGS ────────────────────────────────────────────────────────
const getFeatureFlags = async (req, res) => {
  try {
    const flagsRes = await pool.query('SELECT * FROM src_social_feature_flags ORDER BY key ASC');
    res.json(flagsRes.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch feature flags' });
  }
};

const updateFeatureFlag = async (req, res) => {
  try {
    const { key, enabled } = req.body;
    const adminId = req.user.id;

    await pool.query(
      'UPDATE src_social_feature_flags SET enabled = $1, updated_at = NOW() WHERE key = $2',
      [!!enabled, key]
    );

    await logAdminAction(adminId, 'update_feature_flag', 'feature_flag', key, { enabled });
    res.json({ message: 'Feature flag updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update feature flag' });
  }
};

module.exports = {
  getSocialDashboardMetrics,
  listReports,
  resolveReport,
  manageContent,
  manageSocialUser,
  getFeatureFlags,
  updateFeatureFlag,
};

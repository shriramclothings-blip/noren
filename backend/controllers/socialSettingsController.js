const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// ─── GET USER SETTINGS ────────────────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settingsRes = await pool.query(
      `SELECT 
        who_can_message,
        who_can_comment,
        who_can_tag,
        hidden_words,
        show_activity_status,
        show_online_status,
        allow_story_replies,
        story_privacy
       FROM src_social_privacy_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (settingsRes.rows.length === 0) {
      // Return defaults if settings don't exist yet
      return res.json({
        who_can_message: 'everyone',
        who_can_comment: 'everyone',
        who_can_tag: 'everyone',
        hidden_words: [],
        show_activity_status: true,
        show_online_status: true,
        allow_story_replies: true,
        story_privacy: 'everyone'
      });
    }

    res.json(settingsRes.rows[0]);
  } catch (err) {
    console.error('getSettings error:', err.message);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

// ─── UPDATE PRIVACY SETTINGS ──────────────────────────────────────────────
const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      who_can_message,
      who_can_comment,
      who_can_tag,
      hidden_words,
      show_activity_status,
      show_online_status,
      allow_story_replies,
      story_privacy
    } = req.body;

    await pool.query(
      `INSERT INTO src_social_privacy_settings
        (user_id, who_can_message, who_can_comment, who_can_tag, hidden_words, show_activity_status, show_online_status, allow_story_replies, story_privacy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
        who_can_message = COALESCE($2, src_social_privacy_settings.who_can_message),
        who_can_comment = COALESCE($3, src_social_privacy_settings.who_can_comment),
        who_can_tag = COALESCE($4, src_social_privacy_settings.who_can_tag),
        hidden_words = COALESCE($5, src_social_privacy_settings.hidden_words),
        show_activity_status = COALESCE($6, src_social_privacy_settings.show_activity_status),
        show_online_status = COALESCE($7, src_social_privacy_settings.show_online_status),
        allow_story_replies = COALESCE($8, src_social_privacy_settings.allow_story_replies),
        story_privacy = COALESCE($9, src_social_privacy_settings.story_privacy),
        updated_at = NOW()`,
      [
        userId,
        who_can_message,
        who_can_comment,
        who_can_tag,
        hidden_words || [],
        show_activity_status,
        show_online_status,
        allow_story_replies,
        story_privacy
      ]
    );

    res.json({ message: 'Privacy settings updated' });
  } catch (err) {
    console.error('updatePrivacySettings error:', err.message);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

// ─── GET NOTIFICATION PREFERENCES ────────────────────────────────────────
const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const prefsRes = await pool.query(
      `SELECT 
        COALESCE((metadata->>'notification_likes'), 'true')::boolean as likes,
        COALESCE((metadata->>'notification_comments'), 'true')::boolean as comments,
        COALESCE((metadata->>'notification_follows'), 'true')::boolean as follows,
        COALESCE((metadata->>'notification_messages'), 'true')::boolean as messages,
        COALESCE((metadata->>'notification_mentions'), 'true')::boolean as mentions,
        COALESCE((metadata->>'notification_story_reactions'), 'true')::boolean as story_reactions
       FROM src_users
       WHERE id = $1`,
      [userId]
    );

    if (prefsRes.rows.length === 0) {
      return res.json({
        likes: true,
        comments: true,
        follows: true,
        messages: true,
        mentions: true,
        story_reactions: true
      });
    }

    res.json(prefsRes.rows[0]);
  } catch (err) {
    console.error('getNotificationPreferences error:', err.message);
    res.status(500).json({ message: 'Failed to fetch notification preferences' });
  }
};

// ─── UPDATE NOTIFICATION PREFERENCES ──────────────────────────────────────
const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { likes, comments, follows, messages, mentions, story_reactions } = req.body;

    await pool.query(
      `UPDATE src_users
       SET metadata = COALESCE(metadata, '{}'::jsonb) ||
        jsonb_build_object(
          'notification_likes', COALESCE($2, 'true'),
          'notification_comments', COALESCE($3, 'true'),
          'notification_follows', COALESCE($4, 'true'),
          'notification_messages', COALESCE($5, 'true'),
          'notification_mentions', COALESCE($6, 'true'),
          'notification_story_reactions', COALESCE($7, 'true')
        )
       WHERE id = $1`,
      [userId, likes, comments, follows, messages, mentions, story_reactions]
    );

    res.json({ message: 'Notification preferences updated' });
  } catch (err) {
    console.error('updateNotificationPreferences error:', err.message);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
};

// ─── GET BLOCKED USERS ────────────────────────────────────────────────────
const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const blockedRes = await pool.query(
      `SELECT u.id, u.name, u.username, u.avatar_url,
        b.created_at
       FROM src_social_blocks b
       JOIN src_users u ON b.blocked_id = u.id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      blocked_users: blockedRes.rows,
      limit,
      offset,
      hasMore: blockedRes.rows.length === limit
    });
  } catch (err) {
    console.error('getBlockedUsers error:', err.message);
    res.status(500).json({ message: 'Failed to fetch blocked users' });
  }
};

// ─── GET RESTRICTED USERS ────────────────────────────────────────────────
const getRestrictedUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const restrictedRes = await pool.query(
      `SELECT u.id, u.name, u.username, u.avatar_url,
        r.created_at
       FROM src_social_restrictions r
       JOIN src_users u ON r.restricted_user_id = u.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json({ restricted_users: restrictedRes.rows });
  } catch (err) {
    console.error('getRestrictedUsers error:', err.message);
    res.status(500).json({ message: 'Failed to fetch restricted users' });
  }
};

// ─── GET ACCOUNT SETTINGS ─────────────────────────────────────────────────
const getAccountSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const userRes = await pool.query(
      `SELECT id, name, email, phone, username, is_private, created_at
       FROM src_users
       WHERE id = $1`,
      [userId]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userRes.rows[0]);
  } catch (err) {
    console.error('getAccountSettings error:', err.message);
    res.status(500).json({ message: 'Failed to fetch account settings' });
  }
};

// ─── UPDATE ACCOUNT SETTINGS ──────────────────────────────────────────────
const updateAccountSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, username, is_private } = req.body;

    // Check username uniqueness if changing
    if (username) {
      const existingRes = await pool.query(
        'SELECT id FROM src_users WHERE username = $1 AND id != $2',
        [username, userId]
      );
      if (existingRes.rows.length > 0) {
        return res.status(409).json({ message: 'Username already taken' });
      }
    }

    await pool.query(
      `UPDATE src_users
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           username = COALESCE($5, username),
           is_private = COALESCE($6, is_private),
           updated_at = NOW()
       WHERE id = $1`,
      [userId, name, email, phone, username, is_private]
    );

    res.json({ message: 'Account settings updated' });
  } catch (err) {
    console.error('updateAccountSettings error:', err.message);
    res.status(500).json({ message: 'Failed to update account settings' });
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Both passwords required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const userRes = await pool.query(
      'SELECT password FROM src_users WHERE id = $1',
      [userId]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, userRes.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    // Hash new password
    const hash = await bcrypt.hash(new_password, 12);

    await pool.query(
      'UPDATE src_users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hash, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err.message);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

module.exports = {
  getSettings,
  updatePrivacySettings,
  getNotificationPreferences,
  updateNotificationPreferences,
  getBlockedUsers,
  getRestrictedUsers,
  getAccountSettings,
  updateAccountSettings,
  changePassword
};

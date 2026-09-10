'use strict';

/**
 * NOREN EMAIL PORTAL - Settings Controller
 * Email portal settings, sender identities, and audit logs
 */

const { pool } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/settings - Get email portal settings
 */
const getSettings = async (req, res) => {
  try {
    // Email portal settings stored in environment or database
    // For now, return configuration-based settings
    res.json({
      general: {
        site_name: 'NOREN Mail',
        from_name: process.env.EMAIL_FROM || 'NOREN',
        support_email: process.env.EMAIL_USER || 'supportnoren1@gmail.com',
        email_provider: 'Resend',
        max_recipients_per_campaign: 10000,
        max_attachment_size_mb: 25,
      },
      features: {
        campaigns_enabled: true,
        automation_enabled: true,
        templates_enabled: true,
        analytics_enabled: true,
        suppression_list_enabled: true,
        bulk_sending_enabled: true,
      },
      limits: {
        daily_send_limit: 10000,
        campaign_size_limit: 10000,
        automation_limit: 50,
        template_limit: 100,
      },
      notifications: {
        campaign_completion: true,
        automation_errors: true,
        suppression_alerts: true,
        bounce_alerts: true,
      },
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/email/settings - Update email portal settings
 */
const updateSettings = async (req, res) => {
  try {
    // In a full implementation, settings would be stored in database
    // For now, return success with updated values
    const { general, features, limits, notifications } = req.body;

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'update_email_settings',
      targetType: 'settings',
      targetId: null,
      details: req.body,
    });

    res.json({
      message: 'Settings updated successfully',
      settings: { general, features, limits, notifications },
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SENDER IDENTITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/sender-identities - List sender identities
 */
const getSenderIdentities = async (req, res) => {
  try {
    const { active } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(active === 'true');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT 
        id, name, email, reply_to, identity_type, is_default,
        is_active, verification_status, verified_at, created_at
       FROM src_email_sender_identities
       ${whereClause}
       ORDER BY is_default DESC, created_at DESC`,
      values
    );

    res.json({
      sender_identities: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    console.error('Error fetching sender identities:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/sender-identities - Add sender identity
 */
const addSenderIdentity = async (req, res) => {
  try {
    const {
      name,
      email,
      reply_to,
      identity_type = 'verified',
      is_default = false,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'name and email are required' });
    }

    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM src_email_sender_identities WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length) {
      return res.status(409).json({ message: 'Sender identity already exists' });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE src_email_sender_identities SET is_default = FALSE');
    }

    const result = await pool.query(
      `INSERT INTO src_email_sender_identities (
        name, email, reply_to, identity_type, is_default, is_active,
        verification_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        name,
        email.toLowerCase().trim(),
        reply_to || email.toLowerCase().trim(),
        identity_type,
        is_default,
        true,
        'pending', // Verification would be handled separately
        req.user.id,
      ]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'add_sender_identity',
      targetType: 'sender_identity',
      targetId: result.rows[0].id,
      details: { name, email, identity_type },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding sender identity:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/email/sender-identities/:id - Update sender identity
 */
const updateSenderIdentity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, reply_to, is_default, is_active } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (reply_to !== undefined) {
      updates.push(`reply_to = $${idx++}`);
      values.push(reply_to);
    }
    if (is_default !== undefined) {
      if (is_default) {
        // Unset other defaults
        await pool.query('UPDATE src_email_sender_identities SET is_default = FALSE');
      }
      updates.push(`is_default = $${idx++}`);
      values.push(is_default);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE src_email_sender_identities
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Sender identity not found' });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'update_sender_identity',
      targetType: 'sender_identity',
      targetId: id,
      details: req.body,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating sender identity:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/email/sender-identities/:id - Delete sender identity
 */
const deleteSenderIdentity = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, name, email, identity_type FROM src_email_sender_identities WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Sender identity not found' });
    }

    const identity = existing.rows[0];

    // Prevent deletion of system identities
    if (identity.identity_type === 'system') {
      return res.status(403).json({
        message: 'System sender identities cannot be deleted',
      });
    }

    await pool.query('DELETE FROM src_email_sender_identities WHERE id = $1', [id]);

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'delete_sender_identity',
      targetType: 'sender_identity',
      targetId: id,
      details: { name: identity.name, email: identity.email },
    });

    res.json({ message: 'Sender identity deleted successfully' });
  } catch (err) {
    console.error('Error deleting sender identity:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/sender-identities/:id/verify - Verify sender identity
 */
const verifySenderIdentity = async (req, res) => {
  try {
    const { id } = req.params;

    // In a full implementation, this would:
    // 1. Send verification email
    // 2. Generate verification token
    // 3. Wait for user to click verification link
    // For now, simulate verification

    const result = await pool.query(
      `UPDATE src_email_sender_identities
       SET verification_status = 'verified', verified_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Sender identity not found' });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'verify_sender_identity',
      targetType: 'sender_identity',
      targetId: id,
      details: { email: result.rows[0].email },
    });

    res.json({
      message: 'Sender identity verified',
      sender_identity: result.rows[0],
    });
  } catch (err) {
    console.error('Error verifying sender identity:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/audit - Get audit logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const { action, resource_type, user_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (action) {
      conditions.push(`action = $${idx++}`);
      values.push(action);
    }

    if (resource_type) {
      conditions.push(`resource_type = $${idx++}`);
      values.push(resource_type);
    }

    if (user_id) {
      conditions.push(`user_id = $${idx++}`);
      values.push(user_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        a.id, a.action, a.resource_type, a.resource_id, a.details,
        a.ip_address, a.user_agent, a.created_at,
        u.name as user_name, u.email as user_email
       FROM src_email_audit a
       LEFT JOIN src_users u ON u.id = a.user_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_audit a ${whereClause}`,
      values.slice(0, -2)
    );

    res.json({
      audit_logs: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/audit/actions - Get list of audit actions
 */
const getAuditActions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT action, COUNT(*) as count
      FROM src_email_audit
      GROUP BY action
      ORDER BY count DESC
    `);

    res.json({
      actions: result.rows.map(row => ({
        action: row.action,
        count: parseInt(row.count),
      })),
    });
  } catch (err) {
    console.error('Error fetching audit actions:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/audit/stats - Get audit statistics
 */
const getAuditStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT resource_type) as resource_types,
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as daily_count
      FROM src_email_audit
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `);

    const byResourceType = await pool.query(`
      SELECT 
        resource_type,
        COUNT(*) as count
      FROM src_email_audit
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY resource_type
      ORDER BY count DESC
    `);

    const topUsers = await pool.query(`
      SELECT 
        u.name, u.email,
        COUNT(*) as action_count
      FROM src_email_audit a
      LEFT JOIN src_users u ON u.id = a.user_id
      WHERE a.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY u.name, u.email
      ORDER BY action_count DESC
      LIMIT 10
    `);

    res.json({
      period_days: parseInt(days),
      daily_stats: stats.rows.map(row => ({
        date: row.date,
        count: parseInt(row.daily_count),
      })),
      by_resource_type: byResourceType.rows.map(row => ({
        resource_type: row.resource_type,
        count: parseInt(row.count),
      })),
      top_users: topUsers.rows.map(row => ({
        name: row.name,
        email: row.email,
        action_count: parseInt(row.action_count),
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching audit stats:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/audit/export - Export audit logs
 */
const exportAuditLogs = async (req, res) => {
  try {
    const { format = 'csv', days = 30 } = req.query;

    const result = await pool.query(`
      SELECT 
        a.id, a.action, a.resource_type, a.resource_id,
        a.details, a.ip_address, a.created_at,
        u.name as user_name, u.email as user_email
      FROM src_email_audit a
      LEFT JOIN src_users u ON u.id = a.user_id
      WHERE a.created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY a.created_at DESC
    `);

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'Timestamp,User,Action,Resource Type,Resource ID,IP Address,Details\n';
      const csvRows = result.rows.map(row => 
        `"${row.created_at}","${row.user_email || 'N/A'}","${row.action}","${row.resource_type}","${row.resource_id || ''}","${row.ip_address || ''}","${JSON.stringify(row.details).replace(/"/g, '""')}"`
      ).join('\n');
      const csv = csvHeaders + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="email-audit-logs-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        audit_logs: result.rows,
        exported_at: new Date().toISOString(),
        period_days: parseInt(days),
        total: result.rows.length,
      });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'export_audit_logs',
      targetType: 'audit',
      targetId: null,
      details: { format, days, count: result.rows.length },
    });
  } catch (err) {
    console.error('Error exporting audit logs:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  // Settings
  getSettings,
  updateSettings,
  // Sender Identities
  getSenderIdentities,
  addSenderIdentity,
  updateSenderIdentity,
  deleteSenderIdentity,
  verifySenderIdentity,
  // Audit Logs
  getAuditLogs,
  getAuditActions,
  getAuditStats,
  exportAuditLogs,
};
'use strict';

/**
 * NOREN EMAIL PORTAL - Suppression Controller
 * Manages global email suppression list for compliance
 */

const { pool } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// ═══════════════════════════════════════════════════════════════════════════
// SUPPRESSION LIST MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/suppression - List suppressed emails
 */
const getSuppressionList = async (req, res) => {
  try {
    const { suppression_type, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (suppression_type) {
      conditions.push(`suppression_type = $${idx++}`);
      values.push(suppression_type);
    }

    if (search) {
      conditions.push(`(email ILIKE $${idx} OR reason ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        id, email, reason, suppression_type, source, campaign_id, created_at
       FROM src_email_suppression
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_suppression ${whereClause}`,
      values.slice(0, -2)
    );

    res.json({
      suppressed_emails: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching suppression list:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/suppression - Add email to suppression list
 */
const addToSuppression = async (req, res) => {
  try {
    const { email, reason, suppression_type, source, campaign_id } = req.body;

    if (!email || !reason || !suppression_type) {
      return res.status(400).json({
        message: 'email, reason, and suppression_type are required',
      });
    }

    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if already suppressed
    const existing = await pool.query(
      'SELECT id FROM src_email_suppression WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length) {
      return res.status(409).json({ message: 'Email already suppressed' });
    }

    const result = await pool.query(
      `INSERT INTO src_email_suppression (
        email, reason, suppression_type, source, campaign_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        email.toLowerCase().trim(),
        reason,
        suppression_type,
        source || 'manual',
        campaign_id || null,
        JSON.stringify({ added_by: req.user.id }),
      ]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'add_suppression',
      targetType: 'suppression',
      targetId: result.rows[0].id,
      details: { email, suppression_type, reason },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding to suppression:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/email/suppression/:id - Remove from suppression list
 */
const removeFromSuppression = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, email, suppression_type FROM src_email_suppression WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Suppressed email not found' });
    }

    const suppressedEmail = existing.rows[0];

    // Check if it's safe to remove (e.g., don't remove bounces/complaints)
    if (['bounced', 'complained'].includes(suppressedEmail.suppression_type)) {
      return res.status(400).json({
        message: 'Cannot remove bounced or complained emails from suppression list',
      });
    }

    await pool.query('DELETE FROM src_email_suppression WHERE id = $1', [id]);

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'remove_suppression',
      targetType: 'suppression',
      targetId: id,
      details: {
        email: suppressedEmail.email,
        suppression_type: suppressedEmail.suppression_type,
      },
    });

    res.json({ message: 'Email removed from suppression list' });
  } catch (err) {
    console.error('Error removing from suppression:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/suppression/bulk - Bulk add to suppression
 */
const bulkAddToSuppression = async (req, res) => {
  try {
    const { emails, reason, suppression_type, source = 'bulk_import' } = req.body;

    if (!emails || !Array.isArray(emails) || !reason || !suppression_type) {
      return res.status(400).json({
        message: 'emails array, reason, and suppression_type are required',
      });
    }

    let added = 0;
    let skipped = 0;
    let errors = [];

    for (const email of emails) {
      try {
        const cleanEmail = email.toLowerCase().trim();

        // Validate email format
        if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
          skipped++;
          errors.push({ email, error: 'Invalid email format' });
          continue;
        }

        // Check if already exists
        const existing = await pool.query(
          'SELECT id FROM src_email_suppression WHERE email = $1',
          [cleanEmail]
        );

        if (existing.rows.length) {
          skipped++;
          continue;
        }

        await pool.query(
          `INSERT INTO src_email_suppression (
            email, reason, suppression_type, source, metadata
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            cleanEmail,
            reason,
            suppression_type,
            source,
            JSON.stringify({ added_by: req.user.id, bulk_import: true }),
          ]
        );

        added++;
      } catch (err) {
        skipped++;
        errors.push({ email, error: err.message });
      }
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'bulk_add_suppression',
      targetType: 'suppression',
      targetId: null,
      details: { added, skipped, total: emails.length, suppression_type },
    });

    res.json({
      message: `Bulk suppression completed: ${added} added, ${skipped} skipped`,
      added,
      skipped,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (err) {
    console.error('Error bulk adding to suppression:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/suppression/import - Import suppression list from CSV
 */
const importSuppressionList = async (req, res) => {
  try {
    const { csv_data, reason, suppression_type = 'manual', source = 'csv_import' } = req.body;

    if (!csv_data || !reason) {
      return res.status(400).json({
        message: 'csv_data and reason are required',
      });
    }

    // Parse CSV data (expecting email addresses)
    const lines = csv_data.split('\n').map(line => line.trim()).filter(line => line);
    const emails = [];

    for (const line of lines) {
      // Handle CSV with headers or plain email lists
      const email = line.split(',')[0].replace(/"/g, '').trim();
      if (email && email.includes('@')) {
        emails.push(email);
      }
    }

    if (!emails.length) {
      return res.status(400).json({ message: 'No valid emails found in CSV data' });
    }

    // Use bulk add functionality
    const result = await bulkAddToSuppression({
      body: { emails, reason, suppression_type, source },
      user: req.user,
    });

    res.json({
      message: `Import completed from CSV: ${emails.length} emails processed`,
      total_processed: emails.length,
    });
  } catch (err) {
    console.error('Error importing suppression list:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/suppression/export - Export suppression list
 */
const exportSuppressionList = async (req, res) => {
  try {
    const { format = 'csv', suppression_type } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (suppression_type) {
      conditions.push(`suppression_type = $${idx++}`);
      values.push(suppression_type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT email, reason, suppression_type, source, created_at
       FROM src_email_suppression
       ${whereClause}
       ORDER BY created_at DESC`,
      values
    );

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'Email,Reason,Type,Source,Created At\n';
      const csvRows = result.rows.map(row => 
        `"${row.email}","${row.reason}","${row.suppression_type}","${row.source}","${row.created_at}"`
      ).join('\n');
      const csv = csvHeaders + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="noren-suppression-list-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        suppressed_emails: result.rows,
        exported_at: new Date().toISOString(),
        total: result.rows.length,
      });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'export_suppression',
      targetType: 'suppression',
      targetId: null,
      details: { format, suppression_type, count: result.rows.length },
    });
  } catch (err) {
    console.error('Error exporting suppression list:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/suppression/check - Check if email is suppressed
 */
const checkSuppression = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const result = await pool.query(
      `SELECT id, reason, suppression_type, source, created_at
       FROM src_email_suppression 
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const isSuppressed = result.rows.length > 0;

    res.json({
      email,
      is_suppressed: isSuppressed,
      suppression_details: isSuppressed ? result.rows[0] : null,
    });
  } catch (err) {
    console.error('Error checking suppression:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/suppression/batch-check - Check multiple emails
 */
const batchCheckSuppression = async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ message: 'emails array is required' });
    }

    const cleanEmails = emails.map(email => email.toLowerCase().trim());

    const result = await pool.query(
      `SELECT email, reason, suppression_type, source, created_at
       FROM src_email_suppression 
       WHERE email = ANY($1)`,
      [cleanEmails]
    );

    const suppressedMap = new Map(
      result.rows.map(row => [row.email, row])
    );

    const checks = cleanEmails.map(email => ({
      email,
      is_suppressed: suppressedMap.has(email),
      suppression_details: suppressedMap.get(email) || null,
    }));

    res.json({
      checks,
      total_checked: emails.length,
      suppressed_count: result.rows.length,
    });
  } catch (err) {
    console.error('Error batch checking suppression:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/suppression/stats - Get suppression statistics
 */
const getSuppressionStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        suppression_type,
        COUNT(*) as count
      FROM src_email_suppression
      GROUP BY suppression_type
      ORDER BY count DESC
    `);

    const totalResult = await pool.query('SELECT COUNT(*) as total FROM src_email_suppression');
    
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent_count
      FROM src_email_suppression
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    res.json({
      total_suppressed: parseInt(totalResult.rows[0].total),
      recent_suppressions: parseInt(recentResult.rows[0].recent_count),
      by_type: result.rows.map(row => ({
        type: row.suppression_type,
        count: parseInt(row.count),
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error getting suppression stats:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getSuppressionList,
  addToSuppression,
  removeFromSuppression,
  bulkAddToSuppression,
  importSuppressionList,
  exportSuppressionList,
  checkSuppression,
  batchCheckSuppression,
  getSuppressionStats,
};
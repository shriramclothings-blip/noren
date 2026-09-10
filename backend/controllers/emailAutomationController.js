'use strict';

/**
 * NOREN EMAIL PORTAL - Automation Controller
 * Handles automated email workflows and triggers
 */

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const { logAudit } = require('../utils/auditLogger');

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL AUTOMATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/automations - List automations
 */
const getAutomations = async (req, res) => {
  try {
    const { trigger_type, active, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (trigger_type) {
      conditions.push(`trigger_type = $${idx++}`);
      values.push(trigger_type);
    }

    if (active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(active === 'true');
    }

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        a.id, a.name, a.description, a.trigger_type, a.subject, a.delay_minutes,
        a.is_active, a.last_executed_at, a.execution_count, a.success_count,
        a.failure_count, a.created_at,
        u.name as created_by_name,
        t.name as template_name
       FROM src_email_automations a
       LEFT JOIN src_users u ON u.id = a.created_by
       LEFT JOIN src_email_templates t ON t.id = a.template_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_automations a ${whereClause}`,
      values.slice(0, -2)
    );

    res.json({
      automations: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching automations:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/automations/:id - Get automation detail
 */
const getAutomationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        a.*,
        u.name as created_by_name,
        t.name as template_name
       FROM src_email_automations a
       LEFT JOIN src_users u ON u.id = a.created_by
       LEFT JOIN src_email_templates t ON t.id = a.template_id
       WHERE a.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching automation:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/automations - Create automation
 */
const createAutomation = async (req, res) => {
  try {
    const {
      name,
      description,
      trigger_type,
      trigger_config,
      conditions,
      template_id,
      subject,
      body_html,
      body_plain,
      sender_email,
      sender_name,
      delay_minutes = 0,
      is_active = false, // Start as inactive for safety
    } = req.body;

    if (!name || !trigger_type || !trigger_config || !subject || !body_html) {
      return res.status(400).json({
        message: 'name, trigger_type, trigger_config, subject, and body_html are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO src_email_automations (
        name, description, trigger_type, trigger_config, conditions,
        template_id, subject, body_html, body_plain, sender_email, sender_name,
        delay_minutes, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name,
        description || null,
        trigger_type,
        JSON.stringify(trigger_config),
        JSON.stringify(conditions || []),
        template_id || null,
        subject,
        body_html,
        body_plain || null,
        sender_email || process.env.EMAIL_FROM,
        sender_name || 'NOREN',
        delay_minutes,
        is_active,
        req.user.id,
      ]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'create_automation',
      targetType: 'automation',
      targetId: result.rows[0].id,
      details: { name, trigger_type, is_active },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating automation:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/email/automations/:id - Update automation
 */
const updateAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      trigger_type,
      trigger_config,
      conditions,
      template_id,
      subject,
      body_html,
      body_plain,
      sender_email,
      sender_name,
      delay_minutes,
      is_active,
    } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description);
    }
    if (trigger_type !== undefined) {
      updates.push(`trigger_type = $${idx++}`);
      values.push(trigger_type);
    }
    if (trigger_config !== undefined) {
      updates.push(`trigger_config = $${idx++}`);
      values.push(JSON.stringify(trigger_config));
    }
    if (conditions !== undefined) {
      updates.push(`conditions = $${idx++}`);
      values.push(JSON.stringify(conditions));
    }
    if (template_id !== undefined) {
      updates.push(`template_id = $${idx++}`);
      values.push(template_id);
    }
    if (subject !== undefined) {
      updates.push(`subject = $${idx++}`);
      values.push(subject);
    }
    if (body_html !== undefined) {
      updates.push(`body_html = $${idx++}`);
      values.push(body_html);
    }
    if (body_plain !== undefined) {
      updates.push(`body_plain = $${idx++}`);
      values.push(body_plain);
    }
    if (sender_email !== undefined) {
      updates.push(`sender_email = $${idx++}`);
      values.push(sender_email);
    }
    if (sender_name !== undefined) {
      updates.push(`sender_name = $${idx++}`);
      values.push(sender_name);
    }
    if (delay_minutes !== undefined) {
      updates.push(`delay_minutes = $${idx++}`);
      values.push(delay_minutes);
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
      `UPDATE src_email_automations
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'update_automation',
      targetType: 'automation',
      targetId: id,
      details: req.body,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating automation:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/email/automations/:id - Delete automation
 */
const deleteAutomation = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, name FROM src_email_automations WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    await pool.query('DELETE FROM src_email_automations WHERE id = $1', [id]);

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'delete_automation',
      targetType: 'automation',
      targetId: id,
      details: { name: existing.rows[0].name },
    });

    res.json({ message: 'Automation deleted successfully' });
  } catch (err) {
    console.error('Error deleting automation:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/automations/:id/toggle - Enable/disable automation
 */
const toggleAutomation = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE src_email_automations
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, name, is_active`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    const automation = result.rows[0];

    await logAudit(pool, {
      adminId: req.user.id,
      action: automation.is_active ? 'enable_automation' : 'disable_automation',
      targetType: 'automation',
      targetId: id,
      details: { name: automation.name, is_active: automation.is_active },
    });

    res.json({
      id: automation.id,
      name: automation.name,
      is_active: automation.is_active,
      message: `Automation ${automation.is_active ? 'enabled' : 'disabled'}`,
    });
  } catch (err) {
    console.error('Error toggling automation:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/automations/:id/logs - Get automation execution logs
 */
const getAutomationLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['automation_id = $1'];
    const values = [id];
    let idx = 2;

    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }

    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        l.id, l.trigger_data, l.recipient_email, l.recipient_name,
        l.status, l.skip_reason, l.error_message, l.executed_at,
        e.id as email_id, e.subject
       FROM src_email_automation_logs l
       LEFT JOIN src_email_sent e ON e.id = l.email_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.executed_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_automation_logs WHERE ${conditions.join(' AND ')}`,
      values.slice(0, -2)
    );

    res.json({
      automation_id: id,
      logs: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching automation logs:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/automations/:id/test - Test automation with sample data
 */
const testAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const { test_email, test_data } = req.body;

    if (!test_email) {
      return res.status(400).json({ message: 'test_email is required' });
    }

    const automation = await pool.query(
      'SELECT * FROM src_email_automations WHERE id = $1',
      [id]
    );

    if (!automation.rows.length) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    const a = automation.rows[0];

    // Replace variables in subject and body with test data
    let testSubject = a.subject;
    let testBody = a.body_html;

    if (test_data && typeof test_data === 'object') {
      for (const [key, value] of Object.entries(test_data)) {
        const placeholder = `{{${key}}}`;
        testSubject = testSubject.replace(new RegExp(placeholder, 'g'), value);
        testBody = testBody.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Send test email
    const emailSent = await sendMail(
      test_email,
      `[TEST] ${testSubject}`,
      testBody
    );

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send test email' });
    }

    // Log test execution
    await pool.query(
      `INSERT INTO src_email_automation_logs (
        automation_id, trigger_data, recipient_email, status, metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        JSON.stringify({ test: true, test_data }),
        test_email,
        'sent',
        JSON.stringify({ test_execution: true, executed_by: req.user.id }),
      ]
    );

    res.json({
      message: 'Test email sent successfully',
      test_email,
      subject: testSubject,
    });
  } catch (err) {
    console.error('Error testing automation:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/automations/trigger - Manually trigger automation
 */
const triggerAutomation = async (req, res) => {
  try {
    const { automation_id, trigger_data, recipient_email, recipient_name } = req.body;

    if (!automation_id || !trigger_data || !recipient_email) {
      return res.status(400).json({
        message: 'automation_id, trigger_data, and recipient_email are required',
      });
    }

    const automation = await pool.query(
      'SELECT * FROM src_email_automations WHERE id = $1 AND is_active = TRUE',
      [automation_id]
    );

    if (!automation.rows.length) {
      return res.status(404).json({ message: 'Active automation not found' });
    }

    const result = await executeAutomation(
      automation.rows[0],
      trigger_data,
      recipient_email,
      recipient_name
    );

    res.json(result);
  } catch (err) {
    console.error('Error triggering automation:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/automations/:id/stats - Get automation statistics
 */
const getAutomationStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
        DATE_TRUNC('day', executed_at) as execution_date,
        COUNT(*) as daily_count
      FROM src_email_automation_logs
      WHERE automation_id = $1 
        AND executed_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('day', executed_at)
      ORDER BY execution_date DESC
    `, [id]);

    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped
      FROM src_email_automation_logs
      WHERE automation_id = $1 
        AND executed_at >= NOW() - INTERVAL '${days} days'
    `, [id]);

    const summaryData = summary.rows[0];
    const successRate = summaryData.total_executions > 0 
      ? ((summaryData.successful / summaryData.total_executions) * 100).toFixed(2)
      : 0;

    res.json({
      automation_id: id,
      period_days: parseInt(days),
      summary: {
        total_executions: parseInt(summaryData.total_executions),
        successful: parseInt(summaryData.successful),
        failed: parseInt(summaryData.failed),
        skipped: parseInt(summaryData.skipped),
        success_rate: parseFloat(successRate),
      },
      daily_stats: stats.rows.map(row => ({
        date: row.execution_date,
        executions: parseInt(row.daily_count),
      })),
    });
  } catch (err) {
    console.error('Error getting automation stats:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATION EXECUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute automation for a specific recipient
 */
async function executeAutomation(automation, triggerData, recipientEmail, recipientName) {
  try {
    // Check suppression list
    const suppressed = await pool.query(
      'SELECT id FROM src_email_suppression WHERE email = $1',
      [recipientEmail]
    );

    if (suppressed.rows.length) {
      // Log as skipped
      await pool.query(
        `INSERT INTO src_email_automation_logs (
          automation_id, trigger_data, recipient_email, recipient_name,
          status, skip_reason
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          automation.id,
          JSON.stringify(triggerData),
          recipientEmail,
          recipientName,
          'skipped',
          'suppressed',
        ]
      );

      return { status: 'skipped', reason: 'Email is suppressed' };
    }

    // Process email content with variables
    let processedSubject = automation.subject;
    let processedBody = automation.body_html;

    // Replace variables with actual data
    if (triggerData && typeof triggerData === 'object') {
      for (const [key, value] of Object.entries(triggerData)) {
        const placeholder = `{{${key}}}`;
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value || '');
        processedBody = processedBody.replace(new RegExp(placeholder, 'g'), value || '');
      }
    }

    // Add recipient name if available
    if (recipientName) {
      processedSubject = processedSubject.replace(/{{recipient_name}}/g, recipientName);
      processedBody = processedBody.replace(/{{recipient_name}}/g, recipientName);
    }

    // Send email
    const emailSent = await sendMail(recipientEmail, processedSubject, processedBody);

    if (emailSent) {
      // Record sent email
      const emailRecord = await pool.query(
        `INSERT INTO src_email_sent (
          sender_email, sender_name, recipient_email, recipient_name,
          subject, body_html, body_plain, email_type, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          automation.sender_email,
          automation.sender_name,
          recipientEmail,
          recipientName,
          processedSubject,
          processedBody,
          automation.body_plain,
          'automation',
          'sent',
          JSON.stringify({ automation_id: automation.id, trigger_data: triggerData }),
        ]
      );

      // Log successful execution
      await pool.query(
        `INSERT INTO src_email_automation_logs (
          automation_id, trigger_data, recipient_email, recipient_name,
          status, email_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          automation.id,
          JSON.stringify(triggerData),
          recipientEmail,
          recipientName,
          'sent',
          emailRecord.rows[0].id,
        ]
      );

      // Update automation counters
      await pool.query(
        `UPDATE src_email_automations 
         SET execution_count = execution_count + 1,
             success_count = success_count + 1,
             last_executed_at = NOW()
         WHERE id = $1`,
        [automation.id]
      );

      return { status: 'sent', email_id: emailRecord.rows[0].id };
    } else {
      // Log failed execution
      await pool.query(
        `INSERT INTO src_email_automation_logs (
          automation_id, trigger_data, recipient_email, recipient_name,
          status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          automation.id,
          JSON.stringify(triggerData),
          recipientEmail,
          recipientName,
          'failed',
          'Email sending failed',
        ]
      );

      // Update automation counters
      await pool.query(
        `UPDATE src_email_automations 
         SET execution_count = execution_count + 1,
             failure_count = failure_count + 1,
             last_executed_at = NOW()
         WHERE id = $1`,
        [automation.id]
      );

      return { status: 'failed', reason: 'Email sending failed' };
    }
  } catch (err) {
    console.error('Error executing automation:', err);

    // Log error
    await pool.query(
      `INSERT INTO src_email_automation_logs (
        automation_id, trigger_data, recipient_email, recipient_name,
        status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        automation.id,
        JSON.stringify(triggerData),
        recipientEmail,
        recipientName,
        'failed',
        err.message,
      ]
    );

    return { status: 'failed', reason: err.message };
  }
}

module.exports = {
  getAutomations,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  getAutomationLogs,
  testAutomation,
  triggerAutomation,
  getAutomationStats,
  executeAutomation, // Export for use in other modules
};
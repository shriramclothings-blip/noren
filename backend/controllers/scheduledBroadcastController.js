'use strict';

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/email/broadcasts
 * List all scheduled broadcasts
 */
const getScheduledBroadcasts = async (req, res) => {
  try {
    const { status, frequency } = req.query;
    
    let query = `
      SELECT b.*, 
             COUNT(l.id) as total_sent,
             u.name as created_by_name
      FROM src_email_scheduled_broadcasts b
      LEFT JOIN src_email_broadcast_logs l ON l.broadcast_id = b.id
      LEFT JOIN src_users u ON u.id = b.created_by
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND b.is_active = $${params.length + 1}`;
      params.push(status === 'active');
    }
    
    if (frequency) {
      query += ` AND b.frequency = $${params.length + 1}`;
      params.push(frequency);
    }
    
    query += `
      GROUP BY b.id, u.name
      ORDER BY b.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      broadcasts: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching scheduled broadcasts:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/email/broadcasts/:id
 * Get single broadcast
 */
const getBroadcastById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, 
             COUNT(l.id) as total_sent,
             u.name as created_by_name
      FROM src_email_scheduled_broadcasts b
      LEFT JOIN src_email_broadcast_logs l ON l.broadcast_id = b.id
      LEFT JOIN src_users u ON u.id = b.created_by
      WHERE b.id = $1
      GROUP BY b.id, u.name
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }
    
    res.json({ broadcast: result.rows[0] });
  } catch (error) {
    console.error('Error fetching broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/email/broadcasts
 * Create new scheduled broadcast
 */
const createBroadcast = async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      template_id,
      company_name,
      custom_content,
      cta_text,
      cta_url,
      frequency,
      custom_days,
      send_time,
      audience_type,
      custom_recipient_list,
      is_active
    } = req.body;
    
    if (!name || !subject || !send_time || !frequency) {
      return res.status(400).json({ 
        message: 'Name, subject, send time, and frequency are required' 
      });
    }
    
    // Calculate next run time
    const nextRunAt = calculateNextRunTime(frequency, send_time, custom_days);
    
    const result = await pool.query(`
      INSERT INTO src_email_scheduled_broadcasts (
        name, description, subject, template_id, company_name,
        custom_content, cta_text, cta_url,
        frequency, custom_days, send_time, audience_type,
        custom_recipient_list, is_active, next_run_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      name, description, subject, template_id, company_name || 'Dinesh Global Enterprises Pvt Ltd',
      custom_content, cta_text, cta_url,
      frequency, custom_days ? JSON.stringify(custom_days) : null, send_time,
      audience_type, custom_recipient_list, is_active !== false, nextRunAt,
      req.user.id
    ]);
    
    res.status(201).json({
      message: 'Broadcast created successfully',
      broadcast: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/email/broadcasts/:id
 * Update broadcast
 */
const updateBroadcast = async (req, res) => {
  try {
    const {
      name, description, subject, template_id, company_name,
      custom_content, cta_text, cta_url,
      frequency, custom_days, send_time, audience_type,
      custom_recipient_list, is_active
    } = req.body;
    
    // Calculate next run time
    const nextRunAt = calculateNextRunTime(frequency, send_time, custom_days);
    
    const result = await pool.query(`
      UPDATE src_email_scheduled_broadcasts
      SET name = $1, description = $2, subject = $3, template_id = $4,
          company_name = $5, custom_content = $6, cta_text = $7, cta_url = $8,
          frequency = $9, custom_days = $10, send_time = $11,
          audience_type = $12, custom_recipient_list = $13, is_active = $14,
          next_run_at = $15, updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      name, description, subject, template_id, company_name || 'Dinesh Global Enterprises Pvt Ltd',
      custom_content, cta_text, cta_url,
      frequency, custom_days ? JSON.stringify(custom_days) : null, send_time,
      audience_type, custom_recipient_list, is_active !== false, nextRunAt,
      req.params.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }
    
    res.json({
      message: 'Broadcast updated successfully',
      broadcast: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/email/broadcasts/:id
 * Delete broadcast
 */
const deleteBroadcast = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM src_email_scheduled_broadcasts WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }
    
    res.json({ message: 'Broadcast deleted successfully' });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PATCH /api/email/broadcasts/:id/toggle
 * Toggle broadcast active status
 */
const toggleBroadcast = async (req, res) => {
  try {
    const { is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE src_email_scheduled_broadcasts
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [is_active, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }
    
    res.json({
      message: `Broadcast ${is_active ? 'activated' : 'paused'}`,
      broadcast: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/email/broadcasts/:id/stats
 * Get broadcast statistics
 */
const getBroadcastStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sends,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        MAX(sent_at) as last_sent_at
      FROM src_email_broadcast_logs
      WHERE broadcast_id = $1
    `, [req.params.id]);
    
    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Error fetching broadcast stats:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/email/broadcasts/:id/send-now
 * Trigger broadcast immediately (manual send)
 */
const sendBroadcastNow = async (req, res) => {
  try {
    const broadcast = await pool.query(
      'SELECT * FROM src_email_scheduled_broadcasts WHERE id = $1',
      [req.params.id]
    );
    
    if (broadcast.rows.length === 0) {
      return res.status(404).json({ message: 'Broadcast not found' });
    }
    
    // Execute broadcast
    await executeBroadcast(broadcast.rows[0]);
    
    res.json({ message: 'Broadcast sent successfully' });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Helper: Calculate next run time
 */
function calculateNextRunTime(frequency, sendTime, customDays) {
  const now = new Date();
  const [hours, minutes] = sendTime.split(':').map(Number);
  
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  if (frequency === 'daily') {
    return next;
  }
  
  if (frequency === 'weekly') {
    // Next week same day
    next.setDate(next.getDate() + 7);
    return next;
  }
  
  if (frequency === 'custom' && customDays) {
    const days = typeof customDays === 'string' ? JSON.parse(customDays) : customDays;
    // Find next matching day
    for (let i = 0; i < 7; i++) {
      if (days.includes(next.getDay())) {
        return next;
      }
      next.setDate(next.getDate() + 1);
    }
  }
  
  if (frequency === 'one_time') {
    return next;
  }
  
  return next;
}

/**
 * Helper: Execute broadcast (send emails)
 */
async function executeBroadcast(broadcast) {
  try {
    // Get recipients based on audience type
    let recipients = [];
    
    if (broadcast.audience_type === 'custom_list') {
      const emails = broadcast.custom_recipient_list.split(/[,;\n]+/).map(e => e.trim());
      recipients = emails.map(email => ({ email, name: null }));
    } else if (broadcast.audience_type === 'subscribers') {
      const result = await pool.query(
        'SELECT NULL as id, name, email FROM src_newsletter_subscribers WHERE is_active=TRUE'
      );
      recipients = result.rows;
    } else if (broadcast.audience_type === 'customers') {
      const result = await pool.query(
        `SELECT id, name, email FROM src_users 
         WHERE is_banned=FALSE AND role IN ('user', 'customer')`
      );
      recipients = result.rows;
    } else {
      // all_contacts
      const result = await pool.query(
        'SELECT id, name, email FROM src_users WHERE is_banned=FALSE'
      );
      recipients = result.rows;
    }
    
    // Load email template
    const templatePath = path.join(__dirname, '../templates/broadcast-email-template.html');
    let emailHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Replace variables
    emailHtml = emailHtml.replace(/{{company_name}}/g, broadcast.company_name || 'Dinesh Global Pvt Ltd');
    emailHtml = emailHtml.replace(/{{subject}}/g, broadcast.subject);
    emailHtml = emailHtml.replace(/{{current_year}}/g, new Date().getFullYear());
    
    // Send emails in batches
    let successCount = 0;
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(r => {
          const personalizedHtml = emailHtml
            .replace(/{{recipient_name}}/g, r.name || 'Valued Customer')
            .replace(/{{message_content}}/g, broadcast.subject);
          return sendMail(r.email, broadcast.subject, personalizedHtml);
        })
      );
      successCount += results.filter(r => r.status === 'fulfilled').length;
    }
    
    // Log broadcast execution
    await pool.query(`
      INSERT INTO src_email_broadcast_logs (broadcast_id, recipients_count, sent_count, status)
      VALUES ($1, $2, $3, 'sent')
    `, [broadcast.id, recipients.length, successCount]);
    
    // Update next run time
    const nextRun = calculateNextRunTime(
      broadcast.frequency,
      broadcast.send_time,
      broadcast.custom_days
    );
    await pool.query(
      'UPDATE src_email_scheduled_broadcasts SET next_run_at = $1, last_run_at = NOW() WHERE id = $2',
      [nextRun, broadcast.id]
    );
    
    return { success: true, sent: successCount };
  } catch (error) {
    console.error('Error executing broadcast:', error);
    throw error;
  }
}

module.exports = {
  getScheduledBroadcasts,
  getBroadcastById,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  toggleBroadcast,
  getBroadcastStats,
  sendBroadcastNow
};

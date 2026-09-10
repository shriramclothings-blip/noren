'use strict';

/**
 * NOREN EMAIL PORTAL - Campaigns Controller
 * Handles campaign creation, scheduling, approval, and sending
 */

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const { logAudit } = require('../utils/auditLogger');

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/campaigns - List campaigns
 */
const getCampaigns = async (req, res) => {
  try {
    const { status, campaign_type, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }

    if (campaign_type) {
      conditions.push(`campaign_type = $${idx++}`);
      values.push(campaign_type);
    }

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR subject ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        c.id, c.name, c.campaign_type, c.subject, c.audience_type,
        c.status, c.scheduled_at, c.total_recipients, c.sent_count,
        c.delivered_count, c.opened_count, c.clicked_count,
        c.created_at, c.updated_at,
        u.name as created_by_name
       FROM src_email_campaigns c
       LEFT JOIN src_users u ON u.id = c.created_by
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_campaigns c ${whereClause}`,
      values.slice(0, -2)
    );

    res.json({
      campaigns: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/campaigns/:id - Get campaign detail
 */
const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*,
        t.name as template_name,
        u1.name as created_by_name,
        u2.name as approved_by_name
       FROM src_email_campaigns c
       LEFT JOIN src_email_templates t ON t.id = c.template_id
       LEFT JOIN src_users u1 ON u1.id = c.created_by
       LEFT JOIN src_users u2 ON u2.id = c.approved_by
       WHERE c.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/campaigns - Create campaign
 */
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      campaign_type = 'marketing',
      subject,
      preview_text,
      body_html,
      body_plain,
      template_id,
      sender_email,
      sender_name,
      reply_to,
      audience_type,
      audience_filter,
      segment_id,
      custom_recipient_list,
    } = req.body;

    if (!name || !subject || !body_html || !audience_type) {
      return res.status(400).json({
        message: 'name, subject, body_html, and audience_type are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO src_email_campaigns (
        name, description, campaign_type, subject, preview_text,
        body_html, body_plain, template_id, sender_email, sender_name,
        reply_to, audience_type, audience_filter, segment_id,
        custom_recipient_list, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        name,
        description || null,
        campaign_type,
        subject,
        preview_text || null,
        body_html,
        body_plain || null,
        template_id || null,
        sender_email || process.env.EMAIL_FROM,
        sender_name || 'NOREN',
        reply_to || null,
        audience_type,
        JSON.stringify(audience_filter || {}),
        segment_id || null,
        custom_recipient_list ? JSON.stringify(custom_recipient_list) : null,
        'draft',
        req.user.id,
      ]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'create_campaign',
      targetType: 'campaign',
      targetId: result.rows[0].id,
      details: { name, campaign_type, audience_type },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/email/campaigns/:id - Update campaign
 */
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Check campaign exists and is in editable state
    const existing = await pool.query(
      'SELECT id, status FROM src_email_campaigns WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (['sending', 'sent', 'completed'].includes(existing.rows[0].status)) {
      return res.status(400).json({
        message: 'Cannot update campaign that is sending or completed',
      });
    }

    const {
      name,
      description,
      campaign_type,
      subject,
      preview_text,
      body_html,
      body_plain,
      template_id,
      sender_email,
      sender_name,
      reply_to,
      audience_type,
      audience_filter,
      segment_id,
      custom_recipient_list,
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
    if (campaign_type !== undefined) {
      updates.push(`campaign_type = $${idx++}`);
      values.push(campaign_type);
    }
    if (subject !== undefined) {
      updates.push(`subject = $${idx++}`);
      values.push(subject);
    }
    if (preview_text !== undefined) {
      updates.push(`preview_text = $${idx++}`);
      values.push(preview_text);
    }
    if (body_html !== undefined) {
      updates.push(`body_html = $${idx++}`);
      values.push(body_html);
    }
    if (body_plain !== undefined) {
      updates.push(`body_plain = $${idx++}`);
      values.push(body_plain);
    }
    if (template_id !== undefined) {
      updates.push(`template_id = $${idx++}`);
      values.push(template_id);
    }
    if (sender_email !== undefined) {
      updates.push(`sender_email = $${idx++}`);
      values.push(sender_email);
    }
    if (sender_name !== undefined) {
      updates.push(`sender_name = $${idx++}`);
      values.push(sender_name);
    }
    if (reply_to !== undefined) {
      updates.push(`reply_to = $${idx++}`);
      values.push(reply_to);
    }
    if (audience_type !== undefined) {
      updates.push(`audience_type = $${idx++}`);
      values.push(audience_type);
    }
    if (audience_filter !== undefined) {
      updates.push(`audience_filter = $${idx++}`);
      values.push(JSON.stringify(audience_filter));
    }
    if (segment_id !== undefined) {
      updates.push(`segment_id = $${idx++}`);
      values.push(segment_id);
    }
    if (custom_recipient_list !== undefined) {
      updates.push(`custom_recipient_list = $${idx++}`);
      values.push(JSON.stringify(custom_recipient_list));
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE src_email_campaigns
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'update_campaign',
      targetType: 'campaign',
      targetId: id,
      details: req.body,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating campaign:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/email/campaigns/:id - Delete campaign
 */
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Check campaign exists and is deletable
    const existing = await pool.query(
      'SELECT id, name, status FROM src_email_campaigns WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (['sending', 'sent', 'completed'].includes(existing.rows[0].status)) {
      return res.status(400).json({
        message: 'Cannot delete campaign that has been sent. Cancel it instead.',
      });
    }

    await pool.query('DELETE FROM src_email_campaigns WHERE id = $1', [id]);

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'delete_campaign',
      targetType: 'campaign',
      targetId: id,
      details: { name: existing.rows[0].name },
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/campaigns/:id/schedule - Schedule campaign
 */
const scheduleCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({ message: 'scheduled_at is required' });
    }

    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ message: 'scheduled_at must be in the future' });
    }

    // Update campaign status
    const result = await pool.query(
      `UPDATE src_email_campaigns
       SET status = 'scheduled', scheduled_at = $1
       WHERE id = $2 AND status IN ('draft', 'approved')
       RETURNING *`,
      [scheduled_at, id]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        message: 'Campaign not found or not in schedulable state',
      });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'schedule_campaign',
      targetType: 'campaign',
      targetId: id,
      details: { scheduled_at },
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error scheduling campaign:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/campaigns/:id/approve - Approve campaign
 */
const approveCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE src_email_campaigns
       SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2 AND status = 'pending_approval'
       RETURNING *`,
      [req.user.id, id]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        message: 'Campaign not found or not pending approval',
      });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'approve_campaign',
      targetType: 'campaign',
      targetId: id,
      details: {},
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error approving campaign:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/campaigns/:id/send - Send campaign now
 */
const sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const campaignRes = await pool.query(
      'SELECT * FROM src_email_campaigns WHERE id = $1',
      [id]
    );

    if (!campaignRes.rows.length) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaignRes.rows[0];

    if (!['draft', 'approved', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        message: 'Campaign is not in sendable state',
      });
    }

    // Get recipients based on audience_type
    let recipients = [];

    switch (campaign.audience_type) {
      case 'all_users':
        const allUsers = await pool.query(
          `SELECT email, name FROM src_users WHERE is_banned = FALSE AND email IS NOT NULL`
        );
        recipients = allUsers.rows;
        break;

      case 'customers':
        const customers = await pool.query(
          `SELECT email, name FROM src_users WHERE role = 'customer' AND is_banned = FALSE AND email IS NOT NULL`
        );
        recipients = customers.rows;
        break;

      case 'subscribers':
        const subscribers = await pool.query(
          `SELECT email, name FROM src_newsletter_subscribers WHERE is_active = TRUE AND email IS NOT NULL`
        );
        recipients = subscribers.rows;
        break;

      case 'sellers':
        const sellers = await pool.query(
          `SELECT email, business_name as name FROM src_sellers WHERE status = 'approved' AND email IS NOT NULL`
        );
        recipients = sellers.rows;
        break;

      case 'influencers':
        const influencers = await pool.query(
          `SELECT email, name FROM src_influencers WHERE is_active = TRUE AND email IS NOT NULL`
        );
        recipients = influencers.rows;
        break;

      case 'employees':
        const employees = await pool.query(
          `SELECT email, name FROM src_erp_employees WHERE is_active = TRUE AND email IS NOT NULL`
        );
        recipients = employees.rows;
        break;

      case 'custom_list':
        if (campaign.custom_recipient_list) {
          recipients = campaign.custom_recipient_list.map((email) =>
            typeof email === 'string' ? { email, name: null } : email
          );
        }
        break;

      default:
        return res.status(400).json({ message: 'Invalid audience_type' });
    }

    // Filter out suppressed emails
    const suppressedRes = await pool.query(
      'SELECT email FROM src_email_suppression'
    );
    const suppressedEmails = new Set(suppressedRes.rows.map((r) => r.email));

    const eligibleRecipients = recipients.filter(
      (r) => !suppressedEmails.has(r.email)
    );

    // Update campaign status
    await pool.query(
      `UPDATE src_email_campaigns
       SET status = 'sending', started_at = NOW(), total_recipients = $1
       WHERE id = $2`,
      [eligibleRecipients.length, id]
    );

    // Send emails in batches (background process would handle this in production)
    let sent = 0;
    let failed = 0;

    for (const recipient of eligibleRecipients) {
      try {
        const emailSent = await sendMail(
          recipient.email,
          campaign.subject,
          campaign.body_html
        );

        if (emailSent) {
          // Record sent email
          await pool.query(
            `INSERT INTO src_email_sent (
              user_id, sender_email, sender_name, recipient_email, recipient_name,
              subject, body_html, body_plain, campaign_id, email_type, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              campaign.created_by,
              campaign.sender_email,
              campaign.sender_name,
              recipient.email,
              recipient.name,
              campaign.subject,
              campaign.body_html,
              campaign.body_plain,
              id,
              'campaign',
              'sent',
            ]
          );
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`Error sending to ${recipient.email}:`, err);
        failed++;
      }
    }

    // Update campaign with results
    await pool.query(
      `UPDATE src_email_campaigns
       SET status = 'completed', completed_at = NOW(),
           sent_count = $1, failed_count = $2
       WHERE id = $3`,
      [sent, failed, id]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'send_campaign',
      targetType: 'campaign',
      targetId: id,
      details: { sent, failed, total: eligibleRecipients.length },
    });

    res.json({
      message: 'Campaign sent successfully',
      total_recipients: eligibleRecipients.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error('Error sending campaign:', err);
    // Update campaign status to failed
    await pool.query(
      `UPDATE src_email_campaigns SET status = 'failed' WHERE id = $1`,
      [req.params.id]
    );
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/campaigns/:id/test - Send test email
 */
const sendTestEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({ message: 'test_email is required' });
    }

    const campaign = await pool.query(
      'SELECT * FROM src_email_campaigns WHERE id = $1',
      [id]
    );

    if (!campaign.rows.length) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const c = campaign.rows[0];

    const emailSent = await sendMail(
      test_email,
      `[TEST] ${c.subject}`,
      c.body_html
    );

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send test email' });
    }

    res.json({ message: 'Test email sent successfully', test_email });
  } catch (err) {
    console.error('Error sending test email:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/campaigns/:id/analytics - Get campaign analytics
 */
const getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await pool.query(
      `SELECT 
        c.*,
        COUNT(DISTINCT s.id) as total_sent,
        COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END) as delivered,
        COUNT(DISTINCT CASE WHEN s.opened_at IS NOT NULL THEN s.id END) as opened,
        COUNT(DISTINCT CASE WHEN s.clicked_at IS NOT NULL THEN s.id END) as clicked,
        COUNT(DISTINCT CASE WHEN s.status = 'bounced' THEN s.id END) as bounced
       FROM src_email_campaigns c
       LEFT JOIN src_email_sent s ON s.campaign_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    if (!campaign.rows.length) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const data = campaign.rows[0];

    // Calculate rates
    const deliveryRate =
      data.total_sent > 0
        ? ((data.delivered / data.total_sent) * 100).toFixed(2)
        : 0;
    const openRate =
      data.delivered > 0 ? ((data.opened / data.delivered) * 100).toFixed(2) : 0;
    const clickRate =
      data.delivered > 0 ? ((data.clicked / data.delivered) * 100).toFixed(2) : 0;
    const bounceRate =
      data.total_sent > 0 ? ((data.bounced / data.total_sent) * 100).toFixed(2) : 0;

    res.json({
      campaign_id: id,
      name: data.name,
      status: data.status,
      total_recipients: data.total_recipients,
      sent_count: parseInt(data.total_sent),
      delivered_count: parseInt(data.delivered),
      opened_count: parseInt(data.opened),
      clicked_count: parseInt(data.clicked),
      bounced_count: parseInt(data.bounced),
      delivery_rate: parseFloat(deliveryRate),
      open_rate: parseFloat(openRate),
      click_rate: parseFloat(clickRate),
      bounce_rate: parseFloat(bounceRate),
      created_at: data.created_at,
      started_at: data.started_at,
      completed_at: data.completed_at,
    });
  } catch (err) {
    console.error('Error fetching campaign analytics:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  scheduleCampaign,
  approveCampaign,
  sendCampaign,
  sendTestEmail,
  getCampaignAnalytics,
};

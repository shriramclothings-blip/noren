'use strict';

/**
 * NOREN EMAIL PORTAL - Main Controller
 * Handles templates, drafts, sent emails, and inbox functionality
 */

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const { logAudit } = require('../utils/auditLogger');

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/templates - List all templates
 */
const getTemplates = async (req, res) => {
  try {
    const { category, active, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (category) {
      conditions.push(`category = $${idx++}`);
      values.push(category);
    }

    if (active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(active === 'true');
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
        t.id, t.name, t.slug, t.category, t.subject, t.preview_text,
        t.variables, t.thumbnail_url, t.is_system, t.is_active,
        t.created_at, t.updated_at,
        u.name as created_by_name
       FROM src_email_templates t
       LEFT JOIN src_users u ON u.id = t.created_by
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_templates t ${whereClause}`,
      values.slice(0, -2)
    );

    res.json({
      templates: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/templates/:id - Get template detail
 */
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        t.*,
        u1.name as created_by_name,
        u2.name as updated_by_name
       FROM src_email_templates t
       LEFT JOIN src_users u1 ON u1.id = t.created_by
       LEFT JOIN src_users u2 ON u2.id = t.updated_by
       WHERE t.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/templates - Create new template
 */
const createTemplate = async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      subject,
      body_html,
      body_plain,
      preview_text,
      variables,
      thumbnail_url,
      is_active = true,
    } = req.body;

    if (!name || !slug || !category || !subject || !body_html) {
      return res.status(400).json({
        message: 'name, slug, category, subject, and body_html are required',
      });
    }

    // Check if slug already exists
    const existing = await pool.query(
      'SELECT id FROM src_email_templates WHERE slug = $1',
      [slug]
    );

    if (existing.rows.length) {
      return res.status(400).json({ message: 'Template slug already exists' });
    }

    const result = await pool.query(
      `INSERT INTO src_email_templates (
        name, slug, category, subject, body_html, body_plain, preview_text,
        variables, thumbnail_url, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name,
        slug,
        category,
        subject,
        body_html,
        body_plain || null,
        preview_text || null,
        JSON.stringify(variables || []),
        thumbnail_url || null,
        is_active,
        req.user.id,
      ]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'create_email_template',
      targetType: 'template',
      targetId: result.rows[0].id,
      details: { name, category },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/email/templates/:id - Update template
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      subject,
      body_html,
      body_plain,
      preview_text,
      variables,
      thumbnail_url,
      is_active,
    } = req.body;

    // Check if template exists and is not system template
    const existing = await pool.query(
      'SELECT id, is_system FROM src_email_templates WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(category);
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
    if (preview_text !== undefined) {
      updates.push(`preview_text = $${idx++}`);
      values.push(preview_text);
    }
    if (variables !== undefined) {
      updates.push(`variables = $${idx++}`);
      values.push(JSON.stringify(variables));
    }
    if (thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = $${idx++}`);
      values.push(thumbnail_url);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_by = $${idx++}`);
    values.push(req.user.id);
    values.push(id);

    const result = await pool.query(
      `UPDATE src_email_templates
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'update_email_template',
      targetType: 'template',
      targetId: id,
      details: req.body,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/email/templates/:id - Delete template
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template exists and is not system template
    const existing = await pool.query(
      'SELECT id, is_system, name FROM src_email_templates WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (existing.rows[0].is_system) {
      return res.status(403).json({
        message: 'System templates cannot be deleted, only deactivated',
      });
    }

    await pool.query('DELETE FROM src_email_templates WHERE id = $1', [id]);

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'delete_email_template',
      targetType: 'template',
      targetId: id,
      details: { name: existing.rows[0].name },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/templates/:id/duplicate - Duplicate template
 */
const duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await pool.query(
      'SELECT * FROM src_email_templates WHERE id = $1',
      [id]
    );

    if (!template.rows.length) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const original = template.rows[0];
    const newName = `${original.name} (Copy)`;
    const newSlug = `${original.slug}-copy-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO src_email_templates (
        name, slug, category, subject, body_html, body_plain, preview_text,
        variables, thumbnail_url, is_system, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        newName,
        newSlug,
        original.category,
        original.subject,
        original.body_html,
        original.body_plain,
        original.preview_text,
        original.variables,
        original.thumbnail_url,
        false, // Copies are never system templates
        true,
        req.user.id,
      ]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'duplicate_email_template',
      targetType: 'template',
      targetId: result.rows[0].id,
      details: { original_id: id, original_name: original.name },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error duplicating template:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL DRAFTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/drafts - List user's drafts
 */
const getDrafts = async (req, res) => {
  try {
    const { draft_type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1'];
    const values = [req.user.id];
    let idx = 2;

    if (draft_type) {
      conditions.push(`draft_type = $${idx++}`);
      values.push(draft_type);
    }

    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        d.*,
        t.name as template_name
       FROM src_email_drafts d
       LEFT JOIN src_email_templates t ON t.id = d.template_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_drafts WHERE ${conditions.join(' AND ')}`,
      values.slice(0, -2)
    );

    res.json({
      drafts: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching drafts:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/draft - Save or update draft
 */
const saveDraft = async (req, res) => {
  try {
    const {
      id,
      draft_type = 'individual',
      subject,
      body_html,
      body_plain,
      recipients,
      cc,
      bcc,
      sender_identity,
      reply_to,
      template_id,
      attachments,
      scheduled_at,
      campaign_id,
      metadata,
    } = req.body;

    if (id) {
      // Update existing draft
      const result = await pool.query(
        `UPDATE src_email_drafts
         SET draft_type = $1, subject = $2, body_html = $3, body_plain = $4,
             recipients = $5, cc = $6, bcc = $7, sender_identity = $8,
             reply_to = $9, template_id = $10, attachments = $11,
             scheduled_at = $12, campaign_id = $13, metadata = $14
         WHERE id = $15 AND user_id = $16
         RETURNING *`,
        [
          draft_type,
          subject,
          body_html,
          body_plain,
          JSON.stringify(recipients || []),
          JSON.stringify(cc || []),
          JSON.stringify(bcc || []),
          sender_identity,
          reply_to,
          template_id || null,
          JSON.stringify(attachments || []),
          scheduled_at || null,
          campaign_id || null,
          JSON.stringify(metadata || {}),
          id,
          req.user.id,
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({ message: 'Draft not found' });
      }

      return res.json(result.rows[0]);
    } else {
      // Create new draft
      const result = await pool.query(
        `INSERT INTO src_email_drafts (
          user_id, draft_type, subject, body_html, body_plain,
          recipients, cc, bcc, sender_identity, reply_to,
          template_id, attachments, scheduled_at, campaign_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          req.user.id,
          draft_type,
          subject,
          body_html,
          body_plain,
          JSON.stringify(recipients || []),
          JSON.stringify(cc || []),
          JSON.stringify(bcc || []),
          sender_identity,
          reply_to,
          template_id || null,
          JSON.stringify(attachments || []),
          scheduled_at || null,
          campaign_id || null,
          JSON.stringify(metadata || {}),
        ]
      );

      return res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error saving draft:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/email/draft/:id - Delete draft
 */
const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM src_email_drafts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    res.json({ message: 'Draft deleted successfully' });
  } catch (err) {
    console.error('Error deleting draft:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEND EMAIL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/email/send - Send individual email
 */
const sendEmail = async (req, res) => {
  try {
    const {
      recipients,
      cc,
      bcc,
      subject,
      body_html,
      body_plain,
      sender_email,
      sender_name,
      reply_to,
      template_id,
      parent_email_id,
      metadata,
    } = req.body;

    if (!recipients || !recipients.length || !subject || !body_html) {
      return res.status(400).json({
        message: 'recipients, subject, and body_html are required',
      });
    }

    // Generate thread_id for new conversations
    const thread_id = parent_email_id
      ? (
          await pool.query('SELECT thread_id FROM src_email_sent WHERE id = $1', [
            parent_email_id,
          ])
        ).rows[0]?.thread_id
      : `thread_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const sentEmails = [];
    const failedRecipients = [];

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Check suppression list
        const suppressed = await pool.query(
          'SELECT id FROM src_email_suppression WHERE email = $1',
          [recipient.email]
        );

        if (suppressed.rows.length) {
          failedRecipients.push({
            email: recipient.email,
            reason: 'suppressed',
          });
          continue;
        }

        // Send email via Resend
        const emailSent = await sendMail(
          recipient.email,
          subject,
          body_html
        );

        if (!emailSent) {
          failedRecipients.push({
            email: recipient.email,
            reason: 'send_failed',
          });
          continue;
        }

        // Record in database
        const result = await pool.query(
          `INSERT INTO src_email_sent (
            user_id, sender_email, sender_name, recipient_email, recipient_name,
            recipient_type, cc, bcc, subject, body_html, body_plain,
            template_id, parent_email_id, thread_id, email_type,
            status, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *`,
          [
            req.user.id,
            sender_email || process.env.EMAIL_FROM,
            sender_name || 'NOREN',
            recipient.email,
            recipient.name || null,
            recipient.type || 'other',
            cc || null,
            bcc || null,
            subject,
            body_html,
            body_plain || null,
            template_id || null,
            parent_email_id || null,
            thread_id,
            parent_email_id ? 'reply' : 'individual',
            'sent',
            JSON.stringify(metadata || {}),
          ]
        );

        sentEmails.push(result.rows[0]);
      } catch (err) {
        console.error(`Error sending to ${recipient.email}:`, err);
        failedRecipients.push({
          email: recipient.email,
          reason: err.message,
        });
      }
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'send_email',
      targetType: 'email',
      targetId: sentEmails[0]?.id,
      details: {
        recipients: recipients.length,
        sent: sentEmails.length,
        failed: failedRecipients.length,
      },
    });

    res.json({
      message: `Email sent to ${sentEmails.length} recipient(s)`,
      sent: sentEmails.length,
      failed: failedRecipients.length,
      failed_recipients: failedRecipients,
      emails: sentEmails,
    });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INBOX & SENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/sent - List sent emails
 */
const getSentEmails = async (req, res) => {
  try {
    const { email_type, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1'];
    const values = [req.user.id];
    let idx = 2;

    if (email_type) {
      conditions.push(`email_type = $${idx++}`);
      values.push(email_type);
    }

    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(
        `(recipient_email ILIKE $${idx} OR subject ILIKE $${idx} OR recipient_name ILIKE $${idx})`
      );
      values.push(`%${search}%`);
      idx++;
    }

    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        id, sender_email, sender_name, recipient_email, recipient_name,
        recipient_type, subject, email_type, status, thread_id,
        opened_at, clicked_at, sent_at
       FROM src_email_sent
       WHERE ${conditions.join(' AND ')}
       ORDER BY sent_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_sent WHERE ${conditions.join(' AND ')}`,
      values.slice(0, -2)
    );

    res.json({
      emails: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching sent emails:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/:id - Get email detail
 */
const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        e.*,
        t.name as template_name,
        u.name as sender_name_user
       FROM src_email_sent e
       LEFT JOIN src_email_templates t ON t.id = e.template_id
       LEFT JOIN src_users u ON u.id = e.user_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Email not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching email:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/threads/:thread_id - Get email thread
 */
const getEmailThread = async (req, res) => {
  try {
    const { thread_id } = req.params;

    const result = await pool.query(
      `SELECT 
        id, sender_email, sender_name, recipient_email, recipient_name,
        subject, body_html, email_type, status, sent_at
       FROM src_email_sent
       WHERE thread_id = $1
       ORDER BY sent_at ASC`,
      [thread_id]
    );

    res.json({ thread_id, emails: result.rows });
  } catch (err) {
    console.error('Error fetching thread:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  // Templates
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  // Drafts
  getDrafts,
  saveDraft,
  deleteDraft,
  // Send
  sendEmail,
  // Inbox/Sent
  getSentEmails,
  getEmailById,
  getEmailThread,
};

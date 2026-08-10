'use strict';

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const { offerEmail, productEmail } = require('../services/emailTemplates');

// ── helpers ──────────────────────────────────────────────────────────────────

// ── ensure table exists ───────────────────────────────────────────────────────
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS src_email_campaigns (
      id          SERIAL PRIMARY KEY,
      subject     TEXT NOT NULL,
      body_html   TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'custom',
      target      TEXT NOT NULL DEFAULT 'all',
      user_id     INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
      custom_emails TEXT,
      sent_count  INTEGER DEFAULT 0,
      status      TEXT NOT NULL DEFAULT 'sent',
      created_by  INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE src_email_campaigns ADD COLUMN IF NOT EXISTS custom_emails TEXT;
  `);
};

// ── GET /api/erp/email/users/search ──────────────────────────────────────────
const searchUsers = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, avatar_url, role
       FROM src_users
       WHERE is_banned = FALSE
         AND (LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1) OR phone LIKE $1)
       ORDER BY name
       LIMIT 20`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/erp/email/send ──────────────────────────────────────────────────
const sendCampaign = async (req, res) => {
  await ensureTable();
  const { subject, message, type = 'custom', target = 'all', user_id, ctaText, ctaUrl, custom_html, custom_emails } = req.body;

  if (!subject?.trim()) return res.status(400).json({ message: 'Subject is required' });
  if (!message?.trim() && !custom_html?.trim()) return res.status(400).json({ message: 'Message is required' });

  const bodyMessage = message?.trim() || '';

  try {
    let recipients = [];

    if (target === 'custom_emails') {
      // ── New: send to any email addresses (marketing to non-users) ──
      if (!custom_emails?.trim()) return res.status(400).json({ message: 'Provide at least one email address' });
      const emailList = custom_emails
        .split(/[\n,;]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (!emailList.length) return res.status(400).json({ message: 'No valid email addresses found' });
      // Deduplicate
      recipients = [...new Set(emailList)].map(email => ({ id: null, name: null, email }));
    } else if (target === 'specific') {
      if (!user_id) return res.status(400).json({ message: 'user_id required for specific target' });
      const r = await pool.query('SELECT id, name, email FROM src_users WHERE id=$1 AND is_banned=FALSE', [user_id]);
      if (!r.rows.length) return res.status(404).json({ message: 'User not found' });
      recipients = r.rows;
    } else if (target === 'subscribers') {
      const r = await pool.query(
        `SELECT NULL as id, name, email FROM src_newsletter_subscribers WHERE is_active=TRUE AND email IS NOT NULL AND email != '' ORDER BY subscribed_at`
      ).catch(() => pool.query(`SELECT id, name, email FROM src_users WHERE is_banned=FALSE AND email IS NOT NULL AND email != '' ORDER BY id`));
      recipients = r.rows;
    } else {
      const r = await pool.query(
        `SELECT id, name, email FROM src_users WHERE is_banned=FALSE AND email IS NOT NULL AND email != '' ORDER BY id`
      );
      recipients = r.rows;
    }

    // Use custom HTML if provided, else build from template
    const buildHtml = (name) => custom_html?.trim()
      ? custom_html
      : offerEmail(name || null, subject, bodyMessage, ctaText || 'Shop Now', ctaUrl || process.env.FRONTEND_URL?.split(',')[0], type);

    // Send in batches of 10
    let successCount = 0;
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(u => sendMail(u.email, subject, buildHtml(u.name)))
      );
      successCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    }

    // Log campaign
    await pool.query(
      `INSERT INTO src_email_campaigns (subject, body_html, type, target, user_id, custom_emails, sent_count, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'sent',$8)`,
      [subject, buildHtml(null), type, target, user_id || null,
       target === 'custom_emails' ? recipients.map(r => r.email).join(', ') : null,
       successCount, req.user.id]
    );

    res.json({ message: `Email sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}`, sent_count: successCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/erp/email/logs ───────────────────────────────────────────────────
const getLogs = async (req, res) => {
  await ensureTable();
  try {
    const result = await pool.query(
      `SELECT c.id, c.subject, c.type, c.target, c.sent_count, c.status, c.created_at,
              u.name AS created_by_name, u.email AS created_by_email,
              t.name AS target_user_name, t.email AS target_user_email
       FROM src_email_campaigns c
       LEFT JOIN src_users u ON u.id = c.created_by
       LEFT JOIN src_users t ON t.id = c.user_id
       ORDER BY c.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── DELETE /api/erp/email/logs/:id ───────────────────────────────────────────
const deleteLog = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_email_campaigns WHERE id=$1', [req.params.id]);
    res.json({ message: 'Log deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/erp/email/send-product ─────────────────────────────────────────
// Email a product (with image + details) to all customers or a specific one
const sendProductEmail = async (req, res) => {
  const { product_id, user_id, target = 'all', message } = req.body;
  if (!product_id) return res.status(400).json({ message: 'product_id is required' });

  try {
    // Fetch full product details
    const prodRes = await pool.query(
      `SELECT p.*, c.name as category_name,
         (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as primary_image
       FROM src_products p
       LEFT JOIN src_categories c ON c.id=p.category_id
       WHERE p.id=$1 AND p.deleted_at IS NULL`,
      [product_id]
    );
    if (!prodRes.rows.length) return res.status(404).json({ message: 'Product not found' });
    const product = prodRes.rows[0];

    let recipients = [];
    if (target === 'specific') {
      if (!user_id) return res.status(400).json({ message: 'user_id required for specific target' });
      const r = await pool.query('SELECT id, name, email FROM src_users WHERE id=$1 AND is_banned=FALSE', [user_id]);
      if (!r.rows.length) return res.status(404).json({ message: 'User not found' });
      recipients = r.rows;
    } else {
      const r = await pool.query(
        `SELECT id, name, email FROM src_users WHERE is_banned=FALSE AND email IS NOT NULL AND email != '' ORDER BY id`
      );
      recipients = r.rows;
    }

    let successCount = 0;
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(u => sendMail(
          u.email,
          `${product.title} – Shop Now at NOREN`,
          productEmail(u.name || 'Valued Customer', product, message || null)
        ))
      );
      successCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    }

    res.json({ message: `Product email sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}`, sent_count: successCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { searchUsers, sendCampaign, sendProductEmail, getLogs, deleteLog };

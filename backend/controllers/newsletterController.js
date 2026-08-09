'use strict';

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const { subscribeConfirm, offerEmail } = require('../services/emailTemplates');

// Ensure the subscribers table exists and has all required columns
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS src_newsletter_subscribers (
      id              SERIAL PRIMARY KEY,
      email           TEXT NOT NULL UNIQUE,
      name            TEXT,
      is_active       BOOLEAN DEFAULT TRUE,
      subscribed_at   TIMESTAMPTZ DEFAULT NOW(),
      unsubscribed_at TIMESTAMPTZ
    )
  `);
  // Migrate: add columns that may not exist on older table versions
  await pool.query(`ALTER TABLE src_newsletter_subscribers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'homepage'`);
  await pool.query(`ALTER TABLE src_newsletter_subscribers ADD COLUMN IF NOT EXISTS name TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE src_newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`).catch(() => {});
};

// POST /api/newsletter/subscribe
const subscribe = async (req, res) => {
  await ensureTable();
  const { email, name, source = 'homepage' } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ message: 'Valid email required' });

  try {
    const existing = await pool.query('SELECT id, is_active FROM src_newsletter_subscribers WHERE email=$1', [email.toLowerCase().trim()]);

    if (existing.rows.length) {
      if (existing.rows[0].is_active) {
        return res.json({ message: 'You are already subscribed!', already: true });
      }
      // Re-subscribe
      await pool.query('UPDATE src_newsletter_subscribers SET is_active=TRUE, unsubscribed_at=NULL, subscribed_at=NOW() WHERE email=$1', [email.toLowerCase().trim()]);
    } else {
      await pool.query(
        'INSERT INTO src_newsletter_subscribers (email, name, source) VALUES ($1,$2,$3)',
        [email.toLowerCase().trim(), name || null, source]
      );
    }

    // Send confirmation email (non-blocking)
    sendMail(
      email.toLowerCase().trim(),
      'You\'re subscribed to NOREN – Welcome to the Inner Circle',
      subscribeConfirm(email.toLowerCase().trim())
    ).catch(() => {});

    res.json({ message: 'Successfully subscribed!', subscribed: true });
  } catch (err) {
    if (err.code === '23505') return res.json({ message: 'You are already subscribed!', already: true });
    res.status(500).json({ message: err.message });
  }
};

// POST /api/newsletter/unsubscribe
const unsubscribe = async (req, res) => {
  await ensureTable();
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  try {
    await pool.query(
      'UPDATE src_newsletter_subscribers SET is_active=FALSE, unsubscribed_at=NOW() WHERE email=$1',
      [email.toLowerCase().trim()]
    );
    res.json({ message: 'You have been unsubscribed.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/newsletter/subscribers  (admin)
const listSubscribers = async (req, res) => {
  await ensureTable();
  const { page = 1, limit = 50, active } = req.query;
  const offset = (page - 1) * limit;
  const conds = [];
  const vals = [];
  let idx = 1;
  if (active !== undefined) { conds.push(`is_active=$${idx}`); vals.push(active === 'true'); idx++; }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  vals.push(limit, offset);
  try {
    const result = await pool.query(
      `SELECT id, email, name, source, is_active, subscribed_at, unsubscribed_at FROM src_newsletter_subscribers ${where} ORDER BY subscribed_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      vals
    );
    const count = await pool.query(`SELECT COUNT(*) FROM src_newsletter_subscribers ${where}`, vals.slice(0, -2));
    res.json({ subscribers: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/newsletter/broadcast  (admin — send to all subscribers)
const broadcast = async (req, res) => {
  await ensureTable();
  const { subject, message, type = 'update', ctaText, ctaUrl } = req.body;
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message required' });

  try {
    const subs = await pool.query('SELECT email, name FROM src_newsletter_subscribers WHERE is_active=TRUE');
    if (!subs.rows.length) return res.json({ message: 'No active subscribers', sent: 0 });

    let sent = 0;
    for (let i = 0; i < subs.rows.length; i += 10) {
      const batch = subs.rows.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(s => sendMail(
          s.email,
          subject,
          offerEmail(s.name || null, subject, message, ctaText || 'Shop Now', ctaUrl || process.env.FRONTEND_URL, type)
        ))
      );
      sent += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    }

    res.json({ message: `Broadcast sent to ${sent} subscriber${sent !== 1 ? 's' : ''}`, sent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { subscribe, unsubscribe, listSubscribers, broadcast };

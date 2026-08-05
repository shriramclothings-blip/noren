const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');

// ── helpers ──────────────────────────────────────────────────────────────────
const NOREN_HEADER = `
  <div style="background:#1a1a18;padding:28px 40px;text-align:center">
    <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
    <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
  </div>`;

const NOREN_FOOTER = `
  <div style="padding:18px 40px;text-align:center;border-top:1px solid #e6e0d8;margin-top:8px">
    <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em;margin:0">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
    <p style="color:#d1cdc8;font-size:10px;margin:6px 0 0">You are receiving this email because you have an account at www.norenfashion.shop</p>
  </div>`;

const buildHtml = (subject, badgeLabel, badgeColor, bodyHtml) => `
  <div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:auto;background:#faf9f7;padding:0">
    ${NOREN_HEADER}
    <div style="padding:36px 40px 28px;border:1px solid #e6e0d8;border-top:none">
      <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${badgeColor};margin:0 0 12px">${badgeLabel}</p>
      ${bodyHtml}
    </div>
    ${NOREN_FOOTER}
  </div>`;

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
      sent_count  INTEGER DEFAULT 0,
      status      TEXT NOT NULL DEFAULT 'sent',
      created_by  INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
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
  const { subject, message, type = 'custom', target = 'all', user_id, custom_html } = req.body;

  if (!subject?.trim()) return res.status(400).json({ message: 'Subject is required' });
  if (!message?.trim() && !custom_html?.trim()) return res.status(400).json({ message: 'Message or custom HTML is required' });

  // Badge style per type
  const badges = {
    new_launch:  { label: 'New Launch',   color: '#c9a96e' },
    deal:        { label: 'Special Deal', color: '#16a34a' },
    offer:       { label: 'Exclusive Offer', color: '#dc2626' },
    update:      { label: 'Update',       color: '#2563eb' },
    custom:      { label: 'From NOREN',   color: '#5a5750' },
  };
  const badge = badges[type] || badges.custom;

  // Build body
  const bodyHtml = custom_html?.trim()
    ? custom_html
    : `<h2 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a18;margin:0 0 16px">${subject}</h2>
       <div style="color:#5a5750;line-height:1.9;font-size:14px;white-space:pre-wrap">${message}</div>
       <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e6e0d8">
         <a href="${process.env.FRONTEND_URL || 'https://www.norenfashion.shop'}" 
            style="display:inline-block;background:#1a1a18;color:#faf9f7;padding:13px 32px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase">
           Visit NOREN
         </a>
       </div>`;

  const html = buildHtml(subject, badge.label, badge.color, bodyHtml);

  try {
    let recipients = [];

    if (target === 'specific') {
      if (!user_id) return res.status(400).json({ message: 'user_id required for specific target' });
      const r = await pool.query('SELECT id, name, email FROM src_users WHERE id=$1 AND is_banned=FALSE', [user_id]);
      if (!r.rows.length) return res.status(404).json({ message: 'User not found' });
      recipients = r.rows;
    } else {
      // all active users with email
      const r = await pool.query(
        `SELECT id, name, email FROM src_users WHERE is_banned=FALSE AND email IS NOT NULL AND email != '' ORDER BY id`
      );
      recipients = r.rows;
    }

    // Send in batches of 10 (non-blocking per user, but sequential batches)
    let successCount = 0;
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);
      await Promise.allSettled(
        batch.map(async (u) => {
          // Personalise greeting if possible
          const personalBody = custom_html?.trim()
            ? custom_html
            : `<p style="font-size:13px;color:#9e9a94;margin:0 0 16px">Hi ${u.name || 'there'},</p>
               <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a18;margin:0 0 16px">${subject}</h2>
               <div style="color:#5a5750;line-height:1.9;font-size:14px;white-space:pre-wrap">${message}</div>
               <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e6e0d8">
                 <a href="${process.env.FRONTEND_URL || 'https://www.norenfashion.shop'}"
                    style="display:inline-block;background:#1a1a18;color:#faf9f7;padding:13px 32px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase">
                   Visit NOREN
                 </a>
               </div>`;
          const personalHtml = buildHtml(subject, badge.label, badge.color, personalBody);
          await sendMail(u.email, subject, personalHtml);
          successCount++;
        })
      );
    }

    // Log campaign
    await pool.query(
      `INSERT INTO src_email_campaigns (subject, body_html, type, target, user_id, sent_count, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'sent',$7)`,
      [subject, html, type, target, user_id || null, successCount, req.user.id]
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

module.exports = { searchUsers, sendCampaign, getLogs, deleteLog };

'use strict';
/**
 * NOREN Support Portal Controller
 * Handles all support-specific endpoints.
 * Uses the existing pool, logAudit, sendMail infrastructure — no second backend.
 */

const { pool, logAudit } = require('../config/db');
const { sendMail } = require('../services/mailService');

// ── Helpers ────────────────────────────────────────────────────────────────
function genTicketNumber() {
  return 'NO-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function getIP(req) {
  const ip = req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '').slice(0, 60);
}

// ── DB initialisation — creates support tables if they don't exist ─────────
async function initSupportTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_tickets (
        id               SERIAL PRIMARY KEY,
        ticket_number    VARCHAR(20) UNIQUE NOT NULL,
        user_id          INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        name             VARCHAR(150) NOT NULL,
        email            VARCHAR(150) NOT NULL,
        phone            VARCHAR(20),
        subject          VARCHAR(300) NOT NULL,
        description      TEXT NOT NULL,
        category         VARCHAR(50) DEFAULT 'other',
        subcategory      VARCHAR(100),
        priority         VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent','critical')),
        status           VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new','open','in_progress','waiting_customer','waiting_internal','escalated','resolved','closed','reopened')),
        assigned_to      INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        team_id          INTEGER,
        tags             TEXT[],
        source           VARCHAR(30) DEFAULT 'portal',
        order_ref        VARCHAR(50),
        seller_id        INTEGER,
        influencer_id    INTEGER,
        sla_due_at       TIMESTAMP,
        sla_breached     BOOLEAN DEFAULT FALSE,
        first_response_at TIMESTAMP,
        resolved_at      TIMESTAMP,
        closed_at        TIMESTAMP,
        escalated_at     TIMESTAMP,
        escalated_by     INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        escalation_reason TEXT,
        created_by       INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        deleted_at       TIMESTAMP,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_spt_status ON src_support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_spt_priority ON src_support_tickets(priority);
      CREATE INDEX IF NOT EXISTS idx_spt_assigned ON src_support_tickets(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_spt_user ON src_support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_spt_created ON src_support_tickets(created_at DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_replies (
        id           SERIAL PRIMARY KEY,
        ticket_id    INTEGER NOT NULL REFERENCES src_support_tickets(id) ON DELETE CASCADE,
        author_id    INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        author_name  VARCHAR(150),
        is_customer  BOOLEAN DEFAULT FALSE,
        type         VARCHAR(20) DEFAULT 'reply' CHECK (type IN ('reply','internal_note','system')),
        body         TEXT NOT NULL,
        attachment_url TEXT,
        email_sent   BOOLEAN DEFAULT FALSE,
        created_at   TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_spr_ticket ON src_support_replies(ticket_id, created_at ASC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_sla_rules (
        id                   SERIAL PRIMARY KEY,
        priority             VARCHAR(20) NOT NULL,
        first_response_hours DECIMAL(6,2) NOT NULL,
        resolution_hours     DECIMAL(6,2) NOT NULL,
        is_active            BOOLEAN DEFAULT TRUE,
        created_at           TIMESTAMP DEFAULT NOW(),
        updated_at           TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO src_support_sla_rules (priority, first_response_hours, resolution_hours) VALUES
        ('critical', 0.25, 2), ('urgent', 0.5, 4), ('high', 2, 8), ('normal', 8, 24), ('low', 24, 72)
      ON CONFLICT DO NOTHING;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_teams (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        description TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_incidents (
        id            SERIAL PRIMARY KEY,
        title         VARCHAR(300) NOT NULL,
        description   TEXT,
        service       VARCHAR(80),
        severity      VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
        status        VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','investigating','monitoring','resolved')),
        started_at    TIMESTAMP DEFAULT NOW(),
        resolved_at   TIMESTAMP,
        created_by    INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sinc_status ON src_support_incidents(status, created_at DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_kb_articles (
        id           SERIAL PRIMARY KEY,
        title        VARCHAR(300) NOT NULL,
        content      TEXT NOT NULL,
        category     VARCHAR(80) DEFAULT 'general',
        tags         TEXT[],
        is_published BOOLEAN DEFAULT TRUE,
        author_id    INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_skb_category ON src_support_kb_articles(category);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_quick_replies (
        id         SERIAL PRIMARY KEY,
        title      VARCHAR(150) NOT NULL,
        body       TEXT NOT NULL,
        category   VARCHAR(80),
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_support_email_templates (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(150) NOT NULL,
        subject     VARCHAR(300) NOT NULL,
        body        TEXT NOT NULL,
        variables   TEXT[],
        category    VARCHAR(80),
        created_by  INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Support tables initialised');
  } catch (err) {
    console.error('Support table init error:', err.message);
  }
}

// Call on module load
initSupportTables();

// ── SLA deadline calculator ────────────────────────────────────────────────
async function calcSLADue(priority) {
  try {
    const rule = await pool.query(
      `SELECT resolution_hours FROM src_support_sla_rules WHERE priority=$1 AND is_active=TRUE`,
      [priority]
    );
    if (rule.rows.length) {
      const hours = parseFloat(rule.rows[0].resolution_hours);
      const due = new Date(Date.now() + hours * 3600 * 1000);
      return due;
    }
  } catch {}
  return null;
}

// ── TICKETS ────────────────────────────────────────────────────────────────
const getTickets = async (req, res) => {
  const {
    page = 1, limit = 25, search, status, priority, category,
    assigned_to_me, unassigned, sla_risk,
  } = req.query;
  const offset = (page - 1) * limit;
  const conds = ['t.deleted_at IS NULL'];
  const vals = [];
  let i = 1;

  if (search) {
    conds.push(`(t.subject ILIKE $${i} OR t.email ILIKE $${i} OR t.name ILIKE $${i} OR t.ticket_number ILIKE $${i} OR t.order_ref ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  if (status)   { conds.push(`t.status=$${i++}`);   vals.push(status); }
  if (priority) { conds.push(`t.priority=$${i++}`); vals.push(priority); }
  if (category) { conds.push(`t.category=$${i++}`); vals.push(category); }
  if (assigned_to_me === '1') { conds.push(`t.assigned_to=$${i++}`); vals.push(req.user.id); }
  if (unassigned === '1')     { conds.push(`t.assigned_to IS NULL AND t.status NOT IN ('resolved','closed')`); }
  if (sla_risk === '1')       { conds.push(`t.sla_due_at IS NOT NULL AND t.sla_due_at < NOW() + INTERVAL '2 hours' AND t.status NOT IN ('resolved','closed')`); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM src_support_tickets t ${where}`, vals);
    const total = parseInt(countRes.rows[0].count);
    vals.push(limit, offset);
    const rows = await pool.query(
      `SELECT t.*, u.name AS assigned_name
       FROM src_support_tickets t
       LEFT JOIN src_users u ON u.id = t.assigned_to
       ${where}
       ORDER BY
         CASE t.priority WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 WHEN 'high' THEN 3 ELSE 4 END,
         t.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      vals
    );
    res.json({ tickets: rows.rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTicketStats = async (req, res) => {
  try {
    const [statsRes, recentRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS open,
          COUNT(*) FILTER (WHERE assigned_to IS NULL AND status NOT IN ('resolved','closed')) AS unassigned,
          COUNT(*) FILTER (WHERE assigned_to=$1 AND status NOT IN ('resolved','closed')) AS my,
          COUNT(*) FILTER (WHERE priority='critical' AND status NOT IN ('resolved','closed')) AS critical,
          COUNT(*) FILTER (WHERE sla_due_at IS NOT NULL AND sla_due_at < NOW() + INTERVAL '2 hours' AND status NOT IN ('resolved','closed')) AS sla_risk,
          COUNT(*) FILTER (WHERE status='waiting_customer') AS waiting_customer,
          COUNT(*) FILTER (WHERE status='escalated') AS escalated,
          COUNT(*) FILTER (WHERE status='resolved' AND resolved_at::date = CURRENT_DATE) AS resolved_today,
          COUNT(*) FILTER (WHERE category='seller') AS seller_tickets,
          COUNT(*) FILTER (WHERE category='influencer') AS influencer_tickets,
          ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/3600) FILTER (WHERE first_response_at IS NOT NULL), 1) AS avg_response,
          ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at > created_at + INTERVAL '1 minute'), 1) AS avg_resolution
        FROM src_support_tickets
        WHERE deleted_at IS NULL
      `, [req.user.id]),
      pool.query(`
        SELECT t.*, u.name AS assigned_name
        FROM src_support_tickets t
        LEFT JOIN src_users u ON u.id = t.assigned_to
        WHERE t.deleted_at IS NULL
        ORDER BY t.created_at DESC
        LIMIT 10
      `),
    ]);
    res.json({ stats: statsRes.rows[0], recent: recentRes.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTicket = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.name AS assigned_name, u.email AS assigned_email, a.name AS created_by_name
       FROM src_support_tickets t
       LEFT JOIN src_users u ON u.id = t.assigned_to
       LEFT JOIN src_users a ON a.id = t.created_by
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ ticket: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createTicket = async (req, res) => {
  const { name, email, phone, subject, description, category = 'other', priority = 'normal', order_ref, seller_id, influencer_id, source = 'portal', tags } = req.body;
  if (!name || !email || !subject || !description) return res.status(400).json({ message: 'Required fields missing' });

  try {
    const ticket_number = genTicketNumber();
    const sla_due_at = await calcSLADue(priority);

    // Try to link to existing user by email
    const userRes = await pool.query('SELECT id FROM src_users WHERE email=$1 LIMIT 1', [email]);
    const user_id = userRes.rows[0]?.id || null;

    const result = await pool.query(
      `INSERT INTO src_support_tickets
         (ticket_number, user_id, name, email, phone, subject, description, category, priority, order_ref, seller_id, influencer_id, source, tags, sla_due_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [ticket_number, user_id, name, email, phone || null, subject, description, category, priority, order_ref || null, seller_id || null, influencer_id || null, source, tags || null, sla_due_at, req.user.id]
    );
    const ticket = result.rows[0];

    // Auto-reply email to customer
    sendMail(email, `Support Ticket Created – ${ticket_number}`,
      `<div style="font-family:sans-serif;max-width:540px;margin:auto">
        <div style="background:#1a1a18;padding:24px 32px;text-align:center">
          <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.3em;color:#c9a96e;text-transform:uppercase">NOREN</div>
        </div>
        <div style="padding:32px;border:1px solid #e5e1da;border-top:none">
          <p style="font-size:14px;color:#1a1a18">Hi ${name},</p>
          <p style="font-size:14px;color:#5a5750;line-height:1.7">We've received your support request and will respond shortly.</p>
          <div style="background:#f8f7f5;padding:16px 20px;margin:20px 0;border-left:3px solid #c9a96e">
            <p style="margin:0;font-size:12px;color:#5a5750;text-transform:uppercase;letter-spacing:0.1em">Ticket Reference</p>
            <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#1a1a18;font-family:monospace">${ticket_number}</p>
          </div>
          <p style="font-size:13px;color:#5a5750"><strong>Subject:</strong> ${subject}</p>
          <p style="font-size:12px;color:#9a9590;margin-top:24px">Please save your ticket number for reference. We typically respond within a few hours.</p>
        </div>
      </div>`
    ).catch(() => {});

    await logAudit(pool, { adminId: req.user.id, action: 'ticket.created', targetType: 'support_ticket', targetId: ticket.id, details: `Created ticket ${ticket_number} for ${email}` });
    res.status(201).json({ ticket });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateTicket = async (req, res) => {
  const { id } = req.params;
  const allowed = ['status', 'priority', 'category', 'subject', 'assigned_to', 'team_id', 'tags', 'order_ref'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ message: 'No valid fields' });

  try {
    // Fetch current for audit
    const cur = await pool.query('SELECT * FROM src_support_tickets WHERE id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Not found' });

    const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
    const vals = fields.map(f => req.body[f]);
    vals.push(id);
    const result = await pool.query(
      `UPDATE src_support_tickets SET ${sets}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,
      vals
    );
    await logAudit(pool, { adminId: req.user.id, action: 'ticket.updated', targetType: 'support_ticket', targetId: id, details: JSON.stringify(req.body) });
    res.json({ ticket: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteTicket = async (req, res) => {
  try {
    await pool.query('UPDATE src_support_tickets SET deleted_at=NOW() WHERE id=$1', [req.params.id]);
    await logAudit(pool, { adminId: req.user.id, action: 'ticket.deleted', targetType: 'support_ticket', targetId: req.params.id });
    res.json({ message: 'Ticket deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── REPLIES ────────────────────────────────────────────────────────────────
const getReplies = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name AS author_name
       FROM src_support_replies r
       LEFT JOIN src_users u ON u.id = r.author_id
       WHERE r.ticket_id=$1
       ORDER BY r.created_at ASC`,
      [req.params.id]
    );
    res.json({ replies: result.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addReply = async (req, res) => {
  const { body, send_email = true, attachment_url } = req.body;
  if (!body?.trim()) return res.status(400).json({ message: 'Body is required' });

  try {
    const ticketRes = await pool.query('SELECT * FROM src_support_tickets WHERE id=$1', [req.params.id]);
    if (!ticketRes.rows.length) return res.status(404).json({ message: 'Ticket not found' });
    const ticket = ticketRes.rows[0];

    const result = await pool.query(
      `INSERT INTO src_support_replies (ticket_id, author_id, author_name, type, body, attachment_url, email_sent)
       VALUES ($1,$2,$3,'reply',$4,$5,$6) RETURNING *`,
      [req.params.id, req.user.id, req.user.name, body, attachment_url || null, send_email]
    );

    // Mark first response time
    if (!ticket.first_response_at) {
      await pool.query('UPDATE src_support_tickets SET first_response_at=NOW(), status=\'in_progress\', updated_at=NOW() WHERE id=$1', [req.params.id]);
    } else {
      await pool.query('UPDATE src_support_tickets SET updated_at=NOW() WHERE id=$1', [req.params.id]);
    }

    // Send email to customer
    if (send_email) {
      sendMail(ticket.email, `Re: [${ticket.ticket_number}] ${ticket.subject}`,
        `<div style="font-family:sans-serif;max-width:540px;margin:auto">
          <div style="background:#1a1a18;padding:20px 32px;text-align:center">
            <div style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.3em;color:#c9a96e;text-transform:uppercase">NOREN Support</div>
          </div>
          <div style="padding:28px 32px;border:1px solid #e5e1da;border-top:none">
            <p style="font-size:14px;color:#1a1a18">Hi ${ticket.name},</p>
            <p style="font-size:14px;color:#1a1a18;margin-bottom:4px">Our support team has replied to your ticket <strong>${ticket.ticket_number}</strong>:</p>
            <div style="background:#f8f7f5;padding:16px 20px;border-left:3px solid #c9a96e;margin:16px 0;white-space:pre-wrap;font-size:14px;color:#1a1a18">${body}</div>
            <p style="font-size:12px;color:#9a9590">If you have further questions, please reply to this email or contact us at support@norenfashion.shop</p>
          </div>
        </div>`
      ).catch(() => {});
    }

    await logAudit(pool, { adminId: req.user.id, action: 'ticket.reply', targetType: 'support_ticket', targetId: req.params.id });
    res.status(201).json({ reply: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addInternalNote = async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ message: 'Body is required' });
  try {
    const result = await pool.query(
      `INSERT INTO src_support_replies (ticket_id, author_id, author_name, type, body)
       VALUES ($1,$2,$3,'internal_note',$4) RETURNING *`,
      [req.params.id, req.user.id, req.user.name, body]
    );
    await pool.query('UPDATE src_support_tickets SET updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.status(201).json({ note: result.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── TICKET ACTIONS ─────────────────────────────────────────────────────────
const assignTicket = async (req, res) => {
  const { agent_id } = req.body;
  try {
    await pool.query(
      `UPDATE src_support_tickets SET assigned_to=$1, updated_at=NOW(), status=CASE WHEN status='new' THEN 'open' ELSE status END WHERE id=$2`,
      [agent_id || null, req.params.id]
    );
    await logAudit(pool, { adminId: req.user.id, action: 'ticket.assigned', targetType: 'support_ticket', targetId: req.params.id, details: `Assigned to user ${agent_id}` });
    res.json({ message: 'Assigned' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const escalateTicket = async (req, res) => {
  const { reason } = req.body;
  try {
    await pool.query(
      `UPDATE src_support_tickets SET status='escalated', escalated_at=NOW(), escalated_by=$1, escalation_reason=$2, updated_at=NOW() WHERE id=$3`,
      [req.user.id, reason || null, req.params.id]
    );
    await logAudit(pool, { adminId: req.user.id, action: 'ticket.escalated', targetType: 'support_ticket', targetId: req.params.id, details: reason });
    res.json({ message: 'Escalated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const resolveTicket = async (req, res) => {
  try {
    const ticketRes = await pool.query('SELECT * FROM src_support_tickets WHERE id=$1', [req.params.id]);
    if (!ticketRes.rows.length) return res.status(404).json({ message: 'Not found' });
    const ticket = ticketRes.rows[0];
    await pool.query(
      `UPDATE src_support_tickets SET status='resolved', resolved_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    // Notify customer
    sendMail(ticket.email, `Your ticket ${ticket.ticket_number} has been resolved`,
      `<div style="font-family:sans-serif;max-width:540px;margin:auto;padding:32px">
        <h2 style="color:#1a1a18">Ticket Resolved ✓</h2>
        <p>Hi ${ticket.name}, your support ticket <strong>${ticket.ticket_number}</strong> – "${ticket.subject}" has been resolved.</p>
        <p style="color:#5a5750">If you feel this issue needs further attention, please reply and we'll reopen it.</p>
      </div>`
    ).catch(() => {});
    await logAudit(pool, { adminId: req.user.id, action: 'ticket.resolved', targetType: 'support_ticket', targetId: req.params.id });
    res.json({ message: 'Resolved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reopenTicket = async (req, res) => {
  try {
    await pool.query(`UPDATE src_support_tickets SET status='reopened', resolved_at=NULL, updated_at=NOW() WHERE id=$1`, [req.params.id]);
    await logAudit(pool, { adminId: req.user.id, action: 'ticket.reopened', targetType: 'support_ticket', targetId: req.params.id });
    res.json({ message: 'Reopened' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const closeTicket = async (req, res) => {
  try {
    await pool.query(`UPDATE src_support_tickets SET status='closed', closed_at=NOW(), updated_at=NOW() WHERE id=$1`, [req.params.id]);
    await logAudit(pool, { adminId: req.user.id, action: 'ticket.closed', targetType: 'support_ticket', targetId: req.params.id });
    res.json({ message: 'Closed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── TEAMS ──────────────────────────────────────────────────────────────────
const getTeams = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM src_support_teams ORDER BY name');
    res.json({ teams: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createTeam = async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  try {
    const r = await pool.query('INSERT INTO src_support_teams (name, description) VALUES ($1,$2) RETURNING *', [name, description || null]);
    res.status(201).json({ team: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateTeam = async (req, res) => {
  const { name, description } = req.body;
  try {
    const r = await pool.query('UPDATE src_support_teams SET name=COALESCE($1,name), description=COALESCE($2,description) WHERE id=$3 RETURNING *', [name, description, req.params.id]);
    res.json({ team: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteTeam = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_support_teams WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── AGENTS ────────────────────────────────────────────────────────────────
const getAgents = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at,
              COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS open_tickets
       FROM src_users u
       LEFT JOIN src_support_tickets t ON t.assigned_to = u.id
       WHERE u.role IN ('admin','super_admin','business_owner','store_admin')
         AND u.is_banned = FALSE
       GROUP BY u.id
       ORDER BY u.name`
    );
    res.json({ agents: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── SLA RULES ─────────────────────────────────────────────────────────────
const getSLARules = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM src_support_sla_rules ORDER BY CASE priority WHEN \'critical\' THEN 1 WHEN \'urgent\' THEN 2 WHEN \'high\' THEN 3 WHEN \'normal\' THEN 4 ELSE 5 END');
    res.json({ rules: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createSLARule = async (req, res) => {
  const { priority, first_response_hours, resolution_hours } = req.body;
  try {
    const r = await pool.query('INSERT INTO src_support_sla_rules (priority, first_response_hours, resolution_hours) VALUES ($1,$2,$3) RETURNING *', [priority, first_response_hours, resolution_hours]);
    res.status(201).json({ rule: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateSLARule = async (req, res) => {
  const { first_response_hours, resolution_hours, is_active } = req.body;
  try {
    const r = await pool.query(
      `UPDATE src_support_sla_rules SET first_response_hours=COALESCE($1,first_response_hours), resolution_hours=COALESCE($2,resolution_hours), is_active=COALESCE($3,is_active), updated_at=NOW() WHERE id=$4 RETURNING *`,
      [first_response_hours, resolution_hours, is_active, req.params.id]
    );
    res.json({ rule: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteSLARule = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_support_sla_rules WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── INCIDENTS ─────────────────────────────────────────────────────────────
const getIncidents = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT i.*, u.name AS created_by_name FROM src_support_incidents i LEFT JOIN src_users u ON u.id = i.created_by ORDER BY i.created_at DESC LIMIT 100`
    );
    res.json({ incidents: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getIncident = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM src_support_incidents WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json({ incident: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createIncident = async (req, res) => {
  const { title, description, service, severity = 'medium' } = req.body;
  if (!title) return res.status(400).json({ message: 'Title required' });
  try {
    const r = await pool.query(
      `INSERT INTO src_support_incidents (title, description, service, severity, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description || null, service || null, severity, req.user.id]
    );
    await logAudit(pool, { adminId: req.user.id, action: 'incident.created', targetType: 'incident', targetId: r.rows[0].id, details: `${severity} incident: ${title}` });
    res.status(201).json({ incident: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateIncident = async (req, res) => {
  const allowed = ['title', 'description', 'status', 'severity', 'service'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
  try {
    const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
    const vals = [...fields.map(f => req.body[f])];
    // Auto-set resolved_at
    if (req.body.status === 'resolved') { vals.push(null); /* handled below */ }
    vals.push(req.params.id);
    const resolvedSet = req.body.status === 'resolved' ? ', resolved_at=NOW()' : '';
    const r = await pool.query(`UPDATE src_support_incidents SET ${sets}${resolvedSet}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    res.json({ incident: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── CUSTOMERS ─────────────────────────────────────────────────────────────
const getCustomers = async (req, res) => {
  const { page = 1, limit = 25, search } = req.query;
  const offset = (page - 1) * limit;
  const conds = ["role = 'user'", 'deleted_at IS NULL'];
  const vals = [];
  let i = 1;
  if (search) {
    conds.push(`(name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i} OR user_code ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = 'WHERE ' + conds.join(' AND ');
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM src_users ${where}`, vals);
    const total = parseInt(countRes.rows[0].count);
    vals.push(limit, offset);
    const r = await pool.query(`SELECT id, name, email, phone, role, avatar_url, user_code, is_banned, auth_provider, created_at, updated_at FROM src_users ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`, vals);
    res.json({ customers: r.rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCustomer = async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, name, email, phone, role, avatar_url, user_code, is_banned, auth_provider, google_id, business_id, created_at FROM src_users WHERE id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    await logAudit(pool, { adminId: req.user.id, action: 'customer.viewed', targetType: 'user', targetId: req.params.id });
    res.json({ customer: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCustomerOrders = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.*, array_agg(json_build_object('title',oi.title,'size',oi.size,'quantity',oi.quantity,'price',oi.price,'image_url',oi.image_url)) AS items
       FROM src_orders o
       LEFT JOIN src_order_items oi ON oi.order_id = o.id
       WHERE o.user_id=$1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );
    res.json({ orders: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCustomerTickets = async (req, res) => {
  try {
    const userRes = await pool.query('SELECT email FROM src_users WHERE id=$1', [req.params.id]);
    if (!userRes.rows.length) return res.json({ tickets: [] });
    const email = userRes.rows[0].email;
    const r = await pool.query(
      `SELECT * FROM src_support_tickets WHERE (user_id=$1 OR email=$2) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`,
      [req.params.id, email]
    );
    res.json({ tickets: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCustomerActivity = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT action, target_type, target_id, details, created_at FROM src_activity_logs WHERE admin_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ activity: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCustomerSessions = async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  try {
    const r = await pool.query(
      `SELECT id, user_id, ${isSuperAdmin ? 'ip_address,' : ''} device_type, device_model, browser, browser_version, os, city, region, country, auth_method, is_suspicious, is_active, logged_in_at
       FROM src_login_sessions WHERE user_id=$1 ORDER BY logged_in_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ sessions: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── ORDERS ────────────────────────────────────────────────────────────────
const getOrders = async (req, res) => {
  const { page = 1, limit = 25, search, has_tickets } = req.query;
  const offset = (page - 1) * limit;
  const conds = [];
  const vals = [];
  let i = 1;
  if (search) {
    conds.push(`(o.order_id ILIKE $${i} OR o.full_name ILIKE $${i} OR o.email ILIKE $${i} OR o.mobile ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  if (has_tickets === '1') {
    conds.push(`EXISTS(SELECT 1 FROM src_support_tickets t WHERE t.order_ref=o.order_id AND t.deleted_at IS NULL)`);
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM src_orders o ${where}`, vals);
    const total = parseInt(countRes.rows[0].count);
    vals.push(limit, offset);
    const r = await pool.query(`SELECT o.id, o.order_id, o.full_name, o.email, o.mobile, o.status, o.payment_status, o.payment_method, o.total, o.created_at FROM src_orders o ${where} ORDER BY o.created_at DESC LIMIT $${i} OFFSET $${i+1}`, vals);
    res.json({ orders: r.rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getOrder = async (req, res) => {
  try {
    const [oRes, iRes] = await Promise.all([
      pool.query('SELECT * FROM src_orders WHERE order_id=$1 OR id=$1::integer', [req.params.id]),
      pool.query('SELECT * FROM src_order_items WHERE order_id=(SELECT id FROM src_orders WHERE order_id=$1 OR id=$1::integer LIMIT 1)', [req.params.id]),
    ]);
    if (!oRes.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = { ...oRes.rows[0], items: iRes.rows };
    // Mask full payment credentials — only show partial reference
    delete order.razorpay_signature;
    delete order.paytm_signature;
    await logAudit(pool, { adminId: req.user.id, action: 'order.viewed', targetType: 'order', targetId: req.params.id });
    res.json({ order });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getOrderTickets = async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM src_support_tickets WHERE order_ref=$1 AND deleted_at IS NULL ORDER BY created_at DESC`, [req.params.id]);
    res.json({ tickets: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── SELLERS ───────────────────────────────────────────────────────────────
const getSellers = async (req, res) => {
  const { page = 1, limit = 25, search } = req.query;
  const offset = (page - 1) * limit;
  const conds = [];
  const vals = [];
  let i = 1;
  if (search) {
    conds.push(`(u.name ILIKE $${i} OR u.email ILIKE $${i} OR sp.brand_name ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id ${where}`, vals);
    const total = parseInt(countRes.rows[0].count);
    vals.push(limit, offset);
    const r = await pool.query(
      `SELECT sp.*, u.name AS user_name, u.email, u.phone FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id ${where} ORDER BY sp.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      vals
    );
    res.json({ sellers: r.rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSeller = async (req, res) => {
  try {
    const r = await pool.query(`SELECT sp.*, u.name AS user_name, u.email, u.phone FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id WHERE sp.id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    await logAudit(pool, { adminId: req.user.id, action: 'seller.viewed', targetType: 'seller', targetId: req.params.id });
    res.json({ seller: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSellerTickets = async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM src_support_tickets WHERE seller_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC`, [req.params.id]);
    res.json({ tickets: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSellerOrders = async (req, res) => {
  try {
    const r = await pool.query(`SELECT soi.*, o.order_id, o.created_at FROM src_seller_order_items soi JOIN src_orders o ON o.id=soi.order_id WHERE soi.seller_id=$1 ORDER BY o.created_at DESC LIMIT 50`, [req.params.id]);
    res.json({ orders: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSellerProducts = async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, title, status, price, created_at, submitted_at FROM src_seller_products WHERE seller_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.params.id]);
    res.json({ products: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── INFLUENCERS ───────────────────────────────────────────────────────────
const getInfluencers = async (req, res) => {
  const { page = 1, limit = 25, search } = req.query;
  const offset = (page - 1) * limit;
  const conds = [];
  const vals = [];
  let i = 1;
  if (search) {
    conds.push(`(inf.display_name ILIKE $${i} OR inf.username ILIKE $${i} OR u.email ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM src_inf_profiles inf JOIN src_users u ON u.id=inf.user_id ${where}`, vals);
    const total = parseInt(countRes.rows[0].count);
    vals.push(limit, offset);
    const r = await pool.query(`SELECT inf.*, u.name, u.email FROM src_inf_profiles inf JOIN src_users u ON u.id=inf.user_id ${where} ORDER BY inf.created_at DESC LIMIT $${i} OFFSET $${i+1}`, vals);
    res.json({ influencers: r.rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getInfluencer = async (req, res) => {
  try {
    const r = await pool.query(`SELECT inf.*, u.name, u.email FROM src_inf_profiles inf JOIN src_users u ON u.id=inf.user_id WHERE inf.id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json({ influencer: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getInfluencerTickets = async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM src_support_tickets WHERE influencer_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC`, [req.params.id]);
    res.json({ tickets: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getInfluencerCampaigns = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.* FROM src_inf_campaigns c JOIN src_inf_campaign_influencers ci ON ci.campaign_id=c.id WHERE ci.influencer_id=$1 ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    res.json({ campaigns: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getInfluencerLinks = async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM src_inf_links WHERE influencer_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC`, [req.params.id]);
    res.json({ links: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── ANALYTICS ─────────────────────────────────────────────────────────────
const getDashboardMetrics = async (req, res) => {
  try {
    const [ordRes, custRes, payRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE created_at::date=CURRENT_DATE) AS orders_today FROM src_orders`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE created_at::date=CURRENT_DATE) AS new_today FROM src_users WHERE role='user'`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE payment_status='failed' AND created_at::date=CURRENT_DATE) AS failed_today FROM src_orders`),
    ]);
    res.json({
      orders_today: parseInt(ordRes.rows[0].orders_today),
      new_customers_today: parseInt(custRes.rows[0].new_today),
      failed_payments: parseInt(payRes.rows[0].failed_today),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getVisitorSessions = async (req, res) => {
  const { page = 1, limit = 50, range = '24h' } = req.query;
  const offset = (page - 1) * limit;
  const intervalMap = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days', '30d': '30 days' };
  const interval = intervalMap[range] || '24 hours';
  const isSuperAdmin = req.user.role === 'super_admin';
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM src_login_sessions WHERE logged_in_at > NOW() - INTERVAL '${interval}'`);
    const total = parseInt(countRes.rows[0].count);
    const r = await pool.query(
      `SELECT ls.id, ls.user_id, u.name AS user_name, ${isSuperAdmin ? 'ls.ip_address,' : ''}
              ls.device_type, ls.device_model, ls.browser, ls.browser_version, ls.os,
              ls.city, ls.region, ls.country, ls.auth_method, ls.is_suspicious, ls.is_active, ls.logged_in_at
       FROM src_login_sessions ls
       LEFT JOIN src_users u ON u.id = ls.user_id
       WHERE ls.logged_in_at > NOW() - INTERVAL '${interval}'
       ORDER BY ls.logged_in_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ sessions: r.rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUTMAnalytics = async (req, res) => {
  const { range = '30d' } = req.query;
  const intervalMap = { 'today': '1 day', '7d': '7 days', '30d': '30 days', '90d': '90 days' };
  const interval = intervalMap[range] || '30 days';
  try {
    const r = await pool.query(
      `SELECT l.*, COUNT(c.id) AS click_count
       FROM src_utm_links l
       LEFT JOIN src_utm_clicks c ON c.link_id=l.id AND c.clicked_at > NOW() - INTERVAL '${interval}'
       WHERE l.is_active=TRUE
       GROUP BY l.id
       ORDER BY click_count DESC`
    );
    res.json({ links: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSupportAnalytics = async (req, res) => {
  const { range = '30d' } = req.query;
  const intervalMap = { '7d': '7 days', '30d': '30 days', '90d': '90 days' };
  const interval = intervalMap[range] || '30 days';
  try {
    const [statsRes, byStatusRes, byPriorityRes, byDayRes] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) AS total_tickets,
               COUNT(*) FILTER (WHERE status='resolved') AS resolved_count,
               COUNT(*) FILTER (WHERE sla_breached=TRUE) AS sla_breaches,
               ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at-created_at))/3600) FILTER (WHERE first_response_at IS NOT NULL),1) AS avg_response_hours
        FROM src_support_tickets
        WHERE created_at > NOW() - INTERVAL '${interval}' AND deleted_at IS NULL
      `),
      pool.query(`SELECT status, COUNT(*) AS count FROM src_support_tickets WHERE created_at > NOW() - INTERVAL '${interval}' AND deleted_at IS NULL GROUP BY status`),
      pool.query(`SELECT priority, COUNT(*) AS count FROM src_support_tickets WHERE created_at > NOW() - INTERVAL '${interval}' AND deleted_at IS NULL GROUP BY priority`),
      pool.query(`
        SELECT created_at::date AS date,
               COUNT(*) AS created,
               COUNT(*) FILTER (WHERE status='resolved') AS resolved
        FROM src_support_tickets
        WHERE created_at > NOW() - INTERVAL '${interval}' AND deleted_at IS NULL
        GROUP BY created_at::date ORDER BY date
      `),
    ]);
    res.json({
      ...statsRes.rows[0],
      by_status: byStatusRes.rows,
      by_priority: byPriorityRes.rows,
      by_day: byDayRes.rows,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAgentWorkload = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.id, u.name, u.email,
        COUNT(t.id) FILTER (WHERE t.status='open') AS open_count,
        COUNT(t.id) FILTER (WHERE t.status='in_progress') AS in_progress_count,
        COUNT(t.id) FILTER (WHERE t.status='resolved' AND t.resolved_at::date=CURRENT_DATE) AS resolved_today,
        COUNT(t.id) FILTER (WHERE t.sla_due_at IS NOT NULL AND t.sla_due_at < NOW()+INTERVAL '2 hours' AND t.status NOT IN ('resolved','closed')) AS sla_risk_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.first_response_at-t.created_at))/3600) FILTER (WHERE t.first_response_at IS NOT NULL),1) AS avg_response_hours
      FROM src_users u
      LEFT JOIN src_support_tickets t ON t.assigned_to=u.id AND t.deleted_at IS NULL
      WHERE u.role IN ('admin','super_admin','business_owner','store_admin')
      GROUP BY u.id
      ORDER BY open_count DESC
    `);
    res.json({ agents: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── KNOWLEDGE BASE ────────────────────────────────────────────────────────
const getKBArticles = async (req, res) => {
  const { search, category } = req.query;
  const conds = [];
  const vals = [];
  let i = 1;
  if (search) { conds.push(`(title ILIKE $${i} OR content ILIKE $${i})`); vals.push(`%${search}%`); i++; }
  if (category) { conds.push(`category=$${i++}`); vals.push(category); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  try {
    const r = await pool.query(`SELECT id, title, category, tags, is_published, created_at, updated_at FROM src_support_kb_articles ${where} ORDER BY updated_at DESC`, vals);
    res.json({ articles: r.rows, total: r.rows.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getKBArticle = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM src_support_kb_articles WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json({ article: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createKBArticle = async (req, res) => {
  const { title, content, category = 'general', tags } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'Title and content required' });
  try {
    const tagsArr = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags || null;
    const r = await pool.query('INSERT INTO src_support_kb_articles (title, content, category, tags, author_id) VALUES ($1,$2,$3,$4,$5) RETURNING *', [title, content, category, tagsArr, req.user.id]);
    res.status(201).json({ article: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateKBArticle = async (req, res) => {
  const { title, content, category, tags, is_published } = req.body;
  try {
    const tagsArr = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags;
    const r = await pool.query(
      `UPDATE src_support_kb_articles SET title=COALESCE($1,title), content=COALESCE($2,content), category=COALESCE($3,category), tags=COALESCE($4,tags), is_published=COALESCE($5,is_published), updated_at=NOW() WHERE id=$6 RETURNING *`,
      [title, content, category, tagsArr, is_published, req.params.id]
    );
    res.json({ article: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteKBArticle = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_support_kb_articles WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── QUICK REPLIES ─────────────────────────────────────────────────────────
const getQuickReplies = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM src_support_quick_replies ORDER BY title');
    res.json({ replies: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createQuickReply = async (req, res) => {
  const { title, body, category } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Title and body required' });
  try {
    const r = await pool.query('INSERT INTO src_support_quick_replies (title, body, category, created_by) VALUES ($1,$2,$3,$4) RETURNING *', [title, body, category || null, req.user.id]);
    res.status(201).json({ reply: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateQuickReply = async (req, res) => {
  const { title, body, category } = req.body;
  try {
    const r = await pool.query(`UPDATE src_support_quick_replies SET title=COALESCE($1,title), body=COALESCE($2,body), category=COALESCE($3,category) WHERE id=$4 RETURNING *`, [title, body, category, req.params.id]);
    res.json({ reply: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteQuickReply = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_support_quick_replies WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────
const getEmailTemplates = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM src_support_email_templates ORDER BY name');
    res.json({ templates: r.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createEmailTemplate = async (req, res) => {
  const { name, subject, body, variables, category } = req.body;
  if (!name || !subject || !body) return res.status(400).json({ message: 'Name, subject and body required' });
  try {
    const r = await pool.query('INSERT INTO src_support_email_templates (name, subject, body, variables, category, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [name, subject, body, variables || null, category || null, req.user.id]);
    res.status(201).json({ template: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateEmailTemplate = async (req, res) => {
  const { name, subject, body, variables, category } = req.body;
  try {
    const r = await pool.query(`UPDATE src_support_email_templates SET name=COALESCE($1,name), subject=COALESCE($2,subject), body=COALESCE($3,body), variables=COALESCE($4,variables), category=COALESCE($5,category), updated_at=NOW() WHERE id=$6 RETURNING *`, [name, subject, body, variables, category, req.params.id]);
    res.json({ template: r.rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteEmailTemplate = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_support_email_templates WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── AUDIT LOGS ────────────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
  const { page = 1, limit = 50, search } = req.query;
  const offset = (page - 1) * limit;
  const conds = [];
  const vals = [];
  let i = 1;
  if (search) {
    conds.push(`(al.action ILIKE $${i} OR al.details ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM src_activity_logs al ${where}`, vals);
    const total = parseInt(countRes.rows[0].count);
    vals.push(limit, offset);
    const r = await pool.query(
      `SELECT al.*, u.name AS admin_name FROM src_activity_logs al LEFT JOIN src_users u ON u.id=al.admin_id ${where} ORDER BY al.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      vals
    );
    res.json({ logs: r.rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Categories (stub) ─────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  res.json({ categories: [
    { id: 1, name: 'Order', slug: 'order' }, { id: 2, name: 'Payment', slug: 'payment' },
    { id: 3, name: 'Account', slug: 'account' }, { id: 4, name: 'Return', slug: 'return' },
    { id: 5, name: 'Technical', slug: 'technical' }, { id: 6, name: 'Seller', slug: 'seller' },
    { id: 7, name: 'Influencer', slug: 'influencer' }, { id: 8, name: 'Other', slug: 'other' },
  ] });
};

module.exports = {
  // Tickets
  getTickets, getTicketStats, getTicket, createTicket, updateTicket, deleteTicket,
  getReplies, addReply, addInternalNote,
  assignTicket, escalateTicket, resolveTicket, reopenTicket, closeTicket,
  // Teams / Agents
  getTeams, createTeam, updateTeam, deleteTeam, getAgents,
  // SLA
  getSLARules, createSLARule, updateSLARule, deleteSLARule,
  // Incidents
  getIncidents, getIncident, createIncident, updateIncident,
  // Customers
  getCustomers, getCustomer, getCustomerOrders, getCustomerTickets, getCustomerActivity, getCustomerSessions,
  // Orders
  getOrders, getOrder, getOrderTickets,
  // Sellers
  getSellers, getSeller, getSellerTickets, getSellerOrders, getSellerProducts,
  // Influencers
  getInfluencers, getInfluencer, getInfluencerTickets, getInfluencerCampaigns, getInfluencerLinks,
  // Analytics
  getDashboardMetrics, getVisitorSessions, getUTMAnalytics, getSupportAnalytics, getAgentWorkload,
  // KB / Quick replies / Templates
  getKBArticles, getKBArticle, createKBArticle, updateKBArticle, deleteKBArticle,
  getQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply,
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  // Audit
  getAuditLogs,
  // Categories
  getCategories,
};

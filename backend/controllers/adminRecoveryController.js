'use strict';
/**
 * Admin Account Recovery Controller
 * Handles: force-reset password, send OTP on behalf, generate recovery link/key,
 * manage recovery keys, and handle user-submitted recovery queries.
 */
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const {
  adminRecoveryOTP,
  adminRecoveryLink,
  adminRecoveryKey,
  adminForcedPasswordReset,
  recoveryQueryConfirm,
} = require('../services/emailTemplates');

// ── Helper: log admin action ───────────────────────────────────────────────
const logAction = (adminId, action, targetId, details = '') =>
  pool.query(
    'INSERT INTO src_activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)',
    [adminId, action, 'user', targetId, details]
  ).catch(() => {});

// ── Helper: generate 6-digit OTP ──────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Helper: generate secure hex token ────────────────────────────────────
const generateToken = () => crypto.randomBytes(32).toString('hex');

// ── Helper: ticket ID generator ──────────────────────────────────────────
const generateTicketId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RCV-${ts}-${rnd}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORCE RESET PASSWORD
//    POST /api/admin/recovery/users/:id/force-reset
//    Body: { newPassword?, sendEmail?, adminNote? }
//    If newPassword is omitted, a random temp password is generated.
// ─────────────────────────────────────────────────────────────────────────────
const forceResetPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword, sendEmail = true, adminNote = '' } = req.body;

  try {
    const userRes = await pool.query(
      'SELECT id, name, email FROM src_users WHERE id=$1',
      [id]
    );
    if (!userRes.rows.length) return res.status(404).json({ message: 'User not found' });
    const user = userRes.rows[0];

    // Use provided password or generate a random one
    const isTemp   = !newPassword;
    const plain    = newPassword || crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const hashed   = await bcrypt.hash(plain, 12);

    // Update password, also reset auth_provider to local to re-enable password login
    await pool.query(
      `UPDATE src_users SET password=$1, auth_provider=CASE WHEN auth_provider='google' THEN 'local' ELSE auth_provider END WHERE id=$2`,
      [hashed, id]
    );

    // Invalidate any outstanding reset tokens for this user
    await pool.query('DELETE FROM src_password_resets WHERE email=$1', [user.email]).catch(() => {});

    // Log
    await logAction(req.user.id, 'admin_force_reset_password', id,
      `Password force-reset by admin. Temp=${isTemp}. Note: ${adminNote || 'none'}`);

    // Send email notification
    if (sendEmail) {
      const timeStr = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
      });
      sendMail(
        user.email,
        'Your NOREN Account Password Was Reset',
        adminForcedPasswordReset(user.name, timeStr, isTemp ? plain : null)
      ).catch(() => {});
    }

    res.json({
      message: 'Password reset successfully.',
      tempPassword: isTemp ? plain : undefined,
      emailSent: sendEmail,
    });
  } catch (err) {
    console.error('[forceResetPassword]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. SEND RECOVERY OTP ON BEHALF OF USER
//    POST /api/admin/recovery/users/:id/send-otp
//    Body: { adminNote? }
// ─────────────────────────────────────────────────────────────────────────────
const sendRecoveryOTP = async (req, res) => {
  const { id } = req.params;
  const { adminNote = '' } = req.body;

  try {
    const userRes = await pool.query(
      'SELECT id, name, email FROM src_users WHERE id=$1',
      [id]
    );
    if (!userRes.rows.length) return res.status(404).json({ message: 'User not found' });
    const user = userRes.rows[0];

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min (extra time since admin-initiated)

    // Clear old resets for this email and insert fresh OTP
    await pool.query('DELETE FROM src_password_resets WHERE email=$1', [user.email]).catch(() => {});
    await pool.query(
      'INSERT INTO src_password_resets (email, token, expires_at, used) VALUES ($1,$2,$3,FALSE)',
      [user.email, otp, expires]
    );

    // Send email
    await sendMail(
      user.email,
      'NOREN Account Recovery OTP — Support Initiated',
      adminRecoveryOTP(user.name, otp, adminNote)
    );

    await logAction(req.user.id, 'admin_sent_recovery_otp', id,
      `Recovery OTP sent to ${user.email}. Note: ${adminNote || 'none'}`);

    res.json({ message: `Recovery OTP sent to ${user.email}` });
  } catch (err) {
    console.error('[sendRecoveryOTP]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERATE RECOVERY LINK (magic link via password_resets token)
//    POST /api/admin/recovery/users/:id/generate-link
//    Body: { expiryHours?, adminNote? }
// ─────────────────────────────────────────────────────────────────────────────
const generateRecoveryLink = async (req, res) => {
  const { id } = req.params;
  const { expiryHours = 24, adminNote = '', sendEmail = true } = req.body;

  try {
    const userRes = await pool.query(
      'SELECT id, name, email FROM src_users WHERE id=$1',
      [id]
    );
    if (!userRes.rows.length) return res.status(404).json({ message: 'User not found' });
    const user = userRes.rows[0];

    const token   = generateToken();
    const hours   = Math.min(Math.max(parseInt(expiryHours) || 24, 1), 72);
    const expires = new Date(Date.now() + hours * 60 * 60 * 1000);

    await pool.query('DELETE FROM src_password_resets WHERE email=$1', [user.email]).catch(() => {});
    await pool.query(
      'INSERT INTO src_password_resets (email, token, expires_at, used) VALUES ($1,$2,$3,FALSE)',
      [user.email, token, expires]
    );

    const site = process.env.FRONTEND_URL || 'https://www.norenfashion.shop';
    const recoveryUrl = `${site}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    if (sendEmail) {
      await sendMail(
        user.email,
        'NOREN Account Recovery Link — Support Initiated',
        adminRecoveryLink(user.name, recoveryUrl, `${hours} hours`, adminNote)
      ).catch(() => {});
    }

    await logAction(req.user.id, 'admin_generated_recovery_link', id,
      `Recovery link generated. Expires in ${hours}h. Email sent: ${sendEmail}. Note: ${adminNote || 'none'}`);

    res.json({
      message: 'Recovery link generated.',
      recoveryUrl,
      expiresAt: expires.toISOString(),
      emailSent: sendEmail,
    });
  } catch (err) {
    console.error('[generateRecoveryLink]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GENERATE RECOVERY KEY (long-lived single-use key stored in src_recovery_keys)
//    POST /api/admin/recovery/users/:id/generate-key
//    Body: { label?, expiryDays?, adminNote?, sendEmail? }
// ─────────────────────────────────────────────────────────────────────────────
const generateRecoveryKey = async (req, res) => {
  const { id } = req.params;
  const { label = 'Admin Generated', expiryDays = 7, adminNote = '', sendEmail = true } = req.body;

  try {
    const userRes = await pool.query(
      'SELECT id, name, email FROM src_users WHERE id=$1',
      [id]
    );
    if (!userRes.rows.length) return res.status(404).json({ message: 'User not found' });
    const user = userRes.rows[0];

    const rawKey   = generateToken(); // 64-char hex
    const prefix   = rawKey.slice(0, 8).toUpperCase(); // displayed prefix for identification
    const keyHash  = await bcrypt.hash(rawKey, 10);
    const days     = Math.min(Math.max(parseInt(expiryDays) || 7, 1), 30);
    const expires  = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO src_recovery_keys (user_id, key_hash, key_prefix, label, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, keyHash, prefix, label, expires, req.user.id]
    );

    const expiresStr = expires.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
    });

    if (sendEmail) {
      sendMail(
        user.email,
        'NOREN Account Recovery Key — Keep Confidential',
        adminRecoveryKey(user.name, rawKey, expiresStr, adminNote)
      ).catch(() => {});
    }

    await logAction(req.user.id, 'admin_generated_recovery_key', id,
      `Recovery key generated. Prefix=${prefix}. Expires in ${days}d. Email sent: ${sendEmail}. Note: ${adminNote || 'none'}`);

    res.json({
      message:    'Recovery key generated.',
      recoveryKey: rawKey,
      prefix,
      expiresAt:  expires.toISOString(),
      emailSent:  sendEmail,
    });
  } catch (err) {
    console.error('[generateRecoveryKey]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. LIST ACTIVE RECOVERY KEYS FOR A USER
//    GET /api/admin/recovery/users/:id/keys
// ─────────────────────────────────────────────────────────────────────────────
const listRecoveryKeys = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT rk.id, rk.key_prefix, rk.label, rk.expires_at, rk.used, rk.used_at,
              rk.revoked, rk.created_at,
              u.name as created_by_name
       FROM src_recovery_keys rk
       LEFT JOIN src_users u ON u.id = rk.created_by
       WHERE rk.user_id = $1
       ORDER BY rk.created_at DESC
       LIMIT 20`,
      [id]
    );
    res.json({ keys: result.rows });
  } catch (err) {
    console.error('[listRecoveryKeys]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. REVOKE A RECOVERY KEY
//    DELETE /api/admin/recovery/keys/:keyId
// ─────────────────────────────────────────────────────────────────────────────
const revokeRecoveryKey = async (req, res) => {
  const { keyId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE src_recovery_keys SET revoked=TRUE, revoked_by=$1 WHERE id=$2 RETURNING id, user_id, key_prefix`,
      [req.user.id, keyId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Key not found' });
    await logAction(req.user.id, 'admin_revoked_recovery_key', result.rows[0].user_id,
      `Revoked recovery key ID=${keyId} prefix=${result.rows[0].key_prefix}`);
    res.json({ message: 'Recovery key revoked.' });
  } catch (err) {
    console.error('[revokeRecoveryKey]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. USER SELF-SUBMIT RECOVERY QUERY (public endpoint)
//    POST /api/admin/recovery/query
//    Body: { email, name, issueType, description }
// ─────────────────────────────────────────────────────────────────────────────
const submitRecoveryQuery = async (req, res) => {
  const { email, name, issueType = 'forgot_password', description = '' } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const ticketId = generateTicketId();
    const cleanEmail = email.trim().toLowerCase();

    // Try to link to existing user
    const userRes = await pool.query('SELECT id FROM src_users WHERE email=$1', [cleanEmail]);
    const userId  = userRes.rows[0]?.id || null;

    await pool.query(
      `INSERT INTO src_admin_recovery_queries
         (ticket_id, user_email, user_name, issue_type, description, status, user_id)
       VALUES ($1,$2,$3,$4,$5,'open',$6)`,
      [ticketId, cleanEmail, name || 'Anonymous', issueType, description, userId]
    );

    // Confirmation email to user
    const issueLabels = {
      forgot_password:    'Forgot Password',
      account_compromised:'Account Compromised',
      no_otp:             'Not Receiving OTP',
      account_locked:     'Account Locked',
      other:              'Other Issue',
    };
    sendMail(
      cleanEmail,
      `NOREN Support Ticket #${ticketId} — We Received Your Request`,
      recoveryQueryConfirm(name || 'Valued Customer', ticketId, issueLabels[issueType] || issueType)
    ).catch(() => {});

    res.json({
      message:  'Your request has been received. Check your email for a confirmation.',
      ticketId,
    });
  } catch (err) {
    console.error('[submitRecoveryQuery]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. LIST RECOVERY QUERIES (admin)
//    GET /api/admin/recovery/queries?status=open&page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────
const listRecoveryQueries = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const conditions = [];
    const params     = [];

    if (status) {
      params.push(status);
      conditions.push(`q.status=$${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countRes] = await Promise.all([
      pool.query(
        `SELECT q.*, u.name as resolved_by_name
         FROM src_admin_recovery_queries q
         LEFT JOIN src_users u ON u.id = q.resolved_by
         ${where}
         ORDER BY q.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM src_admin_recovery_queries q ${where}`,
        params
      ),
    ]);

    res.json({
      queries: rows.rows,
      total:   parseInt(countRes.rows[0].count),
    });
  } catch (err) {
    console.error('[listRecoveryQueries]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. UPDATE RECOVERY QUERY STATUS / NOTES (admin)
//    PUT /api/admin/recovery/queries/:qid
//    Body: { status, adminNotes, resolutionMethod }
// ─────────────────────────────────────────────────────────────────────────────
const updateRecoveryQuery = async (req, res) => {
  const { qid } = req.params;
  const { status, adminNotes, resolutionMethod } = req.body;

  try {
    const setClauses = ['updated_at=NOW()'];
    const params     = [];

    if (status) {
      params.push(status);
      setClauses.push(`status=$${params.length}`);
    }
    if (adminNotes !== undefined) {
      params.push(adminNotes);
      setClauses.push(`admin_notes=$${params.length}`);
    }
    if (resolutionMethod) {
      params.push(resolutionMethod);
      setClauses.push(`resolution_method=$${params.length}`);
    }
    if (status === 'resolved') {
      setClauses.push(`resolved_by=$${params.length + 1}`, `resolved_at=NOW()`);
      params.push(req.user.id);
    }

    params.push(qid);
    const result = await pool.query(
      `UPDATE src_admin_recovery_queries SET ${setClauses.join(',')} WHERE id=$${params.length} RETURNING *`,
      params
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Query not found' });
    res.json({ query: result.rows[0] });
  } catch (err) {
    console.error('[updateRecoveryQuery]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. RECOVERY STATS (admin dashboard card)
//    GET /api/admin/recovery/stats
// ─────────────────────────────────────────────────────────────────────────────
const getRecoveryStats = async (req, res) => {
  try {
    const [queryStats, keyStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='open')        AS open_queries,
          COUNT(*) FILTER (WHERE status='in_progress') AS in_progress_queries,
          COUNT(*) FILTER (WHERE status='resolved')    AS resolved_queries,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS today_queries
        FROM src_admin_recovery_queries
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE NOT used AND NOT revoked AND expires_at > NOW()) AS active_keys,
          COUNT(*) FILTER (WHERE used)    AS used_keys,
          COUNT(*) FILTER (WHERE revoked) AS revoked_keys
        FROM src_recovery_keys
      `),
    ]);

    res.json({
      queries: queryStats.rows[0],
      keys:    keyStats.rows[0],
    });
  } catch (err) {
    console.error('[getRecoveryStats]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. USE RECOVERY KEY — public endpoint (user authenticates with recovery key)
//     POST /api/auth/recover-with-key
//     Body: { email, recoveryKey, newPassword }
// ─────────────────────────────────────────────────────────────────────────────
const useRecoveryKey = async (req, res) => {
  const { email, recoveryKey, newPassword } = req.body;
  if (!email || !recoveryKey || !newPassword)
    return res.status(400).json({ message: 'Email, recovery key and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Find the user
    const userRes = await pool.query(
      'SELECT id, name, email FROM src_users WHERE email=$1',
      [cleanEmail]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ message: 'No account found with that email.' });
    const user = userRes.rows[0];

    // Get all active (non-used, non-revoked, not expired) keys for this user
    const keysRes = await pool.query(
      `SELECT id, key_hash FROM src_recovery_keys
       WHERE user_id=$1 AND used=FALSE AND revoked=FALSE AND expires_at > NOW()`,
      [user.id]
    );

    if (!keysRes.rows.length)
      return res.status(400).json({ message: 'No valid recovery key found. Please contact support.' });

    // Try to match the provided key against each hash
    let matchedKeyId = null;
    for (const row of keysRes.rows) {
      const match = await bcrypt.compare(recoveryKey.trim(), row.key_hash);
      if (match) { matchedKeyId = row.id; break; }
    }

    if (!matchedKeyId)
      return res.status(400).json({ message: 'Invalid recovery key. Please check and try again.' });

    // Mark key as used
    await pool.query(
      'UPDATE src_recovery_keys SET used=TRUE, used_at=NOW() WHERE id=$1',
      [matchedKeyId]
    );

    // Update password
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE src_users SET password=$1,
        auth_provider=CASE WHEN auth_provider='google' THEN 'local' ELSE auth_provider END
       WHERE id=$2`,
      [hashed, user.id]
    );

    // Notify user
    const timeStr = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
    });
    const { passwordChanged } = require('../services/emailTemplates');
    sendMail(user.email, 'Your NOREN Password Was Changed', passwordChanged(user.name, timeStr))
      .catch(() => {});

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('[useRecoveryKey]', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  forceResetPassword,
  sendRecoveryOTP,
  generateRecoveryLink,
  generateRecoveryKey,
  listRecoveryKeys,
  revokeRecoveryKey,
  submitRecoveryQuery,
  listRecoveryQueries,
  updateRecoveryQuery,
  getRecoveryStats,
  useRecoveryKey,
};

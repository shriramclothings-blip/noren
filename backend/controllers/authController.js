const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const { recordSession } = require('../services/sessionService');
// Lazy import to avoid circular — notificationController requires db which is fine
const getNotifCtrl = () => require('./notificationController');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, business_id: user.business_id || null, store_id: user.store_id || null, warehouse_id: user.warehouse_id || null }, process.env.JWT_SECRET, { expiresIn: '7d' });

const getRolePermissions = async (role) => {
  if (!role) return [];
  const permRes = await pool.query(
    `SELECT p.name
     FROM src_permissions p
     JOIN src_role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role = $1`,
    [role]
  );
  return permRes.rows.map((row) => row.name);
};

const enrichUser = async (user) => ({
  ...user,
  permissions: await getRolePermissions(user.role),
});

const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email and password are required' });
  try {
    const exists = await pool.query('SELECT id FROM src_users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    // Generate unique 6-digit user code
    const countRes = await pool.query('SELECT MAX(id) as max_id FROM src_users');
    const nextId = (parseInt(countRes.rows[0]?.max_id || 0) + 1);
    const userCode = (100000 + nextId).toString().slice(-6);

    const result = await pool.query(
      `INSERT INTO src_users (name, email, password, phone, business_id, store_id, user_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, name, email, role, avatar_url, phone, business_id, store_id, warehouse_id, user_code`,
      [name, email, hash, phone || null, req.tenant?.business_id || null, req.tenant?.store_id || null, userCode]
    );
    const user = result.rows[0];
    // Record registration session
    await recordSession(req, user.id, 'register');

    // Welcome email
    sendMail(email, 'Welcome to NOREN – Account Created',
      `<div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:auto;background:#faf9f7;padding:0">
        <div style="background:#1a1a18;padding:32px 40px;text-align:center">
          <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
          <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
        </div>
        <div style="padding:40px 40px 32px;border:1px solid #e6e0d8;border-top:none">
          <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px">Welcome</p>
          <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 20px">Hi ${name},</h2>
          <p style="color:#5a5750;line-height:1.8;font-size:14px;margin-bottom:24px">Your NOREN account has been created successfully. You can now explore our collections and place orders.</p>
          <div style="background:#f5f0e8;padding:20px 24px;margin-bottom:28px">
            <p style="margin:0;font-size:12px;color:#5a5750;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px">Registered Email</p>
            <p style="margin:0;font-size:14px;color:#1a1a18;font-weight:500">${email}</p>
          </div>
          <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#1a1a18;color:#faf9f7;padding:14px 36px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase">Shop Now</a>
          <p style="color:#b8a898;font-size:12px;margin-top:28px;padding-top:24px;border-top:1px solid #e6e0d8">If you did not create this account, please contact us at supportnoren1@gmail.com</p>
        </div>
        <div style="padding:20px 40px;text-align:center">
          <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
        </div>
      </div>`
    ).catch(() => {});

    // Notify super_admin — new user registered
    getNotifCtrl().notifyAdminNewUser({ userId: user.id, name, email }).catch(() => {});

    res.status(201).json({ token: signToken(user), user: await enrichUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const result = await pool.query('SELECT * FROM src_users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password || '')))
      return res.status(401).json({ message: 'Invalid credentials' });
    if (user.is_banned) return res.status(403).json({ message: 'Account has been banned' });

    // Record session & capture client details
    const ip = req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress || '').replace('::ffff:', '');
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    await recordSession(req, user.id, 'local');

    // Fetch precise location for detailed email & notification
    const { fetchGeoLocation } = require('../services/sessionService');
    fetchGeoLocation(ip).then(geo => {
      const locationStr = [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'Unknown Location';
      const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

      // Detailed Security Email
      sendMail(user.email, 'Security Alert: New Login to Your NOREN Account',
        `<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:auto;background:#050505;color:#ffffff;padding:0;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.15)">
          <div style="background:#111111;padding:32px 40px;text-align:center;border-b:1px solid rgba(255,255,255,0.1)">
            <div style="font-family:Georgia,serif;font-weight:700;font-size:24px;letter-spacing:0.25em;color:#ffffff;text-transform:uppercase">NOREN <span style="font-style:italic;font-weight:400;color:#aaaaaa">Social</span></div>
            <div style="font-size:9px;letter-spacing:0.2em;color:#888888;margin-top:4px;text-transform:uppercase">Account Security Notification</div>
          </div>
          <div style="padding:32px 36px">
            <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:rgba(239,68,68,0.15);color:#f87171;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;border:1px solid rgba(239,68,68,0.3)">New Login Attempt</div>
            <h2 style="font-size:20px;font-weight:700;color:#ffffff;margin:0 0 12px">Hi ${user.name},</h2>
            <p style="color:#cccccc;line-height:1.6;font-size:13px;margin-bottom:24px">A new login was detected for your NOREN account. Here are the precise connection details:</p>

            <div style="background:#141414;border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.1);margin-bottom:24px">
              <table style="width:100%;font-size:12px;color:#dddddd;border-collapse:collapse">
                <tr><td style="color:#888888;padding:6px 0;width:35%">Precise Location</td><td style="color:#ffffff;font-weight:600;padding:6px 0">${locationStr}</td></tr>
                <tr><td style="color:#888888;padding:6px 0">IP Address</td><td style="color:#ffffff;font-weight:600;padding:6px 0">${ip || '127.0.0.1'}</td></tr>
                <tr><td style="color:#888888;padding:6px 0">User Agent / Device</td><td style="color:#ffffff;font-weight:500;padding:6px 0">${userAgent.slice(0, 100)}</td></tr>
                <tr><td style="color:#888888;padding:6px 0">Time (IST)</td><td style="color:#ffffff;font-weight:500;padding:6px 0">${loginTime} IST</td></tr>
              </table>
            </div>

            <p style="color:#888888;font-size:11px;line-height:1.5">If this login was you, no action is needed. If you did not perform this login, please reset your password immediately or contact our security team.</p>
          </div>
          <div style="padding:16px 36px;background:#0d0d0d;text-align:center;border-t:1px solid rgba(255,255,255,0.08)">
            <p style="color:#666666;font-size:10px;margin:0">© ${new Date().getFullYear()} NOREN Social. All rights reserved.</p>
          </div>
        </div>`
      ).catch(() => {});

      // Record In-App Notification
      pool.query(
        `INSERT INTO src_notifications (user_id, message, type, is_read) VALUES ($1, $2, 'security', FALSE)`,
        [user.id, `New login from ${locationStr} (IP: ${ip})`]
      ).catch(() => {});
    }).catch(() => {});

    const { password: _, ...safeUser } = user;
    res.json({ token: signToken(user), user: await enrichUser(safeUser) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url, phone, is_banned, created_at, business_id, store_id, warehouse_id, auth_provider, username, bio, website, is_verified, is_private, followers_count, following_count, posts_count FROM src_users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });
    if (result.rows[0].is_banned) return res.status(403).json({ message: 'Account banned' });
    res.json({
      ...result.rows[0],
      permissions: req.user.permissions || await getRolePermissions(result.rows[0].role),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const avatar_url = req.file?.path;
  try {
    const fields = [], values = [];
    let idx = 1;
    if (name) { fields.push(`name=$${idx++}`); values.push(name); }
    if (phone !== undefined) { fields.push(`phone=$${idx++}`); values.push(phone); }
    if (avatar_url) { fields.push(`avatar_url=$${idx++}`); values.push(avatar_url); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE src_users SET ${fields.join(',')} WHERE id=$${idx} RETURNING id, name, email, role, avatar_url, phone, business_id, store_id, warehouse_id, auth_provider`,
      values
    );
    res.json(await enrichUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });
  try {
    const result = await pool.query('SELECT password, name, email FROM src_users WHERE id=$1', [req.user.id]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password || '')))
      return res.status(401).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE src_users SET password=$1 WHERE id=$2', [hash, req.user.id]);

    // Password changed notification
    const changedTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    sendMail(user.email, 'Your NOREN Password Was Changed',
      `<div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:auto;background:#faf9f7;padding:0">
        <div style="background:#1a1a18;padding:32px 40px;text-align:center">
          <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
          <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
        </div>
        <div style="padding:40px 40px 32px;border:1px solid #e6e0d8;border-top:none">
          <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px">Security Alert</p>
          <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 20px">Hi ${user.name},</h2>
          <p style="color:#5a5750;line-height:1.8;font-size:14px;margin-bottom:24px">Your NOREN account password was successfully changed on <strong style="color:#1a1a18">${changedTime} IST</strong>.</p>
          <p style="color:#b8a898;font-size:12px;padding-top:24px;border-top:1px solid #e6e0d8">If you did not make this change, contact us immediately at supportnoren1@gmail.com</p>
        </div>
        <div style="padding:20px 40px;text-align:center">
          <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
        </div>
      </div>`
    ).catch(() => {});

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── OTP helpers ────────────────────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  try {
    const result = await pool.query('SELECT id, name FROM src_users WHERE email=$1', [email]);
    // Always return success to prevent email enumeration
    if (!result.rows.length) return res.json({ message: 'If this email exists, an OTP has been sent.' });

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing reset record for this email, then insert fresh
    await pool.query('DELETE FROM src_password_resets WHERE email=$1', [email]).catch(() => {});
    await pool.query(
      'INSERT INTO src_password_resets (email, token, expires_at, used) VALUES ($1,$2,$3,FALSE)',
      [email, otp, expires]
    );

    // Send OTP email — non-blocking, never crash the response
    const { forgotPasswordOTP } = require('../services/emailTemplates');
    sendMail(email, 'Your NOREN Password Reset OTP', forgotPasswordOTP(result.rows[0].name, otp))
      .catch(e => console.error('[OTP mail error]', e.message));

    res.json({ message: 'If this email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;
  // Support both OTP flow (new) and legacy token flow
  if ((!otp && !req.body.token) || !password) return res.status(400).json({ message: 'OTP/token and password required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  try {
    const tokenOrOtp = (otp || req.body.token).trim();
    const emailClean = email?.trim().toLowerCase();
    const query = emailClean
      ? 'SELECT * FROM src_password_resets WHERE email=$1 AND token=$2 AND used=FALSE AND expires_at > NOW()'
      : 'SELECT * FROM src_password_resets WHERE token=$1 AND used=FALSE AND expires_at > NOW()';
    const params = emailClean ? [emailClean, tokenOrOtp] : [tokenOrOtp];
    const result = await pool.query(query, params);
    if (!result.rows.length) return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    const resetEmail = result.rows[0].email;
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE src_users SET password=$1 WHERE email=$2', [hash, resetEmail]);
    await pool.query('UPDATE src_password_resets SET used=TRUE WHERE email=$1', [resetEmail]);
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    console.error('resetPassword error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('Google login error: GOOGLE_CLIENT_ID env variable is not set');
    return res.status(500).json({ message: 'Google login is not configured on the server.' });
  }

  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ message: 'Google account has no email' });

    // Emails that are always granted super_admin on Google login
    // Hardcoded fallback + env var support (comma-separated)
    const HARDCODED_SUPER_ADMINS = ['supportnoren1@gmail.com'];
    const ENV_SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const SUPER_ADMIN_EMAILS = [...new Set([...HARDCODED_SUPER_ADMINS, ...ENV_SUPER_ADMINS])];

    const isDesignatedSuperAdmin = SUPER_ADMIN_EMAILS.includes(email.toLowerCase());

    // Check if user exists by email
    let result = await pool.query('SELECT * FROM src_users WHERE email=$1', [email]);
    let user = result.rows[0];

    if (user) {
      // Build UPDATE only for fields that need changing
      const setClauses = [];
      const values    = [];

      if (!user.google_id) {
        values.push(googleId);   setClauses.push(`google_id=$${values.length}`);
        values.push('google');   setClauses.push(`auth_provider=$${values.length}`);
        values.push(picture || null); setClauses.push(`avatar_url=COALESCE(avatar_url,$${values.length})`);
      }

      if (isDesignatedSuperAdmin && !['super_admin', 'admin'].includes(user.role)) {
        values.push('super_admin');
        setClauses.push(`role=$${values.length}`);
      }

      if (setClauses.length) {
        values.push(user.id);
        await pool.query(
          `UPDATE src_users SET ${setClauses.join(', ')} WHERE id=$${values.length}`,
          values
        );
      }

      if (user.is_banned) return res.status(403).json({ message: 'Account has been banned' });
    } else {
      // New user — create account, assign super_admin role if designated
      const assignedRole = isDesignatedSuperAdmin ? 'super_admin' : 'user';
      const newUser = await pool.query(
        `INSERT INTO src_users (name, email, google_id, auth_provider, avatar_url, role, business_id, store_id)
         VALUES ($1,$2,$3,'google',$4,$5,$6,$7)
         RETURNING id, name, email, role, avatar_url, phone, is_banned, created_at`,
        [name, email, googleId, picture || null, assignedRole, req.tenant?.business_id || null, req.tenant?.store_id || null]
      );
      user = newUser.rows[0];
    }

    // Re-fetch clean user
    const fresh = await pool.query(
      'SELECT id, name, email, role, avatar_url, phone, is_banned, created_at, auth_provider, business_id, store_id, warehouse_id FROM src_users WHERE id=$1',
      [user.id]
    );
    const safeUser = fresh.rows[0];
    // Record Google session
    await recordSession(req, safeUser.id, 'google');

    // Send email — welcome if new user, login alert if existing
    const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    if (!result.rows.length) {
      // New Google user — welcome email
      sendMail(safeUser.email, 'Welcome to NOREN – Account Created',
        `<div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:auto;background:#faf9f7;padding:0">
          <div style="background:#1a1a18;padding:32px 40px;text-align:center">
            <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
            <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
          </div>
          <div style="padding:40px 40px 32px;border:1px solid #e6e0d8;border-top:none">
            <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px">Welcome</p>
            <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 20px">Hi ${safeUser.name},</h2>
            <p style="color:#5a5750;line-height:1.8;font-size:14px;margin-bottom:24px">Your NOREN account has been created using Google Sign-In. You can now explore our collections and place orders.</p>
            <div style="background:#f5f0e8;padding:20px 24px;margin-bottom:28px">
              <p style="margin:0;font-size:12px;color:#5a5750;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px">Registered Email</p>
              <p style="margin:0;font-size:14px;color:#1a1a18;font-weight:500">${safeUser.email}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#1a1a18;color:#faf9f7;padding:14px 36px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase">Shop Now</a>
            <p style="color:#b8a898;font-size:12px;margin-top:28px;padding-top:24px;border-top:1px solid #e6e0d8">If you did not create this account, contact us at supportnoren1@gmail.com</p>
          </div>
          <div style="padding:20px 40px;text-align:center">
            <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
          </div>
        </div>`
      ).catch(() => {});
    } else {
      // Existing Google user — login alert
      sendMail(safeUser.email, 'New Login to Your NOREN Account',
        `<div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:auto;background:#faf9f7;padding:0">
          <div style="background:#1a1a18;padding:32px 40px;text-align:center">
            <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
            <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
          </div>
          <div style="padding:40px 40px 32px;border:1px solid #e6e0d8;border-top:none">
            <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px">Security Alert</p>
            <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 20px">Hi ${safeUser.name},</h2>
            <p style="color:#5a5750;line-height:1.8;font-size:14px;margin-bottom:24px">A new login was detected on your NOREN account.</p>
            <div style="background:#f5f0e8;padding:20px 24px;margin-bottom:28px">
              <table style="width:100%;font-size:13px">
                <tr><td style="color:#9e9a94;padding:4px 0;width:40%">Time</td><td style="color:#1a1a18;font-weight:500">${loginTime} IST</td></tr>
                <tr><td style="color:#9e9a94;padding:4px 0">Method</td><td style="color:#1a1a18;font-weight:500">Google Sign-In</td></tr>
              </table>
            </div>
            <p style="color:#b8a898;font-size:12px;padding-top:24px;border-top:1px solid #e6e0d8">If this wasn't you, contact us immediately at supportnoren1@gmail.com</p>
          </div>
          <div style="padding:20px 40px;text-align:center">
            <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
          </div>
        </div>`
      ).catch(() => {});
    }

    res.json({ token: signToken(safeUser), user: await enrichUser(safeUser) });
  } catch (err) {
    console.error('Google login error:', err.message, err.stack);
    res.status(401).json({ message: 'Google authentication failed. Please try again.' });
  }
};

const sendOrderEmail = async (userEmail, userName, orderId, total, items) => {
  const { orderConfirm } = require('../services/emailTemplates');
  await sendMail(
    userEmail,
    `Order Confirmed – #${orderId} | NOREN`,
    orderConfirm(userName, orderId, total, items, null)
  );
};

const logout = async (req, res) => {
  try {
    await pool.query(
      `UPDATE src_login_sessions SET is_active=FALSE, logged_out_at=NOW()
       WHERE user_id=$1 AND is_active=TRUE`,
      [req.user.id]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify OTP is valid (for frontend step 2 check before showing new-password form)
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
  try {
    const result = await pool.query(
      'SELECT id FROM src_password_resets WHERE email=$1 AND token=$2 AND used=FALSE AND expires_at > NOW()',
      [email.trim().toLowerCase(), otp.trim()]
    );
    if (!result.rows.length) return res.status(400).json({ valid: false, message: 'Invalid or expired OTP' });
    res.json({ valid: true, message: 'OTP verified' });
  } catch (err) {
    console.error('verifyOTP error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword, verifyOTP, sendOrderEmail, googleLogin, logout };

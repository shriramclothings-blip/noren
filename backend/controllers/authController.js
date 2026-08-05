const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const { recordSession } = require('../services/sessionService');

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
    const result = await pool.query(
      `INSERT INTO src_users (name, email, password, phone, business_id, store_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, role, avatar_url, phone, business_id, store_id, warehouse_id`,
      [name, email, hash, phone || null, req.tenant?.business_id || null, req.tenant?.store_id || null]
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

    // Record session (non-blocking — never fails login)
    await recordSession(req, user.id, 'local');

    // Login notification email
    const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    sendMail(email, 'New Login to Your NOREN Account',
      `<div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:auto;background:#faf9f7;padding:0">
        <div style="background:#1a1a18;padding:32px 40px;text-align:center">
          <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
          <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
        </div>
        <div style="padding:40px 40px 32px;border:1px solid #e6e0d8;border-top:none">
          <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px">Security Alert</p>
          <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 20px">Hi ${user.name},</h2>
          <p style="color:#5a5750;line-height:1.8;font-size:14px;margin-bottom:24px">A new login was detected on your NOREN account.</p>
          <div style="background:#f5f0e8;padding:20px 24px;margin-bottom:28px">
            <table style="width:100%;font-size:13px">
              <tr><td style="color:#9e9a94;padding:4px 0;width:40%">Time</td><td style="color:#1a1a18;font-weight:500">${loginTime} IST</td></tr>
              <tr><td style="color:#9e9a94;padding:4px 0">Method</td><td style="color:#1a1a18;font-weight:500">Email & Password</td></tr>
            </table>
          </div>
          <p style="color:#b8a898;font-size:12px;margin-top:8px;padding-top:24px;border-top:1px solid #e6e0d8">If this wasn't you, please reset your password immediately or contact us at supportnoren1@gmail.com</p>
        </div>
        <div style="padding:20px 40px;text-align:center">
          <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
        </div>
      </div>`
    ).catch(() => {});

    const { password: _, ...safeUser } = user;
    res.json({ token: signToken(user), user: await enrichUser(safeUser) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url, phone, is_banned, created_at, business_id, store_id, warehouse_id, auth_provider FROM src_users WHERE id=$1',
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

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  try {
    const result = await pool.query('SELECT id, name FROM src_users WHERE email=$1', [email]);
    // Always return success to prevent email enumeration
    if (!result.rows.length) return res.json({ message: 'If this email exists, a reset link has been sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      'INSERT INTO src_password_resets (email, token, expires_at) VALUES ($1,$2,$3)',
      [email, token, expires]
    );
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendMail(email, 'Reset Your Password – NOREN',
      `<div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:auto;background:#faf9f7;padding:0">
        <div style="background:#1a1a18;padding:32px 40px;text-align:center">
          <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
          <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
        </div>
        <div style="padding:40px 40px 32px;border:1px solid #e6e0d8;border-top:none">
          <p style="font-size:13px;color:#5a5750;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">Password Reset</p>
          <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 20px;letter-spacing:-0.01em">Hi ${result.rows[0].name},</h2>
          <p style="color:#5a5750;line-height:1.8;margin-bottom:32px;font-size:14px">We received a request to reset the password for your NOREN account. Click the button below to create a new password. This link expires in <strong style="color:#1a1a18">1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#1a1a18;color:#faf9f7;padding:14px 36px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:32px">Reset Password</a>
          <p style="color:#b8a898;font-size:12px;margin-top:24px;padding-top:24px;border-top:1px solid #e6e0d8">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
        </div>
        <div style="padding:20px 40px;text-align:center">
          <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
        </div>
      </div>`
    );
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  try {
    const result = await pool.query(
      'SELECT * FROM src_password_resets WHERE token=$1 AND used=FALSE AND expires_at > NOW()',
      [token]
    );
    if (!result.rows.length) return res.status(400).json({ message: 'Invalid or expired reset link' });
    const { email } = result.rows[0];
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE src_users SET password=$1 WHERE email=$2', [hash, email]);
    await pool.query('UPDATE src_password_resets SET used=TRUE WHERE token=$1', [token]);
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
    const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

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
  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e6e0d8;font-size:13px;color:#2c2c29">${i.title} ${i.size ? `<span style="color:#9e9a94;font-size:11px">(${i.size})</span>` : ''}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #e6e0d8;text-align:center;color:#5a5750;font-size:13px">×${i.quantity}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #e6e0d8;text-align:right;font-size:13px;color:#1a1a18;font-weight:500">₹${(i.price * i.quantity).toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');
  await sendMail(userEmail, `Order Confirmed – #${orderId} | NOREN`,
    `<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:auto;background:#faf9f7;padding:0">
      <div style="background:#1a1a18;padding:32px 40px;text-align:center">
        <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
        <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
      </div>
      <div style="padding:40px 40px 32px;border:1px solid #e6e0d8;border-top:none">
        <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px">Order Confirmed</p>
        <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 8px">Hi ${userName},</h2>
        <p style="color:#5a5750;line-height:1.8;margin-bottom:28px;font-size:14px">Your order has been confirmed. We are preparing your pieces with care.</p>
        <p style="font-size:11px;color:#9e9a94;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">Order Reference</p>
        <p style="font-size:16px;font-weight:600;color:#1a1a18;margin-bottom:28px;font-family:Georgia,serif;letter-spacing:0.06em">#${orderId}</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#f5f0e8">
              <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#5a5750">Item</th>
              <th style="padding:12px 16px;text-align:center;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#5a5750">Qty</th>
              <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#5a5750">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="background:#f5f0e8;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:32px">
          <span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5a5750">Total Amount</span>
          <span style="font-size:20px;font-weight:600;color:#1a1a18;font-family:Georgia,serif">₹${Number(total).toLocaleString('en-IN')}</span>
        </div>
        <p style="color:#9e9a94;font-size:12px;line-height:1.8;padding-top:24px;border-top:1px solid #e6e0d8">You will receive a shipping update once your order is dispatched. Thank you for choosing NOREN.</p>
      </div>
      <div style="padding:20px 40px;text-align:center">
        <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em">© ${new Date().getFullYear()} NOREN. Timeless By Design.</p>
      </div>
    </div>`
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

module.exports = { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword, sendOrderEmail, googleLogin, logout };

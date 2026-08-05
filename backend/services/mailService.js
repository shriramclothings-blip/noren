const nodemailer = require('nodemailer');

let _transporter = null;
let _verified = false;

const getTransporter = () => {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  return _transporter;
};

/**
 * Verify transporter connection once on first use.
 * Resets cached transporter on failure so next call retries.
 */
const verifyTransporter = async () => {
  if (_verified) return true;
  try {
    await getTransporter().verify();
    _verified = true;
    console.log('[Mail] SMTP connection verified ✓');
    return true;
  } catch (err) {
    console.error('[Mail] SMTP verification failed:', err.message);
    // Reset so it retries next time
    _transporter = null;
    _verified = false;
    return false;
  }
};

/**
 * Send an HTML email.
 * Returns true on success, false on failure.
 * Silently skips if EMAIL_USER is not configured.
 */
const sendMail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_gmail@gmail.com') {
    console.log(`[Mail skipped – not configured] To: ${to} | Subject: ${subject}`);
    return false;
  }
  if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your_gmail_app_password') {
    console.log(`[Mail skipped – no password] To: ${to} | Subject: ${subject}`);
    return false;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"NOREN" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Mail sent] To: ${to} | Subject: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[Mail error] To: ${to} | Subject: ${subject} | ${err.message}`);
    // Reset transporter on auth errors so it rebuilds on next attempt
    if (err.code === 'EAUTH' || err.responseCode === 535 || err.responseCode === 534) {
      console.error('[Mail] Auth error – check EMAIL_USER and EMAIL_PASS in .env. Gmail requires an App Password.');
      _transporter = null;
      _verified = false;
    }
    return false;
  }
};

/**
 * Test the mail configuration. Call this on server startup to catch misconfigs early.
 */
const testMailConfig = async () => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_gmail@gmail.com') {
    console.warn('[Mail] EMAIL_USER not configured – email notifications disabled.');
    return;
  }
  if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your_gmail_app_password') {
    console.warn('[Mail] EMAIL_PASS not configured – email notifications disabled.');
    return;
  }
  await verifyTransporter();
};

module.exports = { sendMail, testMailConfig };

const nodemailer = require('nodemailer');

let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (16-char, no spaces)
    },
  });

  return _transporter;
};

/**
 * Send an HTML email via Gmail + Nodemailer.
 * Returns true on success, false on failure.
 * Silently skips if EMAIL_USER / EMAIL_PASS are not configured.
 */
const sendMail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Mail skipped – EMAIL_USER/EMAIL_PASS not configured] To: ${to} | Subject: ${subject}`);
    return false;
  }

  try {
    const from = process.env.EMAIL_FROM || `NOREN <${process.env.EMAIL_USER}>`;
    const transporter = getTransporter();

    const info = await transporter.sendMail({ from, to, subject, html });

    console.log(`[Mail sent] id: ${info.messageId} | To: ${to} | Subject: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[Mail error] To: ${to} | Subject: ${subject} | ${err.message}`);
    return false;
  }
};

/**
 * Test the mail configuration on server startup.
 */
const testMailConfig = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Mail] EMAIL_USER/EMAIL_PASS not configured – email notifications disabled.');
    return;
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('[Mail] Gmail transporter verified ✓');
  } catch (err) {
    console.error('[Mail] Gmail transporter verification failed:', err.message);
  }
};

module.exports = { sendMail, testMailConfig };

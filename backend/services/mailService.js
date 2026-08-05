const { Resend } = require('resend');

let _client = null;

const getClient = () => {
  if (_client) return _client;
  _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
};

/**
 * Send an HTML email via Resend (HTTPS API — works on Render free tier).
 * Returns true on success, false on failure.
 * Silently skips if RESEND_API_KEY is not configured.
 */
const sendMail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key') {
    console.log(`[Mail skipped – RESEND_API_KEY not configured] To: ${to} | Subject: ${subject}`);
    return false;
  }

  try {
    const from = process.env.EMAIL_FROM || 'NOREN <noreply@norenfashion.shop>';
    const { data, error } = await getClient().emails.send({ from, to, subject, html });

    if (error) {
      console.error(`[Mail error] To: ${to} | Subject: ${subject} | ${error.message}`);
      return false;
    }

    console.log(`[Mail sent] id: ${data?.id} | To: ${to} | Subject: ${subject}`);
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
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key') {
    console.warn('[Mail] RESEND_API_KEY not configured – email notifications disabled.');
    return;
  }
  console.log('[Mail] Resend client initialised ✓');
};

module.exports = { sendMail, testMailConfig };

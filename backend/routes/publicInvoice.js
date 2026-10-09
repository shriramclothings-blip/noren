'use strict';

/**
 * Public (no-authentication) invoice routes
 * Mounted at: /api/invoices
 *
 * GET  /api/invoices/public/:token   — customer-facing invoice via QR code
 * POST /api/invoices/verify           — verify invoice authenticity
 */

const router = require('express').Router();
const { createLimiter } = require('../middleware/rateLimiter');
const { auditLogger, logSecurityEvent } = require('../middleware/posSecurityMiddleware');
const ctrl = require('../controllers/posIntegrationController');

// Tight rate limits — 30 req/min to prevent enumeration attacks
const publicLimit = createLimiter({
  windowMs: 60_000,
  max: 30,
  message: 'Too many requests. Please wait a moment and try again.',
});

// Even tighter for verify (prevents brute-force verification attempts)
const verifyLimit = createLimiter({
  windowMs: 60_000,
  max: 15,
  message: 'Too many verification requests. Please wait.',
});

// Log access to public invoices for analytics
const logInvoiceAccess = async (req, res, next) => {
  const token = req.params.token;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    // Log in invoice_access_log table (will be created in controller after invoice fetch)
    req.invoiceAccessLog = { token, ip, userAgent };
  } catch (error) {
    console.error('[Public Invoice] Failed to prepare access log:', error);
  }

  next();
};

router.get('/public/:token', publicLimit, logInvoiceAccess, auditLogger('invoice_accessed'), ctrl.getPublicInvoice);
router.post('/verify',       verifyLimit, auditLogger('invoice_verified'), ctrl.verifyInvoice);

module.exports = router;

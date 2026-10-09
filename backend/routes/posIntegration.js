'use strict';

/**
 * VENDEXA RetailOS™ × NOREN — POS Integration Routes
 *
 * Mount points (registered in server.js):
 *   /api/erp/pos/integration   — authenticated staff/device routes
 *   /api/invoices              — public (no-auth) customer invoice routes
 */

const router = require('express').Router();
const { auth, requireRole, requireAnyPermission } = require('../middleware/auth');
const { createLimiter, authRateLimit } = require('../middleware/rateLimiter');
const {
  deviceRateLimiter,
  validateDeviceAuth,
  suspiciousActivityDetector,
  validateSyncPayload,
  requestIntegrityChecker,
  auditLogger
} = require('../middleware/posSecurityMiddleware');
const ctrl = require('../controllers/posIntegrationController');

// ─── Role guards ─────────────────────────────────────────────────────────────
const adminRoles = [
  'admin', 'super_admin', 'business_owner', 'store_admin',
  'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee',
];
const adminGuard   = [auth, requireRole(...adminRoles)];
const managerGuard = [auth, requireRole(
  'admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'accountant'
)];
const posGuard = [
  ...adminGuard,
  requireAnyPermission('erp.manage_pos', 'erp.manage_orders', 'erp.manage_finance'),
];

// ─── Rate limiters ────────────────────────────────────────────────────────────
// Public invoice endpoints get a tighter limit — 30 req/min per IP
const publicInvoiceLimit = createLimiter({
  windowMs: 60_000,
  max: 30,
  message: 'Too many invoice requests. Please wait a moment.',
});

// Device-to-server sync is high-frequency (batched invoices) — 300 req/min
const syncLimit = createLimiter({ windowMs: 60_000, max: 300 });

// ─── A. Device management ─────────────────────────────────────────────────────
// POST   /api/erp/pos/integration/devices/register
// GET    /api/erp/pos/integration/devices
// PUT    /api/erp/pos/integration/devices/:id/status
// POST   /api/erp/pos/integration/devices/authenticate  (uses api_key, not JWT)

router.post('/devices/register',
  ...posGuard,
  auditLogger('device_registered'),
  ctrl.registerDevice
);

router.get('/devices',
  ...managerGuard,
  auditLogger('devices_listed'),
  ctrl.listDevices
);

router.put('/devices/:id/status',
  ...managerGuard,
  auditLogger('device_status_changed'),
  ctrl.updateDeviceStatus
);

// Device authentication — the POS calls this with device_fingerprint + api_key.
// Not JWT-protected; uses API key verification internally.
router.post('/devices/authenticate',
  authRateLimit,
  deviceRateLimiter,
  auditLogger('device_authenticated'),
  ctrl.authenticateDevice
);

// ─── B. Invoice synchronisation ───────────────────────────────────────────────
// POST   /api/erp/pos/integration/invoices/sync
// GET    /api/erp/pos/integration/invoices            (admin list)
// GET    /api/erp/pos/integration/invoices/:saleId    (admin detail)
// POST   /api/erp/pos/integration/invoices/:saleId/revoke-token
// POST   /api/erp/pos/integration/invoices/:saleId/send-email

router.post('/invoices/sync',
  syncLimit,
  deviceRateLimiter,
  ...posGuard,
  suspiciousActivityDetector,
  validateSyncPayload,
  requestIntegrityChecker,
  auditLogger('invoice_synced'),
  ctrl.syncInvoice
);

router.get('/invoices',
  ...managerGuard,
  auditLogger('invoices_listed'),
  ctrl.listAdminInvoices
);

router.get('/invoices/:saleId',
  ...managerGuard,
  auditLogger('invoice_viewed'),
  ctrl.getAdminInvoiceDetail
);

router.post('/invoices/:saleId/revoke-token',
  ...managerGuard,
  auditLogger('token_revoked'),
  ctrl.revokeToken
);

router.post('/invoices/:saleId/send-email',
  ...posGuard,
  auditLogger('email_sent'),
  ctrl.sendReceiptEmail
);

// ─── C. Sync queue ────────────────────────────────────────────────────────────
router.get('/sync/status',  ...posGuard, ctrl.getSyncStatus);
router.post('/sync/retry',  ...managerGuard, ctrl.retrySyncItems);

// ─── D. Admin overview ────────────────────────────────────────────────────────
router.get('/overview', ...managerGuard, ctrl.getAdminOverview);

// ─── E. Health / diagnostics ─────────────────────────────────────────────────
router.get('/health', ...adminGuard, ctrl.integrationHealth);

module.exports = router;

/**
 * routes/adminSeller.js — admin-facing seller management routes
 * NOTE: specific named routes must be declared BEFORE /:id wildcard routes.
 */
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminSellerController');

const guard = [auth, requireRole('admin', 'super_admin')];

// ── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats',                      ...guard, ctrl.getSellerStats);

// ── Seller products (must be before /:id) ────────────────────────────────────
router.get('/products/all',               ...guard, ctrl.getAdminSellerProducts);
router.get('/products/:id',               ...guard, ctrl.getAdminSellerProductDetail);
router.patch('/products/:id/review',      ...guard, ctrl.reviewSellerProduct);
router.patch('/products/:id/status',      ...guard, ctrl.setSellerProductStatus);

// ── Payouts (must be before /:id) ────────────────────────────────────────────
router.get('/payouts',                    ...guard, ctrl.getAdminPayouts);
router.post('/payouts',                   ...guard, ctrl.createAdminPayout);
router.patch('/payouts/:id/status',       ...guard, ctrl.updatePayoutStatus);

// ── Audit logs (must be before /:id) ─────────────────────────────────────────
router.get('/audit-logs',                 ...guard, ctrl.getSellerAuditLogs);

// ── Seller accounts (wildcard :id last) ──────────────────────────────────────
router.get('/',                           ...guard, ctrl.getSellers);
router.get('/:id',                        ...guard, ctrl.getSellerDetail);
router.patch('/:id/status',               ...guard, ctrl.updateSellerStatus);
router.patch('/:id/kyc',                  ...guard, ctrl.reviewKYC);

module.exports = router;

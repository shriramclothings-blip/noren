const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const adminSocialCtrl = require('../controllers/adminSocialControllerEnhanced');

// All admin social routes require admin or super_admin role
router.use(auth);
router.use(requireRole('admin', 'super_admin', 'business_owner', 'store_admin'));

// ══════════════════════════════════════════════════════════════════════════
//  ANALYTICS & METRICS
// ══════════════════════════════════════════════════════════════════════════
router.get('/metrics', adminSocialCtrl.getSocialDashboardMetrics);
router.get('/analytics/trends', adminSocialCtrl.getAnalyticsTrends);

// ══════════════════════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════
router.get('/users', adminSocialCtrl.listUsers);
router.get('/users/:id', adminSocialCtrl.getUserDetails);
router.put('/users/:id/status', adminSocialCtrl.manageUserStatus);

// ══════════════════════════════════════════════════════════════════════════
//  CONTENT MODERATION
// ══════════════════════════════════════════════════════════════════════════
router.get('/content', adminSocialCtrl.listContent);
router.post('/content/action', adminSocialCtrl.manageContent);

// ══════════════════════════════════════════════════════════════════════════
//  REPORT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════
router.get('/reports', adminSocialCtrl.listReports);
router.put('/reports/:id', adminSocialCtrl.resolveReport);

// ══════════════════════════════════════════════════════════════════════════
//  FEATURE FLAGS
// ══════════════════════════════════════════════════════════════════════════
router.get('/feature-flags', adminSocialCtrl.getFeatureFlags);
router.put('/feature-flags', adminSocialCtrl.updateFeatureFlag);

// ══════════════════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ══════════════════════════════════════════════════════════════════════════
router.get('/audit-logs', adminSocialCtrl.getAuditLogs);

module.exports = router;


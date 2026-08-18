const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const adminSocialCtrl = require('../controllers/adminSocialController');

// All admin social routes require admin or super_admin role
router.use(auth);
router.use(requireRole('admin', 'super_admin', 'business_owner', 'store_admin'));

// Metrics & Analytics
router.get('/metrics', adminSocialCtrl.getSocialDashboardMetrics);

// Moderation Reports Queue
router.get('/reports', adminSocialCtrl.listReports);
router.put('/reports/:id', adminSocialCtrl.resolveReport);

// Content Actions (Hide/Remove/Restore)
router.post('/content/action', adminSocialCtrl.manageContent);

// User Moderation (Ban/Unban/Verify)
router.put('/users/:id', adminSocialCtrl.manageSocialUser);

// Feature Flags
router.get('/feature-flags', adminSocialCtrl.getFeatureFlags);
router.put('/feature-flags', adminSocialCtrl.updateFeatureFlag);

module.exports = router;

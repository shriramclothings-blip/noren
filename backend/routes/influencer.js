'use strict';

const express = require('express');
const router  = express.Router();
const { auth, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { createLimiter } = require('../middleware/rateLimiter');
const rateLimiter = createLimiter({ windowMs: 60_000, max: 120 });
const ctrl = require('../controllers/influencerController');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const infPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'noren/influencers', allowed_formats: ['jpg','jpeg','png','webp'], transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }] },
});
const upload = multer({ storage: infPhotoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── PUBLIC: tracking redirect ─────────────────────────────────────────────
// Mounted in server.js as GET /inf/r/:refCode (no /api prefix)

// ── PUBLIC: funnel event tracking ─────────────────────────────────────────
router.post('/track/event', rateLimiter, ctrl.trackEvent);

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES  —  require auth + admin/super_admin roles
// ═══════════════════════════════════════════════════════════════════════════

// Dashboard
router.get('/admin/stats', auth, requireAnyPermission('influencer.view','campaign.view'), ctrl.getAdminDashboardStats);
router.get('/admin/top-performers', auth, requirePermission('influencer.view'), ctrl.getTopPerformers);
router.get('/admin/export', auth, requirePermission('reports.export'), ctrl.exportReport);
router.get('/admin/audit-logs', auth, requirePermission('influencer.view'), ctrl.listAuditLogs);

// Influencers
router.post  ('/admin/influencers',     auth, requirePermission('influencer.create'), upload.single('profile_photo'), ctrl.createInfluencer);
router.get   ('/admin/influencers',     auth, requirePermission('influencer.view'),   ctrl.listInfluencers);
router.get   ('/admin/influencers/:id', auth, requirePermission('influencer.view'),   ctrl.getInfluencer);
router.put   ('/admin/influencers/:id', auth, requirePermission('influencer.update'), upload.single('profile_photo'), ctrl.updateInfluencer);
router.delete('/admin/influencers/:id',       auth, requirePermission('influencer.disable'),  ctrl.deleteInfluencer);
router.delete('/admin/influencers/:id/hard',  auth, requireRole('super_admin'),                ctrl.hardDeleteInfluencer);
router.get   ('/admin/influencers/:id/analytics', auth, requirePermission('influencer.view'), ctrl.getInfluencerAnalytics);
router.put   ('/admin/influencers/:id/fraud-status', auth, requireAnyPermission('influencer.disable','security.view'), ctrl.updateFraudStatus);

// Campaigns
router.post('/admin/campaigns',     auth, requirePermission('campaign.create'), ctrl.createCampaign);
router.get ('/admin/campaigns',     auth, requirePermission('campaign.view'),   ctrl.listCampaigns);
router.get ('/admin/campaigns/:id', auth, requirePermission('campaign.view'),   ctrl.getCampaign);
router.put ('/admin/campaigns/:id', auth, requirePermission('campaign.update'), ctrl.updateCampaign);

// Tracking links
router.post  ('/admin/links',              auth, requirePermission('tracking.view'), ctrl.createLink);
router.get   ('/admin/links',              auth, requirePermission('tracking.view'), ctrl.listLinks);
router.get   ('/admin/links/:id/analytics',auth, requirePermission('tracking.view'), ctrl.getLinkAnalytics);
router.patch ('/admin/links/:id/toggle',   auth, requirePermission('tracking.view'), ctrl.toggleLink);
router.delete('/admin/links/:id',          auth, requirePermission('tracking.view'), ctrl.deleteLink);

// Conversions
router.get  ('/admin/conversions',          auth, requirePermission('commission.view'),   ctrl.listConversions);
router.patch('/admin/conversions/:id',      auth, requirePermission('commission.update'), ctrl.updateConversionStatus);
router.post ('/admin/conversions/:id/reverse', auth, requirePermission('commission.update'), ctrl.reverseCommission);

// Payouts
router.post ('/admin/payouts',          auth, requirePermission('payout.approve'), ctrl.createPayout);
router.get  ('/admin/payouts',          auth, requirePermission('payout.view'),    ctrl.listPayouts);
router.patch('/admin/payouts/:id',      auth, requireAnyPermission('payout.approve','payout.mark_paid'), ctrl.updatePayoutStatus);

// Fraud
router.get  ('/admin/fraud',                auth, requirePermission('security.view'), ctrl.listFraudEvents);
router.patch('/admin/fraud/:id/review',     auth, requirePermission('security.view'), ctrl.reviewFraudEvent);

// ═══════════════════════════════════════════════════════════════════════════
//  INFLUENCER SELF-SERVICE ROUTES  —  require auth + influencer role
// ═══════════════════════════════════════════════════════════════════════════

const requireInfluencer = [auth, requireRole('influencer'), ctrl.resolveInfluencerProfile];

router.get('/me/dashboard',        ...requireInfluencer, ctrl.getMyDashboard);
router.get('/me/profile',          ...requireInfluencer, ctrl.getMyProfile);
router.patch('/me/profile',        ...requireInfluencer, ctrl.updateMyProfile);
router.get('/me/links',            ...requireInfluencer, ctrl.getMyLinks);
router.get('/me/links/:link_id/analytics', ...requireInfluencer, ctrl.getMyLinkClicks);
router.get('/me/conversions',      ...requireInfluencer, ctrl.getMyConversions);
router.get('/me/payouts',          ...requireInfluencer, ctrl.getMyPayouts);
router.get('/me/notifications',    ...requireInfluencer, ctrl.getMyNotifications);

module.exports = router;

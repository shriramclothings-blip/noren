const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');

// Import all controllers
const emailCtrl = require('../controllers/emailPortalController');
const campaignCtrl = require('../controllers/emailCampaignsPortalController');
const segmentCtrl = require('../controllers/emailSegmentsController');
const contactCtrl = require('../controllers/emailContactsController');
const suppressionCtrl = require('../controllers/emailSuppressionController');
const automationCtrl = require('../controllers/emailAutomationController');
const analyticsCtrl = require('../controllers/emailAnalyticsController');
const settingsCtrl = require('../controllers/emailSettingsController');

// Role requirements
const adminAccess = [auth, requireRole('admin', 'super_admin', 'business_owner')];
const marketingAccess = [auth, requireRole('admin', 'super_admin', 'business_owner', 'store_manager')];

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════
router.get('/templates', ...marketingAccess, emailCtrl.getTemplates);
router.get('/templates/:id', ...marketingAccess, emailCtrl.getTemplateById);
router.post('/templates', ...adminAccess, emailCtrl.createTemplate);
router.put('/templates/:id', ...adminAccess, emailCtrl.updateTemplate);
router.delete('/templates/:id', ...adminAccess, emailCtrl.deleteTemplate);
router.post('/templates/:id/duplicate', ...adminAccess, emailCtrl.duplicateTemplate);

// ═══════════════════════════════════════════════════════════════════════════
// DRAFTS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/drafts', auth, emailCtrl.getDrafts);
router.post('/draft', auth, emailCtrl.saveDraft);
router.delete('/draft/:id', auth, emailCtrl.deleteDraft);

// ═══════════════════════════════════════════════════════════════════════════
// SEND EMAIL
// ═══════════════════════════════════════════════════════════════════════════
router.post('/send', ...marketingAccess, emailCtrl.sendEmail);

// ═══════════════════════════════════════════════════════════════════════════
// INBOX & SENT
// ═══════════════════════════════════════════════════════════════════════════
router.get('/sent', auth, emailCtrl.getSentEmails);
router.get('/email/:id', auth, emailCtrl.getEmailById);
router.get('/threads/:thread_id', auth, emailCtrl.getEmailThread);

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/campaigns', ...marketingAccess, campaignCtrl.getCampaigns);
router.get('/campaigns/:id', ...marketingAccess, campaignCtrl.getCampaignById);
router.post('/campaigns', ...marketingAccess, campaignCtrl.createCampaign);
router.put('/campaigns/:id', ...marketingAccess, campaignCtrl.updateCampaign);
router.delete('/campaigns/:id', ...adminAccess, campaignCtrl.deleteCampaign);
router.post('/campaigns/:id/schedule', ...adminAccess, campaignCtrl.scheduleCampaign);
router.post('/campaigns/:id/approve', ...adminAccess, campaignCtrl.approveCampaign);
router.post('/campaigns/:id/send', ...adminAccess, campaignCtrl.sendCampaign);
router.post('/campaigns/:id/test', ...marketingAccess, campaignCtrl.sendTestEmail);
router.get('/campaigns/:id/analytics', ...marketingAccess, campaignCtrl.getCampaignAnalytics);

// ═══════════════════════════════════════════════════════════════════════════
// SEGMENTS (Audience Segmentation)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/segments', ...marketingAccess, segmentCtrl.getSegments);
router.get('/segments/:id', ...marketingAccess, segmentCtrl.getSegmentById);
router.post('/segments', ...marketingAccess, segmentCtrl.createSegment);
router.put('/segments/:id', ...marketingAccess, segmentCtrl.updateSegment);
router.delete('/segments/:id', ...adminAccess, segmentCtrl.deleteSegment);
router.post('/segments/:id/calculate', ...marketingAccess, segmentCtrl.calculateSegment);
router.get('/segments/:id/preview', ...marketingAccess, segmentCtrl.previewSegment);

// ═══════════════════════════════════════════════════════════════════════════
// CONTACTS (Unified Contact Management)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/contacts', ...marketingAccess, contactCtrl.getContacts);
router.get('/contacts/:id', ...marketingAccess, contactCtrl.getContactById);
router.get('/contacts/:id/history', ...marketingAccess, contactCtrl.getContactHistory);
router.post('/contacts/import', ...adminAccess, contactCtrl.importContacts);
router.get('/contacts/export', ...adminAccess, contactCtrl.exportContacts);

// ═══════════════════════════════════════════════════════════════════════════
// SUPPRESSION LIST (Email Blocking)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/suppression', ...marketingAccess, suppressionCtrl.getSuppressionList);
router.post('/suppression/add', ...marketingAccess, suppressionCtrl.addToSuppression);
router.delete('/suppression/:email', ...adminAccess, suppressionCtrl.removeFromSuppression);
router.post('/suppression/bulk-add', ...adminAccess, suppressionCtrl.bulkAddToSuppression);
router.post('/suppression/import', ...adminAccess, suppressionCtrl.importSuppressionList);
router.get('/suppression/export', ...adminAccess, suppressionCtrl.exportSuppressionList);
router.post('/suppression/check', ...marketingAccess, suppressionCtrl.checkSuppression);
router.get('/suppression/stats', ...marketingAccess, suppressionCtrl.getSuppressionStats);

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATION (Email Workflows)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/automations', ...marketingAccess, automationCtrl.getAutomations);
router.get('/automations/:id', ...marketingAccess, automationCtrl.getAutomationById);
router.post('/automations', ...marketingAccess, automationCtrl.createAutomation);
router.put('/automations/:id', ...marketingAccess, automationCtrl.updateAutomation);
router.delete('/automations/:id', ...adminAccess, automationCtrl.deleteAutomation);
router.post('/automations/:id/toggle', ...adminAccess, automationCtrl.toggleAutomation);
router.post('/automations/:id/test', ...marketingAccess, automationCtrl.testAutomation);
router.get('/automations/:id/logs', ...marketingAccess, automationCtrl.getAutomationLogs);
router.get('/automations/:id/stats', ...marketingAccess, automationCtrl.getAutomationStats);

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS & REPORTING
// ═══════════════════════════════════════════════════════════════════════════
router.get('/analytics/overview', ...marketingAccess, analyticsCtrl.getAnalyticsOverview);
router.get('/analytics/deliverability', ...marketingAccess, analyticsCtrl.getDeliverability);
router.get('/analytics/engagement', ...marketingAccess, analyticsCtrl.getEngagement);
router.get('/analytics/campaigns', ...marketingAccess, analyticsCtrl.getCampaignPerformance);
router.get('/analytics/audience', ...marketingAccess, analyticsCtrl.getAudienceAnalytics);
router.get('/analytics/revenue', ...adminAccess, analyticsCtrl.getRevenueAnalytics);
router.get('/analytics/templates', ...marketingAccess, analyticsCtrl.getTemplatePerformance);

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
router.get('/settings', ...adminAccess, settingsCtrl.getSettings);
router.put('/settings', ...adminAccess, settingsCtrl.updateSettings);

// Sender Identities
router.get('/sender-identities', ...marketingAccess, settingsCtrl.getSenderIdentities);
router.post('/sender-identities', ...adminAccess, settingsCtrl.addSenderIdentity);
router.put('/sender-identities/:id', ...adminAccess, settingsCtrl.updateSenderIdentity);
router.delete('/sender-identities/:id', ...adminAccess, settingsCtrl.deleteSenderIdentity);
router.post('/sender-identities/:id/verify', ...adminAccess, settingsCtrl.verifySenderIdentity);

// Audit Logs
router.get('/audit', ...adminAccess, settingsCtrl.getAuditLogs);
router.get('/audit/actions', ...adminAccess, settingsCtrl.getAuditActions);
router.get('/audit/stats', ...adminAccess, settingsCtrl.getAuditStats);
router.get('/audit/export', ...adminAccess, settingsCtrl.exportAuditLogs);

module.exports = router;

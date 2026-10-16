/**
 * WhatsApp Routes
 * All routes for WhatsApp integration
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const whatsappCampaignController = require('../controllers/whatsappCampaignController');
const { auth, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════
// Instance Management Routes
// ═══════════════════════════════════════════════════════════════

// Create new WhatsApp instance
router.post('/instances/create', auth, requireRole('admin', 'super_admin'), whatsappController.createInstance);

// List all instances
router.get('/instances', auth, requireRole('admin', 'super_admin'), whatsappController.listInstances);

// Get instance status and QR code
router.get('/instances/:instanceName/status', auth, requireRole('admin', 'super_admin'), whatsappController.getInstanceStatus);

// Disconnect instance
router.post('/instances/:instanceName/disconnect', auth, requireRole('admin', 'super_admin'), whatsappController.disconnectInstance);

// ═══════════════════════════════════════════════════════════════
// Messaging Routes
// ═══════════════════════════════════════════════════════════════

// Send manual message
router.post('/send', auth, requireRole('admin', 'super_admin'), whatsappController.sendMessage);

// Send template message
router.post('/send-template', auth, requireRole('admin', 'super_admin'), whatsappController.sendTemplateMessage);

// Get incoming messages
router.get('/incoming', auth, requireRole('admin', 'super_admin'), whatsappController.getIncomingMessages);

// Mark incoming message as read
router.put('/incoming/:id/read', auth, requireRole('admin', 'super_admin'), whatsappController.markMessageRead);

// ═══════════════════════════════════════════════════════════════
// Template Management Routes
// ═══════════════════════════════════════════════════════════════

// Get all templates
router.get('/templates', auth, requireRole('admin', 'super_admin'), whatsappController.getTemplates);

// Create or update template
router.post('/templates', auth, requireRole('admin', 'super_admin'), whatsappController.saveTemplate);

// Delete template
router.delete('/templates/:id', auth, requireRole('admin', 'super_admin'), whatsappController.deleteTemplate);

// ═══════════════════════════════════════════════════════════════
// Settings & Configuration Routes
// ═══════════════════════════════════════════════════════════════

// Get all WhatsApp settings
router.get('/settings', auth, requireRole('admin', 'super_admin'), whatsappController.getSettings);

// Update specific setting
router.put('/settings/:key', auth, requireRole('admin', 'super_admin'), whatsappController.updateSetting);

// ═══════════════════════════════════════════════════════════════
// Analytics & Logs Routes
// ═══════════════════════════════════════════════════════════════

// Get message logs
router.get('/logs', auth, requireRole('admin', 'super_admin'), whatsappController.getMessageLogs);

// Get analytics dashboard data
router.get('/analytics', auth, requireRole('admin', 'super_admin'), whatsappController.getAnalytics);

// ═══════════════════════════════════════════════════════════════
// Campaign Management Routes
// ═══════════════════════════════════════════════════════════════

// Create new campaign
router.post('/campaigns', auth, requireRole('admin', 'super_admin'), whatsappCampaignController.createCampaign);

// Get all campaigns
router.get('/campaigns', auth, requireRole('admin', 'super_admin'), whatsappCampaignController.getCampaigns);

// Get campaign by ID
router.get('/campaigns/:id', auth, requireRole('admin', 'super_admin'), whatsappCampaignController.getCampaignById);

// Launch campaign
router.post('/campaigns/:id/launch', auth, requireRole('admin', 'super_admin'), whatsappCampaignController.launchCampaign);

// Pause campaign
router.post('/campaigns/:id/pause', auth, requireRole('admin', 'super_admin'), whatsappCampaignController.pauseCampaign);

// Cancel campaign
router.post('/campaigns/:id/cancel', auth, requireRole('admin', 'super_admin'), whatsappCampaignController.cancelCampaign);

// Delete campaign
router.delete('/campaigns/:id', auth, requireRole('admin', 'super_admin'), whatsappCampaignController.deleteCampaign);

module.exports = router;

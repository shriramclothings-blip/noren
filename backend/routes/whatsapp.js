/**
 * WhatsApp Routes
 * All routes for WhatsApp integration
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const whatsappCampaignController = require('../controllers/whatsappCampaignController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════
// Instance Management Routes
// ═══════════════════════════════════════════════════════════════

// Create new WhatsApp instance
router.post('/instances/create', authenticateToken, requireAdmin, whatsappController.createInstance);

// List all instances
router.get('/instances', authenticateToken, requireAdmin, whatsappController.listInstances);

// Get instance status and QR code
router.get('/instances/:instanceName/status', authenticateToken, requireAdmin, whatsappController.getInstanceStatus);

// Disconnect instance
router.post('/instances/:instanceName/disconnect', authenticateToken, requireAdmin, whatsappController.disconnectInstance);

// ═══════════════════════════════════════════════════════════════
// Messaging Routes
// ═══════════════════════════════════════════════════════════════

// Send manual message
router.post('/send', authenticateToken, requireAdmin, whatsappController.sendMessage);

// Send template message
router.post('/send-template', authenticateToken, requireAdmin, whatsappController.sendTemplateMessage);

// Get incoming messages
router.get('/incoming', authenticateToken, requireAdmin, whatsappController.getIncomingMessages);

// Mark incoming message as read
router.put('/incoming/:id/read', authenticateToken, requireAdmin, whatsappController.markMessageRead);

// ═══════════════════════════════════════════════════════════════
// Template Management Routes
// ═══════════════════════════════════════════════════════════════

// Get all templates
router.get('/templates', authenticateToken, requireAdmin, whatsappController.getTemplates);

// Create or update template
router.post('/templates', authenticateToken, requireAdmin, whatsappController.saveTemplate);

// Delete template
router.delete('/templates/:id', authenticateToken, requireAdmin, whatsappController.deleteTemplate);

// ═══════════════════════════════════════════════════════════════
// Settings & Configuration Routes
// ═══════════════════════════════════════════════════════════════

// Get all WhatsApp settings
router.get('/settings', authenticateToken, requireAdmin, whatsappController.getSettings);

// Update specific setting
router.put('/settings/:key', authenticateToken, requireAdmin, whatsappController.updateSetting);

// ═══════════════════════════════════════════════════════════════
// Analytics & Logs Routes
// ═══════════════════════════════════════════════════════════════

// Get message logs
router.get('/logs', authenticateToken, requireAdmin, whatsappController.getMessageLogs);

// Get analytics dashboard data
router.get('/analytics', authenticateToken, requireAdmin, whatsappController.getAnalytics);

// ═══════════════════════════════════════════════════════════════
// Campaign Management Routes
// ═══════════════════════════════════════════════════════════════

// Create new campaign
router.post('/campaigns', authenticateToken, requireAdmin, whatsappCampaignController.createCampaign);

// Get all campaigns
router.get('/campaigns', authenticateToken, requireAdmin, whatsappCampaignController.getCampaigns);

// Get campaign by ID
router.get('/campaigns/:id', authenticateToken, requireAdmin, whatsappCampaignController.getCampaignById);

// Launch campaign
router.post('/campaigns/:id/launch', authenticateToken, requireAdmin, whatsappCampaignController.launchCampaign);

// Pause campaign
router.post('/campaigns/:id/pause', authenticateToken, requireAdmin, whatsappCampaignController.pauseCampaign);

// Cancel campaign
router.post('/campaigns/:id/cancel', authenticateToken, requireAdmin, whatsappCampaignController.cancelCampaign);

// Delete campaign
router.delete('/campaigns/:id', authenticateToken, requireAdmin, whatsappCampaignController.deleteCampaign);

module.exports = router;

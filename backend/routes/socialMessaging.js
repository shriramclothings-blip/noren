const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const messagingCtrl = require('../controllers/messagingController');
const notifCtrl = require('../controllers/socialNotificationController');
const settingsCtrl = require('../controllers/socialSettingsController');

// ══════════════════════════════════════════════════════════════════════════
//  MESSAGING / DIRECT MESSAGES
// ══════════════════════════════════════════════════════════════════════════

// Get or create conversation with a user
router.post('/conversations', auth, messagingCtrl.getOrCreateConversation);

// List user's conversations
router.get('/conversations', auth, messagingCtrl.listConversations);

// Get specific conversation details
router.get('/conversations/:id', auth, messagingCtrl.getConversation);

// Get messages in a conversation (paginated)
router.get('/conversations/:id/messages', auth, messagingCtrl.getMessages);

// Send a message
router.post('/messages', auth, messagingCtrl.sendMessage);

// Mark message as read
router.post('/messages/mark-read', auth, messagingCtrl.markAsRead);

// Delete message
router.delete('/messages/:id', auth, messagingCtrl.deleteMessage);

// Add reaction to message
router.post('/messages/:id/reactions', auth, messagingCtrl.addMessageReaction);

// ══════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════

// Get user notifications
router.get('/notifications', auth, notifCtrl.getNotifications);

// Get unread notification count
router.get('/notifications/unread-count', auth, notifCtrl.getUnreadCount);

// Mark notification as read
router.put('/notifications/:id/read', auth, notifCtrl.markAsRead);

// Mark all notifications as read
router.put('/notifications/read-all', auth, notifCtrl.markAllAsRead);

// Delete notification
router.delete('/notifications/:id', auth, notifCtrl.deleteNotification);

// ══════════════════════════════════════════════════════════════════════════
//  SETTINGS & PRIVACY
// ══════════════════════════════════════════════════════════════════════════

// Get privacy settings
router.get('/settings/privacy', auth, settingsCtrl.getSettings);

// Update privacy settings
router.put('/settings/privacy', auth, settingsCtrl.updatePrivacySettings);

// Get notification preferences
router.get('/settings/notifications', auth, settingsCtrl.getNotificationPreferences);

// Update notification preferences
router.put('/settings/notifications', auth, settingsCtrl.updateNotificationPreferences);

// Get account settings
router.get('/settings/account', auth, settingsCtrl.getAccountSettings);

// Update account settings
router.put('/settings/account', auth, settingsCtrl.updateAccountSettings);

// Change password
router.post('/settings/change-password', auth, settingsCtrl.changePassword);

// Get blocked users
router.get('/settings/blocked-users', auth, settingsCtrl.getBlockedUsers);

// Get restricted users
router.get('/settings/restricted-users', auth, settingsCtrl.getRestrictedUsers);

module.exports = router;

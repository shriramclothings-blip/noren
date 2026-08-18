const router = require('express').Router();
const { auth, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const comms = require('../controllers/communicationsController');

const adminRoles = ['admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee'];
const adminGuard = [auth, requireRole(...adminRoles)];

router.get('/chat/messages', ...adminGuard, comms.listChatMessages);
router.post('/chat/messages', ...adminGuard, comms.createChatMessage);

// Private Messaging & Contact Search for ALL authenticated users
router.get('/users/search', auth, comms.searchUsers);
router.post('/private-threads', auth, comms.createPrivateThread);
router.post('/private/threads', auth, comms.createPrivateThread);
router.get('/private-threads', auth, comms.listPrivateThreads);
router.get('/private/threads', auth, comms.listPrivateThreads);
router.get('/private-threads/:threadId/messages', auth, comms.listPrivateMessages);
router.get('/private/threads/:threadId/messages', auth, comms.listPrivateMessages);
router.post('/private-threads/:threadId/messages', auth, comms.sendPrivateMessage);
router.post('/private/threads/:threadId/messages', auth, comms.sendPrivateMessage);
router.get('/admin/private-threads', ...adminGuard, comms.adminListAllThreads);

router.get('/meetings', ...adminGuard, comms.listMeetings);
router.post('/meetings', ...adminGuard, comms.createMeeting);

// Phase 2: Read receipts, reactions, edit/delete, pin, star
router.post('/private-threads/:threadId/read',                     auth, comms.markMessagesRead);
router.post('/private-threads/:threadId/messages/:msgId/react',    auth, comms.addReaction);
router.delete('/private-threads/:threadId/messages/:msgId/react',  auth, comms.removeReaction);
router.put('/private-threads/:threadId/messages/:msgId',           auth, comms.editMessage);
router.delete('/private-threads/:threadId/messages/:msgId/me',     auth, comms.deleteMessageForMe);
router.delete('/private-threads/:threadId/messages/:msgId/all',    auth, comms.deleteMessageForAll);
router.post('/private-threads/:threadId/messages/:msgId/pin',      auth, comms.pinMessage);
router.get('/private-threads/:threadId/pinned',                    auth, comms.getPinnedMessages);
router.post('/messages/:msgId/star',                               auth, comms.starMessage);
router.get('/starred-messages',                                    auth, comms.getStarredMessages);
router.get('/private-threads/:threadId/media',                     auth, comms.getThreadMedia);

module.exports = router;

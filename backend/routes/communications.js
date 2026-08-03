const router = require('express').Router();
const { auth, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const comms = require('../controllers/communicationsController');

const adminRoles = ['admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee'];
const adminGuard = [auth, requireRole(...adminRoles)];

router.get('/chat/messages', ...adminGuard, comms.listChatMessages);
router.post('/chat/messages', ...adminGuard, comms.createChatMessage);

router.get('/users/search', ...adminGuard, comms.searchUsers);
router.post('/private-threads', ...adminGuard, comms.createPrivateThread);
router.get('/private-threads', ...adminGuard, comms.listPrivateThreads);
router.get('/private-threads/:threadId/messages', ...adminGuard, comms.listPrivateMessages);
router.post('/private-threads/:threadId/messages', ...adminGuard, comms.sendPrivateMessage);
router.get('/admin/private-threads', ...adminGuard, comms.adminListAllThreads);

router.get('/meetings', ...adminGuard, comms.listMeetings);
router.post('/meetings', ...adminGuard, comms.createMeeting);

// Phase 2: Read receipts, reactions, edit/delete, pin, star
router.post('/private-threads/:threadId/read',                     ...adminGuard, comms.markMessagesRead);
router.post('/private-threads/:threadId/messages/:msgId/react',    ...adminGuard, comms.addReaction);
router.delete('/private-threads/:threadId/messages/:msgId/react',  ...adminGuard, comms.removeReaction);
router.put('/private-threads/:threadId/messages/:msgId',           ...adminGuard, comms.editMessage);
router.delete('/private-threads/:threadId/messages/:msgId/me',     ...adminGuard, comms.deleteMessageForMe);
router.delete('/private-threads/:threadId/messages/:msgId/all',    ...adminGuard, comms.deleteMessageForAll);
router.post('/private-threads/:threadId/messages/:msgId/pin',      ...adminGuard, comms.pinMessage);
router.get('/private-threads/:threadId/pinned',                    ...adminGuard, comms.getPinnedMessages);
router.post('/messages/:msgId/star',                               ...adminGuard, comms.starMessage);
router.get('/starred-messages',                                    ...adminGuard, comms.getStarredMessages);
router.get('/private-threads/:threadId/media',                     ...adminGuard, comms.getThreadMedia);

module.exports = router;

const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/emailCampaignController');

const adminOnly = [auth, requireRole('admin', 'super_admin', 'business_owner')];

router.get('/users/search', ...adminOnly, ctrl.searchUsers);
router.post('/send',        ...adminOnly, ctrl.sendCampaign);
router.get('/logs',         ...adminOnly, ctrl.getLogs);
router.delete('/logs/:id',  ...adminOnly, ctrl.deleteLog);

module.exports = router;

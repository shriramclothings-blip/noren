'use strict';

const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/newsletterController');

const adminOnly = [auth, requireRole('admin', 'super_admin', 'business_owner')];

// Public
router.post('/subscribe',   ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);

// Admin
router.get ('/subscribers', ...adminOnly, ctrl.listSubscribers);
router.post('/broadcast',   ...adminOnly, ctrl.broadcast);

module.exports = router;

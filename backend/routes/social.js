const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const socialCtrl = require('../controllers/socialController');

// Home Feed
router.get('/feed', optionalAuth, socialCtrl.getFeed);

// Posts
router.post('/posts', auth, socialCtrl.createPost);
router.get('/posts/:id', optionalAuth, socialCtrl.getPostById);
router.put('/posts/:id', auth, socialCtrl.updatePost);
router.delete('/posts/:id', auth, socialCtrl.deletePost);

// Interactions
router.post('/likes/toggle', auth, socialCtrl.toggleLike);
router.post('/bookmarks/toggle', auth, socialCtrl.toggleBookmark);
router.post('/reposts/toggle', auth, socialCtrl.toggleRepost);

// Comments
router.get('/comments', optionalAuth, socialCtrl.getComments);
router.post('/comments', auth, socialCtrl.addComment);
router.delete('/comments/:id', auth, socialCtrl.deleteComment);

// Reels
router.get('/reels', optionalAuth, socialCtrl.getReels);
router.post('/reels', auth, socialCtrl.createReel);
router.delete('/reels/:id', auth, socialCtrl.deleteReel);
router.post('/reels/:id/view', optionalAuth, socialCtrl.recordReelView);

// Stories
router.get('/stories', optionalAuth, socialCtrl.getActiveStories);
router.post('/stories', auth, socialCtrl.createStory);
router.post('/stories/:id/view', optionalAuth, socialCtrl.recordStoryView);

// Profile & Follow
router.get('/profile/:username', optionalAuth, socialCtrl.getUserProfile);
router.put('/profile', auth, socialCtrl.updateProfile);
router.post('/users/:id/follow', auth, socialCtrl.followUser);
router.post('/users/:id/unfollow', auth, socialCtrl.unfollowUser);

// Search
router.get('/search', optionalAuth, socialCtrl.globalSearch);

// Safety, Privacy & Notifications
router.get('/bookmarks', auth, socialCtrl.getBookmarks);
router.get('/notifications', auth, socialCtrl.getNotifications);
router.put('/notifications/read', auth, socialCtrl.markNotificationsRead);
router.post('/reports', auth, socialCtrl.submitReport);
router.post('/blocks', auth, socialCtrl.blockUser);
router.delete('/blocks/:id', auth, socialCtrl.unblockUser);
router.get('/privacy-settings', auth, socialCtrl.getPrivacySettings);
router.put('/privacy-settings', auth, socialCtrl.updatePrivacySettings);

module.exports = router;

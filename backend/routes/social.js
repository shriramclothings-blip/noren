const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const socialCtrl = require('../controllers/socialController');

// Home Feed
router.get('/feed', auth, socialCtrl.getFeed);

// Posts
router.post('/posts', auth, socialCtrl.createPost);
router.get('/posts/:id', auth, socialCtrl.getPostById);
router.put('/posts/:id', auth, socialCtrl.updatePost);
router.delete('/posts/:id', auth, socialCtrl.deletePost);

// Interactions
router.post('/likes/toggle', auth, socialCtrl.toggleLike);
router.post('/bookmarks/toggle', auth, socialCtrl.toggleBookmark);
router.post('/reposts/toggle', auth, socialCtrl.toggleRepost);

// Comments
router.get('/comments', auth, socialCtrl.getComments);
router.post('/comments', auth, socialCtrl.addComment);
router.delete('/comments/:id', auth, socialCtrl.deleteComment);

// Reels
router.get('/reels', auth, socialCtrl.getReels);
router.post('/reels', auth, socialCtrl.createReel);
router.post('/reels/:id/view', auth, socialCtrl.recordReelView);

// Stories
router.get('/stories', auth, socialCtrl.getActiveStories);
router.post('/stories', auth, socialCtrl.createStory);
router.post('/stories/:id/view', auth, socialCtrl.recordStoryView);

// Profile & Follow
router.get('/profile/:username', auth, socialCtrl.getUserProfile);
router.put('/profile', auth, socialCtrl.updateProfile);
router.post('/users/:id/follow', auth, socialCtrl.followUser);
router.post('/users/:id/unfollow', auth, socialCtrl.unfollowUser);

// Search
router.get('/search', auth, socialCtrl.globalSearch);

// Safety & Privacy
router.post('/reports', auth, socialCtrl.submitReport);
router.post('/blocks', auth, socialCtrl.blockUser);
router.delete('/blocks/:id', auth, socialCtrl.unblockUser);
router.get('/privacy-settings', auth, socialCtrl.getPrivacySettings);
router.put('/privacy-settings', auth, socialCtrl.updatePrivacySettings);

module.exports = router;

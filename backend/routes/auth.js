const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const { authRateLimit } = require('../middleware/rateLimiter');
const { 
    register, login, getMe, updateProfile, changePassword, 
    forgotPassword, resetPassword, verifyOTP, googleLogin, logout, 
    sendWhatsAppResetOTP, verifyWhatsAppOTPAndReset,
    phoneSendOTP, phoneVerifyOTP 
} = require('../controllers/authController');

router.post('/register',       authRateLimit, register);
router.post('/login',          authRateLimit, login);
router.post('/google',         authRateLimit, googleLogin);
router.get('/me',              auth, getMe);
router.post('/logout',         auth, logout);
router.put('/profile',         auth, uploadAvatar.single('avatar'), updateProfile);
router.put('/password',        auth, changePassword);
router.post('/forgot-password', authRateLimit, forgotPassword);
router.post('/verify-otp',      authRateLimit, verifyOTP);
router.post('/reset-password',  authRateLimit, resetPassword);

// WhatsApp OTP routes for password reset
router.post('/send-whatsapp-otp', authRateLimit, sendWhatsAppResetOTP);
router.post('/verify-whatsapp-otp-reset', authRateLimit, verifyWhatsAppOTPAndReset);

// Phone number login/signup with WhatsApp OTP
router.post('/phone-send-otp', authRateLimit, phoneSendOTP);
router.post('/phone-verify-otp', authRateLimit, phoneVerifyOTP);

// ── Recovery key login (user enters admin-generated key to set new password) ──
const { useRecoveryKey } = require('../controllers/adminRecoveryController');
router.post('/recover-with-key', authRateLimit, useRecoveryKey);

module.exports = router;

/**
 * routes/seller.js  — seller-portal facing routes
 */
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimiter');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const ctrl = require('../controllers/sellerController');

// ── OTP endpoints (public — no auth required) ────────────────────────────────
router.post('/send-otp',   authRateLimit, ctrl.sendRegistrationOTP);
router.post('/verify-otp', authRateLimit, ctrl.verifyRegistrationOTP);

// ── Cloudinary storage for seller docs ──────────────────────────────────────
const kycStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'noren-sellers/kyc', allowed_formats: ['jpg','jpeg','png','pdf','webp'], resource_type: 'auto' },
});
const uploadKYC = multer({ storage: kycStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const productImgStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'noren-sellers/products', allowed_formats: ['jpg','jpeg','png','webp'], transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
});
const uploadProductImgs = multer({ storage: productImgStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'noren-sellers/logos', allowed_formats: ['jpg','jpeg','png','webp'], transformation: [{ width: 400, height: 400, crop: 'limit' }] },
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 2 * 1024 * 1024 } });

// ── Routes ───────────────────────────────────────────────────────────────────
router.post('/register',          auth, ctrl.registerSeller);
router.get('/profile',            auth, ctrl.getSellerProfile);
router.put('/profile',            auth, uploadLogo.single('logo'), ctrl.updateSellerProfile);
router.post('/kyc',               auth, uploadKYC.fields([
  { name: 'doc_gst', maxCount: 1 },
  { name: 'doc_pan', maxCount: 1 },
  { name: 'doc_bank', maxCount: 1 },
  { name: 'doc_address', maxCount: 1 },
]), ctrl.submitKYC);
router.get('/dashboard',          auth, ctrl.getSellerDashboard);

// Products
router.post('/products',            auth, uploadProductImgs.array('images', 10), ctrl.createSellerProduct);
router.get('/products',             auth, ctrl.getSellerProducts);
router.get('/products/:id',         auth, ctrl.getSellerProductById);
router.put('/products/:id',         auth, uploadProductImgs.array('images', 10), ctrl.updateSellerProduct);
router.post('/products/:id/submit', auth, ctrl.submitProductForReview);
router.delete('/products/:id',      auth, ctrl.deleteSellerProduct);
router.post('/products/:id/remove', auth, ctrl.requestProductRemoval);
// Stock management
router.patch('/products/:id/variants/:variantId/stock', auth, ctrl.updateVariantStock);

// Orders & Payouts
router.get('/orders',             auth, ctrl.getSellerOrders);
router.get('/payouts',            auth, ctrl.getSellerPayouts);

module.exports = router;

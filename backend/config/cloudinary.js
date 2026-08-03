const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'shriram-clothings/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'shriram-clothings/avatars', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }] },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG, WEBP images are allowed'), false);
};

// Wrap multer to catch aborted requests gracefully
function makeUpload(instance) {
  return new Proxy(instance, {
    get(target, prop) {
      const method = target[prop];
      if (typeof method !== 'function') return method;
      return function (...args) {
        const middleware = method.apply(target, args);
        return function (req, res, next) {
          // If client disconnects mid-upload, just move on silently
          req.on('aborted', () => {
            console.warn('⚠️  Upload aborted by client (cloudinary stream)');
          });
          middleware(req, res, (err) => {
            if (!err || err.message === 'Request aborted') return next();
            next(err);
          });
        };
      };
    },
  });
}

const uploadProduct = makeUpload(multer({ storage: productStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }));
const uploadAvatar  = makeUpload(multer({ storage: avatarStorage,  limits: { fileSize: 5  * 1024 * 1024 }, fileFilter }));

module.exports = { cloudinary, uploadProduct, uploadAvatar };

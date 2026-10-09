// ============================================================
// NEON POSTGRESQL SYNC API CLIENT — VENDEXA RetailOS
// Handles all communication with the Neon PostgreSQL cloud backend.
// This module is called ONLY from the background sync worker.
// It NEVER touches local IndexedDB or React state.
// ============================================================

// Neon PostgreSQL connection (used server-side via the API endpoint you configure).
// The REACT app communicates with YOUR API server, which proxies to Neon.
// Direct Neon access from the browser is not recommended for security.
// Your API endpoint handles the actual Neon DB writes.

// Cloudinary configuration for media asset sync
const CLOUDINARY_CLOUD_NAME = 'dqhmmw1dp';
const CLOUDINARY_API_KEY = '738496343479782';
const CLOUDINARY_UPLOAD_PRESET = 'vendexa_pos_sync'; // Create this unsigned preset in Cloudinary dashboard

/**
 * Upload a base64 image to Cloudinary.
 * Used for syncing product images, logos, etc.
 * Returns { success, url, publicId, error }
 */
export const uploadImageToCloudinary = async (base64DataUrl, folder = 'vendexa-pos', publicIdPrefix = '') => {
  if (!base64DataUrl || !String(base64DataUrl).startsWith('data:image')) {
    return { success: false, error: 'Invalid image data' };
  }
  try {
    const formData = new FormData();
    formData.append('file', base64DataUrl);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
    formData.append('folder', folder);
    if (publicIdPrefix) formData.append('public_id', `${publicIdPrefix}-${Date.now()}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData, signal: controller.signal }
    );
    clearTimeout(timer);

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      return { success: false, error: `Cloudinary upload failed: ${response.status} ${err.slice(0, 200)}` };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
    };
  } catch (error) {
    if (error.name === 'AbortError') return { success: false, error: 'Cloudinary upload timed out' };
    return { success: false, error: error.message || 'Cloudinary upload failed' };
  }
};

/**
 * Extract product image from payload and upload to Cloudinary if it's a data: URL.
 * Returns the payload with logoSrc/imageSrc replaced by a Cloudinary HTTPS URL.
 */
export const processPayloadImages = async (entityType, payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  const processed = { ...payload };

  // Handle product images
  if (entityType === 'products' && String(processed.imageSrc || '').startsWith('data:image')) {
    const upload = await uploadImageToCloudinary(processed.imageSrc, 'vendexa-pos/products', `product-${processed.id || Date.now()}`);
    if (upload.success) processed.imageSrc = upload.url;
    else delete processed.imageSrc; // Don't send raw base64 to server
  }

  // Handle company logo
  if (entityType === 'settings' && String(processed.logoSrc || '').startsWith('data:image')) {
    const upload = await uploadImageToCloudinary(processed.logoSrc, 'vendexa-pos/logos', `logo-${Date.now()}`);
    if (upload.success) processed.logoSrc = upload.url;
    else delete processed.logoSrc;
  }

  return processed;
};

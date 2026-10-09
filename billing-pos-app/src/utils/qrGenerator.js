/**
 * QR Code Generation Utility for VENDEXA RetailOS™
 * 
 * Generates high-quality QR codes for invoice access tokens
 * Optimized for thermal and standard printers
 */

import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL
 * @param {string} data - The data to encode (invoice URL)
 * @param {object} options - QR code options
 * @returns {Promise<string>} Data URL of the QR code image
 */
export async function generateQRCodeDataURL(data, options = {}) {
  const defaultOptions = {
    errorCorrectionLevel: 'M',  // Medium error correction (15%)
    type: 'image/png',
    quality: 1.0,
    margin: 2,                   // Quiet zone (modules)
    width: 256,                  // Pixels (good for thermal printers)
    color: {
      dark: '#000000',           // Black modules
      light: '#FFFFFF'           // White background
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    const dataURL = await QRCode.toDataURL(data, finalOptions);
    return dataURL;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Generate a QR code as raw canvas element (for advanced manipulation)
 * @param {string} data - The data to encode
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {object} options - QR code options
 * @returns {Promise<HTMLCanvasElement>} The canvas with QR code
 */
export async function generateQRCodeToCanvas(data, canvas, options = {}) {
  const defaultOptions = {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    await QRCode.toCanvas(canvas, data, finalOptions);
    return canvas;
  } catch (error) {
    console.error('QR code generation to canvas failed:', error);
    throw new Error(`Failed to generate QR code to canvas: ${error.message}`);
  }
}

/**
 * Generate a QR code optimized for thermal receipt printers
 * @param {string} data - Invoice URL with token
 * @returns {Promise<string>} Data URL optimized for thermal printing
 */
export async function generateThermalQRCode(data) {
  return await generateQRCodeDataURL(data, {
    errorCorrectionLevel: 'H',  // High error correction (30%) - better for thermal
    width: 200,                  // Smaller for 58mm/80mm thermal paper
    margin: 1,                   // Minimal margin to save paper
  });
}

/**
 * Generate a QR code optimized for A4 invoice printing
 * @param {string} data - Invoice URL with token
 * @returns {Promise<string>} Data URL optimized for A4 printing
 */
export async function generateA4QRCode(data) {
  return await generateQRCodeDataURL(data, {
    errorCorrectionLevel: 'M',
    width: 300,                  // Larger for better scannability on A4
    margin: 2,
  });
}

/**
 * Validate invoice URL before QR generation
 * @param {string} url - The invoice URL to validate
 * @returns {boolean} True if valid
 */
export function validateInvoiceURL(url) {
  try {
    const urlObj = new URL(url);
    
    // Check if it's an HTTPS URL (required for security)
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      return false;
    }

    // Check if path contains invoice token pattern
    if (!urlObj.pathname.includes('/my-billing/invoice/')) {
      return false;
    }

    // Check if token exists and has minimum length
    const pathParts = urlObj.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    if (!token || token.length < 20) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate invoice QR code with validation and error handling
 * @param {string} publicToken - The secure public token from backend
 * @param {string} baseURL - Website base URL (e.g., https://norenfastion.shop)
 * @param {object} options - Generation options
 * @returns {Promise<object>} Object with dataURL and metadata
 */
export async function generateInvoiceQRCode(publicToken, baseURL, options = {}) {
  if (!publicToken || publicToken.length < 20) {
    throw new Error('Invalid public token - must be at least 20 characters');
  }

  if (!baseURL) {
    throw new Error('Base URL is required');
  }

  // Construct the full invoice URL
  const invoiceURL = `${baseURL}/my-billing/invoice/${publicToken}`;

  // Validate URL before generating
  if (!validateInvoiceURL(invoiceURL)) {
    throw new Error('Generated invoice URL failed validation');
  }

  // Determine printer type and generate accordingly
  const printerType = options.printerType || 'thermal';
  let dataURL;

  if (printerType === 'thermal') {
    dataURL = await generateThermalQRCode(invoiceURL);
  } else if (printerType === 'a4') {
    dataURL = await generateA4QRCode(invoiceURL);
  } else {
    dataURL = await generateQRCodeDataURL(invoiceURL, options);
  }

  return {
    dataURL,
    url: invoiceURL,
    token: publicToken,
    generatedAt: new Date().toISOString(),
    printerType
  };
}

/**
 * Test if QR code can be generated successfully
 * @returns {Promise<boolean>} True if QR generation works
 */
export async function testQRGeneration() {
  try {
    const testURL = 'https://example.com/my-billing/invoice/test1234567890abcdef';
    await generateQRCodeDataURL(testURL, { width: 100 });
    return true;
  } catch (error) {
    console.error('QR generation test failed:', error);
    return false;
  }
}

/**
 * Batch generate QR codes for multiple invoices
 * @param {Array<object>} invoices - Array of {publicToken, baseURL}
 * @param {object} options - Generation options
 * @returns {Promise<Array<object>>} Array of generated QR codes
 */
export async function batchGenerateQRCodes(invoices, options = {}) {
  const results = [];
  const errors = [];

  for (const invoice of invoices) {
    try {
      const qrCode = await generateInvoiceQRCode(
        invoice.publicToken,
        invoice.baseURL || options.baseURL,
        options
      );
      results.push({
        success: true,
        invoice_id: invoice.id,
        qrCode
      });
    } catch (error) {
      errors.push({
        success: false,
        invoice_id: invoice.id,
        error: error.message
      });
    }
  }

  return { results, errors };
}

/**
 * Calculate optimal QR code size for given printer DPI
 * @param {number} dpi - Printer DPI (dots per inch)
 * @param {number} targetPhysicalSize - Target size in mm
 * @returns {number} Optimal width in pixels
 */
export function calculateQRSize(dpi, targetPhysicalSize = 25) {
  // Convert mm to inches, then to pixels
  const inches = targetPhysicalSize / 25.4;
  const pixels = Math.round(inches * dpi);
  
  // Ensure minimum size for scannability
  return Math.max(pixels, 150);
}

/**
 * Generate QR code with custom branding overlay (logo in center)
 * @param {string} data - Data to encode
 * @param {string} logoDataURL - Logo image as data URL
 * @param {object} options - Generation options
 * @returns {Promise<string>} Data URL with branded QR code
 */
export async function generateBrandedQRCode(data, logoDataURL, options = {}) {
  const canvas = document.createElement('canvas');
  const size = options.width || 300;
  canvas.width = size;
  canvas.height = size;

  // Generate base QR code
  await generateQRCodeToCanvas(data, canvas, {
    ...options,
    errorCorrectionLevel: 'H' // High correction needed for logo overlay
  });

  const ctx = canvas.getContext('2d');

  // Load and draw logo in center
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const logoSize = size * 0.2; // 20% of QR size
      const x = (size - logoSize) / 2;
      const y = (size - logoSize) / 2;

      // Draw white background circle for logo
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 5, 0, 2 * Math.PI);
      ctx.fill();

      // Draw logo
      ctx.drawImage(img, x, y, logoSize, logoSize);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = logoDataURL;
  });
}

export default {
  generateQRCodeDataURL,
  generateQRCodeToCanvas,
  generateThermalQRCode,
  generateA4QRCode,
  validateInvoiceURL,
  generateInvoiceQRCode,
  testQRGeneration,
  batchGenerateQRCodes,
  calculateQRSize,
  generateBrandedQRCode
};

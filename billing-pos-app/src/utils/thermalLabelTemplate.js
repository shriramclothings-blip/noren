/**
 * thermalLabelTemplate.js — Production thermal label engine
 * Label: 50mm × 25mm landscape
 * ROW 1: Logo (centred, top)
 * ROW 2: Barcode bars (full width)
 * ROW 3: Barcode number / batch number (centred, below barcode)
 * ROW 4: Footer — Product name + [VARIANT NAME] left · price right
 */

import JsBarcode from 'jsbarcode';
import { normalizeBarcodeFormat } from './barcodeEngine';

export const LABEL_DIMENSIONS = {
  WIDTH_MM: 50,
  HEIGHT_MM: 25,
  ORIENTATION: 'landscape',
  MARGIN_TOP: 0.8,
  MARGIN_BOTTOM: 0.8,
  MARGIN_LEFT: 0.8,
  MARGIN_RIGHT: 0.8,
  SECTION_GAP: 0.4,
  LOGO_MAX_WIDTH_MM: 4,
  LOGO_MAX_HEIGHT_MM: 3.5,
  LOGO_MARGIN_RIGHT: 0.5,
  PRODUCT_NAME_MAX_HEIGHT: 2.5,
  SIZE_TEXT_HEIGHT: 1.2,
  BARCODE_MIN_HEIGHT_MM: 6,
  BARCODE_IDEAL_HEIGHT_MM: 7.5,
  BARCODE_MAX_HEIGHT_MM: 9,
  BARCODE_MODULE_WIDTH_MM: 0.65,
  FOOTER_HEIGHT_MM: 2.5,
  DPI_STANDARD: 203,
  DPI_PREMIUM: 300,
};

export const TYPOGRAPHY = {
  PRODUCT_NAME_SIZE_PT: 5,
  PRODUCT_SIZE_SIZE_PT: 3.5,
  BARCODE_NUMBER_SIZE_PT: 3.2,
  SKU_LABEL_SIZE_PT: 3,
  SKU_VALUE_SIZE_PT: 3.5,
  PRICE_SIZE_PT: 4.5,
  PRICE_BOLD: true,
  CURRENCY_SIZE_PT: 4,
  LINE_HEIGHT_MULTIPLIER: 1.1,
};

/**
 * Draw one 50×25mm thermal label.
 * The "sku" field on the product object is used as the human-readable
 * number printed beneath the barcode.  When the caller passes a batchNumber
 * that value is preferred so the label shows the batch reference instead.
 */
export function drawProfessionalLabel(doc, product, options = {}) {
  const {
    startX = 0,
    startY = 0,
    logoImage = null,
    showLogo = true,
    showSize = true,
    showPrice = true,
    barcodeFormat = 'CODE128',
  } = options;

  const x  = startX;
  const y  = startY;
  const w  = LABEL_DIMENSIONS.WIDTH_MM;
  const h  = LABEL_DIMENSIONS.HEIGHT_MM;
  const cx = x + w / 2;

  const ML       = 1.2;
  const MT       = 0.8;
  const contentW = w - ML * 2;

  const LOGO_H    = 7.0;
  const BARCODE_H = 7.5;
  const SKU_H     = 5.0;
  const FOOTER_H  = 3.0;
  const GAP       = 0.3;

  // Border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);
  doc.rect(x, y, w, h);

  let curY = y + MT;

  // ROW 1 — Logo
  if (showLogo && logoImage) {
    try {
      doc.addImage(logoImage, 'PNG', cx - 10, curY, 20, LOGO_H);
    } catch (e) { /* skip silently */ }
  }
  curY += LOGO_H + GAP;

  // ROW 2 — Barcode bars (use variant-specific barcode)
  const barcodeValue = String(product.barcode || product.sku || `SKU${product.id}`).trim();

  // ROW 3 label: prefer batchNumber, then barcode, then sku
  const displayCode = String(
    product.batchNumber || product.barcode || product.sku || `SKU${product.id}`
  ).trim();

  drawBarcode(doc, barcodeValue, x + ML, curY, contentW, BARCODE_H, barcodeFormat);
  curY += BARCODE_H + GAP;

  // ROW 3 — Display code (batch number shown here instead of SKU)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(displayCode, cx, curY + SKU_H * 0.6, { align: 'center' });
  curY += SKU_H + GAP;

  // ROW 4 — Footer: product name + variant label left, price right
  const footerY     = curY + FOOTER_H * 0.65;
  const productName = String(product.name || 'Product').trim();
  // Use variant label/name (sizeLabel field) for printing
  const variantLabel = showSize
    ? String(product.sizeLabel || product.variantLabel || product.variantName || '').trim()
    : '';
  const nameLabel   = variantLabel
    ? `${productName}  [${variantLabel.toUpperCase()}]`
    : productName;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  const nameFit = doc.splitTextToSize(nameLabel, contentW * 0.62);
  doc.text(nameFit[0], x + ML, footerY, { align: 'left' });

  if (showPrice) {
    const price = Number(product.price || 0).toFixed(2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`SRC ${price}`, x + w - ML, footerY, { align: 'right' });
  }
}

// ── Barcode renderer ──────────────────────────────────────────────────────────

function sanitizeForBarcode(value, format) {
  const str = String(value || '').trim();
  if ((format === 'EAN13' || format === 'EAN8') && !/^\d+$/.test(str)) {
    return { value: str, format: 'CODE128' };
  }
  return { value: str, format };
}

function drawBarcode(doc, barcodeValue, x, y, width, height, barcodeFormat) {
  const pxPerMm        = 3.7795275591;
  const barcodeHeightPx = Math.max(60, Math.round(height * pxPerMm));
  const maxCanvasWidth  = Math.max(200, Math.round(width * pxPerMm));

  const resolvedFormat = normalizeBarcodeFormat(barcodeFormat);
  const { value: safeValue, format: safeFormat } = sanitizeForBarcode(barcodeValue, resolvedFormat);

  if (!safeValue) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(TYPOGRAPHY.BARCODE_NUMBER_SIZE_PT);
    doc.text('NO BARCODE', x + width / 2, y + height / 2, { align: 'center' });
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width  = maxCanvasWidth;
  canvas.height = barcodeHeightPx;

  try {
    JsBarcode(canvas, safeValue, {
      format:       safeFormat,
      width:        1,
      height:       barcodeHeightPx,
      displayValue: false,
      margin:       2,
      lineColor:    '#000000',
    });
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height);
  } catch (err) {
    console.error('Barcode generation failed:', err, { safeValue, safeFormat });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(TYPOGRAPHY.BARCODE_NUMBER_SIZE_PT);
    doc.text('BARCODE ERROR', x + width / 2, y + height / 2, { align: 'center' });
  }
}

// ── Logo processor ────────────────────────────────────────────────────────────

export function processLogoForLabel(logoImage) {
  return new Promise((resolve) => {
    if (!logoImage || typeof logoImage !== 'string') { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const targetH = 200;
      const scale   = targetH / img.height;
      const canvas  = document.createElement('canvas');
      canvas.width  = Math.round(img.width * scale);
      canvas.height = targetH;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { console.error('Failed to process logo'); resolve(null); };
    img.src = logoImage;
  });
}

// ── Page helpers ──────────────────────────────────────────────────────────────

export function setupLabelPageFormat(doc) {
  return doc;
}

export function addLabelPage(doc) {
  doc.addPage([LABEL_DIMENSIONS.WIDTH_MM, LABEL_DIMENSIONS.HEIGHT_MM], 'landscape');
  return doc;
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateProductForLabel(product) {
  const errors = [], warnings = [];
  if (!product) { errors.push('Product data is required'); return { valid: false, errors, warnings }; }
  if (!product.name) warnings.push('Product name is missing');
  if (!product.barcode && !product.sku) errors.push('Product must have barcode or SKU');
  if (!product.price || product.price <= 0) warnings.push('Product price is missing or invalid');
  return { valid: errors.length === 0, errors, warnings };
}

export function getLabelPixelDimensions(dpi = 203) {
  const mmToPixel = dpi / 25.4;
  return {
    widthPx:  Math.round(LABEL_DIMENSIONS.WIDTH_MM  * mmToPixel),
    heightPx: Math.round(LABEL_DIMENSIONS.HEIGHT_MM * mmToPixel),
    dpi,
  };
}

export function calculateOptimalBarcodeModuleWidth(dpi = 203) {
  const mmToPixel          = dpi / 25.4;
  const availableWidthPx   = Math.round((LABEL_DIMENSIONS.WIDTH_MM - 1.6) * mmToPixel);
  const estimatedModuleCount = 12 * 11;
  const moduleWidthPx      = Math.floor(availableWidthPx / estimatedModuleCount);
  const moduleWidthMm      = moduleWidthPx / mmToPixel;
  return Math.max(0.35, Math.min(1.2, moduleWidthMm));
}

export function generateLabelPrintCSS() {
  return `
    @page { size: ${LABEL_DIMENSIONS.WIDTH_MM}mm ${LABEL_DIMENSIONS.HEIGHT_MM}mm landscape; margin: 0; padding: 0; }
    @media print {
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { margin: 0; padding: 0; background: white; zoom: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .label-page { page-break-after: always; width: ${LABEL_DIMENSIONS.WIDTH_MM}mm; height: ${LABEL_DIMENSIONS.HEIGHT_MM}mm; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: white; }
    }
    body { margin: 0; padding: 0; background: #f5f5f5; }
    .label-page { width: ${LABEL_DIMENSIONS.WIDTH_MM}mm; height: ${LABEL_DIMENSIONS.HEIGHT_MM}mm; margin: 10px auto; background: white; border: 1px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.1); page-break-after: always; }
  `;
}

const ThermalLabelTemplate = {
  LABEL_DIMENSIONS,
  TYPOGRAPHY,
  drawProfessionalLabel,
  processLogoForLabel,
  setupLabelPageFormat,
  addLabelPage,
  validateProductForLabel,
  getLabelPixelDimensions,
  calculateOptimalBarcodeModuleWidth,
  generateLabelPrintCSS,
};

export default ThermalLabelTemplate;

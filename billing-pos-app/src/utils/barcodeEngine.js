const DEFAULT_FORMAT = 'CODE128';
const DEFAULT_PREFIX = 'SKU';
const DEFAULT_VARIANT_PREFIX = 'VAR';
const SUPPORTED_FORMATS = new Set([
  'CODE128',
  'CODE39',
  'EAN13',
  'EAN8',
  'UPC',
  'ISBN',
  'ITF',
  'GS1',
]);

function compact(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeSku(value) {
  return compact(String(value || '')).toUpperCase();
}

function basePrefix(value, fallback) {
  const normalized = compact(String(value || '') || fallback);
  return normalized ? normalized.toUpperCase() : fallback.toUpperCase();
}

export function normalizeBarcodeFormat(value = DEFAULT_FORMAT) {
  const format = String(value || '').toUpperCase().trim();
  if (!format) return DEFAULT_FORMAT;
  if (format === 'GS1') return DEFAULT_FORMAT;
  if (!SUPPORTED_FORMATS.has(format)) return DEFAULT_FORMAT;
  return format;
}

export function sanitizeBarcodeValue(value) {
  return compact(String(value || ''));
}

export function normalizeBarcodeValue(value) {
  const normalized = sanitizeBarcodeValue(value);
  return normalized.toUpperCase();
}

export function buildBarcodeSeed(product = {}, company = {}) {
  const sku = sanitizeSku(product.sku || product.id || product.name || 'ITEM');
  const prefix = basePrefix(company?.barcodePrefix, DEFAULT_PREFIX);

  if (sku) {
    return `${prefix}-${sku}`;
  }

  return `${prefix}-${String(product.id || 'ITEM').replace(/\D/g, '').slice(-6) || 'ITEM'}`;
}

export function buildVariantBarcodeSeed(product = {}, sizeLabel = '', company = {}) {
  const prefix = basePrefix(company?.variantBarcodePrefix || company?.barcodePrefix, DEFAULT_VARIANT_PREFIX);
  const productKey = sanitizeSku(product.sku || product.id || product.name || 'ITEM');
  const sizeKey = sanitizeSku(sizeLabel || 'ONESIZE');

  if (productKey && sizeKey) {
    return `${prefix}-${productKey}-${sizeKey}`;
  }

  return `${prefix}-${sanitizeSku(product.id || 'ITEM')}-${sizeKey || 'ONESIZE'}`;
}

export function ensureUniqueBarcode(candidate, usedBarcodes = [], currentValue = '') {
  const base = sanitizeBarcodeValue(candidate);
  if (!base) return '';

  const seen = new Set(
    usedBarcodes
      .map((value) => sanitizeBarcodeValue(value))
      .filter(Boolean)
  );

  const current = sanitizeBarcodeValue(currentValue);
  if (current) seen.delete(current);

  if (!seen.has(base)) return base;

  let attempt = 1;
  while (seen.has(`${base}-${attempt}`)) {
    attempt += 1;
  }

  return `${base}-${attempt}`;
}

export function generateProductBarcode(product = {}, company = {}, usedBarcodes = [], currentBarcode = '') {
  const seed = buildBarcodeSeed(product, company);
  return ensureUniqueBarcode(seed, usedBarcodes, currentBarcode);
}

export function generateVariantBarcode(product = {}, sizeLabel = '', company = {}, usedBarcodes = [], currentBarcode = '') {
  const seed = buildVariantBarcodeSeed(product, sizeLabel, company);
  return ensureUniqueBarcode(seed, usedBarcodes, currentBarcode);
}

export function buildBarcodeLookup(products = [], variants = []) {
  return [
    ...products.map((product) => sanitizeBarcodeValue(product?.barcode)).filter(Boolean),
    ...variants.map((variant) => sanitizeBarcodeValue(variant?.barcode)).filter(Boolean),
  ];
}

export function guessBarcodeSource(rawBarcode = '') {
  const barcode = sanitizeBarcodeValue(rawBarcode);
  if (!barcode) return 'unknown';
  if (/^CUST-/i.test(barcode)) return 'customer';
  if (/^INV-/i.test(barcode)) return 'invoice';
  if (/^[0-9]{8,13}$/i.test(barcode)) return 'numeric';
  return 'alphanumeric';
}

export function shouldTreatAsScannerInput(key, deltaMs) {
  const step = String(key || '').trim();
  if (!step) return false;
  if (step.length !== 1) return false;
  if (!/[A-Za-z0-9]/.test(step)) return false;
  return deltaMs <= 90;
}

/**
 * Extract size code from a barcode that contains size suffix
 * Handles patterns like:
 * - SHIRT001M → M (Medium)
 * - SHIRT001X → X (Extra Large)
 * - SKU-PRODUCT-L → L (Large)
 */
export function extractSizeCodeFromBarcode(barcode) {
  const normalized = normalizeBarcodeValue(barcode || '');
  if (!normalized || normalized.length < 2) return null;

  if (normalized.includes('-')) {
    const parts = normalized.split('-').filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : null;
  }

  const lastChar = normalized.charAt(normalized.length - 1);
  const VALID_SIZE_CODES = new Set(['A', 'S', 'M', 'L', 'X', 'Y', 'Z', 'O', 'F']);
  if (!VALID_SIZE_CODES.has(lastChar)) return null;
  if (normalized.length > 1 && /[A-Z0-9]/.test(normalized.charAt(normalized.length - 2))) {
    return lastChar;
  }
  return null;
}

/**
 * Map size codes back to readable size labels
 */
export function mapSizeCodeToLabel(sizeCode) {
  const map = {
    A: 'XS',
    S: 'S',
    M: 'M',
    L: 'L',
    X: 'XL',
    Y: 'XXL',
    Z: 'XXXL',
    O: 'ONE SIZE',
    F: 'FREE',
  };
  return map[sizeCode?.toUpperCase()] || null;
}

/**
 * Extract the base barcode (without size suffix)
 */
export function extractBaseBarcode(barcode) {
  const normalized = normalizeBarcodeValue(barcode || '');
  if (!normalized) return null;

  if (normalized.includes('-')) {
    const parts = normalized.split('-').filter(Boolean);
    if (parts.length <= 1) return normalized;
    parts.pop();
    return parts.join('-');
  }

  const sizeCode = extractSizeCodeFromBarcode(normalized);
  if (!sizeCode) return normalized;
  return normalized.substring(0, normalized.length - sizeCode.length);
}

export { DEFAULT_FORMAT, SUPPORTED_FORMATS };

/**
 * Variant & Size Management Utilities
 * Professional size-wise inventory system
 */

/**
 * Generate size-specific barcode from product SKU and size label
 * Format: {productSKU}-{sizeCode}
 * Example: SHRT-BLK-M
 */
export const normalizeSizeBarcodeBase = (barcode) => {
  if (!barcode) return '';
  return String(barcode)
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
};

export const getSizeCode = (sizeLabel) => {
  if (!sizeLabel) return '';
  const cleanSize = String(sizeLabel).trim().toUpperCase();
  const map = {
    XS: 'A',
    S: 'S',
    M: 'M',
    L: 'L',
    XL: 'X',
    XXL: 'Y',
    XXXL: 'Z',
    OS: 'O',
    'ONE SIZE': 'O',
    'ONE-SIZE': 'O',
    'ONE SIZE ONLY': 'O',
    FREE: 'F',
  };

  if (map[cleanSize]) return map[cleanSize];
  const fallback = cleanSize.replace(/[^A-Z0-9]/g, '');
  return fallback ? fallback[0] : '';
};

export const generateSizeBarcode = (baseBarcode, sizeLabel) => {
  const base = normalizeSizeBarcodeBase(baseBarcode);
  const suffix = getSizeCode(sizeLabel);
  if (!base || !suffix) return null;
  return `${base}${suffix}`;
};

export const generateVariantBarcode = (productSku, sizeLabel) => {
  const variantBarcode = generateSizeBarcode(productSku, sizeLabel);
  if (variantBarcode) return variantBarcode;
  if (!productSku || !sizeLabel) return null;
  const cleanSku = String(productSku).toUpperCase().replace(/\s+/g, '-');
  const cleanSize = String(sizeLabel).toUpperCase().replace(/\s+/g, '');
  return `${cleanSku}-${cleanSize}`;
};

/**
 * Generate size-specific SKU from product SKU and size label
 * Format: {productSKU}-{sizeCode}
 * Example: SHIRT001-M
 */
export const generateVariantSku = (productSku, sizeLabel) => {
  if (!productSku || !sizeLabel) return null;
  const cleanSku = String(productSku).toUpperCase().replace(/\s+/g, '');
  const cleanSize = String(sizeLabel).toUpperCase().replace(/\s+/g, '');
  return `${cleanSku}-${cleanSize}`;
};

/**
 * Common clothing sizes - quick selection
 */
export const CLOTHING_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
];

/**
 * Bulk create variants for a product
 * @param {Array} sizes - Array of size labels
 * @param {Object} baseProduct - Base product data
 * @param {number} defaultStock - Default stock per size
 * @returns {Array} Array of variant data objects ready for creation
 */
export const generateBulkVariants = (sizes, baseProduct, defaultStock = 0) => {
  return sizes.map((sizeLabel) => ({
    label: sizeLabel,
    sku: generateVariantSku(baseProduct.sku || baseProduct.id, sizeLabel),
    barcode: generateVariantBarcode(baseProduct.sku || baseProduct.id, sizeLabel),
    stock: defaultStock,
    price: baseProduct.price || null,
    costPrice: baseProduct.costPrice || null,
    taxRate: baseProduct.taxRate || null,
  }));
};

/**
 * Parse size label from barcode
 * Expected format: SKU-SIZELABEL
 * Example: SHRT-BLK-M -> returns 'M'
 */
export const extractSizeFromBarcode = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return null;
  const parts = barcode.split('-');
  return parts.length > 1 ? parts[parts.length - 1] : null;
};

/**
 * Group variants by product for tree view display
 * @param {Array} variants - Array of variant objects with productId
 * @param {Array} products - Array of product objects
 * @returns {Object} Grouped structure: { productId: { product, variants: [] } }
 */
export const groupVariantsByProduct = (variants, products) => {
  const grouped = {};

  products.forEach((product) => {
    grouped[product.id] = {
      product,
      variants: [],
    };
  });

  variants.forEach((variant) => {
    if (grouped[variant.productId]) {
      grouped[variant.productId].variants.push(variant);
    }
  });

  return grouped;
};

/**
 * Calculate total stock for a product across all variants
 * @param {Array} variants - Variants for the product
 * @returns {number}
 */
export const calculateTotalStock = (variants) => {
  return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
};

/**
 * Get low stock variants for a product
 * @param {Array} variants
 * @param {number} threshold - Min stock level (default 5)
 * @returns {Array}
 */
export const getLowStockVariants = (variants, threshold = 5) => {
  return variants.filter((v) => (v.stock || 0) <= threshold);
};

/**
 * Calculate variant value (stock * cost price)
 * @param {Object} variant
 * @returns {number}
 */
export const getVariantInventoryValue = (variant) => {
  const stock = variant.stock || 0;
  const cost = variant.costPrice || 0;
  return stock * cost;
};

/**
 * Format variant label for display
 * Example: "Cotton Shirt - Size M" or "M (Qty: 5)"
 */
export const formatVariantLabel = (variant, product = null, verbose = false) => {
  if (verbose) {
    const productName = product?.name || '';
    return `${productName} - Size ${variant.label} (Qty: ${variant.stock || 0})`;
  }
  return `${variant.label} (${variant.stock || 0})`;
};

/**
 * Create variant from form data (with validation)
 * @param {Object} formData
 * @param {Object} product
 * @returns {Object|null} Variant data or null if invalid
 */
export const buildVariantFromForm = (formData, product) => {
  if (!formData.label) return null;

  return {
    label: String(formData.label).toUpperCase(),
    sku: formData.sku || generateVariantSku(product.sku || product.id, formData.label),
    barcode: formData.barcode || generateVariantBarcode(product.sku || product.id, formData.label),
    stock: parseInt(formData.stock) || 0,
    price: formData.price ? parseFloat(formData.price) : product.price,
    costPrice: formData.costPrice ? parseFloat(formData.costPrice) : product.costPrice,
    taxRate: formData.taxRate ? parseFloat(formData.taxRate) : product.taxRate,
  };
};

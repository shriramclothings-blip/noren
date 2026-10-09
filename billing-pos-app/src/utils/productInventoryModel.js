export const normalizeCodePart = (value = '') => {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8);
};

export const buildVariantSku = ({ productName = '', brand = '', size = '', color = '' } = {}) => {
  const parts = [brand, productName, size, color]
    .map(normalizeCodePart)
    .filter(Boolean);

  if (!parts.length) return '';

  const sku = parts.join('-');
  return sku.length > 32 ? sku.slice(0, 32) : sku;
};

export const generateNumericBarcode = (existingBarcodes = []) => {
  const used = new Set((existingBarcodes || []).map((value) => String(value).trim()).filter(Boolean));

  let attempts = 0;
  while (attempts < 1000) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    if (!used.has(candidate)) {
      return candidate;
    }
    attempts += 1;
  }

  return String(Date.now()).slice(-6);
};

export const buildBatchNumber = (prefix = 'BT', sourceDate = new Date()) => {
  const now = sourceDate instanceof Date ? sourceDate : new Date(sourceDate);
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  // Use 6-digit random suffix + microsecond timestamp suffix for near-zero collision probability
  const randomPart = String(Math.floor(100000 + Math.random() * 900000));
  const timePart = String(Date.now()).slice(-4);
  return `${prefix}${datePart}${randomPart}${timePart}`;
};

export const createDefaultVariant = (product = {}, index = 0) => ({
  id: `variant-${Date.now()}-${index + 1}`,
  size: '',
  color: '',
  sku: '',
  barcode: '',
  price: Number(product.salePrice ?? product.price ?? 0),
  costPrice: Number(product.costPrice ?? 0),
  stock: 0,
  minStock: Number(product.minStock ?? 0),
  status: 'Active',
  active: true,
});

export const summarizeProductInventory = (product = {}) => {
  const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];
  // Always compute from variants if they exist; otherwise fall back to product.stock
  const variantStock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const totalStock = variants.length > 0 ? variantStock : Number(product.stock || 0);
  const prices = variants.map((variant) => Number(variant.price ?? product.salePrice ?? product.price ?? 0));
  const lowestPrice = prices.length ? Math.min(...prices) : Number(product.salePrice ?? product.price ?? 0);
  const highestPrice = prices.length ? Math.max(...prices) : Number(product.salePrice ?? product.price ?? 0);
  const lowStock = totalStock <= Number(product.minStock || 0);

  // Compute total inventory cost value
  const totalCostValue = variants.length > 0
    ? variants.reduce((sum, v) => sum + (Number(v.stock || 0) * Number(v.costPrice || product.costPrice || 0)), 0)
    : Number(product.stock || 0) * Number(product.costPrice || 0);

  return {
    totalStock,
    variantCount: variants.length,
    lowestPrice,
    highestPrice,
    lowStock,
    lowStockLabel: lowStock ? 'Low stock' : 'Healthy',
    totalCostValue,
  };
};

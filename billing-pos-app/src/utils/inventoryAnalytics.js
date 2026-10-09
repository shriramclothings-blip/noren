import { normalizeBarcodeValue } from './barcodeEngine';
import { generateVariantSku, generateVariantBarcode } from './variantUtils';

const TOPWEAR_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
const BOTTOMWEAR_SIZES = ['28', '30', '32', '34', '36', '38', '40', '42', '44'];
const DEFAULT_CUSTOM_SIZE = 'One Size';

export function getSizeOptions(sizeType) {
  if (sizeType === 'topwear') return TOPWEAR_SIZES;
  if (sizeType === 'bottomwear') return BOTTOMWEAR_SIZES;
  return [DEFAULT_CUSTOM_SIZE];
}

export function buildOfflineUpiUri({ upiId, merchantName, invoiceNumber, amount, currency = 'INR' }) {
  const safeUpi = encodeURIComponent(String(upiId || '').trim() || 'merchant@upi');
  const safeName = encodeURIComponent(String(merchantName || 'VENDEXA RetailOS').trim() || 'VENDEXA RetailOS');
  const safeNote = encodeURIComponent(String(invoiceNumber || 'POS-BILL').trim() || 'POS-BILL');
  const safeAmount = Number(amount || 0).toFixed(2);
  return `upi://pay?pa=${safeUpi}&pn=${safeName}&am=${safeAmount}&cu=${currency}&tn=${safeNote}`;
}

export function buildInvoiceNumber({ prefix = 'I_SRC', dateKey = '000000', sequence = 1, digits = 6 }) {
  const safePrefix = String(prefix || 'I_SRC').trim() || 'I_SRC';
  const safeDateKey = String(dateKey || '000000').trim() || '000000';
  const safeDigits = Math.max(1, Math.min(8, Number(digits) || 6));
  const safeSequence = String(Number(sequence) || 0).padStart(safeDigits, '0');
  return `${safePrefix}-${safeDateKey}${safeSequence}`;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getRestockSuggestion(product) {
  const minStock = Number(product.minStock || 5);
  const currentStock = Number(product.stock || 0);
  return Math.max(0, minStock - currentStock);
}

function getDemandLevel(product) {
  const sold = Number(product.totalSold || product.soldQuantity || 0);
  const purchase = Number(product.purchaseQuantity || 0);
  const stock = Number(product.stock || 0);
  if (stock <= Number(product.minStock || 5)) return 'Low';
  if (purchase > 0 && sold >= purchase * 0.6) return 'High';
  if (purchase > 0 && sold <= purchase * 0.15) return 'Low';
  return 'Normal';
}

function createSizeRecord(sizeKey, source = {}, baseSku = '', baseBarcode = '') {
  const stock = Number(source.stock || 0);
  const soldQuantity = Number(source.soldQuantity || source.sold || 0);
  const purchaseQuantity = Number(source.purchaseQuantity || source.purchased || 0);
  const remainingQuantity = Number(source.remainingQuantity ?? stock);
  const lastSoldDate = source.lastSoldDate || null;
  const profit = Number(source.profit || 0);
  const demandLevel = source.demandLevel || (stock <= 2 ? 'Low' : soldQuantity >= 5 ? 'High' : 'Normal');
  const restockSuggestion = Number(source.restockSuggestion ?? Math.max(0, (Number(source.minStock || 2) - stock)));

  const sku = source.sku || generateVariantSku(baseSku, sizeKey) || '';
  const barcode = source.barcode || generateVariantBarcode(baseSku || baseBarcode, sizeKey) || '';

  return {
    size: sizeKey,
    stock,
    soldQuantity,
    purchaseQuantity,
    remainingQuantity,
    lastSoldDate,
    demandLevel,
    restockSuggestion,
    profit,
    sku,
    barcode,
  };
}

export function normalizeProductPayload(product = {}) {
  const baseStock = Number(product.stock || 0);
  const minStock = Math.max(1, Number(product.minStock || 5));
  const sizeType = String(product.sizeType || '').toLowerCase() || (String(product.category || '').toLowerCase().includes('pant') ? 'bottomwear' : String(product.category || '').toLowerCase().includes('shirt') ? 'topwear' : 'custom');
  const sizeKeys = getSizeOptions(sizeType);
  const incomingSizes = product.sizes && typeof product.sizes === 'object' ? product.sizes : {};
  const incomingSizeKeys = Object.keys(incomingSizes);
  const allSizeKeys = [...new Set([...(sizeKeys || []), ...incomingSizeKeys])];
  const normalizedSizes = Object.fromEntries(
    allSizeKeys.map((sizeKey) => [
      sizeKey,
      createSizeRecord(
        sizeKey,
        incomingSizes[sizeKey] || {},
        product.sku || product.barcode || product.id || '',
        product.barcode || product.sku || product.id || ''
      ),
    ])
  );

  const variantStockSum = Array.isArray(product.variants)
    ? product.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0)
    : 0;

  const sizeStockSum = Object.values(normalizedSizes).reduce((sum, size) => sum + Number(size.stock || 0), 0);
  // Prefer variant stock sum when variants exist — it is the source of truth
  const totalStock = Array.isArray(product.variants) && product.variants.length > 0
    ? variantStockSum
    : (baseStock || sizeStockSum || 0);
  const soldQuantity = Number(product.soldQuantity || product.totalSold || 0);
  const purchaseQuantity = Number(product.purchaseQuantity || 0);
  const totalProfit = Number(product.profit || 0);

  return {
    ...product,
    sku: normalizeBarcodeValue(product.sku || ''),
    barcode: normalizeBarcodeValue(product.barcode || ''),
    price: Number(product.price ?? product.salePrice ?? 0),
    costPrice: Number(product.costPrice || 0),
    stock: totalStock,
    minStock,
    sizeType,
    sizes: normalizedSizes,
    variants: Array.isArray(product.variants)
      ? product.variants.filter(Boolean).map((variant, index) => ({
          // Preserve ALL variant fields — do NOT strip label, size, color, sku, barcode, minStock, status
          ...variant,
          id: variant.id || `${product.id || 'prod'}-variant-${index + 1}`,
          // label is the user-defined display name — always preserve it
          label: variant.label || variant.name || [variant.size, variant.color].filter(Boolean).join(' / ') || `Variant ${index + 1}`,
          name: variant.name || variant.label || `Variant ${index + 1}`,
          barcode: variant.barcode || '',
          sku: variant.sku || '',
          size: variant.size || '',
          color: variant.color || '',
          price: Number(variant.price ?? variant.salePrice ?? product.price ?? product.salePrice ?? 0),
          costPrice: Number(variant.costPrice ?? product.costPrice ?? 0),
          stock: Number(variant.stock || 0),
          minStock: Number(variant.minStock ?? product.minStock ?? 0),
          taxRate: Number(variant.taxRate ?? product.taxRate ?? 0),
          status: variant.status || 'Active',
          active: variant.active !== false && variant.status !== 'Inactive',
          batchNumber: variant.batchNumber || '',
        }))
      : [],
    purchaseQuantity,
    soldQuantity,
    totalSold: soldQuantity,
    profit: totalProfit,
    lastSoldDate: product.lastSoldDate || null,
    demandLevel: product.demandLevel || getDemandLevel({ ...product, stock: totalStock, minStock }),
    restockSuggestion: product.restockSuggestion ?? getRestockSuggestion({ ...product, stock: totalStock, minStock }),
    isActive: product.isActive !== false,
    referenceImage: product.referenceImage || '',
    categoryIcon: product.categoryIcon || '',
  };
}

export function deriveProductStockSummary(product) {
  const normalized = normalizeProductPayload(product);
  const sizes = normalized.sizes || {};
  const sizeLocked = Object.values(sizes).reduce((sum, size) => sum + Number(size.stock || 0), 0);
  const totalStock = Number(normalized.stock || sizeLocked || 0);
  const totalSold = Number(normalized.soldQuantity || normalized.totalSold || 0);
  const totalPurchase = Number(normalized.purchaseQuantity || 0);
  const totalProfit = Number(normalized.profit || 0);
  const lowStock = totalStock <= Number(normalized.minStock || 5);

  return {
    totalStock,
    totalSold,
    totalPurchase,
    totalProfit,
    lowStock,
    demandLevel: normalized.demandLevel,
    restockSuggestion: normalized.restockSuggestion,
    sizeStock: sizeLocked,
  };
}

export function computeInventoryAnalytics(products = []) {
  const normalized = products.map(normalizeProductPayload);
  const fastMoving = [];
  const slowMoving = [];
  const deadStock = [];
  const lowStockAlerts = [];
  const overStockAlerts = [];
  const categoryPerformance = {};
  const sizePerformance = [];

  normalized.forEach((product) => {
    const summary = deriveProductStockSummary(product);
    const sold = Number(summary.totalSold || 0);
    const purchased = Number(summary.totalPurchase || 0);
    const daysSinceLastSale = product.lastSoldDate
      ? Math.max(0, Math.floor((Date.now() - new Date(product.lastSoldDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 999;

    if (sold >= 5 && summary.totalStock <= Math.max(3, purchased * 0.2)) {
      fastMoving.push({ productId: product.id, productName: product.name, sold, stock: summary.totalStock, score: 'high' });
    }

    if (sold <= 1 || daysSinceLastSale >= 45) {
      slowMoving.push({ productId: product.id, productName: product.name, sold, daysSinceLastSale });
    }

    const isStale = daysSinceLastSale >= 90;
    if (summary.totalStock >= Math.max(20, purchased * 0.5) && (sold === 0 || (sold <= 1 && isStale))) {
      deadStock.push({ productId: product.id, productName: product.name, stock: summary.totalStock, daysSinceLastSale });
    }

    if (summary.lowStock) {
      lowStockAlerts.push({ productId: product.id, productName: product.name, stock: summary.totalStock, minStock: product.minStock });
    }

    if (summary.totalStock >= Math.max(25, Number(product.maxStock || 0))) {
      overStockAlerts.push({ productId: product.id, productName: product.name, stock: summary.totalStock });
    }

    const cat = String(product.category || 'Uncategorized');
    categoryPerformance[cat] = (categoryPerformance[cat] || 0) + Math.max(0, Number(product.price || 0) * Number(summary.totalSold || 0));

    Object.values(product.sizes || {}).forEach((sizeData) => {
      const soldQuantity = Number(sizeData.soldQuantity || 0);
      const stock = Number(sizeData.stock || 0);
      const remainingQuantity = Number(sizeData.remainingQuantity ?? stock);
      sizePerformance.push({
        productId: product.id,
        productName: product.name,
        size: sizeData.size,
        stock,
        soldQuantity,
        remainingQuantity,
        demandLevel: sizeData.demandLevel,
        restockSuggestion: sizeData.restockSuggestion,
        profit: round2(sizeData.profit || 0),
      });
    });
  });

  const sortedSizePerformance = sizePerformance
    .sort((a, b) => b.soldQuantity - a.soldQuantity)
    .slice(0, 12);

  const mostPopularSizes = [...sortedSizePerformance].sort((a, b) => b.soldQuantity - a.soldQuantity).slice(0, 5);
  const leastSoldSizes = [...sortedSizePerformance].sort((a, b) => a.soldQuantity - b.soldQuantity).slice(0, 5);

  return {
    fastMoving,
    slowMoving,
    deadStock,
    lowStockAlerts,
    overStockAlerts,
    sizePerformance: sortedSizePerformance,
    mostPopularSizes,
    leastSoldSizes,
    categoryPerformance: Object.entries(categoryPerformance).map(([name, value]) => ({ name, value: round2(value) })),
  };
}

/**
 * CENTRALIZED INVENTORY ENGINE
 * Single source of truth for all stock operations across the entire POS system.
 * Every module (POS, Purchases, Returns, Exchanges, Transfers, Adjustments) MUST
 * use these functions — never update stock directly.
 *
 * Stock Formula:
 *   Available = Stock In (Purchase + Return + Manual+) - Stock Out (Sale + Damage + Transfer + Exchange)
 */

import { initDB } from '../db/db';

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getVariantSafe(db, variantId) {
  if (!variantId) return null;
  try { return await db.get('variants', Number(variantId)); } catch { return null; }
}

async function recalcProductStock(db, productId) {
  try {
    const allVariants = await db.getAllFromIndex('variants', 'productId', Number(productId));
    const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
    const prod = await db.get('products', Number(productId));
    if (prod) {
      await db.put('products', { ...prod, stock: sum, updatedAt: new Date().toISOString() });
    }
    return sum;
  } catch { return 0; }
}

// ─── Core stock adjustment ────────────────────────────────────────────────────

/**
 * Adjust stock for a variant (positive = stock in, negative = stock out).
 * Always records a stock movement for the audit trail.
 *
 * @param {boolean} auditOnly  When true, only write the movement record — do NOT
 *   touch variant/product stock.  Use this when the caller (e.g. addInvoice) has
 *   already updated stock inside its own atomic transaction to avoid double-counting.
 */
export async function adjustVariantStock({
  productId,
  variantId,
  delta,           // positive = stock in, negative = stock out
  type,            // 'Sale' | 'Purchase In' | 'Return In' | 'Manual Adjustment' | 'Transfer Out' | 'Transfer In' | 'Exchange Out' | 'Exchange In' | 'Damage'
  reason = '',
  notes = '',
  referenceId = null,    // invoiceId / purchaseId / returnId / transferId
  referenceNumber = '',  // human-readable ref
  batchNumber = '',
  oldQuantity = null,
  newQuantity = null,
  oldBatchNumber = '',
  createdBy = 'System',
  date = null,
  auditOnly = false,     // NEW: when true skip stock mutation — only write movement log
}) {
  const db = await initDB();
  const now = new Date().toISOString();
  const moveDate = date || now;

  if (!auditOnly) {
    // Update variant stock in standalone variants store
    if (variantId) {
      const variant = await getVariantSafe(db, variantId);
      if (variant && variant.productId === Number(productId)) {
        const newStock = Math.max(0, Number(variant.stock || 0) + Number(delta));
        await db.put('variants', {
          ...variant,
          stock: newStock,
          updatedAt: now,
        });
        // Also mirror to product.variants[] embedded array
        await syncVariantToProductDoc(db, productId, variantId, newStock);
      }
    }

    // Recalculate product aggregate stock
    await recalcProductStock(db, productId);
  }

  // Record stock movement (audit trail)
  await db.add('stockMovements', {
    type,
    productId: Number(productId),
    variantId: variantId ? Number(variantId) : null,
    quantity: Number(delta),
    reason: reason || type,
    notes: notes || '',
    referenceId: referenceId || null,
    referenceNumber: referenceNumber || '',
    batchNumber: batchNumber || '',
    oldQuantity: oldQuantity != null ? Number(oldQuantity) : null,
    newQuantity: newQuantity != null ? Number(newQuantity) : null,
    oldBatchNumber: oldBatchNumber || '',
    createdBy,
    date: moveDate,
    createdAt: now,
  });
}

/**
 * Mirror variant stock change into the embedded product.variants[] array.
 * Keeps both storage systems in sync.
 */
async function syncVariantToProductDoc(db, productId, variantId, newStock) {
  try {
    const prod = await db.get('products', Number(productId));
    if (!prod || !Array.isArray(prod.variants)) return;
    const updatedVariants = prod.variants.map((v) => {
      if (String(v.id) === String(variantId)) {
        return { ...v, stock: newStock, updatedAt: new Date().toISOString() };
      }
      return v;
    });
    await db.put('products', { ...prod, variants: updatedVariants, updatedAt: new Date().toISOString() });
  } catch { /* non-fatal */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Called when a sale is completed. Reduces stock for each cart item.
 *  NOTE: Stock has already been deducted inside the addInvoice IndexedDB transaction.
 *  This function only writes the audit-trail movement record (auditOnly = true).
 */
export async function recordSaleStockOut({ items, invoiceId, invoiceNumber, createdBy = 'System', isRefund = false }) {
  for (const item of items || []) {
    const qty = Number(item.qty || 0);
    if (qty <= 0) continue;
    const variantId = item.variantId || item.variant?.id || null;
    const productId = item.productId;
    if (!productId) continue;

    // delta: negative for sale, positive for refund (mirrors what the transaction did)
    const delta = isRefund ? qty : -qty;

    await adjustVariantStock({
      productId,
      variantId,
      delta,
      type: isRefund ? 'Return In' : 'Sale',
      reason: isRefund ? 'Refund' : 'Sale',
      notes: `Invoice ${invoiceNumber || invoiceId || ''}`,
      referenceId: invoiceId,
      referenceNumber: invoiceNumber || '',
      createdBy,
      auditOnly: true,  // Stock already updated in the atomic transaction — log only
    });
  }
}

/** Called when a sale is refunded/returned. Restores stock. */
export async function recordReturnStockIn({ items, returnId, invoiceNumber, reason = 'Return', createdBy = 'System' }) {
  for (const item of items || []) {
    const qty = Number(item.qty || item.quantity || 0);
    if (qty <= 0) continue;
    const variantId = item.variantId || item.variant?.id || null;
    const productId = item.productId;
    if (!productId) continue;

    await adjustVariantStock({
      productId,
      variantId,
      delta: qty,
      type: 'Return In',
      reason,
      notes: `Return from invoice ${invoiceNumber || ''}`,
      referenceId: returnId,
      referenceNumber: String(returnId || ''),
      createdBy,
    });
  }
}

/** Called when stock is received via purchase.
 *  Pass auditOnly: true when the caller has already updated stock directly
 *  (e.g. addInventoryBatch) to avoid double-counting. */
export async function recordPurchaseStockIn({ productId, variantId, quantity, batchId, batchNumber, supplierId, notes = '', createdBy = 'System', date = null, auditOnly = false }) {
  await adjustVariantStock({
    productId,
    variantId,
    delta: Number(quantity),
    type: 'Purchase In',
    reason: 'Purchase In',
    notes: notes || `Batch ${batchNumber || ''}`,
    referenceId: batchId,
    referenceNumber: batchNumber || '',
    createdBy,
    date,
    auditOnly,
  });
}

/** Called when stock transfer is created (reduces source). */
export async function recordTransferOut({ productId, variantId, quantity, transferId, notes = '', createdBy = 'System' }) {
  await adjustVariantStock({
    productId,
    variantId,
    delta: -Number(quantity),
    type: 'Transfer Out',
    reason: 'Transfer Out',
    notes,
    referenceId: transferId,
    referenceNumber: String(transferId || ''),
    createdBy,
  });
}

/** Called when stock transfer is received (increases destination, if applicable). */
export async function recordTransferIn({ productId, variantId, quantity, transferId, notes = '', createdBy = 'System' }) {
  await adjustVariantStock({
    productId,
    variantId,
    delta: Number(quantity),
    type: 'Transfer In',
    reason: 'Transfer In',
    notes,
    referenceId: transferId,
    referenceNumber: String(transferId || ''),
    createdBy,
  });
}

/** Manual stock adjustment (positive or negative). */
export async function recordManualAdjustment({ productId, variantId, delta, quantity, reason = 'Manual Adjustment', notes = '', batchNumber = '', oldQuantity = null, newQuantity = null, oldBatchNumber = '', createdBy = 'System', auditOnly = false }) {
  // Accept either 'delta' or 'quantity' field name for convenience
  const effectiveDelta = Number(delta ?? quantity ?? 0);
  await adjustVariantStock({
    productId,
    variantId,
    delta: effectiveDelta,
    type: 'Manual Adjustment',
    reason,
    notes,
    referenceNumber: batchNumber || '',
    batchNumber,
    oldQuantity,
    newQuantity,
    oldBatchNumber,
    createdBy,
    auditOnly,
  });
}

/** Get real available stock for a variant (reads from variants store). */
export async function getVariantStock(variantId) {
  const db = await initDB();
  const variant = await getVariantSafe(db, variantId);
  return variant ? Math.max(0, Number(variant.stock || 0)) : 0;
}

/** Get total stock across all variants for a product. */
export async function getProductTotalStock(productId) {
  const db = await initDB();
  try {
    const allVariants = await db.getAllFromIndex('variants', 'productId', Number(productId));
    return allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
  } catch { return 0; }
}

/** Sync a product's embedded variants[] with the standalone variants store. */
export async function syncProductVariantsFromStore(productId) {
  const db = await initDB();
  try {
    const prod = await db.get('products', Number(productId));
    if (!prod) return;
    const storeVariants = await db.getAllFromIndex('variants', 'productId', Number(productId));
    if (storeVariants.length === 0) return;

    // Merge: update embedded variants to match store
    const updatedEmbedded = (Array.isArray(prod.variants) ? prod.variants : []).map((ev) => {
      const sv = storeVariants.find((s) => String(s.id) === String(ev.id));
      return sv ? { ...ev, stock: sv.stock, updatedAt: sv.updatedAt } : ev;
    });
    const sum = updatedEmbedded.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
    await db.put('products', { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: new Date().toISOString() });
  } catch { /* non-fatal */ }
}

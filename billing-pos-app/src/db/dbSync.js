// dbSync.js - Database operations with automatic network synchronization
// Wraps existing db.js operations to add sync capability without breaking existing code

import * as db from './db';

let syncEngine = null;
let networkSyncContext = null;

/**
 * Initialize sync integration
 * @param {Object} syncEngineInstance - DataSyncEngine instance
 * @param {Object} syncContext - NetworkSyncContext
 */
export const initializeSyncIntegration = (syncEngineInstance, syncContext) => {
  syncEngine = syncEngineInstance;
  networkSyncContext = syncContext;
  console.log('Database sync integration initialized');
};

/**
 * Queue sync for a database operation
 * @param {string} store - Store name
 * @param {string} operation - add, put, delete
 * @param {Object} data - Data
 */
const queueSync = async (store, operation, data) => {
  if (!syncEngine || !networkSyncContext) return;
  
  // Only sync if connected
  const { isConnected } = networkSyncContext;
  if (!isConnected) return;

  try {
    await syncEngine.queueSync(store, operation, data);
  } catch (error) {
    console.error('Sync queue error:', error);
  }
};

// ============================================================
// WRAPPED DATABASE OPERATIONS WITH SYNC
// ============================================================

/**
 * Add record with sync
 */
export const dbAdd = async (store, data) => {
  const id = await db.dbAdd(store, data);
  
  // Queue sync
  await queueSync(store, 'add', { ...data, id });
  
  return id;
};

/**
 * Update record with sync
 */
export const dbPut = async (store, data) => {
  const result = await db.dbPut(store, data);
  
  // Queue sync
  await queueSync(store, 'put', data);
  
  return result;
};

/**
 * Delete record with sync
 */
export const dbDelete = async (store, id) => {
  await db.dbDelete(store, id);
  
  // Queue sync
  await queueSync(store, 'delete', { id });
  
  return;
};

/**
 * Create variant with sync
 */
export const createVariant = async (productId, variantData) => {
  const variantId = await db.createVariant(productId, variantData);
  
  // Get the created variant for sync
  const variant = await db.dbGet('variants', variantId);
  await queueSync('variants', 'add', variant);
  
  // Sync barcode lookup if exists
  if (variant.barcode) {
    const barcodeRecord = await db.dbGet('variantBarcodes', variant.barcode);
    if (barcodeRecord) {
      await queueSync('variantBarcodes', 'add', barcodeRecord);
    }
  }
  
  return variantId;
};

/**
 * Update variant with sync
 */
export const updateVariant = async (variantId, updates) => {
  await db.updateVariant(variantId, updates);
  
  // Get updated variant for sync
  const variant = await db.dbGet('variants', variantId);
  await queueSync('variants', 'put', variant);
  
  return;
};

/**
 * Delete variant with sync
 */
export const deleteVariant = async (variantId) => {
  // Get variant before deletion to sync barcode removal
  const variant = await db.dbGet('variants', variantId);
  
  await db.deleteVariant(variantId);
  
  // Queue sync
  await queueSync('variants', 'delete', { id: variantId });
  
  if (variant?.barcode) {
    await queueSync('variantBarcodes', 'delete', { barcode: variant.barcode });
  }
  
  return;
};

/**
 * Update variant stock with sync
 */
export const updateVariantStock = async (variantId, newStock) => {
  await db.updateVariantStock(variantId, newStock);
  
  // Get updated variant for sync
  const variant = await db.dbGet('variants', variantId);
  await queueSync('variants', 'put', variant);
  
  return;
};

/**
 * Record stock movement with sync
 */
export const recordStockMovement = async (movement) => {
  const id = await db.recordStockMovement(movement);
  
  // Get the created movement for sync
  const stockMovement = await db.dbGet('stockMovements', id);
  await queueSync('stockMovements', 'add', stockMovement);
  
  return id;
};

/**
 * Create inventory batch with sync
 */
export const createInventoryBatch = async (batchData) => {
  const id = await db.createInventoryBatch(batchData);
  
  // Get the created batch for sync
  const batch = await db.dbGet('inventoryBatches', id);
  await queueSync('inventoryBatches', 'add', batch);
  
  return id;
};

/**
 * Log barcode print with sync
 */
export const logBarcodePrint = async (entry) => {
  const id = await db.logBarcodePrint(entry);
  
  // Get the created log for sync
  const log = await db.dbGet('barcodePrintLogs', id);
  await queueSync('barcodePrintLogs', 'add', log);
  
  return id;
};

/**
 * Reserve professional invoice number with sync
 */
export const reserveProfessionalInvoiceNumber = async (invoiceConfig) => {
  // This operation modifies settings store
  const invoiceNumber = await db.reserveProfessionalInvoiceNumber(invoiceConfig);
  
  // Sync the invoice config settings
  const settingsStore = await db.initDB();
  const config = {
    prefix: String(invoiceConfig?.invoicePrefix || 'I_SRC').trim() || 'I_SRC',
    dateFormat: String(invoiceConfig?.invoiceDateFormat || 'DDMMYY').trim(),
    sequenceDigits: Math.max(3, Math.min(8, Number(invoiceConfig?.invoiceSequenceDigits) || 6)),
  };
  
  // Note: We don't sync the counter itself to prevent conflicts
  // Each device maintains its own sequence
  
  return invoiceNumber;
};

/**
 * Set setting with sync
 */
export const setSetting = async (key, value) => {
  await db.setSetting(key, value);
  
  // Sync setting (exclude network settings to prevent loops)
  if (!key.startsWith('network_')) {
    await queueSync('settings', 'put', { key, value });
  }
  
  return;
};

// ============================================================
// RE-EXPORT NON-MODIFYING OPERATIONS (READ-ONLY)
// ============================================================

export const initDB = db.initDB;
export const dbGetAll = db.dbGetAll;
export const dbGet = db.dbGet;
export const dbGetByIndex = db.dbGetByIndex;
export const dbClear = db.dbClear;
export const getSetting = db.getSetting;
export const exportBackup = db.exportBackup;
export const importBackup = db.importBackup;
export const getProductVariants = db.getProductVariants;
export const getVariantByBarcode = db.getVariantByBarcode;
export const getVariantWithProduct = db.getVariantWithProduct;
export const searchVariants = db.searchVariants;

// ============================================================
// SYNC-AWARE BATCH OPERATIONS
// ============================================================

/**
 * Batch update with sync
 * @param {string} store - Store name
 * @param {Array} items - Items to update
 */
export const batchUpdate = async (store, items) => {
  const dbInstance = await db.initDB();
  const tx = dbInstance.transaction(store, 'readwrite');
  
  for (const item of items) {
    await tx.store.put(item);
    // Queue each item for sync
    await queueSync(store, 'put', item);
  }
  
  await tx.done;
};

/**
 * Batch add with sync
 * @param {string} store - Store name
 * @param {Array} items - Items to add
 */
export const batchAdd = async (store, items) => {
  const results = [];
  
  for (const item of items) {
    const id = await dbAdd(store, item);
    results.push(id);
  }
  
  return results;
};

/**
 * Batch delete with sync
 * @param {string} store - Store name
 * @param {Array} ids - IDs to delete
 */
export const batchDelete = async (store, ids) => {
  for (const id of ids) {
    await dbDelete(store, id);
  }
};

// ============================================================
// INVOICE-SPECIFIC OPERATIONS WITH SYNC
// ============================================================

/**
 * Create invoice with automatic sync
 * @param {Object} invoiceData - Invoice data
 */
export const createInvoice = async (invoiceData) => {
  const id = await dbAdd('invoices', invoiceData);
  
  // Update customer's last purchase info
  if (invoiceData.customerId) {
    const customer = await dbGet('customers', invoiceData.customerId);
    if (customer) {
      await dbPut('customers', {
        ...customer,
        last_purchase_date: invoiceData.date || new Date().toISOString(),
        total_purchases: (customer.total_purchases || 0) + 1,
        total_spent: (customer.total_spent || 0) + (invoiceData.total || 0),
      });
    }
  }
  
  // Record stock movements for invoice items
  if (invoiceData.items && Array.isArray(invoiceData.items)) {
    for (const item of invoiceData.items) {
      if (item.variantId) {
        await recordStockMovement({
          variantId: item.variantId,
          productId: item.productId,
          quantity: -Math.abs(item.quantity),
          type: 'sale',
          reason: `Invoice ${invoiceData.invoiceNumber}`,
          referenceId: id,
          date: invoiceData.date || new Date().toISOString(),
        });
        
        // Update variant stock
        const variant = await dbGet('variants', item.variantId);
        if (variant) {
          const newStock = Math.max(0, (variant.stock || 0) - Math.abs(item.quantity));
          await updateVariantStock(item.variantId, newStock);
        }
      }
    }
  }
  
  return id;
};

/**
 * Update invoice with sync
 * @param {number} invoiceId - Invoice ID
 * @param {Object} updates - Updates to apply
 */
export const updateInvoice = async (invoiceId, updates) => {
  const existing = await dbGet('invoices', invoiceId);
  const updated = { ...existing, ...updates };
  await dbPut('invoices', updated);
  
  return;
};

// ============================================================
// PRODUCT OPERATIONS WITH SYNC
// ============================================================

/**
 * Create product with sync
 * @param {Object} productData - Product data
 */
export const createProduct = async (productData) => {
  const id = await dbAdd('products', productData);
  
  // If product has variants, create them
  if (productData.variants && Array.isArray(productData.variants)) {
    for (const variantData of productData.variants) {
      await createVariant(id, variantData);
    }
  }
  
  return id;
};

/**
 * Update product with sync
 * @param {number} productId - Product ID
 * @param {Object} updates - Updates to apply
 */
export const updateProduct = async (productId, updates) => {
  const existing = await dbGet('products', productId);
  const updated = { ...existing, ...updates };
  await dbPut('products', updated);
  
  return;
};

/**
 * Delete product with sync (soft delete)
 * @param {number} productId - Product ID
 */
export const deleteProduct = async (productId) => {
  // Soft delete - mark as archived
  const product = await dbGet('products', productId);
  if (product) {
    await dbPut('products', {
      ...product,
      archived: true,
      archivedAt: new Date().toISOString(),
    });
  }
  
  // Archive all variants
  const variants = await db.getProductVariants(productId);
  for (const variant of variants) {
    await dbPut('variants', {
      ...variant,
      archived: true,
      archivedAt: new Date().toISOString(),
    });
  }
  
  return;
};

// ============================================================
// CUSTOMER OPERATIONS WITH SYNC
// ============================================================

/**
 * Create customer with sync
 * @param {Object} customerData - Customer data
 */
export const createCustomer = async (customerData) => {
  const id = await dbAdd('customers', customerData);
  return id;
};

/**
 * Update customer with sync
 * @param {number} customerId - Customer ID
 * @param {Object} updates - Updates to apply
 */
export const updateCustomer = async (customerId, updates) => {
  const existing = await dbGet('customers', customerId);
  const updated = { ...existing, ...updates };
  await dbPut('customers', updated);
  
  return;
};

// ============================================================
// EXPORT ALL
// ============================================================

export default {
  initializeSyncIntegration,
  initDB,
  dbGetAll,
  dbGet,
  dbAdd,
  dbPut,
  dbDelete,
  dbGetByIndex,
  dbClear,
  getSetting,
  setSetting,
  exportBackup,
  importBackup,
  createVariant,
  updateVariant,
  deleteVariant,
  updateVariantStock,
  getProductVariants,
  getVariantByBarcode,
  getVariantWithProduct,
  searchVariants,
  recordStockMovement,
  createInventoryBatch,
  logBarcodePrint,
  reserveProfessionalInvoiceNumber,
  batchUpdate,
  batchAdd,
  batchDelete,
  createInvoice,
  updateInvoice,
  createProduct,
  updateProduct,
  deleteProduct,
  createCustomer,
  updateCustomer,
};

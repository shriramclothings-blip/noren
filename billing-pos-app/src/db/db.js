// IndexedDB wrapper using idb library
import { openDB } from 'idb';
import { buildInvoiceNumber } from '../utils/inventoryAnalytics';
import { normalizeBarcodeValue } from '../utils/barcodeEngine';
import { buildBatchNumber } from '../utils/productInventoryModel';

const DB_NAME = 'BillingPOS';
// IMPORTANT: bump version when adding stores/indexes to avoid data loss.
// v11: Added sku index on products, name index on products, batchNumber index,
//      sku+barcode indexes on variants, productId+batchNumber indexes on inventoryBatches,
//      archived flag support — enterprise-grade product architecture.
// v12: Added auditLogs, softDeletes stores. Added variantId index on stockMovements.
//      Added 'type' index on stockMovements. Returns/stockTransfers get variantId fields.
// v13: Added cloud sync queue and log stores for background synchronization.
// v14: Added warehouseStock store for Warehouse & Godown management feature.
// v15: Added heldBills (persistent hold bill), pointsLedger (loyalty history),
//      customerGroups, customerCommsLog stores.
// v16: Added supplierContacts, supplierBankAccounts, supplierDocuments,
//      supplierPayments, supplierLedger, supplierReturns, supplierNotes stores.
const DB_VERSION = 16;

// Jest + SSR safety: if there's no IndexedDB (or we're in unit tests), return a mock API.
const createMockDBApi = () => ({
  getAll: async () => [],
  get: async () => undefined,
  add: async () => 1,
  put: async () => undefined,
  delete: async () => undefined,
  clear: async () => undefined,
  getAllFromIndex: async () => [],
});

export const initDB = () => {
  // Avoid opening IndexedDB in Jest/unit tests or non-browser envs.
  if (
    process.env.NODE_ENV === 'test' ||
    typeof window === 'undefined' ||
    typeof indexedDB === 'undefined'
  ) {
    return createMockDBApi();
  }

  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, tx) {
      // Products / Inventory
      if (!db.objectStoreNames.contains('products')) {
        const ps = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        ps.createIndex('category', 'category');
        ps.createIndex('barcode', 'barcode', { unique: false });
        ps.createIndex('sku', 'sku', { unique: false });
        ps.createIndex('name', 'name', { unique: false });
        ps.createIndex('archived', 'archived', { unique: false });
      } else {
        // v11: add missing indexes to existing products store
        try {
          const ps = tx.objectStore('products');
          if (!ps.indexNames.contains('sku')) ps.createIndex('sku', 'sku', { unique: false });
          if (!ps.indexNames.contains('name')) ps.createIndex('name', 'name', { unique: false });
          if (!ps.indexNames.contains('archived')) ps.createIndex('archived', 'archived', { unique: false });
        } catch { /* safe no-op */ }
      }

      // Categories
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
      }

      // Customers
      if (!db.objectStoreNames.contains('customers')) {
        const cs = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        cs.createIndex('phone', 'phone');
        cs.createIndex('customer_behavior_type', 'customer_behavior_type');
        cs.createIndex('last_purchase_date', 'last_purchase_date');
      } else {
        try {
          const cs = tx.objectStore('customers');
          if (!cs.indexNames.contains('customer_behavior_type')) {
            cs.createIndex('customer_behavior_type', 'customer_behavior_type');
          }
          if (!cs.indexNames.contains('last_purchase_date')) {
            cs.createIndex('last_purchase_date', 'last_purchase_date');
          }
        } catch {
          // Safe no-op for environments where the upgrade transaction store is unavailable.
        }
      }

      // Invoices
      if (!db.objectStoreNames.contains('invoices')) {
        const inv = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
        inv.createIndex('date', 'date');
        inv.createIndex('customerId', 'customerId');
        // Non-unique index for fast lookups + duplicate prevention checks in code.
        // (We keep it non-unique to avoid upgrade failures if legacy data has duplicates.)
        inv.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
        inv.createIndex('customerBarcode', 'customerBarcode', { unique: false });
      } else {
        // Add missing indexes safely on upgrade
        try {
          const inv = tx.objectStore('invoices');
          if (!inv.indexNames.contains('invoiceNumber')) {
            inv.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
          }
          if (!inv.indexNames.contains('customerBarcode')) {
            inv.createIndex('customerBarcode', 'customerBarcode', { unique: false });
          }
        } catch {
          // Ignore: some environments/tests may not expose upgrade tx store (safe no-op)
        }
      }

      // Suppliers
      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
      }

      // Purchases
      if (!db.objectStoreNames.contains('purchases')) {
        const pur = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
        pur.createIndex('date', 'date');
        pur.createIndex('supplierId', 'supplierId');
      }

      // Product size and variant inventory details
      if (!db.objectStoreNames.contains('productSizes')) {
        const sizeStore = db.createObjectStore('productSizes', { keyPath: 'id', autoIncrement: true });
        sizeStore.createIndex('productId', 'productId');
        sizeStore.createIndex('variantId', 'variantId');
        sizeStore.createIndex('size', 'size');
        sizeStore.createIndex('barcode', 'barcode');
      }

      // Variants - new professional size/variant management system
      if (!db.objectStoreNames.contains('variants')) {
        const variants = db.createObjectStore('variants', { keyPath: 'id', autoIncrement: true });
        variants.createIndex('productId', 'productId');
        variants.createIndex('barcode', 'barcode', { unique: false });
        variants.createIndex('sku', 'sku', { unique: false });
        variants.createIndex('status', 'status', { unique: false });
        variants.createIndex('archived', 'archived', { unique: false });
      } else {
        try {
          const vs = tx.objectStore('variants');
          if (!vs.indexNames.contains('status')) vs.createIndex('status', 'status', { unique: false });
          if (!vs.indexNames.contains('archived')) vs.createIndex('archived', 'archived', { unique: false });
        } catch { /* safe no-op */ }
      }

      // Inventory batches - each purchase creates a permanent batch.
      if (!db.objectStoreNames.contains('inventoryBatches')) {
        const batches = db.createObjectStore('inventoryBatches', { keyPath: 'id', autoIncrement: true });
        batches.createIndex('variantId', 'variantId');
        batches.createIndex('productId', 'productId');
        batches.createIndex('batchNumber', 'batchNumber', { unique: false });
        batches.createIndex('supplierId', 'supplierId');
        batches.createIndex('purchaseDate', 'purchaseDate');
      }

      // Stock movements - full audit trail for inventory changes.
      if (!db.objectStoreNames.contains('stockMovements')) {
        const sm = db.createObjectStore('stockMovements', { keyPath: 'id', autoIncrement: true });
        sm.createIndex('productId', 'productId');
        sm.createIndex('variantId', 'variantId');
        sm.createIndex('type', 'type');
        sm.createIndex('date', 'date');
        sm.createIndex('reason', 'reason');
      }

      // Barcode print logs - audit trail for label printing.
      if (!db.objectStoreNames.contains('barcodePrintLogs')) {
        const logs = db.createObjectStore('barcodePrintLogs', { keyPath: 'id', autoIncrement: true });
        logs.createIndex('productId', 'productId');
        logs.createIndex('variantId', 'variantId');
        logs.createIndex('barcode', 'barcode');
        logs.createIndex('date', 'date');
      }

      // Variant Barcode Lookup - O(1) barcode scanning
      if (!db.objectStoreNames.contains('variantBarcodes')) {
        const barcodes = db.createObjectStore('variantBarcodes', { keyPath: 'barcode' });
        barcodes.createIndex('variantId', 'variantId');
        barcodes.createIndex('productId', 'productId');
      }

      // Staff
      if (!db.objectStoreNames.contains('staff')) {
        db.createObjectStore('staff', { keyPath: 'id', autoIncrement: true });
      }

      // Activity Log
      if (!db.objectStoreNames.contains('activity')) {
        const act = db.createObjectStore('activity', { keyPath: 'id', autoIncrement: true });
        act.createIndex('date', 'date');
      }

      // Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Invoice configuration, for format-safe sequential invoice numbering and multi-device offline safety.
      if (!db.objectStoreNames.contains('invoiceConfigs')) {
        db.createObjectStore('invoiceConfigs', { keyPath: 'key' });
      }

      // Expenses
      if (!db.objectStoreNames.contains('expenses')) {
        const exp = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        exp.createIndex('date', 'date');
      }

      // App Logs (for crash/error diagnostics)
      if (!db.objectStoreNames.contains('logs')) {
        const logs = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        logs.createIndex('date', 'date');
        logs.createIndex('level', 'level');
      }

      // Payment Attempts (UPI automation state machine)
      // Stored so we can prevent duplicates and resume safely after app restart.
      if (!db.objectStoreNames.contains('paymentAttempts')) {
        const pa = db.createObjectStore('paymentAttempts', { keyPath: 'id' });
        pa.createIndex('status', 'status');
        pa.createIndex('orderId', 'orderId', { unique: true });
        pa.createIndex('invoiceId', 'invoiceId', { unique: false });
        pa.createIndex('createdAt', 'createdAt');
      }

      // Payment Activity Log (audit trail for UPI checks, webhooks, manual overrides)
      if (!db.objectStoreNames.contains('paymentLogs')) {
        const pl = db.createObjectStore('paymentLogs', { keyPath: 'id', autoIncrement: true });
        pl.createIndex('date', 'date');
        pl.createIndex('attemptId', 'attemptId');
        pl.createIndex('orderId', 'orderId');
        pl.createIndex('level', 'level');
      }

      // Stock Movements — full audit trail for every stock change
      if (!db.objectStoreNames.contains('stockMovements')) {
        const sm = db.createObjectStore('stockMovements', { keyPath: 'id', autoIncrement: true });
        sm.createIndex('productId', 'productId');
        sm.createIndex('date', 'date');
        sm.createIndex('reason', 'reason');
      }

      // Sales Returns / Exchanges
      if (!db.objectStoreNames.contains('returns')) {
        const ret = db.createObjectStore('returns', { keyPath: 'id', autoIncrement: true });
        ret.createIndex('invoiceId', 'invoiceId');
        ret.createIndex('status', 'status');
        ret.createIndex('date', 'date');
      }

      // Stock Transfers between locations
      if (!db.objectStoreNames.contains('stockTransfers')) {
        const transfers = db.createObjectStore('stockTransfers', { keyPath: 'id', autoIncrement: true });
        transfers.createIndex('status', 'status');
        transfers.createIndex('date', 'date');
        transfers.createIndex('productId', 'productId');
      } else {
        // v12: add variantId index if missing
        try {
          const ts = tx.objectStore('stockTransfers');
          if (!ts.indexNames.contains('variantId')) ts.createIndex('variantId', 'variantId');
        } catch { /* safe no-op */ }
      }

      // v12: Audit Logs — every user action (product edit, delete, restore, barcode print, etc.)
      if (!db.objectStoreNames.contains('auditLogs')) {
        const al = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
        al.createIndex('date', 'date');
        al.createIndex('action', 'action');
        al.createIndex('userId', 'userId');
        al.createIndex('entityType', 'entityType');
        al.createIndex('entityId', 'entityId');
      }

      // v12: Soft Deletes — archive of deleted records (products, variants, stock, transfers, returns)
      if (!db.objectStoreNames.contains('softDeletes')) {
        const sd = db.createObjectStore('softDeletes', { keyPath: 'id', autoIncrement: true });
        sd.createIndex('entityType', 'entityType');
        sd.createIndex('entityId', 'entityId');
        sd.createIndex('deletedAt', 'deletedAt');
      }

      // v12: ensure stockMovements has variantId + type indexes
      try {
        const sm = tx.objectStore('stockMovements');
        if (!sm.indexNames.contains('variantId')) sm.createIndex('variantId', 'variantId');
        if (!sm.indexNames.contains('type')) sm.createIndex('type', 'type');
      } catch { /* safe no-op */ }

      // v13: cloud sync queue + logs
      if (!db.objectStoreNames.contains('cloudSyncQueue')) {
        const queueStore = db.createObjectStore('cloudSyncQueue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('syncStatus', 'syncStatus');
        queueStore.createIndex('entityType', 'entityType');
        queueStore.createIndex('syncHash', 'syncHash');
        queueStore.createIndex('createdTime', 'createdTime');
      }

      if (!db.objectStoreNames.contains('cloudSyncLogs')) {
        const logsStore = db.createObjectStore('cloudSyncLogs', { keyPath: 'id', autoIncrement: true });
        logsStore.createIndex('dateTime', 'dateTime');
        logsStore.createIndex('status', 'status');
      }

      // v14: Warehouse Stock — per-product/variant warehouse (godown) quantities
      if (!db.objectStoreNames.contains('warehouseStock')) {
        const ws = db.createObjectStore('warehouseStock', { keyPath: 'id', autoIncrement: true });
        ws.createIndex('productId', 'productId');
        ws.createIndex('variantId', 'variantId');
      }

      // v14: Warehouse Movements — full audit trail for all warehouse ↔ rack transfers
      if (!db.objectStoreNames.contains('warehouseMovements')) {
        const wm = db.createObjectStore('warehouseMovements', { keyPath: 'id', autoIncrement: true });
        wm.createIndex('productId', 'productId');
        wm.createIndex('variantId', 'variantId');
        wm.createIndex('date', 'date');
        wm.createIndex('type', 'type');
        wm.createIndex('movedBy', 'movedBy');
      }

      // v15: Held Bills — persistent hold bill storage (survives refresh/restart)
      if (!db.objectStoreNames.contains('heldBills')) {
        const hb = db.createObjectStore('heldBills', { keyPath: 'id' });
        hb.createIndex('heldAt', 'heldAt');
        hb.createIndex('customerId', 'customerId');
      }

      // v15: Points Ledger — full per-customer points history (earn/redeem/expire/adjust)
      if (!db.objectStoreNames.contains('pointsLedger')) {
        const pl = db.createObjectStore('pointsLedger', { keyPath: 'id', autoIncrement: true });
        pl.createIndex('customerId', 'customerId');
        pl.createIndex('type', 'type');
        pl.createIndex('date', 'date');
      }

      // v15: Customer Groups
      if (!db.objectStoreNames.contains('customerGroups')) {
        db.createObjectStore('customerGroups', { keyPath: 'id', autoIncrement: true });
      }

      // v15: Customer Communication Log
      if (!db.objectStoreNames.contains('customerCommsLog')) {
        const cl = db.createObjectStore('customerCommsLog', { keyPath: 'id', autoIncrement: true });
        cl.createIndex('customerId', 'customerId');
        cl.createIndex('date', 'date');
      }

      // v16: Supplier Contacts — multiple contacts per supplier
      if (!db.objectStoreNames.contains('supplierContacts')) {
        const sc = db.createObjectStore('supplierContacts', { keyPath: 'id', autoIncrement: true });
        sc.createIndex('supplierId', 'supplierId');
      }

      // v16: Supplier Bank Accounts
      if (!db.objectStoreNames.contains('supplierBankAccounts')) {
        const sb = db.createObjectStore('supplierBankAccounts', { keyPath: 'id', autoIncrement: true });
        sb.createIndex('supplierId', 'supplierId');
      }

      // v16: Supplier Documents (GST cert, PAN, agreements, etc.)
      if (!db.objectStoreNames.contains('supplierDocuments')) {
        const sd = db.createObjectStore('supplierDocuments', { keyPath: 'id', autoIncrement: true });
        sd.createIndex('supplierId', 'supplierId');
        sd.createIndex('type', 'type');
      }

      // v16: Supplier Payments — every payment made to a supplier
      if (!db.objectStoreNames.contains('supplierPayments')) {
        const sp = db.createObjectStore('supplierPayments', { keyPath: 'id', autoIncrement: true });
        sp.createIndex('supplierId', 'supplierId');
        sp.createIndex('date', 'date');
        sp.createIndex('purchaseId', 'purchaseId');
        sp.createIndex('status', 'status');
      }

      // v16: Supplier Ledger — running balance per supplier
      if (!db.objectStoreNames.contains('supplierLedger')) {
        const sl = db.createObjectStore('supplierLedger', { keyPath: 'id', autoIncrement: true });
        sl.createIndex('supplierId', 'supplierId');
        sl.createIndex('date', 'date');
        sl.createIndex('type', 'type');
      }

      // v16: Supplier Returns — items returned to supplier
      if (!db.objectStoreNames.contains('supplierReturns')) {
        const sr = db.createObjectStore('supplierReturns', { keyPath: 'id', autoIncrement: true });
        sr.createIndex('supplierId', 'supplierId');
        sr.createIndex('purchaseId', 'purchaseId');
        sr.createIndex('date', 'date');
        sr.createIndex('status', 'status');
      }

      // v16: Supplier Notes / Communication Log
      if (!db.objectStoreNames.contains('supplierNotes')) {
        const sn = db.createObjectStore('supplierNotes', { keyPath: 'id', autoIncrement: true });
        sn.createIndex('supplierId', 'supplierId');
        sn.createIndex('date', 'date');
      }
    },
  });
};

function safeTimeZone() {
  // Node/Chromium generally supports "Asia/Kolkata". Some environments accept "Asia/Calcutta" too.
  return 'Asia/Calcutta';
}

function getInvoiceDateParts(now = new Date(), timeZone = safeTimeZone()) {
  const d = new Date(now);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .formatToParts(d)
    .reduce((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});

  const dd = String(parts.day || '').padStart(2, '0');
  const mm = String(parts.month || '').padStart(2, '0');
  const yy = String(parts.year || '').slice(-2).padStart(2, '0');
  const yyyy = String(parts.year || '').padStart(4, '0');
  return { dd, mm, yy, yyyy };
}

function formatInvoiceDateKey(format, parts) {
  const { dd, mm, yy, yyyy } = parts;
  switch (String(format || 'DDMMYY').toUpperCase()) {
    case 'YYMMDD':
      return `${yy}${mm}${dd}`;
    case 'YYYYMMDD':
      return `${yyyy}${mm}${dd}`;
    case 'DDMMYYYY':
      return `${dd}${mm}${yyyy}`;
    case 'MMDDYY':
      return `${mm}${dd}${yy}`;
    case 'DDMMYY':
    default:
      return `${dd}${mm}${yy}`;
  }
}

/**
 * Reserve the next PROFESSIONAL invoice number in an atomic IndexedDB transaction.
 * Format: DDMMXXXYY (XXX is 001..999 daily running sequence)
 *
 * NOTE: This "reserves" a number; if invoice creation fails later, the sequence may have a gap.
 * This is intentional to guarantee uniqueness and collision-free fast billing.
 */
export const reserveProfessionalInvoiceNumber = async (invoiceConfig = {}) => {
  const db = await initDB();
  const config = {
    prefix: String(invoiceConfig?.invoicePrefix || 'I_SRC').trim() || 'I_SRC',
    dateFormat: String(invoiceConfig?.invoiceDateFormat || 'DDMMYY').trim(),
    sequenceDigits: Math.max(3, Math.min(8, Number(invoiceConfig?.invoiceSequenceDigits) || 6)),
  };

  const dateKey = formatInvoiceDateKey(config.dateFormat, getInvoiceDateParts(new Date(), safeTimeZone()));
  const counterKey = `invoiceSeq:${config.prefix}:${config.dateFormat}:${dateKey}`;

  const tx = db.transaction(['settings', 'invoices'], 'readwrite');
  const settings = tx.objectStore('settings');
  const invoices = tx.objectStore('invoices');

  let invoiceNumberIndex = null;
  try {
    invoiceNumberIndex = invoices.index('invoiceNumber');
  } catch {
    invoiceNumberIndex = null;
  }

  const currentRow = await settings.get(counterKey);
  let seq = Number(currentRow?.value) || 0;

  for (let attempts = 0; attempts < 100; attempts++) {
    const next = seq + 1;
    const invoiceNumber = buildInvoiceNumber({
      prefix: config.prefix,
      dateKey,
      sequence: next,
      digits: config.sequenceDigits,
    });

    let exists = null;
    if (invoiceNumberIndex) {
      exists = await invoiceNumberIndex.get(invoiceNumber);
    } else {
      const all = await invoices.getAll();
      exists = (all || []).find((i) => String(i?.invoiceNumber || '') === invoiceNumber) || null;
    }

    if (!exists) {
      await settings.put({ key: counterKey, value: next });
      await tx.done;
      return invoiceNumber;
    }

    seq = next;
    if (next > Math.pow(10, config.sequenceDigits) - 1) {
      throw new Error(`Daily invoice sequence exceeded ${config.sequenceDigits} digits`);
    }
  }

  try { await tx.done; } catch {}
  throw new Error('Unable to reserve unique invoice number');
};

// Generic CRUD helpers
export const dbGetAll = async (store) => {
  const db = await initDB();
  return db.getAll(store);
};

export const dbGet = async (store, id) => {
  const db = await initDB();
  return db.get(store, id);
};

export const dbAdd = async (store, data) => {
  const db = await initDB();
  return db.add(store, { ...data, createdAt: new Date().toISOString() });
};

export const dbPut = async (store, data) => {
  const db = await initDB();
  return db.put(store, { ...data, updatedAt: new Date().toISOString() });
};

export const dbDelete = async (store, id) => {
  const db = await initDB();
  return db.delete(store, id);
};

export const dbGetByIndex = async (store, index, value) => {
  const db = await initDB();
  // idb exposes getAllFromIndex on the underlying transaction store API
  return db.getAllFromIndex(store, index, value);
};

export const recordStockMovement = async (movement) => {
  const db = await initDB();
  const payload = {
    ...movement,
    date: movement?.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  return db.add('stockMovements', payload);
};

export const createInventoryBatch = async (batchData = {}) => {
  const db = await initDB();
  const payload = {
    ...batchData,
    batchNumber: batchData?.batchNumber || buildBatchNumber('BT'),
    quantity: Number(batchData?.quantity || 0),
    purchaseCost: Number(batchData?.purchaseCost || 0),
    purchaseDate: batchData?.purchaseDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };
  return db.add('inventoryBatches', payload);
};

export const logBarcodePrint = async (entry = {}) => {
  const db = await initDB();
  const payload = {
    ...entry,
    date: entry?.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  return db.add('barcodePrintLogs', payload);
};

export const dbClear = async (store) => {
  const db = await initDB();
  return db.clear(store);
};

// Settings helpers
export const getSetting = async (key) => {
  const db = await initDB();
  const row = await db.get('settings', key);
  return row ? row.value : null;
};

export const setSetting = async (key, value) => {
  const db = await initDB();
  return db.put('settings', { key, value });
};

// Backup: export all data as JSON
export const exportBackup = async () => {
  const stores = [
    'products',
    'categories',
    'customers',
    'invoices',
    'suppliers',
    'purchases',
    'staff',
    'activity',
    'settings',
    'expenses',
    'logs',
    'paymentAttempts',
    'paymentLogs',
    'variants',
    'variantBarcodes',
    'returns',
    'stockTransfers',
    'inventoryBatches',
    'stockMovements',
    'barcodePrintLogs',
    'cloudSyncQueue',
    'cloudSyncLogs',
  ];

  const backup = {};
  for (const s of stores) {
    backup[s] = await dbGetAll(s);
  }
  return JSON.stringify(backup, null, 2);
};

// Restore from JSON backup
export const importBackup = async (jsonStr) => {
  const data = JSON.parse(jsonStr);
  const stores = Object.keys(data);

  for (const store of stores) {
    await dbClear(store);
    for (const item of data[store]) {
      const db = await initDB();
      await db.put(store, item);
    }
  }
};

// ============================================================
// VARIANT MANAGEMENT FUNCTIONS (Professional Size System)
// ============================================================

/**
 * Get all variants for a product
 * @param {number} productId
 * @returns {Promise<Array>}
 */
export const getProductVariants = async (productId) => {
  const db = await initDB();
  return db.getAllFromIndex('variants', 'productId', productId);
};

/**
 * Get variant by barcode (instant lookup for billing)
 * @param {string} barcode
 * @returns {Promise<Object|null>}
 */
export const getVariantByBarcode = async (barcode) => {
  const db = await initDB();
  const normalizedBarcode = normalizeBarcodeValue(barcode || '');
  if (!normalizedBarcode) return null;
  const barcodeRecord = await db.get('variantBarcodes', normalizedBarcode);
  if (!barcodeRecord) return null;
  return db.get('variants', barcodeRecord.variantId);
};

/**
 * Create a new variant for a product
 * @param {number} productId
 * @param {Object} variantData
 * @returns {Promise<number>} variantId
 */
export const createVariant = async (productId, variantData) => {
  const db = await initDB();
  const { barcode, sku, label, stock = 0, price, costPrice, taxRate } = variantData;
  const normalizedBarcode = normalizeBarcodeValue(barcode || '');
  const normalizedSku = normalizeBarcodeValue(sku || '');

  // Create variant
  const variantId = await db.add('variants', {
    productId,
    label,
    sku: normalizedSku,
    barcode: normalizedBarcode,
    stock: parseInt(stock) || 0,
    price: price ? parseFloat(price) : null,
    costPrice: costPrice ? parseFloat(costPrice) : null,
    taxRate: taxRate ? parseFloat(taxRate) : null,
    createdAt: new Date().toISOString(),
  });

  // Create barcode lookup record
  if (normalizedBarcode) {
    await db.put('variantBarcodes', {
      barcode: normalizedBarcode,
      variantId,
      productId,
    });
  }

  return variantId;
};

/**
 * Update variant stock (for billing)
 * @param {number} variantId
 * @param {number} newStock
 * @returns {Promise<void>}
 */
export const updateVariantStock = async (variantId, newStock) => {
  const db = await initDB();
  const variant = await db.get('variants', variantId);
  if (variant) {
    await db.put('variants', {
      ...variant,
      stock: parseInt(newStock) || 0,
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Delete variant and its barcode lookup
 * @param {number} variantId
 * @returns {Promise<void>}
 */
export const deleteVariant = async (variantId) => {
  const db = await initDB();
  const variant = await db.get('variants', variantId);
  if (variant) {
    // Delete barcode lookup
    if (variant.barcode) {
      await db.delete('variantBarcodes', variant.barcode);
    }
    // Delete variant
    await db.delete('variants', variantId);
  }
};

/**
 * Update variant
 * @param {number} variantId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export const updateVariant = async (variantId, updates) => {
  const db = await initDB();
  const variant = await db.get('variants', variantId);
  if (!variant) return;

  const oldBarcode = normalizeBarcodeValue(variant.barcode || '');
  const newBarcode = normalizeBarcodeValue(updates.barcode ?? oldBarcode);
  const normalizedSku = normalizeBarcodeValue(updates.sku ?? (variant.sku || ''));

  // Update variant record
  const updated = {
    ...variant,
    ...updates,
    sku: normalizedSku,
    barcode: newBarcode,
    updatedAt: new Date().toISOString(),
  };
  await db.put('variants', updated);

  // Update barcode lookup if barcode changed
  if (oldBarcode !== newBarcode) {
    if (oldBarcode) await db.delete('variantBarcodes', oldBarcode);
    if (newBarcode) {
      await db.put('variantBarcodes', {
        barcode: newBarcode,
        variantId,
        productId: variant.productId,
      });
    }
  }
};

/**
 * Get variant with product details
 * @param {number} variantId
 * @returns {Promise<Object|null>}
 */
export const getVariantWithProduct = async (variantId) => {
  const db = await initDB();
  const variant = await db.get('variants', variantId);
  if (!variant) return null;
  const product = await db.get('products', variant.productId);
  return { ...variant, product };
};

/**
 * Search variants by product name, sku, barcode
 * @param {string} query
 * @returns {Promise<Array>}
 */
export const searchVariants = async (query) => {
  const db = await initDB();
  const variants = await db.getAll('variants');
  const searchLower = (query || '').toLowerCase();

  return variants.filter((v) => {
    return (
      (v.sku && v.sku.toLowerCase().includes(searchLower)) ||
      (v.barcode && v.barcode.includes(searchLower)) ||
      (v.label && v.label.toLowerCase().includes(searchLower))
    );
  });
};

// ============================================================
// ENTERPRISE BATCH & STOCK MOVEMENT FUNCTIONS
// ============================================================

/**
 * Get all inventory batches for a variant or product
 */
export const getBatchesByVariant = async (variantId) => {
  const db = await initDB();
  return db.getAllFromIndex('inventoryBatches', 'variantId', Number(variantId));
};

export const getBatchesByProduct = async (productId) => {
  const db = await initDB();
  return db.getAllFromIndex('inventoryBatches', 'productId', Number(productId));
};

export const getAllBatches = async () => {
  const db = await initDB();
  return db.getAll('inventoryBatches');
};

export const getBatch = async (batchId) => {
  const db = await initDB();
  return db.get('inventoryBatches', Number(batchId));
};

export const getBatchesByNumber = async (batchNumber) => {
  const db = await initDB();
  if (!batchNumber) return [];
  return db.getAllFromIndex('inventoryBatches', 'batchNumber', String(batchNumber));
};

export const getStockMovementsByBatchNumber = async (batchNumber) => {
  const db = await initDB();
  if (!batchNumber) return [];
  const allMovements = await db.getAll('stockMovements');
  return (allMovements || []).filter((m) => {
    const number = String(m.batchNumber || m.referenceNumber || '').trim();
    return number && number.toLowerCase() === String(batchNumber).trim().toLowerCase();
  });
};

/**
 * Get all stock movements for a variant or product
 */
export const getStockMovementsByVariant = async (variantId) => {
  const db = await initDB();
  return db.getAllFromIndex('stockMovements', 'variantId', Number(variantId));
};

export const getStockMovementsByProduct = async (productId) => {
  const db = await initDB();
  return db.getAllFromIndex('stockMovements', 'productId', Number(productId));
};

export const getAllStockMovements = async () => {
  const db = await initDB();
  return db.getAll('stockMovements');
};

/**
 * Get barcode print logs
 */
export const getBarcodePrintLogs = async (variantId) => {
  const db = await initDB();
  if (variantId) return db.getAllFromIndex('barcodePrintLogs', 'variantId', Number(variantId));
  return db.getAll('barcodePrintLogs');
};

/**
 * Check if a barcode is unique across all variants and products
 */
export const isBarcodeUnique = async (barcode, excludeVariantId = null, excludeProductId = null) => {
  const db = await initDB();
  const normalized = normalizeBarcodeValue(barcode || '');
  if (!normalized) return true;

  // Check variantBarcodes O(1) lookup first
  const existing = await db.get('variantBarcodes', normalized);
  if (existing) {
    if (excludeVariantId && String(existing.variantId) === String(excludeVariantId)) return true;
    return false;
  }

  // Also check products table (legacy barcodes)
  const allProducts = await db.getAll('products');
  for (const p of allProducts) {
    if (excludeProductId && String(p.id) === String(excludeProductId)) continue;
    if (normalizeBarcodeValue(p.barcode || '') === normalized) return false;
  }

  return true;
};

/**
 * Check if an SKU is unique across all variants
 */
export const isSkuUnique = async (sku, excludeVariantId = null) => {
  const db = await initDB();
  const normalized = normalizeBarcodeValue(sku || '');
  if (!normalized) return true;

  const allVariants = await db.getAll('variants');
  for (const v of allVariants) {
    if (excludeVariantId && String(v.id) === String(excludeVariantId)) continue;
    if (normalizeBarcodeValue(v.sku || '') === normalized) return false;
  }
  return true;
};

/**
 * Generate a unique 6-digit numeric barcode that doesn't exist in DB
 */
export const generateUniqueBarcode = async () => {
  const db = await initDB();
  const allBarcodes = await db.getAll('variantBarcodes');
  const usedSet = new Set(allBarcodes.map((b) => String(b.barcode)));

  // Also collect product barcodes
  const allProducts = await db.getAll('products');
  allProducts.forEach((p) => { if (p.barcode) usedSet.add(String(p.barcode)); });

  for (let i = 0; i < 2000; i++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    if (!usedSet.has(candidate)) return candidate;
  }
  return String(Date.now()).slice(-6);
};

/**
 * Soft-delete a product (archive it)
 */
export const archiveProduct = async (productId) => {
  const db = await initDB();
  const product = await db.get('products', Number(productId));
  if (!product) throw new Error('Product not found');
  await db.put('products', {
    ...product,
    archived: true,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const unarchiveProduct = async (productId) => {
  const db = await initDB();
  const product = await db.get('products', Number(productId));
  if (!product) throw new Error('Product not found');
  await db.put('products', {
    ...product,
    archived: false,
    archivedAt: null,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Record a manual stock adjustment with movement log
 */
export const recordManualStockAdjustment = async ({
  productId, variantId, quantity, reason, notes, createdBy,
}) => {
  const db = await initDB();
  const now = new Date().toISOString();

  // Update variant stock if provided
  if (variantId) {
    const variant = await db.get('variants', Number(variantId));
    if (variant) {
      const newStock = Math.max(0, Number(variant.stock || 0) + Number(quantity));
      await db.put('variants', { ...variant, stock: newStock, updatedAt: now });

      // Recalculate product stock
      const allVariants = await db.getAllFromIndex('variants', 'productId', variant.productId);
      const sum = allVariants.reduce((s, v) => s + Number(v.stock || 0), 0);
      const product = await db.get('products', variant.productId);
      if (product) await db.put('products', { ...product, stock: sum, updatedAt: now });
    }
  }

  // Record movement
  await db.add('stockMovements', {
    type: 'Manual Adjustment',
    productId: Number(productId),
    variantId: variantId ? Number(variantId) : null,
    quantity: Number(quantity),
    reason: reason || 'Manual Adjustment',
    notes: notes || '',
    createdBy: createdBy || 'System',
    date: now,
    createdAt: now,
  });
};

/**
 * Duplicate a product with all its variants (creates new product, no batches/stock)
 */
export const duplicateProduct = async (productId) => {
  const db = await initDB();
  const product = await db.get('products', Number(productId));
  if (!product) throw new Error('Product not found');

  const copy = {
    ...product,
    name: `${product.name} (Copy)`,
    barcode: '',
    sku: '',
    stock: 0,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  delete copy.id;

  const newProductId = await db.add('products', copy);

  // Copy variants without stock
  const variants = await db.getAllFromIndex('variants', 'productId', Number(productId));
  for (const v of variants) {
    const varCopy = {
      ...v,
      productId: newProductId,
      barcode: '',
      sku: '',
      stock: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    delete varCopy.id;
    await db.add('variants', varCopy);
  }

  return newProductId;
};

// ============================================================
// AUDIT LOGS (Phase 15)
// ============================================================

export const addAuditLog = async ({ action, entityType, entityId, details = {}, userId = 'System', userName = 'System' }) => {
  const db = await initDB();
  return db.add('auditLogs', {
    action,
    entityType,
    entityId: entityId ? Number(entityId) : null,
    details,
    userId,
    userName,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
};

export const getAllAuditLogs = async () => {
  const db = await initDB();
  return db.getAll('auditLogs');
};

// ============================================================
// SOFT DELETE SYSTEM (Phase 11)
// ============================================================

/**
 * Soft-delete any entity — saves a copy before deletion.
 * The original record is archived; it can be restored or permanently removed.
 */
export const softDeleteEntity = async (entityType, entityId, entityData, reason = '', deletedBy = 'System') => {
  const db = await initDB();
  const softId = await db.add('softDeletes', {
    entityType,
    entityId: entityId ? Number(entityId) : null,
    entityData: JSON.stringify(entityData || {}),
    reason,
    deletedBy,
    deletedAt: new Date().toISOString(),
    restored: false,
    restoredAt: null,
  });
  await addAuditLog({ action: 'Soft Delete', entityType, entityId, details: { reason }, userId: deletedBy, userName: deletedBy });
  return softId;
};

export const getAllSoftDeletes = async (entityType = null) => {
  const db = await initDB();
  if (entityType) {
    return db.getAllFromIndex('softDeletes', 'entityType', entityType);
  }
  return db.getAll('softDeletes');
};

export const restoreSoftDelete = async (softDeleteId, restoredBy = 'System') => {
  const db = await initDB();
  const record = await db.get('softDeletes', Number(softDeleteId));
  if (!record) throw new Error('Soft-deleted record not found');

  const entityData = JSON.parse(record.entityData || '{}');
  const { entityType } = record;

  // Restore to original store
  const storeMap = {
    product: 'products',
    variant: 'variants',
    stockEntry: 'inventoryBatches',
    stockTransfer: 'stockTransfers',
    return: 'returns',
    exchange: 'returns',
    adjustment: 'stockMovements',
  };

  const storeName = storeMap[entityType] || entityType;
  try {
    await db.put(storeName, { ...entityData, restored: true, restoredAt: new Date().toISOString() });
  } catch { /* Store may not exist, ignore */ }

  // Mark as restored
  await db.put('softDeletes', {
    ...record,
    restored: true,
    restoredAt: new Date().toISOString(),
    restoredBy,
  });

  await addAuditLog({ action: 'Restore', entityType, entityId: record.entityId, details: {}, userId: restoredBy, userName: restoredBy });
  return entityData;
};

export const permanentlyDeleteSoftRecord = async (softDeleteId, deletedBy = 'System') => {
  const db = await initDB();
  const record = await db.get('softDeletes', Number(softDeleteId));
  if (!record) throw new Error('Record not found');
  await db.delete('softDeletes', Number(softDeleteId));
  await addAuditLog({ action: 'Permanent Delete', entityType: record.entityType, entityId: record.entityId, details: {}, userId: deletedBy, userName: deletedBy });
};

// ============================================================
// RETURNS MANAGEMENT (Phase 13)
// ============================================================

export const getAllReturns = async () => {
  const db = await initDB();
  return db.getAll('returns');
};

export const getReturnsByInvoice = async (invoiceId) => {
  const db = await initDB();
  return db.getAllFromIndex('returns', 'invoiceId', Number(invoiceId));
};

export const addReturn = async (returnData) => {
  const db = await initDB();
  const now = new Date().toISOString();
  const id = await db.add('returns', {
    ...returnData,
    date: returnData.date || now,
    createdAt: now,
  });
  return id;
};

export const updateReturn = async (returnData) => {
  const db = await initDB();
  return db.put('returns', { ...returnData, updatedAt: new Date().toISOString() });
};

export const deleteReturn = async (id) => {
  const db = await initDB();
  return db.delete('returns', id);
};

// ============================================================
// STOCK TRANSFERS MANAGEMENT (Phase 12)
// ============================================================

export const getAllStockTransfers = async () => {
  const db = await initDB();
  return db.getAll('stockTransfers');
};

export const addStockTransfer = async (transferData) => {
  const db = await initDB();
  const now = new Date().toISOString();
  const id = await db.add('stockTransfers', {
    ...transferData,
    date: transferData.date || now,
    createdAt: now,
  });
  return id;
};

export const updateStockTransfer = async (transferData) => {
  const db = await initDB();
  return db.put('stockTransfers', { ...transferData, updatedAt: new Date().toISOString() });
};

// ============================================================
// WAREHOUSE STOCK MANAGEMENT (v14)
// ============================================================

/**
 * Get warehouse stock entry for a specific product/variant.
 * Returns null if no warehouse stock has been added yet.
 */
export const getWarehouseStockEntry = async (productId, variantId = null) => {
  const db = await initDB();
  const all = await db.getAllFromIndex('warehouseStock', 'productId', Number(productId));
  if (variantId) {
    return all.find(e => String(e.variantId) === String(variantId)) || null;
  }
  return all.find(e => !e.variantId) || null;
};

/**
 * Get all warehouse stock entries for a product (all variants).
 */
export const getWarehouseStockByProduct = async (productId) => {
  const db = await initDB();
  return db.getAllFromIndex('warehouseStock', 'productId', Number(productId));
};

/**
 * Get the full warehouse stock list (all products).
 */
export const getAllWarehouseStock = async () => {
  const db = await initDB();
  return db.getAll('warehouseStock');
};

/**
 * Upsert warehouse stock for a product/variant.
 * If entry doesn't exist, creates it. If exists, updates qty.
 */
export const setWarehouseStock = async (productId, variantId, qty, notes = '', createdBy = 'System') => {
  const db = await initDB();
  const now = new Date().toISOString();
  const existing = await getWarehouseStockEntry(productId, variantId);

  if (existing) {
    await db.put('warehouseStock', {
      ...existing,
      qty: Math.max(0, Number(qty)),
      notes: notes || existing.notes || '',
      updatedAt: now,
    });
    return existing.id;
  } else {
    const id = await db.add('warehouseStock', {
      productId: Number(productId),
      variantId: variantId ? Number(variantId) : null,
      qty: Math.max(0, Number(qty)),
      notes: notes || '',
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }
};

/**
 * Adjust warehouse stock by a delta (positive = add, negative = remove).
 * Returns the new qty.
 */
export const adjustWarehouseStock = async (productId, variantId, delta, notes = '', createdBy = 'System') => {
  const existing = await getWarehouseStockEntry(productId, variantId);
  const currentQty = existing ? Number(existing.qty || 0) : 0;
  const newQty = Math.max(0, currentQty + Number(delta));
  await setWarehouseStock(productId, variantId, newQty, notes, createdBy);
  return newQty;
};

/**
 * Get all warehouse movements (full audit trail).
 */
export const getAllWarehouseMovements = async () => {
  const db = await initDB();
  return db.getAll('warehouseMovements');
};

/**
 * Get warehouse movements for a specific product.
 */
export const getWarehouseMovementsByProduct = async (productId) => {
  const db = await initDB();
  return db.getAllFromIndex('warehouseMovements', 'productId', Number(productId));
};

/**
 * Record a warehouse movement (receive / transfer-to-rack / adjustment).
 */
export const recordWarehouseMovement = async ({
  type, productId, variantId, productName, variantLabel,
  qty, fromLocation, toLocation, notes, movedBy, date,
}) => {
  const db = await initDB();
  const now = new Date().toISOString();
  return db.add('warehouseMovements', {
    type,
    productId: Number(productId),
    variantId: variantId ? Number(variantId) : null,
    productName: productName || '',
    variantLabel: variantLabel || '',
    qty: Number(qty),
    fromLocation: fromLocation || 'Warehouse',
    toLocation: toLocation || 'Rack',
    notes: notes || '',
    movedBy: movedBy || 'System',
    date: date || now,
    createdAt: now,
  });
};

// ============================================================
// HELD BILLS — Persistent POS hold bill storage (v15)
// ============================================================

export const saveHeldBill = async (bill) => {
  const db = await initDB();
  await db.put('heldBills', { ...bill, savedAt: new Date().toISOString() });
};

export const getAllHeldBills = async () => {
  const db = await initDB();
  return db.getAll('heldBills');
};

export const removeHeldBill = async (id) => {
  const db = await initDB();
  return db.delete('heldBills', id);
};

// ============================================================
// POINTS LEDGER — Per-customer loyalty history (v15)
// ============================================================

export const addPointsLedgerEntry = async ({ customerId, type, points, balance, note, invoiceId, invoiceNumber, createdBy }) => {
  const db = await initDB();
  return db.add('pointsLedger', {
    customerId: Number(customerId),
    type,
    points: Number(points),
    balance: Number(balance),
    note: note || '',
    invoiceId: invoiceId || null,
    invoiceNumber: invoiceNumber || '',
    createdBy: createdBy || 'System',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
};

export const getPointsLedgerByCustomer = async (customerId) => {
  const db = await initDB();
  const rows = await db.getAllFromIndex('pointsLedger', 'customerId', Number(customerId));
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const getAllPointsLedger = async () => {
  const db = await initDB();
  return db.getAll('pointsLedger');
};

// ============================================================
// CUSTOMER GROUPS (v15)
// ============================================================

export const getAllCustomerGroups = async () => {
  const db = await initDB();
  return db.getAll('customerGroups');
};

export const addCustomerGroup = async (data) => {
  const db = await initDB();
  return db.add('customerGroups', { ...data, createdAt: new Date().toISOString() });
};

export const updateCustomerGroup = async (data) => {
  const db = await initDB();
  return db.put('customerGroups', { ...data, updatedAt: new Date().toISOString() });
};

export const deleteCustomerGroup = async (id) => {
  const db = await initDB();
  return db.delete('customerGroups', id);
};

// ============================================================
// CUSTOMER COMMUNICATION LOG (v15)
// ============================================================

export const addCustomerCommsLog = async ({ customerId, type, note, createdBy }) => {
  const db = await initDB();
  return db.add('customerCommsLog', {
    customerId: Number(customerId),
    type: type || 'note',
    note: note || '',
    createdBy: createdBy || 'System',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
};

export const getCustomerCommsLog = async (customerId) => {
  const db = await initDB();
  const rows = await db.getAllFromIndex('customerCommsLog', 'customerId', Number(customerId));
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ============================================================
// SUPPLIER SRM — DB HELPERS (v16)
// ============================================================

// ── Supplier Contacts ────────────────────────────────────────
export const getSupplierContacts = async (supplierId) => {
  const db = await initDB();
  return db.getAllFromIndex('supplierContacts', 'supplierId', Number(supplierId));
};
export const addSupplierContact = async (data) => {
  const db = await initDB();
  return db.add('supplierContacts', { ...data, supplierId: Number(data.supplierId), createdAt: new Date().toISOString() });
};
export const updateSupplierContact = async (data) => {
  const db = await initDB();
  return db.put('supplierContacts', { ...data, updatedAt: new Date().toISOString() });
};
export const deleteSupplierContact = async (id) => {
  const db = await initDB();
  return db.delete('supplierContacts', id);
};

// ── Supplier Bank Accounts ───────────────────────────────────
export const getSupplierBankAccounts = async (supplierId) => {
  const db = await initDB();
  return db.getAllFromIndex('supplierBankAccounts', 'supplierId', Number(supplierId));
};
export const addSupplierBankAccount = async (data) => {
  const db = await initDB();
  return db.add('supplierBankAccounts', { ...data, supplierId: Number(data.supplierId), createdAt: new Date().toISOString() });
};
export const updateSupplierBankAccount = async (data) => {
  const db = await initDB();
  return db.put('supplierBankAccounts', { ...data, updatedAt: new Date().toISOString() });
};
export const deleteSupplierBankAccount = async (id) => {
  const db = await initDB();
  return db.delete('supplierBankAccounts', id);
};

// ── Supplier Documents ───────────────────────────────────────
export const getSupplierDocuments = async (supplierId) => {
  const db = await initDB();
  return db.getAllFromIndex('supplierDocuments', 'supplierId', Number(supplierId));
};
export const addSupplierDocument = async (data) => {
  const db = await initDB();
  return db.add('supplierDocuments', { ...data, supplierId: Number(data.supplierId), createdAt: new Date().toISOString() });
};
export const deleteSupplierDocument = async (id) => {
  const db = await initDB();
  return db.delete('supplierDocuments', id);
};

// ── Supplier Payments ────────────────────────────────────────
export const getSupplierPayments = async (supplierId) => {
  const db = await initDB();
  return db.getAllFromIndex('supplierPayments', 'supplierId', Number(supplierId));
};
export const getAllSupplierPayments = async () => {
  const db = await initDB();
  return db.getAll('supplierPayments');
};
export const addSupplierPayment = async (data) => {
  const db = await initDB();
  const now = new Date().toISOString();
  return db.add('supplierPayments', { ...data, supplierId: Number(data.supplierId), date: data.date || now, createdAt: now });
};
export const updateSupplierPayment = async (data) => {
  const db = await initDB();
  return db.put('supplierPayments', { ...data, updatedAt: new Date().toISOString() });
};
export const deleteSupplierPayment = async (id) => {
  const db = await initDB();
  return db.delete('supplierPayments', id);
};

// ── Supplier Ledger ──────────────────────────────────────────
export const getSupplierLedger = async (supplierId) => {
  const db = await initDB();
  const rows = await db.getAllFromIndex('supplierLedger', 'supplierId', Number(supplierId));
  return rows.sort((a, b) => new Date(a.date) - new Date(b.date));
};
export const addSupplierLedgerEntry = async (data) => {
  const db = await initDB();
  const now = new Date().toISOString();
  return db.add('supplierLedger', { ...data, supplierId: Number(data.supplierId), date: data.date || now, createdAt: now });
};

// ── Supplier Returns ─────────────────────────────────────────
export const getSupplierReturns = async (supplierId) => {
  const db = await initDB();
  return db.getAllFromIndex('supplierReturns', 'supplierId', Number(supplierId));
};
export const getAllSupplierReturns = async () => {
  const db = await initDB();
  return db.getAll('supplierReturns');
};
export const addSupplierReturn = async (data) => {
  const db = await initDB();
  const now = new Date().toISOString();
  return db.add('supplierReturns', { ...data, supplierId: Number(data.supplierId), date: data.date || now, createdAt: now });
};
export const updateSupplierReturn = async (data) => {
  const db = await initDB();
  return db.put('supplierReturns', { ...data, updatedAt: new Date().toISOString() });
};
export const deleteSupplierReturn = async (id) => {
  const db = await initDB();
  return db.delete('supplierReturns', id);
};

// ── Supplier Notes ───────────────────────────────────────────
export const getSupplierNotes = async (supplierId) => {
  const db = await initDB();
  const rows = await db.getAllFromIndex('supplierNotes', 'supplierId', Number(supplierId));
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
};
export const addSupplierNote = async (data) => {
  const db = await initDB();
  const now = new Date().toISOString();
  return db.add('supplierNotes', { ...data, supplierId: Number(data.supplierId), date: data.date || now, createdAt: now });
};
export const deleteSupplierNote = async (id) => {
  const db = await initDB();
  return db.delete('supplierNotes', id);
};


// ─────────────────────────────────────────────────────────────────────────────
// CLOUD SYNC QUEUE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add operation to sync queue
 * @param {object} queueItem - Queue item data
 * @returns {Promise<number>} Insert ID
 */
export const addToSyncQueue = async (queueItem) => {
  const db = await initDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  
  const item = {
    ...queueItem,
    id: Date.now() + Math.random(), // Unique ID
    created_at: queueItem.created_at || new Date().toISOString(),
    status: queueItem.status || 'pending',
    retry_count: queueItem.retry_count || 0
  };

  await tx.store.add(item);
  await tx.done;
  return item.id;
};

/**
 * Get all sync queue items
 * @returns {Promise<Array>} Queue items
 */
export const getSyncQueue = async () => {
  const db = await initDB();
  return await db.getAll('syncQueue');
};

/**
 * Get pending sync queue items
 * @returns {Promise<Array>} Pending items
 */
export const getPendingSyncItems = async () => {
  const db = await initDB();
  const all = await db.getAll('syncQueue');
  return all.filter(item => item.status === 'pending');
};

/**
 * Update sync queue item
 * @param {number} id - Item ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateSyncQueueItem = async (id, updates) => {
  const db = await initDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const item = await tx.store.get(id);
  
  if (item) {
    Object.assign(item, updates);
    await tx.store.put(item);
  }
  
  await tx.done;
};

/**
 * Delete sync queue item
 * @param {number} id - Item ID
 * @returns {Promise<void>}
 */
export const deleteSyncQueueItem = async (id) => {
  const db = await initDB();
  await db.delete('syncQueue', id);
};

/**
 * Clear completed sync queue items (older than 7 days)
 * @returns {Promise<number>} Number of items deleted
 */
export const clearOldSyncItems = async () => {
  const db = await initDB();
  const all = await db.getAll('syncQueue');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  let deleted = 0;
  for (const item of all) {
    if (item.status === 'done' && new Date(item.processed_at) < sevenDaysAgo) {
      await db.delete('syncQueue', item.id);
      deleted++;
    }
  }
  
  return deleted;
};

/**
 * Get sync statistics
 * @returns {Promise<object>} Sync stats
 */
export const getSyncStats = async () => {
  const queue = await getSyncQueue();
  return {
    total: queue.length,
    pending: queue.filter(i => i.status === 'pending').length,
    processing: queue.filter(i => i.status === 'processing').length,
    done: queue.filter(i => i.status === 'done').length,
    failed: queue.filter(i => i.status === 'failed').length
  };
};

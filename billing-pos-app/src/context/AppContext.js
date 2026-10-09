import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  dbGetAll, dbAdd, dbPut, dbDelete, getSetting, setSetting, dbGet, initDB,
  createVariant, updateVariant, deleteVariant, getVariantByBarcode,
  createInventoryBatch,
  generateUniqueBarcode, isBarcodeUnique, isSkuUnique,
  archiveProduct, unarchiveProduct, duplicateProduct,
  getBatchesByVariant, getBatchesByProduct, getBatchesByNumber, getStockMovementsByBatchNumber,
  getAllBatches, getStockMovementsByVariant, getStockMovementsByProduct,
  getAllStockMovements, getBarcodePrintLogs,
  addAuditLog, getAllAuditLogs,
  softDeleteEntity, getAllSoftDeletes, restoreSoftDelete, permanentlyDeleteSoftRecord,
  getAllReturns, addReturn, updateReturn, deleteReturn,
  getAllStockTransfers, addStockTransfer, updateStockTransfer,
  // Warehouse
  getAllWarehouseStock, getWarehouseMovementsByProduct, getAllWarehouseMovements,
  getWarehouseStockEntry, adjustWarehouseStock,
  setWarehouseStock as dbSetWarehouseStock,
  recordWarehouseMovement,
  // Supplier SRM (v16)
  getSupplierContacts, addSupplierContact, updateSupplierContact, deleteSupplierContact,
  getSupplierBankAccounts, addSupplierBankAccount, updateSupplierBankAccount, deleteSupplierBankAccount,
  getSupplierDocuments, addSupplierDocument, deleteSupplierDocument,
  getSupplierPayments, getAllSupplierPayments, addSupplierPayment, updateSupplierPayment, deleteSupplierPayment,
  getSupplierLedger, addSupplierLedgerEntry,
  getSupplierReturns, getAllSupplierReturns, addSupplierReturn, updateSupplierReturn, deleteSupplierReturn,
  getSupplierNotes, addSupplierNote, deleteSupplierNote,
} from '../db/db';
import toast from 'react-hot-toast';
import { initGlobalErrorHandlers } from '../utils/logger';
import { normalizeProductPayload } from '../utils/inventoryAnalytics';
import { buildBatchNumber } from '../utils/productInventoryModel';
import { loadPrintSettings, savePrintSettings as savePrintSettingsUtil } from '../utils/printSettingsStore';
import {
  recordSaleStockOut,
  recordReturnStockIn,
  recordPurchaseStockIn,
  recordTransferOut,
  recordManualAdjustment,
} from '../utils/inventoryEngine';
import {
  connectCloudServer,
  clearCloudSyncQueue,
  getCloudSyncSummary,
  getPendingQueueItems,
  getSyncLogs,
  loadCloudSyncConfig,
  persistCloudSyncConfig,
  queueSyncChange,
  refreshCloudSyncStatus,
  retryFailedCloudSync,
  sanitizeCloudSyncConfig,
  saveCloudSyncStatus,
  startCloudSyncBackgroundWorker,
  stopCloudSyncBackgroundWorker,
  testCloudConnection,
} from '../utils/cloudSyncService';
import { loadAllSounds } from '../utils/soundManager';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

/**
 * Safe variant key resolver.
 * Variant IDs can be numeric integers (from the standalone variants store)
 * OR string slugs like "variant-1234-1" (embedded in product docs before they
 * were synced to the store).  Only numeric keys are valid IDB primary keys.
 * Returns the numeric key if valid, otherwise null (caller must skip the lookup).
 */
const safeVariantKey = (id) => {
  if (id === null || id === undefined || id === '') return null;
  const n = Number(id);
  if (Number.isFinite(n) && n > 0 && String(Math.floor(n)) === String(id).trim()) return n;
  // String-format IDs (e.g. "variant-1234-1") are NOT valid IDB keys — return null
  return null;
};

/**
 * Look up a variant from the standalone variants store, or fall back to the
 * embedded product.variants[] array when the ID is a string slug.
 * Returns the variant object or null.
 */
const safeGetVariant = async (db, variantId, productId = null) => {
  const numKey = safeVariantKey(variantId);
  if (numKey !== null) {
    try {
      const v = await db.get('variants', numKey);
      if (v) return v;
    } catch { /* fall through to scan */ }
  }
  // Fallback: scan all variants for this product by string ID match
  if (productId) {
    try {
      const all = await db.getAllFromIndex('variants', 'productId', Number(productId));
      return all.find(v => String(v.id) === String(variantId)) || null;
    } catch { /* ignore */ }
  }
  return null;
};

const DEFAULT_COMPANY = {
  name: 'My Store',
  address: '', phone: '', email: '', gstin: '',
  currency: '₹', taxRate: 18,
  invoicePrefix: 'INV', invoiceDateFormat: 'DDMMYY', invoiceSequenceDigits: 6,
  showSign: true, terms: '', invoiceNote: 'Thank you for your business!',
  customerDisplayAutoOpen: true, customerDisplayAutoClose: false,
  customerDisplayIdleMessage: 'Welcome! Explore our latest collection.',
  customerDisplayPromotionText: 'Quick billing, accurate stock, premium service.',
  customerDisplayBrandColor: '#0f172a', customerDisplayAccentColor: '#22d3ee',
  invoiceQrEnabled: false, invoiceQrText: '', invoiceQrDescription: '',
  invoiceQrSizePx: 70, invoiceFullBarcodeEnabled: true,
  barcodeFormat: 'CODE128', barcodePrefix: 'SKU', variantBarcodePrefix: 'VAR',
  scannerAutoEnter: true, scannerBeep: true, scannerContinuous: true,
  scannerPrefix: '', scannerSuffix: '',
};

async function persistNormalizedProducts(products) {
  for (const product of products) {
    const normalized = normalizeProductPayload(product);
    if (JSON.stringify(normalized) !== JSON.stringify(product)) {
      await dbPut('products', normalized);
    }
  }
}

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [company, setCompany] = useState(DEFAULT_COMPANY);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [staff, setStaff] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [variants, setVariants] = useState([]);
  const [returns, setReturns] = useState([]);
  const [stockTransfers, setStockTransfers] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [warehouseMovements, setWarehouseMovements] = useState([]);
  // Supplier SRM (v16)
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [supplierReturns, setSupplierReturns] = useState([]);
  const [printSettings, setPrintSettings] = useState(null);
  const [invoiceTextStyles, setInvoiceTextStyles] = useState(null);
  const [cloudSyncConfig, setCloudSyncConfig] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(null);
  const [cloudSyncLogs, setCloudSyncLogs] = useState([]);
  const [cloudSyncQueue, setCloudSyncQueue] = useState([]);
  const [inventorySettings, setInventorySettings] = useState({
    lowStockThreshold: 5,
    negativeStockAlert: true,
    autoDeductOnSale: true,
    trackBatchExpiry: true,
  });

  const loadAll = useCallback(async () => {
    const [p, c, cu, inv, sup, pur, st, exp, v, ret, transfers, wStock, wMoves, supPayments, supReturns] = await Promise.all([
      dbGetAll('products'), dbGetAll('categories'), dbGetAll('customers'),
      dbGetAll('invoices'), dbGetAll('suppliers'), dbGetAll('purchases'),
      dbGetAll('staff'), dbGetAll('expenses'), dbGetAll('variants'),
      getAllReturns(), getAllStockTransfers(),
      getAllWarehouseStock(), getAllWarehouseMovements(),
      getAllSupplierPayments(), getAllSupplierReturns(),
    ]);
    const normalizedProducts = p.map(normalizeProductPayload);
    await persistNormalizedProducts(normalizedProducts);
    setProducts(normalizedProducts);
    setCategories(c); setCustomers(cu); setInvoices(inv);
    setSuppliers(sup); setPurchases(pur); setStaff(st); setExpenses(exp);
    setVariants(v); setReturns(ret || []); setStockTransfers(transfers || []);
    setWarehouseStock(wStock || []);
    setWarehouseMovements(wMoves || []);
    setSupplierPayments(supPayments || []);
    setSupplierReturns(supReturns || []);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test' || typeof window === 'undefined') return;
    initGlobalErrorHandlers();
    const init = async () => {
      const savedTheme = await getSetting('theme') || 'light';
      const savedCompany = await getSetting('company');
      const savedUser = await getSetting('currentUser');
      const savedInventorySettings = await getSetting('inventorySettings');
      setTheme(savedTheme);
      const mergedCompany = { ...DEFAULT_COMPANY, ...(savedCompany || {}) };
      if (savedCompany) setCompany(mergedCompany);
      if (savedUser) setCurrentUser(savedUser);
      if (savedInventorySettings) {
        setInventorySettings((prev) => ({ ...prev, ...savedInventorySettings }));
      }
      // Load all custom sounds from persisted company settings
      try { loadAllSounds(mergedCompany); } catch { /* non-fatal */ }
      try { const ps = await loadPrintSettings(); setPrintSettings(ps); } catch { /* non-fatal */ }
      try {
        const savedTextStyles = await getSetting('invoiceTextStyles');
        if (savedTextStyles) setInvoiceTextStyles(savedTextStyles);
      } catch { /* non-fatal */ }
      try {
        const config = await loadCloudSyncConfig();
        // Pre-populate with the configured Render cloud API if no endpoint has been set yet
        if (!config.apiEndpoint) {
          config.apiEndpoint = 'https://ram1-ai0s.onrender.com';
        }
        const status = await refreshCloudSyncStatus();
        setCloudSyncConfig(config);
        setCloudSyncStatus(status);
        const logs = await getSyncLogs('all');
        setCloudSyncLogs((logs || []).slice(-50));
        const pending = await getPendingQueueItems(50);
        setCloudSyncQueue(pending);
        if (config.enabled && config.autoSync) {
          await startCloudSyncBackgroundWorker();
        }
      } catch { /* non-fatal */ }
      await loadAll();
      const allStaff = await dbGetAll('staff');
      if (allStaff.length === 0) {
        await dbAdd('staff', { name: 'Admin', username: 'admin', password: 'admin123', role: 'admin', pin: '1234', active: true });
        await loadAll();
      }
    };
    init();
  }, [loadAll]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!cloudSyncConfig?.enabled || !cloudSyncConfig?.autoSync) {
      stopCloudSyncBackgroundWorker();
      return;
    }
    startCloudSyncBackgroundWorker();
    return () => stopCloudSyncBackgroundWorker();
  }, [cloudSyncConfig?.enabled, cloudSyncConfig?.autoSync]);

  // Initialize website integration background sync worker
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initWebsiteSync = async () => {
      try {
        const websiteConfig = await getSetting('websiteIntegrationConfig');
        if (websiteConfig?.enabled && websiteConfig?.autoSync) {
          // Dynamically import to avoid circular dependencies
          const { default: backgroundSyncWorker } = await import('../services/backgroundSyncWorker');
          const { default: invoiceSyncHooks } = await import('../services/invoiceSyncHooks');
          
          // Start background sync worker
          await backgroundSyncWorker.start();
          
          // Initialize invoice sync hooks
          await invoiceSyncHooks.initialize();
          
          console.log('[AppContext] Website integration sync initialized');
          
          // Cleanup on unmount
          return () => {
            backgroundSyncWorker.stop();
            invoiceSyncHooks.disable();
          };
        }
      } catch (error) {
        console.error('[AppContext] Failed to initialize website sync:', error);
      }
    };
    
    initWebsiteSync();
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    setSetting('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onInventorySettingsChanged = (event) => {
      if (!event?.detail) return;
      setInventorySettings((prev) => ({ ...prev, ...(event.detail || {}) }));
    };
    window.addEventListener('inventory-settings-changed', onInventorySettingsChanged);
    return () => window.removeEventListener('inventory-settings-changed', onInventorySettingsChanged);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ─── Products ──────────────────────────────────────────────────────────────
  const validateProductBarcode = useCallback((payload) => {
    const barcode = String(payload?.barcode || '').trim();
    if (!barcode) return;
    const duplicate = products.find(item => {
      if (String(item?.id) === String(payload?.id || '')) return false;
      return String(item?.barcode || '').trim() === barcode;
    });
    if (duplicate) throw new Error(`Barcode already exists for ${duplicate.name || 'another product'}`);
  }, [products]);

  const queueEntityChange = async (entityType, actionType, payload, entityId = null) => {
    try {
      if (!cloudSyncConfig?.enabled) return null;
      const item = await queueSyncChange({ entityType, entityId, actionType, payload, businessId: cloudSyncConfig?.businessId || '', deviceId: cloudSyncConfig?.deviceId || '' });
      const summary = await getCloudSyncSummary();
      setCloudSyncStatus((prev) => ({ ...(prev || {}), ...summary }));
      const pending = await getPendingQueueItems(50);
      setCloudSyncQueue(pending);
      return item;
    } catch {
      return null;
    }
  };

  const addProduct = async (data) => {
    const payload = normalizeProductPayload(data);
    validateProductBarcode(payload);
    const id = await dbAdd('products', payload);
    // Sync embedded variants to standalone variants store + variantBarcodes for fast barcode lookup
    await syncProductVariantsToStore(id, payload.variants || [], payload);
    await addAuditLog({ action: 'Product Created', entityType: 'product', entityId: id, details: { name: payload.name }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('products', 'create', { ...payload, id }, id);
    await loadAll();
    return id;
  };

  const updateProduct = async (data) => {
    const payload = normalizeProductPayload(data);
    validateProductBarcode(payload);

    const db = await initDB();
    const existingProduct = await dbGet('products', payload.id);
    let existingVariants = [];
    if (payload.id != null) {
      try {
        existingVariants = await db.getAllFromIndex('variants', 'productId', Number(payload.id));
      } catch {
        existingVariants = [];
      }
    }

    await dbPut('products', payload);
    // Sync variants (including stock changes from the edit form)
    if (Array.isArray(payload.variants)) {
      await syncProductVariantsToStore(payload.id, payload.variants, payload);
    }

    // Record audit-only stock movement history for any manual stock edits made through the product edit form.
    if (Array.isArray(payload.variants)) {
      for (const variant of payload.variants) {
        const existingVariant = existingVariants.find((v) => String(v.id) === String(variant.id));
        if (!existingVariant) continue;
        const oldQty = Number(existingVariant.stock || 0);
        const newQty = Number(variant.stock || 0);
        if (oldQty !== newQty) {
          const adjBatchNumber = buildBatchNumber('ADJ');
          await recordManualAdjustment({
            productId: payload.id,
            variantId: Number(variant.id),
            delta: newQty - oldQty,
            quantity: newQty - oldQty,
            reason: 'Product Edit Adjustment',
            notes: `Stock changed during product edit: ${oldQty} → ${newQty}`,
            batchNumber: adjBatchNumber,
            oldQuantity: oldQty,
            newQuantity: newQty,
            oldBatchNumber: existingVariant.batchNumber || '',
            createdBy: currentUser?.name || 'System',
            auditOnly: true,
          });
        }
      }
    }

    if (existingProduct && !Array.isArray(payload.variants)) {
      const oldQty = Number(existingProduct.stock || 0);
      const newQty = Number(payload.stock || 0);
      if (oldQty !== newQty) {
        const adjBatchNumber = buildBatchNumber('ADJ');
        await recordManualAdjustment({
          productId: payload.id,
          variantId: null,
          delta: newQty - oldQty,
          quantity: newQty - oldQty,
          reason: 'Product Edit Adjustment',
          notes: `Stock changed during product edit: ${oldQty} → ${newQty}`,
          batchNumber: adjBatchNumber,
          oldQuantity: oldQty,
          newQuantity: newQty,
          oldBatchNumber: existingProduct.batchNumber || '',
          createdBy: currentUser?.name || 'System',
          auditOnly: true,
        });
      }
    }

    await addAuditLog({ action: 'Product Updated', entityType: 'product', entityId: payload.id, details: { name: payload.name }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('products', 'update', { ...payload, id: payload.id }, payload.id);
    await loadAll();
  };

  const deleteProduct = async (id) => {
    const prod = await dbGet('products', id);
    if (prod) await softDeleteEntity('product', id, prod, 'Deleted by user', currentUser?.username || 'System');
    await dbDelete('products', id);
    await addAuditLog({ action: 'Product Deleted', entityType: 'product', entityId: id, details: {}, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('products', 'delete', { id }, id);
    await loadAll();
  };

  /**
   * Sync embedded product.variants[] to the standalone variants store AND variantBarcodes.
   * This ensures barcode scanning works for ALL products created via AddProductModal.
   */
  const syncProductVariantsToStore = async (productId, variantList, product) => {
    const db = await initDB();
    for (const v of (variantList || [])) {
      if (!v) continue;
      const variantId = v.id;
      const { normalizeBarcodeValue } = await import('../utils/barcodeEngine');
      const normalizedBarcode = normalizeBarcodeValue(v.barcode || '');
      const normalizedSku = normalizeBarcodeValue(v.sku || '');

      // Build label from size+color
      const label = [v.size, v.color].filter(Boolean).join(' / ') || v.label || 'Default';

      // Check if already in variants store
      let existingInStore = null;
      if (typeof variantId === 'number') {
        try { existingInStore = await db.get('variants', variantId); } catch { /* ok */ }
      }

      if (existingInStore) {
        // Update existing store record — preserve stock from the payload (user may have changed it)
        await db.put('variants', {
          ...existingInStore,
          ...v,
          id: variantId,
          productId: Number(productId),
          label,
          barcode: normalizedBarcode,
          sku: normalizedSku,
          stock: Number(v.stock ?? existingInStore.stock ?? 0),
          batchNumber: v.batchNumber || existingInStore.batchNumber || '',
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Insert new record — use product.id as productId
        let newId;
        try {
          newId = await db.add('variants', {
            ...v,
            productId: Number(productId),
            label,
            barcode: normalizedBarcode,
            sku: normalizedSku,
            stock: Number(v.stock || 0),
            createdAt: new Date().toISOString(),
          });
        } catch { newId = null; }
        if (newId && normalizedBarcode) {
          await db.put('variantBarcodes', { barcode: normalizedBarcode, variantId: newId, productId: Number(productId) });
        }
        continue;
      }

      // Update barcode lookup
      if (normalizedBarcode) {
        const existing = await db.get('variantBarcodes', normalizedBarcode);
        if (!existing || String(existing.variantId) === String(variantId)) {
          await db.put('variantBarcodes', { barcode: normalizedBarcode, variantId, productId: Number(productId) });
        }
      }
    }
  };

  // ─── Categories ────────────────────────────────────────────────────────────
  const addCategory = async (data) => { const id = await dbAdd('categories', data); void queueEntityChange('categories', 'create', { ...data, id }, id); await loadAll(); };
  const deleteCategory = async (id) => { await dbDelete('categories', id); void queueEntityChange('categories', 'delete', { id }, id); await loadAll(); };

  // ─── Customers ─────────────────────────────────────────────────────────────
  const addCustomer = async (data) => { const id = await dbAdd('customers', data); void queueEntityChange('customers', 'create', { ...data, id }, id); await loadAll(); return id; };
  const updateCustomer = async (data) => { await dbPut('customers', data); void queueEntityChange('customers', 'update', data, data.id); await loadAll(); };
  const deleteCustomer = async (id) => { await dbDelete('customers', id); void queueEntityChange('customers', 'delete', { id }, id); await loadAll(); };

  // ─── Invoices ──────────────────────────────────────────────────────────────
  const addInvoice = async (data) => {
    // Pre-fetch settings BEFORE opening the transaction to avoid
    // "The transaction has finished" error caused by async getSetting()
    // calls yielding the event loop inside an active IDB transaction.
    const [loyaltySettingsPre, featureTogglesPre] = await Promise.all([
      getSetting('loyaltySettings').catch(() => null),
      getSetting('featuresToggle').catch(() => null),
    ]);

    const db = await initDB();
    const tx = db.transaction(['invoices', 'products', 'customers', 'variants'], 'readwrite');
    const invoicesStore = tx.objectStore('invoices');
    const productsStore = tx.objectStore('products');
    const customersStore = tx.objectStore('customers');
    const variantsStore = tx.objectStore('variants');
    const nowIso = new Date().toISOString();

    // Duplicate invoice number prevention
    const invNo = String(data?.invoiceNumber || '').trim();
    if (invNo) {
      try {
        const idx = invoicesStore.index('invoiceNumber');
        const existing = await idx.get(invNo);
        if (existing) throw new Error(`Duplicate invoice number blocked: ${invNo}`);
      } catch (e) {
        if (e.message && e.message.includes('Duplicate invoice')) throw e;
        try {
          const all = await invoicesStore.getAll();
          const found = (all || []).find(i => String(i?.invoiceNumber || '') === invNo);
          if (found) throw new Error(`Duplicate invoice number blocked: ${invNo}`);
        } catch (scanErr) {
          if (scanErr.message && scanErr.message.includes('Duplicate invoice')) throw scanErr;
        }
      }
    }

    const id = await invoicesStore.add({ ...data, customerBarcode: null, createdAt: data?.createdAt || nowIso });
    const savedInvoice = await invoicesStore.get(id);
    const customerBarcode = `CUST-${String(id).padStart(10, '0')}`;
    if (savedInvoice) {
      await invoicesStore.put({ ...savedInvoice, customerBarcode, updatedAt: nowIso });
    }

    const isRefund = data?.status === 'Refund' || (Number(data?.total) || 0) < 0;

    // Update stock per item
    for (const item of data?.items || []) {
      const prod = await productsStore.get(item.productId);
      if (!prod) continue;
      const qty = Math.max(0, Number(item.qty) || 0);
      const delta = isRefund ? qty : -qty;
      const variantId = item.variantId || item.variant?.id || null;

      // 1. Update standalone variants store
      if (variantId) {
        try {
          const vKey = safeVariantKey(variantId);
          const variant = vKey ? await variantsStore.get(vKey) : null;
          if (variant && variant.productId === item.productId) {
            const newStock = Math.max(0, Number(variant.stock || 0) + delta);
            await variantsStore.put({ ...variant, stock: newStock, updatedAt: nowIso });
          }
        } catch { /* variant not in new store */ }
      }

      // 2. Update embedded variants[] in the product document
      const updatedVariants = Array.isArray(prod.variants)
        ? prod.variants.map(v => {
            if (variantId && String(v.id) === String(variantId)) {
              return { ...v, stock: Math.max(0, Number(v.stock || 0) + delta), updatedAt: nowIso };
            }
            return v;
          })
        : prod.variants;

      // 3. Recalculate total product stock from embedded variants (within transaction)
      let newProductStock;
      if (Array.isArray(updatedVariants) && updatedVariants.length > 0) {
        newProductStock = updatedVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
      } else {
        // No variants — adjust product stock directly
        newProductStock = Math.max(0, Number(prod.stock || 0) + delta);
      }

      await productsStore.put({ ...prod, variants: updatedVariants, stock: newProductStock, updatedAt: nowIso });
    }

    // Update customer stats
    if (data?.customerId) {
      const cust = await customersStore.get(data.customerId);
      if (cust) {
        const isCredit = String(data?.paymentMode || '').toLowerCase() === 'credit';
        const totalDelta = Number(data?.total) || 0;
        const loyaltySettings = loyaltySettingsPre;
        const featureToggles = featureTogglesPre;
        const loyaltyEnabled = featureToggles?.loyaltyEnabled !== false;
        const pointsPer100 = Math.max(0, Number(loyaltySettings?.pointsPer100) || 10);
        const pointsDelta = loyaltyEnabled ? Math.floor((Math.abs(totalDelta) / 100) * pointsPer100) : 0;
        const redeemedPoints = Number(data?.redeemedPoints || 0);
        await customersStore.put({
          ...cust,
          dues: isCredit ? (cust.dues || 0) + totalDelta : (cust.dues || 0),
          points: Math.max(0, (cust.points || 0) + (isRefund ? -pointsDelta : pointsDelta) - redeemedPoints),
          total_orders: isRefund ? (cust.total_orders || 0) : (cust.total_orders || 0) + 1,
          total_spent: (cust.total_spent || 0) + totalDelta,
          last_purchase: data?.date || nowIso,
          last_purchase_date: data?.date || nowIso,
          updatedAt: nowIso,
        });
      }
    }

    await tx.done;
    void queueEntityChange('sales', 'create', { ...data, id, items: data?.items || [] }, id);

    // Record stock movements via centralized engine (outside transaction — audit log only)
    try {
      await recordSaleStockOut({
        items: data?.items || [],
        invoiceId: id,
        invoiceNumber: data?.invoiceNumber,
        createdBy: currentUser?.name || 'System',
        isRefund,
      });
    } catch { /* non-fatal */ }

    await loadAll();
    
    // Dispatch invoice-finalized event for website integration sync hooks
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoice-finalized', {
        detail: { ...data, id, items: data?.items || [] }
      }));
    }
    
    return id;
  };

  const updateInvoice = async (data) => {
    await dbPut('invoices', data);
    void queueEntityChange('sales', 'update', data, data.id);
    await loadAll();
    
    // Dispatch invoice-updated event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoice-updated', { detail: data }));
    }
  };
  
  const deleteInvoice = async (id) => {
    const invoice = await dbGet('invoices', id);
    await dbDelete('invoices', id);
    void queueEntityChange('sales', 'delete', { id }, id);
    await loadAll();
    
    // Dispatch invoice-deleted event
    if (typeof window !== 'undefined' && invoice) {
      window.dispatchEvent(new CustomEvent('invoice-deleted', { detail: invoice }));
    }
  };
  const applyInvoiceAdjustment = async (invoiceId, adjustment) => {
    const inv = await dbGet('invoices', invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const originalTotal = Number(inv.total || 0);
    const adjAmount = Number(adjustment.amount || 0);

    // Calculate new total: discount reduces, charge increases
    let newTotal;
    if (adjustment.type === 'discount') {
      newTotal = Math.max(0, originalTotal - adjAmount);
    } else if (adjustment.type === 'charge') {
      newTotal = originalTotal + adjAmount;
    } else {
      newTotal = originalTotal;
    }

    const paidAmount = Number(adjustment.paidAmount ?? newTotal);
    const balanceAmount = Math.max(0, newTotal - paidAmount);
    const newStatus = balanceAmount <= 0 ? 'Paid' : 'Unpaid';

    await dbPut('invoices', {
      ...inv,
      adjustment,
      // Update the live total so revenue calculations reflect this change
      total: newTotal,
      adjustedTotal: newTotal,
      originalTotal: inv.originalTotal ?? originalTotal,
      paidAmount,
      balanceAmount,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    await addAuditLog({
      action: 'Invoice Adjusted',
      entityType: 'invoice',
      entityId: invoiceId,
      details: { ...adjustment, originalTotal, newTotal },
      userId: currentUser?.username || 'System',
      userName: currentUser?.name || 'System',
    });
    await loadAll();
  };

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  const addSupplier = async (data) => { const id = await dbAdd('suppliers', data); void queueEntityChange('suppliers', 'create', { ...data, id }, id); await loadAll(); };
  const updateSupplier = async (data) => { await dbPut('suppliers', data); void queueEntityChange('suppliers', 'update', data, data.id); await loadAll(); };
  const deleteSupplier = async (id) => { await dbDelete('suppliers', id); void queueEntityChange('suppliers', 'delete', { id }, id); await loadAll(); };

  // ─── Supplier Contacts ────────────────────────────────────────────────────
  const fetchSupplierContacts = async (supplierId) => getSupplierContacts(supplierId);
  const saveSupplierContact = async (data) => {
    const now = new Date().toISOString();
    if (data.id) { await updateSupplierContact(data); }
    else { await addSupplierContact({ ...data, createdBy: currentUser?.name || 'System', createdAt: now }); }
    await addAuditLog({ action: data.id ? 'Supplier Contact Updated' : 'Supplier Contact Added', entityType: 'supplier', entityId: data.supplierId, details: { name: data.name }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
  };
  const removeSupplierContact = async (id, supplierId) => {
    await deleteSupplierContact(id);
    await addAuditLog({ action: 'Supplier Contact Deleted', entityType: 'supplier', entityId: supplierId, details: { id }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
  };

  // ─── Supplier Bank Accounts ───────────────────────────────────────────────
  const fetchSupplierBankAccounts = async (supplierId) => getSupplierBankAccounts(supplierId);
  const saveSupplierBankAccount = async (data) => {
    if (data.id) { await updateSupplierBankAccount(data); }
    else { await addSupplierBankAccount({ ...data, createdBy: currentUser?.name || 'System' }); }
    await addAuditLog({ action: data.id ? 'Bank Account Updated' : 'Bank Account Added', entityType: 'supplier', entityId: data.supplierId, details: { bank: data.bankName }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
  };
  const removeSupplierBankAccount = async (id, supplierId) => {
    await deleteSupplierBankAccount(id);
    await addAuditLog({ action: 'Bank Account Deleted', entityType: 'supplier', entityId: supplierId, details: { id }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
  };

  // ─── Supplier Documents ───────────────────────────────────────────────────
  const fetchSupplierDocuments = async (supplierId) => getSupplierDocuments(supplierId);
  const saveSupplierDocument = async (data) => {
    await addSupplierDocument({ ...data, createdBy: currentUser?.name || 'System' });
    await addAuditLog({ action: 'Supplier Document Added', entityType: 'supplier', entityId: data.supplierId, details: { type: data.type, name: data.name }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
  };
  const removeSupplierDocument = async (id, supplierId) => {
    await deleteSupplierDocument(id);
    await addAuditLog({ action: 'Supplier Document Deleted', entityType: 'supplier', entityId: supplierId, details: { id }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
  };

  // ─── Supplier Payments ────────────────────────────────────────────────────
  const recordSupplierPayment = async (data) => {
    const now = new Date().toISOString();
    const paymentId = await addSupplierPayment({ ...data, createdBy: currentUser?.name || 'System' });
    // Post ledger entry: debit (payment reduces outstanding)
    await addSupplierLedgerEntry({
      supplierId: data.supplierId,
      type: 'payment',
      referenceId: paymentId,
      referenceType: 'payment',
      amount: Number(data.amount || 0),
      debit: Number(data.amount || 0),
      credit: 0,
      note: data.note || `Payment via ${data.method || 'Cash'}`,
      date: data.date || now,
      createdBy: currentUser?.name || 'System',
    });
    // Update supplier balance
    const sup = suppliers.find(s => s.id === Number(data.supplierId));
    if (sup) {
      const newBalance = Math.max(0, Number(sup.balance || 0) - Number(data.amount || 0));
      await dbPut('suppliers', { ...sup, balance: newBalance, updatedAt: now });
    }
    await addAuditLog({ action: 'Supplier Payment Recorded', entityType: 'supplier', entityId: data.supplierId, details: { amount: data.amount, method: data.method }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('suppliers', 'update', { supplierId: data.supplierId, payment: data }, data.supplierId);
    await loadAll();
    return paymentId;
  };
  const editSupplierPayment = async (data) => {
    await updateSupplierPayment(data);
    await loadAll();
  };
  const removeSupplierPayment = async (id, supplierId) => {
    await deleteSupplierPayment(id);
    await addAuditLog({ action: 'Supplier Payment Deleted', entityType: 'supplier', entityId: supplierId, details: { id }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };
  const fetchSupplierPayments = async (supplierId) => getSupplierPayments(supplierId);
  const fetchSupplierLedger = async (supplierId) => getSupplierLedger(supplierId);

  // ─── Supplier Returns ─────────────────────────────────────────────────────
  const createSupplierReturn = async (data) => {
    const now = new Date().toISOString();
    const returnId = await addSupplierReturn({ ...data, createdBy: currentUser?.name || 'System' });
    // Post ledger entry: credit (return reduces what we owe)
    if (String(data.status || '').toLowerCase() === 'approved') {
      await addSupplierLedgerEntry({
        supplierId: data.supplierId,
        type: 'return',
        referenceId: returnId,
        referenceType: 'supplierReturn',
        amount: Number(data.totalAmount || 0),
        debit: Number(data.totalAmount || 0),
        credit: 0,
        note: data.reason || 'Supplier Return',
        date: data.date || now,
        createdBy: currentUser?.name || 'System',
      });
    }
    await addAuditLog({ action: 'Supplier Return Created', entityType: 'supplier', entityId: data.supplierId, details: { reason: data.reason, totalAmount: data.totalAmount }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
    return returnId;
  };
  const editSupplierReturn = async (data) => {
    await updateSupplierReturn(data);
    await addAuditLog({ action: 'Supplier Return Updated', entityType: 'supplier', entityId: data.supplierId, details: { status: data.status }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };
  const removeSupplierReturn = async (id, supplierId) => {
    await deleteSupplierReturn(id);
    await addAuditLog({ action: 'Supplier Return Deleted', entityType: 'supplier', entityId: supplierId, details: { id }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };
  const fetchSupplierReturns = async (supplierId) => getSupplierReturns(supplierId);

  // ─── Supplier Notes ───────────────────────────────────────────────────────
  const fetchSupplierNotes = async (supplierId) => getSupplierNotes(supplierId);
  const addSupplierNoteEntry = async (data) => {
    await addSupplierNote({ ...data, createdBy: currentUser?.name || 'System' });
  };
  const removeSupplierNoteEntry = async (id, supplierId) => {
    await deleteSupplierNote(id);
    await addAuditLog({ action: 'Supplier Note Deleted', entityType: 'supplier', entityId: supplierId, details: { id }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
  };

  // ─── Supplier Purchase Ledger (auto-post on purchase) ─────────────────────
  // Called internally when a purchase is added to auto-post a credit entry
  const postPurchaseLedgerEntry = async (purchaseData, purchaseId) => {
    if (!purchaseData.supplierId) return;
    await addSupplierLedgerEntry({
      supplierId: purchaseData.supplierId,
      type: 'purchase',
      referenceId: purchaseId,
      referenceType: 'purchase',
      amount: Number(purchaseData.total || 0),
      debit: 0,
      credit: Number(purchaseData.total || 0),
      note: `Purchase ${purchaseData.invoiceRef || `#${purchaseId}`}`,
      date: purchaseData.date || new Date().toISOString(),
      createdBy: currentUser?.name || 'System',
    });
    // Update supplier outstanding balance
    const sup = suppliers.find(s => s.id === Number(purchaseData.supplierId));
    if (sup) {
      const newBalance = Number(sup.balance || 0) + Number(purchaseData.total || 0);
      await dbPut('suppliers', { ...sup, balance: newBalance, updatedAt: new Date().toISOString() });
    }
  };

  // ─── Purchases ─────────────────────────────────────────────────────────────
  const addPurchase = async (data) => {
    const id = await dbAdd('purchases', data);
    // Auto-post supplier ledger credit entry
    await postPurchaseLedgerEntry(data, id);
    const db = await initDB();
    for (const item of data.items || []) {
      const qty = Number(item.qty) || 0;
      if (qty <= 0) continue;
      const variantId = item.variantId || null;
      const productId = item.productId;
      if (!productId) continue;

      if (variantId) {
        try {
          const variant = await safeGetVariant(db, variantId, productId);
          if (variant) {
            const newStock = Math.max(0, Number(variant.stock || 0) + qty);
            const vKey = safeVariantKey(variant.id);
            if (vKey) await db.put('variants', { ...variant, stock: newStock, purchaseQuantity: Number(variant.purchaseQuantity || 0) + qty, updatedAt: new Date().toISOString() });
            const allVariants = await db.getAllFromIndex('variants', 'productId', Number(productId));
            const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
            const prod = await dbGet('products', productId);
            if (prod) {
              const updatedEmbedded = Array.isArray(prod.variants)
                ? prod.variants.map(ev => String(ev.id) === String(variantId) ? { ...ev, stock: newStock, updatedAt: new Date().toISOString() } : ev)
                : prod.variants;
              await dbPut('products', { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: new Date().toISOString() });
            }
          }
        } catch (e) { console.warn('addPurchase variant update error:', e); }
      } else {
        const prod = await dbGet('products', productId);
        if (prod) await dbPut('products', { ...prod, stock: (prod.stock || 0) + qty, updatedAt: new Date().toISOString() });
      }
    }
    await loadAll();
  };

  const updatePurchase = async (data) => {
    const db = await initDB();
    const nowIso = new Date().toISOString();
    const oldPurchase = await dbGet('purchases', data.id);

    // Reverse old stock
    if (oldPurchase) {
      for (const item of oldPurchase.items || []) {
        const qty = Number(item.qty) || 0;
        if (qty <= 0) continue;
        if (item.variantId) {
          try {
            const variant = await safeGetVariant(db, item.variantId, item.productId);
            if (variant) {
              const newStock = Math.max(0, Number(variant.stock || 0) - qty);
              const vKey = safeVariantKey(variant.id);
              if (vKey) await db.put('variants', { ...variant, stock: newStock, updatedAt: nowIso });
              const allVariants = await db.getAllFromIndex('variants', 'productId', Number(item.productId));
              const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
              const prod = await dbGet('products', item.productId);
              if (prod) {
                const updatedEmbedded = Array.isArray(prod.variants)
                  ? prod.variants.map(ev => String(ev.id) === String(item.variantId) ? { ...ev, stock: newStock, updatedAt: nowIso } : ev)
                  : prod.variants;
                await dbPut('products', { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: nowIso });
              }
            }
          } catch (e) { console.warn('updatePurchase reverse error:', e); }
        } else {
          const prod = await dbGet('products', item.productId);
          if (prod) await dbPut('products', { ...prod, stock: Math.max(0, (prod.stock || 0) - qty), updatedAt: nowIso });
        }
      }
    }

    await dbPut('purchases', { ...data, updatedAt: nowIso });

    // Apply new stock
    for (const item of data.items || []) {
      const qty = Number(item.qty) || 0;
      if (qty <= 0) continue;
      if (item.variantId) {
        try {
          const variant = await safeGetVariant(db, item.variantId, item.productId);
          if (variant) {
            const newStock = Math.max(0, Number(variant.stock || 0) + qty);
            const vKey = safeVariantKey(variant.id);
            if (vKey) await db.put('variants', { ...variant, stock: newStock, updatedAt: nowIso });
            const allVariants = await db.getAllFromIndex('variants', 'productId', Number(item.productId));
            const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
            const prod = await dbGet('products', item.productId);
            if (prod) {
              const updatedEmbedded = Array.isArray(prod.variants)
                ? prod.variants.map(ev => String(ev.id) === String(item.variantId) ? { ...ev, stock: newStock, updatedAt: nowIso } : ev)
                : prod.variants;
              await dbPut('products', { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: nowIso });
            }
          }
        } catch (e) { console.warn('updatePurchase apply error:', e); }
      } else {
        const prod = await dbGet('products', item.productId);
        if (prod) await dbPut('products', { ...prod, stock: (prod.stock || 0) + qty, updatedAt: nowIso });
      }
    }
    await loadAll();
  };

  const deletePurchase = async (id) => {
    const db = await initDB();
    const nowIso = new Date().toISOString();
    const oldPurchase = await dbGet('purchases', id);
    if (oldPurchase) {
      for (const item of oldPurchase.items || []) {
        const qty = Number(item.qty) || 0;
        if (qty <= 0) continue;
        if (item.variantId) {
          try {
            const variant = await safeGetVariant(db, item.variantId, item.productId);
            if (variant) {
              const newStock = Math.max(0, Number(variant.stock || 0) - qty);
              const vKey = safeVariantKey(variant.id);
              if (vKey) await db.put('variants', { ...variant, stock: newStock, updatedAt: nowIso });
              const allVariants = await db.getAllFromIndex('variants', 'productId', Number(item.productId));
              const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
              const prod = await dbGet('products', item.productId);
              if (prod) {
                const updatedEmbedded = Array.isArray(prod.variants)
                  ? prod.variants.map(ev => String(ev.id) === String(item.variantId) ? { ...ev, stock: newStock, updatedAt: nowIso } : ev)
                  : prod.variants;
                await dbPut('products', { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: nowIso });
              }
            }
          } catch (e) { console.warn('deletePurchase reverse error:', e); }
        } else {
          const prod = await dbGet('products', item.productId);
          if (prod) await dbPut('products', { ...prod, stock: Math.max(0, (prod.stock || 0) - qty), updatedAt: nowIso });
        }
      }
    }
    await dbDelete('purchases', id);
    void queueEntityChange('purchases', 'delete', { id }, id);
    await loadAll();
  };

  // ─── Inventory Batches (Add Stock) ─────────────────────────────────────────
  /**
   * addInventoryBatch — records a batch record and (by default) updates stock.
   *
   * @param {boolean} batchData.stockAlreadyUpdated
   *   Pass true when the CALLER has already updated stock (e.g. addPurchase already
   *   incremented stock for every item in the purchase order).
   *   When true, this function ONLY records the batch document + audit log — it does
   *   NOT touch variant/product stock a second time, preventing double-counting.
   */
  const addInventoryBatch = async (batchData) => {
    const batchNumber = batchData.batchNumber || buildBatchNumber('BT');
    const db = await initDB();
    // Store the batch record (pure data, no stock side-effects in db.js)
    const id = await createInventoryBatch({ ...batchData, batchNumber });

    // Only update stock if the caller hasn't already done it
    if (!batchData.stockAlreadyUpdated) {
      const qty = Number(batchData.quantity || 0);
      if (batchData.variantId) {
        const variant = await safeGetVariant(db, batchData.variantId, batchData.productId);
        if (variant) {
          const newStock = Number(variant.stock || 0) + qty;
          const vKey = safeVariantKey(variant.id);
          // Update variant stock AND record latest batchNumber on the variant
          if (vKey) await db.put('variants', { ...variant, stock: newStock, batchNumber, updatedAt: new Date().toISOString() });
          const allVariants = await db.getAllFromIndex('variants', 'productId', Number(variant.productId));
          const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
          const prod = await dbGet('products', variant.productId);
          if (prod) {
            const updatedEmbedded = Array.isArray(prod.variants)
              ? prod.variants.map(ev => String(ev.id) === String(batchData.variantId)
                  ? { ...ev, stock: newStock, batchNumber, updatedAt: new Date().toISOString() } : ev)
              : prod.variants;
            await dbPut('products', { ...prod, variants: updatedEmbedded, stock: sum, batchNumber, updatedAt: new Date().toISOString() });
          }
        }
      } else {
        // No-variant product: adjust product stock directly
        const prod = await dbGet('products', batchData.productId);
        if (prod) {
          const newStock = Number(prod.stock || 0) + qty;
          await dbPut('products', { ...prod, stock: newStock, batchNumber, updatedAt: new Date().toISOString() });
        }
      }
    } else {
      // Stock was already updated by caller — just stamp batchNumber on the variant/product
      if (batchData.variantId) {
        const variant = await safeGetVariant(db, batchData.variantId, batchData.productId);
        if (variant) {
          const vKey = safeVariantKey(variant.id);
          if (vKey) await db.put('variants', { ...variant, batchNumber, updatedAt: new Date().toISOString() });
          const prod = await dbGet('products', variant.productId);
          if (prod) {
            const updatedEmbedded = Array.isArray(prod.variants)
              ? prod.variants.map(ev => String(ev.id) === String(batchData.variantId)
                  ? { ...ev, batchNumber, updatedAt: new Date().toISOString() } : ev)
              : prod.variants;
            await dbPut('products', { ...prod, variants: updatedEmbedded, batchNumber, updatedAt: new Date().toISOString() });
          }
        }
      } else {
        const prod = await dbGet('products', batchData.productId);
        if (prod) await dbPut('products', { ...prod, batchNumber, updatedAt: new Date().toISOString() });
      }
    }

    // Audit-trail movement record — always audit-only since stock was handled above
    await recordPurchaseStockIn({
      productId: batchData.productId,
      variantId: batchData.variantId,
      quantity: Number(batchData.quantity || 0),
      batchId: id,
      batchNumber,
      supplierId: batchData.supplierId,
      notes: batchData.notes || '',
      createdBy: batchData.createdBy || currentUser?.name || 'System',
      date: batchData.purchaseDate || new Date().toISOString().split('T')[0],
      auditOnly: true, // stock was already handled above — log only
    });

    await addAuditLog({ action: 'Stock Added', entityType: 'inventoryBatch', entityId: id, details: { batchNumber, quantity: batchData.quantity, productId: batchData.productId }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('inventory', 'create', { ...batchData, id, batchNumber }, id);
    await loadAll();
    return id;
  };

  const getInventoryBatches = async (productId, variantId) => {
    const db = await initDB();
    if (variantId) return db.getAllFromIndex('inventoryBatches', 'variantId', variantId);
    if (productId) return db.getAllFromIndex('inventoryBatches', 'productId', productId);
    return db.getAll('inventoryBatches');
  };

  const getStockMovements = async (productId, variantId) => {
    const db = await initDB();
    if (variantId) return db.getAllFromIndex('stockMovements', 'variantId', variantId);
    if (productId) return db.getAllFromIndex('stockMovements', 'productId', productId);
    return db.getAll('stockMovements');
  };

  // ─── Staff ─────────────────────────────────────────────────────────────────
  const addStaff = async (data) => { await dbAdd('staff', data); await loadAll(); };
  const updateStaff = async (data) => { await dbPut('staff', data); await loadAll(); };
  const deleteStaff = async (id) => { await dbDelete('staff', id); await loadAll(); };

  // ─── Expenses ──────────────────────────────────────────────────────────────
  const addExpense = async (data) => { await dbAdd('expenses', data); await loadAll(); };
  const deleteExpense = async (id) => { await dbDelete('expenses', id); await loadAll(); };

  // ─── Variants ──────────────────────────────────────────────────────────────
  const addVariant = async (productId, variantData) => {
    const variantId = await createVariant(productId, variantData);
    await addAuditLog({ action: 'Variant Added', entityType: 'variant', entityId: variantId, details: variantData, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
    return variantId;
  };

  const updateVariantData = async (variantId, updates) => {
    await updateVariant(variantId, updates);
    await addAuditLog({ action: 'Variant Updated', entityType: 'variant', entityId: variantId, details: updates, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };

  const deleteVariantData = async (variantId) => {
    const db = await initDB();
    const vKey = safeVariantKey(variantId);
    const v = vKey ? await db.get('variants', vKey) : null;
    if (v) await softDeleteEntity('variant', variantId, v, 'Deleted by user', currentUser?.username || 'System');
    await deleteVariant(variantId);
    await addAuditLog({ action: 'Variant Deleted', entityType: 'variant', entityId: variantId, details: {}, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };

  const getVariantsByProduct = (productId) => variants.filter(v => v.productId === productId);
  const getVariantByCode = async (barcode) => getVariantByBarcode(barcode);

  // ─── Returns & Exchanges (Phase 13 & 14) ─────────────────────────────────
  const addSalesReturn = async (returnData) => {
    const now = new Date().toISOString();
    const id = await addReturn({ ...returnData, date: now });

    // Restore stock via centralized engine if approved
    if (String(returnData.status || '').toLowerCase() === 'approved') {
      const items = returnData.items || [];
      if (items.length === 0 && returnData.productId) {
        items.push({ productId: returnData.productId, variantId: returnData.variantId || null, qty: Number(returnData.quantity || 0) });
      }
      await recordReturnStockIn({
        items: items.map(i => ({ ...i, quantity: i.qty || i.quantity || 0 })),
        returnId: id,
        invoiceNumber: returnData.invoiceNumber || '',
        reason: returnData.reason || 'Return',
        createdBy: currentUser?.name || 'System',
      });
    }

    await addAuditLog({ action: 'Return Created', entityType: 'return', entityId: id, details: { invoiceNumber: returnData.invoiceNumber, reason: returnData.reason }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
    return id;
  };

  const updateSalesReturn = async (returnData) => {
    const oldReturn = returns.find(r => r.id === returnData.id);
    await updateReturn(returnData);

    // If status changed to Approved, restore stock now
    if (oldReturn && String(oldReturn.status || '').toLowerCase() !== 'approved' &&
        String(returnData.status || '').toLowerCase() === 'approved') {
      const items = returnData.items || [];
      if (items.length === 0 && returnData.productId) {
        items.push({ productId: returnData.productId, variantId: returnData.variantId || null, qty: Number(returnData.quantity || 0) });
      }
      await recordReturnStockIn({
        items: items.map(i => ({ ...i, quantity: i.qty || i.quantity || 0 })),
        returnId: returnData.id,
        invoiceNumber: returnData.invoiceNumber || '',
        reason: returnData.reason || 'Return',
        createdBy: currentUser?.name || 'System',
      });
    }

    await loadAll();
  };

  const deleteSalesReturn = async (id) => {
    await deleteReturn(id);
    await addAuditLog({ action: 'Return Deleted', entityType: 'return', entityId: id, details: {}, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };

  /**
   * markInvoiceReturnStatus — stamps the original invoice with a return/exchange tag.
   * type: 'partial-return' | 'full-return' | 'exchange' | 'partial-exchange'
   * Does NOT change payment status — only adds metadata for display/audit.
   */
  const markInvoiceReturnStatus = async (invoiceId, type, returnRef) => {
    const inv = await dbGet('invoices', invoiceId);
    if (!inv) return;
    const existing = Array.isArray(inv.returnRefs) ? inv.returnRefs : [];
    await dbPut('invoices', {
      ...inv,
      returnTag: type,
      returnRefs: [...existing, returnRef].filter(Boolean),
      updatedAt: new Date().toISOString(),
    });
    await loadAll();
  };

  // ─── Stock Transfers (Phase 12) ──────────────────────────────────────────
  const createStockTransfer = async (transferData) => {
    if (transferData.variantId) {
      const db = await initDB();
      const variant = await safeGetVariant(db, transferData.variantId, transferData.productId);
      if (variant) {
        const available = Math.max(0, Number(variant.stock || 0));
        if (Number(transferData.quantity || 0) > available) {
          throw new Error(`Insufficient stock. Available: ${available}`);
        }
      }
    }

    const now = new Date().toISOString();
    const id = await addStockTransfer({ ...transferData, date: now });

    // Reduce stock at source immediately if status is Approved or auto-reduce
    if (String(transferData.status || '').toLowerCase() === 'approved' ||
        String(transferData.status || '').toLowerCase() === 'completed') {
      await recordTransferOut({
        productId: transferData.productId,
        variantId: transferData.variantId || null,
        quantity: Number(transferData.quantity || 0),
        transferId: id,
        notes: transferData.notes || '',
        createdBy: currentUser?.name || 'System',
      });
    }

    await addAuditLog({ action: 'Transfer Created', entityType: 'stockTransfer', entityId: id, details: { productId: transferData.productId, quantity: transferData.quantity }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('stockAdjustments', 'create', { ...transferData, id }, id);
    await loadAll();
    return id;
  };

  const updateStockTransferById = async (id, updates) => {
    const existing = stockTransfers.find(t => t.id === id);
    const updated = { ...existing, ...updates, id };
    await updateStockTransfer(updated);

    // If just approved — reduce stock now
    if (existing && String(existing.status || '').toLowerCase() === 'pending' &&
        String(updates.status || '').toLowerCase() === 'approved') {
      await recordTransferOut({
        productId: updated.productId,
        variantId: updated.variantId || null,
        quantity: Number(updated.quantity || 0),
        transferId: id,
        notes: updated.notes || '',
        createdBy: currentUser?.name || 'System',
      });
    }

    await addAuditLog({ action: 'Transfer Updated', entityType: 'stockTransfer', entityId: id, details: updates, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('stockAdjustments', 'update', { ...updated, id }, id);
    await loadAll();
  };

  // ─── Warehouse & Godown Management ───────────────────────────────────────

  /**
   * Receive stock into Warehouse (from supplier / opening stock).
   * Does NOT touch rack stock (products.stock / variants.stock).
   */
  const receiveToWarehouse = async ({ productId, variantId = null, qty, notes = '', supplierId = null }) => {
    if (!productId || Number(qty) <= 0) throw new Error('Invalid product or quantity');
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');
    const variantRec = variantId ? variants.find(v => v.id === Number(variantId)) : null;
    const variantLabel = variantRec ? (variantRec.label || variantRec.size || '') : '';

    // Adjust warehouse stock
    await adjustWarehouseStock(productId, variantId, Number(qty), notes, currentUser?.name || 'System');

    // Record movement
    await recordWarehouseMovement({
      type: 'RECEIVE',
      productId,
      variantId,
      productName: product.name,
      variantLabel,
      qty: Number(qty),
      fromLocation: supplierId ? 'Supplier' : 'External',
      toLocation: 'Warehouse',
      notes,
      movedBy: currentUser?.name || 'System',
    });

    await addAuditLog({
      action: 'Warehouse Receive',
      entityType: 'warehouse',
      entityId: productId,
      details: { qty, variantId, notes },
      userId: currentUser?.username || 'System',
      userName: currentUser?.name || 'System',
    });
    await loadAll();
  };

  /**
   * Transfer stock from Warehouse → Rack.
   * Decreases warehouse qty, increases rack stock (variants.stock / products.stock).
   */
  const moveWarehouseToRack = async ({ productId, variantId = null, qty, notes = '' }) => {
    if (!productId || Number(qty) <= 0) throw new Error('Invalid product or quantity');
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');

    // Validate warehouse has enough stock
    const entry = await getWarehouseStockEntry(productId, variantId);
    const warehouseQty = entry ? Number(entry.qty || 0) : 0;
    if (Number(qty) > warehouseQty) {
      throw new Error(`Insufficient warehouse stock. Available: ${warehouseQty}`);
    }

    const variantRec = variantId ? variants.find(v => v.id === Number(variantId)) : null;
    const variantLabel = variantRec ? (variantRec.label || variantRec.size || '') : '';

    // 1. Decrease warehouse qty
    await adjustWarehouseStock(productId, variantId, -Number(qty), notes, currentUser?.name || 'System');

    // 2. Increase rack stock (variants.stock + products.stock)
    const db = await initDB();
    const nowIso = new Date().toISOString();
    if (variantId) {
      const variant = await safeGetVariant(db, variantId, productId);
      if (variant) {
        const newStock = Number(variant.stock || 0) + Number(qty);
        const vKey = typeof variant.id === 'number' ? variant.id : null;
        if (vKey) await db.put('variants', { ...variant, stock: newStock, updatedAt: nowIso });
        // Recalculate product aggregate
        const allVariants = await db.getAllFromIndex('variants', 'productId', Number(productId));
        const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
        const prod = await db.get('products', Number(productId));
        if (prod) {
          const updatedEmbedded = Array.isArray(prod.variants)
            ? prod.variants.map(ev => String(ev.id) === String(variantId)
                ? { ...ev, stock: newStock, updatedAt: nowIso } : ev)
            : prod.variants;
          await db.put('products', { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: nowIso });
        }
      }
    } else {
      const prod = await db.get('products', Number(productId));
      if (prod) {
        await db.put('products', { ...prod, stock: Number(prod.stock || 0) + Number(qty), updatedAt: nowIso });
      }
    }

    // 3. Record movement
    await recordWarehouseMovement({
      type: 'TO_RACK',
      productId,
      variantId,
      productName: product.name,
      variantLabel,
      qty: Number(qty),
      fromLocation: 'Warehouse',
      toLocation: 'Rack',
      notes,
      movedBy: currentUser?.name || 'System',
    });

    await addAuditLog({
      action: 'Warehouse → Rack',
      entityType: 'warehouse',
      entityId: productId,
      details: { qty, variantId, notes },
      userId: currentUser?.username || 'System',
      userName: currentUser?.name || 'System',
    });
    await loadAll();
  };

  /**
   * Move stock back from Rack → Warehouse (return to godown).
   */
  const moveRackToWarehouse = async ({ productId, variantId = null, qty, notes = '' }) => {
    if (!productId || Number(qty) <= 0) throw new Error('Invalid product or quantity');
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');

    // Validate rack has enough stock
    const db = await initDB();
    const nowIso = new Date().toISOString();
    if (variantId) {
      const variant = await safeGetVariant(db, variantId, productId);
      const rackQty = variant ? Number(variant.stock || 0) : 0;
      if (Number(qty) > rackQty) throw new Error(`Insufficient rack stock. Available: ${rackQty}`);
      if (variant) {
        const newStock = Math.max(0, rackQty - Number(qty));
        const vKey = typeof variant.id === 'number' ? variant.id : null;
        if (vKey) await db.put('variants', { ...variant, stock: newStock, updatedAt: nowIso });
        const allVariants = await db.getAllFromIndex('variants', 'productId', Number(productId));
        const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
        const prod = await db.get('products', Number(productId));
        if (prod) {
          const updatedEmbedded = Array.isArray(prod.variants)
            ? prod.variants.map(ev => String(ev.id) === String(variantId)
                ? { ...ev, stock: newStock, updatedAt: nowIso } : ev)
            : prod.variants;
          await db.put('products', { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: nowIso });
        }
      }
    } else {
      const prod = await db.get('products', Number(productId));
      const rackQty = prod ? Number(prod.stock || 0) : 0;
      if (Number(qty) > rackQty) throw new Error(`Insufficient rack stock. Available: ${rackQty}`);
      if (prod) await db.put('products', { ...prod, stock: Math.max(0, rackQty - Number(qty)), updatedAt: nowIso });
    }

    // Increase warehouse qty
    await adjustWarehouseStock(productId, variantId, Number(qty), notes, currentUser?.name || 'System');

    const variantRec = variantId ? variants.find(v => v.id === Number(variantId)) : null;
    const variantLabel = variantRec ? (variantRec.label || variantRec.size || '') : '';

    await recordWarehouseMovement({
      type: 'FROM_RACK',
      productId,
      variantId,
      productName: product.name,
      variantLabel,
      qty: Number(qty),
      fromLocation: 'Rack',
      toLocation: 'Warehouse',
      notes,
      movedBy: currentUser?.name || 'System',
    });

    await addAuditLog({
      action: 'Rack → Warehouse',
      entityType: 'warehouse',
      entityId: productId,
      details: { qty, variantId, notes },
      userId: currentUser?.username || 'System',
      userName: currentUser?.name || 'System',
    });
    await loadAll();
  };

  /**
   * Manual warehouse stock adjustment (correction / damage / audit).
   */
  const adjustWarehouseStockManual = async ({ productId, variantId = null, newQty, notes = '' }) => {
    if (!productId) throw new Error('Invalid product');
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');

    const entry = await getWarehouseStockEntry(productId, variantId);
    const oldQty = entry ? Number(entry.qty || 0) : 0;
    const delta = Number(newQty) - oldQty;

    await dbSetWarehouseStock(productId, variantId, Number(newQty), notes, currentUser?.name || 'System');

    const variantRec = variantId ? variants.find(v => v.id === Number(variantId)) : null;
    const variantLabel = variantRec ? (variantRec.label || variantRec.size || '') : '';

    await recordWarehouseMovement({
      type: 'ADJUSTMENT',
      productId,
      variantId,
      productName: product.name,
      variantLabel,
      qty: delta,
      fromLocation: 'Warehouse',
      toLocation: 'Warehouse',
      notes: notes || `Manual adjustment: ${oldQty} → ${newQty}`,
      movedBy: currentUser?.name || 'System',
    });

    await addAuditLog({
      action: 'Warehouse Adjustment',
      entityType: 'warehouse',
      entityId: productId,
      details: { oldQty, newQty, delta, variantId, notes },
      userId: currentUser?.username || 'System',
      userName: currentUser?.name || 'System',
    });
    await loadAll();
  };

  /**
   * Fetch warehouse movements for a product (for history tab).
   */
  const fetchWarehouseMovements = async (productId = null) => {
    if (productId) return getWarehouseMovementsByProduct(productId);
    return getAllWarehouseMovements();
  };

  // ─── Company & Settings ───────────────────────────────────────────────────
  const saveCompany = async (data) => {
    setCompany(data);
    await setSetting('company', data);
    // Reload all sounds whenever settings are saved
    try { loadAllSounds(data); } catch { /* non-fatal */ }
    toast.success('Settings saved!');
  };

  // ─── Enterprise product operations ────────────────────────────────────────
  const archiveProductById = async (id) => {
    await archiveProduct(id);
    await addAuditLog({ action: 'Product Archived', entityType: 'product', entityId: id, details: {}, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };
  const unarchiveProductById = async (id) => {
    await unarchiveProduct(id);
    await addAuditLog({ action: 'Product Restored', entityType: 'product', entityId: id, details: {}, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    await loadAll();
  };
  const duplicateProductById = async (id) => {
    const newId = await duplicateProduct(id);
    await loadAll();
    return newId;
  };
  const manualStockAdjustment = async (params) => {
    const delta = Number(params.quantity || params.delta || 0);
    // Generate a batch number for manual adjustments (positive adjustments = stock in)
    const batchNumber = params.batchNumber || buildBatchNumber('ADJ');
    let oldQuantity = null;
    let newQuantity = null;
    let oldBatchNumber = '';

    if (params.variantId) {
      const db = await initDB();
      const variant = await safeGetVariant(db, params.variantId, params.productId);
      if (variant) {
        oldQuantity = Number(variant.stock || 0);
        oldBatchNumber = variant.batchNumber || '';
        newQuantity = Math.max(0, oldQuantity + delta);
        const vKey = safeVariantKey(variant.id);
        // Update variant stock and, if adding stock, update latest batchNumber
        const variantUpdate = delta > 0
          ? { ...variant, stock: newQuantity, batchNumber, updatedAt: new Date().toISOString() }
          : { ...variant, stock: newQuantity, updatedAt: new Date().toISOString() };
        if (vKey) await db.put('variants', variantUpdate);
        const allVariants = await db.getAllFromIndex('variants', 'productId', Number(variant.productId));
        const sum = allVariants.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
        const prod = await dbGet('products', variant.productId);
        if (prod) {
          const updatedEmbedded = Array.isArray(prod.variants)
            ? prod.variants.map(ev => {
                if (String(ev.id) === String(params.variantId)) {
                  return delta > 0
                    ? { ...ev, stock: newQuantity, batchNumber, updatedAt: new Date().toISOString() }
                    : { ...ev, stock: newQuantity, updatedAt: new Date().toISOString() };
                }
                return ev;
              })
            : prod.variants;
          const prodUpdate = delta > 0
            ? { ...prod, variants: updatedEmbedded, stock: sum, batchNumber, updatedAt: new Date().toISOString() }
            : { ...prod, variants: updatedEmbedded, stock: sum, updatedAt: new Date().toISOString() };
          await dbPut('products', prodUpdate);
        }
      }
    } else if (params.productId && !params.variantId) {
      // No-variant product: adjust product stock directly
      const prod = await dbGet('products', params.productId);
      if (prod) {
        oldQuantity = Number(prod.stock || 0);
        oldBatchNumber = prod.batchNumber || '';
        newQuantity = Math.max(0, oldQuantity + delta);
        const prodUpdate = delta > 0
          ? { ...prod, stock: newQuantity, batchNumber, updatedAt: new Date().toISOString() }
          : { ...prod, stock: newQuantity, updatedAt: new Date().toISOString() };
        await dbPut('products', prodUpdate);
      }
    }
    // Audit log only — stock was already updated above
    await recordManualAdjustment({ ...params, delta, batchNumber, oldQuantity, newQuantity, oldBatchNumber, auditOnly: true, createdBy: currentUser?.name || 'System' });
    await addAuditLog({ action: 'Manual Stock Adjustment', entityType: 'product', entityId: params.productId, details: { ...params, batchNumber, oldQuantity, newQuantity, oldBatchNumber }, userId: currentUser?.username || 'System', userName: currentUser?.name || 'System' });
    void queueEntityChange('stockAdjustments', 'create', { ...params, batchNumber, delta, oldQuantity, newQuantity, oldBatchNumber }, params.productId);
    await loadAll();
    return batchNumber;
  };

  // ─── Barcode helpers ──────────────────────────────────────────────────────
  const generateBarcodeUnique = async () => generateUniqueBarcode();
  const checkBarcodeUnique = async (barcode, excludeVariantId, excludeProductId) =>
    isBarcodeUnique(barcode, excludeVariantId, excludeProductId);
  const checkSkuUnique = async (sku, excludeVariantId) => isSkuUnique(sku, excludeVariantId);

  // ─── Data fetchers ────────────────────────────────────────────────────────
  const fetchAllBatches = async () => getAllBatches();
  const fetchBatchesByVariant = async (variantId) => getBatchesByVariant(variantId);
  const fetchBatchesByProduct = async (productId) => getBatchesByProduct(productId);
  const fetchBatchesByNumber = async (batchNumber) => getBatchesByNumber(batchNumber);
  const fetchAllStockMovements = async () => getAllStockMovements();
  const fetchStockMovementsByVariant = async (variantId) => getStockMovementsByVariant(variantId);
  const fetchStockMovementsByProduct = async (productId) => getStockMovementsByProduct(productId);
  const fetchStockMovementsByBatchNumber = async (batchNumber) => getStockMovementsByBatchNumber(batchNumber);
  const fetchBarcodePrintLogs = async (variantId) => getBarcodePrintLogs(variantId);
  const fetchAuditLogs = async () => getAllAuditLogs();
  const fetchSoftDeletes = async (entityType) => getAllSoftDeletes(entityType);
  const restoreDeletedRecord = async (softDeleteId) => restoreSoftDelete(softDeleteId, currentUser?.name || 'System');
  const permanentlyDelete = async (softDeleteId) => permanentlyDeleteSoftRecord(softDeleteId, currentUser?.name || 'System');

  // ─── Print Settings ───────────────────────────────────────────────────────
  const savePrintSettings = async (data) => {
    const saved = await savePrintSettingsUtil(data);
    setPrintSettings(saved);
    return saved;
  };

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    const allStaff = await dbGetAll('staff');
    const user = allStaff.find(s => s.username === username && s.password === password && s.active);
    if (user) { setCurrentUser(user); await setSetting('currentUser', user); return true; }
    return false;
  };
  const logout = () => { setCurrentUser(null); setSetting('currentUser', null); };
  const verifyPin = (pin) => currentUser?.pin === pin;

  const refreshCloudSyncState = async () => {
    try {
      const [status, logs] = await Promise.all([refreshCloudSyncStatus(), getSyncLogs('all')]);
      setCloudSyncStatus(status);
      setCloudSyncLogs((logs || []).slice(-50));
      const pending = await getPendingQueueItems(50);
      setCloudSyncQueue(pending);
      return status;
    } catch {
      return cloudSyncStatus;
    }
  };

  const saveCloudSyncSettings = async (formData) => {
    try {
      const cleaned = await persistCloudSyncConfig(formData);
      setCloudSyncConfig(cleaned);
      const testResult = await testCloudConnection(cleaned);
      if (!testResult.success) {
        await saveCloudSyncStatus({ connectionStatus: 'Disconnected', serverStatus: 'Offline', lastError: testResult.error });
        const status = await refreshCloudSyncState();
        return { success: false, error: testResult.error, status };
      }
      const connectResult = await connectCloudServer(cleaned);
      setCloudSyncConfig(cleaned);
      const status = await refreshCloudSyncState();
      if (!connectResult.success) {
        await saveCloudSyncStatus({ connectionStatus: 'Disconnected', serverStatus: 'Offline', lastError: connectResult.error });
        return { success: false, error: connectResult.error, status };
      }
      await startCloudSyncBackgroundWorker();
      return { success: true, status };
    } catch (error) {
      const status = await refreshCloudSyncState();
      return { success: false, error: error.message || 'Unable to save cloud sync settings', status };
    }
  };

  const testCloudSyncConnection = async (formData) => {
    try {
      // Only test — do NOT persist config to DB during a test
      const cleaned = sanitizeCloudSyncConfig(formData || cloudSyncConfig || {});
      const result = await testCloudConnection(cleaned);
      await saveCloudSyncStatus({ connectionStatus: result.success ? 'Connected' : 'Disconnected', serverStatus: result.success ? 'Online' : 'Offline', lastError: result.error || '' });
      return result;
    } catch (error) {
      return { success: false, error: error.message || 'Unable to test connection' };
    }
  };

  const forceCloudSyncNow = async () => {
    await startCloudSyncBackgroundWorker();
    return refreshCloudSyncState();
  };

  const clearCloudSyncCache = async () => {
    await clearCloudSyncQueue();
    return refreshCloudSyncState();
  };

  const retryFailedCloudSyncQueue = async () => {
    await retryFailedCloudSync();
    return refreshCloudSyncState();
  };

  const lowStockProducts = products.filter(p => {
    const threshold = Number(inventorySettings?.lowStockThreshold) || 5;
    const variantThreshold = Math.max(1, threshold);
    const baseLow = p.stock !== undefined && p.stock <= (p.minStock || threshold);
    const sizeLow = p.sizes && Object.values(p.sizes).some(s => typeof s.stock === 'number' && s.stock <= (s.minStock || variantThreshold));
    const variantLow = Array.isArray(p.variants) && p.variants.some(v => typeof v.stock === 'number' && v.stock <= (v.minStock || variantThreshold));
    return baseLow || sizeLow || variantLow;
  });

  return (
    <AppContext.Provider value={{
      theme, toggleTheme, currentUser, login, logout, isLocked, setIsLocked, verifyPin,
      company, saveCompany,
      printSettings, savePrintSettings,
      invoiceTextStyles,
      products, addProduct, updateProduct, deleteProduct,
      categories, addCategory, deleteCategory,
      customers, addCustomer, updateCustomer, deleteCustomer,
      invoices, addInvoice, updateInvoice, deleteInvoice, applyInvoiceAdjustment,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      purchases, addPurchase, updatePurchase, deletePurchase,
      addInventoryBatch, getInventoryBatches, getStockMovements,
      staff, addStaff, updateStaff, deleteStaff,
      expenses, addExpense, deleteExpense,
      variants, addVariant, updateVariantData, deleteVariantData, getVariantsByProduct, getVariantByCode,
      // Returns & Exchanges
      returns, addSalesReturn, updateSalesReturn, deleteSalesReturn, markInvoiceReturnStatus,
      // Stock Transfers
      stockTransfers, createStockTransfer, updateStockTransfer: updateStockTransferById,
      // Enterprise product operations
      archiveProductById, unarchiveProductById, duplicateProductById, manualStockAdjustment,
      // Barcode/SKU helpers
      generateBarcodeUnique, checkBarcodeUnique, checkSkuUnique,
      // Batch & movement fetchers
      fetchAllBatches, fetchBatchesByVariant, fetchBatchesByProduct, fetchBatchesByNumber,
      fetchAllStockMovements, fetchStockMovementsByVariant, fetchStockMovementsByProduct, fetchStockMovementsByBatchNumber,
      fetchBarcodePrintLogs,
      // Audit & soft-delete
      fetchAuditLogs, fetchSoftDeletes, restoreDeletedRecord, permanentlyDelete,
      // Cloud sync
      cloudSyncConfig, cloudSyncStatus, cloudSyncLogs, cloudSyncQueue,
      saveCloudSyncSettings, testCloudSyncConnection, forceCloudSyncNow,
      clearCloudSyncCache, retryFailedCloudSyncQueue, refreshCloudSyncState,
      lowStockProducts, loadAll,
      inventorySettings,
      // Warehouse & Godown
      warehouseStock, warehouseMovements,
      receiveToWarehouse, moveWarehouseToRack, moveRackToWarehouse,
      adjustWarehouseStockManual, fetchWarehouseMovements,
      // Supplier SRM (v16)
      supplierPayments, supplierReturns,
      fetchSupplierContacts, saveSupplierContact, removeSupplierContact,
      fetchSupplierBankAccounts, saveSupplierBankAccount, removeSupplierBankAccount,
      fetchSupplierDocuments, saveSupplierDocument, removeSupplierDocument,
      recordSupplierPayment, editSupplierPayment, removeSupplierPayment,
      fetchSupplierPayments, fetchSupplierLedger,
      createSupplierReturn, editSupplierReturn, removeSupplierReturn, fetchSupplierReturns,
      fetchSupplierNotes, addSupplierNoteEntry, removeSupplierNoteEntry,
    }}>
      {children}
    </AppContext.Provider>
  );
};

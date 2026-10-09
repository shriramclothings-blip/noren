// useSyncedDB.js - React hook for using sync-aware database operations
import { useEffect, useMemo } from 'react';
import { useNetworkSync } from '../context/NetworkSyncContext';
import * as dbSync from '../db/dbSync';

/**
 * Hook to use database operations with automatic network synchronization
 * @returns {Object} Database operations object
 */
export const useSyncedDB = () => {
  const networkSyncContext = useNetworkSync();

  // Initialize sync integration when network context is available
  useEffect(() => {
    if (networkSyncContext) {
      // Get sync engine from context if available
      const syncEngine = networkSyncContext.syncEngine;
      if (syncEngine) {
        dbSync.initializeSyncIntegration(syncEngine, networkSyncContext);
      }
    }
  }, [networkSyncContext]);

  // Return database operations
  return useMemo(() => ({
    // Core operations
    initDB: dbSync.initDB,
    getAll: dbSync.dbGetAll,
    get: dbSync.dbGet,
    add: dbSync.dbAdd,
    put: dbSync.dbPut,
    delete: dbSync.dbDelete,
    getByIndex: dbSync.dbGetByIndex,
    clear: dbSync.dbClear,
    
    // Settings
    getSetting: dbSync.getSetting,
    setSetting: dbSync.setSetting,
    
    // Backup/Restore
    exportBackup: dbSync.exportBackup,
    importBackup: dbSync.importBackup,
    
    // Variants
    createVariant: dbSync.createVariant,
    updateVariant: dbSync.updateVariant,
    deleteVariant: dbSync.deleteVariant,
    updateVariantStock: dbSync.updateVariantStock,
    getProductVariants: dbSync.getProductVariants,
    getVariantByBarcode: dbSync.getVariantByBarcode,
    getVariantWithProduct: dbSync.getVariantWithProduct,
    searchVariants: dbSync.searchVariants,
    
    // Inventory
    recordStockMovement: dbSync.recordStockMovement,
    createInventoryBatch: dbSync.createInventoryBatch,
    logBarcodePrint: dbSync.logBarcodePrint,
    
    // Invoices
    reserveInvoiceNumber: dbSync.reserveProfessionalInvoiceNumber,
    createInvoice: dbSync.createInvoice,
    updateInvoice: dbSync.updateInvoice,
    
    // Products
    createProduct: dbSync.createProduct,
    updateProduct: dbSync.updateProduct,
    deleteProduct: dbSync.deleteProduct,
    
    // Customers
    createCustomer: dbSync.createCustomer,
    updateCustomer: dbSync.updateCustomer,
    
    // Batch operations
    batchUpdate: dbSync.batchUpdate,
    batchAdd: dbSync.batchAdd,
    batchDelete: dbSync.batchDelete,
  }), []);
};

export default useSyncedDB;

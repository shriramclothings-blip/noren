/**
 * useBackendSync Hook
 * Bridges AppContext with backend API services
 * Provides online-first data access with IndexedDB fallback/cache
 */

import { useEffect, useCallback, useRef } from 'react';
import apiService from '../services/apiService';
import posInvoiceSync from '../services/posInvoiceSync';

/**
 * Custom hook for backend data synchronization
 * Usage: const { syncData, getBackendData, queueSync } = useBackendSync();
 */
export const useBackendSync = () => {
  const syncStateRef = useRef({
    isSyncing: false,
    lastSyncTime: null,
    pendingUpdates: [],
  });

  /**
   * Fetch data from backend API
   */
  const getBackendData = useCallback(async (endpoint, params = {}) => {
    try {
      const data = await apiService.get(endpoint, params);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Backend Sync] Fetch failed:', endpoint, error.message);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }, []);

  /**
   * Post data to backend (create/update)
   */
  const postBackendData = useCallback(async (endpoint, payload) => {
    try {
      const data = await apiService.post(endpoint, payload);
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Backend Sync] Post failed:', endpoint, error.message);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }, []);

  /**
   * Sync invoice to backend with auto-email
   */
  const syncInvoiceToBackend = useCallback(async (invoiceData, customerEmail) => {
    const result = await posInvoiceSync.syncInvoiceToBackend({
      ...invoiceData,
      customerEmail,
    });

    return {
      success: result.success,
      saleId: result.saleId,
      publicToken: result.publicToken,
      publicUrl: result.publicUrl,
      error: result.error,
    };
  }, []);

  /**
   * Process queued invoices (retry logic)
   */
  const processQueuedInvoices = useCallback(async () => {
    const result = await posInvoiceSync.processQueuedInvoices();
    return result;
  }, []);

  /**
   * Queue data change for later sync (if offline)
   */
  const queueSync = useCallback(async (entityType, action, data) => {
    if (!navigator.onLine) {
      console.log('[Backend Sync] Offline - queuing for later:', { entityType, action });
      // Queue in local storage for later sync
      const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      queue.push({
        id: `${entityType}_${Date.now()}`,
        entityType,
        action,
        data,
        queuedAt: new Date().toISOString(),
      });
      localStorage.setItem('sync_queue', JSON.stringify(queue));
      return { queued: true };
    }

    // Online - sync immediately
    return await postBackendData(`/erp/sync/${entityType}`, { action, data });
  }, [postBackendData]);

  /**
   * Get connection status
   */
  const getConnectionStatus = useCallback(() => {
    return apiService.getConnectionStatus();
  }, []);

  /**
   * Test backend connection
   */
  const testConnection = useCallback(async () => {
    return await apiService.testConnection();
  }, []);

  /**
   * Initialize backend sync on component mount
   */
  useEffect(() => {
    // Process any queued items on startup
    const initSync = async () => {
      if (!navigator.onLine) {
        console.log('[Backend Sync] Offline on init');
        return;
      }

      try {
        const result = await processQueuedInvoices();
        if (result.processed > 0) {
          console.log('[Backend Sync] Processed queued invoices on init:', result);
        }
      } catch (error) {
        console.error('[Backend Sync] Initialization error:', error);
      }
    };

    initSync();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('[Backend Sync] Connection restored');
      processQueuedInvoices().catch(console.error);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processQueuedInvoices]);

  return {
    getBackendData,
    postBackendData,
    syncInvoiceToBackend,
    processQueuedInvoices,
    queueSync,
    getConnectionStatus,
    testConnection,
  };
};

export default useBackendSync;

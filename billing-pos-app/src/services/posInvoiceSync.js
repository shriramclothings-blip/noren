/**
 * POS Invoice Sync Service
 * Syncs invoices to backend with auto-email to customer
 */

import apiService from './apiService';
import deviceRegistration from './deviceRegistration';

/**
 * Generate UUID v4 (browser-native implementation)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class PosInvoiceSyncService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
  }

  /**
   * Sync invoice to backend
   * Automatically triggers customer email if email is provided
   */
  async syncInvoiceToBackend(localInvoiceData) {
    try {
      // Ensure device is registered
      const deviceStatus = deviceRegistration.getDeviceStatus();
      if (!deviceStatus.isRegistered) {
        console.warn('[Invoice Sync] Device not registered, queueing for later sync');
        this.queueForLaterSync(localInvoiceData);
        return {
          success: false,
          queued: true,
          reason: 'device_not_registered',
        };
      }

      const deviceId = deviceRegistration.deviceId;
      if (!deviceId) {
        throw new Error('Device ID not available');
      }

      // Generate idempotency key for this invoice
      const idempotencyKey = this.generateIdempotencyKey(localInvoiceData);

      // Prepare invoice payload for backend
      const invoicePayload = this.buildBackendInvoicePayload(localInvoiceData, deviceId, idempotencyKey);

      console.log('[Invoice Sync] Syncing invoice to backend:', {
        invoiceNumber: invoicePayload.bill_no,
        customer: invoicePayload.customer_email || 'no-email',
        total: invoicePayload.total,
      });

      // Call backend sync API
      const response = await apiService.post('/erp/pos/integration/invoices/sync', invoicePayload);

      if (response && response.sale_id) {
        console.log('[Invoice Sync] ✓ Invoice synced successfully:', {
          localId: localInvoiceData.id,
          backendSaleId: response.sale_id,
          billNo: response.bill_no,
          publicToken: response.public_token ? 'generated' : 'none',
        });

        // Store backend mapping
        this.storeBackendMapping(localInvoiceData.id, response);

        return {
          success: true,
          saleId: response.sale_id,
          billNo: response.bill_no,
          publicToken: response.public_token,
          publicUrl: response.public_url,
          alreadySynced: response.already_synced || false,
        };
      } else {
        throw new Error('Invalid response from backend');
      }

    } catch (error) {
      console.error('[Invoice Sync] Failed to sync invoice:', error.message);

      // Queue for retry if retryable error
      if (this.isRetryableError(error)) {
        this.queueForLaterSync(localInvoiceData);
      }

      return {
        success: false,
        error: error.message,
        retryQueued: this.isRetryableError(error),
      };
    }
  }

  /**
   * Build backend invoice payload from local invoice data
   */
  buildBackendInvoicePayload(localInvoice, deviceId, idempotencyKey) {
    // Map cart items to backend format
    const items = (localInvoice.items || []).map(item => ({
      inventory_item_id: item.productId || null, // May need mapping if not synced
      title: item.name,
      sku: item.sku || null,
      quantity: item.qty,
      unit_price: item.price,
      tax_amount: this.calculateItemTax(item),
      discount_amount: 0, // Item-level discount if needed
      line_total: item.price * item.qty,
      gst_rate: item.taxRate || 0,
    }));

    // Extract customer email from selected customer
    const customerEmail = localInvoice.customer?.email || localInvoice.customerEmail || null;
    const customerPhone = localInvoice.customer?.phone || localInvoice.customerPhone || null;
    const customerName = localInvoice.customer?.name || localInvoice.customerName || 'Walk-in Customer';

    return {
      idempotency_key: idempotencyKey,
      device_id: deviceId,
      bill_no: localInvoice.invoiceNumber,
      items,
      payment_method: this.mapPaymentMethod(localInvoice.paymentMode),
      split_payment: this.buildSplitPayment(localInvoice),
      customer_id: localInvoice.customerId || null,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_name: customerName,
      discount_amount: localInvoice.discount || 0,
      tax_amount: localInvoice.tax || this.calculateTotalTax(items),
      round_off: localInvoice.roundOff || 0,
      total: localInvoice.total,
      notes: localInvoice.notes || null,
      store_credit_used: localInvoice.storeCreditUsed || 0,
      created_at: localInvoice.date || localInvoice.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Calculate item-level tax
   */
  calculateItemTax(item) {
    const taxRate = item.taxRate || 0;
    const baseAmount = item.price * item.qty;
    return (baseAmount * taxRate) / 100;
  }

  /**
   * Calculate total tax from items
   */
  calculateTotalTax(items) {
    return items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  }

  /**
   * Map local payment mode to backend format
   */
  mapPaymentMethod(localMode) {
    const mode = String(localMode || 'cash').toLowerCase();
    
    const mapping = {
      'cash': 'cash',
      'card': 'card',
      'upi': 'upi',
      'credit': 'credit',
      'wallet': 'wallet',
      'netbanking': 'netbanking',
      'cheque': 'cheque',
    };

    return mapping[mode] || 'cash';
  }

  /**
   * Build split payment array if partition payment was used
   */
  buildSplitPayment(localInvoice) {
    if (!localInvoice.paymentBreakdown || !Array.isArray(localInvoice.paymentBreakdown)) {
      return null;
    }

    return localInvoice.paymentBreakdown.map(bp => ({
      method: this.mapPaymentMethod(bp.method),
      amount: bp.amount,
    }));
  }

  /**
   * Generate idempotency key for invoice
   */
  generateIdempotencyKey(invoiceData) {
    // Check if already generated and stored
    const stored = localStorage.getItem(`idempotency_${invoiceData.id}`);
    if (stored) return stored;

    // Generate new UUID v4
    const key = generateUUID();
    
    // Store for future retries
    localStorage.setItem(`idempotency_${invoiceData.id}`, key);
    
    return key;
  }

  /**
   * Store backend mapping for reference
   */
  storeBackendMapping(localId, backendResponse) {
    try {
      const mapping = {
        localId,
        saleId: backendResponse.sale_id,
        billNo: backendResponse.bill_no,
        publicToken: backendResponse.public_token,
        publicUrl: backendResponse.public_url,
        syncedAt: new Date().toISOString(),
      };

      localStorage.setItem(`backend_mapping_${localId}`, JSON.stringify(mapping));

      // Also store in a global index for quick lookups
      const index = JSON.parse(localStorage.getItem('backend_sync_index') || '{}');
      index[localId] = mapping;
      localStorage.setItem('backend_sync_index', JSON.stringify(index));

    } catch (error) {
      console.error('[Invoice Sync] Failed to store backend mapping:', error);
    }
  }

  /**
   * Get backend mapping for local invoice
   */
  getBackendMapping(localId) {
    try {
      const stored = localStorage.getItem(`backend_mapping_${localId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Invoice Sync] Failed to get backend mapping:', error);
    }
    return null;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    // Network errors
    if (!error.status) return true;
    
    // Server errors (5xx)
    if (error.status >= 500) return true;
    
    // Rate limit
    if (error.status === 429) return true;
    
    // Don't retry client errors (4xx) except for these:
    if (error.status === 408 || error.status === 409) return true;
    
    return false;
  }

  /**
   * Queue invoice for later sync
   */
  queueForLaterSync(invoiceData) {
    try {
      const queue = JSON.parse(localStorage.getItem('invoice_sync_queue') || '[]');
      
      // Check if already queued
      const exists = queue.find(q => q.id === invoiceData.id);
      if (exists) return;

      queue.push({
        id: invoiceData.id,
        invoiceNumber: invoiceData.invoiceNumber,
        data: invoiceData,
        queuedAt: new Date().toISOString(),
        retryCount: 0,
      });

      localStorage.setItem('invoice_sync_queue', JSON.stringify(queue));
      console.log('[Invoice Sync] Invoice queued for later sync:', invoiceData.invoiceNumber);

    } catch (error) {
      console.error('[Invoice Sync] Failed to queue invoice:', error);
    }
  }

  /**
   * Process queued invoices
   */
  async processQueuedInvoices() {
    if (this.isSyncing) {
      console.log('[Invoice Sync] Already processing queue');
      return;
    }

    try {
      this.isSyncing = true;

      const queue = JSON.parse(localStorage.getItem('invoice_sync_queue') || '[]');
      if (queue.length === 0) {
        return { processed: 0, failed: 0 };
      }

      console.log('[Invoice Sync] Processing queued invoices:', queue.length);

      let processed = 0;
      let failed = 0;
      const remainingQueue = [];

      for (const queuedItem of queue) {
        const result = await this.syncInvoiceToBackend(queuedItem.data);

        if (result.success) {
          processed++;
        } else {
          failed++;
          // Re-queue if retryable and not too many retries
          if (result.retryQueued || (queuedItem.retryCount < 5 && this.isRetryableError(result.error))) {
            remainingQueue.push({
              ...queuedItem,
              retryCount: (queuedItem.retryCount || 0) + 1,
              lastAttempt: new Date().toISOString(),
            });
          }
        }

        // Small delay between syncs
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update queue
      localStorage.setItem('invoice_sync_queue', JSON.stringify(remainingQueue));

      console.log('[Invoice Sync] Queue processing complete:', { processed, failed, remaining: remainingQueue.length });

      return { processed, failed, remaining: remainingQueue.length };

    } catch (error) {
      console.error('[Invoice Sync] Queue processing error:', error);
      return { processed: 0, failed: 0, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    try {
      const queue = JSON.parse(localStorage.getItem('invoice_sync_queue') || '[]');
      return {
        count: queue.length,
        items: queue,
      };
    } catch {
      return { count: 0, items: [] };
    }
  }

  /**
   * Clear sync queue
   */
  clearQueue() {
    localStorage.removeItem('invoice_sync_queue');
    console.log('[Invoice Sync] Queue cleared');
  }
}

// Export singleton
const posInvoiceSync = new PosInvoiceSyncService();
export default posInvoiceSync;

// Also export class
export { PosInvoiceSyncService };

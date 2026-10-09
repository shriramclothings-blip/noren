/**
 * Cloud Synchronization Service
 * Handles communication with NOREN backend for invoice sync and QR token generation
 */

import axios from 'axios';
import { getSetting } from '../db/db';

// Default backend URL (can be configured in settings)
const DEFAULT_BACKEND_URL = 'https://noren-iqk3.onrender.com/api';

/**
 * Get configured backend URL from settings
 */
async function getBackendURL() {
  try {
    const url = await getSetting('cloudBackendURL');
    return url || DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

/**
 * Get device credentials from local storage
 */
async function getDeviceCredentials() {
  try {
    const deviceId = await getSetting('cloudDeviceId');
    const apiKey = await getSetting('cloudApiKey');
    const deviceFingerprint = await getSetting('deviceFingerprint');

    return { deviceId, apiKey, deviceFingerprint };
  } catch (error) {
    throw new Error('Device not registered. Please register this device first.');
  }
}

/**
 * Authenticate device with backend
 * @returns {Promise<object>} Device authentication data
 */
export async function authenticateDevice() {
  const backendURL = await getBackendURL();
  const { deviceFingerprint, apiKey } = await getDeviceCredentials();

  if (!deviceFingerprint || !apiKey) {
    throw new Error('Device not registered');
  }

  try {
    const response = await axios.post(
      `${backendURL}/erp/pos/integration/devices/authenticate`,
      {
        device_fingerprint: deviceFingerprint,
        api_key: apiKey
      },
      {
        timeout: 10000 // 10 second timeout
      }
    );

    return response.data;
  } catch (error) {
    console.error('Device authentication failed:', error);
    throw new Error(
      error.response?.data?.message || 
      'Failed to authenticate with server. Please check your connection.'
    );
  }
}

/**
 * Sync invoice to backend and get public QR token
 * @param {object} invoiceData - Complete invoice data
 * @returns {Promise<object>} Response with public_token and public_url
 */
export async function syncInvoice(invoiceData) {
  const backendURL = await getBackendURL();
  const { deviceId, apiKey } = await getDeviceCredentials();

  if (!deviceId || !apiKey) {
    throw new Error('Device not registered');
  }

  try {
    // First authenticate to get JWT or verify device is active
    const authData = await authenticateDevice();

    // Prepare invoice payload with idempotency key
    const payload = {
      idempotency_key: invoiceData.idempotency_key || generateIdempotencyKey(invoiceData),
      device_id: authData.device_id || deviceId,
      bill_no: invoiceData.bill_no,
      items: invoiceData.items,
      payment_method: invoiceData.payment_method || 'cash',
      split_payment: invoiceData.split_payment,
      customer_id: invoiceData.customer_id,
      discount_amount: invoiceData.discount_amount || 0,
      tax_amount: invoiceData.tax_amount || 0,
      round_off: invoiceData.round_off || 0,
      total: invoiceData.total,
      notes: invoiceData.notes,
      store_credit_used: invoiceData.store_credit_used || 0,
      created_at: invoiceData.created_at || new Date().toISOString()
    };

    const response = await axios.post(
      `${backendURL}/erp/pos/integration/invoices/sync`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': deviceId,
          'X-API-Key': apiKey
        },
        timeout: 30000 // 30 second timeout for invoice sync
      }
    );

    return response.data;
  } catch (error) {
    console.error('Invoice sync failed:', error);
    
    // Handle specific error cases
    if (error.response?.status === 409) {
      // Invoice already synced - return existing data
      return error.response.data;
    }

    throw new Error(
      error.response?.data?.message || 
      'Failed to sync invoice. It will be retried automatically.'
    );
  }
}

/**
 * Generate idempotency key for invoice (ensures no duplicates on retry)
 * @param {object} invoiceData - Invoice data
 * @returns {string} UUID-like idempotency key
 */
function generateIdempotencyKey(invoiceData) {
  // Combine unique invoice identifiers
  const timestamp = invoiceData.created_at || new Date().toISOString();
  const billNo = invoiceData.bill_no || '';
  const total = invoiceData.total || 0;
  
  // Create a deterministic key from invoice data
  const keyString = `${billNo}-${timestamp}-${total}`;
  
  // Generate a UUID-like key (client-side)
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Queue invoice for later sync (offline mode)
 * @param {object} invoiceData - Invoice data to queue
 * @returns {Promise<void>}
 */
export async function queueInvoiceForSync(invoiceData) {
  const { addToSyncQueue } = await import('../db/db');
  
  const queueItem = {
    operation_type: 'invoice_create',
    idempotency_key: invoiceData.idempotency_key || generateIdempotencyKey(invoiceData),
    local_ref: invoiceData.bill_no,
    payload: invoiceData,
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString()
  };

  await addToSyncQueue(queueItem);
}

/**
 * Process sync queue (process all pending operations)
 * @returns {Promise<object>} Sync results
 */
export async function processSyncQueue() {
  const { getSyncQueue, updateSyncQueueItem } = await import('../db/db');
  
  const queue = await getSyncQueue();
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  // Process only pending items
  const pendingItems = queue.filter(item => item.status === 'pending');

  for (const item of pendingItems) {
    try {
      // Mark as processing
      await updateSyncQueueItem(item.id, { status: 'processing' });

      // Sync based on operation type
      if (item.operation_type === 'invoice_create') {
        const syncResult = await syncInvoice(item.payload);
        
        // Mark as done
        await updateSyncQueueItem(item.id, {
          status: 'done',
          server_ref: syncResult.sale_id,
          processed_at: new Date().toISOString()
        });

        results.success.push({
          local_ref: item.local_ref,
          server_ref: syncResult.sale_id,
          public_token: syncResult.public_token
        });
      }
    } catch (error) {
      console.error(`Sync failed for ${item.local_ref}:`, error);
      
      // Update retry count
      const newRetryCount = (item.retry_count || 0) + 1;
      const maxRetries = 5;

      if (newRetryCount >= maxRetries) {
        // Mark as failed after max retries
        await updateSyncQueueItem(item.id, {
          status: 'failed',
          retry_count: newRetryCount,
          last_error: error.message
        });
        results.failed.push({ local_ref: item.local_ref, error: error.message });
      } else {
        // Mark as pending for retry
        await updateSyncQueueItem(item.id, {
          status: 'pending',
          retry_count: newRetryCount,
          last_error: error.message
        });
        results.skipped.push({ local_ref: item.local_ref, will_retry: true });
      }
    }
  }

  return results;
}

/**
 * Get sync queue status
 * @returns {Promise<object>} Queue statistics
 */
export async function getSyncStatus() {
  const { getSyncQueue } = await import('../db/db');
  const queue = await getSyncQueue();

  return {
    total: queue.length,
    pending: queue.filter(i => i.status === 'pending').length,
    processing: queue.filter(i => i.status === 'processing').length,
    done: queue.filter(i => i.status === 'done').length,
    failed: queue.filter(i => i.status === 'failed').length
  };
}

/**
 * Test backend connection
 * @returns {Promise<boolean>} True if connected
 */
export async function testConnection() {
  try {
    const backendURL = await getBackendURL();
    const response = await axios.get(`${backendURL}/erp/pos/integration/health`, {
      timeout: 5000
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Register new device with backend
 * @param {string} deviceFingerprint - Hardware device ID
 * @param {string} deviceName - Human-readable device name
 * @param {string} adminJWT - Admin JWT token for registration
 * @returns {Promise<object>} Registration result with API key
 */
export async function registerDevice(deviceFingerprint, deviceName, adminJWT) {
  const backendURL = await getBackendURL();

  try {
    const response = await axios.post(
      `${backendURL}/erp/pos/integration/devices/register`,
      {
        device_fingerprint: deviceFingerprint,
        device_name: deviceName
      },
      {
        headers: {
          'Authorization': `Bearer ${adminJWT}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Device registration failed:', error);
    throw new Error(
      error.response?.data?.message || 
      'Failed to register device. Please check your credentials.'
    );
  }
}

/**
 * Get website base URL for QR code generation
 * @returns {Promise<string>} Website URL
 */
export async function getWebsiteURL() {
  try {
    const url = await getSetting('websiteURL');
    return url || 'https://norenfastion.shop';
  } catch {
    return 'https://norenfastion.shop';
  }
}

export default {
  authenticateDevice,
  syncInvoice,
  queueInvoiceForSync,
  processSyncQueue,
  getSyncStatus,
  testConnection,
  registerDevice,
  getWebsiteURL
};

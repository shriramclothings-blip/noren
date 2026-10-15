/**
 * Cloud Sync Service for VENDEXA RetailOS™ × NOREN Integration
 * Real-time bidirectional synchronization with conflict resolution
 * 
 * Features:
 * - Real-time sync with production backend
 * - Intelligent conflict resolution
 * - Offline queue management
 * - Background sync with exponential backoff
 * - Change detection and incremental sync
 * - Data integrity validation
 */

import { getSetting, setSetting, dbGetAll, dbAdd, dbPut, initDB } from '../db/db';

class CloudSyncService {
  constructor() {
    this.isInitialized = false;
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.baseRetryDelay = 1000;
    
    // Sync configuration
    this.config = {
      apiUrl: process.env.REACT_APP_API_URL || 'https://noren-iqk3.onrender.com/api',
      syncIntervalMs: 30000, // 30 seconds
      batchSize: 50,
      conflictResolution: 'server_wins', // 'server_wins', 'client_wins', 'merge', 'prompt'
      enableRealTimeSync: true,
      enableBackgroundSync: true,
      compressionEnabled: true
    };

    // Event listeners
    this.syncListeners = new Set();
    this.conflictListeners = new Set();
    
    this.setupNetworkListeners();
    this.loadConfig();
  }

  /**
   * Initialize cloud sync service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load saved configuration
      await this.loadConfig();
      
      // Restore sync queue from storage
      await this.restoreSyncQueue();
      
      // Start background sync if enabled
      if (this.config.enableBackgroundSync) {
        this.startBackgroundSync();
      }
      
      // Initialize real-time sync
      if (this.config.enableRealTimeSync) {
        this.initializeRealTimeSync();
      }

      this.isInitialized = true;
      this.emit('initialized', { status: 'success' });
      
      console.log('Cloud Sync Service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Cloud Sync Service initialization failed:', error);
      this.emit('error', { type: 'initialization', error });
      return { success: false, error: error.message };
    }
  }

  /**
   * Load configuration from settings
   */
  async loadConfig() {
    try {
      const savedConfig = await getSetting('cloudSyncConfig');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load last sync time
      const lastSync = await getSetting('lastSyncTime');
      if (lastSync) {
        this.lastSyncTime = new Date(lastSync);
      }
    } catch (error) {
      console.warn('Failed to load cloud sync config:', error);
    }
  }

  /**
   * Save configuration to settings
   */
  async saveConfig() {
    try {
      await setSetting('cloudSyncConfig', JSON.stringify(this.config));
      if (this.lastSyncTime) {
        await setSetting('lastSyncTime', this.lastSyncTime.toISOString());
      }
    } catch (error) {
      console.error('Failed to save cloud sync config:', error);
    }
  }

  /**
   * Update sync configuration
   */
  async updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    await this.saveConfig();
    
    // Restart services if necessary
    if (oldConfig.enableBackgroundSync !== this.config.enableBackgroundSync) {
      if (this.config.enableBackgroundSync) {
        this.startBackgroundSync();
      } else {
        this.stopBackgroundSync();
      }
    }
    
    this.emit('configUpdated', { oldConfig, newConfig: this.config });
  }

  /**
   * Setup network event listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('networkStatusChanged', { online: true });
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('networkStatusChanged', { online: false });
    });
  }

  /**
   * Start background synchronization
   */
  startBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.performFullSync().catch(error => {
          console.warn('Background sync failed:', error);
        });
      }
    }, this.config.syncIntervalMs);

    console.log(`Background sync started (interval: ${this.config.syncIntervalMs}ms)`);
  }

  /**
   * Stop background synchronization
   */
  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Background sync stopped');
    }
  }

  /**
   * Initialize real-time sync (WebSocket or Server-Sent Events)
   */
  initializeRealTimeSync() {
    // For now, use polling. Can be upgraded to WebSocket later
    console.log('Real-time sync initialized (polling mode)');
  }

  /**
   * Perform full bidirectional synchronization
   */
  async performFullSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    if (!this.isOnline) {
      console.log('Offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.emit('syncStarted', { type: 'full' });

    try {
      const syncResult = {
        invoices: { uploaded: 0, downloaded: 0, conflicts: 0 },
        customers: { uploaded: 0, downloaded: 0, conflicts: 0 },
        products: { uploaded: 0, downloaded: 0, conflicts: 0 },
        errors: []
      };

      // Step 1: Upload local changes
      await this.uploadLocalChanges(syncResult);
      
      // Step 2: Download server changes
      await this.downloadServerChanges(syncResult);
      
      // Step 3: Process sync queue
      await this.processSyncQueue();
      
      this.lastSyncTime = new Date();
      await this.saveConfig();
      
      this.emit('syncCompleted', { 
        type: 'full', 
        result: syncResult,
        timestamp: this.lastSyncTime 
      });
      
      console.log('Full sync completed successfully:', syncResult);
      
    } catch (error) {
      console.error('Full sync failed:', error);
      this.emit('syncError', { type: 'full', error });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Upload local changes to server
   */
  async uploadLocalChanges(syncResult) {
    try {
      // Get local data that needs to be synced
      const localInvoices = await dbGetAll('invoices');
      const localCustomers = await dbGetAll('customers');
      const localProducts = await dbGetAll('products');

      // Filter items that need syncing (new or modified since last sync)
      const invoicesToSync = this.filterItemsForUpload(localInvoices, 'invoice');
      const customersToSync = this.filterItemsForUpload(localCustomers, 'customer');
      const productsToSync = this.filterItemsForUpload(localProducts, 'product');

      // Upload in batches
      if (invoicesToSync.length > 0) {
        const result = await this.uploadBatch('invoices', invoicesToSync);
        syncResult.invoices.uploaded = result.uploaded;
        syncResult.invoices.conflicts += result.conflicts;
      }

      if (customersToSync.length > 0) {
        const result = await this.uploadBatch('customers', customersToSync);
        syncResult.customers.uploaded = result.uploaded;
        syncResult.customers.conflicts += result.conflicts;
      }

      if (productsToSync.length > 0) {
        const result = await this.uploadBatch('products', productsToSync);
        syncResult.products.uploaded = result.uploaded;
        syncResult.products.conflicts += result.conflicts;
      }

    } catch (error) {
      console.error('Failed to upload local changes:', error);
      syncResult.errors.push({ type: 'upload', error: error.message });
    }
  }

  /**
   * Download server changes to local database
   */
  async downloadServerChanges(syncResult) {
    try {
      const lastSyncTimestamp = this.lastSyncTime ? this.lastSyncTime.toISOString() : null;
      
      // Download incremental changes from server
      const serverChanges = await this.fetchServerChanges(lastSyncTimestamp);
      
      // Process server changes
      if (serverChanges.invoices?.length > 0) {
        const result = await this.processServerInvoices(serverChanges.invoices);
        syncResult.invoices.downloaded = result.downloaded;
        syncResult.invoices.conflicts += result.conflicts;
      }

      if (serverChanges.customers?.length > 0) {
        const result = await this.processServerCustomers(serverChanges.customers);
        syncResult.customers.downloaded = result.downloaded;
        syncResult.customers.conflicts += result.conflicts;
      }

      if (serverChanges.products?.length > 0) {
        const result = await this.processServerProducts(serverChanges.products);
        syncResult.products.downloaded = result.downloaded;
        syncResult.products.conflicts += result.conflicts;
      }

    } catch (error) {
      console.error('Failed to download server changes:', error);
      syncResult.errors.push({ type: 'download', error: error.message });
    }
  }

  /**
   * Filter items that need to be uploaded
   */
  filterItemsForUpload(items, type) {
    if (!this.lastSyncTime) {
      // First sync - upload all items
      return items;
    }

    return items.filter(item => {
      // Check if item was modified after last sync
      const modifiedAt = new Date(item.updatedAt || item.createdAt || item.date);
      return modifiedAt > this.lastSyncTime;
    });
  }

  /**
   * Upload batch of items to server
   */
  async uploadBatch(endpoint, items) {
    const result = { uploaded: 0, conflicts: 0 };
    
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      const batch = items.slice(i, i + this.config.batchSize);
      
      try {
        const response = await this.apiRequest(`/sync/${endpoint}`, {
          method: 'POST',
          body: JSON.stringify({ 
            items: batch,
            source: 'pos',
            timestamp: new Date().toISOString()
          })
        });

        if (response.success) {
          result.uploaded += response.uploaded || batch.length;
          result.conflicts += response.conflicts || 0;
          
          // Handle conflicts if any
          if (response.conflicts && response.conflicts.length > 0) {
            await this.handleUploadConflicts(response.conflicts);
          }
        }
        
      } catch (error) {
        console.error(`Failed to upload ${endpoint} batch:`, error);
        // Add to sync queue for retry
        batch.forEach(item => this.addToSyncQueue(endpoint, 'upload', item));
      }
    }
    
    return result;
  }

  /**
   * Fetch server changes since last sync
   */
  async fetchServerChanges(lastSyncTimestamp) {
    const params = new URLSearchParams({
      since: lastSyncTimestamp || '1970-01-01T00:00:00.000Z',
      source: 'server'
    });

    const response = await this.apiRequest(`/sync/changes?${params}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch server changes');
    }
    
    return response.data || {};
  }

  /**
   * Process server invoices and handle conflicts
   */
  async processServerInvoices(serverInvoices) {
    const result = { downloaded: 0, conflicts: 0 };
    
    for (const serverInvoice of serverInvoices) {
      try {
        // Check if local invoice exists
        const localInvoice = await this.getLocalInvoice(serverInvoice.id);
        
        if (localInvoice) {
          // Handle conflict
          const resolution = await this.resolveConflict('invoice', localInvoice, serverInvoice);
          if (resolution.action === 'update') {
            await this.updateLocalInvoice(resolution.resolvedData);
            result.conflicts++;
          }
        } else {
          // New invoice from server
          await dbAdd('invoices', serverInvoice);
          result.downloaded++;
        }
        
      } catch (error) {
        console.error('Failed to process server invoice:', error);
      }
    }
    
    return result;
  }

  /**
   * Process server customers
   */
  async processServerCustomers(serverCustomers) {
    const result = { downloaded: 0, conflicts: 0 };
    
    for (const serverCustomer of serverCustomers) {
      try {
        const localCustomer = await this.getLocalCustomer(serverCustomer.id);
        
        if (localCustomer) {
          const resolution = await this.resolveConflict('customer', localCustomer, serverCustomer);
          if (resolution.action === 'update') {
            await this.updateLocalCustomer(resolution.resolvedData);
            result.conflicts++;
          }
        } else {
          await dbAdd('customers', serverCustomer);
          result.downloaded++;
        }
        
      } catch (error) {
        console.error('Failed to process server customer:', error);
      }
    }
    
    return result;
  }

  /**
   * Process server products
   */
  async processServerProducts(serverProducts) {
    const result = { downloaded: 0, conflicts: 0 };
    
    for (const serverProduct of serverProducts) {
      try {
        const localProduct = await this.getLocalProduct(serverProduct.id);
        
        if (localProduct) {
          const resolution = await this.resolveConflict('product', localProduct, serverProduct);
          if (resolution.action === 'update') {
            await dbPut('products', { ...resolution.resolvedData, id: serverProduct.id });
            result.conflicts++;
          }
        } else {
          await this.addLocalProduct(serverProduct);
          result.downloaded++;
        }
        
      } catch (error) {
        console.error('Failed to process server product:', error);
      }
    }
    
    return result;
  }

  /**
   * Resolve conflict between local and server data
   */
  async resolveConflict(type, localData, serverData) {
    const conflict = {
      type,
      localData,
      serverData,
      timestamp: new Date().toISOString()
    };

    this.emit('conflictDetected', conflict);

    switch (this.config.conflictResolution) {
      case 'server_wins':
        return { action: 'update', resolvedData: serverData };
        
      case 'client_wins':
        return { action: 'keep_local', resolvedData: localData };
        
      case 'merge':
        return { action: 'update', resolvedData: this.mergeData(localData, serverData) };
        
      case 'prompt':
        return await this.promptUserForResolution(conflict);
        
      default:
        // Default to server wins
        return { action: 'update', resolvedData: serverData };
    }
  }

  /**
   * Merge local and server data intelligently
   */
  mergeData(localData, serverData) {
    const merged = { ...localData };
    
    // Use server data for most fields, but preserve local-specific fields
    Object.keys(serverData).forEach(key => {
      if (key !== 'localId' && key !== 'syncedAt') {
        // Use newer timestamp for conflict resolution
        const localTime = new Date(localData.updatedAt || localData.createdAt || 0);
        const serverTime = new Date(serverData.updatedAt || serverData.createdAt || 0);
        
        if (serverTime >= localTime) {
          merged[key] = serverData[key];
        }
      }
    });
    
    merged.syncedAt = new Date().toISOString();
    return merged;
  }

  /**
   * Prompt user for conflict resolution
   */
  async promptUserForResolution(conflict) {
    return new Promise((resolve) => {
      this.emit('conflictPrompt', {
        conflict,
        resolve: (resolution) => resolve(resolution)
      });
    });
  }

  /**
   * Add item to sync queue for later processing
   */
  addToSyncQueue(endpoint, operation, data) {
    const queueItem = {
      id: this.generateQueueId(),
      endpoint,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retries: 0
    };
    
    this.syncQueue.push(queueItem);
    this.saveSyncQueue();
    
    this.emit('queueItemAdded', queueItem);
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const itemsToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToProcess) {
      try {
        await this.processSyncQueueItem(item);
        this.emit('queueItemProcessed', { item, success: true });
        
      } catch (error) {
        console.error('Failed to process sync queue item:', error);
        
        // Retry logic with exponential backoff
        const retryKey = item.id;
        const currentRetries = this.retryAttempts.get(retryKey) || 0;
        
        if (currentRetries < this.maxRetries) {
          this.retryAttempts.set(retryKey, currentRetries + 1);
          
          // Add back to queue with delay
          setTimeout(() => {
            this.syncQueue.push({ ...item, retries: currentRetries + 1 });
          }, this.baseRetryDelay * Math.pow(2, currentRetries));
          
          this.emit('queueItemRetried', { item, retries: currentRetries + 1 });
        } else {
          // Max retries reached, move to failed queue
          this.emit('queueItemFailed', { item, error });
        }
      }
    }

    this.saveSyncQueue();
  }

  /**
   * Process individual sync queue item
   */
  async processSyncQueueItem(item) {
    const { endpoint, operation, data } = item;
    
    if (operation === 'upload') {
      return await this.uploadBatch(endpoint, [data]);
    } else if (operation === 'delete') {
      return await this.apiRequest(`/sync/${endpoint}/${data.id}`, {
        method: 'DELETE'
      });
    }
    
    throw new Error(`Unknown sync operation: ${operation}`);
  }

  /**
   * Save sync queue to local storage
   */
  async saveSyncQueue() {
    try {
      await setSetting('syncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Restore sync queue from local storage
   */
  async restoreSyncQueue() {
    try {
      const savedQueue = await getSetting('syncQueue');
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue);
      }
    } catch (error) {
      console.warn('Failed to restore sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Make API request with proper headers and error handling
   */
  async apiRequest(endpoint, options = {}) {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-POS-Device': 'vendexa-retail-os',
        'X-Sync-Version': '1.0'
      }
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, finalOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique queue item ID
   */
  generateQueueId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get sync status and statistics
   */
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      queueLength: this.syncQueue.length,
      config: this.config,
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }

  /**
   * Force immediate sync
   */
  async forcSync() {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }
    
    return await this.performFullSync();
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    this.syncQueue = [];
    this.retryAttempts.clear();
    await this.saveSyncQueue();
    this.emit('queueCleared');
  }

  /**
   * Event system for sync notifications
   */
  on(event, listener) {
    if (event === 'sync') {
      this.syncListeners.add(listener);
    } else if (event === 'conflict') {
      this.conflictListeners.add(listener);
    }
  }

  off(event, listener) {
    if (event === 'sync') {
      this.syncListeners.delete(listener);
    } else if (event === 'conflict') {
      this.conflictListeners.delete(listener);
    }
  }

  emit(event, data) {
    // Emit to all registered listeners
    if (event.includes('sync') || event.includes('queue') || event.includes('network')) {
      this.syncListeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          console.error('Sync listener error:', error);
        }
      });
    }
    
    if (event.includes('conflict')) {
      this.conflictListeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          console.error('Conflict listener error:', error);
        }
      });
    }
  }

  /**
   * Helper methods for database operations
   */
  async getLocalInvoice(id) {
    const db = await initDB();
    const transaction = db.transaction(['invoices'], 'readonly');
    const store = transaction.objectStore('invoices');
    return await store.get(id);
  }

  async getLocalCustomer(id) {
    const db = await initDB();
    const transaction = db.transaction(['customers'], 'readonly');
    const store = transaction.objectStore('customers');
    return await store.get(id);
  }

  async getLocalProduct(id) {
    const db = await initDB();
    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    return await store.get(id);
  }

  async updateLocalInvoice(invoiceData) {
    const db = await initDB();
    const transaction = db.transaction(['invoices'], 'readwrite');
    const store = transaction.objectStore('invoices');
    return await store.put(invoiceData);
  }

  async updateLocalCustomer(customerData) {
    const db = await initDB();
    const transaction = db.transaction(['customers'], 'readwrite');
    const store = transaction.objectStore('customers');
    return await store.put(customerData);
  }

  async addLocalProduct(productData) {
    const db = await initDB();
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    return await store.add(productData);
  }

  /**
   * Cleanup and destroy service
   */
  destroy() {
    this.stopBackgroundSync();
    this.syncListeners.clear();
    this.conflictListeners.clear();
    this.isInitialized = false;
    
    window.removeEventListener('online', this.setupNetworkListeners);
    window.removeEventListener('offline', this.setupNetworkListeners);
  }
}

// Create singleton instance
const cloudSyncService = new CloudSyncService();

export default cloudSyncService;
export { cloudSyncService };
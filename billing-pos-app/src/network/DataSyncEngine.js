// DataSyncEngine.js - Real-time bidirectional database synchronization
// Handles data replication, conflict resolution, and transaction safety

import { initDB } from '../db/db';

class DataSyncEngine {
  constructor(networkInstance) {
    this.network = networkInstance; // Can be server or client instance
    this.isServer = false;
    this.syncQueue = [];
    this.processingQueue = false;
    this.lastSyncTimestamp = {};
    this.conflictResolutionStrategy = 'last-write-wins'; // or 'manual'
    
    // Stores to sync
    this.syncStores = [
      'products',
      'categories',
      'customers',
      'invoices',
      'suppliers',
      'purchases',
      'variants',
      'variantBarcodes',
      'inventoryBatches',
      'stockMovements',
      'staff',
      'expenses',
      'settings',
      'returns',
      'stockTransfers',
      'warehouseStock',
      'heldBills',
      'pointsLedger',
      'customerGroups',
      'supplierContacts',
      'supplierBankAccounts',
      'supplierPayments',
      'supplierLedger',
    ];
  }

  /**
   * Initialize sync engine
   * @param {boolean} isServer - Whether this device is the server
   */
  async initialize(isServer = false) {
    this.isServer = isServer;
    
    // Setup event listeners
    if (this.network) {
      this.network.on('data-sync', (data) => {
        this.handleIncomingSync(data);
      });

      // Handle full sync requests
      this.network.on('message', (data) => {
        if (data.type === 'FULL_SYNC') {
          this.handleFullSyncRequest(data);
        } else if (data.type === 'FULL_SYNC_DATA') {
          this.handleIncomingFullSync(data);
        }
      });
    }

    // Load last sync timestamps
    await this.loadSyncTimestamps();

    console.log(`DataSyncEngine initialized (${isServer ? 'Server' : 'Client'} mode)`);
  }

  /**
   * Handle full sync request from client
   */
  async handleFullSyncRequest(data) {
    if (!this.isServer) return;

    const { deviceId } = data;
    console.log(`Full sync requested by ${deviceId}`);

    try {
      const syncData = await this.exportSyncData();
      
      // Send to requesting device
      if (this.network && this.network.sendToDevice) {
        await this.network.sendToDevice(deviceId, {
          type: 'FULL_SYNC_DATA',
          payload: syncData,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to handle full sync request:', error);
    }
  }

  /**
   * Handle incoming full sync data
   */
  async handleIncomingFullSync(data) {
    console.log('Receiving full sync from server...');
    
    try {
      const { payload } = data;
      await this.importSyncData(payload);
      console.log('Full sync completed successfully');
    } catch (error) {
      console.error('Failed to import full sync:', error);
    }
  }

  /**
   * Load last sync timestamps from IndexedDB
   */
  async loadSyncTimestamps() {
    try {
      const db = await initDB();
      const stored = await db.get('settings', 'network_sync_timestamps');
      if (stored && stored.value) {
        this.lastSyncTimestamp = stored.value;
      }
    } catch (error) {
      console.error('Failed to load sync timestamps:', error);
    }
  }

  /**
   * Save sync timestamps
   */
  async saveSyncTimestamps() {
    try {
      const db = await initDB();
      await db.put('settings', {
        key: 'network_sync_timestamps',
        value: this.lastSyncTimestamp,
      });
    } catch (error) {
      console.error('Failed to save sync timestamps:', error);
    }
  }

  /**
   * Queue data change for synchronization
   * @param {string} store - Store name
   * @param {string} operation - add, put, delete
   * @param {Object} data - Data to sync
   */
  async queueSync(store, operation, data) {
    const syncItem = {
      id: this.generateSyncId(),
      store,
      operation,
      data,
      timestamp: new Date().toISOString(),
      deviceId: await this.getDeviceId(),
    };

    this.syncQueue.push(syncItem);
    
    // Process queue
    this.processQueue();
  }

  /**
   * Process sync queue
   */
  async processQueue() {
    if (this.processingQueue || this.syncQueue.length === 0) return;
    if (!(this.network && (this.network.isConnected || this.network.isRunning))) return;

    this.processingQueue = true;

    try {
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift();
        
        // Send to network
        if (this.isServer && this.network.broadcast) {
          await this.network.broadcast({
            type: 'DATA_SYNC',
            payload: item,
            timestamp: new Date().toISOString(),
          });
        } else if (!this.isServer && this.network.syncData) {
          await this.network.syncData(item);
        }

        // Update last sync timestamp
        this.lastSyncTimestamp[item.store] = item.timestamp;
      }

      await this.saveSyncTimestamps();
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Handle incoming sync data
   * @param {Object} syncData - Sync data from network
   */
  async handleIncomingSync(syncData) {
    try {
      const { payload, deviceId: sourceDeviceId } = syncData;
      if (!payload) return;

      const { store, operation, data, timestamp, deviceId } = payload;

      // Don't process our own syncs
      const myDeviceId = await this.getDeviceId();
      if (deviceId === myDeviceId) return;

      // Apply to local database
      await this.applySync(store, operation, data, timestamp);

      // If we're the server, broadcast to other clients
      if (this.isServer && this.network.broadcast) {
        await this.network.broadcast(
          {
            type: 'DATA_SYNC',
            payload,
            timestamp: new Date().toISOString(),
          },
          [sourceDeviceId] // Exclude the sender
        );
      }

      console.log(`Synced ${operation} on ${store} from ${deviceId}`);
    } catch (error) {
      console.error('Error handling incoming sync:', error);
    }
  }

  /**
   * Apply sync to local database
   * @param {string} store - Store name
   * @param {string} operation - add, put, delete
   * @param {Object} data - Data to apply
   * @param {string} timestamp - Timestamp of the change
   */
  async applySync(store, operation, data, timestamp) {
    const db = await initDB();

    try {
      switch (operation) {
        case 'add':
          await db.add(store, {
            ...data,
            _syncedAt: timestamp,
            _syncedFrom: 'network',
          });
          break;

        case 'put':
          // Check for conflicts
          const existing = await db.get(store, data.id);
          if (existing) {
            const shouldUpdate = await this.resolveConflict(existing, data, timestamp);
            if (shouldUpdate) {
              await db.put(store, {
                ...data,
                _syncedAt: timestamp,
                _syncedFrom: 'network',
              });
            }
          } else {
            await db.put(store, {
              ...data,
              _syncedAt: timestamp,
              _syncedFrom: 'network',
            });
          }
          break;

        case 'delete':
          await db.delete(store, data.id);
          break;

        default:
          console.warn('Unknown operation:', operation);
      }

      // Update last sync timestamp
      this.lastSyncTimestamp[store] = timestamp;
    } catch (error) {
      console.error(`Failed to apply sync to ${store}:`, error);
      throw error;
    }
  }

  /**
   * Resolve conflicts between local and remote data
   * @param {Object} local - Local data
   * @param {Object} remote - Remote data
   * @param {string} remoteTimestamp - Remote timestamp
   * @returns {boolean} - Whether to update local with remote
   */
  async resolveConflict(local, remote, remoteTimestamp) {
    // Last-write-wins strategy
    if (this.conflictResolutionStrategy === 'last-write-wins') {
      const localTimestamp = local.updatedAt || local.createdAt || '';
      return remoteTimestamp > localTimestamp;
    }

    // Manual resolution (emit event for UI handling)
    if (this.conflictResolutionStrategy === 'manual') {
      // TODO: Implement manual conflict resolution UI
      return false;
    }

    return true;
  }

  /**
   * Perform full sync with another device
   * @param {string} targetDeviceId - Target device (optional for clients)
   */
  async performFullSync(targetDeviceId = null) {
    try {
      if (this.isServer && targetDeviceId) {
        // Server sending to specific client
        const syncData = await this.exportSyncData();
        
        await this.network.sendToDevice(targetDeviceId, {
          type: 'FULL_SYNC_DATA',
          payload: syncData,
          timestamp: new Date().toISOString(),
        });
      } else if (!this.isServer) {
        // Client requesting from server
        await this.network.send({
          type: 'FULL_SYNC',
          deviceId: await this.getDeviceId(),
          timestamp: new Date().toISOString(),
        });
      }

      console.log('Full sync initiated');
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Export all sync data
   */
  async exportSyncData() {
    const db = await initDB();
    const syncData = {};

    for (const store of this.syncStores) {
      try {
        const records = await db.getAll(store);
        syncData[store] = records || [];
      } catch (error) {
        console.error(`Failed to export ${store}:`, error);
        syncData[store] = [];
      }
    }

    return syncData;
  }

  /**
   * Import sync data (used for full sync)
   * @param {Object} syncData - Data to import
   */
  async importSyncData(syncData) {
    const db = await initDB();

    for (const store of Object.keys(syncData)) {
      if (!this.syncStores.includes(store)) continue;

      try {
        const records = syncData[store] || [];
        
        for (const record of records) {
          const existing = await db.get(store, record.id);
          
          if (!existing) {
            // New record
            await db.put(store, {
              ...record,
              _syncedFrom: 'network',
            });
          } else {
            // Check if remote is newer
            const remoteTimestamp = record.updatedAt || record.createdAt || '';
            const localTimestamp = existing.updatedAt || existing.createdAt || '';
            
            if (remoteTimestamp > localTimestamp) {
              await db.put(store, {
                ...record,
                _syncedFrom: 'network',
              });
            }
          }
        }

        console.log(`Imported ${records.length} records to ${store}`);
      } catch (error) {
        console.error(`Failed to import ${store}:`, error);
      }
    }
  }

  /**
   * Get device ID
   */
  async getDeviceId() {
    if (window.electronAPI && window.electronAPI.license) {
      return await window.electronAPI.license.getDeviceId();
    }
    return 'unknown-device';
  }

  /**
   * Generate unique sync ID
   */
  generateSyncId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      queueLength: this.syncQueue.length,
      processingQueue: this.processingQueue,
      lastSyncTimestamps: this.lastSyncTimestamp,
      syncStores: this.syncStores,
    };
  }

  /**
   * Clear sync queue
   */
  clearQueue() {
    this.syncQueue = [];
    this.processingQueue = false;
  }
}

export default DataSyncEngine;

/**
 * useCloudSync Hook
 * React hook for integrating with cloud sync service
 * 
 * Provides real-time sync status, controls, and event handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import cloudSyncService from '../services/cloudSyncService';

export function useCloudSync() {
  const [syncStatus, setSyncStatus] = useState({
    isInitialized: false,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    queueLength: 0,
    error: null
  });
  
  const [syncProgress, setSyncProgress] = useState({
    current: 0,
    total: 0,
    stage: '',
    details: ''
  });
  
  const [conflicts, setConflicts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const syncListenerRef = useRef(null);
  const conflictListenerRef = useRef(null);

  /**
   * Initialize cloud sync service
   */
  const initializeSync = useCallback(async () => {
    try {
      const result = await cloudSyncService.initialize();
      
      if (result.success) {
        setSyncStatus(prev => ({
          ...prev,
          isInitialized: true,
          error: null
        }));
        
        addNotification('success', 'Cloud sync initialized successfully');
      } else {
        setSyncStatus(prev => ({
          ...prev,
          error: result.error
        }));
        
        addNotification('error', `Cloud sync initialization failed: ${result.error}`);
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        error: error.message
      }));
      
      addNotification('error', `Cloud sync error: ${error.message}`);
    }
  }, []);

  /**
   * Update sync configuration
   */
  const updateConfig = useCallback(async (newConfig) => {
    try {
      await cloudSyncService.updateConfig(newConfig);
      addNotification('success', 'Sync configuration updated');
    } catch (error) {
      addNotification('error', `Failed to update configuration: ${error.message}`);
    }
  }, []);

  /**
   * Force immediate sync
   */
  const forceSync = useCallback(async () => {
    try {
      addNotification('info', 'Starting manual sync...');
      await cloudSyncService.forcSync();
    } catch (error) {
      addNotification('error', `Manual sync failed: ${error.message}`);
    }
  }, []);

  /**
   * Clear sync queue
   */
  const clearQueue = useCallback(async () => {
    try {
      await cloudSyncService.clearSyncQueue();
      addNotification('success', 'Sync queue cleared');
    } catch (error) {
      addNotification('error', `Failed to clear queue: ${error.message}`);
    }
  }, []);

  /**
   * Add notification
   */
  const addNotification = useCallback((type, message) => {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
    
    // Auto-remove after 5 seconds for non-error notifications
    if (type !== 'error') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  }, []);

  /**
   * Dismiss notification
   */
  const dismissNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback((conflictId, resolution) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    
    // Send resolution to sync service
    const conflict = conflicts.find(c => c.id === conflictId);
    if (conflict && conflict.resolve) {
      conflict.resolve(resolution);
    }
  }, [conflicts]);

  /**
   * Get current sync statistics
   */
  const getSyncStats = useCallback(() => {
    return cloudSyncService.getSyncStatus();
  }, []);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    // Sync event listener
    syncListenerRef.current = (event, data) => {
      switch (event) {
        case 'initialized':
          setSyncStatus(prev => ({
            ...prev,
            isInitialized: true,
            error: null
          }));
          break;
          
        case 'syncStarted':
          setSyncStatus(prev => ({ ...prev, isSyncing: true }));
          setSyncProgress({ current: 0, total: 100, stage: 'Starting', details: 'Initializing sync...' });
          break;
          
        case 'syncCompleted':
          setSyncStatus(prev => ({
            ...prev,
            isSyncing: false,
            lastSyncTime: data.timestamp,
            queueLength: 0
          }));
          setSyncProgress({ current: 100, total: 100, stage: 'Completed', details: 'Sync finished successfully' });
          addNotification('success', `Sync completed: ${data.result.invoices.uploaded + data.result.customers.uploaded + data.result.products.uploaded} items uploaded, ${data.result.invoices.downloaded + data.result.customers.downloaded + data.result.products.downloaded} downloaded`);
          break;
          
        case 'syncError':
          setSyncStatus(prev => ({
            ...prev,
            isSyncing: false,
            error: data.error.message
          }));
          setSyncProgress({ current: 0, total: 100, stage: 'Error', details: data.error.message });
          addNotification('error', `Sync failed: ${data.error.message}`);
          break;
          
        case 'networkStatusChanged':
          setSyncStatus(prev => ({ ...prev, isOnline: data.online }));
          if (data.online) {
            addNotification('success', 'Back online - sync will resume');
          } else {
            addNotification('warning', 'Gone offline - changes will be queued');
          }
          break;
          
        case 'queueItemAdded':
          setSyncStatus(prev => ({ ...prev, queueLength: prev.queueLength + 1 }));
          break;
          
        case 'queueItemProcessed':
          setSyncStatus(prev => ({ ...prev, queueLength: Math.max(0, prev.queueLength - 1) }));
          break;
          
        case 'queueCleared':
          setSyncStatus(prev => ({ ...prev, queueLength: 0 }));
          break;
          
        default:
          // Handle other sync events
          break;
      }
    };

    // Conflict event listener
    conflictListenerRef.current = (event, data) => {
      if (event === 'conflictDetected') {
        setConflicts(prev => [...prev, {
          id: Date.now() + Math.random(),
          ...data,
          timestamp: new Date().toISOString()
        }]);
        
        addNotification('warning', `Data conflict detected in ${data.type}`);
      }
      
      if (event === 'conflictPrompt') {
        setConflicts(prev => [...prev, {
          id: Date.now() + Math.random(),
          ...data.conflict,
          resolve: data.resolve,
          needsUserInput: true
        }]);
      }
    };

    // Register listeners
    cloudSyncService.on('sync', syncListenerRef.current);
    cloudSyncService.on('conflict', conflictListenerRef.current);

    // Update initial status
    setSyncStatus(prev => ({
      ...prev,
      ...cloudSyncService.getSyncStatus()
    }));

    // Cleanup
    return () => {
      if (syncListenerRef.current) {
        cloudSyncService.off('sync', syncListenerRef.current);
      }
      if (conflictListenerRef.current) {
        cloudSyncService.off('conflict', conflictListenerRef.current);
      }
    };
  }, [addNotification]);

  /**
   * Periodic status updates
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const status = cloudSyncService.getSyncStatus();
      setSyncStatus(prev => ({
        ...prev,
        ...status
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    // Status
    syncStatus,
    syncProgress,
    conflicts,
    notifications,
    
    // Actions
    initializeSync,
    updateConfig,
    forceSync,
    clearQueue,
    resolveConflict,
    dismissNotification,
    getSyncStats,
    
    // Computed properties
    isConnected: syncStatus.isOnline && syncStatus.isInitialized,
    hasQueuedItems: syncStatus.queueLength > 0,
    hasConflicts: conflicts.length > 0,
    hasPendingConflicts: conflicts.some(c => c.needsUserInput),
    lastSyncAgo: syncStatus.lastSyncTime ? 
      Math.round((Date.now() - new Date(syncStatus.lastSyncTime)) / 1000) : null
  };
}

export default useCloudSync;
/**
 * Production Backend Sync Status Panel
 * Shows connection to noren-iqk3.onrender.com backend
 * Real-time status, device registration, and sync queue monitoring
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle,
  Wifi,
  WifiOff,
  Database,
  AlertTriangle,
  Activity,
  Server,
  Zap
} from 'lucide-react';
import apiService from '../services/apiService';
import deviceRegistration from '../services/deviceRegistration';
import posInvoiceSync from '../services/posInvoiceSync';

export default function CloudSyncSettingsPanelEnhanced() {
  const [connectionStatus, setConnectionStatus] = useState({
    online: navigator.onLine,
    backendConnected: false,
    deviceRegistered: false,
    lastCheck: null,
  });

  const [deviceStatus, setDeviceStatus] = useState(null);
  const [queueStatus, setQueueStatus] = useState({ count: 0, items: [] });
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Check backend connection and device status
   */
  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      // Test backend connection
      const backendTest = await apiService.testConnection();
      
      // Get device registration status
      const deviceInfo = deviceRegistration.getDeviceStatus();
      
      // Get sync queue status
      const queueInfo = posInvoiceSync.getQueueStatus();
      
      setConnectionStatus({
        online: navigator.onLine,
        backendConnected: backendTest.connected,
        deviceRegistered: deviceInfo.isRegistered,
        lastCheck: new Date(),
      });
      
      setDeviceStatus(deviceInfo);
      setQueueStatus(queueInfo);
      
    } catch (error) {
      console.error('[Sync Status] Refresh failed:', error);
      setConnectionStatus(prev => ({
        ...prev,
        backendConnected: false,
        lastCheck: new Date(),
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Initialize status on mount
   */
  useEffect(() => {
    refreshStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshStatus, 30000);
    
    // Listen for online/offline events
    const handleOnline = () => {
      setConnectionStatus(prev => ({ ...prev, online: true }));
      refreshStatus();
    };
    
    const handleOffline = () => {
      setConnectionStatus(prev => ({ ...prev, online: false, backendConnected: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Process queued invoices
   */
  const handleProcessQueue = async () => {
    try {
      const result = await posInvoiceSync.processQueuedInvoices();
      await refreshStatus();
      
      if (result.processed > 0) {
        alert(`✓ Successfully synced ${result.processed} invoice(s)`);
      } else {
        alert('No invoices in queue to process');
      }
    } catch (error) {
      alert('Failed to process queue: ' + error.message);
    }
  };

  /**
   * Clear sync queue
   */
  const handleClearQueue = () => {
    if (window.confirm('Clear all pending sync items? This cannot be undone.')) {
      posInvoiceSync.clearQueue();
      refreshStatus();
    }
  };

  const getConnectionBadge = () => {
    if (!connectionStatus.online) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
          <WifiOff size={16} className="text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">Offline</span>
        </div>
      );
    }
    
    if (connectionStatus.backendConnected) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full text-sm">
          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-300">Connected</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-full text-sm">
        <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
        <span className="text-red-700 dark:text-red-300">Disconnected</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Cloud size={24} />
            Production Backend Connection
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Status and sync monitoring for noren-iqk3.onrender.com
          </p>
        </div>
        
        <button
          onClick={refreshStatus}
          disabled={isRefreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Connection Status Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              connectionStatus.backendConnected 
                ? 'bg-green-100 dark:bg-green-900/20' 
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <Server size={24} className={
                connectionStatus.backendConnected 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              } />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Backend API</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {process.env.REACT_APP_API_URL || 'https://noren-iqk3.onrender.com/api'}
              </p>
            </div>
          </div>
          
          {getConnectionBadge()}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Wifi size={16} />
              Network Status
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {connectionStatus.online ? 'Online' : 'Offline'}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Activity size={16} />
              Last Checked
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {connectionStatus.lastCheck 
                ? connectionStatus.lastCheck.toLocaleTimeString() 
                : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Device Registration Status */}
      {deviceStatus && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database size={20} />
            Device Registration
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <span className={`text-sm font-medium ${
                deviceStatus.isRegistered 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {deviceStatus.isRegistered ? 'Registered' : 'Not Registered'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Device ID</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {deviceStatus.deviceId || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Device Name</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {deviceStatus.deviceName || 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Browser</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {deviceStatus.browser} on {deviceStatus.os}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sync Queue Status */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap size={20} />
            Sync Queue
          </h3>
          
          <div className="flex items-center gap-2">
            {queueStatus.count > 0 && (
              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                {queueStatus.count} pending
              </span>
            )}
          </div>
        </div>
        
        {queueStatus.count === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto text-green-500 dark:text-green-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">All invoices synced</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {queueStatus.count} invoice{queueStatus.count > 1 ? 's' : ''} waiting to sync
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleProcessQueue}
                className="btn-primary flex items-center gap-2 flex-1"
              >
                <RefreshCw size={16} />
                Process Queue
              </button>
              
              <button
                onClick={handleClearQueue}
                className="btn-danger flex items-center gap-2"
              >
                Clear Queue
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Cloud size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Production Backend Sync
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Your POS is connected to the production backend. All invoices are automatically synced 
              and customer emails are sent immediately. When offline, invoices are queued and will 
              sync when connection is restored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

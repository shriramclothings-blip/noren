/**
 * Cloud Sync Status Component
 * Displays real-time sync status, progress, and controls
 * 
 * Features:
 * - Live sync status indicator
 * - Progress bar during sync
 * - Queue management
 * - Conflict resolution UI
 * - Manual sync controls
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  Wifi, 
  WifiOff, 
  Loader, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Database,
  AlertCircle,
  Settings,
  Trash2,
  Play
} from 'lucide-react';
import { useCloudSync } from '../hooks/useCloudSync';

export default function CloudSyncStatus({ 
  compact = false, 
  showDetails = true, 
  showControls = true,
  className = '' 
}) {
  const {
    syncStatus,
    syncProgress,
    conflicts,
    notifications,
    initializeSync,
    forceSync,
    clearQueue,
    resolveConflict,
    dismissNotification,
    isConnected,
    hasQueuedItems,
    hasConflicts,
    hasPendingConflicts,
    lastSyncAgo
  } = useCloudSync();

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Auto-initialize sync service
  useEffect(() => {
    if (!syncStatus.isInitialized && !syncStatus.error) {
      initializeSync();
    }
  }, [syncStatus.isInitialized, syncStatus.error, initializeSync]);

  /**
   * Get status color based on current state
   */
  const getStatusColor = () => {
    if (!syncStatus.isInitialized) return 'text-gray-400';
    if (!syncStatus.isOnline) return 'text-red-500';
    if (syncStatus.isSyncing) return 'text-blue-500';
    if (hasConflicts) return 'text-yellow-500';
    if (hasQueuedItems) return 'text-orange-500';
    return 'text-green-500';
  };

  /**
   * Get status icon
   */
  const getStatusIcon = () => {
    const color = getStatusColor();
    const size = compact ? 16 : 20;

    if (!syncStatus.isInitialized) {
      return <CloudOff size={size} className={color} />;
    }
    if (!syncStatus.isOnline) {
      return <WifiOff size={size} className={color} />;
    }
    if (syncStatus.isSyncing) {
      return <Loader size={size} className={`${color} animate-spin`} />;
    }
    if (hasConflicts) {
      return <AlertTriangle size={size} className={color} />;
    }
    if (hasQueuedItems) {
      return <Clock size={size} className={color} />;
    }
    return <CheckCircle size={size} className={color} />;
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    if (!syncStatus.isInitialized) return 'Not initialized';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return `Syncing... (${syncProgress.stage})`;
    if (hasConflicts) return `${conflicts.length} conflicts`;
    if (hasQueuedItems) return `${syncStatus.queueLength} queued`;
    return 'Synced';
  };

  /**
   * Handle conflict resolution
   */
  const handleResolveConflict = (conflict, resolution) => {
    resolveConflict(conflict.id, resolution);
    setShowConflictModal(false);
    setSelectedConflict(null);
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (seconds) => {
    if (!seconds) return 'Never';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        
        {/* Notification indicator */}
        {notifications.length > 0 && (
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1 text-blue-500 hover:text-blue-600"
          >
            <AlertCircle size={16} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {notifications.length}
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Cloud Sync
            </h3>
            <p className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            {/* Manual sync button */}
            <button
              onClick={forceSync}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
              className="p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="Force sync"
            >
              <RefreshCw size={18} />
            </button>

            {/* Clear queue button */}
            {hasQueuedItems && (
              <button
                onClick={clearQueue}
                className="p-2 text-orange-600 hover:text-orange-700"
                title="Clear sync queue"
              >
                <Trash2 size={18} />
              </button>
            )}

            {/* Settings button */}
            <button
              className="p-2 text-gray-600 hover:text-gray-700"
              title="Sync settings"
            >
              <Settings size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Sync progress bar */}
      {syncStatus.isSyncing && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {syncProgress.details}
            </span>
            <span className="text-sm font-medium text-blue-600">
              {Math.round(syncProgress.current)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${syncProgress.current}%` }}
            />
          </div>
        </div>
      )}

      {showDetails && (
        <>
          {/* Status details */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              {syncStatus.isOnline ? (
                <Wifi size={16} className="text-green-500" />
              ) : (
                <WifiOff size={16} className="text-red-500" />
              )}
              <span className="text-gray-600 dark:text-gray-400">
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Database size={16} className="text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Queue: {syncStatus.queueLength}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Last sync: {formatTimeAgo(lastSyncAgo)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasConflicts ? (
                <AlertTriangle size={16} className="text-yellow-500" />
              ) : (
                <CheckCircle size={16} className="text-green-500" />
              )}
              <span className="text-gray-600 dark:text-gray-400">
                {hasConflicts ? `${conflicts.length} conflicts` : 'No conflicts'}
              </span>
            </div>
          </div>

          {/* Conflicts section */}
          {hasConflicts && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Data Conflicts
                </h4>
                {hasPendingConflicts && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    Action Required
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {conflicts.slice(0, 3).map((conflict) => (
                  <div
                    key={conflict.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        {conflict.type} conflict
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300">
                        Local vs server data mismatch
                      </p>
                    </div>
                    
                    {conflict.needsUserInput ? (
                      <button
                        onClick={() => {
                          setSelectedConflict(conflict);
                          setShowConflictModal(true);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-sm text-yellow-600 dark:text-yellow-300">
                        Auto-resolved
                      </span>
                    )}
                  </div>
                ))}
                
                {conflicts.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{conflicts.length - 3} more conflicts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error state */}
          {syncStatus.error && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <XCircle size={20} className="text-red-500" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Sync Error
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {syncStatus.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Notifications dropdown */}
      {showNotifications && notifications.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Sync Notifications
            </h4>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {notification.type === 'success' && (
                      <CheckCircle size={16} className="text-green-500 mt-0.5" />
                    )}
                    {notification.type === 'error' && (
                      <XCircle size={16} className="text-red-500 mt-0.5" />
                    )}
                    {notification.type === 'warning' && (
                      <AlertTriangle size={16} className="text-yellow-500 mt-0.5" />
                    )}
                    {notification.type === 'info' && (
                      <AlertCircle size={16} className="text-blue-500 mt-0.5" />
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(Math.floor((Date.now() - new Date(notification.timestamp)) / 1000))}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict resolution modal */}
      {showConflictModal && selectedConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resolve Data Conflict
              </h3>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  There's a conflict between your local data and server data for this {selectedConflict.type}.
                  Please choose which version to keep:
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Local data */}
                  <div className="p-4 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Local Version
                    </h4>
                    <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(selectedConflict.localData, null, 2)}
                    </pre>
                  </div>
                  
                  {/* Server data */}
                  <div className="p-4 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">
                      Server Version
                    </h4>
                    <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(selectedConflict.serverData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                
                <button
                  onClick={() => handleResolveConflict(selectedConflict, {
                    action: 'keep_local',
                    resolvedData: selectedConflict.localData
                  })}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Keep Local
                </button>
                
                <button
                  onClick={() => handleResolveConflict(selectedConflict, {
                    action: 'update',
                    resolvedData: selectedConflict.serverData
                  })}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Use Server
                </button>
                
                <button
                  onClick={() => handleResolveConflict(selectedConflict, {
                    action: 'merge',
                    resolvedData: { ...selectedConflict.localData, ...selectedConflict.serverData }
                  })}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  Merge Both
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CloudSyncStatus };
// NetworkStatusIndicator.js - Network connection status indicator for the main UI
import React, { useState } from 'react';
import { useNetworkSync } from '../context/NetworkSyncContext';
import { WifiOff, Server, Smartphone, Monitor, Users } from 'lucide-react';
import NetworkSettingsPanel from './NetworkSettingsPanel';

const NetworkStatusIndicator = () => {
  const {
    deviceRole,
    isConnected,
    serverInfo,
    connectedDevices,
    syncStats,
  } = useNetworkSync();

  const [showSettings, setShowSettings] = useState(false);

  /**
   * Get status color and icon
   */
  const getStatusInfo = () => {
    if (deviceRole === 'standalone') {
      return {
        color: 'gray',
        icon: Monitor,
        label: 'Standalone',
        description: 'Not connected to network',
      };
    }

    if (isConnected) {
      return {
        color: 'green',
        icon: deviceRole === 'server' ? Server : Smartphone,
        label: deviceRole === 'server' ? 'Server Active' : 'Connected',
        description: deviceRole === 'server' 
          ? `${connectedDevices.length} device(s) connected`
          : `Connected to ${serverInfo?.ip || 'server'}`,
      };
    }

    return {
      color: 'red',
      icon: WifiOff,
      label: 'Disconnected',
      description: deviceRole === 'server' ? 'Server stopped' : 'Connection lost',
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  /**
   * Get color classes
   */
  const getColorClasses = (color) => {
    const colorMap = {
      green: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        dot: 'bg-green-400',
      },
      red: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        dot: 'bg-red-400',
      },
      gray: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
      },
    };
    return colorMap[color];
  };

  const colors = getColorClasses(statusInfo.color);

  return (
    <>
      {/* Status Indicator */}
      <div 
        onClick={() => setShowSettings(true)}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${colors.bg} ${colors.border}`}
      >
        {/* Status Icon */}
        <div className="relative">
          <StatusIcon size={20} className={colors.text} />
          {/* Connection dot */}
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${colors.dot}`}>
            <div className={`w-full h-full rounded-full ${isConnected && deviceRole !== 'standalone' ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${colors.text}`}>
            {statusInfo.label}
          </div>
          <div className={`text-xs ${colors.text} opacity-75 truncate`}>
            {statusInfo.description}
          </div>
        </div>

        {/* Connected Devices Count (Server only) */}
        {deviceRole === 'server' && isConnected && (
          <div className={`flex items-center space-x-1 text-xs ${colors.text}`}>
            <Users size={14} />
            <span>{connectedDevices.length}</span>
          </div>
        )}

        {/* Sync Queue Indicator */}
        {syncStats && syncStats.queueLength > 0 && (
          <div className={`flex items-center space-x-1 text-xs ${colors.text}`}>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <span>{syncStats.queueLength}</span>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <NetworkSettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </>
  );
};

export default NetworkStatusIndicator;
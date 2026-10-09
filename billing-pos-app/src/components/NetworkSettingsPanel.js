// NetworkSettingsPanel.js - Network Configuration and Connection Management UI
import React, { useState, useEffect } from 'react';
import { useNetworkSync } from '../context/NetworkSyncContext';
import toast from 'react-hot-toast';
import { Server, Smartphone, Monitor, RefreshCw, 
         Users, Printer, CheckCircle, XCircle, Network } from 'lucide-react';

const NetworkSettingsPanel = ({ onClose }) => {
  const {
    deviceRole,
    isConnected,
    deviceId,
    serverInfo,
    connectedDevices,
    syncStats,
    autoReconnect,
    startServer,
    stopServer,
    connectToServer,
    disconnectFromServer,
    discoverServers,
    switchToStandalone,
    updateConnectedDevices,
  } = useNetworkSync();

  const [currentTab, setCurrentTab] = useState('overview');
  const [discoveredServers, setDiscoveredServers] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [connectionForm, setConnectionForm] = useState({
    serverIP: '',
    serverPort: '9876',
    deviceName: '',
    autoReconnect: true,
  });
  const [serverForm, setServerForm] = useState({
    port: '9876',
    deviceName: '',
  });

  // Load initial data
  useEffect(() => {
    if (serverInfo) {
      setConnectionForm(prev => ({
        ...prev,
        serverIP: serverInfo.ip || '',
        serverPort: String(serverInfo.port || 9876),
      }));
    }
    
    setConnectionForm(prev => ({
      ...prev,
      autoReconnect,
      deviceName: `Counter-${deviceId?.slice(0, 6) || 'Unknown'}`,
    }));

    setServerForm({
      port: String(serverInfo?.port || 9876),
      deviceName: `Main Counter (${deviceId?.slice(0, 6) || 'Unknown'})`,
    });
  }, [serverInfo, autoReconnect, deviceId]);

  // Auto-update connected devices for servers
  useEffect(() => {
    if (deviceRole === 'server' && isConnected) {
      const interval = setInterval(updateConnectedDevices, 2000);
      return () => clearInterval(interval);
    }
  }, [deviceRole, isConnected, updateConnectedDevices]);

  /**
   * Discover available servers
   */
  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const servers = await discoverServers();
      setDiscoveredServers(servers);
      
      if (servers.length === 0) {
        toast.error('No servers found on network');
      } else {
        toast.success(`Found ${servers.length} server(s)`);
      }
    } catch (error) {
      toast.error('Discovery failed: ' + error.message);
    } finally {
      setIsDiscovering(false);
    }
  };

  /**
   * Start as server
   */
  const handleStartServer = async () => {
    try {
      const port = parseInt(serverForm.port) || 9876;
      await startServer(port);
      setCurrentTab('overview');
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };

  /**
   * Stop server
   */
  const handleStopServer = async () => {
    try {
      await stopServer();
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  /**
   * Connect to server
   */
  const handleConnect = async (serverIP, serverPort, deviceName) => {
    try {
      await connectToServer(serverIP, serverPort, deviceName);
      setCurrentTab('overview');
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  /**
   * Disconnect from server
   */
  const handleDisconnect = async () => {
    try {
      await disconnectFromServer();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  /**
   * Switch to standalone mode
   */
  const handleSwitchToStandalone = async () => {
    try {
      await switchToStandalone();
      setCurrentTab('overview');
    } catch (error) {
      console.error('Failed to switch mode:', error);
    }
  };

  /**
   * Render overview tab
   */
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Device Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Device Status</h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isConnected ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Device Role:</span>
            <div className="flex items-center space-x-2 mt-1">
              {deviceRole === 'server' && <Server size={16} />}
              {deviceRole === 'client' && <Smartphone size={16} />}
              {deviceRole === 'standalone' && <Monitor size={16} />}
              <span className="font-medium capitalize">{deviceRole}</span>
            </div>
          </div>
          <div>
            <span className="text-gray-500">Device ID:</span>
            <p className="font-mono text-xs mt-1">{deviceId || 'Loading...'}</p>
          </div>
        </div>

        {serverInfo && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-gray-500">Network Info:</span>
            <p className="font-medium mt-1">{serverInfo.ip}:{serverInfo.port}</p>
          </div>
        )}
      </div>

      {/* Connected Devices (Server only) */}
      {deviceRole === 'server' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Connected Devices</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users size={16} />
              <span>{connectedDevices.length} devices</span>
            </div>
          </div>

          {connectedDevices.length > 0 ? (
            <div className="space-y-2">
              {connectedDevices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{device.deviceName || 'Unknown Device'}</p>
                    <p className="text-xs text-gray-500 font-mono">{device.deviceId || 'Unknown ID'}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Connected {new Date(device.connectedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No devices connected</p>
          )}
        </div>
      )}

      {/* Sync Statistics */}
      {syncStats && Object.keys(syncStats).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Statistics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Queue Length:</span>
              <p className="font-medium">{syncStats.queueLength || 0}</p>
            </div>
            <div>
              <span className="text-gray-500">Processing:</span>
              <p className="font-medium">{syncStats.processingQueue ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-3">
        {deviceRole === 'standalone' && (
          <>
            <button
              onClick={() => setCurrentTab('server')}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <Server size={16} />
              <span>Start as Server</span>
            </button>
            <button
              onClick={() => setCurrentTab('client')}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <Smartphone size={16} />
              <span>Connect as Client</span>
            </button>
          </>
        )}
        
        {deviceRole === 'server' && isConnected && (
          <button
            onClick={handleStopServer}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Stop Server
          </button>
        )}
        
        {deviceRole === 'client' && isConnected && (
          <button
            onClick={handleDisconnect}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Disconnect
          </button>
        )}
        
        {(deviceRole === 'server' || deviceRole === 'client') && (
          <button
            onClick={handleSwitchToStandalone}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Standalone Mode
          </button>
        )}
      </div>
    </div>
  );

  /**
   * Render server setup tab
   */
  const renderServerSetup = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Server size={48} className="mx-auto text-blue-600 mb-4" />
        <h3 className="text-xl font-medium text-gray-900">Setup as Main Device (Server)</h3>
        <p className="text-gray-600 mt-2">
          This device will act as the main counter with printer access. Other devices can connect to sync data.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Server Port
          </label>
          <input
            type="number"
            value={serverForm.port}
            onChange={(e) => setServerForm(prev => ({ ...prev, port: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="9876"
          />
          <p className="text-xs text-gray-500 mt-1">Port for other devices to connect (default: 9876)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Device Name
          </label>
          <input
            type="text"
            value={serverForm.deviceName}
            onChange={(e) => setServerForm(prev => ({ ...prev, deviceName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Main Counter"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Printer className="text-blue-600 mt-1" size={20} />
            <div>
              <h4 className="font-medium text-blue-900">Printer Access</h4>
              <p className="text-sm text-blue-700 mt-1">
                As the main device, this counter will handle all print jobs from connected devices. 
                Make sure your thermal printer is properly connected.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleStartServer}
          className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Start Server
        </button>
        <button
          onClick={() => setCurrentTab('overview')}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  /**
   * Render client setup tab
   */
  const renderClientSetup = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Smartphone size={48} className="mx-auto text-green-600 mb-4" />
        <h3 className="text-xl font-medium text-gray-900">Connect as Secondary Device (Client)</h3>
        <p className="text-gray-600 mt-2">
          Connect to the main counter to sync data and send print jobs remotely.
        </p>
      </div>

      {/* Discovered Servers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Available Servers</h4>
          <button
            onClick={handleDiscover}
            disabled={isDiscovering}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isDiscovering ? 'animate-spin' : ''} />
            <span>Discover</span>
          </button>
        </div>

        {discoveredServers.length > 0 ? (
          <div className="space-y-2 mb-4">
            {discoveredServers.map((server, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">{server.deviceName || 'Unknown Server'}</p>
                  <p className="text-sm text-gray-600">{server.ip}:{server.port}</p>
                </div>
                <button
                  onClick={() => handleConnect(server.ip, server.port, connectionForm.deviceName)}
                  className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-200 rounded-lg text-gray-500 mb-4">
            {isDiscovering ? 'Searching for servers...' : 'No servers found. Click Discover or enter manually below.'}
          </div>
        )}
      </div>

      {/* Manual Connection */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-4">Manual Connection</h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Server IP Address
              </label>
              <input
                type="text"
                value={connectionForm.serverIP}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, serverIP: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                value={connectionForm.serverPort}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, serverPort: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="9876"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              This Device Name
            </label>
            <input
              type="text"
              value={connectionForm.deviceName}
              onChange={(e) => setConnectionForm(prev => ({ ...prev, deviceName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Counter 2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoReconnect"
              checked={connectionForm.autoReconnect}
              onChange={(e) => setConnectionForm(prev => ({ ...prev, autoReconnect: e.target.checked }))}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="autoReconnect" className="ml-2 text-sm text-gray-700">
              Auto-reconnect if connection is lost
            </label>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => handleConnect(connectionForm.serverIP, parseInt(connectionForm.serverPort), connectionForm.deviceName)}
          disabled={!connectionForm.serverIP}
          className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Connect to Server
        </button>
        <button
          onClick={() => setCurrentTab('overview')}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Network size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Network Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: Monitor },
            { id: 'server', label: 'Server Setup', icon: Server },
            { id: 'client', label: 'Client Setup', icon: Smartphone },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  currentTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentTab === 'overview' && renderOverview()}
          {currentTab === 'server' && renderServerSetup()}
          {currentTab === 'client' && renderClientSetup()}
        </div>
      </div>
    </div>
  );
};

export default NetworkSettingsPanel;
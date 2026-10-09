// NetworkSyncContext.js - React Context for Network Synchronization
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getNetworkServer } from '../network/NetworkServer';
import { getNetworkClient } from '../network/NetworkClient';
import DataSyncEngine from '../network/DataSyncEngine';
import toast from 'react-hot-toast';

const NetworkSyncContext = createContext();

export const useNetworkSync = () => {
  const context = useContext(NetworkSyncContext);
  if (!context) {
    throw new Error('useNetworkSync must be used within NetworkSyncProvider');
  }
  return context;
};

export const NetworkSyncProvider = ({ children }) => {
  const [deviceRole, setDeviceRole] = useState('standalone'); // 'server', 'client', 'standalone'
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [syncEngine, setSyncEngine] = useState(null);
  const [syncStats, setSyncStats] = useState({});
  const [autoReconnect, setAutoReconnect] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadNetworkSettings();
    loadDeviceId();
  }, []);

  /**
   * Load device ID
   */
  const loadDeviceId = async () => {
    try {
      if (window.electronAPI && window.electronAPI.license) {
        const id = await window.electronAPI.license.getDeviceId();
        setDeviceId(id);
      }
    } catch (error) {
      console.error('Failed to load device ID:', error);
    }
  };

  /**
   * Load network settings from database
   */
  const loadNetworkSettings = async () => {
    try {
      const { initDB } = await import('../db/db');
      const db = await initDB();
      
      const roleSettings = await db.get('settings', 'network_device_role');
      if (roleSettings) {
        setDeviceRole(roleSettings.value);
      }

      const serverSettings = await db.get('settings', 'network_server_info');
      if (serverSettings) {
        setServerInfo(serverSettings.value);
      }

      const autoReconnectSettings = await db.get('settings', 'network_auto_reconnect');
      if (autoReconnectSettings) {
        setAutoReconnect(autoReconnectSettings.value);
      }
    } catch (error) {
      console.error('Failed to load network settings:', error);
    }
  };

  /**
   * Save network settings
   */
  const saveNetworkSettings = async (role, server, autoReconn) => {
    try {
      const { initDB } = await import('../db/db');
      const db = await initDB();
      
      await db.put('settings', {
        key: 'network_device_role',
        value: role,
      });

      if (server) {
        await db.put('settings', {
          key: 'network_server_info',
          value: server,
        });
      }

      await db.put('settings', {
        key: 'network_auto_reconnect',
        value: autoReconn,
      });

      setDeviceRole(role);
      setServerInfo(server);
      setAutoReconnect(autoReconn);
    } catch (error) {
      console.error('Failed to save network settings:', error);
      throw error;
    }
  };

  /**
   * Initialize sync engine
   */
  const initializeSyncEngine = useCallback(async () => {
    try {
      const isServer = deviceRole === 'server';
      const networkInstance = isServer ? getNetworkServer() : getNetworkClient();
      
      const engine = new DataSyncEngine(networkInstance);
      await engine.initialize(isServer);
      
      setSyncEngine(engine);
      
      // Update sync stats periodically
      const statsInterval = setInterval(() => {
        if (engine) {
          setSyncStats(engine.getSyncStats());
        }
      }, 5000);

      return () => clearInterval(statsInterval);
    } catch (error) {
      console.error('Failed to initialize sync engine:', error);
    }
  }, [deviceRole]);

  // Initialize sync engine when role changes
  useEffect(() => {
    if (deviceRole !== 'standalone') {
      initializeSyncEngine();
    }
  }, [deviceRole, initializeSyncEngine]);

  /**
   * Start as server
   */
  const startServer = async (port = 9876) => {
    try {
      const server = getNetworkServer();
      
      // Setup event listeners
      server.on('started', (data) => {
        setIsConnected(true);
        setServerInfo({
          ip: data.localIP,
          port: data.port,
          deviceId: data.deviceId,
        });
        toast.success(`Server started on ${data.localIP}:${data.port}`);
      });

      server.on('client-connected', (data) => {
        toast.success(`Device connected: ${data.deviceInfo?.deviceName || data.deviceId}`);
        updateConnectedDevices();
      });

      server.on('client-disconnected', (data) => {
        toast.error(`Device disconnected: ${data.deviceId}`);
        updateConnectedDevices();
      });

      server.on('print-request', async (data) => {
        // Handle remote print request
        await handleRemotePrintRequest(data);
      });

      // Start server
      const result = await server.start(port, deviceId);
      
      await saveNetworkSettings('server', {
        ip: result.localIP,
        port: result.port,
        deviceId: deviceId,
      }, autoReconnect);

      return result;
    } catch (error) {
      console.error('Failed to start server:', error);
      toast.error('Failed to start server: ' + error.message);
      throw error;
    }
  };

  /**
   * Stop server
   */
  const stopServer = async () => {
    try {
      const server = getNetworkServer();
      await server.stop();
      setIsConnected(false);
      setConnectedDevices([]);
      toast.success('Server stopped');
    } catch (error) {
      console.error('Failed to stop server:', error);
      toast.error('Failed to stop server');
      throw error;
    }
  };

  /**
   * Connect as client
   */
  const connectToServer = async (serverIP, serverPort = 9876, deviceName = '') => {
    try {
      const client = getNetworkClient();
      
      // Setup event listeners
      client.on('connected', () => {
        setIsConnected(true);
        setServerInfo({ ip: serverIP, port: serverPort });
        toast.success(`Connected to server ${serverIP}:${serverPort}`);
      });

      client.on('disconnected', () => {
        setIsConnected(false);
        toast.error('Disconnected from server');
        
        if (autoReconnect) {
          toast('Attempting to reconnect...', { icon: '🔄' });
        }
      });

      client.on('reconnecting', (data) => {
        toast(`Reconnecting... (Attempt ${data.attempt})`, { icon: '🔄' });
      });

      client.on('reconnect-failed', () => {
        toast.error('Failed to reconnect. Please check connection and try again.');
      });

      client.on('error', (error) => {
        console.error('Client error:', error);
      });

      // Connect
      await client.connect(serverIP, serverPort, deviceId, {
        deviceName: deviceName || `Counter-${deviceId?.slice(0, 6)}`,
      });

      await saveNetworkSettings('client', {
        ip: serverIP,
        port: serverPort,
      }, autoReconnect);

      // Perform initial full sync
      if (syncEngine) {
        setTimeout(() => {
          syncEngine.performFullSync().catch(console.error);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to connect to server:', error);
      toast.error('Failed to connect: ' + error.message);
      throw error;
    }
  };

  /**
   * Disconnect from server
   */
  const disconnectFromServer = async () => {
    try {
      const client = getNetworkClient();
      await client.disconnect();
      setIsConnected(false);
      toast.success('Disconnected from server');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  /**
   * Discover servers on network
   */
  const discoverServers = async () => {
    try {
      const client = getNetworkClient();
      const servers = await client.discoverServers();
      return servers;
    } catch (error) {
      console.error('Discovery failed:', error);
      return [];
    }
  };

  /**
   * Update connected devices list
   */
  const updateConnectedDevices = () => {
    if (deviceRole === 'server') {
      const server = getNetworkServer();
      const devices = server.getConnectedDevices();
      setConnectedDevices(devices);
    }
  };

  /**
   * Handle remote print request
   */
  const handleRemotePrintRequest = async (data) => {
    try {
      const { deviceId: requestingDeviceId, printData } = data;
      
      toast.loading(`Print request from ${requestingDeviceId}...`, {
        id: 'remote-print',
      });

      // Use the print-html IPC to print
      if (window.electronAPI && window.electronAPI.printHTML) {
        const result = await window.electronAPI.printHTML(printData);
        
        if (result.success) {
          toast.success('Print job completed', { id: 'remote-print' });
        } else {
          toast.error('Print failed: ' + result.error, { id: 'remote-print' });
        }
      }
    } catch (error) {
      console.error('Remote print error:', error);
      toast.error('Print failed', { id: 'remote-print' });
    }
  };

  /**
   * Request print on main device (from client)
   */
  const requestRemotePrint = async (printData) => {
    if (deviceRole !== 'client' || !isConnected) {
      throw new Error('Not connected to server');
    }

    try {
      const client = getNetworkClient();
      await client.requestPrint(printData);
      toast.success('Print request sent to main device');
    } catch (error) {
      console.error('Failed to request remote print:', error);
      toast.error('Failed to send print request');
      throw error;
    }
  };

  /**
   * Sync data change
   */
  const syncDataChange = useCallback(async (store, operation, data) => {
    if (!syncEngine || !isConnected) return;
    
    try {
      await syncEngine.queueSync(store, operation, data);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, [syncEngine, isConnected]);

  /**
   * Switch to standalone mode
   */
  const switchToStandalone = async () => {
    try {
      if (deviceRole === 'server') {
        await stopServer();
      } else if (deviceRole === 'client') {
        await disconnectFromServer();
      }
      
      await saveNetworkSettings('standalone', null, false);
      setDeviceRole('standalone');
      setIsConnected(false);
      toast.success('Switched to standalone mode');
    } catch (error) {
      console.error('Failed to switch to standalone:', error);
      toast.error('Failed to switch mode');
    }
  };

  const value = {
    // State
    deviceRole,
    isConnected,
    deviceId,
    serverInfo,
    connectedDevices,
    syncStats,
    autoReconnect,
    syncEngine,
    
    // Server functions
    startServer,
    stopServer,
    
    // Client functions
    connectToServer,
    disconnectFromServer,
    discoverServers,
    
    // Sync functions
    syncDataChange,
    requestRemotePrint,
    
    // Settings
    saveNetworkSettings,
    switchToStandalone,
    
    // Utils
    updateConnectedDevices,
  };

  return (
    <NetworkSyncContext.Provider value={value}>
      {children}
    </NetworkSyncContext.Provider>
  );
};

export default NetworkSyncContext;

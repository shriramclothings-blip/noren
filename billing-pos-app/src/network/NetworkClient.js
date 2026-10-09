// NetworkClient.js - Client for connecting to main device
// Runs on secondary counter devices

import { EventEmitter } from 'events';

class NetworkClient extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.isConnected = false;
    this.serverIP = null;
    this.serverPort = 9876;
    this.deviceId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000;
    this.reconnectTimer = null;
    this.heartbeatInterval = null;
  }

  /**
   * Connect to server
   * @param {string} serverIP - Server IP address
   * @param {number} serverPort - Server port
   * @param {string} deviceId - This device's unique ID
   * @param {Object} deviceInfo - Device information
   */
  async connect(serverIP, serverPort, deviceId, deviceInfo = {}) {
    if (this.isConnected) {
      throw new Error('Already connected');
    }

    this.serverIP = serverIP;
    this.serverPort = serverPort;
    this.deviceId = deviceId;

    try {
      if (window.electron) {
        const result = await window.electron.networkClient.connect({
          serverIP,
          serverPort,
          deviceId,
          deviceInfo: {
            ...deviceInfo,
            deviceName: deviceInfo.deviceName || `Counter-${deviceId.slice(0, 6)}`,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            connectedAt: new Date().toISOString(),
          },
        });

        if (!result.success) {
          throw new Error(result.error || 'Connection failed');
        }

        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._setupEventListeners();
        this._startHeartbeat();
        this.emit('connected', { serverIP, serverPort });

        return { success: true };
      } else {
        throw new Error('Electron API not available');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      this._scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect() {
    if (!this.isConnected) return;

    this._stopHeartbeat();
    this._clearReconnect();

    try {
      if (window.electron) {
        await window.electron.networkClient.disconnect();
      }

      this.isConnected = false;
      this.emit('disconnected');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    if (!window.electron) return;

    // Server messages
    window.electron.networkClient.onMessage((data) => {
      this.emit('message', data);
    });

    // Data sync from server
    window.electron.networkClient.onDataSync((data) => {
      this.emit('data-sync', data);
    });

    // Connection closed
    window.electron.networkClient.onDisconnected(() => {
      this.isConnected = false;
      this._stopHeartbeat();
      this.emit('disconnected');
      this._scheduleReconnect();
    });

    // Print response from server
    window.electron.networkClient.onPrintResponse((data) => {
      this.emit('print-response', data);
    });

    // Connection error
    window.electron.networkClient.onError((error) => {
      this.emit('error', error);
      this._scheduleReconnect();
    });
  }

  /**
   * Send data to server
   * @param {Object} data - Data to send
   */
  async send(data) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }

    try {
      if (window.electron) {
        await window.electron.networkClient.send(data);
      }
    } catch (error) {
      console.error('Send failed:', error);
      throw error;
    }
  }

  /**
   * Request remote print
   * @param {Object} printData - Print data (HTML, options)
   */
  async requestPrint(printData) {
    return this.send({
      type: 'PRINT_REQUEST',
      payload: printData,
      deviceId: this.deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sync data to server
   * @param {Object} syncData - Data to sync
   */
  async syncData(syncData) {
    return this.send({
      type: 'DATA_SYNC',
      payload: syncData,
      deviceId: this.deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'HEARTBEAT',
          deviceId: this.deviceId,
          timestamp: new Date().toISOString(),
        }).catch(() => {
          // Heartbeat failed, connection likely dead
          this.isConnected = false;
          this._stopHeartbeat();
          this._scheduleReconnect();
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect-failed');
      return;
    }

    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts + 1, 5);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected && this.serverIP) {
        this.emit('reconnecting', { attempt: this.reconnectAttempts });
        this.connect(this.serverIP, this.serverPort, this.deviceId).catch(() => {
          // Will schedule another attempt
        });
      }
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  _clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      serverIP: this.serverIP,
      serverPort: this.serverPort,
      deviceId: this.deviceId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Auto-discover servers on local network
   */
  async discoverServers() {
    try {
      if (window.electron) {
        const result = await window.electron.networkClient.discover();
        return result.servers || [];
      }
      return [];
    } catch (error) {
      console.error('Discovery failed:', error);
      return [];
    }
  }
}

// Singleton instance
let clientInstance = null;

export const getNetworkClient = () => {
  if (!clientInstance) {
    clientInstance = new NetworkClient();
  }
  return clientInstance;
};

export default NetworkClient;

// NetworkServer.js - Main Device Server for Multi-Counter Synchronization
// Runs on the primary device that has the printer connected

import { EventEmitter } from 'events';

class NetworkServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.clients = new Map(); // deviceId -> client connection
    this.deviceRegistry = new Map(); // deviceId -> device info
    this.isRunning = false;
    this.port = 9876;
    this.serverDeviceId = null;
  }

  /**
   * Start the WebSocket server
   * @param {number} port - Port to listen on
   * @param {string} deviceId - Unique device identifier
   */
  async start(port = 9876, deviceId) {
    if (this.isRunning) {
      throw new Error('Server already running');
    }

    this.port = port;
    this.serverDeviceId = deviceId;

    try {
      // Use Electron's IPC to start server in main process
      if (window.electron) {
        const result = await window.electron.networkServer.start({
          port: this.port,
          deviceId: this.serverDeviceId,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to start server');
        }

        this.isRunning = true;
        this._setupEventListeners();
        this.emit('started', { port: this.port, deviceId: this.serverDeviceId });
        
        return {
          success: true,
          port: this.port,
          localIP: result.localIP,
        };
      } else {
        throw new Error('Electron API not available');
      }
    } catch (error) {
      console.error('Failed to start network server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      if (window.electron) {
        await window.electron.networkServer.stop();
      }

      this.clients.clear();
      this.deviceRegistry.clear();
      this.isRunning = false;
      this.emit('stopped');
    } catch (error) {
      console.error('Failed to stop server:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for server events
   */
  _setupEventListeners() {
    if (!window.electron) return;

    // Client connected
    window.electron.networkServer.onClientConnected((data) => {
      const { deviceId, deviceInfo } = data;
      this.deviceRegistry.set(deviceId, {
        ...deviceInfo,
        connectedAt: new Date().toISOString(),
        status: 'connected',
      });
      this.emit('client-connected', { deviceId, deviceInfo });
    });

    // Client disconnected
    window.electron.networkServer.onClientDisconnected((data) => {
      const { deviceId } = data;
      const device = this.deviceRegistry.get(deviceId);
      if (device) {
        device.status = 'disconnected';
        device.disconnectedAt = new Date().toISOString();
      }
      this.clients.delete(deviceId);
      this.emit('client-disconnected', { deviceId });
    });

    // Data sync request
    window.electron.networkServer.onDataSync((data) => {
      this.emit('data-sync', data);
    });

    // Print request from client
    window.electron.networkServer.onPrintRequest((data) => {
      this.emit('print-request', data);
    });

    // Generic message
    window.electron.networkServer.onMessage((data) => {
      this.emit('message', data);
    });
  }

  /**
   * Broadcast data to all connected clients
   * @param {Object} data - Data to broadcast
   * @param {Array} excludeDevices - Device IDs to exclude
   */
  async broadcast(data, excludeDevices = []) {
    if (!this.isRunning) return;

    try {
      if (window.electron) {
        await window.electron.networkServer.broadcast({
          data,
          excludeDevices,
        });
      }
    } catch (error) {
      console.error('Broadcast failed:', error);
    }
  }

  /**
   * Send data to specific client
   * @param {string} deviceId - Target device ID
   * @param {Object} data - Data to send
   */
  async sendToDevice(deviceId, data) {
    if (!this.isRunning) return;

    try {
      if (window.electron) {
        await window.electron.networkServer.sendToDevice({
          deviceId,
          data,
        });
      }
    } catch (error) {
      console.error('Send to device failed:', error);
    }
  }

  /**
   * Get list of connected devices
   */
  getConnectedDevices() {
    return Array.from(this.deviceRegistry.values()).filter(
      (device) => device.status === 'connected'
    );
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      deviceId: this.serverDeviceId,
      connectedDevices: this.getConnectedDevices().length,
      totalDevices: this.deviceRegistry.size,
    };
  }
}

// Singleton instance
let serverInstance = null;

export const getNetworkServer = () => {
  if (!serverInstance) {
    serverInstance = new NetworkServer();
  }
  return serverInstance;
};

export default NetworkServer;

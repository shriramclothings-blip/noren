// electron-network-server.js - WebSocket Server in Electron Main Process
const { ipcMain } = require('electron');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const { networkDiscoveryService } = require('./electron-network-discovery');

class NetworkServerMain {
  constructor() {
    this.server = null;
    this.wss = null;
    this.clients = new Map(); // deviceId -> ws connection
    this.mainWindow = null;
    this.isRunning = false;
    this.port = 9876;
    this.serverDeviceId = null;
  }

  /**
   * Initialize with main window reference
   */
  init(mainWindow) {
    this.mainWindow = mainWindow;
    this._setupIpcHandlers();
  }

  /**
   * Setup IPC handlers
   */
  _setupIpcHandlers() {
    // Start server
    ipcMain.handle('network-server:start', async (event, config) => {
      try {
        const { port, deviceId } = config;
        return await this.start(port, deviceId);
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Stop server
    ipcMain.handle('network-server:stop', async () => {
      try {
        await this.stop();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Broadcast to all clients
    ipcMain.handle('network-server:broadcast', async (event, data) => {
      try {
        this.broadcast(data.data, data.excludeDevices);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Send to specific device
    ipcMain.handle('network-server:send-to-device', async (event, data) => {
      try {
        this.sendToDevice(data.deviceId, data.data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Get server status
    ipcMain.handle('network-server:get-status', async () => {
      return {
        isRunning: this.isRunning,
        port: this.port,
        deviceId: this.serverDeviceId,
        connectedClients: this.clients.size,
        localIP: this.getLocalIP(),
      };
    });
  }

  /**
   * Start WebSocket server
   */
  async start(port = 9876, deviceId) {
    if (this.isRunning) {
      throw new Error('Server already running');
    }

    this.port = port;
    this.serverDeviceId = deviceId;

    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.server = http.createServer();
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ server: this.server });

        // Setup WebSocket event handlers
        this.wss.on('connection', (ws, req) => {
          this._handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
          console.error('WebSocket server error:', error);
          this._sendToRenderer('network-server:error', { error: error.message });
        });

        // Start listening
        this.server.listen(port, '0.0.0.0', () => {
          this.isRunning = true;
          const localIP = this.getLocalIP();
          
          // Start discovery service
          networkDiscoveryService.start({
            deviceId: this.serverDeviceId,
            deviceName: `Main Counter (${this.serverDeviceId?.slice(0, 6)})`,
            port: this.port,
            ip: localIP,
          });
          
          console.log(`Network server started on ${localIP}:${port}`);
          resolve({
            success: true,
            port: this.port,
            localIP,
            deviceId: this.serverDeviceId,
          });
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop server
   */
  async stop() {
    if (!this.isRunning) return;

    // Stop discovery service
    networkDiscoveryService.stop();

    // Close all client connections
    for (const [deviceId, ws] of this.clients.entries()) {
      try {
        ws.close();
      } catch (error) {
        console.error(`Error closing connection for ${deviceId}:`, error);
      }
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.server = null;
          this.isRunning = false;
          resolve();
        });
      });
    }

    this.isRunning = false;
  }

  /**
   * Handle new WebSocket connection
   */
  _handleConnection(ws, req) {
    let deviceId = null;
    let deviceInfo = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle handshake
        if (data.type === 'HANDSHAKE') {
          deviceId = data.deviceId;
          deviceInfo = data.deviceInfo || {};
          
          // Store connection
          this.clients.set(deviceId, ws);
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'HANDSHAKE_ACK',
            serverDeviceId: this.serverDeviceId,
            timestamp: new Date().toISOString(),
          }));

          // Notify renderer
          this._sendToRenderer('network-server:client-connected', {
            deviceId,
            deviceInfo,
          });

          console.log(`Client connected: ${deviceId}`);
        }
        // Handle data sync
        else if (data.type === 'DATA_SYNC') {
          this._sendToRenderer('network-server:data-sync', {
            deviceId,
            data: data.payload,
            timestamp: data.timestamp,
          });
          
          // Broadcast to other clients
          this.broadcast(data, [deviceId]);
        }
        // Handle print request
        else if (data.type === 'PRINT_REQUEST') {
          this._sendToRenderer('network-server:print-request', {
            deviceId,
            printData: data.payload,
            timestamp: data.timestamp,
          });

          // Also handle the print request directly in main process
          this._handleRemotePrintRequest(data.payload, deviceId);
        }
        // Handle heartbeat
        else if (data.type === 'HEARTBEAT') {
          ws.send(JSON.stringify({
            type: 'HEARTBEAT_ACK',
            timestamp: new Date().toISOString(),
          }));
        }
        // Handle other messages
        else {
          this._sendToRenderer('network-server:message', {
            deviceId,
            data,
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        this.clients.delete(deviceId);
        this._sendToRenderer('network-server:client-disconnected', {
          deviceId,
        });
        console.log(`Client disconnected: ${deviceId}`);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${deviceId}:`, error);
    });
  }

  /**
   * Broadcast data to all clients
   */
  broadcast(data, excludeDevices = []) {
    const message = JSON.stringify(data);
    for (const [deviceId, ws] of this.clients.entries()) {
      if (!excludeDevices.includes(deviceId) && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error(`Error broadcasting to ${deviceId}:`, error);
        }
      }
    }
  }

  /**
   * Send data to specific device
   */
  sendToDevice(deviceId, data) {
    const ws = this.clients.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error(`Error sending to ${deviceId}:`, error);
        throw error;
      }
    } else {
      throw new Error(`Device ${deviceId} not connected`);
    }
  }

  /**
   * Send message to renderer process
   */
  _sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Handle remote print request in main process
   */
  async _handleRemotePrintRequest(printData, requestingDeviceId) {
    const { ipcMain } = require('electron');
    
    try {
      // Execute print through IPC
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            if (window.electronAPI && window.electronAPI.printHTML) {
              return await window.electronAPI.printHTML({
                html: ${JSON.stringify(printData.html)},
                options: ${JSON.stringify({
                  ...printData.options,
                  fromRemote: true,
                  requestingDeviceId: requestingDeviceId,
                  silent: true // Remote prints should be silent by default
                })}
              });
            }
            return { success: false, error: 'Print API not available' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);

      // Send response back to requesting device
      this.sendToDevice(requestingDeviceId, {
        type: 'PRINT_RESPONSE',
        success: result.success,
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      console.log(`Remote print from ${requestingDeviceId}: ${result.success ? 'Success' : 'Failed - ' + result.error}`);
    } catch (error) {
      console.error('Error handling remote print:', error);
      
      // Send error response
      try {
        this.sendToDevice(requestingDeviceId, {
          type: 'PRINT_RESPONSE',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } catch (sendError) {
        console.error('Failed to send error response:', sendError);
      }
    }
  }

  /**
   * Get local IP address
   */
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip loopback and non-IPv4
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}

// Singleton instance
const networkServerMain = new NetworkServerMain();

module.exports = { networkServerMain };

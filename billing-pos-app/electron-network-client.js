// electron-network-client.js - WebSocket Client in Electron Main Process
const { ipcMain } = require('electron');
const WebSocket = require('ws');
const dgram = require('dgram');
const os = require('os');

class NetworkClientMain {
  constructor() {
    this.ws = null;
    this.mainWindow = null;
    this.isConnected = false;
    this.serverIP = null;
    this.serverPort = null;
    this.deviceId = null;
    this.deviceInfo = null;
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
    // Connect to server
    ipcMain.handle('network-client:connect', async (event, config) => {
      try {
        const { serverIP, serverPort, deviceId, deviceInfo } = config;
        return await this.connect(serverIP, serverPort, deviceId, deviceInfo);
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Disconnect
    ipcMain.handle('network-client:disconnect', async () => {
      try {
        this.disconnect();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Send data
    ipcMain.handle('network-client:send', async (event, data) => {
      try {
        this.send(data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Discover servers
    ipcMain.handle('network-client:discover', async () => {
      try {
        const servers = await this.discoverServers();
        return { success: true, servers };
      } catch (error) {
        return { success: false, error: error.message, servers: [] };
      }
    });

    // Get status
    ipcMain.handle('network-client:get-status', async () => {
      return {
        isConnected: this.isConnected,
        serverIP: this.serverIP,
        serverPort: this.serverPort,
        deviceId: this.deviceId,
      };
    });
  }

  /**
   * Connect to server
   */
  async connect(serverIP, serverPort, deviceId, deviceInfo) {
    if (this.isConnected) {
      throw new Error('Already connected');
    }

    this.serverIP = serverIP;
    this.serverPort = serverPort;
    this.deviceId = deviceId;
    this.deviceInfo = deviceInfo;

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${serverIP}:${serverPort}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          // Send handshake
          this.send({
            type: 'HANDSHAKE',
            deviceId: this.deviceId,
            deviceInfo: this.deviceInfo,
            timestamp: new Date().toISOString(),
          });
        });

        this.ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());

            // Handle handshake acknowledgment
            if (data.type === 'HANDSHAKE_ACK') {
              this.isConnected = true;
              console.log('Connected to server:', this.serverIP);
              resolve({ success: true });
            }
            // Handle data sync
            else if (data.type === 'DATA_SYNC') {
              this._sendToRenderer('network-client:data-sync', data);
            }
            // Handle heartbeat
            else if (data.type === 'HEARTBEAT_ACK') {
              // Heartbeat acknowledged
            }
            // Handle print responses
            else if (data.type === 'PRINT_RESPONSE') {
              this._sendToRenderer('network-client:print-response', data);
            }
            // Handle other messages
            else {
              this._sendToRenderer('network-client:message', data);
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          this._sendToRenderer('network-client:disconnected', {});
          console.log('Disconnected from server');
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this._sendToRenderer('network-client:error', { error: error.message });
          if (!this.isConnected) {
            reject(error);
          }
        });

        // Timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Send data to server
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('Send error:', error);
      throw error;
    }
  }

  /**
   * Discover servers on local network using UDP broadcast
   */
  async discoverServers(timeout = 3000) {
    return new Promise((resolve) => {
      const servers = [];
      const client = dgram.createSocket('udp4');
      const discoveryPort = 9877;

      client.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'SERVER_ANNOUNCEMENT') {
            servers.push({
              ip: rinfo.address,
              port: data.port || 9876,
              deviceId: data.deviceId,
              deviceName: data.deviceName,
            });
          }
        } catch (error) {
          // Ignore invalid messages
        }
      });

      client.bind(() => {
        client.setBroadcast(true);
        
        // Send discovery request
        const message = JSON.stringify({
          type: 'DISCOVER',
          timestamp: new Date().toISOString(),
        });
        
        // Broadcast to local network
        const broadcastAddresses = this._getBroadcastAddresses();
        for (const addr of broadcastAddresses) {
          client.send(message, discoveryPort, addr, (err) => {
            if (err) {
              console.error(`Failed to send discovery to ${addr}:`, err);
            }
          });
        }
      });

      // Wait for responses
      setTimeout(() => {
        client.close();
        resolve(servers);
      }, timeout);
    });
  }

  /**
   * Get broadcast addresses for all network interfaces
   */
  _getBroadcastAddresses() {
    const addresses = ['255.255.255.255']; // Global broadcast
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          // Calculate broadcast address
          const ip = iface.address.split('.').map(Number);
          const netmask = iface.netmask.split('.').map(Number);
          const broadcast = ip.map((byte, i) => byte | (~netmask[i] & 255));
          addresses.push(broadcast.join('.'));
        }
      }
    }
    
    return addresses;
  }

  /**
   * Send message to renderer process
   */
  _sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

// Singleton instance
const networkClientMain = new NetworkClientMain();

module.exports = { networkClientMain };

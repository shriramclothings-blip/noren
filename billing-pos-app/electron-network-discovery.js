// electron-network-discovery.js - UDP-based server discovery for automatic connection
const dgram = require('dgram');
const os = require('os');

class NetworkDiscoveryService {
  constructor() {
    this.discoveryServer = null;
    this.discoveryPort = 9877;
    this.isRunning = false;
    this.serverInfo = null;
  }

  /**
   * Start discovery service (for server devices)
   * Responds to discovery broadcasts with server information
   * @param {Object} serverInfo - Server information to broadcast
   */
  start(serverInfo) {
    if (this.isRunning) {
      return;
    }

    this.serverInfo = serverInfo;
    this.discoveryServer = dgram.createSocket('udp4');

    this.discoveryServer.on('error', (err) => {
      console.error('Discovery server error:', err);
      this.stop();
    });

    this.discoveryServer.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        
        // Respond to discovery requests
        if (data.type === 'DISCOVER') {
          const response = JSON.stringify({
            type: 'SERVER_ANNOUNCEMENT',
            deviceId: this.serverInfo.deviceId,
            deviceName: this.serverInfo.deviceName || 'Main Counter',
            port: this.serverInfo.port,
            ip: this.getLocalIP(),
            timestamp: new Date().toISOString(),
          });

          // Send response back to requester
          this.discoveryServer.send(response, rinfo.port, rinfo.address, (err) => {
            if (err) {
              console.error('Failed to send discovery response:', err);
            }
          });
        }
      } catch (error) {
        // Ignore malformed messages
      }
    });

    this.discoveryServer.on('listening', () => {
      const address = this.discoveryServer.address();
      console.log(`Discovery service listening on ${address.address}:${address.port}`);
      this.isRunning = true;
    });

    // Bind to discovery port
    this.discoveryServer.bind(this.discoveryPort);
  }

  /**
   * Stop discovery service
   */
  stop() {
    if (this.discoveryServer) {
      this.discoveryServer.close();
      this.discoveryServer = null;
      this.isRunning = false;
      console.log('Discovery service stopped');
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

  /**
   * Broadcast periodic announcements (optional - for active discovery)
   */
  startBroadcasting(intervalMs = 30000) {
    if (this.broadcastInterval) {
      return;
    }

    this.broadcastInterval = setInterval(() => {
      this.sendAnnouncement();
    }, intervalMs);
  }

  /**
   * Stop broadcasting
   */
  stopBroadcasting() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  /**
   * Send server announcement broadcast
   */
  sendAnnouncement() {
    if (!this.isRunning || !this.serverInfo) {
      return;
    }

    const announcement = JSON.stringify({
      type: 'SERVER_ANNOUNCEMENT',
      deviceId: this.serverInfo.deviceId,
      deviceName: this.serverInfo.deviceName || 'Main Counter',
      port: this.serverInfo.port,
      ip: this.getLocalIP(),
      timestamp: new Date().toISOString(),
    });

    const client = dgram.createSocket('udp4');
    client.bind(() => {
      client.setBroadcast(true);
      
      // Broadcast to all network interfaces
      const broadcastAddresses = this.getBroadcastAddresses();
      for (const addr of broadcastAddresses) {
        client.send(announcement, this.discoveryPort, addr, (err) => {
          if (err) {
            console.error(`Failed to broadcast to ${addr}:`, err);
          }
        });
      }

      // Close after sending
      setTimeout(() => client.close(), 100);
    });
  }

  /**
   * Get broadcast addresses for all network interfaces
   */
  getBroadcastAddresses() {
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
    
    return [...new Set(addresses)]; // Remove duplicates
  }
}

// Singleton instance
const networkDiscoveryService = new NetworkDiscoveryService();

module.exports = { networkDiscoveryService };

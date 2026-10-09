// RemotePrintService.js - Handle remote printing from secondary devices
// Routes print jobs to the main device that has the printer

class RemotePrintService {
  constructor() {
    this.printQueue = [];
    this.isProcessing = false;
    this.mainDeviceId = null;
    this.isMainDevice = false;
  }

  /**
   * Initialize the service
   * @param {boolean} isMainDevice - Whether this is the main device with printer
   * @param {string} mainDeviceId - Main device ID (for clients)
   */
  initialize(isMainDevice, mainDeviceId = null) {
    this.isMainDevice = isMainDevice;
    this.mainDeviceId = mainDeviceId;
    
    // Setup print response handler for clients
    if (!isMainDevice) {
      this._setupPrintResponseHandler();
    }
    
    console.log(`RemotePrintService initialized (${isMainDevice ? 'Main Device' : 'Secondary Device'})`);
  }

  /**
   * Setup handler for print responses from server
   */
  _setupPrintResponseHandler() {
    import('../network/NetworkClient').then(({ getNetworkClient }) => {
      const client = getNetworkClient();
      client.on('print-response', (response) => {
        this._handlePrintResponse(response);
      });
    }).catch(console.error);
  }

  /**
   * Handle print response from main device
   */
  _handlePrintResponse(response) {
    const { success, error, timestamp } = response;
    
    if (success) {
      console.log('Remote print completed successfully');
      // You can emit events here for UI feedback
    } else {
      console.error('Remote print failed:', error);
      // Could trigger a fallback to local printing
    }
  }

  /**
   * Print invoice/receipt
   * @param {Object} printData - Print configuration
   * @param {string} printData.html - HTML content to print
   * @param {Object} printData.options - Print options (printer, copies, etc.)
   * @param {boolean} forceLocal - Force local printing even if remote is available
   */
  async print(printData, forceLocal = false) {
    // If this is the main device or force local, print locally
    if (this.isMainDevice || forceLocal) {
      return await this.printLocally(printData);
    }

    // If we're a secondary device, send to main device
    return await this.printRemotely(printData);
  }

  /**
   * Print locally on this device
   * @param {Object} printData - Print configuration
   */
  async printLocally(printData) {
    try {
      if (!window.electronAPI || !window.electronAPI.printHTML) {
        throw new Error('Electron print API not available');
      }

      const { html, options = {} } = printData;

      const result = await window.electronAPI.printHTML({
        html,
        options: {
          silent: options.silent !== false, // Default to silent printing
          deviceName: options.printerName || undefined,
          copies: options.copies || 1,
          showWindow: options.showWindow || false,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Print failed');
      }

      return {
        success: true,
        method: 'local',
        message: 'Printed successfully',
      };
    } catch (error) {
      console.error('Local print error:', error);
      return {
        success: false,
        method: 'local',
        error: error.message,
      };
    }
  }

  /**
   * Send print job to main device
   * @param {Object} printData - Print configuration
   */
  async printRemotely(printData) {
    try {
      // Get network client
      const { getNetworkClient } = await import('../network/NetworkClient');
      const client = getNetworkClient();

      if (!client.isConnected) {
        // Fallback to local printing if not connected
        console.warn('Not connected to main device, printing locally');
        return await this.printLocally(printData);
      }

      // Send print request to main device with promise for response
      const printPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Print request timeout'));
        }, 30000); // 30 second timeout

        // Listen for print response
        const responseHandler = (response) => {
          clearTimeout(timeout);
          client.off('print-response', responseHandler);
          
          if (response.success) {
            resolve({
              success: true,
              method: 'remote',
              message: 'Printed on main device successfully',
            });
          } else {
            reject(new Error(response.error || 'Remote print failed'));
          }
        };

        client.on('print-response', responseHandler);
      });

      // Send the request
      await client.requestPrint({
        html: printData.html,
        options: printData.options || {},
        timestamp: new Date().toISOString(),
      });

      // Wait for response
      return await printPromise;
    } catch (error) {
      console.error('Remote print error:', error);
      
      // Fallback to local printing
      console.warn('Remote print failed, attempting local print');
      return await this.printLocally(printData);
    }
  }

  /**
   * Queue a print job
   * @param {Object} printData - Print configuration
   */
  async queuePrint(printData) {
    this.printQueue.push({
      ...printData,
      queuedAt: new Date().toISOString(),
    });

    await this.processPrintQueue();
  }

  /**
   * Process print queue
   */
  async processPrintQueue() {
    if (this.isProcessing || this.printQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.printQueue.length > 0) {
        const printJob = this.printQueue.shift();
        await this.print(printJob);
        
        // Small delay between prints
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Print queue error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get available printers
   */
  async getAvailablePrinters() {
    try {
      if (window.electronAPI && window.electronAPI.getPrinters) {
        return await window.electronAPI.getPrinters();
      }
      return [];
    } catch (error) {
      console.error('Failed to get printers:', error);
      return [];
    }
  }

  /**
   * Check if remote printing is available
   */
  isRemotePrintingAvailable() {
    return !this.isMainDevice && this.mainDeviceId !== null;
  }

  /**
   * Get print service status
   */
  getStatus() {
    return {
      isMainDevice: this.isMainDevice,
      mainDeviceId: this.mainDeviceId,
      queueLength: this.printQueue.length,
      isProcessing: this.isProcessing,
      remotePrintingAvailable: this.isRemotePrintingAvailable(),
    };
  }

  /**
   * Clear print queue
   */
  clearQueue() {
    this.printQueue = [];
  }
}

// Singleton instance
let printServiceInstance = null;

export const getRemotePrintService = () => {
  if (!printServiceInstance) {
    printServiceInstance = new RemotePrintService();
  }
  return printServiceInstance;
};

export default RemotePrintService;

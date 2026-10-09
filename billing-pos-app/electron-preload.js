const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer (React app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation from menu
  onNavigate: (callback) => ipcRenderer.on('navigate', (_, page) => callback(page)),
  removeNavigateListener: () => ipcRenderer.removeAllListeners('navigate'),

  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Printing
  print: (options) => ipcRenderer.invoke('print', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  listPrinters: () => ipcRenderer.invoke('get-printers'),
  printHTML: (payload) => ipcRenderer.invoke('print-html', payload),
  savePDF: (payload) => ipcRenderer.invoke('save-pdf', payload),
  openCustomerDisplay: () => ipcRenderer.invoke('open-customer-display'),

  // Paytm UPI automation (optional)
  paytm: {
    getLocalWebhookUrl: () => ipcRenderer.invoke('paytm:get-local-webhook-url'),
    createQr: (params) => ipcRenderer.invoke('paytm:create-qr', params),
    orderStatus: (params) => ipcRenderer.invoke('paytm:order-status', params),
    onWebhook: (callback) => ipcRenderer.on('paytm:webhook', (_, payload) => callback(payload)),
    removeWebhookListener: () => ipcRenderer.removeAllListeners('paytm:webhook'),
  },

  // Platform info
  platform: process.platform,
  isElectron: true,

  // Open URL in default OS browser (used for WhatsApp Web links)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Save invoice HTML to a temp PDF silently (no save dialog) — returns { success, filePath }
  savePDFToTemp: (payload) => ipcRenderer.invoke('save-pdf-to-temp', payload),

  // Open a file with the OS default application (e.g. to preview a PDF)
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // Reveal a file in Windows Explorer / macOS Finder
  showFile: (filePath) => ipcRenderer.invoke('show-file', filePath),

  // Gemini AI fallback proxy (used if renderer fetch is blocked)
  geminiQuery: (params) => ipcRenderer.invoke('gemini:query', params),

  // License system
  license: {
    getDeviceId: () => ipcRenderer.invoke('license:get-device-id'),
  },
});

// Network synchronization APIs
contextBridge.exposeInMainWorld('electron', {
  networkServer: {
    start: (config) => ipcRenderer.invoke('network-server:start', config),
    stop: () => ipcRenderer.invoke('network-server:stop'),
    broadcast: (data) => ipcRenderer.invoke('network-server:broadcast', data),
    sendToDevice: (data) => ipcRenderer.invoke('network-server:send-to-device', data),
    getStatus: () => ipcRenderer.invoke('network-server:get-status'),
    
    // Event listeners
    onClientConnected: (callback) => ipcRenderer.on('network-server:client-connected', (_, data) => callback(data)),
    onClientDisconnected: (callback) => ipcRenderer.on('network-server:client-disconnected', (_, data) => callback(data)),
    onDataSync: (callback) => ipcRenderer.on('network-server:data-sync', (_, data) => callback(data)),
    onPrintRequest: (callback) => ipcRenderer.on('network-server:print-request', (_, data) => callback(data)),
    onMessage: (callback) => ipcRenderer.on('network-server:message', (_, data) => callback(data)),
  },
  
  networkClient: {
    connect: (config) => ipcRenderer.invoke('network-client:connect', config),
    disconnect: () => ipcRenderer.invoke('network-client:disconnect'),
    send: (data) => ipcRenderer.invoke('network-client:send', data),
    discover: () => ipcRenderer.invoke('network-client:discover'),
    getStatus: () => ipcRenderer.invoke('network-client:get-status'),
    
    // Event listeners
    onMessage: (callback) => ipcRenderer.on('network-client:message', (_, data) => callback(data)),
    onDataSync: (callback) => ipcRenderer.on('network-client:data-sync', (_, data) => callback(data)),
    onDisconnected: (callback) => ipcRenderer.on('network-client:disconnected', (_, data) => callback(data)),
    onError: (callback) => ipcRenderer.on('network-client:error', (_, data) => callback(data)),
    onPrintResponse: (callback) => ipcRenderer.on('network-client:print-response', (_, data) => callback(data)),
  },
});

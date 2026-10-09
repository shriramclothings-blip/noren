const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licenseAPI', {
  generate: (params) => ipcRenderer.invoke('license:generate', params),

  db: {
    getAll:        ()       => ipcRenderer.invoke('db:get-all'),
    saveLicense:   (record) => ipcRenderer.invoke('db:save-license', record),
    deleteLicense: (id)     => ipcRenderer.invoke('db:delete-license', id),
    checkDevice:   (id)     => ipcRenderer.invoke('db:check-device', id),
  },

  export: {
    csv:      () => ipcRenderer.invoke('export:csv'),
    json:     () => ipcRenderer.invoke('export:json'),
    auditCsv: () => ipcRenderer.invoke('export:audit-csv'),
  },

  import: {
    json: () => ipcRenderer.invoke('import:json'),
  },

  pricing: {
    get:  ()     => ipcRenderer.invoke('pricing:get'),
    save: (data) => ipcRenderer.invoke('pricing:save', data),
  },

  audit: {
    getAll: ()             => ipcRenderer.invoke('audit:get-all'),
    log:    (action, detail) => ipcRenderer.invoke('audit:log', { action, detail }),
  },

  print: {
    receipt:         (html) => ipcRenderer.invoke('print:receipt', html),
    saveCertificate: (html, customerName, recordId) => ipcRenderer.invoke('print:save-certificate', html, customerName, recordId),
    saveInvoicePdf:  (html, invoiceNumber, customerName) => ipcRenderer.invoke('print:save-invoice-pdf', html, invoiceNumber, customerName),
  },

  invoice: {
    getAll:        ()       => ipcRenderer.invoke('invoice:get-all'),
    save:          (record) => ipcRenderer.invoke('invoice:save', record),
    delete:        (id)     => ipcRenderer.invoke('invoice:delete', id),
    getNextNumber: ()       => ipcRenderer.invoke('invoice:get-next-number'),
  },

  revocation: {
    getAll:   () => ipcRenderer.invoke('revocation:get-all'),
    revoke:   (params) => ipcRenderer.invoke('license:revoke', params),
    unrevoke: (key) => ipcRenderer.invoke('license:unrevoke', key),
  },

  licFile: {
    save: (tokenData) => ipcRenderer.invoke('license:save-lic-file', tokenData),
    open: ()          => ipcRenderer.invoke('license:open-lic-file'),
  },

  vault: {
    export: (password) => ipcRenderer.invoke('vault:export', password),
    import: (password) => ipcRenderer.invoke('vault:import', password),
  },

  copyToClipboard: (text)     => ipcRenderer.invoke('copy-to-clipboard', text),
  openFolder:      (filePath) => ipcRenderer.invoke('open-folder', filePath),
  openExternal:    (url)      => ipcRenderer.invoke('open-external', url),
});


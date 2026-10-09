const { app, BrowserWindow, Menu, ipcMain, dialog, webContents, screen, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const { networkServerMain } = require('./electron-network-server');
const { networkClientMain } = require('./electron-network-client');
let PaytmChecksum;

try {
  // Optional dependency (only used for Paytm payment automation)
  PaytmChecksum = require('paytmchecksum');
} catch {
  PaytmChecksum = null;
}

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let customerDisplayWindow = null;
let paytmWebhookServer = null;
let paytmWebhookPort = null;

function getPaytmEndpoints(env = 'production') {
  const e = String(env || 'production').toLowerCase();
  const isStage = e === 'stage' || e === 'staging' || e === 'test' || e === 'sandbox';
  return {
    createQr: isStage
      ? 'https://securestage.paytmpayments.com/paymentservices/qr/create'
      : 'https://securegw.paytm.in/paymentservices/qr/create',
    orderStatus: isStage
      ? 'https://securestage.paytmpayments.com/v3/order/status'
      : 'https://securegw.paytm.in/v3/order/status',
    env: isStage ? 'stage' : 'production',
  };
}

async function paytmGenerateSignature(body, merchantKey) {
  if (!PaytmChecksum) throw new Error('PaytmChecksum dependency missing');
  const str = JSON.stringify(body || {});
  return PaytmChecksum.generateSignature(str, merchantKey);
}

function paytmVerifySignature(body, merchantKey, signature) {
  if (!PaytmChecksum) return true; // fail-open (we still rely on TXN_SUCCESS from Paytm)
  try {
    return PaytmChecksum.verifySignature(JSON.stringify(body || {}), merchantKey, signature);
  } catch {
    return false;
  }
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw: text };
  }
}

function startPaytmWebhookServer() {
  if (paytmWebhookServer) return;
  paytmWebhookServer = http.createServer((req, res) => {
    // Minimal JSON webhook receiver:
    // - Do not crash the app even for malformed payloads
    // - Forward payload to renderer so it can accelerate status polling
    try {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
      }
      const url = req.url || '';
      if (!url.startsWith('/paytm/webhook')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        let json = null;
        try { json = body ? JSON.parse(body) : {}; } catch { json = { raw: body }; }

        try {
          mainWindow?.webContents?.send('paytm:webhook', json);
        } catch {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    } catch {
      try {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {}
    }
  });

  // Bind to an ephemeral port (0) to avoid conflicts on low-end PCs.
  paytmWebhookServer.listen(0, '127.0.0.1', () => {
    try {
      const addr = paytmWebhookServer.address();
      paytmWebhookPort = addr?.port || null;
    } catch {
      paytmWebhookPort = null;
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'VENDEXA RetailOS™ — by Dinesh Global Enterprises Pvt Ltd',
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
    },
    backgroundColor: '#f9fafb',
    show: false,
    titleBarStyle: 'default',
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
    
    // Initialize network modules
    networkServerMain.init(mainWindow);
    networkClientMain.init(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createCustomerDisplayWindow() {
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    customerDisplayWindow.focus();
    return customerDisplayWindow;
  }

  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0) || displays[0];
  const targetBounds = externalDisplay.bounds || { x: 0, y: 0, width: 1200, height: 800 };

  customerDisplayWindow = new BrowserWindow({
    x: targetBounds.x + 40,
    y: targetBounds.y + 40,
    width: 1100,
    height: 700,
    title: 'Customer Display',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
    },
  });

  const displayUrl = isDev
    ? 'http://localhost:3000/#customer-display'
    : `file://${path.join(__dirname, 'build', 'index.html')}#customer-display`;

  customerDisplayWindow.loadURL(displayUrl);
  customerDisplayWindow.on('closed', () => {
    customerDisplayWindow = null;
  });
  return customerDisplayWindow;
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Invoice', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('navigate', 'pos') },
        { type: 'separator' },
        { label: 'Print', accelerator: 'CmdOrCtrl+P', role: 'print' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Dashboard', accelerator: 'Alt+1', click: () => mainWindow?.webContents.send('navigate', 'dashboard') },
        { label: 'POS / Billing', accelerator: 'Alt+2', click: () => mainWindow?.webContents.send('navigate', 'pos') },
        { label: 'Invoices', accelerator: 'Alt+3', click: () => mainWindow?.webContents.send('navigate', 'invoices') },
        { label: 'Inventory', accelerator: 'Alt+4', click: () => mainWindow?.webContents.send('navigate', 'inventory') },
        { label: 'Customers', accelerator: 'Alt+5', click: () => mainWindow?.webContents.send('navigate', 'customers') },
        { label: 'Reports', accelerator: 'Alt+6', click: () => mainWindow?.webContents.send('navigate', 'reports') },
        { label: 'Settings', accelerator: 'Alt+7', click: () => mainWindow?.webContents.send('navigate', 'settings') },
        { label: 'Customer Display', accelerator: 'CmdOrCtrl+Shift+D', click: () => createCustomerDisplayWindow() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About VENDEXA RetailOS™',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About VENDEXA RetailOS™',
              message: 'VENDEXA RetailOS™ — by Dinesh Global Enterprises Pvt Ltd',
              detail: 'Version 1.1.0\nOffline Retail Billing, Inventory & POS System\nBuilt with React + Electron + IndexedDB\n\n✓ Professional Invoice Generation\n✓ Barcode Scanning & Printing\n✓ Thermal Printer Support\n✓ Advanced Analytics & Reporting\n✓ Full Offline Support',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  startPaytmWebhookServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('show-save-dialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('print', async (_, options) => {
  try {
    if (!mainWindow) return { success: false, error: 'Main window not ready' };

    // Electron's webContents.print is callback-based (not a Promise).
    // Wrap it so the renderer gets a real success/failure signal.
    const result = await new Promise((resolve) => {
      mainWindow.webContents.print(options, (success, failureReason) => {
        resolve({ success, failureReason });
      });
    });

    if (result.success) return { success: true };
    return { success: false, error: result.failureReason || 'Print failed' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-printers', async () => {
  try {
    if (mainWindow) {
      return await mainWindow.webContents.getPrinters();
    }
    return [];
  } catch (err) {
    return [];
  }
});

ipcMain.handle('open-customer-display', async () => {
  try {
    createCustomerDisplayWindow();
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Unable to open customer display' };
  }
});

// -------------------------
// Paytm UPI Automation (IPC)
// -------------------------

ipcMain.handle('paytm:get-local-webhook-url', async () => {
  if (!paytmWebhookPort) return null;
  return `http://127.0.0.1:${paytmWebhookPort}/paytm/webhook`;
});

ipcMain.handle('paytm:create-qr', async (_, params) => {
  try {
    const {
      mid,
      merchantKey,
      amount,
      orderId,
      posId,
      env,
      clientId = 'C11',
      version = 'v1',
      orderDetails,
      invoiceDetails,
      contactPhoneNo,
      expiryDate,
      displayName,
      imageRequired = true,
    } = params || {};

    if (!mid || !merchantKey) return { success: false, error: 'Missing Paytm MID / Merchant Key' };
    if (!orderId) return { success: false, error: 'Missing orderId' };
    if (!amount) return { success: false, error: 'Missing amount' };
    if (!posId) return { success: false, error: 'Missing POS Id' };

    const body = {
      mid,
      orderId,
      amount: String(amount),
      businessType: 'UPI_QR_CODE',
      posId: String(posId),
      ...(orderDetails ? { orderDetails: String(orderDetails) } : {}),
      ...(invoiceDetails ? { invoiceDetails: String(invoiceDetails) } : {}),
      ...(contactPhoneNo ? { contactPhoneNo: String(contactPhoneNo) } : {}),
      ...(expiryDate ? { expiryDate: String(expiryDate) } : {}),
      ...(displayName ? { displayName: String(displayName) } : {}),
      ...(imageRequired === false ? { imageRequired: false } : {}),
    };

    const signature = await paytmGenerateSignature(body, merchantKey);
    const payload = { body, head: { clientId, version, signature } };
    const endpoints = getPaytmEndpoints(env);

    const resp = await postJson(endpoints.createQr, payload);
    if (!resp.ok || !resp.data) {
      return { success: false, error: `Paytm QR API failed (${resp.status})`, raw: resp.raw };
    }

    // Verify response signature if present (best-effort)
    const respHeadSig = resp.data?.head?.signature;
    const respBody = resp.data?.body || {};
    const sigOk = respHeadSig ? paytmVerifySignature(respBody, merchantKey, respHeadSig) : true;

    return { success: true, data: resp.data, signatureValid: sigOk, env: endpoints.env };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('paytm:order-status', async (_, params) => {
  try {
    const { mid, merchantKey, orderId, env, version = 'v1', channelId = 'WEB', clientId } = params || {};
    if (!mid || !merchantKey) return { success: false, error: 'Missing Paytm MID / Merchant Key' };
    if (!orderId) return { success: false, error: 'Missing orderId' };

    const body = { mid, orderId };
    const signature = await paytmGenerateSignature(body, merchantKey);
    const head = { signature, version, channelId, ...(clientId ? { clientId } : {}) };
    const payload = { body, head };
    const endpoints = getPaytmEndpoints(env);

    const resp = await postJson(endpoints.orderStatus, payload);
    if (!resp.ok || !resp.data) {
      return { success: false, error: `Paytm Status API failed (${resp.status})`, raw: resp.raw };
    }

    const respHeadSig = resp.data?.head?.signature;
    const respBody = resp.data?.body || {};
    const sigOk = respHeadSig ? paytmVerifySignature(respBody, merchantKey, respHeadSig) : true;

    return { success: true, data: resp.data, signatureValid: sigOk, env: endpoints.env };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// ── Print arbitrary HTML in an offscreen window (for invoices / labels)
ipcMain.handle('print-html', async (_, payload) => {
  try {
    const html = payload?.html || '';
    const options = payload?.options || {};
    const fromRemote = payload?.fromRemote || false;
    
    if (!html) return { success: false, error: 'No HTML to print' };

    const shouldShowWindow = options?.showWindow === true;
    const printWindow = new BrowserWindow({
      parent: shouldShowWindow && mainWindow ? mainWindow : undefined,
      modal: shouldShowWindow,
      show: shouldShowWindow,
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // Allow relative assets (like logo) inside data: URLs by providing a base URL.
    const baseDir = isDev ? path.join(__dirname, 'public') : path.join(__dirname, 'build');
    const baseURLForDataURL = `file://${baseDir.replaceAll('\\', '/')}/`;

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await printWindow.loadURL(dataUrl, { baseURLForDataURL });
    await new Promise((resolve) => printWindow.webContents.once('did-finish-load', resolve));
    if (shouldShowWindow) {
      try {
        printWindow.show();
        printWindow.setAlwaysOnTop(true);
        printWindow.focus();
      } catch {}
    }

    const printOptions = {
      printBackground: true,
      silent: options?.silent === true,
      deviceName: options?.deviceName,
      copies: Number(options?.copies) || 1,
    };

    const printOnce = async (opts) => {
      return await new Promise((resolve) => {
        printWindow.webContents.print(
          opts,
          (success, failureReason) => resolve({ success, failureReason })
        );
      });
    };

    let result = await printOnce(printOptions);

    // On Windows, invalid printer names or missing Windows dialog fallback can
    // silently fail. Retry with the default printer/dialog if first attempt fails.
    if (!result.success && printOptions.deviceName && !printOptions.silent) {
      const fallbackOptions = { ...printOptions, deviceName: undefined, silent: false };
      const fallbackResult = await printOnce(fallbackOptions);
      if (fallbackResult.success) {
        result = fallbackResult;
      } else {
        result.failureReason = `${result.failureReason || 'Print failed'}; fallback: ${fallbackResult.failureReason || 'unknown'}`;
      }
    }

    // Close the window to avoid leaks
    try { printWindow.close(); } catch {}

    // Log remote print activity
    if (fromRemote) {
      console.log(`Remote print job ${result.success ? 'completed' : 'failed'} from device ${payload.requestingDeviceId || 'unknown'}`);
    }

    if (result.success) return { success: true };
    return { success: false, error: result.failureReason || 'Print failed' };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Save arbitrary HTML to a PDF file using Chromium (best Unicode/₹ support).
ipcMain.handle('save-pdf', async (_, payload) => {
  try {
    const html = payload?.html || '';
    const defaultFilename = payload?.defaultFilename || 'document.pdf';
    if (!html) return { success: false, error: 'No HTML to save as PDF' };

    const saveResult = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (saveResult.canceled || !saveResult.filePath) return { success: false, canceled: true };

    const pdfWindow = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // Allow relative assets (like logo) inside data: URLs by providing a base URL.
    const baseDir = isDev ? path.join(__dirname, 'public') : path.join(__dirname, 'build');
    const baseURLForDataURL = `file://${baseDir.replaceAll('\\', '/')}/`;

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await pdfWindow.loadURL(dataUrl, { baseURLForDataURL });

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      // Let the HTML @page rule handle its own margins.
      // Setting marginType to 'none' avoids Chromium's
      // "margins must be less than or equal to pageSize" error.
      marginType: 0, // 0 = default (honours @page CSS), 1 = none, 2 = minimum
    });

    fs.writeFileSync(saveResult.filePath, pdfBuffer);
    try { pdfWindow.close(); } catch {}

    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Save PDF to a temp file silently (no save dialog) — used for WhatsApp PDF attachment
ipcMain.handle('save-pdf-to-temp', async (_, payload) => {
  try {
    const html = payload?.html || '';
    const filename = payload?.filename || `invoice-${Date.now()}.pdf`;
    if (!html) return { success: false, error: 'No HTML to convert to PDF' };

    const pdfWindow = new BrowserWindow({
      show: false,
      width: 794,  // A4 width in px at 96dpi
      height: 1123, // A4 height in px at 96dpi
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    const baseDir = isDev ? path.join(__dirname, 'public') : path.join(__dirname, 'build');
    const baseURLForDataURL = `file://${baseDir.replaceAll('\\', '/')}/`;
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await pdfWindow.loadURL(dataUrl, { baseURLForDataURL });

    // Wait for full render: did-finish-load + settle time for images/barcodes
    await new Promise((resolve) => pdfWindow.webContents.once('did-finish-load', resolve));
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      // marginType 0 = use CSS @page margins (no Chromium override)
      marginType: 0,
    });

    try { pdfWindow.close(); } catch {}

    // Write to OS temp directory
    const tempDir = app.getPath('temp');
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempFilePath = path.join(tempDir, safeFilename);
    fs.writeFileSync(tempFilePath, pdfBuffer);

    return { success: true, filePath: tempFilePath };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Open a file with the OS default application (used to preview/share saved PDFs)
ipcMain.handle('open-file', async (_, filePath) => {
  try {
    if (typeof filePath !== 'string') return { success: false, error: 'Invalid file path' };
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Reveal a file in Explorer/Finder
ipcMain.handle('show-file', async (_, filePath) => {
  try {
    if (typeof filePath !== 'string') return { success: false, error: 'Invalid file path' };
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// ── Open external URL in the OS default browser (used by WhatsApp links) ──
ipcMain.handle('open-external', async (_, url) => {
  try {
    // Only allow http/https URLs for security
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Only http/https URLs are allowed.' };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// ── License: Hardware Device ID Generation ────────────────────────────────────
// Combines multiple stable hardware identifiers and hashes them to produce
// a unique, stable Device ID for offline license binding.
//
// IMPORTANT: The Device ID is generated ONCE on first run and permanently
// persisted to disk. On every subsequent launch the stored ID is returned
// directly — hardware changes (MAC, hostname, etc.) never affect it.
//
// Stored at: <userData>/vendexa_device_id.lock
// The file is plain-text so it survives app updates and re-installs
// (as long as the OS user-data folder is preserved, which Electron always keeps).

function getDeviceIdFilePath() {
  // app.getPath('userData') is available once the app is ready
  return path.join(app.getPath('userData'), 'vendexa_device_id.lock');
}

function generateHardwareFingerprint() {
  try {
    const cpus = os.cpus();
    const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : 'UNKNOWN_CPU';

    // Get primary non-loopback MAC address
    const interfaces = os.networkInterfaces();
    let mac = 'NO_MAC';
    for (const iface of Object.values(interfaces)) {
      for (const addr of (iface || [])) {
        if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
          mac = addr.mac.toUpperCase().replace(/:/g, '');
          break;
        }
      }
      if (mac !== 'NO_MAC') break;
    }

    const hostname = os.hostname() || 'UNKNOWN_HOST';
    const platform = os.platform() || 'UNKNOWN_PLATFORM';
    const arch = os.arch() || 'UNKNOWN_ARCH';

    // Try Windows Machine GUID from registry (best uniqueness)
    let machineGuid = 'NO_GUID';
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const out = execSync(
          'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
          { timeout: 3000, encoding: 'utf8' }
        );
        const match = out.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/);
        if (match) machineGuid = match[1].trim().toUpperCase();
      } catch {}
    }

    const raw = [cpuModel, mac, hostname, platform, arch, machineGuid].join('|');
    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
    const short = hash.slice(0, 16);
    return short.match(/.{1,4}/g).join('-');
  } catch (err) {
    // Fallback: use hostname + platform only
    const fallback = `${os.hostname()}|${os.platform()}|${os.arch()}`;
    const hash = crypto.createHash('sha256').update(fallback).digest('hex').toUpperCase();
    const short = hash.slice(0, 16);
    return short.match(/.{1,4}/g).join('-');
  }
}

// Returns the persisted Device ID, generating and saving it on first run.
// Once saved, the same ID is returned forever regardless of hardware changes.
function getHardwareFingerprint() {
  const lockFile = getDeviceIdFilePath();

  // --- Return stored ID if it already exists ---
  try {
    if (fs.existsSync(lockFile)) {
      const stored = fs.readFileSync(lockFile, 'utf-8').trim();
      // Basic format check: XXXX-XXXX-XXXX-XXXX
      if (/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i.test(stored)) {
        return stored.toUpperCase();
      }
    }
  } catch {}

  // --- First run: generate, persist, and return ---
  const newId = generateHardwareFingerprint();
  try {
    fs.writeFileSync(lockFile, newId, { encoding: 'utf-8', mode: 0o600 });
  } catch (writeErr) {
    // If we can't write (very unlikely), still return the generated ID for this session.
    // Next launch will try again — not ideal but the app still works.
    console.error('[License] Failed to persist Device ID:', writeErr.message);
  }
  return newId;
}

let _cachedDeviceId = null;
ipcMain.handle('license:get-device-id', async () => {
  if (!_cachedDeviceId) _cachedDeviceId = getHardwareFingerprint();
  return _cachedDeviceId;
});

// ── Gemini AI — direct REST proxy via IPC (optional — renderer calls directly) ──
// This handler exists as a fallback for environments where fetch from renderer is blocked.
ipcMain.handle('gemini:query', async (_, { apiKey, model, payload }) => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data?.error?.message || `HTTP ${response.status}` };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// ── Remote Print Handler ──
// Handle print requests from network clients
ipcMain.handle('remote-print:handle', async (_, payload) => {
  try {
    const { html, options = {}, requestingDeviceId } = payload;
    
    if (!html) {
      return { success: false, error: 'No HTML content provided' };
    }

    // Execute the print job
    const result = await mainWindow.webContents.executeJavaScript(`
      (async () => {
        try {
          if (window.electronAPI && window.electronAPI.printHTML) {
            return await window.electronAPI.printHTML({
              html: ${JSON.stringify(html)},
              options: ${JSON.stringify({
                ...options,
                fromRemote: true,
                requestingDeviceId: requestingDeviceId
              })}
            });
          }
          return { success: false, error: 'Print API not available' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })()
    `);

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

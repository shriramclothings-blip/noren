/**
 * main.js — VENDEXA License Generator Tool
 * Private desktop app for Dinesh Global Enterprises Pvt Ltd
 * DO NOT DISTRIBUTE THIS FILE
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { clipboard } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    title: 'VENDEXA License Generator — Private Tool',
    icon: path.join(__dirname, 'IMG_8810.PNG'),
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => { mainWindow.show(); });
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── Shared secret (must match licenseManager.js) ──────────────────────────────
const _A = 'VNDXr3t@1lO$';
const _B = '2024#DGE!PvtL';
const _C = 'td!K3y$3cur3XY';
const SECRET = _A + _B + _C;

// ── HMAC-SHA256 ───────────────────────────────────────────────────────────────
function hmacSha256(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex').toUpperCase();
}

function formatKey(hex) {
  const raw = hex.slice(0, 32);
  return raw.match(/.{1,4}/g).join('-');
}

// ── IPC: Generate License Key ─────────────────────────────────────────────────
ipcMain.handle('license:generate', async (_, { deviceId, expiry, edition }) => {
  try {
    if (!deviceId || !expiry || !edition) return { success: false, error: 'Missing required fields' };
    const normalDeviceId = deviceId.trim().toUpperCase();
    const normalExpiry   = (expiry || 'LIFETIME').trim().toUpperCase();
    const normalEdition  = (edition || 'PRO').trim().toUpperCase();
    const payload = `${normalDeviceId}:${normalExpiry}:${normalEdition}`;
    const hex = hmacSha256(payload, SECRET);
    const key = formatKey(hex);
    return { success: true, key };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── DB paths ──────────────────────────────────────────────────────────────────
const DB_FILE    = path.join(app.getPath('userData'), 'licenses_db.json');
const AUDIT_FILE = path.join(app.getPath('userData'), 'audit_log.json');

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {}
  return { licenses: [], lastUpdated: null };
}

function saveDb(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Audit Log helpers ─────────────────────────────────────────────────────────
function loadAudit() {
  try {
    if (fs.existsSync(AUDIT_FILE)) return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
  } catch {}
  return { entries: [] };
}

function appendAudit(action, detail) {
  const log = loadAudit();
  log.entries.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    action,
    detail,
    timestamp: new Date().toISOString(),
  });
  // Keep last 1000 entries
  if (log.entries.length > 1000) log.entries = log.entries.slice(0, 1000);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

// ── IPC: DB Operations ────────────────────────────────────────────────────────
ipcMain.handle('db:get-all', async () => loadDb());

ipcMain.handle('db:save-license', async (_, record) => {
  try {
    const db = loadDb();
    const existing = db.licenses.findIndex((l) => l.id === record.id);
    if (existing >= 0) {
      db.licenses[existing] = record;
      appendAudit('EDITED', `License edited for ${record.customerName} (${record.deviceId})`);
    } else {
      db.licenses.push(record);
      appendAudit('GENERATED', `License generated for ${record.customerName} | ${record.edition} | ${record.expiry} | Device: ${record.deviceId}`);
    }
    saveDb(db);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:delete-license', async (_, id) => {
  try {
    const db = loadDb();
    const rec = db.licenses.find((l) => l.id === id);
    db.licenses = db.licenses.filter((l) => l.id !== id);
    saveDb(db);
    if (rec) appendAudit('DELETED', `License deleted for ${rec.customerName} (${rec.deviceId})`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Check if device ID already has an active license
ipcMain.handle('db:check-device', async (_, deviceId) => {
  try {
    const db = loadDb();
    const now = new Date();
    const match = db.licenses.find((l) => {
      if (l.deviceId.replace(/-/g, '') !== deviceId.replace(/-/g, '')) return false;
      if (l.expiry === 'LIFETIME') return true;
      return new Date(l.expiry) >= now;
    });
    return { exists: !!match, record: match || null };
  } catch {
    return { exists: false, record: null };
  }
});

// ── IPC: Audit Log ────────────────────────────────────────────────────────────
ipcMain.handle('audit:get-all', async () => loadAudit());

ipcMain.handle('audit:log', async (_, { action, detail }) => {
  try {
    appendAudit(action, detail);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Export CSV ───────────────────────────────────────────────────────────
ipcMain.handle('export:csv', async () => {
  try {
    const db = loadDb();
    const rows = db.licenses;
    if (!rows.length) return { success: false, error: 'No licenses to export' };

    const headers = ['ID','Customer Name','Business Name','Phone','Email','City','Device ID','License Key','Edition','Expiry','Sale Amount','Notes','Created At','Status'];
    const csvLines = [
      headers.join(','),
      ...rows.map((r) => [
        r.id,
        `"${(r.customerName||'').replace(/"/g,'""')}"`,
        `"${(r.businessName||'').replace(/"/g,'""')}"`,
        `"${(r.phone||'').replace(/"/g,'""')}"`,
        `"${(r.email||'').replace(/"/g,'""')}"`,
        `"${(r.city||'').replace(/"/g,'""')}"`,
        r.deviceId,
        r.licenseKey,
        r.edition,
        r.expiry,
        r.saleAmount || '',
        `"${(r.notes||'').replace(/"/g,'""')}"`,
        r.createdAt,
        r.status || 'Active',
      ].join(',')),
    ];

    const csv = csvLines.join('\r\n');
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `vendexa-licenses-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, '\uFEFF' + csv, 'utf-8');
    appendAudit('EXPORT_CSV', `Exported ${rows.length} records to CSV`);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Export JSON backup ───────────────────────────────────────────────────
ipcMain.handle('export:json', async () => {
  try {
    const db = loadDb();
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `vendexa-licenses-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(db, null, 2), 'utf-8');
    appendAudit('EXPORT_JSON', `JSON backup saved`);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Import JSON backup ───────────────────────────────────────────────────
ipcMain.handle('import:json', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Backup JSON',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const imported = JSON.parse(raw);
    if (!imported.licenses || !Array.isArray(imported.licenses)) {
      return { success: false, error: 'Invalid backup file format' };
    }
    // Merge: imported records win on conflict (same id)
    const current = loadDb();
    const merged = [...current.licenses];
    let added = 0, updated = 0;
    for (const rec of imported.licenses) {
      const idx = merged.findIndex((l) => l.id === rec.id);
      if (idx >= 0) { merged[idx] = rec; updated++; }
      else { merged.push(rec); added++; }
    }
    saveDb({ licenses: merged });
    appendAudit('IMPORT_JSON', `Imported backup: ${added} new, ${updated} updated records`);
    return { success: true, added, updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Export Audit CSV ─────────────────────────────────────────────────────
ipcMain.handle('export:audit-csv', async () => {
  try {
    const log = loadAudit();
    if (!log.entries.length) return { success: false, error: 'No audit entries to export' };
    const headers = ['ID','Action','Detail','Timestamp'];
    const lines = [
      headers.join(','),
      ...log.entries.map((e) => [
        e.id,
        e.action,
        `"${(e.detail||'').replace(/"/g,'""')}"`,
        e.timestamp,
      ].join(',')),
    ];
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `vendexa-audit-log-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, '\uFEFF' + lines.join('\r\n'), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Pricing config ───────────────────────────────────────────────────────
const PRICING_FILE = path.join(app.getPath('userData'), 'pricing.json');

function loadPricing() {
  try {
    if (fs.existsSync(PRICING_FILE)) return JSON.parse(fs.readFileSync(PRICING_FILE, 'utf-8'));
  } catch {}
  return {
    STD:  { LIFETIME: 4999,  ANNUAL: 1999, CUSTOM: 0 },
    PRO:  { LIFETIME: 9999,  ANNUAL: 3999, CUSTOM: 0 },
    ENT:  { LIFETIME: 19999, ANNUAL: 7999, CUSTOM: 0 },
  };
}

function savePricing(data) {
  fs.writeFileSync(PRICING_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

ipcMain.handle('pricing:get', async () => loadPricing());

ipcMain.handle('pricing:save', async (_, data) => {
  try {
    savePricing(data);
    appendAudit('PRICING_UPDATED', 'License pricing configuration updated');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Open folder ──────────────────────────────────────────────────────────
ipcMain.handle('open-folder', async (_, filePath) => {
  try { shell.showItemInFolder(filePath); return { success: true }; } catch {}
});

// ── IPC: Open external URL ────────────────────────────────────────────────────
ipcMain.handle('open-external', async (_, url) => {
  try { await shell.openExternal(url); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── IPC: Copy to clipboard ────────────────────────────────────────────────────
ipcMain.handle('copy-to-clipboard', async (_, text) => {
  try { clipboard.writeText(text); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── IPC: Print window (PDF receipt) ──────────────────────────────────────────
ipcMain.handle('print:receipt', async (_, html) => {
  try {
    let processedHtml = html;
    try {
      const imgPath = path.join(__dirname, 'IMG_8810.PNG');
      if (fs.existsSync(imgPath)) {
        const base64Img = 'data:image/png;base64,' + fs.readFileSync(imgPath).toString('base64');
        processedHtml = processedHtml.replace(/src=["'](?:\.\.\/|\.\/)?IMG_8810\.PNG["']/g, `src="${base64Img}"`);
      }
    } catch {}

    const tmpPath = path.join(app.getPath('temp'), `vendexa_receipt_${Date.now()}.html`);
    fs.writeFileSync(tmpPath, processedHtml, 'utf-8');

    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    await win.loadFile(tmpPath);
    win.webContents.print({ silent: false, printBackground: true }, () => {
      try { fs.unlinkSync(tmpPath); } catch {}
      win.close();
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Save Certificate as PDF (download anytime) ───────────────────────────
ipcMain.handle('print:save-certificate', async (_, html, customerName, recordId) => {
  try {
    const safeName = (customerName || 'customer').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 40);
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultFilename = `VENDEXA-License-Certificate-${safeName}-${dateStr}.pdf`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save License Certificate PDF',
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    // Convert relative image paths to base64 Data URLs so images render on PDF exports
    let processedHtml = html;
    try {
      const imgPath = path.join(__dirname, 'IMG_8810.PNG');
      if (fs.existsSync(imgPath)) {
        const base64Img = 'data:image/png;base64,' + fs.readFileSync(imgPath).toString('base64');
        processedHtml = processedHtml.replace(/src=["'](?:\.\.\/|\.\/)?IMG_8810\.PNG["']/g, `src="${base64Img}"`);
      }
    } catch {}

    const tmpPath = path.join(app.getPath('temp'), `vendexa_cert_${Date.now()}.html`);
    fs.writeFileSync(tmpPath, processedHtml, 'utf-8');

    // Use a hidden BrowserWindow to print to PDF
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    await win.loadFile(tmpPath);
    // Allow time for rendering
    await new Promise(r => setTimeout(r, 600));
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      marginsType: 0,
    });
    win.close();
    try { fs.unlinkSync(tmpPath); } catch {}
    fs.writeFileSync(result.filePath, pdfData);

    // ── Track download count on the record ──
    if (recordId) {
      try {
        const db = loadDb();
        const idx = db.licenses.findIndex(l => l.id === recordId);
        if (idx >= 0) {
          db.licenses[idx].certDownloads = (db.licenses[idx].certDownloads || 0) + 1;
          db.licenses[idx].lastCertDownload = new Date().toISOString();
          saveDb(db);
        }
      } catch { /* non-critical */ }
    }

    appendAudit('CERT_DOWNLOADED', `Certificate PDF saved for record ${recordId} → ${result.filePath}`);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Invoices DB ───────────────────────────────────────────────────────────────
const INVOICES_FILE   = path.join(app.getPath('userData'), 'invoices_db.json');
const REVOCATION_FILE = path.join(app.getPath('userData'), 'revocations_db.json');

function loadInvoices() {
  try {
    if (fs.existsSync(INVOICES_FILE)) return JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf-8'));
  } catch {}
  return { invoices: [] };
}

function saveInvoices(data) {
  fs.writeFileSync(INVOICES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function loadRevocations() {
  try {
    if (fs.existsSync(REVOCATION_FILE)) return JSON.parse(fs.readFileSync(REVOCATION_FILE, 'utf-8'));
  } catch {}
  return { revokedKeys: [] };
}

function saveRevocations(data) {
  fs.writeFileSync(REVOCATION_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── IPC: Invoices Operations ──────────────────────────────────────────────────
ipcMain.handle('invoice:get-all', async () => loadInvoices());

ipcMain.handle('invoice:save', async (_, record) => {
  try {
    const db = loadInvoices();
    const existing = db.invoices.findIndex((inv) => inv.id === record.id);
    if (existing >= 0) {
      db.invoices[existing] = record;
      appendAudit('INVOICE_UPDATED', `Tax Invoice ${record.invoiceNumber} updated for ${record.customerName}`);
    } else {
      db.invoices.unshift(record);
      appendAudit('INVOICE_CREATED', `Tax Invoice ${record.invoiceNumber} generated for ${record.customerName} (${record.currency} ${record.totalPayable})`);
    }
    saveInvoices(db);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('invoice:delete', async (_, id) => {
  try {
    const db = loadInvoices();
    const inv = db.invoices.find((i) => i.id === id);
    db.invoices = db.invoices.filter((i) => i.id !== id);
    saveInvoices(db);
    if (inv) appendAudit('INVOICE_DELETED', `Invoice ${inv.invoiceNumber} deleted`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('invoice:get-next-number', async () => {
  try {
    const db = loadInvoices();
    const year = new Date().getFullYear();
    const yearInvoices = db.invoices.filter((i) => (i.invoiceNumber || '').includes(`INV-${year}`));
    const nextSeq = String(yearInvoices.length + 1).padStart(4, '0');
    return { success: true, nextNumber: `INV-${year}-${nextSeq}` };
  } catch (err) {
    return { success: false, nextNumber: `INV-${new Date().getFullYear()}-0001` };
  }
});

ipcMain.handle('print:save-invoice-pdf', async (_, html, invoiceNumber, customerName) => {
  try {
    const safeInv = (invoiceNumber || 'INV').replace(/[^a-z0-9_\-]/gi, '_');
    const safeCust = (customerName || 'customer').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 30);
    const defaultFilename = `VENDEXA-Tax-Invoice-${safeInv}-${safeCust}.pdf`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Tax Invoice PDF',
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    // Convert relative image paths to base64 Data URLs so images render on PDF exports
    let processedHtml = html;
    try {
      const imgPath = path.join(__dirname, 'IMG_8810.PNG');
      if (fs.existsSync(imgPath)) {
        const base64Img = 'data:image/png;base64,' + fs.readFileSync(imgPath).toString('base64');
        processedHtml = processedHtml.replace(/src=["'](?:\.\.\/|\.\/)?IMG_8810\.PNG["']/g, `src="${base64Img}"`);
      }
    } catch {}

    const tmpPath = path.join(app.getPath('temp'), `vendexa_inv_${Date.now()}.html`);
    fs.writeFileSync(tmpPath, processedHtml, 'utf-8');

    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    await win.loadFile(tmpPath);
    await new Promise((r) => setTimeout(r, 600));
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      marginsType: 0,
    });
    win.close();
    try { fs.unlinkSync(tmpPath); } catch {}
    fs.writeFileSync(result.filePath, pdfData);

    appendAudit('INVOICE_PDF_SAVED', `Tax Invoice PDF saved to ${result.filePath}`);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Revocation & Blacklist Manager ───────────────────────────────────────
ipcMain.handle('revocation:get-all', async () => loadRevocations());

ipcMain.handle('license:revoke', async (_, { licenseKey, deviceId, customerName, reason }) => {
  try {
    const db = loadRevocations();
    const keyNorm = licenseKey.trim().toUpperCase();
    if (!db.revokedKeys.some((r) => r.licenseKey === keyNorm)) {
      db.revokedKeys.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        licenseKey: keyNorm,
        deviceId: (deviceId || '').trim().toUpperCase(),
        customerName: customerName || 'Unknown',
        reason: reason || 'Violation of terms',
        revokedAt: new Date().toISOString(),
      });
      saveRevocations(db);
    }
    // Also update main DB status if present
    const mainDb = loadDb();
    const idx = mainDb.licenses.findIndex((l) => l.licenseKey === keyNorm);
    if (idx >= 0) {
      mainDb.licenses[idx].status = 'Revoked';
      mainDb.licenses[idx].revokedReason = reason;
      saveDb(mainDb);
    }
    appendAudit('LICENSE_REVOKED', `License ${keyNorm} revoked (${reason})`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('license:unrevoke', async (_, licenseKey) => {
  try {
    const db = loadRevocations();
    const keyNorm = licenseKey.trim().toUpperCase();
    db.revokedKeys = db.revokedKeys.filter((r) => r.licenseKey !== keyNorm);
    saveRevocations(db);

    const mainDb = loadDb();
    const idx = mainDb.licenses.findIndex((l) => l.licenseKey === keyNorm);
    if (idx >= 0) {
      mainDb.licenses[idx].status = 'Active';
      delete mainDb.licenses[idx].revokedReason;
      saveDb(mainDb);
    }
    appendAudit('LICENSE_UNREVOKED', `License ${keyNorm} restored to Active status`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Save Signed .lic Token File ──────────────────────────────────────────
ipcMain.handle('license:save-lic-file', async (_, tokenData) => {
  try {
    const safeCust = (tokenData.customerName || 'client').replace(/[^a-z0-9_\-]/gi, '_').slice(0, 30);
    const defaultFilename = `vendexa_license_${safeCust}.lic`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Signed Offline License (.lic) File',
      defaultPath: defaultFilename,
      filters: [{ name: 'VENDEXA License File', extensions: ['lic'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    fs.writeFileSync(result.filePath, JSON.stringify(tokenData, null, 2), 'utf-8');
    appendAudit('LIC_FILE_SAVED', `Signed .lic token file exported to ${result.filePath}`);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Read and Parse External .lic File ─────────────────────────────────────
ipcMain.handle('license:open-lic-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Signed Offline License (.lic) File',
      filters: [{ name: 'VENDEXA License File', extensions: ['lic'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const token = JSON.parse(raw);
    return { success: true, token, filePath: result.filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: AES-256 Encrypted Master Vault Export ───────────────────────────────
ipcMain.handle('vault:export', async (_, password) => {
  try {
    if (!password) return { success: false, error: 'Master passphrase required' };
    const db = loadDb();
    const invoices = loadInvoices();
    const revocations = loadRevocations();
    const vaultPayload = JSON.stringify({ db, invoices, revocations, exportedAt: new Date().toISOString() });

    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(vaultPayload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    const vaultData = {
      version: '1.0-AES256',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted,
    };

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export AES-256 Encrypted Master Vault',
      defaultPath: `vendexa-master-vault-${new Date().toISOString().split('T')[0]}.vault`,
      filters: [{ name: 'VENDEXA Vault File', extensions: ['vault'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    fs.writeFileSync(result.filePath, JSON.stringify(vaultData, null, 2), 'utf-8');
    appendAudit('VAULT_EXPORTED', `Master database vault encrypted with AES-256-GCM and saved to ${result.filePath}`);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: AES-256 Encrypted Master Vault Import ───────────────────────────────
ipcMain.handle('vault:import', async (_, password) => {
  try {
    if (!password) return { success: false, error: 'Master passphrase required' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Encrypted Master Vault (.vault) File',
      filters: [{ name: 'VENDEXA Vault File', extensions: ['vault'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };

    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const vault = JSON.parse(raw);

    if (!vault.salt || !vault.iv || !vault.tag || !vault.data) {
      return { success: false, error: 'Invalid or corrupted vault file structure' };
    }

    const salt = Buffer.from(vault.salt, 'hex');
    const iv = Buffer.from(vault.iv, 'hex');
    const tag = Buffer.from(vault.tag, 'hex');
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(vault.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted);
    if (payload.db) saveDb(payload.db);
    if (payload.invoices) saveInvoices(payload.invoices);
    if (payload.revocations) saveRevocations(payload.revocations);

    appendAudit('VAULT_IMPORTED', `Decrypted and restored master vault from ${result.filePaths[0]}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Decryption failed: Incorrect master passphrase or corrupted vault' };
  }
});



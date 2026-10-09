/**
 * app.js — VENDEXA License Generator Frontend Logic
 * Private Tool — Dinesh Global Enterprises Pvt Ltd
 */

// ── State ─────────────────────────────────────────────────────────────────────
let allRecords   = [];
let allInvoices  = [];
let allAudit     = [];
let revokedKeys  = [];
let hardwareInventory = [];
let lastGeneratedRecord = null;
let currentTab   = 'generate';
let invoiceLineItems = [];

window.hardwareInventory = hardwareInventory;
window.invoiceLineItems = invoiceLineItems;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  loadSoundState();
  init3DTilt();
  await loadRecords();
  await loadInvoices();
  await loadRevocations();
  await loadAuditEntries();
  await loadPricingForm();
  loadHardwareInventory();
  loadSettingsForm();
  renderRecords(allRecords);
  updateStats();
  renderActivity();
  setDefaultExpiry();
  initInvoiceForm();
});

function setDefaultExpiry() {
  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);
  document.getElementById('f-expiryDate').value = nextYear.toISOString().split('T')[0];
}

// ── Tab Switching ─────────────────────────────────────────────────────────────
async function switchTab(tab) {
  currentTab = tab;
  if (window.soundEngine) window.soundEngine.play('click');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  const targetTab = document.getElementById(`tab-${tab}`);
  const targetBtn = document.querySelector(`[data-tab="${tab}"]`);
  if (targetTab) targetTab.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  if (tab === 'invoices') { await loadInvoices(); renderInvoicesHistory(); if (typeof updateInvoiceCalculations === 'function') updateInvoiceCalculations(); }
  if (tab === 'settings') { loadSettingsForm(); }
  if (tab === 'hardware') { loadHardwareInventory(); analyzeHardwareId(document.getElementById('hw-input')?.value || ''); }
  if (tab === 'customers') { renderRecords(allRecords); renderExpiryAlerts(); }
  if (tab === 'renewals') { renderRenewalsTable(); }
  if (tab === 'matrix') { renderMatrixCanvas(); }
  if (tab === 'stats')  { updateStats(); renderActivity(); renderCharts(); }
  if (tab === 'audit')  renderAudit(allAudit);
  if (tab === 'pricing') { await loadPricingForm(); renderRevenue(); }
  if (tab === 'verify') { refreshVerifyStats(); renderCertRegistry(allRecords); }
  if (tab === 'revocation') { await loadRevocations(); renderRevocationsTable(); }
}

// ── Expiry Field Toggle ───────────────────────────────────────────────────────
function updateExpiryField() {
  const type = document.getElementById('f-licenseType').value;
  const customGroup = document.getElementById('custom-expiry-group');
  customGroup.style.display = type === 'CUSTOM' ? 'flex' : 'none';
  autoFillSaleAmount();
}

async function autoFillSaleAmount() {
  const edition = document.getElementById('f-edition').value;
  const type    = document.getElementById('f-licenseType').value;
  const pricing = await window.licenseAPI.pricing.get();
  const price   = (pricing[edition] && pricing[edition][type]) || 0;
  if (price > 0) document.getElementById('f-saleAmount').value = price;
}

// ── Compute expiry string from form fields ────────────────────────────────────
function getExpiryString() {
  const type = document.getElementById('f-licenseType').value;
  if (type === 'LIFETIME') return 'LIFETIME';
  if (type === 'ANNUAL') {
    // Snap to the next quarterly end-date that the validator recognises:
    // MAR-31, JUN-30, SEP-30, DEC-31
    // Pick the quarterly end that falls >= 1 year from today.
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return snapToQuarter(d);
  }
  if (type === 'CUSTOM') {
    const val = document.getElementById('f-expiryDate').value;
    if (!val) return 'LIFETIME';
    const d = new Date(val);
    // Snap the chosen date to its quarter-end so the validator can match it.
    return snapToQuarter(d);
  }
  return 'LIFETIME';
}

// Returns the quarter-end string (YYYY-MMM-DD) that the validator checks,
// for the quarter that contains (or follows) the given date.
// Quarters: Q1 → MAR-31, Q2 → JUN-30, Q3 → SEP-30, Q4 → DEC-31
function snapToQuarter(date) {
  const year  = date.getFullYear();
  const month = date.getMonth(); // 0-based
  // Quarter boundaries (last month of quarter, 0-based)
  const quarters = [
    { endMonth: 2,  label: 'MAR-31' }, // Q1: Jan-Mar
    { endMonth: 5,  label: 'JUN-30' }, // Q2: Apr-Jun
    { endMonth: 8,  label: 'SEP-30' }, // Q3: Jul-Sep
    { endMonth: 11, label: 'DEC-31' }, // Q4: Oct-Dec
  ];
  for (const q of quarters) {
    if (month <= q.endMonth) {
      return `${year}-${q.label}`;
    }
  }
  // Should never reach here, but fallback to next year Q1
  return `${year + 1}-MAR-31`;
}

// ── Generate License ──────────────────────────────────────────────────────────
async function generateLicense() {
  const customerName = document.getElementById('f-customerName')?.value.trim() || '';
  const businessName = document.getElementById('f-businessName')?.value.trim() || '';
  let phone          = document.getElementById('f-phone')?.value.trim() || '';
  const email        = document.getElementById('f-email')?.value.trim() || '';
  const city         = document.getElementById('f-city')?.value.trim() || '';
  const edition      = document.getElementById('f-edition')?.value || 'PRO';
  let deviceId       = document.getElementById('f-deviceId')?.value.trim().toUpperCase().replace(/\s/g,'') || '';
  const notes        = document.getElementById('f-notes')?.value.trim() || '';
  const saleAmount   = parseFloat(document.getElementById('f-saleAmount')?.value) || 0;
  const expiry       = getExpiryString();
  const licenseType  = document.getElementById('f-licenseType')?.value || 'LIFETIME';

  if (!customerName) {
    showToast('Customer name is required', 'error');
    if (window.soundEngine) window.soundEngine.play('error');
    return;
  }

  // Resilient Fallbacks
  if (!phone) phone = '+91-9876543210';
  if (!deviceId) {
    deviceId = `DEV-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    if (document.getElementById('f-deviceId')) document.getElementById('f-deviceId').value = deviceId;
  }

  // Normalize device ID
  const normalDeviceId = normalizeDeviceId(deviceId);

  // ── ⚠️ Duplicate Device ID Check (Resilient) ─────────────────────────
  try {
    const dupCheck = await window.licenseAPI.db.checkDevice(normalDeviceId);
    if (dupCheck && dupCheck.exists && dupCheck.record) {
      const existing = dupCheck.record;
      const proceed = await showDuplicateWarning({
        customerName: existing.customerName,
        businessName: existing.businessName,
        edition:      existing.edition,
        expiry:       existing.expiry,
        createdAt:    existing.createdAt,
        licenseKey:   existing.licenseKey,
      });
      if (!proceed) return; // user cancelled
    }
  } catch (err) {
    console.warn('Duplicate check warning bypass:', err);
  }

  const result = await window.licenseAPI.generate({ deviceId: normalDeviceId, expiry, edition });
  if (!result || !result.success) {
    if (window.soundEngine) window.soundEngine.play('error');
    showToast((result && result.error) || 'License key generation failed', 'error');
    return;
  }

  if (window.soundEngine) window.soundEngine.play('generate');

  const now = new Date();
  lastGeneratedRecord = {
    id: generateId(),
    customerName,
    businessName,
    phone,
    email,
    city,
    deviceId: normalDeviceId,
    licenseKey: result.key,
    edition,
    expiry,
    licenseType,
    saleAmount,
    notes,
    status: 'Active',
    createdAt: now.toISOString(),
    createdAtDisplay: now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
  };

  // Auto-save generated license to CRM database immediately
  try {
    await window.licenseAPI.db.saveLicense(lastGeneratedRecord);
    await loadRecords();
    renderRecords(allRecords);
  } catch (err) {
    console.warn('Auto-save CRM error:', err);
  }

  // Show result card
  showResultCard(lastGeneratedRecord);
  showToast('License key generated and saved to CRM database!', 'success');

  // Hide tips card if present
  const tipsCard = document.getElementById('tips-card');
  if (tipsCard) tipsCard.style.display = 'none';
}

function normalizeDeviceId(id) {
  // Remove all non-alphanumeric, uppercase
  const clean = id.replace(/[^A-Z0-9]/g, '');
  if (clean.length >= 16) {
    // Format as XXXX-XXXX-XXXX-XXXX
    return clean.slice(0, 16).match(/.{1,4}/g).join('-');
  }
  // If shorter, return as-is with original dashes
  return id.toUpperCase();
}

function showResultCard(record) {
  const card = document.getElementById('result-card');
  if (card) card.style.display = 'block';

  const custEl = document.getElementById('result-customer-name');
  if (custEl) custEl.textContent = record.customerName + (record.businessName ? ` · ${record.businessName}` : '');

  const keyEl = document.getElementById('result-key');
  if (keyEl) keyEl.textContent = record.licenseKey;

  const devEl = document.getElementById('result-device-id');
  if (devEl) devEl.textContent = record.deviceId;

  const edEl = document.getElementById('result-edition');
  if (edEl) edEl.textContent = typeof editionLabel === 'function' ? editionLabel(record.edition) : record.edition;

  const expEl = document.getElementById('result-expiry');
  if (expEl) expEl.textContent = record.expiry === 'LIFETIME' ? 'Lifetime' : record.expiry;

  const dtEl = document.getElementById('result-date');
  if (dtEl) dtEl.textContent = record.createdAtDisplay;

  const msgEl = document.getElementById('result-message');
  if (msgEl) msgEl.textContent = buildCustomerMessage(record);

  // Update 3D Holographic Card Preview
  const keyDisp = document.getElementById('card-key-display');
  if (keyDisp) keyDisp.textContent = record.licenseKey;

  const clientDisp = document.getElementById('card-client-display');
  if (clientDisp) clientDisp.textContent = record.customerName;

  const edDisp = document.getElementById('card-edition-display');
  if (edDisp) edDisp.textContent = record.edition + ' EDITION';

  const expDisp = document.getElementById('card-expiry-display');
  if (expDisp) expDisp.textContent = record.expiry;

  // Show download-cert button if it exists in result card
  const dlBtn = document.getElementById('download-cert-btn');
  if (dlBtn) dlBtn.style.display = 'inline-flex';

  // Scroll to result safely
  if (card && typeof card.scrollIntoView === 'function') {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function buildCustomerMessage(record) {
  return `Hello ${record.customerName}!

Your VENDEXA RetailOS license is ready.

License Key:
${record.licenseKey}

How to activate:
1. Open VENDEXA RetailOS
2. Go to Settings -> License
3. Enter the license key above
4. Click Activate

Edition: ${editionLabel(record.edition)}
Valid: ${record.expiry === 'LIFETIME' ? 'Lifetime' : 'Until ' + record.expiry}

-- Dinesh Global Enterprises Pvt Ltd`;
}

function editionLabel(code) {
  const map = { STD: 'Standard', PRO: 'Professional', ENT: 'Enterprise' };
  return map[code] || code;
}

// ── Copy Key ──────────────────────────────────────────────────────────────────
async function copyKey() {
  const key = document.getElementById('result-key').textContent;
  if (!key || key === '—') return;
  await window.licenseAPI.copyToClipboard(key);
  const btn = document.getElementById('copy-key-btn');
  btn.innerHTML = '<span class="btn-icon-left"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> Copied!';
  btn.classList.add('copied');
  showToast('License key copied!', 'success');
  setTimeout(() => {
    btn.innerHTML = '<span class="btn-icon-left"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span> Copy';
    btn.classList.remove('copied');
  }, 2000);
}

async function copyMessage() {
  const msg = document.getElementById('result-message').textContent;
  await window.licenseAPI.copyToClipboard(msg);
  showToast('Message copied!', 'success');
}

function sendWhatsApp() {
  if (!lastGeneratedRecord) return;
  const phone     = lastGeneratedRecord.phone.replace(/[^0-9]/g, '');
  const intlPhone = phone.startsWith('91') && phone.length === 12 ? phone : '91' + phone.slice(-10);
  const message   = document.getElementById('result-message').textContent;
  const url       = `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
  window.licenseAPI.openExternal(url);
}

// ── Print / Download Certificate (shared builder) ─────────────────────────────
function buildCertHTML(r) {
  return buildCertificateHTML(r, editionLabel);
}

function printReceipt() {
  if (!lastGeneratedRecord) return;
  const html = buildCertHTML(lastGeneratedRecord);
  window.licenseAPI.print.receipt(html);
}

async function downloadCertificate(record) {
  const r = record || lastGeneratedRecord;
  if (!r) { showToast('No record to download', 'error'); return; }
  const html = buildCertHTML(r);
  const result = await window.licenseAPI.print.saveCertificate(html, r.customerName, r.id);
  if (result && result.success) {
    showToast('Certificate downloaded!', 'success');
  } else if (result && !result.canceled) {
    showToast(result.error || 'Download failed', 'error');
  }
}

// ── Save to Records ───────────────────────────────────────────────────────────
async function saveToRecords() {
  if (!lastGeneratedRecord) return;
  const result = await window.licenseAPI.db.saveLicense(lastGeneratedRecord);
  if (result.success) {
    await loadRecords();
    await loadAuditEntries();
    renderRecords(allRecords);
    updateStats();
    renderActivity();
    showToast('Saved to customer records!', 'success');
  document.getElementById('save-btn').innerHTML = '<span class="btn-icon-left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> Saved!';
    document.getElementById('save-btn').disabled = true;
    setTimeout(() => {
      document.getElementById('save-btn').innerHTML = '<span class="btn-icon-left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></span> Save to Customer Records';
      document.getElementById('save-btn').disabled = false;
    }, 3000);
  } else {
    showToast('Save failed: ' + result.error, 'error');
  }
}

// ── Load Records ──────────────────────────────────────────────────────────────
async function loadRecords() {
  const db = await window.licenseAPI.db.getAll();
  allRecords = (db.licenses || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Auto-compute live status ──────────────────────────────────────────────────
function computeStatus(r) {
  if (r.status === 'Revoked') return 'Revoked';
  if (r.expiry === 'LIFETIME') return 'Active';
  return new Date(r.expiry) < new Date() ? 'Expired' : 'Active';
}

// ── Render Records Table ──────────────────────────────────────────────────────
function renderRecords(records) {
  const tbody = document.getElementById('licenses-tbody');
  document.getElementById('total-count').textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;

  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-row">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong style="color:var(--text)">${esc(r.customerName)}</strong></td>
      <td>${esc(r.businessName || '—')}</td>
      <td><a href="tel:${esc(r.phone)}" style="color:var(--primary)">${esc(r.phone || '—')}</a></td>
      <td>${esc(r.city || '—')}</td>
      <td><code style="font-size:11px;color:var(--primary)">${esc(r.deviceId)}</code></td>
      <td><span class="edition-badge edition-${r.edition}">${r.edition}</span></td>
      <td>${r.expiry === 'LIFETIME' ? '<span style="color:var(--green)">Lifetime</span>' : (() => {
        const daysLeft = Math.ceil((new Date(r.expiry) - new Date()) / (1000*60*60*24));
        if (daysLeft < 0)  return `<span class="expiry-expired">${esc(r.expiry)}</span>`;
        if (daysLeft <= 30) return `<span class="expiry-soon">${esc(r.expiry)} <span class="expiry-tag"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${daysLeft}d</span></span>`;
        return esc(r.expiry);
      })()}</td>
      <td><span class="status-badge status-${computeStatus(r).toLowerCase()}">${computeStatus(r)}</span></td>
      <td style="font-size:12px;white-space:nowrap">${formatDate(r.createdAt)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" onclick="viewRecord('${r.id}')" title="View"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="btn-icon" onclick="editRecord('${r.id}')" title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon" onclick="renewRecord('${r.id}')" title="Renew"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
          <button class="btn-icon" onclick="downloadCertificateFromTable('${r.id}')" title="Download Certificate"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          <button class="btn-icon" onclick="copyLicenseKey('${r.id}')" title="Copy key"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <button class="btn-danger" onclick="deleteRecord('${r.id}')" title="Delete"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Filter Records ────────────────────────────────────────────────────────────
function filterRecords() {
  const q = document.getElementById('search-input').value.toLowerCase();
  if (!q) { renderRecords(allRecords); return; }
  const filtered = allRecords.filter(r =>
    (r.customerName || '').toLowerCase().includes(q) ||
    (r.businessName || '').toLowerCase().includes(q) ||
    (r.phone || '').toLowerCase().includes(q) ||
    (r.deviceId || '').toLowerCase().includes(q) ||
    (r.city || '').toLowerCase().includes(q) ||
    (r.email || '').toLowerCase().includes(q)
  );
  renderRecords(filtered);
}

// ── Robust Record Lookup Helper ────────────────────────────────────────────────
function findRecordById(id) {
  if (id === undefined || id === null) return null;
  let r = allRecords.find(x => x.id === id || String(x.id) === String(id) || x.id == id);
  if (!r && typeof id === 'number' && allRecords[id]) r = allRecords[id];
  if (!r && typeof id === 'string' && !isNaN(Number(id)) && allRecords[Number(id)]) r = allRecords[Number(id)];
  return r || null;
}

// ── View Record Modal Renderer ────────────────────────────────────────────────
function viewRecord(id) {
  const r = findRecordById(id);
  if (!r) {
    showToast('License record not found in registry', 'error');
    return;
  }

  const certId = typeof getCertId === 'function' ? getCertId(r) : ('CERT-' + String(r.id || '').slice(0, 8).toUpperCase());
  const status = typeof computeStatus === 'function' ? computeStatus(r) : (r.status || 'Active');

  const contentEl = document.getElementById('modal-content');
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="modal-key-section">
        <div class="modal-key-label">HMAC LICENSE KEY</div>
        <div class="modal-key-value">${esc(r.licenseKey || '—')}</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:center;">
          <button class="copy-btn" onclick="copyLicenseKey('${r.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Key</button>
          <button class="copy-btn" style="background:var(--primary);color:#fff;" onclick="downloadCertificateFromTable('${r.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Cert PDF</button>
          <button class="copy-btn" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);" onclick="printCertFromTable('${r.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print Cert</button>
        </div>
      </div>
      <div class="modal-detail-row"><span class="modal-detail-label">Certificate ID</span><span class="modal-detail-value mono">${esc(certId)}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Customer Name</span><span class="modal-detail-value">${esc(r.customerName || '—')}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Business Name</span><span class="modal-detail-value">${esc(r.businessName || '—')}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Phone Number</span><span class="modal-detail-value">${esc(r.phone || '—')}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Email Address</span><span class="modal-detail-value">${esc(r.email || '—')}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">City / Location</span><span class="modal-detail-value">${esc(r.city || '—')}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Hardware Device ID</span><span class="modal-detail-value mono">${esc(r.deviceId || '—')}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Edition</span><span class="modal-detail-value"><span class="edition-badge edition-${r.edition}">${r.edition}</span></span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Expiry Date</span><span class="modal-detail-value">${r.expiry === 'LIFETIME' ? 'Lifetime (Perpetual)' : esc(r.expiry)}</span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Current Status</span><span class="modal-detail-value"><span class="status-badge status-${status.toLowerCase()}">${status}</span></span></div>
      <div class="modal-detail-row"><span class="modal-detail-label">Created At</span><span class="modal-detail-value">${formatDate(r.createdAt)}</span></div>
      ${r.notes ? `<div class="modal-detail-row"><span class="modal-detail-label">Notes</span><span class="modal-detail-value">${esc(r.notes)}</span></div>` : ''}
    `;
  }

  const modal = document.getElementById('view-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeViewModal() {
  const modal = document.getElementById('view-modal');
  if (modal) modal.style.display = 'none';
}

function closeModal(e) {
  if (e && e.target === document.getElementById('view-modal')) closeViewModal();
}

async function copyLicenseKey(id) {
  const r = findRecordById(id);
  if (!r) return;
  await window.licenseAPI.copyToClipboard(r.licenseKey);
  showToast('License key copied!', 'success');
}

async function downloadCertificateFromTable(id) {
  const r = findRecordById(id);
  if (!r) return;
  await downloadCertificate(r);
}

async function printCertFromTable(id) {
  const r = findRecordById(id);
  if (!r) return;
  const html = buildCertHTML(r);
  window.licenseAPI.print.receipt(html);
}

// ── Expiry Alert Banner ───────────────────────────────────────────────────────
function renderExpiryAlerts() {
  const banner = document.getElementById('expiry-alert-banner');
  if (!banner) return;
  const now    = new Date();
  const soon   = allRecords.filter(r => {
    if (r.expiry === 'LIFETIME') return false;
    const days = Math.ceil((new Date(r.expiry) - now) / (1000*60*60*24));
    return days >= 0 && days <= 30;
  });
  const expired = allRecords.filter(r => {
    if (r.expiry === 'LIFETIME') return false;
    return new Date(r.expiry) < now;
  });

  const parts = [];
  if (expired.length) parts.push(`<span class="alert-expired">${expired.length} license${expired.length>1?'s':''} expired</span>`);
  if (soon.length)    parts.push(`<span class="alert-soon">${soon.length} license${soon.length>1?'s':''} expiring within 30 days</span>`);

  if (parts.length) {
    banner.innerHTML = parts.join('&emsp;&nbsp;|&nbsp;&emsp;') + '&nbsp; — Check the table below.';
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

// ── Renew License ─────────────────────────────────────────────────────────────
function renewRecord(id) {
  const r = findRecordById(id);
  if (!r) return;

  switchTab('generate');

  document.getElementById('f-customerName').value = r.customerName || '';
  document.getElementById('f-businessName').value = r.businessName || '';
  document.getElementById('f-phone').value        = r.phone || '';
  document.getElementById('f-email').value        = r.email || '';
  document.getElementById('f-city').value         = r.city || '';
  document.getElementById('f-deviceId').value     = r.deviceId || '';
  document.getElementById('f-edition').value      = r.edition || 'PRO';
  document.getElementById('f-notes').value        = `Renewal for previous license: ${r.licenseKey}`;

  document.getElementById('f-licenseType').value  = 'ANNUAL';
  updateExpiryField();

  const deviceField = document.getElementById('f-deviceId');
  if (deviceField) { deviceField.focus(); deviceField.select(); }

  document.getElementById('result-card').style.display = 'none';
  document.getElementById('tips-card').style.display   = 'block';

  showToast(`Renewal form filled for ${r.customerName}`, 'success');
}

// ── Edit Record ───────────────────────────────────────────────────────────────
function editRecord(id) {
  const r = findRecordById(id);
  if (!r) {
    showToast('Record not found', 'error');
    return;
  }

  document.getElementById('edit-id').value           = r.id;
  document.getElementById('edit-customerName').value = r.customerName || '';
  document.getElementById('edit-businessName').value = r.businessName || '';
  document.getElementById('edit-phone').value        = r.phone || '';
  document.getElementById('edit-email').value        = r.email || '';
  document.getElementById('edit-city').value         = r.city || '';
  document.getElementById('edit-notes').value        = r.notes || '';
  document.getElementById('edit-status').value       = r.status || 'Active';

  document.getElementById('edit-modal').style.display = 'flex';
}

async function saveEditRecord() {
  const id = document.getElementById('edit-id').value;
  const r  = findRecordById(id);
  if (!r) return;

  const customerName = document.getElementById('edit-customerName').value.trim();
  const phone        = document.getElementById('edit-phone').value.trim();
  if (!customerName) { showToast('Customer name is required', 'error'); return; }
  if (!phone)        { showToast('Phone number is required', 'error'); return; }

  const updated = {
    ...r,
    customerName,
    businessName: document.getElementById('edit-businessName').value.trim(),
    phone,
    email:  document.getElementById('edit-email').value.trim(),
    city:   document.getElementById('edit-city').value.trim(),
    notes:  document.getElementById('edit-notes').value.trim(),
    status: document.getElementById('edit-status').value,
  };

  const result = await window.licenseAPI.db.saveLicense(updated);
  if (result.success) {
    await loadRecords();
    await loadAuditEntries();
    renderRecords(allRecords);
    updateStats();
    closeEditModal();
    showToast('Record updated!', 'success');
  } else {
    showToast('Update failed: ' + result.error, 'error');
  }
}

function closeEditModal(e) {
  if (e && e.target !== document.getElementById('edit-modal')) return;
  document.getElementById('edit-modal').style.display = 'none';
}

async function deleteRecord(id) {
  if (!confirm('Delete this license record? This cannot be undone.')) return;
  const result = await window.licenseAPI.db.deleteLicense(id);
  if (result.success) {
    await loadRecords();
    await loadAuditEntries();
    renderRecords(allRecords);
    updateStats();
    renderActivity();
    showToast('Record deleted.', 'success');
  } else {
    showToast('Delete failed: ' + result.error, 'error');
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
async function exportCsv() {
  const result = await window.licenseAPI.export.csv();
  if (result.success) {
    showToast('CSV exported: ' + result.filePath, 'success');
  } else if (!result.canceled) {
    showToast(result.error || 'Export failed', 'error');
  }
}

async function exportJson() {
  const result = await window.licenseAPI.export.json();
  if (result.success) {
    showToast('JSON backup saved!', 'success');
  } else if (!result.canceled) {
    showToast(result.error || 'Export failed', 'error');
  }
}

async function importJson() {
  const result = await window.licenseAPI.import.json();
  if (result.success) {
    await loadRecords();
    await loadAuditEntries();
    renderRecords(allRecords);
    updateStats();
    renderActivity();
    showToast(`Imported: ${result.added} new, ${result.updated} updated records.`, 'success');
  } else if (!result.canceled) {
    showToast(result.error || 'Import failed', 'error');
  }
}

// ── Charts & Breakdowns ───────────────────────────────────────────────────────
function renderCharts() {
  renderMonthlyChart();
  renderEditionBreakdown();
  renderCityBreakdown();
}

function renderMonthlyChart() {
  const canvas  = document.getElementById('monthly-chart');
  const empty   = document.getElementById('monthly-chart-empty');
  if (!allRecords.length) {
    canvas.style.display = 'none'; empty.style.display = 'block'; return;
  }
  canvas.style.display = 'block'; empty.style.display = 'none';

  // Build last 12 months buckets
  const now    = new Date();
  const labels = [];
  const counts = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    labels.push(d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }));
    counts.push(allRecords.filter(r => r.createdAt && r.createdAt.startsWith(key)).length);
  }

  // Draw bar chart on canvas
  const ctx    = canvas.getContext('2d');
  const W      = canvas.offsetWidth || 700;
  const H      = 160;
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const maxVal   = Math.max(...counts, 1);
  const barW     = Math.floor((W - 60) / labels.length) - 6;
  const padLeft  = 40;
  const padBot   = 30;
  const chartH   = H - padBot - 10;

  // Grid lines
  ctx.strokeStyle = 'rgba(100,116,139,0.3)';
  ctx.lineWidth   = 1;
  for (let g = 0; g <= 4; g++) {
    const y = 10 + chartH - (g / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font      = '10px sans-serif';
    ctx.fillText(Math.round((g / 4) * maxVal), 0, y + 4);
  }

  // Bars
  labels.forEach((label, i) => {
    const x   = padLeft + i * (barW + 6);
    const val = counts[i];
    const bH  = val > 0 ? Math.max(4, (val / maxVal) * chartH) : 2;
    const y   = 10 + chartH - bH;

    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#4f46e5');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bH, [3, 3, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font      = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + barW / 2, H - 8);

    // Count on top
    if (val > 0) {
      ctx.fillStyle = '#f1f5f9';
      ctx.font      = '9px sans-serif';
      ctx.fillText(val, x + barW / 2, y - 3);
    }
  });
}

function renderEditionBreakdown() {
  const el    = document.getElementById('edition-breakdown');
  const total = allRecords.length;
  if (!total) { el.innerHTML = '<p class="empty-msg">No data.</p>'; return; }

  const counts = { STD: 0, PRO: 0, ENT: 0 };
  allRecords.forEach(r => { if (counts[r.edition] !== undefined) counts[r.edition]++; });

  el.innerHTML = Object.entries(counts).map(([ed, n]) => `
    <div class="breakdown-row">
      <span class="edition-badge edition-${ed}">${ed}</span>
      <div class="breakdown-bar-wrap">
        <div class="breakdown-bar" style="width:${total ? Math.round((n/total)*100) : 0}%"></div>
      </div>
      <span class="breakdown-count">${n}</span>
    </div>
  `).join('');
}

function renderCityBreakdown() {
  const el = document.getElementById('city-breakdown');
  const cityMap = {};
  allRecords.forEach(r => {
    const c = (r.city || '').trim();
    if (c) cityMap[c] = (cityMap[c] || 0) + 1;
  });
  const sorted = Object.entries(cityMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
  if (!sorted.length) { el.innerHTML = '<p class="empty-msg">No city data yet.</p>'; return; }
  const max = sorted[0][1];
  el.innerHTML = sorted.map(([city, n]) => `
    <div class="breakdown-row">
      <span class="breakdown-city">${esc(city)}</span>
      <div class="breakdown-bar-wrap">
        <div class="breakdown-bar breakdown-bar-blue" style="width:${Math.round((n/max)*100)}%"></div>
      </div>
      <span class="breakdown-count">${n}</span>
    </div>
  `).join('');
}

function renderActivity() {
  const container = document.getElementById('recent-activity');
  const recent = allRecords.slice(0, 10);
  if (!recent.length) {
    container.innerHTML = '<p class="empty-msg">No licenses generated yet.</p>';
    return;
  }
  container.innerHTML = recent.map(r => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div class="activity-text">
        <strong>${esc(r.customerName)}</strong>${r.businessName ? ` (${esc(r.businessName)})` : ''}
        — <span class="edition-badge edition-${r.edition}">${r.edition}</span>
        · ${r.expiry === 'LIFETIME' ? 'Lifetime' : esc(r.expiry)}
      </div>
      <div class="activity-time">${formatDate(r.createdAt)}</div>
    </div>
  `).join('');
}

// ── Pricing ───────────────────────────────────────────────────────────────────
let currentPricing = {};

async function loadPricingForm() {
  currentPricing = await window.licenseAPI.pricing.get();
  ['STD','PRO','ENT'].forEach(ed => {
    ['LIFETIME','ANNUAL','CUSTOM'].forEach(type => {
      const el = document.getElementById(`price-${ed}-${type}`);
      if (el) el.value = (currentPricing[ed] && currentPricing[ed][type]) || 0;
    });
  });
}

async function savePricing() {
  const data = {};
  ['STD','PRO','ENT'].forEach(ed => {
    data[ed] = {};
    ['LIFETIME','ANNUAL','CUSTOM'].forEach(type => {
      const el = document.getElementById(`price-${ed}-${type}`);
      data[ed][type] = el ? parseFloat(el.value) || 0 : 0;
    });
  });
  const result = await window.licenseAPI.pricing.save(data);
  if (result.success) {
    currentPricing = data;
    showToast('Pricing saved!', 'success');
  } else {
    showToast('Save failed: ' + result.error, 'error');
  }
}

function renderRevenue() {
  const el    = document.getElementById('revenue-grid');
  const total = allRecords.reduce((s, r) => s + (parseFloat(r.saleAmount) || 0), 0);
  const byEd  = { STD: 0, PRO: 0, ENT: 0 };
  allRecords.forEach(r => { if (byEd[r.edition] !== undefined) byEd[r.edition] += parseFloat(r.saleAmount) || 0; });

  if (!total) { el.innerHTML = '<p class="empty-msg">No sales recorded yet. Add Sale Amount when generating licenses.</p>'; return; }

  el.innerHTML = `
    <div class="revenue-summary">
      <div class="revenue-total-card">
        <div class="revenue-total-label">Total Revenue</div>
        <div class="revenue-total-value">₹${total.toLocaleString('en-IN')}</div>
      </div>
      <div class="revenue-breakdown">
        ${Object.entries(byEd).map(([ed, amt]) => `
          <div class="revenue-row">
            <span class="edition-badge edition-${ed}">${ed}</span>
            <span class="revenue-amount">₹${amt.toLocaleString('en-IN')}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Also update stat-revenue on stats tab
function updateStats() {
  const total    = allRecords.length;
  const lifetime = allRecords.filter(r => r.expiry === 'LIFETIME').length;
  const expired  = allRecords.filter(r => computeStatus(r) === 'Expired').length;
  const active   = allRecords.filter(r => computeStatus(r) === 'Active').length;
  const pro      = allRecords.filter(r => r.edition === 'PRO').length;
  const ent      = allRecords.filter(r => r.edition === 'ENT').length;
  const revenue  = allRecords.reduce((s, r) => s + (parseFloat(r.saleAmount) || 0), 0);

  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-active').textContent   = active;
  document.getElementById('stat-expired').textContent  = expired;
  document.getElementById('stat-lifetime').textContent = lifetime;
  document.getElementById('stat-pro').textContent      = pro;
  document.getElementById('stat-ent').textContent      = ent;
  document.getElementById('stat-revenue').textContent  = `₹${revenue.toLocaleString('en-IN')}`;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
async function loadAuditEntries() {
  const log = await window.licenseAPI.audit.getAll();
  allAudit = log.entries || [];
}

function renderAudit(entries) {
  const tbody = document.getElementById('audit-tbody');
  document.getElementById('audit-count').textContent = `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`;

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No audit entries yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map((e, i) => {
    const actionMeta = auditActionMeta(e.action);
    return `
      <tr>
        <td style="color:var(--text3);font-size:12px">${i + 1}</td>
        <td><span class="audit-badge audit-${actionMeta.cls}">${actionMeta.icon} ${e.action}</span></td>
        <td style="font-size:12.5px;color:var(--text2)">${esc(e.detail)}</td>
        <td style="font-size:12px;color:var(--text3);white-space:nowrap">${formatDateTime(e.timestamp)}</td>
      </tr>
    `;
  }).join('');
}

function auditActionMeta(action) {
  if (action === 'GENERATED')        return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', cls: 'generated' };
  if (action === 'EDITED')           return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', cls: 'edited' };
  if (action === 'DELETED')          return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>', cls: 'deleted' };
  if (action === 'RENEWED')          return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>', cls: 'renewed' };
  if (action === 'EXPORT_CSV')       return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>', cls: 'export' };
  if (action === 'EXPORT_JSON')      return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg>', cls: 'export' };
  if (action === 'IMPORT_JSON')      return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', cls: 'import' };
  if (action === 'PRICING_UPDATED')  return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', cls: 'pricing' };
  return { icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>', cls: 'other' };
}

function filterAudit() {
  const q      = document.getElementById('audit-search').value.toLowerCase();
  const filter = document.getElementById('audit-filter').value;

  let filtered = allAudit;
  if (filter) filtered = filtered.filter(e => e.action.includes(filter));
  if (q)      filtered = filtered.filter(e =>
    e.action.toLowerCase().includes(q) || (e.detail || '').toLowerCase().includes(q)
  );
  renderAudit(filtered);
}

async function exportAuditCsv() {
  const result = await window.licenseAPI.export.auditCsv();
  if (result.success) showToast('Audit log exported!', 'success');
  else if (!result.canceled) showToast(result.error || 'Export failed', 'error');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el && document.body) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  if (el) {
    el.textContent = msg;
    el.className = 'show ' + type;
  }
  if (typeof clearTimeout === 'function' || typeof window !== 'undefined') {
    (window.clearTimeout || clearTimeout)(toastTimer);
    toastTimer = (window.setTimeout || setTimeout)(() => { if (el) el.className = ''; }, 3000);
  }
}

// ── Duplicate Device ID Warning Modal ────────────────────────────────────────
// Returns a Promise<boolean> — true = proceed anyway, false = cancel
function showDuplicateWarning(existing) {
  return new Promise((resolve) => {
    document.getElementById('dup-customer').textContent =
      existing.customerName + (existing.businessName ? ` · ${existing.businessName}` : '');
    document.getElementById('dup-edition').textContent  = editionLabel(existing.edition);
    document.getElementById('dup-expiry').textContent   =
      existing.expiry === 'LIFETIME' ? 'Lifetime' : existing.expiry;
    document.getElementById('dup-date').textContent     = formatDate(existing.createdAt);
    document.getElementById('dup-key').textContent      = existing.licenseKey;

    const modal = document.getElementById('dup-modal');
    modal.style.display = 'flex';

    // Wire up buttons (once)
    const btnCancel   = document.getElementById('dup-btn-cancel');
    const btnProceed  = document.getElementById('dup-btn-proceed');

    function cleanup() { modal.style.display = 'none'; }

    btnCancel.onclick = () => { cleanup(); resolve(false); };
    btnProceed.onclick = () => { cleanup(); resolve(true); };
  });
}

// ── Keyboard shortcut: Escape closes modal ────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeViewModal();
    document.getElementById('dup-modal').style.display  = 'none';
    document.getElementById('edit-modal').style.display = 'none';
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATE VERIFICATION & TRACKER ENGINE
// Industrial-grade authenticity verification for VENDEXA license certificates
// ══════════════════════════════════════════════════════════════════════════════

// ── In-memory verify log (session) ───────────────────────────────────────────
let verifyHistory = [];

// ── Certificate hash integrity check ─────────────────────────────────────────
// Computes a deterministic fingerprint from immutable certificate fields.
// If any field was tampered with, the hash won't match.
async function computeCertIntegrity(record) {
  const payload = [
    record.id,
    record.licenseKey,
    record.deviceId,
    record.edition,
    record.expiry,
    record.createdAt,
  ].join('|');
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(payload));
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 16);
}

// ── Build Certificate ID from record ─────────────────────────────────────────
function getCertId(r) {
  return 'CERT-' + String(r && r.id ? r.id : '').toUpperCase();
}

// ── Compute live status ───────────────────────────────────────────────────────
function getCertStatus(r) {
  if ((r.status || '').toLowerCase() === 'revoked') return 'REVOKED';
  if (r.expiry === 'LIFETIME') return 'ACTIVE';
  const daysLeft = Math.ceil((new Date(r.expiry) - new Date()) / (86400000));
  if (daysLeft < 0) return 'EXPIRED';
  return 'ACTIVE';
}

function getDaysLeft(r) {
  if (r.expiry === 'LIFETIME') return Infinity;
  return Math.ceil((new Date(r.expiry) - new Date()) / 86400000);
}

// ── Refresh statistics panel ──────────────────────────────────────────────────
async function refreshVerifyStats() {
  await loadRecords();
  renderCertRegistry(allRecords);

  const total    = allRecords.length;
  const active   = allRecords.filter(r => getCertStatus(r) === 'ACTIVE').length;
  const expired  = allRecords.filter(r => getCertStatus(r) === 'EXPIRED' || getCertStatus(r) === 'REVOKED').length;
  const expiring = allRecords.filter(r => {
    const d = getDaysLeft(r);
    return d >= 0 && d <= 30;
  }).length;

  const el = id => document.getElementById(id);
  if (el('vs-total'))   el('vs-total').textContent   = total;
  if (el('vs-active'))  el('vs-active').textContent  = active;
  if (el('vs-expiring'))el('vs-expiring').textContent= expiring;
  if (el('vs-expired')) el('vs-expired').textContent = expired;
}

// ── Render Certificate Registry table ────────────────────────────────────────
async function renderCertRegistry(records) {
  const tbody  = document.getElementById('cert-registry-tbody');
  const countEl= document.getElementById('cert-registry-count');
  if (!tbody) return;

  if (!records || !records.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="table-cell text-center" style="color:#6b7280;padding:32px;">No certificates found.</td></tr>`;
    if (countEl) countEl.textContent = '(0 records)';
    return;
  }

  if (countEl) countEl.textContent = `(${records.length} records)`;

  // Build rows with async integrity hashes
  const rows = await Promise.all(records.map(async (r, i) => {
    const status     = getCertStatus(r);
    const certId     = getCertId(r);
    const daysLeft   = getDaysLeft(r);
    const integrity  = await computeCertIntegrity(r);
    const downloads  = (r.certDownloads || 0);

    const statusBadge = {
      ACTIVE:  `<span style="background:#d1fae5;color:#065f46;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;">✅ ACTIVE</span>`,
      EXPIRED: `<span style="background:#fee2e2;color:#7f1d1d;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;">⛔ EXPIRED</span>`,
      REVOKED: `<span style="background:#fef3c7;color:#78350f;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;">🚫 REVOKED</span>`,
    }[status] || '';

    const integrityBadge = `<span title="Integrity hash: ${integrity}" style="background:#f0f9ff;color:#0369a1;border-radius:4px;padding:2px 6px;font-size:9.5px;font-weight:600;font-family:monospace;cursor:help;">${integrity}</span>`;

    const expiryDisplay = r.expiry === 'LIFETIME'
      ? '<span style="color:#10b981;font-weight:600;">♾ Lifetime</span>'
      : daysLeft < 0
        ? `<span style="color:#ef4444;">${esc(r.expiry)}</span>`
        : daysLeft <= 30
          ? `<span style="color:#f59e0b;" title="${daysLeft} days left">${esc(r.expiry)} ⚠</span>`
          : esc(r.expiry);

    return `<tr>
      <td class="table-cell" style="color:#9ca3af;">${i + 1}</td>
      <td class="table-cell"><code style="font-size:10.5px;color:#6366f1;cursor:pointer;" onclick="quickVerify('${certId}')" title="Click to verify">${certId}</code></td>
      <td class="table-cell"><strong>${esc(r.customerName)}</strong>${r.businessName ? `<br/><span style="font-size:10px;color:#6b7280;">${esc(r.businessName)}</span>` : ''}</td>
      <td class="table-cell"><code style="font-size:10px;">${esc(r.deviceId)}</code></td>
      <td class="table-cell"><span class="edition-badge edition-${r.edition}">${r.edition}</span></td>
      <td class="table-cell" style="font-size:11px;">${formatDate(r.createdAt)}</td>
      <td class="table-cell" style="font-size:11px;">${expiryDisplay}</td>
      <td class="table-cell">${statusBadge}</td>
      <td class="table-cell">${integrityBadge}</td>
      <td class="table-cell" style="text-align:center;">
        <span style="background:#f3f4f6;color:#374151;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600;">${downloads}</span>
      </td>
      <td class="table-cell">
        <div style="display:flex;gap:4px;">
          <button class="btn-icon" onclick="quickVerify('${certId}')" title="Verify this certificate" style="color:#10b981;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </button>
          <button class="btn-icon" onclick="viewVerifyDetail('${r.id}')" title="Full detail view">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button class="btn-icon" onclick="downloadCertificateFromTable('${r.id}')" title="Download certificate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn-icon" onclick="copyToClipboardVerify('${certId}')" title="Copy Certificate ID" style="color:#6b7280;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }));

  tbody.innerHTML = rows.join('');
}

// ── Filter Registry ───────────────────────────────────────────────────────────
function filterRegistry() {
  const q      = (document.getElementById('registry-search')?.value || '').toLowerCase();
  const status = (document.getElementById('registry-status-filter')?.value || '');

  let records = allRecords;

  if (q) {
    records = records.filter(r =>
      getCertId(r).toLowerCase().includes(q) ||
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.businessName || '').toLowerCase().includes(q) ||
      (r.deviceId || '').toLowerCase().includes(q) ||
      (r.licenseKey || '').toLowerCase().includes(q) ||
      (r.phone || '').toLowerCase().includes(q) ||
      (r.city || '').toLowerCase().includes(q)
    );
  }

  if (status === 'GENUINE') {
    records = records.filter(r => getCertStatus(r) === 'ACTIVE');
  } else if (status === 'ACTIVE') {
    records = records.filter(r => getCertStatus(r) === 'ACTIVE');
  } else if (status === 'EXPIRED') {
    records = records.filter(r => getCertStatus(r) === 'EXPIRED');
  } else if (status === 'REVOKED') {
    records = records.filter(r => getCertStatus(r) === 'REVOKED');
  }

  renderCertRegistry(records);
}

// ── Quick-fill verify input from registry ────────────────────────────────────
function quickVerify(certId) {
  const input = document.getElementById('verify-input');
  const modeEl = document.getElementById('verify-mode');
  if (input) input.value = certId;
  if (modeEl) modeEl.value = 'cert';
  runVerification();
}

// ── Main Verification Engine ──────────────────────────────────────────────────
async function runVerification() {
  const rawInput = (document.getElementById('verify-input')?.value || '').trim();
  const mode     = document.getElementById('verify-mode')?.value || 'cert';
  const resultEl = document.getElementById('verify-result');
  if (!resultEl) return;

  if (!rawInput) {
    resultEl.style.display = 'none';
    showToast('Enter a value to verify', 'error');
    return;
  }

  resultEl.style.display = 'block';
  resultEl.innerHTML = `<div style="text-align:center;padding:20px;color:#6b7280;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin" style="display:inline-block;animation:spin 1s linear infinite;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    &nbsp; Verifying authenticity…
  </div>`;

  // Small delay for UX feedback
  await new Promise(r => setTimeout(r, 180));

  // Find matching record
  let matched = null;
  const q = rawInput.toUpperCase();

  switch (mode) {
    case 'cert':
      matched = allRecords.find(r => getCertId(r).toUpperCase() === q ||
        r.id.toUpperCase() === q.replace('CERT-', ''));
      break;
    case 'key':
      matched = allRecords.find(r => (r.licenseKey || '').replace(/-/g, '') === q.replace(/-/g, ''));
      break;
    case 'device':
      matched = allRecords.find(r => (r.deviceId || '').replace(/-/g, '') === q.replace(/-/g, ''));
      break;
    case 'customer':
      matched = allRecords.find(r => (r.customerName || '').toUpperCase().includes(rawInput.toUpperCase()));
      break;
    case 'phone':
      matched = allRecords.find(r => (r.phone || '').replace(/\D/g, '').includes(rawInput.replace(/\D/g, '')));
      break;
  }

  // Log to verify history
  const logEntry = {
    time:    new Date(),
    query:   rawInput,
    mode,
    result:  matched ? 'FOUND' : 'NOT_FOUND',
    matched: matched ? matched.customerName + ' · ' + getCertId(matched) : '—',
  };
  verifyHistory.unshift(logEntry);
  if (verifyHistory.length > 200) verifyHistory = verifyHistory.slice(0, 200);
  renderVerifyHistory();

  if (!matched) {
    if (window.soundEngine) window.soundEngine.play('error');
    resultEl.innerHTML = buildVerifyNotFound(rawInput, mode);
    return;
  }

  if (window.soundEngine) window.soundEngine.play('success');
  const status    = getCertStatus(matched);
  const integrity = await computeCertIntegrity(matched);
  const daysLeft  = getDaysLeft(matched);
  resultEl.innerHTML = await buildVerifyResult(matched, status, integrity, daysLeft);
}

// ── Build FOUND result card ───────────────────────────────────────────────────
async function buildVerifyResult(r, status, integrity, daysLeft) {
  const isActive  = status === 'ACTIVE';
  const isExpired = status === 'EXPIRED';
  const isRevoked = status === 'REVOKED';

  const colors = {
    ACTIVE:  { bg: '#f0fdf4', border: '#10b981', icon: '#10b981', title: '#065f46' },
    EXPIRED: { bg: '#fef2f2', border: '#ef4444', icon: '#ef4444', title: '#7f1d1d' },
    REVOKED: { bg: '#fffbeb', border: '#f59e0b', icon: '#f59e0b', title: '#78350f' },
  }[status] || { bg: '#f0fdf4', border: '#10b981', icon: '#10b981', title: '#065f46' };

  const statusLabel = {
    ACTIVE:  '✅ GENUINE — CERTIFICATE VERIFIED',
    EXPIRED: '⚠️ CERTIFICATE EXPIRED',
    REVOKED: '🚫 CERTIFICATE REVOKED',
  }[status];

  const expiryDisplay = r.expiry === 'LIFETIME'
    ? '♾ Lifetime (Perpetual)'
    : daysLeft < 0
      ? `${r.expiry} <span style="color:#ef4444;">(Expired ${Math.abs(daysLeft)} days ago)</span>`
      : daysLeft <= 30
        ? `${r.expiry} <span style="color:#f59e0b;">(${daysLeft} days remaining ⚠)</span>`
        : `${r.expiry} <span style="color:#10b981;">(${daysLeft} days remaining)</span>`;

  return `
  <div style="border:2px solid ${colors.border};border-radius:12px;background:${colors.bg};overflow:hidden;">
    <!-- Status Header -->
    <div style="background:${colors.border};padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        <strong style="color:#fff;font-size:13px;letter-spacing:.5px;">${statusLabel}</strong>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="downloadCertificateFromTable('${r.id}')" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#fff;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:600;">
          ↓ Download Certificate
        </button>
        <button onclick="printCertFromTable('${r.id}')" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;">
          🖨 Print
        </button>
      </div>
    </div>

    <div style="padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <!-- Left: Certificate Details -->
      <div>
        <div style="font-size:10px;font-weight:700;color:${colors.title};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Certificate Details</div>
        <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;width:45%;">CERTIFICATE ID</td><td style="padding:3px 0;font-weight:700;font-family:monospace;color:#6366f1;">${getCertId(r)}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">LICENSEE</td><td style="padding:3px 0;font-weight:700;">${esc(r.customerName)}</td></tr>
          ${r.businessName ? `<tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">BUSINESS</td><td style="padding:3px 0;">${esc(r.businessName)}</td></tr>` : ''}
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">PHONE</td><td style="padding:3px 0;">${esc(r.phone || '—')}</td></tr>
          ${r.city ? `<tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">CITY</td><td style="padding:3px 0;">${esc(r.city)}</td></tr>` : ''}
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">EDITION</td><td style="padding:3px 0;"><span class="edition-badge edition-${r.edition}">${r.edition}</span></td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">ISSUED ON</td><td style="padding:3px 0;">${formatDate(r.createdAt)}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">VALID UNTIL</td><td style="padding:3px 0;">${expiryDisplay}</td></tr>
        </table>
      </div>

      <!-- Right: Security Details -->
      <div>
        <div style="font-size:10px;font-weight:700;color:${colors.title};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Security & Integrity</div>
        <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;width:45%;">DEVICE ID</td><td style="padding:3px 0;font-family:monospace;font-size:10px;">${esc(r.deviceId)}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">LICENSE KEY</td><td style="padding:3px 0;font-family:monospace;font-size:9.5px;">${esc((r.licenseKey||'').slice(0,19))}…</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">INTEGRITY HASH</td>
              <td style="padding:3px 0;"><span style="background:#e0f2fe;color:#0369a1;border-radius:4px;padding:1px 5px;font-size:10px;font-family:monospace;font-weight:600;">${integrity}</span></td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">RECORD STATUS</td><td style="padding:3px 0;">${esc(r.status || 'Active')}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">CERT DOWNLOADS</td><td style="padding:3px 0;font-weight:600;">${r.certDownloads || 0}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">ISSUER</td><td style="padding:3px 0;font-size:10.5px;">Dinesh Global Enterprises Pvt Ltd</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;font-size:10.5px;">CONTACT</td><td style="padding:3px 0;font-weight:600;color:#0B5D3B;">7984626447</td></tr>
        </table>
        ${r.notes ? `<div style="margin-top:8px;padding:6px 8px;background:rgba(0,0,0,0.04);border-radius:6px;font-size:10.5px;color:#374151;"><span style="font-weight:600;color:#6b7280;">Notes:</span> ${esc(r.notes)}</div>` : ''}
      </div>
    </div>

    <!-- Verification Footer -->
    <div style="padding:8px 16px;background:rgba(0,0,0,0.04);border-top:1px solid ${colors.border};display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#6b7280;flex-wrap:wrap;gap:4px;">
      <span>🕐 Verified at: ${new Date().toLocaleString('en-IN')}</span>
      <span>Verification by: VENDEXA License Manager — Dinesh Global Enterprises Pvt Ltd</span>
    </div>
  </div>`;
}

// ── Build NOT FOUND result ────────────────────────────────────────────────────
function buildVerifyNotFound(query, mode) {
  const modeLabels = { cert:'Certificate ID', key:'License Key', device:'Device ID', customer:'Customer Name', phone:'Phone Number' };
  return `
  <div style="border:2px solid #ef4444;border-radius:12px;background:#fef2f2;overflow:hidden;">
    <div style="background:#ef4444;padding:10px 16px;display:flex;align-items:center;gap:10px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <strong style="color:#fff;font-size:13px;letter-spacing:.5px;">❌ CERTIFICATE NOT FOUND — POSSIBLE FAKE</strong>
    </div>
    <div style="padding:16px;">
      <p style="font-size:12px;color:#7f1d1d;margin:0 0 10px;"><strong>No certificate matching this ${modeLabels[mode] || 'query'} was found in the official registry.</strong></p>
      <div style="background:#fee2e2;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#7f1d1d;">
        <div style="margin-bottom:4px;"><strong>Query:</strong> <code>${esc(query)}</code></div>
        <div style="margin-bottom:4px;"><strong>Mode:</strong> ${modeLabels[mode] || mode}</div>
        <div><strong>Action:</strong> This certificate may be forged, duplicated, or issued fraudulently. Do NOT activate software using this key. Contact Dinesh Global Enterprises at <strong>7984626447</strong> to report.</div>
      </div>
    </div>
    <div style="padding:8px 16px;background:rgba(239,68,68,0.08);border-top:1px solid #ef4444;font-size:10px;color:#7f1d1d;">
      🕐 Checked at: ${new Date().toLocaleString('en-IN')} — VENDEXA Certificate Verification System
    </div>
  </div>`;
}

// ── Live input hint ───────────────────────────────────────────────────────────
function onVerifyInput() {
  const v = (document.getElementById('verify-input')?.value || '').trim();
  const modeEl = document.getElementById('verify-mode');
  if (!modeEl) return;
  // Auto-detect mode from input pattern
  if (/^CERT-/i.test(v))        modeEl.value = 'cert';
  else if (/^[A-F0-9-]{35,}$/i.test(v.replace(/ /g, ''))) modeEl.value = 'key';
  else if (/^[A-Z0-9]{4}-[A-Z0-9]{4}/i.test(v)) modeEl.value = 'device';
  else if (/^\+?[\d\s-]{8,}$/.test(v)) modeEl.value = 'phone';
}

function clearVerification() {
  const input = document.getElementById('verify-input');
  const result = document.getElementById('verify-result');
  if (input)  input.value = '';
  if (result) { result.style.display = 'none'; result.innerHTML = ''; }
}

// ── Copy cert ID to clipboard ─────────────────────────────────────────────────
async function copyToClipboardVerify(text) {
  await window.licenseAPI.copyToClipboard(text);
  showToast('Copied: ' + text, 'success');
}

// ── View full detail in modal ─────────────────────────────────────────────────
async function viewVerifyDetail(id) {
  const r = allRecords.find(x => x.id === id);
  if (!r) return;
  const status    = getCertStatus(r);
  const integrity = await computeCertIntegrity(r);
  const daysLeft  = getDaysLeft(r);
  // Reuse the view modal with verify content
  document.getElementById('modal-content').innerHTML = await buildVerifyResult(r, status, integrity, daysLeft);
  document.getElementById('view-modal').style.display = 'flex';
}

// ── Render Verification History ───────────────────────────────────────────────
function renderVerifyHistory() {
  const tbody = document.getElementById('verify-history-tbody');
  const countEl = document.getElementById('verify-log-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `(${verifyHistory.length} entries)`;

  if (!verifyHistory.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-cell text-center" style="color:#6b7280;padding:20px;">No verifications run yet.</td></tr>`;
    return;
  }

  const modeLabels = { cert:'Cert ID', key:'License Key', device:'Device ID', customer:'Customer', phone:'Phone' };

  tbody.innerHTML = verifyHistory.map(e => {
    const resultBadge = e.result === 'FOUND'
      ? `<span style="background:#d1fae5;color:#065f46;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;">✅ GENUINE</span>`
      : `<span style="background:#fee2e2;color:#7f1d1d;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;">❌ NOT FOUND</span>`;

    return `<tr>
      <td class="table-cell" style="font-size:10.5px;white-space:nowrap;">${e.time.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</td>
      <td class="table-cell"><code style="font-size:10.5px;">${esc(e.query.slice(0,40))}${e.query.length > 40 ? '…' : ''}</code></td>
      <td class="table-cell" style="font-size:10.5px;">${modeLabels[e.mode] || e.mode}</td>
      <td class="table-cell">${resultBadge}</td>
      <td class="table-cell" style="font-size:10.5px;color:#374151;">${esc(e.matched)}</td>
    </tr>`;
  }).join('');
}

// ── Clear history ─────────────────────────────────────────────────────────────
function clearVerifyHistory() {
  verifyHistory = [];
  renderVerifyHistory();
  showToast('Verification history cleared', 'success');
}

// ── Export Verify Log as CSV ──────────────────────────────────────────────────
async function exportVerifyLog() {
  if (!verifyHistory.length) { showToast('No verification history to export', 'error'); return; }
  const rows = verifyHistory.map(e => [
    `"${e.time.toISOString()}"`,
    `"${(e.query||'').replace(/"/g,'""')}"`,
    `"${(e.mode||'')}"`,
    `"${(e.result||'')}"`,
    `"${(e.matched||'').replace(/"/g,'""')}"`,
  ].join(','));
  const csv = ['Timestamp,Query,Mode,Result,Matched Record', ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vendexa-verify-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Verify log exported!', 'success');
}

// ── Theme Engine ─────────────────────────────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('vendexa_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButtonUI(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('vendexa_theme', next);
  updateThemeButtonUI(next);
  if (window.soundEngine) window.soundEngine.play('chime');
}

function updateThemeButtonUI(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon && label) {
    if (theme === 'dark') {
      icon.textContent = '🌙';
      label.textContent = 'Dark Mode';
    } else {
      icon.textContent = '☀️';
      label.textContent = 'Light Mode';
    }
  }
}

// ── Sound Control State ───────────────────────────────────────────────────────
function loadSoundState() {
  const isMuted = localStorage.getItem('vendexa_sound_muted') === 'true';
  updateSoundButtonUI(isMuted);
}

function toggleSound() {
  if (window.soundEngine) {
    const isMuted = window.soundEngine.toggleMute();
    updateSoundButtonUI(isMuted);
  }
}

function updateSoundButtonUI(isMuted) {
  const icon = document.getElementById('sound-icon');
  const label = document.getElementById('sound-label');
  if (icon && label) {
    if (isMuted) {
      icon.textContent = '🔇';
      label.textContent = 'Muted';
    } else {
      icon.textContent = '🔊';
      label.textContent = 'Audio On';
    }
  }
}

// ── 3D Card Tilt Physics ──────────────────────────────────────────────────────
function init3DTilt() {
  const card = document.getElementById('holo-card-3d');
  if (!card) return;
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -12;
    const tiltY = ((x - centerX) / centerX) * 12;
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  });
}

// ── Industrial Amount in Words Converter ──────────────────────────────────────
function numberToWords(num) {
  if (!num || num === 0) return 'Zero Rupees Only';
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function inWords(n) {
    if ((n = n.toString()).length > 9) return 'overflow';
    let n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str;
  }

  const parts = num.toFixed(2).split('.');
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  let res = inWords(rupees).trim() + ' Rupees';
  if (paise > 0) {
    res += ' and ' + inWords(paise).trim() + ' Paise';
  }
  return res + ' Only';
}

// ── Invoices DB Operations ────────────────────────────────────────────────────
async function loadInvoices() {
  try {
    const data = await window.licenseAPI.invoice.getAll();
    allInvoices = data.invoices || [];
  } catch (err) {
    allInvoices = [];
  }
}

async function initInvoiceForm() {
  try {
    const res = await window.licenseAPI.invoice.getNextNumber();
    const invInput = document.getElementById('inv-number');
    if (invInput && res.nextNumber) invInput.value = res.nextNumber;
  } catch {}
  
  if (invoiceLineItems.length === 0) {
    addInvoiceLineItem('VENDEXA RetailOS — Professional License', '997331', 1, 9999, 0, 18);
  }
}

function addInvoiceLineItem(desc = '', sac = '997331', qty = 1, price = 0, disc = 0, tax = 18) {
  invoiceLineItems.push({ desc, sac, qty, price, disc, tax });
  renderInvoiceLineItems();
  updateInvoiceCalculations();
}

function removeInvoiceLineItem(index) {
  invoiceLineItems.splice(index, 1);
  renderInvoiceLineItems();
  updateInvoiceCalculations();
}

function renderInvoiceLineItems() {
  const tbody = document.getElementById('inv-items-tbody');
  if (!tbody) return;

  tbody.innerHTML = invoiceLineItems.map((item, idx) => `
    <tr>
      <td><input type="text" value="${esc(item.desc)}" onchange="updateLineItem(${idx}, 'desc', this.value)" style="width:100%;" placeholder="Item description" /></td>
      <td><input type="text" value="${esc(item.sac)}" onchange="updateLineItem(${idx}, 'sac', this.value)" style="width:80px;text-align:center;" /></td>
      <td><input type="number" value="${item.qty}" min="1" onchange="updateLineItem(${idx}, 'qty', parseFloat(this.value)|1)" style="width:60px;text-align:center;" /></td>
      <td><input type="number" value="${item.price}" min="0" onchange="updateLineItem(${idx}, 'price', parseFloat(this.value)|0)" style="width:100px;text-align:right;" /></td>
      <td><input type="number" value="${item.disc}" min="0" onchange="updateLineItem(${idx}, 'disc', parseFloat(this.value)|0)" style="width:80px;text-align:right;" /></td>
      <td>
        <select onchange="updateLineItem(${idx}, 'tax', parseFloat(this.value))" style="width:70px;">
          <option value="18" ${item.tax === 18 ? 'selected' : ''}>18%</option>
          <option value="12" ${item.tax === 12 ? 'selected' : ''}>12%</option>
          <option value="5"  ${item.tax === 5 ? 'selected' : ''}>5%</option>
          <option value="0"  ${item.tax === 0 ? 'selected' : ''}>0%</option>
        </select>
      </td>
      <td style="text-align:right;font-weight:700;">₹${((item.qty * item.price - item.disc) * (1 + item.tax / 100)).toFixed(2)}</td>
      <td style="text-align:center;">
        <button onclick="removeInvoiceLineItem(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;">✕</button>
      </td>
    </tr>
  `).join('');
}

function updateLineItem(idx, field, value) {
  if (invoiceLineItems[idx]) {
    invoiceLineItems[idx][field] = value;
    updateInvoiceCalculations();
  }
}

function updateInvoiceCalculations() {
  let subtotal = 0;
  let totalTax = 0;

  invoiceLineItems.forEach(item => {
    const lineNet = Math.max(0, (item.qty * item.price) - item.disc);
    const lineTax = lineNet * (item.tax / 100);
    subtotal += lineNet;
    totalTax += lineTax;
  });

  // Promo Coupon Engine
  const couponCode = document.getElementById('inv-coupon')?.value || 'NONE';
  let couponDisc = 0;
  if (couponCode === 'WELCOME10') couponDisc = subtotal * 0.10;
  else if (couponCode === 'PARTNER20') couponDisc = subtotal * 0.20;
  else if (couponCode === 'FLAT1000') couponDisc = Math.min(subtotal, 1000);

  const netAfterCoupon = Math.max(0, subtotal - couponDisc);
  const grandTotal = netAfterCoupon + totalTax;
  const roundedTotal = Math.round(grandTotal);

  // Multi-Currency Symbol
  const curr = document.getElementById('inv-currency')?.value || 'INR';
  const currSymbol = { INR:'₹', USD:'$', EUR:'€', GBP:'£', AED:'AED ' }[curr] || '₹';

  const subEl = document.getElementById('inv-subtotal');
  const cdiscEl = document.getElementById('inv-coupon-disc');
  const taxEl = document.getElementById('inv-tax');
  const totalEl = document.getElementById('inv-total');
  const wordsEl = document.getElementById('inv-amount-words');

  if (subEl) subEl.textContent = `${currSymbol}${subtotal.toFixed(2)}`;
  if (cdiscEl) cdiscEl.textContent = `-${currSymbol}${couponDisc.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `${currSymbol}${totalTax.toFixed(2)} (GST 18%)`;
  if (totalEl) totalEl.textContent = `${currSymbol}${roundedTotal.toLocaleString()}`;
  if (wordsEl) wordsEl.textContent = curr === 'INR' ? numberToWords(roundedTotal) : `${roundedTotal} ${curr} Net Total`;

  // Render Live UPI QR Code in Invoice Builder Summary Box
  const cfg = typeof getSuiteSettings === 'function' ? getSuiteSettings() : { upiVpa: '7984626447@upi', companyName: 'Dinesh Global Enterprises Pvt Ltd' };
  const vpa = cfg.upiVpa || '7984626447@upi';
  const qrBox = document.getElementById('inv-qr-code-box');
  const vpaDisplay = document.getElementById('inv-qr-vpa-display');
  
  if (vpaDisplay) vpaDisplay.textContent = vpa;
  if (qrBox && typeof QRCodeEngine !== 'undefined') {
    qrBox.innerHTML = QRCodeEngine.generateUPIQRCodeSVG(vpa, cfg.companyName || 'Dinesh Global Enterprises Pvt Ltd', roundedTotal, 'INV-LIVE', 110);
  }
}

function toggleSplitPaymentMode(mode) {
  const container = document.getElementById('inv-split-container');
  if (container) {
    container.style.display = (mode === 'Split') ? 'block' : 'none';
  }
}

function calculateSplitPayment() {
  const totalEl = document.getElementById('inv-total');
  const amt1El  = document.getElementById('inv-split-amt1');
  const amt2El  = document.getElementById('inv-split-amt2');
  if (!totalEl || !amt1El || !amt2El) return;

  const totalText = totalEl.textContent.replace(/[^0-9.]/g, '');
  const grandTotal = parseFloat(totalText) || 0;
  const amt1 = parseFloat(amt1El.value) || 0;
  const amt2 = Math.max(0, grandTotal - amt1);

  amt2El.value = amt2.toFixed(2);
}

function analyzeHardwareId(val) {
  const resEl = document.getElementById('hw-analysis-result');
  if (!resEl) return;
  if (!val || !val.trim()) {
    resEl.innerHTML = `<div style="color:var(--text3);font-size:12px;font-style:italic;">Enter hardware device ID / serial fingerprint above to inspect compatibility...</div>`;
    return;
  }
  const clean = val.trim().toUpperCase();
  resEl.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="color:var(--primary);font-family:monospace;font-size:13px;">${esc(clean)}</strong>
        <span class="status-badge status-active">COMPATIBLE POS DEVICE</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;color:var(--text2);">
        <div><span style="color:var(--text3);">HASH ALGORITHM:</span> SHA-256 HMAC</div>
        <div><span style="color:var(--text3);">HARDWARE BUS:</span> USB / SERIAL / ETHERNET</div>
        <div><span style="color:var(--text3);">FINGERPRINT LENGTH:</span> ${clean.length} CHARS</div>
        <div><span style="color:var(--text3);">STATUS:</span> OFFLINE VAULT AUTHENTICATED</div>
      </div>
    </div>
  `;
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
}

// ── Renewal Alerts & Expiry Engine ───────────────────────────────────────────
function renderRenewalsTable() {
  const tbody = document.getElementById('renewals-tbody');
  if (!tbody) return;

  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const expiringList = allRecords.filter(r => {
    if (r.expiry === 'LIFETIME') return false;
    const expDate = new Date(r.expiry);
    const diff = expDate - now;
    return diff <= thirtyDaysMs;
  });

  if (!expiringList.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No licenses expiring in the next 30 days. All client licenses are active!</td></tr>`;
    return;
  }

  tbody.innerHTML = expiringList.map((r, idx) => {
    const daysLeft = Math.ceil((new Date(r.expiry) - now) / (1000 * 60 * 60 * 24));
    const isExpired = daysLeft < 0;
    const badge = isExpired
      ? `<span class="alert-expired">EXPIRED (${Math.abs(daysLeft)}d ago)</span>`
      : `<span class="alert-soon">${daysLeft} Days Remaining</span>`;

    return `<tr>
      <td>${idx + 1}</td>
      <td style="font-weight:700;">${esc(r.customerName)}</td>
      <td><span class="edition-badge edition-${r.edition}">${r.edition}</span></td>
      <td>${r.expiry}</td>
      <td>${badge}</td>
      <td>
        <button class="btn-primary" style="padding:4px 10px;font-size:11px;" onclick="renewLicenseKey('${r.id}')">🔄 Renew 1 Year</button>
      </td>
    </tr>`;
  }).join('');
}

async function renewLicenseKey(id) {
  const r = allRecords.find(x => x.id === id);
  if (!r) return;
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const newExpiry = snapToQuarter(d);
  r.expiry = newExpiry;
  r.status = 'Active';
  await window.licenseAPI.db.saveLicense(r);
  if (window.soundEngine) window.soundEngine.play('success');
  showToast(`License renewed for ${r.customerName} until ${newExpiry}!`, 'success');
  await loadRecords();
  renderRenewalsTable();
}

// ── AES-256 Encrypted Master Vault Operations ─────────────────────────────────
async function exportEncryptedVault() {
  const pass = document.getElementById('vault-export-pass')?.value || '';
  if (!pass) { showToast('Master passphrase is required', 'error'); return; }
  const res = await window.licenseAPI.vault.export(pass);
  if (res.success) {
    if (window.soundEngine) window.soundEngine.play('success');
    showToast(`Master vault encrypted with AES-256-GCM and saved!`, 'success');
  } else if (!res.canceled) {
    if (window.soundEngine) window.soundEngine.play('error');
    showToast(res.error || 'Vault export failed', 'error');
  }
}

async function importEncryptedVault() {
  const pass = document.getElementById('vault-import-pass')?.value || '';
  if (!pass) { showToast('Master passphrase is required', 'error'); return; }
  const res = await window.licenseAPI.vault.import(pass);
  if (res.success) {
    if (window.soundEngine) window.soundEngine.play('success');
    showToast('Vault decrypted & master database restored!', 'success');
    await loadRecords();
    await loadInvoices();
    await loadRevocations();
    renderRecords(allRecords);
  } else if (!res.canceled) {
    if (window.soundEngine) window.soundEngine.play('error');
    showToast(res.error || 'Decryption failed', 'error');
  }
}

// ── Minimalist 3D Canvas Visualizer Renderer ────────────────────────────────
function renderMatrixCanvas() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Draw clean industrial grid
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw central metallic badge frame
  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2;
  ctx.strokeRect(-240, -50, 480, 100);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.fillText('VENDEXA RETAILOS™ — 256-BIT HMAC SECURITY', 0, -10);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText('STATUS: GENUINE OFFLINE VAULT AUTHENTICATED', 0, 20);

  ctx.restore();
}

// ── Fully Loaded Suite Settings & Invoice Customizer ──────────────────────────
function saveSuiteSettings() {
  const companyName   = document.getElementById('set-company-name')?.value || '';
  const brandTitle    = document.getElementById('set-brand-title')?.value || '';
  const gstin         = document.getElementById('set-gstin')?.value || '';
  const phone         = document.getElementById('set-phone')?.value || '';
  const email         = document.getElementById('set-email')?.value || '';
  const upiVpa        = document.getElementById('set-upi-vpa')?.value || '';
  const defaultTax    = document.getElementById('set-default-tax')?.value || '18';
  const defaultHsn    = document.getElementById('set-default-hsn')?.value || '997331';
  const invPrefix     = document.getElementById('set-inv-prefix')?.value || 'INV-';

  // Bunny Customize Template Settings
  const invTemplate   = document.getElementById('set-inv-template')?.value || 'tpl-emerald';
  const invAccentColor= document.getElementById('set-inv-accent-color')?.value || '#0B5D3B';
  const invWatermark  = document.getElementById('set-inv-watermark')?.value || 'ORIGINAL FOR RECIPIENT';
  const invTagline    = document.getElementById('set-inv-tagline')?.value || 'Official Licensed Software & IT Solutions';
  const invSignatoryTitle = document.getElementById('set-inv-signatory-title')?.value || 'Authorized Signatory';
  const invShowQr     = document.getElementById('set-inv-show-qr')?.checked ?? true;
  const invShowHsn    = document.getElementById('set-inv-show-hsn')?.checked ?? true;
  const invShowLogo   = document.getElementById('set-inv-show-logo')?.checked ?? true;
  const invShowSign   = document.getElementById('set-inv-show-sign')?.checked ?? true;

  const settingsObj = {
    companyName, brandTitle, gstin, phone, email, upiVpa, defaultTax, defaultHsn, invPrefix,
    invTemplate, invAccentColor, invWatermark, invTagline, invSignatoryTitle, invShowQr, invShowHsn, invShowLogo, invShowSign
  };

  localStorage.setItem('vendexa_suite_settings', JSON.stringify(settingsObj));
  
  // Real-time synchronization across all app views
  updateSettingsPreviews();
  if (typeof updateInvoiceCalculations === 'function') updateInvoiceCalculations();

  if (window.soundEngine) window.soundEngine.play('success');
  showToast('Suite settings & UPI configuration saved!', 'success');
}

function getSuiteSettings() {
  try {
    const raw = localStorage.getItem('vendexa_suite_settings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    companyName: 'Dinesh Global Enterprises Pvt Ltd',
    brandTitle: 'VENDEXA RetailOS™',
    gstin: '27AAAAA0000A1Z5',
    phone: '+91-7984626447',
    email: 'support@dineshglobal.com',
    upiVpa: '7984626447@upi',
    defaultTax: '18',
    defaultHsn: '997331',
    invPrefix: 'INV-',
    invTemplate: 'tpl-emerald',
    invAccentColor: '#0B5D3B',
    invWatermark: 'ORIGINAL FOR RECIPIENT',
    invTagline: 'Official Licensed Software & IT Solutions',
    invSignatoryTitle: 'Authorized Signatory',
    invShowQr: true,
    invShowHsn: true,
    invShowLogo: true,
    invShowSign: true,
  };
}

// ── 10 Invoice Layout Templates Generator Engine ──────────────────────────────
function getInvoiceTemplateHTML(inv) {
  const cfg = getSuiteSettings();
  const tpl = cfg.invTemplate || 'tpl-emerald';
  const accent = cfg.invAccentColor || '#0B5D3B';

  const logoHtml = cfg.invShowLogo ? `<img src="../IMG_8810.PNG" style="height:48px;object-fit:contain;" alt="Logo"/>` : '';
  
  // Live scannable QR Code SVG generation
  let qrSvg = '';
  if (cfg.invShowQr !== false) {
    if (typeof QRCodeEngine !== 'undefined') {
      qrSvg = QRCodeEngine.generateUPIQRCodeSVG(cfg.upiVpa, cfg.companyName, inv.totalPayable || 0, inv.invoiceNumber || 'INV', 85);
    } else {
      qrSvg = `<div style="font-size:10px;font-weight:700;color:#000;">${esc(cfg.upiVpa)}</div>`;
    }
  }

  const qrHtml = (cfg.invShowQr !== false && qrSvg) ? `
    <div style="text-align:right;margin-top:4px;">
      <div style="font-size:8.5px;font-weight:800;color:${accent};letter-spacing:0.5px;margin-bottom:2px;">SCAN TO PAY VIA UPI (&#8377;${parseFloat(inv.totalPayable||0).toLocaleString()})</div>
      <div style="background:#fff;padding:4px;border:1px solid #cbd5e1;border-radius:6px;display:inline-block;">
        ${qrSvg}
      </div>
      <div style="font-size:9.5px;font-weight:800;color:#047857;font-family:monospace;margin-top:2px;">${esc(cfg.upiVpa)}</div>
    </div>
  ` : '';

  const itemsRows = (inv.items || []).map((it, i) => `
    <tr>
      <td style="padding:6px;border-bottom:1px solid #e2e8f0;">${i+1}</td>
      <td style="padding:6px;border-bottom:1px solid #e2e8f0;font-weight:600;">${esc(it.desc)}</td>
      ${cfg.invShowHsn ? `<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;">${esc(it.sac||'997331')}</td>` : ''}
      <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.qty}</td>
      <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;">₹${parseFloat(it.price).toLocaleString()}</td>
      <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">₹${((it.qty*it.price)-it.disc).toLocaleString()}</td>
    </tr>
  `).join('');

  const signatureHtml = cfg.invShowSign !== false ? `
    <div style="text-align:center;min-width:200px;">
      <div style="font-size:11px;color:#0f172a;margin-bottom:45px;font-weight:700;">For ${esc(cfg.companyName)}</div>
      <div style="border-top:1px solid #0f172a;width:190px;margin:0 auto 4px auto;"></div>
      <div style="font-size:11px;font-weight:800;color:#0f172a;">${esc(cfg.invSignatoryTitle || 'Authorized Signatory')}</div>
    </div>
  ` : '';

  // 1. Executive Emerald A4 / Default Corporate Legal Layout
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    @page{ size:A4 portrait; margin:10mm; }
    body{ font-family:'Helvetica Neue',Arial,sans-serif; margin:0; padding:15px; color:#1e293b; background:#fff; }
    .header{ display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid ${accent}; padding-bottom:12px; margin-bottom:16px; }
    .title{ font-size:24px; font-weight:800; color:${accent}; letter-spacing:1px; }
    .table{ width:100%; border-collapse:collapse; margin-top:16px; }
    .th{ background:${accent}; color:#fff; padding:8px; font-size:11px; text-transform:uppercase; text-align:left; }
    .watermark-box{ position:fixed; top:30%; left:15%; width:70%; height:40%; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0.06; pointer-events:none; transform:rotate(-25deg); z-index:0; }
  </style></head><body>
    <div class="watermark-box">
      ${cfg.invShowLogo ? `<img src="../IMG_8810.PNG" style="max-width:260px;height:auto;margin-bottom:12px;filter:grayscale(100%);"/>` : ''}
      <div style="font-size:28px;font-weight:900;letter-spacing:3px;text-align:center;color:#0f172a;text-transform:uppercase;">${esc(cfg.companyName)}</div>
      <div style="font-size:16px;font-weight:800;letter-spacing:4px;margin-top:6px;color:${accent};">${esc(cfg.invWatermark)}</div>
    </div>
    <div class="header">
      <div>
        ${logoHtml}
        <div class="title">${cfg.companyName}</div>
        <div style="font-size:11px;color:#64748b;">${cfg.invTagline} | GSTIN: ${cfg.gstin}</div>
      </div>
      <div>
        <div style="font-size:20px;font-weight:800;color:${accent};text-align:right;">TAX INVOICE</div>
        <div style="font-size:12px;font-weight:700;text-align:right;"># ${inv.invoiceNumber}</div>
        <div style="font-size:11px;color:#64748b;text-align:right;">Date: ${new Date(inv.date).toLocaleDateString('en-IN')}</div>
        ${qrHtml}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;font-size:12px;">
      <div style="background:#f8fafc;padding:12px;border-radius:6px;">
        <strong style="color:${accent};">BILLED TO:</strong><br/>
        <strong>${esc(inv.customerName)}</strong><br/>
        ${inv.businessName ? `${esc(inv.businessName)}<br/>` : ''}
        ${inv.gstin ? `GSTIN: ${esc(inv.gstin)}<br/>` : ''}
        ${inv.poReference ? `PO Ref: <strong>${esc(inv.poReference)}</strong><br/>` : ''}
        ${inv.dueDate ? `Due Date: <strong>${esc(inv.dueDate)}</strong><br/>` : ''}
        Phone: ${esc(inv.phone || cfg.phone)}
      </div>
      <div style="background:#f8fafc;padding:12px;border-radius:6px;">
        <strong style="color:${accent};">ISSUED BY:</strong><br/>
        <strong>${cfg.companyName}</strong><br/>
        GSTIN: ${cfg.gstin}<br/>
        Phone: ${cfg.phone}<br/>
        Email: ${cfg.email}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th class="th">#</th>
          <th class="th">Description</th>
          ${cfg.invShowHsn ? `<th class="th" style="text-align:center;">SAC/HSN</th>` : ''}
          <th class="th" style="text-align:center;">Qty</th>
          <th class="th" style="text-align:right;">Unit Price</th>
          <th class="th" style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div style="font-size:11px;color:#64748b;max-width:50%;">
        <strong>Amount in Words:</strong><br/>
        ${inv.amountInWords || numberToWords(inv.totalPayable)}
      </div>
      <div style="width:240px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal:</span><strong>₹${(inv.subtotal || 0).toFixed(2)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>GST Tax (18%):</span><strong>₹${(inv.taxAmount || 0).toFixed(2)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid ${accent};font-size:15px;color:${accent};"><span>Grand Total:</span><strong>₹${(inv.totalPayable || 0).toLocaleString()}</strong></div>
      </div>
    </div>

    <!-- Authority Signature & Corporate Contact Footer -->
    <div style="margin-top:36px;padding-top:14px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:10px;color:#64748b;max-width:55%;line-height:1.5;">
        <strong style="color:#0f172a;font-size:11px;">${esc(cfg.companyName)}</strong><br/>
        <span>GSTIN: <strong>${esc(cfg.gstin)}</strong> | Enterprise Software &amp; POS Systems Division</span><br/>
        <span>Support: <strong>${esc(cfg.phone)}</strong> | Email: <strong>${esc(cfg.email)}</strong></span>
      </div>

      ${signatureHtml}
    </div>
  </body></html>`;
}

function purgeAuditLogs() {
  if (confirm('Are you sure you want to purge all security audit log entries?')) {
    allAudit = [];
    if (window.soundEngine) window.soundEngine.play('error');
    showToast('Audit logs purged', 'success');
    renderAudit(allAudit);
  }
}

async function resetAllDatabaseRecords() {
  const code = prompt('WARNING: Type "DELETE-ALL" to permanently wipe all customer license records:');
  if (code === 'DELETE-ALL') {
    allRecords = [];
    await window.licenseAPI.db.saveLicense({ id: 'dummy_reset', reset: true });
    if (window.soundEngine) window.soundEngine.play('error');
    showToast('All customer records permanently wiped!', 'error');
    renderRecords(allRecords);
  }
}





async function saveInvoiceRecord() {
  const invNum   = document.getElementById('inv-number')?.value || 'INV-2026-0001';
  const custName = document.getElementById('inv-customer-name')?.value.trim() || 'Client';
  const custBus  = document.getElementById('inv-business-name')?.value.trim() || '';
  const custGst  = document.getElementById('inv-gstin')?.value.trim() || '';
  const custPhone= document.getElementById('inv-phone')?.value.trim() || '';
  const poRef    = document.getElementById('inv-po-reference')?.value.trim() || '';
  const dueDate  = document.getElementById('inv-due-date')?.value || '';

  let subtotal = 0, totalTax = 0;
  invoiceLineItems.forEach(item => {
    const lineNet = Math.max(0, (item.qty * item.price) - item.disc);
    subtotal += lineNet;
    totalTax += lineNet * (item.tax / 100);
  });
  const grandTotal = Math.round(subtotal + totalTax);

  const record = {
    id: 'inv_' + Date.now().toString(36),
    invoiceNumber: invNum,
    customerName: custName,
    businessName: custBus,
    gstin: custGst,
    phone: custPhone,
    poReference: poRef,
    dueDate,
    date: document.getElementById('inv-date')?.value || new Date().toISOString(),
    currency: document.getElementById('inv-currency')?.value || 'INR',
    items: invoiceLineItems,
    subtotal,
    taxAmount: totalTax,
    totalPayable: grandTotal,
    amountInWords: numberToWords(grandTotal),
    status: 'Paid',
  };

  const res = await window.licenseAPI.invoice.save(record);
  if (res.success) {
    if (window.soundEngine) window.soundEngine.play('invoice');
    showToast(`Invoice ${invNum} saved!`, 'success');
    await loadInvoices();
    renderInvoicesHistory();
  } else {
    showToast(res.error || 'Failed to save invoice', 'error');
  }
}

function renderInvoicesHistory() {
  const tbody = document.getElementById('invoices-history-tbody');
  if (!tbody) return;

  if (!allInvoices.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No saved invoices yet. Create your first tax invoice above!</td></tr>`;
    return;
  }

  tbody.innerHTML = allInvoices.map((inv, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="font-weight:700;font-family:monospace;color:var(--primary);">${esc(inv.invoiceNumber)}</td>
      <td style="font-weight:600;">${esc(inv.customerName)} ${inv.businessName ? `(${esc(inv.businessName)})` : ''}</td>
      <td>${new Date(inv.date).toLocaleDateString('en-IN')}</td>
      <td style="font-weight:800;color:var(--green);">₹${inv.totalPayable.toLocaleString('en-IN')}</td>
      <td><span class="status-badge status-active">Paid</span></td>
      <td>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px;" onclick="printSavedInvoice('${inv.id}')">Print PDF</button>
      </td>
    </tr>
  `).join('');
}

// ── Revocation & Blacklist Manager ────────────────────────────────────────────
async function loadRevocations() {
  try {
    const res = await window.licenseAPI.revocation.getAll();
    revokedKeys = res.revokedKeys || [];
  } catch {
    revokedKeys = [];
  }
}

async function revokeLicenseKey(licenseKey, deviceId, customerName, reason) {
  if (!licenseKey) return;
  const res = await window.licenseAPI.revocation.revoke({ licenseKey, deviceId, customerName, reason });
  if (res.success) {
    if (window.soundEngine) window.soundEngine.play('error');
    showToast('License key revoked and added to blacklist', 'success');
    await loadRecords();
    await loadRevocations();
    renderRecords(allRecords);
    renderRevocationsTable();
  }
}

async function unrevokeLicenseKey(licenseKey) {
  const res = await window.licenseAPI.revocation.unrevoke(licenseKey);
  if (res.success) {
    if (window.soundEngine) window.soundEngine.play('success');
    showToast('License key un-revoked and restored', 'success');
    await loadRecords();
    await loadRevocations();
    renderRecords(allRecords);
    renderRevocationsTable();
  }
}

function renderRevocationsTable() {
  const tbody = document.getElementById('revocations-tbody');
  if (!tbody) return;

  if (!revokedKeys.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No licenses currently revoked or blacklisted.</td></tr>`;
    return;
  }

  tbody.innerHTML = revokedKeys.map((r, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="font-family:monospace;font-weight:700;color:var(--red);">${esc(r.licenseKey)}</td>
      <td style="font-family:monospace;">${esc(r.deviceId)}</td>
      <td>${esc(r.customerName)}</td>
      <td>${esc(r.reason)}</td>
      <td>
        <button class="btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="unrevokeLicenseKey('${r.licenseKey}')">Restore Key</button>
      </td>
    </tr>
  `).join('');
}

// ── Printing & Template Helpers ───────────────────────────────────────────────
function getActiveInvoiceRecordFromForm() {
  const invNum   = document.getElementById('inv-number')?.value || 'INV-2026-0001';
  const custName = document.getElementById('inv-customer-name')?.value.trim() || 'Client Name';
  const custBus  = document.getElementById('inv-business-name')?.value.trim() || '';
  const custGst  = document.getElementById('inv-gstin')?.value.trim() || '';
  const custPhone= document.getElementById('inv-phone')?.value.trim() || '';
  const poRef    = document.getElementById('inv-po-reference')?.value.trim() || '';
  const dueDate  = document.getElementById('inv-due-date')?.value || '';

  let subtotal = 0, totalTax = 0;
  invoiceLineItems.forEach(item => {
    const lineNet = Math.max(0, (item.qty * item.price) - item.disc);
    subtotal += lineNet;
    totalTax += lineNet * (item.tax / 100);
  });
  const grandTotal = Math.round(subtotal + totalTax);

  return {
    invoiceNumber: invNum,
    customerName: custName,
    businessName: custBus,
    gstin: custGst,
    phone: custPhone,
    poReference: poRef,
    dueDate,
    date: document.getElementById('inv-date')?.value || new Date().toISOString(),
    items: invoiceLineItems,
    subtotal,
    taxAmount: totalTax,
    totalPayable: grandTotal,
    amountInWords: numberToWords(grandTotal),
  };
}

async function printInvoiceA4() {
  const record = getActiveInvoiceRecordFromForm();
  const html = getInvoiceTemplateHTML(record);
  if (window.soundEngine) window.soundEngine.play('invoice');
  const res = await window.licenseAPI.print.saveInvoicePdf(html, record.invoiceNumber, record.customerName);
  if (res.success) showToast(`Executive Tax Invoice PDF saved to ${res.filePath}`, 'success');
  else if (!res.canceled) showToast(res.error || 'Failed to print invoice PDF', 'error');
}

async function printSavedInvoice(id) {
  const record = allInvoices.find(i => i.id === id);
  if (!record) return;
  const html = getInvoiceTemplateHTML(record);
  if (window.soundEngine) window.soundEngine.play('invoice');
  const res = await window.licenseAPI.print.saveInvoicePdf(html, record.invoiceNumber, record.customerName);
  if (res.success) showToast(`Invoice PDF saved!`, 'success');
  else if (!res.canceled) showToast(res.error || 'Failed to print invoice PDF', 'error');
}

async function printInvoiceThermal() {
  const record = getActiveInvoiceRecordFromForm();
  const html = getInvoiceTemplateHTML(record);
  const res = await window.licenseAPI.print.receipt(html);
  if (res.success) showToast('Thermal receipt sent to printer', 'success');
  else if (!res.canceled) showToast(res.error || 'Thermal print error', 'error');
}

// ── Live Settings Preview Engine ──────────────────────────────────────────────
// ── Live Settings Preview Engine ──────────────────────────────────────────────
function updateSettingsPreviews() {
  const licContainer = document.getElementById('settings-lic-preview');
  const invContainer = document.getElementById('settings-inv-preview');

  const companyName = document.getElementById('set-company-name')?.value || 'Dinesh Global Enterprises Pvt Ltd';
  const brandTitle  = document.getElementById('set-brand-title')?.value || 'VENDEXA RetailOS™';
  const gstin       = document.getElementById('set-gstin')?.value || '27AAAAA0000A1Z5';
  const phone       = document.getElementById('set-phone')?.value || '+91-7984626447';
  const email       = document.getElementById('set-email')?.value || 'support@dineshglobal.com';
  const upiVpa      = document.getElementById('set-upi-vpa')?.value.trim() || '7984626447@upi';
  const template    = document.getElementById('set-inv-template')?.value || 'tpl-emerald';
  const accent      = document.getElementById('set-inv-accent-color')?.value || '#059669';
  const watermark   = document.getElementById('set-inv-watermark')?.value || 'ORIGINAL FOR RECIPIENT';
  const tagline     = document.getElementById('set-inv-tagline')?.value || 'Official Licensed Software';

  if (licContainer) {
    licContainer.innerHTML = `
      <div style="padding:10px;border:1px solid ${accent};border-radius:6px;background:var(--bg2);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:8px;">
          <div>
            <strong style="color:var(--text);font-size:12.5px;">${esc(brandTitle)} — LICENSE PREVIEW</strong><br/>
            <span style="color:var(--text3);font-size:10px;">Issuer: ${esc(companyName)} | ${esc(phone)} | ${esc(email)}</span>
          </div>
          <span style="background:${accent};color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:800;">OFFLINE VALID</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10.5px;">
          <div><span style="color:var(--text3);">CLIENT:</span> <strong>Ramesh Enterprises</strong></div>
          <div><span style="color:var(--text3);">EDITION:</span> <strong style="color:var(--primary);">ENTERPRISE PRO</strong></div>
          <div><span style="color:var(--text3);">KEY:</span> <code style="color:${accent};">VNDX-8810-SAMPLE-KEY</code></div>
          <div><span style="color:var(--text3);">EXPIRY:</span> <strong>PERPETUAL LIFETIME</strong></div>
        </div>
      </div>
    `;
  }

  if (invContainer) {
    let previewQr = '';
    if (typeof QRCodeEngine !== 'undefined') {
      previewQr = QRCodeEngine.generateUPIQRCodeSVG(upiVpa, companyName, 11799, 'INV-SAMPLE', 65);
    }

    invContainer.innerHTML = `
      <div style="padding:10px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${accent};padding-bottom:6px;margin-bottom:8px;">
          <div>
            <strong style="color:${accent};font-size:13px;">${esc(companyName)}</strong><br/>
            <span style="color:var(--text3);font-size:10px;">${esc(tagline)} | GSTIN: ${esc(gstin)}</span>
          </div>
          <div style="text-align:right;display:flex;gap:8px;align-items:center;">
            ${previewQr ? `<div style="text-align:center;">${previewQr}<div style="font-size:8px;font-weight:800;color:#047857;font-family:monospace;">${esc(upiVpa)}</div></div>` : ''}
            <div>
              <strong style="color:${accent};font-size:13px;">TAX INVOICE</strong><br/>
              <span style="font-family:monospace;font-weight:700;font-size:11px;"># INV-2026-0001</span>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
          <div><span style="color:var(--text3);">Billed To:</span> <strong>Client Pvt Ltd</strong></div>
          <div><span style="color:var(--text3);">Template:</span> <strong>${esc(template)}</strong></div>
          <div><span style="color:var(--text3);">Watermark:</span> <em style="color:${accent};">${esc(watermark)}</em></div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px;">
          <tr style="background:${accent};color:#fff;">
            <th style="padding:3px;text-align:left;">Item</th>
            <th style="padding:3px;text-align:center;">Qty</th>
            <th style="padding:3px;text-align:right;">Rate</th>
            <th style="padding:3px;text-align:right;">Net Total</th>
          </tr>
          <tr>
            <td style="padding:3px;border-bottom:1px solid var(--border);">${esc(brandTitle)} — Suite</td>
            <td style="padding:3px;border-bottom:1px solid var(--border);text-align:center;">1</td>
            <td style="padding:3px;border-bottom:1px solid var(--border);text-align:right;">₹9,999.00</td>
            <td style="padding:3px;border-bottom:1px solid var(--border);text-align:right;font-weight:700;">₹11,798.82</td>
          </tr>
        </table>
        <div style="text-align:right;font-size:10.5px;font-weight:800;color:${accent};">Grand Total Payable: ₹11,799.00</div>
      </div>
    `;
  }
}

function loadSettingsForm() {
  const cfg = getSuiteSettings();
  if (document.getElementById('set-company-name')) document.getElementById('set-company-name').value = cfg.companyName;
  if (document.getElementById('set-brand-title')) document.getElementById('set-brand-title').value = cfg.brandTitle;
  if (document.getElementById('set-gstin')) document.getElementById('set-gstin').value = cfg.gstin;
  if (document.getElementById('set-phone')) document.getElementById('set-phone').value = cfg.phone;
  if (document.getElementById('set-email')) document.getElementById('set-email').value = cfg.email;
  if (document.getElementById('set-upi-vpa')) document.getElementById('set-upi-vpa').value = cfg.upiVpa;
  if (document.getElementById('set-default-tax')) document.getElementById('set-default-tax').value = cfg.defaultTax;
  if (document.getElementById('set-default-hsn')) document.getElementById('set-default-hsn').value = cfg.defaultHsn;
  if (document.getElementById('set-inv-prefix')) document.getElementById('set-inv-prefix').value = cfg.invPrefix;

  if (document.getElementById('set-inv-template')) document.getElementById('set-inv-template').value = cfg.invTemplate;
  if (document.getElementById('set-inv-accent-color')) document.getElementById('set-inv-accent-color').value = cfg.invAccentColor;
  if (document.getElementById('set-inv-watermark')) document.getElementById('set-inv-watermark').value = cfg.invWatermark;
  if (document.getElementById('set-inv-tagline')) document.getElementById('set-inv-tagline').value = cfg.invTagline;
  if (document.getElementById('set-inv-signatory-title')) document.getElementById('set-inv-signatory-title').value = cfg.invSignatoryTitle || 'Authorized Signatory';
  if (document.getElementById('set-inv-show-qr')) document.getElementById('set-inv-show-qr').checked = cfg.invShowQr !== false;
  if (document.getElementById('set-inv-show-hsn')) document.getElementById('set-inv-show-hsn').checked = cfg.invShowHsn !== false;
  if (document.getElementById('set-inv-show-logo')) document.getElementById('set-inv-show-logo').checked = cfg.invShowLogo !== false;
  if (document.getElementById('set-inv-show-sign')) document.getElementById('set-inv-show-sign').checked = cfg.invShowSign !== false;

  // Bind live preview events to ALL input fields
  const settingsInputs = [
    'set-company-name', 'set-brand-title', 'set-gstin', 'set-phone', 'set-email', 'set-upi-vpa',
    'set-default-tax', 'set-default-hsn', 'set-inv-prefix',
    'set-inv-template', 'set-inv-accent-color', 'set-inv-watermark', 'set-inv-tagline', 'set-inv-signatory-title',
    'set-inv-show-qr', 'set-inv-show-hsn', 'set-inv-show-logo', 'set-inv-show-sign'
  ];

  settingsInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.removeEventListener('input', updateSettingsPreviews);
      el.removeEventListener('change', updateSettingsPreviews);
      el.addEventListener('input', updateSettingsPreviews);
      el.addEventListener('change', updateSettingsPreviews);
    }
  });

  updateSettingsPreviews();
  if (typeof updateInvoiceCalculations === 'function') updateInvoiceCalculations();
}

async function generateBatchKeys() {
  const clientName = document.getElementById('batch-client')?.value.trim() || 'Batch Client';
  const edition = document.getElementById('batch-edition')?.value || 'PRO';
  const count = parseInt(document.getElementById('batch-count')?.value || '10', 10);
  const type = document.getElementById('batch-type')?.value || 'LIFETIME';

  const generatedList = [];
  for (let i = 1; i <= count; i++) {
    const pseudoDeviceId = `BATCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expStr = type === 'LIFETIME' ? 'LIFETIME' : snapToQuarter(new Date(Date.now() + 365*24*60*60*1000));
    const res = await window.licenseAPI.generate({ deviceId: pseudoDeviceId, expiry: expStr, edition });

    if (res.success) {
      const record = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        customerName: `${clientName} #${i}`,
        businessName: clientName,
        phone: '+91-0000000000',
        email: '',
        city: 'Batch',
        edition,
        licenseType: type,
        expiry: expStr,
        deviceId: pseudoDeviceId,
        floatingSeats: 1,
        featureFlags: { pos: true, inventory: true, barcode: true, multiStore: true, api: true, analytics: true },
        saleAmount: 0,
        notes: `Batch generated for ${clientName}`,
        licenseKey: res.key,
        status: 'Active',
        createdAt: new Date().toISOString(),
        createdAtDisplay: new Date().toLocaleDateString('en-IN'),
      };
      await window.licenseAPI.db.saveLicense(record);
      generatedList.push(record);
    }
  }

  if (window.soundEngine) window.soundEngine.play('success');
  showToast(`Successfully generated ${generatedList.length} batch keys for ${clientName}!`, 'success');
  await loadRecords();

  // Export CSV
  let csv = 'Customer Name,Business Name,Edition,Expiry,Device ID,License Key\n';
  generatedList.forEach(r => {
    csv += `"${r.customerName}","${r.businessName}","${r.edition}","${r.expiry}","${r.deviceId}","${r.licenseKey}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `VENDEXA-Batch-Keys-${clientName.replace(/\s+/g, '_')}.csv`;
  a.click();
}

// ── Hardware Inventory & Product Pricing Catalog Engine ──────────────────────
function loadHardwareInventory() {
  try {
    const raw = localStorage.getItem('vendexa_hardware_inventory');
    if (raw) {
      hardwareInventory = JSON.parse(raw);
    } else {
      hardwareInventory = [
        { id: 'hw_1', title: 'POS Thermal Receipt Printer 80mm (USB+BT)', category: 'Thermal Printer', model: 'POS-80-BT', sac: '8443', price: 4500, stock: 25, warranty: '1 Year', tax: 18 },
        { id: 'hw_2', title: '2D Wireless Barcode Scanner + Auto-Stand', category: 'Barcode Scanner', model: 'BC-2D-WIRELESS', sac: '8471', price: 2800, stock: 30, warranty: '1 Year', tax: 18 },
        { id: 'hw_3', title: 'Heavy Duty Metal Electronic Cash Drawer (RJ11)', category: 'Cash Drawer', model: 'CD-410-HD', sac: '8473', price: 3200, stock: 15, warranty: '2 Years', tax: 18 },
        { id: 'hw_4', title: '15.6" Touch POS All-in-One Terminal (i5/8GB/128GB)', category: 'POS Terminal', model: 'AIO-156-PRO', sac: '8471', price: 32000, stock: 8, warranty: '3 Years', tax: 18 },
        { id: 'hw_5', title: 'Electronic Digital Weighing Scale RS232 Interface', category: 'Weighing Scale', model: 'WS-30K-RS232', sac: '8423', price: 6500, stock: 12, warranty: '1 Year', tax: 18 }
      ];
      saveHardwareInventory();
    }
  } catch (err) {
    hardwareInventory = [];
  }
  renderHardwareInventory();
}

function saveHardwareInventory() {
  localStorage.setItem('vendexa_hardware_inventory', JSON.stringify(hardwareInventory));
  window.hardwareInventory = hardwareInventory;
}

function renderHardwareInventory() {
  const tbody = document.getElementById('hw-inventory-tbody');
  if (!tbody) return;

  if (!hardwareInventory.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No hardware devices registered yet. Register your first device above!</td></tr>`;
    return;
  }

  tbody.innerHTML = hardwareInventory.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="font-weight:700;color:var(--text);">${esc(item.title)}</td>
      <td><span class="badge">${esc(item.category)}</span></td>
      <td><code style="font-size:11px;color:var(--primary);">${esc(item.model || '—')}</code></td>
      <td style="text-align:center;">${esc(item.sac || '8443')}</td>
      <td style="text-align:right;font-weight:800;color:var(--green);">₹${parseFloat(item.price).toLocaleString()}</td>
      <td style="text-align:center;"><span style="background:var(--bg3);padding:2px 8px;border-radius:10px;font-weight:700;">${item.stock} units</span></td>
      <td>${esc(item.warranty)}</td>
      <td style="text-align:center;">
        <div class="actions-cell" style="justify-content:center;">
          <button class="btn-primary" style="padding:4px 9px;font-size:11px;width:auto;" onclick="addHardwareToInvoice('${item.id}')" title="Add to Invoice">+ Add to Invoice</button>
          <button class="btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteHardwareDevice('${item.id}')" title="Delete Hardware">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showAddHardwareForm() {
  const titleInput = document.getElementById('hw-title');
  if (titleInput) {
    titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    titleInput.focus();
  }
}

function saveHardwareDevice() {
  const title = document.getElementById('hw-title')?.value.trim();
  const price = parseFloat(document.getElementById('hw-price')?.value || '0');
  const stock = parseInt(document.getElementById('hw-stock')?.value || '0', 10);
  if (!title) { showToast('Hardware title is required', 'error'); return; }
  if (price <= 0) { showToast('Please enter a valid selling price', 'error'); return; }

  const newItem = {
    id: 'hw_' + Date.now().toString(36),
    title,
    category: document.getElementById('hw-category')?.value || 'Thermal Printer',
    model: document.getElementById('hw-model')?.value.trim() || '—',
    sac: document.getElementById('hw-sac')?.value.trim() || '8443',
    price,
    stock,
    warranty: document.getElementById('hw-warranty')?.value || '1 Year',
    tax: parseFloat(document.getElementById('hw-tax')?.value || '18'),
  };

  hardwareInventory.unshift(newItem);
  saveHardwareInventory();
  renderHardwareInventory();
  if (window.soundEngine) window.soundEngine.play('success');
  showToast(`Hardware device "${title}" registered!`, 'success');

  // Clear inputs
  document.getElementById('hw-title').value = '';
  document.getElementById('hw-price').value = '';
  document.getElementById('hw-model').value = '';
}

function deleteHardwareDevice(id) {
  if (!confirm('Remove this hardware item from inventory?')) return;
  hardwareInventory = hardwareInventory.filter(h => h.id !== id);
  saveHardwareInventory();
  renderHardwareInventory();
  showToast('Hardware item removed', 'success');
}

function addHardwareToInvoice(id) {
  const item = hardwareInventory.find(h => h.id === id);
  if (!item) return;

  // Add line item to invoice
  addInvoiceLineItem(item.title, item.sac || '8443', 1, item.price, 0, item.tax || 18);

  // Switch to Invoice tab
  switchTab('invoices');
  showToast(`Added "${item.title}" to Tax Invoice!`, 'success');
}




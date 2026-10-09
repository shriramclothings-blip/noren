// ============================================================
// WHATSAPP SERVICE — VENDEXA RetailOS
// Unified WhatsApp helper: deep links, Business API, in-app WebView
// ============================================================

import { getSetting, setSetting } from '../db/db';

const WA_CONFIG_KEY = 'whatsappConfig';

// ── Default Config ────────────────────────────────────────────────────────
export const DEFAULT_WA_CONFIG = {
  enabled: false,
  mode: 'web',           // 'web' | 'business_api'
  businessPhone: '',
  apiToken: '',
  apiPhoneId: '',
  apiVersion: 'v19.0',
  defaultGreeting: 'Hello! Thank you for your purchase at {businessName}.',
  invoiceTemplate:
    'Hi {customerName},\n\nYour invoice *{invoiceNumber}* is ready! 🎉\n\n' +
    '📦 *Items:* {itemCount}\n' +
    '💰 *Total:* {currency}{total}\n' +
    '📅 *Date:* {date}\n\n' +
    'Thank you for shopping with *{businessName}*! 🙏\n' +
    '_Powered by VENDEXA RetailOS_',
  duesTemplate:
    'Hi {customerName},\n\n' +
    '🔔 Friendly reminder from *{businessName}*:\n\n' +
    'You have an outstanding balance of *{currency}{dues}*.\n\n' +
    'Please clear your dues at your earliest convenience. Thank you! 🙏',
  promotionTemplate:
    'Hi {customerName},\n\n' +
    '🎉 Special offer from *{businessName}*!\n\n' +
    '{promoText}\n\n' +
    'Visit us today! We look forward to seeing you. 😊',
  receiptTemplate:
    'Hi {customerName},\n\n' +
    '🧾 *Receipt — {invoiceNumber}*\n\n' +
    '{itemsList}\n' +
    '───────────────\n' +
    '💰 *Total: {currency}{total}*\n' +
    '💳 Payment: {paymentMode}\n' +
    '📅 {date}\n\n' +
    '*{businessName}*\n{businessPhone}',
  sendOnInvoice: false,
  includeItemsList: true,
  openInApp: true,       // Open WhatsApp inside the app via WebView (Electron)
};

// ── Config persistence ────────────────────────────────────────────────────
export const loadWhatsAppConfig = async () => {
  const stored = await getSetting(WA_CONFIG_KEY);
  return { ...DEFAULT_WA_CONFIG, ...(stored || {}) };
};

export const saveWhatsAppConfig = async (config = {}) => {
  const merged = { ...DEFAULT_WA_CONFIG, ...config };
  merged.enabled         = Boolean(merged.enabled);
  merged.sendOnInvoice   = Boolean(merged.sendOnInvoice);
  merged.includeItemsList = Boolean(merged.includeItemsList);
  merged.openInApp       = Boolean(merged.openInApp);
  merged.businessPhone   = String(merged.businessPhone || '').replace(/\D/g, '');
  merged.apiToken        = String(merged.apiToken || '').trim();
  merged.apiPhoneId      = String(merged.apiPhoneId || '').trim();
  await setSetting(WA_CONFIG_KEY, merged);
  return merged;
};

// ── Template engine ───────────────────────────────────────────────────────
export const fillTemplate = (template, vars = {}) => {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`
  );
};

// ── Phone normalizer ──────────────────────────────────────────────────────
export const normalizePhone = (phone = '') => {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) digits = '91' + digits;
  return digits;
};

// ── Build WhatsApp Web URL ────────────────────────────────────────────────
export const buildWaLink = (phone, text = '') => {
  const p = normalizePhone(phone);
  if (!p) return null;
  return `https://web.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(text)}`;
};

// ── Build wa.me deep link (mobile-friendly fallback) ─────────────────────
export const buildWaMeLink = (phone, text = '') => {
  const p = normalizePhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};

// ── Open WhatsApp — respects openInApp setting ────────────────────────────
// When openInApp=true + Electron: dispatches a custom event that the
// WhatsAppWebView component listens to — it opens inside the app.
// Fallback: opens in OS browser.
export const openWhatsApp = (phone, text = '', openInApp = true) => {
  const link = buildWaLink(phone, text);
  if (!link) return { success: false, error: 'Invalid phone number' };

  try {
    if (openInApp && typeof window !== 'undefined') {
      // Dispatch event — WhatsAppWebViewModal listens to this
      window.dispatchEvent(new CustomEvent('wa:open', { detail: { url: link, phone, text } }));
      return { success: true, link };
    }
    // Fallback: OS browser via Electron shell or window.open
    const waMe = buildWaMeLink(phone, text) || link;
    if (window?.electronAPI?.openExternal) {
      window.electronAPI.openExternal(waMe);
    } else {
      window.open(waMe, '_blank', 'noopener,noreferrer');
    }
    return { success: true, link };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ── Build invoice message (auto-populates all fields) ─────────────────────
export const buildInvoiceMessage = (config, invoice, customer, company) => {
  const items = invoice?.items || [];
  const itemsList = config.includeItemsList && items.length
    ? items.map((it, i) =>
        `  ${i + 1}. ${it.name || 'Item'} ×${it.qty} — ${company?.currency || '₹'}${Number(it.total || 0).toFixed(2)}`
      ).join('\n')
    : '';

  const vars = {
    customerName:  customer?.name || invoice?.customerName || 'Customer',
    businessName:  company?.name || 'Store',
    businessPhone: company?.phone || '',
    invoiceNumber: invoice?.invoiceNumber || String(invoice?.id || ''),
    itemCount:     items.length,
    currency:      company?.currency || '₹',
    total:         Number(invoice?.total || 0).toFixed(2),
    date:          invoice?.date
      ? new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN'),
    paymentMode:   invoice?.paymentMode || '',
    itemsList,
  };

  const template = config.receiptTemplate || config.invoiceTemplate;
  return fillTemplate(template, vars);
};

// ── Build dues reminder message ───────────────────────────────────────────
export const buildDuesMessage = (config, customer, company) => {
  const vars = {
    customerName: customer?.name || 'Customer',
    businessName: company?.name || 'Store',
    currency:     company?.currency || '₹',
    dues:         Number(customer?.dues || 0).toFixed(2),
  };
  return fillTemplate(config.duesTemplate, vars);
};

// ── Send via WhatsApp Business API ────────────────────────────────────────
export const sendViaBusinessAPI = async (config, toPhone, messageText) => {
  const { apiToken, apiPhoneId, apiVersion = 'v19.0' } = config;
  if (!apiToken || !apiPhoneId) return { success: false, error: 'API token and Phone ID required.' };
  const phone = normalizePhone(toPhone);
  if (!phone) return { success: false, error: 'Invalid recipient phone number.' };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${apiPhoneId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { preview_url: false, body: messageText },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) return { success: false, error: data?.error?.message || `API error (${response.status})` };
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: err.message || 'Network error' };
  }
};

// ── High-level: send invoice notification ─────────────────────────────────
export const sendInvoiceWhatsApp = async (config, invoice, customer, company) => {
  if (!config?.enabled) return { success: false, error: 'WhatsApp not enabled.' };
  const phone = customer?.phone || invoice?.customerPhone;
  if (!phone) return { success: false, error: 'No phone number for this customer.' };
  const message = buildInvoiceMessage(config, invoice, customer, company);
  if (config.mode === 'business_api') return sendViaBusinessAPI(config, phone, message);
  return openWhatsApp(phone, message, config.openInApp !== false);
};

// ── High-level: send dues reminder ───────────────────────────────────────
export const sendDuesReminder = async (config, customer, company) => {
  if (!config?.enabled) return { success: false, error: 'WhatsApp not enabled.' };
  const phone = customer?.phone;
  if (!phone) return { success: false, error: 'No phone number.' };
  if (!customer?.dues || Number(customer.dues) <= 0) return { success: false, error: 'No outstanding dues.' };
  const message = buildDuesMessage(config, customer, company);
  if (config.mode === 'business_api') return sendViaBusinessAPI(config, phone, message);
  return openWhatsApp(phone, message, config.openInApp !== false);
};

// ── High-level: send custom message ──────────────────────────────────────
export const sendCustomMessage = async (config, phone, message) => {
  if (!config?.enabled) return { success: false, error: 'WhatsApp not enabled.' };
  if (!phone) return { success: false, error: 'Phone number required.' };
  if (config.mode === 'business_api') return sendViaBusinessAPI(config, phone, message);
  return openWhatsApp(phone, message, config.openInApp !== false);
};

// ── Test Business API connection ──────────────────────────────────────────
export const testBusinessAPIConnection = async (config) => {
  const { apiToken, apiPhoneId, apiVersion = 'v19.0' } = config || {};
  if (!apiToken) return { success: false, error: 'API token required.' };
  if (!apiPhoneId) return { success: false, error: 'Phone Number ID required.' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${apiPhoneId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${apiToken}` }, signal: controller.signal }
    );
    clearTimeout(timer);
    const data = await response.json();
    if (!response.ok) return { success: false, error: data?.error?.message || `HTTP ${response.status}` };
    return { success: true, displayPhone: data.display_phone_number, verifiedName: data.verified_name };
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, error: 'Request timed out.' };
    return { success: false, error: err.message };
  }
};

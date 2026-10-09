// ============================================================
// INVOICE SEND SERVICE — VENDEXA RetailOS
// Handles PDF generation + WhatsApp sharing for invoices
// Supports: single customer, dual customer (copy to second number)
// ============================================================

import { generateInvoicePrintHTML } from './helpers';
import { normalizePhone, buildWaMeLink, buildWaLink } from './whatsappService';
import { getSetting, setSetting } from '../db/db';

const INVOICE_SEND_SETTINGS_KEY = 'invoiceSendSettings';

// ── Default Invoice Send Settings ────────────────────────────────────────
export const DEFAULT_INVOICE_SEND_SETTINGS = {
  greetingMessage: 'Dear {customerName}, thank you for shopping with *{businessName}*! 🙏',
  messageBody:
    'Please find your invoice *{invoiceNumber}* attached.\n\n' +
    '📦 Items: {itemCount}\n' +
    '💰 Total: {currency}{total}\n' +
    '📅 Date: {date}\n' +
    '💳 Payment: {paymentMode}',
  messageFooter: 'For any queries, feel free to contact us. We look forward to serving you again! 😊',
  includeItemsList: false,
  autoSendOnCheckout: false,
  secondRecipientEnabled: false,
  secondRecipientPhone: '',
  secondRecipientLabel: 'Store Copy',
  pdfFormat: 'a4',
  showPdfPreview: true,
};

// ── Persistence ───────────────────────────────────────────────────────────
export const loadInvoiceSendSettings = async () => {
  const stored = await getSetting(INVOICE_SEND_SETTINGS_KEY);
  return { ...DEFAULT_INVOICE_SEND_SETTINGS, ...(stored || {}) };
};

export const saveInvoiceSendSettings = async (settings = {}) => {
  const merged = { ...DEFAULT_INVOICE_SEND_SETTINGS, ...settings };
  await setSetting(INVOICE_SEND_SETTINGS_KEY, merged);
  return merged;
};

// ── Template variable replacement ─────────────────────────────────────────
export const fillInvoiceTemplate = (template, invoice, customer, company) => {
  if (!template) return '';
  const items = invoice?.items || [];
  const itemsList = items.length
    ? items.map((it, i) =>
        `  ${i + 1}. ${it.name || 'Item'} ×${Number(it.qty || 0)} — ${company?.currency || '₹'}${Number(it.total || (it.qty || 0) * (it.price || 0)).toFixed(2)}`
      ).join('\n')
    : '';

  const vars = {
    customerName: customer?.name || invoice?.customerName || 'Customer',
    businessName: company?.name || 'Store',
    businessPhone: company?.phone || '',
    invoiceNumber: invoice?.invoiceNumber || String(invoice?.id || ''),
    itemCount: items.length,
    currency: company?.currency || '₹',
    total: Number(invoice?.total || 0).toFixed(2),
    subtotal: Number(invoice?.subtotal || 0).toFixed(2),
    tax: Number(invoice?.taxAmt || 0).toFixed(2),
    discount: Number(invoice?.discountAmt || 0).toFixed(2),
    date: invoice?.date
      ? new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN'),
    paymentMode: invoice?.paymentMode || 'Cash',
    itemsList,
  };

  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`
  );
};

// ── Build the full WhatsApp message ───────────────────────────────────────
export const buildInvoiceSendMessage = (settings, invoice, customer, company) => {
  const cfg = { ...DEFAULT_INVOICE_SEND_SETTINGS, ...(settings || {}) };
  const parts = [];

  if (cfg.greetingMessage?.trim())
    parts.push(fillInvoiceTemplate(cfg.greetingMessage, invoice, customer, company));

  if (cfg.messageBody?.trim())
    parts.push(fillInvoiceTemplate(cfg.messageBody, invoice, customer, company));

  if (cfg.includeItemsList) {
    const items = invoice?.items || [];
    if (items.length) {
      const lines = items.map((it, i) =>
        `  ${i + 1}. ${it.name || 'Item'} ×${Number(it.qty || 0)} — ${company?.currency || '₹'}${Number(it.total || (it.qty || 0) * (it.price || 0)).toFixed(2)}`
      ).join('\n');
      parts.push('*Items:*\n' + lines);
    }
  }

  if (cfg.messageFooter?.trim())
    parts.push(fillInvoiceTemplate(cfg.messageFooter, invoice, customer, company));

  return parts.join('\n\n');
};

// ── Generate PDF in temp dir (Electron only) ──────────────────────────────
export const generateInvoicePDFToTemp = async (invoice, company, format = 'a4', printSettings = null) => {
  if (!window?.electronAPI?.savePDFToTemp) {
    return { success: false, error: 'PDF temp save not available in this environment.' };
  }
  try {
    const html = generateInvoicePrintHTML(invoice, company, format, { printSettings });
    const filename = `invoice-${(invoice?.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    return await window.electronAPI.savePDFToTemp({ html, filename });
  } catch (err) {
    return { success: false, error: err?.message || 'PDF generation failed' };
  }
};

// ── Open WhatsApp in-app panel with message ───────────────────────────────
export const openWhatsAppForInvoice = (phone, message) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return { success: false, error: 'Invalid phone number' };
  const link = buildWaLink(phone, message);
  if (!link) return { success: false, error: 'Could not build WhatsApp link' };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wa:open', { detail: { url: link, phone, text: message } }));
  }
  return { success: true, link };
};

// ── Open WhatsApp externally in OS browser ────────────────────────────────
export const openWhatsAppExternalForInvoice = (phone, message) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return { success: false, error: 'Invalid phone number' };
  const link = buildWaMeLink(phone, message);
  if (!link) return { success: false, error: 'Could not build WhatsApp link' };
  if (window?.electronAPI?.openExternal) {
    window.electronAPI.openExternal(link);
  } else {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
  return { success: true, link };
};

// ── High-level: send invoice to one or two recipients ─────────────────────
export const sendInvoiceViaWhatsApp = async ({
  invoice, customer, company, sendSettings,
  recipients, openInApp = true,
}) => {
  const cfg = { ...DEFAULT_INVOICE_SEND_SETTINGS, ...(sendSettings || {}) };
  const message = buildInvoiceSendMessage(cfg, invoice, customer, company);

  const targets = [];
  if (recipients && recipients.length) {
    targets.push(...recipients.filter((r) => r.phone?.trim()));
  } else {
    const primaryPhone = customer?.phone || invoice?.customerPhone;
    if (primaryPhone) targets.push({ phone: primaryPhone, label: customer?.name || 'Customer' });
    if (cfg.secondRecipientEnabled && cfg.secondRecipientPhone) {
      targets.push({ phone: cfg.secondRecipientPhone, label: cfg.secondRecipientLabel || 'Store Copy' });
    }
  }

  if (!targets.length) return [{ success: false, error: 'No phone numbers available.' }];

  const results = [];
  for (const target of targets) {
    try {
      const result = openInApp
        ? openWhatsAppForInvoice(target.phone, message)
        : openWhatsAppExternalForInvoice(target.phone, message);
      results.push({ ...target, ...result });
      if (targets.length > 1) await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      results.push({ ...target, success: false, error: err.message });
    }
  }
  return results;
};

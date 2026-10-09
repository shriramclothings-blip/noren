import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import bwipjs from 'bwip-js';
import { normalizeBarcodeFormat } from './barcodeEngine';
import { sanitizePrintSettings } from './printSettingsStore';

// Payment modes used across POS, partition modal, and reports
export const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Credit', 'Cheque', 'Net Banking', 'Split'];

export const formatCurrency = (amount, symbol = '₹') =>
  `${symbol}${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export const getCustomerBehaviorLabel = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'genuine') return 'Genuine Customer';
  if (normalized === 'bargain') return 'Bargain Customer';
  return 'Regular Customer';
};

export const getCustomerBehaviorBadgeClass = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'genuine') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (normalized === 'bargain') return 'bg-red-100 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-600 border border-gray-200';
};

function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generate the next invoice number based on existing invoices.
// This avoids duplicates when invoices are deleted/returned/imported.
export const generateInvoiceNumber = (invoices, prefix = 'INV') => {
  const p = String(prefix || 'INV').trim() || 'INV';
  const re = new RegExp(`^${escapeRegExp(p)}-(\\d+)$`, 'i');
  let max = 0;

  for (const inv of invoices || []) {
    const num = String(inv?.invoiceNumber || '');
    const m = num.match(re);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }

  const next = max + 1;
  return `${p}-${String(next).padStart(5, '0')}`;
};

// Industrial fixed-amount discount calculation (₹ discount amount, NOT percentage).
// Keeps all calculations 100% accurate and allocates discount proportionally for mixed-tax carts.
export const calcInvoiceTotals = (items, discountAmount = 0, taxRate = 18) => {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  const defaultRate = Math.max(0, Number(taxRate) || 0);

  const normalized = (items || []).map((i) => {
    const qty = Math.max(0, Number(i.qty) || 0);
    const price = Math.max(0, Number(i.price) || 0);
    const lineSubtotal = round2(qty * price);
    const rate = Math.max(0, Number(i.taxRate ?? defaultRate) || 0);
    return { ...i, qty, price, lineSubtotal, taxRate: rate };
  });

  const subtotal = round2(normalized.reduce((s, i) => s + i.lineSubtotal, 0));
  const safeDiscountAmt = Math.max(0, Number(discountAmount) || 0);
  const discountAmt = round2(Math.min(safeDiscountAmt, subtotal));
  const taxable = round2(subtotal - discountAmt);

  // Allocate discount proportionally across line items for correct mixed-tax calculations
  const breakdownMap = new Map(); // rate -> { rate, taxable, tax }
  let taxAmt = 0;

  for (const item of normalized) {
    const share = subtotal > 0 ? item.lineSubtotal / subtotal : 0;
    const lineDiscount = round2(discountAmt * share);
    const lineTaxable = round2(item.lineSubtotal - lineDiscount);
    const lineTax = round2((lineTaxable * item.taxRate) / 100);
    taxAmt = round2(taxAmt + lineTax);

    const prev = breakdownMap.get(item.taxRate) || { rate: item.taxRate, taxable: 0, tax: 0 };
    breakdownMap.set(item.taxRate, {
      rate: item.taxRate,
      taxable: round2(prev.taxable + lineTaxable),
      tax: round2(prev.tax + lineTax),
    });
  }

  const taxBreakdown = Array.from(breakdownMap.values()).sort((a, b) => a.rate - b.rate);
  const total = round2(taxable + taxAmt);

  return { subtotal, discountAmt, taxable, taxAmt, total, taxBreakdown };
};

export const generateBarcodeSVG = (value, format = 'CODE128') => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: normalizeBarcodeFormat(format), width: 2, height: 50, displayValue: true, fontSize: 12 });
    return canvas.toDataURL('image/png');
  } catch { return null; }
};

export const generateBarcodeImage = (value, width = 80, height = 40, format = 'CODE128') => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: normalizeBarcodeFormat(format), width: 1.5, height, displayValue: false });
    return canvas.toDataURL('image/png');
  } catch { return null; }
};

// High-quality barcode for invoices / print-to-PDF (better scan reliability)
function generateInvoiceBarcodeImage(value) {
  try {
    if (!value) return null;
    const canvas = document.createElement('canvas');
    // Render with a slightly thicker bar width for label/receipt scanners
    JsBarcode(canvas, String(value), {
      format: 'CODE128',
      width: 2.2,
      height: 60,
      displayValue: false,
      margin: 0,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

// Professional invoice PDF generator supporting A4 and thermal formats with proper branding
export const generateInvoicePDF = (invoice, company, format = 'a4') => {
  const doc = format === 'thermal' ? new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 200] }) : new jsPDF();
  const { 
    name = 'VENDEXA RetailOS™', 
    address = '', phone = '', email = '', gstin = '', 
    currency = '₹', invoiceNote = 'Thank you for your business!', 
    terms = '', cashierName = '' 
  } = company || {};
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = format === 'thermal' ? 3 : 14;
  const contentWidth = pageWidth - (margin * 2);
  const currencySymbol = currency || '₹';
  const totalItemsQty = Number(invoice?.totalItemsQty) || (invoice?.items || []).reduce((s, it) => s + (Number(it?.qty) || 0), 0);
  
  let y = margin;

  if (format === 'a4') {
    // ===== A4 PROFESSIONAL INVOICE FORMAT =====
    
    // Header with blue background
    doc.setFillColor(25, 85, 175);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    
    // Logo placeholder - centered
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(name, pageWidth / 2, 10, { align: 'center' });
    
    // Company details under name
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const companyDetails = [
      address && `📍 ${address}`,
      phone && `📞 ${phone}`,
      email && `📧 ${email}`,
      gstin && `GST: ${gstin}`
    ].filter(Boolean).join('  |  ');
    
    if (companyDetails) {
      const lines = doc.splitTextToSize(companyDetails, contentWidth);
      doc.text(lines, pageWidth / 2, 18, { align: 'center', maxWidth: contentWidth });
    }
    
    y = 42;
    
    // Invoice title and details in a box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(margin, y - 3, contentWidth, 22);
    
    doc.setTextColor(25, 85, 175);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    // Label: INVOICE / RETURN / EXCHANGE based on returnTag or status
    let invoiceLabel = 'INVOICE';
    if (invoice?.returnTag === 'exchange' || invoice?.returnTag === 'partial-exchange' || invoice?.status === 'Exchange') {
      invoiceLabel = 'EXCHANGE INVOICE';
      doc.setTextColor(120, 0, 180);
    } else if (invoice?.returnTag === 'return' || invoice?.returnTag === 'full-return' || invoice?.returnTag === 'partial-return' || invoice?.status === 'Refund') {
      invoiceLabel = 'RETURN / CREDIT NOTE';
      doc.setTextColor(200, 60, 0);
    } else if (invoice?.originalInvoiceNumber) {
      invoiceLabel = 'RETURN INVOICE';
      doc.setTextColor(200, 60, 0);
    }
    doc.text(invoiceLabel, margin + 5, y + 2);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const invoiceNo = `No. ${invoice.invoiceNumber || 'N/A'}`;
    doc.text(invoiceNo, pageWidth - margin - 5, y + 2, { align: 'right' });
    
    const invoiceDate = `Date: ${formatDateTime(invoice.date)}`;
    doc.text(invoiceDate, pageWidth - margin - 5, y + 8, { align: 'right' });
    
    const paymentModeLabel = `Payment Mode: ${invoice.paymentMode || 'Cash'}`;
    doc.text(paymentModeLabel, pageWidth - margin - 5, y + 14, { align: 'right' });

    // Reference to original invoice (for returns/exchanges)
    if (invoice?.originalInvoiceNumber) {
      doc.setFontSize(8);
      doc.setTextColor(150, 60, 0);
      doc.text(`Ref. Original Invoice: ${invoice.originalInvoiceNumber}`, pageWidth - margin - 5, y + 18, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }

    // Payment breakdown (Split / Partition payment)
    const breakdown = Array.isArray(invoice?.paymentBreakdown) ? invoice.paymentBreakdown : [];
    if (breakdown.length > 0) {
      doc.setFontSize(8);
      const lines = breakdown.map((p) => `${p.method}: ${formatAmount(p.amount, currencySymbol)}`);
      doc.text(lines, pageWidth - margin - 5, y + 18, { align: 'right' });
    }
    
    // Always include an invoice barcode on the printed invoice
    const invoiceBarcodeValue = invoice?.invoiceBarcode || invoice?.invoiceNumber || '';
    if (invoiceBarcodeValue) {
      doc.setFontSize(8);
      doc.text(`Invoice Barcode: ${invoiceBarcodeValue}`, margin + 5, y + 8);
    }
    
    y += 26;
    
    // Bill To section
    const isWalkin = !invoice.customerName || invoice.customerName === 'Walking Customer';
    if (!isWalkin) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(25, 85, 175);
      doc.text('BILL TO:', margin, y);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      y += 5;
      doc.text(invoice.customerName || 'Customer', margin, y);
      y += 4;
      
      if (invoice.customerPhone) {
        doc.text(`Phone: ${invoice.customerPhone}`, margin, y);
        y += 4;
      }
      if (invoice.customerAddress) {
        const addrLines = doc.splitTextToSize(invoice.customerAddress, contentWidth - 10);
        doc.text(addrLines, margin, y);
        y += addrLines.length * 4;
      }
      y += 3;
    }
    
    // Items table header
    doc.setDrawColor(25, 85, 175);
    doc.setLineWidth(1);
    doc.setFillColor(240, 245, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(25, 85, 175);
    
    const tableY = y;
    doc.rect(margin, tableY, contentWidth, 6, 'F');
    
    doc.text('#', margin + 1, tableY + 4);
    doc.text('Item Description', margin + 8, tableY + 4);
    doc.text('Barcode/SKU', pageWidth - margin - 50, tableY + 4);
    doc.text('Qty', pageWidth - margin - 25, tableY + 4, { align: 'center' });
    doc.text('Rate', pageWidth - margin - 15, tableY + 4, { align: 'right' });
    doc.text('Tax%', pageWidth - margin - 8, tableY + 4, { align: 'right' });
    doc.text('Amount', pageWidth - margin - 1, tableY + 4, { align: 'right' });
    
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;
    
    // Items
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    invoice.items.forEach((item, idx) => {
      const barcodeSKU = item.barcode || item.sku || '—';
      const rate = formatAmount(item.price, currencySymbol);
      const amount = formatAmount((item.price || 0) * (item.qty || 0), currencySymbol);
      const tax = item.taxRate || 0;
      
      doc.text(String(idx + 1), margin + 1, y);
      const nameLines = doc.splitTextToSize(item.name || 'Product', 25);
      doc.text(nameLines[0], margin + 8, y);
      if (nameLines.length > 1) {
        doc.setFontSize(7);
        doc.text(nameLines.slice(1), margin + 8, y + 3);
        doc.setFontSize(8);
        y += nameLines.length * 2;
      }
      
      doc.text(barcodeSKU, pageWidth - margin - 50, y);
      doc.text(String(item.qty || 0), pageWidth - margin - 25, y, { align: 'center' });
      doc.text(rate, pageWidth - margin - 15, y, { align: 'right' });
      doc.text(`${tax}%`, pageWidth - margin - 8, y, { align: 'right' });
      doc.text(amount, pageWidth - margin - 1, y, { align: 'right' });
      
      y += 4;
      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }
    });
    
    // Totals section
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    const totalsX = pageWidth - margin - 5;
    const labelX = pageWidth - margin - 30;
    
    doc.text('Total Items:', labelX, y, { align: 'right' });
    doc.text(String(totalItemsQty), totalsX, y, { align: 'right' });
    y += 5;

    doc.text('Subtotal:', labelX, y, { align: 'right' });
    doc.text(formatAmount(invoice.subtotal, currencySymbol), totalsX, y, { align: 'right' });
    y += 5;
    
    if ((invoice.discountAmt || 0) > 0) {
      doc.text('Discount:', labelX, y, { align: 'right' });
      doc.text(`-${formatAmount(invoice.discountAmt || 0, currencySymbol)}`, totalsX, y, { align: 'right' });
      y += 5;
    }
    
    doc.text(`GST/Tax (${invoice.taxRate || 0}%):`, labelX, y, { align: 'right' });
    doc.text(formatAmount(invoice.taxAmt || 0, currencySymbol), totalsX, y, { align: 'right' });
    y += 6;
    
    // Grand Total (highlighted)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(25, 85, 175);
    doc.setLineWidth(1);
    doc.rect(labelX - 50, y - 3, 55, 8, 'F');
    doc.rect(labelX - 50, y - 3, 55, 8);
    
    doc.text('GRAND TOTAL:', labelX, y + 1, { align: 'right' });
    doc.text(formatAmount(invoice.total || 0, currencySymbol), totalsX, y + 1, { align: 'right' });
    
    y += 12;
    
    // Footer section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    
    const footerItems = [];
    if (invoice.paymentMode) footerItems.push(`Payment Mode: ${invoice.paymentMode}`);
    if (cashierName) footerItems.push(`Cashier: ${cashierName}`);
    if (invoice.notes) footerItems.push(`Note: ${invoice.notes}`);
    
    if (footerItems.length > 0) {
      footerItems.forEach(item => {
        doc.text(item, margin, y);
        y += 4;
      });
      y += 2;
    }
    
    // Thank you message
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(25, 85, 175);
    doc.text(invoiceNote || 'Thank you for your business!', pageWidth / 2, y, { align: 'center' });
    y += 6;
    
    // Terms if available
    if (terms) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const termLines = doc.splitTextToSize(`Terms & Conditions: ${terms}`, contentWidth);
      doc.text(termLines, margin, y);
    }
    
  } else {
    // ===== THERMAL PRINTER FORMAT (58mm or 80mm) =====
    
    const isWalkin = !invoice.customerName || invoice.customerName === 'Walking Customer';

    // Compact header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(name, pageWidth / 2, y, { align: 'center' });
    y += 5;
    
    
    // Company details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    if (gstin) doc.text(`GSTIN: ${gstin}`, pageWidth / 2, y, { align: 'center' });
    y += 3;
    if (phone) doc.text(`Ph: ${phone}`, pageWidth / 2, y, { align: 'center' });
    y += 3;
    
    // Separator
    doc.setDrawColor(0, 0, 0);
    doc.line(1, y, pageWidth - 1, y);
    y += 3;
    
    // Invoice info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    // Show Return / Exchange label on thermal receipt
    const isReturnInv = invoice?.returnTag?.includes('return') || invoice?.status === 'Refund' || invoice?.originalInvoiceNumber;
    const isExchangeInv = invoice?.returnTag === 'exchange' || invoice?.returnTag === 'partial-exchange' || invoice?.status === 'Exchange';
    if (isExchangeInv) {
      doc.setTextColor(120, 0, 180);
      doc.text('*** EXCHANGE INVOICE ***', pageWidth / 2, y, { align: 'center' });
      y += 3;
      doc.setTextColor(0, 0, 0);
    } else if (isReturnInv) {
      doc.setTextColor(180, 0, 0);
      doc.text('*** RETURN / CREDIT NOTE ***', pageWidth / 2, y, { align: 'center' });
      y += 3;
      doc.setTextColor(0, 0, 0);
    }
    doc.text(`Invoice: ${invoice.invoiceNumber}`, margin, y);
    y += 3;

    // Show original invoice reference on thermal
    if (invoice?.originalInvoiceNumber) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 60, 0);
      doc.text(`Ref: ${invoice.originalInvoiceNumber}`, margin, y);
      y += 3;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
    }
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoice.date), margin, y);
    doc.text(formatDateTime(invoice.date).split(' ')[1] || '', pageWidth / 2, y, { align: 'center' });
    y += 3;
    
    if (!isWalkin) {
      doc.text(`Customer: ${invoice.customerName}`, margin, y);
      y += 3;
    }

    // Always print a barcode on thermal receipt (scannable)
    const invoiceBarcodeValue = invoice?.invoiceBarcode || invoice?.invoiceNumber || '';
    const invoiceBarcodeImg = invoiceBarcodeValue ? generateInvoiceBarcodeImage(invoiceBarcodeValue) : null;
    if (invoiceBarcodeImg) {
      doc.addImage(invoiceBarcodeImg, 'PNG', margin, y, contentWidth, 14);
      y += 16;
      doc.setFontSize(7);
      doc.text(String(invoiceBarcodeValue), pageWidth / 2, y, { align: 'center' });
      y += 3;
    }
    
    // Separator
    doc.line(1, y, pageWidth - 1, y);
    y += 2;
    
    // Items compact format
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    
    invoice.items.forEach((item) => {
      const itemText = `${item.name}`;
      const nameLines = doc.splitTextToSize(itemText, contentWidth - 4);
      doc.text(nameLines[0], margin, y);
      y += 3;
      
      const qtyPrice = `${item.qty}x ${formatAmount(item.price, currencySymbol)} = ${formatAmount((item.price || 0) * (item.qty || 0), currencySymbol)}`;
      doc.text(qtyPrice, margin + 2, y);
      y += 3;
    });
    
    // Separator
    doc.line(1, y, pageWidth - 1, y);
    y += 2;
    
    // Totals
    doc.setFontSize(7);
    doc.text('Subtotal:', margin, y);
    doc.text(formatAmount(invoice.subtotal, currencySymbol), pageWidth - margin, y, { align: 'right' });
    y += 2;
    
    if ((invoice.discountAmt || 0) > 0) {
      doc.text('Discount:', margin, y);
      doc.text(`-${formatAmount(invoice.discountAmt || 0, currencySymbol)}`, pageWidth - margin, y, { align: 'right' });
      y += 2;
    }
    
    doc.text(`Tax(${invoice.taxRate}%):`, margin, y);
    doc.text(formatAmount(invoice.taxAmt || 0, currencySymbol), pageWidth - margin, y, { align: 'right' });
    y += 3;
    
    // Total Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Total Items: ${totalItemsQty}`, margin, y);
    y += 3;

    // Payment breakdown (if present)
    const breakdown = Array.isArray(invoice?.paymentBreakdown) ? invoice.paymentBreakdown : [];
    if (breakdown.length > 0) {
      doc.text('Payment:', margin, y);
      y += 3;
      breakdown.forEach((p) => {
        doc.text(`${p.method} ${formatAmount(p.amount, currencySymbol)}`, margin + 2, y);
        y += 3;
      });
    }

    // Grand total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL:', margin, y);
    doc.text(formatAmount(invoice.total || 0, currencySymbol), pageWidth - margin, y, { align: 'right' });
    y += 4;
    
    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceNote || 'Thank you!', pageWidth / 2, y, { align: 'center' });
  }

  return doc;
};

// Helper to format amount with currency symbol
function formatAmount(amount, symbol = '₹') {
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function applyQrTemplate(template, invoice) {
  const t = String(template || '{invoiceNumber}');
  const result = t
    .replaceAll('{invoiceNumber}', String(invoice?.invoiceNumber || ''))
    .replaceAll('{total}', String(invoice?.total ?? ''))
    .replaceAll('{date}', String(invoice?.date || ''))
    .trim();
  return result || String(invoice?.invoiceNumber || '');
}

function generateInvoiceQrSvgMarkup(value, sizePx = 120) {
  try {
    const v = String(value || '').trim();
    if (!v) return '';
    return renderToStaticMarkup(
      React.createElement(QRCodeSVG, {
        value: v,
        size: sizePx,
        level: 'M',
        includeMargin: false,
      })
    );
  } catch {
    return '';
  }
}

function toBase64Utf8(str) {
  try {
    return btoa(unescape(encodeURIComponent(String(str ?? ''))));
  } catch {
    // Fallback (best-effort)
    try { return btoa(String(str ?? '')); } catch { return ''; }
  }
}

function buildInvoiceFullBarcodePayload(invoice, company) {
  const cur = company?.currency || '₹';
  const items = (invoice?.items || []).map((it) => ({
    n: String(it?.name || '').slice(0, 60),
    q: Number(it?.qty) || 0,
    p: Number(it?.price) || 0,
    t: Number(it?.taxRate) || 0,
    b: String(it?.barcode || it?.sku || '').slice(0, 40),
  }));

  const payload = {
    v: 1,
    no: String(invoice?.invoiceNumber || ''),
    dt: String(invoice?.date || ''),
    cust: String(invoice?.customerName || ''),
    ph: String(invoice?.customerPhone || ''),
    addr: String(invoice?.customerAddress || '').slice(0, 120),
    pay: String(invoice?.paymentMode || ''),
    cur,
    sub: Number(invoice?.subtotal) || 0,
    disc: Number(invoice?.discount) || 0,
    discAmt: Number(invoice?.discountAmt) || 0,
    taxRate: Number(invoice?.taxRate) || 0,
    taxAmt: Number(invoice?.taxAmt) || 0,
    total: Number(invoice?.total) || 0,
    items,
  };

  const json = JSON.stringify(payload);
  const b64 = toBase64Utf8(json);
  // Prefix so your software (or any scanner app) can detect what it is.
  return `VENDEXAINV1:${b64}`;
}

function generatePdf417BarcodeImage(value, format = 'a4') {
  try {
    const v = String(value || '').trim();
    if (!v) return null;
    const canvas = document.createElement('canvas');
    // PDF417 is a 2D barcode that can store long strings (full invoice + items).
    bwipjs.toCanvas(canvas, {
      bcid: 'pdf417',
      text: v,
      scale: format === 'thermal' ? 1.8 : 2.2,
      // These help keep the barcode reasonably sized:
      columns: format === 'thermal' ? 3 : 5,
      eclevel: 4,
      includetext: false,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function fromBase64Utf8(b64) {
  try {
    // b64 -> bytes -> utf8 string
    return decodeURIComponent(escape(atob(String(b64 || ''))));
  } catch {
    try { return atob(String(b64 || '')); } catch { return ''; }
  }
}

// Decode a scanned "full invoice" barcode text.
// Returns: { ok, invoiceNumber, payload, error }
export function decodeFullInvoiceBarcode(scannedText) {
  try {
    const raw = String(scannedText || '').trim();
    if (!raw) return { ok: false, error: 'Empty scan' };

    // Format: VENDEXAINV1:<base64(json)>
    if (raw.startsWith('VENDEXAINV1:')) {
      const b64 = raw.slice('VENDEXAINV1:'.length).trim();
      const json = fromBase64Utf8(b64);
      if (!json) return { ok: false, error: 'Invalid barcode data' };
      const payload = JSON.parse(json);
      const invoiceNumber = String(payload?.no || payload?.invoiceNumber || '').trim();
      return { ok: true, invoiceNumber, payload };
    }

    // Not a full-data barcode; treat as normal invoice number/barcode
    return { ok: true, invoiceNumber: raw, payload: null };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export function broadcastCustomerDisplayState(payload) {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('pos-customer-display');
      channel.postMessage(payload);
      channel.close();
      return;
    } catch {
      // fallback to localStorage below
    }
  }

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem('pos-customer-display', JSON.stringify(payload));
    } catch {
      // ignore write errors
    }
  }
}

export function generateInvoicePrintHTML(invoice, company, format = 'a4', options = {}) {
  const activePrintSettings = sanitizePrintSettings({
    ...(company?.printSettings || {}),
    ...(options?.printSettings || {}),
  });

  // Load text styles from options or use defaults
  const { mergeInvoiceTextStyles, getInlineStyle } = require('./invoiceTextStyles');
  const textStyles = mergeInvoiceTextStyles(options?.invoiceTextStyles || company?.invoiceTextStyles);

  const currencySymbol = company?.currency || '₹';
  const name = company?.name || 'VENDEXA RetailOS™';
  const address = company?.address || '';
  const phone = company?.phone || '';
  const gstin = company?.gstin || '';
  const terms = String(company?.terms || invoice?.terms || '').trim();
  const footerMessageRaw = String(company?.invoiceNote || invoice?.invoiceNote || 'Thank you for your business!').trim();

  const billPrintSettings = activePrintSettings.billPrint || {};
  const layout = billPrintSettings.layout || {};
  const typography = billPrintSettings.typography || {};
  const custom = billPrintSettings.custom || {};
  const thermalOptimization = billPrintSettings.thermalOptimization || {};

  const paperPreset = billPrintSettings.paperPreset || 'thermal80';
  // For PDF generation (a4 format override), always use a safe page preset
  const effectivePreset = format === 'a4' ? 'a4' : paperPreset;
  const rawMargins = Number(custom.marginsMm ?? 3);
  const fontSizePt = Number(typography.fontSizePt || 10);
  const lineSpacing = Number(typography.lineSpacing || 1.2);
  const headerAlign = typography.headerAlign || 'center';
  const tableAlign = typography.tableAlign || 'left';

  const showLogo = layout.showLogo !== undefined ? layout.showLogo : company?.showLogo !== false;
  const showGstNumber = layout.showGstNumber !== undefined ? layout.showGstNumber : true;
  const showBarcode = layout.showBarcode !== undefined ? layout.showBarcode : true;
  const showQrCode = layout.showQrCode !== undefined ? layout.showQrCode : company?.invoiceQrEnabled === true;
  const showProductSku = layout.showProductSku !== false;
  const showProductSize = layout.showProductSize !== false;
  const showDiscounts = layout.showDiscounts !== false;
  const showTaxes = layout.showTaxes !== false;
  const showFooterMessage = layout.footerMessage !== false;
  const logoSrc = showLogo ? resolvePrintLogoSrc(company?.logoSrc || 'brand-logo.png') : '';

  const barcodeValue = invoice?.invoiceBarcode || invoice?.invoiceNumber || '';
  const barcodeImg = showBarcode && barcodeValue ? generateInvoiceBarcodeImage(barcodeValue) : null;

  const qrEnabled = showQrCode && company?.invoiceQrEnabled === true;
  const qrValue = qrEnabled ? applyQrTemplate(company?.invoiceQrText || '{invoiceNumber}', invoice) : '';
  const qrDesc = String(company?.invoiceQrDescription || '').trim();
  const defaultQrSize = format === 'thermal' ? 60 : 70;
  const qrSizePxRaw = Number(company?.invoiceQrSizePx);
  const qrSizePx = Number.isFinite(qrSizePxRaw) ? Math.min(220, Math.max(40, qrSizePxRaw)) : defaultQrSize;
  const qrSvg = qrEnabled ? generateInvoiceQrSvgMarkup(qrValue, qrSizePx) : '';

  const fullBarcodeEnabled = company?.invoiceFullBarcodeEnabled !== false;
  const fullBarcodePayload = fullBarcodeEnabled ? buildInvoiceFullBarcodePayload(invoice, company) : '';
  const fullBarcodeImg = fullBarcodePayload ? generatePdf417BarcodeImage(fullBarcodePayload, format) : null;

  const isPreview = Boolean(options?.mode === 'preview' || invoice?.isPreview === true);
  const isThermal = format === 'thermal';
  const pageCss = (() => {
    const preset = effectivePreset || 'thermal80';
    const widthMm = preset === 'thermal58' ? 58 : preset === 'thermal72' ? 72 : preset === 'thermal80' ? 80 : preset === 'halfA4' ? 148 : preset === 'a4' ? 210 : Number(custom.widthMm) || 80;
    const heightPart = preset === 'custom' ? (Number(custom.heightMm) > 0 ? `${Number(custom.heightMm)}mm` : 'auto') : 'auto';
    const widthCss = `${widthMm}mm`;
    // Clamp margins safely: for A4 (210mm) max safe is ~15mm; for thermal (58-80mm) keep very small.
    // We move margin out of @page and into body padding to avoid Chromium's
    // "margins must be less than or equal to pageSize" printToPDF error.
    const maxSafeMargin = preset === 'a4' ? 15 : preset === 'halfA4' ? 10 : Math.max(1, Math.floor(widthMm / 8));
    const margins = Math.min(Math.max(0, rawMargins), maxSafeMargin);
    // @page has NO margin — Chromium handles page margins; body padding provides visual whitespace.
    return `@page { size: ${widthCss} ${heightPart}; margin: 0; } body{ width:${widthCss}; margin:0; padding:${margins}mm; box-sizing:border-box; background:${thermalOptimization.darkModePrinting ? '#111' : '#fff'}; color:${thermalOptimization.darkModePrinting ? '#f5f5f5' : '#111'}; font-size:${fontSizePt}px; line-height:${lineSpacing}; }`;
  })();

  const footerMessage = showFooterMessage ? footerMessageRaw : '';

  const totalItemsQty =
    Number(invoice?.totalItemsQty) ||
    (invoice?.items || []).reduce((s, it) => s + (Number(it?.qty) || 0), 0);

  const breakdown = Array.isArray(invoice?.paymentBreakdown) ? invoice.paymentBreakdown : [];
  const paymentDetailsHtml = breakdown.length
    ? `<div class="divider"></div>
       <div class="sub">
         <div style="font-weight:700; margin-bottom:4px;">Payment Method:</div>
         ${breakdown
           .map(
             (p) =>
               `<div style="display:flex; justify-content:space-between; gap:10px;">
                  <div>${escapeHtml(p.method || '')}</div>
                  <div style="font-weight:700;">${escapeHtml(formatAmount(p.amount || 0, currencySymbol))}</div>
                </div>`
           )
           .join('')}
       </div>`
    : '';

  const rows = (invoice?.items || []).map((it, idx) => {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    const lineTotal = qty * price;
    const metaParts = [
      showProductSku ? (it.barcode || it.sku) : null,
      showProductSize ? it.size : null,
      it.variantName || it.variant,
    ].filter(Boolean);
    return `<tr>
      <td class="c">${idx + 1}</td>
      <td class="l">
        <div class="name" style="${getInlineStyle(textStyles.itemName)}">${escapeHtml(it.name || 'Product')}</div>
        <div class="meta">${escapeHtml(metaParts.join(' • ') || '—')}</div>
      </td>
      <td class="c">${qty}</td>
      <td class="r" style="${getInlineStyle(textStyles.itemPrice)}">${showTaxes ? escapeHtml(formatAmount(price, currencySymbol)) : '—'}</td>
      <td class="r" style="${getInlineStyle(textStyles.itemPrice)}">${escapeHtml(formatAmount(lineTotal, currencySymbol))}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${isPreview ? 'Preview Receipt' : 'Invoice'} ${escapeHtml(invoice?.invoiceNumber || '')}</title>
  <style>
    ${pageCss}
    *{ box-sizing:border-box; }
    body{ font-family: "Segoe UI", Arial, sans-serif; color:#111; }
    .header{ text-align:${headerAlign}; margin-bottom:8px; }
    .logo{ display:flex; justify-content:center; margin: 0 0 6px; }
    .logo img{ max-width:${isThermal ? '70mm' : '220px'}; max-height:${isThermal ? '14mm' : '26mm'}; height:auto; }
    .brand{ font-weight:700; font-size:${isThermal ? '14px' : '18px'}; }
    .sub{ font-size:${isThermal ? '10px' : '12px'}; color:#444; line-height:1.3; }
    .row{ display:flex; justify-content:space-between; gap:8px; font-size:${isThermal ? '11px' : '12px'}; }
    .divider{ border-top:1px dashed #888; margin:8px 0; }
    table{ width:100%; border-collapse:collapse; font-size:${isThermal ? '11px' : '12px'}; text-align:${tableAlign}; }
    th, td{ padding:4px 2px; vertical-align:top; }
    thead th{ border-bottom:1px solid #999; }
    tbody td{ border-bottom:1px dotted #ddd; }
    .l{ text-align:left; }
    .c{ text-align:center; }
    .r{ text-align:right; }
    .name{ font-weight:600; }
    .meta{ font-size:${isThermal ? '9px' : '10px'}; color:#666; }
    .totals{ margin-top:8px; font-size:${isThermal ? '12px' : '13px'}; }
    .totals .row{ margin:2px 0; }
    .grand{ font-weight:800; font-size:${isThermal ? '14px' : '16px'}; }
    .barcode { display:flex; justify-content:center; margin: 6px 0 0; }
    .barcode img { max-width: ${isThermal ? '70mm' : '220px'}; width:100%; height: auto; }
    .qr { display:flex; justify-content:center; margin: 10px auto 0; page-break-inside: avoid; width: 100%; }
    .qr svg { width: ${qrSizePx}px; height: ${qrSizePx}px; display:block; }
    .qr-desc { text-align:center; margin-top:4px; font-size:${isThermal ? '10px' : '12px'}; color:#444; }
    .fullbarcode { display:flex; justify-content:center; margin: 8px 0 0; }
    .fullbarcode img { max-width: ${isThermal ? '70mm' : '320px'}; width:100%; height: auto; }
  </style>
</head>
<body>
  <div class="header">
    ${showLogo && logoSrc ? `<div class="logo"><img src="${escapeHtml(logoSrc)}" alt="Brand Logo" /></div>` : ''}
    <div class="brand">${escapeHtml(name)}</div>
    ${(address || phone || gstin) ? `<div class="sub">
      ${address ? `<div>${escapeHtml(address)}</div>` : ''}
      ${phone ? `<div>Ph: ${escapeHtml(phone)}</div>` : ''}
      ${showGstNumber && gstin ? `<div>GSTIN: ${escapeHtml(gstin)}</div>` : ''}
    </div>` : ''}
  </div>

  <div class="row"><div><b>Invoice</b>: <span style="${getInlineStyle(textStyles.invoiceNumber)}">${escapeHtml(invoice?.invoiceNumber || '')}</span></div><div style="${getInlineStyle(textStyles.date)}">${escapeHtml(formatDateTime(invoice?.date))}</div></div>
  <div class="row"><div><b>Customer</b>: <span style="${getInlineStyle(textStyles.customerName)}">${escapeHtml(invoice?.customerName || 'Walking Customer')}</span></div><div style="${getInlineStyle(textStyles.paymentMode)}">${escapeHtml(invoice?.paymentMode || 'Cash')}</div></div>
  <div class="row"><div><b>Total Items</b>: ${escapeHtml(String(totalItemsQty))}</div><div></div></div>
  ${barcodeImg ? `<div class="barcode"><img src="${barcodeImg}" alt="Invoice Barcode" /></div><div class="sub" style="text-align:center;">${escapeHtml(barcodeValue)}</div>` : ''}
  ${fullBarcodeImg ? `<div class="fullbarcode"><img src="${fullBarcodeImg}" alt="Invoice Full Barcode" /></div>` : ''}
  ${paymentDetailsHtml}

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th class="c" style="width:20px;">#</th>
        <th class="l">Item</th>
        <th class="c" style="width:40px;">Qty</th>
        <th class="r" style="width:70px;">Rate</th>
        <th class="r" style="width:80px;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5" class="c">No items</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="row" style="${getInlineStyle(textStyles.subtotal)}"><div>Subtotal</div><div>${escapeHtml(formatAmount(invoice?.subtotal || 0, currencySymbol))}</div></div>
    ${(showDiscounts && (invoice?.discountAmt || 0) > 0) ? `<div class="row" style="${getInlineStyle(textStyles.discount)}"><div>Discount</div><div>-${escapeHtml(formatAmount(invoice?.discountAmt || 0, currencySymbol))}</div></div>` : ''}
    ${(showTaxes)
      ? ((invoice?.taxBreakdown?.length > 1)
        ? invoice.taxBreakdown.map(t => `<div class="row" style="${getInlineStyle(textStyles.tax)}"><div>GST/Tax (${escapeHtml(t.rate)}%)</div><div>${escapeHtml(formatAmount(t.tax || 0, currencySymbol))}</div></div>`).join('')
        : `<div class="row" style="${getInlineStyle(textStyles.tax)}"><div>GST/Tax (${escapeHtml(invoice?.taxRate || 0)}%)</div><div>${escapeHtml(formatAmount(invoice?.taxAmt || 0, currencySymbol))}</div></div>`)
      : ''}
    <div class="row grand" style="${getInlineStyle(textStyles.total)}"><div>Total</div><div>${escapeHtml(formatAmount(invoice?.total || 0, currencySymbol))}</div></div>
  </div>

  ${footerMessage ? `<div class="divider"></div><div class="sub" style="text-align:center; ${getInlineStyle(textStyles.footerMessage)}">${escapeHtml(footerMessage)}</div>` : ''}
  ${terms ? `<div class="divider"></div><div class="sub" style="white-space:pre-wrap;">${escapeHtml(terms)}</div>` : ''}
  ${qrSvg ? `<div class="divider"></div><div class="qr">${qrSvg}</div>${qrDesc ? `<div class="qr-desc">${escapeHtml(qrDesc)}</div>` : ''}` : ''}
</body>
</html>`;
}

function resolvePrintLogoSrc(logoSrc) {
  const src = String(logoSrc || '').trim();
  if (!src) return 'brand-logo.png';
  // Absolute sources
  if (/^(data:|https?:|file:)/i.test(src)) return src;
  // Browser printing: the invoice HTML is written into an about:blank window, so relative URLs
  // would otherwise resolve to about:blank (and the logo won't load). Convert to absolute.
  if (typeof window !== 'undefined' && window?.location?.href) {
    try {
      return new URL(src, window.location.href).href;
    } catch {
      return src;
    }
  }
  return src;
}

export const printInvoicePDF = async (invoice, company, format = 'a4', options = {}) => {
  try {
    // Electron desktop: direct print via main process (no popups)
    if (typeof window !== 'undefined' && window.electronAPI?.printHTML) {
      const html = generateInvoicePrintHTML(invoice, company, format, options);
      const deviceName = options?.printSettings?.printers?.billPrinter || options?.printSettings?.printers?.defaultPrinter || company?.printerName || company?.defaultPrinterName || undefined;
      const isDialogPrint = options?.forceDialog === true || options?.mode === 'preview' || options?.printSettings?.billPrint?.behavior?.printPreview === true;
      const useSilent = !isDialogPrint && options?.printSettings?.billPrint?.behavior?.silentPrinting !== false;
      const copies = Number(options?.printSettings?.billPrint?.behavior?.multipleCopies) || 1;
      const result = await window.electronAPI.printHTML({
        html,
        options: {
          silent: useSilent,
          deviceName,
          printBackground: true,
          copies,
          showWindow: isDialogPrint || !useSilent,
        },
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Invoice print failed');
      }
      return result;
    }

    // Browser/web fallback:
    // Use the same HTML invoice template that Electron prints (instead of jsPDF),
    // so the brand logo always appears at the top on printouts.
    const logoSrc = resolvePrintLogoSrc(company?.logoSrc || 'brand-logo.png');
    const invoiceHtml = generateInvoicePrintHTML(invoice, { ...(company || {}), logoSrc }, format, options);

    const w = window.open('', '_blank');
    if (!w) return { success: false, error: 'Popup blocked: Please allow popups for printing' };
    w.document.open();
    w.document.write(invoiceHtml);
    w.document.close();
    w.focus();
    try {
      w.print();
    } catch (err) {
      return { success: false, error: err?.message || 'Browser print failed' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
};

// Auto-print helper for realtime payment flows (UPI):
// - Electron: silent print to default / selected printer
// - Browser: falls back to normal print flow
export const autoPrintInvoice = async (invoice, company, format = 'thermal', options = {}) => {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.printHTML) {
      const logoSrc = resolvePrintLogoSrc(company?.logoSrc || 'brand-logo.png');
      const html = generateInvoicePrintHTML(invoice, { ...(company || {}), logoSrc }, format, options);
      const deviceName = options?.printSettings?.printers?.billPrinter || options?.printSettings?.printers?.defaultPrinter || company?.printerName || company?.defaultPrinterName || undefined;
      const useSilent = options?.printSettings?.billPrint?.behavior?.silentPrinting !== false;
      const copies = Number(options?.printSettings?.billPrint?.behavior?.multipleCopies) || 1;
      return await window.electronAPI.printHTML({
        html,
        options: {
          silent: useSilent,
          printBackground: true,
          deviceName,
          copies,
        },
      });
    }
    return await printInvoicePDF(invoice, company, format, options);
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
};

/**
 * Remote print invoice to main device (server) via network
 * This is called from client devices to print on the main counter's printer
 * @param {Object} invoice - Invoice object to print
 * @param {Object} company - Company settings
 * @param {string} format - Print format ('thermal' or 'a4')
 * @param {Object} options - Print options including printSettings, invoiceTextStyles
 * @param {Function} requestRemotePrintFn - The requestRemotePrint function from NetworkSyncContext
 * @returns {Promise} Result of remote print request
 */
export const remotePrintInvoice = async (invoice, company, format = 'thermal', options = {}, requestRemotePrintFn) => {
  try {
    if (!requestRemotePrintFn) {
      throw new Error('Remote print function not available');
    }

    // Generate the print HTML (same as local print)
    const logoSrc = resolvePrintLogoSrc(company?.logoSrc || 'brand-logo.png');
    const html = generateInvoicePrintHTML(invoice, { ...(company || {}), logoSrc }, format, options);
    
    // Get print settings
    const deviceName = options?.printSettings?.printers?.billPrinter || options?.printSettings?.printers?.defaultPrinter || company?.printerName || company?.defaultPrinterName || undefined;
    const useSilent = options?.printSettings?.billPrint?.behavior?.silentPrinting !== false;
    const copies = Number(options?.printSettings?.billPrint?.behavior?.multipleCopies) || 1;

    // Send print data to main device
    const printData = {
      html,
      options: {
        silent: useSilent,
        printBackground: true,
        deviceName,
        copies,
      },
    };

    await requestRemotePrintFn(printData);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
};

export const downloadInvoicePDF = (invoice, company, format = 'a4', options = {}) => {
  // Electron desktop: save a true PDF via Chromium (best ₹ support + best print fidelity)
  if (typeof window !== 'undefined' && window.electronAPI?.savePDF) {
    const html = generateInvoicePrintHTML(invoice, { ...(company || {}), ...options }, 'a4', options);
    const defaultFilename = `invoice-${invoice?.invoiceNumber || 'INV'}-${new Date().toISOString().split('T')[0]}.pdf`;
    return window.electronAPI.savePDF({ html, defaultFilename });
  }

  // Browser fallback: jsPDF download
  const doc = generateInvoicePDF(invoice, company, format, options);
  const filename = `invoice-${invoice.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const exportCSV = (data, filename) => {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const exportExcel = (data, filename) => {
  if (!data.length) return;
  
  // Simple XLSX generation using HTML table approach
  const ws_name = "Sheet1";
  
  const keys = Object.keys(data[0]);
  
  const excelContent = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office">',
    '<Worksheet ss:Name="' + ws_name + '">',
    '<Table>',
    ...data.map((row, idx) => {
      const cells = keys.map(k => `<Cell>${row[k] ?? ''}</Cell>`).join('');
      return idx === 0 
        ? `<Row ss:StyleID="bold">${keys.map(k => `<Cell ss:StyleID="bold"><Data ss:Type="String">${k}</Data></Cell>`).join('')}</Row>`
        : `<Row>${cells}</Row>`;
    }),
    '</Table>',
    '</Worksheet>',
    '</Workbook>',
  ].join('\n');
  
  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const INVOICE_STATUSES = ['Paid', 'Unpaid', 'Partial', 'Cancelled'];
export const ROLES = ['admin', 'staff', 'cashier'];

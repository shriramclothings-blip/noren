/**
 * InvoiceSendModal — Professional WhatsApp Invoice PDF sender
 *
 * Features:
 * - PDF preview of the invoice
 * - Customisable greeting + message (from Invoice Send Settings)
 * - Send to primary customer AND optional second recipient (e.g. store copy)
 * - Download PDF locally
 * - Proper modal layout with close button
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  X, MessageCircle, FileText, Download, Send, User,
  CheckCircle, AlertCircle, Loader, Copy, CheckCheck, Eye, EyeOff,
  RefreshCw, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateInvoicePrintHTML, downloadInvoicePDF } from '../utils/helpers';
import {
  loadInvoiceSendSettings,
  buildInvoiceSendMessage,
  generateInvoicePDFToTemp,
  openWhatsAppForInvoice,
  DEFAULT_INVOICE_SEND_SETTINGS,
} from '../utils/invoiceSendService';
import { normalizePhone } from '../utils/whatsappService';

// ── Recipient Status Badge ────────────────────────────────────────────────
function RecipientBadge({ label, phone, status, onRemove }) {
  const normalized = normalizePhone(phone);
  const statusColors = {
    idle: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
    sending: 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20',
    sent: 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20',
    error: 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20',
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${statusColors[status] || statusColors.idle}`}>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {label?.charAt(0)?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{label}</p>
        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">+{normalized || phone}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status === 'sending' && <Loader size={15} className="animate-spin text-amber-500" />}
        {status === 'sent' && <CheckCircle size={15} className="text-emerald-500" />}
        {status === 'error' && <AlertCircle size={15} className="text-red-500" />}
        {onRemove && (
          <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors">
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Modal Component ──────────────────────────────────────────────────
export default function InvoiceSendModal({
  open,
  onClose,
  invoice,
  customer,
  company,
  printSettings,
}) {
  const [sendSettings, setSendSettings] = useState(DEFAULT_INVOICE_SEND_SETTINGS);
  const [message, setMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [pdfPath, setPdfPath] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [recipientStatuses, setRecipientStatuses] = useState({});
  const [extraRecipient, setExtraRecipient] = useState({ phone: '', label: '' });
  const [showExtraInput, setShowExtraInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [allSent, setAllSent] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Load send settings and build message when modal opens
  useEffect(() => {
    if (!open || !invoice) return;
    setPdfPath(null);
    setAllSent(false);
    setRecipientStatuses({});
    setExtraRecipient({ phone: '', label: '' });
    setShowExtraInput(false);
    loadInvoiceSendSettings().then((cfg) => {
      if (!isMounted.current) return;
      setSendSettings(cfg);
      const msg = buildInvoiceSendMessage(cfg, invoice, customer, company);
      setMessage(msg);
      // Also set the preview HTML
      const html = generateInvoicePrintHTML(invoice, company, cfg.pdfFormat || 'a4', { printSettings });
      setPreviewHtml(html);
    });
  }, [open, invoice, customer, company, printSettings]);

  // Rebuild message when settings change
  useEffect(() => {
    if (!invoice) return;
    const msg = buildInvoiceSendMessage(sendSettings, invoice, customer, company);
    setMessage(msg);
  }, [sendSettings, invoice, customer, company]);

  const primaryPhone = customer?.phone || invoice?.customerPhone || invoice?.phone;

  // Build recipient list
  const recipients = [];
  if (primaryPhone) {
    recipients.push({ id: 'primary', phone: primaryPhone, label: customer?.name || invoice?.customerName || 'Customer' });
  }
  if (sendSettings.secondRecipientEnabled && sendSettings.secondRecipientPhone) {
    recipients.push({ id: 'second', phone: sendSettings.secondRecipientPhone, label: sendSettings.secondRecipientLabel || 'Store Copy' });
  }
  if (extraRecipient.phone) {
    recipients.push({ id: 'extra', phone: extraRecipient.phone, label: extraRecipient.label || 'Additional Recipient' });
  }

  const handleGeneratePDF = async () => {
    setGeneratingPdf(true);
    toast.loading('Generating PDF…', { id: 'pdf-gen' });
    try {
      const result = await generateInvoicePDFToTemp(invoice, company, sendSettings.pdfFormat || 'a4', printSettings);
      toast.dismiss('pdf-gen');
      if (result.success) {
        setPdfPath(result.filePath);
        toast.success('PDF ready! You can now send it.');
      } else {
        toast.error(result.error || 'PDF generation failed');
      }
    } catch (err) {
      toast.dismiss('pdf-gen');
      toast.error('PDF generation failed');
    } finally {
      if (isMounted.current) setGeneratingPdf(false);
    }
  };

  const handleDownloadPDF = () => {
    downloadInvoicePDF(invoice, company, sendSettings.pdfFormat || 'a4', { printSettings });
  };

  const handleSendToRecipient = async (recipient) => {
    setRecipientStatuses((p) => ({ ...p, [recipient.id]: 'sending' }));
    try {
      openWhatsAppForInvoice(recipient.phone, message);
      await new Promise((r) => setTimeout(r, 500));
      setRecipientStatuses((p) => ({ ...p, [recipient.id]: 'sent' }));
      toast.success(`WhatsApp opened for ${recipient.label}`);
    } catch (err) {
      setRecipientStatuses((p) => ({ ...p, [recipient.id]: 'error' }));
      toast.error(`Failed to open WhatsApp for ${recipient.label}`);
    }
  };

  const handleSendAll = async () => {
    if (!recipients.length) { toast.error('No recipients to send to.'); return; }
    for (const r of recipients) {
      if (!normalizePhone(r.phone)) continue;
      await handleSendToRecipient(r);
      if (recipients.length > 1) await new Promise((res) => setTimeout(res, 900));
    }
    setAllSent(true);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Message copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Could not copy message'); }
  };

  const handleOpenPDF = () => {
    if (pdfPath && window?.electronAPI?.openFile) {
      window.electronAPI.openFile(pdfPath);
    }
  };

  const handleShowInExplorer = () => {
    if (pdfPath && window?.electronAPI?.showFile) {
      window.electronAPI.showFile(pdfPath);
    }
  };

  if (!open) return null;

  const currency = company?.currency || '₹';
  const canGeneratePDF = !!window?.electronAPI?.savePDFToTemp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[95vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-[#075E54] to-[#128C7E] text-white flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0 shadow-sm">
            <MessageCircle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base leading-tight">Send Invoice via WhatsApp</h2>
            <p className="text-xs text-emerald-200 mt-0.5">
              {invoice?.invoiceNumber} &nbsp;•&nbsp; {invoice?.customerName || 'Customer'} &nbsp;•&nbsp;
              {currency}{Number(invoice?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Recipients */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User size={15} className="text-emerald-500" /> Recipients
                </h3>
                <button
                  onClick={() => setShowExtraInput((v) => !v)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <UserPlus size={12} /> Add Recipient
                </button>
              </div>
              <div className="space-y-2">
                {recipients.length === 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>No phone number on this invoice. Add a recipient below or update the customer profile.</span>
                  </div>
                )}
                {recipients.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <RecipientBadge
                        label={r.label}
                        phone={r.phone}
                        status={recipientStatuses[r.id] || 'idle'}
                        onRemove={r.id === 'extra' ? () => setExtraRecipient({ phone: '', label: '' }) : undefined}
                      />
                    </div>
                    <button
                      onClick={() => handleSendToRecipient(r)}
                      disabled={!normalizePhone(r.phone) || recipientStatuses[r.id] === 'sending'}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-sm flex-shrink-0"
                    >
                      {recipientStatuses[r.id] === 'sending'
                        ? <Loader size={12} className="animate-spin" />
                        : recipientStatuses[r.id] === 'sent'
                        ? <CheckCircle size={12} />
                        : <Send size={12} />}
                      {recipientStatuses[r.id] === 'sent' ? 'Sent' : 'Send'}
                    </button>
                  </div>
                ))}

                {showExtraInput && (
                  <div className="flex gap-2 mt-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Phone number (e.g. 9876543210)"
                      value={extraRecipient.phone}
                      onChange={(e) => setExtraRecipient((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                    />
                    <input
                      className="input w-36 text-sm"
                      placeholder="Label (optional)"
                      value={extraRecipient.label}
                      onChange={(e) => setExtraRecipient((p) => ({ ...p, label: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* PDF Section */}
            <section>
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <FileText size={15} className="text-blue-500" /> Invoice PDF
              </h3>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                {pdfPath ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 flex-1 min-w-0 truncate font-medium">
                        PDF ready: {pdfPath.split(/[\\/]/).pop()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={handleOpenPDF} className="btn-secondary text-xs gap-1.5 py-1.5">
                        <Eye size={13} /> Open PDF
                      </button>
                      <button onClick={handleShowInExplorer} className="btn-secondary text-xs gap-1.5 py-1.5">
                        <FileText size={13} /> Show in Folder
                      </button>
                      <button onClick={handleGeneratePDF} disabled={generatingPdf} className="btn-secondary text-xs gap-1.5 py-1.5">
                        <RefreshCw size={13} /> Regenerate
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      💡 To send the PDF: open the chat in WhatsApp → tap the attachment icon → select this PDF file from the folder above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Generate a PDF of this invoice to attach manually in WhatsApp, or download it directly.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {canGeneratePDF && (
                        <button
                          onClick={handleGeneratePDF}
                          disabled={generatingPdf}
                          className="btn-primary text-xs gap-1.5 py-2"
                        >
                          {generatingPdf
                            ? <><Loader size={13} className="animate-spin" /> Generating…</>
                            : <><FileText size={13} /> Generate PDF for WhatsApp</>}
                        </button>
                      )}
                      <button onClick={handleDownloadPDF} className="btn-secondary text-xs gap-1.5 py-2">
                        <Download size={13} /> Download PDF
                      </button>
                      <button
                        onClick={() => setShowPreview((v) => !v)}
                        className="btn-secondary text-xs gap-1.5 py-2"
                      >
                        {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                        {showPreview ? 'Hide' : 'Preview'} Invoice
                      </button>
                    </div>
                  </div>
                )}

                {showPreview && previewHtml && (
                  <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden" style={{ height: 360 }}>
                    <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">Invoice Preview</div>
                    <iframe
                      title="Invoice Preview"
                      srcDoc={previewHtml}
                      className="w-full border-0 bg-white"
                      style={{ height: 318 }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Message Preview */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <MessageCircle size={15} className="text-emerald-500" /> WhatsApp Message
                </h3>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-[#ECE5DD] dark:bg-gray-800 rounded-xl p-3">
                <div className="bg-[#DCF8C6] dark:bg-emerald-900/40 rounded-xl rounded-tl-none p-3 shadow-sm max-w-xs">
                  <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{message || 'Message will appear here…'}</p>
                  <p className="text-[10px] text-gray-400 text-right mt-1.5">🟢 Ready to send</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Edit message templates in <strong>Settings → WhatsApp → Invoice Send</strong>
              </p>
            </section>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          {allSent ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle size={18} /> All messages sent!
              </div>
              <button onClick={onClose} className="btn-primary px-6">Done</button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSendAll}
                disabled={recipients.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1ebe5a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
              >
                <Send size={16} />
                Send to All ({recipients.length})
              </button>
              <button onClick={handleDownloadPDF} className="btn-secondary gap-2 text-sm py-2.5">
                <Download size={15} /> Download PDF
              </button>
              <button onClick={onClose} className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Close
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

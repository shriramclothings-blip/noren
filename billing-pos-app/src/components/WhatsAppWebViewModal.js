/**
 * WhatsAppWebViewModal
 *
 * Slide-in companion panel from the right edge. Triggered by a `wa:open`
 * CustomEvent dispatched from whatsappService / InvoiceSendModal.
 *
 * WhatsApp Web blocks iframe embedding (X-Frame-Options: SAMEORIGIN).
 * This panel handles that gracefully:
 *  - Shows the recipient info and pre-filled message
 *  - Provides a one-click "Open in WhatsApp" button (OS default browser)
 *  - Stays open so you can reference it while chatting
 *  - Proper close button, escape-key dismiss, and backdrop click
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, MessageCircle, ExternalLink, Copy, CheckCheck, Phone,
  ChevronRight,
} from 'lucide-react';
import { buildWaMeLink, normalizePhone } from '../utils/whatsappService';
import toast from 'react-hot-toast';

export default function WhatsAppWebViewModal() {
  const [open, setOpen]       = useState(false);
  const [phone, setPhone]     = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied]   = useState(false);
  const panelRef              = useRef(null);

  // Listen for wa:open events dispatched by whatsappService / invoiceSendService
  const handleWaOpen = useCallback((e) => {
    const { phone: p, text: t } = e.detail || {};
    setPhone(p || '');
    setMessage(t || '');
    setOpen(true);
    setCopied(false);
  }, []);

  useEffect(() => {
    window.addEventListener('wa:open', handleWaOpen);
    return () => window.removeEventListener('wa:open', handleWaOpen);
  }, [handleWaOpen]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleClose = () => { setOpen(false); };

  // Open WhatsApp in OS default browser
  const openExternal = useCallback(() => {
    const link = phone ? (buildWaMeLink(phone, message) || 'https://web.whatsapp.com') : 'https://web.whatsapp.com';
    if (window?.electronAPI?.openExternal) {
      window.electronAPI.openExternal(link);
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }, [phone, message]);

  const handleCopyMessage = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Message copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch { toast.error('Could not copy message'); }
  };

  if (!open) return null;

  const normalizedPhone = normalizePhone(phone);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="WhatsApp Sender"
        className="fixed right-0 top-0 h-screen w-80 flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50"
        style={{ minWidth: 300 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 bg-[#075E54] text-white flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <MessageCircle size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">WhatsApp</p>
            {phone && (
              <p className="text-[11px] text-emerald-200 flex items-center gap-1 mt-0.5">
                <Phone size={9} /> +{normalizedPhone}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors flex-shrink-0"
            aria-label="Close WhatsApp panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-[#ECE5DD] dark:bg-gray-800">

          {/* Launch card */}
          <div className="m-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#25D366] px-5 py-4 flex flex-col items-center gap-2.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <MessageCircle size={30} className="text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-sm">Open WhatsApp</p>
                <p className="text-[11px] text-emerald-100 mt-0.5">Opens in your default browser</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {phone && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {normalizedPhone.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Sending to</p>
                    <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">+{normalizedPhone}</p>
                  </div>
                </div>
              )}

              <button
                onClick={openExternal}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
              >
                <ExternalLink size={16} />
                {phone ? 'Open Chat on WhatsApp' : 'Open WhatsApp Web'}
              </button>

              <p className="text-[11px] text-center text-gray-400 leading-relaxed">
                Opens in your default browser. Use WhatsApp and this POS side-by-side.
              </p>
            </div>
          </div>

          {/* Message preview */}
          {message && (
            <div className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pre-filled Message</p>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  {copied ? <CheckCheck size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="px-4 pb-4">
                <div className="bg-[#DCF8C6] dark:bg-emerald-900/30 rounded-xl rounded-tl-none p-3 shadow-sm">
                  <p className="text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{message}</p>
                  <p className="text-[10px] text-gray-400 text-right mt-1.5">🟢 Ready</p>
                </div>
              </div>
            </div>
          )}

          {/* How-to steps */}
          <div className="mx-4 mb-4 p-3.5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-2.5">💡 How to send</p>
            <ol className="space-y-2">
              {[
                'Click "Open Chat on WhatsApp" above',
                'WhatsApp Web opens with the message pre-filled',
                'Attach the PDF if generated, then press Send',
                'Return here to continue billing',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="font-bold text-emerald-600 flex-shrink-0 w-4">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400">WhatsApp Companion</p>
          <button
            onClick={handleClose}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Close <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </>
  );
}

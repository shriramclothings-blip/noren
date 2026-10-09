/**
 * WhatsAppButton — Reusable one-click WhatsApp share button.
 *
 * Usage:
 *   <WhatsAppButton phone="9876543210" message="Hi there!" />
 *   <WhatsAppButton invoice={inv} customer={cust} company={co} variant="icon" />
 *
 * Props:
 *   phone       — raw phone string (auto-normalised)
 *   message     — pre-built message string (optional)
 *   invoice     — invoice object (used to auto-build message)
 *   customer    — customer object
 *   company     — company settings object
 *   config      — WhatsApp config (loaded from service if omitted)
 *   variant     — 'button' | 'icon' | 'menu-item'  (default 'button')
 *   size        — 'sm' | 'md' | 'lg'  (default 'md')
 *   label       — override button label text
 *   className   — extra CSS classes
 *   onSent      — callback(result) after send
 */

import React, { useEffect, useState } from 'react';
import { MessageCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  loadWhatsAppConfig,
  buildInvoiceMessage,
  openWhatsApp,
  sendViaBusinessAPI,
  normalizePhone,
} from '../utils/whatsappService';

export default function WhatsAppButton({
  phone,
  message: messageProp,
  invoice,
  customer,
  company,
  config: configProp,
  variant = 'button',
  size = 'md',
  label,
  className = '',
  onSent,
}) {
  const [config, setConfig] = useState(configProp || null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!configProp) {
      loadWhatsAppConfig().then(setConfig);
    } else {
      setConfig(configProp);
    }
  }, [configProp]);

  // Resolve phone from props
  const resolvedPhone =
    phone ||
    customer?.phone ||
    invoice?.customerPhone ||
    invoice?.phone || '';

  const canSend = Boolean(resolvedPhone && config?.enabled);

  const buildMessage = () => {
    if (messageProp) return messageProp;
    if (invoice && config) return buildInvoiceMessage(config, invoice, customer, company);
    if (customer && config) {
      // Generic greeting for customer
      const name = customer.name || 'Customer';
      const biz  = company?.name || 'Store';
      return `Hi ${name}! Greetings from *${biz}*. How can we help you today? 😊`;
    }
    return '';
  };

  const handleClick = async (e) => {
    e.stopPropagation();
    if (!config) { toast.error('WhatsApp config loading…'); return; }
    if (!config.enabled) { toast.error('WhatsApp is not enabled. Enable it in Settings → WhatsApp.'); return; }
    if (!resolvedPhone) { toast.error('No phone number available.'); return; }

    const msg = buildMessage();
    setSending(true);

    try {
      let result;
      if (config.mode === 'business_api') {
        result = await sendViaBusinessAPI(config, resolvedPhone, msg);
        if (result.success) {
          toast.success('WhatsApp message sent!');
        } else {
          toast.error(result.error || 'Send failed');
        }
      } else {
        result = openWhatsApp(resolvedPhone, msg, config.openInApp !== false);
        if (result.success) {
          toast.success('WhatsApp opened!');
        } else {
          toast.error(result.error || 'Could not open WhatsApp');
        }
      }
      onSent?.(result);
    } catch (err) {
      toast.error(err.message || 'WhatsApp error');
    } finally {
      setSending(false);
    }
  };

  // Size classes
  const sizeCls = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  }[size] || 'px-3 py-1.5 text-sm gap-1.5';

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  // ── Icon-only variant ──────────────────────────────────────────────────
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={sending || !config}
        title={canSend ? `WhatsApp: ${normalizePhone(resolvedPhone)}` : 'WhatsApp (no phone / disabled)'}
        className={`p-1.5 rounded-lg transition-colors ${
          canSend
            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
        } ${className}`}
      >
        {sending ? <Loader size={iconSize} className="animate-spin" /> : <MessageCircle size={iconSize} />}
      </button>
    );
  }

  // ── Menu-item variant ──────────────────────────────────────────────────
  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={sending || !canSend}
        className={`w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      >
        {sending ? <Loader size={14} className="animate-spin" /> : <MessageCircle size={14} />}
        {label || 'Share via WhatsApp'}
      </button>
    );
  }

  // ── Default button variant ─────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={sending || !canSend}
      title={!canSend ? 'Enable WhatsApp in Settings or add a phone number' : undefined}
      className={`inline-flex items-center font-medium rounded-xl transition-colors ${sizeCls} ${
        canSend
          ? 'bg-[#25D366] hover:bg-[#1ebe5a] text-white shadow-sm'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
      } ${className}`}
    >
      {sending ? <Loader size={iconSize} className="animate-spin" /> : <MessageCircle size={iconSize} />}
      {label || (size === 'sm' ? 'WhatsApp' : 'Share on WhatsApp')}
    </button>
  );
}

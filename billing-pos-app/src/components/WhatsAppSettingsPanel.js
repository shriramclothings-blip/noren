import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageCircle, Save, CheckCircle2, AlertCircle, Loader, Send,
  RefreshCw, Users, Phone, Zap, Globe, Shield, ChevronDown, ChevronUp,
  Monitor, FileText, UserPlus, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  loadWhatsAppConfig, saveWhatsAppConfig,
  testBusinessAPIConnection, buildWaLink, normalizePhone,
  DEFAULT_WA_CONFIG,
} from '../utils/whatsappService';
import {
  loadInvoiceSendSettings, saveInvoiceSendSettings,
  DEFAULT_INVOICE_SEND_SETTINGS,
} from '../utils/invoiceSendService';
import { dbGetAll } from '../db/db';

// ── Template variable reference ───────────────────────────────────────────
const TEMPLATE_VARS = [
  '{customerName}', '{businessName}', '{invoiceNumber}',
  '{itemCount}', '{currency}', '{total}', '{date}',
  '{dues}', '{promoText}', '{items}',
];

// ── Pill badge ─────────────────────────────────────────────────────────────
function Pill({ children, color = 'gray' }) {
  const colors = {
    green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    gray:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    rose:   'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${colors[color]}`}>
      {children}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function WhatsAppSettingsPanel({ company }) {
  const [config, setConfig] = useState(DEFAULT_WA_CONFIG);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // Invoice Send Settings state
  const [sendSettings, setSendSettings] = useState(DEFAULT_INVOICE_SEND_SETTINGS);
  const [savingSend, setSavingSend] = useState(false);
  const [showInvoiceSend, setShowInvoiceSend] = useState(true);

  // Bulk send state
  const [customers, setCustomers] = useState([]);
  const [bulkPromo, setBulkPromo] = useState('');
  const [bulkFilter, setBulkFilter] = useState('all');
  const [bulkProgress, setBulkProgress] = useState(null);
  const [sending, setSending] = useState(false);

  // Quick-send test state
  const [quickPhone, setQuickPhone] = useState('');
  const [quickMsg, setQuickMsg] = useState('Hello! Test message from VENDEXA RetailOS.');

  useEffect(() => {
    loadWhatsAppConfig().then((cfg) => setConfig(cfg));
    loadInvoiceSendSettings().then((cfg) => setSendSettings(cfg));
    dbGetAll('customers').then((rows) => setCustomers(rows || []));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveWhatsAppConfig(config);
      toast.success('WhatsApp settings saved.');
    } catch {
      toast.error('Failed to save settings.');
    }
    setSaving(false);
  };

  const handleSaveInvoiceSend = async () => {
    setSavingSend(true);
    try {
      await saveInvoiceSendSettings(sendSettings);
      toast.success('Invoice send settings saved.');
    } catch {
      toast.error('Failed to save invoice send settings.');
    }
    setSavingSend(false);
  };

  const handleTestAPI = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testBusinessAPIConnection(config);
    setTestResult(result);
    if (result.success) {
      toast.success(`Connected: ${result.verifiedName || result.displayPhone}`);
    } else {
      toast.error(result.error || 'Test failed');
    }
    setTesting(false);
  };

  const handleQuickSend = () => {
    if (!quickPhone.trim()) { toast.error('Enter a phone number'); return; }
    const link = buildWaLink(quickPhone, quickMsg);
    if (!link) { toast.error('Invalid phone number'); return; }
    window.dispatchEvent(new CustomEvent('wa:open', { detail: { url: link, phone: quickPhone, text: quickMsg } }));
    toast.success('WhatsApp opened in app');
  };

  // Open WhatsApp Web inside the app panel (no message)
  const handleOpenWhatsAppInApp = () => {
    const homeUrl = 'https://web.whatsapp.com';
    window.dispatchEvent(new CustomEvent('wa:open', { detail: { url: homeUrl, phone: '', text: '' } }));
    toast.success('WhatsApp opened side-by-side');
  };

  const filteredCustomers = useCallback(() => {
    if (bulkFilter === 'with_dues') return customers.filter(c => Number(c.dues || 0) > 0);
    if (bulkFilter === 'active') return customers.filter(c => Number(c.total_orders || 0) > 0);
    return customers;
  }, [customers, bulkFilter]);

  const handleBulkSend = async () => {
    const targets = filteredCustomers().filter(c => c.phone);
    if (!targets.length) { toast.error('No customers with phone numbers in this filter.'); return; }
    if (!bulkPromo.trim()) { toast.error('Enter a promotion message.'); return; }
    setSending(true);
    setBulkProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      const cust = targets[i];
      const msg = (config.promotionTemplate || DEFAULT_WA_CONFIG.promotionTemplate)
        .replace('{customerName}', cust.name || 'Customer')
        .replace('{businessName}', company?.name || 'Store')
        .replace('{promoText}', bulkPromo);

      if (config.mode === 'business_api' && config.apiToken && config.apiPhoneId) {
        const { sendViaBusinessAPI } = await import('../utils/whatsappService');
        await sendViaBusinessAPI(config, cust.phone, msg);
        await new Promise(r => setTimeout(r, 300));
      } else {
        // For web mode, open the first one (can't auto-open multiple tabs)
        if (i === 0) window.open(buildWaLink(cust.phone, msg), '_blank', 'noopener,noreferrer');
        await new Promise(r => setTimeout(r, 600));
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }

    setSending(false);
    setBulkProgress(null);
    toast.success(`Messages sent to ${targets.length} customer(s).`);
  };

  const currency = company?.currency || '₹'; // eslint-disable-line no-unused-vars

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
              <MessageCircle size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">
                WhatsApp Integration
                <Pill color="green">Personal</Pill>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Send invoice notifications, dues reminders, and promotional messages directly to customers via WhatsApp.
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${config.enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400' : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700'}`}>
            <div className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {config.enabled ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* Open WhatsApp inside app — side-by-side button */}
        <div className="mt-4 flex items-center gap-3 p-4 bg-[#075E54] rounded-2xl text-white">
          <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <MessageCircle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Open WhatsApp Side-by-Side</p>
            <p className="text-xs text-emerald-200 mt-0.5">Use WhatsApp without leaving the POS app. Chat and bill simultaneously.</p>
          </div>
          <button
            onClick={handleOpenWhatsAppInApp}
            className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#1ebe5a] rounded-xl font-semibold text-sm transition-colors flex-shrink-0 shadow-sm"
          >
            <Monitor size={15} /> Open WhatsApp
          </button>
        </div>
      </div>

      {/* Mode & Enable */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Zap size={16} className="text-amber-500" /> Integration Mode</h3>

        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={config.enabled}
              onChange={e => setConfig(p => ({ ...p, enabled: e.target.checked }))} />
            <div className={`w-11 h-6 rounded-full transition-colors ${config.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.enabled ? 'translate-x-5' : ''}`} />
          </div>
          <div>
            <span className="font-medium text-sm">Enable WhatsApp Integration</span>
            <p className="text-xs text-gray-400">Turn on to enable WhatsApp sending features across the app.</p>
          </div>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              key: 'web',
              icon: Globe,
              title: 'WhatsApp Web / Personal',
              desc: 'Opens WhatsApp Web with pre-filled messages. Works instantly — no setup needed.',
              badge: 'Free',
              badgeColor: 'green',
            },
            {
              key: 'business_api',
              icon: Shield,
              title: 'WhatsApp Business API',
              desc: 'Send messages programmatically via Meta Cloud API. Requires Business account.',
              badge: 'Advanced',
              badgeColor: 'violet',
            },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setConfig(p => ({ ...p, mode: m.key }))}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${config.mode === m.key ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <m.icon size={16} className={config.mode === m.key ? 'text-emerald-600' : 'text-gray-400'} />
                <span className="font-semibold text-sm">{m.title}</span>
                <Pill color={m.badgeColor}>{m.badge}</Pill>
              </div>
              <p className="text-xs text-gray-500">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Business Phone */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Phone size={16} className="text-blue-500" /> Your WhatsApp Number</h3>
        <div>
          <label className="label">Business Phone Number</label>
          <div className="flex gap-2">
            <span className="flex items-center px-3 border border-r-0 border-gray-200 dark:border-gray-600 rounded-l-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-500">+</span>
            <input
              className="input rounded-l-none flex-1"
              placeholder="919876543210 (with country code, no spaces)"
              value={config.businessPhone}
              onChange={e => setConfig(p => ({ ...p, businessPhone: e.target.value.replace(/\D/g, '') }))}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Normalized: <span className="font-mono text-blue-500">{normalizePhone(config.businessPhone) || 'not set'}</span>
            {config.businessPhone && (
              <button
                onClick={() => window.open(`https://wa.me/${normalizePhone(config.businessPhone)}`, '_blank')}
                className="ml-2 text-emerald-600 underline text-xs"
              >Test your number ↗</button>
            )}
          </p>
        </div>

        {/* Business API credentials */}
        {config.mode === 'business_api' && (
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Meta Business API Credentials</p>
            <div>
              <label className="label">Access Token (Bearer)</label>
              <input type="password" className="input"
                placeholder="EAAG... (from Meta Developer Console)"
                value={config.apiToken}
                onChange={e => setConfig(p => ({ ...p, apiToken: e.target.value.trim() }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone Number ID</label>
                <input className="input" placeholder="12345678901234"
                  value={config.apiPhoneId}
                  onChange={e => setConfig(p => ({ ...p, apiPhoneId: e.target.value.trim() }))} />
              </div>
              <div>
                <label className="label">API Version</label>
                <select className="input" value={config.apiVersion}
                  onChange={e => setConfig(p => ({ ...p, apiVersion: e.target.value }))}>
                  <option value="v19.0">v19.0 (Latest)</option>
                  <option value="v18.0">v18.0</option>
                  <option value="v17.0">v17.0</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleTestAPI} disabled={testing}
                className="btn-secondary flex items-center gap-2 text-sm">
                {testing ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Test API Connection
              </button>
              {testResult && (
                <div className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {testResult.success ? `${testResult.verifiedName || ''} (${testResult.displayPhone || 'verified'})` : testResult.error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Automation */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">Automation Settings</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={config.sendOnInvoice}
              onChange={e => setConfig(p => ({ ...p, sendOnInvoice: e.target.checked }))} />
            <div className={`w-10 h-5 rounded-full transition-colors ${config.sendOnInvoice ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.sendOnInvoice ? 'translate-x-5' : ''}`} />
          </div>
          <div>
            <span className="text-sm font-medium">Auto-send invoice notification on checkout</span>
            <p className="text-xs text-gray-400">Opens WhatsApp with invoice details after each sale (if customer has a phone number).</p>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={config.includeItemsList}
              onChange={e => setConfig(p => ({ ...p, includeItemsList: e.target.checked }))} />
            <div className={`w-10 h-5 rounded-full transition-colors ${config.includeItemsList ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.includeItemsList ? 'translate-x-5' : ''}`} />
          </div>
          <div>
            <span className="text-sm font-medium">Include items list in invoice message</span>
            <p className="text-xs text-gray-400">Appends a line-by-line item breakdown to the invoice WhatsApp message.</p>
          </div>
        </label>
      </div>

      {/* Message Templates */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Message Templates</h3>
          <button onClick={() => setShowAdvanced(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showAdvanced ? 'Hide' : 'Show'} all templates
          </button>
        </div>

        {/* Variable reference */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Available variables: </span>
          {TEMPLATE_VARS.map(v => (
            <code key={v} className="mx-0.5 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-300">{v}</code>
          ))}
        </div>

        <div>
          <label className="label">Invoice Notification Template</label>
          <textarea className="input resize-none font-mono text-xs" rows={5}
            value={config.invoiceTemplate}
            onChange={e => setConfig(p => ({ ...p, invoiceTemplate: e.target.value }))} />
        </div>

        {showAdvanced && (
          <>
            <div>
              <label className="label">Dues Reminder Template</label>
              <textarea className="input resize-none font-mono text-xs" rows={4}
                value={config.duesTemplate}
                onChange={e => setConfig(p => ({ ...p, duesTemplate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Promotional Message Template</label>
              <textarea className="input resize-none font-mono text-xs" rows={4}
                value={config.promotionTemplate}
                onChange={e => setConfig(p => ({ ...p, promotionTemplate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Default Greeting</label>
              <input className="input" value={config.defaultGreeting}
                onChange={e => setConfig(p => ({ ...p, defaultGreeting: e.target.value }))} />
            </div>
            <button onClick={() => setConfig(p => ({ ...p, invoiceTemplate: DEFAULT_WA_CONFIG.invoiceTemplate, duesTemplate: DEFAULT_WA_CONFIG.duesTemplate, promotionTemplate: DEFAULT_WA_CONFIG.promotionTemplate, defaultGreeting: DEFAULT_WA_CONFIG.defaultGreeting }))}
              className="text-xs text-red-500 hover:underline">Reset all templates to default</button>
          </>
        )}
      </div>

      {/* Quick Send Test */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Send size={16} className="text-blue-500" /> Quick Send Test</h3>
        <p className="text-xs text-gray-400">Test your WhatsApp setup — opens directly inside the app panel (side-by-side).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="9876543210 or +91..." value={quickPhone}
              onChange={e => setQuickPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Message</label>
            <input className="input" value={quickMsg} onChange={e => setQuickMsg(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleQuickSend}
            className="btn-primary flex items-center gap-2 text-sm">
            <MessageCircle size={15} /> Send & Open in App
          </button>
          <button
            onClick={handleOpenWhatsAppInApp}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Monitor size={15} /> Open WhatsApp Web
          </button>
        </div>
      </div>

      {/* Bulk Messaging */}
      <div className="card p-5 space-y-4">
        <button onClick={() => setShowBulk(v => !v)}
          className="w-full flex items-center justify-between text-left">
          <h3 className="font-semibold flex items-center gap-2"><Users size={16} className="text-violet-500" /> Bulk Messaging</h3>
          {showBulk ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showBulk && (
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>In <strong>Web mode</strong>, bulk send opens the first customer's chat. For true bulk sending, use <strong>Business API mode</strong>.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Customer Filter</label>
                <select className="input" value={bulkFilter} onChange={e => setBulkFilter(e.target.value)}>
                  <option value="all">All Customers ({customers.length})</option>
                  <option value="active">Active Customers ({customers.filter(c => Number(c.total_orders || 0) > 0).length})</option>
                  <option value="with_dues">With Outstanding Dues ({customers.filter(c => Number(c.dues || 0) > 0).length})</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm w-full text-center">
                  <span className="text-xl font-bold text-violet-600">
                    {filteredCustomers().filter(c => c.phone).length}
                  </span>
                  <p className="text-xs text-gray-400">recipients with phone</p>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Promotion Message</label>
              <textarea className="input resize-none" rows={3}
                placeholder="E.g. Get 20% off this weekend on all items! Visit us today."
                value={bulkPromo} onChange={e => setBulkPromo(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">This text replaces <code>{'{promoText}'}</code> in your promotion template.</p>
            </div>

            {bulkProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Sending...</span>
                  <span>{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
                </div>
              </div>
            )}

            <button onClick={handleBulkSend} disabled={sending || !bulkPromo.trim()}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
              {sending ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
              {sending ? 'Sending...' : `Send to ${filteredCustomers().filter(c => c.phone).length} Customers`}
            </button>
          </div>
        )}
      </div>

      {/* ── Invoice Send Settings ─────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <button
          onClick={() => setShowInvoiceSend((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="font-semibold flex items-center gap-2 text-base">
            <FileText size={16} className="text-blue-500" /> Invoice Send Settings
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-wide">PDF</span>
          </h3>
          {showInvoiceSend ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showInvoiceSend && (
          <div className="space-y-5 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure the greeting message, message body, and second recipient for invoice WhatsApp sharing.
              These settings are used by the <strong>Send Invoice</strong> button on checkout and the invoice list.
            </p>

            {/* Variable reference */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Available variables: </span>
              {['{customerName}','{businessName}','{invoiceNumber}','{total}','{currency}','{date}','{itemCount}','{paymentMode}','{itemsList}'].map((v) => (
                <code key={v} className="mx-0.5 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-300">{v}</code>
              ))}
            </div>

            {/* Greeting */}
            <div>
              <label className="label">Greeting Message</label>
              <input
                className="input"
                value={sendSettings.greetingMessage}
                onChange={(e) => setSendSettings((p) => ({ ...p, greetingMessage: e.target.value }))}
                placeholder="Dear {customerName}, thank you for shopping with *{businessName}*! 🙏"
              />
              <p className="text-xs text-gray-400 mt-1">This is the first line of every invoice WhatsApp message.</p>
            </div>

            {/* Message body */}
            <div>
              <label className="label">Message Body</label>
              <textarea
                className="input resize-none font-mono text-xs"
                rows={5}
                value={sendSettings.messageBody}
                onChange={(e) => setSendSettings((p) => ({ ...p, messageBody: e.target.value }))}
              />
            </div>

            {/* Footer */}
            <div>
              <label className="label">Message Footer</label>
              <input
                className="input"
                value={sendSettings.messageFooter}
                onChange={(e) => setSendSettings((p) => ({ ...p, messageFooter: e.target.value }))}
                placeholder="For any queries, feel free to contact us."
              />
            </div>

            {/* Toggles */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only" checked={sendSettings.includeItemsList}
                    onChange={(e) => setSendSettings((p) => ({ ...p, includeItemsList: e.target.checked }))} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${sendSettings.includeItemsList ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendSettings.includeItemsList ? 'translate-x-5' : ''}`} />
                </div>
                <div>
                  <span className="text-sm font-medium">Include items list</span>
                  <p className="text-xs text-gray-400">Appends itemised breakdown to message.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only" checked={sendSettings.autoSendOnCheckout}
                    onChange={(e) => setSendSettings((p) => ({ ...p, autoSendOnCheckout: e.target.checked }))} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${sendSettings.autoSendOnCheckout ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendSettings.autoSendOnCheckout ? 'translate-x-5' : ''}`} />
                </div>
                <div>
                  <span className="text-sm font-medium">Auto-open after checkout</span>
                  <p className="text-xs text-gray-400">Opens WhatsApp automatically on save.</p>
                </div>
              </label>
            </div>

            {/* PDF Format */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">PDF Format</label>
                <select className="input" value={sendSettings.pdfFormat}
                  onChange={(e) => setSendSettings((p) => ({ ...p, pdfFormat: e.target.value }))}>
                  <option value="a4">A4 (standard invoice)</option>
                  <option value="thermal">Thermal (receipt style)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Format used when generating the PDF to attach in WhatsApp.</p>
              </div>
            </div>

            {/* Second Recipient */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus size={15} className="text-violet-500" />
                  <div>
                    <p className="font-semibold text-sm">Second Recipient</p>
                    <p className="text-xs text-gray-400">Send a copy to a second number (e.g. store owner, manager).</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={sendSettings.secondRecipientEnabled}
                      onChange={(e) => setSendSettings((p) => ({ ...p, secondRecipientEnabled: e.target.checked }))} />
                    <div className={`w-10 h-5 rounded-full transition-colors ${sendSettings.secondRecipientEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendSettings.secondRecipientEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>

              {sendSettings.secondRecipientEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Phone Number</label>
                    <div className="flex">
                      <span className="flex items-center px-3 border border-r-0 border-gray-200 dark:border-gray-600 rounded-l-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-500">+</span>
                      <input
                        className="input rounded-l-none flex-1"
                        placeholder="919876543210"
                        value={sendSettings.secondRecipientPhone}
                        onChange={(e) => setSendSettings((p) => ({ ...p, secondRecipientPhone: e.target.value.replace(/\D/g, '') }))}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Normalised: <span className="font-mono text-blue-500">{normalizePhone(sendSettings.secondRecipientPhone) || 'not set'}</span>
                    </p>
                  </div>
                  <div>
                    <label className="label">Label</label>
                    <input
                      className="input"
                      placeholder="Store Copy"
                      value={sendSettings.secondRecipientLabel}
                      onChange={(e) => setSendSettings((p) => ({ ...p, secondRecipientLabel: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Label shown in the send modal.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reset + Save row */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <button
                onClick={() => setSendSettings({ ...DEFAULT_INVOICE_SEND_SETTINGS })}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1.5"
              >
                <RotateCcw size={12} /> Reset to defaults
              </button>
              <button onClick={handleSaveInvoiceSend} disabled={savingSend} className="btn-primary flex items-center gap-2 text-sm">
                {savingSend ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                {savingSend ? 'Saving…' : 'Save Invoice Send Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-gray-500">
            Settings are saved locally in your POS database. Templates persist across restarts.
          </p>
          <button onClick={handleSave} disabled={saving} className="btn-primary shrink-0 flex items-center gap-2">
            {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save WhatsApp Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

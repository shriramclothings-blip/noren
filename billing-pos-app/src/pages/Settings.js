import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportBackup, importBackup, dbGetAll } from '../db/db';
import { Save, Upload, Download, Building2, FileText, Shield, Bug, Printer, Cloud, RefreshCw, Wifi, Trash2, DatabaseZap, Volume2, VolumeX, Music, MessageCircle, Sparkles, KeyRound, Star, Tag, Package, ToggleLeft, ShoppingCart, AlertTriangle, Type, Globe } from 'lucide-react';
import { getSetting, setSetting } from '../db/db';
import { loadSound, playSound } from '../utils/soundManager';
import toast from 'react-hot-toast';
import PaymentGatewaySettingsPanel from '../components/PaymentGatewaySettingsPanel';
import PrintSettingsPanel from '../components/PrintSettingsPanel';
import WhatsAppSettingsPanel from '../components/WhatsAppSettingsPanel';
import AISettingsPanel from '../components/AISettingsPanel';
import LicenseActivationPanel from '../components/LicenseActivationPanel';
import InvoiceTextStylesPanel from '../components/InvoiceTextStylesPanel';
import NetworkSettingsPanelEmbedded from '../components/NetworkSettingsPanelEmbedded';
import WebsiteIntegration from './WebsiteIntegration';
import { DEFAULT_FEATURE_TOGGLES, mergeFeatureToggles } from '../utils/featureSettings';

export default function Settings() {
  const {
    company, saveCompany, currentUser, printSettings, savePrintSettings,
    cloudSyncConfig, cloudSyncStatus, cloudSyncLogs,
    saveCloudSyncSettings, testCloudSyncConnection, forceCloudSyncNow,
    clearCloudSyncCache, retryFailedCloudSyncQueue, refreshCloudSyncState,
  } = useApp();
  const [form, setForm] = useState({ ...company });
  const [cloudForm, setCloudForm] = useState({
    enabled: false,
    apiEndpoint: 'https://ram1-ai0s.onrender.com',
    businessId: '',
    deviceId: '',
    syncSecretKey: '',
    jwtToken: '',
    deviceAuthToken: '',
    autoSync: true,
    syncIntervalSeconds: 10,
    batchSize: 10,
    retryIntervalSeconds: 30,
    maxRetryAttempts: 5,
  });
  const [tab, setTab] = useState('company');

  // ── Feature settings state ──────────────────────────────────────────────────
  const [loyaltyForm, setLoyaltyForm] = useState({ pointsPer100: 10, redeemRate: 0.5, minRedeemPoints: 10, maxRedeemPct: 100, expiryDays: 0 });
  const [posForm, setPosForm] = useState({ requireCustomer: false, allowNegativeStock: true, defaultPaymentMode: 'Cash', defaultTaxRate: 18, autoPrintAfterCheckout: false, reviewBeforeCheckout: false, maxDiscountPct: 100 });
  const [expiryForm, setExpiryForm] = useState({ warningDays: 30, criticalDays: 7, autoHideExpired: false, notifyOnLogin: true });
  const [discountForm, setDiscountForm] = useState({ maxDiscountPct: 50, requireApproval: false, approvalThresholdPct: 20, allowCouponStacking: false });
  const [inventoryForm, setInventoryForm] = useState({ lowStockThreshold: 5, negativeStockAlert: true, autoDeductOnSale: true, trackBatchExpiry: true });
  const [featuresForm, setFeaturesForm] = useState(DEFAULT_FEATURE_TOGGLES);
  const [featureSettingsBusy, setFeatureSettingsBusy] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');

  // Keep the editable form in sync when settings load from IndexedDB
  useEffect(() => {
    setForm({ ...(company || {}) });
  }, [company]);

  // Load feature settings from IndexedDB
  useEffect(() => {
    const load = async () => {
      try {
        const [ls, ps, es, ds, inv, ft] = await Promise.all([
          getSetting('loyaltySettings'),
          getSetting('posSettings'),
          getSetting('expirySettings'),
          getSetting('discountSettings'),
          getSetting('inventorySettings'),
          getSetting('featuresToggle'),
        ]);
        if (ls) setLoyaltyForm(f => ({ ...f, ...ls }));
        if (ps) setPosForm(f => ({ ...f, ...ps }));
        if (es) setExpiryForm(f => ({ ...f, ...es }));
        if (ds) setDiscountForm(f => ({ ...f, ...ds }));
        if (inv) setInventoryForm(f => ({ ...f, ...inv }));
        if (ft) setFeaturesForm(mergeFeatureToggles(ft));
      } catch {}
    };
    load();
  }, []);

  // (Sound reloading is now handled by saveCompany in AppContext via loadAllSounds)

  useEffect(() => {
    setCloudForm((prev) => ({
      ...prev,
      ...(cloudSyncConfig || {}),
    }));
  }, [cloudSyncConfig]);

  const handleSave = () => saveCompany(form);

  const emitSettingsEvent = (eventName, detail) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  const saveSettingsGroup = async (key, value, label, eventName = null) => {
    setFeatureSettingsBusy(true);
    try {
      await setSetting(key, value);
      if (eventName) emitSettingsEvent(eventName, value);
      toast.success(`${label} saved`);
    } catch {
      toast.error(`Failed to save ${label.toLowerCase()}`);
    } finally {
      setFeatureSettingsBusy(false);
    }
  };

  const savePosSettings = async () => {
    const next = {
      ...posForm,
      defaultTaxRate: Math.max(0, Number(posForm.defaultTaxRate) || 0),
      maxDiscountPct: Math.min(100, Math.max(0, Number(posForm.maxDiscountPct) || 0)),
    };
    setPosForm(next);
    await saveSettingsGroup('posSettings', next, 'POS settings', 'pos-settings-changed');
  };

  const saveLoyaltySettings = async () => {
    try {
      const existing = (await getSetting('loyaltySettings')) || {};
      const next = {
        ...existing,
        ...loyaltyForm,
        pointsPer100: Math.max(0, Number(loyaltyForm.pointsPer100) || 0),
        redeemRate: Math.max(0, Number(loyaltyForm.redeemRate) || 0),
        minRedeemPoints: Math.max(0, Number(loyaltyForm.minRedeemPoints) || 0),
        maxRedeemPct: Math.min(100, Math.max(0, Number(loyaltyForm.maxRedeemPct) || 0)),
        expiryDays: Math.max(0, Number(loyaltyForm.expiryDays) || 0),
      };
      setLoyaltyForm(next);
      await saveSettingsGroup('loyaltySettings', next, 'Loyalty settings', 'loyalty-settings-changed');
    } catch {
      toast.error('Failed to save loyalty settings');
    }
  };

  const saveExpirySettings = async () => {
    const next = {
      ...expiryForm,
      warningDays: Math.max(1, Number(expiryForm.warningDays) || 1),
      criticalDays: Math.max(1, Number(expiryForm.criticalDays) || 1),
    };
    if (next.criticalDays > next.warningDays) {
      return toast.error('Critical days cannot be greater than warning days');
    }
    setExpiryForm(next);
    await saveSettingsGroup('expirySettings', next, 'Expiry settings');
  };

  const saveDiscountSettings = async () => {
    const next = {
      ...discountForm,
      maxDiscountPct: Math.min(100, Math.max(0, Number(discountForm.maxDiscountPct) || 0)),
      approvalThresholdPct: Math.min(100, Math.max(0, Number(discountForm.approvalThresholdPct) || 0)),
    };
    setDiscountForm(next);
    await saveSettingsGroup('discountSettings', next, 'Discount settings');
  };

  const saveInventorySettings = async () => {
    const next = {
      ...inventoryForm,
      lowStockThreshold: Math.max(0, Number(inventoryForm.lowStockThreshold) || 0),
    };
    setInventoryForm(next);
    await saveSettingsGroup('inventorySettings', next, 'Inventory settings', 'inventory-settings-changed');
  };

  const saveFeatureToggles = async () => {
    const next = mergeFeatureToggles(featuresForm);
    setFeaturesForm(next);
    await saveSettingsGroup('featuresToggle', next, 'Feature visibility', 'feature-settings-changed');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (!dataUrl) return toast.error('Failed to read image');
      setForm(p => ({ ...p, logoSrc: dataUrl, showLogo: true }));
      toast.success('Logo updated (click Save Settings)');
    };
    reader.readAsDataURL(file);
  };

  const handleBackup = async () => {
    const data = await exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded!');
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await importBackup(ev.target.result);
        toast.success('Data restored! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } catch { toast.error('Invalid backup file'); }
    };
    reader.readAsText(file);
  };

  const TABS = [
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'invoice', label: 'Invoice', icon: FileText },
    { key: 'invoiceStyles', label: 'Invoice Styles', icon: Type },
    { key: 'pos', label: 'POS', icon: ShoppingCart },
    { key: 'loyalty', label: 'Loyalty', icon: Star },
    { key: 'expiry', label: 'Expiry', icon: AlertTriangle },
    { key: 'discount', label: 'Discounts', icon: Tag },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'features', label: 'Features', icon: ToggleLeft },
    { key: 'network', label: 'Network & Multi-Counter', icon: Wifi },
    { key: 'print', label: 'Print & Barcode', icon: Printer },
    { key: 'sound', label: 'Sound', icon: Volume2 },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { key: 'ai', label: 'AI & Integrations', icon: Sparkles },
    { key: 'cloud', label: 'Cloud Sync', icon: Cloud },
    { key: 'website', label: 'Website Integration', icon: Globe },
    ...(currentUser?.role === 'admin' ? [{ key: 'payment', label: 'Payments', icon: Shield }] : []),
    { key: 'backup', label: 'Backup', icon: Download },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'license', label: 'License', icon: KeyRound },
    ...(currentUser?.role === 'admin' ? [{ key: 'diagnostics', label: 'Diagnostics', icon: Bug }] : []),
  ];

  useEffect(() => {
    const loadLogs = async () => {
      if (tab !== 'diagnostics') return;
      setLoadingLogs(true);
      try {
        const rows = await dbGetAll('logs');
        const sorted = (rows || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(sorted.slice(0, 200));
      } catch {
        setLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };
    loadLogs();
  }, [tab]);

  const logsSummary = useMemo(() => {
    const errorCount = logs.filter(l => l.level === 'error').length;
    const warnCount = logs.filter(l => l.level === 'warn').length;
    return { total: logs.length, errorCount, warnCount };
  }, [logs]);

  const exportLogs = async () => {
    try {
      const rows = await dbGetAll('logs');
      const data = JSON.stringify(rows || [], null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Logs exported!');
    } catch {
      toast.error('Failed to export logs');
    }
  };

  const handleCloudSave = async () => {
    setCloudBusy(true);
    setCloudMessage('Saving and validating cloud sync settings...');
    const result = await saveCloudSyncSettings(cloudForm);
    if (result.success) {
      toast.success('Cloud sync connected successfully');
      setCloudMessage('Connected to cloud server');
    } else {
      toast.error(result.error || 'Cloud sync connection failed');
      setCloudMessage(result.error || 'Connection failed');
    }
    setCloudBusy(false);
  };

  const handleCloudTest = async () => {
    setCloudBusy(true);
    setCloudMessage('Testing cloud connection...');
    const result = await testCloudSyncConnection(cloudForm);
    if (result.success) {
      toast.success('Cloud endpoint responded successfully');
      setCloudMessage('Endpoint reachable');
    } else {
      toast.error(result.error || 'Endpoint test failed');
      setCloudMessage(result.error || 'Endpoint test failed');
    }
    setCloudBusy(false);
  };

  const handleCloudAction = async (action) => {
    setCloudBusy(true);
    setCloudMessage('Working...');
    try {
      if (action === 'force') {
        await forceCloudSyncNow();
        toast.success('Cloud sync worker triggered');
        setCloudMessage('Sync worker started');
      } else if (action === 'retry') {
        await retryFailedCloudSyncQueue();
        toast.success('Failed items re-queued');
        setCloudMessage('Retry queue updated');
      } else if (action === 'clear') {
        await clearCloudSyncCache();
        toast.success('Cloud queue cleared');
        setCloudMessage('Queue cache cleared');
      } else if (action === 'refresh') {
        await refreshCloudSyncState();
        toast.success('Status refreshed');
        setCloudMessage('Status refreshed');
      }
    } catch {
      toast.error('Cloud action failed');
      setCloudMessage('Action failed');
    }
    setCloudBusy(false);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto max-w-full">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${tab === key ? 'bg-white dark:bg-gray-700 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Company Settings */}
      {tab === 'company' && (
        <div className="card p-6 space-y-4 max-w-2xl">
          <h2 className="font-semibold text-lg">Company Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Business Name', key: 'name', type: 'text', full: true },
              { label: 'Phone', key: 'phone', type: 'tel' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'GSTIN', key: 'gstin', type: 'text' },
              { label: 'Currency Symbol', key: 'currency', type: 'text' },
              { label: 'Default Tax Rate (%)', key: 'taxRate', type: 'number' },
            ].map(f => (
              <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                <label className="label">{f.label}</label>
                <input className="input" type={f.type} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div className="col-span-2">
              <label className="label">Address</label>
              <textarea className="input resize-none" rows={2} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Customer Display Controls</h3>
              <p className="text-xs text-gray-400 mt-1">These settings are used by the offline customer display and idle promotion screen.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Brand Color</label>
                <input type="color" className="h-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" value={form.customerDisplayBrandColor || '#0f172a'} onChange={e => setForm(p => ({ ...p, customerDisplayBrandColor: e.target.value }))} />
              </div>
              <div>
                <label className="label">Accent Color</label>
                <input type="color" className="h-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" value={form.customerDisplayAccentColor || '#22d3ee'} onChange={e => setForm(p => ({ ...p, customerDisplayAccentColor: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.customerDisplayAutoOpen !== false} onChange={e => setForm(p => ({ ...p, customerDisplayAutoOpen: e.target.checked }))} className="rounded" />
                Auto-open customer display
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.customerDisplayAutoClose === true} onChange={e => setForm(p => ({ ...p, customerDisplayAutoClose: e.target.checked }))} className="rounded" />
                Auto-close customer display on idle
              </label>
            </div>
            <div>
              <label className="label">Idle Welcome Message</label>
              <textarea className="input resize-none" rows={2} value={form.customerDisplayIdleMessage || ''} onChange={e => setForm(p => ({ ...p, customerDisplayIdleMessage: e.target.value }))} />
            </div>
            <div>
              <label className="label">Promotion / Offer Message</label>
              <textarea className="input resize-none" rows={2} value={form.customerDisplayPromotionText || ''} onChange={e => setForm(p => ({ ...p, customerDisplayPromotionText: e.target.value }))} />
            </div>
          </div>

          <button onClick={handleSave} className="btn-primary"><Save size={16} /> Save Settings</button>
        </div>
      )}

      {/* Invoice Settings */}
      {tab === 'invoice' && (
        <div className="card p-6 space-y-4 max-w-2xl">
          <h2 className="font-semibold text-lg">Invoice Customization</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Invoice Prefix</label>
                <input className="input" placeholder="INV" value={form.invoicePrefix || 'INV'} onChange={e => setForm(p => ({ ...p, invoicePrefix: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date Format</label>
                <select className="input" value={form.invoiceDateFormat || 'DDMMYY'} onChange={e => setForm(p => ({ ...p, invoiceDateFormat: e.target.value }))}>
                  <option value="DDMMYY">DDMMYY</option>
                  <option value="YYMMDD">YYMMDD</option>
                  <option value="YYYYMMDD">YYYYMMDD</option>
                  <option value="DDMMYYYY">DDMMYYYY</option>
                </select>
              </div>
              <div>
                <label className="label">Sequence Digits</label>
                <input className="input" type="number" min={3} max={6} value={form.invoiceSequenceDigits || 3} onChange={e => setForm(p => ({ ...p, invoiceSequenceDigits: Math.max(3, Math.min(6, Number(e.target.value) || 3)) }))} />
              </div>
              <div className="pt-6">
                <p className="text-xs text-gray-400">Invoice numbers will use the configured prefix, date code and sequence digits.</p>
                <p className="text-xs text-gray-400 mt-2">Example: <span className="font-mono">{(form.invoicePrefix || 'INV')}-240525{String(1).padStart(form.invoiceSequenceDigits || 3, '0')}</span></p>
              </div>
            </div>
            <div>
              <label className="label">Invoice Footer Note</label>
              <textarea className="input resize-none" rows={3} placeholder="Thank you for your business!" value={form.invoiceNote || ''} onChange={e => setForm(p => ({ ...p, invoiceNote: e.target.value }))} />
            </div>
            <div>
              <label className="label">Terms & Conditions</label>
              <textarea className="input resize-none" rows={3} placeholder="Goods once sold will not be taken back..." value={form.terms || ''} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} />
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <p className="font-semibold text-sm">Terms Preview</p>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap min-h-[72px]">
                {form.terms?.trim() || 'No terms found. Enter your store policies and terms to show them on every invoice.'}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="showLogo" checked={form.showLogo !== false} onChange={e => setForm(p => ({ ...p, showLogo: e.target.checked }))} className="rounded" />
                <label htmlFor="showLogo" className="text-sm">Show company logo on invoice</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="enableDeleteInvoice" checked={form.enableDeleteInvoice === true} onChange={e => setForm(p => ({ ...p, enableDeleteInvoice: e.target.checked }))} className="rounded" />
                <label htmlFor="enableDeleteInvoice" className="text-sm text-red-600 dark:text-red-400 font-medium">Enable Delete Invoice Button (Dangerous - use with caution)</label>
              </div>
              <p className="text-xs text-gray-400 pl-6">When disabled, the delete button will be hidden from the invoice list for data safety.</p>
            </div>

            {/* Invoice logo upload */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Invoice Logo</p>
                  <p className="text-xs text-gray-400">Upload a logo once and it will appear on every invoice print/PDF.</p>
                </div>
                <div className="flex gap-2">
                  <label className="btn-secondary cursor-pointer">
                    <Upload size={16} /> Choose Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, logoSrc: 'brand-logo.png' }))}
                    className="btn-secondary"
                    title="Reset to default logo"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                {form.showLogo === false ? (
                  <p className="text-xs text-gray-400">Logo is disabled</p>
                ) : (
                  <img
                    src={form.logoSrc || 'brand-logo.png'}
                    alt="Invoice Logo Preview"
                    className="max-h-14 object-contain"
                    onError={(ev) => { ev.currentTarget.src = 'brand-logo.png'; }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="showSign" checked={form.showSign !== false} onChange={e => setForm(p => ({ ...p, showSign: e.target.checked }))} className="rounded" />
              <label htmlFor="showSign" className="text-sm">Show signature line on invoice</label>
            </div>
          </div>

            {/* Invoice QR settings */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Invoice QR Code</p>
                  <p className="text-xs text-gray-400">Optional QR on invoice (for payment link, website, invoice info, etc.).</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="invoiceQrEnabled"
                    checked={form.invoiceQrEnabled === true}
                    onChange={(e) => setForm(p => ({ ...p, invoiceQrEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="invoiceQrEnabled" className="text-sm">Enable</label>
                </div>
              </div>
              <div>
                <label className="label">QR Text / Link</label>
                <input
                  className="input"
                  placeholder="Example: https://yourshop.com or UPI link"
                  value={form.invoiceQrText || ''}
                  onChange={(e) => setForm(p => ({ ...p, invoiceQrText: e.target.value }))}
                  disabled={!form.invoiceQrEnabled}
                />
                <p className="text-xs text-gray-400 mt-1">
                  You can use placeholders: <span className="font-mono">{'{invoiceNumber}'}</span>, <span className="font-mono">{'{total}'}</span>, <span className="font-mono">{'{date}'}</span>
                </p>
              </div>
              <div>
                <label className="label">QR Description (text below QR)</label>
                <input
                  className="input"
                  placeholder="Example: Scan to Pay"
                  value={form.invoiceQrDescription || ''}
                  onChange={(e) => setForm(p => ({ ...p, invoiceQrDescription: e.target.value }))}
                  disabled={!form.invoiceQrEnabled}
                />
              </div>
              <div>
                <label className="label">QR Size</label>
                <select
                  className="input"
                  value={String(form.invoiceQrSizePx || 70)}
                  onChange={(e) => setForm(p => ({ ...p, invoiceQrSizePx: Number(e.target.value) }))}
                  disabled={!form.invoiceQrEnabled}
                >
                  <option value="60">Small</option>
                  <option value="70">Medium</option>
                  <option value="90">Large</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">QR will be printed at the bottom of invoice.</p>
              </div>
            </div>

            {/* Full invoice barcode settings */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Invoice Barcode (Full Data)</p>
                  <p className="text-xs text-gray-400">Prints a 2D barcode (PDF417) containing full invoice + items data.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="invoiceFullBarcodeEnabled"
                    checked={form.invoiceFullBarcodeEnabled !== false}
                    onChange={(e) => setForm(p => ({ ...p, invoiceFullBarcodeEnabled: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="invoiceFullBarcodeEnabled" className="text-sm">Enable</label>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Note: This barcode will be bigger on the invoice because it stores all item lines.
              </p>
            </div>
          <button onClick={handleSave} className="btn-primary"><Save size={16} /> Save Settings</button>
        </div>
      )}

      {/* Invoice Text Styles */}
      {tab === 'invoiceStyles' && (
        <InvoiceTextStylesPanel />
      )}

      {tab === 'pos' && (
        <SettingsTabCard
          title="POS Rules"
          description="Control billing defaults, customer requirement, discount limits and checkout flow."
          onSave={savePosSettings}
          busy={featureSettingsBusy}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SettingInput
              label="Default Payment Mode"
              as="select"
              value={posForm.defaultPaymentMode || 'Cash'}
              onChange={(value) => setPosForm((p) => ({ ...p, defaultPaymentMode: value }))}
              options={['Cash', 'UPI', 'Card', 'Credit', 'Cheque', 'Net Banking']}
            />
            <SettingInput
              label="Default Tax Rate (%)"
              type="number"
              min={0}
              step={0.01}
              value={posForm.defaultTaxRate ?? 18}
              onChange={(value) => setPosForm((p) => ({ ...p, defaultTaxRate: value }))}
            />
            <SettingInput
              label="Maximum Discount (%)"
              type="number"
              min={0}
              max={100}
              value={posForm.maxDiscountPct ?? 100}
              onChange={(value) => setPosForm((p) => ({ ...p, maxDiscountPct: value }))}
              helper="This cap is enforced against the current bill subtotal in POS."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingToggle
              checked={posForm.requireCustomer === true}
              onChange={(checked) => setPosForm((p) => ({ ...p, requireCustomer: checked }))}
              label="Require customer before checkout"
              description="Blocks checkout until a customer is selected."
            />
            <SettingToggle
              checked={posForm.allowNegativeStock !== false}
              onChange={(checked) => setPosForm((p) => ({ ...p, allowNegativeStock: checked }))}
              label="Allow selling beyond stock"
              description="If disabled, POS stops checkout when any line exceeds available stock."
            />
            <SettingToggle
              checked={posForm.autoPrintAfterCheckout === true}
              onChange={(checked) => setPosForm((p) => ({ ...p, autoPrintAfterCheckout: checked }))}
              label="Auto-print after checkout"
              description="Triggers bill auto-print after a successful sale."
            />
            <SettingToggle
              checked={posForm.reviewBeforeCheckout === true}
              onChange={(checked) => setPosForm((p) => ({ ...p, reviewBeforeCheckout: checked }))}
              label="Force review before final save"
              description="Requires Review Receipt and Payment OK for finalizing the bill."
            />
          </div>
        </SettingsTabCard>
      )}

      {tab === 'loyalty' && (
        <SettingsTabCard
          title="Loyalty Settings"
          description="These values are now used by billing and loyalty redemption. Tier definitions still stay inside Loyalty Engine."
          onSave={saveLoyaltySettings}
          busy={featureSettingsBusy}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SettingInput
              label="Points per ₹100"
              type="number"
              min={0}
              value={loyaltyForm.pointsPer100 ?? 10}
              onChange={(value) => setLoyaltyForm((p) => ({ ...p, pointsPer100: value }))}
            />
            <SettingInput
              label="Redeem value per point"
              type="number"
              min={0}
              step={0.01}
              value={loyaltyForm.redeemRate ?? 0.5}
              onChange={(value) => setLoyaltyForm((p) => ({ ...p, redeemRate: value }))}
            />
            <SettingInput
              label="Minimum redeem points"
              type="number"
              min={0}
              value={loyaltyForm.minRedeemPoints ?? 10}
              onChange={(value) => setLoyaltyForm((p) => ({ ...p, minRedeemPoints: value }))}
            />
            <SettingInput
              label="Max redeem per bill (%)"
              type="number"
              min={0}
              max={100}
              value={loyaltyForm.maxRedeemPct ?? 100}
              onChange={(value) => setLoyaltyForm((p) => ({ ...p, maxRedeemPct: value }))}
            />
            <SettingInput
              label="Points expiry (days)"
              type="number"
              min={0}
              value={loyaltyForm.expiryDays ?? 0}
              onChange={(value) => setLoyaltyForm((p) => ({ ...p, expiryDays: value }))}
              helper="Use `0` to keep points without expiry."
            />
          </div>
        </SettingsTabCard>
      )}

      {tab === 'expiry' && (
        <SettingsTabCard
          title="Expiry Alerts"
          description="Thresholds for highlighting expiring products and login notifications."
          onSave={saveExpirySettings}
          busy={featureSettingsBusy}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SettingInput
              label="Warning days"
              type="number"
              min={1}
              value={expiryForm.warningDays ?? 30}
              onChange={(value) => setExpiryForm((p) => ({ ...p, warningDays: value }))}
            />
            <SettingInput
              label="Critical days"
              type="number"
              min={1}
              value={expiryForm.criticalDays ?? 7}
              onChange={(value) => setExpiryForm((p) => ({ ...p, criticalDays: value }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingToggle
              checked={expiryForm.autoHideExpired === true}
              onChange={(checked) => setExpiryForm((p) => ({ ...p, autoHideExpired: checked }))}
              label="Auto-hide expired stock"
              description="Stores the preference for hiding expired products from filtered views."
            />
            <SettingToggle
              checked={expiryForm.notifyOnLogin !== false}
              onChange={(checked) => setExpiryForm((p) => ({ ...p, notifyOnLogin: checked }))}
              label="Show expiry alerts on login"
              description="Keeps the expiry workflow visible to staff at sign-in."
            />
          </div>
        </SettingsTabCard>
      )}

      {tab === 'discount' && (
        <SettingsTabCard
          title="Discount Controls"
          description="Manage approval thresholds and store-wide discount policy."
          onSave={saveDiscountSettings}
          busy={featureSettingsBusy}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SettingInput
              label="Maximum manual discount (%)"
              type="number"
              min={0}
              max={100}
              value={discountForm.maxDiscountPct ?? 50}
              onChange={(value) => setDiscountForm((p) => ({ ...p, maxDiscountPct: value }))}
            />
            <SettingInput
              label="Approval threshold (%)"
              type="number"
              min={0}
              max={100}
              value={discountForm.approvalThresholdPct ?? 20}
              onChange={(value) => setDiscountForm((p) => ({ ...p, approvalThresholdPct: value }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingToggle
              checked={discountForm.requireApproval === true}
              onChange={(checked) => setDiscountForm((p) => ({ ...p, requireApproval: checked }))}
              label="Require approval for high discounts"
              description="Stores an approval policy for advanced discount workflows."
            />
            <SettingToggle
              checked={discountForm.allowCouponStacking === true}
              onChange={(checked) => setDiscountForm((p) => ({ ...p, allowCouponStacking: checked }))}
              label="Allow coupon stacking"
              description="Keeps combined-discount behavior configurable for future coupon flows."
            />
          </div>
        </SettingsTabCard>
      )}

      {tab === 'inventory' && (
        <SettingsTabCard
          title="Inventory Controls"
          description="Manage low-stock defaults and core stock-handling preferences."
          onSave={saveInventorySettings}
          busy={featureSettingsBusy}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SettingInput
              label="Default low-stock threshold"
              type="number"
              min={0}
              value={inventoryForm.lowStockThreshold ?? 5}
              onChange={(value) => setInventoryForm((p) => ({ ...p, lowStockThreshold: value }))}
              helper="Used by shared low-stock alerts when a product-specific minimum is not set."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingToggle
              checked={inventoryForm.negativeStockAlert !== false}
              onChange={(checked) => setInventoryForm((p) => ({ ...p, negativeStockAlert: checked }))}
              label="Negative stock alert"
              description="Keeps negative-stock situations visible in inventory workflows."
            />
            <SettingToggle
              checked={inventoryForm.autoDeductOnSale !== false}
              onChange={(checked) => setInventoryForm((p) => ({ ...p, autoDeductOnSale: checked }))}
              label="Auto-deduct stock on sale"
              description="Represents the active stock deduction policy used by billing."
            />
            <SettingToggle
              checked={inventoryForm.trackBatchExpiry === true}
              onChange={(checked) => setInventoryForm((p) => ({ ...p, trackBatchExpiry: checked }))}
              label="Track batch expiry"
              description="Keeps batch-expiry workflows enabled for expiry-sensitive inventory."
            />
          </div>
        </SettingsTabCard>
      )}

      {tab === 'features' && (
        <SettingsTabCard
          title="Feature Visibility"
          description="Hide or show optional modules in navigation. Disabled modules are also blocked from direct page access."
          onSave={saveFeatureToggles}
          busy={featureSettingsBusy}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <SettingToggle
              checked={featuresForm.loyaltyEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, loyaltyEnabled: checked }))}
              label="Loyalty Engine"
              description="Controls access to the loyalty page."
            />
            <SettingToggle
              checked={featuresForm.expiryTrackerEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, expiryTrackerEnabled: checked }))}
              label="Expiry Tracker"
              description="Controls access to expiry monitoring."
            />
            <SettingToggle
              checked={featuresForm.discountEngineEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, discountEngineEnabled: checked }))}
              label="Discount Engine"
              description="Controls access to the discount engine page."
            />
            <SettingToggle
              checked={featuresForm.abcAnalysisEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, abcAnalysisEnabled: checked }))}
              label="ABC Analysis"
              description="Controls access to ABC inventory analysis."
            />
            <SettingToggle
              checked={featuresForm.salesHeatmapEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, salesHeatmapEnabled: checked }))}
              label="Sales Heatmap"
              description="Controls access to sales heatmap insights."
            />
            <SettingToggle
              checked={featuresForm.customerInsightsEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, customerInsightsEnabled: checked }))}
              label="Customer Insights"
              description="Controls access to customer analytics."
            />
            <SettingToggle
              checked={featuresForm.warehouseEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, warehouseEnabled: checked }))}
              label="Warehouse"
              description="Controls access to warehouse and godown tools."
            />
            <SettingToggle
              checked={featuresForm.smartPurchaseEnabled !== false}
              onChange={(checked) => setFeaturesForm((p) => ({ ...p, smartPurchaseEnabled: checked }))}
              label="Smart Purchase"
              description="Controls access to smart purchase suggestions."
            />
          </div>
        </SettingsTabCard>
      )}

      {/* Network & Multi-Counter Settings */}
      {tab === 'network' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Wifi size={24} className="text-blue-600" />
                  Network & Multi-Counter
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Connect multiple counters on the same network for real-time data sync and remote printing
                </p>
              </div>
            </div>

            <NetworkSettingsPanelEmbedded />
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 border-l-4 border-blue-500">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">📡 Real-Time Sync</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All invoices, products, and customers sync automatically across all connected devices
              </p>
            </div>
            <div className="card p-4 border-l-4 border-green-500">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">🖨️ Remote Printing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secondary counters can print invoices on the main device's printer automatically
              </p>
            </div>
            <div className="card p-4 border-l-4 border-purple-500">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">🔌 Offline Capable</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Each device works independently offline and syncs when connection is restored
              </p>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📚 Quick Setup Guide</h3>
            
            <div className="space-y-6">
              {/* Main Device Setup */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                    1
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Setup Main Device (Server)</h4>
                </div>
                <div className="ml-10 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>• This is your main counter with the printer connected</p>
                  <p>• Click the network icon above and go to "Server Setup"</p>
                  <p>• Click "Start Server" and note the IP address shown</p>
                  <p>• Status should show "Server Active" in green</p>
                </div>
              </div>

              {/* Secondary Device Setup */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 font-semibold">
                    2
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Connect Secondary Devices (Clients)</h4>
                </div>
                <div className="ml-10 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>• On each additional counter, click the network icon</p>
                  <p>• Go to "Client Setup" and click "Discover" to find the server automatically</p>
                  <p>• Or manually enter the server IP address</p>
                  <p>• Enable "Auto-reconnect" and click "Connect"</p>
                  <p>• Status should show "Connected" in green</p>
                </div>
              </div>

              {/* Verification */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 font-semibold">
                    3
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Verify Everything Works</h4>
                </div>
                <div className="ml-10 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>• Create a test product on one device and check if it appears on others</p>
                  <p>• Generate a test invoice on a secondary counter and verify printing</p>
                  <p>• Check network status indicator stays green</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="card p-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4">⚙️ Requirements</h3>
            <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <p>✓ All devices must be on the <strong>same WiFi network</strong> OR connected via <strong>LAN cable</strong></p>
              <p>✓ Port <strong>9876</strong> (TCP) must not be blocked by firewall</p>
              <p>✓ Port <strong>9877</strong> (UDP) must be open for auto-discovery</p>
              <p>✓ Main device should have a <strong>stable connection</strong> (wired LAN recommended)</p>
              <p>✓ All devices should run the <strong>same app version</strong></p>
            </div>
          </div>

          {/* Documentation Links */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📖 Documentation</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Quick Start Guide</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">See <code>MULTI_COUNTER_QUICK_START.md</code> for 5-minute setup instructions</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText size={20} className="text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Integration Guide</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">See <code>NETWORK_INTEGRATION_GUIDE.md</code> for complete documentation</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText size={20} className="text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Installation Checklist</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">See <code>INSTALLATION_CHECKLIST.md</code> for verification steps</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print & Barcode Settings */}
      {tab === 'print' && (
        <PrintSettingsPanel company={company} printSettings={printSettings} savePrintSettings={savePrintSettings} />
      )}

      {/* Sound Settings */}
      {tab === 'sound' && (
        <SoundSettingsTab form={form} setForm={setForm} handleSave={handleSave} />
      )}

      {/* WhatsApp Settings */}
      {tab === 'whatsapp' && (
        <WhatsAppSettingsPanel company={company} />
      )}

      {/* AI & Integrations Settings */}
      {tab === 'ai' && (
        <AISettingsPanel />
      )}

      {/* Cloud Sync Settings */}
      {tab === 'cloud' && (
        <div className="card p-6 space-y-6 max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg">Cloud Sync Management</h2>
              <p className="text-sm text-gray-500">Background synchronization keeps your local POS operational while safely queuing changes for the cloud server.</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${cloudSyncStatus?.connectionStatus === 'Connected' ? 'bg-emerald-100 text-emerald-700' : cloudSyncStatus?.connectionStatus === 'Syncing' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {cloudSyncStatus?.connectionStatus === 'Connected' ? <Wifi size={14} /> : <Cloud size={14} />} {cloudSyncStatus?.connectionStatus || 'Disconnected'}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Pending', value: cloudSyncStatus?.pendingRecords || 0, tone: 'bg-slate-100' },
              { label: 'Synced', value: cloudSyncStatus?.syncedRecords || 0, tone: 'bg-emerald-100' },
              { label: 'Failed', value: cloudSyncStatus?.failedRecords || 0, tone: 'bg-rose-100' },
              { label: 'Queue', value: cloudSyncStatus?.queueCount || 0, tone: 'bg-sky-100' },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 ${item.tone}`}>
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/70">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">Status:</span>
              <span>{cloudSyncStatus?.serverStatus || 'Unknown'}</span>
              <span className="text-gray-400">•</span>
              <span>Last Sync: {cloudSyncStatus?.lastSuccessfulSync ? new Date(cloudSyncStatus.lastSuccessfulSync).toLocaleString() : 'Never'}</span>
              <span className="text-gray-400">•</span>
              <span>Last Error: {cloudSyncStatus?.lastError || 'None'}</span>
            </div>
            {cloudMessage && <p className="mt-2 text-xs text-gray-500">{cloudMessage}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handleCloudTest} disabled={cloudBusy} className="btn-secondary"><Wifi size={16} /> Test Connection</button>
            <button onClick={handleCloudSave} disabled={cloudBusy} className="btn-primary"><Save size={16} /> Save Settings</button>
            <button onClick={() => handleCloudAction('force')} disabled={cloudBusy} className="btn-secondary"><RefreshCw size={16} /> Force Sync Now</button>
            <button onClick={() => handleCloudAction('retry')} disabled={cloudBusy} className="btn-secondary"><RefreshCw size={16} /> Retry Failed Sync</button>
            <button onClick={() => handleCloudAction('clear')} disabled={cloudBusy} className="btn-secondary"><Trash2 size={16} /> Clear Sync Cache</button>
            <button onClick={() => handleCloudAction('refresh')} disabled={cloudBusy} className="btn-secondary"><DatabaseZap size={16} /> Refresh Status</button>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold">Connection Settings</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cloudForm.enabled === true} onChange={(e) => setCloudForm((p) => ({ ...p, enabled: e.target.checked }))} />
                Enable Cloud Sync
              </label>
              <div>
                <label className="label">API Endpoint URL</label>
                <input className="input" value={cloudForm.apiEndpoint || ''} onChange={(e) => setCloudForm((p) => ({ ...p, apiEndpoint: e.target.value }))} placeholder="https://ram1-ai0s.onrender.com" />
                <p className="text-xs text-gray-400 mt-1">
                  Your cloud API: <span className="font-mono text-blue-500">https://ram1-ai0s.onrender.com</span>
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Business ID</label>
                  <input className="input" value={cloudForm.businessId || ''} onChange={(e) => setCloudForm((p) => ({ ...p, businessId: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Device ID</label>
                  <input className="input" value={cloudForm.deviceId || ''} onChange={(e) => setCloudForm((p) => ({ ...p, deviceId: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Sync Secret Key</label>
                <input className="input" type="password" value={cloudForm.syncSecretKey || ''} onChange={(e) => setCloudForm((p) => ({ ...p, syncSecretKey: e.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">JWT Token</label>
                  <input className="input" type="password" value={cloudForm.jwtToken || ''} onChange={(e) => setCloudForm((p) => ({ ...p, jwtToken: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Device Authentication Token</label>
                  <input className="input" type="password" value={cloudForm.deviceAuthToken || ''} onChange={(e) => setCloudForm((p) => ({ ...p, deviceAuthToken: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Sync Settings</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cloudForm.autoSync !== false} onChange={(e) => setCloudForm((p) => ({ ...p, autoSync: e.target.checked }))} />
                Auto Sync Enabled
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Sync Interval (seconds)</label>
                  <input className="input" type="number" min="10" value={cloudForm.syncIntervalSeconds || 10} onChange={(e) => setCloudForm((p) => ({ ...p, syncIntervalSeconds: Number(e.target.value) || 10 }))} />
                </div>
                <div>
                  <label className="label">Batch Size</label>
                  <input className="input" type="number" min="1" value={cloudForm.batchSize || 10} onChange={(e) => setCloudForm((p) => ({ ...p, batchSize: Number(e.target.value) || 10 }))} />
                </div>
                <div>
                  <label className="label">Retry Interval (seconds)</label>
                  <input className="input" type="number" min="30" value={cloudForm.retryIntervalSeconds || 30} onChange={(e) => setCloudForm((p) => ({ ...p, retryIntervalSeconds: Number(e.target.value) || 30 }))} />
                </div>
                <div>
                  <label className="label">Maximum Retry Attempts</label>
                  <input className="input" type="number" min="1" max="10" value={cloudForm.maxRetryAttempts || 5} onChange={(e) => setCloudForm((p) => ({ ...p, maxRetryAttempts: Number(e.target.value) || 5 }))} />
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                <p className="font-medium text-gray-700">Background behavior</p>
                <p className="mt-1">Every local create/update/delete is queued instantly and synced in the background every 10 seconds without blocking the billing flow.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Recent Sync Logs</h3>
              <span className="text-sm text-gray-500">{(cloudSyncLogs || []).length} entries</span>
            </div>
            <div className="space-y-2">
              {(cloudSyncLogs || []).slice(0, 8).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{log.eventType || 'sync'}</p>
                    <p className="text-xs text-gray-500">{log.entity || 'cloud-sync'} • {log.action || 'sync'}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{log.status || 'unknown'}</p>
                    <p>{log.dateTime ? new Date(log.dateTime).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Website Integration */}
      {tab === 'website' && (
        <div className="max-w-7xl">
          <WebsiteIntegration />
        </div>
      )}

      {/* Payment Gateway Settings (Admin only) */}
      {tab === 'payment' && currentUser?.role === 'admin' && (
        <PaymentGatewaySettingsPanel currentUser={currentUser} />
      )}

      {/* Backup & Restore */}
      {tab === 'backup' && (
        <div className="card p-6 space-y-6 max-w-2xl">
          <h2 className="font-semibold text-lg">Backup & Restore</h2>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            All data is stored locally in your browser's IndexedDB. Regular backups are recommended.
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="font-medium">Export Backup</p>
                <p className="text-sm text-gray-400">Download all data as JSON file</p>
              </div>
              <button onClick={handleBackup} className="btn-primary"><Download size={16} /> Download Backup</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="font-medium">Restore Backup</p>
                <p className="text-sm text-gray-400 text-red-400">⚠ This will overwrite all current data</p>
              </div>
              <label className="btn-secondary cursor-pointer">
                <Upload size={16} /> Restore
                <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="card p-6 space-y-4 max-w-2xl">
          <h2 className="font-semibold text-lg">Security Settings</h2>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
            <p className="font-medium text-sm">Current User: <span className="text-primary-600">{currentUser?.name}</span></p>
            <p className="text-sm text-gray-500">Role: <span className="capitalize badge-blue">{currentUser?.role}</span></p>
            <p className="text-sm text-gray-500">To change password or PIN, go to Staff Management and edit your profile.</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Security Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Use a strong password (min 8 characters)</li>
              <li>Set a 4-digit PIN for quick lock screen</li>
              <li>Take regular backups of your data</li>
              <li>Don't share admin credentials with staff</li>
            </ul>
          </div>
        </div>
      )}

      {/* Diagnostics (Admin only) */}
      {tab === 'license' && (
        <div className="card p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-lg">License & Activation</h2>
            <p className="text-sm text-gray-400 mt-0.5">Manage your VENDEXA RetailOS v2.0 software license</p>
          </div>
          <LicenseActivationPanel />
        </div>
      )}

      {/* Diagnostics (Admin only) */}
      {tab === 'diagnostics' && currentUser?.role === 'admin' && (
        <div className="card p-6 space-y-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Diagnostics & Error Logs</h2>
              <p className="text-sm text-gray-400">This helps identify hidden crashes and broken workflows.</p>
            </div>
            <button onClick={exportLogs} className="btn-secondary">
              <Download size={16} /> Export Logs
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{logsSummary.total}</p>
              <p className="text-xs text-gray-400">Recent entries (max 200)</p>
            </div>
            <div className="card p-4">
              <p className="text-xl font-bold text-red-500">{logsSummary.errorCount}</p>
              <p className="text-xs text-gray-400">Errors</p>
            </div>
            <div className="card p-4">
              <p className="text-xl font-bold text-amber-500">{logsSummary.warnCount}</p>
              <p className="text-xs text-gray-400">Warnings</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Time', 'Level', 'Message'].map(h => <th key={h} className="table-head">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loadingLogs && (
                  <tr><td colSpan={3} className="table-cell text-center text-gray-400 py-10">Loading logs…</td></tr>
                )}
                {!loadingLogs && logs.length === 0 && (
                  <tr><td colSpan={3} className="table-cell text-center text-gray-400 py-10">No logs yet</td></tr>
                )}
                {!loadingLogs && logs.map((l) => (
                  <tr key={l.id}>
                    <td className="table-cell whitespace-nowrap">{new Date(l.date).toLocaleString('en-IN')}</td>
                    <td className="table-cell">
                      <span className={l.level === 'error' ? 'badge-red' : l.level === 'warn' ? 'badge-yellow' : 'badge-blue'}>
                        {l.level}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium">{l.message}</div>
                      {l.detail && <div className="text-xs text-gray-400 mt-0.5 break-all">{l.detail}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTabCard({ title, description, children, onSave, busy = false, actionLabel = 'Save Settings' }) {
  return (
    <div className="card p-6 space-y-5 max-w-4xl">
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {description ? <p className="text-sm text-gray-500 mt-1">{description}</p> : null}
      </div>
      {children}
      <div className="pt-2">
        <button onClick={onSave} disabled={busy} className="btn-primary">
          <Save size={16} /> {busy ? 'Saving...' : actionLabel}
        </button>
      </div>
    </div>
  );
}

function SettingInput({ label, as = 'input', type = 'text', value, onChange, helper, options = [], ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      {as === 'select' ? (
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      )}
      {helper ? <p className="text-xs text-gray-400 mt-1">{helper}</p> : null}
    </div>
  );
}

function SettingToggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 rounded" />
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description ? <p className="text-xs text-gray-500 mt-1">{description}</p> : null}
      </div>
    </label>
  );
}

// ─── Sound Settings Tab ───────────────────────────────────────────────────────

/**
 * Configuration for each sound slot shown in the UI.
 * order, keys, labels and descriptions are all maintained here.
 */
const SOUND_SLOTS = [
  {
    slot: 'checkout',
    enabledKey: 'checkoutSoundEnabled',
    srcKey: 'checkoutSoundSrc',
    label: 'Checkout Sound',
    description: 'Plays when a Cash / Card / Credit invoice is saved.',
    accent: 'emerald',
    badge: 'Checkout',
  },
  {
    slot: 'upiSuccess',
    enabledKey: 'upiSuccessSoundEnabled',
    srcKey: 'upiSuccessSoundSrc',
    label: 'UPI Payment Success',
    description: 'Plays when a UPI payment is confirmed (manual or auto-detected).',
    accent: 'violet',
    badge: 'UPI',
  },
  {
    slot: 'partialPayment',
    enabledKey: 'partialPaymentSoundEnabled',
    srcKey: 'partialPaymentSoundSrc',
    label: 'Split / Partial Payment',
    description: 'Plays when a split-payment (Cash + UPI, etc.) invoice is finalized.',
    accent: 'sky',
    badge: 'Split',
  },
  {
    slot: 'itemAdded',
    enabledKey: 'itemAddedSoundEnabled',
    srcKey: 'itemAddedSoundSrc',
    label: 'Item Added to Cart',
    description: 'A soft click when a product is scanned or tapped into the cart.',
    accent: 'amber',
    badge: 'Cart',
  },
  {
    slot: 'newSale',
    enabledKey: 'newSaleSoundEnabled',
    srcKey: 'newSaleSoundSrc',
    label: 'New Sale / Cart Cleared',
    description: 'Plays when the cart is reset and a fresh sale begins.',
    accent: 'cyan',
    badge: 'New Sale',
  },
  {
    slot: 'error',
    enabledKey: 'errorSoundEnabled',
    srcKey: 'errorSoundSrc',
    label: 'Error / Validation Failure',
    description: 'A warning tone on validation errors, failed operations, or unknown barcodes.',
    accent: 'rose',
    badge: 'Error',
  },
  {
    slot: 'startup',
    enabledKey: 'startupSoundEnabled',
    srcKey: 'startupSoundSrc',
    label: 'App Startup',
    description: 'Optional sound played once when the POS application launches.',
    accent: 'indigo',
    badge: 'Startup',
  },
];

const ACCENT_CLASSES = {
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    loaded: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    icon: 'text-emerald-500',
  },
  violet: {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    loaded: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
    icon: 'text-violet-500',
  },
  sky: {
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    loaded: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400',
    icon: 'text-sky-500',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    loaded: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    icon: 'text-amber-500',
  },
  cyan: {
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    loaded: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400',
    icon: 'text-cyan-500',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    loaded: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
    icon: 'text-rose-500',
  },
  indigo: {
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    loaded: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
    icon: 'text-indigo-500',
  },
};

/** Single sound slot card */
function SoundSlotCard({ config, form, setForm }) {
  const { slot, enabledKey, srcKey, label, description, accent, badge } = config;
  const accentCls = ACCENT_CLASSES[accent] || ACCENT_CLASSES.emerald;
  const isEnabled = form[enabledKey] === true;
  const hasSrc = Boolean(form[srcKey]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file (MP3, WAV or OGG)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large — max 10 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (!dataUrl) return toast.error('Failed to read audio file');
      setForm(p => ({ ...p, [srcKey]: dataUrl }));
      // Live-load immediately so Test works before saving
      loadSound(slot, dataUrl);
      toast.success(`${label} loaded — click Save to keep it`);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleRemove = () => {
    setForm(p => ({ ...p, [srcKey]: '', [enabledKey]: false }));
    loadSound(slot, null);
    toast.success(`${label} removed`);
  };

  const handleTest = () => {
    playSound(slot);
  };

  return (
    <div className={`rounded-2xl border ${isEnabled ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-700 opacity-70'} bg-white dark:bg-gray-900 p-5 space-y-4 transition-opacity`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 rounded-lg p-2 ${accentCls.badge}`}>
            <Music size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${accentCls.badge}`}>{badge}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        {/* Enable toggle */}
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={isEnabled}
              onChange={e => setForm(p => ({ ...p, [enabledKey]: e.target.checked }))}
            />
            <div className={`w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-xs text-gray-500">{isEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {/* File area */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="btn-secondary cursor-pointer text-xs py-1.5">
          <Upload size={13} /> {hasSrc ? 'Replace File' : 'Upload File'}
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/*"
            className="hidden"
            onChange={handleUpload}
          />
        </label>

        {hasSrc && (
          <>
            <button type="button" onClick={handleTest} className="btn-secondary text-xs py-1.5">
              <Volume2 size={13} /> Test
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
              title="Remove sound"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}

        {/* Built-in fallback preview button — always available */}
        {!hasSrc && (
          <button
            type="button"
            onClick={() => {
              // Preview built-in tone without saving
              loadSound(slot, null); // ensure no stale file
              playSound(slot);
            }}
            className="btn-secondary text-xs py-1.5 opacity-70"
            title="Preview built-in fallback tone"
          >
            <Volume2 size={13} /> Preview Built-in Tone
          </button>
        )}
      </div>

      {/* Status indicator */}
      {hasSrc ? (
        <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium ${accentCls.loaded}`}>
          <Volume2 size={13} />
          <span>Custom file loaded — click <strong>Test</strong> to preview</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-xl text-xs text-gray-400 bg-gray-50 dark:bg-gray-800">
          <VolumeX size={13} />
          <span>No custom file — using built-in tone. Supports MP3, WAV, OGG (max 10 MB).</span>
        </div>
      )}
    </div>
  );
}

/** The full sound settings tab panel */
function SoundSettingsTab({ form, setForm, handleSave }) {
  const enabledCount = SOUND_SLOTS.filter(s => form[s.enabledKey] === true).length;
  const loadedCount = SOUND_SLOTS.filter(s => Boolean(form[s.srcKey])).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Music size={18} className="text-primary-600" />
              Sound Configuration
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Personalise every POS event with your own audio files. Upload any MP3, WAV or OGG file and it will play instantly when that event fires. When no custom file is set, a built-in tone is used instead.
            </p>
          </div>
          <div className="flex gap-3 text-center shrink-0">
            <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <p className="text-lg font-bold text-primary-600">{enabledCount}</p>
              <p className="text-xs text-gray-500">Enabled</p>
            </div>
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <p className="text-lg font-bold text-emerald-600">{loadedCount}</p>
              <p className="text-xs text-gray-500">Custom Files</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex gap-2">
          <span className="shrink-0 font-bold">Tip:</span>
          <span>Toggle sounds on/off instantly using the switches. Changes take effect as soon as you <strong>Save Settings</strong>.</span>
        </div>
      </div>

      {/* Sound slot cards */}
      <div className="space-y-3">
        {SOUND_SLOTS.map(config => (
          <SoundSlotCard key={config.slot} config={config} form={form} setForm={setForm} />
        ))}
      </div>

      {/* Save button */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-gray-500">
            Sound files are stored locally in your POS database (base64 encoded). They persist across restarts and backups.
          </p>
          <button onClick={handleSave} className="btn-primary shrink-0">
            <Save size={16} /> Save Sound Settings
          </button>
        </div>
      </div>
    </div>
  );
}

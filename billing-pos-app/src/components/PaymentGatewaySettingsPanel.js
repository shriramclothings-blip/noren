import React, { useEffect, useMemo, useState } from 'react';
import { Save, Copy, Link2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DEFAULT_PAYMENT_SETTINGS,
  loadPaymentSettings,
  normalizePaymentSettings,
  savePaymentSettings,
} from '../payments/settings';
import { getLocalWebhookUrl } from '../payments/paytmClient';

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint ? <div className="text-xs text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}

export default function PaymentGatewaySettingsPanel({ currentUser }) {
  const [form, setForm] = useState({ ...DEFAULT_PAYMENT_SETTINGS });
  const [saving, setSaving] = useState(false);
  const [localWebhookUrl, setLocalWebhookUrl] = useState('');

  const canEdit = useMemo(() => String(currentUser?.role || '').toLowerCase() === 'admin', [currentUser]);

  useEffect(() => {
    const boot = async () => {
      const s = await loadPaymentSettings();
      setForm(s);
      try {
        const url = await getLocalWebhookUrl();
        if (url) setLocalWebhookUrl(url);
      } catch {}
    };
    boot();
  }, []);

  const onSave = async () => {
    if (!canEdit) return toast.error('Only Admin can edit payment settings');
    setSaving(true);
    try {
      const normalized = normalizePaymentSettings(form);
      await savePaymentSettings(normalized);
      setForm(normalized);
      toast.success('Payment settings saved!');
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="card p-6 space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">Payment Gateway Settings</h2>
          <p className="text-sm text-gray-400 mt-1">
            Paste your Paytm credentials and click <b>Save</b>. UPI auto-detection will work instantly on the POS billing screen.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={14} className="text-primary-600" />
          Secure local storage
        </div>
      </div>

      {/* Paytm */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Paytm Merchant ID">
          <input
            className="input"
            value={form.paytmMid || ''}
            disabled={!canEdit}
            onChange={(e) => setForm((p) => ({ ...p, paytmMid: e.target.value }))}
            placeholder="e.g. YOURMID12345"
          />
        </Field>
        <Field label="Paytm Merchant Key">
          <input
            className="input"
            value={form.paytmMerchantKey || ''}
            disabled={!canEdit}
            onChange={(e) => setForm((p) => ({ ...p, paytmMerchantKey: e.target.value }))}
            placeholder="e.g. 8Kq1... (keep secret)"
          />
        </Field>
        <Field label="Paytm API Secret" hint="Optional. Stored for future Paytm APIs or additional security features.">
          <input
            className="input"
            value={form.paytmApiSecret || ''}
            disabled={!canEdit}
            onChange={(e) => setForm((p) => ({ ...p, paytmApiSecret: e.target.value }))}
            placeholder="Optional"
          />
        </Field>
        <Field
          label="Webhook URL"
          hint="Optional accelerator. This POS works without webhook (fast polling). If you have a public webhook endpoint, paste it here."
        >
          <input
            className="input"
            value={form.webhookUrl || ''}
            disabled={!canEdit}
            onChange={(e) => setForm((p) => ({ ...p, webhookUrl: e.target.value }))}
            placeholder="https://your-domain.com/paytm/webhook"
          />
        </Field>
      </div>

      {/* Local webhook helper (Electron only) */}
      {localWebhookUrl ? (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Link2 size={14} className="text-primary-600" /> POS Local Webhook URL
              </div>
              <div className="text-xs text-gray-400 mt-1">
                For internal use (desktop app). It helps the POS react even faster when a webhook payload is received.
              </div>
              <div className="mt-2 font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                {localWebhookUrl}
              </div>
            </div>
            <button onClick={() => copy(localWebhookUrl)} className="btn-secondary">
              <Copy size={16} /> Copy
            </button>
          </div>
        </div>
      ) : null}

      {/* UPI QR */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Store UPI ID" hint="Used for Static QR mode only (example: yourshop@upi).">
          <input
            className="input"
            value={form.storeUpiId || ''}
            disabled={!canEdit}
            onChange={(e) => setForm((p) => ({ ...p, storeUpiId: e.target.value }))}
            placeholder="yourshop@upi"
          />
        </Field>
        <Field label="QR Mode">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, qrMode: 'dynamic' }))}
              disabled={!canEdit}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                form.qrMode !== 'static'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              Dynamic (Paytm)
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, qrMode: 'static' }))}
              disabled={!canEdit}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                form.qrMode === 'static'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              Static (UPI ID)
            </button>
          </div>
        </Field>
      </div>

      {/* Automation */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Auto Payment Detection">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="rounded"
              checked={form.autoDetectionEnabled !== false}
              disabled={!canEdit}
              onChange={(e) => setForm((p) => ({ ...p, autoDetectionEnabled: e.target.checked }))}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">ON (Recommended)</span>
          </div>
        </Field>
        <Field label="Manual Confirmation">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="rounded"
              checked={form.manualConfirmationEnabled !== false}
              disabled={!canEdit}
              onChange={(e) => setForm((p) => ({ ...p, manualConfirmationEnabled: e.target.checked }))}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">Allow admin/staff/cashier backup button</span>
          </div>
        </Field>
        <Field label="Polling Refresh Time (ms)" hint="Recommended: 1000–3000ms. Faster feels realtime; slower reduces internet usage.">
          <input
            type="number"
            className="input"
            min={1000}
            max={3000}
            step={100}
            value={Number(form.pollingRefreshMs) || 1500}
            disabled={!canEdit}
            onChange={(e) => setForm((p) => ({ ...p, pollingRefreshMs: e.target.value }))}
          />
        </Field>
        <Field label="Environment" hint="Use Stage only for Paytm testing.">
          <select
            className="input"
            value={form.environment || 'production'}
            disabled={!canEdit}
            onChange={(e) => setForm((p) => ({ ...p, environment: e.target.value }))}
          >
            <option value="production">Production</option>
            <option value="stage">Stage</option>
          </select>
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-xs text-gray-400">
          Tip: For best realtime feel, keep polling at 1–2 seconds and use Dynamic QR mode.
        </div>
        <button onClick={onSave} disabled={!canEdit || saving} className="btn-primary">
          <Save size={16} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {!canEdit ? (
        <div className="text-xs text-amber-600 dark:text-amber-400">
          You are logged in as <b>{currentUser?.role || 'user'}</b>. Only Admin can modify payment settings.
        </div>
      ) : null}
    </div>
  );
}


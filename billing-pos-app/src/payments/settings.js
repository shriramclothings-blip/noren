import { getSetting, setSetting } from '../db/db';

export const PAYMENT_SETTINGS_KEY = 'paymentGatewaySettings';

export const DEFAULT_PAYMENT_SETTINGS = {
  // Paytm credentials
  paytmMid: '',
  paytmMerchantKey: '',
  paytmApiSecret: '',

  // Optional merchant-configured webhook endpoint (public URL)
  webhookUrl: '',

  // QR behaviour
  storeUpiId: '', // only used for static QR
  qrMode: 'dynamic', // 'dynamic' | 'static'

  // Automation controls
  autoDetectionEnabled: true,
  pollingRefreshMs: 1500, // 1000–3000 recommended
  manualConfirmationEnabled: true,

  // Advanced (kept optional to avoid UI clutter)
  environment: 'production', // 'production' | 'stage'
  posId: 'POS-1',
};

export function normalizePaymentSettings(raw) {
  const s = { ...DEFAULT_PAYMENT_SETTINGS, ...(raw || {}) };
  const ms = Number(s.pollingRefreshMs);
  s.pollingRefreshMs = Number.isFinite(ms) ? Math.min(3000, Math.max(1000, Math.round(ms))) : 1500;
  s.qrMode = s.qrMode === 'static' ? 'static' : 'dynamic';
  s.autoDetectionEnabled = s.autoDetectionEnabled !== false;
  s.manualConfirmationEnabled = s.manualConfirmationEnabled !== false;
  s.environment = String(s.environment || 'production').toLowerCase() === 'stage' ? 'stage' : 'production';
  s.posId = String(s.posId || 'POS-1').trim() || 'POS-1';
  return s;
}

export async function loadPaymentSettings() {
  const saved = await getSetting(PAYMENT_SETTINGS_KEY);
  return normalizePaymentSettings(saved);
}

export async function savePaymentSettings(next) {
  const normalized = normalizePaymentSettings(next);
  await setSetting(PAYMENT_SETTINGS_KEY, normalized);
  return normalized;
}

export function canUsePaytmDynamicQr(settings) {
  const s = normalizePaymentSettings(settings);
  return Boolean(s.paytmMid && s.paytmMerchantKey);
}


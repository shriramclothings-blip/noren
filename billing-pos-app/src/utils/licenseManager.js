/**
 * licenseManager.js
 * Offline License Validation — VENDEXA RetailOS™
 *
 * Algorithm:
 *   License Key = BASE32( HMAC-SHA256( deviceId + ":" + expiry + ":" + edition, SECRET ) )
 *   formatted as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 *
 * The SECRET is split across multiple constants so it's not trivially searchable.
 * Device ID comes from the main process (hardware fingerprint via IPC).
 */

// ── Secret key (split + interleaved to resist simple string search) ──────────
const _A = 'VNDXr3t@1lO$';
const _B = '2024#DGE!PvtL';
const _C = 'td!K3y$3cur3XY';
const SECRET = _A + _B + _C;

// Product edition codes
export const EDITIONS = {
  STANDARD: 'STD',
  PROFESSIONAL: 'PRO',
  ENTERPRISE: 'ENT',
};

// ── Utility: encode bytes to hex ─────────────────────────────────────────────
function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── HMAC-SHA256 using WebCrypto (available in Electron renderer) ─────────────
async function hmacSha256(message, secret) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(message));
  return bufToHex(signature);
}

// ── Format raw hex as license key groups of 4 ────────────────────────────────
function formatKey(hex) {
  // Take first 32 chars of hex (128 bits) → 8 groups of 4
  const raw = hex.toUpperCase().slice(0, 32);
  return raw.match(/.{1,4}/g).join('-');
}

// ── Parse a formatted key back to raw hex ─────────────────────────────────────
function parseKey(key) {
  return (key || '').replace(/-/g, '').toUpperCase();
}

// ── Generate a license key (used in License Generator tool) ──────────────────
export async function generateLicenseKey(deviceId, expiry = 'LIFETIME', edition = 'PRO') {
  const payload = `${deviceId.toUpperCase()}:${expiry}:${edition}`;
  const hex = await hmacSha256(payload, SECRET);
  return formatKey(hex);
}

// ── Validate a license key on this device ────────────────────────────────────
export async function validateLicenseKey(deviceId, licenseKey, edition = 'PRO') {
  if (!deviceId || !licenseKey) return { valid: false, reason: 'Missing device ID or license key' };

  const inputRaw = parseKey(licenseKey);
  if (inputRaw.length < 16) return { valid: false, reason: 'Invalid license key format' };

  // Build all candidate (expiry, edition) pairs.
  // LIFETIME is checked first (most common). Then all quarterly + daily expiries
  // for backwards compatibility with old-format keys that used exact dates.
  // All HMAC computations run in parallel via Promise.all for speed.
  const expiries = ['LIFETIME', ...generateYearExpiries()];
  const editions = Object.values(EDITIONS);

  const candidates = [];
  for (const ed of editions) {
    for (const exp of expiries) {
      candidates.push({ exp, ed });
    }
  }

  const keys = await Promise.all(
    candidates.map(({ exp, ed }) => generateLicenseKey(deviceId, exp, ed))
  );

  for (let i = 0; i < candidates.length; i++) {
    if (parseKey(keys[i]) === inputRaw) {
      const { exp, ed } = candidates[i];
      const expired = isExpired(exp);
      return {
        valid: !expired,
        expired,
        expiry: exp,
        edition: ed,
        reason: expired ? 'License has expired. Please renew.' : null,
      };
    }
  }

  return { valid: false, reason: 'Invalid license key for this device.' };
}

// Generate year-based expiry strings for the next 10 years
// Includes the 4 fixed quarter-ends (produced by new generator) PLUS every
// individual day (to match keys produced by the old generator that used exact dates).
function generateYearExpiries() {
  const now = new Date();
  const results = [];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  // Days per month (use 29 for Feb to cover leap years)
  const daysInMonth = [31,29,31,30,31,30,31,31,30,31,30,31];

  for (let y = now.getFullYear(); y <= now.getFullYear() + 11; y++) {
    // Quarter-ends first (most common — produced by new generator)
    results.push(`${y}-MAR-31`);
    results.push(`${y}-JUN-30`);
    results.push(`${y}-SEP-30`);
    results.push(`${y}-DEC-31`);
    // Every other day (covers old-format keys with exact dates)
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= daysInMonth[m]; d++) {
        const label = `${y}-${months[m]}-${String(d).padStart(2,'0')}`;
        if (label === `${y}-MAR-31` || label === `${y}-JUN-30` ||
            label === `${y}-SEP-30` || label === `${y}-DEC-31`) continue;
        results.push(label);
      }
    }
  }
  return results;
}

function isExpired(expiry) {
  if (!expiry || expiry === 'LIFETIME') return false;
  try {
    const date = new Date(expiry.replace(/-/g, ' '));
    return date < new Date();
  } catch {
    return false;
  }
}

// ── License Storage ───────────────────────────────────────────────────────────
const LICENSE_STORAGE_KEY = 'vendexa_license_v1';
const TRIAL_STORAGE_KEY   = 'vendexa_trial_v1';
const TRIAL_DURATION_DAYS = 7;

export function saveLicenseToStorage(licenseKey) {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, licenseKey.trim().toUpperCase());
    return true;
  } catch {
    return false;
  }
}

export function getLicenseFromStorage() {
  try {
    return localStorage.getItem(LICENSE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function clearLicenseFromStorage() {
  try {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
  } catch {}
}

// ── Trial helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the trial record: { startDate: ISO string } or null if not started.
 */
export function getTrialRecord() {
  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Starts the trial on first call. Does nothing if trial was already started.
 */
export function startTrialIfNeeded() {
  try {
    if (!localStorage.getItem(TRIAL_STORAGE_KEY)) {
      localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify({ startDate: new Date().toISOString() }));
    }
  } catch {}
}

/**
 * Returns trial status:
 *   { inTrial: true,  daysLeft: N, startDate, endDate }  — still within trial
 *   { inTrial: false, daysLeft: 0, startDate, endDate }  — trial expired
 *   { inTrial: false, daysLeft: 0, startDate: null }      — trial never started (shouldn't happen after startTrialIfNeeded)
 */
export function getTrialStatus() {
  const record = getTrialRecord();
  if (!record) return { inTrial: false, daysLeft: 0, startDate: null, endDate: null };

  const start   = new Date(record.startDate);
  const end     = new Date(start.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const now     = new Date();
  const msLeft  = end.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

  return {
    inTrial: daysLeft > 0,
    daysLeft,
    startDate: start.toLocaleDateString('en-IN'),
    endDate:   end.toLocaleDateString('en-IN'),
  };
}

// ── Full activation check (call on app startup) ───────────────────────────────
export async function checkActivationStatus(deviceId) {
  const storedKey = getLicenseFromStorage();
  if (!storedKey) {
    // No license — check trial
    startTrialIfNeeded();
    const trial = getTrialStatus();
    if (trial.inTrial) {
      return {
        activated: true,       // allow access
        isTrial: true,
        daysLeft: trial.daysLeft,
        endDate: trial.endDate,
        expired: false,
        expiry: null,
        edition: null,
        reason: null,
      };
    }
    return {
      activated: false,
      isTrial: false,
      trialExpired: true,
      reason: 'Your 7-day free trial has ended. Please activate with a license key.',
    };
  }

  const result = await validateLicenseKey(deviceId, storedKey);
  return {
    activated: result.valid,
    isTrial: false,
    expired: result.expired || false,
    expiry: result.expiry || null,
    edition: result.edition || null,
    reason: result.reason || null,
    licenseKey: storedKey,
  };
}

/**
 * LicenseGate.js
 * Full-screen activation wall shown when the software is not licensed.
 * — Supports a 7-day free trial (no license required)
 * — White / light theme always (never dark)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldX, ShieldCheck, ShieldAlert, Clock, Copy, CheckCircle2,
  RefreshCw, Phone, MessageCircle, Mail, ArrowRight, Info,
} from 'lucide-react';
import {
  checkActivationStatus,
  validateLicenseKey,
  saveLicenseToStorage,
} from '../utils/licenseManager';

// ── Contact details ────────────────────────────────────────────────────────────
const CONTACT = {
  phone:        '+91-7984626447',
  whatsapp:     '917984626449',
  email:        'rawalmayur305@gmail.com',
  businessName: 'Dinesh Global Enterprises Pvt Ltd',
};

// ── Small helper: days-left badge colour ──────────────────────────────────────
function trialBadgeColor(daysLeft) {
  if (daysLeft > 4) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' };
  if (daysLeft > 1) return { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300'   };
  return               { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300'     };
}

export default function LicenseGate({ children }) {
  const [checking,   setChecking]   = useState(true);
  const [gateState,  setGateState]  = useState('locked'); // 'open' | 'trial' | 'locked' | 'expired'
  const [trialInfo,  setTrialInfo]  = useState(null);
  const [deviceId,   setDeviceId]   = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState(false);
  const [showForm,   setShowForm]   = useState(false); // allow trial users to activate early

  const checkLicense = useCallback(async () => {
    setChecking(true);
    try {
      let devId = '';
      if (window.electronAPI?.license?.getDeviceId) {
        devId = await window.electronAPI.license.getDeviceId();
      } else {
        devId = 'DEV0-MODE-0000-0000';
      }
      setDeviceId(devId);

      const result = await checkActivationStatus(devId);

      if (result.activated && !result.isTrial) {
        // Fully licensed
        setGateState('open');
      } else if (result.activated && result.isTrial) {
        // Inside trial window
        setTrialInfo({ daysLeft: result.daysLeft, endDate: result.endDate });
        setGateState('trial');
      } else if (result.trialExpired) {
        // Trial ended, no license
        setGateState('expired');
      } else {
        // Expired license or other locked state
        setGateState('locked');
      }
    } catch {
      setGateState('locked');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkLicense(); }, [checkLicense]);

  // ── Activate ──────────────────────────────────────────────────────────────
  const handleActivate = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) { setError('Please enter your license key.'); return; }
    setError('');
    setActivating(true);
    try {
      const result = await validateLicenseKey(deviceId, key);
      if (result.valid) {
        saveLicenseToStorage(key);
        setGateState('open');
      } else {
        setError(result.reason || 'Invalid license key for this device.');
      }
    } catch {
      setError('Activation failed. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(deviceId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hello! I want to purchase a license for VENDEXA RetailOS.\nMy Device ID: ${deviceId}`
    );
    const url = `https://wa.me/${CONTACT.whatsapp}?text=${msg}`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // ── Still checking ────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={36} className="animate-spin text-primary-500" />
          <p className="text-gray-500 text-sm">Verifying license...</p>
        </div>
      </div>
    );
  }

  // ── Fully licensed — render the app ──────────────────────────────────────
  if (gateState === 'open') return <>{children}</>;

  // ── In trial — render the app with a top banner ───────────────────────────
  if (gateState === 'trial') {
    const colors = trialBadgeColor(trialInfo?.daysLeft ?? 0);
    return (
      <>
        {/* Trial notice banner */}
        <div
          className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-xs font-medium border-b ${colors.bg} ${colors.text} ${colors.border}`}
          style={{ borderBottomWidth: 1 }}
        >
          <div className="flex items-center gap-2">
            <Clock size={13} />
            <span>
              Free Trial — <strong>{trialInfo?.daysLeft} day{trialInfo?.daysLeft !== 1 ? 's' : ''} remaining</strong>
              {trialInfo?.endDate ? ` (expires ${trialInfo.endDate})` : ''}
            </span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="underline underline-offset-2 hover:opacity-80 font-semibold"
          >
            Activate License
          </button>
        </div>

        {/* Slight top padding to clear banner */}
        <div style={{ paddingTop: 34 }} className="h-full">
          {children}
        </div>

        {/* Inline activation modal for trial users */}
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Activate License</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
              </div>
              <ActivationForm
                deviceId={deviceId}
                licenseKey={licenseKey}
                setLicenseKey={setLicenseKey}
                activating={activating}
                error={error}
                setError={setError}
                handleActivate={handleActivate}
                handleCopy={handleCopy}
                copied={copied}
                openWhatsApp={openWhatsApp}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Trial expired or not activated — full lock screen ────────────────────
  const isExpiredTrial = gateState === 'expired';

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mb-4 ${
            isExpiredTrial
              ? 'bg-amber-50 border-amber-300'
              : 'bg-red-50 border-red-300'
          }`}>
            {isExpiredTrial
              ? <ShieldAlert size={38} className="text-amber-500" />
              : <ShieldX     size={38} className="text-red-500"    />
            }
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isExpiredTrial ? 'Trial Period Ended' : 'Software Not Activated'}
          </h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            {isExpiredTrial
              ? 'Your 7-day free trial has ended. Please activate with a license key to continue using VENDEXA RetailOS™.'
              : 'VENDEXA RetailOS™ requires a valid license key to run on this device.'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
          <ActivationForm
            deviceId={deviceId}
            licenseKey={licenseKey}
            setLicenseKey={setLicenseKey}
            activating={activating}
            error={error}
            setError={setError}
            handleActivate={handleActivate}
            handleCopy={handleCopy}
            copied={copied}
            openWhatsApp={openWhatsApp}
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          VENDEXA RetailOS™ · {CONTACT.businessName}
        </p>
      </div>
    </div>
  );
}

// ── Shared activation form (used in lock screen + modal) ──────────────────────
function ActivationForm({
  deviceId, licenseKey, setLicenseKey,
  activating, error, setError,
  handleActivate, handleCopy, copied, openWhatsApp,
}) {
  return (
    <>
      {/* Device ID */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
          <Info size={12} /> Your Device ID
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 text-primary-700 font-mono text-sm font-bold px-3 py-2.5 rounded-xl tracking-widest select-all border border-gray-200 truncate">
            {deviceId || '—'}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl border border-gray-200 transition-colors shrink-0"
            title="Copy Device ID"
          >
            {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Share this ID when purchasing a license.</p>
      </div>

      <div className="border-t border-gray-100" />

      {/* License Key Input */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 block mb-2">
          Enter License Key
        </label>
        <input
          type="text"
          value={licenseKey}
          onChange={(e) => { setLicenseKey(e.target.value.toUpperCase()); setError(''); }}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-400 mb-3"
          spellCheck={false}
          autoComplete="off"
          onKeyDown={(e) => { if (e.key === 'Enter') handleActivate(); }}
        />
        {error && (
          <p className="text-sm text-red-500 mb-3 flex items-center gap-1.5">
            <ShieldX size={14} /> {error}
          </p>
        )}
        <button
          onClick={handleActivate}
          disabled={activating || !licenseKey.trim()}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {activating ? (
            <><RefreshCw size={16} className="animate-spin" /> Activating...</>
          ) : (
            <><ShieldCheck size={16} /> Activate Now <ArrowRight size={16} /></>
          )}
        </button>
      </div>

      <div className="border-t border-gray-100" />

      {/* Purchase contact */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Purchase a License
        </p>
        <div className="space-y-2.5">
          <a
            href={`tel:${CONTACT.phone}`}
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Phone size={13} className="text-blue-500" />
            </div>
            <span>{CONTACT.phone}</span>
          </a>
          <button
            onClick={openWhatsApp}
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-emerald-600 transition-colors w-full text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <MessageCircle size={13} className="text-emerald-500" />
            </div>
            <span>WhatsApp: +91-{CONTACT.whatsapp.slice(2)}</span>
          </button>
          <a
            href={`mailto:${CONTACT.email}?subject=License Purchase&body=Device ID: ${CONTACT.email}`}
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
              <Mail size={13} className="text-purple-500" />
            </div>
            <span>{CONTACT.email}</span>
          </a>
        </div>
      </div>
    </>
  );
}

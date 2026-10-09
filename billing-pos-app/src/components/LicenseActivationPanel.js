/**
 * LicenseActivationPanel.js
 * Settings â†’ License & Activation tab for VENDEXA RetailOSâ„¢
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldX, ShieldAlert, Copy, CheckCircle2,
  RefreshCw, Key, Phone, Mail, MessageCircle, Info, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  validateLicenseKey,
  saveLicenseToStorage,
  getLicenseFromStorage,
  checkActivationStatus,
  clearLicenseFromStorage,
  getTrialStatus,
} from '../utils/licenseManager';

// â”€â”€ Contact details â€” change these to your own â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CONTACT = {
  phone: '+91-7984626447',
  whatsapp: '917984626449',
  email: 'rawalmayur305@gmail.com',
  businessName: 'Dinesh Global Enterprises Pvt Ltd',
};

export default function LicenseActivationPanel() {
  const [deviceId, setDeviceId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState(null); // null | { activated, expired, expiry, edition, reason }
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);

  // â”€â”€ Load Device ID + check stored license on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      let devId = '';
      if (window.electronAPI?.license?.getDeviceId) {
        devId = await window.electronAPI.license.getDeviceId();
      } else {
        // Fallback for browser dev mode
        devId = 'DEV0-MODE-0000-0000';
      }
      setDeviceId(devId);

      const stored = getLicenseFromStorage();
      if (stored) setLicenseKey(stored);

      const result = await checkActivationStatus(devId);
      setStatus(result);
    } catch (err) {
      setStatus({ activated: false, reason: 'Failed to read license.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // â”€â”€ Copy Device ID to clipboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCopy = () => {
    if (!deviceId) return;
    navigator.clipboard.writeText(deviceId).then(() => {
      setCopied(true);
      toast.success('Device ID copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // â”€â”€ Activate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleActivate = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) { toast.error('Please enter a license key'); return; }
    if (!deviceId) { toast.error('Device ID not ready, please wait'); return; }

    setActivating(true);
    try {
      const result = await validateLicenseKey(deviceId, key);
      if (result.valid) {
        saveLicenseToStorage(key);
        setStatus({ activated: true, expiry: result.expiry, edition: result.edition, reason: null });
        toast.success('âœ… License activated successfully!');
      } else {
        toast.error(result.reason || 'Invalid license key');
        setStatus({ activated: false, reason: result.reason });
      }
    } catch (err) {
      toast.error('Activation failed. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  // â”€â”€ Deactivate (for admin/testing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDeactivate = () => {
    if (!window.confirm('Are you sure you want to deactivate this license?')) return;
    clearLicenseFromStorage();
    setLicenseKey('');
    setStatus({ activated: false, reason: 'License removed.' });
    toast('License deactivated', { icon: 'ðŸ”“' });
  };

  // â”€â”€ UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="animate-spin text-primary-500" size={28} />
        <span className="ml-3 text-gray-500">Reading hardware fingerprint...</span>
      </div>
    );
  }

  const isActivated = status?.activated === true;
  const isExpired   = status?.expired   === true;
  const isTrial     = status?.isTrial   === true;
  const trial       = getTrialStatus();

  return (
    <div className="space-y-6 max-w-2xl">

      {/* â”€â”€ Status Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={`rounded-2xl p-5 flex items-start gap-4 ${
        isActivated && !isExpired && !isTrial
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
          : isTrial
            ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700'
            : isExpired
              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
      }`}>
        {isActivated && !isExpired && !isTrial ? (
          <ShieldCheck size={36} className="text-emerald-500 shrink-0 mt-0.5" />
        ) : isTrial ? (
          <Clock size={36} className="text-sky-500 shrink-0 mt-0.5" />
        ) : isExpired ? (
          <ShieldAlert size={36} className="text-amber-500 shrink-0 mt-0.5" />
        ) : (
          <ShieldX size={36} className="text-red-500 shrink-0 mt-0.5" />
        )}
        <div>
          <h3 className={`text-lg font-bold ${
            isActivated && !isExpired && !isTrial ? 'text-emerald-700 dark:text-emerald-300'
            : isTrial   ? 'text-sky-700 dark:text-sky-300'
            : isExpired ? 'text-amber-700 dark:text-amber-300'
            : 'text-red-700 dark:text-red-300'
          }`}>
            {isActivated && !isExpired && !isTrial
              ? 'âœ“ Software Activated'
              : isTrial
                ? `â± Free Trial â€” ${trial.daysLeft} Day${trial.daysLeft !== 1 ? 's' : ''} Remaining`
                : isExpired
                  ? 'âš  License Expired'
                  : 'âœ— Not Activated'}
          </h3>
          {isActivated && !isExpired && !isTrial && (
            <div className="mt-1 space-y-0.5 text-sm text-emerald-700 dark:text-emerald-300">
              <p>Edition: <span className="font-semibold">{status.edition || 'PRO'}</span></p>
              <p>Valid Until: <span className="font-semibold">{status.expiry === 'LIFETIME' ? 'Lifetime' : status.expiry}</span></p>
            </div>
          )}
          {isTrial && (
            <p className="mt-1 text-sm text-sky-700 dark:text-sky-300">
              Trial expires on <span className="font-semibold">{trial.endDate}</span>. Activate a license key below to continue without interruption.
            </p>
          )}
          {isExpired && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Your license expired on {status.expiry}. Contact us to renew.
            </p>
          )}
          {!isActivated && !isExpired && !isTrial && (
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {status?.reason || 'This software is not activated. Enter your license key below.'}
            </p>
          )}
        </div>
      </div>

      {/* â”€â”€ Device ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-primary-500" />
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Your Device ID</h4>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Share this Device ID when purchasing a license. It's unique to this computer.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 dark:bg-gray-900 text-primary-700 dark:text-primary-400 font-mono text-base font-bold px-4 py-3 rounded-xl tracking-widest select-all border border-gray-200 dark:border-gray-700">
            {deviceId || 'â€”'}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-3 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-xl border border-primary-200 dark:border-primary-700 transition-colors font-medium text-sm"
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* â”€â”€ License Key Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {(!isActivated || isExpired || isTrial) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-primary-500" />
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Enter License Key</h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Paste the license key you received after purchase.
          </p>
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-400 mb-4"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            onClick={handleActivate}
            disabled={activating || !licenseKey.trim()}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {activating ? (
              <><RefreshCw size={16} className="animate-spin" /> Activating...</>
            ) : (
              <><ShieldCheck size={16} /> Activate License</>
            )}
          </button>
        </div>
      )}

      {/* â”€â”€ Deactivate (only when active, not trial) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isActivated && !isExpired && !isTrial && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">License Key</h4>
          <code className="block bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-mono text-xs px-4 py-3 rounded-xl tracking-widest break-all mb-4">
            {getLicenseFromStorage() || 'â€”'}
          </code>
          <button
            onClick={handleDeactivate}
            className="text-sm text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors"
          >
            Deactivate this license
          </button>
        </div>
      )}

      {/* â”€â”€ Contact / Purchase Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-2xl p-5 border border-primary-100 dark:border-primary-800">
        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Purchase a License</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Contact us to buy a license for this device. Share your Device ID above.
        </p>
        <div className="space-y-2.5">
          <a
            href={`tel:${CONTACT.phone}`}
            className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Phone size={16} className="text-primary-500 shrink-0" />
            <span className="font-medium">{CONTACT.phone}</span>
          </a>
          <button
            onClick={() => {
              const msg = encodeURIComponent(
                `Hello! I want to purchase a license for VENDEXA RetailOS.\nMy Device ID: ${deviceId}`
              );
              if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(`https://wa.me/${CONTACT.whatsapp}?text=${msg}`);
              } else {
                window.open(`https://wa.me/${CONTACT.whatsapp}?text=${msg}`, '_blank');
              }
            }}
            className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors w-full text-left"
          >
            <MessageCircle size={16} className="text-green-500 shrink-0" />
            <span className="font-medium">WhatsApp: {CONTACT.whatsapp}</span>
          </button>
          <a
            href={`mailto:${CONTACT.email}?subject=License Purchase Request&body=Device ID: ${deviceId}`}
            className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Mail size={16} className="text-primary-500 shrink-0" />
            <span className="font-medium">{CONTACT.email}</span>
          </a>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-600">
        VENDEXA RetailOSâ„¢ v2.0.0 Â· {CONTACT.businessName} Â· Offline License System
      </p>
    </div>
  );
}

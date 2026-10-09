import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, XCircle, Loader2, RefreshCcw, ShieldCheck, AlertTriangle, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { paytmCreateQr, paytmOrderStatus, mapPaytmStatusToUi } from '../payments/paytmClient';
import { createPaymentAttempt, logPaymentEvent, updatePaymentAttempt } from '../payments/paymentStore';
import { playSuccessSound } from '../payments/sound';
import { broadcastCustomerDisplayState } from '../utils/helpers';
import { buildOfflineUpiUri } from '../utils/inventoryAnalytics';

function buildStaticUpiUri({ upiId, amount, note }) {
  const pa = encodeURIComponent(String(upiId || '').trim());
  const am = encodeURIComponent(String(Number(amount || 0).toFixed(2)));
  const tn = encodeURIComponent(String(note || 'POS Bill'));
  return `upi://pay?pa=${pa}&am=${am}&cu=INR&tn=${tn}`;
}

function canManualConfirm(currentUser) {
  const role = String(currentUser?.role || '').toLowerCase();
  // Allow Admin, Staff, AND Cashier to manually confirm payments
  return role === 'admin' || role === 'staff' || role === 'cashier';
}

export default function UpiPaymentModal({
  open,
  onClose,
  settings,
  amount,
  invoiceNumber,
  customerPhone,
  currentUser,
  invoiceDraft,
  onPaymentSuccess,
}) {
  const [attempt, setAttempt] = useState(null);
  const [qr, setQr] = useState({ mode: 'dynamic', qrData: null, qrImageBase64: null });
  const [uiStatus, setUiStatus] = useState('waiting'); // waiting | processing | success | failed | timeout
  const [statusText, setStatusText] = useState('Waiting For Payment');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const startedRef = useRef(false);
  const attemptRef = useRef(null);
  const finalizedRef = useRef(false);
  const pollTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);

  const orderId = useMemo(() => {
    if (attempt?.orderId) return attempt.orderId;
    // Paytm orderId allowed special chars: @-_. (keep it clean)
    return `POS-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }, [attempt?.orderId]);

  const manualAllowed = useMemo(
    () => settings?.manualConfirmationEnabled !== false && canManualConfirm(currentUser),
    [settings?.manualConfirmationEnabled, currentUser]
  );

  const cleanupTimers = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    pollTimerRef.current = null;
    timeoutTimerRef.current = null;
  };

  const setStatus = (next, text) => {
    setUiStatus(next);
    setStatusText(text);
  };

  const finalizeOnce = async ({ txnId, manual = false }) => {
    if (finalized) return;
    setFinalized(true);
    finalizedRef.current = true;
    cleanupTimers();
    setStatus('success', 'PAYMENT SUCCESSFUL');
    broadcastCustomerDisplayState({
      type: 'customer-display-update',
      timestamp: Date.now(),
      state: {
        invoiceNumber: invoiceNumber || null,
        status: 'paid',
        paymentMode: 'UPI',
        total: Number(amount || 0),
        subtotal: Number(amount || 0),
        discount: 0,
        tax: 0,
        totalItemsQty: 1,
        items: [{ name: 'UPI Payment', qty: 1, price: Number(amount || 0), size: '', variantId: null }],
        paymentStatus: 'paid',
      },
    });

    try {
      await updatePaymentAttempt(attempt?.id, {
        status: 'SUCCESS',
        txnId: txnId || null,
        manualConfirmed: manual,
      });
      await logPaymentEvent({
        level: 'info',
        message: manual ? 'Payment manually confirmed' : 'Payment confirmed via Paytm',
        attemptId: attempt?.id,
        orderId,
        detail: { txnId, manual },
      });
    } catch {}

    playSuccessSound();
    try {
      onPaymentSuccess?.({ orderId, txnId, attemptId: attempt?.id, manual });
    } catch {}

    // allow UI to show green state briefly, then close
    setTimeout(() => {
      try { onClose?.(); } catch {}
    }, 800);
  };

  const cancelAndClose = async () => {
    cleanupTimers();
    try {
      if (attempt?.id && !finalized) {
        await updatePaymentAttempt(attempt.id, { status: 'CANCELLED' });
        await logPaymentEvent({ level: 'info', message: 'Payment cancelled by cashier', attemptId: attempt.id, orderId });
      }
    } catch {}
    try { onClose?.(); } catch {}
  };

  const checkStatus = async () => {
    if (!settings?.autoDetectionEnabled) return;
    if (checking || finalized) return;
    setChecking(true);

    try {
      setStatus('processing', 'Payment Processing');
      const resp = await paytmOrderStatus({ settings, orderId });
      if (!resp?.success) {
        setError(resp?.error || 'Unable to check payment status');
        await logPaymentEvent({ level: 'warn', message: 'Status check failed', attemptId: attempt?.id, orderId, detail: resp });
        return;
      }

      const mapped = mapPaytmStatusToUi(resp.resultStatus);
      if (mapped === 'success') {
        await finalizeOnce({ txnId: resp.txnId, manual: false });
        return;
      }

      if (mapped === 'failed') {
        setStatus('failed', 'Payment Failed');
        await updatePaymentAttempt(attempt?.id, { status: 'FAILED', lastResultStatus: resp.resultStatus, lastResultMsg: resp.resultMsg });
        await logPaymentEvent({ level: 'warn', message: 'Payment failed', attemptId: attempt?.id, orderId, detail: resp });
        return;
      }

      // waiting / processing
      setStatus(mapped === 'waiting' ? 'waiting' : 'processing', mapped === 'waiting' ? 'Waiting For Payment' : 'Payment Processing');
      await updatePaymentAttempt(attempt?.id, {
        status: mapped === 'waiting' ? 'WAITING' : 'PROCESSING',
        lastResultStatus: resp.resultStatus,
        lastResultMsg: resp.resultMsg,
        lastCheckedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err?.message || String(err));
      await logPaymentEvent({ level: 'error', message: 'Status check crash', attemptId: attempt?.id, orderId, detail: { error: err?.message || String(err) } });
    } finally {
      setChecking(false);
    }
  };

  const start = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setQr({ mode: settings?.qrMode || 'dynamic', qrData: null, qrImageBase64: null });
    setStatus('waiting', 'Waiting For Payment');
    setFinalized(false);

    try {
      const newAttempt = await createPaymentAttempt({
        gateway: 'paytm',
        orderId,
        amount: Number(amount || 0),
        invoiceNumber: invoiceNumber || null,
        invoiceDraft: invoiceDraft || null,
        status: 'WAITING',
      });
      setAttempt(newAttempt);
      attemptRef.current = newAttempt;
      await logPaymentEvent({ level: 'info', message: 'UPI payment started', attemptId: newAttempt.id, orderId, detail: { amount, invoiceNumber } });

      if (settings?.qrMode === 'static') {
        if (!settings?.storeUpiId) {
          setError('Store UPI ID is missing in settings (Static QR mode).');
          setStatus('failed', 'Payment Failed');
          return;
        }
        const uri = buildStaticUpiUri({ upiId: settings.storeUpiId, amount, note: invoiceNumber || 'POS Bill' });
        setQr({ mode: 'static', qrData: uri, qrImageBase64: null });
        broadcastCustomerDisplayState({
          type: 'customer-display-update',
          timestamp: Date.now(),
          state: {
            invoiceNumber: invoiceNumber || null,
            status: 'waiting',
            paymentMode: 'UPI',
            total: Number(amount || 0),
            subtotal: Number(amount || 0),
            discount: 0,
            tax: 0,
            totalItemsQty: 1,
            items: [{ name: 'UPI Payment', qty: 1, price: Number(amount || 0), size: '', variantId: null }],
            qrData: uri,
            paymentStatus: 'awaiting',
          },
        });
      } else if (settings?.paytmMid && settings?.paytmMerchantKey) {
        const resp = await paytmCreateQr({ settings, orderId, amount, invoiceNumber, customerPhone });
        if (!resp?.success) {
          setError(resp?.error || 'Unable to generate Paytm QR');
          setStatus('failed', 'Payment Failed');
          await updatePaymentAttempt(newAttempt.id, { status: 'FAILED', error: resp?.error || 'Create QR failed' });
          return;
        }

        setQr({ mode: 'dynamic', qrData: resp.qrData || null, qrImageBase64: resp.qrImageBase64 || null });
        broadcastCustomerDisplayState({
          type: 'customer-display-update',
          timestamp: Date.now(),
          state: {
            invoiceNumber: invoiceNumber || null,
            status: 'waiting',
            paymentMode: 'UPI',
            total: Number(amount || 0),
            subtotal: Number(amount || 0),
            discount: 0,
            tax: 0,
            totalItemsQty: 1,
            items: [{ name: 'UPI Payment', qty: 1, price: Number(amount || 0), size: '', variantId: null }],
            qrData: resp.qrData || null,
            paymentStatus: 'awaiting',
          },
        });
        await updatePaymentAttempt(newAttempt.id, { qrCodeId: resp.qrCodeId || null });
      } else {
        const uri = buildOfflineUpiUri({
          upiId: settings?.storeUpiId || 'merchant@upi',
          merchantName: String(window?.location?.hostname || 'VENDEXA RetailOS'),
          invoiceNumber: invoiceNumber || 'POS-BILL',
          amount,
        });
        setQr({ mode: 'dynamic', qrData: uri, qrImageBase64: null });
        setStatus('waiting', 'Offline QR Ready — Scan and confirm manually');
        broadcastCustomerDisplayState({
          type: 'customer-display-update',
          timestamp: Date.now(),
          state: {
            invoiceNumber: invoiceNumber || null,
            status: 'waiting',
            paymentMode: 'UPI',
            total: Number(amount || 0),
            subtotal: Number(amount || 0),
            discount: 0,
            tax: 0,
            totalItemsQty: 1,
            items: [{ name: 'UPI Payment', qty: 1, price: Number(amount || 0), size: '', variantId: null }],
            qrData: uri,
            paymentStatus: 'awaiting',
          },
        });
        await updatePaymentAttempt(newAttempt.id, { status: 'WAITING', qrCodeId: null });
      }

      // Start fast polling (lightweight). Offline fallback relies on manual confirmation.
      const hasPaytm = Boolean(settings?.paytmMid && settings?.paytmMerchantKey);
      if (hasPaytm && settings?.autoDetectionEnabled !== false) {
        const interval = Number(settings?.pollingRefreshMs) || 1500;
        pollTimerRef.current = setInterval(checkStatus, interval);
      }

      // Hard timeout (Paytm QR default expiry is 10 mins; we keep UI responsive)
      timeoutTimerRef.current = setTimeout(async () => {
        if (finalized) return;
        cleanupTimers();
        setStatus('timeout', 'Payment Timeout');
        await updatePaymentAttempt(newAttempt.id, { status: 'TIMEOUT' });
        await logPaymentEvent({ level: 'warn', message: 'Payment timeout', attemptId: newAttempt.id, orderId });
      }, 10 * 60 * 1000);

      // Webhook accelerator (optional): if a webhook arrives, immediately re-check status once.
      try {
        if (window?.electronAPI?.paytm?.onWebhook) {
          window.electronAPI.paytm.onWebhook(async (payload) => {
            const p = payload || {};
            const oid = p?.orderId || p?.ORDERID || p?.body?.orderId;
            if (oid && String(oid) === String(orderId)) {
              await logPaymentEvent({ level: 'info', message: 'Webhook received, re-checking status', attemptId: newAttempt.id, orderId, detail: p });
              checkStatus();
            }
          });
        }
      } catch {}

      // Immediate first check after QR render to make UI feel live
      setTimeout(checkStatus, 900);
    } catch (err) {
      setError(err?.message || String(err));
      await logPaymentEvent({ level: 'error', message: 'UPI flow crash', attemptId: attempt?.id, orderId, detail: { error: err?.message || String(err) } });
    }
  };

  const resetAndRetry = () => {
    cleanupTimers();
    startedRef.current = false;
    setAttempt(null);
    setError(null);
    setFinalized(false);
    setQr({ mode: settings?.qrMode || 'dynamic', qrData: null, qrImageBase64: null });
    setStatus('waiting', 'Waiting For Payment');
    start();
  };

  useEffect(() => {
    if (!open) return;
    start();
    return () => {
      cleanupTimers();
      try { window?.electronAPI?.paytm?.removeWebhookListener?.(); } catch {}
      startedRef.current = false;

      // If the modal closes before success, mark as cancelled (best-effort).
      try {
        const a = attemptRef.current;
        if (a?.id && !finalizedRef.current) {
          updatePaymentAttempt(a.id, { status: 'CANCELLED' });
          logPaymentEvent({ level: 'info', message: 'Payment popup closed', attemptId: a.id, orderId });
        }
      } catch {}

      setAttempt(null);
      attemptRef.current = null;
      setError(null);
      setFinalized(false);
      finalizedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const StatusIcon = uiStatus === 'success'
    ? CheckCircle2
    : uiStatus === 'failed' || uiStatus === 'timeout'
      ? XCircle
      : Loader2;

  const statusColor =
    uiStatus === 'success'
      ? 'text-green-600'
      : uiStatus === 'failed' || uiStatus === 'timeout'
        ? 'text-red-500'
        : 'text-amber-500';

  return (
    <Modal open={open} onClose={onClose} title="UPI Payment" size="sm">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">Amount</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">₹{Number(amount || 0).toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">Invoice: <span className="font-medium">{invoiceNumber || '—'}</span></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck size={14} className="text-primary-600" />
            Verified via Paytm API
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            {qr.qrImageBase64 ? (
              <img
                alt="Paytm QR"
                src={`data:image/png;base64,${qr.qrImageBase64}`}
                className="w-56 h-56 object-contain"
              />
            ) : (
              <QRCodeSVG value={qr.qrData || ' '} size={220} level="M" includeMargin />
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <StatusIcon
            size={18}
            className={`${statusColor} ${uiStatus === 'waiting' || uiStatus === 'processing' ? 'animate-spin' : ''}`}
          />
          <div className={`font-semibold ${uiStatus === 'success' ? 'text-green-600' : uiStatus === 'failed' || uiStatus === 'timeout' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
            {statusText}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="text-gray-400">Order ID</div>
            <div className="font-mono text-[11px] text-gray-700 dark:text-gray-300 break-all">{orderId}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="text-gray-400">Auto Refresh</div>
            <div className="text-gray-700 dark:text-gray-300">
              {settings?.autoDetectionEnabled !== false ? `Every ${Math.round((Number(settings?.pollingRefreshMs) || 1500) / 1000)}s` : 'OFF'}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm flex gap-2">
            <AlertTriangle size={16} className="mt-0.5" />
            <div className="min-w-0">
              <div className="font-medium">Payment module error</div>
              <div className="text-xs break-words">{error}</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={checkStatus}
            className="btn-secondary flex-1 justify-center"
            disabled={checking || finalized || settings?.autoDetectionEnabled === false}
            title={settings?.autoDetectionEnabled === false ? 'Auto detection is OFF in settings' : 'Re-check now'}
          >
            <RefreshCcw size={16} /> Check Now
          </button>

          {(uiStatus === 'failed' || uiStatus === 'timeout' || error) && (
            <button onClick={resetAndRetry} className="btn-primary flex-1 justify-center">
              <RefreshCcw size={16} /> Retry
            </button>
          )}
        </div>

        {manualAllowed && (
          <button
            onClick={() => {
              if (!window.confirm('Confirm: Mark this payment as SUCCESSFUL? This will finalize the bill and update stock.')) return;
              toast.success('Marked as successful');
              finalizeOnce({ txnId: null, manual: true });
            }}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <BadgeCheck size={18} /> MARK PAYMENT AS SUCCESSFUL
          </button>
        )}

        <button onClick={cancelAndClose} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

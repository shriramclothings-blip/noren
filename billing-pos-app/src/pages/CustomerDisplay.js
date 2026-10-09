import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency, formatDateTime } from '../utils/helpers';

const CHANNEL_NAME = 'pos-customer-display';

export default function CustomerDisplay() {
  const { company } = useApp();
  const [displayState, setDisplayState] = useState({
    invoiceNumber: null,
    status: 'idle',
    customerName: 'Welcome',
    paymentMode: 'Cash',
    total: 0,
    subtotal: 0,
    discount: 0,
    tax: 0,
    totalItemsQty: 0,
    items: [],
    qrData: null,
    paymentStatus: 'idle',
    updatedAt: null,
  });

  useEffect(() => {
    const updateFromEvent = (payload) => {
      if (!payload || payload.type !== 'customer-display-update') return;
      setDisplayState({
        ...payload.state,
        updatedAt: payload.timestamp,
      });
    };

    let channel;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => updateFromEvent(event.data);
    }

    const handleStorage = (event) => {
      if (event.key !== CHANNEL_NAME || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        updateFromEvent(payload);
      } catch {
        // ignore malformed fallback payload
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isIdle = !displayState.invoiceNumber && displayState.status === 'idle';
  const isPaid = displayState.status === 'paid';
  const isWaiting = displayState.status === 'waiting';
  const brand = company?.name || 'VENDEXA RetailOS™';
  const accent = company?.customerDisplayAccentColor || '#22d3ee';
  const baseColor = company?.customerDisplayBrandColor || '#0f172a';
  const idleMessage = company?.customerDisplayIdleMessage || 'Welcome to our store. Please wait while we prepare your bill.';
  const promotionText = company?.customerDisplayPromotionText || 'Festival offers, premium fits, and fast billing for every visit.';
  const message = isIdle
    ? idleMessage
    : isPaid
      ? 'Payment received. Please collect your items.'
      : isWaiting
        ? 'Scan the QR code on your device and complete the payment.'
        : 'Thank you for shopping with us!';

  return (
    <div className="min-h-screen text-white px-6 py-8" style={{ background: `linear-gradient(135deg, ${baseColor}, #000000)` }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg" style={{ borderColor: `${accent}33` }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Customer Display</p>
                <h1 className="text-4xl font-bold text-white">{brand}</h1>
                <p className="mt-2 text-sm text-slate-300">{message}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-right" style={{ borderColor: `${accent}55` }}>
                <p className="text-sm uppercase" style={{ color: accent }}>Status</p>
                <p className="text-3xl font-semibold text-white">{displayState.status || 'Ready'}</p>
                <p className="mt-1 text-xs text-slate-400">Updated: {displayState.updatedAt ? formatDateTime(new Date(displayState.updatedAt).toISOString()) : 'Waiting'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.8fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-cyan-200 uppercase">Invoice</p>
                    <h2 className="text-2xl font-semibold text-white">{displayState.invoiceNumber || 'Waiting for items...'}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Customer</p>
                    <p className="text-lg font-semibold text-white">{displayState.customerName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                  <div className="rounded-2xl bg-white/5 p-3">Payment mode<br /><span className="text-white font-semibold">{displayState.paymentMode}</span></div>
                  <div className="rounded-2xl bg-white/5 p-3">Items<br /><span className="text-white font-semibold">{displayState.totalItemsQty || 0}</span></div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40">
                <div className="grid grid-cols-[4fr_1fr_1fr_1fr] gap-2 bg-white/10 px-4 py-3 text-sm uppercase tracking-[0.12em] text-slate-300">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Total</span>
                </div>
                <div className="divide-y divide-white/10">
                  {displayState.items.length > 0 ? displayState.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="grid grid-cols-[4fr_1fr_1fr_1fr] gap-2 px-4 py-4 text-sm text-slate-100">
                      <div>
                        <div className="font-semibold text-white">{item.name}</div>
                        {item.size ? <div className="text-xs text-slate-400">Size: {item.size}</div> : null}
                      </div>
                      <div className="text-center">{item.qty}</div>
                      <div className="text-right">{formatCurrency(item.price, company?.currency)}</div>
                      <div className="text-right">{formatCurrency((item.price || 0) * (item.qty || 0), company?.currency)}</div>
                    </div>
                  )) : (
                    <div className="px-4 py-10 text-center text-slate-400">Awaiting items from the billing counter...</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="rounded-3xl p-4" style={{ background: `${accent}20` }}>
                <p className="text-sm uppercase" style={{ color: accent }}>Grand Total</p>
                <p className="mt-2 text-4xl font-bold text-white">{formatCurrency(displayState.total || 0, company?.currency)}</p>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span>Subtotal</span>
                  <span>{formatCurrency(displayState.subtotal || 0, company?.currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Discount</span>
                  <span>{formatCurrency(displayState.discount || 0, company?.currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Tax</span>
                  <span>{formatCurrency(displayState.tax || 0, company?.currency)}</span>
                </div>
              </div>
              {displayState.status === 'waiting' && displayState.qrData ? (
                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Scan to Pay</p>
                  <div className="mt-3 inline-flex rounded-3xl bg-white p-4">
                  <QRCodeSVG value={displayState.qrData || ' '} size={192} level="M" includeMargin />
                </div>
                  <p className="mt-3 text-xs text-slate-200">Open your UPI app and scan the QR code.</p>
                </div>
              ) : null}
              <div className="rounded-3xl bg-white/5 p-4 text-center text-xs uppercase tracking-[0.2em] text-slate-300">
                {isIdle ? promotionText : `Please complete payment at the billing counter. Thank you for shopping with ${brand}.`}
              </div>
              {isIdle && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.2em]" style={{ color: accent }}>Idle Promotion Mode</p>
                  <div className="mt-3 rounded-2xl p-4" style={{ background: `${accent}18` }}>
                    <p className="text-lg font-semibold text-white">Latest arrivals & festival offers</p>
                    <p className="mt-2 text-sm text-slate-200">{promotionText}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

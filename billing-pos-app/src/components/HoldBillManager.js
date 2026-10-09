import React from 'react';
import { PauseCircle, PlayCircle, Trash2, ShoppingCart, Clock, User, CreditCard, Hash } from 'lucide-react';
import Modal from './Modal';

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_COLORS = {
  Cash:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPI:         'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Card:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Credit:      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Split:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function HoldBillManager({ open, onClose, heldBills, onResume, onDelete }) {
  return (
    <Modal open={open} onClose={onClose} title="" size="lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <PauseCircle size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Held Bills</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {heldBills.length === 0
              ? 'No bills on hold right now'
              : `${heldBills.length} bill${heldBills.length > 1 ? 's' : ''} waiting to be resumed`}
          </p>
        </div>
        {heldBills.length > 0 && (
          <span className="ml-auto px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
            {heldBills.length} HELD
          </span>
        )}
      </div>

      {heldBills.length === 0 ? (
        <div className="text-center py-14 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ShoppingCart size={36} className="text-gray-300 dark:text-gray-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-500 dark:text-gray-400">No bills on hold</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono text-[11px]">Hold Bill</kbd> in POS to pause a bill and start a new one
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {heldBills.map((bill, idx) => (
            <div
              key={bill.id}
              className="group relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-2xl" />

              <div className="pl-4 pr-3 py-3">
                <div className="flex items-start gap-3">
                  {/* Bill Number Badge */}
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">#{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400" />
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {bill.customerName || 'Walking Customer'}
                        </span>
                      </div>
                      <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${PAYMENT_COLORS[bill.paymentMode] || PAYMENT_COLORS.Cash}`}>
                        {bill.paymentMode || 'Cash'}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {bill.heldAt}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="flex items-center gap-1">
                        <Hash size={10} />
                        {bill.cart.length} line{bill.cart.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span>{bill.totalQty ?? bill.cart.reduce((s, i) => s + (i.qty || 0), 0)} qty</span>
                    </div>

                    {/* Item previews */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {bill.cart.slice(0, 4).map((item, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700"
                        >
                          {item.name}
                          {item.size ? ` (${item.size})` : ''}
                          <span className="text-primary-500 font-semibold">×{item.qty}</span>
                        </span>
                      ))}
                      {bill.cart.length > 4 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-[10px] text-gray-400 border border-gray-100 dark:border-gray-700">
                          +{bill.cart.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + actions */}
                  <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                    <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                      {fmt(bill.total)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { onResume(bill); onClose(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                      >
                        <PlayCircle size={13} /> Resume
                      </button>
                      <button
                        onClick={() => onDelete(bill.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        title="Delete held bill"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer tip */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-400">
        <CreditCard size={12} />
        <span>You can hold unlimited bills simultaneously. Each bill retains its customer, items, and payment mode.</span>
      </div>
    </Modal>
  );
}

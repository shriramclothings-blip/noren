import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { PAYMENT_MODES, formatCurrency } from '../utils/helpers';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function PartitionPaymentModal({
  open,
  onClose,
  total = 0,
  currency = '₹',
  initialBreakdown = null,
  onConfirm,
}) {
  const [rows, setRows] = useState(() => {
    if (Array.isArray(initialBreakdown) && initialBreakdown.length > 0) {
      return initialBreakdown.map((p) => ({
        method: String(p?.method || 'Cash'),
        amount: round2(Number(p?.amount) || 0),
      }));
    }
    return [
      { method: 'Cash', amount: 0 },
      { method: 'UPI', amount: 0 },
    ];
  });

  // Reset rows when modal re-opens
  React.useEffect(() => {
    if (!open) return;
    if (Array.isArray(initialBreakdown) && initialBreakdown.length > 0) {
      setRows(
        initialBreakdown.map((p) => ({
          method: String(p?.method || 'Cash'),
          amount: round2(Number(p?.amount) || 0),
        }))
      );
    } else {
      setRows([
        { method: 'Cash', amount: 0 },
        { method: 'UPI', amount: 0 },
      ]);
    }
  }, [open, initialBreakdown]);

  const totalPaid = useMemo(
    () => round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
    [rows]
  );

  const diff = useMemo(() => round2((Number(total) || 0) - totalPaid), [total, totalPaid]);
  const valid = useMemo(() => rows.length > 0 && diff === 0, [rows.length, diff]);

  const updateRow = (idx, patch) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { method: 'Card', amount: 0 }]);
  };

  const removeRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = () => {
    const cleaned = rows
      .map((r) => ({
        method: String(r.method || '').trim() || 'Cash',
        amount: round2(Math.max(0, Number(r.amount) || 0)),
      }))
      .filter((r) => r.amount > 0);

    const paid = round2(cleaned.reduce((s, r) => s + r.amount, 0));
    if (paid !== round2(total)) return; // UI already shows error; keep silent here

    onConfirm?.(cleaned);
  };

  return (
    <Modal open={open} onClose={onClose} title="Partition Payment" size="md">
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <div className="flex justify-between">
            <span>Total Bill</span>
            <span className="font-bold text-primary-600">{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                className="input flex-1"
                value={r.method}
                onChange={(e) => updateRow(idx, { method: e.target.value })}
              >
                {PAYMENT_MODES.filter((m) => m !== 'Credit').map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input w-36"
                placeholder="Amount"
                min={0}
                value={r.amount}
                onChange={(e) => updateRow(idx, { amount: round2(Number(e.target.value) || 0) })}
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  className="btn-secondary px-3"
                  onClick={() => removeRow(idx)}
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addRow} className="btn-secondary w-full justify-center">
            + Add Method
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Paid</span>
            <span className="font-semibold">{formatCurrency(totalPaid, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining</span>
            <span className={diff === 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>
              {formatCurrency(Math.abs(diff), currency)}
            </span>
          </div>
          {diff !== 0 && (
            <p className="text-xs text-red-500 mt-2">
              Partition payment must match the total exactly (no underpayment / overpayment).
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={handleConfirm}
            className="btn-primary flex-1 justify-center"
          >
            Confirm Split
          </button>
        </div>
      </div>
    </Modal>
  );
}


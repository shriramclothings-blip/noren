/**
 * AddStockModal — Creates a new inventory batch for a product variant.
 *
 * Rules:
 * - Only creates a batch when NEW stock is purchased / received.
 * - Each batch gets a permanent unique batch number (BT20240101XXXX).
 * - Multiple batches can exist per variant with different costs/suppliers.
 * - Editing a product NEVER calls this — this is only for stock-in events.
 */
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Package, RefreshCw, X, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildBatchNumber } from '../utils/productInventoryModel';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function AddStockModal({ open, onClose, product, company }) {
  const { addInventoryBatch, suppliers, currentUser } = useApp();
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [form, setForm] = useState({
    qty: '',
    costPrice: '',
    supplierId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    invoiceRef: '',
  });
  const [batchNumber, setBatchNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const variantList = Array.isArray(product?.variants) ? product.variants.filter(Boolean) : [];

  useEffect(() => {
    if (!open) return;
    setBatchNumber(buildBatchNumber('BT'));
    setForm({
      qty: '',
      costPrice: '',
      supplierId: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
      invoiceRef: '',
    });
    // Pre-select first active variant
    const currentVariants = Array.isArray(product?.variants) ? product.variants.filter(Boolean) : [];
    const firstActive = currentVariants.find((v) => v.status !== 'Inactive') || currentVariants[0];
    setSelectedVariantId(firstActive?.id ? String(firstActive.id) : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const handleVariantChange = (id) => {
    setSelectedVariantId(id);
    const variant = variantList.find((v) => String(v.id) === String(id));
    if (variant?.costPrice) {
      setForm((f) => ({ ...f, costPrice: variant.costPrice }));
    }
  };

  const regenerateBatch = () => {
    setBatchNumber(buildBatchNumber('BT'));
    toast.success('New batch number generated');
  };

  const handleSave = async () => {
    if (!selectedVariantId) { toast.error('Please select a variant'); return; }
    const qty = parseInt(form.qty);
    if (!qty || qty < 1) { toast.error('Quantity must be at least 1'); return; }
    const costPrice = parseFloat(form.costPrice);
    if (isNaN(costPrice) || costPrice < 0) { toast.error('Enter a valid cost price'); return; }

    const variant = variantList.find((v) => String(v.id) === String(selectedVariantId));

    setSaving(true);
    try {
      await addInventoryBatch({
        productId: product.id,
        variantId: variant?.id,
        batchNumber,
        quantity: qty,
        purchaseCost: costPrice,
        supplierId: form.supplierId ? parseInt(form.supplierId) : null,
        purchaseDate: form.purchaseDate,
        notes: form.notes,
        invoiceRef: form.invoiceRef,
        createdBy: currentUser?.name || currentUser?.username || 'System',
        productName: product.name,
        variantLabel: variant
          ? (variant.label || [variant.size, variant.color].filter(Boolean).join(' / ') || 'Default')
          : '',
      });
      toast.success(`Batch ${batchNumber} created — ${qty} units added`);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to add stock');
    } finally {
      setSaving(false);
    }
  };

  const totalCost = (parseFloat(form.qty) || 0) * (parseFloat(form.costPrice) || 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add Stock — ${product?.name || 'Product'}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Info */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-700 dark:text-green-300 flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            This creates a <strong>permanent inventory batch</strong>. The batch number{' '}
            <strong>{batchNumber}</strong> will never change. Each purchase gets its own batch for
            full traceability.
          </span>
        </div>

        {/* Batch Number */}
        <div>
          <label className="label">Batch Number</label>
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono font-semibold text-primary-600"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
            <button type="button" onClick={regenerateBatch} className="btn-secondary px-3" title="Regenerate">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Variant Selection */}
        <div>
          <label className="label">Variant / Size <span className="text-red-500">*</span></label>
          {variantList.length > 0 ? (
            <select
              className="input"
              value={selectedVariantId}
              onChange={(e) => handleVariantChange(e.target.value)}
            >
              <option value="">— Select variant —</option>
              {variantList.map((v) => {
                const label = v.label
                  || [v.size, v.color].filter(Boolean).join(' / ')
                  || `Variant ${v.id}`;
                return (
                  <option key={v.id} value={v.id}>
                    {label}{v.sku ? ` (${v.sku})` : ''} — Stock: {v.stock ?? 0}
                  </option>
                );
              })}
            </select>
          ) : (
            <p className="text-sm text-gray-400 italic p-2 bg-gray-50 rounded-lg">
              No variants defined. Add variants to the product first.
            </p>
          )}
        </div>

        {/* Purchase Details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quantity <span className="text-red-500">*</span></label>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="50"
              value={form.qty}
              onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Purchase Cost / Unit</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.costPrice}
              onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Supplier</label>
            <select
              className="input"
              value={form.supplierId}
              onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
            >
              <option value="">Walk-in / No Supplier</option>
              {(suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Purchase Date</label>
            <input
              className="input"
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Invoice / Ref #</label>
            <input
              className="input"
              placeholder="Supplier invoice ref"
              value={form.invoiceRef}
              onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <input
              className="input"
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Total Cost Summary */}
        {totalCost > 0 && (
          <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Purchase Cost</p>
              <p className="text-xs text-gray-500">
                {form.qty || 0} units × {formatCurrency(parseFloat(form.costPrice) || 0, company?.currency)}
              </p>
            </div>
            <span className="text-xl font-bold text-primary-600">
              {formatCurrency(totalCost, company?.currency)}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !selectedVariantId}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Package size={16} />}
            {saving ? 'Adding Stock...' : 'Add Stock & Create Batch'}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * VariantForm Component
 * Add/Edit individual variant with size details
 */
import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { generateVariantBarcode, generateVariantSku } from '../utils/variantUtils';
import toast from 'react-hot-toast';

export default function VariantForm({ product, variant = null, onClose, onSave }) {
  const [form, setForm] = useState({
    label: '',
    sku: '',
    barcode: '',
    stock: 0,
    price: '',
    costPrice: '',
    taxRate: '',
  });

  useEffect(() => {
    if (variant) {
      setForm({
        label: variant.label || '',
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        stock: variant.stock || 0,
        price: variant.price || '',
        costPrice: variant.costPrice || '',
        taxRate: variant.taxRate || '',
      });
    }
  }, [variant]);

  const handleAutoGenerateSku = () => {
    const generated = generateVariantSku(product.sku || product.id, form.label);
    setForm(f => ({ ...f, sku: generated }));
  };

  const handleAutoGenerateBarcode = () => {
    const generated = generateVariantBarcode(product.sku || product.id, form.label);
    setForm(f => ({ ...f, barcode: generated }));
  };

  const handleSave = () => {
    if (!form.label) {
      toast.error('Size label required');
      return;
    }

    if (!form.sku) {
      toast.error('SKU required');
      return;
    }

    if (!form.barcode) {
      toast.error('Barcode required');
      return;
    }

    onSave({
      ...form,
      stock: parseInt(form.stock) || 0,
      price: form.price ? parseFloat(form.price) : null,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      taxRate: form.taxRate ? parseFloat(form.taxRate) : null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Size Label *</label>
        <input
          className="input"
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value.toUpperCase() }))}
          placeholder="e.g., S, M, L, XL"
        />
      </div>

      <div>
        <label className="label">SKU *</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={form.sku}
            onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
            placeholder="e.g., SHIRT001-M"
          />
          <button onClick={handleAutoGenerateSku} className="btn-secondary px-3">
            Auto
          </button>
        </div>
      </div>

      <div>
        <label className="label">Barcode *</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={form.barcode}
            onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
            placeholder="e.g., SHRT-BLK-M"
          />
          <button onClick={handleAutoGenerateBarcode} className="btn-secondary px-3">
            Auto
          </button>
        </div>
      </div>

      <div>
        <label className="label">Stock Quantity</label>
        <input
          className="input"
          type="number"
          min="0"
          value={form.stock}
          onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sale Price</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            placeholder="Override product price"
          />
        </div>

        <div>
          <label className="label">Cost Price</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.costPrice}
            onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
            placeholder="Override product cost"
          />
        </div>
      </div>

      <div>
        <label className="label">Tax Rate (%)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={form.taxRate}
          onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}
          placeholder="Override product tax"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={handleSave} className="btn-primary flex-1 justify-center gap-2">
          <Save size={16} /> {variant ? 'Update' : 'Create'} Variant
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">
          <X size={16} /> Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * AddProductModal — Enterprise-grade product creation/editing form.
 *
 * SECTION A: Master Product (Name, Brand, Category, Description, Image, Unit)
 * SECTION B: Variants (unlimited, each with Name/Label, SKU, Barcode, Price, Stock, Min Stock, Status)
 *
 * Rules:
 * - Each variant has a custom user-defined name (label).
 * - Initial stock can be set directly when creating a product.
 * - Editing a product NEVER generates a new batch.
 * - Batches are only created when new stock is purchased.
 * - Barcodes must be unique — checked against DB before save.
 * - SKU auto-generation based on product name + brand + size.
 */
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import {
  Plus, Trash2, Sparkles, RefreshCw, X, Check, Layers3, Boxes,
  AlertCircle, CheckCircle, Info, Package, Hash,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildVariantSku, createDefaultVariant, buildBatchNumber } from '../utils/productInventoryModel';
import toast from 'react-hot-toast';

const EMPTY_PRODUCT = {
  name: '',
  brand: '',
  category: '',
  description: '',
  unit: 'PCS',
  imageUrl: '',
  variants: [],
};

const UNIT_OPTIONS = ['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'PAIR', 'SET', 'DOZ', 'ROLL', 'PKT'];

export default function AddProductModal({ open, onClose, editItem, products, onSave }) {
  const { generateBarcodeUnique, checkBarcodeUnique, checkSkuUnique } = useApp();
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, variants: [] });
  const [barcodeStatus, setBarcodeStatus] = useState({}); // { [variantIndex]: 'ok' | 'error' | 'checking' }
  const [skuStatus, setSkuStatus] = useState({});
  const [saving, setSaving] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (!open) return;
    if (editItem) {
      const normalizedVariants = Array.isArray(editItem.variants) && editItem.variants.length > 0
        ? editItem.variants.map((v, i) => ({
            ...createDefaultVariant(editItem, i),
            ...v,
            // ensure batchNumber exists for each variant
            batchNumber: v.batchNumber || buildBatchNumber('BT'),
          }))
        : [];
      setForm({ ...EMPTY_PRODUCT, ...editItem, variants: normalizedVariants });
    } else {
      setForm({ ...EMPTY_PRODUCT, variants: [] });
    }
    setBarcodeStatus({});
    setSkuStatus({});
  }, [open, editItem]);

  const updateVariantField = useCallback((index, field, value) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((v, i) => i === index ? { ...v, [field]: value } : v),
    }));
    // Clear validation status when field changes
    if (field === 'barcode') setBarcodeStatus((s) => ({ ...s, [index]: null }));
    if (field === 'sku') setSkuStatus((s) => ({ ...s, [index]: null }));
  }, []);

  const addVariantRow = () => {
    setForm((current) => ({
      ...current,
      variants: [
        ...(current.variants || []),
        {
          ...createDefaultVariant(current, (current.variants || []).length),
          label: '',
          initialStock: 0,
          batchNumber: buildBatchNumber('BT'),
        },
      ],
    }));
  };

  const removeVariantRow = (index) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, i) => i !== index),
    }));
    setBarcodeStatus((s) => {
      const next = { ...s };
      delete next[index];
      return next;
    });
    setSkuStatus((s) => {
      const next = { ...s };
      delete next[index];
      return next;
    });
  };

  const generateAutoBarcode = async (index) => {
    try {
      const newBarcode = await generateBarcodeUnique();
      updateVariantField(index, 'barcode', newBarcode);
      setBarcodeStatus((s) => ({ ...s, [index]: 'ok' }));
      toast.success(`Generated: ${newBarcode}`);
    } catch {
      toast.error('Failed to generate barcode');
    }
  };

  const validateBarcode = async (index, value) => {
    if (!value) { setBarcodeStatus((s) => ({ ...s, [index]: null })); return; }
    setBarcodeStatus((s) => ({ ...s, [index]: 'checking' }));
    try {
      const excludeVariantId = editItem?.variants?.[index]?.id;
      const unique = await checkBarcodeUnique(value, excludeVariantId, editItem?.id);
      setBarcodeStatus((s) => ({ ...s, [index]: unique ? 'ok' : 'error' }));
      if (!unique) toast.error(`Barcode "${value}" already exists. Please use another.`);
    } catch {
      setBarcodeStatus((s) => ({ ...s, [index]: null }));
    }
  };

  const validateSku = async (index, value) => {
    if (!value) { setSkuStatus((s) => ({ ...s, [index]: null })); return; }
    setSkuStatus((s) => ({ ...s, [index]: 'checking' }));
    try {
      const excludeVariantId = editItem?.variants?.[index]?.id;
      const unique = await checkSkuUnique(value, excludeVariantId);
      setSkuStatus((s) => ({ ...s, [index]: unique ? 'ok' : 'error' }));
      if (!unique) toast.error(`SKU "${value}" already exists. Please use another.`);
    } catch {
      setSkuStatus((s) => ({ ...s, [index]: null }));
    }
  };

  const autoGenerateSku = (index) => {
    const variant = form.variants[index];
    const sku = buildVariantSku({
      productName: form.name,
      brand: form.brand,
      size: variant.size,
      color: variant.color,
    });
    updateVariantField(index, 'sku', sku);
    toast.success(`SKU: ${sku}`);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, imageUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Product name is required'); return; }

    // Validate all barcodes are unique before saving
    const barcodeErrors = (form.variants || []).filter((v, i) => barcodeStatus[i] === 'error');
    if (barcodeErrors.length > 0) {
      toast.error('Fix duplicate barcodes before saving');
      return;
    }

    const skuErrors = (form.variants || []).filter((v, i) => skuStatus[i] === 'error');
    if (skuErrors.length > 0) {
      toast.error('Fix duplicate SKUs before saving');
      return;
    }

    // Check for inter-variant barcode duplicates
    const barcodes = (form.variants || []).map((v) => v.barcode?.trim()).filter(Boolean);
    const uniqueBarcodes = new Set(barcodes);
    if (uniqueBarcodes.size !== barcodes.length) {
      toast.error('Two variants have the same barcode — each variant needs a unique barcode');
      return;
    }

    // Check for inter-variant SKU duplicates
    const skus = (form.variants || []).map((v) => v.sku?.trim()).filter(Boolean);
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      toast.error('Two variants have the same SKU');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        brand: (form.brand || '').trim(),
        category: (form.category || '').trim(),
        unit: form.unit || 'PCS',
        variants: (form.variants || []).map((v, i) => {
          const variantLabel = (v.label || v.size || v.color || `Variant ${i + 1}`).trim();
          // Stock: always use what's in the form (editable in both create and edit)
          const stock = editItem
            ? Number(v.stock ?? 0)           // edit: use current stock field (user can change)
            : Number(v.initialStock ?? 0);   // create: use initialStock field
          return {
            ...createDefaultVariant(form, i),
            ...v,
            id: v.id || `variant-${Date.now()}-${i + 1}`,
            label: variantLabel,
            stock,
            price: Number(v.price ?? 0),
            costPrice: Number(v.costPrice ?? 0),
            minStock: Number(v.minStock ?? 0),
            active: v.status !== 'Inactive',
            status: v.status || 'Active',
            batchNumber: v.batchNumber || buildBatchNumber('BT'),
          };
        }),
        sku: form.sku || buildVariantSku({
          productName: form.name,
          brand: form.brand,
          size: (form.variants || [])[0]?.size || '',
        }),
        barcode: form.barcode || (form.variants || [])[0]?.barcode || '',
        salePrice: Number((form.variants || [])[0]?.price ?? form.salePrice ?? 0),
        costPrice: Number((form.variants || [])[0]?.costPrice ?? form.costPrice ?? 0),
        // Sum actual stock across all variants
        stock: (form.variants || []).reduce((s, v) => {
          const qty = editItem ? Number(v.stock || 0) : Number(v.initialStock || 0);
          return s + qty;
        }, 0),
        minStock: Number((form.variants || [])[0]?.minStock ?? form.minStock ?? 0),
      };

      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === 'ok') return <CheckCircle size={14} className="text-emerald-500" />;
    if (status === 'error') return <AlertCircle size={14} className="text-red-500" />;
    if (status === 'checking') return <RefreshCw size={14} className="text-gray-400 animate-spin" />;
    return null;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editItem ? `Edit Product — ${editItem.name}` : 'Add New Product'}
      size="xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">

        {/* ── SECTION A: Master Product ── */}
        <section className="rounded-2xl border border-blue-100 dark:border-blue-900/40 p-4 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400">
            <Layers3 size={16} />
            Section A — Master Product
            <span className="text-xs font-normal text-gray-400 ml-1">(Common product information)</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="label">Product Name <span className="text-red-500">*</span></label>
              <input
                className="input"
                placeholder="e.g. Cotton T-Shirt"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Brand</label>
              <input
                className="input"
                placeholder="e.g. DS, Nike, Levis"
                value={form.brand || ''}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                placeholder="e.g. T-Shirts, Jeans, Shoes"
                value={form.category || ''}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Default Unit</label>
              <select
                className="input"
                value={form.unit || 'PCS'}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              >
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Product Image</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {form.imageUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.imageUrl} alt="Preview" className="h-12 w-12 rounded-lg object-cover border" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Optional product description"
                value={form.description || ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ── SECTION B: Variants ── */}
        <section className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-4 bg-indigo-50/20 dark:bg-indigo-900/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-400">
              <Boxes size={16} />
              Section B — Product Variants
              <span className="text-xs font-normal text-gray-400 ml-1">
                (Click "Add Variant" to add sizes/colors. Each variant has its own barcode, price &amp; stock.)
              </span>
            </div>
            <button className="btn-secondary text-xs py-1.5" onClick={addVariantRow}>
              <Plus size={13} /> Add Variant
            </button>
          </div>

          {form.variants && form.variants.length === 0 && (
            <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Boxes size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No variants yet</p>
              <p className="text-xs mt-1">Click "Add Variant" to add Size M, Size L, Color Red, etc.</p>
              <button type="button" className="mt-3 btn-secondary text-xs" onClick={addVariantRow}>
                <Plus size={12} /> Add First Variant
              </button>
            </div>
          )}

          {editItem && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong>Editing mode:</strong> Editing this product will NOT create a new batch or change stock.
                Use <strong>Add Stock</strong> on the inventory list to add new batches.
              </span>
            </div>
          )}

          <div className="space-y-4">
            {(form.variants || []).map((variant, index) => (
              <div
                key={variant.id || index}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Variant {index + 1}
                    {(variant.label || variant.size) ? ` — ${variant.label || variant.size}` : ''}
                    {variant.color ? ` / ${variant.color}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVariantRow(index)}
                    className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Remove variant"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Variant Name / Label */}
                    <div className="col-span-2 md:col-span-2">
                      <label className="label">Variant Name / Label <span className="text-red-500">*</span></label>
                      <input
                        className="input font-medium"
                        placeholder="e.g. Size M, Red XL, 30 inch..."
                        value={variant.label || ''}
                        onChange={(e) => updateVariantField(index, 'label', e.target.value)}
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">This name appears on barcode labels and reports</p>
                    </div>

                    {/* Size (optional) */}
                    <div>
                      <label className="label">Size <span className="text-gray-400 text-xs">(optional)</span></label>
                      <input
                        className="input"
                        placeholder="M, L, XL, 30, 32..."
                        value={variant.size || ''}
                        onChange={(e) => updateVariantField(index, 'size', e.target.value)}
                      />
                    </div>

                    {/* Color (optional) */}
                    <div>
                      <label className="label">Color <span className="text-gray-400 text-xs">(optional)</span></label>
                      <input
                        className="input"
                        placeholder="Red, Blue, Black..."
                        value={variant.color || ''}
                        onChange={(e) => updateVariantField(index, 'color', e.target.value)}
                      />
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="label flex items-center gap-1">
                        SKU
                        <StatusIcon status={skuStatus[index]} />
                      </label>
                      <div className="flex gap-1">
                        <input
                          className={`input flex-1 font-mono text-xs ${skuStatus[index] === 'error' ? 'border-red-400' : ''}`}
                          placeholder="DS-TS-M"
                          value={variant.sku || ''}
                          onChange={(e) => updateVariantField(index, 'sku', e.target.value)}
                          onBlur={(e) => validateSku(index, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => autoGenerateSku(index)}
                          className="btn-secondary px-2"
                          title="Auto-generate SKU"
                        >
                          <Sparkles size={12} />
                        </button>
                      </div>
                      {skuStatus[index] === 'error' && (
                        <p className="text-xs text-red-500 mt-1">SKU already exists</p>
                      )}
                    </div>

                    {/* Barcode */}
                    <div>
                      <label className="label flex items-center gap-1">
                        Barcode
                        <StatusIcon status={barcodeStatus[index]} />
                      </label>
                      <div className="flex gap-1">
                        <input
                          className={`input flex-1 font-mono text-xs ${barcodeStatus[index] === 'error' ? 'border-red-400' : ''}`}
                          placeholder="450123"
                          value={variant.barcode || ''}
                          onChange={(e) => updateVariantField(index, 'barcode', e.target.value)}
                          onBlur={(e) => validateBarcode(index, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => generateAutoBarcode(index)}
                          className="btn-secondary px-2"
                          title="Generate unique barcode"
                        >
                          <Sparkles size={12} />
                        </button>
                      </div>
                      {barcodeStatus[index] === 'error' && (
                        <p className="text-xs text-red-500 mt-1">Barcode already exists. Please use another.</p>
                      )}
                      {barcodeStatus[index] === 'ok' && (
                        <p className="text-xs text-emerald-500 mt-1">Barcode is available</p>
                      )}
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="label">Selling Price</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={variant.price ?? ''}
                        onChange={(e) => updateVariantField(index, 'price', Number(e.target.value))}
                      />
                    </div>

                    {/* Cost Price */}
                    <div>
                      <label className="label">Cost Price</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={variant.costPrice ?? ''}
                        onChange={(e) => updateVariantField(index, 'costPrice', Number(e.target.value))}
                      />
                    </div>

                    {/* Initial Stock for new products */}
                    {!editItem && (
                      <div>
                        <label className="label flex items-center gap-1">
                          <Package size={12} className="text-green-500" />
                          Opening Stock
                        </label>
                        <input
                          className="input border-green-200 focus:border-green-400"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={variant.initialStock ?? 0}
                          onChange={(e) => updateVariantField(index, 'initialStock', Number(e.target.value))}
                        />
                        <p className="text-[10px] text-green-600 mt-0.5">Opening stock quantity</p>
                      </div>
                    )}

                    {/* Current Stock — editable anytime in edit mode */}
                    {editItem && (
                      <div>
                        <label className="label flex items-center gap-1">
                          <Package size={12} className="text-blue-500" />
                          Current Stock
                        </label>
                        <input
                          className="input border-blue-200 focus:border-blue-400"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={variant.stock ?? 0}
                          onChange={(e) => updateVariantField(index, 'stock', Number(e.target.value))}
                        />
                        <p className="text-[10px] text-blue-600 mt-0.5">Editable — saves directly</p>
                      </div>
                    )}

                    {/* Batch Number */}
                    <div>
                      <label className="label flex items-center gap-1">
                        <Hash size={12} className="text-purple-500" />
                        Batch Number
                      </label>
                      <div className="flex gap-1">
                        <input
                          className="input flex-1 font-mono text-xs"
                          placeholder="BT20240101..."
                          value={variant.batchNumber || ''}
                          onChange={(e) => updateVariantField(index, 'batchNumber', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => updateVariantField(index, 'batchNumber', buildBatchNumber('BT'))}
                          className="btn-secondary px-2"
                          title="Auto-generate batch number"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">Shown on barcode label</p>
                    </div>

                    {/* Low Stock Quantity */}
                    <div>
                      <label className="label">Low Stock Alert</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        placeholder="5"
                        value={variant.minStock ?? ''}
                        onChange={(e) => updateVariantField(index, 'minStock', Number(e.target.value))}
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={variant.status || 'Active'}
                        onChange={(e) => updateVariantField(index, 'status', e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1.5"
                      onClick={() => generateAutoBarcode(index)}
                    >
                      <Sparkles size={12} /> Generate Barcode
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1.5"
                      onClick={() => autoGenerateSku(index)}
                    >
                      <Sparkles size={12} /> Auto SKU
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 w-full border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl py-3 text-sm text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            onClick={addVariantRow}
          >
            <Plus size={16} className="inline mr-1" />
            Add Another Variant
          </button>
        </section>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500 flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5 text-gray-400" />
          <span>
            <strong>Stock Note:</strong> You can set or update stock directly in this form at any time.
            For purchase tracking (batches), use the <strong>Add Stock (Purchase)</strong> button on the inventory list — each purchase creates a permanent batch record for traceability.
            Batch numbers printed on labels come from the Batch Number field above.
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1 justify-center"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'Saving...' : editItem ? 'Update Product' : 'Create Product'}
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">
          <X size={16} /> Cancel
        </button>
      </div>
    </Modal>
  );
}

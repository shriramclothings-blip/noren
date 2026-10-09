import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, Clock3, Plus, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';

const EMPTY_FORM = {
  productId: '',
  variantId: '',
  quantity: 1,
  fromLocation: 'Main Store',
  toLocation: 'Warehouse',
  status: 'Pending',
  notes: '',
};

export default function StockTransfers() {
  const { products = [], variants = [], stockTransfers = [], createStockTransfer, updateStockTransfer } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const safeProducts = useMemo(() => (Array.isArray(products) ? products.filter(p => !p.archived) : []), [products]);
  const safeStockTransfers = useMemo(() => (Array.isArray(stockTransfers) ? stockTransfers : []), [stockTransfers]);

  const selectedProduct = useMemo(() =>
    safeProducts.find(p => String(p.id) === String(form.productId)) || null, [safeProducts, form.productId]);

  const productVariants = useMemo(() => {
    if (!selectedProduct) return [];
    // First try variants store
    const storeVariants = variants.filter(v => v.productId === selectedProduct.id);
    if (storeVariants.length > 0) return storeVariants;
    // Fall back to embedded variants
    return Array.isArray(selectedProduct.variants) ? selectedProduct.variants.filter(Boolean) : [];
  }, [selectedProduct, variants]);

  const selectedVariant = useMemo(() =>
    productVariants.find(v => String(v.id) === String(form.variantId)) || null, [productVariants, form.variantId]);

  const pendingTransfers = useMemo(() =>
    safeStockTransfers.filter(t => String(t.status).toLowerCase() === 'pending').length, [safeStockTransfers]);
  const approvedTransfers = useMemo(() =>
    safeStockTransfers.filter(t => ['approved', 'completed'].includes(String(t.status).toLowerCase())).length, [safeStockTransfers]);

  const handleCreate = async () => {
    if (!form.productId) { toast.error('Choose a product'); return; }
    if (!selectedProduct) { toast.error('Product not found'); return; }
    const qty = Number(form.quantity || 1);
    if (qty < 1) { toast.error('Quantity must be at least 1'); return; }

    // Check available stock
    const availableStock = form.variantId && selectedVariant
      ? Number(selectedVariant.stock || 0)
      : Number(selectedProduct.stock || 0);
    if (qty > availableStock) {
      toast.error(`Insufficient stock. Available: ${availableStock}`);
      return;
    }

    setSaving(true);
    try {
      await createStockTransfer({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        variantId: form.variantId ? Number(form.variantId) : null,
        variantLabel: selectedVariant ? ([selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ') || selectedVariant.label || 'Default') : '',
        quantity: qty,
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        status: form.status,
        notes: form.notes,
      });
      toast.success('Transfer created');
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err?.message || 'Unable to save stock transfer');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (transfer) => {
    try {
      await updateStockTransfer(transfer.id, { status: 'Approved' });
      toast.success('Transfer approved — stock reduced');
    } catch (err) {
      toast.error(err?.message || 'Unable to approve transfer');
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Transfers</h1>
          <p className="text-sm text-gray-500">Move inventory between locations. Approving a transfer reduces stock immediately.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xl font-bold text-orange-500">{pendingTransfers}</p>
          <p className="text-xs text-gray-400">Pending Transfers</p>
        </div>
        <div className="card p-4">
          <p className="text-xl font-bold text-green-600">{approvedTransfers}</p>
          <p className="text-xs text-gray-400">Approved / Completed</p>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300">New Transfer</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Product <span className="text-red-500">*</span></label>
            <select className="input" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value, variantId: '' }))}>
              <option value="">Choose product</option>
              {safeProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock ?? 0})</option>
              ))}
            </select>
          </div>
          {productVariants.length > 0 && (
            <div>
              <label className="label">Variant</label>
              <select className="input" value={form.variantId} onChange={e => setForm(f => ({ ...f, variantId: e.target.value }))}>
                <option value="">All variants</option>
                {productVariants.map(v => (
                  <option key={v.id} value={v.id}>
                    {[v.size, v.color].filter(Boolean).join(' / ') || v.label || 'Default'} — Stock: {v.stock ?? 0}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Quantity <span className="text-red-500">*</span></label>
            <input className="input" type="number" min="1" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))} />
            {(form.variantId && selectedVariant) && (
              <p className="text-xs text-gray-400 mt-1">Available: {selectedVariant.stock ?? 0}</p>
            )}
            {!form.variantId && selectedProduct && (
              <p className="text-xs text-gray-400 mt-1">Available: {selectedProduct.stock ?? 0}</p>
            )}
          </div>
          <div>
            <label className="label">From Location</label>
            <input className="input" value={form.fromLocation} onChange={e => setForm(f => ({ ...f, fromLocation: e.target.value }))} />
          </div>
          <div>
            <label className="label">To Location</label>
            <input className="input" value={form.toLocation} onChange={e => setForm(f => ({ ...f, toLocation: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="Pending">Pending (stock reduced when approved)</option>
              <option value="Approved">Approved (reduce stock now)</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <button onClick={handleCreate} disabled={saving} className="btn-primary">
          <Plus size={16} /> {saving ? 'Creating...' : 'Create Transfer'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="table-head">Date</th>
                <th className="table-head">Product</th>
                <th className="table-head">Variant</th>
                <th className="table-head">Qty</th>
                <th className="table-head">Route</th>
                <th className="table-head">Notes</th>
                <th className="table-head">Status</th>
                <th className="table-head">Action</th>
              </tr>
            </thead>
            <tbody>
              {safeStockTransfers.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-gray-400 py-10">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    No stock transfers yet
                  </td>
                </tr>
              )}
              {safeStockTransfers.map(transfer => (
                <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell text-xs text-gray-500">{formatDateTime(transfer.date || transfer.createdAt)}</td>
                  <td className="table-cell font-medium">{transfer.productName || '—'}</td>
                  <td className="table-cell text-xs text-gray-500">{transfer.variantLabel || '—'}</td>
                  <td className="table-cell font-semibold">{transfer.quantity || 0}</td>
                  <td className="table-cell text-xs">{transfer.fromLocation || 'Source'} → {transfer.toLocation || 'Destination'}</td>
                  <td className="table-cell text-xs text-gray-400 max-w-[120px] truncate">{transfer.notes || '—'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${String(transfer.status).toLowerCase() === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {String(transfer.status).toLowerCase() === 'pending' ? <Clock3 size={12} /> : <CheckCircle2 size={12} />}
                      {transfer.status || 'Pending'}
                    </span>
                  </td>
                  <td className="table-cell">
                    {!['approved', 'completed'].includes(String(transfer.status).toLowerCase()) && (
                      <button onClick={() => handleApprove(transfer)} className="btn-secondary text-xs py-1 px-2">
                        <ArrowRightLeft size={12} /> Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

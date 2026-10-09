import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  Plus, Search, Trash2, Edit3, Package, ChevronDown, ChevronUp,
  Calendar, FileText, TrendingUp, DollarSign, Eye, X, Check, Layers,
} from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { buildBatchNumber } from '../utils/productInventoryModel';

// Empty line item for new purchase forms
const EMPTY_ITEM = { productId: '', variantId: '', size: '', qty: 1, costPrice: 0 };

export default function Purchases() {
  const {
    purchases, addPurchase, updatePurchase, deletePurchase,
    suppliers, products, variants, company, currentUser,
    addInventoryBatch,
  } = useApp();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [viewPurchase, setViewPurchase] = useState(null);
  const [form, setForm] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    invoiceRef: '',
    notes: '',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  // ─── Helper: get variants for a product ───────────────────────────────────
  const getProductVariants = useCallback((productId) => {
    if (!productId) return [];
    const pid = parseInt(productId);
    // Try inline variants first (product.variants[]), then global variants store
    const prod = products.find(p => p.id === pid);
    const inlineVariants = Array.isArray(prod?.variants) ? prod.variants.filter(Boolean) : [];
    const storeVariants = variants.filter(v => v.productId === pid);
    // Merge: prefer store variants if they exist
    return storeVariants.length > 0 ? storeVariants : inlineVariants;
  }, [products, variants]);

  // ─── Filtered purchases ────────────────────────────────────────────────────
  const filtered = useMemo(() => purchases.filter(p =>
    (p.invoiceRef || '').toLowerCase().includes(search.toLowerCase()) ||
    (suppliers.find(s => s.id === p.supplierId)?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.notes || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.date) - new Date(a.date)), [purchases, search, suppliers]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSpent = purchases.reduce((s, p) => s + (p.total || 0), 0);
    const thisMonth = purchases.filter(p => {
      const d = new Date(p.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthSpent = thisMonth.reduce((s, p) => s + (p.total || 0), 0);
    return { total: purchases.length, totalSpent, monthSpent, suppliers: suppliers.length };
  }, [purchases, suppliers]);

  // ─── Items management ──────────────────────────────────────────────────────
  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => setItems(prev =>
    prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [key]: val };
      // When product changes, reset variant/size
      if (key === 'productId') {
        updated.variantId = '';
        updated.size = '';
        // Auto-fill cost price from product
        const prod = products.find(p => p.id === parseInt(val));
        if (prod) updated.costPrice = prod.costPrice || 0;
      }
      // When variant changes, auto-fill cost price from variant
      if (key === 'variantId' && val) {
        const prodVariants = getProductVariants(item.productId);
        const variant = prodVariants.find(v => String(v.id) === String(val));
        if (variant?.costPrice) updated.costPrice = variant.costPrice;
      }
      return updated;
    })
  );

  const total = items.reduce((s, i) => s + ((parseFloat(i.costPrice) || 0) * (parseInt(i.qty) || 0)), 0);

  // ─── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ supplierId: '', date: new Date().toISOString().split('T')[0], invoiceRef: '', notes: '' });
    setItems([{ ...EMPTY_ITEM }]);
    setSelectedPurchase(null);
    setIsEditing(false);
  };

  // ─── Open edit modal ───────────────────────────────────────────────────────
  const openEditModal = (purchase) => {
    setSelectedPurchase(purchase);
    setIsEditing(true);
    setForm({
      supplierId: purchase.supplierId ? String(purchase.supplierId) : '',
      date: purchase.date || new Date().toISOString().split('T')[0],
      invoiceRef: purchase.invoiceRef || '',
      notes: purchase.notes || '',
    });
    setItems((purchase.items || []).map(item => ({
      productId: item.productId ? String(item.productId) : '',
      variantId: item.variantId ? String(item.variantId) : '',
      size: item.size || '',
      qty: item.qty || 1,
      costPrice: item.costPrice || 0,
    })));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // ─── Save purchase ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (items.some(i => !i.productId)) {
      return toast.error('Select a product for all items');
    }
    if (items.some(i => (parseInt(i.qty) || 0) < 1)) {
      return toast.error('Quantity must be at least 1 for all items');
    }

    const purchaseItems = items.map(i => {
      const prod = products.find(p => p.id === parseInt(i.productId));
      const prodVariants = getProductVariants(i.productId);
      const variant = i.variantId ? prodVariants.find(v => String(v.id) === String(i.variantId)) : null;
      return {
        productId: parseInt(i.productId),
        variantId: i.variantId ? (isNaN(parseInt(i.variantId)) ? i.variantId : parseInt(i.variantId)) : null,
        size: variant ? (variant.size || variant.label || i.size || '') : (i.size || ''),
        qty: parseInt(i.qty) || 1,
        costPrice: parseFloat(i.costPrice) || 0,
        name: prod?.name || '',
        variantLabel: variant ? (variant.size || variant.label || variant.color || '') : (i.size || ''),
        sku: variant?.sku || prod?.sku || '',
        barcode: variant?.barcode || prod?.barcode || '',
      };
    });

    const purchaseData = {
      ...form,
      supplierId: form.supplierId ? parseInt(form.supplierId) : null,
      items: purchaseItems,
      total,
      createdBy: currentUser?.name || currentUser?.username || 'System',
    };

    try {
      if (isEditing && selectedPurchase) {
        // IMPORTANT: updatePurchase reverses old stock then applies new — does NOT create a new batch
        await updatePurchase({ id: selectedPurchase.id, ...purchaseData });
        toast.success('Purchase updated and inventory synchronized');
      } else {
        // New purchase: create purchase record (addPurchase handles stock),
        // then create inventory batch records for traceability only (stock already updated).
        await addPurchase(purchaseData);
        // Create an inventory batch for each line item — stock was already updated by addPurchase above
        for (const item of purchaseItems) {
          if (item.variantId) {
            await addInventoryBatch({
              productId: item.productId,
              variantId: item.variantId,
              batchNumber: buildBatchNumber('BT'),
              quantity: item.qty,
              purchaseCost: item.costPrice,
              supplierId: purchaseData.supplierId,
              purchaseDate: purchaseData.date,
              notes: purchaseData.notes || '',
              invoiceRef: purchaseData.invoiceRef || '',
              createdBy: purchaseData.createdBy,
              stockAlreadyUpdated: true, // addPurchase already updated stock — don't count twice
            });
          }
        }
        toast.success('Purchase recorded and stock updated');
      }
      closeModal();
    } catch (err) {
      toast.error(err?.message || 'Unable to save purchase');
    }
  };

  // ─── Delete purchase ───────────────────────────────────────────────────────
  const handleDelete = async (purchase) => {
    if (!window.confirm(
      `Delete purchase "${purchase.invoiceRef || `PUR-${purchase.id}`}"?\n\nThis will REVERSE the inventory stock changes. This cannot be undone.`
    )) return;
    try {
      await deletePurchase(purchase.id);
      toast.success('Purchase deleted and inventory reversed');
    } catch (err) {
      toast.error(err?.message || 'Unable to delete purchase');
    }
  };

  // ─── Render variant selector for a line item ───────────────────────────────
  const renderVariantSelector = (item, i) => {
    const prodVariants = getProductVariants(item.productId);
    if (!item.productId || prodVariants.length === 0) return null;

    return (
      <select
        className="input flex-1 text-sm"
        value={item.variantId}
        onChange={e => updateItem(i, 'variantId', e.target.value)}
        title="Select variant/size"
      >
        <option value="">— No variant —</option>
        {prodVariants.map(v => {
          const label = v.size || v.label || v.color || v.name || `Variant ${v.id}`;
          const sku = v.sku ? ` (${v.sku})` : '';
          return (
            <option key={v.id} value={v.id}>
              {label}{sku}
            </option>
          );
        })}
      </select>
    );
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchases</h1>
          <p className="text-sm text-gray-500 mt-0.5">Purchase orders, stock-in, supplier invoices</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary gap-2"
        >
          <Plus size={16} /> New Purchase
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Purchases</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-red-500">{formatCurrency(stats.totalSpent, company.currency)}</p>
            <p className="text-xs text-gray-500">Total Spent</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-amber-500">{formatCurrency(stats.monthSpent, company.currency)}</p>
            <p className="text-xs text-gray-500">This Month</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-500">{stats.suppliers}</p>
            <p className="text-xs text-gray-500">Suppliers</p>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by reference #, supplier, or notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['', 'Ref #', 'Supplier', 'Date', 'Items', 'Total', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-gray-400 py-16">
                    <Package size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No purchases yet</p>
                    <p className="text-xs mt-1">Create your first purchase to track stock</p>
                  </td>
                </tr>
              )}
              {filtered.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {/* Expand toggle */}
                    <td className="table-cell w-8">
                      <button
                        onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Expand items"
                      >
                        {expandedRow === p.id
                          ? <ChevronUp size={14} className="text-gray-500" />
                          : <ChevronDown size={14} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {p.invoiceRef || `PUR-${p.id}`}
                      </span>
                    </td>
                    <td className="table-cell">
                      {suppliers.find(s => s.id === p.supplierId)?.name || (
                        <span className="text-gray-400 text-xs">Walk-in</span>
                      )}
                    </td>
                    <td className="table-cell text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(p.date)}
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Layers size={12} className="text-gray-400" />
                        {p.items?.length || 0} items
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(p.total, company.currency)}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-400 max-w-[140px] truncate">
                      {p.notes || '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewPurchase(p)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable item details */}
                  {expandedRow === p.id && (
                    <tr key={`${p.id}-expand`}>
                      <td colSpan={8} className="px-4 pb-3 bg-gray-50 dark:bg-gray-900/50">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mt-1">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                {['Product', 'Variant / Size', 'SKU', 'Qty', 'Cost Price', 'Subtotal'].map(h => (
                                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(p.items || []).map((item, idx) => {
                                const prod = products.find(pr => pr.id === item.productId);
                                return (
                                  <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                                      {item.name || prod?.name || `Product ${item.productId}`}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                      {item.variantLabel || item.size || '—'}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                                      {item.sku || '—'}
                                    </td>
                                    <td className="px-4 py-2 font-semibold">{item.qty}</td>
                                    <td className="px-4 py-2">{formatCurrency(item.costPrice, company.currency)}</td>
                                    <td className="px-4 py-2 font-semibold text-primary-600">
                                      {formatCurrency(item.costPrice * item.qty, company.currency)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Purchase Modal ── */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={isEditing ? 'Edit Purchase' : 'New Purchase Entry'}
        size="xl"
      >
        <div className="space-y-5">
          {/* Editing notice */}
          {isEditing && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
              <strong>Editing purchase:</strong> Stock will be reversed and re-applied. No new batch will be created.
            </div>
          )}

          {/* Header fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Supplier (optional)</label>
              <select
                className="input"
                value={form.supplierId}
                onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
              >
                <option value="">Walk-in / No Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="input pl-9"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Invoice / Ref #</label>
              <input
                className="input"
                placeholder="Supplier invoice number"
                value={form.invoiceRef}
                onChange={e => setForm(f => ({ ...f, invoiceRef: e.target.value }))}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0 font-semibold text-gray-700 dark:text-gray-300">
                Purchase Items
              </label>
              <button onClick={addItem} className="btn-secondary py-1.5 text-xs gap-1">
                <Plus size={13} /> Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((item, i) => {
                const prodVariants = getProductVariants(item.productId);
                const hasVariants = prodVariants.length > 0;

                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    {/* Product selector */}
                    <select
                      className="input flex-1 min-w-[180px] text-sm"
                      value={item.productId}
                      onChange={e => updateItem(i, 'productId', e.target.value)}
                    >
                      <option value="">— Select product —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    {/* Variant selector (only when variants exist) */}
                    {hasVariants && renderVariantSelector(item, i)}

                    {/* Size text (for products without variants) */}
                    {!hasVariants && item.productId && (
                      <input
                        className="input w-20 text-sm"
                        placeholder="Size"
                        value={item.size}
                        onChange={e => updateItem(i, 'size', e.target.value)}
                      />
                    )}

                    {/* Qty */}
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={e => updateItem(i, 'qty', e.target.value)}
                      className="input w-20 text-sm"
                      min={1}
                    />

                    {/* Cost price */}
                    <input
                      type="number"
                      placeholder="Cost ₹"
                      value={item.costPrice}
                      onChange={e => updateItem(i, 'costPrice', e.target.value)}
                      className="input w-28 text-sm"
                      min={0}
                      step="0.01"
                    />

                    {/* Subtotal */}
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-24 text-right">
                      {formatCurrency((parseFloat(item.costPrice) || 0) * (parseInt(item.qty) || 0), company.currency)}
                    </span>

                    {/* Remove */}
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(i)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total bar */}
          <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Purchase Amount</p>
              <p className="text-xs text-gray-500">{items.reduce((s, i) => s + (parseInt(i.qty) || 0), 0)} units across {items.filter(i => i.productId).length} products</p>
            </div>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(total, company.currency)}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Optional notes…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary flex-1 justify-center gap-2">
              <Check size={16} />
              {isEditing ? 'Save Changes & Sync Stock' : 'Save Purchase & Update Stock'}
            </button>
            <button onClick={closeModal} className="btn-secondary flex-1 justify-center gap-2">
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View Purchase Details Modal ── */}
      <Modal
        open={!!viewPurchase}
        onClose={() => setViewPurchase(null)}
        title={`Purchase Details — ${viewPurchase?.invoiceRef || `PUR-${viewPurchase?.id}`}`}
        size="lg"
      >
        {viewPurchase && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Supplier</p>
                <p className="font-semibold">
                  {suppliers.find(s => s.id === viewPurchase.supplierId)?.name || 'Walk-in Supplier'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Date</p>
                <p className="font-semibold">{formatDate(viewPurchase.date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Created By</p>
                <p className="font-semibold">{viewPurchase.createdBy || '—'}</p>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['Product', 'Variant', 'Qty', 'Cost Price', 'Total'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viewPurchase.items || []).map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-2 font-medium">{item.name || `Product ${item.productId}`}</td>
                      <td className="px-4 py-2 text-gray-500">{item.variantLabel || item.size || '—'}</td>
                      <td className="px-4 py-2 font-semibold">{item.qty}</td>
                      <td className="px-4 py-2">{formatCurrency(item.costPrice, company.currency)}</td>
                      <td className="px-4 py-2 font-semibold text-primary-600">
                        {formatCurrency(item.costPrice * item.qty, company.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={4} className="px-4 py-2 font-bold text-right text-gray-700 dark:text-gray-300">Total</td>
                    <td className="px-4 py-2 font-bold text-primary-600">
                      {formatCurrency(viewPurchase.total, company.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {viewPurchase.notes && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-sm">{viewPurchase.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { openEditModal(viewPurchase); setViewPurchase(null); }}
                className="btn-secondary flex-1 justify-center gap-2"
              >
                <Edit3 size={14} /> Edit Purchase
              </button>
              <button onClick={() => setViewPurchase(null)} className="btn-secondary flex-1 justify-center">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

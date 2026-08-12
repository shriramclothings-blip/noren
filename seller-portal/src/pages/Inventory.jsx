import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';
import {
  Package, Search, AlertTriangle, TrendingDown, TrendingUp,
  Edit2, RefreshCw, Download, Plus, Minus, Check, X,
  BarChart3, Activity, ImageOff, ChevronUp, ChevronDown,
} from 'lucide-react';

// ─── Stock level config ───────────────────────────────────────────────────────
const stockLevel = (n) => {
  if (n === 0) return { label: 'Out of Stock', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  if (n <= 5)  return { label: 'Critical',     color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
  if (n <= 10) return { label: 'Low',          color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  if (n <= 50) return { label: 'Adequate',     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  return              { label: 'High',         color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' };
};

const primaryImg = (product) => {
  if (!Array.isArray(product.images) || product.images.length === 0) return null;
  const p = product.images.find(i => i.is_primary) || product.images[0];
  return p?.image_url || null;
};

const totalVariantStock = (product) =>
  Array.isArray(product.variants)
    ? product.variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)
    : 0;

// ─── Stock update modal ───────────────────────────────────────────────────────
function StockModal({ product, onClose, onSaved }) {
  const [variants, setVariants] = useState(product.variants || []);
  const [inputMap, setInputMap] = useState(
    Object.fromEntries((product.variants || []).map(v => [v.id, String(v.stock ?? 0)]))
  );
  const [saving, setSaving] = useState(null); // variantId being saved

  const save = async (variantId, op = 'set') => {
    const raw = inputMap[variantId];
    const val = parseInt(raw);
    if (isNaN(val) || val < 0) { toast.error('Enter a valid number'); return; }
    setSaving(variantId);
    try {
      await api.patch(`/seller/products/${product.id}/variants/${variantId}/stock`, {
        stock: val, operation: op,
      });
      toast.success('Stock updated');
      // Refresh from server
      const res = await api.get(`/seller/products/${product.id}`);
      const fresh = res.data?.variants || [];
      setVariants(fresh);
      setInputMap(Object.fromEntries(fresh.map(v => [v.id, String(v.stock ?? 0)])));
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 14, padding: 24,
          width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Update Stock
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{product.title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {variants.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>
            No size variants found for this product.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {variants.map(v => {
              const lvl = stockLevel(parseInt(v.stock) || 0);
              const isSaving = saving === v.id;
              return (
                <div key={v.id} style={{
                  padding: 14, border: '1px solid #e5e7eb', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        Size: {v.size}
                      </span>
                      <span style={{
                        marginLeft: 10, fontSize: 11, fontWeight: 600,
                        color: lvl.color, background: lvl.bg,
                        padding: '2px 8px', borderRadius: 999, border: `1px solid ${lvl.border}`,
                      }}>
                        {lvl.label} ({v.stock ?? 0})
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => setInputMap(m => ({ ...m, [v.id]: String(Math.max(0, parseInt(m[v.id] || 0) - 1)) }))}
                      style={{
                        width: 34, height: 34, borderRadius: 7, border: '1px solid #e5e7eb',
                        background: '#fff', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Minus size={14} color="#374151" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={inputMap[v.id] ?? v.stock}
                      onChange={e => setInputMap(m => ({ ...m, [v.id]: e.target.value }))}
                      style={{
                        flex: 1, padding: '8px 12px', textAlign: 'center',
                        border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 15, fontWeight: 700,
                      }}
                    />
                    <button
                      onClick={() => setInputMap(m => ({ ...m, [v.id]: String(parseInt(m[v.id] || 0) + 1) }))}
                      style={{
                        width: 34, height: 34, borderRadius: 7, border: '1px solid #e5e7eb',
                        background: '#fff', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} color="#374151" />
                    </button>
                    <button
                      onClick={() => save(v.id, 'set')}
                      disabled={isSaving}
                      style={{
                        padding: '8px 18px', border: 'none', borderRadius: 7,
                        background: isSaving ? '#94a3b8' : '#0f172a',
                        color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {isSaving ? '…' : 'Set'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bulk update modal ────────────────────────────────────────────────────────
function BulkModal({ products, selectedIds, onClose, onSaved }) {
  const [op, setOp] = useState('add');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = products.filter(p => selectedIds.has(p.id));
  const variantCount = selected.reduce((s, p) => s + (p.variants?.length || 0), 0);

  const run = async () => {
    const val = parseInt(value);
    if (isNaN(val) || val < 0) { toast.error('Enter a valid number'); return; }
    setBusy(true);
    const calls = [];
    selected.forEach(product => {
      (product.variants || []).forEach(v => {
        calls.push(
          api.patch(`/seller/products/${product.id}/variants/${v.id}/stock`, {
            stock: val, operation: op,
          }).catch(() => null)
        );
      });
    });
    await Promise.all(calls);
    toast.success(`Updated ${calls.length} variant${calls.length !== 1 ? 's' : ''}`);
    setBusy(false);
    onSaved();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
            Bulk Stock Update
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
          Updating <strong>{selected.length} product{selected.length !== 1 ? 's' : ''}</strong> ({variantCount} variant{variantCount !== 1 ? 's' : ''} total)
        </p>
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Operation
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'add',      label: '+ Add' },
                { key: 'subtract', label: '- Subtract' },
                { key: 'set',      label: '= Set to' },
              ].map(o => (
                <button
                  key={o.key}
                  onClick={() => setOp(o.key)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    background: op === o.key ? '#0f172a' : '#f9fafb',
                    color: op === o.key ? '#fff' : '#374151',
                    border: op === o.key ? 'none' : '1px solid #e5e7eb',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Quantity
            </label>
            <input
              type="number"
              min="0"
              autoFocus
              placeholder="Enter quantity"
              value={value}
              onChange={e => setValue(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14,
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8,
              background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151',
            }}
          >
            Cancel
          </button>
          <button
            onClick={run}
            disabled={busy || !value}
            style={{
              padding: '10px 20px', border: 'none', borderRadius: 8, fontSize: 13,
              fontWeight: 700, cursor: busy || !value ? 'not-allowed' : 'pointer',
              background: busy || !value ? '#94a3b8' : '#0891b2', color: '#fff',
            }}
          >
            {busy ? 'Updating…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy]       = useState('stock-asc');
  const [selected, setSelected]   = useState(new Set());
  const [bulkMode, setBulkMode]   = useState(false);
  const [stockModal, setStockModal]   = useState(null); // product
  const [bulkModal, setBulkModal]     = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/seller/products?limit=500');
      const list = res.data?.data ?? res.data?.products ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load inventory');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = products.reduce((acc, p) => {
    const variants = p.variants || [];
    acc.totalVariants += variants.length;
    variants.forEach(v => {
      const s = parseInt(v.stock) || 0;
      acc.totalStock += s;
      if (s === 0) acc.outOfStock++;
      if (s > 0 && s <= 10) acc.low++;
    });
    return acc;
  }, { totalVariants: 0, totalStock: 0, outOfStock: 0, low: 0 });

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['Product ID', 'Product Title', 'Status', 'Size', 'Stock', 'Price', 'Stock Level']];
    products.forEach(p => {
      (p.variants || []).forEach(v => {
        const s = parseInt(v.stock) || 0;
        rows.push([p.id, `"${p.title}"`, p.status, v.size, s, p.price, stockLevel(s).label]);
      });
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  // ── Filtered / sorted ──────────────────────────────────────────────────────
  const filtered = products
    .filter(p => {
      const s = totalVariantStock(p);
      const okSearch = !search.trim() || p.title?.toLowerCase().includes(search.toLowerCase());
      const okStock =
        stockFilter === 'all' ? true :
        stockFilter === 'out' ? s === 0 :
        stockFilter === 'low' ? s > 0 && s <= 10 :
        stockFilter === 'ok'  ? s > 10 : true;
      return okSearch && okStock;
    })
    .sort((a, b) => {
      const sa = totalVariantStock(a), sb = totalVariantStock(b);
      if (sortBy === 'stock-asc')  return sa - sb;
      if (sortBy === 'stock-desc') return sb - sa;
      if (sortBy === 'name')       return a.title.localeCompare(b.title);
      if (sortBy === 'price')      return a.price - b.price;
      return 0;
    });

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const toggleSelect = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const S = { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 18 };

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Inventory</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Real-time stock levels across all your product variants.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {bulkMode && selected.size > 0 && (
              <button
                onClick={() => setBulkModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: '#0891b2', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Edit2 size={13} /> Update {selected.size} Selected
              </button>
            )}
            <button
              onClick={() => { setBulkMode(b => !b); setSelected(new Set()); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: bulkMode ? '#fef2f2' : '#f9fafb',
                color: bulkMode ? '#dc2626' : '#374151',
                border: bulkMode ? '1px solid #fecaca' : '1px solid #e5e7eb',
              }}
            >
              {bulkMode ? <X size={13} /> : <Check size={13} />}
              {bulkMode ? 'Cancel' : 'Bulk Update'}
            </button>
            <button
              onClick={exportCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151',
              }}
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={fetchProducts}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 8, border: 'none',
                background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { label: 'Products',     value: products.length,     icon: Package,       color: '#0f172a' },
            { label: 'Variants',     value: stats.totalVariants, icon: BarChart3,      color: '#6366f1' },
            { label: 'Total Units',  value: stats.totalStock,    icon: Activity,      color: '#16a34a' },
            { label: 'Out of Stock', value: stats.outOfStock,    icon: AlertTriangle, color: '#dc2626' },
            { label: 'Low Stock',    value: stats.low,           icon: TrendingDown,  color: '#d97706' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ ...S, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ ...S, padding: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 10px 9px 34px', boxSizing: 'border-box',
                  border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none',
                }}
              />
            </div>
            {/* Stock filter */}
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              style={{
                padding: '9px 32px 9px 12px', border: '1px solid #e5e7eb', borderRadius: 7,
                fontSize: 13, cursor: 'pointer', outline: 'none', background: '#fff',
              }}
            >
              <option value="all">All Levels</option>
              <option value="out">Out of Stock</option>
              <option value="low">Low Stock (≤10)</option>
              <option value="ok">Adequate (&gt;10)</option>
            </select>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '9px 32px 9px 12px', border: '1px solid #e5e7eb', borderRadius: 7,
                fontSize: 13, cursor: 'pointer', outline: 'none', background: '#fff',
              }}
            >
              <option value="stock-asc">Stock: Low → High</option>
              <option value="stock-desc">Stock: High → Low</option>
              <option value="name">Name A–Z</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ ...S, textAlign: 'center', padding: 50 }}>
            <RefreshCw size={30} color="#cbd5e1" style={{ margin: '0 auto' }} />
            <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 12 }}>Loading inventory…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...S, textAlign: 'center', padding: 50 }}>
            <Package size={44} color="#d1d5db" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
              No products found
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              {search ? 'Try a different search term.' : 'Adjust your filters or add products.'}
            </p>
          </div>
        ) : (
          <div style={{ ...S, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {bulkMode && (
                    <th style={{ padding: '13px 16px', width: 40 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>Product</th>
                  <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Product Status</th>
                  <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Size / Stock</th>
                  <th style={{ padding: '13px 16px', textAlign: 'center', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>Total Units</th>
                  <th style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Stock Level</th>
                  <th style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product, idx) => {
                  const total = totalVariantStock(product);
                  const lvl   = stockLevel(total);
                  const img   = primaryImg(product);
                  const isSelected = selected.has(product.id);

                  // Product status badge config
                  const PSTATUS = {
                    draft:          { label: 'Draft',        color: '#6b7280', bg: '#f3f4f6' },
                    pending_review: { label: 'Under Review', color: '#d97706', bg: '#fffbeb' },
                    approved:       { label: 'Live',         color: '#16a34a', bg: '#f0fdf4' },
                    rejected:       { label: 'Rejected',     color: '#dc2626', bg: '#fef2f2' },
                    suspended:      { label: 'Suspended',    color: '#7c3aed', bg: '#f5f3ff' },
                  };
                  const ps = PSTATUS[product.status] || PSTATUS.draft;

                  return (
                    <tr
                      key={product.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: isSelected ? '#f0f9ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      {bulkMode && (
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(product.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      {/* Product */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <div style={{
                            width: 46, height: 46, borderRadius: 8, flexShrink: 0,
                            overflow: 'hidden', background: '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {img
                              ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.target.style.display = 'none')} />
                              : <ImageOff size={18} color="#cbd5e1" />
                            }
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                              {product.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                              ID #{product.id} &nbsp;·&nbsp; ₹{Number(product.price).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Product status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                          background: ps.bg, color: ps.color,
                        }}>
                          {ps.label}
                        </span>
                      </td>
                      {/* Variants */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(product.variants || []).map(v => {
                            const vl = stockLevel(parseInt(v.stock) || 0);
                            return (
                              <span key={v.id} style={{
                                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: vl.bg, color: vl.color, border: `1px solid ${vl.border}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {v.size}: {v.stock ?? 0}
                              </span>
                            );
                          })}
                          {(product.variants || []).length === 0 && (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>No variants</span>
                          )}
                        </div>
                      </td>
                      {/* Total */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 18, fontWeight: 800, color: lvl.color,
                        }}>
                          {total}
                        </span>
                      </td>
                      {/* Level badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: lvl.bg, color: lvl.color, border: `1px solid ${lvl.border}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {lvl.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setStockModal(product)}
                            style={{
                              padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 7,
                              background: '#fff', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', color: '#374151',
                              display: 'flex', alignItems: 'center', gap: 5,
                            }}
                          >
                            <Edit2 size={12} /> Stock
                          </button>
                          <button
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                            style={{
                              padding: '7px 14px', border: 'none', borderRadius: 7,
                              background: '#0f172a', color: '#fff', fontSize: 12,
                              fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af' }}>
              Showing {filtered.length} of {products.length} product{products.length !== 1 ? 's' : ''}
              {stockFilter !== 'all' || search ? ` (filtered)` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {stockModal && (
        <StockModal
          product={stockModal}
          onClose={() => setStockModal(null)}
          onSaved={fetchProducts}
        />
      )}
      {bulkModal && (
        <BulkModal
          products={products}
          selectedIds={selected}
          onClose={() => setBulkModal(false)}
          onSaved={() => { fetchProducts(); setSelected(new Set()); setBulkMode(false); }}
        />
      )}
    </SellerLayout>
  );
}

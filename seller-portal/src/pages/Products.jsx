import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';
import {
  Plus, Edit2, Trash2, AlertCircle, Clock, CheckCircle,
  XCircle, Package, Search, MoreVertical, Send,
  BarChart3, X, RefreshCw, ImageOff,
} from 'lucide-react';

// ─── Status configuration ─────────────────────────────────────────────────────
const STATUS = {
  draft:          { label: 'Draft',          color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', icon: Edit2 },
  pending_review: { label: 'Under Review',   color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Clock },
  approved:       { label: 'Live',           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle },
  rejected:       { label: 'Rejected',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: XCircle },
  suspended:      { label: 'Suspended',      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: AlertCircle },
};

const FILTER_TABS = [
  { key: 'all',            label: 'All' },
  { key: 'draft',          label: 'Draft' },
  { key: 'pending_review', label: 'Under Review' },
  { key: 'approved',       label: 'Live' },
  { key: 'rejected',       label: 'Rejected' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const primaryImg = (product) => {
  if (!Array.isArray(product.images) || product.images.length === 0) return null;
  const primary = product.images.find(i => i.is_primary) || product.images[0];
  return primary?.image_url || null;
};

const totalStock = (product) =>
  Array.isArray(product.variants)
    ? product.variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)
    : 0;

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.draft;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, color: cfg.color,
    }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function StockBadge({ value }) {
  const color = value === 0 ? '#dc2626' : value <= 10 ? '#d97706' : '#16a34a';
  return (
    <span style={{ fontSize: 15, fontWeight: 800, color }}>{value}</span>
  );
}

function ProductImage({ src, size = 200 }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{
        width: '100%', height: size, background: '#f1f5f9',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 6,
      }}>
        <ImageOff size={28} color="#cbd5e1" />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>No image</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setErr(true)}
      style={{ width: '100%', height: size, objectFit: 'cover', display: 'block' }}
    />
  );
}

// ─── Delete / Removal modal ───────────────────────────────────────────────────
function RemoveModal({ product, onClose, onSuccess }) {
  const isLive = product.status === 'approved';
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (isLive && !reason.trim()) return;
    setBusy(true);
    try {
      if (isLive) {
        await api.post(`/seller/products/${product.id}/remove`, { reason });
        toast.success('Removal request submitted. Admin will review.');
      } else {
        await api.delete(`/seller/products/${product.id}`);
        toast.success('Product deleted.');
      }
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <ModalHeader
          title={isLive ? 'Request Removal' : 'Delete Product'}
          onClose={onClose}
        />
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
          {isLive
            ? 'This product is live. Removal requires admin approval. Please state the reason.'
            : `Delete "${product.title}"? This cannot be undone.`}
        </p>
        {isLive && (
          <textarea
            autoFocus
            placeholder="Reason for removal (required)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: 12, border: '1px solid #e5e7eb',
              borderRadius: 8, fontSize: 14, resize: 'vertical',
              marginBottom: 16, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="danger"
            onClick={confirm}
            disabled={busy || (isLive && !reason.trim())}
          >
            {busy ? 'Please wait…' : isLive ? 'Submit Request' : 'Delete'}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Stock modal ──────────────────────────────────────────────────────────────
function StockModal({ product, onClose, onSuccess }) {
  const [variants, setVariants] = useState(product.variants || []);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState(() =>
    Object.fromEntries((product.variants || []).map(v => [v.id, String(v.stock ?? 0)]))
  );

  const save = async (variantId) => {
    const val = parseInt(values[variantId]);
    if (isNaN(val) || val < 0) { toast.error('Enter a valid stock number'); return; }
    setLoading(true);
    try {
      await api.patch(`/seller/products/${product.id}/variants/${variantId}/stock`, {
        stock: val, operation: 'set',
      });
      toast.success('Stock updated');
      // Refresh variants
      const res = await api.get(`/seller/products/${product.id}`);
      const fresh = res.data.variants || [];
      setVariants(fresh);
      setValues(Object.fromEntries(fresh.map(v => [v.id, String(v.stock ?? 0)])));
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <ModalHeader title={`Stock — ${product.title}`} onClose={onClose} />
        {variants.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            No variants found.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {variants.map(v => {
              const stockVal = parseInt(values[v.id] ?? v.stock) || 0;
              const color = stockVal === 0 ? '#dc2626' : stockVal <= 10 ? '#d97706' : '#16a34a';
              return (
                <div key={v.id} style={{
                  padding: 14, border: '1px solid #e5e7eb', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Size: {v.size}</div>
                    <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>
                      Current: {v.stock ?? 0}
                    </div>
                    {v.extra_price > 0 && (
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>+₹{v.extra_price}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={values[v.id] ?? v.stock}
                      onChange={e => setValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                      style={{
                        width: 80, padding: '8px 10px', textAlign: 'center',
                        border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14,
                      }}
                    />
                    <Btn
                      variant="primary"
                      onClick={() => save(v.id)}
                      disabled={loading}
                    >
                      Set
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{
          marginTop: 14, padding: 12, background: '#f0fdf4',
          borderRadius: 8, border: '1px solid #bbf7d0',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#15803d' }}>
            Enter new quantity and press "Set" to update immediately.
          </p>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
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
        style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>{title}</h3>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
        <X size={18} color="#6b7280" />
      </button>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', disabled = false }) {
  const styles = {
    primary: { background: '#0f172a', color: '#fff', border: 'none' },
    outline:  { background: '#fff', color: '#374151', border: '1px solid #e5e7eb' },
    danger:   { background: disabled ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none' },
    ghost:    { background: 'none', color: '#374151', border: 'none' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

// ─── Action dropdown ──────────────────────────────────────────────────────────
function ActionMenu({ product, onEdit, onStock, onSubmit, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const item = (label, icon, color, action) => (
    <button
      key={label}
      onClick={() => { action(); setOpen(false); }}
      style={{
        width: '100%', padding: '9px 14px', border: 'none', background: 'none',
        textAlign: 'left', fontSize: 13, fontWeight: 600, color, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.95)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
        }}
      >
        <MoreVertical size={15} color="#374151" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 36, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 168, overflow: 'hidden',
        }}>
          {item('Edit', <Edit2 size={13} />, '#374151', onEdit)}
          {item('Manage Stock', <BarChart3 size={13} />, '#374151', onStock)}
          {['draft', 'rejected'].includes(product.status) &&
            item('Submit for Review', <Send size={13} />, '#0891b2', onSubmit)}
          <div style={{ height: 1, background: '#f3f4f6', margin: '2px 0' }} />
          {item('Remove', <Trash2 size={13} />, '#dc2626', onRemove)}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [removeModal, setRemoveModal] = useState(null);   // product to remove
  const [stockModal, setStockModal]   = useState(null);   // product for stock

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/seller/products?limit=200');
      // Accept both { data: [] } and { products: [] } shapes for safety
      const list = res.data?.data ?? res.data?.products ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      toast.error(`Failed to load products: ${msg}`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Submit for review ──────────────────────────────────────────────────────
  const submitForReview = async (productId) => {
    try {
      await api.post(`/seller/products/${productId}/submit`);
      toast.success('Submitted for review!');
      fetchProducts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit');
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const counts = {
    all: products.length,
    draft: products.filter(p => p.status === 'draft').length,
    pending_review: products.filter(p => p.status === 'pending_review').length,
    approved: products.filter(p => p.status === 'approved').length,
    rejected: products.filter(p => p.status === 'rejected').length,
  };

  const filtered = products.filter(p => {
    const okStatus = filter === 'all' || p.status === filter;
    const okSearch = !search.trim() ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).includes(search);
    return okStatus && okSearch;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 20 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>My Products</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Manage listings, stock, and review submissions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outline" onClick={fetchProducts}>
              <RefreshCw size={14} /> Refresh
            </Btn>
            <Btn variant="primary" onClick={() => navigate('/products/new')}>
              <Plus size={15} /> Add Product
            </Btn>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div style={{
          display: 'flex', gap: 0, background: '#fff',
          border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, flexWrap: 'wrap',
        }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '8px 16px', borderRadius: 7, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: filter === tab.key ? '#0f172a' : 'transparent',
                color: filter === tab.key ? '#fff' : '#6b7280',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab.label}
              <span style={{
                fontSize: 11, fontWeight: 700, minWidth: 20, height: 18,
                borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: filter === tab.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                color: filter === tab.key ? '#fff' : '#6b7280',
                padding: '0 5px',
              }}>
                {counts[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name or product ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px 11px 42px', boxSizing: 'border-box',
              border: '1px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none',
              background: '#fff',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={15} color="#9ca3af" />
            </button>
          )}
        </div>

        {/* ── Product grid ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 320, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            textAlign: 'center', padding: '60px 20px',
          }}>
            <Package size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#374151' }}>
              {search ? 'No matching products' : products.length === 0 ? 'No products yet' : `No ${filter === 'all' ? '' : filter.replace('_', ' ')} products`}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9ca3af' }}>
              {search ? 'Try a different search term' : products.length === 0 ? 'Start by adding your first product.' : 'Change the filter to see other products.'}
            </p>
            {!search && products.length === 0 && (
              <Btn variant="primary" onClick={() => navigate('/products/new')}>
                <Plus size={14} /> Add First Product
              </Btn>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 }}>
            {filtered.map(product => {
              const imgSrc = primaryImg(product);
              const stock  = totalStock(product);

              return (
                <div key={product.id} style={{
                  background: '#fff', borderRadius: 12,
                  border: '1px solid #e5e7eb', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  transition: 'box-shadow 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {/* Image */}
                  <div style={{ position: 'relative' }}>
                    <ProductImage src={imgSrc} size={200} />
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <ActionMenu
                        product={product}
                        onEdit={() => navigate(`/products/${product.id}/edit`)}
                        onStock={() => setStockModal(product)}
                        onSubmit={() => submitForReview(product.id)}
                        onRemove={() => setRemoveModal(product)}
                      />
                    </div>
                    {/* Stock pill */}
                    <div style={{
                      position: 'absolute', bottom: 10, left: 10,
                      padding: '3px 9px', borderRadius: 999,
                      background: stock === 0 ? '#fef2f2' : stock <= 10 ? '#fffbeb' : '#f0fdf4',
                      border: `1px solid ${stock === 0 ? '#fecaca' : stock <= 10 ? '#fde68a' : '#bbf7d0'}`,
                      fontSize: 11, fontWeight: 700,
                      color: stock === 0 ? '#dc2626' : stock <= 10 ? '#d97706' : '#16a34a',
                    }}>
                      {stock === 0 ? 'Out of Stock' : `Stock: ${stock}`}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <StatusBadge status={product.status} />
                    <div>
                      <h3 style={{
                        margin: 0, fontSize: 15, fontWeight: 700, color: '#111827',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {product.title}
                      </h3>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                        ID #{product.id} {product.category_name ? `• ${product.category_name}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
                          ₹{Number(product.price).toLocaleString('en-IN')}
                        </span>
                        {product.discount_percent > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
                            {product.discount_percent}% off
                          </span>
                        )}
                      </div>
                      {/* Variant sizes preview */}
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {(product.variants || []).slice(0, 4).map(v => (
                          <span key={v.id} style={{
                            padding: '2px 6px', borderRadius: 4,
                            background: '#f1f5f9', fontSize: 10, fontWeight: 600, color: '#475569',
                          }}>
                            {v.size}
                          </span>
                        ))}
                        {(product.variants || []).length > 4 && (
                          <span style={{ fontSize: 10, color: '#9ca3af', alignSelf: 'center' }}>
                            +{product.variants.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin message */}
                    {product.admin_message && (
                      <div style={{
                        padding: '8px 10px', borderRadius: 7,
                        background: '#fef2f2', border: '1px solid #fecaca',
                        display: 'flex', gap: 6, alignItems: 'flex-start',
                      }}>
                        <AlertCircle size={12} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#991b1b', lineHeight: 1.4 }}>
                          {product.admin_message}
                        </span>
                      </div>
                    )}

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                      <button
                        onClick={() => navigate(`/products/${product.id}/edit`)}
                        style={{
                          flex: 1, padding: '8px 0', border: '1px solid #e5e7eb',
                          borderRadius: 7, background: '#fff', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', color: '#374151',
                        }}
                      >
                        Edit
                      </button>
                      {['draft', 'rejected'].includes(product.status) && (
                        <button
                          onClick={() => submitForReview(product.id)}
                          style={{
                            flex: 1, padding: '8px 0', border: 'none',
                            borderRadius: 7, background: '#0f172a', fontSize: 12,
                            fontWeight: 600, cursor: 'pointer', color: '#fff',
                          }}
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary line */}
        {!loading && filtered.length > 0 && (
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            Showing {filtered.length} of {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Modals */}
      {removeModal && (
        <RemoveModal
          product={removeModal}
          onClose={() => setRemoveModal(null)}
          onSuccess={() => { setRemoveModal(null); fetchProducts(); }}
        />
      )}
      {stockModal && (
        <StockModal
          product={stockModal}
          onClose={() => setStockModal(null)}
          onSuccess={fetchProducts}
        />
      )}
    </SellerLayout>
  );
}

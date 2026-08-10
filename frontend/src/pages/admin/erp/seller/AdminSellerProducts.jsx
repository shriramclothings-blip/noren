import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, X,
  Package, ExternalLink, Tag, Truck, AlertTriangle, RefreshCw, Store } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';

const inp = { padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8,
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const btn = (bg = '#1a1a18', color = '#fff') => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  borderRadius: 8, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

const STATUS_COLORS = {
  draft:          { bg: '#f3f4f6', color: '#6b7280',  label: 'Draft' },
  pending_review: { bg: '#fef9c3', color: '#854d0e',  label: 'Pending Review' },
  approved:       { bg: '#dcfce7', color: '#15803d',  label: 'Approved – Live' },
  rejected:       { bg: '#fee2e2', color: '#b91c1c',  label: 'Rejected' },
  suspended:      { bg: '#ffedd5', color: '#c2410c',  label: 'Suspended' },
};

const SITE = import.meta.env.VITE_SITE_URL || 'https://www.norenfastion.shop';

// ── Full Product Detail Modal ─────────────────────────────────────────────────
function ProductModal({ product, onClose, onDone }) {
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [action, setAction]     = useState('approve');
  const [message, setMessage]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [statusAction, setStatusAction] = useState('');
  const [statusMsg, setStatusMsg]       = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    api.get(`/admin/sellers/products/${product.id}`)
      .then(r => { setDetail(r.data); setAction('approve'); })
      .catch(() => toast.error('Failed to load product details'))
      .finally(() => setLoading(false));
  }, [product.id]);

  const submitReview = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/sellers/products/${product.id}/review`, { action, message });
      toast.success(`Product ${action === 'approve' ? 'approved and live!' : 'rejected'}`);
      onDone();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const changeStatus = async () => {
    if (!statusAction) return;
    setStatusSaving(true);
    try {
      await api.patch(`/admin/sellers/products/${product.id}/status`, { status: statusAction, admin_message: statusMsg });
      toast.success('Product status updated');
      onDone();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setStatusSaving(false); }
  };

  const prod = detail?.product;
  const images = detail?.images || [];
  const variants = detail?.variants || [];
  const sc = STATUS_COLORS[prod?.status || product.status] || STATUS_COLORS.draft;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 860,
        padding: 0, position: 'relative', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fafafa' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
                {product.title}
              </h3>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: sc.bg, color: sc.color }}>{sc.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Store size={11} /> {product.seller_brand || product.seller_name}
              </span>
              <span>{product.seller_email}</span>
              {product.submitted_at && <span>Submitted: {new Date(product.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>}
              {prod?.platform_product_id && (
                <a href={`${SITE}/product/${prod.platform_product_id}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                  <ExternalLink size={11} /> View on Store
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0 }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {loading && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}

        {prod && (
          <div style={{ padding: '20px 24px', display: 'grid', gap: 20 }}>

            {/* Images + basic info row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
              {/* Images */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 220 }}>
                <div style={{ width: 220, height: 240, borderRadius: 12, overflow: 'hidden',
                  background: '#f8fafc', border: '1.5px solid #e5e7eb' }}>
                  {images.length > 0
                    ? <img src={images[activeImg]?.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={40} color="#d1d5db" />
                      </div>
                  }
                </div>
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {images.map((img, i) => (
                      <button key={img.id} onClick={() => setActiveImg(i)}
                        style={{ width: 44, height: 44, padding: 0, border: `2px solid ${i === activeImg ? '#c9a96e' : '#e5e7eb'}`,
                          borderRadius: 7, overflow: 'hidden', cursor: 'pointer', background: 'none', flexShrink: 0 }}>
                        <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                  {images.length} image{images.length !== 1 ? 's' : ''}
                  {images.find(i => i.is_primary) && ' · 1 primary'}
                </div>
              </div>

              {/* Core details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Price', `₹${prod.price}`],
                  ['Discount', `${prod.discount_percent || 0}%${prod.discount_percent > 0 ? ` → ₹${Math.round(prod.price * (1 - prod.discount_percent / 100))}` : ''}`],
                  ['Category', prod.category_name || '—'],
                  ['Gender', prod.gender || '—'],
                  ['Brand', prod.brand || '—'],
                  ['Fabric / Material', prod.fabric || '—'],
                  ['Shipping Days', prod.shipping_days ? `${prod.shipping_days} days` : '—'],
                  ['Commission Rate', `${prod.commission_rate || 10}%`],
                  ['Seller Brand', product.seller_brand || '—'],
                  ['Seller Email', product.seller_email],
                  ['Submitted', prod.submitted_at ? new Date(prod.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'],
                  ['Platform Product ID', prod.platform_product_id || 'Not yet live'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '9px 12px',
                    border: '1px solid #f3f4f6' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', wordBreak: 'break-word' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {prod.description && (
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: 6 }}>Description</div>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{prod.description}</p>
              </div>
            )}

            {/* Extra details row */}
            {(prod.care_instructions || prod.return_policy) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {prod.care_instructions && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #f3f4f6' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Care Instructions</div>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{prod.care_instructions}</p>
                  </div>
                )}
                {prod.return_policy && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #f3f4f6' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Return Policy</div>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{prod.return_policy}</p>
                  </div>
                )}
              </div>
            )}

            {/* Variants / Stock */}
            {variants.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                  Sizes & Stock ({variants.reduce((s, v) => s + v.stock, 0)} total units)
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {variants.map(v => (
                    <div key={v.id} style={{ padding: '8px 14px', borderRadius: 9,
                      background: v.stock === 0 ? '#fef2f2' : '#f0fdf4',
                      border: `1.5px solid ${v.stock === 0 ? '#fecaca' : '#bbf7d0'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{v.size}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: v.stock === 0 ? '#dc2626' : '#15803d' }}>
                        {v.stock} units
                      </span>
                      {v.extra_price > 0 && <span style={{ fontSize: 10, color: '#6b7280' }}>+₹{v.extra_price}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin message if any */}
            {prod.admin_message && (
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fecaca' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 3 }}>Previous Admin Message</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{prod.admin_message}</p>
                </div>
              </div>
            )}

            {/* ACTIONS */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 18, display: 'grid', gap: 14 }}>

              {/* Approve / Reject for pending */}
              {prod.status === 'pending_review' && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Review Decision</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <select value={action} onChange={e => setAction(e.target.value)} style={{ ...inp, minWidth: 130 }}>
                      <option value="approve">✓ Approve</option>
                      <option value="reject">✗ Reject</option>
                    </select>
                    <input value={message} onChange={e => setMessage(e.target.value)}
                      placeholder={action === 'approve' ? 'Optional note to seller…' : 'Rejection reason (recommended)'}
                      style={{ ...inp, flex: 1, minWidth: 220 }} />
                    <button onClick={submitReview} disabled={saving}
                      style={btn(action === 'approve' ? '#16a34a' : '#dc2626')}>
                      {action === 'approve' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                      {saving ? 'Saving…' : (action === 'approve' ? 'Approve & Go Live' : 'Reject')}
                    </button>
                  </div>
                </div>
              )}

              {/* Status override for all statuses */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                  Change Status {prod.status !== 'pending_review' && '/ Override'}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <select value={statusAction} onChange={e => setStatusAction(e.target.value)} style={{ ...inp, minWidth: 160 }}>
                    <option value="">— Select new status —</option>
                    {['pending_review','approved','rejected','suspended'].filter(s => s !== prod.status).map(s => (
                      <option key={s} value={s}>{STATUS_COLORS[s]?.label || s}</option>
                    ))}
                  </select>
                  <input value={statusMsg} onChange={e => setStatusMsg(e.target.value)}
                    placeholder="Reason / message (optional)" style={{ ...inp, flex: 1, minWidth: 200 }} />
                  <button onClick={changeStatus} disabled={statusSaving || !statusAction} style={btn('#374151')}>
                    <RefreshCw size={12} /> {statusSaving ? 'Updating…' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
      {[
        { label: 'Total Listed',   value: stats.total,        color: '#374151', bg: '#f8fafc' },
        { label: 'Pending Review', value: stats.pending_review, color: '#854d0e', bg: '#fef9c3' },
        { label: 'Live on Store',  value: stats.approved,     color: '#15803d', bg: '#dcfce7' },
        { label: 'Rejected',       value: stats.rejected,     color: '#b91c1c', bg: '#fee2e2' },
      ].map(({ label, value, color, bg }) => (
        <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color }}>{value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSellerProducts() {
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('pending_review');
  const [sellerFilter, setSellerFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const LIMIT = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search)       p.set('search', search);
      if (status)       p.set('status', status);
      if (sellerFilter) p.set('seller_id', sellerFilter);
      const r = await api.get(`/admin/sellers/products/all?${p}`);
      setProducts(r.data.products || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [page, search, status, sellerFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await api.get('/admin/sellers/stats');
      setStats(r.data?.products || null);
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [search, status, sellerFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>Seller Product Listings</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            All products listed by sellers — review, approve, reject or manage status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['table','cards'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${viewMode === m ? '#1a1a18' : '#e5e7eb'}`,
                background: viewMode === m ? '#1a1a18' : '#fff', color: viewMode === m ? '#fff' : '#6b7280',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
              {m === 'table' ? '☰ Table' : '⊞ Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search product title…" style={{ ...inp, paddingLeft: 30, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['', 'All Status'], ['pending_review', 'Pending ⏳'], ['approved', 'Live ✓'], ['rejected', 'Rejected'], ['draft', 'Draft'], ['suspended', 'Suspended']].map(([val, label]) => (
            <button key={val} onClick={() => setStatus(val)}
              style={{ padding: '7px 13px', borderRadius: 20, border: `1.5px solid ${status === val ? '#1a1a18' : '#e5e7eb'}`,
                background: status === val ? '#1a1a18' : '#fff', color: status === val ? '#fff' : '#6b7280',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>{total} products</span>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Product', 'Seller / Brand', 'Price', 'Category', 'Stock', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>
              )}
              {!loading && !products.length && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <Package size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                  No products found
                </td></tr>
              )}
              {products.map(p => {
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => setSelected(p)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
                          background: '#f3f4f6', flexShrink: 0 }}>
                          {p.primary_image
                            ? <img src={p.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#d1d5db" /></div>
                          }
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 13, maxWidth: 200,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.gender} · {p.brand || 'No brand'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>{p.seller_brand || '—'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.seller_name}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#111827', fontSize: 13 }}>₹{p.price}</div>
                      {p.discount_percent > 0 && <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>-{p.discount_percent}%</div>}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{p.category_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>—</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelected(p)} style={btn('#1a1a18')}>
                        <Eye size={11} /> Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CARD VIEW */}
      {viewMode === 'cards' && (
        loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 300, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }} />)}
            </div>
          : !products.length
            ? <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                <Package size={40} color="#d1d5db" style={{ margin: '0 auto 14px', display: 'block' }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>No products found</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                {products.map(p => {
                  const sc = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
                  return (
                    <div key={p.id} style={{ background: '#fff', border: `1.5px solid ${p.status === 'pending_review' ? '#fde68a' : p.status === 'approved' ? '#bbf7d0' : '#e5e7eb'}`,
                      borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                      onClick={() => setSelected(p)}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ height: 150, background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                        {p.primary_image
                          ? <img src={p.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={32} color="#d1d5db" /></div>
                        }
                        <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 999,
                          fontSize: 9, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{p.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>₹{p.price}</span>
                          {p.discount_percent > 0 && <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>-{p.discount_percent}%</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 5, background: '#1a1a18',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Store size={11} color="#c9a96e" />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{p.seller_brand || p.seller_name}</div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.seller_email}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>
                          {p.category_name && <span>{p.category_name} · </span>}
                          {p.gender}
                          {p.submitted_at && <span> · {new Date(p.submitted_at).toLocaleDateString('en-IN')}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={btn('#f3f4f6','#374151')}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={btn('#f3f4f6','#374151')}><ChevronRight size={14} /></button>
        </div>
      )}

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); fetchProducts(); fetchStats(); }} />
      )}
    </div>
  );
}

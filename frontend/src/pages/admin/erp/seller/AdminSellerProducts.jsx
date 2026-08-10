import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';

const inp = { padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const btn = (bg = '#1a1a18', color = '#fff') => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

const STATUS_COLORS = {
  draft:          { bg: '#f3f4f6', color: '#6b7280' },
  pending_review: { bg: '#fef9c3', color: '#854d0e' },
  approved:       { bg: '#dcfce7', color: '#15803d' },
  rejected:       { bg: '#fee2e2', color: '#b91c1c' },
  suspended:      { bg: '#ffedd5', color: '#c2410c' },
};

function ProductModal({ product, onClose, onDone }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('approve');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/admin/sellers/products/${product.id}`)
      .then(r => setDetail(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [product.id]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/sellers/products/${product.id}/review`, { action, message });
      toast.success(`Product ${action}d`);
      onDone();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, padding: 28, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
        <h3 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: '#111827' }}>{product.title}</h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7280' }}>
          by {product.seller_brand || product.seller_name} · {product.seller_email}
        </p>

        {loading && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Loading…</div>}
        {detail && (
          <>
            {/* Images */}
            {detail.images.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto' }}>
                {detail.images.map(img => (
                  <img key={img.id} src={img.image_url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: img.is_primary ? '2px solid #c9a96e' : '1.5px solid #e5e7eb' }} />
                ))}
              </div>
            )}

            {/* Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[
                ['Price', `₹${detail.product.price}`],
                ['Discount', `${detail.product.discount_percent || 0}%`],
                ['Category', detail.product.category_name || '—'],
                ['Gender', detail.product.gender || '—'],
                ['Brand', detail.product.brand || '—'],
                ['Fabric', detail.product.fabric || '—'],
                ['Shipping Days', detail.product.shipping_days || '—'],
                ['Commission', `${detail.product.commission_rate || 10}%`],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {detail.product.description && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{detail.product.description}</p>
              </div>
            )}

            {/* Variants */}
            {detail.variants.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 }}>Variants / Stock</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detail.variants.map(v => (
                    <div key={v.id} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                      {v.size} · {v.stock} units{v.extra_price > 0 ? ` · +₹${v.extra_price}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Review action */}
        {product.status === 'pending_review' && (
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <select value={action} onChange={e => setAction(e.target.value)} style={{ ...inp, minWidth: 120 }}>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
            <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message to seller (optional)" style={{ ...inp, flex: 1, minWidth: 200 }} />
            <button onClick={submit} disabled={saving} style={btn(action === 'approve' ? '#16a34a' : '#dc2626')}>
              {action === 'approve' ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {saving ? 'Saving…' : (action === 'approve' ? 'Approve & Go Live' : 'Reject')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSellerProducts() {
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('pending_review');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const LIMIT = 20;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search) p.set('search', search);
      if (status) p.set('status', status);
      const r = await api.get(`/admin/sellers/products/all?${p}`);
      setProducts(r.data.products || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" style={{ ...inp, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inp, minWidth: 160 }}>
          <option value="">All</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
          <option value="suspended">Suspended</option>
        </select>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{total} products</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['Product', 'Seller', 'Price', 'Category', 'Status', 'Submitted', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>}
            {!loading && !products.length && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No products found</td></tr>}
            {products.map(p => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.primary_image && <img src={p.primary_image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#374151' }}>{p.seller_brand || p.seller_name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.seller_email}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>₹{p.price}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{p.category_name || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{p.status.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>
                    {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => setSelected(p)} style={btn('#1a1a18')}><Eye size={12} />Review</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btn('#f3f4f6', '#374151')}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btn('#f3f4f6', '#374151')}><ChevronRight size={14} /></button>
        </div>
      )}

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); fetch(); }} />}
    </div>
  );
}

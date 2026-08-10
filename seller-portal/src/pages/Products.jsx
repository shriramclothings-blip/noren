import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Send, ChevronLeft, ChevronRight, Package, Eye, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';

const STATUS_COLORS = {
  draft:          { bg: '#f3f4f6', color: '#6b7280',  label: 'Draft' },
  pending_review: { bg: '#fef9c3', color: '#854d0e',  label: 'Under Review' },
  approved:       { bg: '#dcfce7', color: '#15803d',  label: 'Live ✓' },
  rejected:       { bg: '#fee2e2', color: '#b91c1c',  label: 'Rejected' },
  suspended:      { bg: '#ffedd5', color: '#c2410c',  label: 'Suspended' },
};

const SITE = import.meta.env.VITE_SITE_URL || 'https://www.norenfastion.shop';
const btn = (bg = '#0f172a', color = '#fff') => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, border: 'none', background: bg, color, fontSize: 11, fontWeight: 600, cursor: 'pointer' });
const inp = { padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

export default function Products() {
  const navigate  = useNavigate();
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const LIMIT = 15;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search) p.set('search', search);
      if (status) p.set('status', status);
      const r = await api.get(`/seller/products?${p}`);
      setProducts(r.data.products || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search, status]);

  const submitForReview = async (id) => {
    try {
      await api.post(`/seller/products/${id}/submit`);
      toast.success('Submitted for review!');
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteProduct = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/seller/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Stats bar
  const statusCounts = products.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>My Products</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{total} products total</p>
          </div>
          <button onClick={() => navigate('/products/new')} style={{ ...btn(), padding: '10px 18px', fontSize: 13 }}>
            <Plus size={14} /> Add Product
          </button>
        </div>

        {/* Quick status pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['', 'All'], ...Object.entries(STATUS_COLORS).map(([k, v]) => [k, v.label])].map(([key, label]) => (
            <button key={key} onClick={() => setStatus(key)}
              style={{ padding: '5px 14px', borderRadius: 999, border: `1.5px solid ${status === key ? '#0f172a' : '#e5e7eb'}`, background: status === key ? '#0f172a' : '#fff', color: status === key ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 340 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
            style={{ ...inp, paddingLeft: 30, width: '100%', boxSizing: 'border-box' }} />
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 280, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }} />)}
          </div>
        ) : !products.length ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
            <Package size={40} color="#d1d5db" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>No products {status ? `with status "${STATUS_COLORS[status]?.label}"` : 'yet'}</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
              {!status ? 'Add your first product listing to get started.' : 'Try a different filter.'}
            </p>
            {!status && <button onClick={() => navigate('/products/new')} style={{ ...btn(), padding: '10px 20px', fontSize: 13 }}><Plus size={14} /> Add Your First Product</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
            {products.map(p => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
              const primaryImg = Array.isArray(p.images) ? p.images.find(i => i.is_primary)?.image_url || p.images[0]?.image_url : null;
              const canEdit   = !['pending_review', 'suspended'].includes(p.status);
              const canDelete = !['approved', 'pending_review'].includes(p.status);
              const canSubmit = ['draft', 'rejected'].includes(p.status);
              const isLive    = p.status === 'approved';

              return (
                <div key={p.id} style={{ background: '#fff', border: `1.5px solid ${isLive ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

                  {/* Image */}
                  <div style={{ height: 155, background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                    {primaryImg
                      ? <img src={primaryImg} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={30} color="#d1d5db" /></div>
                    }
                    {/* Status badge */}
                    <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    {/* Live link */}
                    {isLive && p.platform_product_id && (
                      <a href={`${SITE}/product/${p.platform_product_id}`} target="_blank" rel="noreferrer"
                        style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="View on NOREN store">
                        <ExternalLink size={13} color="#374151" />
                      </a>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.title}>{p.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>₹{p.price}</span>
                      {p.discount_percent > 0 && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>-{p.discount_percent}%</span>}
                    </div>
                    {p.category_name && <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.category_name} · {p.gender}</div>}

                    {/* Admin rejection message */}
                    {p.status === 'rejected' && p.admin_message && (
                      <div style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', padding: '5px 8px', borderRadius: 6, marginTop: 2 }}>
                        ❌ {p.admin_message}
                      </div>
                    )}

                    {/* Pending message */}
                    {p.status === 'pending_review' && (
                      <div style={{ fontSize: 11, color: '#854d0e', background: '#fef9c3', padding: '5px 8px', borderRadius: 6, marginTop: 2 }}>
                        ⏳ Awaiting admin review…
                      </div>
                    )}

                    {/* Suspended message */}
                    {p.status === 'suspended' && (
                      <div style={{ fontSize: 11, color: '#c2410c', background: '#ffedd5', padding: '5px 8px', borderRadius: 6, marginTop: 2 }}>
                        ⚠️ Suspended — contact support.
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '0 10px 10px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {canEdit && (
                      <button onClick={() => navigate(`/products/${p.id}/edit`)} style={btn('#f3f4f6', '#374151')}>
                        <Edit2 size={11} /> Edit
                      </button>
                    )}
                    {canSubmit && (
                      <button onClick={() => submitForReview(p.id)} style={btn('#0f172a')}>
                        <Send size={11} /> Submit
                      </button>
                    )}
                    {isLive && (
                      <button onClick={() => navigate(`/products/${p.id}/edit`)} style={btn('#eff6ff', '#1d4ed8')} title="Edit and resubmit for review">
                        <Edit2 size={11} /> Edit & Resubmit
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => deleteProduct(p.id, p.title)} style={btn('#fef2f2', '#dc2626')}>
                        <Trash2 size={11} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btn('#f3f4f6', '#374151')}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btn('#f3f4f6', '#374151')}><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}

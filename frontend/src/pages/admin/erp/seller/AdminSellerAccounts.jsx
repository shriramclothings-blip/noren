import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';

const inp = { padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const btn = (bg = '#1a1a18', color = '#fff') => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

const STATUS_COLORS = {
  active:    { bg: '#dcfce7', color: '#15803d' },
  pending:   { bg: '#fef9c3', color: '#854d0e' },
  suspended: { bg: '#fee2e2', color: '#b91c1c' },
  rejected:  { bg: '#f3f4f6', color: '#6b7280' },
  banned:    { bg: '#450a0a', color: '#fca5a5' },
};
const KYC_COLORS = {
  pending:   { bg: '#fef9c3', color: '#854d0e' },
  submitted: { bg: '#dbeafe', color: '#1d4ed8' },
  approved:  { bg: '#dcfce7', color: '#15803d' },
  rejected:  { bg: '#fee2e2', color: '#b91c1c' },
};

function Badge({ label, colors }) {
  return <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: colors?.bg || '#f3f4f6', color: colors?.color || '#374151' }}>{label}</span>;
}

function DetailModal({ seller, extra, onClose, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: seller.status, reason: '' });

  const update = async () => {
    setLoading(true);
    try {
      await api.patch(`/admin/sellers/${seller.id}/status`, statusForm);
      toast.success('Status updated');
      onStatusChange();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, padding: 28, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111827' }}>{seller.brand_name || seller.name}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>{seller.email} • {seller.phone || 'No phone'}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            ['Status', <Badge label={seller.status} colors={STATUS_COLORS[seller.status]} />],
            ['KYC', <Badge label={seller.kyc_status} colors={KYC_COLORS[seller.kyc_status]} />],
            ['Business Type', seller.business_type || '—'],
            ['GST', seller.gst_number || '—'],
            ['City', seller.pickup_city || '—'],
            ['Commission', seller.commission_rate ? `${seller.commission_rate}%` : '10%'],
            ['Products', extra?.products?.total ?? '—'],
            ['Orders', extra?.orders?.orders ?? '—'],
            ['Revenue', extra?.orders?.revenue ? `₹${Number(extra.orders.revenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* KYC docs */}
        {(seller.doc_gst_url || seller.doc_pan_url || seller.doc_bank_url || seller.doc_address_url) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>KYC Documents</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['GST', seller.doc_gst_url], ['PAN', seller.doc_pan_url], ['Bank', seller.doc_bank_url], ['Address', seller.doc_address_url]].map(([label, url]) =>
                url ? <a key={label} href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: '1px solid #6366f1', color: '#6366f1', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}><ExternalLink size={12} />{label}</a> : null
              )}
            </div>
          </div>
        )}

        {/* Status update */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Update Status</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <select value={statusForm.status} onChange={e => setStatusForm(p => ({ ...p, status: e.target.value }))}
              style={{ ...inp, minWidth: 140 }}>
              {['pending','active','suspended','rejected','banned'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={statusForm.reason} onChange={e => setStatusForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Reason (optional)" style={{ ...inp, flex: 1, minWidth: 180 }} />
            <button onClick={update} disabled={loading} style={btn('#1a1a18')}>
              {loading ? 'Saving…' : 'Update'}
            </button>
          </div>
          {seller.kyc_status === 'submitted' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => { api.patch(`/admin/sellers/${seller.id}/kyc`, { action: 'approve' }).then(() => { toast.success('KYC Approved'); onStatusChange(); }).catch(() => toast.error('Failed')); }}
                style={btn('#16a34a')}><CheckCircle size={13} />Approve KYC</button>
              <button onClick={() => { const r = prompt('Rejection reason:'); if (r !== null) api.patch(`/admin/sellers/${seller.id}/kyc`, { action: 'reject', reason: r }).then(() => { toast.success('KYC Rejected'); onStatusChange(); }).catch(() => toast.error('Failed')); }}
                style={btn('#dc2626')}><XCircle size={13} />Reject KYC</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSellerAccounts() {
  const [sellers, setSellers] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [kyc, setKyc]         = useState('');
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);
  const [sellerExtra, setSellerExtra] = useState(null);
  const LIMIT = 20;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search) p.set('search', search);
      if (status) p.set('status', status);
      if (kyc)    p.set('kyc', kyc);
      const r = await api.get(`/admin/sellers?${p}`);
      setSellers(r.data.sellers || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load sellers'); }
    finally { setLoading(false); }
  }, [page, search, status, kyc]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, status, kyc]);

  const openDetail = async (seller) => {
    setSelected(seller);
    try {
      const r = await api.get(`/admin/sellers/${seller.id}`);
      setSellerExtra(r.data);
    } catch {}
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sellers…" style={{ ...inp, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inp, minWidth: 130 }}>
          <option value="">All Status</option>
          {['pending','active','suspended','rejected','banned'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={kyc} onChange={e => setKyc(e.target.value)} style={{ ...inp, minWidth: 130 }}>
          <option value="">All KYC</option>
          {['pending','submitted','approved','rejected'].map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>{total} sellers</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['Seller', 'Brand', 'Status', 'KYC', 'Products', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>}
            {!loading && !sellers.length && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No sellers found</td></tr>}
            {sellers.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.email}</div>
                </td>
                <td style={{ padding: '10px 14px', color: '#374151' }}>{s.brand_name || '—'}</td>
                <td style={{ padding: '10px 14px' }}><Badge label={s.status} colors={STATUS_COLORS[s.status]} /></td>
                <td style={{ padding: '10px 14px' }}><Badge label={s.kyc_status} colors={KYC_COLORS[s.kyc_status]} /></td>
                <td style={{ padding: '10px 14px', color: '#374151' }}>{s.total_products}</td>
                <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => openDetail(s)} style={btn('#1a1a18')}><Eye size={12} />View</button>
                </td>
              </tr>
            ))}
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

      {selected && (
        <DetailModal seller={selected} extra={sellerExtra} onClose={() => { setSelected(null); setSellerExtra(null); }}
          onStatusChange={() => { setSelected(null); setSellerExtra(null); fetch(); }} />
      )}
    </div>
  );
}

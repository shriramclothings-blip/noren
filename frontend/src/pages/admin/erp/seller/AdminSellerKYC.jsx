import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ExternalLink, CheckCircle, XCircle, X } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';

const inp = { padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const btn = (bg = '#1a1a18', color = '#fff') => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

function KYCModal({ seller, onClose, onDone }) {
  const [action, setAction] = useState('approve');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.patch(`/admin/sellers/${seller.id}/kyc`, { action, reason });
      toast.success(`KYC ${action}d`);
      onDone();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, padding: 28, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111827' }}>Review KYC</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>{seller.brand_name || seller.name} · {seller.email}</p>

        {/* Documents */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Submitted Documents</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['GST Certificate', seller.doc_gst_url], ['PAN Card', seller.doc_pan_url], ['Bank Statement', seller.doc_bank_url], ['Address Proof', seller.doc_address_url]].map(([label, url]) => (
              <div key={label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</span>
                {url
                  ? <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6366f1', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}><ExternalLink size={12} />View</a>
                  : <span style={{ fontSize: 11, color: '#9ca3af' }}>Not uploaded</span>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Profile info */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
            {[['GST No.', seller.gst_number], ['PAN No.', seller.pan_number], ['Bank', seller.bank_name], ['IFSC', seller.bank_ifsc], ['Account No.', seller.bank_account_number], ['Account Name', seller.bank_account_name]].map(([k, v]) => (
              <div key={k}><span style={{ color: '#9ca3af', fontWeight: 600 }}>{k}: </span><span style={{ color: '#111827', fontWeight: 600 }}>{v || '—'}</span></div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <select value={action} onChange={e => setAction(e.target.value)} style={{ ...inp, minWidth: 120 }}>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
          {action === 'reject' && (
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Rejection reason (required)" style={{ ...inp, flex: 1 }} />
          )}
          <button onClick={submit} disabled={loading || (action === 'reject' && !reason)} style={btn(action === 'approve' ? '#16a34a' : '#dc2626')}>
            {action === 'approve' ? <CheckCircle size={13} /> : <XCircle size={13} />}
            {loading ? 'Saving…' : (action === 'approve' ? 'Approve KYC' : 'Reject KYC')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSellerKYC() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('submitted');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/sellers?limit=50&kyc=${filter}`);
      setSellers(r.data.sellers || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>KYC Review</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Review and verify seller KYC documents.</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
          <option value="submitted">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Not Submitted</option>
        </select>
      </div>

      {loading && <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>}
      {!loading && !sellers.length && (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <ShieldCheck size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          No KYC documents to review
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {sellers.map(s => (
          <div key={s.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{s.brand_name || s.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{s.email}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                Submitted: {s.kyc_submitted_at ? new Date(s.kyc_submitted_at).toLocaleDateString('en-IN') : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['GST', s.doc_gst_url], ['PAN', s.doc_pan_url], ['Bank', s.doc_bank_url], ['Address', s.doc_address_url]].map(([label, url]) =>
                url ? <a key={label} href={url} target="_blank" rel="noreferrer"
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #6366f1', color: '#6366f1', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>{label}</a> : null
              )}
            </div>
            {s.kyc_status === 'submitted' && (
              <button onClick={() => setSelected(s)} style={btn('#1a1a18')}><ShieldCheck size={12} />Review</button>
            )}
            {s.kyc_status !== 'submitted' && (
              <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.kyc_status === 'approved' ? '#dcfce7' : '#fee2e2', color: s.kyc_status === 'approved' ? '#15803d' : '#b91c1c' }}>
                {s.kyc_status}
              </span>
            )}
          </div>
        ))}
      </div>

      {selected && <KYCModal seller={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); fetch(); }} />}
    </div>
  );
}

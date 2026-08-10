import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, CheckCircle, X } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' };
const btn = (bg = '#1a1a18', color = '#fff') => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

const STATUS_COLORS = {
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  approved:   { bg: '#dbeafe', color: '#1d4ed8' },
  processing: { bg: '#ede9fe', color: '#6d28d9' },
  paid:       { bg: '#dcfce7', color: '#15803d' },
  failed:     { bg: '#fee2e2', color: '#b91c1c' },
  cancelled:  { bg: '#f3f4f6', color: '#6b7280' },
};

function CreateModal({ onClose, onDone }) {
  const [sellers, setSellers] = useState([]);
  const [form, setForm] = useState({ seller_id: '', net_amount: '', payment_method: 'bank_transfer', transaction_ref: '', period_start: '', period_end: '', admin_notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/sellers?limit=100&status=active').then(r => setSellers(r.data.sellers || [])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.seller_id || !form.net_amount) return toast.error('Seller and amount required');
    setSaving(true);
    try {
      await api.post('/admin/sellers/payouts', form);
      toast.success('Payout created');
      onDone();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, padding: 28, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
        <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 800, color: '#111827' }}>Create Payout</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Seller *</label>
            <select value={form.seller_id} onChange={e => setForm(p => ({ ...p, seller_id: e.target.value }))} style={inp}>
              <option value="">Select seller…</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.brand_name || s.name} ({s.email})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Net Amount (₹) *</label>
            <input type="number" min="0" value={form.net_amount} onChange={e => setForm(p => ({ ...p, net_amount: e.target.value }))} placeholder="0.00" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Period Start</label>
              <input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Period End</label>
              <input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Payment Method</label>
            <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))} style={inp}>
              {['bank_transfer','upi','cheque','cash','neft','rtgs'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Transaction Reference</label>
            <input value={form.transaction_ref} onChange={e => setForm(p => ({ ...p, transaction_ref: e.target.value }))} placeholder="UTR / Ref no." style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Admin Notes</label>
            <textarea value={form.admin_notes} onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button onClick={submit} disabled={saving} style={{ ...btn('#1a1a18'), flex: 1, justifyContent: 'center' }}>
            {saving ? 'Creating…' : 'Create Payout'}
          </button>
          <button onClick={onClose} style={btn('#f3f4f6', '#374151')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSellerPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/sellers/payouts?limit=50');
      setPayouts(r.data.payouts || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load payouts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id, status) => {
    const ref = status === 'paid' ? prompt('Transaction reference (UTR/ref):') : null;
    if (status === 'paid' && ref === null) return; // cancelled
    try {
      await api.patch(`/admin/sellers/payouts/${id}/status`, { status, transaction_ref: ref || undefined });
      toast.success(`Payout marked as ${status}`);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>Seller Payouts</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{total} total payouts</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btn('#1a1a18')}><Plus size={14} />Create Payout</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['Seller', 'Amount', 'Period', 'Method', 'Ref', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>}
            {!loading && !payouts.length && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No payouts yet</td></tr>}
            {payouts.map(p => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{p.seller_brand || p.seller_name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.seller_email}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#111827' }}>₹{Number(p.net_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>
                    {p.period_start && p.period_end ? `${p.period_start} → ${p.period_end}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{p.payment_method || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.transaction_ref || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.status === 'pending'    && <button onClick={() => updateStatus(p.id, 'approved')} style={btn('#2563eb', '#fff')}>Approve</button>}
                      {p.status === 'approved'   && <button onClick={() => updateStatus(p.id, 'paid')}    style={btn('#16a34a')}><CheckCircle size={11} />Mark Paid</button>}
                      {['pending','approved'].includes(p.status) && <button onClick={() => updateStatus(p.id, 'cancelled')} style={btn('#f3f4f6', '#374151')}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); fetch(); }} />}
    </div>
  );
}

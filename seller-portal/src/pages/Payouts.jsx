import { useState, useEffect, useCallback } from 'react';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';

const STATUS_COLORS = {
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  approved:   { bg: '#dbeafe', color: '#1d4ed8' },
  processing: { bg: '#ede9fe', color: '#6d28d9' },
  paid:       { bg: '#dcfce7', color: '#15803d' },
  failed:     { bg: '#fee2e2', color: '#b91c1c' },
  cancelled:  { bg: '#f3f4f6', color: '#6b7280' },
};

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/seller/payouts');
      setPayouts(r.data || []);
    } catch { toast.error('Failed to load payouts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const total = payouts.reduce((s, p) => s + Number(p.net_amount), 0);
  const paid  = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.net_amount), 0);
  const pending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.net_amount), 0);

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Payouts</h1>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { label: 'Total Earned', value: `₹${total.toLocaleString('en-IN',{maximumFractionDigits:2})}`, color: '#0891b2', bg: '#ecfeff' },
            { label: 'Paid Out', value: `₹${paid.toLocaleString('en-IN',{maximumFractionDigits:2})}`, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Pending', value: `₹${pending.toLocaleString('en-IN',{maximumFractionDigits:2})}`, color: '#d97706', bg: '#fffbeb' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, background: bg, display: 'inline-block', padding: '2px 10px', borderRadius: 6 }}>{value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</div>
        ) : !payouts.length ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
            <Wallet size={40} color="#d1d5db" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>No payouts yet</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Payouts are initiated by NOREN admin after order settlements.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['Date', 'Amount', 'Period', 'Method', 'Reference', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => {
                  const sc = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#111827' }}>₹{Number(p.net_amount).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>
                        {p.period_start && p.period_end ? `${p.period_start} – ${p.period_end}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{p.payment_method || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.transaction_ref || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{p.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#6b7280', border: '1px solid #e5e7eb' }}>
          💡 Payouts are processed by NOREN after order delivery confirmation and settlement period. Contact support for queries.
        </div>
      </div>
    </SellerLayout>
  );
}

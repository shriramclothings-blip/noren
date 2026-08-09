import { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle, XCircle, ArrowDownCircle } from 'lucide-react';
import api from '../../../utils/api';

const STATUS_COLORS = { pending:'#fef9c3', approved:'#dbeafe', processing:'#e0f2fe', paid:'#dcfce7', failed:'#fee2e2', cancelled:'#f3f4f6' };
const STATUS_TEXT   = { pending:'#854d0e', approved:'#1d4ed8', processing:'#0369a1', paid:'#15803d', failed:'#b91c1c', cancelled:'#9ca3af' };

const StatusIcon = ({ s }) => {
  const props = { size:16, style:{ flexShrink:0 } };
  if (s === 'paid')       return <CheckCircle {...props} color="#15803d" />;
  if (s === 'failed')     return <XCircle     {...props} color="#b91c1c" />;
  if (s === 'processing') return <ArrowDownCircle {...props} color="#0369a1" />;
  return <Clock {...props} color="#854d0e" />;
};

export default function InfluencerPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState({ pending:0, paid:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/influencer/me/payouts'),
      api.get('/influencer/me/dashboard?range=90d'),
    ]).then(([payR, dashR]) => {
      const pays = payR.data.payouts || [];
      setPayouts(pays);
      setSummary({
        pending: Number(dashR.data?.pending_payout || 0),
        paid:    Number(dashR.data?.paid_payout    || 0),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Payouts</h2>
        <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Your payment history and pending payouts</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ background:'#fffbf5', border:'1px solid #fde68a', borderRadius:14, padding:'16px 20px' }}>
          <div style={{ fontSize:11, color:'#92400e', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Pending Payout</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#92400e' }}>{fmtINR(summary.pending)}</div>
          <div style={{ fontSize:11, color:'#a16207', marginTop:4 }}>Awaiting admin approval</div>
        </div>
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:14, padding:'16px 20px' }}>
          <div style={{ fontSize:11, color:'#15803d', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Total Paid Out</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#15803d' }}>{fmtINR(summary.paid)}</div>
          <div style={{ fontSize:11, color:'#16a34a', marginTop:4 }}>Lifetime payments received</div>
        </div>
      </div>

      {/* Payout history */}
      <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#111827' }}>Payout History</div>
        </div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Loading…</div>
        ) : payouts.length === 0 ? (
          <div style={{ padding:64, textAlign:'center' }}>
            <Wallet size={36} color="#e5e7eb" style={{ margin:'0 auto 12px', display:'block' }} />
            <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:4 }}>No payouts yet</div>
            <div style={{ fontSize:13, color:'#9ca3af' }}>Payouts are created by the admin once your commissions are approved</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column' }}>
            {payouts.map(p => (
              <div key={p.id} style={{ padding:'16px 20px', borderBottom:'1px solid #f9fafb', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <StatusIcon s={p.status} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{fmtINR(p.final_amount)}</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, background:STATUS_COLORS[p.status]||'#f3f4f6', color:STATUS_TEXT[p.status]||'#374151' }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:3 }}>
                    {p.conversion_count} conversions · {p.payment_method?.toUpperCase() || '—'}
                    {p.period_start && ` · ${fmtDate(p.period_start)} → ${fmtDate(p.period_end)}`}
                  </div>
                  {p.transaction_ref && (
                    <div style={{ fontSize:11, color:'#6b7280', marginTop:2, fontFamily:'monospace' }}>TXN: {p.transaction_ref}</div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>Created: {fmtDate(p.created_at)}</div>
                  {p.paid_at && <div style={{ fontSize:11, color:'#15803d', marginTop:2 }}>Paid: {fmtDate(p.paid_at)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px 18px', fontSize:12, color:'#6b7280' }}>
        <strong style={{ color:'#374151' }}>Payout Process:</strong> Once your approved commissions reach the payout threshold, the admin creates a payout. After approval, it is processed via your registered payment method.
        For any queries, contact your account manager.
      </div>
    </div>
  );
}

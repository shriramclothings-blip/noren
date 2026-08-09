import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../../../utils/api';

const STATUS_COLORS = { pending:'#fef9c3', under_review:'#e0f2fe', approved:'#dcfce7', rejected:'#fee2e2', cancelled:'#f3f4f6', reversed:'#f3f4f6', paid:'#dbeafe' };
const STATUS_TEXT   = { pending:'#854d0e', under_review:'#0369a1', approved:'#15803d', rejected:'#b91c1c', cancelled:'#9ca3af', reversed:'#9ca3af', paid:'#1d4ed8' };

function Stat({ label, value, color='#111827', bg='#fff' }) {
  return (
    <div style={{ background:bg, border:'1px solid #f3f4f6', borderRadius:12, padding:'14px 18px' }}>
      <div style={{ fontSize:10, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color }}>{value}</div>
    </div>
  );
}

export default function InfluencerEarnings() {
  const [convs, setConvs]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/influencer/me/conversions?limit=50'),
      api.get('/influencer/me/dashboard?range=90d'),
    ]).then(([convR, dashR]) => {
      setConvs(convR.data.conversions || []);
      setSummary(dashR.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'#9ca3af' }}>Loading earnings…</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Earnings</h2>
        <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Your commission earnings and payment status</p>
      </div>

      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
          <Stat label="Total Commission"    value={fmtINR(summary.total_commission)}    color='#c9a96e'  />
          <Stat label="Pending"             value={fmtINR(summary.pending_commission)}  color='#854d0e'  bg='#fffbf5' />
          <Stat label="Approved"            value={fmtINR(summary.approved_commission)} color='#15803d'  bg='#f0fdf4' />
          <Stat label="Paid Commission"     value={fmtINR(summary.paid_commission)}     color='#1d4ed8'  bg='#eff6ff' />
          <Stat label="Total Revenue Driven" value={fmtINR(summary.total_revenue)}      color='#059669'  />
          <Stat label="Total Conversions"   value={Number(summary.total_conversions||0).toLocaleString('en-IN')} />
        </div>
      )}

      {/* Commission breakdown */}
      <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#111827' }}>Commission History</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>All conversions from your links (last 50)</div>
        </div>
        <div style={{ overflowX:'auto' }}>
          {convs.length === 0 ? (
            <div style={{ padding:48, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No commission records yet</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['Order','Order Value','Commission','Rate','Status','Date'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convs.map(c => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'11px 16px', fontWeight:700, color:'#111827', fontFamily:'monospace', fontSize:12 }}>#{c.order_ref}</td>
                    <td style={{ padding:'11px 16px' }}>{fmtINR(c.order_total)}</td>
                    <td style={{ padding:'11px 16px', fontWeight:800, color:'#c9a96e', fontSize:14 }}>{fmtINR(c.commission_amount)}</td>
                    <td style={{ padding:'11px 16px', color:'#6b7280', fontSize:12 }}>{c.commission_type==='percentage'?`${c.commission_rate}%`:`₹${c.commission_rate}`}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:STATUS_COLORS[c.status]||'#f3f4f6', color:STATUS_TEXT[c.status]||'#374151' }}>
                        {c.status?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding:'11px 16px', color:'#9ca3af', fontSize:12 }}>{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* How commissions work */}
      <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:'16px 20px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:10 }}>How Commission Works</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:12, color:'#6b7280' }}>
          {[['🛒 Order Placed → Pending','When someone orders through your link, commission is marked Pending'],['🔍 Review Period → Under Review','Orders are reviewed for validity (returns, fraud checks)'],['✅ Approved','Commission is approved and added to your next payout'],['💳 Paid','Commission is included in a payout and transferred to you']].map(([title,desc]) => (
            <div key={title} style={{ display:'flex', gap:10 }}>
              <span style={{ fontWeight:700, color:'#374151', flexShrink:0 }}>{title}</span>
              <span>— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

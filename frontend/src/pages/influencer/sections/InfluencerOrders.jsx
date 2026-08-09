import { useState, useEffect } from 'react';
import { ShoppingBag, Filter } from 'lucide-react';
import api from '../../../utils/api';

const STATUS_COLORS = { pending:'#fef9c3', under_review:'#e0f2fe', approved:'#dcfce7', rejected:'#fee2e2', cancelled:'#f3f4f6', reversed:'#f3f4f6', paid:'#dbeafe' };
const STATUS_TEXT   = { pending:'#854d0e', under_review:'#0369a1', approved:'#15803d', rejected:'#b91c1c', cancelled:'#9ca3af', reversed:'#9ca3af', paid:'#1d4ed8' };

export default function InfluencerOrders() {
  const [convs, setConvs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const p = status ? `?status=${status}` : '';
    api.get(`/influencer/me/conversions${p}`)
      .then(r => setConvs(r.data.conversions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Conversions</h2>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Orders attributed to your links</p>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding:'8px 12px', fontSize:12, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', background:'#fff', color:'#374151' }}>
          <option value="">All Status</option>
          {['pending','under_review','approved','rejected','reversed','paid'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {/* Info banner */}
      <div style={{ background:'#fffbf5', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#92400e' }}>
        <strong>ℹ Commission Status:</strong> Commissions are <em>Pending</em> after order. They become <em>Approved</em> after review (typically 7 days). <em>Paid</em> means included in a payout.
      </div>

      <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          {loading ? (
            <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Loading conversions…</div>
          ) : convs.length === 0 ? (
            <div style={{ padding:64, textAlign:'center' }}>
              <ShoppingBag size={36} color="#e5e7eb" style={{ margin:'0 auto 12px', display:'block' }} />
              <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:4 }}>No conversions yet</div>
              <div style={{ fontSize:13, color:'#9ca3af' }}>Share your links to start earning commissions</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['Order ID','Campaign','Order Value','Commission','Rate','Status','Date'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convs.map(c => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'12px 16px', fontWeight:700, color:'#111827', fontFamily:'monospace', fontSize:12 }}>#{c.order_ref}</td>
                    <td style={{ padding:'12px 16px', color:'#6b7280', fontSize:12 }}>{c.campaign_name || '—'}</td>
                    <td style={{ padding:'12px 16px', fontWeight:600 }}>{fmtINR(c.order_total)}</td>
                    <td style={{ padding:'12px 16px', fontWeight:800, color:'#c9a96e', fontSize:14 }}>{fmtINR(c.commission_amount)}</td>
                    <td style={{ padding:'12px 16px', color:'#6b7280' }}>
                      {c.commission_type==='percentage' ? `${c.commission_rate}%` : `₹${c.commission_rate} fixed`}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:STATUS_COLORS[c.status]||'#f3f4f6', color:STATUS_TEXT[c.status]||'#374151', textTransform:'capitalize' }}>
                        {c.status?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#9ca3af', fontSize:12 }}>{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

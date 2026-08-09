import { useState, useEffect } from 'react';
import { TrendingUp, MousePointer2, ShoppingBag, DollarSign, Clock, CheckCircle, Wallet, Users } from 'lucide-react';
import api from '../../../utils/api';

const RANGES = [{ v:'today',l:'Today'},{v:'yesterday',l:'Yesterday'},{v:'7d',l:'7 Days'},{v:'30d',l:'30 Days'},{v:'90d',l:'90 Days'}];

function Card({ label, value, icon: Icon, color='#111827', bg='#fff', sub }) {
  return (
    <div style={{ background:bg, border:'1px solid #f3f4f6', borderRadius:14, padding:'16px 18px', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</span>
        <div style={{ width:32, height:32, borderRadius:8, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={15} color={color}/></div>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#9ca3af' }}>{sub}</div>}
    </div>
  );
}

export default function InfluencerHome({ profile }) {
  const [data, setData]   = useState(null);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/influencer/me/dashboard?range=${range}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const fmt = n => Number(n||0).toLocaleString('en-IN');
  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });

  const convRate = data && Number(data.total_clicks) > 0
    ? ((Number(data.total_orders||0) / Number(data.total_clicks)) * 100).toFixed(2) + '%'
    : '0%';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Welcome + range picker */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''} 👋
          </h2>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Here's your performance overview</p>
        </div>
        <div style={{ display:'flex', gap:4, background:'#f3f4f6', borderRadius:10, padding:3 }}>
          {RANGES.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              style={{ padding:'5px 12px', borderRadius:8, border:'none', background:range===r.v?'#fff':'transparent', color:range===r.v?'#111827':'#6b7280', fontSize:12, fontWeight:range===r.v?700:500, cursor:'pointer', boxShadow:range===r.v?'0 1px 3px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
          {Array.from({length:8}).map((_,i) => <div key={i} style={{ height:100, borderRadius:14, background:'#f3f4f6', animation:'pulse 1.5s infinite' }} />)}
        </div>
      ) : data ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
            <Card label="Total Clicks"        value={fmt(data.total_clicks)}            icon={MousePointer2} color='#6366f1' />
            <Card label="Unique Visitors"     value={fmt(data.total_unique_visitors)}   icon={Users}         color='#8b5cf6' />
            <Card label="Total Orders"        value={fmt(data.total_conversions)}       icon={ShoppingBag}   color='#0891b2' />
            <Card label="Conversion Rate"     value={convRate}                          icon={TrendingUp}    color='#059669' />
            <Card label="Revenue Generated"   value={fmtINR(data.total_revenue)}        icon={DollarSign}    color='#059669' />
            <Card label="Total Commission"    value={fmtINR(data.total_commission)}     icon={DollarSign}    color='#c9a96e' />
            <Card label="Pending Commission"  value={fmtINR(data.pending_commission)}   icon={Clock}         color='#854d0e' />
            <Card label="Approved Commission" value={fmtINR(data.approved_commission)}  icon={CheckCircle}   color='#15803d' />
          </div>

          {/* Payout summary */}
          <div style={{ background:'#fffbf5', border:'1px solid #fde68a', borderRadius:14, padding:'16px 20px', display:'flex', gap:20, flexWrap:'wrap' }}>
            <div><div style={{ fontSize:11, color:'#92400e', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>Paid Out</div><div style={{ fontSize:22, fontWeight:800, color:'#92400e' }}>{fmtINR(data.paid_payout)}</div></div>
            <div style={{ width:1, background:'#fde68a' }} />
            <div><div style={{ fontSize:11, color:'#854d0e', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>Pending Payout</div><div style={{ fontSize:22, fontWeight:800, color:'#854d0e' }}>{fmtINR(data.pending_payout)}</div></div>
          </div>

          {/* Mini chart */}
          {data.daily_stats?.length > 0 && <MiniChart data={data.daily_stats} />}

          {/* Top links */}
          {data.top_links?.length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>Top Performing Links</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {data.top_links.map(l => (
                  <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#f9fafb', borderRadius:10, gap:8 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.name}</div>
                      <div style={{ fontSize:11, color:'#9ca3af' }}>{l.total_clicks} clicks · {l.total_orders} orders</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color:'#059669', flexShrink:0 }}>₹{Number(l.total_revenue).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign:'center', padding:64, color:'#9ca3af', fontSize:13 }}>Unable to load dashboard data</div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

function MiniChart({ data }) {
  const maxClicks = Math.max(...data.map(d => Number(d.clicks||0)), 1);
  return (
    <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, padding:'16px 20px' }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:12 }}>Clicks — Last {data.length} Days</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:64 }}>
        {data.map((d, i) => {
          const h = Math.max(3, (Number(d.clicks||0) / maxClicks) * 56);
          return (
            <div key={i} title={`${d.stat_date}: ${d.clicks} clicks, ₹${d.revenue} revenue`}
              style={{ flex:1, height:h, borderRadius:'3px 3px 0 0', background:'#c9a96e', opacity:0.85, minWidth:3, cursor:'default', transition:'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity='1'}
              onMouseLeave={e => e.currentTarget.style.opacity='0.85'} />
          );
        })}
      </div>
    </div>
  );
}

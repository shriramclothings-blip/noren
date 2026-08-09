import { useState, useEffect } from 'react';
import { Link2, Copy, Check, BarChart2, ExternalLink, X } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api','') || 'https://noren-iqk3.onrender.com';

function CopyBtn({ text, label='Copy Link' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Link copied!'); });
  };
  return (
    <button onClick={copy} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, border:`1.5px solid ${copied?'#86efac':'#c9a96e'}`, background:copied?'#f0fdf4':'#fffbf5', cursor:'pointer', fontSize:12, fontWeight:700, color:copied?'#15803d':'#92400e', transition:'all 0.2s' }}>
      {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> {label}</>}
    </button>
  );
}

export default function InfluencerMyLinks() {
  const [links, setLinks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get('/influencer/me/links')
      .then(r => setLinks(r.data.links || []))
      .catch(() => toast.error('Failed to load links'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = n => Number(n||0).toLocaleString('en-IN');
  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>My Links</h2>
        <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Your tracking links — copy and share to earn commissions</p>
      </div>

      {loading ? (
        Array.from({length:3}).map((_,i) => <div key={i} style={{ height:120, borderRadius:14, background:'#f3f4f6', animation:'pulse 1.5s infinite' }} />)
      ) : links.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, padding:64, textAlign:'center' }}>
          <Link2 size={36} color="#e5e7eb" style={{ margin:'0 auto 12px', display:'block' }} />
          <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:6 }}>No links assigned yet</div>
          <div style={{ fontSize:13, color:'#9ca3af' }}>Your admin will create tracking links for you</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {links.map(l => {
            const shortUrl = `${BACKEND}/inf/r/${l.ref_code}`;
            return (
              <div key={l.id} style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, padding:'18px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:2 }}>{l.name}</div>
                    {l.campaign_name && <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:100, background:'#e0f2fe', color:'#0369a1' }}>{l.campaign_name}</span>}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:l.is_active?'#dcfce7':'#fee2e2', color:l.is_active?'#15803d':'#b91c1c' }}>
                      {l.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>

                {/* URL row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f9fafb', borderRadius:9, padding:'8px 12px', marginBottom:14 }}>
                  <Link2 size={13} color="#c9a96e" style={{ flexShrink:0 }} />
                  <span style={{ fontSize:12, color:'#374151', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{shortUrl}</span>
                  <CopyBtn text={shortUrl} label="Copy" />
                  <a href={shortUrl} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', padding:6, borderRadius:6, color:'#9ca3af', background:'none', border:'none', cursor:'pointer' }}><ExternalLink size={12}/></a>
                </div>

                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {[['Clicks',fmt(l.total_clicks),'#374151'],['Unique',fmt(l.unique_clicks),'#6366f1'],['Orders',fmt(l.total_orders),'#0891b2'],['Revenue',fmtINR(l.total_revenue),'#059669']].map(([lbl,val,col]) => (
                    <div key={lbl} style={{ background:'#f9fafb', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:800, color:col }}>{val}</div>
                      <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setAnalytics(l)} style={{ marginTop:12, display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', color:'#374151' }}>
                  <BarChart2 size={12}/> View Analytics
                </button>
              </div>
            );
          })}
        </div>
      )}

      {analytics && <LinkAnalyticsDrawer link={analytics} onClose={() => setAnalytics(null)} />}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

function LinkAnalyticsDrawer({ link, onClose }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/influencer/me/links/${link.id}/analytics`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [link.id]);

  const funnelLabels = { landing:'Landing', product_view:'Product View', add_to_cart:'Add to Cart', checkout_start:'Checkout', order_placed:'Order' };
  const funnelData = data?.funnel || [];
  const getCount = (type) => Number(funnelData.find(f=>f.event_type===type)?.count||0);
  const clicks = Number(link.total_clicks||0);
  const steps = Object.entries(funnelLabels).map(([k,l]) => ({ key:k, label:l, count: k==='landing'?clicks:getCount(k) }));
  const maxStep = Math.max(...steps.map(s=>s.count), 1);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:680, background:'#fff', borderRadius:16, maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{link.name} — Analytics</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'20px 22px', display:'flex', flexDirection:'column', gap:20 }}>
          {loading ? <div style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>Loading…</div> : (
            <>
              {/* Funnel */}
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>Conversion Funnel</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {steps.map((s, i) => (
                    <div key={s.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:100, fontSize:11, color:'#6b7280', textAlign:'right', flexShrink:0 }}>{s.label}</div>
                      <div style={{ flex:1, background:'#f3f4f6', borderRadius:4, height:22, overflow:'hidden' }}>
                        <div style={{ width:`${(s.count/maxStep)*100}%`, height:'100%', background: i===0?'#c9a96e': i===steps.length-1?'#059669':'#93c5fd', borderRadius:4, transition:'width 0.5s', display:'flex', alignItems:'center', paddingLeft:8 }}>
                          {s.count > 0 && <span style={{ fontSize:10, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{s.count.toLocaleString('en-IN')}</span>}
                        </div>
                      </div>
                      {i > 0 && steps[i-1].count > 0 && (
                        <div style={{ width:44, fontSize:10, color:'#9ca3af', textAlign:'right', flexShrink:0 }}>
                          {((s.count/steps[i-1].count)*100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown by device */}
              {data?.clicks?.length > 0 && (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:8 }}>Device Breakdown</div>
                  <div style={{ display:'flex', gap:10 }}>
                    {['mobile','desktop','tablet'].map(dt => {
                      const count = data.clicks.filter(c=>c.device_type===dt).reduce((s,c)=>s+Number(c.count||0),0);
                      return count > 0 ? (
                        <div key={dt} style={{ flex:1, background:'#f9fafb', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                          <div style={{ fontSize:18, fontWeight:800, color:'#111827' }}>{count.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize:11, color:'#9ca3af', textTransform:'capitalize' }}>{dt}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

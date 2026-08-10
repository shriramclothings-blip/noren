import { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, X, Copy, Check, BarChart2, ToggleLeft, ToggleRight, Trash2, QrCode } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api','') || 'https://noren-iqk3.onrender.com';
const inp = (e={}) => ({ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#111827', background:'#fff', boxSizing:'border-box', ...e });

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:6, border:'1px solid #e5e7eb', background:copied?'#f0fdf4':'#f9fafb', cursor:'pointer', fontSize:11, fontWeight:600, color:copied?'#16a34a':'#374151', whiteSpace:'nowrap', flexShrink:0 }}>
      {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
    </button>
  );
}

export default function AdminInfluencerLinks() {
  const [links, setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [campaigns, setCampaigns]     = useState([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [analytics, setAnalytics]     = useState(null);
  const [filter, setFilter] = useState({ influencer_id:'', campaign_id:'', search:'' });

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter.influencer_id) p.set('influencer_id', filter.influencer_id);
      if (filter.campaign_id)   p.set('campaign_id',   filter.campaign_id);
      if (filter.search)        p.set('search',         filter.search);
      const r = await api.get(`/influencer/admin/links?${p}&limit=100`);
      setLinks(r.data.links || []);
    } catch { toast.error('Failed to load links'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);
  useEffect(() => {
    api.get('/influencer/admin/influencers?limit=200').then(r => setInfluencers(r.data.influencers||[])).catch(()=>{});
    api.get('/influencer/admin/campaigns?limit=200').then(r => setCampaigns(r.data.campaigns||[])).catch(()=>{});
  }, []);

  const handleToggle = async (link) => {
    const reason = prompt(`${link.is_active?'Disable':'Enable'} this link — enter reason:`);
    if (!reason) return;
    try {
      await api.patch(`/influencer/admin/links/${link.id}/toggle`, { reason });
      toast.success(`Link ${link.is_active?'disabled':'enabled'}`);
      fetchLinks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (link) => {
    const reason = prompt(`Archive link "${link.name}" — enter reason:`);
    if (!reason) return;
    if (!confirm('This will soft-delete the link. Click OK to confirm.')) return;
    try {
      await api.delete(`/influencer/admin/links/${link.id}`, { data: { reason } });
      toast.success('Link archived');
      fetchLinks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const fmt = n => Number(n||0).toLocaleString('en-IN');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Tracking Links</h2>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Manage UTM / referral links for all influencers</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'none', background:'#1a1a18', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <Plus size={14}/> New Link
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <input value={filter.search} onChange={e => setFilter(f=>({...f,search:e.target.value}))} placeholder="Search links…" style={inp({flex:1,minWidth:180})} />
        <select value={filter.influencer_id} onChange={e => setFilter(f=>({...f,influencer_id:e.target.value}))} style={inp({width:'auto',minWidth:160})}>
          <option value="">All Influencers</option>
          {influencers.map(i => <option key={i.id} value={i.id}>{i.display_name||i.name}</option>)}
        </select>
        <select value={filter.campaign_id} onChange={e => setFilter(f=>({...f,campaign_id:e.target.value}))} style={inp({width:'auto',minWidth:160})}>
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Links */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f3f4f6', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Loading…</div>
        ) : links.length === 0 ? (
          <div style={{ padding:64, textAlign:'center' }}>
            <Link2 size={36} color="#e5e7eb" style={{ margin:'0 auto 12px', display:'block' }} />
            <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>No tracking links found</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['Name / Influencer','Short URL','Campaign','Clicks','Unique','Orders','Revenue','Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {links.map(l => {
                  const shortUrl = `${BACKEND}/inf/r/${l.ref_code}`;
                  return (
                    <tr key={l.id} style={{ borderBottom:'1px solid #f9fafb' }} onMouseEnter={e=>e.currentTarget.style.background='#fafafa'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ fontWeight:700, color:'#111827' }}>{l.name}</div>
                        <div style={{ fontSize:11, color:'#9ca3af' }}>{l.influencer_name}</div>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f9fafb', borderRadius:7, padding:'5px 8px' }}>
                          <span style={{ fontSize:11, color:'#374151', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{shortUrl}</span>
                          <CopyBtn text={shortUrl} />
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px', color:'#6b7280', fontSize:12 }}>{l.campaign_name || '—'}</td>
                      <td style={{ padding:'11px 14px', fontWeight:700, color:'#374151' }}>{fmt(l.total_clicks)}</td>
                      <td style={{ padding:'11px 14px', fontWeight:700, color:'#c9a96e' }}>{fmt(l.unique_clicks)}</td>
                      <td style={{ padding:'11px 14px', fontWeight:700, color:'#374151' }}>{fmt(l.total_orders)}</td>
                      <td style={{ padding:'11px 14px', fontWeight:700, color:'#059669' }}>₹{fmt(l.total_revenue)}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:100, background:l.is_active?'#dcfce7':'#fee2e2', color:l.is_active?'#15803d':'#b91c1c' }}>{l.is_active?'Active':'Paused'}</span>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={() => setAnalytics(l)} title="Analytics" style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #e5e7eb', background:'#f9fafb', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><BarChart2 size={12} color="#374151"/></button>
                          <button onClick={() => handleToggle(l)} title={l.is_active?'Disable':'Enable'} style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #e5e7eb', background:l.is_active?'#fef9c3':'#f0fdf4', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {l.is_active ? <ToggleRight size={12} color="#854d0e"/> : <ToggleLeft size={12} color="#15803d"/>}
                          </button>
                          <button onClick={() => handleDelete(l)} title="Archive" style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #fca5a5', background:'#fef2f2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={12} color="#ef4444"/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateLinkModal influencers={influencers} campaigns={campaigns} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); fetchLinks(); }} />}
      {analytics   && <LinkAnalyticsModal link={analytics} onClose={() => setAnalytics(null)} />}
    </div>
  );
}

function CreateLinkModal({ influencers, campaigns, onClose, onDone }) {
  const [form, setForm] = useState({ influencer_id:'', campaign_id:'', name:'', destination:'https://www.norenfastion.shop/', utm_source:'instagram', utm_medium:'influencer', utm_campaign:'', utm_content:'', utm_term:'' });
  const [sub, setSub] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.influencer_id) return toast.error('Select an influencer');
    setSub(true);
    try {
      await api.post('/influencer/admin/links', form);
      toast.success('Tracking link created');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSub(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:680, background:'#fff', borderRadius:16, maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>Create Tracking Link</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <form onSubmit={handleSubmit} style={{ overflowY:'auto', flex:1, padding:'18px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Influencer *</label>
              <select value={form.influencer_id} onChange={e => set('influencer_id',e.target.value)} style={inp({background:'#fff'})} required>
                <option value="">Select influencer…</option>
                {influencers.map(i => <option key={i.id} value={i.id}>{i.display_name||i.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Campaign (optional)</label>
              <select value={form.campaign_id} onChange={e => set('campaign_id',e.target.value)} style={inp({background:'#fff'})}>
                <option value="">No campaign</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Link Name *</label>
            <input value={form.name} onChange={e => set('name',e.target.value)} placeholder="e.g. Instagram Bio Link — Summer Sale" style={inp()} required />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Destination URL *</label>
            <input value={form.destination} onChange={e => set('destination',e.target.value)} style={inp()} required />
          </div>
          <div style={{ background:'#f9fafb', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>UTM Parameters</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['utm_source','Source','instagram'],['utm_medium','Medium','influencer'],['utm_campaign','Campaign','summer_sale'],['utm_content','Content','bio_link']].map(([k,l,ph]) => (
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:600, color:'#6b7280', display:'block', marginBottom:3 }}>{l}</label>
                  <input value={form[k]} onChange={e => set(k,e.target.value)} placeholder={ph} style={inp({fontSize:12})} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button type="submit" disabled={sub} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:9, border:'none', background:'#1a1a18', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:sub?0.7:1 }}>
              {sub ? 'Creating…' : 'Create Link'}
            </button>
            <button type="button" onClick={onClose} style={{ display:'inline-flex', padding:'9px 16px', borderRadius:9, border:'none', background:'#f3f4f6', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinkAnalyticsModal({ link, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/influencer/admin/links/${link.id}/analytics`).then(r => setData(r.data)).catch(() => {}); }, [link.id]);
  const fmt = n => Number(n||0).toLocaleString('en-IN');

  const funnelSteps = data?.funnel ? ['landing','product_view','add_to_cart','checkout_start','order_placed'] : [];
  const funnelData  = funnelSteps.map(step => ({ step, count: Number(data?.funnel?.find(f=>f.event_type===step)?.count||0) }));
  const maxFunnel   = Math.max(...funnelData.map(f=>f.count), 1);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:780, background:'#fff', borderRadius:16, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{link.name}</div>
            <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{link.influencer_name}</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[['Total Clicks',fmt(link.total_clicks)],['Unique',fmt(link.unique_clicks)],['Orders',fmt(link.total_orders)],['Revenue','₹'+fmt(link.total_revenue)]].map(([l,v]) => (
              <div key={l} style={{ background:'#f9fafb', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:800, color:'#111827' }}>{v}</div>
                <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Funnel */}
          {funnelData.length > 0 && (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:10 }}>Conversion Funnel</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {funnelData.map((f,i) => (
                  <div key={f.step} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:120, fontSize:11, color:'#6b7280', textTransform:'capitalize', textAlign:'right', flexShrink:0 }}>{f.step.replace(/_/g,' ')}</div>
                    <div style={{ flex:1, background:'#f3f4f6', borderRadius:4, height:20, overflow:'hidden' }}>
                      <div style={{ width:`${(f.count/maxFunnel)*100}%`, height:'100%', background:i===0?'#c9a96e':i===funnelData.length-1?'#059669':'#93c5fd', borderRadius:4, transition:'width 0.4s' }} />
                    </div>
                    <div style={{ width:40, fontSize:12, fontWeight:700, color:'#374151', textAlign:'right', flexShrink:0 }}>{fmt(f.count)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!data && <div style={{ textAlign:'center', padding:32, color:'#9ca3af', fontSize:13 }}>Loading analytics…</div>}
        </div>
      </div>
    </div>
  );
}

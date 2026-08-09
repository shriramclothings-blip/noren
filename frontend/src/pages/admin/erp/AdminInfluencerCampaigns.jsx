import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, X, Edit2, Eye, TrendingUp } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { draft:'#f3f4f6', scheduled:'#dbeafe', active:'#dcfce7', paused:'#fef9c3', completed:'#f0f9ff', archived:'#f3f4f6' };
const STATUS_TEXT   = { draft:'#6b7280', scheduled:'#1d4ed8', active:'#15803d', paused:'#854d0e', completed:'#0369a1', archived:'#9ca3af' };
const inp = (extra={}) => ({ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#111827', background:'#fff', boxSizing:'border-box', ...extra });
const btn = (bg='#1a1a18',color='#fff') => ({ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'none', background:bg, color, fontSize:13, fontWeight:600, cursor:'pointer' });

export default function AdminInfluencerCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState('');
  const [statusF, setStatusF]       = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (statusF) p.set('status', statusF);
      const r = await api.get(`/influencer/admin/campaigns?${p}`);
      setCampaigns(r.data.campaigns || []);
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }, [search, statusF]);

  useEffect(() => { fetch(); }, [fetch]);

  const fmt = n => Number(n||0).toLocaleString('en-IN');
  const fmtINR = n => '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Campaigns</h2>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Create and manage influencer marketing campaigns</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btn()}><Plus size={14}/> New Campaign</button>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns…" style={inp({flex:1,minWidth:180})} />
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={inp({width:'auto',minWidth:130})}>
          <option value="">All Status</option>
          {['draft','scheduled','active','paused','completed','archived'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {loading ? Array.from({length:4}).map((_,i) => <div key={i} style={{ height:180, borderRadius:14, background:'#f3f4f6' }} />) :
          campaigns.length === 0 ? (
            <div style={{ gridColumn:'1/-1', padding:64, textAlign:'center', background:'#fff', borderRadius:14, border:'1px solid #f3f4f6' }}>
              <Megaphone size={36} color="#e5e7eb" style={{ margin:'0 auto 12px', display:'block' }} />
              <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>No campaigns yet</div>
            </div>
          ) : campaigns.map(c => (
            <div key={c.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #f3f4f6', padding:'18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{c.name}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{c.description?.slice(0,60) || 'No description'}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:STATUS_COLORS[c.status]||'#f3f4f6', color:STATUS_TEXT[c.status]||'#374151', flexShrink:0 }}>{c.status}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[['Influencers',fmt(c.influencer_count)],['Clicks',fmt(c.total_clicks)],['Revenue',fmtINR(c.total_revenue)]].map(([l,v]) => (
                  <div key={l} style={{ textAlign:'center', background:'#f9fafb', borderRadius:8, padding:'8px 4px' }}>
                    <div style={{ fontSize:14, fontWeight:800, color:'#111827' }}>{v}</div>
                    <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:6, fontSize:11, color:'#9ca3af' }}>
                <span>Commission: {c.commission_type==='percentage'?`${c.commission_rate}%`:`₹${c.commission_rate}`}</span>
                {c.start_date && <span>· {new Date(c.start_date).toLocaleDateString('en-IN')} → {c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN') : '∞'}</span>}
              </div>
              <button onClick={() => setSelected(c)} style={{ ...btn('#f3f4f6','#374151'), justifyContent:'center', fontSize:12 }}><Eye size={12}/> View Details</button>
            </div>
          ))
        }
      </div>

      {showCreate && <CampaignFormModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); fetch(); }} />}
      {selected   && <CampaignDetailModal campaign={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); fetch(); }} />}
    </div>
  );
}

function CampaignFormModal({ campaign=null, onClose, onDone }) {
  const editing = !!campaign;
  const [form, setForm] = useState({
    name: campaign?.name||'', description: campaign?.description||'',
    status: campaign?.status||'draft',
    commission_type: campaign?.commission_type||'percentage',
    commission_rate: campaign?.commission_rate||'10',
    start_date: campaign?.start_date?.split('T')[0]||'',
    end_date:   campaign?.end_date?.split('T')[0]||'',
    budget: campaign?.budget||'', terms: campaign?.terms||'', notes: campaign?.notes||'',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Campaign name required');
    if (editing && !form.reason.trim()) return toast.error('Reason required for update');
    setSubmitting(true);
    try {
      if (editing) await api.put(`/influencer/admin/campaigns/${campaign.id}`, form);
      else await api.post('/influencer/admin/campaigns', form);
      toast.success(`Campaign ${editing?'updated':'created'}`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:640, background:'#fff', borderRadius:16, maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{editing ? 'Edit Campaign' : 'Create Campaign'}</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <form onSubmit={handleSubmit} style={{ overflowY:'auto', flex:1, padding:'18px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Campaign Name *</label>
            <input value={form.name} onChange={e => set('name',e.target.value)} style={inp()} required />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description',e.target.value)} rows={2} style={{ ...inp(), resize:'vertical' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Status</label>
              <select value={form.status} onChange={e => set('status',e.target.value)} style={inp({background:'#fff'})}>
                {['draft','scheduled','active','paused','completed','archived'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Commission Type</label>
              <select value={form.commission_type} onChange={e => set('commission_type',e.target.value)} style={inp({background:'#fff'})}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Rate</label>
              <input type="number" step="0.01" min="0" value={form.commission_rate} onChange={e => set('commission_rate',e.target.value)} style={inp()} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Start Date</label><input type="date" value={form.start_date} onChange={e => set('start_date',e.target.value)} style={inp()} /></div>
            <div><label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>End Date</label><input type="date" value={form.end_date} onChange={e => set('end_date',e.target.value)} style={inp()} /></div>
          </div>
          <div><label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Budget (₹)</label><input type="number" value={form.budget} onChange={e => set('budget',e.target.value)} style={inp()} /></div>
          <div><label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Terms & Conditions</label><textarea value={form.terms} onChange={e => set('terms',e.target.value)} rows={2} style={{ ...inp(), resize:'vertical' }} /></div>
          {editing && (
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#b91c1c', display:'block', marginBottom:4 }}>Reason for change *</label>
              <input value={form.reason} onChange={e => set('reason',e.target.value)} placeholder="Why are you updating this campaign?" style={inp()} />
            </div>
          )}
          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button type="submit" disabled={submitting} style={{ ...({ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:9, border:'none', background:'#1a1a18', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }), opacity:submitting?0.7:1 }}>
              {submitting ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={onClose} style={{ display:'inline-flex', alignItems:'center', padding:'9px 16px', borderRadius:9, border:'none', background:'#f3f4f6', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignDetailModal({ campaign, onClose, onDone }) {
  const [detail, setDetail] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => { api.get(`/influencer/admin/campaigns/${campaign.id}`).then(r => setDetail(r.data)).catch(() => {}); }, [campaign.id]);
  const fmt = n => Number(n||0).toLocaleString('en-IN');
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:700, background:'#fff', borderRadius:16, maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:'#0f172a' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#f1f5f9' }}>{campaign.name}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setEditOpen(true)} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'rgba(255,255,255,0.1)', color:'#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer' }}><Edit2 size={11}/> Edit</button>
            <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13} color="#94a3b8"/></button>
          </div>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, alignSelf:'flex-start', background:STATUS_COLORS[detail?.status]||'#f3f4f6', color:STATUS_TEXT[detail?.status]||'#374151' }}>{detail?.status}</span>
          {detail?.description && <p style={{ fontSize:13, color:'#374151', margin:0 }}>{detail.description}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[['Influencers',fmt(detail?.influencer_count)],['Links',fmt(detail?.link_count)],['Clicks',fmt(detail?.total_clicks)],['Orders',fmt(detail?.total_orders)],['Revenue','₹'+fmt(detail?.total_revenue)],['Commission',`${detail?.commission_rate}${detail?.commission_type==='percentage'?'%':' ₹fixed'}`]].map(([l,v]) => (
              <div key={l} style={{ background:'#f9fafb', borderRadius:9, padding:'10px 14px', textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#111827' }}>{v}</div>
                <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
          {detail?.influencers?.filter(Boolean).length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Assigned Influencers</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {detail.influencers.filter(Boolean).map(inf => <span key={inf.id} style={{ fontSize:12, padding:'4px 12px', borderRadius:100, background:'#f3f4f6', color:'#374151' }}>{inf.name}</span>)}
              </div>
            </div>
          )}
          {detail?.terms && <div style={{ background:'#f9fafb', borderRadius:9, padding:'12px 14px' }}><div style={{ fontSize:11, fontWeight:700, color:'#6b7280', marginBottom:4 }}>TERMS</div><div style={{ fontSize:12, color:'#374151', whiteSpace:'pre-wrap' }}>{detail.terms}</div></div>}
        </div>
      </div>
      {editOpen && <CampaignFormModal campaign={detail} onClose={() => setEditOpen(false)} onDone={() => { setEditOpen(false); onDone(); }} />}
    </div>
  );
}

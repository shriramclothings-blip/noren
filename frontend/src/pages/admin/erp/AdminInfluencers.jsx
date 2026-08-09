import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Eye, Edit2, Shield, ShieldOff, TrendingUp,
  ChevronDown, X, Check, AlertTriangle, ExternalLink, Filter, Trash2 } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active:    { bg:'#dcfce7', color:'#15803d' },
  inactive:  { bg:'#f3f4f6', color:'#6b7280' },
  suspended: { bg:'#fee2e2', color:'#b91c1c' },
  pending:   { bg:'#fef9c3', color:'#854d0e' },
};
const FRAUD_COLORS = {
  normal:     { bg:'#dcfce7', color:'#15803d' },
  review:     { bg:'#fef9c3', color:'#854d0e' },
  suspicious: { bg:'#ffedd5', color:'#c2410c' },
  blocked:    { bg:'#fee2e2', color:'#b91c1c' },
};

const inp = { width:'100%', padding:'9px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#111827', background:'#fff', boxSizing:'border-box' };
const btn = (bg='#1a1a18', color='#fff') => ({ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'none', background:bg, color, fontSize:13, fontWeight:600, cursor:'pointer' });

function StatCard({ label, value, sub, color='#111827' }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:12, padding:'16px 20px' }}>
      <div style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function AdminInfluencers() {
  const [influencers, setInfluencers] = useState([]);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState(null); // influencer detail view
  const LIMIT = 20;

  const fetchInfluencers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search)       params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const r = await api.get(`/influencer/admin/influencers?${params}`);
      setInfluencers(r.data.influencers || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load influencers'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  const fetchStats = useCallback(async () => {
    try { const r = await api.get('/influencer/admin/stats'); setStats(r.data); } catch {}
  }, []);

  useEffect(() => { fetchInfluencers(); fetchStats(); }, [fetchInfluencers, fetchStats]);

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });

  const handleDelete = async (inf) => {
    const reason = window.prompt(
      `Delete influencer "${inf.display_name || inf.name}"?\n\nThis will:\n• Disable their account and all links\n• Preserve all financial records\n• Cannot be undone easily\n\nEnter reason:`
    );
    if (!reason || !reason.trim()) return;
    if (!window.confirm(`Are you sure you want to delete "${inf.display_name || inf.name}"? This action is irreversible.`)) return;
    try {
      await api.delete(`/influencer/admin/influencers/${inf.id}`, { data: { reason } });
      toast.success('Influencer deleted');
      fetchInfluencers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete influencer');
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Influencer Management</h2>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Manage influencer accounts, campaigns, links and payouts</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btn()}>
          <Plus size={14} /> Add Influencer
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
          <StatCard label="Active Influencers" value={fmt(stats.active_influencers)} />
          <StatCard label="Active Campaigns"   value={fmt(stats.active_campaigns)} />
          <StatCard label="Total Revenue"       value={fmtINR(stats.total_revenue)} color='#059669' />
          <StatCard label="Total Commission"    value={fmtINR(stats.total_commission)} color='#c9a96e' />
          <StatCard label="Pending Approval"    value={fmt(stats.pending_count)} color='#854d0e' />
          <StatCard label="Fraud Alerts"        value={fmt(stats.unreviewed_fraud)} color={Number(stats.unreviewed_fraud) > 0 ? '#b91c1c' : '#15803d'} />
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} color='#9ca3af' style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, username…"
            style={{ ...inp, paddingLeft:32 }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...inp, width:'auto', minWidth:130 }}>
          <option value="">All Status</option>
          {['active','inactive','suspended','pending'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f3f4f6', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f9fafb' }}>
                {['Influencer','Username','Commission','Status','Fraud','Clicks','Orders','Revenue',''].map(h => (
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap', borderBottom:'1px solid #f3f4f6' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:5}).map((_,i) => (
                <tr key={i}><td colSpan={9} style={{ padding:'14px 16px' }}><div style={{ height:20, borderRadius:4, background:'#f3f4f6' }} /></td></tr>
              )) : influencers.length === 0 ? (
                <tr><td colSpan={9} style={{ padding:'48px 16px', textAlign:'center', color:'#9ca3af' }}>
                  <Users size={32} color='#e5e7eb' style={{ margin:'0 auto 8px', display:'block' }} />
                  No influencers found
                </td></tr>
              ) : influencers.map(inf => {
                const sc = STATUS_COLORS[inf.status] || STATUS_COLORS.inactive;
                const fc = FRAUD_COLORS[inf.fraud_status] || FRAUD_COLORS.normal;
                return (
                  <tr key={inf.id} style={{ borderBottom:'1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:8, background:'#f3f4f6', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#6b7280' }}>
                          {inf.profile_photo ? <img src={inf.profile_photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (inf.display_name||inf.name||'?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, color:'#111827' }}>{inf.display_name || inf.name}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>{inf.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#374151' }}>@{inf.username || '—'}</td>
                    <td style={{ padding:'12px 16px', color:'#374151' }}>
                      {inf.commission_type === 'percentage' ? `${inf.commission_rate}%` : `₹${inf.commission_rate}`}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:100, background:sc.bg, color:sc.color }}>{inf.status}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:100, background:fc.bg, color:fc.color }}>{inf.fraud_status}</span>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#374151', fontWeight:600 }}>{fmt(inf.total_clicks)}</td>
                    <td style={{ padding:'12px 16px', color:'#374151', fontWeight:600 }}>{fmt(inf.total_orders)}</td>
                    <td style={{ padding:'12px 16px', color:'#059669', fontWeight:700 }}>{fmtINR(inf.total_revenue)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setSelected(inf)}
                          style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 12px', borderRadius:7, border:'1.5px solid #e5e7eb', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', color:'#374151' }}>
                          <Eye size={12} /> View
                        </button>
                        <button onClick={() => handleDelete(inf)}
                          title="Delete influencer"
                          style={{ width:30, height:30, borderRadius:7, border:'1.5px solid #fca5a5', background:'#fef2f2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Trash2 size={12} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderTop:'1px solid #f3f4f6' }}>
            <span style={{ fontSize:12, color:'#9ca3af' }}>{total} influencers</span>
            <div style={{ display:'flex', gap:6 }}>
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #e5e7eb', background:page===1?'#f9fafb':'#fff', fontSize:12, cursor:page===1?'default':'pointer', color:page===1?'#d1d5db':'#374151' }}>Prev</button>
              <button disabled={page*LIMIT>=total} onClick={() => setPage(p=>p+1)}
                style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #e5e7eb', background:page*LIMIT>=total?'#f9fafb':'#fff', fontSize:12, cursor:page*LIMIT>=total?'default':'pointer', color:page*LIMIT>=total?'#d1d5db':'#374151' }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateInfluencerModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); fetchInfluencers(); fetchStats(); }} />}
      {selected   && <InfluencerDetailModal influencer={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); fetchInfluencers(); fetchStats(); }} />}
    </div>
  );
}

// ── Create Influencer Modal ────────────────────────────────────────────────
function CreateInfluencerModal({ onClose, onDone }) {
  const [form, setForm] = useState({
    name:'', email:'', phone:'', username:'', password:'', display_name:'',
    category:'', niche:'', location:'',
    commission_type:'percentage', commission_rate:'10',
    status:'active', agreement_status:'pending',
    notes:'',
  });
  const [socials, setSocials] = useState([{ platform:'instagram', handle:'', url:'' }]);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);

  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password are required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      fd.append('social_profiles', JSON.stringify(socials.filter(s => s.handle)));
      if (photo) fd.append('profile_photo', photo);
      await api.post('/influencer/admin/influencers', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Influencer account created');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create influencer');
    } finally { setSubmitting(false); }
  };

  const PLATFORMS = ['instagram','youtube','facebook','tiktok','twitter','snapchat','other'];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:720, background:'#fff', borderRadius:16, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#111827' }}>Create Influencer Account</div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ overflowY:'auto', flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['Full Name *','name','text'],['Email *','email','email'],['Phone','phone','tel'],['Username','username','text'],['Password *','password','password'],['Display Name','display_name','text']].map(([lbl,key,type]) => (
              <div key={key}>
                <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>{lbl}</label>
                <input type={type} value={form[key]} onChange={e => set(key,e.target.value)} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Commission Type</label>
              <select value={form.commission_type} onChange={e => set('commission_type',e.target.value)} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', background:'#fff' }}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Commission Rate</label>
              <input type="number" step="0.01" min="0" value={form.commission_rate} onChange={e => set('commission_rate',e.target.value)} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Status</label>
              <select value={form.status} onChange={e => set('status',e.target.value)} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', background:'#fff' }}>
                {['active','inactive','pending'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['Category','category'],['Niche','niche'],['Location','location']].map(([lbl,key]) => (
              <div key={key}>
                <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>{lbl}</label>
                <input value={form[key]} onChange={e => set(key,e.target.value)} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
            ))}
          </div>

          {/* Social profiles */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.06em' }}>Social Profiles</label>
              <button type="button" onClick={() => setSocials(s => [...s, { platform:'instagram', handle:'', url:'' }])}
                style={{ fontSize:11, fontWeight:600, color:'#c9a96e', background:'none', border:'none', cursor:'pointer' }}>+ Add</button>
            </div>
            {socials.map((s, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8, marginBottom:8 }}>
                <select value={s.platform} onChange={e => setSocials(arr => arr.map((x,j) => j===i ? {...x,platform:e.target.value} : x))}
                  style={{ padding:'7px 10px', fontSize:12, border:'1.5px solid #e5e7eb', borderRadius:7, outline:'none', background:'#fff' }}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input placeholder="@handle" value={s.handle} onChange={e => setSocials(arr => arr.map((x,j) => j===i ? {...x,handle:e.target.value} : x))}
                  style={{ padding:'7px 10px', fontSize:12, border:'1.5px solid #e5e7eb', borderRadius:7, outline:'none' }} />
                <input placeholder="Profile URL" value={s.url} onChange={e => setSocials(arr => arr.map((x,j) => j===i ? {...x,url:e.target.value} : x))}
                  style={{ padding:'7px 10px', fontSize:12, border:'1.5px solid #e5e7eb', borderRadius:7, outline:'none' }} />
                <button type="button" onClick={() => setSocials(arr => arr.filter((_,j) => j!==i))}
                  style={{ width:30, height:30, borderRadius:7, border:'1px solid #fca5a5', background:'#fef2f2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={12} color="#ef4444" /></button>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Profile Photo</label>
            <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} style={{ fontSize:12 }} />
          </div>

          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button type="submit" disabled={submitting} style={{ ...btn(), opacity:submitting?0.7:1 }}>
              {submitting ? 'Creating…' : 'Create Influencer'}
            </button>
            <button type="button" onClick={onClose} style={btn('#f3f4f6','#374151')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Influencer Detail Modal ────────────────────────────────────────────────
function InfluencerDetailModal({ influencer, onClose, onDone }) {
  const [detail, setDetail] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [tab, setTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/influencer/admin/influencers/${influencer.id}`).then(r => { setDetail(r.data); setForm({ commission_type:r.data.commission_type, commission_rate:r.data.commission_rate, status:r.data.status, notes:r.data.notes||'', admin_notes:r.data.admin_notes||'' }); }).catch(() => {});
    api.get(`/influencer/admin/influencers/${influencer.id}/analytics?range=30d`).then(r => setAnalytics(r.data)).catch(() => {});
  }, [influencer.id]);

  const handleUpdate = async () => {
    if (!reason.trim()) return toast.error('Please provide a reason for this update');
    setSubmitting(true);
    try {
      await api.put(`/influencer/admin/influencers/${influencer.id}`, { ...form, reason });
      toast.success('Influencer updated');
      setEditMode(false); setReason('');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    const deleteReason = window.prompt(
      `Delete "${detail?.display_name || influencer.display_name}"?\n\nThis will disable their account & all links.\nFinancial records are preserved.\n\nEnter reason:`
    );
    if (!deleteReason || !deleteReason.trim()) return;
    if (!window.confirm('This is irreversible. Confirm delete?')) return;
    setDeleting(true);
    try {
      await api.delete(`/influencer/admin/influencers/${influencer.id}`, { data: { reason: deleteReason } });
      toast.success('Influencer deleted');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  const TABS = [{ k:'overview', l:'Overview' }, { k:'analytics', l:'Analytics' }, { k:'links', l:'Links' }, { k:'conversions', l:'Conversions' }];
  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmt = n => Number(n||0).toLocaleString('en-IN');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:900, background:'#fff', borderRadius:16, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:'#0f172a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(201,169,110,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#c9a96e' }}>
              {(detail?.display_name || influencer.display_name || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#f1f5f9' }}>{detail?.display_name || influencer.display_name}</div>
              <div style={{ fontSize:11, color:'#64748b' }}>{detail?.email || influencer.email}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => setEditMode(e => !e)} style={{ ...btn('#1e293b','#94a3b8'), padding:'6px 12px', fontSize:12 }}><Edit2 size={12} /> {editMode ? 'Cancel Edit' : 'Edit'}</button>
            <button onClick={handleDelete} disabled={deleting}
              style={{ ...btn('#7f1d1d','#fca5a5'), padding:'6px 12px', fontSize:12, opacity:deleting?0.6:1 }}>
              <Trash2 size={12} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14} color="#94a3b8" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid #f3f4f6', flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ padding:'10px 18px', fontSize:13, fontWeight:tab===t.k?700:500, color:tab===t.k?'#c9a96e':'#6b7280', border:'none', background:'none', cursor:'pointer', borderBottom:tab===t.k?'2px solid #c9a96e':'2px solid transparent', marginBottom:-1 }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'20px 24px' }}>
          {tab === 'overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* KPI row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[['Clicks', fmt(detail?.total_clicks), '#374151'], ['Orders', fmt(detail?.total_orders), '#374151'], ['Revenue', fmtINR(detail?.total_revenue), '#059669'], ['Commission', fmtINR(detail?.total_commission), '#c9a96e']].map(([l,v,c]) => (
                  <div key={l} style={{ background:'#f9fafb', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'#9ca3af', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
                    <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
                  </div>
                ))}
              </div>

              {editMode ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12, background:'#fffbf5', border:'1px solid #fde68a', borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>⚠️ Editing influencer — all changes are audit logged</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Commission Type</label>
                      <select value={form.commission_type} onChange={e => setForm(f => ({...f,commission_type:e.target.value}))} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', background:'#fff', boxSizing:'border-box' }}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Commission Rate</label>
                      <input type="number" step="0.01" value={form.commission_rate} onChange={e => setForm(f => ({...f,commission_rate:e.target.value}))} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({...f,status:e.target.value}))} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', background:'#fff', boxSizing:'border-box' }}>
                        {['active','inactive','suspended','pending'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Admin Notes (internal)</label>
                    <textarea value={form.admin_notes} onChange={e => setForm(f => ({...f,admin_notes:e.target.value}))} rows={2} style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', boxSizing:'border-box', resize:'vertical' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#b91c1c', display:'block', marginBottom:4 }}>Reason for change (required) *</label>
                    <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Commission renegotiated per contract renewal" style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #fca5a5', borderRadius:8, outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <button onClick={handleUpdate} disabled={submitting} style={{ ...btn(), alignSelf:'flex-start', opacity:submitting?0.7:1 }}>
                    {submitting ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['Category', detail?.category], ['Niche', detail?.niche], ['Location', detail?.location], ['Commission', detail?.commission_type==='percentage'?`${detail?.commission_rate}%`:`₹${detail?.commission_rate}`], ['Agreement', detail?.agreement_status], ['Contract Start', detail?.contract_start_date ? new Date(detail.contract_start_date).toLocaleDateString('en-IN') : '—'], ['Contract End', detail?.contract_end_date ? new Date(detail.contract_end_date).toLocaleDateString('en-IN') : '—'], ['Payment Method', detail?.payment_method || '—']].map(([k,v]) => (
                    <div key={k} style={{ background:'#f9fafb', borderRadius:9, padding:'10px 14px' }}>
                      <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Social profiles */}
              {detail?.social_profiles?.length > 0 && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Social Profiles</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {detail.social_profiles.filter(Boolean).map((sp,i) => (
                      <a key={i} href={sp.url||'#'} target="_blank" rel="noopener noreferrer"
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:'#f3f4f6', fontSize:12, fontWeight:600, color:'#374151', textDecoration:'none' }}>
                        {sp.platform} · @{sp.handle}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <SimpleLineChart data={analytics.daily_stats} />
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:8 }}>Top Links</div>
                {analytics.top_links?.map(l => (
                  <div key={l.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f3f4f6' }}>
                    <span style={{ fontSize:13, color:'#374151', fontWeight:600 }}>{l.name}</span>
                    <span style={{ fontSize:12, color:'#6b7280' }}>{l.total_clicks} clicks · {l.total_orders} orders · ₹{Number(l.total_revenue).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'links' && <InfluencerLinksTab influencerId={influencer.id} />}
          {tab === 'conversions' && <InfluencerConversionsTab influencerId={influencer.id} />}
        </div>
      </div>
    </div>
  );
}

function SimpleLineChart({ data = [] }) {
  if (!data.length) return <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No analytics data for this period</div>;
  const maxClicks = Math.max(...data.map(d => Number(d.clicks||0)), 1);
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Clicks (Last 30 Days)</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80 }}>
        {data.slice(-30).map((d, i) => {
          const h = Math.max(4, (Number(d.clicks||0) / maxClicks) * 72);
          return <div key={i} title={`${d.stat_date}: ${d.clicks} clicks`} style={{ flex:1, height:h, borderRadius:3, background:'#c9a96e', opacity:0.85, minWidth:4 }} />;
        })}
      </div>
    </div>
  );
}

function InfluencerLinksTab({ influencerId }) {
  const [links, setLinks] = useState([]);
  useEffect(() => { api.get(`/influencer/admin/links?influencer_id=${influencerId}`).then(r => setLinks(r.data.links||[])).catch(() => {}); }, [influencerId]);
  const BACKEND = import.meta.env.VITE_API_URL?.replace('/api','') || '';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {links.length === 0 ? <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No links created yet</div> : links.map(l => (
        <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#f9fafb', borderRadius:10, gap:8 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{l.name}</div>
            <div style={{ fontSize:11, color:'#9ca3af', fontFamily:'monospace' }}>{BACKEND}/inf/r/{l.ref_code}</div>
          </div>
          <div style={{ display:'flex', gap:16, flexShrink:0 }}>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:16, fontWeight:800, color:'#374151' }}>{l.total_clicks}</div><div style={{ fontSize:10, color:'#9ca3af' }}>Clicks</div></div>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:16, fontWeight:800, color:'#059669' }}>₹{Number(l.total_revenue).toLocaleString('en-IN')}</div><div style={{ fontSize:10, color:'#9ca3af' }}>Revenue</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfluencerConversionsTab({ influencerId }) {
  const [convs, setConvs] = useState([]);
  useEffect(() => { api.get(`/influencer/admin/conversions?influencer_id=${influencerId}`).then(r => setConvs(r.data.conversions||[])).catch(() => {}); }, [influencerId]);
  const STATUS_C = { pending:'#fef9c3', approved:'#dcfce7', paid:'#dbeafe', rejected:'#fee2e2', reversed:'#f3f4f6', cancelled:'#f3f4f6' };
  return (
    <div>
      {convs.length === 0 ? <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No conversions yet</div> : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ background:'#f9fafb' }}>{['Order','Revenue','Commission','Rate','Status','Date'].map(h => <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #f3f4f6' }}>{h}</th>)}</tr></thead>
          <tbody>{convs.map(c => (
            <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb' }}>
              <td style={{ padding:'10px 12px', fontWeight:600, color:'#111827' }}>#{c.order_ref}</td>
              <td style={{ padding:'10px 12px' }}>₹{Number(c.order_total).toLocaleString('en-IN')}</td>
              <td style={{ padding:'10px 12px', color:'#c9a96e', fontWeight:700 }}>₹{Number(c.commission_amount).toLocaleString('en-IN')}</td>
              <td style={{ padding:'10px 12px', color:'#6b7280' }}>{c.commission_type==='percentage'?`${c.commission_rate}%`:`₹${c.commission_rate}`}</td>
              <td style={{ padding:'10px 12px' }}><span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, background:STATUS_C[c.status]||'#f3f4f6', color:'#374151' }}>{c.status}</span></td>
              <td style={{ padding:'10px 12px', color:'#6b7280', fontSize:12 }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

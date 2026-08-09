import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, CheckCircle, XCircle, RotateCcw, X } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending:'#fef9c3', under_review:'#e0f2fe', approved:'#dcfce7', rejected:'#fee2e2', cancelled:'#f3f4f6', reversed:'#f3f4f6', paid:'#dbeafe' };
const STATUS_TEXT   = { pending:'#854d0e', under_review:'#0369a1', approved:'#15803d', rejected:'#b91c1c', cancelled:'#9ca3af', reversed:'#9ca3af', paid:'#1d4ed8' };
const inp = (e={}) => ({ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#111827', background:'#fff', boxSizing:'border-box', ...e });

export default function AdminInfluencerConversions() {
  const [convs, setConvs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [filter, setFilter] = useState({ influencer_id:'', status:'', date_from:'', date_to:'' });
  const [action, setAction] = useState(null); // { conv, type: 'approve'|'reject'|'reverse' }

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      Object.entries(filter).forEach(([k,v]) => { if(v) p.set(k,v); });
      p.set('limit','50');
      const r = await api.get(`/influencer/admin/conversions?${p}`);
      setConvs(r.data.conversions || []);
    } catch { toast.error('Failed to load conversions'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { api.get('/influencer/admin/influencers?limit=200').then(r => setInfluencers(r.data.influencers||[])).catch(()=>{}); }, []);

  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Conversions</h2>
        <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>All influencer-attributed orders and commission records</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <select value={filter.influencer_id} onChange={e => setFilter(f=>({...f,influencer_id:e.target.value}))} style={inp({width:'auto',minWidth:160})}>
          <option value="">All Influencers</option>
          {influencers.map(i => <option key={i.id} value={i.id}>{i.display_name||i.name}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(f=>({...f,status:e.target.value}))} style={inp({width:'auto',minWidth:130})}>
          <option value="">All Status</option>
          {['pending','under_review','approved','rejected','cancelled','reversed','paid'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <input type="date" value={filter.date_from} onChange={e => setFilter(f=>({...f,date_from:e.target.value}))} style={inp({width:'auto'})} />
        <input type="date" value={filter.date_to}   onChange={e => setFilter(f=>({...f,date_to:e.target.value}))}   style={inp({width:'auto'})} />
      </div>

      <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          {loading ? <div style={{ padding:32, textAlign:'center', color:'#9ca3af' }}>Loading…</div> : convs.length === 0 ? (
            <div style={{ padding:64, textAlign:'center' }}>
              <ShoppingCart size={32} color="#e5e7eb" style={{ margin:'0 auto 8px', display:'block' }} />
              <div style={{ color:'#9ca3af', fontSize:13 }}>No conversions found</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['Order','Influencer','Campaign','Order Value','Commission','Rate','Attribution','Status','Date','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convs.map(c => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'10px 14px', fontWeight:700, fontSize:12, fontFamily:'monospace', color:'#111827' }}>#{c.order_ref}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ fontWeight:600, color:'#374151', fontSize:12 }}>{c.influencer_name}</div>
                      <div style={{ fontSize:10, color:'#9ca3af' }}>{c.influencer_email}</div>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#6b7280', fontSize:12 }}>{c.campaign_name || '—'}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600 }}>{fmtINR(c.order_total)}</td>
                    <td style={{ padding:'10px 14px', fontWeight:800, color:'#c9a96e' }}>{fmtINR(c.commission_amount)}</td>
                    <td style={{ padding:'10px 14px', color:'#6b7280', fontSize:12 }}>{c.commission_type==='percentage'?`${c.commission_rate}%`:`₹${c.commission_rate}`}</td>
                    <td style={{ padding:'10px 14px', color:'#6b7280', fontSize:11 }}>{c.attribution_model?.replace(/_/g,' ') || 'last click'}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, background:STATUS_COLORS[c.status]||'#f3f4f6', color:STATUS_TEXT[c.status]||'#374151' }}>
                        {c.status?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#9ca3af', fontSize:11 }}>{fmtDate(c.created_at)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        {c.status === 'pending' && <>
                          <button onClick={() => setAction({ conv:c, type:'approve' })} title="Approve" style={{ width:26, height:26, borderRadius:6, border:'1.5px solid #86efac', background:'#f0fdf4', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><CheckCircle size={11} color="#15803d"/></button>
                          <button onClick={() => setAction({ conv:c, type:'reject'  })} title="Reject"  style={{ width:26, height:26, borderRadius:6, border:'1.5px solid #fca5a5', background:'#fef2f2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><XCircle size={11} color="#ef4444"/></button>
                        </>}
                        {['approved','pending'].includes(c.status) && (
                          <button onClick={() => setAction({ conv:c, type:'reverse' })} title="Reverse" style={{ width:26, height:26, borderRadius:6, border:'1.5px solid #e5e7eb', background:'#f9fafb', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><RotateCcw size={11} color="#6b7280"/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {action && <ActionModal action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); fetch(); }} />}
    </div>
  );
}

function ActionModal({ action, onClose, onDone }) {
  const { conv, type } = action;
  const [reason, setReason]   = useState('');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);

  const titles = { approve:'Approve Commission', reject:'Reject Commission', reverse:'Reverse Commission' };
  const colors = { approve:'#15803d', reject:'#b91c1c', reverse:'#6b7280' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error('Reason is required');
    setSaving(true);
    try {
      if (type === 'reverse') {
        await api.post(`/influencer/admin/conversions/${conv.id}/reverse`, { reason });
      } else {
        const status = type === 'approve' ? 'approved' : 'rejected';
        await api.patch(`/influencer/admin/conversions/${conv.id}`, { status, admin_note: note, reason });
      }
      toast.success(`Commission ${type}d`);
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:480, background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`3px solid ${colors[type]}` }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{titles[type]}</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#f9fafb', borderRadius:9, padding:'10px 14px', fontSize:12, color:'#374151' }}>
            Order #{conv.order_ref} · Commission: ₹{Number(conv.commission_amount).toLocaleString('en-IN')} · Influencer: {conv.influencer_name}
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#b91c1c', display:'block', marginBottom:4 }}>Reason (required, audit logged) *</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder={`Why are you ${type}ing this commission?`}
              style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #fca5a5', borderRadius:8, outline:'none', boxSizing:'border-box' }} required />
          </div>
          {type !== 'reverse' && (
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Admin Note (visible to influencer)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                style={{ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', boxSizing:'border-box', resize:'vertical' }} />
            </div>
          )}
          <div style={{ display:'flex', gap:8, paddingTop:4 }}>
            <button type="submit" disabled={saving} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'none', background:colors[type], color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Processing…' : `Confirm ${type.charAt(0).toUpperCase()+type.slice(1)}`}
            </button>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'none', background:'#f3f4f6', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, CheckCircle, XCircle, Clock, DollarSign, X, ChevronDown } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending:'#fef9c3', approved:'#dbeafe', processing:'#e0f2fe', paid:'#dcfce7', failed:'#fee2e2', cancelled:'#f3f4f6' };
const STATUS_TEXT   = { pending:'#854d0e', approved:'#1d4ed8', processing:'#0369a1', paid:'#15803d', failed:'#b91c1c', cancelled:'#6b7280' };
const inp = (e={}) => ({ width:'100%', padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#111827', background:'#fff', boxSizing:'border-box', ...e });

export default function AdminInfluencerPayouts() {
  const [payouts, setPayouts]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [filter, setFilter] = useState({ influencer_id:'', status:'' });
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter.influencer_id) p.set('influencer_id', filter.influencer_id);
      if (filter.status)        p.set('status', filter.status);
      const r = await api.get(`/influencer/admin/payouts?${p}&limit=50`);
      setPayouts(r.data.payouts || []);
    } catch { toast.error('Failed to load payouts'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { api.get('/influencer/admin/influencers?limit=200&status=active').then(r => setInfluencers(r.data.influencers||[])).catch(()=>{}); }, []);

  const handleStatusUpdate = async (payout, newStatus) => {
    const reason = prompt(`Change status to "${newStatus}" — enter reason:`);
    if (!reason) return;
    let transaction_ref = '';
    if (newStatus === 'paid') transaction_ref = prompt('Enter transaction/UTR reference ID:') || '';
    try {
      await api.patch(`/influencer/admin/payouts/${payout.id}`, { status: newStatus, reason, transaction_ref });
      toast.success(`Payout ${newStatus}`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const fmt = n => Number(n||0).toLocaleString('en-IN');
  const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Payout Management</h2>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Create, approve and track influencer payouts</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'none', background:'#1a1a18', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <Plus size={14}/> Create Payout
        </button>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <select value={filter.influencer_id} onChange={e => setFilter(f=>({...f,influencer_id:e.target.value}))} style={inp({width:'auto',minWidth:180})}>
          <option value="">All Influencers</option>
          {influencers.map(i => <option key={i.id} value={i.id}>{i.display_name||i.name}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(f=>({...f,status:e.target.value}))} style={inp({width:'auto',minWidth:130})}>
          <option value="">All Status</option>
          {['pending','approved','processing','paid','failed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f3f4f6', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f9fafb' }}>
                {['Payout ID','Influencer','Conversions','Gross','Adjustments','Payable','Method','Status','Created','Actions'].map(h => (
                  <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Loading…</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={10} style={{ padding:48, textAlign:'center' }}>
                  <Wallet size={32} color="#e5e7eb" style={{ margin:'0 auto 8px', display:'block' }} />
                  <div style={{ color:'#9ca3af', fontSize:13 }}>No payouts found</div>
                </td></tr>
              ) : payouts.map(p => (
                <tr key={p.id} style={{ borderBottom:'1px solid #f9fafb' }} onMouseEnter={e=>e.currentTarget.style.background='#fafafa'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={{ padding:'11px 14px', fontFamily:'monospace', fontSize:11, color:'#6b7280' }}>{p.payout_uid?.slice(0,14)}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ fontWeight:700, color:'#111827' }}>{p.influencer_name}</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>{p.influencer_email}</div>
                  </td>
                  <td style={{ padding:'11px 14px', textAlign:'center', fontWeight:600 }}>{fmt(p.conversion_count)}</td>
                  <td style={{ padding:'11px 14px', color:'#374151', fontWeight:600 }}>{fmtINR(p.gross_commission)}</td>
                  <td style={{ padding:'11px 14px', color: parseFloat(p.adjustments) < 0 ? '#b91c1c' : '#374151', fontWeight:600 }}>{fmtINR(p.adjustments)}</td>
                  <td style={{ padding:'11px 14px', color:'#059669', fontWeight:800, fontSize:14 }}>{fmtINR(p.final_amount)}</td>
                  <td style={{ padding:'11px 14px', color:'#6b7280', fontSize:12 }}>{p.payment_method || '—'}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:STATUS_COLORS[p.status]||'#f3f4f6', color:STATUS_TEXT[p.status]||'#374151' }}>{p.status}</span>
                  </td>
                  <td style={{ padding:'11px 14px', color:'#6b7280', fontSize:12 }}>{fmtDate(p.created_at)}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      {p.status === 'pending' && (
                        <button onClick={() => handleStatusUpdate(p, 'approved')} title="Approve" style={{ padding:'5px 10px', borderRadius:6, border:'1.5px solid #86efac', background:'#f0fdf4', cursor:'pointer', fontSize:11, fontWeight:600, color:'#15803d' }}>Approve</button>
                      )}
                      {p.status === 'approved' && (
                        <button onClick={() => handleStatusUpdate(p, 'paid')} title="Mark Paid" style={{ padding:'5px 10px', borderRadius:6, border:'1.5px solid #93c5fd', background:'#eff6ff', cursor:'pointer', fontSize:11, fontWeight:600, color:'#1d4ed8' }}>Mark Paid</button>
                      )}
                      {['pending','approved'].includes(p.status) && (
                        <button onClick={() => handleStatusUpdate(p, 'cancelled')} title="Cancel" style={{ width:26, height:26, borderRadius:6, border:'1.5px solid #fca5a5', background:'#fef2f2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><XCircle size={11} color="#ef4444"/></button>
                      )}
                      {p.transaction_ref && <span title={`TXN: ${p.transaction_ref}`} style={{ fontSize:10, color:'#9ca3af', padding:'3px 6px', background:'#f3f4f6', borderRadius:4 }}>TXN</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreatePayoutModal influencers={influencers} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); fetch(); }} />}
    </div>
  );
}

function CreatePayoutModal({ influencers, onClose, onDone }) {
  const [form, setForm] = useState({ influencer_id:'', payment_method:'bank', admin_notes:'', period_start:'', period_end:'' });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const loadPreview = async (infId) => {
    if (!infId) return;
    setLoading(true);
    try {
      const r = await api.get(`/influencer/admin/conversions?influencer_id=${infId}&status=approved&limit=100`);
      const convs = r.data.conversions || [];
      const total = convs.reduce((s,c) => s + parseFloat(c.commission_amount||0), 0);
      setPreview({ count: convs.length, total });
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (form.influencer_id) loadPreview(form.influencer_id); else setPreview(null); }, [form.influencer_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.influencer_id) return toast.error('Select an influencer');
    if (!preview?.count)     return toast.error('No approved conversions to pay out');
    setSub(true);
    try {
      await api.post('/influencer/admin/payouts', form);
      toast.success('Payout created');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSub(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:520, background:'#fff', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>Create Payout</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding:'18px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Influencer *</label>
            <select value={form.influencer_id} onChange={e => set('influencer_id',e.target.value)} style={inp({background:'#fff'})} required>
              <option value="">Select influencer…</option>
              {influencers.map(i => <option key={i.id} value={i.id}>{i.display_name||i.name}</option>)}
            </select>
          </div>

          {preview && (
            <div style={{ background: preview.count > 0 ? '#f0fdf4' : '#fef9c3', border:`1px solid ${preview.count>0?'#86efac':'#fde68a'}`, borderRadius:10, padding:'12px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color: preview.count>0?'#15803d':'#854d0e' }}>
                {loading ? 'Checking…' : preview.count > 0
                  ? `✓ ${preview.count} approved conversions → ₹${preview.total.toFixed(2)} payable`
                  : '⚠ No approved conversions to pay out for this influencer'}
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Period Start</label><input type="date" value={form.period_start} onChange={e=>set('period_start',e.target.value)} style={inp()} /></div>
            <div><label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Period End</label><input type="date" value={form.period_end} onChange={e=>set('period_end',e.target.value)} style={inp()} /></div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Payment Method</label>
            <select value={form.payment_method} onChange={e=>set('payment_method',e.target.value)} style={inp({background:'#fff'})}>
              {['bank','upi','paypal','cheque','cash','other'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Admin Notes</label>
            <textarea value={form.admin_notes} onChange={e=>set('admin_notes',e.target.value)} rows={2} style={{ ...inp(), resize:'vertical' }} />
          </div>
          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button type="submit" disabled={sub || !preview?.count} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:9, border:'none', background:'#1a1a18', color:'#fff', fontSize:13, fontWeight:600, cursor: (!preview?.count||sub) ? 'not-allowed':'pointer', opacity:(!preview?.count||sub)?0.5:1 }}>
              {sub ? 'Creating…' : 'Create Payout'}
            </button>
            <button type="button" onClick={onClose} style={{ display:'inline-flex', padding:'9px 16px', borderRadius:9, border:'none', background:'#f3f4f6', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const SEV_COLORS = { low:'#fef9c3', medium:'#ffedd5', high:'#fee2e2', critical:'#fdf2f8' };
const SEV_TEXT   = { low:'#854d0e', medium:'#c2410c', high:'#b91c1c', critical:'#86198f' };

export default function AdminInfluencerFraud() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewed, setShowReviewed] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/influencer/admin/fraud?is_reviewed=${showReviewed}&limit=50`);
      setEvents(r.data.events || []);
    } catch { toast.error('Failed to load fraud events'); }
    finally { setLoading(false); }
  }, [showReviewed]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleReview = async (id) => {
    try {
      await api.patch(`/influencer/admin/fraud/${id}/review`, { action:'clear' });
      toast.success('Fraud event marked as reviewed');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleFraudStatus = async (influencerId, currentStatus) => {
    const statuses = ['normal','review','suspicious','blocked'];
    const next = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    const reason = prompt(`Set fraud status to "${next}" — enter reason:`);
    if (!reason) return;
    try {
      await api.put(`/influencer/admin/influencers/${influencerId}/fraud-status`, { fraud_status: next, reason });
      toast.success(`Fraud status updated to ${next}`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const fmtDate = d => new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Fraud & Security</h2>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Monitor suspicious influencer activity and flag fraud</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ fontSize:12, color:'#6b7280', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
            <input type="checkbox" checked={showReviewed} onChange={e => setShowReviewed(e.target.checked)} />
            Show reviewed
          </label>
        </div>
      </div>

      {/* Info */}
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#b91c1c' }}>
        <strong>⚠ Fraud signals are generated automatically.</strong> Review each event and update the influencer's fraud status as needed. Blocked influencers cannot use their links.
      </div>

      {loading ? (
        <div style={{ padding:32, textAlign:'center', color:'#9ca3af' }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, padding:64, textAlign:'center' }}>
          <Shield size={36} color="#e5e7eb" style={{ margin:'0 auto 12px', display:'block' }} />
          <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>{showReviewed ? 'No reviewed events' : 'No unreviewed fraud events'}</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>All clear 🎉</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {events.map(e => (
            <div key={e.id} style={{ background:'#fff', border:`1px solid ${SEV_COLORS[e.severity]||'#f3f4f6'}`, borderRadius:12, padding:'14px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <AlertTriangle size={14} color={SEV_TEXT[e.severity]||'#6b7280'} />
                    <span style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{e.event_type?.replace(/_/g,' ')}</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, background:SEV_COLORS[e.severity]||'#f3f4f6', color:SEV_TEXT[e.severity]||'#374151', textTransform:'capitalize' }}>{e.severity}</span>
                    {e.is_reviewed && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'#f0fdf4', color:'#15803d' }}>Reviewed</span>}
                  </div>
                  {e.influencer_name && <div style={{ fontSize:12, color:'#374151' }}>Influencer: <strong>{e.influencer_name}</strong> ({e.influencer_email})</div>}
                  {e.description && <div style={{ fontSize:12, color:'#6b7280', marginTop:3 }}>{e.description}</div>}
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{fmtDate(e.created_at)}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {!e.is_reviewed && (
                    <button onClick={() => handleReview(e.id)}
                      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 12px', borderRadius:7, border:'1.5px solid #86efac', background:'#f0fdf4', cursor:'pointer', fontSize:11, fontWeight:600, color:'#15803d' }}>
                      <CheckCircle size={11}/> Mark Reviewed
                    </button>
                  )}
                  {e.influencer_id && (
                    <button onClick={() => handleFraudStatus(e.influencer_id, 'review')}
                      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 12px', borderRadius:7, border:'1.5px solid #fca5a5', background:'#fef2f2', cursor:'pointer', fontSize:11, fontWeight:600, color:'#b91c1c' }}>
                      Update Status
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

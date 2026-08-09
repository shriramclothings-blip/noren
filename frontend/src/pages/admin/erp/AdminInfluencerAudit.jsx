import { useState, useEffect, useCallback } from 'react';
import { FileClock, Search } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  INFLUENCER_CREATED: '#dcfce7', INFLUENCER_UPDATED: '#dbeafe', INFLUENCER_DISABLED: '#fee2e2',
  CAMPAIGN_CREATED: '#e0f2fe',  CAMPAIGN_UPDATED: '#dbeafe',
  UTM_LINK_CREATED: '#f3e8ff', LINK_ENABLED: '#dcfce7', LINK_DISABLED: '#fee2e2',
  COMMISSION_CHANGED: '#fef9c3', COMMISSION_REVERSED: '#fee2e2',
  PAYOUT_CREATED: '#e0f2fe',   PAYOUT_APPROVED: '#dcfce7', PAYOUT_PAID: '#f0fdf4',
  FRAUD_STATUS_CHANGED: '#ffedd5', FRAUD_EVENT_REVIEWED: '#dcfce7',
};

export default function AdminInfluencerAudit() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resource, setResource] = useState('');
  const [page, setPage]     = useState(1);
  const LIMIT = 50;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: LIMIT, page });
      if (search)   p.set('action', search);
      if (resource) p.set('resource_type', resource);
      const r = await api.get(`/influencer/admin/audit-logs?${p}`);
      setLogs(r.data.logs || []);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [search, resource, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const fmtDate = d => new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Influencer Audit Logs</h2>
        <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Immutable record of all influencer management actions</p>
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={13} color="#9ca3af" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Filter by action…"
            style={{ width:'100%', padding:'8px 12px 8px 30px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', boxSizing:'border-box', color:'#111827' }} />
        </div>
        <select value={resource} onChange={e => { setResource(e.target.value); setPage(1); }}
          style={{ padding:'8px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', background:'#fff', minWidth:130 }}>
          <option value="">All Resources</option>
          {['influencer','campaign','link','conversion','payout','fraud'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          {loading ? (
            <div style={{ padding:32, textAlign:'center', color:'#9ca3af' }}>Loading…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding:64, textAlign:'center' }}>
              <FileClock size={32} color="#e5e7eb" style={{ margin:'0 auto 8px', display:'block' }} />
              <div style={{ color:'#9ca3af', fontSize:13 }}>No audit logs found</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f9fafb' }}>
                  {['Time','Action','Resource','Actor','Role','IP','Result'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #f3f4f6', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderBottom:'1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'10px 14px', color:'#6b7280', fontSize:11, whiteSpace:'nowrap' }}>{fmtDate(l.created_at)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:6, background:ACTION_COLORS[l.action]||'#f3f4f6', color:'#374151', fontFamily:'monospace' }}>{l.action}</span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#374151', fontSize:12 }}>
                      {l.resource_type && <span>{l.resource_type} {l.resource_id ? `#${l.resource_id}` : ''}</span>}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{l.actor_name || 'System'}</div>
                      {l.actor_email && <div style={{ fontSize:10, color:'#9ca3af' }}>{l.actor_email}</div>}
                    </td>
                    <td style={{ padding:'10px 14px', color:'#6b7280', fontSize:11, textTransform:'capitalize' }}>{l.actor_role?.replace(/_/g,' ') || '—'}</td>
                    <td style={{ padding:'10px 14px', color:'#9ca3af', fontSize:11, fontFamily:'monospace' }}>{l.ip_address || '—'}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:600, color: l.result === 'success' ? '#15803d' : '#b91c1c' }}>{l.result || 'success'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderTop:'1px solid #f3f4f6' }}>
          <span style={{ fontSize:12, color:'#9ca3af' }}>Page {page}</span>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e5e7eb', background:page===1?'#f9fafb':'#fff', fontSize:12, cursor:page===1?'default':'pointer', color:page===1?'#d1d5db':'#374151' }}>Prev</button>
            <button disabled={logs.length < LIMIT} onClick={() => setPage(p=>p+1)} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e5e7eb', background:logs.length<LIMIT?'#f9fafb':'#fff', fontSize:12, cursor:logs.length<LIMIT?'default':'pointer', color:logs.length<LIMIT?'#d1d5db':'#374151' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

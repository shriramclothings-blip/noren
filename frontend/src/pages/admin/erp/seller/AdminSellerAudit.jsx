import { useState, useEffect, useCallback } from 'react';
import { FileClock, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';

const btn = (bg = '#f3f4f6', color = '#374151') => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

const ACTION_COLORS = {
  seller_registered:  { bg: '#dcfce7', color: '#15803d' },
  seller_status_active:   { bg: '#dcfce7', color: '#15803d' },
  seller_status_suspended:{ bg: '#ffedd5', color: '#c2410c' },
  seller_status_banned:   { bg: '#fee2e2', color: '#b91c1c' },
  seller_status_rejected: { bg: '#fee2e2', color: '#b91c1c' },
  kyc_approved:       { bg: '#dcfce7', color: '#15803d' },
  kyc_rejected:       { bg: '#fee2e2', color: '#b91c1c' },
  kyc_submitted:      { bg: '#dbeafe', color: '#1d4ed8' },
  product_approved:   { bg: '#dcfce7', color: '#15803d' },
  product_rejected:   { bg: '#fee2e2', color: '#b91c1c' },
  product_created:    { bg: '#f0fdf4', color: '#166534' },
  product_submitted:  { bg: '#dbeafe', color: '#1d4ed8' },
  product_updated:    { bg: '#fef9c3', color: '#854d0e' },
  payout_created:     { bg: '#ede9fe', color: '#6d28d9' },
  payout_paid:        { bg: '#dcfce7', color: '#15803d' },
};

export default function AdminSellerAudit() {
  const [logs, setLogs]   = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]   = useState(1);
  const LIMIT = 50;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/sellers/audit-logs?page=${page}&limit=${LIMIT}`);
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>Seller Audit Logs</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Immutable trail of all seller management actions. {total.toLocaleString()} entries.</p>
        </div>
        <button onClick={fetch} style={btn()}>Refresh</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['Time', 'Actor', 'Seller', 'Action', 'Resource', 'IP'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>}
            {!loading && !logs.length && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <FileClock size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                No audit logs yet
              </td></tr>
            )}
            {logs.map(log => {
              const ac = ACTION_COLORS[log.action] || { bg: '#f3f4f6', color: '#6b7280' };
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>{log.actor_name || '—'}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{log.actor_role?.replace('_', ' ')}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>{log.seller_brand || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: ac.bg, color: ac.color }}>{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#6b7280' }}>
                    {log.resource_type ? `${log.resource_type} #${log.resource_id}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#9ca3af' }}>{log.ip_address || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btn()}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btn()}><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw } from 'lucide-react';
import { getVisitorSessions } from '../../api/analytics';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { formatDateTime } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const DATE_RANGES = [
  { label: '1 Hour', value: '1h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
];

export default function VisitorAnalytics() {
  const { can } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('24h');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const load = async (p = 1, r = range) => {
    setLoading(true);
    try {
      const res = await getVisitorSessions({ page: p, limit: LIMIT, range: r });
      setSessions(res.data.sessions || res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Visitor Intelligence</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Real session data from existing NOREN analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[var(--border)] rounded-md overflow-hidden">
            {DATE_RANGES.map(r => (
              <button
                key={r.value}
                className={`px-3 py-1.5 text-xs transition-colors ${range === r.value ? 'bg-[var(--text-primary)] text-[var(--surface)]' : 'hover:bg-[var(--surface-3)]'}`}
                onClick={() => { setRange(r.value); setPage(1); load(1, r.value); }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-3 rounded-md text-xs border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        ℹ️ Showing login session data from <code className="font-mono">src_login_sessions</code>. IP addresses are masked for non-super_admin users per privacy policy.
      </div>

      {loading ? (
        <PageLoader />
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState icon={Globe} title="No visitor sessions" description="No session data found for the selected time range." />
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Date/Time</th>
                  <th>Device</th>
                  <th>Browser</th>
                  <th>OS</th>
                  <th>Location</th>
                  {can('view_ip') && <th>IP Address</th>}
                  <th>Auth Method</th>
                  <th>Suspicious</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      {s.user_id ? (
                        <a href={`/customers/${s.user_id}`} className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                          {s.user_name || `#${s.user_id}`}
                        </a>
                      ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Guest</span>}
                    </td>
                    <td className="text-xs whitespace-nowrap">{formatDateTime(s.logged_in_at)}</td>
                    <td className="text-xs">{s.device_model || s.device_type || '—'}</td>
                    <td className="text-xs">{s.browser}{s.browser_version ? ` ${s.browser_version}` : ''}</td>
                    <td className="text-xs">{s.os || '—'}</td>
                    <td className="text-xs">{[s.city, s.region, s.country].filter(Boolean).join(', ') || '—'}</td>
                    {can('view_ip') && (
                      <td className="text-xs font-mono">{s.ip_address || '—'}</td>
                    )}
                    <td className="text-xs capitalize">{s.auth_method || 'local'}</td>
                    <td>
                      {s.is_suspicious ? (
                        <span className="badge bg-yellow-100 text-yellow-800">⚠ Yes</span>
                      ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} total sessions</p>
            <Pagination page={page} total={total} limit={LIMIT} onChange={p => { setPage(p); load(p, range); }} />
          </div>
        </>
      )}
    </div>
  );
}

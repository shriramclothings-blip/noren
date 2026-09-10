import React, { useState, useEffect, useCallback } from 'react';
import { Search, Database, RefreshCw, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import client from '../../api/client';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDateTime, debounce } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

// Redact sensitive patterns from log details
function redact(text = '') {
  if (!text) return '—';
  return String(text)
    .replace(/("password"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("token"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("secret"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("api_key"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/npg_[A-Za-z0-9]+/g, '[DB_CREDENTIAL_REDACTED]')
    .replace(/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[JWT_REDACTED]');
}

function StatusIcon({ status }) {
  const s = parseInt(status);
  if (s >= 500) return <AlertTriangle size={13} style={{ color: '#dc2626' }} />;
  if (s >= 400) return <AlertTriangle size={13} style={{ color: '#d97706' }} />;
  return <CheckCircle size={13} style={{ color: '#16a34a' }} />;
}

function statusColor(status) {
  const s = parseInt(status);
  if (s >= 500) return 'bg-red-100 text-red-800';
  if (s >= 400) return 'bg-yellow-100 text-yellow-800';
  if (s >= 200) return 'bg-green-100 text-green-800';
  return 'bg-gray-100 text-gray-700';
}

export default function TechnicalLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const LIMIT = 50;

  const load = useCallback(async (p = 1, q = search, sf = statusFilter) => {
    setLoading(true);
    try {
      const res = await client.get('/api/support/audit-logs', {
        params: { page: p, limit: LIMIT, search: q, action_prefix: sf || undefined },
      });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch { }
    setLoading(false);
  }, [search, statusFilter]);

  const debouncedSearch = useCallback(debounce((q) => load(1, q, statusFilter), 350), [load, statusFilter]);
  const handleSearch = (v) => { setSearch(v); debouncedSearch(v); };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">API / Error Logs</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            System activity and audit trail from the backend. Sensitive values are automatically redacted.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(page)}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="p-3 rounded-md text-xs border flex items-start gap-2" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
        <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#c2410c' }} />
        <p style={{ color: '#9a3412' }}>
          Passwords, tokens, API keys, and database credentials are automatically redacted from all log entries.
          {user?.role !== 'super_admin' && ' IP addresses visible to Super Admin only.'}
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by action, resource, actor…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input pl-8"
          />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}><X size={13} /></button>}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={12} cols={5} />
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState icon={Database} title="No logs found" description={search ? 'No logs match your search.' : 'System activity logs will appear here.'} />
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="text-xs">{log.admin_name || (log.admin_id ? `User #${log.admin_id}` : 'System')}</td>
                    <td className="text-xs font-medium">{log.action}</td>
                    <td className="text-xs capitalize">
                      {log.target_type || '—'}{log.target_id ? ` #${log.target_id}` : ''}
                    </td>
                    <td className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {redact(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="flex justify-end">
              <Pagination page={page} total={total} limit={LIMIT} onChange={p => load(p, search)} />
            </div>
          )}
        </>
      )}

      {/* Log detail modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLog(null)} />
          <div className="relative card w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold">Log Entry #{selectedLog.id}</h2>
              <button className="btn btn-ghost btn-sm p-1" onClick={() => setSelectedLog(null)}><X size={16} /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-sm">
              {[
                ['Timestamp', formatDateTime(selectedLog.created_at)],
                ['Actor', selectedLog.admin_name || (selectedLog.admin_id ? `User #${selectedLog.admin_id}` : 'System')],
                ['Action', selectedLog.action],
                ['Resource', `${selectedLog.target_type || '—'}${selectedLog.target_id ? ` #${selectedLog.target_id}` : ''}`],
                ['Details', redact(selectedLog.details)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="col-span-2 text-xs break-all">{v || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

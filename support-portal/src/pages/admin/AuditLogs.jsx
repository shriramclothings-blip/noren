import React, { useState, useCallback } from 'react';
import { ClipboardList, Search, X } from 'lucide-react';
import { getAuditLogs } from '../../api/support';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDateTime, debounce, truncate } from '../../lib/utils';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page: p, limit: LIMIT, search: q });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  }, []);

  const debouncedSearch = useCallback(debounce((q) => load(1, q), 350), [load]);
  const handleSearch = (v) => { setSearch(v); debouncedSearch(v); };

  React.useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Audit Logs</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Immutable record of all system and user actions</p>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input placeholder="Search actions, actors…" value={search} onChange={e => handleSearch(e.target.value)} className="input pl-8" />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>}
      </div>

      {loading ? (
        <TableSkeleton rows={12} cols={5} />
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState icon={ClipboardList} title="No audit logs" description={search ? 'No logs match your search.' : 'No audit entries yet.'} />
        </div>
      ) : (
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
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                  <td className="text-xs">{l.admin_name || l.actor_name || (l.admin_id ? `User #${l.admin_id}` : 'System')}</td>
                  <td className="text-xs font-medium">{l.action}</td>
                  <td className="text-xs capitalize">{l.target_type || l.resource_type || '—'}{l.target_id ? ` #${l.target_id}` : ''}</td>
                  <td className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>{truncate(l.details || '', 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > LIMIT && (
        <div className="flex justify-end">
          <Pagination page={page} total={total} limit={LIMIT} onChange={p => load(p, search)} />
        </div>
      )}
    </div>
  );
}

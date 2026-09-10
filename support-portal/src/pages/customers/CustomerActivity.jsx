import React, { useState, useEffect, useCallback } from 'react';
import { Search, Activity, X, RefreshCw, ShoppingBag, Ticket, LogIn, Eye, ShoppingCart, CreditCard, Package } from 'lucide-react';
import { getCustomers } from '../../api/customers';
import client from '../../api/client';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDateTime, timeAgo, debounce } from '../../lib/utils';
import { Link } from 'react-router-dom';

function getActionIcon(action = '') {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('register') || a.includes('session')) return <LogIn size={12} style={{ color: '#2563eb' }} />;
  if (a.includes('order') && a.includes('creat')) return <ShoppingBag size={12} style={{ color: '#16a34a' }} />;
  if (a.includes('order')) return <Package size={12} style={{ color: '#7c3aed' }} />;
  if (a.includes('ticket')) return <Ticket size={12} style={{ color: '#d97706' }} />;
  if (a.includes('cart')) return <ShoppingCart size={12} style={{ color: '#0369a1' }} />;
  if (a.includes('payment') || a.includes('refund')) return <CreditCard size={12} style={{ color: '#dc2626' }} />;
  if (a.includes('view') || a.includes('product')) return <Eye size={12} style={{ color: '#6b7280' }} />;
  return <Activity size={12} style={{ color: 'var(--text-muted)' }} />;
}

export default function CustomerActivity() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await client.get('/api/support/activity', { params: { page: p, limit: LIMIT, search: q } });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      // fallback: load general activity logs
      try {
        const res = await client.get('/api/support/audit-logs', { params: { page: p, limit: LIMIT, search: q } });
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
        setPage(p);
      } catch { }
    }
    setLoading(false);
  }, [search]);

  const debouncedSearch = useCallback(debounce((q) => load(1, q), 350), [load]);
  const handleSearch = (v) => { setSearch(v); debouncedSearch(v); };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Customer Activity</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Real activity from login sessions and support actions
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(page)}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          placeholder="Search activity by action or user…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="input pl-8"
        />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}><X size={13} /></button>}
      </div>

      {loading ? (
        <TableSkeleton rows={12} cols={5} />
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Activity}
            title="No activity found"
            description={search ? 'No activity matches your search.' : 'Customer activity from login sessions and support actions will appear here.'}
          />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      {log.admin_id || log.user_id ? (
                        <Link
                          to={`/customers/${log.admin_id || log.user_id}`}
                          className="text-xs hover:underline font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          {log.admin_name || log.user_name || `User #${log.admin_id || log.user_id}`}
                        </Link>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>System</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs">
                        {getActionIcon(log.action)}
                        <span className="font-medium">{log.action}</span>
                      </div>
                    </td>
                    <td className="text-xs capitalize">
                      {log.target_type || log.resource_type || '—'}
                      {(log.target_id || log.resource_id) && (
                        <span style={{ color: 'var(--text-muted)' }}> #{log.target_id || log.resource_id}</span>
                      )}
                    </td>
                    <td className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {log.details || '—'}
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
    </div>
  );
}

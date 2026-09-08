import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, X } from 'lucide-react';
import { getCustomers } from '../../api/customers';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, timeAgo, debounce } from '../../lib/utils';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await getCustomers({ page: p, limit: LIMIT, search: q });
      setCustomers(res.data.customers || res.data.users || []);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Customers</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} total customers</p>
        </div>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="input pl-8"
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}>
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : customers.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No customers found" description={search ? 'Try a different search term.' : 'No customers yet.'} /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`} className="flex items-center gap-2 hover:opacity-80">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
                      >
                        {(c.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium hover:underline">{c.name}</div>
                        {c.user_code && <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>#{c.user_code}</div>}
                      </div>
                    </Link>
                  </td>
                  <td className="text-xs">{c.email}</td>
                  <td className="text-xs">{c.phone || '—'}</td>
                  <td>
                    <span className="badge bg-gray-100 text-gray-700 capitalize">{c.role}</span>
                    {c.is_banned && <span className="badge bg-red-100 text-red-700 ml-1">Banned</span>}
                  </td>
                  <td className="text-xs">{formatDate(c.created_at)}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.updated_at || c.created_at)}</td>
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

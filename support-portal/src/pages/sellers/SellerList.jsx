import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store, X } from 'lucide-react';
import { getSellers } from '../../api/sellers';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, debounce, timeAgo } from '../../lib/utils';

export default function SellerList({ support }) {
  const [sellers, setSellers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await getSellers({ page: p, limit: LIMIT, search: q });
      setSellers(res.data.sellers || []);
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
          <h1 className="text-lg font-semibold">{support ? 'Seller Support' : 'Sellers'}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} sellers</p>
        </div>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input placeholder="Search sellers…" value={search} onChange={e => handleSearch(e.target.value)} className="input pl-8" />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>}
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : sellers.length === 0 ? (
        <div className="card"><EmptyState icon={Store} title="No sellers found" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Seller</th>
                <th>Brand</th>
                <th>KYC</th>
                <th>Status</th>
                <th>Products</th>
                <th>Revenue</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map(s => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/sellers/${s.id}`} className="text-xs font-medium hover:underline">{s.user_name || s.name || '—'}</Link>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.email}</div>
                  </td>
                  <td className="text-xs">{s.brand_name || '—'}</td>
                  <td>
                    <span className={`badge capitalize ${s.kyc_status === 'approved' ? 'bg-green-100 text-green-800' : s.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {s.kyc_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge capitalize ${s.status === 'active' ? 'bg-green-100 text-green-800' : s.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-xs">{s.total_products ?? 0}</td>
                  <td className="text-xs">₹{Number(s.total_revenue || 0).toLocaleString('en-IN')}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</td>
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

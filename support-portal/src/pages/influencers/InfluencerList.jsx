import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserCheck, X } from 'lucide-react';
import { getInfluencers } from '../../api/influencers';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, debounce, formatCurrency } from '../../lib/utils';

export default function InfluencerList({ support }) {
  const [influencers, setInfluencers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await getInfluencers({ page: p, limit: LIMIT, search: q });
      setInfluencers(res.data.influencers || res.data.data || []);
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
          <h1 className="text-lg font-semibold">{support ? 'Influencer Support' : 'Influencers'}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} influencers</p>
        </div>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input placeholder="Search influencers…" value={search} onChange={e => handleSearch(e.target.value)} className="input pl-8" />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>}
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : influencers.length === 0 ? (
        <div className="card"><EmptyState icon={UserCheck} title="No influencers found" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Influencer</th>
                <th>Status</th>
                <th>Category</th>
                <th>Clicks</th>
                <th>Orders</th>
                <th>Commission</th>
                <th>Fraud</th>
              </tr>
            </thead>
            <tbody>
              {influencers.map(inf => (
                <tr key={inf.id}>
                  <td>
                    <Link to={`/influencers/${inf.id}`} className="text-xs font-medium hover:underline">{inf.display_name || inf.name || '—'}</Link>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>@{inf.username || '—'}</div>
                  </td>
                  <td><span className={`badge capitalize ${inf.status === 'active' ? 'bg-green-100 text-green-800' : inf.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{inf.status}</span></td>
                  <td className="text-xs">{inf.category || '—'}</td>
                  <td className="text-xs">{(inf.total_clicks || 0).toLocaleString()}</td>
                  <td className="text-xs">{inf.total_orders || 0}</td>
                  <td className="text-xs">{formatCurrency(inf.total_commission)}</td>
                  <td>
                    {inf.fraud_status !== 'normal' ? (
                      <span className={`badge capitalize ${inf.fraud_status === 'blocked' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{inf.fraud_status}</span>
                    ) : '—'}
                  </td>
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

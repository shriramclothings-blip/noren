import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, X } from 'lucide-react';
import { getOrders } from '../../api/orders';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, debounce, formatCurrency, timeAgo } from '../../lib/utils';

export default function OrderList({ filter }) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT, search: q };
      if (filter === 'issues') params.has_tickets = '1';
      const res = await getOrders(params);
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  }, [filter]);

  const debouncedSearch = useCallback(debounce((q) => load(1, q), 350), [load]);
  const handleSearch = (v) => { setSearch(v); debouncedSearch(v); };

  React.useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{filter === 'issues' ? 'Order Issues' : 'Orders'}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} orders</p>
        </div>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          placeholder="Search by order ID, customer, tracking…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="input pl-8"
        />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch('')}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>}
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : orders.length === 0 ? (
        <div className="card"><EmptyState icon={ShoppingBag} title="No orders found" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/orders/${o.order_id || o.id}`} className="text-xs font-mono font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                      {o.order_id}
                    </Link>
                  </td>
                  <td>
                    <div className="text-xs">
                      <div className="font-medium">{o.full_name}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{o.email}</div>
                    </div>
                  </td>
                  <td><span className="badge bg-blue-100 text-blue-800 capitalize">{o.status}</span></td>
                  <td><span className={`badge capitalize ${o.payment_status === 'paid' ? 'bg-green-100 text-green-800' : o.payment_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{o.payment_status}</span></td>
                  <td className="text-xs font-medium">{formatCurrency(o.total)}</td>
                  <td className="text-xs capitalize">{o.payment_method || '—'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(o.created_at)}</td>
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

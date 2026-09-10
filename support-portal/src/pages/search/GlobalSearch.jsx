import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Ticket, Users, ShoppingBag, Store, UserCheck, Package, X, Loader } from 'lucide-react';
import client from '../../api/client';
import { debounce, timeAgo, formatCurrency } from '../../lib/utils';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';

const SECTIONS = [
  { key: 'tickets', label: 'Tickets', icon: Ticket, color: '#7c3aed' },
  { key: 'customers', label: 'Customers', icon: Users, color: '#2563eb' },
  { key: 'orders', label: 'Orders', icon: ShoppingBag, color: '#16a34a' },
  { key: 'sellers', label: 'Sellers', icon: Store, color: '#d97706' },
  { key: 'influencers', label: 'Influencers', icon: UserCheck, color: '#be185d' },
];

export default function GlobalSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q?.trim()) { setResults({}); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const [tickets, customers, orders, sellers, influencers] = await Promise.allSettled([
        client.get('/api/support/tickets', { params: { search: q, limit: 5 } }),
        client.get('/api/support/customers', { params: { search: q, limit: 5 } }),
        client.get('/api/support/orders', { params: { search: q, limit: 5 } }),
        client.get('/api/support/sellers', { params: { search: q, limit: 5 } }),
        client.get('/api/support/influencers', { params: { search: q, limit: 5 } }),
      ]);
      setResults({
        tickets: tickets.status === 'fulfilled' ? (tickets.value.data.tickets || []) : [],
        customers: customers.status === 'fulfilled' ? (customers.value.data.customers || customers.value.data.users || []) : [],
        orders: orders.status === 'fulfilled' ? (orders.value.data.orders || []) : [],
        sellers: sellers.status === 'fulfilled' ? (sellers.value.data.sellers || []) : [],
        influencers: influencers.status === 'fulfilled' ? (influencers.value.data.influencers || []) : [],
      });
    } catch { }
    setLoading(false);
  }, []);

  const debouncedSearch = useCallback(debounce(doSearch, 350), [doSearch]);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQ) doSearch(initialQ);
  }, []);

  const handleChange = (v) => {
    setQuery(v);
    setSearchParams(v ? { q: v } : {});
    debouncedSearch(v);
  };

  const totalResults = Object.values(results).reduce((s, arr) => s + (arr?.length || 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Global Search</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Search tickets, customers, orders, sellers, influencers</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search anything… (Ctrl+K)"
          className="input pl-11 pr-10 py-3 text-sm"
          style={{ fontSize: '15px' }}
        />
        {loading && <Loader size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-muted)' }} />}
        {!loading && query && (
          <button className="absolute right-4 top-1/2 -translate-y-1/2" onClick={() => handleChange('')}>
            <X size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* Tips when empty */}
      {!searched && (
        <div className="card p-6">
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Search across</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SECTIONS.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-2 p-3 rounded-md" style={{ background: 'var(--surface-2)' }}>
                <Icon size={16} style={{ color }} />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Tip: Press <kbd className="px-1 py-0.5 rounded text-[10px] border border-[var(--border)]">Ctrl+K</kbd> from anywhere to open search
          </p>
        </div>
      )}

      {/* No results */}
      {searched && !loading && totalResults === 0 && (
        <div className="card p-8 text-center">
          <Search size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium">No results for "{query}"</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try searching by ID, email, name, or order number</p>
        </div>
      )}

      {/* Results */}
      {searched && totalResults > 0 && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing top results for "{query}"
          </p>

          {/* Tickets */}
          {(results.tickets || []).length > 0 && (
            <ResultSection title="Tickets" icon={Ticket} color="#7c3aed" viewAllLink={`/tickets?q=${encodeURIComponent(query)}`}>
              {results.tickets.map(t => (
                <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                  <Ticket size={13} style={{ color: '#7c3aed' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>{t.ticket_number || `#${t.id}`}</span>
                      <span className="text-xs truncate">{t.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.created_at)}</span>
                </Link>
              ))}
            </ResultSection>
          )}

          {/* Customers */}
          {(results.customers || []).length > 0 && (
            <ResultSection title="Customers" icon={Users} color="#2563eb" viewAllLink={`/customers?q=${encodeURIComponent(query)}`}>
              {results.customers.map(c => (
                <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}>
                    {(c.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.email}</p>
                  </div>
                  <span className="badge bg-gray-100 text-gray-700 capitalize text-[10px]">{c.role}</span>
                </Link>
              ))}
            </ResultSection>
          )}

          {/* Orders */}
          {(results.orders || []).length > 0 && (
            <ResultSection title="Orders" icon={ShoppingBag} color="#16a34a" viewAllLink={`/orders?q=${encodeURIComponent(query)}`}>
              {results.orders.map(o => (
                <Link key={o.id} to={`/orders/${o.order_id || o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                  <ShoppingBag size={13} style={{ color: '#16a34a' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>{o.order_id}</span>
                      <span className="text-xs truncate">{o.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="badge bg-blue-100 text-blue-800 capitalize text-[10px]">{o.status}</span>
                      <span className="badge capitalize text-[10px]" style={{ background: o.payment_status === 'paid' ? '#dcfce7' : '#fee2e2', color: o.payment_status === 'paid' ? '#15803d' : '#dc2626' }}>{o.payment_status}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatCurrency(o.total)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(o.created_at)}</span>
                </Link>
              ))}
            </ResultSection>
          )}

          {/* Sellers */}
          {(results.sellers || []).length > 0 && (
            <ResultSection title="Sellers" icon={Store} color="#d97706" viewAllLink={`/sellers?q=${encodeURIComponent(query)}`}>
              {results.sellers.map(s => (
                <Link key={s.id} to={`/sellers/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                  <Store size={13} style={{ color: '#d97706' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{s.brand_name || s.user_name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.email}</p>
                  </div>
                  <span className={`badge capitalize text-[10px] ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{s.status}</span>
                </Link>
              ))}
            </ResultSection>
          )}

          {/* Influencers */}
          {(results.influencers || []).length > 0 && (
            <ResultSection title="Influencers" icon={UserCheck} color="#be185d" viewAllLink={`/influencers?q=${encodeURIComponent(query)}`}>
              {results.influencers.map(inf => (
                <Link key={inf.id} to={`/influencers/${inf.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                  <UserCheck size={13} style={{ color: '#be185d' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{inf.display_name || inf.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>@{inf.username} · {inf.category}</p>
                  </div>
                  <span className={`badge capitalize text-[10px] ${inf.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{inf.status}</span>
                </Link>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, icon: Icon, color, viewAllLink, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <Link to={viewAllLink} className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
          View all →
        </Link>
      </div>
      <div className="divide-y divide-[var(--border)]">{children}</div>
    </div>
  );
}

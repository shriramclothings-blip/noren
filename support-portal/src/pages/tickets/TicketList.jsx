import React, { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Download, RefreshCw, X } from 'lucide-react';
import { getTickets } from '../../api/support';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { timeAgo, debounce, truncate } from '../../lib/utils';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';
import client from '../../api/client';

const STATUSES = ['', 'new', 'open', 'in_progress', 'waiting_customer', 'waiting_internal', 'escalated', 'resolved', 'closed', 'reopened'];
const PRIORITIES = ['', 'critical', 'urgent', 'high', 'normal', 'low'];
const CATEGORIES = ['', 'order', 'payment', 'account', 'return', 'technical', 'seller', 'influencer', 'other'];

export default function TicketList({ filter }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: '',
    assigned_to_me: filter === 'my' ? '1' : '',
    unassigned: filter === 'unassigned' ? '1' : '',
  });

  const LIMIT = 25;

  const load = useCallback(async (p = 1, q = search, f = filters) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT, search: q, ...f };
      if (filter === 'critical') params.priority = 'critical';
      if (filter === 'sla-risk') params.sla_risk = '1';
      const res = await getTickets(params);
      setTickets(res.data.tickets || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  }, [filter, search, filters]);

  useEffect(() => { load(1, search, filters); }, [filter]); // re-run when filter prop changes

  const debouncedSearch = useCallback(
    debounce((q) => load(1, q, filters), 400),
    [filters, load]
  );

  const handleSearch = (v) => {
    setSearch(v);
    debouncedSearch(v);
  };

  const handleFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    load(1, search, next);
  };

  const clearFilters = () => {
    const next = { status: '', priority: '', category: '', assigned_to_me: '', unassigned: '' };
    setFilters(next);
    setSearch('');
    load(1, '', next);
  };

  const hasFilters = Object.values(filters).some(Boolean) || search;

  const titleMap = {
    my: 'My Tickets',
    unassigned: 'Unassigned Tickets',
    critical: 'Critical Tickets',
    'sla-risk': 'SLA Risk',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{titleMap[filter] || 'All Tickets'}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => load(page)}>
            <RefreshCw size={12} />
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(s => !s)}>
            <Filter size={12} /> Filters {hasFilters && '•'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Ticket
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tickets, customers, orders…"
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

        {showFilters && (
          <div className="card p-3 flex flex-wrap gap-3 items-end">
            <Select
              label="Status"
              value={filters.status}
              onChange={v => handleFilter('status', v)}
              options={STATUSES.map(s => ({ value: s, label: s ? s.replace('_', ' ') : 'All statuses' }))}
              className="text-xs"
            />
            <Select
              label="Priority"
              value={filters.priority}
              onChange={v => handleFilter('priority', v)}
              options={PRIORITIES.map(p => ({ value: p, label: p || 'All priorities' }))}
              className="text-xs"
            />
            <Select
              label="Category"
              value={filters.category}
              onChange={v => handleFilter('category', v)}
              options={CATEGORIES.map(c => ({ value: c, label: c || 'All categories' }))}
              className="text-xs"
            />
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : tickets.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No tickets found"
            description={hasFilters ? 'Try adjusting your search or filters.' : 'No tickets yet.'}
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <Plus size={13} /> Create ticket
              </button>
            }
          />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Assigned</th>
                <th>SLA</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td>
                    <Link
                      to={`/tickets/${t.id}`}
                      className="text-xs font-mono font-semibold hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      {t.ticket_number || `#${t.id}`}
                    </Link>
                  </td>
                  <td className="max-w-xs">
                    <Link to={`/tickets/${t.id}`} className="hover:underline text-xs">
                      {truncate(t.subject, 55)}
                    </Link>
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td>
                    <div className="text-xs">
                      <div className="font-medium">{t.customer_name || t.name || '—'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{t.email}</div>
                    </div>
                  </td>
                  <td className="text-xs capitalize">{t.category?.replace('_', ' ') || '—'}</td>
                  <td className="text-xs">{t.assigned_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                  <td>
                    {t.sla_due_at ? (
                      <span className={`text-xs ${new Date(t.sla_due_at) < new Date() ? 'text-red-600 font-semibold' : ''}`}>
                        {timeAgo(t.sla_due_at)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex justify-end">
          <Pagination page={page} total={total} limit={LIMIT} onChange={p => load(p)} />
        </div>
      )}

      {/* Create modal */}
      <CreateTicketModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(1); }} />
    </div>
  );
}

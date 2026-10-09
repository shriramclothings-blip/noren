import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Shield, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportCSV } from '../utils/helpers';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  'Product Created': 'bg-green-100 text-green-700',
  'Product Updated': 'bg-blue-100 text-blue-700',
  'Product Deleted': 'bg-red-100 text-red-700',
  'Product Archived': 'bg-orange-100 text-orange-700',
  'Product Restored': 'bg-emerald-100 text-emerald-700',
  'Variant Added': 'bg-indigo-100 text-indigo-700',
  'Variant Updated': 'bg-blue-100 text-blue-700',
  'Variant Deleted': 'bg-red-100 text-red-700',
  'Stock Added': 'bg-green-100 text-green-700',
  'Manual Stock Adjustment': 'bg-amber-100 text-amber-700',
  'Return Created': 'bg-purple-100 text-purple-700',
  'Transfer Created': 'bg-sky-100 text-sky-700',
  'Invoice Adjusted': 'bg-amber-100 text-amber-700',
  'Soft Delete': 'bg-red-100 text-red-700',
  'Restore': 'bg-green-100 text-green-700',
  'Permanent Delete': 'bg-red-200 text-red-800',
};

export default function AuditLogs() {
  const { fetchAuditLogs } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const all = await fetchAuditLogs();
      // Sort newest first
      setLogs((all || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const actions = useMemo(() => ['all', ...Array.from(new Set(logs.map(l => l.action).filter(Boolean)))], [logs]);

  const filtered = useMemo(() => logs.filter(log => {
    const matchAction = filterAction === 'all' || log.action === filterAction;
    const q = search.toLowerCase();
    const matchSearch = !q || (log.action || '').toLowerCase().includes(q) ||
      (log.entityType || '').toLowerCase().includes(q) ||
      (log.userName || '').toLowerCase().includes(q) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(q);
    return matchAction && matchSearch;
  }), [logs, search, filterAction]);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      }).format(new Date(d));
    } catch { return d; }
  };

  const exportLogs = () => {
    exportCSV(filtered.map(l => ({
      Date: formatDate(l.date),
      Action: l.action,
      EntityType: l.entityType,
      EntityId: l.entityId,
      User: l.userName || l.userId,
      Details: JSON.stringify(l.details || {}),
    })), `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={22} className="text-primary-600" /> Audit Logs
          </h1>
          <p className="text-sm text-gray-500">Every action tracked — product edits, stock changes, deletions, restores.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportLogs} className="btn-secondary"><Download size={16} /> Export CSV</button>
          <button onClick={load} className="btn-secondary"><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search actions, users, types..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-52" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          {actions.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
        </select>
      </div>

      <div className="text-xs text-gray-400">{filtered.length} log entries</div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin opacity-40" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="table-head">Date &amp; Time</th>
                  <th className="table-head">Action</th>
                  <th className="table-head">Type</th>
                  <th className="table-head">ID</th>
                  <th className="table-head">User</th>
                  <th className="table-head">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-10">No logs yet. Actions will appear here as you use the system.</td></tr>
                )}
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{formatDate(log.date)}</td>
                    <td className="table-cell">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-500 capitalize">{log.entityType}</td>
                    <td className="table-cell text-xs text-gray-400 font-mono">{log.entityId || '—'}</td>
                    <td className="table-cell text-sm font-medium">{log.userName || log.userId || 'System'}</td>
                    <td className="table-cell text-xs text-gray-400 max-w-[200px] truncate">
                      {Object.keys(log.details || {}).length > 0
                        ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

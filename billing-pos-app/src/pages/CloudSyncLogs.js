import React, { useEffect, useState, useCallback } from 'react';
import { getSyncLogs, getCloudSyncSummary } from '../utils/cloudSyncService';
import { Download, RefreshCw, Filter, CheckCircle2, XCircle, Clock, Activity, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const FILTERS = [
  { key: 'all', label: 'All Logs' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'failed', label: 'Failed Only' },
];

const STATUS_ICON = {
  success: <CheckCircle2 size={14} className="text-emerald-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
  processing: <Clock size={14} className="text-amber-500" />,
  queued: <Activity size={14} className="text-sky-500" />,
  unknown: <AlertCircle size={14} className="text-gray-400" />,
};

const STATUS_BADGE = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  processing: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  queued: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export default function CloudSyncLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ queueCount: 0, pendingRecords: 0, syncedRecords: 0, failedRecords: 0 });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, sum] = await Promise.all([getSyncLogs(filter), getCloudSyncSummary()]);
      const sorted = [...(rows || [])].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      setLogs(sorted.slice(0, 500));
      setSummary(sum);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleExport = () => {
    try {
      const data = JSON.stringify(logs, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloud-sync-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Logs exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const getStatusKey = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'success') return 'success';
    if (s === 'failed' || s === 'error') return 'failed';
    if (s === 'processing') return 'processing';
    if (s === 'queued') return 'queued';
    return 'unknown';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cloud Sync Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Complete audit trail of all synchronization activity.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLogs} className="btn-secondary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Queue Size', value: summary.queueCount, color: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200' },
          { label: 'Pending', value: summary.pendingRecords, color: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
          { label: 'Synced', value: summary.syncedRecords, color: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Failed', value: summary.failedRecords, color: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
        ].map((item) => (
          <div key={item.label} className={`rounded-2xl p-4 ${item.color}`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.text}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={16} className="text-gray-400" />
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? 'bg-primary-600 text-white shadow'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400">{logs.length} entries</span>
      </div>

      {/* Logs table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <tr>
                {['Date & Time', 'Event', 'Entity', 'Record ID', 'Action', 'Status', 'Code', 'Details'].map((h) => (
                  <th key={h} className="table-head text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading && (
                <tr><td colSpan={8} className="table-cell text-center py-12 text-gray-400">Loading logs…</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center py-12 text-gray-400">No sync logs found for the selected filter.</td></tr>
              )}
              {!loading && logs.map((log, idx) => {
                const sk = getStatusKey(log.status);
                return (
                  <tr key={log.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="table-cell whitespace-nowrap text-xs text-gray-500">
                      {log.dateTime ? new Date(log.dateTime).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{log.eventType || '—'}</span>
                    </td>
                    <td className="table-cell">
                      <span className="capitalize">{log.entity || '—'}</span>
                    </td>
                    <td className="table-cell text-xs text-gray-500">{log.recordId || '—'}</td>
                    <td className="table-cell">
                      <span className="capitalize">{log.action || '—'}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[sk]}`}>
                        {STATUS_ICON[sk]}
                        {log.status || '—'}
                      </span>
                    </td>
                    <td className="table-cell text-xs">{log.responseCode || '—'}</td>
                    <td className="table-cell max-w-xs">
                      {log.errorDetails ? (
                        <span className="text-xs text-red-500 break-all">{String(log.errorDetails).slice(0, 150)}</span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

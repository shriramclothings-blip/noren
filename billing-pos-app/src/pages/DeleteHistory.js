import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';

const ENTITY_LABELS = {
  product: 'Product',
  variant: 'Variant',
  stockEntry: 'Stock Entry',
  stockTransfer: 'Transfer',
  return: 'Return',
  exchange: 'Exchange',
  adjustment: 'Adjustment',
};

export default function DeleteHistory() {
  const { fetchSoftDeletes, restoreDeletedRecord, permanentlyDelete, loadAll } = useApp();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const all = await fetchSoftDeletes();
      setRecords(all || []);
    } catch { toast.error('Failed to load deleted records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter(r => r.entityType === filter);
  }, [records, filter]);

  const handleRestore = async (id) => {
    if (!window.confirm('Restore this record? It will be put back in the system.')) return;
    try {
      await restoreDeletedRecord(id);
      await loadAll();
      toast.success('Record restored');
      load();
    } catch (err) { toast.error(err?.message || 'Restore failed'); }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('PERMANENTLY delete this record? This cannot be undone.')) return;
    try {
      await permanentlyDelete(id);
      toast.success('Permanently deleted');
      load();
    } catch (err) { toast.error(err?.message || 'Delete failed'); }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      }).format(new Date(d));
    } catch { return d; }
  };

  const parseData = (jsonStr) => {
    try { return JSON.parse(jsonStr || '{}'); } catch { return {}; }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delete History</h1>
          <p className="text-sm text-gray-500">Soft-deleted records. Restore or permanently remove them.</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'product', 'variant', 'stockEntry', 'stockTransfer', 'return', 'adjustment'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : ENTITY_LABELS[f] || f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin opacity-40" />
          <p>Loading...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="table-head">Type</th>
                  <th className="table-head">Name / Details</th>
                  <th className="table-head">Deleted By</th>
                  <th className="table-head">Deleted At</th>
                  <th className="table-head">Reason</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-cell text-center text-gray-400 py-12">
                      <Package size={36} className="mx-auto mb-2 opacity-20" />
                      No deleted records found
                    </td>
                  </tr>
                )}
                {filtered.map(record => {
                  const data = parseData(record.entityData);
                  const displayName = data.name || data.label || data.productName || data.invoiceNumber || `ID: ${record.entityId || record.id}`;
                  return (
                    <tr key={record.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${record.restored ? 'opacity-50' : ''}`}>
                      <td className="table-cell">
                        <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300">
                          {ENTITY_LABELS[record.entityType] || record.entityType}
                        </span>
                      </td>
                      <td className="table-cell font-medium">{displayName}</td>
                      <td className="table-cell text-sm text-gray-500">{record.deletedBy || '—'}</td>
                      <td className="table-cell text-xs text-gray-500">{formatDate(record.deletedAt)}</td>
                      <td className="table-cell text-xs text-gray-400">{record.reason || '—'}</td>
                      <td className="table-cell">
                        {record.restored ? (
                          <span className="badge-green">Restored</span>
                        ) : (
                          <span className="badge-red">Deleted</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          {!record.restored && (
                            <button onClick={() => handleRestore(record.id)}
                              className="btn-secondary text-xs py-1 px-2 text-green-600 border-green-200 hover:bg-green-50">
                              <RotateCcw size={12} /> Restore
                            </button>
                          )}
                          <button onClick={() => handlePermanentDelete(record.id)}
                            className="btn-secondary text-xs py-1 px-2 text-red-500 border-red-200 hover:bg-red-50">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Deleted records are kept here for safety. They do not appear in reports or inventory. <strong>Restore</strong> puts them back in the system. <strong>Permanent Delete</strong> removes them forever.</span>
      </div>
    </div>
  );
}

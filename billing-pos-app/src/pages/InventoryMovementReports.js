/**
 * InventoryMovementReports — Full audit trail for all stock movements.
 *
 * Movement types tracked:
 *   Purchase In, Sale Out, Return In, Damage Out, Manual Adjustment, Transfer
 *
 * Features:
 * - Search by product, type, batch number
 * - Filter by movement type and date range
 * - Per-product movement drill-down
 * - Export to CSV
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { exportCSV } from '../utils/helpers';
import {
  Activity, Search, Download, RefreshCw, TrendingUp, TrendingDown,
  Package, Filter, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MOVEMENT_TYPES = [
  'All Types',
  'Purchase In',
  'Sale Out',
  'Return In',
  'Damage Out',
  'Manual Adjustment',
  'Transfer',
];

const TYPE_COLORS = {
  'Purchase In':      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Sale Out':         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Return In':        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Damage Out':       'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Manual Adjustment':'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Transfer':         'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function InventoryMovementReports() {
  const { products, variants, suppliers, fetchAllStockMovements } = useApp();

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllStockMovements();
      setMovements(
        (data || []).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
      );
    } catch {
      toast.error('Failed to load movements');
    } finally {
      setLoading(false);
    }
  }, [fetchAllStockMovements]);

  useEffect(() => { loadMovements(); }, [loadMovements]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getProductName = useCallback((productId) =>
    products.find((p) => String(p.id) === String(productId))?.name || `Product #${productId}`,
  [products]);

  const getVariantLabel = useCallback((productId, variantId) => {
    if (!variantId) return '—';
    const prod = products.find((p) => String(p.id) === String(productId));
    const inlineVariant = Array.isArray(prod?.variants)
      ? prod.variants.find((v) => String(v.id) === String(variantId))
      : null;
    if (inlineVariant) {
      return [inlineVariant.size, inlineVariant.color].filter(Boolean).join(' / ') || 'Default';
    }
    const storeVariant = variants.find((v) => String(v.id) === String(variantId));
    return storeVariant?.label || storeVariant?.sku || `Variant #${variantId}`;
  }, [products, variants]);

  const getSupplierName = useCallback((id) =>
    (suppliers || []).find((s) => String(s.id) === String(id))?.name || (id ? `Supplier #${id}` : '—'),
  [suppliers]);

  // ── Filtered movements ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return movements.filter((m) => {
      const productName = getProductName(m.productId).toLowerCase();
      const variantLabel = getVariantLabel(m.productId, m.variantId).toLowerCase();
      const matchSearch =
        !q ||
        productName.includes(q) ||
        variantLabel.includes(q) ||
        (m.type || '').toLowerCase().includes(q) ||
        (m.batchNumber || '').toLowerCase().includes(q) ||
        (m.reason || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q);

      const matchType = filterType === 'All Types' || m.type === filterType;

      const movDate = m.date ? new Date(m.date).toISOString().split('T')[0] : '';
      const matchFrom = !dateFrom || movDate >= dateFrom;
      const matchTo = !dateTo || movDate <= dateTo;

      return matchSearch && matchType && matchFrom && matchTo;
    });
  }, [movements, search, filterType, dateFrom, dateTo, getProductName, getVariantLabel]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalIn = filtered
      .filter((m) => ['Purchase In', 'Return In'].includes(m.type) ||
        (m.type === 'Manual Adjustment' && Number(m.quantity) > 0))
      .reduce((s, m) => s + Math.abs(Number(m.quantity) || 0), 0);

    const totalOut = filtered
      .filter((m) => ['Sale Out', 'Damage Out'].includes(m.type) ||
        (m.type === 'Manual Adjustment' && Number(m.quantity) < 0))
      .reduce((s, m) => s + Math.abs(Number(m.quantity) || 0), 0);

    const byType = MOVEMENT_TYPES.slice(1).reduce((acc, t) => {
      acc[t] = filtered.filter((m) => m.type === t).length;
      return acc;
    }, {});

    return { totalIn, totalOut, total: filtered.length, byType };
  }, [filtered]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((m) => ({
      Date: m.date ? new Date(m.date).toLocaleDateString('en-IN') : '—',
      Type: m.type || '—',
      Product: getProductName(m.productId),
      Variant: getVariantLabel(m.productId, m.variantId),
      'Batch #': m.batchNumber || '—',
      Quantity: Number(m.quantity) >= 0 ? `+${m.quantity}` : m.quantity,
      'Cost Price': m.costPrice || '—',
      Supplier: getSupplierName(m.supplierId),
      Reason: m.reason || '—',
      Notes: m.notes || '—',
      'Created By': m.createdBy || '—',
    }));
    exportCSV(rows, `stock-movements-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${rows.length} records`);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterType('All Types');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || filterType !== 'All Types' || dateFrom || dateTo;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inventory Movement Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Full audit trail — Purchase In · Sale Out · Returns · Damage · Adjustments
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary" title="Export CSV">
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={loadMovements}
            className="btn-secondary"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Activity size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Movement Records</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{stats.totalIn}</p>
            <p className="text-xs text-gray-400">Units In</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-red-500">{stats.totalOut}</p>
            <p className="text-xs text-gray-400">Units Out</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <Package size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-purple-600">{stats.byType['Manual Adjustment'] || 0}</p>
            <p className="text-xs text-gray-400">Adjustments</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8"
              placeholder="Search product, batch, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select
              className="input"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              className="input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From date"
              title="From date"
            />
          </div>
          <div>
            <input
              className="input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To date"
              title="To date"
            />
          </div>
        </div>

        {/* Type breakdown chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {MOVEMENT_TYPES.slice(1).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? 'All Types' : t)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterType === t
                  ? TYPE_COLORS[t] + ' border-transparent'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
              }`}
            >
              {t} ({stats.byType[t] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Showing <span className="font-bold text-primary-600">{filtered.length}</span> movements
          </p>
          {loading && (
            <RefreshCw size={14} className="animate-spin text-gray-400" />
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Date', 'Type', 'Product', 'Variant', 'Batch #', 'Qty Change', 'Cost', 'Supplier / Reason', 'Notes', 'By'].map((h) => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="table-cell text-center text-gray-400 py-16">
                    <Activity size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No movement records found</p>
                    <p className="text-xs mt-1">
                      {hasFilters ? 'Try adjusting filters' : 'Stock movements will appear here as purchases and sales are recorded'}
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((m) => {
                const qty = Number(m.quantity) || 0;
                const incoming = ['Purchase In', 'Return In'].includes(m.type) ||
                  (m.type === 'Manual Adjustment' && qty > 0);
                return (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="table-cell text-gray-500 text-xs whitespace-nowrap">
                      {m.date ? new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[m.type] || 'bg-gray-100 text-gray-600'}`}>
                        {m.type || '—'}
                      </span>
                    </td>
                    <td className="table-cell font-medium max-w-[140px] truncate">
                      {getProductName(m.productId)}
                    </td>
                    <td className="table-cell text-gray-500 text-xs">
                      {getVariantLabel(m.productId, m.variantId)}
                    </td>
                    <td className="table-cell font-mono text-xs text-primary-600">
                      {m.batchNumber || '—'}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`font-bold ${incoming ? 'text-green-600' : 'text-red-500'}`}>
                        {incoming ? '+' : '-'}{Math.abs(qty)}
                      </span>
                    </td>
                    <td className="table-cell text-gray-600 text-xs">
                      {m.costPrice ? `₹${Number(m.costPrice).toFixed(2)}` : '—'}
                    </td>
                    <td className="table-cell text-gray-500 text-xs max-w-[120px] truncate">
                      {getSupplierName(m.supplierId) !== '—'
                        ? getSupplierName(m.supplierId)
                        : (m.reason || '—')}
                    </td>
                    <td className="table-cell text-gray-400 text-xs max-w-[100px] truncate">
                      {m.notes || '—'}
                    </td>
                    <td className="table-cell text-gray-400 text-xs">
                      {m.createdBy || '—'}
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

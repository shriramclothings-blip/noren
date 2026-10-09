import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { dbAdd, dbGetAll } from '../db/db';
import { exportToExcel } from '../utils/exportUtils';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  Upload, Download, AlertTriangle, TrendingDown, BarChart2,
  RefreshCw, Search, Package,
  ArrowUp, ArrowDown, Clock, CheckCircle, FileText,
} from 'lucide-react';

const TABS = [
  { key: 'bulk',      label: 'Bulk Stock Update',    icon: Upload },
  { key: 'history',   label: 'Stock Movement History', icon: Clock },
  { key: 'lowstock',  label: 'Low Stock Dashboard',  icon: AlertTriangle },
  { key: 'deadstock', label: 'Dead Stock Finder',    icon: TrendingDown },
  { key: 'valuation', label: 'Stock Valuation',      icon: BarChart2 },
];

const REASON_CODES = ['Purchase', 'Return', 'Damage', 'Adjustment', 'Transfer', 'Opening Stock'];
const DEAD_DAYS_OPTIONS = [30, 60, 90];

function fmt(n, cur = '₹') {
  return `${cur}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Bulk Stock Update
// ─────────────────────────────────────────────────────────────────────────────
function BulkStockUpdate({ products, onStockUpdated, currentUser }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState([]);
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason]   = useState('Purchase');

  const downloadTemplate = () => {
    const rows = products.map(p => ({
      SKU:          p.sku || '',
      ProductName:  p.name || '',
      Barcode:      p.barcode || '',
      CurrentStock: p.stock ?? 0,
      AddQty:       0,
      NewStock:     '',
      CostPrice:    p.costPrice ?? 0,
      Note:         '',
    }));
    exportToExcel(rows, `stock-update-template-${new Date().toISOString().split('T')[0]}.xlsx`, 'StockUpdate');
    toast.success('Template downloaded');
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const rows = [];
        const errs = [];

        raw.forEach((row, idx) => {
          const sku     = String(row.SKU || '').trim();
          const addQty  = Number(row.AddQty || 0);
          const newStk  = row.NewStock !== '' ? Number(row.NewStock) : null;
          const product = products.find(p => p.sku?.toLowerCase() === sku.toLowerCase() ||
                                             p.barcode === String(row.Barcode || '').trim());

          if (!product) {
            errs.push(`Row ${idx + 2}: SKU "${sku}" not found`);
            return;
          }
          if (addQty === 0 && newStk === null) {
            errs.push(`Row ${idx + 2}: AddQty and NewStock both empty — skipped`);
            return;
          }

          const finalStock = newStk !== null ? newStk : (product.stock ?? 0) + addQty;
          rows.push({
            product,
            sku,
            addQty,
            newStk,
            finalStock,
            note:      String(row.Note || ''),
            costPrice: Number(row.CostPrice || product.costPrice || 0),
          });
        });

        setPreview(rows);
        setErrors(errs);
      } catch (err) {
        toast.error('Failed to read Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const applyUpdates = async () => {
    if (!preview.length) return;
    setLoading(true);
    let success = 0;
    try {
      for (const row of preview) {
        const delta = row.finalStock - (row.product.stock ?? 0);
        await dbAdd('stockMovements', {
          productId:   row.product.id,
          productName: row.product.name,
          sku:         row.sku,
          reason,
          delta,
          before:      row.product.stock ?? 0,
          after:       row.finalStock,
          note:        row.note,
          addedBy:     currentUser?.name || 'Unknown',
          addedByRole: currentUser?.role || '',
          date:        new Date().toISOString(),
        });
        success++;
      }
      onStockUpdated(preview.map(r => ({
        id:        r.product.id,
        stock:     r.finalStock,
        costPrice: r.costPrice,
      })));
      toast.success(`${success} products updated successfully`);
      setPreview([]);
      setErrors([]);
    } catch (err) {
      toast.error('Update failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="label text-xs">Reason Code</label>
          <select className="input text-sm" value={reason} onChange={e => setReason(e.target.value)}>
            {REASON_CODES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary gap-2 mt-5">
          <Download size={15} /> Download Template
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-primary gap-2 mt-5">
          <Upload size={15} /> Upload Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300 space-y-1">
        <p className="font-semibold">How to use:</p>
        <ol className="list-decimal ml-4 space-y-0.5 text-xs">
          <li>Download the template — it has all your products pre-filled</li>
          <li>Fill <strong>AddQty</strong> (adds to current stock) OR <strong>NewStock</strong> (sets exact stock)</li>
          <li>Select reason code and upload</li>
          <li>Review preview → click Apply</li>
        </ol>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm font-semibold text-red-600 mb-1">Issues found ({errors.length}):</p>
          {errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
        </div>
      )}

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="font-semibold text-sm">{preview.length} products ready to update</p>
            <button
              onClick={applyUpdates}
              disabled={loading}
              className="btn-primary btn-sm gap-2"
            >
              <CheckCircle size={14} /> {loading ? 'Applying...' : 'Apply Updates'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['SKU', 'Product', 'Before', 'Change', 'After', 'Cost Price', 'Note'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {preview.map((row, i) => {
                  const delta = row.finalStock - (row.product.stock ?? 0);
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell font-mono text-xs">{row.sku}</td>
                      <td className="table-cell font-medium">{row.product.name}</td>
                      <td className="table-cell">{row.product.stock ?? 0}</td>
                      <td className="table-cell">
                        <span className={`font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {delta >= 0 ? '+' : ''}{delta}
                        </span>
                      </td>
                      <td className="table-cell font-bold">{row.finalStock}</td>
                      <td className="table-cell">{fmt(row.costPrice)}</td>
                      <td className="table-cell text-xs text-gray-400">{row.note || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Stock Movement History
// ─────────────────────────────────────────────────────────────────────────────
function StockHistory({ products }) {
  const [movements, setMovements]   = useState([]);
  const [search, setSearch]         = useState('');
  const [filterReason, setFilterReason] = useState('All');

  const load = async () => {
    const all = await dbGetAll('stockMovements');
    setMovements(all.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  React.useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return movements.filter(m => {
      const matchSearch = !search ||
        m.productName?.toLowerCase().includes(search.toLowerCase()) ||
        m.sku?.toLowerCase().includes(search.toLowerCase());
      const matchReason = filterReason === 'All' || m.reason === filterReason;
      return matchSearch && matchReason;
    });
  }, [movements, search, filterReason]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="Search product / SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm" value={filterReason} onChange={e => setFilterReason(e.target.value)}>
          <option value="All">All Reasons</option>
          {REASON_CODES.map(r => <option key={r}>{r}</option>)}
        </select>
        <button onClick={load} className="btn-secondary btn-sm gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
        <button
          onClick={() => exportToExcel(filtered.map(m => ({
            Date: new Date(m.date).toLocaleString('en-IN'),
            Product: m.productName,
            SKU: m.sku,
            Reason: m.reason,
            Before: m.before,
            Change: m.delta >= 0 ? `+${m.delta}` : m.delta,
            After: m.after,
            AddedBy: m.addedBy || '—',
            Note: m.note || '',
          })), `stock-history-${new Date().toISOString().split('T')[0]}.xlsx`, 'History')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="font-semibold text-sm">{filtered.length} records</p>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p>No stock movements recorded yet</p>
            <p className="text-xs mt-1">Movements are recorded when you use Bulk Stock Update</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Date & Time', 'Product', 'SKU', 'Reason', 'Before', 'Change', 'After', 'Added By', 'Note'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell text-xs text-gray-500">{new Date(m.date).toLocaleString('en-IN')}</td>
                    <td className="table-cell font-medium">{m.productName}</td>
                    <td className="table-cell font-mono text-xs">{m.sku}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.reason === 'Purchase'      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        m.reason === 'Damage'        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        m.reason === 'Return'        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>{m.reason}</span>
                    </td>
                    <td className="table-cell">{m.before}</td>
                    <td className="table-cell">
                      <span className={`flex items-center gap-1 font-semibold ${m.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {m.delta >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {m.delta >= 0 ? `+${m.delta}` : m.delta}
                      </span>
                    </td>
                    <td className="table-cell font-bold">{m.after}</td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-[9px]">
                          {(m.addedBy || '?')[0].toUpperCase()}
                        </span>
                        {m.addedBy || '—'}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-400">{m.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Low Stock Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function LowStockDashboard({ products, suppliers, invoices, company, setPage }) {
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const lowStock = useMemo(() => {
    return products
      .filter(p => {
        const threshold = p.minStock ?? 5;
        return p.stock <= threshold;
      })
      .filter(p => {
        const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
        const matchCat    = catFilter === 'All' || p.category === catFilter;
        return matchSearch && matchCat;
      })
      .map(p => {
        // Suggest reorder qty: avg monthly sales × 2
        const productSales = invoices.flatMap(inv => inv.items || []).filter(item => item.productId === p.id);
        const totalSold    = productSales.reduce((s, i) => s + (i.qty || 0), 0);
        const oldestInvoice = invoices.length > 0 ? invoices.reduce((oldest, inv) =>
          new Date(inv.date) < new Date(oldest.date) ? inv : oldest, invoices[0]) : null;
        const daysSinceFirst = oldestInvoice
          ? Math.max(1, Math.round((new Date() - new Date(oldestInvoice.date)) / (1000 * 60 * 60 * 24)))
          : 30;
        const avgMonthly    = Math.ceil((totalSold / daysSinceFirst) * 30);
        const reorderQty    = Math.max(avgMonthly * 2, (p.minStock ?? 5) * 3);

        return { ...p, reorderQty, totalSold };
      })
      .sort((a, b) => a.stock - b.stock);
  }, [products, search, catFilter, invoices]);

  const createPO = () => {
    toast.success('Purchase Order created — go to Purchases to complete it');
    setPage('purchases');
  };

  const outOfStock = lowStock.filter(p => p.stock === 0).length;
  const critical   = lowStock.filter(p => p.stock > 0 && p.stock <= 3).length;

  return (
    <div className="space-y-4">
      {/* Summary Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-red-500">
          <p className="text-2xl font-bold text-red-500">{outOfStock}</p>
          <p className="text-xs text-gray-400 mt-1">Out of Stock</p>
        </div>
        <div className="card p-4 border-l-4 border-orange-400">
          <p className="text-2xl font-bold text-orange-400">{critical}</p>
          <p className="text-xs text-gray-400 mt-1">Critical (≤3 left)</p>
        </div>
        <div className="card p-4 border-l-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-500">{lowStock.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total Low Stock</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={createPO} className="btn-primary btn-sm gap-2">
          <FileText size={14} /> Create Purchase Order
        </button>
        <button
          onClick={() => exportToExcel(lowStock.map(p => ({
            SKU: p.sku, Product: p.name, Category: p.category,
            Stock: p.stock, MinStock: p.minStock ?? 5,
            ReorderQty: p.reorderQty, TotalSold: p.totalSold,
          })), `low-stock-${new Date().toISOString().split('T')[0]}.xlsx`, 'LowStock')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {lowStock.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400 opacity-60" />
            <p className="text-green-500 font-medium">All products are well stocked!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Product', 'SKU', 'Category', 'Stock', 'Min Stock', 'Status', 'Sold (All Time)', 'Suggested Reorder'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {lowStock.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell font-mono text-xs">{p.sku}</td>
                    <td className="table-cell text-gray-500">{p.category || '—'}</td>
                    <td className="table-cell">
                      <span className={`font-bold text-base ${p.stock === 0 ? 'text-red-500' : p.stock <= 3 ? 'text-orange-500' : 'text-yellow-500'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="table-cell text-gray-400">{p.minStock ?? 5}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.stock === 0    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        p.stock <= 3     ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {p.stock === 0 ? 'Out of Stock' : p.stock <= 3 ? 'Critical' : 'Low'}
                      </span>
                    </td>
                    <td className="table-cell">{p.totalSold}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-primary-600">{p.reorderQty} units</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Dead Stock Finder
// ─────────────────────────────────────────────────────────────────────────────
function DeadStockFinder({ products, invoices, company }) {
  const [days, setDays]         = useState(60);
  const [search, setSearch]     = useState('');

  const deadStock = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return products
      .filter(p => p.stock > 0)
      .map(p => {
        const recentSales = invoices.filter(inv => new Date(inv.date) >= cutoff)
          .flatMap(inv => inv.items || [])
          .filter(item => item.productId === p.id);

        const soldRecently = recentSales.reduce((s, i) => s + (i.qty || 0), 0);
        const allSales     = invoices.flatMap(inv => inv.items || []).filter(item => item.productId === p.id);
        const lastSaleInv  = allSales.length > 0
          ? invoices.filter(inv => inv.items?.some(i => i.productId === p.id))
              .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
          : null;
        const daysSinceLastSale = lastSaleInv
          ? Math.round((new Date() - new Date(lastSaleInv.date)) / (1000 * 60 * 60 * 24))
          : null;

        return { ...p, soldRecently, daysSinceLastSale, neverSold: allSales.length === 0 };
      })
      .filter(p => p.soldRecently === 0)
      .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.daysSinceLastSale ?? 9999) - (a.daysSinceLastSale ?? 9999));
  }, [products, invoices, days, search]);

  const totalDeadValue = deadStock.reduce((s, p) => s + (p.stock * (p.costPrice || 0)), 0);
  const totalDeadRetail = deadStock.reduce((s, p) => s + (p.stock * (p.salePrice || p.price || 0)), 0);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs">No sales in last</label>
          <div className="flex gap-2">
            {DEAD_DAYS_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  days === d ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => exportToExcel(deadStock.map(p => ({
            SKU: p.sku, Product: p.name, Category: p.category,
            Stock: p.stock, CostPrice: p.costPrice,
            TotalCostValue: p.stock * (p.costPrice || 0),
            DaysSinceLastSale: p.daysSinceLastSale ?? 'Never',
          })), `dead-stock-${new Date().toISOString().split('T')[0]}.xlsx`, 'DeadStock')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-2xl font-bold text-red-500">{deadStock.length}</p>
          <p className="text-xs text-gray-400 mt-1">Dead Stock Items</p>
        </div>
        <div className="card p-4 border-l-4 border-orange-400">
          <p className="text-2xl font-bold text-orange-500">{fmt(totalDeadValue, company.currency)}</p>
          <p className="text-xs text-gray-400 mt-1">Blocked Capital (Cost)</p>
        </div>
        <div className="card p-4 border-l-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-500">{fmt(totalDeadRetail, company.currency)}</p>
          <p className="text-xs text-gray-400 mt-1">Potential Revenue (Retail)</p>
        </div>
      </div>

      {/* Suggestion Banner */}
      {deadStock.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
          <p className="font-semibold">💡 Suggestion:</p>
          <p className="text-xs mt-1">Consider running a <strong>{Math.round(10 + deadStock.length)}–30% discount</strong> on these {deadStock.length} items to free up {fmt(totalDeadValue, company.currency)} in blocked capital. Use the POS discount feature to apply.</p>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {deadStock.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <TrendingDown size={40} className="mx-auto mb-3 opacity-30" />
            <p>No dead stock found in last {days} days!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Product', 'SKU', 'Category', 'Stock', 'Last Sale', 'Cost Value', 'Retail Value', 'Action'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {deadStock.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell font-mono text-xs">{p.sku}</td>
                    <td className="table-cell text-gray-500">{p.category || '—'}</td>
                    <td className="table-cell font-bold">{p.stock}</td>
                    <td className="table-cell">
                      {p.neverSold ? (
                        <span className="text-red-500 text-xs font-medium">Never Sold</span>
                      ) : (
                        <span className="text-orange-500 text-xs">{p.daysSinceLastSale} days ago</span>
                      )}
                    </td>
                    <td className="table-cell text-red-500 font-medium">{fmt(p.stock * (p.costPrice || 0), company.currency)}</td>
                    <td className="table-cell text-green-600 font-medium">{fmt(p.stock * (p.salePrice || p.price || 0), company.currency)}</td>
                    <td className="table-cell">
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg font-medium">
                        Run Discount
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Stock Valuation Report
// ─────────────────────────────────────────────────────────────────────────────
function StockValuation({ products, company }) {
  const [catFilter, setCatFilter] = useState('All');
  const [search, setSearch]       = useState('');

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const rows = useMemo(() => {
    return products
      .filter(p => p.stock > 0)
      .filter(p => catFilter === 'All' || p.category === catFilter)
      .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))
      .map(p => ({
        ...p,
        costValue:   (p.stock ?? 0) * (p.costPrice  || 0),
        retailValue: (p.stock ?? 0) * (p.salePrice  || p.price || 0),
        profit:      (p.stock ?? 0) * ((p.salePrice || p.price || 0) - (p.costPrice || 0)),
        margin:      p.costPrice > 0
          ? (((p.salePrice || p.price || 0) - p.costPrice) / p.costPrice) * 100
          : 0,
      }))
      .sort((a, b) => b.costValue - a.costValue);
  }, [products, catFilter, search]);

  const totals = useMemo(() => ({
    cost:   rows.reduce((s, r) => s + r.costValue,   0),
    retail: rows.reduce((s, r) => s + r.retailValue, 0),
    profit: rows.reduce((s, r) => s + r.profit,      0),
    units:  rows.reduce((s, r) => s + (r.stock ?? 0), 0),
  }), [rows]);

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const map = {};
    products.filter(p => p.stock > 0).forEach(p => {
      const cat = p.category || 'Uncategorised';
      if (!map[cat]) map[cat] = { cost: 0, retail: 0, count: 0 };
      map[cat].cost   += (p.stock ?? 0) * (p.costPrice || 0);
      map[cat].retail += (p.stock ?? 0) * (p.salePrice || 0);
      map[cat].count  += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
  }, [products]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-blue-500">
          <p className="text-xl font-bold text-blue-600">{fmt(totals.cost, company.currency)}</p>
          <p className="text-xs text-gray-400 mt-1">Total Cost Value</p>
        </div>
        <div className="card p-4 border-l-4 border-green-500">
          <p className="text-xl font-bold text-green-600">{fmt(totals.retail, company.currency)}</p>
          <p className="text-xs text-gray-400 mt-1">Total Retail Value</p>
        </div>
        <div className="card p-4 border-l-4 border-primary-500">
          <p className="text-xl font-bold text-primary-600">{fmt(totals.profit, company.currency)}</p>
          <p className="text-xs text-gray-400 mt-1">Potential Profit</p>
        </div>
        <div className="card p-4 border-l-4 border-purple-500">
          <p className="text-xl font-bold text-purple-600">{totals.units.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-1">Total Units in Stock</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card p-4">
        <p className="font-semibold text-sm mb-3">Category Breakdown</p>
        <div className="space-y-2">
          {catBreakdown.map(([cat, data]) => {
            const pct = totals.cost > 0 ? (data.cost / totals.cost) * 100 : 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{cat}</span>
                  <span className="text-gray-500">{fmt(data.cost, company.currency)} · {data.count} products</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          onClick={() => exportToExcel(rows.map(r => ({
            SKU: r.sku, Product: r.name, Category: r.category,
            Stock: r.stock, CostPrice: r.costPrice, SalePrice: r.salePrice,
            CostValue: r.costValue, RetailValue: r.retailValue,
            PotentialProfit: r.profit,
            Margin: `${r.margin.toFixed(1)}%`,
          })), `stock-valuation-${new Date().toISOString().split('T')[0]}.xlsx`, 'Valuation')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Product', 'SKU', 'Category', 'Stock', 'Cost Price', 'Sale Price', 'Cost Value', 'Retail Value', 'Profit', 'Margin'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {rows.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell font-mono text-xs">{p.sku}</td>
                  <td className="table-cell text-gray-500">{p.category || '—'}</td>
                  <td className="table-cell font-bold">{p.stock}</td>
                  <td className="table-cell">{fmt(p.costPrice, company.currency)}</td>
                  <td className="table-cell">{fmt(p.salePrice, company.currency)}</td>
                  <td className="table-cell text-blue-600 font-medium">{fmt(p.costValue, company.currency)}</td>
                  <td className="table-cell text-green-600 font-medium">{fmt(p.retailValue, company.currency)}</td>
                  <td className="table-cell text-primary-600 font-semibold">{fmt(p.profit, company.currency)}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${p.margin >= 30 ? 'text-green-600' : p.margin >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                <td className="table-cell" colSpan={6}>TOTAL</td>
                <td className="table-cell text-blue-600">{fmt(totals.cost, company.currency)}</td>
                <td className="table-cell text-green-600">{fmt(totals.retail, company.currency)}</td>
                <td className="table-cell text-primary-600">{fmt(totals.profit, company.currency)}</td>
                <td className="table-cell"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function StockManagement({ setPage }) {
  const { products, suppliers, invoices, company, updateProduct, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('bulk');

  const handleStockUpdated = async (updates) => {
    for (const u of updates) {
      const product = products.find(p => p.id === u.id);
      if (product) {
        await updateProduct({ ...product, stock: u.stock, costPrice: u.costPrice ?? product.costPrice });
      }
    }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Bulk updates · Movement history · Low stock · Dead stock · Valuation</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package size={16} />
          <span>{products.length} products</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === key
                ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'bulk'      && <BulkStockUpdate products={products} onStockUpdated={handleStockUpdated} currentUser={currentUser} />}
        {activeTab === 'history'   && <StockHistory products={products} />}
        {activeTab === 'lowstock'  && <LowStockDashboard products={products} suppliers={suppliers} invoices={invoices} company={company} setPage={setPage} />}
        {activeTab === 'deadstock' && <DeadStockFinder products={products} invoices={invoices} company={company} />}
        {activeTab === 'valuation' && <StockValuation products={products} company={company} />}
      </div>
    </div>
  );
}

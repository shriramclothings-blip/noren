import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import {
  Warehouse as WarehouseIcon, PackagePlus,
  ClipboardList, BarChart2, Search, RefreshCw, Download,
  ChevronDown, AlertTriangle,
  TrendingDown, ArrowRight, ArrowLeft, Edit3,
} from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, cur = '₹') =>
  `${cur}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABS = [
  { key: 'overview',   label: 'Stock Overview',       icon: WarehouseIcon },
  { key: 'receive',    label: 'Receive Stock',         icon: PackagePlus   },
  { key: 'move',       label: 'Move to Rack',          icon: ArrowRight    },
  { key: 'return',     label: 'Return to Warehouse',   icon: ArrowLeft     },
  { key: 'adjust',     label: 'Manual Adjustment',     icon: Edit3         },
  { key: 'history',    label: 'Movement History',      icon: ClipboardList },
  { key: 'valuation',  label: 'Stock Valuation',       icon: BarChart2     },
];

const MOVE_TYPE_LABELS = {
  RECEIVE:    { label: 'Received',           color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30'  },
  TO_RACK:    { label: 'Warehouse → Rack',   color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30'   },
  FROM_RACK:  { label: 'Rack → Warehouse',   color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30'},
  ADJUSTMENT: { label: 'Adjustment',         color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30'},
};

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ rows, company }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | low | zero | ok

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter(r => {
        const matchSearch = !q ||
          r.productName?.toLowerCase().includes(q) ||
          r.sku?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.variantLabel?.toLowerCase().includes(q);
        const wQty = r.warehouseQty;
        const matchFilter =
          filter === 'all'  ? true :
          filter === 'zero' ? wQty === 0 :
          filter === 'low'  ? (wQty > 0 && wQty <= 10) :
          filter === 'ok'   ? wQty > 10 : true;
        return matchSearch && matchFilter;
      });
  }, [rows, search, filter]);

  const totalWarehouse = rows.reduce((s, r) => s + r.warehouseQty, 0);
  const totalRack      = rows.reduce((s, r) => s + r.rackQty, 0);
  const totalCombined  = totalWarehouse + totalRack;

  const cur = company?.currency || '₹';
  const totalWarehouseVal = rows.reduce((s, r) => s + r.warehouseQty * (r.costPrice || 0), 0);
  const totalRackVal      = rows.reduce((s, r) => s + r.rackQty      * (r.costPrice || 0), 0);
  const totalCombinedVal  = totalWarehouseVal + totalRackVal;

  const handleExport = () => {
    const data = filtered.map(r => ({
      Product:        r.productName,
      Variant:        r.variantLabel || '—',
      SKU:            r.sku || '—',
      Category:       r.category || '—',
      'Warehouse Qty': r.warehouseQty,
      'Rack Qty':      r.rackQty,
      'Combined Qty':  r.warehouseQty + r.rackQty,
      'Cost Price':    r.costPrice || 0,
      'Warehouse Value': r.warehouseQty * (r.costPrice || 0),
      'Rack Value':      r.rackQty * (r.costPrice || 0),
      'Total Value':     (r.warehouseQty + r.rackQty) * (r.costPrice || 0),
    }));
    exportToExcel(data, `warehouse-overview-${new Date().toISOString().split('T')[0]}.xlsx`, 'WarehouseOverview');
    toast.success('Exported successfully');
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Warehouse Units"    value={totalWarehouse}               sub="In godown"       color="blue"   />
        <SummaryCard label="Rack Units"         value={totalRack}                    sub="On shop floor"   color="green"  />
        <SummaryCard label="Total Units"        value={totalCombined}                sub="Combined"        color="indigo" />
        <SummaryCard label="Warehouse Value"    value={fmt(totalWarehouseVal, cur)}  sub="At cost"         color="blue"   money />
        <SummaryCard label="Rack Value"         value={fmt(totalRackVal, cur)}       sub="At cost"         color="green"  money />
        <SummaryCard label="Total Value"        value={fmt(totalCombinedVal, cur)}   sub="Combined cost"   color="indigo" money />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search product, SKU…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 w-56 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          {['all','zero','low','ok'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                filter === f
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
              }`}>
              {f === 'all' ? 'All' : f === 'zero' ? 'Empty' : f === 'low' ? '≤10 Units' : 'Healthy'}
            </button>
          ))}
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Product','Variant','SKU','Category','Warehouse','Rack','Total','Cost','Warehouse Value','Rack Value','Total Value'].map(h => (
                  <th key={h} className="table-head whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">No products found.</td></tr>
              ) : filtered.map((r, i) => {
                const combined = r.warehouseQty + r.rackQty;
                const wVal = r.warehouseQty * (r.costPrice || 0);
                const rVal = r.rackQty * (r.costPrice || 0);
                const tVal = wVal + rVal;
                return (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium max-w-[160px] truncate">{r.productName}</td>
                    <td className="table-cell text-gray-500 text-xs">{r.variantLabel || '—'}</td>
                    <td className="table-cell font-mono text-xs">{r.sku || '—'}</td>
                    <td className="table-cell text-gray-500 text-xs">{r.category || '—'}</td>
                    <td className="table-cell">
                      <span className={`font-bold ${r.warehouseQty === 0 ? 'text-red-500' : r.warehouseQty <= 10 ? 'text-orange-500' : 'text-blue-600 dark:text-blue-400'}`}>
                        {r.warehouseQty}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`font-bold ${r.rackQty === 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        {r.rackQty}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-gray-700 dark:text-gray-200">{combined}</td>
                    <td className="table-cell text-gray-500">{fmt(r.costPrice || 0, cur)}</td>
                    <td className="table-cell text-blue-600 dark:text-blue-400">{fmt(wVal, cur)}</td>
                    <td className="table-cell text-green-600 dark:text-green-400">{fmt(rVal, cur)}</td>
                    <td className="table-cell font-semibold text-indigo-600 dark:text-indigo-400">{fmt(tVal, cur)}</td>
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

// ─── SummaryCard ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, money }) {
  const colors = {
    blue:   'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    green:  'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
    orange: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} border rounded-xl p-3`}>
      <p className="text-xs font-medium opacity-70 truncate">{label}</p>
      <p className={`font-bold mt-0.5 ${money ? 'text-base' : 'text-2xl'}`}>{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Product Selector ─────────────────────────────────────────────────────────
function ProductSelector({ products, warehouseStock, value, onChange, placeholder }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    const results = [];
    for (const p of products) {
      if (p.archived) continue;
      const varList = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [null];
      for (const v of varList) {
        const label = v ? (v.label || v.size || '') : '';
        const displayName = label ? `${p.name} — ${label}` : p.name;
        if (!q || displayName.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) {
          const wEntry = warehouseStock.find(w =>
            w.productId === p.id && (v ? String(w.variantId) === String(v.id) : !w.variantId)
          );
          results.push({ productId: p.id, variantId: v ? v.id : null, displayName, sku: p.sku, rackQty: v ? (v.stock || 0) : (p.stock || 0), warehouseQty: wEntry ? wEntry.qty : 0, costPrice: p.costPrice || 0 });
        }
      }
    }
    return results.slice(0, 80);
  }, [products, warehouseStock, search]);

  const selected = value ? rows.find(r => r.productId === value.productId && String(r.variantId || '') === String(value.variantId || '')) || value : null;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-left hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400">
        <span className={selected ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}>{selected ? selected.displayName : placeholder || 'Select product…'}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-72 overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg focus:outline-none" />
          </div>
          <div className="overflow-y-auto max-h-56">
            {rows.length === 0 ? <p className="text-center py-6 text-gray-400 text-sm">No products</p> : rows.map((r, i) => (
              <button key={i} type="button"
                onClick={() => { onChange(r); setOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{r.displayName}</span>
                  {r.sku && <span className="ml-2 text-xs text-gray-400 font-mono">{r.sku}</span>}
                </div>
                <div className="text-xs text-gray-400 flex gap-2">
                  <span>🏭 {r.warehouseQty}</span>
                  <span>🏪 {r.rackQty}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Receive Stock Tab ────────────────────────────────────────────────────────
function ReceiveStockTab({ products, warehouseStock, onReceive }) {
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { toast.error('Select a product'); return; }
    const q = Number(qty);
    if (!q || q <= 0) { toast.error('Enter a valid quantity'); return; }
    setLoading(true);
    try {
      await onReceive({ productId: selected.productId, variantId: selected.variantId, qty: q, notes });
      toast.success(`Received ${q} units into Warehouse`);
      setSelected(null); setQty(''); setNotes('');
    } catch (err) {
      toast.error(err.message || 'Failed to receive stock');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <PackagePlus size={20} className="text-green-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Receive Stock into Warehouse</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use this when stock arrives from a supplier or external source. It goes into the <strong>Warehouse / Godown</strong> first — not the rack.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product / Variant *</label>
            <ProductSelector products={products} warehouseStock={warehouseStock} value={selected} onChange={setSelected} placeholder="Select product to receive…" />
          </div>
          {selected && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm grid grid-cols-3 gap-2">
              <div><p className="text-xs text-gray-500">Warehouse</p><p className="font-bold text-blue-600">{selected.warehouseQty}</p></div>
              <div><p className="text-xs text-gray-500">Rack</p><p className="font-bold text-green-600">{selected.rackQty}</p></div>
              <div><p className="text-xs text-gray-500">Combined</p><p className="font-bold text-indigo-600">{selected.warehouseQty + selected.rackQty}</p></div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity to Receive *</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Batch #12, Supplier XYZ"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60">
            {loading ? 'Receiving…' : '✓ Receive into Warehouse'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Move to Rack Tab ─────────────────────────────────────────────────────────
function MoveToRackTab({ products, warehouseStock, onMove }) {
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const maxQty = selected ? selected.warehouseQty : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { toast.error('Select a product'); return; }
    const q = Number(qty);
    if (!q || q <= 0) { toast.error('Enter a valid quantity'); return; }
    if (q > maxQty) { toast.error(`Only ${maxQty} units available in warehouse`); return; }
    setLoading(true);
    try {
      await onMove({ productId: selected.productId, variantId: selected.variantId, qty: q, notes });
      toast.success(`Moved ${q} units to Rack`);
      setSelected(null); setQty(''); setNotes('');
    } catch (err) {
      toast.error(err.message || 'Failed to move stock');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight size={20} className="text-blue-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Move Warehouse → Rack</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Transfer stock from Warehouse (Godown) to the shop Rack. This makes the stock available for billing at POS.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product / Variant *</label>
            <ProductSelector products={products} warehouseStock={warehouseStock} value={selected} onChange={setSelected} placeholder="Select product to move…" />
          </div>
          {selected && (
            <div className="space-y-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm grid grid-cols-3 gap-2">
                <div><p className="text-xs text-gray-500">In Warehouse</p><p className="font-bold text-blue-600 text-lg">{selected.warehouseQty}</p></div>
                <div><p className="text-xs text-gray-500">On Rack</p><p className="font-bold text-green-600 text-lg">{selected.rackQty}</p></div>
                <div><p className="text-xs text-gray-500">After Move</p><p className="font-bold text-indigo-600 text-lg">{selected.rackQty + (Number(qty) || 0)}</p></div>
              </div>
              {maxQty === 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 text-sm">
                  <AlertTriangle size={15} /> No stock available in warehouse for this product.
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Quantity to Move * {selected && <span className="text-gray-400">(max: {maxQty})</span>}
            </label>
            <div className="flex gap-2">
              <input type="number" min="1" max={maxQty} value={qty} onChange={e => setQty(e.target.value)}
                placeholder="e.g. 20"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
              {selected && maxQty > 0 && (
                <button type="button" onClick={() => setQty(String(maxQty))}
                  className="px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100">
                  All ({maxQty})
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Morning restocking"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <button type="submit" disabled={loading || maxQty === 0}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60">
            {loading ? 'Moving…' : '→ Move to Rack'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Return to Warehouse Tab ──────────────────────────────────────────────────
function ReturnToWarehouseTab({ products, warehouseStock, onReturn }) {
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const maxQty = selected ? selected.rackQty : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { toast.error('Select a product'); return; }
    const q = Number(qty);
    if (!q || q <= 0) { toast.error('Enter a valid quantity'); return; }
    if (q > maxQty) { toast.error(`Only ${maxQty} units on rack`); return; }
    setLoading(true);
    try {
      await onReturn({ productId: selected.productId, variantId: selected.variantId, qty: q, notes });
      toast.success(`Moved ${q} units back to Warehouse`);
      setSelected(null); setQty(''); setNotes('');
    } catch (err) {
      toast.error(err.message || 'Failed to return stock');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ArrowLeft size={20} className="text-orange-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Return Rack → Warehouse</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Move excess rack stock back to Warehouse (Godown). Useful after a sale cancellation or seasonal rotation.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product / Variant *</label>
            <ProductSelector products={products} warehouseStock={warehouseStock} value={selected} onChange={setSelected} placeholder="Select product…" />
          </div>
          {selected && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-sm grid grid-cols-3 gap-2">
              <div><p className="text-xs text-gray-500">On Rack</p><p className="font-bold text-orange-600 text-lg">{selected.rackQty}</p></div>
              <div><p className="text-xs text-gray-500">In Warehouse</p><p className="font-bold text-blue-600 text-lg">{selected.warehouseQty}</p></div>
              <div><p className="text-xs text-gray-500">After Return</p><p className="font-bold text-indigo-600 text-lg">{selected.warehouseQty + (Number(qty) || 0)}</p></div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Quantity to Return * {selected && <span className="text-gray-400">(max: {maxQty})</span>}
            </label>
            <div className="flex gap-2">
              <input type="number" min="1" max={maxQty} value={qty} onChange={e => setQty(e.target.value)}
                placeholder="e.g. 10"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
              {selected && maxQty > 0 && (
                <button type="button" onClick={() => setQty(String(maxQty))}
                  className="px-3 py-2 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100">
                  All ({maxQty})
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Overstock rotation"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <button type="submit" disabled={loading || maxQty === 0}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60">
            {loading ? 'Returning…' : '← Return to Warehouse'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Manual Adjustment Tab ────────────────────────────────────────────────────
function ManualAdjustTab({ products, warehouseStock, onAdjust }) {
  const [selected, setSelected] = useState(null);
  const [newQty, setNewQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const currentWQty = selected ? selected.warehouseQty : 0;
  const delta = selected && newQty !== '' ? Number(newQty) - currentWQty : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { toast.error('Select a product'); return; }
    if (newQty === '' || Number(newQty) < 0) { toast.error('Enter a valid new warehouse quantity'); return; }
    setLoading(true);
    try {
      await onAdjust({ productId: selected.productId, variantId: selected.variantId, newQty: Number(newQty), notes });
      toast.success('Warehouse stock adjusted');
      setSelected(null); setNewQty(''); setNotes('');
    } catch (err) {
      toast.error(err.message || 'Adjustment failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Edit3 size={20} className="text-purple-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Manual Warehouse Adjustment</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Correct warehouse quantity after a physical count, damage write-off, or data correction. This only changes the warehouse count — rack stock is untouched.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product / Variant *</label>
            <ProductSelector products={products} warehouseStock={warehouseStock} value={selected} onChange={r => { setSelected(r); setNewQty(String(r.warehouseQty)); }} placeholder="Select product…" />
          </div>
          {selected && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-sm">
              <p className="text-xs text-gray-500 mb-1">Current Warehouse Quantity</p>
              <p className="font-bold text-purple-600 text-2xl">{currentWQty}</p>
              {delta !== null && (
                <p className={`text-xs mt-1 font-medium ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {delta > 0 ? `+${delta} units will be added` : delta < 0 ? `${Math.abs(delta)} units will be removed` : 'No change'}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New Warehouse Quantity *</label>
            <input type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)}
              placeholder="Enter corrected warehouse qty"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason / Notes *</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Physical count, damage write-off…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60">
            {loading ? 'Saving…' : '✓ Apply Adjustment'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Movement History Tab ─────────────────────────────────────────────────────
function MovementHistoryTab({ movements, company }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const sorted = useMemo(() =>
    [...movements].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)),
    [movements]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sorted.filter(m => {
      const matchSearch = !q || m.productName?.toLowerCase().includes(q) || m.variantLabel?.toLowerCase().includes(q) || (m.movedBy || '').toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q);
      const matchType = typeFilter === 'ALL' || m.type === typeFilter;
      const mDate = (m.date || m.createdAt || '').substring(0, 10);
      const matchFrom = !dateFrom || mDate >= dateFrom;
      const matchTo   = !dateTo   || mDate <= dateTo;
      return matchSearch && matchType && matchFrom && matchTo;
    });
  }, [sorted, search, typeFilter, dateFrom, dateTo]);

  const handleExport = () => {
    const data = filtered.map(m => ({
      Date:    new Date(m.date || m.createdAt).toLocaleString('en-IN'),
      Type:    MOVE_TYPE_LABELS[m.type]?.label || m.type,
      Product: m.productName,
      Variant: m.variantLabel || '—',
      From:    m.fromLocation,
      To:      m.toLocation,
      Qty:     m.qty,
      'Moved By': m.movedBy,
      Notes:   m.notes || '',
    }));
    exportToExcel(data, `warehouse-movements-${new Date().toISOString().split('T')[0]}.xlsx`, 'Movements');
    toast.success('Exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 w-48 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none">
            <option value="ALL">All Types</option>
            {Object.entries(MOVE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none" />
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
          <Download size={14} /> Export
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Date & Time','Type','Product','Variant','From','To','Qty','Moved By','Notes'].map(h => (
                  <th key={h} className="table-head whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No movements found.</td></tr>
              ) : filtered.map((m, i) => {
                const typeInfo = MOVE_TYPE_LABELS[m.type] || { label: m.type, color: 'text-gray-500', bg: 'bg-gray-100' };
                return (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{new Date(m.date || m.createdAt).toLocaleString('en-IN')}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>{typeInfo.label}</span>
                    </td>
                    <td className="table-cell font-medium max-w-[140px] truncate">{m.productName}</td>
                    <td className="table-cell text-gray-500 text-xs">{m.variantLabel || '—'}</td>
                    <td className="table-cell text-gray-500 text-xs">{m.fromLocation}</td>
                    <td className="table-cell text-gray-500 text-xs">{m.toLocation}</td>
                    <td className="table-cell font-bold text-gray-700 dark:text-gray-200">{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                    <td className="table-cell text-gray-500 text-xs">{m.movedBy || '—'}</td>
                    <td className="table-cell text-gray-400 text-xs max-w-[160px] truncate">{m.notes || '—'}</td>
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

// ─── Valuation Tab ────────────────────────────────────────────────────────────
function ValuationTab({ rows, company }) {
  const cur = company?.currency || '₹';

  const warehouseCost   = rows.reduce((s, r) => s + r.warehouseQty * (r.costPrice || 0), 0);
  const warehouseRetail = rows.reduce((s, r) => s + r.warehouseQty * (r.salePrice  || r.costPrice || 0), 0);
  const rackCost        = rows.reduce((s, r) => s + r.rackQty      * (r.costPrice || 0), 0);
  const rackRetail      = rows.reduce((s, r) => s + r.rackQty      * (r.salePrice  || r.costPrice || 0), 0);
  const totalCost       = warehouseCost   + rackCost;
  const totalRetail     = warehouseRetail + rackRetail;
  const potentialProfit = totalRetail - totalCost;

  const cards = [
    { label: 'Warehouse Cost Value',    value: fmt(warehouseCost,   cur), sub: 'At purchase cost',   color: 'blue'   },
    { label: 'Warehouse Retail Value',  value: fmt(warehouseRetail, cur), sub: 'At selling price',   color: 'blue'   },
    { label: 'Rack Cost Value',         value: fmt(rackCost,        cur), sub: 'At purchase cost',   color: 'green'  },
    { label: 'Rack Retail Value',       value: fmt(rackRetail,      cur), sub: 'At selling price',   color: 'green'  },
    { label: 'Total Combined Cost',     value: fmt(totalCost,       cur), sub: 'Warehouse + Rack',   color: 'indigo' },
    { label: 'Total Retail Value',      value: fmt(totalRetail,     cur), sub: 'If all sold',        color: 'indigo' },
    { label: 'Potential Gross Profit',  value: fmt(potentialProfit, cur), sub: 'Retail - Cost',      color: 'orange' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map(c => <SummaryCard key={c.label} {...c} money />)}
      </div>

      {/* Per-category breakdown */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Per-Category Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Category','Products','Warehouse Qty','Rack Qty','Total Qty','Warehouse Value','Rack Value','Total Value'].map(h => (
                  <th key={h} className="table-head whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {(() => {
                const cats = {};
                for (const r of rows) {
                  const cat = r.category || 'Uncategorized';
                  if (!cats[cat]) cats[cat] = { count: 0, wQty: 0, rQty: 0, wVal: 0, rVal: 0 };
                  cats[cat].count++;
                  cats[cat].wQty += r.warehouseQty;
                  cats[cat].rQty += r.rackQty;
                  cats[cat].wVal += r.warehouseQty * (r.costPrice || 0);
                  cats[cat].rVal += r.rackQty * (r.costPrice || 0);
                }
                return Object.entries(cats).sort((a, b) => b[1].wVal + b[1].rVal - (a[1].wVal + a[1].rVal)).map(([cat, d]) => (
                  <tr key={cat} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium">{cat}</td>
                    <td className="table-cell text-gray-500">{d.count}</td>
                    <td className="table-cell text-blue-600 font-semibold">{d.wQty}</td>
                    <td className="table-cell text-green-600 font-semibold">{d.rQty}</td>
                    <td className="table-cell font-bold text-gray-700 dark:text-gray-200">{d.wQty + d.rQty}</td>
                    <td className="table-cell text-blue-600">{fmt(d.wVal, cur)}</td>
                    <td className="table-cell text-green-600">{fmt(d.rVal, cur)}</td>
                    <td className="table-cell font-semibold text-indigo-600">{fmt(d.wVal + d.rVal, cur)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Warehouse Page ──────────────────────────────────────────────────────
export default function Warehouse() {
  const {
    products, warehouseStock, warehouseMovements, company,
    receiveToWarehouse, moveWarehouseToRack, moveRackToWarehouse,
    adjustWarehouseStockManual, loadAll,
  } = useApp();

  const [tab, setTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    toast.success('Refreshed');
  };

  // Build unified rows: one row per product×variant combination
  const rows = useMemo(() => {
    const result = [];
    const activeProducts = products.filter(p => !p.archived);
    for (const p of activeProducts) {
      const varList = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [null];
      for (const v of varList) {
        const variantId = v ? v.id : null;
        const wEntry = warehouseStock.find(w =>
          w.productId === p.id && (variantId ? String(w.variantId) === String(variantId) : !w.variantId)
        );
        result.push({
          productId:    p.id,
          variantId,
          productName:  p.name,
          variantLabel: v ? (v.label || v.size || '') : '',
          sku:          v ? (v.sku || p.sku || '') : (p.sku || ''),
          category:     p.category || '',
          costPrice:    v ? (v.costPrice || p.costPrice || 0) : (p.costPrice || 0),
          salePrice:    v ? (v.price    || p.price    || 0) : (p.price    || 0),
          rackQty:      v ? Number(v.stock || 0) : Number(p.stock || 0),
          warehouseQty: wEntry ? Number(wEntry.qty || 0) : 0,
        });
      }
    }
    return result;
  }, [products, warehouseStock]);

  // Alert counts
  const emptyWarehouse   = rows.filter(r => r.warehouseQty === 0).length;
  const lowWarehouse     = rows.filter(r => r.warehouseQty > 0 && r.warehouseQty <= 10).length;

  return (
    <div className="p-6 space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <WarehouseIcon size={22} className="text-primary-600" />
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Warehouse / Godown</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track stock in your godown separately from your shop rack. Inventory section remains unchanged.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {emptyWarehouse > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
              <AlertTriangle size={12} /> {emptyWarehouse} empty
            </span>
          )}
          {lowWarehouse > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
              <TrendingDown size={12} /> {lowWarehouse} low
            </span>
          )}
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 pb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
              tab === key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview'  && <OverviewTab rows={rows} company={company} />}
        {tab === 'receive'   && <ReceiveStockTab products={products} warehouseStock={warehouseStock} onReceive={receiveToWarehouse} />}
        {tab === 'move'      && <MoveToRackTab   products={products} warehouseStock={warehouseStock} onMove={moveWarehouseToRack} />}
        {tab === 'return'    && <ReturnToWarehouseTab products={products} warehouseStock={warehouseStock} onReturn={moveRackToWarehouse} />}
        {tab === 'adjust'    && <ManualAdjustTab products={products} warehouseStock={warehouseStock} onAdjust={adjustWarehouseStockManual} />}
        {tab === 'history'   && <MovementHistoryTab movements={warehouseMovements} company={company} />}
        {tab === 'valuation' && <ValuationTab rows={rows} company={company} />}
      </div>
    </div>
  );
}

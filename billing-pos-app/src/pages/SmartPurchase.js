import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/exportUtils';
import {
  Brain, Package, ShoppingCart, Star,
  Download, Plus, CheckCircle, Flame, Calendar,
  ArrowUpRight, ArrowDownRight, Minus, FileText, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n, cur = '₹') =>
  `${cur}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAvgMonthlySales(productId, invoices) {
  const items = invoices.flatMap(inv => inv.items || []).filter(i => i.productId === productId);
  const totalSold = items.reduce((s, i) => s + (i.qty || 0), 0);
  if (!invoices.length) return 0;
  const oldest = invoices.reduce((o, inv) => new Date(inv.date) < new Date(o.date) ? inv : o, invoices[0]);
  const days = Math.max(1, Math.round((Date.now() - new Date(oldest.date)) / 86400000));
  return (totalSold / days) * 30;
}

function getSeasonalDelta(productId, invoices) {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const prevYear = curYear - 1;

  const soldThisMonth = invoices
    .filter(inv => { const d = new Date(inv.date); return d.getMonth() === curMonth && d.getFullYear() === curYear; })
    .flatMap(inv => inv.items || [])
    .filter(i => i.productId === productId)
    .reduce((s, i) => s + (i.qty || 0), 0);

  const soldSameMonthLastYear = invoices
    .filter(inv => { const d = new Date(inv.date); return d.getMonth() === curMonth && d.getFullYear() === prevYear; })
    .flatMap(inv => inv.items || [])
    .filter(i => i.productId === productId)
    .reduce((s, i) => s + (i.qty || 0), 0);

  if (soldSameMonthLastYear === 0) return soldThisMonth > 0 ? 100 : 0;
  return Math.round(((soldThisMonth - soldSameMonthLastYear) / soldSameMonthLastYear) * 100);
}

// ─── TAB: Profit-Per-Unit Ranking ───────────────────────────────────────────
function ProfitRanking({ products, invoices, suppliers, company }) {
  const [catFilter, setCatFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const supplierNames = useMemo(() => ['All', ...new Set(suppliers.map(s => s.name).filter(Boolean))], [suppliers]);

  const ranked = useMemo(() => {
    return products
      .filter(p => catFilter === 'All' || p.category === catFilter)
      .filter(p => {
        if (supplierFilter === 'All') return true;
        const sup = suppliers.find(s => s.id === p.supplierId || s.name === supplierFilter);
        return sup ? (p.supplierId === sup.id) : false;
      })
      .map(p => {
        const salePrice = p.salePrice || p.price || 0;
        const costPrice = p.costPrice || 0;
        const profitPerUnit = salePrice - costPrice;
        const margin = costPrice > 0 ? ((profitPerUnit / costPrice) * 100) : 0;
        const avgMonthly = getAvgMonthlySales(p.id, invoices);
        const profitScore = profitPerUnit * avgMonthly;
        const seasonalDelta = getSeasonalDelta(p.id, invoices);
        return { ...p, salePrice, costPrice, profitPerUnit, margin, avgMonthly, profitScore, seasonalDelta };
      })
      .sort((a, b) => b.profitScore - a.profitScore);
  }, [products, invoices, catFilter, supplierFilter, suppliers]);

  const topScore = ranked[0]?.profitScore || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-emerald-500">
          <p className="text-2xl font-bold text-emerald-600">{ranked.length}</p>
          <p className="text-xs text-gray-400 mt-1">Products Analysed</p>
        </div>
        <div className="card p-4 border-l-4 border-primary-500">
          <p className="text-xl font-bold text-primary-600">{fmt(ranked[0]?.profitScore || 0, company.currency)}</p>
          <p className="text-xs text-gray-400 mt-1">Top Profit Score/Month</p>
        </div>
        <div className="card p-4 border-l-4 border-amber-500">
          <p className="text-2xl font-bold text-amber-600">
            {ranked.filter(p => p.seasonalDelta > 20).length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Seasonal Spikes This Month</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="input text-sm" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input text-sm" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
          {supplierNames.map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => exportToExcel(ranked.map(p => ({
            Rank: ranked.indexOf(p) + 1,
            Product: p.name, SKU: p.sku, Category: p.category,
            CostPrice: p.costPrice, SalePrice: p.salePrice,
            ProfitPerUnit: p.profitPerUnit.toFixed(2),
            MarginPct: `${p.margin.toFixed(1)}%`,
            AvgMonthlySales: p.avgMonthly.toFixed(1),
            ProfitScore: p.profitScore.toFixed(0),
            SeasonalDelta: `${p.seasonalDelta > 0 ? '+' : ''}${p.seasonalDelta}%`,
            CurrentStock: p.stock,
          })), `profit-ranking-${new Date().toISOString().split('T')[0]}.xlsx`, 'ProfitRanking')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          <span className="font-semibold text-sm">Products ranked by (Profit/Unit × Monthly Sales Volume)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Rank', 'Product', 'Category', 'Cost', 'Sale', 'Profit/Unit', 'Margin', 'Avg/Month', 'Profit Score', 'Seasonal', 'Stock'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {ranked.map((p, i) => (
                <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${i < 3 ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                  <td className="table-cell">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="table-cell font-medium">
                    {i < 3 && <Flame size={12} className="inline text-orange-500 mr-1" />}
                    {p.name}
                  </td>
                  <td className="table-cell text-gray-500">{p.category || '—'}</td>
                  <td className="table-cell">{fmt(p.costPrice, company.currency)}</td>
                  <td className="table-cell">{fmt(p.salePrice, company.currency)}</td>
                  <td className="table-cell font-semibold text-emerald-600">{fmt(p.profitPerUnit, company.currency)}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${p.margin >= 40 ? 'text-emerald-600' : p.margin >= 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="table-cell">{p.avgMonthly.toFixed(1)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(p.profitScore / topScore) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-primary-600">{fmt(p.profitScore, company.currency)}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    {p.seasonalDelta !== 0 && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${p.seasonalDelta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {p.seasonalDelta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {p.seasonalDelta > 0 ? '+' : ''}{p.seasonalDelta}%
                      </span>
                    )}
                    {p.seasonalDelta === 0 && <Minus size={12} className="text-gray-300" />}
                  </td>
                  <td className="table-cell font-bold">{p.stock ?? '∞'}</td>
                </tr>
              ))}
              {ranked.length === 0 && (
                <tr><td colSpan={11} className="table-cell text-center text-gray-400 py-12">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Seasonal Demand Predictor ─────────────────────────────────────────
function SeasonalPredictor({ products, invoices, company }) {
  const curMonth = useMemo(() => new Date().getMonth(), []);

  const seasonal = useMemo(() => {
    return products.map(p => {
      const monthlyData = MONTHS.map((_, mi) => {
        const years = [...new Set(invoices.map(inv => new Date(inv.date).getFullYear()))];
        const avgSold = years.length > 0
          ? years.reduce((sum, yr) => {
              const sold = invoices
                .filter(inv => { const d = new Date(inv.date); return d.getMonth() === mi && d.getFullYear() === yr; })
                .flatMap(inv => inv.items || [])
                .filter(i => i.productId === p.id)
                .reduce((s, i) => s + (i.qty || 0), 0);
              return sum + sold;
            }, 0) / years.length
          : 0;
        return avgSold;
      });

      const peakMonth = monthlyData.indexOf(Math.max(...monthlyData));
      const currentMonthAvg = monthlyData[curMonth];
      const prevMonthAvg = monthlyData[(curMonth - 1 + 12) % 12];
      const nextMonthAvg = monthlyData[(curMonth + 1) % 12];
      const isSpiking = currentMonthAvg > 0 && prevMonthAvg > 0 && currentMonthAvg > prevMonthAvg * 1.3;
      const willSpike = nextMonthAvg > currentMonthAvg * 1.3;

      return { ...p, monthlyData, peakMonth, currentMonthAvg, nextMonthAvg, isSpiking, willSpike };
    }).filter(p => p.monthlyData.some(v => v > 0))
      .sort((a, b) => b.currentMonthAvg - a.currentMonthAvg);
  }, [products, invoices, curMonth]);

  const spiking = seasonal.filter(p => p.isSpiking);
  const willSpike = seasonal.filter(p => p.willSpike);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 border-l-4 border-orange-500">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500" size={20} />
            <div>
              <p className="text-2xl font-bold text-orange-500">{spiking.length}</p>
              <p className="text-xs text-gray-400">Currently Spiking</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-500" size={20} />
            <div>
              <p className="text-2xl font-bold text-blue-600">{willSpike.length}</p>
              <p className="text-xs text-gray-400">Will Spike Next Month</p>
            </div>
          </div>
        </div>
      </div>

      {spiking.length > 0 && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
          <p className="font-semibold text-orange-700 dark:text-orange-300 text-sm mb-2">🔥 Currently Spiking — Stock up NOW:</p>
          <div className="flex flex-wrap gap-2">
            {spiking.map(p => (
              <span key={p.id} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                {p.name} (+{((p.currentMonthAvg / (p.monthlyData[(curMonth-1+12)%12] || 1) - 1) * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {willSpike.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm mb-2">📅 Next Month Forecast — Prepare stock for:</p>
          <div className="flex flex-wrap gap-2">
            {willSpike.map(p => (
              <span key={p.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                {p.name} (forecast +{((p.nextMonthAvg / (p.currentMonthAvg || 1) - 1) * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="font-semibold text-sm">Monthly Sales Pattern (Avg units/month over all years)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="table-head">Product</th>
                {MONTHS.map((m, mi) => (
                  <th key={m} className={`table-head text-center ${mi === curMonth ? 'text-primary-600 font-bold' : ''}`}>
                    {m}
                  </th>
                ))}
                <th className="table-head">Peak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {seasonal.slice(0, 20).map(p => {
                const max = Math.max(...p.monthlyData, 1);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium whitespace-nowrap">
                      {p.isSpiking && <Flame size={11} className="inline text-orange-500 mr-1" />}
                      {p.name}
                    </td>
                    {p.monthlyData.map((val, mi) => (
                      <td key={mi} className={`table-cell text-center ${mi === curMonth ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <div
                            className={`w-full max-w-[32px] rounded-sm ${mi === p.peakMonth ? 'bg-amber-400' : mi === curMonth ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                            style={{ height: `${Math.max(3, (val / max) * 24)}px` }}
                          />
                          <span className="text-[9px] text-gray-400">{val > 0 ? val.toFixed(0) : '—'}</span>
                        </div>
                      </td>
                    ))}
                    <td className="table-cell text-center font-semibold text-amber-600">{MONTHS[p.peakMonth]}</td>
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

// ─── TAB: Auto Purchase Order ────────────────────────────────────────────────
function AutoPurchaseOrder({ products, invoices, suppliers, company, setPage }) {
  const [selected, setSelected] = useState(new Set());
  const [supplierId, setSupplierId] = useState('');
  const [customQtys, setCustomQtys] = useState({});

  const lowStockItems = useMemo(() => {
    return products
      .filter(p => p.stock <= (p.minStock ?? 5))
      .map(p => {
        const salePrice = p.salePrice || p.price || 0;
        const profitPerUnit = salePrice - (p.costPrice || 0);
        const avgMonthly = getAvgMonthlySales(p.id, invoices);
        const profitScore = profitPerUnit * avgMonthly;
        const reorderQty = Math.max(Math.ceil(avgMonthly * 2), (p.minStock ?? 5) * 3);
        return { ...p, profitScore, reorderQty, avgMonthly };
      })
      .sort((a, b) => b.profitScore - a.profitScore);
  }, [products, invoices]);

  const toggleAll = () => {
    if (selected.size === lowStockItems.length) setSelected(new Set());
    else setSelected(new Set(lowStockItems.map(p => p.id)));
  };

  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectedItems = lowStockItems.filter(p => selected.has(p.id));
  const totalCost = selectedItems.reduce((s, p) => {
    const qty = Number(customQtys[p.id] ?? p.reorderQty);
    return s + qty * (p.costPrice || 0);
  }, 0);

  const createPO = () => {
    if (!selectedItems.length) return toast.error('Select at least one item');
    const poData = selectedItems.map(p => ({
      Product: p.name, SKU: p.sku, Category: p.category,
      CurrentStock: p.stock, MinStock: p.minStock ?? 5,
      ReorderQty: Number(customQtys[p.id] ?? p.reorderQty),
      CostPrice: p.costPrice || 0,
      TotalCost: (Number(customQtys[p.id] ?? p.reorderQty)) * (p.costPrice || 0),
      ProfitScore: p.profitScore.toFixed(0),
      Supplier: suppliers.find(s => s.id === (p.supplierId || Number(supplierId)))?.name || 'TBD',
    }));
    exportToExcel(poData, `purchase-order-${new Date().toISOString().split('T')[0]}.xlsx`, 'PurchaseOrder');
    toast.success(`Purchase Order exported — ${selectedItems.length} items, ${fmt(totalCost, company.currency)} total`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-red-500">
          <p className="text-2xl font-bold text-red-500">{lowStockItems.length}</p>
          <p className="text-xs text-gray-400 mt-1">Items Need Restock</p>
        </div>
        <div className="card p-4 border-l-4 border-primary-500">
          <p className="text-2xl font-bold text-primary-600">{selected.size}</p>
          <p className="text-xs text-gray-400 mt-1">Items Selected</p>
        </div>
        <div className="card p-4 border-l-4 border-emerald-500">
          <p className="text-xl font-bold text-emerald-600">{fmt(totalCost, company.currency)}</p>
          <p className="text-xs text-gray-400 mt-1">Estimated PO Value</p>
        </div>
      </div>

      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl text-sm text-primary-700 dark:text-primary-300">
        <p className="font-semibold flex items-center gap-2"><Zap size={15} /> Smart PO — items sorted by Profit Score (highest ROI first)</p>
        <p className="text-xs mt-1 text-primary-600 dark:text-primary-400">Reorder quantities are auto-calculated from your actual sales velocity × 2 months buffer.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select className="input text-sm" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="">Select Supplier (optional)</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={createPO} className="btn-primary btn-sm gap-2" disabled={!selected.size}>
          <FileText size={14} /> Export Purchase Order ({selected.size})
        </button>
        <button onClick={() => setPage('purchases')} className="btn-secondary btn-sm gap-2">
          <Plus size={14} /> New Purchase Entry
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <input
            type="checkbox"
            checked={selected.size === lowStockItems.length && lowStockItems.length > 0}
            onChange={toggleAll}
            className="rounded"
          />
          <span className="font-semibold text-sm">Select All ({lowStockItems.length} items)</span>
        </div>
        {lowStockItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400 opacity-60" />
            <p className="text-green-500 font-medium">All products are well stocked!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['', 'Rank', 'Product', 'Category', 'Stock', 'Min Stock', 'Avg/Month', 'Profit Score', 'Reorder Qty', 'Cost/Unit', 'Total Cost'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {lowStockItems.map((p, i) => {
                  const qty = Number(customQtys[p.id] ?? p.reorderQty);
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${selected.has(p.id) ? 'bg-primary-50/40 dark:bg-primary-900/20' : ''}`}>
                      <td className="table-cell">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="rounded" />
                      </td>
                      <td className="table-cell">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-400 text-white' : i < 3 ? 'bg-orange-300 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="table-cell font-medium">{p.name}</td>
                      <td className="table-cell text-gray-500">{p.category || '—'}</td>
                      <td className="table-cell">
                        <span className={`font-bold ${p.stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>{p.stock}</span>
                      </td>
                      <td className="table-cell text-gray-400">{p.minStock ?? 5}</td>
                      <td className="table-cell">{p.avgMonthly.toFixed(1)}</td>
                      <td className="table-cell font-semibold text-primary-600">{fmt(p.profitScore, company.currency)}</td>
                      <td className="table-cell">
                        <input
                          type="number"
                          min={1}
                          value={customQtys[p.id] ?? p.reorderQty}
                          onChange={e => setCustomQtys(q => ({ ...q, [p.id]: Number(e.target.value) }))}
                          className="input w-20 py-1 text-sm font-semibold text-center"
                        />
                      </td>
                      <td className="table-cell">{fmt(p.costPrice || 0, company.currency)}</td>
                      <td className="table-cell font-semibold text-emerald-600">{fmt(qty * (p.costPrice || 0), company.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {selectedItems.length > 0 && (
                <tfoot>
                  <tr className="bg-primary-50 dark:bg-primary-900/20 font-bold">
                    <td className="table-cell" colSpan={10}>TOTAL ({selected.size} items selected)</td>
                    <td className="table-cell text-primary-600 text-base">{fmt(totalCost, company.currency)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'ranking',  label: 'Profit Ranking',       icon: Star },
  { key: 'seasonal', label: 'Seasonal Predictor',   icon: Calendar },
  { key: 'autopo',   label: 'Auto Purchase Order',  icon: ShoppingCart },
];

export default function SmartPurchase({ setPage }) {
  const { products, invoices, suppliers, company } = useApp();
  const [tab, setTab] = useState('ranking');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="text-primary-600" size={26} /> Smart Purchase Intelligence
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Profit ranking · Seasonal demand · Auto purchase order generation</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package size={16} />
          <span>{products.length} products · {invoices.length} invoices analysed</span>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'ranking'  && <ProfitRanking products={products} invoices={invoices} suppliers={suppliers} company={company} />}
      {tab === 'seasonal' && <SeasonalPredictor products={products} invoices={invoices} company={company} />}
      {tab === 'autopo'   && <AutoPurchaseOrder products={products} invoices={invoices} suppliers={suppliers} company={company} setPage={setPage} />}
    </div>
  );
}

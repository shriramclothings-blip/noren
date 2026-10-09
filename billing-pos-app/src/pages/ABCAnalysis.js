import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Package, Download, Search } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { subDays } from 'date-fns';
import { exportCSV } from '../utils/helpers';

function classifyABC(products, invoices, days = 90) {
  const cutoff = subDays(new Date(), days);
  const revenueMap = {};

  invoices.filter(i => new Date(i.date) >= cutoff && i.status !== 'Cancelled' && i.status !== 'Refund')
    .forEach(inv => {
      (inv.items || []).forEach(item => {
        revenueMap[item.productId] = (revenueMap[item.productId] || 0) + Number(item.price || 0) * Number(item.qty || 0);
      });
    });

  const enriched = products.filter(p => !p.archived).map(p => ({
    ...p,
    revenue: revenueMap[p.id] || 0,
    stockValue: Number(p.stock || 0) * Number(p.costPrice || 0),
  })).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = enriched.reduce((s, p) => s + p.revenue, 0);
  let cumulative = 0;

  return enriched.map(p => {
    cumulative += p.revenue;
    const cumulativePct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    const revenuePct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
    let abc;
    if (cumulativePct <= 80) abc = 'A';
    else if (cumulativePct <= 95) abc = 'B';
    else abc = 'C';
    return { ...p, cumulativePct, revenuePct, abc };
  });
}

const ABC_CONFIG = {
  A: { label: 'A — Top Performers', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', desc: 'Top 20% products generating ~80% revenue. Prioritize stock & marketing.' },
  B: { label: 'B — Mid Performers', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', desc: 'Middle tier. Monitor closely and optimize pricing.' },
  C: { label: 'C — Slow Movers', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', desc: 'Bottom tier. Consider discounts, bundling, or discontinuing.' },
};

export default function ABCAnalysis() {
  const { products, invoices, company } = useApp();
  const [days, setDays] = useState(90);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const classified = useMemo(() => classifyABC(products, invoices, days), [products, invoices, days]);

  const filtered = useMemo(() => {
    let list = classified;
    if (filter !== 'All') list = list.filter(p => p.abc === filter);
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [classified, filter, search]);

  const stats = useMemo(() => ({
    A: classified.filter(p => p.abc === 'A'),
    B: classified.filter(p => p.abc === 'B'),
    C: classified.filter(p => p.abc === 'C'),
    totalRevenue: classified.reduce((s, p) => s + p.revenue, 0),
  }), [classified]);

  const handleExport = () => {
    exportCSV(filtered.map(p => ({
      Name: p.name,
      Category: p.category || '',
      ABC: p.abc,
      Revenue: p.revenue.toFixed(2),
      'Revenue %': p.revenuePct.toFixed(1) + '%',
      'Cumulative %': p.cumulativePct.toFixed(1) + '%',
      Stock: p.stock || 0,
      'Stock Value': p.stockValue.toFixed(2),
    })), 'abc-analysis.csv');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="text-primary-500" size={26} /> ABC Analysis</h1>
          <p className="text-sm text-gray-400 mt-0.5">Classify products by revenue contribution. Focus buying on A items.</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> Export</button>
      </div>

      {/* Period */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm text-gray-500">Analysis Period:</span>
        {[30, 60, 90, 180, 365].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${days === d ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
            {d}d
          </button>
        ))}
      </div>

      {/* ABC Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['A', 'B', 'C'].map(cls => {
          const cfg = ABC_CONFIG[cls];
          const items = stats[cls];
          const rev = items.reduce((s, p) => s + p.revenue, 0);
          const revPct = stats.totalRevenue > 0 ? (rev / stats.totalRevenue) * 100 : 0;
          return (
            <div key={cls} className={`card p-5 border ${cfg.border} ${cfg.bg}`}>
              <div className={`text-2xl font-black ${cfg.color} mb-1`}>{cls}</div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{items.length} Products</p>
              <p className={`text-xl font-bold mt-2 ${cfg.color}`}>{formatCurrency(rev, company.currency)}</p>
              <p className="text-xs text-gray-500">{revPct.toFixed(1)}% of total revenue</p>
              <div className="mt-3 h-1.5 bg-white/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${cls === 'A' ? 'bg-emerald-500' : cls === 'B' ? 'bg-amber-500' : 'bg-red-400'}`}
                  style={{ width: `${revPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">{cfg.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['All', 'A', 'B', 'C'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
              {f === 'All' ? 'All' : `Class ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['#', 'Product', 'Category', 'Class', 'Revenue', 'Rev %', 'Cumulative %', 'Stock', 'Stock Value', 'Action'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-10">No products found</td></tr>
              )}
              {filtered.map((p, i) => {
                const cfg = ABC_CONFIG[p.abc];
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                    <td className="table-cell">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.sku || p.barcode || ''}</div>
                    </td>
                    <td className="table-cell text-gray-500">{p.category || '—'}</td>
                    <td className="table-cell">
                      <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{p.abc}</span>
                    </td>
                    <td className="table-cell font-semibold text-emerald-600">{formatCurrency(p.revenue, company.currency)}</td>
                    <td className="table-cell text-gray-500">{p.revenuePct.toFixed(1)}%</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, p.cumulativePct)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{p.cumulativePct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="table-cell">{p.stock ?? 0}</td>
                    <td className="table-cell text-gray-500">{formatCurrency(p.stockValue, company.currency)}</td>
                    <td className="table-cell">
                      {p.abc === 'C' && p.stock > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">Consider Discount</span>
                      )}
                      {p.abc === 'A' && p.stock <= (p.minStock || 5) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">Restock Now</span>
                      )}
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

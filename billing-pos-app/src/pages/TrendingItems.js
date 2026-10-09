import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/exportUtils';
import {
  Flame, TrendingUp, TrendingDown, Zap, Package,
  Download, BarChart2, AlertTriangle, Sparkles,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (n, cur = '₹') =>
  `${cur}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── TAB: Velocity Score (Hot Items) ────────────────────────────────────────
function VelocityScore({ products, invoices, company }) {
  const [catFilter, setCatFilter] = useState('All');
  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const [d7ago, d14ago] = useMemo(() => {
    const now = new Date();
    const d7ago = new Date(now);
    d7ago.setDate(d7ago.getDate() - 7);
    const d14ago = new Date(now);
    d14ago.setDate(d14ago.getDate() - 14);
    return [d7ago, d14ago];
  }, []);

  const velocityData = useMemo(() => {
    return products
      .filter(p => catFilter === 'All' || p.category === catFilter)
      .map(p => {
        const last7 = invoices
          .filter(inv => new Date(inv.date) >= d7ago)
          .flatMap(inv => inv.items || [])
          .filter(i => i.productId === p.id)
          .reduce((s, i) => s + (i.qty || 0), 0);

        const prev7 = invoices
          .filter(inv => new Date(inv.date) >= d14ago && new Date(inv.date) < d7ago)
          .flatMap(inv => inv.items || [])
          .filter(i => i.productId === p.id)
          .reduce((s, i) => s + (i.qty || 0), 0);

        const velocityChange = prev7 === 0
          ? (last7 > 0 ? 100 : 0)
          : Math.round(((last7 - prev7) / prev7) * 100);

        const isHot = velocityChange >= 50 && last7 > 0;
        const isRising = velocityChange > 0 && velocityChange < 50 && last7 > 0;
        const isCooling = velocityChange < -20 && prev7 > 0;

        return { ...p, last7, prev7, velocityChange, isHot, isRising, isCooling };
      })
      .filter(p => p.last7 > 0 || p.prev7 > 0)
      .sort((a, b) => b.velocityChange - a.velocityChange);
  }, [products, invoices, catFilter, d7ago, d14ago]);

  const hotItems = velocityData.filter(p => p.isHot);
  const risingItems = velocityData.filter(p => p.isRising);
  const coolingItems = velocityData.filter(p => p.isCooling);

  const hotChartData = velocityData.slice(0, 12).map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    last7: p.last7,
    prev7: p.prev7,
    isHot: p.isHot,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2">
            <Flame className="text-red-500" size={22} />
            <div>
              <p className="text-2xl font-bold text-red-500">{hotItems.length}</p>
              <p className="text-xs text-gray-400">🔥 Hot (↑50%+)</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={22} />
            <div>
              <p className="text-2xl font-bold text-emerald-600">{risingItems.length}</p>
              <p className="text-xs text-gray-400">Rising (↑1–49%)</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-blue-500" size={22} />
            <div>
              <p className="text-2xl font-bold text-blue-600">{coolingItems.length}</p>
              <p className="text-xs text-gray-400">Cooling (↓20%+)</p>
            </div>
          </div>
        </div>
      </div>

      {hotItems.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="font-semibold text-red-700 dark:text-red-300 text-sm mb-2 flex items-center gap-2">
            <Flame size={14} /> 🔥 HOT ITEMS — Tell staff to push these!
          </p>
          <div className="flex flex-wrap gap-2">
            {hotItems.map(p => (
              <div key={p.id} className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700 rounded-xl text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{p.name}</span>
                <span className="ml-2 text-red-600 font-bold">+{p.velocityChange}%</span>
                <span className="ml-1 text-gray-400">({p.last7} sold this week)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <select className="input text-sm" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          onClick={() => exportToExcel(velocityData.map(p => ({
            Product: p.name, Category: p.category, SKU: p.sku,
            Last7Days: p.last7, Prev7Days: p.prev7,
            VelocityChange: `${p.velocityChange > 0 ? '+' : ''}${p.velocityChange}%`,
            Status: p.isHot ? '🔥 HOT' : p.isRising ? '↑ Rising' : p.isCooling ? '↓ Cooling' : 'Stable',
            Stock: p.stock,
          })), `velocity-score-${new Date().toISOString().split('T')[0]}.xlsx`, 'Velocity')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      {hotChartData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4">Sales Velocity — This Week vs Last Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hotChartData} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="prev7" name="Last 7 Days" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="last7" name="This 7 Days" radius={[3, 3, 0, 0]}>
                {hotChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isHot ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Product', 'Category', 'This Week', 'Last Week', 'Velocity', 'Status', 'Stock'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {velocityData.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell text-gray-500">{p.category || '—'}</td>
                  <td className="table-cell font-bold text-primary-600">{p.last7}</td>
                  <td className="table-cell text-gray-400">{p.prev7}</td>
                  <td className="table-cell">
                    <span className={`flex items-center gap-1 font-semibold ${
                      p.velocityChange >= 50 ? 'text-red-500' :
                      p.velocityChange > 0 ? 'text-emerald-600' : 'text-blue-500'
                    }`}>
                      {p.velocityChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {p.velocityChange > 0 ? '+' : ''}{p.velocityChange}%
                    </span>
                  </td>
                  <td className="table-cell">
                    {p.isHot && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">🔥 Hot</span>}
                    {p.isRising && !p.isHot && <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">↑ Rising</span>}
                    {p.isCooling && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">↓ Cooling</span>}
                    {!p.isHot && !p.isRising && !p.isCooling && <span className="text-gray-400 text-xs">Stable</span>}
                  </td>
                  <td className="table-cell font-bold">
                    {p.stock === 0 ? <span className="text-red-500">Out</span> : p.stock}
                    {p.isHot && p.stock <= 10 && <AlertTriangle size={12} className="inline ml-1 text-orange-500" />}
                  </td>
                </tr>
              ))}
              {velocityData.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-12">No sales data in last 14 days</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Category Heat Map ──────────────────────────────────────────────────
function CategoryHeatMap({ products, invoices, company }) {
  const [w7ago, w14ago] = useMemo(() => {
    const now = new Date();
    const w7ago = new Date(now);
    w7ago.setDate(w7ago.getDate() - 7);
    const w14ago = new Date(now);
    w14ago.setDate(w14ago.getDate() - 14);
    return [w7ago, w14ago];
  }, []);

  const heatData = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.map(cat => {
      const catProducts = products.filter(p => p.category === cat);
      const productIds = new Set(catProducts.map(p => p.id));

      const thisWeekRevenue = invoices
        .filter(inv => new Date(inv.date) >= w7ago)
        .flatMap(inv => inv.items || [])
        .filter(i => productIds.has(i.productId))
        .reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);

      const lastWeekRevenue = invoices
        .filter(inv => new Date(inv.date) >= w14ago && new Date(inv.date) < w7ago)
        .flatMap(inv => inv.items || [])
        .filter(i => productIds.has(i.productId))
        .reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);

      const thisWeekUnits = invoices
        .filter(inv => new Date(inv.date) >= w7ago)
        .flatMap(inv => inv.items || [])
        .filter(i => productIds.has(i.productId))
        .reduce((s, i) => s + (i.qty || 0), 0);

      const change = lastWeekRevenue === 0
        ? (thisWeekRevenue > 0 ? 100 : 0)
        : Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);

      const intensity = Math.min(100, Math.abs(change));

      return { cat, thisWeekRevenue, lastWeekRevenue, thisWeekUnits, change, intensity, productCount: catProducts.length };
    }).sort((a, b) => b.thisWeekRevenue - a.thisWeekRevenue);
  }, [products, invoices, w7ago, w14ago]);

  const maxRevenue = heatData[0]?.thisWeekRevenue || 1;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400">
        <p className="font-semibold mb-1 flex items-center gap-2"><BarChart2 size={14} /> Category Heat Map — This Week vs Last Week</p>
        <p className="text-xs">Darker = more revenue. Color = trend direction (green = growing, red = declining).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {heatData.map(d => {
          const pct = (d.thisWeekRevenue / maxRevenue) * 100;
          const isGrowing = d.change > 0;
          const bgClass = d.change >= 30 ? 'from-emerald-500/80 to-emerald-600/80' :
                          d.change >= 0  ? 'from-emerald-400/40 to-emerald-500/50' :
                          d.change >= -20 ? 'from-orange-400/40 to-orange-500/50' :
                                            'from-red-500/60 to-red-600/70';
          return (
            <div
              key={d.cat}
              className={`rounded-2xl p-4 bg-gradient-to-br ${bgClass} text-white relative overflow-hidden`}
              style={{ opacity: 0.4 + (pct / 100) * 0.6 }}
            >
              <div className="relative z-10">
                <p className="font-bold text-sm">{d.cat}</p>
                <p className="text-xl font-bold mt-1">{fmt(d.thisWeekRevenue, company.currency)}</p>
                <p className="text-xs opacity-90 mt-0.5">{d.thisWeekUnits} units this week</p>
                <div className="flex items-center gap-1 mt-2">
                  {isGrowing ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span className="text-xs font-bold">{d.change > 0 ? '+' : ''}{d.change}% vs last week</span>
                </div>
                <p className="text-xs opacity-75 mt-1">{d.productCount} products</p>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Category', 'Products', 'This Week Revenue', 'Last Week Revenue', 'Change', 'Units Sold'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {heatData.map(d => (
                <tr key={d.cat} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell font-medium">{d.cat}</td>
                  <td className="table-cell text-gray-500">{d.productCount}</td>
                  <td className="table-cell font-semibold">{fmt(d.thisWeekRevenue, company.currency)}</td>
                  <td className="table-cell text-gray-400">{fmt(d.lastWeekRevenue, company.currency)}</td>
                  <td className="table-cell">
                    <span className={`flex items-center gap-1 font-semibold ${d.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {d.change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {d.change > 0 ? '+' : ''}{d.change}%
                    </span>
                  </td>
                  <td className="table-cell">{d.thisWeekUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: New Item Performance Tracker ──────────────────────────────────────
function NewItemTracker({ products, invoices, company }) {
  const [days, setDays] = useState(30);

  const cutoff = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }, [days]);

  const newItems = useMemo(() => {
    return products
      .filter(p => p.createdAt && new Date(p.createdAt) >= cutoff)
      .map(p => {
        const sales = invoices
          .filter(inv => new Date(inv.date) >= new Date(p.createdAt))
          .flatMap(inv => inv.items || [])
          .filter(i => i.productId === p.id);

        const unitsSold = sales.reduce((s, i) => s + (i.qty || 0), 0);
        const revenue = sales.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
        const daysSinceAdded = Math.max(1, Math.round((Date.now() - new Date(p.createdAt)) / 86400000));
        const dailyVelocity = unitsSold / daysSinceAdded;
        const performance = unitsSold === 0 ? 'No Sales' : dailyVelocity >= 1 ? '🚀 Fast Mover' : dailyVelocity >= 0.3 ? '✅ Good' : '⚠️ Slow';

        return { ...p, unitsSold, revenue, daysSinceAdded, dailyVelocity, performance };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold);
  }, [products, invoices, cutoff]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Products added in last:</span>
        {[30, 60, 90].map(d => (
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
        <button
          onClick={() => exportToExcel(newItems.map(p => ({
            Product: p.name, AddedDaysAgo: p.daysSinceAdded,
            UnitsSold: p.unitsSold, Revenue: p.revenue,
            DailyVelocity: p.dailyVelocity.toFixed(2),
            Performance: p.performance, Stock: p.stock,
          })), `new-items-${new Date().toISOString().split('T')[0]}.xlsx`, 'NewItems')}
          className="btn-secondary btn-sm gap-2 ml-auto"
        >
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-primary-500">
          <p className="text-2xl font-bold text-primary-600">{newItems.length}</p>
          <p className="text-xs text-gray-400">New Products Added</p>
        </div>
        <div className="card p-4 border-l-4 border-emerald-500">
          <p className="text-2xl font-bold text-emerald-600">{newItems.filter(p => p.performance.includes('Fast')).length}</p>
          <p className="text-xs text-gray-400">🚀 Fast Movers</p>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-2xl font-bold text-red-500">{newItems.filter(p => p.performance === 'No Sales').length}</p>
          <p className="text-xs text-gray-400">No Sales Yet</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {newItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
            <p>No products added in last {days} days</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Product', 'Category', 'Days Since Added', 'Units Sold', 'Revenue', 'Daily Velocity', 'Performance', 'Stock'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {newItems.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell text-gray-500">{p.category || '—'}</td>
                    <td className="table-cell">{p.daysSinceAdded}d ago</td>
                    <td className="table-cell font-bold text-primary-600">{p.unitsSold}</td>
                    <td className="table-cell font-semibold">{fmt(p.revenue, company.currency)}</td>
                    <td className="table-cell">{p.dailyVelocity.toFixed(2)}/day</td>
                    <td className="table-cell">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                        p.performance.includes('Fast') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        p.performance.includes('Good') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        p.performance.includes('Slow') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{p.performance}</span>
                    </td>
                    <td className="table-cell font-bold">{p.stock}</td>
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

// ─── TAB: Stockout Alert ─────────────────────────────────────────────────────
function StockoutAlert({ products, invoices, company }) {
  const alerts = useMemo(() => {
    return products
      .filter(p => (p.stock ?? 0) > 0)
      .map(p => {
        const last30 = new Date(); last30.setDate(last30.getDate() - 30);
        const unitsSold30 = invoices
          .filter(inv => new Date(inv.date) >= last30)
          .flatMap(inv => inv.items || [])
          .filter(i => i.productId === p.id)
          .reduce((s, i) => s + (i.qty || 0), 0);

        const dailyRate = unitsSold30 / 30;
        const daysLeft = dailyRate > 0 ? Math.floor((p.stock ?? 0) / dailyRate) : null;
        const urgency = daysLeft === null ? 'no-movement' :
                        daysLeft <= 3 ? 'critical' :
                        daysLeft <= 7 ? 'urgent' :
                        daysLeft <= 14 ? 'warning' : 'ok';

        return { ...p, dailyRate, daysLeft, urgency };
      })
      .filter(p => p.urgency !== 'ok' && p.urgency !== 'no-movement')
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  }, [products, invoices]);

  const critical = alerts.filter(p => p.urgency === 'critical');
  const urgent = alerts.filter(p => p.urgency === 'urgent');
  const warning = alerts.filter(p => p.urgency === 'warning');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-red-600">
          <p className="text-2xl font-bold text-red-600">{critical.length}</p>
          <p className="text-xs text-gray-400">🚨 Critical (≤3 days left)</p>
        </div>
        <div className="card p-4 border-l-4 border-orange-500">
          <p className="text-2xl font-bold text-orange-500">{urgent.length}</p>
          <p className="text-xs text-gray-400">⚠️ Urgent (4–7 days)</p>
        </div>
        <div className="card p-4 border-l-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-500">{warning.length}</p>
          <p className="text-xs text-gray-400">📦 Warning (8–14 days)</p>
        </div>
      </div>

      {critical.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl">
          <p className="font-semibold text-red-700 dark:text-red-300 text-sm mb-2">🚨 ORDER IMMEDIATELY — These will run out in ≤3 days:</p>
          {critical.map(p => (
            <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-red-100 dark:border-red-800 last:border-0">
              <span className="font-semibold text-sm">{p.name}</span>
              <span className="text-xs text-red-600 font-bold bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded-lg">
                {p.stock} left · Runs out in {p.daysLeft} day{p.daysLeft !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {alerts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p>No stockout alerts — all products have sufficient stock!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Product', 'Category', 'Current Stock', 'Daily Sales Rate', 'Days Until Stockout', 'Stockout Date', 'Urgency'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {alerts.map(p => {
                  const stockoutDate = p.daysLeft
                    ? new Date(Date.now() + p.daysLeft * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : '—';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell font-medium">{p.name}</td>
                      <td className="table-cell text-gray-500">{p.category || '—'}</td>
                      <td className="table-cell font-bold text-primary-600">{p.stock}</td>
                      <td className="table-cell">{p.dailyRate.toFixed(2)}/day</td>
                      <td className="table-cell">
                        <span className={`font-bold ${
                          p.urgency === 'critical' ? 'text-red-600' :
                          p.urgency === 'urgent' ? 'text-orange-500' : 'text-yellow-500'
                        }`}>
                          {p.daysLeft} days
                        </span>
                      </td>
                      <td className="table-cell font-medium">{stockoutDate}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.urgency === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          p.urgency === 'urgent' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {p.urgency === 'critical' ? '🚨 Critical' : p.urgency === 'urgent' ? '⚠️ Urgent' : '📦 Warning'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'velocity',  label: 'Velocity & Hot Items', icon: Flame },
  { key: 'heatmap',  label: 'Category Heat Map',     icon: BarChart2 },
  { key: 'newitem',  label: 'New Item Tracker',       icon: Sparkles },
  { key: 'stockout', label: 'Stockout Alerts',        icon: AlertTriangle },
];

export default function TrendingItems() {
  const { products, invoices, company } = useApp();
  const [tab, setTab] = useState('velocity');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="text-red-500" size={26} /> Trending & Hot Items
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Velocity scores · Category heat map · New item performance · Stockout alerts</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Zap size={16} className="text-amber-500" />
          <span>Live intelligence from {invoices.length} invoices</span>
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

      {tab === 'velocity'  && <VelocityScore products={products} invoices={invoices} company={company} />}
      {tab === 'heatmap'   && <CategoryHeatMap products={products} invoices={invoices} company={company} />}
      {tab === 'newitem'   && <NewItemTracker products={products} invoices={invoices} company={company} />}
      {tab === 'stockout'  && <StockoutAlert products={products} invoices={invoices} company={company} />}
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, TrendingUp, TrendingDown, Zap, Activity } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { subDays, startOfDay, getDay, getHours } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const HEAT_COLORS = ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'];

function heatColor(val, max) {
  if (!max || val === 0) return '#f3f4f6';
  const idx = Math.min(6, Math.floor((val / max) * 6));
  return HEAT_COLORS[idx];
}

export default function SalesHeatmap() {
  const { invoices, products, company } = useApp();
  const [tab, setTab] = useState('heatmap');
  const [velocityDays, setVelocityDays] = useState(30);

  const validInvoices = useMemo(() =>
    invoices.filter(i => i.status !== 'Cancelled' && i.status !== 'Refund'),
    [invoices]
  );

  // Heatmap: day of week × hour of day
  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    const last90 = subDays(new Date(), 90);
    validInvoices.filter(i => new Date(i.date) >= last90).forEach(inv => {
      const d = new Date(inv.date);
      const day = getDay(d);
      const hour = getHours(d);
      grid[day][hour] += Number(inv.total || 0);
    });
    return grid;
  }, [validInvoices]);

  const heatMax = useMemo(() => Math.max(...heatmapData.flat()), [heatmapData]);

  // Best hours
  const hourTotals = useMemo(() => HOURS.map((h, i) => ({
    hour: h,
    total: heatmapData.reduce((s, day) => s + day[i], 0),
  })).sort((a, b) => b.total - a.total), [heatmapData]);

  // Best days
  const dayTotals = useMemo(() => DAYS.map((d, i) => ({
    day: d,
    total: heatmapData[i].reduce((s, v) => s + v, 0),
  })).sort((a, b) => b.total - a.total), [heatmapData]);

  // Sales Velocity: units/day per product
  const velocityData = useMemo(() => {
    const cutoff = subDays(new Date(), velocityDays);
    const prevCutoff = subDays(new Date(), velocityDays * 2);
    const map = {};

    validInvoices.filter(i => new Date(i.date) >= prevCutoff).forEach(inv => {
      const isCurrent = new Date(inv.date) >= cutoff;
      (inv.items || []).forEach(item => {
        if (!map[item.productId]) map[item.productId] = { current: 0, prev: 0, name: item.name };
        if (isCurrent) map[item.productId].current += Number(item.qty || 0);
        else map[item.productId].prev += Number(item.qty || 0);
      });
    });

    return Object.entries(map).map(([id, d]) => {
      const velocity = d.current / velocityDays;
      const prevVelocity = d.prev / velocityDays;
      const change = prevVelocity > 0 ? ((velocity - prevVelocity) / prevVelocity) * 100 : velocity > 0 ? 100 : 0;
      return { id, name: d.name, velocity: +velocity.toFixed(2), prevVelocity: +prevVelocity.toFixed(2), change: +change.toFixed(1), current: d.current, prev: d.prev };
    }).sort((a, b) => b.velocity - a.velocity);
  }, [validInvoices, velocityDays]);

  // Margin Erosion: compare avg margin this month vs last month per product
  const marginData = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = startOfDay(new Date(now.getFullYear(), now.getMonth(), 0));

    const map = {};
    validInvoices.forEach(inv => {
      const d = new Date(inv.date);
      const isThis = d >= thisMonthStart;
      const isLast = d >= lastMonthStart && d <= lastMonthEnd;
      if (!isThis && !isLast) return;

      (inv.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cost = Number(item.costPrice ?? prod?.costPrice ?? 0);
        const price = Number(item.price || 0);
        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
        if (!map[item.productId]) map[item.productId] = { name: item.name, thisMargins: [], lastMargins: [] };
        if (isThis) map[item.productId].thisMargins.push(margin);
        if (isLast) map[item.productId].lastMargins.push(margin);
      });
    });

    return Object.entries(map)
      .map(([id, d]) => {
        const thisAvg = d.thisMargins.length ? d.thisMargins.reduce((s, v) => s + v, 0) / d.thisMargins.length : null;
        const lastAvg = d.lastMargins.length ? d.lastMargins.reduce((s, v) => s + v, 0) / d.lastMargins.length : null;
        const erosion = thisAvg !== null && lastAvg !== null ? thisAvg - lastAvg : null;
        return { id, name: d.name, thisAvg, lastAvg, erosion };
      })
      .filter(d => d.erosion !== null)
      .sort((a, b) => a.erosion - b.erosion); // worst erosion first
  }, [validInvoices, products]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="text-primary-500" size={26} /> Sales Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Heatmap • Sales Velocity • Margin Erosion Tracker</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'heatmap', label: 'Sales Heatmap' },
          { key: 'velocity', label: 'Sales Velocity' },
          { key: 'margin', label: 'Margin Erosion' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Heatmap */}
      {tab === 'heatmap' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-1">Sales Heatmap — Day × Hour (Last 90 Days)</h3>
            <p className="text-xs text-gray-400 mb-4">Darker = more sales. Use this to plan staffing and promotions.</p>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="w-10 text-gray-400 text-right pr-2">Day</th>
                    {HOURS.map((h, i) => i % 2 === 0 ? <th key={h} className="w-8 text-center text-gray-400">{h.slice(0, 2)}</th> : <th key={h} className="w-8" />)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={day}>
                      <td className="text-right pr-2 text-gray-500 font-medium py-0.5">{day}</td>
                      {heatmapData[di].map((val, hi) => (
                        <td key={hi} className="p-0.5">
                          <div
                            className="w-7 h-7 rounded cursor-default"
                            style={{ backgroundColor: heatColor(val, heatMax) }}
                            title={`${day} ${HOURS[hi]}: ${formatCurrency(val, company.currency)}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap size={15} className="text-amber-500" /> Top Selling Hours</h3>
              <div className="space-y-2">
                {hourTotals.slice(0, 8).map((h, i) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-12">{h.hour}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${heatMax > 0 ? (h.total / hourTotals[0].total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-20 text-right">{formatCurrency(h.total, company.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity size={15} className="text-emerald-500" /> Best Days of Week</h3>
              <div className="space-y-2">
                {dayTotals.map((d, i) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-8">{d.day}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dayTotals[0].total > 0 ? (d.total / dayTotals[0].total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-20 text-right">{formatCurrency(d.total, company.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Velocity */}
      {tab === 'velocity' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Period:</label>
            {[7, 14, 30, 60].map(d => (
              <button key={d} onClick={() => setVelocityDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${velocityDays === d ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                {d}d
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-sm">
              Sales Velocity — Units/Day per Product (Last {velocityDays} days vs previous {velocityDays} days)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Product', 'Units/Day (Now)', 'Units/Day (Prev)', 'Change', 'Total Units', 'Trend'].map(h => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {velocityData.slice(0, 50).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell font-medium">{p.name}</td>
                      <td className="table-cell font-bold text-primary-600">{p.velocity}</td>
                      <td className="table-cell text-gray-500">{p.prevVelocity}</td>
                      <td className="table-cell">
                        <span className={`text-xs font-semibold flex items-center gap-1 ${p.change > 0 ? 'text-emerald-600' : p.change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {p.change > 0 ? <TrendingUp size={12} /> : p.change < 0 ? <TrendingDown size={12} /> : null}
                          {p.change > 0 ? '+' : ''}{p.change}%
                        </span>
                      </td>
                      <td className="table-cell">{p.current}</td>
                      <td className="table-cell">
                        <div className="w-16 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${p.change >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(100, Math.abs(p.change))}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {velocityData.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No sales data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Margin Erosion */}
      {tab === 'margin' && (
        <div className="space-y-4">
          <div className="card p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Margin Erosion</strong> shows products where profit margin has decreased this month vs last month. Negative = margin shrinking (cost increased or price reduced).
            </p>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Product', 'This Month Margin', 'Last Month Margin', 'Change', 'Status'].map(h => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {marginData.slice(0, 50).map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${p.erosion < -5 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                      <td className="table-cell font-medium">{p.name}</td>
                      <td className="table-cell font-bold">{p.thisAvg?.toFixed(1)}%</td>
                      <td className="table-cell text-gray-500">{p.lastAvg?.toFixed(1)}%</td>
                      <td className="table-cell">
                        <span className={`font-semibold ${p.erosion < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {p.erosion > 0 ? '+' : ''}{p.erosion?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="table-cell">
                        {p.erosion < -10 ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</span>
                          : p.erosion < -5 ? <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Warning</span>
                          : p.erosion < 0 ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Watch</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Healthy</span>}
                      </td>
                    </tr>
                  ))}
                  {marginData.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-8">Need sales data from 2+ months to compare</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

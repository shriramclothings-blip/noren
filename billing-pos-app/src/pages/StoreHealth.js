import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart, TrendingUp, Package, AlertTriangle,
  DollarSign, Flame, Zap, ArrowRight, CheckCircle,
  BarChart3, Users, ShoppingCart, Tag,
} from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';

const fmt = (n, cur = '₹') =>
  `${cur}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ScoreRing({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention';
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <svg width={112} height={112} className="-rotate-90">
          <circle cx={56} cy={56} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={10} />
          <circle
            cx={56} cy={56} r={radius}
            fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-black" style={{ color }}>{score}</p>
          <p className="text-xs text-gray-400">/100</p>
        </div>
      </div>
      <p className="text-sm font-semibold mt-2" style={{ color }}>{label}</p>
    </div>
  );
}

export default function StoreHealth({ setPage }) {
  const { products, invoices, expenses, company, customers } = useApp();

  const now = new Date();
  const today = startOfDay(now);
  const last30 = subDays(now, 30);

  // Today
  const todayInv = useMemo(() =>
    invoices.filter(inv => new Date(inv.date) >= today && inv.status !== 'Refund'), [invoices, today]);
  const todayRevenue = todayInv.reduce((s, i) => s + (i.total || 0), 0);
  const todayProfit = useMemo(() => todayInv.reduce((sum, inv) =>
    sum + (inv.items || []).reduce((s, item) => {
      const prod = products.find(p => p.id === item.productId);
      const cost = Number(item.costPrice ?? prod?.costPrice ?? 0);
      return s + (Number(item.price || 0) - cost) * Number(item.qty || 0);
    }, 0), 0), [todayInv, products]);

  // Month
  const monthInv = useMemo(() =>
    invoices.filter(inv => new Date(inv.date) >= last30 && inv.status !== 'Refund'), [invoices, last30]);
  const monthRevenue = monthInv.reduce((s, i) => s + (i.total || 0), 0);
  const monthProfit = useMemo(() => monthInv.reduce((sum, inv) =>
    sum + (inv.items || []).reduce((s, item) => {
      const prod = products.find(p => p.id === item.productId);
      const cost = Number(item.costPrice ?? prod?.costPrice ?? 0);
      return s + (Number(item.price || 0) - cost) * Number(item.qty || 0);
    }, 0), 0), [monthInv, products]);
  const monthExpenses = useMemo(() =>
    expenses.filter(e => new Date(e.date) >= last30).reduce((s, e) => s + (e.amount || 0), 0), [expenses, last30]);
  const monthNetProfit = monthProfit - monthExpenses;

  // Stock Health
  const lowStockCount = products.filter(p => (p.stock ?? 0) <= (p.minStock ?? 5)).length;
  const outOfStockCount = products.filter(p => (p.stock ?? 0) === 0).length;
  const stockHealth = products.length > 0 ? Math.round(((products.length - lowStockCount) / products.length) * 100) : 100;

  // Dead Stock
  const deadCutoff = subDays(now, 60);
  const deadStock = products.filter(p => {
    if (!p.stock) return false;
    return !invoices.some(inv => new Date(inv.date) >= deadCutoff && (inv.items || []).some(i => i.productId === p.id));
  });
  const deadCapital = deadStock.reduce((s, p) => s + (p.stock || 0) * (p.costPrice || 0), 0);

  // Hot items (velocity > 50%)
  const w7ago = subDays(now, 7);
  const w14ago = subDays(now, 14);
  const hotItems = useMemo(() => products.filter(p => {
    const last7 = invoices.filter(inv => new Date(inv.date) >= w7ago).flatMap(inv => inv.items || []).filter(i => i.productId === p.id).reduce((s, i) => s + (i.qty || 0), 0);
    const prev7 = invoices.filter(inv => new Date(inv.date) >= w14ago && new Date(inv.date) < w7ago).flatMap(inv => inv.items || []).filter(i => i.productId === p.id).reduce((s, i) => s + (i.qty || 0), 0);
    if (!last7) return false;
    return prev7 === 0 ? true : ((last7 - prev7) / prev7) >= 0.5;
  }), [products, invoices, w7ago, w14ago]);

  // Top earner today
  const topEarnerToday = useMemo(() => {
    const map = {};
    todayInv.forEach(inv => (inv.items || []).forEach(item => {
      if (!map[item.name]) map[item.name] = 0;
      map[item.name] += (item.price || 0) * (item.qty || 0);
    }));
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], value: sorted[0][1] } : null;
  }, [todayInv]);

  // Dues
  const totalDues = customers.reduce((s, c) => s + (c.dues || 0), 0);

  // Health Score calculation
  const healthScore = useMemo(() => {
    let score = 100;
    if (outOfStockCount > 0) score -= Math.min(20, outOfStockCount * 4);
    if (lowStockCount > 0) score -= Math.min(15, lowStockCount * 2);
    if (deadStock.length > 0) score -= Math.min(15, deadStock.length * 2);
    if (monthProfit < 0) score -= 20;
    if (monthRevenue === 0) score -= 10;
    if (totalDues > monthRevenue * 0.2) score -= 10;
    return Math.max(0, Math.round(score));
  }, [outOfStockCount, lowStockCount, deadStock, monthProfit, monthRevenue, totalDues]);

  const actions = [];
  if (outOfStockCount > 0) actions.push({ icon: AlertTriangle, color: 'text-red-500', text: `${outOfStockCount} products out of stock — restock immediately`, page: 'stockManagement' });
  if (lowStockCount > 0) actions.push({ icon: Package, color: 'text-orange-500', text: `${lowStockCount} items below minimum stock level`, page: 'stockManagement' });
  if (deadStock.length > 0) actions.push({ icon: Tag, color: 'text-amber-500', text: `${deadStock.length} dead stock items blocking ${fmt(deadCapital, company.currency)} capital`, page: 'discountEngine' });
  if (hotItems.length > 0) actions.push({ icon: Flame, color: 'text-red-500', text: `${hotItems.length} hot items trending — push in POS!`, page: 'trendingItems' });
  if (totalDues > 0) actions.push({ icon: DollarSign, color: 'text-blue-500', text: `${fmt(totalDues, company.currency)} pending dues from customers`, page: 'customers' });

  const MetricCard = ({ icon: Icon, iconColor, title, value, sub, subColor, onClick, page }) => (
    <div
      className={`card p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon size={18} className={iconColor} />
        {onClick && <ArrowRight size={14} className="text-gray-300" />}
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{title}</p>
      {sub && <p className={`text-xs mt-1 font-medium ${subColor || 'text-gray-400'}`}>{sub}</p>}
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="text-red-500" size={26} /> Store Health Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time business health at a glance</p>
        </div>
      </div>

      {/* Health Score + Today Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card p-6 flex flex-col items-center justify-center lg:col-span-1">
          <p className="text-sm text-gray-500 mb-3 font-medium">Store Health Score</p>
          <ScoreRing score={healthScore} />
          <p className="text-xs text-gray-400 mt-3 text-center">Based on stock, sales, profit & dues</p>
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard icon={TrendingUp} iconColor="text-primary-500" title="Today's Revenue" value={fmt(todayRevenue, company.currency)} sub={`${todayInv.length} bills`} />
          <MetricCard icon={DollarSign} iconColor="text-emerald-500" title="Today's Profit" value={fmt(todayProfit, company.currency)} subColor={todayProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} />
          <MetricCard icon={BarChart3} iconColor="text-blue-500" title="30-Day Net Profit" value={fmt(monthNetProfit, company.currency)} subColor={monthNetProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} />
          <MetricCard icon={Package} iconColor={lowStockCount > 0 ? 'text-orange-500' : 'text-emerald-500'} title="Stock Health" value={`${stockHealth}%`} sub={lowStockCount > 0 ? `${lowStockCount} items low` : 'All stocked'} subColor={lowStockCount > 0 ? 'text-orange-500' : 'text-emerald-500'} onClick={() => setPage('stockManagement')} />
          <MetricCard icon={Tag} iconColor="text-amber-500" title="Dead Capital" value={fmt(deadCapital, company.currency)} sub={`${deadStock.length} items idle`} subColor="text-amber-500" onClick={() => setPage('discountEngine')} />
          <MetricCard icon={Users} iconColor="text-blue-500" title="Pending Dues" value={fmt(totalDues, company.currency)} sub={`${customers.filter(c => (c.dues || 0) > 0).length} customers`} subColor={totalDues > 0 ? 'text-orange-500' : 'text-emerald-500'} onClick={() => setPage('customers')} />
        </div>
      </div>

      {/* 2-column: Today's highlights + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Highlights */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Zap size={15} className="text-amber-500" /> Today's Highlights</h3>
          {topEarnerToday && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
              <div>
                <p className="text-xs text-gray-500">Top Earner Today</p>
                <p className="font-semibold text-sm">{topEarnerToday.name}</p>
              </div>
              <p className="font-bold text-emerald-600">{fmt(topEarnerToday.value, company.currency)}</p>
            </div>
          )}
          {hotItems.slice(0, 2).map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <div>
                <p className="text-xs text-gray-500">🔥 Hot This Week</p>
                <p className="font-semibold text-sm">{p.name}</p>
              </div>
              <p className="font-bold text-red-500">{p.stock} left</p>
            </div>
          ))}
          {todayInv.length === 0 && !topEarnerToday && (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No sales today yet</p>
            </div>
          )}
        </div>

        {/* Action Items */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-500" /> Action Items
            {actions.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold">{actions.length}</span>
            )}
          </h3>
          {actions.length === 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle size={20} className="text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">All Good!</p>
                <p className="text-xs text-gray-400 mt-0.5">No critical actions needed right now.</p>
              </div>
            </div>
          ) : (
            actions.map(({ icon: Icon, color, text, page }, i) => (
              <button
                key={i}
                onClick={() => setPage(page)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <Icon size={16} className={color} />
                <span className="text-sm flex-1">{text}</span>
                <ArrowRight size={14} className="text-gray-300 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Mini KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Products', value: products.length, icon: Package, color: 'text-blue-500' },
          { label: 'Hot Items', value: hotItems.length, icon: Flame, color: 'text-red-500' },
          { label: 'Out of Stock', value: outOfStockCount, icon: AlertTriangle, color: outOfStockCount > 0 ? 'text-red-500' : 'text-emerald-500' },
          { label: 'Total Customers', value: customers.length, icon: Users, color: 'text-purple-500' },
          { label: 'Month Revenue', value: fmt(monthRevenue, company.currency), icon: TrendingUp, color: 'text-primary-500' },
          { label: 'Clearance Items', value: products.filter(p => p.isClearance).length, icon: Tag, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-3 flex items-center gap-3">
            <Icon size={16} className={color} />
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

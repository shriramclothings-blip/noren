import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Scale, Download } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { exportCSV } from '../utils/helpers';

function buildPL(invoices, products, expenses, from, to) {
  const inv = invoices.filter(i => {
    const d = new Date(i.date);
    return d >= from && d <= to && i.status !== 'Cancelled';
  });

  const revenue = inv.filter(i => i.status !== 'Refund').reduce((s, i) => s + Number(i.total || 0), 0);
  const refunds = inv.filter(i => i.status === 'Refund').reduce((s, i) => s + Math.abs(Number(i.total || 0)), 0);
  const netRevenue = revenue - refunds;

  // COGS: sum of (costPrice × qty) for all sold items
  let cogs = 0;
  inv.filter(i => i.status !== 'Refund').forEach(inv => {
    (inv.items || []).forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const cost = Number(item.costPrice ?? prod?.costPrice ?? 0);
      cogs += cost * Number(item.qty || 0);
    });
  });

  const grossProfit = netRevenue - cogs;
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  const exp = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
  const totalExpenses = exp.reduce((s, e) => s + Number(e.amount || 0), 0);

  const netProfit = grossProfit - totalExpenses;
  const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  // Expense breakdown by category
  const expByCategory = {};
  exp.forEach(e => {
    const cat = e.category || 'Other';
    expByCategory[cat] = (expByCategory[cat] || 0) + Number(e.amount || 0);
  });

  return { revenue, refunds, netRevenue, cogs, grossProfit, grossMargin, totalExpenses, netProfit, netMargin, expByCategory, invoiceCount: inv.filter(i => i.status !== 'Refund').length };
}

function buildBalanceSheet(products, customers, invoices, expenses) {
  // Assets
  const inventoryValue = products.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.costPrice || 0)), 0);
  const receivables = customers.reduce((s, c) => s + Math.max(0, Number(c.dues || 0)), 0);
  const totalAssets = inventoryValue + receivables;

  // Liabilities
  const creditGiven = customers.reduce((s, c) => s + Math.max(0, Number(c.dues || 0)), 0);
  const totalLiabilities = creditGiven;

  const equity = totalAssets - totalLiabilities;

  return { inventoryValue, receivables, totalAssets, creditGiven, totalLiabilities, equity };
}

function buildCashFlow(invoices, expenses, days) {
  const now = new Date();
  const cutoff = subDays(now, days);
  const recentInv = invoices.filter(i => new Date(i.date) >= cutoff && i.status !== 'Cancelled' && i.status !== 'Refund');
  const recentExp = expenses.filter(e => new Date(e.date) >= cutoff);

  const avgDailySales = recentInv.reduce((s, i) => s + Number(i.total || 0), 0) / days;
  const avgDailyExpenses = recentExp.reduce((s, e) => s + Number(e.amount || 0), 0) / days;
  const avgDailyNet = avgDailySales - avgDailyExpenses;

  return [7, 15, 30].map(d => ({
    days: d,
    projectedRevenue: avgDailySales * d,
    projectedExpenses: avgDailyExpenses * d,
    projectedNet: avgDailyNet * d,
  }));
}

export default function FinancialReports() {
  const { invoices, products, expenses, customers, company } = useApp();
  const [tab, setTab] = useState('pl');
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { from, to } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'lastmonth': return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
      case 'quarter': return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
      case 'year': return { from: startOfYear(now), to: endOfYear(now) };
      case 'custom': return { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59') };
      default: return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }, [period, customFrom, customTo]);

  const pl = useMemo(() => buildPL(invoices, products, expenses, from, to), [invoices, products, expenses, from, to]);
  const bs = useMemo(() => buildBalanceSheet(products, customers, invoices, expenses), [products, customers, invoices, expenses]);
  const cashFlow = useMemo(() => buildCashFlow(invoices, expenses, 30), [invoices, expenses]);

  const PLRow = ({ label, value, indent = false, bold = false, color = '', border = false }) => (
    <div className={`flex justify-between py-2 ${border ? 'border-t border-gray-200 dark:border-gray-700 mt-1' : ''} ${indent ? 'pl-6' : ''}`}>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
      <span className={`text-sm font-semibold ${color || (bold ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200')}`}>
        {formatCurrency(value, company.currency)}
      </span>
    </div>
  );

  const exportPL = () => {
    const rows = [
      { Item: 'Gross Revenue', Amount: pl.revenue },
      { Item: 'Refunds', Amount: -pl.refunds },
      { Item: 'Net Revenue', Amount: pl.netRevenue },
      { Item: 'COGS', Amount: -pl.cogs },
      { Item: 'Gross Profit', Amount: pl.grossProfit },
      { Item: 'Gross Margin %', Amount: pl.grossMargin.toFixed(1) + '%' },
      { Item: 'Total Expenses', Amount: -pl.totalExpenses },
      { Item: 'Net Profit', Amount: pl.netProfit },
      { Item: 'Net Margin %', Amount: pl.netMargin.toFixed(1) + '%' },
    ];
    exportCSV(rows, 'profit-loss.csv');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="text-emerald-500" size={26} /> Financial Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">P&L Statement • Balance Sheet • Cash Flow Forecast</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'pl', label: 'P&L Statement' },
          { key: 'balance', label: 'Balance Sheet' },
          { key: 'cashflow', label: 'Cash Flow Forecast' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* P&L */}
      {tab === 'pl' && (
        <div className="space-y-4">
          {/* Period Selector */}
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { key: 'month', label: 'This Month' },
              { key: 'lastmonth', label: 'Last Month' },
              { key: 'quarter', label: 'Quarter' },
              { key: 'year', label: 'This Year' },
              { key: 'custom', label: 'Custom' },
            ].map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                {p.label}
              </button>
            ))}
            {period === 'custom' && (
              <>
                <input type="date" className="input text-xs py-1.5 w-36" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                <input type="date" className="input text-xs py-1.5 w-36" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </>
            )}
            <button onClick={exportPL} className="btn-secondary text-xs px-3 py-1.5 ml-auto flex items-center gap-1"><Download size={13} /> Export</button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Net Revenue', value: pl.netRevenue, color: 'text-primary-600', icon: TrendingUp },
              { label: 'Gross Profit', value: pl.grossProfit, color: pl.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500', icon: BarChart3 },
              { label: 'Net Profit', value: pl.netProfit, color: pl.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500', icon: DollarSign },
              { label: 'Net Margin', value: pl.netMargin.toFixed(1) + '%', color: pl.netMargin >= 0 ? 'text-emerald-600' : 'text-red-500', icon: TrendingDown, isText: true },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <s.icon size={16} className={s.color + ' mb-2'} />
                <p className={`text-xl font-bold ${s.color}`}>{s.isText ? s.value : formatCurrency(s.value, company.currency)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* P&L Statement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-bold text-base mb-3 text-gray-900 dark:text-white">Profit & Loss Statement</h3>
              <p className="text-xs text-gray-400 mb-3">{format(from, 'dd MMM yyyy')} – {format(to, 'dd MMM yyyy')} • {pl.invoiceCount} invoices</p>

              <PLRow label="Gross Revenue" value={pl.revenue} />
              <PLRow label="Less: Refunds" value={-pl.refunds} indent color="text-red-500" />
              <PLRow label="Net Revenue" value={pl.netRevenue} bold border />
              <PLRow label="Less: Cost of Goods Sold (COGS)" value={-pl.cogs} indent color="text-red-500" />
              <PLRow label="Gross Profit" value={pl.grossProfit} bold border color={pl.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} />
              <div className="text-xs text-gray-400 pl-6 pb-2">Gross Margin: {pl.grossMargin.toFixed(1)}%</div>
              <PLRow label="Less: Operating Expenses" value={-pl.totalExpenses} indent color="text-red-500" />
              <PLRow label="Net Profit / Loss" value={pl.netProfit} bold border color={pl.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} />
              <div className="text-xs text-gray-400 pl-6">Net Margin: {pl.netMargin.toFixed(1)}%</div>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-base mb-3 text-gray-900 dark:text-white">Expense Breakdown</h3>
              {Object.keys(pl.expByCategory).length === 0 ? (
                <p className="text-gray-400 text-sm">No expenses in this period</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(pl.expByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">{cat}</span>
                      <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${pl.totalExpenses > 0 ? (amt / pl.totalExpenses) * 100 : 0}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-red-500 w-24 text-right">{formatCurrency(amt, company.currency)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-sm">
                    <span>Total</span>
                    <span className="text-red-500">{formatCurrency(pl.totalExpenses, company.currency)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {tab === 'balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-emerald-600"><TrendingUp size={16} /> Assets</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Inventory Value (at cost)</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(bs.inventoryValue, company.currency)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Accounts Receivable (Customer Dues)</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(bs.receivables, company.currency)}</span>
              </div>
              <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3">
                <span className="font-bold text-gray-900 dark:text-white">Total Assets</span>
                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(bs.totalAssets, company.currency)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-red-500"><TrendingDown size={16} /> Liabilities & Equity</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Credit Given to Customers</span>
                <span className="font-semibold text-red-500">{formatCurrency(bs.creditGiven, company.currency)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-bold text-gray-900 dark:text-white">Total Liabilities</span>
                <span className="font-bold text-red-500">{formatCurrency(bs.totalLiabilities, company.currency)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-300">Owner's Equity (Assets − Liabilities)</span>
                <span className={`font-semibold ${bs.equity >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(bs.equity, company.currency)}</span>
              </div>
              <div className="flex justify-between py-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-3">
                <span className="font-bold text-gray-900 dark:text-white">Total Liabilities + Equity</span>
                <span className="font-bold text-gray-900 dark:text-white text-lg">{formatCurrency(bs.totalLiabilities + bs.equity, company.currency)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5 md:col-span-2">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2"><Scale size={16} className="text-primary-500" /> Balance Check</h3>
            <div className={`p-4 rounded-xl ${Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.equity)) < 1 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
              <p className="font-semibold">Assets = {formatCurrency(bs.totalAssets, company.currency)} | Liabilities + Equity = {formatCurrency(bs.totalLiabilities + bs.equity, company.currency)}</p>
              <p className="text-sm mt-1">Note: This is a simplified snapshot. For full accounting, consult your CA.</p>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow */}
      {tab === 'cashflow' && (
        <div className="space-y-4">
          <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Cash Flow Forecast</strong> is based on your average daily sales and expenses from the last 30 days. Actual results may vary.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cashFlow.map(cf => (
              <div key={cf.days} className="card p-5">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Next {cf.days} Days</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Projected Revenue</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(cf.projectedRevenue, company.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Projected Expenses</span>
                    <span className="font-semibold text-red-500">{formatCurrency(cf.projectedExpenses, company.currency)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="font-bold text-gray-900 dark:text-white">Net Cash Flow</span>
                    <span className={`font-bold text-lg ${cf.projectedNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(cf.projectedNet, company.currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-3">Daily Averages (Based on Last 30 Days)</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Avg Daily Revenue', value: cashFlow[2]?.projectedRevenue / 30, color: 'text-emerald-600' },
                { label: 'Avg Daily Expenses', value: cashFlow[2]?.projectedExpenses / 30, color: 'text-red-500' },
                { label: 'Avg Daily Net', value: cashFlow[2]?.projectedNet / 30, color: cashFlow[2]?.projectedNet >= 0 ? 'text-emerald-600' : 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.value || 0, company.currency)}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

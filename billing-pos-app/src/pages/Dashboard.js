import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, ShoppingCart, Package, Users, DollarSign, Download, Clock3, BarChart3 } from 'lucide-react';
import { formatCurrency, formatDate, exportCSV } from '../utils/helpers';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfMonth, startOfYear } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const normalizePaymentMethod = (method) => {
  const value = String(method || '').trim().toLowerCase();
  if (value.includes('cash')) return 'Cash';
  if (value.includes('upi')) return 'UPI';
  if (value.includes('card')) return 'Card';
  if (value.includes('credit')) return 'Credit';
  return 'Other';
};

const aggregatePayments = (invoices) => {
  const totals = { Cash: 0, UPI: 0, Card: 0, Credit: 0, Other: 0 };
  for (const inv of invoices || []) {
    const amount = Number(inv.total || 0);
    if (Array.isArray(inv.paymentBreakdown) && inv.paymentBreakdown.length > 0) {
      inv.paymentBreakdown.forEach((payment) => {
        const key = normalizePaymentMethod(payment.method || payment.type || payment.mode || 'Other');
        totals[key] = totals[key] + Number(payment.amount || 0);
      });
    } else {
      const key = normalizePaymentMethod(inv.paymentMode || inv.paymentMethod || 'Cash');
      totals[key] = totals[key] + amount;
    }
  }
  return totals;
};

const buildHourlySales = (invoices) => {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, sales: 0 }));
  (invoices || []).forEach((inv) => {
    const date = new Date(inv.date);
    const hour = date.getHours();
    const current = Number(inv.total || 0);
    hours[hour].sales += current;
  });
  return hours;
};

const buildReportRows = (invoices, from, to) => {
  const days = eachDayOfInterval({ start: from, end: to });
  return days.map((day) => {
    const start = startOfDay(day);
    const end = endOfDay(day);
    const dailyInvoices = (invoices || []).filter((inv) => {
      const date = new Date(inv.date);
      return date >= start && date <= end;
    });

    const paymentTotals = aggregatePayments(dailyInvoices);
    const total = dailyInvoices.reduce((s, inv) => s + Number(inv.total || 0), 0);
    const count = dailyInvoices.filter((inv) => inv.status !== 'Refund').length;

    return {
      date: format(start, 'dd-MM-yyyy'),
      Cash: paymentTotals.Cash,
      UPI: paymentTotals.UPI,
      Card: paymentTotals.Card,
      Credit: paymentTotals.Credit,
      total,
      bills: count,
    };
  });
};

export default function Dashboard({ setPage }) {
  const { invoices, products, company, currentUser } = useApp();
  const [reportRange, setReportRange] = useState('today');
  const [customDateFrom, setCustomDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customDateTo, setCustomDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const validInvoices = useMemo(() => invoices.filter((inv) => inv && inv.status !== 'Cancelled'), [invoices]);

  // Separate refunds from regular invoices for accurate revenue

  const today = useMemo(() => startOfDay(new Date()), []);
  const yesterday = useMemo(() => startOfDay(subDays(new Date(), 1)), []);

  const todayInvoices = useMemo(() => validInvoices.filter((inv) => {
    const invDate = new Date(inv.date);
    return invDate >= startOfDay(today) && invDate <= endOfDay(today);
  }), [validInvoices, today]);

  const yesterdayInvoices = useMemo(() => validInvoices.filter((inv) => {
    const invDate = new Date(inv.date);
    return invDate >= startOfDay(yesterday) && invDate <= endOfDay(yesterday);
  }), [validInvoices, yesterday]);

  const todayPaymentTotals = useMemo(() => aggregatePayments(todayInvoices.filter(i => i.status !== 'Refund')), [todayInvoices]);
  // Net revenue = regular sales - returns
  const todayRefundTotal = useMemo(() =>
    todayInvoices.filter(i => i.status === 'Refund').reduce((s, inv) => s + Math.abs(Number(inv.total || 0)), 0),
    [todayInvoices]);
  const todayGrossCollection = useMemo(() =>
    todayInvoices.filter(i => i.status !== 'Refund').reduce((s, inv) => s + Number(inv.total || 0), 0),
    [todayInvoices]);
  const todayTotalCollection = useMemo(() => todayGrossCollection - todayRefundTotal, [todayGrossCollection, todayRefundTotal]);
  const todayBills = useMemo(() => todayInvoices.filter(inv => inv.status !== 'Refund').length, [todayInvoices]);
  const todayItemsSold = useMemo(() => todayInvoices.reduce((sum, inv) => {
    const multiplier = inv.status === 'Refund' ? -1 : 1;
    return sum + ((inv.items || []).reduce((s, item) => s + (Number(item.qty || 0) * multiplier), 0));
  }, 0), [todayInvoices]);
  const todayAvgBill = todayBills > 0 ? todayTotalCollection / todayBills : 0;

  const todayProfit = useMemo(() => {
    return todayInvoices.reduce((sum, inv) => {
      const multiplier = inv.status === 'Refund' ? -1 : 1;
      return sum + (inv.items || []).reduce((itemSum, item) => {
        const product = products.find((p) => String(p.id) === String(item.productId));
        const costPrice = Number(item.costPrice ?? product?.costPrice ?? 0);
        return itemSum + ((Number(item.price || 0) - costPrice) * Number(item.qty || 0) * multiplier);
      }, 0);
    }, 0);
  }, [todayInvoices, products]);

  const growthPercent = useMemo(() => {
    const yesterdayTotal = yesterdayInvoices.reduce((s, inv) => s + Number(inv.total || 0), 0);
    if (yesterdayTotal === 0) return todayTotalCollection === 0 ? 0 : 100;
    return Math.round(((todayTotalCollection - yesterdayTotal) / Math.abs(yesterdayTotal)) * 100);
  }, [yesterdayInvoices, todayTotalCollection]);

  const hourlySales = useMemo(() => buildHourlySales(todayInvoices), [todayInvoices]);
  const topSellingHours = useMemo(() => [...hourlySales].sort((a, b) => b.sales - a.sales).slice(0, 5), [hourlySales]);
  const cashUpiData = useMemo(() => [
    { name: 'Cash', value: todayPaymentTotals.Cash },
    { name: 'UPI', value: todayPaymentTotals.UPI },
    { name: 'Card', value: todayPaymentTotals.Card },
    { name: 'Credit', value: todayPaymentTotals.Credit },
  ].filter((item) => item.value !== 0), [todayPaymentTotals]);

  const reportRangeDates = useMemo(() => {
    const now = new Date();
    switch (reportRange) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday': return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
      case '7days': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case '30days': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
      case 'monthly': return { from: startOfMonth(now), to: endOfDay(now) };
      case 'yearly': return { from: startOfYear(now), to: endOfDay(now) };
      case 'custom': {
        const from = customDateFrom ? startOfDay(new Date(customDateFrom)) : startOfDay(now);
        const to = customDateTo ? endOfDay(new Date(customDateTo)) : endOfDay(now);
        return { from, to };
      }
      default: return { from: startOfDay(now), to: endOfDay(now) };
    }
  }, [reportRange, customDateFrom, customDateTo]);

  const reportRows = useMemo(() => buildReportRows(validInvoices, reportRangeDates.from, reportRangeDates.to), [validInvoices, reportRangeDates]);
  const reportTotals = useMemo(() => reportRows.reduce((totals, row) => ({
    Cash: totals.Cash + row.Cash,
    UPI: totals.UPI + row.UPI,
    Card: totals.Card + row.Card,
    Credit: totals.Credit + row.Credit,
    Total: totals.Total + row.total,
    Bills: totals.Bills + row.bills,
  }), { Cash: 0, UPI: 0, Card: 0, Credit: 0, Total: 0, Bills: 0 }), [reportRows]);

  const reportExportData = useMemo(() => reportRows.map((row) => ({
    Date: row.date,
    Cash: row.Cash,
    UPI: row.UPI,
    Card: row.Card,
    Credit: row.Credit,
    'Total Collection': row.total,
    Bills: row.bills,
  })), [reportRows]);

  const reportTitle = reportRange === 'custom' ? 'Custom Range' : reportRange === 'monthly' ? 'Monthly Summary' : reportRange === 'yearly' ? 'Yearly Summary' : reportRange === 'yesterday' ? 'Yesterday' : reportRange === '7days' ? 'Last 7 Days' : reportRange === '30days' ? 'Last 30 Days' : 'Today';

  const StatCard = ({ title, value, sub, icon: Icon, color }) => (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {company?.logoSrc && company?.showLogo !== false && (
            <img
              src={company.logoSrc}
              alt={company.name}
              className="h-12 w-12 rounded-xl object-contain border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 shadow-sm flex-shrink-0"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{company?.name || 'Dashboard'}</h1>
            <p className="text-sm text-gray-500">{formatDate(new Date().toISOString())} — Welcome, {currentUser?.name || 'User'}</p>
          </div>
        </div>
        <button onClick={() => setPage('pos')} className="btn-primary inline-flex items-center gap-2">
          <ShoppingCart size={16} /> New Sale
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Net Revenue" value={formatCurrency(todayTotalCollection, company.currency)} sub={todayRefundTotal > 0 ? `After ${formatCurrency(todayRefundTotal, company.currency)} returns` : 'Today\'s business'} icon={TrendingUp} color="bg-primary-500" />
        <StatCard title="Cash" value={formatCurrency(todayPaymentTotals.Cash, company.currency)} sub="Collected today" icon={DollarSign} color="bg-emerald-500" />
        <StatCard title="UPI" value={formatCurrency(todayPaymentTotals.UPI, company.currency)} sub="Collected today" icon={Users} color="bg-sky-500" />
        <StatCard title="Credit" value={formatCurrency(todayPaymentTotals.Credit, company.currency)} sub="Pending / dues" icon={Package} color="bg-amber-500" />
        <StatCard title="Bills" value={todayBills} sub="Generated today" icon={Clock3} color="bg-violet-500" />
        <StatCard title="Items Sold" value={todayItemsSold} sub="Net units" icon={BarChart3} color="bg-cyan-500" />
      </div>

      {/* Today's Collection Summary */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Today's Collection Summary</h2>
            <p className="text-sm text-gray-500">Real-time collection totals with payment split support.</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400">Growth</p>
            <p className={`text-lg font-semibold ${growthPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500">Cash Collection</p>
            <p className="text-2xl font-semibold mt-2">{formatCurrency(todayPaymentTotals.Cash, company.currency)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500">UPI Collection</p>
            <p className="text-2xl font-semibold mt-2">{formatCurrency(todayPaymentTotals.UPI, company.currency)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500">Card Collection</p>
            <p className="text-2xl font-semibold mt-2">{formatCurrency(todayPaymentTotals.Card, company.currency)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500">Credit Sales</p>
            <p className="text-2xl font-semibold mt-2">{formatCurrency(todayPaymentTotals.Credit, company.currency)}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-sm text-gray-500"><span>Gross Sales</span><span>{formatCurrency(todayGrossCollection, company.currency)}</span></div>
            <div className="flex justify-between text-sm text-red-400 mt-2"><span>Returns / Refunds</span><span>-{formatCurrency(todayRefundTotal, company.currency)}</span></div>
            <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2"><span>Net Revenue</span><span>{formatCurrency(todayTotalCollection, company.currency)}</span></div>
            <div className="flex justify-between text-sm text-gray-500 mt-2"><span>Bills Generated</span><span>{todayBills}</span></div>
            <div className="flex justify-between text-sm text-gray-500 mt-2"><span>Average Bill Value</span><span>{formatCurrency(todayAvgBill, company.currency)}</span></div>
          </div>
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4">
            <div className="text-sm text-gray-500">Profit Estimate</div>
            <div className="mt-3 text-3xl font-semibold text-primary-600">{formatCurrency(todayProfit, company.currency)}</div>
            <div className="text-xs text-gray-400 mt-1">Calculated from sold item cost prices.</div>
          </div>
        </div>
      </div>

      {/* Collection Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Today's Sales Chart</h3>
              <p className="text-xs text-gray-400">Hourly sales performance for today</p>
            </div>
            <span className="badge-blue">{todayInvoices.length} invoices</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={hourlySales}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => formatCurrency(value, company.currency)} />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Cash vs UPI</h3>
              <p className="text-xs text-gray-400">Payment mix today</p>
            </div>
            <span className="badge-emerald">{formatCurrency(todayPaymentTotals.Cash + todayPaymentTotals.UPI || 0, company.currency)}</span>
          </div>
          {cashUpiData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={cashUpiData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {cashUpiData.map((entry, idx) => <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value, company.currency)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center mt-12">No payment data yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Selling Hours</h3>
          <div className="space-y-3">
            {topSellingHours.map((hour, index) => (
              <div key={hour.hour} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{hour.hour}</div>
                  <div className="text-xs text-gray-400">Sales</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary-600">{formatCurrency(hour.sales, company.currency)}</div>
                  <div className="text-xs text-gray-400">Rank {index + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Collection Growth</h3>
          <div className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`}</div>
          <p className="text-sm text-gray-500">Compared to yesterday's net collection</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Yesterday</div>
              <div className="text-lg font-semibold">{formatCurrency(yesterdayInvoices.reduce((s, inv) => s + Number(inv.total || 0), 0), company.currency)}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Today</div>
              <div className="text-lg font-semibold">{formatCurrency(todayTotalCollection, company.currency)}</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Hourly Trend</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr><th className="table-head">Hour</th><th className="table-head">Sales</th></tr>
              </thead>
              <tbody>
                {hourlySales.slice(0, 6).map(h => (
                  <tr key={h.hour} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="table-cell">{h.hour}</td>
                    <td className="table-cell font-semibold">{formatCurrency(h.sales, company.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Day Wise Collection Report */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Day Wise Collection Report</h2>
            <p className="text-sm text-gray-500">Choose a date range and export the daily collection summary.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'monthly', label: 'Monthly Summary' },
              { id: 'yearly', label: 'Yearly Summary' },
              { id: 'custom', label: 'Custom Range' },
            ].map((range) => (
              <button key={range.id} type="button" onClick={() => setReportRange(range.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${reportRange === range.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {reportRange === 'custom' && (
          <div className="flex flex-col gap-3 md:flex-row">
            <input type="date" className="input w-full md:w-1/2" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} />
            <input type="date" className="input w-full md:w-1/2" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500">Report Range</p>
            <p className="mt-2 font-semibold text-gray-900 dark:text-white">{reportTitle}</p>
            <p className="text-sm text-gray-500 mt-1">{format(reportRangeDates.from, 'dd MMM yyyy')} – {format(reportRangeDates.to, 'dd MMM yyyy')}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500">Total Collection</p>
            <p className="mt-2 text-2xl font-semibold text-primary-600">{formatCurrency(reportTotals.Total, company.currency)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500">Bills Generated</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{reportTotals.Bills}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={() => exportCSV(reportExportData, 'collection-report.csv')} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-2"><Download size={14} /> CSV</button>
          <button type="button" onClick={() => exportToExcel(reportExportData, 'collection-report.xlsx', 'Collection')} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-2"><Download size={14} /> Excel</button>
          <button type="button" onClick={() => exportToPDF(reportExportData, 'collection-report.pdf', company)} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-2"><Download size={14} /> PDF</button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Date', 'Cash', 'UPI', 'Card', 'Credit', 'Total Collection', 'Bills'].map((header) => (
                  <th key={header} className="table-head">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {reportRows.map((row) => (
                <tr key={row.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell">{row.date}</td>
                  <td className="table-cell">{formatCurrency(row.Cash, company.currency)}</td>
                  <td className="table-cell">{formatCurrency(row.UPI, company.currency)}</td>
                  <td className="table-cell">{formatCurrency(row.Card, company.currency)}</td>
                  <td className="table-cell">{formatCurrency(row.Credit, company.currency)}</td>
                  <td className="table-cell font-semibold">{formatCurrency(row.total, company.currency)}</td>
                  <td className="table-cell">{row.bills}</td>
                </tr>
              ))}
              {reportRows.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No invoices in this period</td></tr>
              )}
            </tbody>
            {/* Grand Totals row — always visible at the bottom */}
            {reportRows.length > 0 && (
              <tfoot>
                <tr className="bg-primary-50 dark:bg-primary-900/20 border-t-2 border-primary-200 dark:border-primary-800 font-bold text-sm">
                  <td className="table-cell text-primary-700 dark:text-primary-300">GRAND TOTAL</td>
                  <td className="table-cell text-emerald-700 dark:text-emerald-400">{formatCurrency(reportTotals.Cash, company.currency)}</td>
                  <td className="table-cell text-sky-700 dark:text-sky-400">{formatCurrency(reportTotals.UPI, company.currency)}</td>
                  <td className="table-cell text-violet-700 dark:text-violet-400">{formatCurrency(reportTotals.Card, company.currency)}</td>
                  <td className="table-cell text-amber-700 dark:text-amber-400">{formatCurrency(reportTotals.Credit, company.currency)}</td>
                  <td className="table-cell text-primary-700 dark:text-primary-300 text-base">{formatCurrency(reportTotals.Total, company.currency)}</td>
                  <td className="table-cell text-primary-700 dark:text-primary-300">{reportTotals.Bills}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Summary cards below table */}
        {reportRows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {[
              { label: 'Total Cash', value: reportTotals.Cash, color: 'text-emerald-600' },
              { label: 'Total UPI', value: reportTotals.UPI, color: 'text-sky-600' },
              { label: 'Total Card', value: reportTotals.Card, color: 'text-violet-600' },
              { label: 'Total Credit', value: reportTotals.Credit, color: 'text-amber-600' },
              { label: 'Grand Total', value: reportTotals.Total, color: 'text-primary-600' },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value, company.currency)}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

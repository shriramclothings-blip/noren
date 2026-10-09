import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Crown, Star, Clock, TrendingDown, Gift, Search, Edit2, Check, X } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { differenceInDays, format, subMonths, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';

// RFM Scoring
function computeRFM(customer, invoices) {
  const custInv = invoices.filter(i => i.customerId === customer.id && i.status !== 'Refund' && i.status !== 'Cancelled');
  if (custInv.length === 0) return { r: 1, f: 1, m: 1, segment: 'Lost', color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };

  const sorted = [...custInv].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastDate = new Date(sorted[0].date);
  const daysSince = differenceInDays(new Date(), lastDate);
  const frequency = custInv.length;
  const monetary = custInv.reduce((s, i) => s + (i.total || 0), 0);

  // Score 1-5
  const r = daysSince <= 7 ? 5 : daysSince <= 30 ? 4 : daysSince <= 60 ? 3 : daysSince <= 120 ? 2 : 1;
  const f = frequency >= 20 ? 5 : frequency >= 10 ? 4 : frequency >= 5 ? 3 : frequency >= 2 ? 2 : 1;
  const m = monetary >= 50000 ? 5 : monetary >= 20000 ? 4 : monetary >= 5000 ? 3 : monetary >= 1000 ? 2 : 1;
  const avg = (r + f + m) / 3;

  let segment, color, bg;
  if (r >= 4 && f >= 4 && m >= 4) { segment = 'Champion'; color = 'text-violet-600'; bg = 'bg-violet-50 dark:bg-violet-900/20'; }
  else if (r >= 3 && f >= 3 && m >= 3) { segment = 'Loyal'; color = 'text-emerald-600'; bg = 'bg-emerald-50 dark:bg-emerald-900/20'; }
  else if (r >= 4 && f <= 2) { segment = 'New'; color = 'text-blue-600'; bg = 'bg-blue-50 dark:bg-blue-900/20'; }
  else if (r >= 3 && m >= 3) { segment = 'Potential'; color = 'text-primary-600'; bg = 'bg-primary-50 dark:bg-primary-900/20'; }
  else if (r <= 2 && f >= 3) { segment = 'At Risk'; color = 'text-orange-600'; bg = 'bg-orange-50 dark:bg-orange-900/20'; }
  else if (r === 1 && f >= 2) { segment = 'Lost'; color = 'text-red-600'; bg = 'bg-red-50 dark:bg-red-900/20'; }
  else { segment = 'Inactive'; color = 'text-gray-500'; bg = 'bg-gray-50 dark:bg-gray-800'; }

  return { r, f, m, avg: avg.toFixed(1), segment, color, bg, daysSince, frequency, monetary };
}

// Cohort Analysis
function buildCohortData(customers, invoices) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    return { label: format(d, 'MMM yy'), start: startOfMonth(d), end: endOfMonth(d) };
  });

  return months.map(m => {
    // Customers who made their FIRST purchase in this month
    const newCustomers = customers.filter(c => {
      const firstInv = invoices
        .filter(i => i.customerId === c.id && i.status !== 'Refund')
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      if (!firstInv) return false;
      const d = new Date(firstInv.date);
      return d >= m.start && d <= m.end;
    });

    // Of those, how many came back in subsequent months
    const retention = months.map(retMonth => {
      if (retMonth.start < m.start) return null;
      const returned = newCustomers.filter(c =>
        invoices.some(i => i.customerId === c.id && i.status !== 'Refund' &&
          new Date(i.date) >= retMonth.start && new Date(i.date) <= retMonth.end)
      ).length;
      return newCustomers.length > 0 ? Math.round((returned / newCustomers.length) * 100) : 0;
    });

    return { ...m, newCustomers: newCustomers.length, retention };
  });
}

export default function CustomerInsights({ setPage }) {
  const { customers, invoices, updateCustomer, company } = useApp();
  const [tab, setTab] = useState('rfm');
  const [search, setSearch] = useState('');
  const [segFilter, setSegFilter] = useState('All');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  const enriched = useMemo(() =>
    customers.map(c => ({ ...c, rfm: computeRFM(c, invoices) })),
    [customers, invoices]
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (search) list = list.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
    if (segFilter !== 'All') list = list.filter(c => c.rfm.segment === segFilter);
    return list.sort((a, b) => b.rfm.monetary - a.rfm.monetary);
  }, [enriched, search, segFilter]);

  const segCounts = useMemo(() => {
    const counts = {};
    enriched.forEach(c => { counts[c.rfm.segment] = (counts[c.rfm.segment] || 0) + 1; });
    return counts;
  }, [enriched]);

  const cohortData = useMemo(() => buildCohortData(customers, invoices), [customers, invoices]);

  // Birthday alerts
  const today = useMemo(() => new Date(), []);
  const birthdayAlerts = useMemo(() => customers.filter(c => {
    if (!c.birthday) return false;
    try {
      const d = parseISO(c.birthday);
      if (!isValid(d)) return false;
      const days = differenceInDays(new Date(today.getFullYear(), d.getMonth(), d.getDate()), today);
      return days >= 0 && days <= 7;
    } catch { return false; }
  }), [customers, today]);

  const handleSaveEdit = async () => {
    await updateCustomer({ ...editModal, ...editForm });
    toast.success('Customer updated');
    setEditModal(null);
  };

  const SEGMENTS = ['Champion', 'Loyal', 'Potential', 'New', 'At Risk', 'Lost', 'Inactive'];

  const retentionColor = (val) => {
    if (val === null) return 'bg-gray-100 dark:bg-gray-800 text-gray-300';
    if (val >= 60) return 'bg-emerald-500 text-white';
    if (val >= 30) return 'bg-amber-400 text-white';
    if (val >= 10) return 'bg-orange-400 text-white';
    return 'bg-red-400 text-white';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-primary-500" size={26} /> Customer Insights</h1>
        <p className="text-sm text-gray-400 mt-0.5">RFM Scoring • Segmentation • Cohort Analysis • Birthday Alerts</p>
      </div>

      {/* Birthday Alerts */}
      {birthdayAlerts.length > 0 && (
        <div className="p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-xl">
          <p className="font-semibold text-pink-700 dark:text-pink-400 flex items-center gap-2 mb-2">
            <Gift size={16} /> 🎂 Upcoming Birthdays (Next 7 Days)
          </p>
          <div className="flex flex-wrap gap-2">
            {birthdayAlerts.map(c => {
              const d = parseISO(c.birthday);
              const days = differenceInDays(new Date(today.getFullYear(), d.getMonth(), d.getDate()), today);
              return (
                <span key={c.id} className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm border border-pink-200 dark:border-pink-800">
                  🎂 {c.name} — {days === 0 ? 'Today!' : `in ${days} day${days > 1 ? 's' : ''}`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'rfm', label: 'RFM Scoring' },
          { key: 'segmentation', label: 'Segmentation' },
          { key: 'cohort', label: 'Cohort Analysis' },
          { key: 'birthdays', label: 'Birthdays & Anniversaries' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* RFM Tab */}
      {tab === 'rfm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { seg: 'Champion', icon: Crown, color: 'text-violet-600' },
              { seg: 'Loyal', icon: Star, color: 'text-emerald-600' },
              { seg: 'At Risk', icon: TrendingDown, color: 'text-orange-600' },
              { seg: 'Lost', icon: Clock, color: 'text-red-600' },
            ].map(s => (
              <div key={s.seg} className="card p-4">
                <s.icon size={18} className={s.color + ' mb-2'} />
                <p className="text-2xl font-bold">{segCounts[s.seg] || 0}</p>
                <p className="text-xs text-gray-400">{s.seg} Customers</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input w-44" value={segFilter} onChange={e => setSegFilter(e.target.value)}>
              <option>All</option>
              {SEGMENTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Customer', 'Segment', 'R Score', 'F Score', 'M Score', 'Avg', 'Last Visit', 'Orders', 'Total Spent'].map(h => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.slice(0, 100).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.phone}</div>
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.rfm.bg} ${c.rfm.color}`}>{c.rfm.segment}</span>
                      </td>
                      <td className="table-cell text-center"><span className="font-bold text-blue-600">{c.rfm.r}</span></td>
                      <td className="table-cell text-center"><span className="font-bold text-emerald-600">{c.rfm.f}</span></td>
                      <td className="table-cell text-center"><span className="font-bold text-amber-600">{c.rfm.m}</span></td>
                      <td className="table-cell text-center font-bold">{c.rfm.avg}</td>
                      <td className="table-cell text-xs text-gray-500">{c.rfm.daysSince != null ? `${c.rfm.daysSince}d ago` : '—'}</td>
                      <td className="table-cell text-center">{c.rfm.frequency}</td>
                      <td className="table-cell font-semibold text-emerald-600">{formatCurrency(c.rfm.monetary, company.currency)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No customers found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Segmentation Tab */}
      {tab === 'segmentation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SEGMENTS.map(seg => {
              const count = segCounts[seg] || 0;
              const pct = customers.length > 0 ? Math.round((count / customers.length) * 100) : 0;
              return (
                <div key={seg} className="card p-4">
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{seg}</p>
                  <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% of customers</p>
                </div>
              );
            })}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-3">Segment Descriptions</h3>
            <div className="space-y-2 text-sm">
              {[
                { seg: 'Champion', desc: 'Bought recently, buy often, spend the most. Reward them!', color: 'text-violet-600' },
                { seg: 'Loyal', desc: 'Regular buyers with good spending. Keep them engaged.', color: 'text-emerald-600' },
                { seg: 'Potential', desc: 'Recent customers with average frequency. Nurture them.', color: 'text-primary-600' },
                { seg: 'New', desc: 'Bought recently but only once. Convert to loyal.', color: 'text-blue-600' },
                { seg: 'At Risk', desc: 'Used to buy often but haven\'t recently. Win them back!', color: 'text-orange-600' },
                { seg: 'Lost', desc: 'Haven\'t bought in a long time. Send re-engagement offer.', color: 'text-red-600' },
                { seg: 'Inactive', desc: 'Low frequency, low spend, not recent. Low priority.', color: 'text-gray-500' },
              ].map(s => (
                <div key={s.seg} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className={`font-semibold w-24 shrink-0 ${s.color}`}>{s.seg}</span>
                  <span className="text-gray-500">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cohort Tab */}
      {tab === 'cohort' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-1">Customer Retention Cohort (Last 6 Months)</h3>
            <p className="text-xs text-gray-400 mb-4">% of new customers from each month who returned in subsequent months</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-gray-500">Cohort</th>
                    <th className="p-2 text-gray-500">New</th>
                    {cohortData.map(m => <th key={m.label} className="p-2 text-gray-500">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cohortData.map((row, ri) => (
                    <tr key={row.label}>
                      <td className="p-2 font-semibold text-gray-700 dark:text-gray-300">{row.label}</td>
                      <td className="p-2 text-center font-bold text-primary-600">{row.newCustomers}</td>
                      {row.retention.map((val, ci) => (
                        <td key={ci} className="p-1">
                          {val === null ? (
                            <div className="w-12 h-8 rounded" />
                          ) : (
                            <div className={`w-12 h-8 rounded flex items-center justify-center font-bold ${retentionColor(val)}`}>
                              {val}%
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> 60%+</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> 30-60%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> 10-30%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> &lt;10%</span>
            </div>
          </div>
        </div>
      )}

      {/* Birthdays Tab */}
      {tab === 'birthdays' && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="font-semibold">Customer Birthdays & Anniversaries</span>
              <span className="text-xs text-gray-400">Click Edit to add dates</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Customer', 'Phone', 'Birthday', 'Anniversary', 'Days to Birthday', 'Action'].map(h => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {customers.map(c => {
                    let daysB = null;
                    if (c.birthday) {
                      try {
                        const d = parseISO(c.birthday);
                        if (isValid(d)) {
                          daysB = differenceInDays(new Date(today.getFullYear(), d.getMonth(), d.getDate()), today);
                          if (daysB < 0) daysB = differenceInDays(new Date(today.getFullYear() + 1, d.getMonth(), d.getDate()), today);
                        }
                      } catch {}
                    }
                    return (
                      <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${daysB !== null && daysB <= 7 ? 'bg-pink-50/50 dark:bg-pink-900/10' : ''}`}>
                        <td className="table-cell font-medium">{c.name}</td>
                        <td className="table-cell text-gray-500">{c.phone || '—'}</td>
                        <td className="table-cell">{c.birthday ? (() => { try { return format(parseISO(c.birthday), 'dd MMM'); } catch { return c.birthday; } })() : <span className="text-gray-300">Not set</span>}</td>
                        <td className="table-cell">{c.anniversary ? (() => { try { return format(parseISO(c.anniversary), 'dd MMM'); } catch { return c.anniversary; } })() : <span className="text-gray-300">Not set</span>}</td>
                        <td className="table-cell">
                          {daysB !== null ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${daysB === 0 ? 'bg-pink-100 text-pink-700' : daysB <= 7 ? 'bg-pink-50 text-pink-600' : 'bg-gray-50 text-gray-500'}`}>
                              {daysB === 0 ? '🎂 Today!' : `${daysB}d`}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="table-cell">
                          <button onClick={() => { setEditModal(c); setEditForm({ birthday: c.birthday || '', anniversary: c.anniversary || '' }); }}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                            <Edit2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Edit {editModal.name}</h3>
            <label className="label">Birthday</label>
            <input className="input mb-3" type="date" value={editForm.birthday || ''} onChange={e => setEditForm(p => ({ ...p, birthday: e.target.value }))} />
            <label className="label">Anniversary</label>
            <input className="input mb-4" type="date" value={editForm.anniversary || ''} onChange={e => setEditForm(p => ({ ...p, anniversary: e.target.value }))} />
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} className="btn-primary flex-1 justify-center"><Check size={15} /> Save</button>
              <button onClick={() => setEditModal(null)} className="btn-secondary flex-1 justify-center"><X size={15} /> Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

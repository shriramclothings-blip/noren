import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Calendar, Clock, CheckCircle, Search, Edit2, Check, X } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';

function ExpiryBadge({ days }) {
  if (days < 0) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expired</span>;
  if (days <= 7) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">⚠ {days}d left</span>;
  if (days <= 15) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{days}d left</span>;
  if (days <= 30) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{days}d left</span>;
  return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{days}d left</span>;
}

export default function ExpiryTracker() {
  const { products, updateProduct, company } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [editDate, setEditDate] = useState('');

  const today = useMemo(() => new Date(), []);

  const productsWithExpiry = useMemo(() => {
    return products
      .filter(p => p.expiryDate)
      .map(p => {
        let days = null;
        try {
          const d = parseISO(p.expiryDate);
          if (isValid(d)) days = differenceInDays(d, today);
        } catch {}
        return { ...p, days };
      })
      .filter(p => p.days !== null)
      .sort((a, b) => a.days - b.days);
  }, [products, today]);

  const allProducts = useMemo(() => products.filter(p => !p.archived), [products]);

  const filtered = useMemo(() => {
    let list = productsWithExpiry;
    if (filter === 'expired') list = list.filter(p => p.days < 0);
    else if (filter === '7') list = list.filter(p => p.days >= 0 && p.days <= 7);
    else if (filter === '15') list = list.filter(p => p.days >= 0 && p.days <= 15);
    else if (filter === '30') list = list.filter(p => p.days >= 0 && p.days <= 30);
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [productsWithExpiry, filter, search]);

  const stats = useMemo(() => ({
    expired: productsWithExpiry.filter(p => p.days < 0).length,
    within7: productsWithExpiry.filter(p => p.days >= 0 && p.days <= 7).length,
    within15: productsWithExpiry.filter(p => p.days >= 0 && p.days <= 15).length,
    within30: productsWithExpiry.filter(p => p.days >= 0 && p.days <= 30).length,
    noExpiry: allProducts.filter(p => !p.expiryDate).length,
  }), [productsWithExpiry, allProducts]);

  const handleSaveExpiry = async () => {
    if (!editDate) return toast.error('Select a date');
    await updateProduct({ ...editModal, expiryDate: editDate });
    toast.success('Expiry date updated');
    setEditModal(null);
  };

  const productsWithoutExpiry = useMemo(() =>
    allProducts.filter(p => !p.expiryDate && !p.archived).slice(0, 50),
    [allProducts]
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="text-orange-500" size={26} /> Expiry Date Tracker</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monitor product expiry dates and take action before stock expires</p>
      </div>

      {/* Alert Banner */}
      {(stats.expired > 0 || stats.within7 > 0) && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Urgent Action Required</p>
            <p className="text-sm text-red-600 dark:text-red-300">
              {stats.expired > 0 && `${stats.expired} product(s) already expired. `}
              {stats.within7 > 0 && `${stats.within7} product(s) expiring within 7 days.`}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Expired', value: stats.expired, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', key: 'expired' },
          { label: 'Within 7 Days', value: stats.within7, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', key: '7' },
          { label: 'Within 15 Days', value: stats.within15, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', key: '15' },
          { label: 'Within 30 Days', value: stats.within30, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', key: '30' },
          { label: 'No Expiry Set', value: stats.noExpiry, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800', key: 'all' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`card p-4 text-left transition-all ${filter === s.key ? 'ring-2 ring-primary-400' : ''} ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All with Expiry</option>
          <option value="expired">Expired</option>
          <option value="7">Within 7 Days</option>
          <option value="15">Within 15 Days</option>
          <option value="30">Within 30 Days</option>
        </select>
      </div>

      {/* Expiry Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-sm">
          Products with Expiry Dates ({filtered.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Product', 'Category', 'Stock', 'Stock Value', 'Expiry Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                  No products in this category
                </td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${p.days < 0 ? 'bg-red-50/50 dark:bg-red-900/10' : p.days <= 7 ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                  <td className="table-cell">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.sku || p.barcode || ''}</div>
                  </td>
                  <td className="table-cell text-gray-500">{p.category || '—'}</td>
                  <td className="table-cell font-semibold">{p.stock ?? 0}</td>
                  <td className="table-cell">{formatCurrency((p.stock || 0) * (p.costPrice || 0), company.currency)}</td>
                  <td className="table-cell">
                    {p.expiryDate ? (() => {
                      try { return format(parseISO(p.expiryDate), 'dd MMM yyyy'); } catch { return p.expiryDate; }
                    })() : '—'}
                  </td>
                  <td className="table-cell"><ExpiryBadge days={p.days} /></td>
                  <td className="table-cell">
                    <button onClick={() => { setEditModal(p); setEditDate(p.expiryDate || ''); }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products without expiry */}
      {productsWithoutExpiry.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-600">
            <Clock size={16} /> Products Without Expiry Date Set ({stats.noExpiry})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {productsWithoutExpiry.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400">Stock: {p.stock ?? 0}</p>
                </div>
                <button onClick={() => { setEditModal(p); setEditDate(''); }}
                  className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg hover:bg-primary-100">
                  Set Date
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-1">Set Expiry Date</h3>
            <p className="text-sm text-gray-500 mb-4">{editModal.name}</p>
            <label className="label">Expiry Date</label>
            <input className="input mb-4" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={handleSaveExpiry} className="btn-primary flex-1 justify-center"><Check size={15} /> Save</button>
              <button onClick={() => setEditModal(null)} className="btn-secondary flex-1 justify-center"><X size={15} /> Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

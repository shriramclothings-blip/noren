import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/exportUtils';
import {
  Tag, Percent, Clock, ShoppingBag, CheckCircle,
  Download, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n, cur = '₹') =>
  `${cur}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── TAB: Batch Discount Creator ─────────────────────────────────────────────
function BatchDiscount({ products, invoices, updateProduct, company }) {
  const [discountPct, setDiscountPct] = useState(20);
  const [deadDays, setDeadDays] = useState(60);
  const [selected, setSelected] = useState(new Set());
  const [applying, setApplying] = useState(false);
  const [expiryDays, setExpiryDays] = useState(3);

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - deadDays); return d;
  }, [deadDays]);

  const deadStock = useMemo(() => {
    return products
      .filter(p => (p.stock || 0) > 0)
      .map(p => {
        const recentSale = invoices.some(inv => new Date(inv.date) >= cutoff && (inv.items || []).some(i => i.productId === p.id));
        const costValue = (p.stock || 0) * (p.costPrice || 0);
        const originalPrice = p.salePrice || p.price || 0;
        const discountedPrice = originalPrice * (1 - discountPct / 100);
        const hasActiveDiscount = p.discountExpiry && new Date(p.discountExpiry) > new Date();
        return { ...p, recentSale, costValue, originalPrice, discountedPrice, hasActiveDiscount };
      })
      .filter(p => !p.recentSale)
      .sort((a, b) => b.costValue - a.costValue);
  }, [products, invoices, cutoff, discountPct]);

  const toggleAll = () => {
    if (selected.size === deadStock.length) setSelected(new Set());
    else setSelected(new Set(deadStock.map(p => p.id)));
  };

  const toggle = id => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s);
  };

  const applyDiscount = async () => {
    if (!selected.size) return toast.error('Select at least one product');
    setApplying(true);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiryDays);

    let count = 0;
    for (const p of deadStock.filter(p => selected.has(p.id))) {
      try {
        await updateProduct({
          ...p,
          discountPct,
          discountExpiry: expiry.toISOString(),
          salePrice: p.discountedPrice,
          price: p.discountedPrice,
          originalPrice: p.originalPrice,
          isClearance: true,
        });
        count++;
      } catch (e) {
        console.error('Failed to update:', p.name, e);
      }
    }
    toast.success(`${count} products discounted ${discountPct}% until ${expiry.toLocaleDateString('en-IN')}`);
    setSelected(new Set());
    setApplying(false);
  };

  const removeDiscount = async (product) => {
    try {
      await updateProduct({
        ...product,
        discountPct: 0,
        discountExpiry: null,
        salePrice: product.originalPrice || product.salePrice,
        price: product.originalPrice || product.price,
        originalPrice: null,
        isClearance: false,
      });
      toast.success(`Discount removed from ${product.name}`);
    } catch (e) {
      toast.error('Failed to remove discount');
    }
  };

  const totalDeadValue = deadStock.reduce((s, p) => s + p.costValue, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-2xl font-bold text-red-500">{deadStock.length}</p>
          <p className="text-xs text-gray-400">Dead Stock Items</p>
        </div>
        <div className="card p-4 border-l-4 border-orange-400">
          <p className="text-xl font-bold text-orange-500">{fmt(totalDeadValue, company.currency)}</p>
          <p className="text-xs text-gray-400">Blocked Capital</p>
        </div>
        <div className="card p-4 border-l-4 border-primary-500">
          <p className="text-2xl font-bold text-primary-600">{selected.size}</p>
          <p className="text-xs text-gray-400">Selected for Discount</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="font-semibold text-sm">Configure Batch Discount</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label text-xs">Discount Percentage</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={70} value={discountPct}
                onChange={e => setDiscountPct(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xl font-bold text-primary-600 w-14 text-right">{discountPct}%</span>
            </div>
            <div className="flex gap-1 mt-1">
              {[10, 15, 20, 25, 30, 40, 50].map(d => (
                <button key={d} onClick={() => setDiscountPct(d)}
                  className={`px-2 py-0.5 rounded text-xs ${discountPct === d ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
                  {d}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label text-xs">No sales in last (days)</label>
            <select className="input" value={deadDays} onChange={e => setDeadDays(Number(e.target.value))}>
              {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Discount valid for</label>
            <select className="input" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}>
              {[1, 2, 3, 5, 7, 10, 14, 30].map(d => <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={applyDiscount}
          disabled={!selected.size || applying}
          className="btn-primary gap-2"
        >
          <Tag size={15} />
          {applying ? 'Applying...' : `Apply ${discountPct}% Discount to ${selected.size} Products`}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <input type="checkbox" checked={selected.size === deadStock.length && deadStock.length > 0} onChange={toggleAll} className="rounded" />
          <span className="font-semibold text-sm">Dead Stock — No sales in last {deadDays} days ({deadStock.length} items)</span>
          <button
            onClick={() => exportToExcel(deadStock.map(p => ({
              Product: p.name, SKU: p.sku, Stock: p.stock, CostPrice: p.costPrice,
              CurrentPrice: p.originalPrice, DiscountedPrice: p.discountedPrice.toFixed(2),
              BlockedCapital: p.costValue.toFixed(2), HasDiscount: p.hasActiveDiscount ? 'Yes' : 'No',
            })), `dead-stock-discount-${new Date().toISOString().split('T')[0]}.xlsx`, 'BatchDiscount')}
            className="btn-secondary btn-sm gap-1 ml-auto"
          >
            <Download size={13} /> Export
          </button>
        </div>
        {deadStock.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400 opacity-60" />
            <p className="text-green-500 font-medium">No dead stock! All items selling well.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['', 'Product', 'Category', 'Stock', 'Current Price', `At ${discountPct}% Off`, 'Blocked Capital', 'Status', 'Action'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {deadStock.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${selected.has(p.id) ? 'bg-primary-50/40 dark:bg-primary-900/20' : ''}`}>
                    <td className="table-cell">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="rounded" />
                    </td>
                    <td className="table-cell font-medium">
                      {p.isClearance && <span className="mr-1">🏷️</span>}
                      {p.name}
                    </td>
                    <td className="table-cell text-gray-500">{p.category || '—'}</td>
                    <td className="table-cell font-bold">{p.stock}</td>
                    <td className="table-cell">{fmt(p.originalPrice, company.currency)}</td>
                    <td className="table-cell font-semibold text-emerald-600">{fmt(p.discountedPrice, company.currency)}</td>
                    <td className="table-cell text-orange-500 font-medium">{fmt(p.costValue, company.currency)}</td>
                    <td className="table-cell">
                      {p.hasActiveDiscount
                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">🏷️ Discounted</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">No Discount</span>
                      }
                    </td>
                    <td className="table-cell">
                      {p.hasActiveDiscount && (
                        <button onClick={() => removeDiscount(p)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                          <XCircle size={12} /> Remove
                        </button>
                      )}
                    </td>
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

// ─── TAB: Active Discounts & Expiry ─────────────────────────────────────────
function ActiveDiscounts({ products, updateProduct, company }) {
  const activeDiscounts = useMemo(() => {
    return products
      .filter(p => p.discountExpiry || p.isClearance || p.discountPct > 0)
      .map(p => {
        const expiry = p.discountExpiry ? new Date(p.discountExpiry) : null;
        const now = new Date();
        const isExpired = expiry && expiry < now;
        const daysLeft = expiry ? Math.ceil((expiry - now) / 86400000) : null;
        return { ...p, expiry, isExpired, daysLeft };
      })
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  }, [products]);

  const expired = activeDiscounts.filter(p => p.isExpired);
  const active = activeDiscounts.filter(p => !p.isExpired);

  const revertExpired = async () => {
    let count = 0;
    for (const p of expired) {
      try {
        await updateProduct({
          ...p,
          discountPct: 0,
          discountExpiry: null,
          salePrice: p.originalPrice || p.salePrice,
          price: p.originalPrice || p.price,
          originalPrice: null,
          isClearance: false,
        });
        count++;
      } catch (e) {}
    }
    if (count > 0) toast.success(`Reverted ${count} expired discounts`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-emerald-500">
          <p className="text-2xl font-bold text-emerald-600">{active.length}</p>
          <p className="text-xs text-gray-400">Active Discounts</p>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-2xl font-bold text-red-500">{expired.length}</p>
          <p className="text-xs text-gray-400">Expired Discounts</p>
        </div>
        <div className="card p-4 border-l-4 border-amber-400">
          <p className="text-2xl font-bold text-amber-500">{activeDiscounts.filter(p => p.daysLeft !== null && p.daysLeft <= 1 && !p.isExpired).length}</p>
          <p className="text-xs text-gray-400">Expiring Today</p>
        </div>
      </div>

      {expired.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300 text-sm">{expired.length} discounts have expired</p>
            <p className="text-xs text-red-500 mt-0.5">Click "Auto-Revert" to restore original prices</p>
          </div>
          <button onClick={revertExpired} className="btn-danger btn-sm gap-2">
            <XCircle size={14} /> Auto-Revert All
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {activeDiscounts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag size={40} className="mx-auto mb-3 opacity-30" />
            <p>No active discounts</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Product', 'Category', 'Stock', 'Original Price', 'Discounted Price', 'Discount', 'Expires', 'Days Left', 'Status', 'Action'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {activeDiscounts.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${p.isExpired ? 'opacity-60' : ''}`}>
                    <td className="table-cell font-medium">
                      {p.isClearance && '🏷️ '}{p.name}
                    </td>
                    <td className="table-cell text-gray-500">{p.category || '—'}</td>
                    <td className="table-cell font-bold">{p.stock}</td>
                    <td className="table-cell text-gray-400 line-through">{fmt(p.originalPrice || p.price, company.currency)}</td>
                    <td className="table-cell font-semibold text-emerald-600">{fmt(p.salePrice || p.price, company.currency)}</td>
                    <td className="table-cell font-bold text-primary-600">{p.discountPct || 0}%</td>
                    <td className="table-cell text-xs">{p.expiry ? p.expiry.toLocaleDateString('en-IN') : '—'}</td>
                    <td className="table-cell">
                      {p.isExpired ? (
                        <span className="text-red-500 font-medium text-xs">Expired</span>
                      ) : p.daysLeft !== null ? (
                        <span className={`font-medium text-xs ${p.daysLeft <= 1 ? 'text-red-500' : p.daysLeft <= 3 ? 'text-orange-500' : 'text-emerald-600'}`}>
                          {p.daysLeft}d
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.isExpired ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        p.isClearance ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {p.isExpired ? 'Expired' : p.isClearance ? '🏷️ Clearance' : 'Active'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => updateProduct({ ...p, discountPct: 0, discountExpiry: null, salePrice: p.originalPrice || p.salePrice, price: p.originalPrice || p.price, originalPrice: null, isClearance: false })}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <XCircle size={12} /> Remove
                      </button>
                    </td>
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

// ─── TAB: Clearance Mode ─────────────────────────────────────────────────────
function ClearanceMode({ products, updateProduct, company }) {
  const clearanceItems = products.filter(p => p.isClearance);
  const [selected, setSelected] = useState(new Set());

  const bulkRemoveClearance = async () => {
    const toRevert = clearanceItems.filter(p => selected.has(p.id));
    if (!toRevert.length) return toast.error('Select items to remove from clearance');
    for (const p of toRevert) {
      await updateProduct({ ...p, isClearance: false, discountPct: 0, discountExpiry: null, salePrice: p.originalPrice || p.salePrice, price: p.originalPrice || p.price, originalPrice: null });
    }
    toast.success(`${toRevert.length} items removed from clearance`);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <p className="font-semibold text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
          <ShoppingBag size={16} /> Clearance Sale Mode
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Items marked as clearance show a 🏷️ badge in POS. Use Batch Discount to mark items as clearance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 border-l-4 border-amber-400">
          <p className="text-2xl font-bold text-amber-500">{clearanceItems.length}</p>
          <p className="text-xs text-gray-400">Items in Clearance</p>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-xl font-bold text-red-500">
            {fmt(clearanceItems.reduce((s, p) => s + (p.stock || 0) * (p.costPrice || 0), 0), company.currency)}
          </p>
          <p className="text-xs text-gray-400">Clearance Capital</p>
        </div>
      </div>

      {clearanceItems.length > 0 && (
        <div className="flex items-center gap-3">
          <input type="checkbox"
            checked={selected.size === clearanceItems.length}
            onChange={() => selected.size === clearanceItems.length ? setSelected(new Set()) : setSelected(new Set(clearanceItems.map(p => p.id)))}
            className="rounded"
          />
          <span className="text-sm text-gray-500">Select all</span>
          <button onClick={bulkRemoveClearance} disabled={!selected.size} className="btn-danger btn-sm gap-2 ml-auto">
            <XCircle size={14} /> Remove from Clearance ({selected.size})
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {clearanceItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p>No items in clearance mode</p>
            <p className="text-xs mt-1">Use Batch Discount tab to add items to clearance</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['', 'Product', 'Stock', 'Original Price', 'Clearance Price', 'Discount', 'Expiry'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {clearanceItems.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell">
                      <input type="checkbox" checked={selected.has(p.id)}
                        onChange={() => { const s = new Set(selected); s.has(p.id) ? s.delete(p.id) : s.add(p.id); setSelected(s); }}
                        className="rounded"
                      />
                    </td>
                    <td className="table-cell font-medium">🏷️ {p.name}</td>
                    <td className="table-cell font-bold">{p.stock}</td>
                    <td className="table-cell text-gray-400 line-through">{fmt(p.originalPrice || p.price, company.currency)}</td>
                    <td className="table-cell font-semibold text-emerald-600">{fmt(p.salePrice || p.price, company.currency)}</td>
                    <td className="table-cell font-bold text-primary-600">{p.discountPct || 0}%</td>
                    <td className="table-cell text-xs text-gray-500">
                      {p.discountExpiry ? new Date(p.discountExpiry).toLocaleDateString('en-IN') : '—'}
                    </td>
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

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'batch',     label: 'Batch Discount',     icon: Percent },
  { key: 'active',    label: 'Active Discounts',   icon: Clock },
  { key: 'clearance', label: 'Clearance Mode',     icon: ShoppingBag },
];

export default function DiscountEngine() {
  const { products, invoices, updateProduct, company } = useApp();
  const [tab, setTab] = useState('batch');

  const clearanceCount = products.filter(p => p.isClearance).length;
  const activeDiscountCount = products.filter(p => p.discountPct > 0 && !p.isClearance).length;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="text-primary-600" size={26} /> Smart Discount Engine
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Batch discounts · Expiry timers · Clearance mode</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {clearanceCount > 0 && (
            <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-medium">
              🏷️ {clearanceCount} Clearance
            </span>
          )}
          {activeDiscountCount > 0 && (
            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium">
              {activeDiscountCount} Active Discounts
            </span>
          )}
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
            {key === 'clearance' && clearanceCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-400 text-white">{clearanceCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'batch'     && <BatchDiscount products={products} invoices={invoices} updateProduct={updateProduct} company={company} />}
      {tab === 'active'    && <ActiveDiscounts products={products} updateProduct={updateProduct} company={company} />}
      {tab === 'clearance' && <ClearanceMode products={products} updateProduct={updateProduct} company={company} />}
    </div>
  );
}

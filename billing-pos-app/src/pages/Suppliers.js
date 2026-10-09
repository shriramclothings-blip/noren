import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  Plus, Search, Edit2, Trash2, Eye, X, Check,
  Users, TrendingUp, Package, AlertCircle,
  ShoppingCart, RotateCcw, Star, Activity, ChevronRight,
  Building2, Phone, Mail, MapPin, CreditCard, FileText,
  BarChart3, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',  label: 'Overview',  icon: BarChart3 },
  { key: 'suppliers', label: 'Suppliers', icon: Users },
  { key: 'payments',  label: 'Payments',  icon: CreditCard },
  { key: 'returns',   label: 'Returns',   icon: RotateCcw },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'reports',   label: 'Reports',   icon: FileText },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const curr = (v, sym = '₹') => formatCurrency(v, sym);

function KpiCard({ icon: Icon, label, value, sub, color = 'blue', onClick }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-500',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  };
  return (
    <div
      onClick={onClick}
      className={`card p-4 flex items-start gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Suppliers() {
  const {
    suppliers, purchases, products, invoices, company,
    supplierPayments, supplierReturns,
    addSupplier, updateSupplier, deleteSupplier,
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview');

  // ── Derived KPI data ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const active   = suppliers.filter(s => (s.status || 'active') === 'active').length;
    const inactive = suppliers.length - active;

    const totalPurchaseValue = purchases.reduce((s, p) => s + Number(p.total || 0), 0);

    const outstanding = suppliers.reduce((s, sup) => s + Math.max(0, Number(sup.balance || 0)), 0);

    const totalPaid = supplierPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    const pendingOrders = purchases.filter(p =>
      ['pending', 'draft', 'approved'].includes(String(p.status || '').toLowerCase())
    ).length;

    const totalReturns = supplierReturns.reduce((s, r) => s + Number(r.totalAmount || 0), 0);

    // Inventory value from supplier-linked products
    const inventoryValue = products.reduce((s, p) => {
      const stock = Number(p.stock || 0);
      const cost  = Number(p.costPrice || 0);
      return s + stock * cost;
    }, 0);

    // Top supplier by purchase volume
    const supVolume = {};
    purchases.forEach(p => {
      if (p.supplierId) supVolume[p.supplierId] = (supVolume[p.supplierId] || 0) + Number(p.total || 0);
    });
    const topSupplierId = Object.entries(supVolume).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topSupplier   = suppliers.find(s => String(s.id) === String(topSupplierId));

    return {
      total: suppliers.length, active, inactive,
      totalPurchaseValue, outstanding, totalPaid,
      pendingOrders, totalReturns, inventoryValue,
      topSupplier,
    };
  }, [suppliers, purchases, products, supplierPayments, supplierReturns]);

  // ── Tab badge counts ────────────────────────────────────────────────────────
  const tabBadge = useMemo(() => ({
    payments: supplierPayments.filter(p => p.status === 'pending').length || 0,
    returns:  supplierReturns.filter(r => r.status === 'pending').length || 0,
  }), [supplierPayments, supplierReturns]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {kpis.total} suppliers · {curr(kpis.totalPurchaseValue, company.currency)} total purchases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('suppliers')}
            className="btn-primary gap-2"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap relative
              ${activeTab === key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Icon size={15} />
            {label}
            {tabBadge[key] > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                {tabBadge[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview' && (
        <OverviewTab
          kpis={kpis}
          suppliers={suppliers}
          purchases={purchases}
          supplierPayments={supplierPayments}
          supplierReturns={supplierReturns}
          company={company}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === 'suppliers' && (
        <SuppliersTab
          suppliers={suppliers}
          purchases={purchases}
          supplierPayments={supplierPayments}
          company={company}
          addSupplier={addSupplier}
          updateSupplier={updateSupplier}
          deleteSupplier={deleteSupplier}
        />
      )}
      {activeTab === 'payments' && (
        <PaymentsTab
          suppliers={suppliers}
          supplierPayments={supplierPayments}
          purchases={purchases}
          company={company}
        />
      )}
      {activeTab === 'returns' && (
        <ReturnsTab
          suppliers={suppliers}
          supplierReturns={supplierReturns}
          purchases={purchases}
          products={products}
          company={company}
        />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsTab
          suppliers={suppliers}
          purchases={purchases}
          supplierPayments={supplierPayments}
          supplierReturns={supplierReturns}
          products={products}
          invoices={invoices}
          company={company}
        />
      )}
      {activeTab === 'reports' && (
        <ReportsTab
          suppliers={suppliers}
          purchases={purchases}
          supplierPayments={supplierPayments}
          supplierReturns={supplierReturns}
          products={products}
          company={company}
        />
      )}
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ kpis, suppliers, purchases, supplierPayments, supplierReturns, company, setActiveTab }) {
  const sym = company.currency || '₹';

  // Recent purchases (last 5)
  const recentPurchases = useMemo(() =>
    [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
  [purchases]);

  // Top 5 suppliers by purchase value
  const topSuppliers = useMemo(() => {
    const vol = {};
    purchases.forEach(p => {
      if (p.supplierId) vol[p.supplierId] = (vol[p.supplierId] || 0) + Number(p.total || 0);
    });
    return Object.entries(vol)
      .map(([id, total]) => ({ supplier: suppliers.find(s => s.id === Number(id)), total }))
      .filter(x => x.supplier)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [purchases, suppliers]);

  return (
    <div className="space-y-5">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users}       label="Total Suppliers"    value={kpis.total}                          color="blue"   onClick={() => setActiveTab('suppliers')} />
        <KpiCard icon={Activity}    label="Active Suppliers"   value={kpis.active}                         color="green"  onClick={() => setActiveTab('suppliers')} />
        <KpiCard icon={ShoppingCart} label="Total Purchases"   value={curr(kpis.totalPurchaseValue, sym)}  color="indigo" onClick={() => setActiveTab('reports')} />
        <KpiCard icon={AlertCircle} label="Outstanding"        value={curr(kpis.outstanding, sym)}         color="red"    onClick={() => setActiveTab('payments')} />
        <KpiCard icon={CreditCard}  label="Total Paid"         value={curr(kpis.totalPaid, sym)}           color="green"  onClick={() => setActiveTab('payments')} />
        <KpiCard icon={Package}     label="Inventory Value"    value={curr(kpis.inventoryValue, sym)}      color="purple" />
        <KpiCard icon={RotateCcw}   label="Total Returns"      value={curr(kpis.totalReturns, sym)}        color="amber"  onClick={() => setActiveTab('returns')} />
        <KpiCard icon={Star}        label="Top Supplier"       value={kpis.topSupplier?.name || '—'}       color="indigo" sub="by purchase volume" onClick={() => setActiveTab('analytics')} />
      </div>

      {/* Two-column: recent purchases + top suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent Purchases */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Purchases</h3>
            <button onClick={() => setActiveTab('reports')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {recentPurchases.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No purchases yet</p>
          )}
          <div className="space-y-2">
            {recentPurchases.map(p => {
              const sup = suppliers.find(s => s.id === p.supplierId);
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{sup?.name || 'Walk-in'}</p>
                    <p className="text-xs text-gray-400">{p.invoiceRef || `PUR-${p.id}`} · {formatDate(p.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-600">{curr(p.total, sym)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Top Suppliers</h3>
            <button onClick={() => setActiveTab('analytics')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Full analytics <ChevronRight size={12} />
            </button>
          </div>
          {topSuppliers.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
          )}
          <div className="space-y-2">
            {topSuppliers.map(({ supplier, total }, idx) => {
              const maxTotal = topSuppliers[0]?.total || 1;
              const pct = Math.round((total / maxTotal) * 100);
              return (
                <div key={supplier.id}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium text-gray-800 dark:text-white flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 w-4">#{idx + 1}</span>
                      {supplier.name}
                    </span>
                    <span className="font-semibold text-primary-600">{curr(total, sym)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Outstanding suppliers */}
      {suppliers.filter(s => Number(s.balance || 0) > 0).length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm flex items-center gap-2">
              <AlertCircle size={15} className="text-red-500" /> Outstanding Balances
            </h3>
            <button onClick={() => setActiveTab('payments')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Make payment <ChevronRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-2">Supplier</th>
                  <th className="text-left pb-2">Phone</th>
                  <th className="text-right pb-2">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {suppliers
                  .filter(s => Number(s.balance || 0) > 0)
                  .sort((a, b) => Number(b.balance) - Number(a.balance))
                  .slice(0, 8)
                  .map(s => (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <td className="py-1.5 font-medium text-gray-800 dark:text-white">{s.name}</td>
                      <td className="py-1.5 text-gray-500">{s.phone || '—'}</td>
                      <td className="py-1.5 text-right font-semibold text-red-500">{curr(s.balance, sym)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUPPLIERS TAB ───────────────────────────────────────────────────────────
const EMPTY_SUPPLIER = {
  name: '', phone: '', email: '', gstin: '', pan: '',
  address: '', city: '', state: '', country: 'India', pincode: '',
  contactPerson: '', designation: '', whatsapp: '', website: '',
  businessType: '', creditLimit: 0, creditDays: 0,
  currency: '₹', paymentTerms: '', preferredPayment: 'Cash',
  status: 'active', priority: 'medium', rating: 0,
  balance: 0, notes: '',
};

const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  blocked:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange && onChange(n)}
          className={`text-lg leading-none ${
            n <= value ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
          } ${onChange ? 'hover:text-amber-400 transition-colors' : ''}`}
        >★</button>
      ))}
    </div>
  );
}

function SuppliersTab({ suppliers, purchases, supplierPayments, company, addSupplier, updateSupplier, deleteSupplier }) {
  const sym = company.currency || '₹';
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(EMPTY_SUPPLIER);
  const [viewSupplier, setView]   = useState(null);
  const [activeSection, setSection] = useState('basic');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers
      .filter(s => {
        const matchSearch =
          (s.name || '').toLowerCase().includes(q) ||
          (s.phone || '').includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.gstin || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [suppliers, search, statusFilter]);

  const openAdd = () => { setForm(EMPTY_SUPPLIER); setEditItem(null); setSection('basic'); setShowModal(true); };
  const openEdit = (s) => { setForm({ ...EMPTY_SUPPLIER, ...s }); setEditItem(s); setSection('basic'); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Supplier name is required');
    try {
      if (editItem) {
        await updateSupplier({ ...form, id: editItem.id });
        toast.success('Supplier updated');
      } else {
        await addSupplier(form);
        toast.success('Supplier added');
      }
      setShowModal(false);
    } catch (e) { toast.error(e.message || 'Failed to save'); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    try { await deleteSupplier(s.id); toast.success('Supplier deleted'); }
    catch (e) { toast.error(e.message || 'Failed to delete'); }
  };

  // Per-supplier stats
  const supStats = useCallback((supId) => {
    const purs = purchases.filter(p => p.supplierId === supId);
    const paid = supplierPayments.filter(p => p.supplierId === supId).reduce((s, p) => s + Number(p.amount || 0), 0);
    return { orders: purs.length, total: purs.reduce((s, p) => s + Number(p.total || 0), 0), paid };
  }, [purchases, supplierPayments]);

  const SECTIONS = [
    { key: 'basic',    label: 'Basic Info' },
    { key: 'contact',  label: 'Contact' },
    { key: 'address',  label: 'Address' },
    { key: 'business', label: 'Business' },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name, phone, email, GSTIN…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-36" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
        <button onClick={openAdd} className="btn-primary gap-2 whitespace-nowrap">
          <Plus size={15} /> Add Supplier
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Supplier','Contact','GSTIN','City','Orders','Purchase Value','Outstanding','Status','Actions']
                  .map(h => <th key={h} className="table-head">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-16">
                  <Users size={36} className="mx-auto mb-2 opacity-20" />
                  <p>No suppliers found</p>
                </td></tr>
              )}
              {filtered.map(s => {
                const st = supStats(s.id);
                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                        {s.contactPerson && <p className="text-xs text-gray-400">{s.contactPerson}</p>}
                        {s.rating > 0 && <StarRating value={s.rating} />}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm space-y-0.5">
                        {s.phone && <p className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><Phone size={11}/>{s.phone}</p>}
                        {s.email && <p className="flex items-center gap-1 text-gray-400 text-xs"><Mail size={11}/>{s.email}</p>}
                      </div>
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-500">{s.gstin || '—'}</td>
                    <td className="table-cell text-sm text-gray-500">{s.city || '—'}</td>
                    <td className="table-cell text-center font-semibold text-primary-600">{st.orders}</td>
                    <td className="table-cell font-semibold text-gray-800 dark:text-white">{curr(st.total, sym)}</td>
                    <td className="table-cell">
                      {Number(s.balance || 0) > 0
                        ? <span className="font-semibold text-red-500">{curr(s.balance, sym)}</span>
                        : <span className="text-emerald-500 text-xs font-medium">Clear</span>}
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s.status || 'active']}`}>
                        {s.status || 'active'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setView(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="View">
                          <Eye size={14}/>
                        </button>
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title="Edit">
                          <Edit2 size={14}/>
                        </button>
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Delete">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editItem ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X size={18}/>
              </button>
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 dark:border-gray-800">
              {SECTIONS.map(sec => (
                <button
                  key={sec.key}
                  onClick={() => setSection(sec.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeSection === sec.key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >{sec.label}</button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* Basic Info */}
              {activeSection === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Supplier Name *</label>
                    <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Company / Supplier name" />
                  </div>
                  <div>
                    <label className="label">Supplier Code</label>
                    <input className="input" value={form.supplierCode || ''} onChange={e => set('supplierCode', e.target.value)} placeholder="SUP-001" />
                  </div>
                  <div>
                    <label className="label">Business Type</label>
                    <select className="input" value={form.businessType} onChange={e => set('businessType', e.target.value)}>
                      <option value="">Select type</option>
                      {['Manufacturer','Wholesaler','Distributor','Retailer','Importer','Exporter','Service Provider','Other']
                        .map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">GSTIN</label>
                    <input className="input" value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className="label">PAN</label>
                    <input className="input" value={form.pan} onChange={e => set('pan', e.target.value)} placeholder="AAAAA0000A" />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Rating</label>
                    <StarRating value={form.rating || 0} onChange={v => set('rating', v)} />
                  </div>
                  <div>
                    <label className="label">Opening Balance (Due)</label>
                    <input className="input" type="number" min={0} value={form.balance} onChange={e => set('balance', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Supplier Since</label>
                    <input className="input" type="date" value={form.supplierSince || ''} onChange={e => set('supplierSince', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Notes</label>
                    <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" />
                  </div>
                </div>
              )}

              {/* Contact */}
              {activeSection === 'contact' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact Person</label>
                    <input className="input" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label">Designation</label>
                    <input className="input" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="Manager / Owner" />
                  </div>
                  <div>
                    <label className="label">Mobile</label>
                    <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="label">WhatsApp</label>
                    <input className="input" type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="supplier@email.com" />
                  </div>
                  <div>
                    <label className="label">Website</label>
                    <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://supplier.com" />
                  </div>
                </div>
              )}

              {/* Address */}
              {activeSection === 'address' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <textarea className="input resize-none" rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input className="input" value={form.state} onChange={e => set('state', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Country</label>
                    <input className="input" value={form.country} onChange={e => set('country', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input className="input" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
                  </div>
                </div>
              )}

              {/* Business Terms */}
              {activeSection === 'business' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Credit Limit (₹)</label>
                    <input className="input" type="number" min={0} value={form.creditLimit} onChange={e => set('creditLimit', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Credit Days</label>
                    <input className="input" type="number" min={0} value={form.creditDays} onChange={e => set('creditDays', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Currency</label>
                    <input className="input" value={form.currency} onChange={e => set('currency', e.target.value)} placeholder="₹" />
                  </div>
                  <div>
                    <label className="label">Preferred Payment</label>
                    <select className="input" value={form.preferredPayment} onChange={e => set('preferredPayment', e.target.value)}>
                      {['Cash','Bank Transfer','UPI','Cheque','Card','Net Banking'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Payment Terms</label>
                    <input className="input" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} placeholder="e.g. Net 30, Advance, COD" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={handleSave} className="btn-primary flex-1 justify-center gap-2">
                <Check size={15}/> {editItem ? 'Save Changes' : 'Add Supplier'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Supplier Drawer ── */}
      {viewSupplier && (
        <SupplierViewDrawer
          supplier={viewSupplier}
          purchases={purchases}
          supplierPayments={supplierPayments}
          company={company}
          onEdit={() => { openEdit(viewSupplier); setView(null); }}
          onClose={() => setView(null)}
        />
      )}
    </div>
  );
}

// ─── SUPPLIER VIEW DRAWER ─────────────────────────────────────────────────────
function SupplierViewDrawer({ supplier: s, purchases, supplierPayments, company, onEdit, onClose }) {
  const sym = company.currency || '₹';
  const purs = purchases.filter(p => p.supplierId === s.id);
  const totalPurchased = purs.reduce((t, p) => t + Number(p.total || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">{s.name}</h2>
            <p className="text-xs text-gray-400 capitalize">{s.businessType || 'Supplier'} · {s.status || 'active'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="btn-secondary py-1.5 px-3 text-xs gap-1"><Edit2 size={13}/> Edit</button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-lg font-bold text-primary-600">{purs.length}</p>
              <p className="text-xs text-gray-400">Orders</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-sm font-bold text-gray-800 dark:text-white">{curr(totalPurchased, sym)}</p>
              <p className="text-xs text-gray-400">Purchased</p>
            </div>
            <div className="card p-3 text-center">
              <p className={`text-sm font-bold ${Number(s.balance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {Number(s.balance || 0) > 0 ? curr(s.balance, sym) : 'Clear'}
              </p>
              <p className="text-xs text-gray-400">Outstanding</p>
            </div>
          </div>

          {/* Rating */}
          {s.rating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Rating:</span>
              <StarRating value={s.rating} />
            </div>
          )}

          {/* Info rows */}
          <div className="space-y-2 text-sm">
            {[
              { icon: Phone,    label: 'Phone',    val: s.phone },
              { icon: Phone,    label: 'WhatsApp', val: s.whatsapp },
              { icon: Mail,     label: 'Email',    val: s.email },
              { icon: Building2,label: 'GSTIN',    val: s.gstin },
              { icon: FileText, label: 'PAN',      val: s.pan },
              { icon: MapPin,   label: 'Address',  val: [s.address, s.city, s.state, s.pincode].filter(Boolean).join(', ') },
              { icon: CreditCard, label: 'Payment', val: s.preferredPayment },
              { icon: Activity, label: 'Terms',    val: s.paymentTerms },
            ].filter(r => r.val).map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-start gap-2">
                <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-400">{label}: </span>
                  <span className="text-gray-700 dark:text-gray-300">{val}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent purchases */}
          {purs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Purchases</p>
              <div className="space-y-1.5">
                {[...purs].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{p.invoiceRef || `PUR-${p.id}`}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                    </div>
                    <span className="font-semibold text-primary-600">{curr(p.total, sym)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {s.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-sm text-amber-800 dark:text-amber-300">
              <p className="text-xs font-semibold mb-1">Notes</p>
              <p>{s.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── PAYMENTS TAB ────────────────────────────────────────────────────────────
const EMPTY_PAYMENT = {
  supplierId: '', amount: '', method: 'Cash', reference: '',
  note: '', date: new Date().toISOString().split('T')[0], status: 'paid',
};
const PAY_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Net Banking'];

function PaymentsTab({ suppliers, supplierPayments, purchases, company }) {
  const { recordSupplierPayment, removeSupplierPayment, fetchSupplierLedger } = useApp();
  const sym = company.currency || '₹';

  const [search, setSearch]       = useState('');
  const [filterSup, setFilterSup] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_PAYMENT);
  const [ledger, setLedger]       = useState([]);
  const [ledgerSup, setLedgerSup] = useState(null);
  const [saving, setSaving]       = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return supplierPayments
      .filter(p => {
        const sup = suppliers.find(s => s.id === Number(p.supplierId));
        const matchSup = filterSup === 'all' || String(p.supplierId) === filterSup;
        const matchQ   = !q ||
          (sup?.name || '').toLowerCase().includes(q) ||
          (p.reference || '').toLowerCase().includes(q) ||
          (p.method || '').toLowerCase().includes(q);
        return matchSup && matchQ;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [supplierPayments, suppliers, search, filterSup]);

  const summary = useMemo(() => {
    const total   = supplierPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const pending = suppliers.reduce((s, sup) => s + Math.max(0, Number(sup.balance || 0)), 0);
    const now = new Date();
    const thisMonth = supplierPayments
      .filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return { total, pending, thisMonth };
  }, [supplierPayments, suppliers]);

  const openLedger = async (sup) => {
    const rows = await fetchSupplierLedger(sup.id);
    setLedger(rows || []);
    setLedgerSup(sup);
  };

  const handleSave = async () => {
    if (!form.supplierId) return toast.error('Select a supplier');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter valid amount');
    setSaving(true);
    try {
      await recordSupplierPayment({
        supplierId: Number(form.supplierId),
        amount:     Number(form.amount),
        method:     form.method,
        reference:  form.reference,
        note:       form.note,
        date:       form.date,
        status:     'paid',
      });
      toast.success('Payment recorded');
      setShowModal(false);
      setForm(EMPTY_PAYMENT);
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      await removeSupplierPayment(p.id, p.supplierId);
      toast.success('Payment deleted');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const ledgerWithBalance = useMemo(() => {
    let bal = 0;
    return ledger.map(row => {
      bal += Number(row.credit || 0) - Number(row.debit || 0);
      return { ...row, runningBalance: bal };
    });
  }, [ledger]);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-emerald-600">{curr(summary.total, sym)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-red-500">{curr(summary.pending, sym)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">This Month</p>
          <p className="text-xl font-bold text-primary-600">{curr(summary.thisMonth, sym)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search payments…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={filterSup} onChange={e => setFilterSup(e.target.value)}>
          <option value="all">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        <button onClick={() => { setForm(EMPTY_PAYMENT); setShowModal(true); }} className="btn-primary gap-2 whitespace-nowrap">
          <Plus size={14} /> Record Payment
        </button>
      </div>

      {/* Outstanding quick-pay chips */}
      {suppliers.filter(s => Number(s.balance || 0) > 0).length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertCircle size={13} className="text-red-500" /> Outstanding Balances — click to pay
          </p>
          <div className="flex flex-wrap gap-2">
            {suppliers
              .filter(s => Number(s.balance || 0) > 0)
              .sort((a, b) => Number(b.balance) - Number(a.balance))
              .map(s => (
                <button
                  key={s.id}
                  onClick={() => { setForm({ ...EMPTY_PAYMENT, supplierId: String(s.id) }); setShowModal(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-white">{s.name}</span>
                  <span className="text-xs font-bold text-red-500">{curr(s.balance, sym)}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Date','Supplier','Amount','Method','Reference','Note','Actions']
                  .map(h => <th key={h} className="table-head">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-16">
                  <CreditCard size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No payments found</p>
                </td></tr>
              )}
              {filtered.map(p => {
                const sup = suppliers.find(s => s.id === Number(p.supplierId));
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="table-cell text-sm text-gray-500">{formatDate(p.date)}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => sup && openLedger(sup)}
                        className="font-medium text-gray-900 dark:text-white hover:text-primary-600 transition-colors text-sm"
                      >
                        {sup?.name || '—'}
                      </button>
                    </td>
                    <td className="table-cell font-bold text-emerald-600">{curr(p.amount, sym)}</td>
                    <td className="table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {p.method || 'Cash'}
                      </span>
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-500">{p.reference || '—'}</td>
                    <td className="table-cell text-sm text-gray-500 max-w-[160px] truncate">{p.note || '—'}</td>
                    <td className="table-cell">
                      <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Payment</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Supplier *</label>
                <select className="input" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}{Number(s.balance || 0) > 0 ? ` — Due: ${curr(s.balance, sym)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount *</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Payment Method</label>
                  <select className="input" value={form.method} onChange={e => set('method', e.target.value)}>
                    {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Reference / Cheque No.</label>
                  <input className="input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="UTR / Cheque no." />
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <input className="input" value={form.note} onChange={e => set('note', e.target.value)} placeholder="Optional note" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center gap-2">
                <Check size={14} /> {saving ? 'Saving…' : 'Record Payment'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Ledger Modal */}
      {ledgerSup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{ledgerSup.name} — Ledger</h2>
                <p className="text-xs text-gray-400">Full transaction history</p>
              </div>
              <button onClick={() => setLedgerSup(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {ledgerWithBalance.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No ledger entries yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      {['Date','Type','Note','Credit','Debit','Balance'].map(h => (
                        <th key={h} className={`pb-2 ${['Credit','Debit','Balance'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerWithBalance.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <td className="py-2 text-gray-500">{formatDate(row.date)}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            row.type === 'payment' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            row.type === 'return'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>{row.type}</span>
                        </td>
                        <td className="py-2 text-gray-500 max-w-[180px] truncate">{row.note || '—'}</td>
                        <td className="py-2 text-right text-emerald-600 font-medium">
                          {Number(row.credit || 0) > 0 ? curr(row.credit, sym) : '—'}
                        </td>
                        <td className="py-2 text-right text-red-500 font-medium">
                          {Number(row.debit || 0) > 0 ? curr(row.debit, sym) : '—'}
                        </td>
                        <td className={`py-2 text-right font-bold ${
                          row.runningBalance > 0 ? 'text-red-500' : 'text-emerald-600'
                        }`}>
                          {curr(Math.abs(row.runningBalance), sym)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-sm text-gray-500">Current Balance</span>
              <span className={`text-lg font-bold ${Number(ledgerSup.balance || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {curr(ledgerSup.balance || 0, sym)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── RETURNS TAB ─────────────────────────────────────────────────────────────
const RETURN_REASONS = [
  'Damaged Goods', 'Wrong Item', 'Quality Issue',
  'Short Supply', 'Excess Supply', 'Expired', 'Other',
];
const EMPTY_RETURN = {
  supplierId: '', purchaseId: '', reason: 'Damaged Goods',
  items: [], totalAmount: '', note: '',
  date: new Date().toISOString().split('T')[0], status: 'pending',
};

const RETURN_STATUS_COLORS = {
  pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  completed:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function ReturnsTab({ suppliers, supplierReturns, purchases, products, company }) {
  const { createSupplierReturn, editSupplierReturn, removeSupplierReturn } = useApp();
  const sym = company.currency || '₹';

  const [search, setSearch]         = useState('');
  const [filterSup, setFilterSup]   = useState('all');
  const [filterStatus, setFilterSt] = useState('all');
  const [showModal, setShowModal]   = useState(false);
  const [viewItem, setViewItem]     = useState(null);
  const [form, setForm]             = useState(EMPTY_RETURN);
  const [saving, setSaving]         = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return supplierReturns
      .filter(r => {
        const sup = suppliers.find(s => s.id === Number(r.supplierId));
        const matchSup    = filterSup === 'all' || String(r.supplierId) === filterSup;
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchQ      = !q ||
          (sup?.name || '').toLowerCase().includes(q) ||
          (r.reason || '').toLowerCase().includes(q) ||
          (r.note || '').toLowerCase().includes(q);
        return matchSup && matchStatus && matchQ;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [supplierReturns, suppliers, search, filterSup, filterStatus]);

  // ── summary ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total:    supplierReturns.length,
    pending:  supplierReturns.filter(r => r.status === 'pending').length,
    approved: supplierReturns.filter(r => r.status === 'approved').length,
    value:    supplierReturns.reduce((s, r) => s + Number(r.totalAmount || 0), 0),
  }), [supplierReturns]);

  // ── supplier purchases for dropdown ───────────────────────────────────────
  const supPurchases = useMemo(() => {
    if (!form.supplierId) return [];
    return purchases.filter(p => String(p.supplierId) === String(form.supplierId));
  }, [purchases, form.supplierId]);

  // ── add item row ───────────────────────────────────────────────────────────
  const addItemRow = () =>
    set('items', [...(form.items || []), { productId: '', productName: '', qty: 1, price: 0 }]);

  const updateItem = (idx, key, val) =>
    set('items', form.items.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const removeItem = (idx) =>
    set('items', form.items.filter((_, i) => i !== idx));

  // auto-calc total from items
  const calcTotal = (items) =>
    (items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.supplierId) return toast.error('Select a supplier');
    if (!form.reason)     return toast.error('Select a reason');
    const total = Number(form.totalAmount) || calcTotal(form.items);
    if (total <= 0)       return toast.error('Enter return amount or add items');
    setSaving(true);
    try {
      await createSupplierReturn({
        supplierId:  Number(form.supplierId),
        purchaseId:  form.purchaseId ? Number(form.purchaseId) : null,
        reason:      form.reason,
        items:       form.items,
        totalAmount: total,
        note:        form.note,
        date:        form.date,
        status:      form.status,
      });
      toast.success('Return created');
      setShowModal(false);
      setForm(EMPTY_RETURN);
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  // ── status update ──────────────────────────────────────────────────────────
  const handleStatus = async (r, status) => {
    try {
      await editSupplierReturn({ ...r, status });
      toast.success(`Return marked as ${status}`);
      if (viewItem) setViewItem({ ...r, status });
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (r) => {
    if (!window.confirm('Delete this return?')) return;
    try {
      await removeSupplierReturn(r.id, r.supplierId);
      toast.success('Return deleted');
      if (viewItem?.id === r.id) setViewItem(null);
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Total Returns</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Pending</p>
          <p className="text-xl font-bold text-amber-500">{summary.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Approved</p>
          <p className="text-xl font-bold text-emerald-600">{summary.approved}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Return Value</p>
          <p className="text-xl font-bold text-red-500">{curr(summary.value, sym)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search returns…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterSup} onChange={e => setFilterSup(e.target.value)}>
          <option value="all">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        <select className="input w-36" value={filterStatus} onChange={e => setFilterSt(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={() => { setForm(EMPTY_RETURN); setShowModal(true); }} className="btn-primary gap-2 whitespace-nowrap">
          <Plus size={14} /> New Return
        </button>
      </div>

      {/* Returns table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Date','Supplier','Reason','Amount','Status','Actions']
                  .map(h => <th key={h} className="table-head">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-16">
                  <RotateCcw size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No returns found</p>
                </td></tr>
              )}
              {filtered.map(r => {
                const sup = suppliers.find(s => s.id === Number(r.supplierId));
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="table-cell text-sm text-gray-500">{formatDate(r.date)}</td>
                    <td className="table-cell font-medium text-gray-900 dark:text-white text-sm">{sup?.name || '—'}</td>
                    <td className="table-cell text-sm text-gray-500">{r.reason || '—'}</td>
                    <td className="table-cell font-bold text-red-500">{curr(r.totalAmount, sym)}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RETURN_STATUS_COLORS[r.status] || RETURN_STATUS_COLORS.pending}`}>
                        {r.status || 'pending'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewItem(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="View">
                          <Eye size={13} />
                        </button>
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatus(r, 'approved')} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600" title="Approve">
                              <Check size={13} />
                            </button>
                            <button onClick={() => handleStatus(r, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Reject">
                              <X size={13} />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Supplier Return</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Supplier *</label>
                  <select className="input" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Against Purchase</label>
                  <select className="input" value={form.purchaseId} onChange={e => set('purchaseId', e.target.value)} disabled={!form.supplierId}>
                    <option value="">Select purchase (optional)</option>
                    {supPurchases.map(p => (
                      <option key={p.id} value={String(p.id)}>
                        {p.invoiceRef || `PUR-${p.id}`} — {curr(p.total, sym)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Reason *</label>
                  <select className="input" value={form.reason} onChange={e => set('reason', e.target.value)}>
                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="label">Total Amount</label>
                  <input className="input" type="number" min="0" step="0.01"
                    value={form.totalAmount || calcTotal(form.items) || ''}
                    onChange={e => set('totalAmount', e.target.value)}
                    placeholder="Auto from items or enter manually"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Return Items</label>
                  <button onClick={addItemRow} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add item
                  </button>
                </div>
                {form.items.length === 0 && (
                  <p className="text-xs text-gray-400 py-2">No items added — you can enter total amount directly above.</p>
                )}
                <div className="space-y-2">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        className="input flex-1"
                        value={it.productId}
                        onChange={e => {
                          const prod = products.find(p => String(p.id) === e.target.value);
                          updateItem(idx, 'productId', e.target.value);
                          if (prod) {
                            updateItem(idx, 'productName', prod.name);
                            updateItem(idx, 'price', prod.costPrice || prod.price || 0);
                          }
                        }}
                      >
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                      </select>
                      <input className="input w-20" type="number" min="1" value={it.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)} placeholder="Qty" />
                      <input className="input w-24" type="number" min="0" value={it.price}
                        onChange={e => updateItem(idx, 'price', e.target.value)} placeholder="Price" />
                      <button onClick={() => removeItem(idx)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                {form.items.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    Items total: {curr(calcTotal(form.items), sym)}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Note</label>
                <textarea className="input resize-none" rows={2} value={form.note}
                  onChange={e => set('note', e.target.value)} placeholder="Optional note…" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center gap-2">
                <Check size={14} /> {saving ? 'Saving…' : 'Create Return'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View Return Detail Modal */}
      {viewItem && (() => {
        const sup = suppliers.find(s => s.id === Number(viewItem.supplierId));
        const pur = purchases.find(p => p.id === Number(viewItem.purchaseId));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Return Detail</h2>
                  <p className="text-xs text-gray-400">{sup?.name} · {formatDate(viewItem.date)}</p>
                </div>
                <button onClick={() => setViewItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Supplier',  val: sup?.name },
                    { label: 'Reason',    val: viewItem.reason },
                    { label: 'Amount',    val: curr(viewItem.totalAmount, sym) },
                    { label: 'Purchase',  val: pur ? (pur.invoiceRef || `PUR-${pur.id}`) : '—' },
                    { label: 'Date',      val: formatDate(viewItem.date) },
                    { label: 'Status',    val: viewItem.status },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="font-medium text-gray-800 dark:text-white capitalize">{val || '—'}</p>
                    </div>
                  ))}
                </div>
                {viewItem.note && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                    <p className="text-xs font-semibold mb-1">Note</p>
                    <p>{viewItem.note}</p>
                  </div>
                )}
                {Array.isArray(viewItem.items) && viewItem.items.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                    <div className="space-y-1">
                      {viewItem.items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-gray-700 dark:text-gray-300">{it.productName || `Product #${it.productId}`}</span>
                          <span className="text-gray-500">×{it.qty} @ {curr(it.price, sym)}</span>
                          <span className="font-semibold text-gray-800 dark:text-white">{curr(Number(it.qty) * Number(it.price), sym)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {viewItem.status === 'pending' && (
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => handleStatus(viewItem, 'approved')} className="btn-primary flex-1 justify-center gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => handleStatus(viewItem, 'rejected')} className="btn-secondary flex-1 justify-center gap-2 text-red-500">
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
// ─── ANALYTICS TAB ──────────────────────────────────────────────────────────
function AnalyticsTab({ suppliers, purchases, supplierPayments, supplierReturns, products, invoices, company }) {
  const sym = company.currency || '₹';
  const [period, setPeriod] = useState('all');

  // ── date filter helper ───────────────────────────────────────────────────
  const inPeriod = useCallback((dateStr) => {
    if (period === 'all') return true;
    const d = new Date(dateStr);
    const now = new Date();
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
    }
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  }, [period]);

  const filteredPurchases = useMemo(() => purchases.filter(p => inPeriod(p.date)), [purchases, inPeriod]);

  // ── per-supplier metrics ──────────────────────────────────────────────────
  const supplierMetrics = useMemo(() => {
    return suppliers.map(sup => {
      const purs   = filteredPurchases.filter(p => p.supplierId === sup.id);
      const paid   = supplierPayments.filter(p => p.supplierId === sup.id).reduce((s, p) => s + Number(p.amount || 0), 0);
      const rets   = supplierReturns.filter(r => r.supplierId === sup.id).reduce((s, r) => s + Number(r.totalAmount || 0), 0);
      const total  = purs.reduce((s, p) => s + Number(p.total || 0), 0);
      const orders = purs.length;
      const avgOrder = orders > 0 ? total / orders : 0;
      // inventory value for products linked to this supplier
      const invValue = products
        .filter(p => String(p.supplierId) === String(sup.id))
        .reduce((s, p) => s + Number(p.stock || 0) * Number(p.costPrice || 0), 0);
      const returnRate = total > 0 ? (rets / total) * 100 : 0;
      return { sup, total, orders, paid, rets, avgOrder, invValue, returnRate };
    }).sort((a, b) => b.total - a.total);
  }, [suppliers, filteredPurchases, supplierPayments, supplierReturns, products]);

  // ── overall KPIs ───────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalPurchased = filteredPurchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const totalPaid      = supplierPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalReturns   = supplierReturns.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
    const outstanding    = suppliers.reduce((s, sup) => s + Math.max(0, Number(sup.balance || 0)), 0);
    const avgOrderVal    = filteredPurchases.length > 0 ? totalPurchased / filteredPurchases.length : 0;
    const activeSuppliers = suppliers.filter(s => (s.status || 'active') === 'active').length;
    return { totalPurchased, totalPaid, totalReturns, outstanding, avgOrderVal, activeSuppliers };
  }, [filteredPurchases, supplierPayments, supplierReturns, suppliers]);

  // ── monthly purchase trend (last 6 months) ─────────────────────────────
  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      const total = purchases
        .filter(p => {
          const pd = new Date(p.date);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((s, p) => s + Number(p.total || 0), 0);
      months.push({ label, total });
    }
    return months;
  }, [purchases]);

  const maxMonthly = Math.max(...monthlyTrend.map(m => m.total), 1);

  // ── purchase by method breakdown ───────────────────────────────────────
  const paymentMethodBreakdown = useMemo(() => {
    const map = {};
    supplierPayments.forEach(p => {
      const m = p.method || 'Cash';
      map[m] = (map[m] || 0) + Number(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [supplierPayments]);

  const totalPayMethodVal = paymentMethodBreakdown.reduce((s, [, v]) => s + v, 0) || 1;

  // ── ABC classification ─────────────────────────────────────────────────────
  const abcData = useMemo(() => {
    const grandTotal = supplierMetrics.reduce((s, m) => s + m.total, 0) || 1;
    let cumulative = 0;
    return supplierMetrics.map(m => {
      cumulative += m.total;
      const cumPct = (cumulative / grandTotal) * 100;
      const cls = cumPct <= 70 ? 'A' : cumPct <= 90 ? 'B' : 'C';
      return { ...m, cumPct, cls };
    });
  }, [supplierMetrics]);

  const METHOD_COLORS = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-red-500','bg-indigo-500'];
  const ABC_COLORS = { A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', B: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', C: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };

  return (
    <div className="space-y-5">

      {/* Period filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Period:</span>
        {[['all','All Time'],['month','This Month'],['quarter','This Quarter'],['year','This Year']].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              period === v ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>{l}</button>
        ))}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Total Purchased</p>
          <p className="text-xl font-bold text-primary-600">{curr(kpis.totalPurchased, sym)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-emerald-600">{curr(kpis.totalPaid, sym)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-red-500">{curr(kpis.outstanding, sym)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Total Returns</p>
          <p className="text-xl font-bold text-amber-500">{curr(kpis.totalReturns, sym)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Avg Order Value</p>
          <p className="text-xl font-bold text-indigo-600">{curr(kpis.avgOrderVal, sym)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Active Suppliers</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{kpis.activeSuppliers}</p>
        </div>
      </div>

      {/* Two-col: monthly trend + payment methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Monthly purchase trend bar chart */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Purchase Trend — Last 6 Months</h3>
          <div className="flex items-end gap-2 h-32">
            {monthlyTrend.map((m, i) => {
              const pct = Math.max(4, Math.round((m.total / maxMonthly) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 leading-none">
                    {m.total > 0 ? curr(m.total, sym).replace(/\.00$/, '') : ''}
                  </span>
                  <div className="w-full rounded-t-md bg-primary-500 transition-all" style={{ height: `${pct}%` }} />
                  <span className="text-[10px] text-gray-400">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment method breakdown */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Payment Methods</h3>
          {paymentMethodBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No payment data</p>
          ) : (
            <div className="space-y-3">
              {paymentMethodBreakdown.map(([method, val], i) => {
                const pct = Math.round((val / totalPayMethodVal) * 100);
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{method}</span>
                      <span className="font-semibold text-gray-800 dark:text-white">{curr(val, sym)} <span className="text-xs text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${METHOD_COLORS[i % METHOD_COLORS.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Supplier ranking table with ABC */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Supplier Ranking &amp; ABC Analysis</h3>
          <p className="text-xs text-gray-400 mt-0.5">A = top 70% value · B = next 20% · C = bottom 10%</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['#','Supplier','Orders','Purchased','Paid','Returns','Return Rate','Inv. Value','Class']
                  .map(h => <th key={h} className="table-head">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {abcData.length === 0 && (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-12">
                  No supplier data yet
                </td></tr>
              )}
              {abcData.map((m, idx) => (
                <tr key={m.sup.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="table-cell text-xs text-gray-400 font-medium">#{idx + 1}</td>
                  <td className="table-cell">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.sup.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{m.sup.businessType || 'Supplier'}</p>
                  </td>
                  <td className="table-cell text-center font-semibold text-primary-600">{m.orders}</td>
                  <td className="table-cell font-semibold text-gray-800 dark:text-white">{curr(m.total, sym)}</td>
                  <td className="table-cell text-emerald-600 font-medium">{curr(m.paid, sym)}</td>
                  <td className="table-cell text-red-500 font-medium">{curr(m.rets, sym)}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold ${
                      m.returnRate > 10 ? 'text-red-500' : m.returnRate > 5 ? 'text-amber-500' : 'text-emerald-600'
                    }`}>{m.returnRate.toFixed(1)}%</span>
                  </td>
                  <td className="table-cell text-gray-600 dark:text-gray-300">{curr(m.invValue, sym)}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ABC_COLORS[m.cls]}`}>{m.cls}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row: top 5 + worst 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top 5 suppliers */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Star size={14} className="text-amber-400" /> Top 5 Suppliers
          </h3>
          <div className="space-y-2">
            {supplierMetrics.slice(0, 5).map((m, i) => {
              const maxVal = supplierMetrics[0]?.total || 1;
              const pct = Math.round((m.total / maxVal) * 100);
              return (
                <div key={m.sup.id}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                      <span className="font-medium text-gray-800 dark:text-white">{m.sup.name}</span>
                    </span>
                    <span className="font-semibold text-primary-600">{curr(m.total, sym)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {supplierMetrics.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>

        {/* Highest return rate */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-500" /> Highest Return Rate
          </h3>
          <div className="space-y-2">
            {[...supplierMetrics]
              .filter(m => m.orders > 0)
              .sort((a, b) => b.returnRate - a.returnRate)
              .slice(0, 5)
              .map((m, i) => (
                <div key={m.sup.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                    <span className="font-medium text-gray-800 dark:text-white">{m.sup.name}</span>
                  </span>
                  <span className={`font-bold text-sm ${
                    m.returnRate > 10 ? 'text-red-500' : m.returnRate > 5 ? 'text-amber-500' : 'text-emerald-600'
                  }`}>{m.returnRate.toFixed(1)}%</span>
                </div>
              ))}
            {supplierMetrics.filter(m => m.orders > 0).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── REPORTS TAB ───────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { key: 'purchase',   label: 'Purchase Report' },
  { key: 'ledger',     label: 'Supplier Ledger' },
  { key: 'outstanding',label: 'Outstanding Report' },
  { key: 'returns',    label: 'Returns Report' },
  { key: 'payments',   label: 'Payments Report' },
];

function ReportsTab({ suppliers, purchases, supplierPayments, supplierReturns, products, company }) {
  const { fetchSupplierLedger } = useApp();
  const sym = company.currency || '₹';

  const [reportType, setReportType] = useState('purchase');
  const [filterSup,  setFilterSup]  = useState('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // load ledger when supplier changes and report is ledger
  useEffect(() => {
    if (reportType !== 'ledger' || filterSup === 'all') { setLedgerRows([]); return; }
    setLedgerLoading(true);
    fetchSupplierLedger(Number(filterSup))
      .then(rows => setLedgerRows(rows || []))
      .catch(() => setLedgerRows([]))
      .finally(() => setLedgerLoading(false));
  }, [reportType, filterSup, fetchSupplierLedger]);

  // ── date filter helper ──────────────────────────────────────────────────
  const inRange = useCallback((dateStr) => {
    const d = new Date(dateStr);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  }, [dateFrom, dateTo]);

  const matchSup = useCallback((id) =>
    filterSup === 'all' || String(id) === filterSup
  , [filterSup]);

  // ── report data builders ─────────────────────────────────────────────────
  const purchaseRows = useMemo(() =>
    purchases
      .filter(p => matchSup(p.supplierId) && inRange(p.date))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(p => {
        const sup = suppliers.find(s => s.id === Number(p.supplierId));
        return {
          Date:      formatDate(p.date),
          'PO / Ref': p.invoiceRef || `PUR-${p.id}`,
          Supplier:  sup?.name || '—',
          Items:     (p.items || []).length,
          Subtotal:  curr(p.subtotal || p.total, sym),
          Tax:       curr(p.taxAmt || 0, sym),
          Total:     curr(p.total, sym),
          Status:    p.status || 'completed',
        };
      })
  , [purchases, suppliers, matchSup, inRange, sym]);

  const outstandingRows = useMemo(() =>
    suppliers
      .filter(s => (filterSup === 'all' || String(s.id) === filterSup) && Number(s.balance || 0) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance))
      .map(s => ({
        Supplier:    s.name,
        Phone:       s.phone || '—',
        GSTIN:       s.gstin || '—',
        City:        s.city  || '—',
        Outstanding: curr(s.balance, sym),
        'Credit Days': s.creditDays || '—',
        Status:      s.status || 'active',
      }))
  , [suppliers, filterSup, sym]);

  const returnsRows = useMemo(() =>
    supplierReturns
      .filter(r => matchSup(r.supplierId) && inRange(r.date))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(r => {
        const sup = suppliers.find(s => s.id === Number(r.supplierId));
        return {
          Date:    formatDate(r.date),
          Supplier: sup?.name || '—',
          Reason:  r.reason || '—',
          Amount:  curr(r.totalAmount, sym),
          Status:  r.status || 'pending',
          Note:    r.note || '—',
        };
      })
  , [supplierReturns, suppliers, matchSup, inRange, sym]);

  const paymentsRows = useMemo(() =>
    supplierPayments
      .filter(p => matchSup(p.supplierId) && inRange(p.date))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(p => {
        const sup = suppliers.find(s => s.id === Number(p.supplierId));
        return {
          Date:      formatDate(p.date),
          Supplier:  sup?.name || '—',
          Amount:    curr(p.amount, sym),
          Method:    p.method || 'Cash',
          Reference: p.reference || '—',
          Note:      p.note || '—',
        };
      })
  , [supplierPayments, suppliers, matchSup, inRange, sym]);

  const ledgerWithBal = useMemo(() => {
    let bal = 0;
    return ledgerRows.map(row => {
      bal += Number(row.credit || 0) - Number(row.debit || 0);
      return {
        Date:    formatDate(row.date),
        Type:    row.type || '—',
        Note:    row.note || '—',
        Credit:  Number(row.credit || 0) > 0 ? curr(row.credit, sym) : '—',
        Debit:   Number(row.debit  || 0) > 0 ? curr(row.debit,  sym) : '—',
        Balance: curr(Math.abs(bal), sym),
      };
    });
  }, [ledgerRows, sym]);

  // active rows for current report
  const activeRows = {
    purchase:    purchaseRows,
    ledger:      ledgerWithBal,
    outstanding: outstandingRows,
    returns:     returnsRows,
    payments:    paymentsRows,
  }[reportType] || [];

  // ── summary totals row ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (reportType === 'purchase') {
      const raw = purchases.filter(p => matchSup(p.supplierId) && inRange(p.date));
      return {
        orders: raw.length,
        total:  raw.reduce((s, p) => s + Number(p.total || 0), 0),
      };
    }
    if (reportType === 'payments') {
      const raw = supplierPayments.filter(p => matchSup(p.supplierId) && inRange(p.date));
      return { count: raw.length, total: raw.reduce((s, p) => s + Number(p.amount || 0), 0) };
    }
    if (reportType === 'returns') {
      const raw = supplierReturns.filter(r => matchSup(r.supplierId) && inRange(r.date));
      return { count: raw.length, total: raw.reduce((s, r) => s + Number(r.totalAmount || 0), 0) };
    }
    if (reportType === 'outstanding') {
      return { total: outstandingRows.reduce((s, r) => {
        const n = Number(String(r.Outstanding).replace(/[^0-9.]/g, ''));
        return s + (isNaN(n) ? 0 : n);
      }, 0) };
    }
    return null;
  }, [reportType, purchases, supplierPayments, supplierReturns, outstandingRows, matchSup, inRange]);

  // ── export helpers ────────────────────────────────────────────────────────────
  const filename = (ext) => `supplier-${reportType}-${new Date().toISOString().split('T')[0]}.${ext}`;

  const exportCSV = () => {
    if (!activeRows.length) return toast.error('No data to export');
    const keys = Object.keys(activeRows[0]);
    const csv  = [
      keys.join(','),
      ...activeRows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename('csv'); a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportExcel = () => {
    if (!activeRows.length) return toast.error('No data to export');
    const keys = Object.keys(activeRows[0]);
    const xml  = [
      '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">',
      '<Worksheet ss:Name="Report"><Table>',
      `<Row>${keys.map(k => `<Cell><Data ss:Type="String">${k}</Data></Cell>`).join('')}</Row>`,
      ...activeRows.map(r =>
        `<Row>${keys.map(k => `<Cell><Data ss:Type="String">${String(r[k] ?? '')}</Data></Cell>`).join('')}</Row>`
      ),
      '</Table></Worksheet></Workbook>',
    ].join('');
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename('xls'); a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel exported');
  };

  const exportPrint = () => {
    if (!activeRows.length) return toast.error('No data to export');
    const sup  = suppliers.find(s => String(s.id) === filterSup);
    const keys = Object.keys(activeRows[0]);
    const rows = activeRows.map(r =>
      `<tr>${keys.map(k => `<td>${String(r[k] ?? '')}</td>`).join('')}</tr>`
    ).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Supplier Report</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;padding:20px;}
        h2{margin:0 0 4px;} p{margin:0 0 12px;color:#555;font-size:11px;}
        table{width:100%;border-collapse:collapse;}
        th{background:#1955af;color:#fff;padding:6px 8px;text-align:left;font-size:11px;}
        td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;}
        tr:nth-child(even) td{background:#f5f8ff;}
        .footer{margin-top:16px;font-size:10px;color:#999;}
      </style></head><body>
      <h2>${company.name || 'Supplier Report'}</h2>
      <p>${REPORT_TYPES.find(r => r.key === reportType)?.label || 'Report'}
        ${sup ? ` — ${sup.name}` : ''}
        &nbsp;&nbsp;Generated: ${new Date().toLocaleString('en-IN')}
      </p>
      <table><thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Total records: ${activeRows.length}</div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast.error('Allow popups to print');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const columns = activeRows.length > 0 ? Object.keys(activeRows[0]) : [];

  return (
    <div className="space-y-4">

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => setReportType(rt.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              reportType === rt.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >{rt.label}</button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-48" value={filterSup} onChange={e => setFilterSup(e.target.value)}>
          <option value="all">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        {reportType !== 'outstanding' && (
          <>
            <input className="input w-36" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
            <input className="input w-36" type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   placeholder="To" />
          </>
        )}
        {(dateFrom || dateTo || filterSup !== 'all') && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setFilterSup('all'); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportCSV}   className="btn-secondary py-1.5 px-3 text-xs gap-1.5"><Download size={13}/> CSV</button>
          <button onClick={exportExcel} className="btn-secondary py-1.5 px-3 text-xs gap-1.5"><Download size={13}/> Excel</button>
          <button onClick={exportPrint} className="btn-secondary py-1.5 px-3 text-xs gap-1.5"><FileText size={13}/> Print</button>
        </div>
      </div>

      {/* Summary strip */}
      {totals && (
        <div className="flex flex-wrap gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm">
          {reportType === 'purchase' && (
            <>
              <span className="text-gray-500">Orders: <strong className="text-gray-900 dark:text-white">{totals.orders}</strong></span>
              <span className="text-gray-500">Total Value: <strong className="text-primary-600">{curr(totals.total, sym)}</strong></span>
            </>
          )}
          {(reportType === 'payments' || reportType === 'returns') && (
            <>
              <span className="text-gray-500">Records: <strong className="text-gray-900 dark:text-white">{totals.count}</strong></span>
              <span className="text-gray-500">Total: <strong className="text-primary-600">{curr(totals.total, sym)}</strong></span>
            </>
          )}
          {reportType === 'outstanding' && (
            <span className="text-gray-500">Total Outstanding: <strong className="text-red-500">{curr(totals.total, sym)}</strong></span>
          )}
        </div>
      )}

      {/* Ledger: must select a supplier */}
      {reportType === 'ledger' && filterSup === 'all' && (
        <div className="card p-10 text-center">
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Select a supplier above to view their ledger</p>
        </div>
      )}

      {reportType === 'ledger' && filterSup !== 'all' && ledgerLoading && (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading ledger…</div>
      )}

      {/* Data table */}
      {(reportType !== 'ledger' || (filterSup !== 'all' && !ledgerLoading)) && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="table-head">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {activeRows.length === 0 && (
                  <tr><td colSpan={columns.length || 1} className="table-cell text-center text-gray-400 py-16">
                    <FileText size={32} className="mx-auto mb-2 opacity-20" />
                    <p>No records found</p>
                  </td></tr>
                )}
                {activeRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {columns.map(col => {
                      const val = row[col];
                      const isAmt = ['Total','Amount','Credit','Debit','Balance','Outstanding','Subtotal','Tax'].includes(col);
                      const isStatus = col === 'Status';
                      const statusColors = {
                        completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                        approved:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                        pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        rejected:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                        active:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        inactive:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                      };
                      return (
                        <td key={col} className="table-cell">
                          {isStatus ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[String(val).toLowerCase()] || 'bg-gray-100 text-gray-500'}`}>
                              {val}
                            </span>
                          ) : (
                            <span className={`text-sm ${
                              isAmt && String(val) !== '—'
                                ? 'font-semibold text-gray-800 dark:text-white'
                                : 'text-gray-600 dark:text-gray-300'
                            }`}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeRows.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
              {activeRows.length} record{activeRows.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

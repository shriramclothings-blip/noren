import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, exportCSV, getCustomerBehaviorBadgeClass, getCustomerBehaviorLabel } from '../utils/helpers';
import { Plus, Search, Edit2, Trash2, Eye, Download, Star, MapPin, FileText, ShoppingBag, MessageCircle, Phone, Mail, CreditCard, TrendingUp, Users, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';
import WhatsAppButton from '../components/WhatsAppButton';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { addCustomerCommsLog, getCustomerCommsLog } from '../db/db';
import toast from 'react-hot-toast';

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '', gstin: '', dues: 0, points: 0, creditLimit: 0, customer_behavior_type: null };

const BEHAVIOR_OPTIONS = [
  { value: '', label: 'Regular' },
  { value: 'genuine', label: 'Genuine' },
  { value: 'bargain', label: 'Bargain' },
  { value: 'vip', label: 'VIP' },
  { value: 'wholesale', label: 'Wholesale' },
];

export default function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, invoices, company } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewTab, setViewTab] = useState('overview');
  const [behaviorFilter, setBehaviorFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent');
  const [commsLog, setCommsLog] = useState([]);
  const [commsNote, setCommsNote] = useState('');
  const [commsType, setCommsType] = useState('note');

  const getCustomerInvoices = useCallback((customerId) =>
    invoices.filter(i => i.customerId === customerId).sort((a, b) => new Date(b.date) - new Date(a.date)),
  [invoices]);

  const enriched = useMemo(() => customers.map(c => {
    const custInv = getCustomerInvoices(c.id);
    const totalSpent = c.total_spent || custInv.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalOrders = c.total_orders || custInv.length;
    const lastVisit = c.last_purchase_date || c.last_purchase || custInv[0]?.date || null;
    const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const dues = Number(c.dues) || 0;
    const points = Number(c.points) || 0;
    return { ...c, totalSpent, totalOrders, lastVisit, avgOrder, dues, points };
  }), [customers, getCustomerInvoices]);

  const stats = useMemo(() => ({
    total: enriched.length,
    withDues: enriched.filter(c => c.dues > 0).length,
    totalDues: enriched.reduce((s, c) => s + c.dues, 0),
    totalPoints: enriched.reduce((s, c) => s + c.points, 0),
    totalRevenue: enriched.reduce((s, c) => s + c.totalSpent, 0),
    newThisMonth: enriched.filter(c => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  }), [enriched]);

  const filtered = useMemo(() => {
    let list = enriched.filter(c => {
      const matchSearch = !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase());
      const bt = String(c.customer_behavior_type || '').toLowerCase();
      const matchBehavior = behaviorFilter === 'All' ||
        (behaviorFilter === 'regular' ? !bt : bt === behaviorFilter.toLowerCase());
      return matchSearch && matchBehavior;
    });
    if (sortBy === 'recent') list = list.sort((a, b) => new Date(b.lastVisit || 0) - new Date(a.lastVisit || 0));
    else if (sortBy === 'spent') list = list.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sortBy === 'points') list = list.sort((a, b) => b.points - a.points);
    else if (sortBy === 'dues') list = list.sort((a, b) => b.dues - a.dues);
    else if (sortBy === 'name') list = list.sort((a, b) => a.name?.localeCompare(b.name));
    return list;
  }, [enriched, search, behaviorFilter, sortBy]);

  const openAdd = () => { setForm(EMPTY); setEditItem(null); setShowModal(true); };
  const openEdit = (c) => { setForm({ ...c }); setEditItem(c); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name?.trim()) return toast.error('Name required');
    if (editItem) {
      await updateCustomer({ ...form, id: editItem.id });
      toast.success('Customer updated');
    } else {
      await addCustomer({ ...form, total_orders: 0, total_spent: 0, last_purchase: null, last_purchase_date: null });
      toast.success('Customer added');
    }
    setShowModal(false);
  };

  const openView = async (c) => {
    setViewCustomer(c);
    setViewTab('overview');
    setCommsNote('');
    try {
      const log = await getCustomerCommsLog(c.id);
      setCommsLog(log || []);
    } catch { setCommsLog([]); }
  };

  const handleAddComms = async () => {
    if (!commsNote.trim()) return toast.error('Enter a note');
    await addCustomerCommsLog({ customerId: viewCustomer.id, type: commsType, note: commsNote, createdBy: 'Staff' });
    const log = await getCustomerCommsLog(viewCustomer.id);
    setCommsLog(log || []);
    setCommsNote('');
    toast.success('Note added');
  };

  const getExportRows = () => enriched.map(c => ({
    Name: c.name, Phone: c.phone, Email: c.email || '',
    Behavior: getCustomerBehaviorLabel(c.customer_behavior_type),
    Orders: c.totalOrders, TotalSpent: c.totalSpent,
    Dues: c.dues, Points: c.points,
    LastVisit: c.lastVisit ? formatDate(c.lastVisit) : '',
  }));

  const COMMS_ICONS = { note: FileText, call: Phone, whatsapp: MessageCircle, email: Mail };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={24} className="text-primary-500" /> Customers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{stats.total} customers • {formatCurrency(stats.totalRevenue, company.currency)} lifetime revenue</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportCSV(getExportRows(), 'customers.csv')} className="btn-secondary btn-sm"><Download size={14} /> CSV</button>
          <button onClick={() => exportToExcel(getExportRows(), 'customers.xlsx', 'Customers')} className="btn-secondary btn-sm"><Download size={14} /> Excel</button>
          <button onClick={() => exportToPDF(getExportRows(), 'customers.pdf', company)} className="btn-secondary btn-sm"><Download size={14} /> PDF</button>
          <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Customer</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-primary-600' },
          { label: 'New This Month', value: stats.newThisMonth, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'With Dues', value: stats.withDues, icon: AlertCircle, color: 'text-red-500' },
          { label: 'Total Dues', value: formatCurrency(stats.totalDues, company.currency), icon: CreditCard, color: 'text-red-500' },
          { label: 'Loyalty Points', value: stats.totalPoints.toLocaleString(), icon: Star, color: 'text-amber-500' },
          { label: 'Lifetime Revenue', value: formatCurrency(stats.totalRevenue, company.currency), icon: ShoppingBag, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <s.icon size={16} className={s.color + ' mb-1.5'} />
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={behaviorFilter} onChange={e => setBehaviorFilter(e.target.value)}>
          <option value="All">All Types</option>
          {BEHAVIOR_OPTIONS.map(o => <option key={o.value} value={o.value || 'regular'}>{o.label}</option>)}
        </select>
        <select className="input w-40" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="recent">Recent First</option>
          <option value="spent">Top Spenders</option>
          <option value="points">Most Points</option>
          <option value="dues">Highest Dues</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Customer', 'Phone', 'Type', 'Orders', 'Total Spent', 'Avg Order', 'Last Visit', 'Dues', 'Points', 'Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-12">No customers found</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => openView(c)}>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <button onClick={() => openView(c)} className="font-medium text-sm truncate hover:text-primary-600 text-left">{c.name}</button>
                        {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500">{c.phone || '—'}</td>
                  <td className="table-cell">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCustomerBehaviorBadgeClass(c.customer_behavior_type)}`}>
                      {getCustomerBehaviorLabel(c.customer_behavior_type)}
                    </span>
                  </td>
                  <td className="table-cell text-center font-semibold text-primary-600">{c.totalOrders}</td>
                  <td className="table-cell font-semibold text-emerald-600">{formatCurrency(c.totalSpent, company.currency)}</td>
                  <td className="table-cell text-gray-500">{c.totalOrders > 0 ? formatCurrency(c.avgOrder, company.currency) : '—'}</td>
                  <td className="table-cell text-xs text-gray-500">
                    {c.lastVisit ? (() => { try { return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(c.lastVisit)); } catch { return '—'; } })() : '—'}
                  </td>
                  <td className="table-cell">
                    <span className={c.dues > 0 ? 'text-red-500 font-semibold' : 'text-gray-400'}>
                      {c.dues > 0 ? formatCurrency(c.dues, company.currency) : '—'}
                    </span>
                  </td>
                  <td className="table-cell">
                    {c.points > 0
                      ? <div className="flex items-center gap-1 text-amber-600"><Star size={11} className="fill-amber-400 text-amber-400" /><span className="font-semibold">{c.points}</span></div>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openView(c)} className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg text-primary-600" title="View"><Eye size={14} /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Edit"><Edit2 size={14} /></button>
                      <WhatsAppButton customer={c} company={company} variant="icon" size="sm" />
                      <button onClick={() => { if (window.confirm('Delete customer?')) deleteCustomer(c.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Customer' : 'Add Customer'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full Name *</label>
            <input className="input" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          {[
            { label: 'Phone', key: 'phone', type: 'tel' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'GSTIN', key: 'gstin', type: 'text' },
            { label: 'Credit Limit (₹)', key: 'creditLimit', type: 'number' },
            { label: 'Opening Dues (₹)', key: 'dues', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input className="input" type={f.type} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Customer Type</label>
            <select className="input" value={form.customer_behavior_type || ''} onChange={e => setForm(p => ({ ...p, customer_behavior_type: e.target.value || null }))}>
              {BEHAVIOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label"><MapPin size={12} className="inline mr-1" />Address</label>
            <textarea className="input resize-none" rows={2} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label"><FileText size={12} className="inline mr-1" />Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save Customer</button>
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </Modal>

      {/* View Customer Modal */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title="" size="lg">
        {viewCustomer && (() => {
          const c = enriched.find(x => x.id === viewCustomer.id) || viewCustomer;
          const custInv = getCustomerInvoices(c.id);

          return (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold">{c.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getCustomerBehaviorBadgeClass(c.customer_behavior_type)}`}>
                      {getCustomerBehaviorLabel(c.customer_behavior_type)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                    {c.phone && <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                    {c.address && <span className="flex items-center gap-1"><MapPin size={12} />{c.address}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setViewCustomer(null); openEdit(c); }} className="btn-secondary btn-sm"><Edit2 size={13} /> Edit</button>
                  {c.phone && <WhatsAppButton customer={c} company={company} size="sm" label="WhatsApp" />}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Orders', value: c.totalOrders, color: 'text-primary-600' },
                  { label: 'Total Spent', value: formatCurrency(c.totalSpent, company.currency), color: 'text-emerald-600' },
                  { label: 'Dues', value: formatCurrency(c.dues, company.currency), color: c.dues > 0 ? 'text-red-500' : 'text-gray-400' },
                  { label: 'Points', value: c.points, color: 'text-amber-500' },
                ].map(s => (
                  <div key={s.label} className="card p-3 text-center">
                    <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800">
                {['overview', 'purchases', 'comms'].map(tab => (
                  <button key={tab} onClick={() => setViewTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${viewTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {tab === 'comms' ? 'Notes & Comms' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Tab: Overview */}
              {viewTab === 'overview' && (
                <div className="space-y-3">
                  {c.notes && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <FileText size={14} className="flex-shrink-0 mt-0.5" />{c.notes}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {c.gstin && <div className="card p-3"><p className="text-xs text-gray-400 mb-0.5">GSTIN</p><p className="font-medium">{c.gstin}</p></div>}
                    {c.creditLimit > 0 && <div className="card p-3"><p className="text-xs text-gray-400 mb-0.5">Credit Limit</p><p className="font-medium text-primary-600">{formatCurrency(c.creditLimit, company.currency)}</p></div>}
                    <div className="card p-3"><p className="text-xs text-gray-400 mb-0.5">Avg Order Value</p><p className="font-medium">{c.totalOrders > 0 ? formatCurrency(c.avgOrder, company.currency) : '—'}</p></div>
                    <div className="card p-3"><p className="text-xs text-gray-400 mb-0.5">Last Visit</p><p className="font-medium text-xs">{c.lastVisit ? formatDate(c.lastVisit) : '—'}</p></div>
                  </div>
                </div>
              )}

              {/* Tab: Purchases */}
              {viewTab === 'purchases' && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {custInv.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No purchases yet</p>}
                  {custInv.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                      <span className="font-medium text-primary-600 w-28 truncate">{inv.invoiceNumber}</span>
                      <span className="text-gray-400 text-xs">{formatDate(inv.date)}</span>
                      <span className="text-xs text-gray-400">{inv.paymentMode}</span>
                      <span className="font-semibold">{formatCurrency(inv.total, company.currency)}</span>
                      <span className={inv.status === 'Paid' ? 'badge-green' : inv.status === 'Unpaid' ? 'badge-red' : 'badge-yellow'}>{inv.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Notes & Comms */}
              {viewTab === 'comms' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select className="input w-36 py-2 text-sm" value={commsType} onChange={e => setCommsType(e.target.value)}>
                      <option value="note">Note</option>
                      <option value="call">Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                    <input className="input flex-1 py-2 text-sm" placeholder="Add a note or log..." value={commsNote} onChange={e => setCommsNote(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComms()} />
                    <button onClick={handleAddComms} className="btn-primary px-4">Add</button>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {commsLog.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No notes yet</p>}
                    {commsLog.map(log => {
                      const Icon = COMMS_ICONS[log.type] || FileText;
                      return (
                        <div key={log.id} className="flex items-start gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                          <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-700 dark:text-gray-300">{log.note}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{log.createdBy} • {formatDate(log.date)}</p>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-500 capitalize flex-shrink-0">{log.type}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

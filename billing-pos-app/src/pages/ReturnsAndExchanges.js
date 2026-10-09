import React, { useMemo, useState, useCallback } from 'react';
import {
  RotateCcw, Plus, AlertCircle, CheckCircle2, FileText, Package,
  ArrowLeftRight, Printer, Trash2, Edit3, Search, X, ShoppingCart,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { formatCurrency, printInvoicePDF } from '../utils/helpers';
import { reserveProfessionalInvoiceNumber } from '../db/db';

const EMPTY_FORM = {
  invoiceId: '',
  reason: 'Damaged',
  refundMode: 'cash',
  status: 'Approved',
  returnType: 'refund',
  notes: '',
  // returnItems: [{ itemIndex, qty, variantId }]
  returnItems: [],
  // exchangeItems: [{ productId, variantId, name, price, qty, taxRate }]
  exchangeItems: [],
};

const REASONS = ['Damaged', 'Expired', 'Wrong Item', 'Customer Changed Mind', 'Size Issue', 'Defective', 'Other'];
const REFUND_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'store-credit', label: 'Store Credit' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
];

export default function ReturnsAndExchanges() {
  const {
    invoices = [], returns = [], products = [], variants = [],
    addSalesReturn, updateSalesReturn, deleteSalesReturn, markInvoiceReturnStatus,
    addInvoice, company, printSettings,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editReturn, setEditReturn] = useState(null);    // for editing existing return record
  const [form, setForm] = useState(EMPTY_FORM);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const safeInvoices = useMemo(() => (Array.isArray(invoices) ? invoices : []), [invoices]);
  const safeReturns = useMemo(() => (Array.isArray(returns) ? returns : []), [returns]);

  // Invoices that can be returned (not already full-return tagged, not a refund invoice)
  const invoiceOptions = useMemo(() =>
    safeInvoices.filter(inv =>
      Array.isArray(inv.items) && inv.items.length > 0 &&
      inv.status !== 'Refund' &&
      inv.returnTag !== 'full-return'
    ).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [safeInvoices]
  );

  const selectedInvoice = useMemo(() =>
    invoiceOptions.find(inv => String(inv.id) === String(form.invoiceId)) || null,
    [invoiceOptions, form.invoiceId]
  );

  const invoiceItems = selectedInvoice?.items || [];

  // Get variants for a given productId
  const getVariantsFor = useCallback((productId) => {
    if (!productId) return [];
    return variants.filter(v => v.productId === productId);
  }, [variants]);

  // Filtered products for exchange panel
  const filteredExchangeProducts = useMemo(() => {
    if (!productSearch.trim()) return products.filter(p => !p.archived).slice(0, 40);
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      !p.archived && (
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      )
    ).slice(0, 40);
  }, [products, productSearch]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending = safeReturns.filter(e => String(e.status).toLowerCase() === 'pending').length;
    const approved = safeReturns.filter(e => String(e.status).toLowerCase() === 'approved').length;
    const refunds = safeReturns.filter(e => e.returnType === 'refund').length;
    const exchanges = safeReturns.filter(e => e.returnType === 'exchange').length;
    const totalValue = safeReturns.reduce((sum, e) => sum + Number(e.total || 0), 0);
    return { pending, approved, totalValue, refunds, exchanges };
  }, [safeReturns]);

  // ── Filtered table ───────────────────────────────────────────────────────
  const filteredReturns = useMemo(() => {
    return safeReturns.filter(r => {
      if (filterType !== 'All' && r.returnType !== filterType.toLowerCase()) return false;
      if (filterStatus !== 'All' && String(r.status).toLowerCase() !== filterStatus.toLowerCase()) return false;
      return true;
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [safeReturns, filterType, filterStatus]);

  // ── Open new return modal ────────────────────────────────────────────────
  const openNewReturn = () => {
    setForm(EMPTY_FORM);
    setEditReturn(null);
    setProductSearch('');
    setShowProductPanel(false);
    setShowModal(true);
  };

  const openEditReturn = (ret) => {
    setEditReturn(ret);
    setForm({
      invoiceId: String(ret.invoiceId || ''),
      reason: ret.reason || 'Damaged',
      refundMode: ret.refundMode || 'cash',
      status: ret.status || 'Approved',
      returnType: ret.returnType || 'refund',
      notes: ret.notes || '',
      returnItems: ret.items || [],
      exchangeItems: ret.exchangeItems || [],
    });
    setProductSearch('');
    setShowProductPanel(false);
    setShowModal(true);
  };

  // ── Toggle an invoice item in returnItems ────────────────────────────────
  const toggleReturnItem = (item, itemIndex) => {
    setForm(f => {
      const existing = f.returnItems.find(r => r.itemIndex === itemIndex);
      if (existing) {
        return { ...f, returnItems: f.returnItems.filter(r => r.itemIndex !== itemIndex) };
      }
      return {
        ...f,
        returnItems: [...f.returnItems, {
          itemIndex,
          productId: item.productId,
          variantId: item.variantId || null,
          name: item.name || item.productName || 'Product',
          qty: item.qty || 1,
          maxQty: item.qty || 1,
          price: Number(item.price || item.salePrice || 0),
          taxRate: Number(item.taxRate || 0),
        }],
      };
    });
  };

  const updateReturnItemQty = (itemIndex, qty) => {
    setForm(f => ({
      ...f,
      returnItems: f.returnItems.map(r =>
        r.itemIndex === itemIndex ? { ...r, qty: Math.max(1, Math.min(qty, r.maxQty)) } : r
      ),
    }));
  };

  // ── Exchange item helpers ────────────────────────────────────────────────
  const addExchangeItem = (product, variantId = null) => {
    const variant = variantId ? variants.find(v => v.id === variantId) : null;
    const price = Number(variant?.price || product.price || 0);
    const name = variant
      ? `${product.name} (${[variant.size, variant.color].filter(Boolean).join('/')})`
      : product.name;
    setForm(f => {
      const existing = f.exchangeItems.find(e => e.productId === product.id && String(e.variantId || '') === String(variantId || ''));
      if (existing) {
        return { ...f, exchangeItems: f.exchangeItems.map(e =>
          e.productId === product.id && String(e.variantId || '') === String(variantId || '')
            ? { ...e, qty: e.qty + 1 }
            : e
        )};
      }
      return {
        ...f,
        exchangeItems: [...f.exchangeItems, {
          productId: product.id,
          variantId: variantId || null,
          name,
          price,
          qty: 1,
          taxRate: Number(variant?.taxRate || product.taxRate || 0),
        }],
      };
    });
  };

  const updateExchangeItemQty = (idx, qty) => {
    setForm(f => ({
      ...f,
      exchangeItems: f.exchangeItems.map((e, i) => i === idx ? { ...e, qty: Math.max(1, qty) } : e),
    }));
  };

  const removeExchangeItem = (idx) => {
    setForm(f => ({ ...f, exchangeItems: f.exchangeItems.filter((_, i) => i !== idx) }));
  };

  // ── Calculations ─────────────────────────────────────────────────────────
  const returnTotal = useMemo(() =>
    form.returnItems.reduce((s, i) => s + i.price * i.qty, 0),
    [form.returnItems]
  );
  const exchangeTotal = useMemo(() =>
    form.exchangeItems.reduce((s, i) => s + i.price * i.qty, 0),
    [form.exchangeItems]
  );
  const balanceDue = exchangeTotal - returnTotal; // positive = customer pays extra, negative = refund

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedInvoice) {
      toast.error('Select an invoice first');
      return;
    }
    if (form.returnItems.length === 0) {
      toast.error('Select at least one item to return');
      return;
    }

    try {
      const now = new Date().toISOString();

      if (editReturn) {
        // ── Edit existing return ──────────────────────────────────────────
        await updateSalesReturn({
          ...editReturn,
          reason: form.reason,
          refundMode: form.refundMode,
          returnType: form.returnType,
          status: form.status,
          notes: form.notes,
          items: form.returnItems,
          exchangeItems: form.exchangeItems,
          total: returnTotal,
          exchangeTotal,
          balanceDue,
        });
        toast.success('Return record updated');
        setShowModal(false);
        return;
      }

      // ── Create new return record ─────────────────────────────────────────
      const firstItem = form.returnItems[0];
      const returnId = await addSalesReturn({
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber || selectedInvoice.id,
        productId: firstItem?.productId,
        variantId: firstItem?.variantId || null,
        productName: firstItem?.name || 'Product',
        quantity: form.returnItems.reduce((s, i) => s + i.qty, 0),
        reason: form.reason,
        refundMode: form.returnType === 'exchange' ? 'exchange' : form.refundMode,
        returnType: form.returnType,
        status: form.status,
        total: returnTotal,
        exchangeTotal,
        balanceDue,
        notes: form.notes,
        items: form.returnItems,
        exchangeItems: form.exchangeItems,
        date: now,
      });

      // ── Mark original invoice with return/exchange tag ───────────────────
      const totalOrigQty = (selectedInvoice.items || []).reduce((s, i) => s + (i.qty || 0), 0);
      const totalRetQty = form.returnItems.reduce((s, i) => s + i.qty, 0);
      let tag;
      if (form.returnType === 'exchange') {
        tag = totalRetQty >= totalOrigQty ? 'exchange' : 'partial-exchange';
      } else {
        tag = totalRetQty >= totalOrigQty ? 'full-return' : 'partial-return';
      }
      await markInvoiceReturnStatus(selectedInvoice.id, tag, {
        returnId,
        returnInvoiceNumber: `${form.returnType === 'exchange' ? 'EXC' : 'RET'}-${selectedInvoice.invoiceNumber}`,
      });

      // ── If exchange: create a direct billing invoice for new items ───────
      if (form.returnType === 'exchange' && form.exchangeItems.length > 0 && form.status === 'Approved') {
        let excInvNumber;
        try {
          excInvNumber = await reserveProfessionalInvoiceNumber(company);
        } catch {
          excInvNumber = `EXC-${selectedInvoice.invoiceNumber}-${Date.now()}`;
        }
        const { id: _id, createdAt: _c, updatedAt: _u, customerBarcode: _cb, invoiceNumber: _in, invoiceBarcode: _ib, ...base } = selectedInvoice;
        await addInvoice({
          ...base,
          invoiceNumber: excInvNumber,
          invoiceBarcode: excInvNumber,
          items: form.exchangeItems,
          total: exchangeTotal,
          subtotal: form.exchangeItems.reduce((s, i) => s + i.price * i.qty, 0),
          taxAmt: 0,
          discountAmt: 0,
          status: 'Paid',
          returnTag: 'exchange',
          originalInvoiceId: selectedInvoice.id,
          originalInvoiceNumber: selectedInvoice.invoiceNumber,
          notes: `Exchange for ${selectedInvoice.invoiceNumber}. Balance: ${balanceDue >= 0 ? `Customer pays ${formatCurrency(balanceDue, company.currency)}` : `Refund ${formatCurrency(-balanceDue, company.currency)}`}`,
          date: now,
        });
        toast.success(`Exchange invoice ${excInvNumber} created`);
      }

      toast.success(
        form.returnType === 'exchange'
          ? `Exchange recorded — stock restored & exchange invoice created`
          : `Return recorded — stock restored`
      );
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Unable to save return');
    }
  };

  const handleApprove = async (ret) => {
    try {
      await updateSalesReturn({ ...ret, status: 'Approved' });
      toast.success('Approved — stock restored');
    } catch (err) {
      toast.error(err?.message || 'Unable to approve');
    }
  };

  const handleDelete = async (ret) => {
    if (!window.confirm('Delete this return record? This will NOT reverse any stock changes already applied.')) return;
    try {
      await deleteSalesReturn(ret.id);
      toast.success('Return record deleted');
    } catch (err) {
      toast.error(err?.message || 'Unable to delete');
    }
  };

  const handlePrintReturn = (ret) => {
    const inv = safeInvoices.find(i => String(i.id) === String(ret.invoiceId));
    if (!inv) { toast.error('Original invoice not found'); return; }
    const returnInv = {
      ...inv,
      invoiceNumber: `${ret.returnType === 'exchange' ? 'EXC' : 'RET'}-${ret.invoiceNumber || inv.invoiceNumber}`,
      items: ret.items || inv.items,
      total: ret.total || 0,
      subtotal: ret.total || 0,
      taxAmt: 0,
      discountAmt: 0,
      status: ret.returnType === 'exchange' ? 'Exchange' : 'Refund',
      notes: `${ret.returnType === 'exchange' ? 'Exchange' : 'Return'} | Reason: ${ret.reason} | ${ret.notes || ''}`,
      date: ret.date || ret.createdAt,
      returnTag: ret.returnType,
      originalInvoiceNumber: ret.invoiceNumber,
    };
    printInvoicePDF(returnInv, company, 'thermal', { printSettings, forceDialog: true });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Returns &amp; Exchanges</h1>
          <p className="text-sm text-gray-500">Process returns &amp; exchanges with direct billing. Approved records restore stock automatically.</p>
        </div>
        <button onClick={openNewReturn} className="btn-primary"><Plus size={16} /> New Return / Exchange</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-orange-500' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Refunds', value: stats.refunds, color: 'text-blue-600' },
          { label: 'Exchanges', value: stats.exchanges, color: 'text-purple-600' },
          { label: 'Total Value', value: formatCurrency(stats.totalValue, company.currency), color: 'text-primary-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['All','refund','exchange'].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterType === t ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {t === 'All' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
          </button>
        ))}
        <span className="w-px bg-gray-200 dark:bg-gray-700" />
        {['All','Pending','Approved'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Date & Time','Invoice','Type','Items','Return Value','Exchange Value','Balance','Reason','Refund Mode','Status','Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={11} className="table-cell text-center text-gray-400 py-10">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    No returns logged yet
                  </td>
                </tr>
              )}
              {filteredReturns.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>
                    <td className="table-cell text-xs text-gray-500">{formatDateTime(entry.date || entry.createdAt)}</td>
                    <td className="table-cell font-medium text-primary-600">{entry.invoiceNumber || entry.invoiceId}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        entry.returnType === 'exchange'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {entry.returnType === 'exchange' ? <ArrowLeftRight size={11} /> : <RotateCcw size={11} />}
                        {entry.returnType === 'exchange' ? 'Exchange' : 'Refund'}
                      </span>
                    </td>
                    <td className="table-cell">{entry.items?.length || 1}</td>
                    <td className="table-cell font-semibold text-red-600">-{formatCurrency(entry.total || 0, company.currency)}</td>
                    <td className="table-cell font-semibold text-green-600">
                      {entry.exchangeTotal > 0 ? `+${formatCurrency(entry.exchangeTotal, company.currency)}` : '—'}
                    </td>
                    <td className="table-cell text-xs">
                      {entry.returnType === 'exchange' && entry.balanceDue != null ? (
                        <span className={entry.balanceDue >= 0 ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {entry.balanceDue >= 0
                            ? `Collect ${formatCurrency(entry.balanceDue, company.currency)}`
                            : `Refund ${formatCurrency(-entry.balanceDue, company.currency)}`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-cell">{entry.reason || '—'}</td>
                    <td className="table-cell capitalize">{entry.refundMode || 'cash'}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        String(entry.status).toLowerCase() === 'pending'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {String(entry.status).toLowerCase() === 'pending' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                        {entry.status || 'Approved'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {String(entry.status).toLowerCase() === 'pending' && (
                          <button onClick={e => { e.stopPropagation(); handleApprove(entry); }}
                            className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-600" title="Approve">
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); handlePrintReturn(entry); }}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600" title="Print Receipt">
                          <Printer size={15} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); openEditReturn(entry); }}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(entry); }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500" title="Delete">
                          <Trash2 size={15} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setExpandedRow(expandedRow === entry.id ? null : entry.id); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                          {expandedRow === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === entry.id && (
                    <tr className="bg-gray-50 dark:bg-gray-800/40">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1"><RotateCcw size={13} /> Returned Items</p>
                            {(entry.items || []).map((item, i) => (
                              <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-700">
                                <span>{item.name || item.productName}</span>
                                <span className="text-gray-500">×{item.qty} @ {formatCurrency(item.price, company.currency)}</span>
                              </div>
                            ))}
                          </div>
                          {entry.returnType === 'exchange' && (entry.exchangeItems || []).length > 0 && (
                            <div>
                              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1"><ArrowLeftRight size={13} /> Exchange Items</p>
                              {entry.exchangeItems.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-700">
                                  <span>{item.name}</span>
                                  <span className="text-gray-500">×{item.qty} @ {formatCurrency(item.price, company.currency)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {entry.notes && <p className="mt-2 text-xs text-gray-500 italic">Notes: {entry.notes}</p>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New / Edit Return Modal ────────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editReturn ? `Edit Return #${editReturn.id}` : 'New Return / Exchange'}
        size="xl"
      >
        <div className="space-y-5">
          {/* Row 1: Invoice + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Original Invoice</label>
              <select
                className="input"
                value={form.invoiceId}
                onChange={e => setForm(f => ({ ...f, invoiceId: e.target.value, returnItems: [], exchangeItems: [] }))}
                disabled={!!editReturn}
              >
                <option value="">Choose invoice…</option>
                {invoiceOptions.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber || `INV-${inv.id}`} — {inv.customerName || 'Walk-in'} ({formatCurrency(inv.total, company.currency)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <div className="flex gap-2 mt-1">
                {[{ v: 'refund', label: 'Refund', icon: <RotateCcw size={14} /> }, { v: 'exchange', label: 'Exchange', icon: <ArrowLeftRight size={14} /> }].map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => setForm(f => ({ ...f, returnType: opt.v, exchangeItems: opt.v === 'refund' ? [] : f.exchangeItems }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.returnType === opt.v
                        ? opt.v === 'exchange'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Invoice Items Selection */}
          {selectedInvoice && (
            <div>
              <label className="label mb-2">Select Items to Return</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {invoiceItems.map((item, idx) => {
                  const sel = form.returnItems.find(r => r.itemIndex === idx);
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      sel ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <input type="checkbox" checked={!!sel}
                        onChange={() => toggleReturnItem(item, idx)}
                        className="w-4 h-4 rounded accent-primary-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name || item.productName}</p>
                        <p className="text-xs text-gray-400">Sold: {item.qty} × {formatCurrency(item.price, company.currency)}</p>
                      </div>
                      {sel && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Qty:</span>
                          <input type="number" min={1} max={item.qty}
                            value={sel.qty}
                            onChange={e => updateReturnItemQty(idx, parseInt(e.target.value) || 1)}
                            className="input w-16 py-1 text-sm text-center" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exchange Items Panel */}
          {form.returnType === 'exchange' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label m-0">Exchange Items (New Items for Customer)</label>
                <button type="button" onClick={() => setShowProductPanel(p => !p)}
                  className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                  <ShoppingCart size={13} /> {showProductPanel ? 'Hide Products' : 'Add Products'}
                </button>
              </div>

              {showProductPanel && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="input pl-8 text-sm" placeholder="Search products…"
                      value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredExchangeProducts.map(p => {
                      const pVariants = getVariantsFor(p.id);
                      return (
                        <div key={p.id} className="text-sm">
                          {pVariants.length === 0 ? (
                            <button type="button" onClick={() => addExchangeItem(p)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                              <span>{p.name}</span>
                              <span className="text-gray-400 text-xs">{formatCurrency(p.price, company.currency)} · Stk: {p.stock ?? 0}</span>
                            </button>
                          ) : (
                            <div className="px-2">
                              <p className="text-xs font-medium text-gray-500 px-1 py-1">{p.name}</p>
                              {pVariants.map(v => (
                                <button key={v.id} type="button" onClick={() => addExchangeItem(p, v.id)}
                                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                                  <span className="text-xs">{[v.size, v.color].filter(Boolean).join(' / ') || v.label || 'Default'}</span>
                                  <span className="text-gray-400 text-xs">{formatCurrency(v.price || p.price, company.currency)} · Stk: {v.stock ?? 0}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.exchangeItems.length > 0 && (
                <div className="space-y-1 mt-2">
                  {form.exchangeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-700 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(item.price, company.currency)} each</p>
                      </div>
                      <input type="number" min={1} value={item.qty}
                        onChange={e => updateExchangeItemQty(idx, parseInt(e.target.value) || 1)}
                        className="input w-16 py-1 text-sm text-center" />
                      <button type="button" onClick={() => removeExchangeItem(idx)}
                        className="p-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Row 2: Reason, Refund Mode, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Reason</label>
              <select className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {form.returnType !== 'exchange' && (
              <div>
                <label className="label">Refund Mode</label>
                <select className="input" value={form.refundMode} onChange={e => setForm(f => ({ ...f, refundMode: e.target.value }))}>
                  {REFUND_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Approved">Approved (restore stock now)</option>
                <option value="Pending">Pending (manual approval later)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="Optional note for this return / exchange"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {/* Summary */}
          {form.returnItems.length > 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/40 text-sm space-y-1">
              <div className="flex items-center gap-2 font-semibold text-gray-600 dark:text-gray-300 mb-2">
                <FileText size={14} /> Summary
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Items returned:</span>
                <span className="font-medium">{form.returnItems.reduce((s, i) => s + i.qty, 0)} pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Return value:</span>
                <span className="font-semibold text-red-600">-{formatCurrency(returnTotal, company.currency)}</span>
              </div>
              {form.returnType === 'exchange' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Exchange value:</span>
                    <span className="font-semibold text-green-600">+{formatCurrency(exchangeTotal, company.currency)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                    <span className="font-semibold">{balanceDue >= 0 ? 'Customer pays:' : 'Refund to customer:'}</span>
                    <span className={`font-bold text-base ${balanceDue >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(balanceDue), company.currency)}
                    </span>
                  </div>
                  {form.status === 'Approved' && form.exchangeItems.length > 0 && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      ✓ An exchange invoice will be created automatically on save.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSubmit} className="btn-primary flex-1">
              {editReturn ? <><Edit3 size={15} /> Update Return</> : <><RotateCcw size={15} /> {form.returnType === 'exchange' ? 'Process Exchange' : 'Save Return'}</>}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { decodeFullInvoiceBarcode, formatCurrency, formatDate, downloadInvoicePDF, printInvoicePDF, remotePrintInvoice, exportCSV, getCustomerBehaviorBadgeClass, getCustomerBehaviorLabel } from '../utils/helpers';
import { Search, Printer, Trash2, Eye, Download, RotateCcw, BadgePercent, Calendar, MoreVertical, Edit, ArrowLeftRight, MessageCircle, Cloud } from 'lucide-react';
import Modal from '../components/Modal';
import InvoiceSendModal from '../components/InvoiceSendModal';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import { format, startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns';
import { useNetworkSync } from '../context/NetworkSyncContext';

const DATE_RANGES = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7days', label: 'Last 7 Days' },
  { id: '30days', label: 'Last 30 Days' },
  { id: '3months', label: '3 Months' },
  { id: '1year', label: '1 Year' },
  { id: 'custom', label: 'Custom' },
];

const getDateBounds = (range, customFrom, customTo) => {
  const now = new Date();
  switch (range) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case '7days': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30days': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case '3months': return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    case '1year': return { from: startOfDay(subDays(now, 364)), to: endOfDay(now) };
    case 'custom': return {
      from: customFrom ? startOfDay(new Date(customFrom)) : startOfDay(subDays(now, 29)),
      to: customTo ? endOfDay(new Date(customTo)) : endOfDay(now),
    };
    default: return null; // all time
  }
};

export default function Invoices() {
  const { invoices, deleteInvoice, addInvoice, updateInvoice, applyInvoiceAdjustment, company, printSettings, invoiceTextStyles, customers, markInvoiceReturnStatus } = useApp();
  const { deviceRole, isConnected, requestRemotePrint } = useNetworkSync();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customDateTo, setCustomDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showReturn, setShowReturn] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [scanValue, setScanValue] = useState('');
  const [adjustmentInvoice, setAdjustmentInvoice] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('discount');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentPaidAmount, setAdjustmentPaidAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);
  const [adjustmentPaymentMode, setAdjustmentPaymentMode] = useState('Cash');
  const [adjustmentSplitPayments, setAdjustmentSplitPayments] = useState([{ method: 'Cash', amount: '' }]);
  const [editInvoice, setEditInvoice] = useState(null);
  const [invoiceSendTarget, setInvoiceSendTarget] = useState(null); // for InvoiceSendModal
  const [openMenuId, setOpenMenuId] = useState(null);

  const filtered = useMemo(() => {
    const bounds = getDateBounds(dateRange, customDateFrom, customDateTo);
    return invoices.filter(inv => {
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
      const searchLower = search.toLowerCase();
      if (searchLower && !(
        inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
        inv.customerName?.toLowerCase().includes(searchLower) ||
        inv.customerPhone?.includes(search)
      )) return false;
      if (bounds) {
        const d = new Date(inv.date);
        if (d < bounds.from || d > bounds.to) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, search, statusFilter, dateRange, customDateFrom, customDateTo]);

  const getTotalItemsQty = (inv) => {
    if (Number.isFinite(Number(inv?.totalItemsQty))) return Number(inv.totalItemsQty);
    return (inv?.items || []).reduce((s, it) => s + (Number(it?.qty) || 0), 0);
  };

  const handleReturn = async () => {
    if (!returnItems.length) return;
    const activeItems = returnItems.filter(i => (i.qty || 0) > 0);
    if (!activeItems.length) { toast.error('Select at least one item with quantity > 0'); return; }
    const returnSubtotal = activeItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
    const returnTaxAmt = activeItems.reduce((s, i) => {
      const lineSubtotal = (Number(i.price) || 0) * (Number(i.qty) || 0);
      const taxRate = Number(i.taxRate) || 0;
      return s + (lineSubtotal * taxRate) / 100;
    }, 0);
    const returnTotal = returnSubtotal + returnTaxAmt;
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, customerBarcode: _customerBarcode, ...base } = showReturn || {};
    const returnInvoiceNumber = `RET-${showReturn.invoiceNumber}`;
    const newInvoiceId = await addInvoice({
      ...base,
      invoiceNumber: returnInvoiceNumber,
      invoiceBarcode: returnInvoiceNumber,
      items: activeItems,
      total: -returnTotal,
      subtotal: -returnSubtotal,
      taxAmt: -returnTaxAmt,
      discountAmt: 0,
      status: 'Refund',
      returnTag: 'return',
      originalInvoiceId: showReturn.id,
      originalInvoiceNumber: showReturn.invoiceNumber,
      notes: `Return for ${showReturn.invoiceNumber}`,
      date: new Date().toISOString(),
    });
    // Check if all items returned or partial
    const totalOrigQty = (showReturn.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    const totalRetQty = activeItems.reduce((s, i) => s + (i.qty || 0), 0);
    const tag = totalRetQty >= totalOrigQty ? 'full-return' : 'partial-return';
    if (markInvoiceReturnStatus) {
      await markInvoiceReturnStatus(showReturn.id, tag, { returnInvoiceNumber, id: newInvoiceId });
    }
    toast.success('Return processed!');
    setShowReturn(null); setReturnItems([]);
  };

  const totalRevenue = filtered.filter(i => i.status !== 'Refund').reduce((s, i) => s + (i.total || 0), 0);
  const getExportRows = () => filtered.map(i => ({
    Number: i.invoiceNumber,
    Customer: i.customerName,
    Date: formatDate(i.date),
    Total: i.total,
    Payment: i.paymentMode,
    Status: i.status,
  }));

  const openByScan = () => {
    const decoded = decodeFullInvoiceBarcode(scanValue);
    if (!decoded?.ok) {
      toast.error(decoded?.error || 'Invalid barcode');
      return;
    }
    const invNo = String(decoded?.invoiceNumber || '').trim();
    if (!invNo) {
      toast.error('Invoice number not found in barcode');
      return;
    }
    const found = (invoices || []).find(i => String(i?.invoiceNumber || '').trim().toLowerCase() === invNo.toLowerCase());
    if (!found) {
      toast.error(`Invoice not found: ${invNo}`);
      return;
    }
    setViewInvoice(found);
    toast.success(`Opened invoice ${invNo}`);
  };

  const openAdjustment = (invoice) => {
    setAdjustmentInvoice(invoice);
    setAdjustmentType('discount');
    setAdjustmentAmount('');
    setAdjustmentPaidAmount('');
    setAdjustmentReason('');
    setAdjustmentNotes('');
    setAdjustmentPaymentMode(invoice.paymentMode || 'Cash');
    setAdjustmentSplitPayments(invoice.paymentBreakdown?.length > 0 
      ? invoice.paymentBreakdown.map(p => ({ method: p.method, amount: String(p.amount) }))
      : [{ method: 'Cash', amount: '' }]
    );
    setAdjustmentSaving(false);
  };

  const getAdjustedTotal = () => {
    const orig = Number(adjustmentInvoice?.total || 0);
    const amt = Number(adjustmentAmount || 0);
    if (adjustmentType === 'discount') return Math.max(0, orig - amt);
    if (adjustmentType === 'charge') return orig + amt;
    return orig;
  };

  const handleApplyAdjustment = async (event) => {
    event.preventDefault();
    if (!adjustmentInvoice) return;

    const amount = Number(adjustmentAmount || 0);
    const paidAmount = Number(adjustmentPaidAmount || 0);

    if (adjustmentType !== 'paymentMode' && adjustmentType !== 'splitPayment') {
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error('Please enter a valid adjustment amount');
        return;
      }
    }

    if (adjustmentType !== 'paymentMode' && adjustmentType !== 'splitPayment') {
      if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        toast.error('Please enter a valid paid amount');
        return;
      }
    }

    // Validate split payments
    if (adjustmentType === 'splitPayment') {
      const splitTotal = adjustmentSplitPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      if (splitTotal <= 0) {
        toast.error('Please enter valid split payment amounts');
        return;
      }
    }

    setAdjustmentSaving(true);

    try {
      if (adjustmentType === 'paymentMode') {
        // Change payment mode only
        if (updateInvoice) {
          await updateInvoice({ ...adjustmentInvoice, paymentMode: adjustmentPaymentMode });
          toast.success('Payment mode updated');
        } else {
          toast.error('Update invoice not available');
        }
        setAdjustmentInvoice(null);
        return;
      }

      if (adjustmentType === 'splitPayment') {
        // Change to split payment
        const splitTotal = adjustmentSplitPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const validSplits = adjustmentSplitPayments.filter(p => Number(p.amount || 0) > 0);
        if (updateInvoice) {
          await updateInvoice({
            ...adjustmentInvoice,
            paymentMode: 'Split',
            paymentBreakdown: validSplits.map(p => ({ method: p.method, amount: Number(p.amount) })),
            paidAmount: splitTotal,
            balanceAmount: Math.max(0, (adjustmentInvoice.total || 0) - splitTotal),
            status: splitTotal >= (adjustmentInvoice.total || 0) ? 'Paid' : splitTotal > 0 ? 'Partial' : 'Unpaid',
          });
          toast.success('Split payment updated');
        } else {
          toast.error('Update invoice not available');
        }
        setAdjustmentInvoice(null);
        return;
      }

      await applyInvoiceAdjustment(adjustmentInvoice.id, {
        type: adjustmentType,
        amount,
        paidAmount,
        reason: adjustmentReason,
        notes: adjustmentNotes,
      });
      toast.success('Adjustment saved successfully');
      setAdjustmentInvoice(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to save adjustment');
    } finally {
      setAdjustmentSaving(false);
    }
  };

  // ─── Print All ──────────────────────────────────────────────────────────
  const handlePrintAllPDF = async () => {
    if (!filtered.length) { toast.error('No invoices to print'); return; }
    toast.loading('Generating bulk PDF...', { id: 'bulk-pdf' });
    try {
      // Use exportToPDF for bulk invoice export
      const rows = filtered.map(i => ({
        'Invoice #': i.invoiceNumber,
        Customer: i.customerName || 'Walk-in',
        Date: (() => {
          try {
            const d = new Date(i.date);
            const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            return `${days[d.getDay()]} ${format(d,'dd MMM yyyy HH:mm')}`;
          } catch { return i.date || ''; }
        })(),
        Items: getTotalItemsQty(i),
        Subtotal: formatCurrency(i.subtotal, company.currency),
        Tax: formatCurrency(i.taxAmt, company.currency),
        Total: formatCurrency(i.total, company.currency),
        Payment: i.paymentMode,
        Status: i.status,
      }));
      exportToPDF(rows, `all-invoices-${format(new Date(),'yyyyMMdd')}.pdf`, company);
      toast.success(`PDF exported (${filtered.length} invoices)`, { id: 'bulk-pdf' });
    } catch (err) {
      toast.error('Failed to generate PDF', { id: 'bulk-pdf' });
    }
  };

  const handleDirectPrintAll = async () => {
    if (!filtered.length) { toast.error('No invoices to print'); return; }
    if (!window.confirm(`This will open ${Math.min(filtered.length, 10)} print dialogs. Continue? (Max 10 at once)`)) return;
    const toPrint = filtered.slice(0, 10);
    for (const inv of toPrint) {
      try {
        await printInvoicePDF(inv, company, 'thermal', { printSettings, invoiceTextStyles, forceDialog: true });
        await new Promise(r => setTimeout(r, 500));
      } catch { /* continue */ }
    }
    toast.success(`Printed ${toPrint.length} invoices`);
  };

  // ─── Edit Invoice ──────────────────────────────────────────────────────────
  const openEdit = (invoice) => {
    setEditInvoice({ 
      ...invoice, 
      _editNotes: invoice.notes || '',
      _editStatus: invoice.status,
      _editPaymentMode: invoice.paymentMode,
      _editPaidAmount: String(invoice.paidAmount || ''),
    });
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editInvoice) return;
    try {
      const updated = {
        ...editInvoice,
        notes: editInvoice._editNotes,
        status: editInvoice._editStatus,
        paymentMode: editInvoice._editPaymentMode,
        paidAmount: Number(editInvoice._editPaidAmount || 0),
        balanceAmount: Math.max(0, (editInvoice.total || 0) - Number(editInvoice._editPaidAmount || 0)),
      };
      delete updated._editNotes;
      delete updated._editStatus;
      delete updated._editPaymentMode;
      delete updated._editPaidAmount;
      if (updateInvoice) {
        await updateInvoice(updated);
        toast.success('Invoice updated');
      } else {
        toast.error('Update not available');
      }
      setEditInvoice(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to update invoice');
    }
  };

  // ─── Remote Print Handler ──────────────────────────────────────────────
  const handleRemotePrint = async (invoice) => {
    // Check if device is client and connected
    if (deviceRole !== 'client') {
      toast.error('Remote print is only available on client devices');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to main device. Please connect first.');
      return;
    }

    try {
      toast.loading('Sending print request to main device...', { id: 'remote-print-req' });
      
      await remotePrintInvoice(
        invoice, 
        company, 
        'thermal', 
        { printSettings, invoiceTextStyles },
        requestRemotePrint
      );
      
      toast.success('Print request sent successfully!', { id: 'remote-print-req' });
    } catch (error) {
      console.error('Remote print failed:', error);
      toast.error(error?.message || 'Failed to send print request', { id: 'remote-print-req' });
    }
  };

  const enableDeleteInvoice = company?.enableDeleteInvoice === true;

  // Check if remote print should be available
  const isRemotePrintAvailable = deviceRole === 'client' && isConnected;

  return (
    <div className="p-6 space-y-4 animate-fade-in" onClick={() => openMenuId && setOpenMenuId(null)}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportCSV(getExportRows(), 'invoices.csv')} className="btn-secondary">
            <Download size={16} /> CSV
          </button>
          <button onClick={() => exportToExcel(getExportRows(), 'invoices.xlsx', 'Invoices')} className="btn-secondary">
            <Download size={16} /> Excel
          </button>
          <button onClick={() => exportToPDF(getExportRows(), 'invoices.pdf', company)} className="btn-secondary">
            <Download size={16} /> PDF
          </button>
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === 'bulk' ? null : 'bulk'); }}
              className="btn-secondary"
            >
              <Printer size={16} /> Print All
            </button>
            {openMenuId === 'bulk' && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => { handlePrintAllPDF(); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Download size={14} /> Export All as PDF
                </button>
                <button onClick={() => { handleDirectPrintAll(); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Printer size={14} /> Direct Print (up to 10)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: filtered.length, color: 'text-gray-700 dark:text-gray-300' },
          { label: 'Paid', value: filtered.filter(i => i.status === 'Paid').length, color: 'text-green-600' },
          { label: 'Unpaid', value: filtered.filter(i => i.status === 'Unpaid').length, color: 'text-red-500' },
          { label: 'Revenue', value: formatCurrency(totalRevenue, company.currency), color: 'text-primary-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500">Filter by Date:</span>
          {DATE_RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setDateRange(r.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                dateRange === r.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex gap-2 mt-2">
            <input type="date" className="input flex-1 text-sm" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} />
            <span className="self-center text-gray-400 text-sm">to</span>
            <input type="date" className="input flex-1 text-sm" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search invoice # / customer / phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {['All','Paid','Unpaid','Partial','Cancelled','Refund'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Scan full barcode -> open invoice */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold">Scan Full Barcode → Open Invoice</p>
            <p className="text-xs text-gray-400">Scan PDF417 full-data barcode (or type invoice number) and press Open.</p>
          </div>
          <div className="flex gap-2 items-center flex-1 min-w-[280px] justify-end">
            <input
              className="input flex-1"
              placeholder="Scan here… (VENDEXAINV1:...)"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') openByScan(); }}
            />
            <button type="button" onClick={openByScan} className="btn-primary whitespace-nowrap">Open</button>
            <button type="button" onClick={() => setScanValue('')} className="btn-secondary whitespace-nowrap">Clear</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Invoice #','Customer','Date','Items','Subtotal','Tax','Total','Payment','Status','Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-12">No invoices found</td></tr>}
              {filtered.map(inv => {
                const invoiceCustomer = customers.find(c => c.id === inv.customerId);
                // Format date with day name and time
                const dateTimeDisplay = inv.date ? (() => {
                  try {
                    const d = new Date(inv.date);
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = days[d.getDay()];
                    const dateStr = format(d, 'dd MMM yyyy');
                    const timeStr = format(d, 'hh:mm a');
                    return { dayName, dateStr, timeStr, full: `${dayName}, ${dateStr} ${timeStr}` };
                  } catch { return { dayName: '', dateStr: inv.date, timeStr: '', full: inv.date }; }
                })() : { dayName: '—', dateStr: '—', timeStr: '—', full: '—' };
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="table-cell font-medium text-primary-600">{inv.invoiceNumber}</td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1">
                        <span>{inv.customerName || 'Walk-in'}</span>
                        {invoiceCustomer && (
                          <span className={`text-[10px] inline-flex items-center px-2 py-0.5 rounded-full ${getCustomerBehaviorBadgeClass(invoiceCustomer.customer_behavior_type)}`}>
                            {getCustomerBehaviorLabel(invoiceCustomer.customer_behavior_type)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium text-primary-600">{dateTimeDisplay.dayName}</span>
                        <span className="text-gray-600 dark:text-gray-400">{dateTimeDisplay.dateStr}</span>
                        <span className="text-gray-400 text-[10px]">{dateTimeDisplay.timeStr}</span>
                      </div>
                    </td>
                    <td className="table-cell">{getTotalItemsQty(inv)}</td>
                    <td className="table-cell">{formatCurrency(inv.subtotal, company.currency)}</td>
                    <td className="table-cell">{formatCurrency(inv.taxAmt, company.currency)}</td>
                    <td className="table-cell font-semibold">{formatCurrency(inv.total, company.currency)}</td>
                    <td className="table-cell"><span className="badge-blue">{inv.paymentMode}</span></td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1">
                        <span className={inv.status === 'Paid' ? 'badge-green' : inv.status === 'Unpaid' ? 'badge-red' : inv.status === 'Refund' ? 'badge-yellow' : 'badge-blue'}>
                          {inv.status}
                        </span>
                        {inv.returnTag === 'full-return' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5">
                            <RotateCcw size={9} /> Returned
                          </span>
                        )}
                        {inv.returnTag === 'partial-return' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold px-2 py-0.5">
                            <RotateCcw size={9} /> Part. Returned
                          </span>
                        )}
                        {inv.returnTag === 'exchange' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5">
                            <ArrowLeftRight size={9} /> Exchanged
                          </span>
                        )}
                        {inv.returnTag === 'partial-exchange' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5">
                            <ArrowLeftRight size={9} /> Part. Exchange
                          </span>
                        )}
                        {inv.returnTag === 'return' && !['full-return','partial-return'].includes(inv.returnTag) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-semibold px-2 py-0.5">
                            <RotateCcw size={9} /> Return
                          </span>
                        )}
                        {inv.originalInvoiceNumber && (
                          <span className="text-[10px] text-gray-400">Ref: {inv.originalInvoiceNumber}</span>
                        )}
                      </div>
                    </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => printInvoicePDF(inv, company, 'thermal', { printSettings, forceDialog: true })} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300" title="Print"><Printer size={16} /></button>
                      {/* Remote Print Button - Only show for client devices */}
                      {isRemotePrintAvailable && (
                        <button 
                          onClick={() => handleRemotePrint(inv)} 
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400" 
                          title="Print on Main Device"
                        >
                          <Cloud size={16} />
                        </button>
                      )}
                      {/* Send Invoice via WhatsApp PDF modal */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setInvoiceSendTarget(inv); }}
                        className={`p-1.5 rounded-lg transition-colors ${inv.customerPhone ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                        title={inv.customerPhone ? 'Send Invoice via WhatsApp' : 'No phone number'}
                        disabled={!inv.customerPhone}
                      >
                        <MessageCircle size={16} />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === inv.id ? null : inv.id); }} 
                          className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg text-primary-600" 
                          title="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === inv.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setViewInvoice(inv); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                              <Eye size={14} /> View Details
                            </button>
                            <button onClick={() => { openEdit(inv); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                              <Edit size={14} /> Edit Invoice
                            </button>
                            <button onClick={() => { openAdjustment(inv); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-amber-600">
                              <BadgePercent size={14} /> Adjustment
                            </button>
                            <button onClick={() => { downloadInvoicePDF(inv, company, 'a4', { printSettings, invoiceTextStyles }); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                              <Download size={14} /> Download PDF
                            </button>
                            {/* Remote Print Option - Only show for client devices */}
                            {isRemotePrintAvailable && (
                              <button 
                                onClick={() => { handleRemotePrint(inv); setOpenMenuId(null); }} 
                                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 text-blue-600 dark:text-blue-400"
                              >
                                <Cloud size={14} /> Print on Main Device
                              </button>
                            )}
                            <button
                              onClick={() => { setInvoiceSendTarget(inv); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 text-emerald-700 dark:text-emerald-400"
                            >
                              <MessageCircle size={14} /> Send Invoice via WhatsApp
                            </button>
                            {inv.status !== 'Refund' && (
                              <button onClick={() => { setShowReturn(inv); setReturnItems(inv.items.map(i => ({ ...i, qty: 0 }))); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-amber-600">
                                <RotateCcw size={14} /> Process Return
                              </button>
                            )}
                            {enableDeleteInvoice && (
                              <button onClick={() => { if (window.confirm('Delete this invoice permanently?')) { deleteInvoice(inv.id); setOpenMenuId(null); } }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 border-t border-gray-100 dark:border-gray-700">
                                <Trash2 size={14} /> Delete Invoice
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Invoice Modal */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoiceNumber}`} size="lg">
        {viewInvoice && (
          <div className="space-y-4">
            {/* Quick action bar */}
            <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <button onClick={() => printInvoicePDF(viewInvoice, company, 'thermal', { printSettings, forceDialog: true })} className="btn-secondary text-xs flex items-center gap-1.5">
                <Printer size={13} /> Print
              </button>
              <button onClick={() => downloadInvoicePDF(viewInvoice, company, 'a4', { printSettings, invoiceTextStyles })} className="btn-secondary text-xs flex items-center gap-1.5">
                <Download size={13} /> PDF
              </button>
              <button
                onClick={() => setInvoiceSendTarget(viewInvoice)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold rounded-xl transition-colors text-xs shadow-sm"
              >
                <MessageCircle size={13} /> Send via WhatsApp
              </button>
            </div>

            {/* Customer info section */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Customer:</span> <span className="font-medium">{viewInvoice.customerName}</span></div>
              <div><span className="text-gray-400">Date:</span> <span className="font-medium">{formatDate(viewInvoice.date)}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Phone:</span>
                <span className="font-medium">{viewInvoice.customerPhone || '—'}</span>
                {viewInvoice.customerPhone && (
                  <button
                    onClick={() => setInvoiceSendTarget(viewInvoice)}
                    className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    title="Send Invoice via WhatsApp"
                  >
                    <MessageCircle size={13} />
                  </button>
                )}
              </div>
              <div><span className="text-gray-400">Payment:</span> <span className="badge-blue">{viewInvoice.paymentMode}</span></div>
              {customers.find(c => c.id === viewInvoice.customerId) && (
                <div><span className="text-gray-400">Customer Type:</span> <span className={`text-[10px] inline-flex items-center px-2 py-0.5 rounded-full ${getCustomerBehaviorBadgeClass(customers.find(c => c.id === viewInvoice.customerId)?.customer_behavior_type)}`}>{getCustomerBehaviorLabel(customers.find(c => c.id === viewInvoice.customerId)?.customer_behavior_type)}</span></div>
              )}
              <div><span className="text-gray-400">Total Items:</span> <span className="font-medium">{getTotalItemsQty(viewInvoice)}</span></div>
              {viewInvoice.customerAddress && (
                <div className="col-span-2"><span className="text-gray-400">Address:</span> <span className="font-medium">{viewInvoice.customerAddress}</span></div>
              )}
              <div><span className="text-gray-400">Status:</span> <span className={viewInvoice.status === 'Paid' ? 'badge-green' : 'badge-red'}>{viewInvoice.status}</span></div>
            </div>

            {/* Return/Exchange trail */}
            {(viewInvoice.returnTag || viewInvoice.originalInvoiceNumber || (viewInvoice.returnRefs?.length > 0)) && (
              <div className={`rounded-xl p-3 text-sm border ${
                viewInvoice.returnTag?.includes('exchange') ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300' :
                'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300'
              }`}>
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {viewInvoice.returnTag?.includes('exchange') ? <ArrowLeftRight size={14} /> : <RotateCcw size={14} />}
                  <span>
                    {viewInvoice.returnTag === 'full-return' && 'Fully Returned'}
                    {viewInvoice.returnTag === 'partial-return' && 'Partially Returned'}
                    {viewInvoice.returnTag === 'exchange' && 'Exchanged'}
                    {viewInvoice.returnTag === 'partial-exchange' && 'Partially Exchanged'}
                    {viewInvoice.returnTag === 'return' && 'Return Invoice'}
                    {!viewInvoice.returnTag && viewInvoice.originalInvoiceNumber && 'Return / Exchange Invoice'}
                  </span>
                </div>
                {viewInvoice.originalInvoiceNumber && (
                  <p className="text-xs">Original Invoice: <strong>{viewInvoice.originalInvoiceNumber}</strong></p>
                )}
                {viewInvoice.returnRefs?.map((ref, i) => (
                  <p key={i} className="text-xs">Linked: <strong>{ref.returnInvoiceNumber || ref}</strong></p>
                ))}
              </div>
            )}

            {Array.isArray(viewInvoice.paymentBreakdown) && viewInvoice.paymentBreakdown.length > 0 && (
              <div className="card p-3 bg-gray-50 dark:bg-gray-800">
                <p className="text-sm font-semibold mb-2">Payment Method</p>
                <div className="space-y-1 text-sm">
                  {viewInvoice.paymentBreakdown.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">{p.method}</span>
                      <span className="font-semibold">{formatCurrency(p.amount, company.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 rounded-xl">
                <tr>{['Product','Qty','Price','Tax%','Total'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
              </thead>
              <tbody>
                {viewInvoice.items?.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="table-cell">{item.name}</td>
                    <td className="table-cell">{item.qty}</td>
                    <td className="table-cell">{formatCurrency(item.price, company.currency)}</td>
                    <td className="table-cell">{item.taxRate || 0}%</td>
                    <td className="table-cell font-semibold">{formatCurrency(item.price * item.qty, company.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right space-y-1 text-sm">
              <p>Subtotal: <strong>{formatCurrency(viewInvoice.subtotal, company.currency)}</strong></p>
              <p>Discount: <strong>-{formatCurrency(viewInvoice.discountAmt, company.currency)}</strong></p>
              <p>GST ({viewInvoice.taxRate}%): <strong>{formatCurrency(viewInvoice.taxAmt, company.currency)}</strong></p>
              <p>Paid: <strong>{formatCurrency(viewInvoice.paidAmount || 0, company.currency)}</strong></p>
              <p>Balance: <strong>{formatCurrency(viewInvoice.balanceAmount || Math.max(0, (viewInvoice.total || 0) - (viewInvoice.paidAmount || 0)), company.currency)}</strong></p>
              <p className="text-lg font-bold text-primary-600">Total: {formatCurrency(viewInvoice.total, company.currency)}</p>
            </div>
            {viewInvoice.notes && <p className="text-sm text-gray-500 italic">Notes: {viewInvoice.notes}</p>}
            <button onClick={() => downloadInvoicePDF(viewInvoice, company, 'a4', { printSettings })} className="btn-primary">
              <Printer size={16} /> Download PDF
            </button>
          </div>
        )}
      </Modal>

      {/* Adjustment Modal */}
      <Modal open={!!adjustmentInvoice} onClose={() => setAdjustmentInvoice(null)} title="Invoice Adjustment & Modifications" size="lg">
        {adjustmentInvoice && (
          <form onSubmit={handleApplyAdjustment} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm text-gray-500">Adjustment Type</label>
                <select className="input mt-1" value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)}>
                  <option value="discount">Discount (Reduce Total)</option>
                  <option value="charge">Extra Charge (Add to Total)</option>
                  <option value="paymentMode">Change Payment Mode</option>
                  <option value="splitPayment">Split Payment</option>
                </select>
              </div>
            </div>

            {(adjustmentType === 'discount' || adjustmentType === 'charge') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-500">{adjustmentType === 'discount' ? 'Discount Amount' : 'Extra Charge Amount'}</label>
                    <input type="number" min="0" step="0.01" className="input mt-1" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(e.target.value)} placeholder="Enter amount" required />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Paid Amount</label>
                    <input type="number" min="0" step="0.01" className="input mt-1" value={adjustmentPaidAmount} onChange={(e) => setAdjustmentPaidAmount(e.target.value)} placeholder="Amount received" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Reason</label>
                  <input className="input mt-1" value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} placeholder="Customer bargain / family discount / damage etc." />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Notes</label>
                  <textarea className="input mt-1" rows="2" value={adjustmentNotes} onChange={(e) => setAdjustmentNotes(e.target.value)} placeholder="Optional note" />
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-sm space-y-1">
                  <p>Original Total: <strong>{formatCurrency(adjustmentInvoice.total, company.currency)}</strong></p>
                  <p>{adjustmentType === 'discount' ? '− Discount' : '+ Extra Charge'}: <strong>{formatCurrency(Number(adjustmentAmount || 0), company.currency)}</strong></p>
                  <p className="text-base font-bold text-primary-600">New Total: {formatCurrency(getAdjustedTotal(), company.currency)}</p>
                  <p className="text-xs text-gray-400">{adjustmentType === 'discount' ? 'Revenue will decrease by this amount' : 'Revenue will increase by this amount'}</p>
                </div>
              </>
            )}

            {adjustmentType === 'paymentMode' && (
              <div>
                <label className="text-sm text-gray-500">Select New Payment Mode</label>
                <select className="input mt-1" value={adjustmentPaymentMode} onChange={(e) => setAdjustmentPaymentMode(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Credit">Credit</option>
                  <option value="Split">Split (Use Split Payment option)</option>
                </select>
                <p className="text-xs text-gray-400 mt-2">Current payment mode: <strong>{adjustmentInvoice.paymentMode}</strong></p>
              </div>
            )}

            {adjustmentType === 'splitPayment' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Split Payment Breakdown</p>
                {adjustmentSplitPayments.map((split, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select className="input flex-1" value={split.method} onChange={(e) => {
                      const newSplits = [...adjustmentSplitPayments];
                      newSplits[idx].method = e.target.value;
                      setAdjustmentSplitPayments(newSplits);
                    }}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Credit">Credit</option>
                    </select>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      className="input w-32" 
                      placeholder="Amount" 
                      value={split.amount}
                      onChange={(e) => {
                        const newSplits = [...adjustmentSplitPayments];
                        newSplits[idx].amount = e.target.value;
                        setAdjustmentSplitPayments(newSplits);
                      }}
                    />
                    {adjustmentSplitPayments.length > 1 && (
                      <button type="button" onClick={() => setAdjustmentSplitPayments(adjustmentSplitPayments.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => setAdjustmentSplitPayments([...adjustmentSplitPayments, { method: 'Cash', amount: '' }])} 
                  className="btn-secondary text-sm"
                >
                  + Add Payment Method
                </button>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-sm">
                  <p>Invoice Total: <strong>{formatCurrency(adjustmentInvoice.total, company.currency)}</strong></p>
                  <p>Split Total: <strong>{formatCurrency(adjustmentSplitPayments.reduce((s, p) => s + Number(p.amount || 0), 0), company.currency)}</strong></p>
                  <p className="text-xs text-gray-400 mt-1">Balance: <strong>{formatCurrency(Math.max(0, (adjustmentInvoice.total || 0) - adjustmentSplitPayments.reduce((s, p) => s + Number(p.amount || 0), 0)), company.currency)}</strong></p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={adjustmentSaving} className="btn-primary flex-1 justify-center">{adjustmentSaving ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setAdjustmentInvoice(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Return Modal */}
      <Modal open={!!showReturn} onClose={() => setShowReturn(null)} title="Process Return" size="md">
        {showReturn && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Select items and quantities to return for {showReturn.invoiceNumber}</p>
            {showReturn.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="flex-1 text-sm">{item.name}</span>
                <span className="text-xs text-gray-400">Max: {item.qty}</span>
                <input type="number" min={0} max={item.qty}
                  value={returnItems[i]?.qty || 0}
                  onChange={e => setReturnItems(prev => prev.map((ri, idx) => idx === i ? { ...ri, qty: Math.min(parseInt(e.target.value) || 0, item.qty) } : ri))}
                  className="input w-20 py-1 text-sm" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={handleReturn} className="btn-primary flex-1 justify-center">Process Return</button>
              <button onClick={() => setShowReturn(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal open={!!editInvoice} onClose={() => setEditInvoice(null)} title={`Edit Invoice ${editInvoice?.invoiceNumber}`} size="md">
        {editInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <select className="input mt-1" value={editInvoice._editStatus} onChange={(e) => setEditInvoice(p => ({ ...p, _editStatus: e.target.value }))}>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Refund">Refund</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">Payment Mode</label>
                <select className="input mt-1" value={editInvoice._editPaymentMode} onChange={(e) => setEditInvoice(p => ({ ...p, _editPaymentMode: e.target.value }))}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Credit">Credit</option>
                  <option value="Split">Split</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Paid Amount</label>
              <input type="number" min="0" step="0.01" className="input mt-1" value={editInvoice._editPaidAmount} onChange={(e) => setEditInvoice(p => ({ ...p, _editPaidAmount: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Invoice Total: {formatCurrency(editInvoice.total, company.currency)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Notes</label>
              <textarea className="input mt-1" rows="3" value={editInvoice._editNotes} onChange={(e) => setEditInvoice(p => ({ ...p, _editNotes: e.target.value }))} placeholder="Add invoice notes..." />
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-600 dark:text-blue-400">
              <p className="font-medium">⚠️ Quick Edit Mode</p>
              <p className="text-xs mt-1">This allows you to update status, payment mode, paid amount, and notes. For item-level changes, use the Adjustment feature.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveEdit} className="btn-primary flex-1 justify-center">Save Changes</button>
              <button onClick={() => setEditInvoice(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice Send Modal — WhatsApp PDF sharing */}
      <InvoiceSendModal
        open={!!invoiceSendTarget}
        onClose={() => setInvoiceSendTarget(null)}
        invoice={invoiceSendTarget}
        customer={invoiceSendTarget ? customers.find(c => c.id === invoiceSendTarget.customerId) : null}
        company={company}
        printSettings={printSettings}
      />
    </div>
  );
}

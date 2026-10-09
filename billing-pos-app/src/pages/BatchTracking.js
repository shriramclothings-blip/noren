/**
 * BatchTracking — Industrial-grade batch number tracking system.
 *
 * Features:
 * - Search any batch number → full detail panel
 * - Batch overview: product, variant, quantity, cost, supplier, date, invoice ref
 * - Full stock movement timeline (before → after for every transaction)
 * - Manual & automated adjustment history
 * - Batch age indicator (days since creation)
 * - Current stock vs original batch quantity
 * - Export batch report to CSV
 * - Browse all batches with filters
 * - Batch comparison across multiple numbers
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { exportCSV } from '../utils/helpers';
import {
  Search, Package, Activity, TrendingUp, TrendingDown, RefreshCw,
  Download, X, ChevronDown, ChevronUp, Clock, Hash,
  AlertTriangle, Info, Calendar, DollarSign,
  Layers, ArrowRight, BarChart2, User, FileText, Tag,
  Archive, Truck, RotateCcw, Zap, Eye, Copy, Database,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOVEMENT_TYPE_CONFIG = {
  'Purchase In':       { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: TrendingUp,   sign: '+' },
  'Sale':              { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 icon: TrendingDown,  sign: '-' },
  'Sale Out':          { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 icon: TrendingDown,  sign: '-' },
  'Return In':         { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',             icon: RotateCcw,     sign: '+' },
  'Manual Adjustment': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',     icon: Zap,           sign: '±' },
  'Transfer Out':      { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',     icon: TrendingDown,  sign: '-' },
  'Transfer In':       { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',             icon: TrendingUp,    sign: '+' },
  'Exchange In':       { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',             icon: TrendingUp,    sign: '+' },
  'Exchange Out':      { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         icon: TrendingDown,  sign: '-' },
  'Damage':            { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',             icon: AlertTriangle, sign: '-' },
};

const getTypeConfig = (type) =>
  MOVEMENT_TYPE_CONFIG[type] || { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300', icon: Activity, sign: '±' };

const ageDays = (dateStr) => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const ageLabel = (days) => {
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m ago`;
};

const ageColor = (days) => {
  if (days === null) return 'text-gray-400';
  if (days < 90) return 'text-emerald-600 dark:text-emerald-400';
  if (days < 180) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};


// ─── Sub-components ──────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const cfg = getTypeConfig(type);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={11} />
      {type || 'Unknown'}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-600' }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-800 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MovementRow({ m, products, variants }) {
  const qty = Number(m.quantity || 0);
  const isIn = qty > 0;
  const product = products.find(p => String(p.id) === String(m.productId));
  const productName = product?.name || m.productName || `Product #${m.productId}`;

  let variantLabel = '—';
  if (m.variantId) {
    const inlineV = product?.variants?.find(v => String(v.id) === String(m.variantId));
    if (inlineV) variantLabel = inlineV.label || [inlineV.size, inlineV.color].filter(Boolean).join('/') || 'Default';
    else {
      const storeV = variants.find(v => String(v.id) === String(m.variantId));
      variantLabel = storeV?.label || storeV?.sku || `Variant #${m.variantId}`;
    }
  }

  const changeLabel = m.oldQuantity != null && m.newQuantity != null
    ? `${m.oldQuantity} → ${m.newQuantity}`
    : '—';

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
        {m.date ? new Date(m.date).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
      </td>
      <td className="px-3 py-2.5"><TypeBadge type={m.type} /></td>
      <td className={`px-3 py-2.5 font-bold text-sm ${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
        {isIn ? `+${qty}` : qty}
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">{productName}</td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{variantLabel}</td>
      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{changeLabel}</td>
      <td className="px-3 py-2.5 text-xs text-gray-500">
        {m.oldBatchNumber && m.oldBatchNumber !== m.batchNumber ? (
          <span className="flex items-center gap-1">
            <span className="font-mono text-orange-500">{m.oldBatchNumber}</span>
            <ArrowRight size={10} className="text-gray-400" />
            <span className="font-mono text-primary-500">{m.batchNumber || '—'}</span>
          </span>
        ) : (
          <span className="font-mono">{m.batchNumber || m.referenceNumber || '—'}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{m.reason || '—'}</td>
      <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[140px] truncate" title={m.notes}>{m.notes || '—'}</td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{m.createdBy || 'System'}</td>
    </tr>
  );
}


// ─── Main Component ────────────────────────────────────────────────────────

export default function BatchTracking() {
  const {
    products, variants, suppliers, company,
    fetchBatchesByNumber, fetchStockMovementsByBatchNumber,
    fetchAllBatches, fetchAllStockMovements,
  } = useApp();

  // ── Search state ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [batches, setBatches] = useState([]);          // results for searched batch
  const [movements, setMovements] = useState([]);      // movements for searched batch
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(null); // auto-trigger from browse

  // ── Browse all batches ────────────────────────────────────────────────────
  const [allBatches, setAllBatches] = useState([]);
  const [allMovements, setAllMovements] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [browseFilter, setBrowseFilter] = useState('');
  const [browseType, setBrowseType] = useState('all');
  const [browseDateFrom, setBrowseDateFrom] = useState('');
  const [browseDateTo, setBrowseDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'browse' | 'analytics'
  const [expandedBatch, setExpandedBatch] = useState(null);

  // ── Load all data for Browse / Analytics tabs ─────────────────────────────
  const loadAllData = useCallback(async () => {
    setLoadingAll(true);
    try {
      const [b, m] = await Promise.all([fetchAllBatches(), fetchAllStockMovements()]);
      setAllBatches((b || []).sort((a, b2) => new Date(b2.createdAt || 0) - new Date(a.createdAt || 0)));
      setAllMovements((m || []).sort((a, b2) => new Date(b2.date || 0) - new Date(a.date || 0)));
    } catch (err) {
      toast.error('Failed to load batch data');
    } finally {
      setLoadingAll(false);
    }
  }, [fetchAllBatches, fetchAllStockMovements]);

  useEffect(() => {
    if (activeTab !== 'search') loadAllData();
  }, [activeTab, loadAllData]);

  // ── Search by batch number ────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const bNum = query.trim();
    if (!bNum) { toast.error('Enter a batch number to search'); return; }
    setSearching(true);
    setNotFound(false);
    setBatches([]);
    setMovements([]);
    setSearched(false);
    try {
      const [b, m] = await Promise.all([
        fetchBatchesByNumber(bNum),
        fetchStockMovementsByBatchNumber(bNum),
      ]);
      const sortedM = (m || []).sort((a, b2) => new Date(b2.date || 0) - new Date(a.date || 0));
      setBatches(b || []);
      setMovements(sortedM);
      if (!(b || []).length && !sortedM.length) setNotFound(true);
      setSearched(true);
    } catch (err) {
      toast.error(err?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [query, fetchBatchesByNumber, fetchStockMovementsByBatchNumber]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  // Auto-trigger search when navigated from Browse/Analytics
  useEffect(() => {
    if (pendingSearch && activeTab === 'search') {
      setPendingSearch(null);
      // Small delay to let the tab render first
      const t = setTimeout(() => handleSearch(), 50);
      return () => clearTimeout(t);
    }
  }, [pendingSearch, activeTab, handleSearch]);

  const copyBatchNumber = (bn) => {
    navigator.clipboard?.writeText(bn).catch(() => {});
    toast.success('Batch number copied');
  };


  // ── Derived data for searched batch ──────────────────────────────────────
  const batchStats = useMemo(() => {
    if (!batches.length && !movements.length) return null;

    const totalIn = movements.filter(m => Number(m.quantity) > 0).reduce((s, m) => s + Number(m.quantity), 0);
    const totalOut = movements.filter(m => Number(m.quantity) < 0).reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);
    const netQty = batches.reduce((s, b) => s + Number(b.quantity || 0), 0);
    const totalCost = batches.reduce((s, b) => s + (Number(b.quantity || 0) * Number(b.purchaseCost || 0)), 0);
    const manualAdj = movements.filter(m => m.type === 'Manual Adjustment');
    const sales = movements.filter(m => m.type === 'Sale' || m.type === 'Sale Out');
    const firstDate = batches.length ? batches.reduce((min, b) => {
      const d = b.purchaseDate || b.createdAt;
      return !min || d < min ? d : min;
    }, null) : null;
    const days = ageDays(firstDate);

    return { totalIn, totalOut, netQty, totalCost, manualAdj: manualAdj.length, sales: sales.length, days, firstDate };
  }, [batches, movements]);

  // ── Browse filter ─────────────────────────────────────────────────────────
  const filteredBrowse = useMemo(() => {
    const q = browseFilter.toLowerCase();
    return allBatches.filter(b => {
      const prod = products.find(p => String(p.id) === String(b.productId));
      const name = (prod?.name || b.productName || '').toLowerCase();
      const bn = (b.batchNumber || '').toLowerCase();
      const inv = (b.invoiceRef || '').toLowerCase();
      const sup = (b.supplierName || '').toLowerCase();

      const matchQ = !q || name.includes(q) || bn.includes(q) || inv.includes(q) || sup.includes(q);

      let matchDate = true;
      const d = b.purchaseDate || b.createdAt || '';
      if (browseDateFrom && d < browseDateFrom) matchDate = false;
      if (browseDateTo && d > browseDateTo + 'T23:59:59') matchDate = false;

      const matchType = browseType === 'all' ||
        (browseType === 'recent' && ageDays(b.purchaseDate || b.createdAt) <= 30) ||
        (browseType === 'old' && ageDays(b.purchaseDate || b.createdAt) > 90);

      return matchQ && matchDate && matchType;
    });
  }, [allBatches, browseFilter, browseDateFrom, browseDateTo, browseType, products]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!allBatches.length) return null;
    const totalBatches = allBatches.length;
    const totalUnits = allBatches.reduce((s, b) => s + Number(b.quantity || 0), 0);
    const totalValue = allBatches.reduce((s, b) => s + Number(b.quantity || 0) * Number(b.purchaseCost || 0), 0);
    const manualAdj = allMovements.filter(m => m.type === 'Manual Adjustment').length;
    const sales = allMovements.filter(m => m.type === 'Sale' || m.type === 'Sale Out').length;

    // Top products by batch count
    const productBatchCount = {};
    allBatches.forEach(b => {
      const prod = products.find(p => String(p.id) === String(b.productId));
      const name = prod?.name || b.productName || `Product #${b.productId}`;
      productBatchCount[name] = (productBatchCount[name] || 0) + 1;
    });
    const topProducts = Object.entries(productBatchCount)
      .sort((a, b2) => b2[1] - a[1]).slice(0, 5);

    // Movement type breakdown
    const typeCount = {};
    allMovements.forEach(m => { typeCount[m.type] = (typeCount[m.type] || 0) + 1; });

    return { totalBatches, totalUnits, totalValue, manualAdj, sales, topProducts, typeCount };
  }, [allBatches, allMovements, products]);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportSearchResult = () => {
    if (!batches.length && !movements.length) { toast.error('Nothing to export'); return; }
    const rows = movements.map(m => {
      const prod = products.find(p => String(p.id) === String(m.productId));
      return {
        Date: m.date ? new Date(m.date).toLocaleString('en-IN') : '',
        Type: m.type,
        Quantity: m.quantity,
        Product: prod?.name || m.productName || '',
        BatchNumber: m.batchNumber || m.referenceNumber || '',
        OldBatch: m.oldBatchNumber || '',
        Before: m.oldQuantity ?? '',
        After: m.newQuantity ?? '',
        Reason: m.reason || '',
        Notes: m.notes || '',
        By: m.createdBy || '',
      };
    });
    exportCSV(rows, `batch-${query}-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Batch report exported');
  };

  const exportAllBatches = () => {
    if (!filteredBrowse.length) { toast.error('Nothing to export'); return; }
    const rows = filteredBrowse.map(b => {
      const prod = products.find(p => String(p.id) === String(b.productId));
      const sup = suppliers?.find(s => String(s.id) === String(b.supplierId));
      return {
        BatchNumber: b.batchNumber,
        Product: prod?.name || b.productName || '',
        Variant: b.variantLabel || '',
        Quantity: b.quantity,
        CostPerUnit: b.purchaseCost || 0,
        TotalCost: (b.quantity || 0) * (b.purchaseCost || 0),
        PurchaseDate: b.purchaseDate || '',
        Supplier: sup?.name || '',
        InvoiceRef: b.invoiceRef || '',
        Notes: b.notes || '',
        CreatedBy: b.createdBy || '',
        CreatedAt: b.createdAt || '',
      };
    });
    exportCSV(rows, `all-batches-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('All batches exported');
  };


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Hash size={24} className="text-primary-500" />
            Batch Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Industrial-grade batch traceability · Every unit, every movement, full history
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'browse' && (
            <button onClick={exportAllBatches} className="btn-secondary text-sm">
              <Download size={14} /> Export CSV
            </button>
          )}
          {activeTab !== 'browse' && (
            <button onClick={() => { setActiveTab('browse'); }} className="btn-secondary text-sm">
              <Database size={14} /> Browse All Batches
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
        {[
          { key: 'search', label: 'Batch Search', icon: Search },
          { key: 'browse', label: 'All Batches', icon: Archive },
          { key: 'analytics', label: 'Analytics', icon: BarChart2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>


      {/* ══════════════════════════════════════════════════════════════════
          TAB: SEARCH
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'search' && (
        <div className="space-y-5">

          {/* Search Box */}
          <div className="card p-5 bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-950/30 dark:to-indigo-950/30 border border-primary-100 dark:border-primary-900 rounded-3xl">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1 flex items-center gap-2">
              <Hash size={15} /> Enter Batch Number
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Type any batch number (e.g. <span className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-primary-600">BT20250101XXXXXX</span>) and press Enter or click Search.
              Shows all records, movements, adjustments, and full history.
            </p>
            <div className="flex gap-2">
              <input
                className="input flex-1 font-mono text-base h-12"
                placeholder="BT20250101… or ADJ20250101…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="btn-primary h-12 px-6 text-sm"
              >
                {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                {searching ? 'Searching…' : 'Search'}
              </button>
              {searched && (
                <button
                  onClick={() => { setQuery(''); setBatches([]); setMovements([]); setSearched(false); setNotFound(false); }}
                  className="btn-secondary h-12 px-4"
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Not Found */}
          {notFound && !searching && (
            <div className="card p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
              <AlertTriangle size={36} className="mx-auto text-orange-400 mb-3" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">No records found</p>
              <p className="text-sm text-gray-500 mt-1">
                No batch or movement records matched <span className="font-mono font-semibold text-primary-500">"{query}"</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">Try a partial number or check for typos.</p>
            </div>
          )}

          {/* ── Results ── */}
          {searched && !notFound && (
            <div className="space-y-5">

              {/* Summary stats */}
              {batchStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <StatCard icon={Package} label="Original Qty" value={batchStats.netQty}
                    sub="units received" color="text-primary-600" />
                  <StatCard icon={TrendingUp} label="Total In" value={`+${batchStats.totalIn}`}
                    sub="all additions" color="text-emerald-600" />
                  <StatCard icon={TrendingDown} label="Total Out" value={`-${batchStats.totalOut}`}
                    sub="all deductions" color="text-red-500" />
                  <StatCard icon={DollarSign} label="Total Cost"
                    value={formatCurrency(batchStats.totalCost, company?.currency)}
                    sub={`${batches.length} batch record${batches.length !== 1 ? 's' : ''}`}
                    color="text-amber-600" />
                  <StatCard icon={Zap} label="Manual Adj." value={batchStats.manualAdj}
                    sub="adjustments" color="text-purple-600" />
                  <StatCard icon={Clock} label="Batch Age"
                    value={batchStats.days !== null ? `${batchStats.days}d` : '—'}
                    sub={batchStats.firstDate ? new Date(batchStats.firstDate).toLocaleDateString('en-IN') : '—'}
                    color={ageColor(batchStats.days)} />
                </div>
              )}


              {/* Batch detail cards */}
              {batches.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Layers size={15} className="text-primary-500" />
                    Batch Records ({batches.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {batches.map(batch => {
                      const product = products.find(p => String(p.id) === String(batch.productId));
                      const variant = product?.variants?.find(v => String(v.id) === String(batch.variantId));
                      const supplier = suppliers?.find(s => String(s.id) === String(batch.supplierId));
                      const days = ageDays(batch.purchaseDate || batch.createdAt);
                      const totalCost = (Number(batch.quantity) || 0) * (Number(batch.purchaseCost) || 0);

                      return (
                        <div key={batch.id} className="card p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                          {/* Batch number header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Batch #</p>
                              <p className="font-mono font-bold text-primary-600 dark:text-primary-400 text-sm break-all">{batch.batchNumber}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                {batch.quantity} units
                              </span>
                              <button onClick={() => copyBatchNumber(batch.batchNumber)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Copy">
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Detail grid */}
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Package size={13} className="text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">Product</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{product?.name || batch.productName || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag size={13} className="text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">Variant</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {variant ? (variant.label || [variant.size, variant.color].filter(Boolean).join(' / ') || 'Default') : (batch.variantLabel || 'Default')}
                              </span>
                            </div>
                            {(variant?.sku || variant?.barcode) && (
                              <div className="flex items-center gap-2">
                                <Hash size={13} className="text-gray-400 shrink-0" />
                                <span className="text-gray-500 w-24 shrink-0">SKU / Barcode</span>
                                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{variant?.sku || ''}{variant?.sku && variant?.barcode ? ' / ' : ''}{variant?.barcode || ''}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">Purchase Date</span>
                              <span className="text-gray-700 dark:text-gray-300">{batch.purchaseDate || '—'}</span>
                              {days !== null && <span className={`text-xs ml-1 ${ageColor(days)}`}>({ageLabel(days)})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign size={13} className="text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">Unit Cost</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(batch.purchaseCost || 0, company?.currency)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign size={13} className="text-amber-500 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">Total Cost</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalCost, company?.currency)}</span>
                            </div>
                            {supplier && (
                              <div className="flex items-center gap-2">
                                <Truck size={13} className="text-gray-400 shrink-0" />
                                <span className="text-gray-500 w-24 shrink-0">Supplier</span>
                                <span className="text-gray-700 dark:text-gray-300">{supplier.name}</span>
                              </div>
                            )}
                            {batch.invoiceRef && (
                              <div className="flex items-center gap-2">
                                <FileText size={13} className="text-gray-400 shrink-0" />
                                <span className="text-gray-500 w-24 shrink-0">Invoice Ref</span>
                                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{batch.invoiceRef}</span>
                              </div>
                            )}
                            {batch.createdBy && (
                              <div className="flex items-center gap-2">
                                <User size={13} className="text-gray-400 shrink-0" />
                                <span className="text-gray-500 w-24 shrink-0">Created By</span>
                                <span className="text-gray-700 dark:text-gray-300">{batch.createdBy}</span>
                              </div>
                            )}
                            {batch.notes && (
                              <div className="flex items-start gap-2">
                                <Info size={13} className="text-gray-400 shrink-0 mt-0.5" />
                                <span className="text-gray-500 w-24 shrink-0">Notes</span>
                                <span className="text-gray-600 dark:text-gray-400 text-xs">{batch.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Current stock indicator */}
                          {variant && (
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Current variant stock</span>
                                <span className={`font-bold ${Number(variant.stock) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {variant.stock ?? 0} units
                                </span>
                              </div>
                              <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${Number(variant.stock) > 0 ? 'bg-emerald-500' : 'bg-red-400'}`}
                                  style={{ width: `${Math.min(100, (Number(variant.stock) / Math.max(Number(batch.quantity), 1)) * 100)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {Math.round((Number(variant.stock) / Math.max(Number(batch.quantity), 1)) * 100)}% of original batch quantity remaining
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Movement Timeline */}
              {movements.length > 0 && (
                <div className="card rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Activity size={16} className="text-primary-500" />
                        Full Movement Timeline
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Every stock change linked to this batch — sales, adjustments, transfers, returns</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{movements.length} events</span>
                      <button onClick={exportSearchResult} className="btn-secondary text-xs px-3 py-1.5">
                        <Download size={12} /> Export
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-xs">
                        <tr>
                          {['Date & Time', 'Type', 'Qty Change', 'Product', 'Variant', 'Stock Change', 'Batch / Ref', 'Reason', 'Notes', 'By'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {movements.map(m => (
                          <MovementRow key={m.id} m={m} products={products} variants={variants} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Manual Adjustments highlight */}
                  {movements.some(m => m.type === 'Manual Adjustment') && (
                    <div className="px-5 py-3 bg-purple-50 dark:bg-purple-900/10 border-t border-purple-100 dark:border-purple-800">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                        <Zap size={13} />
                        {movements.filter(m => m.type === 'Manual Adjustment').length} Manual Adjustment{movements.filter(m => m.type === 'Manual Adjustment').length !== 1 ? 's' : ''} found
                        — {movements.filter(m => m.type === 'Manual Adjustment' && Number(m.quantity) > 0).length} additions,{' '}
                        {movements.filter(m => m.type === 'Manual Adjustment' && Number(m.quantity) < 0).length} removals
                      </p>
                    </div>
                  )}

                  {/* Old batch number changes */}
                  {movements.some(m => m.oldBatchNumber && m.oldBatchNumber !== m.batchNumber) && (
                    <div className="px-5 py-3 bg-orange-50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-800">
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                        <ArrowRight size={13} />
                        Batch number changes detected in history — old batch numbers are shown with an arrow.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Movements only (no batch record) */}
              {batches.length === 0 && movements.length > 0 && (
                <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                  <Info size={14} />
                  No formal batch record found for this number, but stock movements reference it. This may be an adjustment batch or legacy record.
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          TAB: BROWSE ALL BATCHES
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'browse' && (
        <div className="space-y-4">

          {/* Filters row */}
          <div className="card p-4 rounded-2xl flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="label">Search Batches</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-8"
                  placeholder="Batch number, product, invoice ref…"
                  value={browseFilter}
                  onChange={e => setBrowseFilter(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Date From</label>
              <input className="input" type="date" value={browseDateFrom} onChange={e => setBrowseDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Date To</label>
              <input className="input" type="date" value={browseDateTo} onChange={e => setBrowseDateTo(e.target.value)} />
            </div>
            <div>
              <label className="label">Age Filter</label>
              <select className="input" value={browseType} onChange={e => setBrowseType(e.target.value)}>
                <option value="all">All Batches</option>
                <option value="recent">Recent (≤30 days)</option>
                <option value="old">Older (90+ days)</option>
              </select>
            </div>
            {(browseFilter || browseDateFrom || browseDateTo || browseType !== 'all') && (
              <button onClick={() => { setBrowseFilter(''); setBrowseDateFrom(''); setBrowseDateTo(''); setBrowseType('all'); }}
                className="btn-secondary text-sm">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Layers} label="Total Batches" value={allBatches.length} color="text-primary-600" />
            <StatCard icon={Package} label="Showing" value={filteredBrowse.length} sub="after filters" color="text-indigo-600" />
            <StatCard icon={TrendingUp} label="Total Units Received"
              value={filteredBrowse.reduce((s, b) => s + Number(b.quantity || 0), 0)}
              color="text-emerald-600" />
            <StatCard icon={DollarSign} label="Total Batch Value"
              value={formatCurrency(filteredBrowse.reduce((s, b) => s + (Number(b.quantity||0)*Number(b.purchaseCost||0)), 0), company?.currency)}
              color="text-amber-600" />
          </div>

          {/* Batch list */}
          {loadingAll ? (
            <div className="card p-8 text-center text-gray-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              Loading all batch records…
            </div>
          ) : filteredBrowse.length === 0 ? (
            <div className="card p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400">
              <Archive size={32} className="mx-auto mb-2" />
              No batches found
            </div>
          ) : (
            <div className="card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-xs">
                    <tr>
                      {['Batch Number', 'Product', 'Variant', 'Qty', 'Unit Cost', 'Total Cost', 'Purchase Date', 'Age', 'Supplier', 'Invoice Ref', 'Created By', 'Actions'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredBrowse.map(batch => {
                      const product = products.find(p => String(p.id) === String(batch.productId));
                      const supplier = suppliers?.find(s => String(s.id) === String(batch.supplierId));
                      const days = ageDays(batch.purchaseDate || batch.createdAt);
                      const isExpanded = expandedBatch === batch.id;
                      const batchMovements = allMovements.filter(m =>
                        (m.batchNumber && m.batchNumber === batch.batchNumber) ||
                        (m.referenceNumber && m.referenceNumber === batch.batchNumber)
                      );

                      return (
                        <React.Fragment key={batch.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">{batch.batchNumber}</span>
                                <button onClick={() => copyBatchNumber(batch.batchNumber)} className="p-0.5 hover:text-primary-500 text-gray-300" title="Copy">
                                  <Copy size={11} />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-medium">{product?.name || batch.productName || '—'}</td>
                            <td className="px-3 py-3 text-xs text-gray-500">{batch.variantLabel || '—'}</td>
                            <td className="px-3 py-3 font-bold text-emerald-600">{batch.quantity}</td>
                            <td className="px-3 py-3">{formatCurrency(batch.purchaseCost || 0, company?.currency)}</td>
                            <td className="px-3 py-3 font-semibold text-amber-600">{formatCurrency((batch.quantity||0)*(batch.purchaseCost||0), company?.currency)}</td>
                            <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{batch.purchaseDate || '—'}</td>
                            <td className={`px-3 py-3 text-xs font-medium whitespace-nowrap ${ageColor(days)}`}>{ageLabel(days)}</td>
                            <td className="px-3 py-3 text-gray-500">{supplier?.name || '—'}</td>
                            <td className="px-3 py-3 font-mono text-xs text-gray-400">{batch.invoiceRef || '—'}</td>
                            <td className="px-3 py-3 text-gray-400 text-xs">{batch.createdBy || 'System'}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setQuery(batch.batchNumber); setActiveTab('search'); setPendingSearch(batch.batchNumber); }}
                                  className="p-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-500 text-xs"
                                  title="Deep Search"
                                >
                                  <Search size={13} />
                                </button>
                                <button
                                  onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 text-xs"
                                  title={isExpanded ? 'Hide movements' : 'Show movements'}
                                >
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={12} className="px-0 py-0 bg-indigo-50 dark:bg-indigo-950/20">
                                <div className="px-6 py-4">
                                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                                    <Activity size={13} /> Movements for this batch ({batchMovements.length} events)
                                  </p>
                                  {batchMovements.length === 0 ? (
                                    <p className="text-xs text-gray-400">No movements recorded yet.</p>
                                  ) : (
                                    <div className="overflow-x-auto rounded-xl border border-indigo-100 dark:border-indigo-900">
                                      <table className="w-full text-xs">
                                        <thead className="bg-indigo-100/60 dark:bg-indigo-900/30">
                                          <tr>
                                            {['Date', 'Type', 'Qty', 'Stock Change', 'Reason', 'Notes', 'By'].map(h => (
                                              <th key={h} className="px-3 py-1.5 text-left text-indigo-600 dark:text-indigo-400 font-semibold">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-100 dark:divide-indigo-900 bg-white dark:bg-gray-900">
                                          {batchMovements.map(m => {
                                            const qty = Number(m.quantity);
                                            return (
                                              <tr key={m.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                                                <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                                                  {m.date ? new Date(m.date).toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                                                </td>
                                                <td className="px-3 py-1.5"><TypeBadge type={m.type} /></td>
                                                <td className={`px-3 py-1.5 font-bold ${qty>0?'text-emerald-600':'text-red-500'}`}>{qty>0?`+${qty}`:qty}</td>
                                                <td className="px-3 py-1.5 text-gray-500">{m.oldQuantity!=null&&m.newQuantity!=null?`${m.oldQuantity}→${m.newQuantity}`:'—'}</td>
                                                <td className="px-3 py-1.5">{m.reason||'—'}</td>
                                                <td className="px-3 py-1.5 text-gray-400 max-w-[150px] truncate">{m.notes||'—'}</td>
                                                <td className="px-3 py-1.5 text-gray-400">{m.createdBy||'System'}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          TAB: ANALYTICS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          {loadingAll ? (
            <div className="card p-8 text-center text-gray-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              Loading analytics…
            </div>
          ) : !analytics ? (
            <div className="card p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400">
              <BarChart2 size={32} className="mx-auto mb-2" />
              No batch data available yet
            </div>
          ) : (
            <>
              {/* Overview stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={Layers} label="Total Batches" value={analytics.totalBatches} color="text-primary-600" />
                <StatCard icon={Package} label="Total Units" value={analytics.totalUnits.toLocaleString()} sub="all time received" color="text-emerald-600" />
                <StatCard icon={DollarSign} label="Total Inventory Value"
                  value={formatCurrency(analytics.totalValue, company?.currency)} color="text-amber-600" />
                <StatCard icon={Zap} label="Manual Adjustments" value={analytics.manualAdj} sub="all time" color="text-purple-600" />
                <StatCard icon={TrendingDown} label="Sales Movements" value={analytics.sales} sub="all time" color="text-red-500" />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Top Products by Batch Count */}
                <div className="card p-5 rounded-2xl">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <Package size={16} className="text-primary-500" />
                    Top Products by Batch Count
                  </h3>
                  {analytics.topProducts.length === 0 ? (
                    <p className="text-sm text-gray-400">No data</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.topProducts.map(([name, count], i) => {
                        const pct = Math.round((count / analytics.totalBatches) * 100);
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]">{name}</span>
                              <span className="text-gray-500 shrink-0">{count} batches · {pct}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Movement Type Breakdown */}
                <div className="card p-5 rounded-2xl">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-primary-500" />
                    Movement Type Breakdown
                  </h3>
                  {Object.keys(analytics.typeCount).length === 0 ? (
                    <p className="text-sm text-gray-400">No movement data</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.entries(analytics.typeCount)
                        .sort((a, b2) => b2[1] - a[1])
                        .map(([type, count]) => {
                          const total = Object.values(analytics.typeCount).reduce((s, v) => s + v, 0);
                          const pct = Math.round((count / total) * 100);
                          const cfg = getTypeConfig(type);
                          return (
                            <div key={type}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                                  {type}
                                </span>
                                <span className="text-gray-500 text-xs">{count} · {pct}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Batches */}
              <div className="card p-5 rounded-2xl">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-primary-500" />
                  Last 10 Batches Created
                </h3>
                <div className="space-y-2">
                  {allBatches.slice(0, 10).map(batch => {
                    const product = products.find(p => String(p.id) === String(batch.productId));
                    const days = ageDays(batch.purchaseDate || batch.createdAt);
                    return (
                      <div key={batch.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span className="font-mono text-xs text-primary-600 dark:text-primary-400 w-36 shrink-0 truncate">{batch.batchNumber}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{product?.name || batch.productName || '—'}</span>
                        <span className="text-xs text-emerald-600 font-semibold shrink-0">{batch.quantity} units</span>
                        <span className={`text-xs shrink-0 ${ageColor(days)}`}>{ageLabel(days)}</span>
                        <button
                          onClick={() => { setQuery(batch.batchNumber); setActiveTab('search'); setPendingSearch(batch.batchNumber); }}
                          className="p-1 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-500 shrink-0"
                          title="Search this batch"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, exportCSV } from '../utils/helpers';
import {
  Plus, Search, Edit2, Trash2, AlertTriangle, Download, Package, BarChart2,
  Printer, ScanLine, Boxes, ChevronDown,
  ChevronRight, Archive, Copy, Eye, RefreshCw, TrendingUp, ClipboardList,
  Minus, X,
} from 'lucide-react';
import BarcodeLabelPrinter from '../components/BarcodeLabelPrinter';
import BulkSizeCreator from '../components/BulkSizeCreator';
import { generateSizeBarcode, generateVariantSku } from '../utils/variantUtils';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { summarizeProductInventory, buildBatchNumber } from '../utils/productInventoryModel';
import toast from 'react-hot-toast';
import AddProductModal from '../components/AddProductModal';
import ProductDetailModal from '../components/ProductDetailModal';
import AddStockModal from '../components/AddStockModal';
import Modal from '../components/Modal';

export default function Inventory({ setPage }) {
  const {
    products, addProduct, updateProduct, deleteProduct, archiveProductById,
    unarchiveProductById, duplicateProductById, company, printSettings,
    fetchBatchesByProduct, manualStockAdjustment,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showStockActionMenu, setShowStockActionMenu] = useState(null); // productId
  const [showManualAdjustModal, setShowManualAdjustModal] = useState(false);
  const [manualAdjustItem, setManualAdjustItem] = useState(null);
  const [manualAdjustForm, setManualAdjustForm] = useState({ variantId: '', qty: '', reason: 'Manual Adjustment', notes: '', type: 'add', batchNumber: '' });
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [addStockItem, setAddStockItem] = useState(null);
  const [showBarcodeLabel, setShowBarcodeLabel] = useState(false);
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [printItems, setPrintItems] = useState([]);
  const [barcodeQuickEntry, setBarcodeQuickEntry] = useState('');
  const [productBatches, setProductBatches] = useState({});

  const activeProducts = useMemo(() => products.filter((p) => !p.archived), [products]);
  const archivedProducts = useMemo(() => products.filter((p) => p.archived), [products]);

  const displayProducts = showArchived ? archivedProducts : activeProducts;

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    let result = displayProducts.filter((p) => {
      const variantList = Array.isArray(p.variants) ? p.variants : [];
      return (
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.includes(search) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        variantList.some((v) =>
          `${v.sku || ''} ${v.barcode || ''} ${v.size || ''} ${v.color || ''}`.toLowerCase().includes(query)
        )
      );
    });

    if (filterBy === 'low-stock') {
      result = result.filter((p) => {
        const s = summarizeProductInventory(p);
        return s.totalStock <= (p.minStock || 0) || s.lowStock;
      });
    } else if (filterBy === 'out-of-stock') {
      result = result.filter((p) => summarizeProductInventory(p).totalStock === 0);
    } else if (filterBy === 'active') {
      result = result.filter((p) => {
        const variantList = Array.isArray(p.variants) ? p.variants : [];
        return variantList.some((v) => v.status === 'Active' || v.active !== false);
      });
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [displayProducts, search, filterBy]);

  const stats = useMemo(() => {
    const lowStock = activeProducts.filter((p) => {
      const s = summarizeProductInventory(p);
      return s.totalStock <= (p.minStock || 0);
    }).length;
    const outOfStock = activeProducts.filter((p) => summarizeProductInventory(p).totalStock === 0).length;
    const totalValue = activeProducts.reduce((sum, p) => {
      const s = summarizeProductInventory(p);
      return sum + (s.totalCostValue || 0);
    }, 0);
    const totalVariants = activeProducts.reduce((sum, p) => {
      return sum + (Array.isArray(p.variants) ? p.variants.length : 0);
    }, 0);
    return { lowStock, outOfStock, totalValue, totalVariants, archived: archivedProducts.length };
  }, [activeProducts, archivedProducts]);

  const toggleProductExpand = (productId) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const loadBatchesForProduct = useCallback(async (productId) => {
    if (productBatches[productId]) return;
    try {
      const batches = await fetchBatchesByProduct(productId);
      setProductBatches((prev) => ({ ...prev, [productId]: batches || [] }));
    } catch { /* non-fatal */ }
  }, [fetchBatchesByProduct, productBatches]);

  const handleBarcodeQuickEntry = () => {
    const value = barcodeQuickEntry.trim();
    if (!value) { toast.error('Enter a barcode first'); return; }
    const existing = products.find((product) => {
      const barcode = String(product.barcode || '').toLowerCase();
      const sku = String(product.sku || '').toLowerCase();
      const inVariant = Array.isArray(product.variants) &&
        product.variants.some((v) =>
          String(v.barcode || '').toLowerCase() === value.toLowerCase() ||
          String(v.sku || '').toLowerCase() === value.toLowerCase()
        );
      return barcode === value.toLowerCase() || sku === value.toLowerCase() || inVariant;
    });
    if (existing) {
      setEditItem(existing);
      setShowAddModal(true);
      toast.success(`Loaded ${existing.name}`);
      setBarcodeQuickEntry('');
      return;
    }
    setEditItem(null);
    setShowAddModal(true);
    toast.success('New product form opened');
    setBarcodeQuickEntry('');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Archive "${name}"?\n\nThis keeps all history and reports intact. The product won't appear in inventory but all sales data is preserved.`)) return;
    try {
      await archiveProductById(id);
      toast.success(`${name} archived`);
    } catch { toast.error('Failed to archive product'); }
  };

  const handleHardDelete = async (id, name) => {
    if (!window.confirm(`PERMANENTLY DELETE "${name}"?\n\nThis CANNOT be undone. All stock, batch, and sales history will be affected.\n\nAre you absolutely sure?`)) return;
    try {
      await deleteProduct(id);
      toast.success(`${name} permanently deleted`);
    } catch { toast.error('Failed to delete product'); }
  };

  const handleUnarchive = async (id, name) => {
    try {
      await unarchiveProductById(id);
      toast.success(`${name} restored`);
    } catch { toast.error('Failed to restore product'); }
  };

  const handleDuplicate = async (id, name) => {
    try {
      await duplicateProductById(id);
      toast.success(`${name} duplicated (no stock copied)`);
    } catch { toast.error('Failed to duplicate product'); }
  };

  const handlePrintBarcodeLabel = (product) => {
    const variantEntries = Array.isArray(product.variants)
      ? product.variants.filter(Boolean).map((variant) => {
          // Proper variant label: use label field, fallback to size/color combo
          const variantLabel = variant.label
            || [variant.size, variant.color].filter(Boolean).join(' / ')
            || `Variant ${variant.id}`;
          // Use variant's own unique barcode
          const variantBarcode = variant.barcode || product.barcode;
          // Use variant's batch number if available, otherwise SKU
          const displayCode = variant.batchNumber || variant.barcode || variant.sku || product.sku;
          return {
            id: `variant-${variant.id}`,
            productId: product.id,
            name: product.name,
            productName: product.name,
            barcode: variantBarcode,
            sku: displayCode,
            batchNumber: variant.batchNumber || '',
            price: variant.price ?? product.salePrice ?? product.price,
            sizeLabel: variantLabel,
            variantName: variantLabel,
            variantLabel,
            qty: 1,
          };
        })
      : [];

    const payload = variantEntries.length > 0
      ? variantEntries
      : [{
          id: String(product.id),
          productId: product.id,
          name: product.name,
          productName: product.name,
          barcode: product.barcode,
          sku: product.sku,
          price: product.salePrice ?? product.price,
          qty: 1,
        }];

    setPrintItems(payload);
    setShowBarcodeLabel(true);
  };

  const handleManualAdjust = (product) => {
    const variantList = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];
    setManualAdjustItem(product);
    setManualAdjustForm({
      variantId: variantList[0]?.id ? String(variantList[0].id) : '',
      qty: '',
      reason: 'Manual Adjustment',
      notes: '',
      type: 'add',
      batchNumber: '',
    });
    setShowManualAdjustModal(true);
    setShowStockActionMenu(null);
  };

  const handleManualAdjustSave = async () => {
    if (!manualAdjustForm.qty || Number(manualAdjustForm.qty) < 1) {
      toast.error('Enter a valid quantity'); return;
    }
    const qty = Number(manualAdjustForm.qty);
    const delta = manualAdjustForm.type === 'remove' ? -qty : qty;
    try {
      const generatedBatch = await manualStockAdjustment({
        productId: manualAdjustItem.id,
        variantId: manualAdjustForm.variantId || null,
        quantity: delta,
        reason: manualAdjustForm.reason,
        notes: manualAdjustForm.notes,
        batchNumber: manualAdjustForm.batchNumber.trim() || undefined, // use custom if provided
      });
      const batchMsg = (manualAdjustForm.type === 'add' && generatedBatch) ? ` · Batch: ${generatedBatch}` : '';
      toast.success(`Stock ${manualAdjustForm.type === 'remove' ? 'removed' : 'added'}: ${qty} units${batchMsg}`);
      setShowManualAdjustModal(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to adjust stock');
    }
  };

  const handleExport = (format) => {
    const exportData = filtered.map((p) => {
      const summary = summarizeProductInventory(p);
      return {
        SKU: p.sku,
        Name: p.name,
        Brand: p.brand || '',
        Category: p.category || '',
        Barcode: p.barcode,
        Variants: summary.variantCount,
        'Total Stock': summary.totalStock,
        'Lowest Price': formatCurrency(summary.lowestPrice, company.currency),
        'Highest Price': formatCurrency(summary.highestPrice, company.currency),
        Unit: p.unit,
        Status: p.archived ? 'Archived' : 'Active',
      };
    });
    if (format === 'csv') exportCSV(exportData, `inventory-${new Date().toISOString().split('T')[0]}.csv`);
    else if (format === 'excel') exportToExcel(exportData, `inventory-${new Date().toISOString().split('T')[0]}.xlsx`, 'Inventory');
    else if (format === 'pdf') exportToPDF(exportData, `inventory-${new Date().toISOString().split('T')[0]}.pdf`, company);
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const handleBulkSizesCreated = async (productId, selectedSizes, defaultStock) => {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) { toast.error('Please choose a valid product'); return; }
    if (!Array.isArray(selectedSizes) || selectedSizes.length === 0) { toast.error('Select at least one size'); return; }
    const existingSizes = product.sizes && typeof product.sizes === 'object' ? { ...product.sizes } : {};
    const stockValue = Number(defaultStock) || 0;
    const newSizes = selectedSizes.reduce((acc, size) => {
      const previous = existingSizes[size] || {};
      acc[size] = {
        ...previous,
        stock: previous.stock != null ? previous.stock : stockValue,
        remainingQuantity: previous.remainingQuantity != null ? previous.remainingQuantity : stockValue,
        price: previous.price ?? product.price ?? product.salePrice ?? 0,
        costPrice: previous.costPrice ?? product.costPrice ?? 0,
        minStock: previous.minStock ?? 0,
        barcode: previous.barcode || generateSizeBarcode(product.barcode || product.sku || product.id, size) || product.barcode,
        sku: previous.sku || generateVariantSku(product.sku || product.id, size),
      };
      return acc;
    }, {});
    try {
      await updateProduct({ ...product, sizes: { ...existingSizes, ...newSizes } });
      toast.success(`Created ${selectedSizes.length} sizes for ${product.name}`);
      setShowBulkCreator(false);
    } catch { toast.error('Failed to save size variants'); }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Products · Variants · Batches · Stock Movements</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditItem(null); setShowAddModal(true); }}
            className="btn-primary"
          >
            <Plus size={16} /> New Product
          </button>
          <button onClick={() => setShowBulkCreator(true)} className="btn-secondary">
            <Package size={16} /> Bulk Create
          </button>
          <button
            onClick={() => setShowArchived((s) => !s)}
            className={`btn-secondary ${showArchived ? 'ring-2 ring-orange-400' : ''}`}
          >
            <Archive size={16} /> {showArchived ? 'Show Active' : 'Archived'} ({archivedProducts.length})
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-4">
          <p className="text-xl font-bold text-primary-600">{activeProducts.length}</p>
          <p className="text-xs text-gray-400">Active Products</p>
        </div>
        <div className="card p-4">
          <p className="text-xl font-bold text-indigo-500">{stats.totalVariants}</p>
          <p className="text-xs text-gray-400">Total Variants</p>
        </div>
        <div className="card p-4">
          <p className="text-xl font-bold text-orange-500">{stats.lowStock}</p>
          <p className="text-xs text-gray-400">Low Stock</p>
        </div>
        <div className="card p-4">
          <p className="text-xl font-bold text-red-500">{stats.outOfStock}</p>
          <p className="text-xs text-gray-400">Out of Stock</p>
        </div>
        <div className="card p-4">
          <p className="text-xl font-bold text-green-600 text-sm">{formatCurrency(stats.totalValue, company.currency)}</p>
          <p className="text-xs text-gray-400">Inventory Value</p>
        </div>
      </div>

      {/* ── Batch Tracking moved to dedicated page ── */}
      <div className="card p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex items-center gap-3">
        <ClipboardList size={18} className="text-indigo-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Batch Tracking has moved</p>
          <p className="text-xs text-indigo-500 dark:text-indigo-400">Use the dedicated <strong>Batch Tracking</strong> section in the sidebar for full industrial-grade batch traceability.</p>
        </div>
        {typeof setPage === 'function' && (
          <button onClick={() => setPage('batchTracking')} className="btn-primary text-sm px-4 shrink-0">
            Open Batch Tracking
          </button>
        )}
      </div>

      {/* ── Quick Barcode Entry ── */}
      <div className="card p-4 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="label">Quick Barcode / SKU Lookup</label>
          <input
            className="input"
            placeholder="Scan or type barcode / SKU"
            value={barcodeQuickEntry}
            onChange={(e) => setBarcodeQuickEntry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBarcodeQuickEntry()}
          />
        </div>
        <button onClick={handleBarcodeQuickEntry} className="btn-secondary">
          <ScanLine size={16} /> Lookup
        </button>
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search by name, SKU, barcode, brand, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
          <option value="all">All Products</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
          <option value="active">Active Variants</option>
        </select>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn-secondary" title="Export CSV">
            <Download size={16} />
          </button>
          <button onClick={() => handleExport('excel')} className="btn-secondary" title="Export Excel">
            <BarChart2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Product Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="table-head w-8"></th>
                <th className="table-head">Product</th>
                <th className="table-head">Variants</th>
                <th className="table-head">Total Stock</th>
                <th className="table-head">Price Range</th>
                <th className="table-head">Status</th>
                <th className="table-head">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-cell text-center text-gray-400 py-16">
                    <Package size={40} className="mx-auto mb-3 opacity-20" />
                    <p>{showArchived ? 'No archived products' : 'No products found'}</p>
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const summary = summarizeProductInventory(p);
                const isExpanded = expandedProducts.has(p.id);
                const variantList = Array.isArray(p.variants) ? p.variants.filter(Boolean) : [];
                const batches = productBatches[p.id] || [];

                return (
                  <React.Fragment key={p.id}>
                    {/* ─ Master Product Row ─ */}
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell w-8">
                        <button
                          onClick={() => {
                            toggleProductExpand(p.id);
                            if (!expandedProducts.has(p.id)) loadBatchesForProduct(p.id);
                          }}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          {isExpanded
                            ? <ChevronDown size={14} className="text-gray-500" />
                            : <ChevronRight size={14} className="text-gray-400" />}
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded object-cover" />
                          )}
                          {summary.lowStock && !p.archived && (
                            <AlertTriangle size={14} className="text-orange-500 shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-primary-600">{p.name}</div>
                            <div className="text-xs text-gray-500">
                              {p.category || 'Uncategorized'}{p.brand ? ` · ${p.brand}` : ''}
                            </div>
                            {p.sku && <div className="text-[10px] text-gray-400 font-mono">{p.sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm">
                        <div className="font-medium">{summary.variantCount} variant{summary.variantCount !== 1 ? 's' : ''}</div>
                        <div className="text-xs text-gray-500">
                          {variantList.slice(0, 3).map((v) => v.size || v.color || 'Var').join(', ')}
                          {variantList.length > 3 ? ` +${variantList.length - 3}` : ''}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={summary.totalStock === 0 ? 'text-red-500 font-bold' : 'font-semibold'}>
                          {summary.totalStock}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{p.unit || 'PCS'}</span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium">{formatCurrency(summary.lowestPrice, company.currency)}</div>
                        {summary.highestPrice > summary.lowestPrice && (
                          <div className="text-xs text-gray-400">to {formatCurrency(summary.highestPrice, company.currency)}</div>
                        )}
                      </td>
                      <td className="table-cell">
                        {p.archived ? (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">Archived</span>
                        ) : summary.totalStock === 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">Out of Stock</span>
                        ) : summary.lowStock ? (
                          <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">Low Stock</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Healthy</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => { setViewItem(p); setShowDetailModal(true); }}
                            className="icon-btn" title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => { setEditItem(p); setShowAddModal(true); }}
                            className="icon-btn" title="Edit Product"
                          >
                            <Edit2 size={14} />
                          </button>
                          {!p.archived && (
                            <div className="relative">
                              <button
                                onClick={() => setShowStockActionMenu(showStockActionMenu === p.id ? null : p.id)}
                                className="icon-btn text-green-600" title="Stock Actions"
                              >
                                <Package size={14} />
                              </button>
                              {showStockActionMenu === p.id && (
                                <div className="absolute right-0 top-7 z-50 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 text-sm">
                                  <button
                                    onClick={() => { setAddStockItem(p); setShowAddStockModal(true); setShowStockActionMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400"
                                  >
                                    <Plus size={14} /> Add Stock (Purchase)
                                  </button>
                                  <button
                                    onClick={() => handleManualAdjust(p)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                  >
                                    <TrendingUp size={14} /> Manual Adjustment
                                  </button>
                                  <button
                                    onClick={() => {
                                      setManualAdjustItem(p);
                                      const variantList = Array.isArray(p.variants) ? p.variants.filter(Boolean) : [];
                                      setManualAdjustForm({ variantId: variantList[0]?.id ? String(variantList[0].id) : '', qty: '', reason: 'Stock Correction', notes: '', type: 'remove', batchNumber: '' });
                                      setShowManualAdjustModal(true);
                                      setShowStockActionMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                  >
                                    <Minus size={14} /> Deduct / Write-off Stock
                                  </button>
                                  <button
                                    onClick={() => {
                                      setManualAdjustItem(p);
                                      const variantList = Array.isArray(p.variants) ? p.variants.filter(Boolean) : [];
                                      setManualAdjustForm({ variantId: variantList[0]?.id ? String(variantList[0].id) : '', qty: '', reason: 'Damage/Loss', notes: '', type: 'remove', batchNumber: '' });
                                      setShowManualAdjustModal(true);
                                      setShowStockActionMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                                  >
                                    <ClipboardList size={14} /> Damage / Loss
                                  </button>
                                  <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                  <button
                                    onClick={() => setShowStockActionMenu(null)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                                  >
                                    <X size={14} /> Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => handlePrintBarcodeLabel(p)}
                            className="icon-btn text-blue-600" title="Print Barcode Labels"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(p.id, p.name)}
                            className="icon-btn text-indigo-500" title="Duplicate Product"
                          >
                            <Copy size={14} />
                          </button>
                          {p.archived ? (
                            <button
                              onClick={() => handleUnarchive(p.id, p.name)}
                              className="icon-btn text-green-600" title="Restore Product"
                            >
                              <RefreshCw size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="icon-btn text-orange-500" title="Archive Product"
                            >
                              <Archive size={14} />
                            </button>
                          )}
                          {p.archived && (
                            <button
                              onClick={() => handleHardDelete(p.id, p.name)}
                              className="icon-btn text-red-500" title="Delete Permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ─ Expandable Variants + Batches ─ */}
                    {isExpanded && (
                      <tr key={`${p.id}-expand`}>
                        <td colSpan={7} className="bg-gray-50 dark:bg-gray-900/40 px-4 pb-4 pt-2">
                          <div className="ml-4 space-y-3">
                            {variantList.length === 0 && (
                              <p className="text-sm text-gray-400 italic">No variants defined</p>
                            )}
                            {variantList.map((variant) => {
                              const variantBatches = batches.filter(
                                (b) => String(b.variantId) === String(variant.id)
                              );
                              return (
                                <div
                                  key={variant.id}
                                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
                                >
                                  {/* Variant header */}
                                  <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20">
                                    <div className="flex items-center gap-3">
                                      <Boxes size={14} className="text-indigo-500" />
                                      <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">
                                        {variant.label
                                          || [variant.size, variant.color].filter(Boolean).join(' / ')
                                          || `Variant ${variant.id || (variantList.indexOf(variant) + 1)}`}
                                      </span>
                                      {variant.status === 'Inactive' && (
                                        <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-2 py-0.5">Inactive</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                      {variant.sku && <span className="font-mono">{variant.sku}</span>}
                                      {variant.barcode && <span className="font-mono">{variant.barcode}</span>}
                                      <span className="font-semibold text-primary-600">
                                        {formatCurrency(variant.price ?? p.salePrice ?? 0, company.currency)}
                                      </span>
                                      <span className={`font-bold ${
                                        Number(variant.stock || 0) === 0
                                          ? 'text-red-500'
                                          : Number(variant.stock || 0) <= Number(variant.minStock || 0)
                                          ? 'text-orange-500'
                                          : 'text-emerald-600'
                                      }`}>
                                        Stock: {variant.stock ?? 0}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Batch rows */}
                                  {variantBatches.length > 0 && (
                                    <div className="px-4 py-2">
                                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-bold">
                                        Inventory Batches ({variantBatches.length})
                                      </p>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-gray-400">
                                            <th className="text-left pb-1">Batch #</th>
                                            <th className="text-left pb-1">Date</th>
                                            <th className="text-left pb-1">Supplier</th>
                                            <th className="text-right pb-1">Qty</th>
                                            <th className="text-right pb-1">Cost</th>
                                            <th className="text-left pb-1">Notes</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {variantBatches.map((batch) => (
                                            <tr key={batch.id} className="border-t border-gray-50 dark:border-gray-800">
                                              <td className="py-1 font-mono text-primary-600">{batch.batchNumber}</td>
                                              <td className="py-1 text-gray-500">{batch.purchaseDate || '—'}</td>
                                              <td className="py-1 text-gray-500">{batch.supplierName || batch.supplierId || '—'}</td>
                                              <td className="py-1 text-right font-semibold">{batch.quantity}</td>
                                              <td className="py-1 text-right">{formatCurrency(batch.purchaseCost || 0, company.currency)}</td>
                                              <td className="py-1 text-gray-400 max-w-[120px] truncate">{batch.notes || '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                  {variantBatches.length === 0 && (
                                    <div className="px-4 py-2 text-xs text-gray-400 italic">
                                      No purchase batches yet
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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

      {/* ── Add/Edit Product Modal ── */}
      <AddProductModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditItem(null); }}
        editItem={editItem}
        products={products}
        onSave={async (payload) => {
          try {
            if (editItem) {
              await updateProduct({ ...payload, id: editItem.id });
              toast.success('Product updated');
            } else {
              await addProduct(payload);
              toast.success('Product added');
            }
            setShowAddModal(false);
            setEditItem(null);
          } catch (err) {
            toast.error(err?.message || 'Failed to save product');
          }
        }}
      />

      {/* ── Product Detail Modal ── */}
      {showDetailModal && viewItem && (
        <ProductDetailModal
          open={showDetailModal}
          onClose={() => { setShowDetailModal(false); setViewItem(null); }}
          product={viewItem}
          company={company}
        />
      )}

      {/* ── Add Stock Modal ── */}
      {showAddStockModal && addStockItem && (
        <AddStockModal
          open={showAddStockModal}
          onClose={() => { setShowAddStockModal(false); setAddStockItem(null); }}
          product={addStockItem}
          company={company}
        />
      )}

      {/* ── Barcode Label Printer Modal ── */}
      <BarcodeLabelPrinter
        open={showBarcodeLabel}
        onClose={() => setShowBarcodeLabel(false)}
        items={printItems}
        products={products}
        company={company}
        printSettings={printSettings}
      />

      {/* ── Bulk Size Creator Modal ── */}
      {showBulkCreator && (
        <BulkSizeCreator
          open={showBulkCreator}
          products={products}
          onClose={() => setShowBulkCreator(false)}
          onCreate={handleBulkSizesCreated}
        />
      )}

      {/* ── Manual Stock Adjustment Modal ── */}
      <Modal
        open={showManualAdjustModal}
        onClose={() => { setShowManualAdjustModal(false); setManualAdjustItem(null); }}
        title={`${manualAdjustForm.type === 'remove' ? 'Deduct Stock' : 'Add Stock'} — ${manualAdjustItem?.name || 'Product'}`}
        size="md"
      >
        {manualAdjustItem && (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${
              manualAdjustForm.type === 'remove'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            }`}>
              {manualAdjustForm.type === 'remove'
                ? '⚠ This will permanently reduce stock. Use for damage, loss, or correction.'
                : '✓ This will add stock directly without creating a purchase batch.'}
            </div>

            {/* Operation type */}
            <div>
              <label className="label">Operation</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setManualAdjustForm(f => ({ ...f, type: 'add' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    manualAdjustForm.type === 'add'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  onClick={() => setManualAdjustForm(f => ({ ...f, type: 'remove' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    manualAdjustForm.type === 'remove'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  − Deduct Stock
                </button>
              </div>
            </div>

            {/* Variant selection */}
            {Array.isArray(manualAdjustItem.variants) && manualAdjustItem.variants.length > 0 && (
              <div>
                <label className="label">Variant <span className="text-red-500">*</span></label>
                <select
                  className="input"
                  value={manualAdjustForm.variantId}
                  onChange={(e) => setManualAdjustForm(f => ({ ...f, variantId: e.target.value }))}
                >
                  <option value="">— Select variant —</option>
                  {manualAdjustItem.variants.filter(Boolean).map(v => {
                    const label = v.label || [v.size, v.color].filter(Boolean).join(' / ') || `Variant ${v.id}`;
                    return (
                      <option key={v.id} value={v.id}>
                        {label} — Stock: {v.stock ?? 0}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="label">Quantity <span className="text-red-500">*</span></label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={manualAdjustForm.qty}
                onChange={(e) => setManualAdjustForm(f => ({ ...f, qty: e.target.value }))}
              />
            </div>

            {/* Reason */}
            <div>
              <label className="label">Reason</label>
              <select
                className="input"
                value={manualAdjustForm.reason}
                onChange={(e) => setManualAdjustForm(f => ({ ...f, reason: e.target.value }))}
              >
                <option value="Manual Adjustment">Manual Adjustment</option>
                <option value="Stock Correction">Stock Correction</option>
                <option value="Opening Stock">Opening Stock</option>
                <option value="Damage/Loss">Damage / Loss</option>
                <option value="Theft">Theft</option>
                <option value="Expired">Expired / Waste</option>
                <option value="Return from Customer">Return from Customer</option>
                <option value="Transfer In">Transfer In</option>
                <option value="Transfer Out">Transfer Out</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <input
                className="input"
                placeholder="Optional notes"
                value={manualAdjustForm.notes}
                onChange={(e) => setManualAdjustForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Batch Number (optional — only for add operations) */}
            {manualAdjustForm.type === 'add' && (
              <div>
                <label className="label">
                  Adjustment Batch Number <span className="text-gray-400 font-normal text-xs">(optional — leave blank to auto-generate)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 font-mono text-sm"
                    placeholder="e.g. ADJ20260618XXXX — auto-generated if blank"
                    value={manualAdjustForm.batchNumber}
                    onChange={(e) => setManualAdjustForm(f => ({ ...f, batchNumber: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setManualAdjustForm(f => ({ ...f, batchNumber: buildBatchNumber('ADJ') }))}
                    className="btn-secondary px-3"
                    title="Generate batch number"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleManualAdjustSave}
                className={`btn-primary flex-1 justify-center ${manualAdjustForm.type === 'remove' ? 'bg-red-600 hover:bg-red-700 border-red-600' : ''}`}
              >
                {manualAdjustForm.type === 'remove' ? <Minus size={16} /> : <Plus size={16} />}
                {manualAdjustForm.type === 'remove' ? 'Deduct Stock' : 'Add Stock'}
              </button>
              <button
                onClick={() => { setShowManualAdjustModal(false); setManualAdjustItem(null); }}
                className="btn-secondary flex-1 justify-center"
              >
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Click-outside handler for stock menu ── */}
      {showStockActionMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStockActionMenu(null)}
        />
      )}
    </div>
  );
}

/**
 * InventoryReports — Enterprise inventory reporting page.
 *
 * Reports:
 * 1. Inventory Valuation Report
 * 2. Batch-Wise Stock Report
 * 3. Low Stock Report
 * 4. Purchase Cost History
 * 5. Stock Adjustment Report
 * 6. Dead Stock Report
 * 7. Barcode Print History
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import {
  Package, AlertTriangle, TrendingUp,
  RefreshCw, Download, Printer, Activity, DollarSign,
  Archive,
} from 'lucide-react';
import { exportCSV } from '../utils/helpers';
import toast from 'react-hot-toast';

const REPORTS = [
  { id: 'valuation', label: 'Inventory Valuation', icon: DollarSign },
  { id: 'batch', label: 'Batch-Wise Stock', icon: Package },
  { id: 'lowstock', label: 'Low Stock', icon: AlertTriangle },
  { id: 'costhistory', label: 'Purchase Cost History', icon: TrendingUp },
  { id: 'adjustments', label: 'Stock Adjustments', icon: Activity },
  { id: 'deadstock', label: 'Dead Stock', icon: Archive },
  { id: 'barcodelogs', label: 'Barcode Print History', icon: Printer },
];

export default function InventoryReports() {
  const {
    products, company, suppliers, variants,
    fetchAllBatches, fetchAllStockMovements, fetchBarcodePrintLogs,
  } = useApp();

  const [activeReport, setActiveReport] = useState('valuation');
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [barcodeLogs, setBarcodeLogs] = useState([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [b, m, bl] = await Promise.all([
        fetchAllBatches(),
        fetchAllStockMovements(),
        fetchBarcodePrintLogs(),
      ]);
      setBatches(b || []);
      setMovements(m || []);
      setBarcodeLogs(bl || []);
    } catch { /* non-fatal */ }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

  const activeProducts = useMemo(() => products.filter((p) => !p.archived), [products]);

  const getProductName = (id) =>
    products.find((p) => String(p.id) === String(id))?.name || `Product #${id}`;

  const getVariantLabel = (productId, variantId) => {
    if (!variantId) return '—';
    const product = products.find((p) => String(p.id) === String(productId));
    const variant = Array.isArray(product?.variants)
      ? product.variants.find((v) => String(v.id) === String(variantId))
      : null;
    if (variant) {
      return variant.label
        || [variant.size, variant.color].filter(Boolean).join(' / ')
        || 'Default';
    }
    // Fallback to variants store
    const storeVariant = variants.find((v) => String(v.id) === String(variantId));
    return storeVariant?.label || `Variant #${variantId}`;
  };

  const getSupplierName = (id) => {
    if (!id) return 'Walk-in';
    return (suppliers || []).find((s) => String(s.id) === String(id))?.name || `Supplier #${id}`;
  };

  // ─── Valuation Report ───────────────────────────────────────────────────
  const valuationData = useMemo(() => {
    return activeProducts.map((p) => {
      const variantList = Array.isArray(p.variants) ? p.variants.filter(Boolean) : [];
      let totalStock = 0, totalCostValue = 0, totalSaleValue = 0;
      if (variantList.length > 0) {
        variantList.forEach((v) => {
          const stock = Number(v.stock || 0);
          totalStock += stock;
          totalCostValue += stock * Number(v.costPrice || p.costPrice || 0);
          totalSaleValue += stock * Number(v.price || p.salePrice || 0);
        });
      } else {
        totalStock = Number(p.stock || 0);
        totalCostValue = totalStock * Number(p.costPrice || 0);
        totalSaleValue = totalStock * Number(p.salePrice || p.price || 0);
      }
      const potentialProfit = totalSaleValue - totalCostValue;
      return { id: p.id, name: p.name, category: p.category, brand: p.brand, variantCount: variantList.length, totalStock, totalCostValue, totalSaleValue, potentialProfit };
    }).sort((a, b) => b.totalCostValue - a.totalCostValue);
  }, [activeProducts]);

  const valuationTotals = useMemo(() => valuationData.reduce((acc, row) => ({
    stock: acc.stock + row.totalStock,
    cost: acc.cost + row.totalCostValue,
    sale: acc.sale + row.totalSaleValue,
    profit: acc.profit + row.potentialProfit,
  }), { stock: 0, cost: 0, sale: 0, profit: 0 }), [valuationData]);

  // ─── Batch Report ────────────────────────────────────────────────────────
  const batchData = useMemo(() =>
    batches.slice().sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0)),
    [batches]
  );

  // ─── Low Stock Report ────────────────────────────────────────────────────
  const lowStockData = useMemo(() => {
    const rows = [];
    activeProducts.forEach((p) => {
      const variantList = Array.isArray(p.variants) ? p.variants.filter(Boolean) : [];
      if (variantList.length > 0) {
        variantList.forEach((v) => {
          const stock = Number(v.stock || 0);
          const minStock = Number(v.minStock || p.minStock || 0);
          if (stock <= minStock) {
            rows.push({
              productName: p.name,
              variant: [v.size, v.color].filter(Boolean).join(' / ') || 'Default',
              sku: v.sku || p.sku,
              barcode: v.barcode || p.barcode,
              stock,
              minStock,
              reorderQty: Math.max(0, minStock * 2 - stock),
              status: stock === 0 ? 'Out of Stock' : 'Low Stock',
            });
          }
        });
      } else {
        const stock = Number(p.stock || 0);
        const minStock = Number(p.minStock || 0);
        if (stock <= minStock) {
          rows.push({
            productName: p.name,
            variant: '—',
            sku: p.sku,
            barcode: p.barcode,
            stock,
            minStock,
            reorderQty: Math.max(0, minStock * 2 - stock),
            status: stock === 0 ? 'Out of Stock' : 'Low Stock',
          });
        }
      }
    });
    return rows.sort((a, b) => a.stock - b.stock);
  }, [activeProducts]);

  // ─── Dead Stock Report ───────────────────────────────────────────────────
  const deadStockData = useMemo(() => {
    const thresholdDays = 90;
    const now = Date.now();
    return activeProducts.filter((p) => {
      const lastSold = p.lastSoldDate ? new Date(p.lastSoldDate).getTime() : 0;
      const daysSince = lastSold ? Math.floor((now - lastSold) / 86400000) : Infinity;
      const stock = Array.isArray(p.variants)
        ? p.variants.reduce((s, v) => s + Number(v.stock || 0), 0)
        : Number(p.stock || 0);
      return stock > 0 && daysSince > thresholdDays;
    }).map((p) => {
      const stock = Array.isArray(p.variants)
        ? p.variants.reduce((s, v) => s + Number(v.stock || 0), 0)
        : Number(p.stock || 0);
      const lastSold = p.lastSoldDate ? new Date(p.lastSoldDate) : null;
      const daysSince = lastSold ? Math.floor((Date.now() - lastSold.getTime()) / 86400000) : '—';
      const costValue = stock * Number(p.costPrice || 0);
      return { name: p.name, category: p.category, stock, lastSold: lastSold?.toLocaleDateString('en-IN') || 'Never', daysSince, costValue };
    }).sort((a, b) => (typeof b.daysSince === 'number' ? b.daysSince : 0) - (typeof a.daysSince === 'number' ? a.daysSince : 0));
  }, [activeProducts]);

  // ─── Stock Adjustments Report ────────────────────────────────────────────
  const adjustmentData = useMemo(() =>
    movements
      .filter((m) => m.type === 'Manual Adjustment')
      .slice()
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [movements]
  );

  const handleExport = (data, filename) => {
    try {
      exportCSV(data, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Exported as CSV');
    } catch { toast.error('Export failed'); }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
          <span className="ml-3 text-gray-400">Loading report data...</span>
        </div>
      );
    }

    switch (activeReport) {
      case 'valuation':
        return (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-4 text-center">
                <p className="text-xl font-bold text-primary-600">{valuationData.length}</p>
                <p className="text-xs text-gray-400">Products</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{valuationTotals.stock}</p>
                <p className="text-xs text-gray-400">Total Units</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-lg font-bold text-red-500">{formatCurrency(valuationTotals.cost, company.currency)}</p>
                <p className="text-xs text-gray-400">Cost Value</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-lg font-bold text-green-600">{formatCurrency(valuationTotals.profit, company.currency)}</p>
                <p className="text-xs text-gray-400">Potential Profit</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => handleExport(valuationData.map(r => ({
                Product: r.name, Category: r.category, Brand: r.brand,
                Variants: r.variantCount, 'Total Stock': r.totalStock,
                'Cost Value': r.totalCostValue, 'Sale Value': r.totalSaleValue,
                'Potential Profit': r.potentialProfit,
              })), 'inventory-valuation')} className="btn-secondary text-xs">
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Product', 'Category', 'Variants', 'Stock', 'Cost Value', 'Sale Value', 'Potential Profit'].map((h) => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {valuationData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell font-medium">{row.name}</td>
                      <td className="table-cell text-gray-500">{row.category || '—'}</td>
                      <td className="table-cell text-center">{row.variantCount}</td>
                      <td className="table-cell font-bold text-center">{row.totalStock}</td>
                      <td className="table-cell text-red-600">{formatCurrency(row.totalCostValue, company.currency)}</td>
                      <td className="table-cell text-blue-600">{formatCurrency(row.totalSaleValue, company.currency)}</td>
                      <td className="table-cell font-semibold text-green-600">{formatCurrency(row.potentialProfit, company.currency)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                    <td className="table-cell" colSpan={3}>Totals</td>
                    <td className="table-cell text-center">{valuationTotals.stock}</td>
                    <td className="table-cell text-red-600">{formatCurrency(valuationTotals.cost, company.currency)}</td>
                    <td className="table-cell text-blue-600">{formatCurrency(valuationTotals.sale, company.currency)}</td>
                    <td className="table-cell text-green-600">{formatCurrency(valuationTotals.profit, company.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'batch':
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => handleExport(batchData.map(b => ({
                'Batch #': b.batchNumber, Product: getProductName(b.productId),
                Variant: getVariantLabel(b.productId, b.variantId),
                Date: b.purchaseDate, Supplier: getSupplierName(b.supplierId),
                Qty: b.quantity, 'Cost/Unit': b.purchaseCost,
                'Total Cost': (b.quantity || 0) * (b.purchaseCost || 0),
                Notes: b.notes,
              })), 'batch-stock-report')} className="btn-secondary text-xs">
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Batch #', 'Product', 'Variant', 'Date', 'Supplier', 'Qty', 'Cost/Unit', 'Total', 'Notes'].map((h) => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {batchData.length === 0 && (
                    <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No batches recorded yet</td></tr>
                  )}
                  {batchData.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell font-mono font-semibold text-primary-600">{b.batchNumber}</td>
                      <td className="table-cell font-medium">{getProductName(b.productId)}</td>
                      <td className="table-cell text-gray-500">{getVariantLabel(b.productId, b.variantId)}</td>
                      <td className="table-cell text-gray-500">{b.purchaseDate || '—'}</td>
                      <td className="table-cell text-gray-500">{getSupplierName(b.supplierId)}</td>
                      <td className="table-cell font-bold text-center">{b.quantity}</td>
                      <td className="table-cell">{formatCurrency(b.purchaseCost || 0, company.currency)}</td>
                      <td className="table-cell font-semibold text-primary-600">
                        {formatCurrency((b.quantity || 0) * (b.purchaseCost || 0), company.currency)}
                      </td>
                      <td className="table-cell text-gray-400 max-w-[100px] truncate">{b.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'lowstock':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{lowStockData.length}</p>
                <p className="text-xs text-gray-400">Items Needing Attention</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-red-500">
                  {lowStockData.filter((r) => r.status === 'Out of Stock').length}
                </p>
                <p className="text-xs text-gray-400">Out of Stock</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {lowStockData.filter((r) => r.status === 'Low Stock').length}
                </p>
                <p className="text-xs text-gray-400">Low Stock</p>
              </div>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Product', 'Variant', 'SKU', 'Barcode', 'Stock', 'Min Stock', 'Reorder Qty', 'Status'].map((h) => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {lowStockData.length === 0 && (
                    <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-8">All products have sufficient stock</td></tr>
                  )}
                  {lowStockData.map((row, i) => (
                    <tr key={i} className={row.status === 'Out of Stock' ? 'bg-red-50/30 dark:bg-red-900/10' : 'bg-orange-50/20'}>
                      <td className="table-cell font-medium">{row.productName}</td>
                      <td className="table-cell text-gray-500">{row.variant}</td>
                      <td className="table-cell font-mono text-xs">{row.sku || '—'}</td>
                      <td className="table-cell font-mono text-xs">{row.barcode || '—'}</td>
                      <td className="table-cell font-bold text-center">
                        <span className={row.stock === 0 ? 'text-red-600' : 'text-orange-600'}>{row.stock}</span>
                      </td>
                      <td className="table-cell text-center text-gray-500">{row.minStock}</td>
                      <td className="table-cell text-center text-blue-600 font-semibold">{row.reorderQty}</td>
                      <td className="table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          row.status === 'Out of Stock'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'costhistory':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Purchase cost history across all batches, showing cost changes over time per product.</p>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Date', 'Batch #', 'Product', 'Variant', 'Qty', 'Cost/Unit', 'Supplier'].map((h) => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {batches.length === 0 && (
                    <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No purchase history yet</td></tr>
                  )}
                  {batches.slice().sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0))
                    .map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell text-gray-500">{b.purchaseDate || '—'}</td>
                      <td className="table-cell font-mono text-xs text-primary-600">{b.batchNumber}</td>
                      <td className="table-cell font-medium">{getProductName(b.productId)}</td>
                      <td className="table-cell text-gray-500">{getVariantLabel(b.productId, b.variantId)}</td>
                      <td className="table-cell text-center font-bold">{b.quantity}</td>
                      <td className="table-cell font-semibold text-primary-600">
                        {formatCurrency(b.purchaseCost || 0, company.currency)}
                      </td>
                      <td className="table-cell text-gray-500">{getSupplierName(b.supplierId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'adjustments':
        return (
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Date', 'Product', 'Variant', 'Qty Change', 'Reason', 'Notes', 'By'].map((h) => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {adjustmentData.length === 0 && (
                    <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No manual adjustments recorded</td></tr>
                  )}
                  {adjustmentData.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell text-gray-500 text-xs">
                        {m.date ? new Date(m.date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="table-cell font-medium">{getProductName(m.productId)}</td>
                      <td className="table-cell text-gray-500">{getVariantLabel(m.productId, m.variantId)}</td>
                      <td className={`table-cell font-bold text-center ${Number(m.quantity) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {Number(m.quantity) >= 0 ? '+' : ''}{m.quantity}
                      </td>
                      <td className="table-cell text-gray-500">{m.reason || '—'}</td>
                      <td className="table-cell text-gray-400">{m.notes || '—'}</td>
                      <td className="table-cell text-gray-400 text-xs">{m.createdBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'deadstock':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Products with stock on hand but no sales in the last 90 days.
            </p>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Product', 'Category', 'Stock', 'Last Sold', 'Days Since Sale', 'Cost Value'].map((h) => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {deadStockData.length === 0 && (
                    <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No dead stock — great inventory health!</td></tr>
                  )}
                  {deadStockData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell font-medium">{row.name}</td>
                      <td className="table-cell text-gray-500">{row.category || '—'}</td>
                      <td className="table-cell font-bold text-center text-orange-600">{row.stock}</td>
                      <td className="table-cell text-gray-500">{row.lastSold}</td>
                      <td className="table-cell text-center font-semibold text-red-500">
                        {typeof row.daysSince === 'number' ? `${row.daysSince}d` : row.daysSince}
                      </td>
                      <td className="table-cell text-primary-600 font-semibold">
                        {formatCurrency(row.costValue, company.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'barcodelogs':
        return (
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {['Date', 'Barcode', 'Product', 'Variant', 'Qty Printed', 'By'].map((h) => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {barcodeLogs.length === 0 && (
                    <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No barcode print history yet</td></tr>
                  )}
                  {barcodeLogs.slice().reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="table-cell text-gray-500 text-xs">
                        {log.date ? new Date(log.date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="table-cell font-mono text-xs">{log.barcode || '—'}</td>
                      <td className="table-cell font-medium">{getProductName(log.productId)}</td>
                      <td className="table-cell text-gray-500">{getVariantLabel(log.productId, log.variantId)}</td>
                      <td className="table-cell text-center font-bold">{log.qty || 1}</td>
                      <td className="table-cell text-gray-400 text-xs">{log.printedBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Reports</h1>
          <p className="text-sm text-gray-500">Valuation · Batches · Low Stock · Movements · Dead Stock</p>
        </div>
        <button onClick={loadAll} className="btn-secondary" title="Refresh data">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {REPORTS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveReport(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeReport === id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  );
}

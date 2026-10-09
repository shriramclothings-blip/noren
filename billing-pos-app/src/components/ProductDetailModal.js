/**
 * ProductDetailModal — Read-only detailed view of a product.
 * Shows Master Product → Variants → Batches → Stock Movements.
 */
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Boxes, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { summarizeProductInventory } from '../utils/productInventoryModel';

const TABS = ['Overview', 'Variants', 'Batches', 'Stock Movements'];

export default function ProductDetailModal({ open, onClose, product, company }) {
  const { fetchBatchesByProduct, fetchStockMovementsByProduct, suppliers } = useApp();
  const [tab, setTab] = useState('Overview');
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setTab('Overview');
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, m] = await Promise.all([
        fetchBatchesByProduct(product.id),
        fetchStockMovementsByProduct(product.id),
      ]);
      setBatches(b || []);
      setMovements(m || []);
    } catch { /* non-fatal */ }
    setLoading(false);
  };

  if (!product) return null;

  const summary = summarizeProductInventory(product);
  const variantList = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];

  const getSupplierName = (id) => {
    if (!id) return 'Walk-in';
    return (suppliers || []).find((s) => String(s.id) === String(id))?.name || `Supplier #${id}`;
  };

  return (
    <Modal open={open} onClose={onClose} title={`Product Details — ${product.name}`} size="xl">
      {/* Tab Bar */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
        <button onClick={loadData} className="ml-auto p-2 text-gray-400 hover:text-gray-600" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">

        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-3 text-center">
                <p className="text-2xl font-bold text-primary-600">{summary.totalStock}</p>
                <p className="text-xs text-gray-400">Total Stock</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-2xl font-bold text-indigo-500">{summary.variantCount}</p>
                <p className="text-xs text-gray-400">Variants</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(summary.lowestPrice, company?.currency)}
                </p>
                <p className="text-xs text-gray-400">Min Price</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(summary.highestPrice, company?.currency)}
                </p>
                <p className="text-xs text-gray-400">Max Price</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Brand</p>
                <p className="font-medium">{product.brand || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Category</p>
                <p className="font-medium">{product.category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">SKU</p>
                <p className="font-mono">{product.sku || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Barcode</p>
                <p className="font-mono">{product.barcode || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Unit</p>
                <p className="font-medium">{product.unit || 'PCS'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Status</p>
                <p>
                  {product.archived
                    ? <span className="badge bg-gray-100 text-gray-500">Archived</span>
                    : <span className="badge bg-green-100 text-green-700">Active</span>
                  }
                </p>
              </div>
            </div>

            {product.description && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{product.description}</p>
              </div>
            )}
          </div>
        )}

        {/* ── VARIANTS ── */}
        {tab === 'Variants' && (
          <div className="space-y-3">
            {variantList.length === 0 && (
              <p className="text-center text-gray-400 py-8">No variants defined</p>
            )}
            {variantList.map((v) => (
              <div key={v.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Boxes size={14} className="text-indigo-500" />
                    <span className="font-semibold text-sm">
                      {[v.size, v.color].filter(Boolean).join(' / ') || 'Default Variant'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.status === 'Inactive'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {v.status || 'Active'}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    Number(v.stock || 0) === 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                  }`}>
                    {v.stock ?? 0} in stock
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">SKU</p>
                    <p className="font-mono">{v.sku || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Barcode</p>
                    <p className="font-mono">{v.barcode || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Selling Price</p>
                    <p className="font-semibold text-primary-600">
                      {formatCurrency(v.price ?? 0, company?.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Cost Price</p>
                    <p className="font-medium">{formatCurrency(v.costPrice ?? 0, company?.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Low Stock Alert</p>
                    <p>{v.minStock ?? 0} units</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BATCHES ── */}
        {tab === 'Batches' && (
          <div>
            {loading && <p className="text-center text-gray-400 py-8">Loading batches...</p>}
            {!loading && batches.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No purchase batches yet. Use "Add Stock" to create the first batch.
              </p>
            )}
            {!loading && batches.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {['Batch #', 'Variant', 'Date', 'Supplier', 'Qty', 'Cost/Unit', 'Total', 'Notes'].map((h) => (
                        <th key={h} className="table-head">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {batches.map((b) => {
                      const variant = variantList.find((v) => String(v.id) === String(b.variantId));
                      const variantLabel = variant
                        ? [variant.size, variant.color].filter(Boolean).join(' / ') || 'Default'
                        : b.variantLabel || '—';
                      return (
                        <tr key={b.id}>
                          <td className="table-cell font-mono text-primary-600 font-semibold">{b.batchNumber}</td>
                          <td className="table-cell text-gray-700 dark:text-gray-300">{variantLabel}</td>
                          <td className="table-cell text-gray-500">{b.purchaseDate || '—'}</td>
                          <td className="table-cell text-gray-500">{getSupplierName(b.supplierId)}</td>
                          <td className="table-cell font-bold">{b.quantity}</td>
                          <td className="table-cell">{formatCurrency(b.purchaseCost || 0, company?.currency)}</td>
                          <td className="table-cell font-semibold text-primary-600">
                            {formatCurrency((b.quantity || 0) * (b.purchaseCost || 0), company?.currency)}
                          </td>
                          <td className="table-cell text-gray-400 max-w-[100px] truncate">{b.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── STOCK MOVEMENTS ── */}
        {tab === 'Stock Movements' && (
          <div>
            {loading && <p className="text-center text-gray-400 py-8">Loading movements...</p>}
            {!loading && movements.length === 0 && (
              <p className="text-center text-gray-400 py-8">No stock movements recorded yet.</p>
            )}
            {!loading && movements.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {['Date', 'Type', 'Variant', 'Change', 'Reference', 'Notes', 'By'].map((h) => (
                        <th key={h} className="table-head">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {movements.slice().reverse().map((m) => {
                      const variant = variantList.find((v) => String(v.id) === String(m.variantId));
                      const variantLabel = variant
                        ? (variant.label || [variant.size, variant.color].filter(Boolean).join(' / ') || 'Default')
                        : '—';

                      // Determine if this movement is stock-out (negative) or stock-in (positive)
                      // The quantity field in inventoryEngine stores the signed delta:
                      //   negative = stock decreased (Sale, Transfer Out, Damage, Manual remove)
                      //   positive = stock increased (Purchase In, Return In, Manual add)
                      const qty = Number(m.quantity || 0);
                      const isStockOut = qty < 0;

                      // Colour-code movement type badge
                      const badgeClass = isStockOut
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

                      return (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="table-cell text-gray-500 text-xs whitespace-nowrap">
                            {m.date ? new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="table-cell">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                              {m.type || '—'}
                            </span>
                          </td>
                          <td className="table-cell text-gray-600 dark:text-gray-300 text-xs">{variantLabel}</td>
                          <td className={`table-cell font-bold text-base ${
                            isStockOut ? 'text-red-500' : 'text-green-600'
                          }`}>
                            {isStockOut ? '−' : '+'}{Math.abs(qty)}
                          </td>
                          <td className="table-cell font-mono text-xs text-gray-500">
                            {m.referenceNumber || m.batchNumber || '—'}
                          </td>
                          <td className="table-cell text-gray-400 text-xs max-w-[120px] truncate" title={m.notes || m.reason || ''}>
                            {m.notes || m.reason || '—'}
                          </td>
                          <td className="table-cell text-gray-400 text-xs">{m.createdBy || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="btn-secondary w-full justify-center">
          Close
        </button>
      </div>
    </Modal>
  );
}

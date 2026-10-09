/**
 * VariantsList Component
 * Display product with expandable size variants
 */
import React, { useState } from 'react';
import { ChevronDown, Edit2, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

export default function VariantsList({
  product,
  variants = [],
  onEditVariant,
  onDeleteVariant,
  onDuplicateVariant,
}) {
  const [expanded, setExpanded] = useState(null);

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const totalValue = variants.reduce((sum, v) => sum + ((v.costPrice || product.costPrice || 0) * (v.stock || 0)), 0);
  const lowStockCount = variants.filter(v => (v.stock || 0) <= 5).length;

  const isExpanded = expanded === product.id;

  return (
    <div className="card overflow-hidden">
      {/* Product Header */}
      <div
        onClick={() => setExpanded(isExpanded ? null : product.id)}
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
            <p className="text-xs text-gray-500">{product.category || 'Uncategorized'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div className="text-sm">
            <p className="font-semibold text-primary-600">{variants.length}</p>
            <p className="text-xs text-gray-400">Variants</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-green-600">{totalStock}</p>
            <p className="text-xs text-gray-400">Total Stock</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-amber-600">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-gray-400">Inventory Value</p>
          </div>

          {lowStockCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded text-amber-700 dark:text-amber-400">
              <AlertTriangle size={14} />
              <span className="text-xs font-medium">{lowStockCount} Low</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Variants List */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {variants.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <p>No size variants yet. Add variants to this product.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {variants.map((variant) => {
                const lowStock = (variant.stock || 0) <= 5;
                const displayPrice = variant.price !== null && variant.price !== undefined ? variant.price : product.price;
                const displayCost = variant.costPrice !== null && variant.costPrice !== undefined ? variant.costPrice : product.costPrice;

                return (
                  <div key={variant.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      {/* Variant Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 items-center justify-center font-semibold text-primary-600 dark:text-primary-400 text-xs shrink-0">
                            {(variant.label || variant.size || 'V').charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-sm">
                              {variant.label || [variant.size, variant.color].filter(Boolean).join(' / ') || `Variant ${variant.id}`}
                            </p>
                            <p className="text-xs text-gray-500">SKU: {variant.sku}</p>
                          </div>
                        </div>
                      </div>

                      {/* Barcode */}
                      <div className="text-xs text-gray-500 text-center">
                        <p className="text-xs text-gray-400">Barcode</p>
                        <p className="font-mono text-primary-600 dark:text-primary-400 font-semibold">{variant.barcode}</p>
                      </div>

                      {/* Stock */}
                      <div className="text-center">
                        <p className={`text-sm font-semibold ${lowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {variant.stock || 0}
                        </p>
                        <p className="text-xs text-gray-400">Stock</p>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary-600">{formatCurrency(displayPrice)}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(displayCost)} cost</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditVariant(product.id, variant)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400"
                          title="Edit variant"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDuplicateVariant(variant)}
                          className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded text-purple-600 dark:text-purple-400"
                          title="Duplicate variant"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteVariant(variant.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                          title="Delete variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

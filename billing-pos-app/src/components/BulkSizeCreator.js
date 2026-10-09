/**
 * BulkSizeCreator Component
 * Allows quick creation of multiple size variants at once
 */
import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CLOTHING_SIZES } from '../utils/variantUtils';
import toast from 'react-hot-toast';

export default function BulkSizeCreator({ products = [], onClose, onCreate }) {
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [customSize, setCustomSize] = useState('');
  const [defaultStock, setDefaultStock] = useState(5);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id?.toString() || '');

  useEffect(() => {
    if ((!selectedProductId || !products.some((p) => String(p.id) === String(selectedProductId))) && products.length > 0) {
      setSelectedProductId(products[0].id?.toString() || '');
      setSelectedSizes([]);
    }
  }, [products, selectedProductId]);

  const currentProduct = products.find((p) => String(p.id) === String(selectedProductId)) || null;
  const existingSizes = currentProduct && currentProduct.sizes && typeof currentProduct.sizes === 'object'
    ? Object.keys(currentProduct.sizes)
    : [];

  const toggleSize = (size) => {
    if (!currentProduct) {
      toast.error('Select a product first');
      return;
    }
    if (existingSizes.includes(size)) {
      toast.error(`${size} already exists for this product`);
      return;
    }
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const addCustomSize = () => {
    if (!currentProduct) {
      toast.error('Select a product first');
      return;
    }
    if (!customSize.trim()) return;
    const cleanSize = customSize.trim().toUpperCase();
    if (existingSizes.includes(cleanSize)) {
      toast.error(`${cleanSize} already exists for this product`);
      return;
    }
    if (!selectedSizes.includes(cleanSize)) {
      setSelectedSizes([...selectedSizes, cleanSize]);
      setCustomSize('');
    } else {
      toast.error('Size already selected');
    }
  };

  const handleCreate = () => {
    if (!currentProduct) {
      toast.error('Select a product first');
      return;
    }
    if (selectedSizes.length === 0) {
      toast.error('Select at least one size');
      return;
    }

    onCreate(selectedProductId, selectedSizes, parseInt(defaultStock) || 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Select Product</label>
        <select
          className="input w-full"
          value={selectedProductId}
          onChange={(e) => {
            setSelectedProductId(e.target.value);
            setSelectedSizes([]);
          }}
        >
          <option value="">Choose a product</option>
          {products.map((product) => (
            <option key={product.id} value={String(product.id)}>
              {product.name} {product.sku ? `(${product.sku})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Quick Size Selection</label>
        <div className="grid grid-cols-4 gap-2">
          {CLOTHING_SIZES.map(size => {
            const disabled = existingSizes.includes(size);
            const selected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                disabled={disabled}
                className={`py-2 px-3 rounded-lg font-medium transition-all ${
                  disabled ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : selected
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        {currentProduct && existingSizes.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">Existing sizes for {currentProduct.name}: {existingSizes.join(', ')}</p>
        )}
      </div>

      <div>
        <label className="label">Add Custom Size</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g., Free Size, One Size"
            value={customSize}
            onChange={e => setCustomSize(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addCustomSize()}
          />
          <button onClick={addCustomSize} className="btn-secondary"><Plus size={16} /></button>
        </div>
      </div>

      {selectedSizes.length > 0 && (
        <div>
          <label className="label">Selected Sizes</label>
          <div className="flex flex-wrap gap-2">
            {selectedSizes.map(size => (
              <div key={size} className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full">
                <span className="font-medium text-primary-700 dark:text-primary-300">{size}</span>
                <button
                  onClick={() => toggleSize(size)}
                  className="hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label">Default Stock per Size</label>
        <input
          className="input"
          type="number"
          min="0"
          value={defaultStock}
          onChange={e => setDefaultStock(e.target.value)}
          placeholder="Starting stock quantity"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={handleCreate} className="btn-primary flex-1 justify-center">
          Create {selectedSizes.length} Sizes
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">
          Cancel
        </button>
      </div>
    </div>
  );
}

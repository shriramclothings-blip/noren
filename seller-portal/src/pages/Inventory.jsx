import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';
import {
  Package, Search, AlertTriangle, TrendingDown, TrendingUp,
  Edit2, RefreshCw, Download, Upload, Plus, Minus, Check,
  ArrowUpDown, Filter, X, ChevronDown, BarChart3, Activity,
} from 'lucide-react';

const STOCK_LEVELS = {
  outOfStock: { label: 'Out of Stock', color: '#ef4444', bg: '#fef2f2', min: 0, max: 0 },
  critical: { label: 'Critical', color: '#f59e0b', bg: '#fffbeb', min: 1, max: 5 },
  low: { label: 'Low Stock', color: '#f59e0b', bg: '#fffbeb', min: 6, max: 10 },
  adequate: { label: 'Adequate', color: '#16a34a', bg: '#f0fdf4', min: 11, max: 50 },
  high: { label: 'High Stock', color: '#0891b2', bg: '#ecfeff', min: 51, max: Infinity },
};

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, stock-asc, stock-desc, price
  const [showFilters, setShowFilters] = useState(false);
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [stockUpdateModal, setStockUpdateModal] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalVariants: 0,
    totalStock: 0,
    outOfStock: 0,
    lowStock: 0,
    avgStockPerProduct: 0,
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching inventory from /seller/products...');
      const res = await api.get('/seller/products?limit=500');
      console.log('✅ Inventory API Response:', res.data);
      const productsData = res.data.data || [];
      console.log('📦 Inventory products count:', productsData.length);
      setProducts(productsData);
      calculateStats(productsData);
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
      toast.error(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    let totalVariants = 0;
    let totalStock = 0;
    let outOfStock = 0;
    let lowStock = 0;

    data.forEach(product => {
      if (product.variants && Array.isArray(product.variants)) {
        totalVariants += product.variants.length;
        product.variants.forEach(variant => {
          const stock = variant.stock || 0;
          totalStock += stock;
          if (stock === 0) outOfStock++;
          if (stock > 0 && stock <= 10) lowStock++;
        });
      }
    });

    setStats({
      totalProducts: data.length,
      totalVariants,
      totalStock,
      outOfStock,
      lowStock,
      avgStockPerProduct: data.length > 0 ? Math.round(totalStock / data.length) : 0,
    });
  };

  const getStockLevel = (stock) => {
    if (stock === 0) return STOCK_LEVELS.outOfStock;
    if (stock <= 5) return STOCK_LEVELS.critical;
    if (stock <= 10) return STOCK_LEVELS.low;
    if (stock <= 50) return STOCK_LEVELS.adequate;
    return STOCK_LEVELS.high;
  };

  const updateVariantStock = async (productId, variantId, operation, value) => {
    try {
      await api.patch(`/seller/products/${productId}/variants/${variantId}/stock`, {
        stock: value,
        operation, // 'set', 'add', 'subtract'
      });
      toast.success('Stock updated successfully');
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const bulkStockUpdate = async (operation, value) => {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }

    const promises = [];
    products
      .filter(p => selectedProducts.has(p.id))
      .forEach(product => {
        product.variants?.forEach(variant => {
          promises.push(
            api.patch(`/seller/products/${product.id}/variants/${variant.id}/stock`, {
              stock: value,
              operation,
            })
          );
        });
      });

    try {
      await Promise.all(promises);
      toast.success(`Updated ${promises.length} variants`);
      setSelectedProducts(new Set());
      setBulkUpdateMode(false);
      fetchInventory();
    } catch (err) {
      toast.error('Some updates failed');
    }
  };

  const exportInventory = () => {
    const csvData = [];
    csvData.push(['Product ID', 'Product Name', 'Size', 'Stock', 'Price', 'Status', 'Stock Level']);

    products.forEach(product => {
      product.variants?.forEach(variant => {
        const stockLevel = getStockLevel(variant.stock || 0);
        csvData.push([
          product.id,
          product.title,
          variant.size,
          variant.stock || 0,
          product.price,
          product.status,
          stockLevel.label,
        ]);
      });
    });

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Inventory exported');
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
      const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
      
      let matchesStock = true;
      if (stockFilter === 'out') matchesStock = totalStock === 0;
      else if (stockFilter === 'low') matchesStock = totalStock > 0 && totalStock <= 10;
      else if (stockFilter === 'adequate') matchesStock = totalStock > 10;

      return matchesSearch && matchesStock;
    })
    .sort((a, b) => {
      const aStock = a.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
      const bStock = b.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

      if (sortBy === 'stock-asc') return aStock - bStock;
      if (sortBy === 'stock-desc') return bStock - aStock;
      if (sortBy === 'price') return a.price - b.price;
      return a.title.localeCompare(b.title);
    });

  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 };

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
              Inventory Management
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Monitor and manage stock levels across all products
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {bulkUpdateMode && (
              <button
                onClick={() => {
                  setStockUpdateModal({ type: 'bulk' });
                }}
                disabled={selectedProducts.size === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: selectedProducts.size === 0 ? '#e5e7eb' : '#0891b2',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: selectedProducts.size === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <Edit2 size={14} /> Update Selected ({selectedProducts.size})
              </button>
            )}
            <button
              onClick={() => {
                setBulkUpdateMode(!bulkUpdateMode);
                setSelectedProducts(new Set());
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                background: bulkUpdateMode ? '#ef4444' : '#fff',
                color: bulkUpdateMode ? '#fff' : '#374151',
                border: bulkUpdateMode ? 'none' : '1px solid #e5e7eb',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {bulkUpdateMode ? <X size={14} /> : <Check size={14} />}
              {bulkUpdateMode ? 'Cancel Bulk' : 'Bulk Update'}
            </button>
            <button
              onClick={exportInventory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                background: '#fff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={fetchInventory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 8,
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          {[
            { label: 'Total Products', value: stats.totalProducts, icon: Package, color: '#0f172a' },
            { label: 'Total Variants', value: stats.totalVariants, icon: BarChart3, color: '#6366f1' },
            { label: 'Total Stock', value: stats.totalStock, icon: Activity, color: '#16a34a' },
            { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: '#ef4444' },
            { label: 'Low Stock', value: stats.lowStock, icon: TrendingDown, color: '#f59e0b' },
            { label: 'Avg Stock/Product', value: stats.avgStockPerProduct, icon: TrendingUp, color: '#0891b2' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <Search
                size={16}
                color="#9ca3af"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              style={{
                padding: '10px 32px 10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center #fff`,
              }}
            >
              <option value="all">All Stock Levels</option>
              <option value="out">Out of Stock</option>
              <option value="low">Low Stock (≤10)</option>
              <option value="adequate">Adequate Stock (&gt;10)</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '10px 32px 10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center #fff`,
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="stock-asc">Stock (Low to High)</option>
              <option value="stock-desc">Stock (High to Low)</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div style={{ ...card, padding: 40, textAlign: 'center' }}>
            <RefreshCw size={32} color="#d1d5db" className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>Loading inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 60 }}>
            <Package size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#374151' }}>
              No products found
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              Adjust your filters or add new products
            </p>
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  {bulkUpdateMode && (
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
                          } else {
                            setSelectedProducts(new Set());
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>
                    Product
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>
                    Variants
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                    Total Stock
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
                  const stockLevel = getStockLevel(totalStock);
                  const isSelected = selectedProducts.has(product.id);

                  return (
                    <tr
                      key={product.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: isSelected ? '#f0f9ff' : 'transparent',
                      }}
                    >
                      {bulkUpdateMode && (
                        <td style={{ padding: '14px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const newSet = new Set(selectedProducts);
                              if (e.target.checked) {
                                newSet.add(product.id);
                              } else {
                                newSet.delete(product.id);
                              }
                              setSelectedProducts(newSet);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              background: product.images?.[0]?.image_url
                                ? `url(${product.images[0].image_url}) center/cover`
                                : '#f3f4f6',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {!product.images?.[0]?.image_url && <Package size={20} color="#d1d5db" />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#111827',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {product.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                              ₹{Number(product.price).toLocaleString('en-IN')} • ID: {product.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {product.variants?.map(variant => {
                            const vLevel = getStockLevel(variant.stock || 0);
                            return (
                              <div
                                key={variant.id}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  background: vLevel.bg,
                                  border: `1px solid ${vLevel.color}30`,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: vLevel.color,
                                }}
                              >
                                {variant.size}: {variant.stock || 0}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 12px',
                            borderRadius: 999,
                            background: stockLevel.bg,
                            border: `1px solid ${stockLevel.color}30`,
                          }}
                        >
                          <span style={{ fontSize: 16, fontWeight: 800, color: stockLevel.color }}>
                            {totalStock}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: stockLevel.bg,
                            fontSize: 11,
                            fontWeight: 600,
                            color: stockLevel.color,
                          }}
                        >
                          {stockLevel.label}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setStockUpdateModal({ product, type: 'single' })}
                            style={{
                              padding: '8px 14px',
                              border: '1px solid #e5e7eb',
                              borderRadius: 6,
                              background: '#fff',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#374151',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Edit2 size={12} /> Update Stock
                          </button>
                          <button
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                            style={{
                              padding: '8px 14px',
                              border: 'none',
                              borderRadius: 6,
                              background: '#0f172a',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Update Modal */}
      {stockUpdateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 20,
          }}
          onClick={() => setStockUpdateModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              maxWidth: 540,
              width: '100%',
              padding: 24,
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                {stockUpdateModal.type === 'bulk' ? 'Bulk Stock Update' : `Update Stock - ${stockUpdateModal.product?.title}`}
              </h3>
              <button
                onClick={() => setStockUpdateModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color="#6b7280" />
              </button>
            </div>

            {stockUpdateModal.type === 'bulk' ? (
              <div>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
                  Apply stock changes to {selectedProducts.size} selected product(s)
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button
                    onClick={() => {
                      const val = prompt('Enter quantity to add:');
                      if (val && !isNaN(val)) {
                        bulkStockUpdate('add', parseInt(val));
                        setStockUpdateModal(null);
                      }
                    }}
                    style={{
                      padding: '14px 18px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Plus size={18} color="#16a34a" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Add Stock</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Increase stock for all variants</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const val = prompt('Enter quantity to subtract:');
                      if (val && !isNaN(val)) {
                        bulkStockUpdate('subtract', parseInt(val));
                        setStockUpdateModal(null);
                      }
                    }}
                    style={{
                      padding: '14px 18px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Minus size={18} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Reduce Stock</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Decrease stock for all variants</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const val = prompt('Enter new stock quantity:');
                      if (val && !isNaN(val)) {
                        bulkStockUpdate('set', parseInt(val));
                        setStockUpdateModal(null);
                      }
                    }}
                    style={{
                      padding: '14px 18px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Edit2 size={18} color="#0891b2" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Set Stock</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Set specific stock for all variants</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {stockUpdateModal.product?.variants?.map(variant => {
                  const vLevel = getStockLevel(variant.stock || 0);
                  return (
                    <div
                      key={variant.id}
                      style={{
                        padding: 16,
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Size: {variant.size}</div>
                          <div
                            style={{
                              fontSize: 12,
                              color: vLevel.color,
                              fontWeight: 600,
                              marginTop: 4,
                            }}
                          >
                            Current: {variant.stock || 0} • {vLevel.label}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          id={`stock-input-${variant.id}`}
                          defaultValue={variant.stock || 0}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            fontSize: 14,
                          }}
                        />
                        <button
                          onClick={() => {
                            const val = parseInt(document.getElementById(`stock-input-${variant.id}`).value);
                            if (!isNaN(val) && val >= 0) {
                              updateVariantStock(stockUpdateModal.product.id, variant.id, 'set', val);
                              setStockUpdateModal(null);
                            }
                          }}
                          style={{
                            padding: '10px 18px',
                            border: 'none',
                            borderRadius: 6,
                            background: '#0f172a',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </SellerLayout>
  );
}

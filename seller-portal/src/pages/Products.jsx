import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';
import {
  Plus, Edit2, Trash2, Eye, AlertCircle, Clock, CheckCircle,
  XCircle, Package, Search, Filter, ChevronDown, MoreVertical,
  TrendingUp, BarChart3, X,
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6', icon: Edit2 },
  pending_review: { label: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  approved: { label: 'Live', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
};

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, draft: 0, pending_review: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/seller/products?limit=100');
      setProducts(res.data.data || []);
      calculateStats(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      draft: data.filter(p => p.status === 'draft').length,
      pending_review: data.filter(p => p.status === 'pending_review').length,
      approved: data.filter(p => p.status === 'approved').length,
      rejected: data.filter(p => p.status === 'rejected').length,
    });
  };

  const handleDelete = async (product) => {
    if (product.status === 'approved') {
      setDeleteModal({ product, needsReason: true, reason: '' });
      return;
    }
    setDeleteModal({ product, needsReason: false, reason: '' });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { product, needsReason, reason } = deleteModal;

    try {
      if (needsReason) {
        // Live product - request removal
        await api.post(`/seller/products/${product.id}/remove`, { reason });
        toast.success('Removal request submitted. Admin will review your request.');
      } else {
        // Draft/rejected - direct delete
        await api.delete(`/seller/products/${product.id}`);
        toast.success('Product deleted successfully');
      }
      setDeleteModal(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSubmitForReview = async (productId) => {
    try {
      await api.post(`/seller/products/${productId}/submit`);
      toast.success('Product submitted for admin review!');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit product');
    }
  };

  const openStockModal = (product) => {
    setStockModal({ product, variants: [] });
    // Fetch variants
    api.get(`/seller/products/${product.id}`)
      .then(res => setStockModal(prev => ({ ...prev, variants: res.data.variants || [] })))
      .catch(() => toast.error('Failed to load variants'));
  };

  const updateStock = async (variantId, stock, operation = 'set') => {
    try {
      await api.patch(`/seller/products/${stockModal.product.id}/variants/${variantId}/stock`, {
        stock,
        operation,
      });
      toast.success('Stock updated');
      // Refresh variant data
      const res = await api.get(`/seller/products/${stockModal.product.id}`);
      setStockModal(prev => ({ ...prev, variants: res.data.variants || [] }));
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 };

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>My Products</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Manage your product listings, stock, and submissions.
            </p>
          </div>
          <button
            onClick={() => navigate('/products/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 22px',
              borderRadius: 9,
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add New Product
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { key: 'all', label: 'All Products', value: stats.total, color: '#111827', icon: Package },
            { key: 'draft', label: 'Draft', value: stats.draft, color: '#6b7280', icon: Edit2 },
            { key: 'pending_review', label: 'Pending', value: stats.pending_review, color: '#f59e0b', icon: Clock },
            { key: 'approved', label: 'Live', value: stats.approved, color: '#16a34a', icon: CheckCircle },
            { key: 'rejected', label: 'Rejected', value: stats.rejected, color: '#ef4444', icon: XCircle },
          ].map(({ key, label, value, color, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                ...card,
                cursor: 'pointer',
                borderColor: filter === key ? color : '#e5e7eb',
                borderWidth: 2,
                padding: '14px 16px',
                transition: 'all 0.2s',
                opacity: filter === key ? 1 : 0.75,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ ...card, height: 340, background: '#f8fafc' }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 60 }}>
            <Package size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#374151' }}>
              {search ? 'No products found' : 'No products yet'}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              {search ? 'Try adjusting your search' : 'Add your first product to get started'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/products/new')}
                style={{
                  marginTop: 20,
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#0f172a',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {filteredProducts.map(product => {
              const statusConfig = STATUS_CONFIG[product.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConfig.icon;
              const primaryImage = product.images?.[0] || null;
              const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

              return (
                <div key={product.id} style={{ ...card, padding: 0, position: 'relative', overflow: 'hidden' }}>
                  {/* Image */}
                  <div
                    style={{
                      width: '100%',
                      height: 200,
                      background: primaryImage ? `url(${primaryImage}) center/cover` : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {!primaryImage && <Package size={48} color="#d1d5db" />}
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <button
                        onClick={() => setActionMenu(actionMenu === product.id ? null : product.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.95)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        <MoreVertical size={16} color="#374151" />
                      </button>
                      {actionMenu === product.id && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 38,
                            right: 0,
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            minWidth: 160,
                            overflow: 'hidden',
                            zIndex: 10,
                          }}
                        >
                          <button
                            onClick={() => { navigate(`/products/${product.id}/edit`); setActionMenu(null); }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: 'none',
                              background: 'none',
                              textAlign: 'left',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#374151',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => { openStockModal(product); setActionMenu(null); }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: 'none',
                              background: 'none',
                              textAlign: 'left',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#374151',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <BarChart3 size={14} /> Manage Stock
                          </button>
                          {['draft', 'rejected'].includes(product.status) && (
                            <button
                              onClick={() => { handleSubmitForReview(product.id); setActionMenu(null); }}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#0891b2',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <TrendingUp size={14} /> Submit for Review
                            </button>
                          )}
                          <button
                            onClick={() => { handleDelete(product); setActionMenu(null); }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: 'none',
                              background: 'none',
                              textAlign: 'left',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              borderTop: '1px solid #f3f4f6',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: 16 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: statusConfig.bg,
                        marginBottom: 10,
                      }}
                    >
                      <StatusIcon size={11} color={statusConfig.color} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <h3
                      style={{
                        margin: '0 0 4px',
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {product.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
                          ₹{Number(product.price).toLocaleString('en-IN')}
                        </div>
                        {product.discount_percent > 0 && (
                          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                            {product.discount_percent}% OFF
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Stock</div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: totalStock > 10 ? '#16a34a' : totalStock > 0 ? '#f59e0b' : '#ef4444',
                          }}
                        >
                          {totalStock}
                        </div>
                      </div>
                    </div>
                    {product.admin_message && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 8,
                          borderRadius: 6,
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <AlertCircle size={12} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: '#991b1b', lineHeight: 1.4 }}>
                            {product.admin_message}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && (
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
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              maxWidth: 440,
              width: '100%',
              padding: 24,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                {deleteModal.needsReason ? 'Request Product Removal' : 'Delete Product'}
              </h3>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color="#6b7280" />
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
              {deleteModal.needsReason
                ? 'This product is currently live and generating sales. You need admin approval to remove it. Please provide a reason for removal.'
                : 'Are you sure you want to delete this product? This action cannot be undone.'}
            </p>
            {deleteModal.needsReason && (
              <textarea
                placeholder="Reason for removal (required)"
                value={deleteModal.reason}
                onChange={e => setDeleteModal({ ...deleteModal, reason: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14,
                  resize: 'vertical',
                  marginBottom: 16,
                  fontFamily: 'inherit',
                }}
              />
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteModal.needsReason && !deleteModal.reason.trim()}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: deleteModal.needsReason && !deleteModal.reason.trim() ? '#d1d5db' : '#ef4444',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: deleteModal.needsReason && !deleteModal.reason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {deleteModal.needsReason ? 'Submit Request' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Management Modal */}
      {stockModal && (
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
          onClick={() => setStockModal(null)}
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
                Manage Stock - {stockModal.product.title}
              </h3>
              <button
                onClick={() => setStockModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color="#6b7280" />
              </button>
            </div>

            {stockModal.variants.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', padding: 20 }}>
                No variants found for this product.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {stockModal.variants.map(variant => (
                  <div
                    key={variant.id}
                    style={{
                      padding: 16,
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                        Size: {variant.size}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        Current Stock: <strong>{variant.stock}</strong>
                      </div>
                      {variant.extra_price > 0 && (
                        <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>
                          +₹{variant.extra_price}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        id={`stock-${variant.id}`}
                        style={{
                          width: 70,
                          padding: '8px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          fontSize: 14,
                          textAlign: 'center',
                        }}
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(document.getElementById(`stock-${variant.id}`).value);
                          if (!isNaN(val) && val >= 0) updateStock(variant.id, val, 'set');
                        }}
                        style={{
                          padding: '8px 14px',
                          border: 'none',
                          borderRadius: 6,
                          background: '#0f172a',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#15803d', lineHeight: 1.5 }}>
                <strong>Tip:</strong> Enter quantity and click "Set" to update stock levels. Stock changes are reflected immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Plus, X, Upload, Pencil, Star as StarIcon, CheckSquare, Square, Zap, Filter, TrendingUp, Award, Eye, EyeOff } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MAX_IMAGES = 10;
const MAX_SIZE_MB = 5;
const blank = { title: '', description: '', price: '', discount_percent: '', category_id: '', gender: 'men' };
const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

// Compute which homepage sections a product currently appears in
function getProductSections(p) {
  const sections = [];
  if (p.is_featured)                                          sections.push({ label: 'Signature',        color: '#fef9c3', text: '#854d0e' });
  if (p.is_trending && p.gender !== 'women')                 sections.push({ label: 'Trending Men',     color: '#fee2e2', text: '#991b1b' });
  if (p.is_trending && (p.gender === 'women' || p.gender === 'unisex')) sections.push({ label: 'Trending Women', color: '#fce7f3', text: '#be185d' });
  if (p.gender !== 'women')                                  sections.push({ label: 'New Arrivals',     color: '#f0fdf4', text: '#166534' });
  if (p.gender === 'women')                                  sections.push({ label: "Women's New",      color: '#fdf4ff', text: '#7e22ce' });
  if (p.category_slug === 'kurtis' && p.gender === 'women') sections.push({ label: 'Ethnic Women',     color: '#fff7ed', text: '#c2410c' });
  if (p.category_slug === 'dresses' && p.gender === 'women')sections.push({ label: 'Western Women',    color: '#eff6ff', text: '#1d4ed8' });
  return sections;
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState([]); // File objects for new upload
  const [previews, setPreviews] = useState([]); // Preview URLs for new images
  const [existingImages, setExistingImages] = useState([]); // Existing images from DB (when editing)
  const [primaryIdx, setPrimaryIdx] = useState(0); // Which image is primary (0-based)
  const [sizes, setSizes] = useState([{ size: 'M', stock: 10 }]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState(new Set()); // selected product IDs for bulk actions
  const [statusFilter, setStatusFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState(''); // 'featured' | 'trending' | ''
  const [bulkLoading, setBulkLoading] = useState(false);
  const LIMIT = 15;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search)       p.set('search', search);
      if (genderFilter) p.set('gender', genderFilter);
      if (statusFilter) p.set('status', statusFilter);
      if (flagFilter === 'featured') p.set('featured', 'true');
      if (flagFilter === 'trending') p.set('trending', 'true');
      const res = await api.get(`/admin/products?${p}`);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [page, search, genderFilter, statusFilter, flagFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search, genderFilter, statusFilter, flagFilter]);
  useEffect(() => { api.get('/products/categories').then(r => setCategories(r.data)).catch(() => {}); }, []);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.id)));
    }
  };

  // Bulk action: apply a field value to all selected products
  const bulkAction = async (field, value, label) => {
    if (!selected.size) return toast.error('Select at least one product');
    if (!confirm(`Apply "${label}" to ${selected.size} selected product(s)?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map(id => api.put(`/admin/products/${id}`, { [field]: value })));
      toast.success(`${label} applied to ${selected.size} product(s)`);
      fetchProducts();
    } catch { toast.error('Bulk action failed'); }
    finally { setBulkLoading(false); }
  };

  const bulkDelete = async () => {
    if (!selected.size) return toast.error('Select at least one product');
    if (!confirm(`Permanently delete ${selected.size} selected product(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/admin/products/${id}`)));
      toast.success(`${selected.size} product(s) deleted`);
      fetchProducts();
    } catch { toast.error('Bulk delete failed'); }
    finally { setBulkLoading(false); }
  };
  const openAdd = () => {
    setEditProduct(null); setForm(blank);
    setImages([]); setPreviews([]); setExistingImages([]); setPrimaryIdx(0);
    setSizes([{ size: 'M', stock: 10 }]);
    setShowForm(true);
  };

  const openEdit = async (product) => {
    setEditProduct(product);
    setForm({ title: product.title, description: product.description || '', price: product.price, discount_percent: product.discount_percent || '', category_id: product.category_id || '', gender: product.gender || 'men' });
    setImages([]); setPreviews([]);
    try {
      const res = await api.get(`/products/${product.id}`);
      setExistingImages(res.data.images || []);
      const primaryIndex = (res.data.images || []).findIndex(img => img.is_primary);
      setPrimaryIdx(primaryIndex >= 0 ? primaryIndex : 0);
      const variants = res.data.variants || [];
      setSizes(variants.length ? variants.map(v => ({ size: v.size, stock: v.stock })) : [{ size: 'M', stock: 10 }]);
    } catch { setSizes([{ size: 'M', stock: 10 }]); setExistingImages([]); }
    setShowForm(true);
  };

  const handleFiles = (files) => {
    const totalImages = (existingImages.length || 0) + images.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - (existingImages.length + images.length)} more.`);
      return;
    }
    const validFiles = [];
    for (const f of files) {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} exceeds ${MAX_SIZE_MB}MB limit`);
        continue;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)) {
        toast.error(`${f.name} is not a valid image format`);
        continue;
      }
      validFiles.push(f);
    }
    setImages(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const removeNewImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = async (imgId) => {
    if (!confirm('Delete this image?')) return;
    try {
      await api.delete(`/products/${editProduct.id}/images/${imgId}`);
      setExistingImages(prev => prev.filter(img => img.id !== imgId));
      toast.success('Image deleted');
    } catch { toast.error('Failed to delete image'); }
  };

  const setAsPrimary = async (imgId) => {
    try {
      await api.put(`/products/${editProduct.id}/images/${imgId}/primary`);
      setExistingImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imgId })));
      toast.success('Primary image updated');
    } catch { toast.error('Failed'); }
  };

  const addSize = () => {
    const used = sizes.map(s => s.size);
    const next = SIZES.find(s => !used.includes(s));
    if (!next) return toast.error('All sizes already added');
    setSizes(prev => [...prev, { size: next, stock: 10 }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalImgs = (existingImages.length || 0) + images.length;
    if (!editProduct && !images.length) return toast.error('Please add at least one image');
    if (totalImgs === 0) return toast.error('Product must have at least one image');
    if (!sizes.length) return toast.error('Please add at least one size');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      images.forEach(img => fd.append('images', img));
      fd.append('sizes', JSON.stringify(sizes));

      if (editProduct) {
        await api.put(`/admin/products/${editProduct.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated!');
      } else {
        await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product added!');
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally { setSaving(false); }
  };

  const toggle = async (id, field, currentVal) => {
    try {
      // Use admin route so all admin roles can toggle featured/trending
      await api.put(`/admin/products/${id}`, { [field]: !currentVal });
      fetchProducts();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product permanently?')) return;
    try { await api.delete(`/admin/products/${id}`); toast.success('Product deleted'); fetchProducts(); }
    catch { toast.error('Failed to delete'); }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const totalImageCount = (existingImages.length || 0) + images.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Row 1: search + filters + add button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                style={{ ...inp, paddingLeft: 32, width: 200 }} />
            </div>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} style={{ ...inp, width: 120 }}>
              <option value="">All Genders</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: 130 }}>
              <option value="">All Status</option>
              <option value="approved">✓ Live</option>
              <option value="pending">⏳ Pending</option>
              <option value="rejected">✗ Rejected</option>
            </select>
            <select value={flagFilter} onChange={e => setFlagFilter(e.target.value)} style={{ ...inp, width: 140 }}>
              <option value="">All Products</option>
              <option value="featured">⭐ Featured Only</option>
              <option value="trending">🔥 Trending Only</option>
            </select>
          </div>
          <button onClick={openAdd} className="btn-orange" style={{ padding: '9px 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Plus size={14} /> Add Product
          </button>
        </div>

        {/* Row 2: bulk action bar — shown when products are selected */}
        {selected.size > 0 && (
          <div style={{ background: '#1a1a18', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#c9a96e', flexShrink: 0 }}>
              {selected.size} selected
            </span>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>Bulk Actions:</span>
            {[
              { label: '⭐ Mark Featured',    field: 'is_featured', value: true  },
              { label: '✕ Remove Featured',   field: 'is_featured', value: false },
              { label: '🔥 Mark Trending',    field: 'is_trending', value: true  },
              { label: '✕ Remove Trending',   field: 'is_trending', value: false },
              { label: '✓ Approve All',       field: 'status',      value: 'approved' },
            ].map(a => (
              <button key={a.label} onClick={() => bulkAction(a.field, a.value, a.label)} disabled={bulkLoading}
                style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#faf9f7', fontSize: 12, fontWeight: 600, cursor: bulkLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: bulkLoading ? 0.5 : 1 }}>
                {a.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={bulkDelete} disabled={bulkLoading}
              style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.5)', background: 'transparent', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: bulkLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              🗑 Delete Selected
            </button>
            <button onClick={() => setSelected(new Set())}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{editProduct ? 'Edit Product' : 'Add New Product'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}><X size={18} /></button>
          </div>

          {/* Image Upload Zone */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
                Product Images ({totalImageCount}/{MAX_IMAGES})
              </span>
              {totalImageCount < MAX_IMAGES && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#c9a96e', cursor: 'pointer' }}>
                  <Upload size={13} /> Upload
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={handleFileInput} />
                </label>
              )}
            </div>

            {/* Drag-drop zone */}
            {totalImageCount < MAX_IMAGES && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ border: `2px dashed ${dragOver ? '#c9a96e' : '#e5e7eb'}`, borderRadius: 12, padding: '24px', textAlign: 'center', background: dragOver ? '#fff7ed' : '#f9fafb', transition: 'all 0.2s', marginBottom: 12 }}>
                <Upload size={28} color={dragOver ? '#c9a96e' : '#9ca3af'} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: dragOver ? '#c9a96e' : '#6b7280', fontWeight: 600, marginBottom: 4 }}>
                  {dragOver ? 'Drop images here' : 'Drag & drop images here'}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af' }}>or click "Upload" button above ?? Max {MAX_IMAGES} images ?? JPG, PNG, WEBP ?? {MAX_SIZE_MB}MB each</p>
              </div>
            )}

            {/* Image grid */}
            {(existingImages.length > 0 || previews.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {/* Existing images (when editing) */}
                {existingImages.map((img, i) => (
                  <div key={img.id} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', border: img.is_primary ? '2px solid #c9a96e' : '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {img.is_primary && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: '#c9a96e', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        PRIMARY
                      </span>
                    )}
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {!img.is_primary && (
                        <button type="button" onClick={() => setAsPrimary(img.id)} title="Set as primary"
                          style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.95)', color: '#c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                          <StarIcon size={11} />
                        </button>
                      )}
                      <button type="button" onClick={() => removeExistingImage(img.id)} title="Delete"
                        style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.95)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* New images (to be uploaded) */}
                {previews.map((src, i) => (
                  <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', border: (existingImages.length === 0 && i === primaryIdx) ? '2px solid #c9a96e' : '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {existingImages.length === 0 && i === 0 && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: '#c9a96e', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        PRIMARY
                      </span>
                    )}
                    <button type="button" onClick={() => removeNewImage(i)} title="Remove"
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.95)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalImageCount === 0 && !editProduct && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}> At least 1 image required</p>
            )}
          </div>

          {/* Fields */}
          <div className="form-grid-2">
            <div className="col-span-2">
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Product Title *" style={inp} />
            </div>
            <div className="col-span-2">
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
            <input required type="number" min="1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="Price () *" style={inp} />
            <input type="number" min="0" max="90" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: e.target.value }))} placeholder="Discount %" style={inp} />
            <div className="col-span-2">
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} style={inp}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.gender ? ` (${c.gender})` : ''}</option>)}
              </select>
            </div>
            <div>
              <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} style={inp}>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Sizes & Stock</span>
              <button type="button" onClick={addSize} style={{ fontSize: 12, color: '#c9a96e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Plus size={12} /> Add Size
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sizes.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={s.size} onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, size: e.target.value } : x))} style={{ ...inp, width: 80 }}>
                    {SIZES.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                  <input type="number" min="0" value={s.stock} onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, stock: e.target.value } : x))} placeholder="Stock" style={{ ...inp, flex: 1 }} />
                  <button type="button" onClick={() => setSizes(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', padding: 4 }}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Products Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '10px 14px', width: 36 }}>
                  <input type="checkbox"
                    checked={products.length > 0 && selected.size === products.length}
                    onChange={toggleSelectAll}
                    style={{ accentColor: '#c9a96e', width: 15, height: 15, cursor: 'pointer' }} />
                </th>
                {['Product', 'Category', 'Gender', 'Price', 'Status', 'Appears In Sections', 'Featured', 'Trending', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={10} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                ))
              ) : products.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #f9fafb', background: selected.has(p.id) ? '#fffbeb' : 'transparent' }}
                  onMouseEnter={e => { if (!selected.has(p.id)) e.currentTarget.style.background = '#fafafa'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selected.has(p.id) ? '#fffbeb' : 'transparent'; }}>
                  {/* Checkbox */}
                  <td style={{ padding: '10px 14px' }}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                      style={{ accentColor: '#c9a96e', width: 15, height: 15, cursor: 'pointer' }} />
                  </td>
                  {/* Product */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={p.primary_image || 'https://placehold.co/40x48/f9fafb/9ca3af?text=IMG'} alt=""
                        style={{ width: 38, height: 46, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#111827', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>ID #{p.id}</div>
                      </div>
                    </div>
                  </td>
                  {/* Category */}
                  <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>{p.category_name || '—'}</td>
                  {/* Gender */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 600, background: p.gender === 'women' ? '#fce7f3' : p.gender === 'unisex' ? '#e0f2fe' : '#f0fdf4', color: p.gender === 'women' ? '#be185d' : p.gender === 'unisex' ? '#0369a1' : '#15803d' }}>
                      {p.gender === 'women' ? 'Women' : p.gender === 'unisex' ? 'Unisex' : 'Men'}
                    </span>
                  </td>
                  {/* Price */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>₹{p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : p.price}</span>
                    {p.discount_percent > 0 && <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through', marginLeft: 4 }}>₹{p.price}</span>}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 600, background: p.status === 'approved' ? '#f0fdf4' : p.status === 'rejected' ? '#fef2f2' : '#fefce8', color: p.status === 'approved' ? '#15803d' : p.status === 'rejected' ? '#dc2626' : '#a16207' }}>
                      {p.status === 'approved' ? '✓ Live' : p.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                    </span>
                    {p.status === 'pending' && (
                      <button onClick={async () => { try { await api.put(`/admin/products/${p.id}`, { status: 'approved' }); fetchProducts(); toast.success('Approved!'); } catch { toast.error('Failed'); } }}
                        style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#15803d', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Approve
                      </button>
                    )}
                  </td>
                  {/* Sections this product appears in */}
                  <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {getProductSections(p).length === 0 ? (
                        <span style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>None</span>
                      ) : getProductSections(p).map(sec => (
                        <span key={sec.label} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: sec.color, color: sec.text, whiteSpace: 'nowrap' }}>
                          {sec.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Featured toggle */}
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(p.id, 'is_featured', p.is_featured)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: p.is_featured ? '#fef9c3' : '#f3f4f6', color: p.is_featured ? '#854d0e' : '#9ca3af', whiteSpace: 'nowrap' }}>
                      {p.is_featured ? '⭐ Featured' : '+ Feature'}
                    </button>
                  </td>
                  {/* Trending toggle */}
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(p.id, 'is_trending', p.is_trending)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: p.is_trending ? '#fee2e2' : '#f3f4f6', color: p.is_trending ? '#991b1b' : '#9ca3af', whiteSpace: 'nowrap' }}>
                      {p.is_trending ? '🔥 Trending' : '+ Trending'}
                    </button>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(p)} title="Edit product"
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} title="Delete product"
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !products.length && (
                <tr><td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No products found. Try adjusting your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{total} products</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
              <span style={{ padding: '5px 10px', color: '#6b7280' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, X, Plus, ArrowLeft, Send, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';

const inp = { width: '100%', padding: '10px 13px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box' };
const Lbl = ({ children, required }) => <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</label>;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'];

export default function ProductForm() {
  const navigate    = useNavigate();
  const { id }      = useParams(); // edit mode if id present
  const isEdit      = Boolean(id);
  const fileRef     = useRef(null);

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', gender: 'men',
    price: '', discount_percent: '0', brand: '',
    fabric: '', care_instructions: '', return_policy: '', shipping_days: '5',
  });
  const [variants, setVariants]     = useState([{ size: 'M', stock: '10', extra_price: '0' }]);
  const [images, setImages]         = useState([]);   // File objects for new upload
  const [previews, setPreviews]     = useState([]);   // Preview URLs
  const [existingImages, setExistingImages] = useState([]);  // from server when editing
  const [saving, setSaving]         = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Load categories
  useEffect(() => {
    api.get('/products/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  // Load existing product if editing
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/seller/products?page=1&limit=100`).then(r => {
      const prod = r.data.products.find(p => String(p.id) === id);
      if (!prod) { toast.error('Product not found'); navigate('/products'); return; }
      setForm({
        title: prod.title || '',
        description: prod.description || '',
        category_id: prod.category_id || '',
        gender: prod.gender || 'men',
        price: prod.price || '',
        discount_percent: prod.discount_percent || '0',
        brand: prod.brand || '',
        fabric: prod.fabric || '',
        care_instructions: prod.care_instructions || '',
        return_policy: prod.return_policy || '',
        shipping_days: prod.shipping_days || '5',
      });
      if (Array.isArray(prod.variants) && prod.variants.length) {
        setVariants(prod.variants.map(v => ({ size: v.size, stock: String(v.stock), extra_price: String(v.extra_price || 0) })));
      }
      if (Array.isArray(prod.images) && prod.images.length) {
        setExistingImages(prod.images);
      }
    }).catch(() => toast.error('Failed to load product'));
  }, [id, isEdit, navigate]);

  const onImageChange = (e) => {
    const files = Array.from(e.target.files);
    const total = images.length + existingImages.length + files.length;
    if (total > 10) { toast.error('Max 10 images'); return; }
    const newPrevs = files.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...newPrevs]);
    e.target.value = '';
  };

  const removeNewImage = (i) => {
    URL.revokeObjectURL(previews[i]);
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const addVariant = () => {
    if (variants.length >= 7) return toast.error('Max 7 variants');
    setVariants(prev => [...prev, { size: 'M', stock: '0', extra_price: '0' }]);
  };
  const removeVariant = (i) => setVariants(prev => prev.filter((_, idx) => idx !== i));
  const setVariant = (i, k, v) => setVariants(prev => prev.map((va, idx) => idx === i ? { ...va, [k]: v } : va));

  const buildFormData = () => {
    if (!form.title) { toast.error('Product title is required'); return null; }
    if (!form.price || isNaN(form.price)) { toast.error('Valid price is required'); return null; }
    if (images.length === 0 && existingImages.length === 0) { toast.error('At least one image required'); return null; }
    if (variants.length === 0) { toast.error('At least one size variant required'); return null; }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
    fd.append('variants', JSON.stringify(variants.map(v => ({ size: v.size, stock: parseInt(v.stock) || 0, extra_price: parseFloat(v.extra_price) || 0 }))));
    images.forEach(f => fd.append('images', f));
    return fd;
  };

  const save = async (andSubmit = false) => {
    const fd = buildFormData();
    if (!fd) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/seller/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product saved');
      } else {
        const r = await api.post('/seller/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (andSubmit) {
          await api.post(`/seller/products/${r.data.product.id}/submit`);
          toast.success('Product submitted for review!');
        } else {
          toast.success('Product saved as draft');
        }
      }
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const submitForReview = async () => {
    if (!isEdit) { await save(true); return; }
    setSubmitting(true);
    try {
      await api.post(`/seller/products/${id}/submit`);
      toast.success('Submitted for review!');
      navigate('/products');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const section = (title, children) => (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</h3>
      {children}
    </div>
  );

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/products')} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>Fill all details and submit for NOREN admin review.</p>
          </div>
        </div>

        {/* Images */}
        {section('Product Images', (
          <div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              {/* Existing images */}
              {existingImages.map((img, i) => (
                <div key={img.id} style={{ position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: `2px solid ${i === 0 ? '#c9a96e' : '#e5e7eb'}` }}>
                  <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === 0 && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 9, background: 'rgba(201,169,110,0.9)', color: '#fff', padding: '2px 0', fontWeight: 700 }}>PRIMARY</span>}
                </div>
              ))}
              {/* New image previews */}
              {previews.map((url, i) => (
                <div key={url} style={{ position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removeNewImage(i)} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ))}
              {/* Upload button */}
              {(images.length + existingImages.length) < 10 && (
                <button onClick={() => fileRef.current?.click()} style={{ width: 90, height: 90, borderRadius: 8, border: '2px dashed #d1d5db', background: '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#9ca3af' }}>
                  <Upload size={18} />
                  <span style={{ fontSize: 10, fontWeight: 600 }}>Add</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onImageChange} />
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>First image = primary. Max 10 images. JPG/PNG/WEBP, max 5MB each.</p>
          </div>
        ))}

        {/* Basic Info */}
        {section('Product Details', (
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <Lbl required>Product Title</Lbl>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Premium Cotton Kurta Set" style={inp} />
            </div>
            <div>
              <Lbl>Description</Lbl>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe your product — fabric, occasion, fit…" style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Lbl>Category</Lbl>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={inp}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Gender</Lbl>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inp}>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="unisex">Unisex</option>
                  <option value="kids">Kids</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <Lbl required>Price (₹)</Lbl>
                <input type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="999" style={inp} />
              </div>
              <div>
                <Lbl>Discount (%)</Lbl>
                <input type="number" min="0" max="90" value={form.discount_percent} onChange={e => set('discount_percent', e.target.value)} placeholder="0" style={inp} />
              </div>
              <div>
                <Lbl>Shipping Days</Lbl>
                <input type="number" min="1" max="30" value={form.shipping_days} onChange={e => set('shipping_days', e.target.value)} placeholder="5" style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Lbl>Brand</Lbl>
                <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Aryan Fashion" style={inp} />
              </div>
              <div>
                <Lbl>Fabric / Material</Lbl>
                <input value={form.fabric} onChange={e => set('fabric', e.target.value)} placeholder="e.g. 100% Cotton" style={inp} />
              </div>
            </div>
            <div>
              <Lbl>Care Instructions</Lbl>
              <input value={form.care_instructions} onChange={e => set('care_instructions', e.target.value)} placeholder="e.g. Machine wash cold, do not tumble dry" style={inp} />
            </div>
            <div>
              <Lbl>Return Policy</Lbl>
              <input value={form.return_policy} onChange={e => set('return_policy', e.target.value)} placeholder="e.g. 7-day return accepted" style={inp} />
            </div>
          </div>
        ))}

        {/* Variants */}
        {section('Sizes & Stock', (
          <div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {variants.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={v.size} onChange={e => setVariant(i, 'size', e.target.value)} style={{ ...inp, width: 90 }}>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="number" min="0" value={v.stock} onChange={e => setVariant(i, 'stock', e.target.value)} placeholder="Stock" style={{ ...inp, width: 100 }} />
                  <input type="number" min="0" value={v.extra_price} onChange={e => setVariant(i, 'extra_price', e.target.value)} placeholder="Extra ₹" style={{ ...inp, width: 100 }} />
                  <button onClick={() => removeVariant(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, flexShrink: 0 }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addVariant} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: '1.5px dashed #d1d5db', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> Add Size
            </button>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9ca3af' }}>Size · Stock units · Extra price (0 = no extra charge)</p>
          </div>
        ))}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => save(false)} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 9, border: '1.5px solid #0f172a', background: '#fff', color: '#0f172a', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={submitForReview} disabled={saving || submitting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 9, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || submitting) ? 0.7 : 1 }}>
            <Send size={14} /> {submitting ? 'Submitting…' : 'Save & Submit for Review'}
          </button>
        </div>
      </div>
    </SellerLayout>
  );
}

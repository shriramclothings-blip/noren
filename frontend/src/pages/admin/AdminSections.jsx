import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Zap, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, Star, TrendingUp, ExternalLink } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Maps each section type to the API query that fetches its products
const SECTION_QUERY = {
  new_arrivals:      { limit: 8, sort: 'newest' },
  featured_products: { limit: 8, featured: 'true' },
  trending_products: { limit: 8, trending: 'true' },
  best_sellers:      { limit: 8, sort: 'popular' },
  women_new_arrivals:{ limit: 8, gender: 'women', sort: 'newest' },
  women_best_sellers:{ limit: 8, gender: 'women', sort: 'popular' },
  women_trending:    { limit: 8, gender: 'women', trending: 'true' },
  women_ethnic:      { limit: 8, gender: 'women', category: 'kurtis' },
  women_western:     { limit: 8, gender: 'women', category: 'dresses' },
};

// Human-readable explanation of how each section picks products
const SECTION_HOW = {
  new_arrivals:      'Shows the 8 most recently added products (any gender).',
  featured_products: 'Shows products with ⭐ Featured flag turned ON.',
  trending_products: 'Shows products with 🔥 Trending flag turned ON (Men).',
  best_sellers:      'Shows products sorted by most views (Men).',
  women_new_arrivals:'Shows the 8 most recently added Women\'s products.',
  women_best_sellers:'Shows Women\'s products sorted by most views.',
  women_trending:    'Shows Women\'s products with 🔥 Trending flag ON.',
  women_ethnic:      'Shows Women\'s products in the Kurtis category.',
  women_western:     'Shows Women\'s products in the Dresses category.',
  categories:        'Automatically shows all active product categories.',
  offer_banner:      'Static editorial banner — uses the Title and Subtitle you set.',
  women_collection_banner: 'Static Women\'s promo banner — no products.',
  reels:             'Shows active Reels from the Reels tab.',
};

const SECTION_TYPES = [
  { value: 'new_arrivals',           label: '🆕 New Arrivals',                desc: 'Latest products sorted by date' },
  { value: 'featured_products',      label: '⭐ Featured / Signature',        desc: 'Products marked as featured' },
  { value: 'trending_products',      label: '🔥 Trending Now',                desc: 'Products marked as trending (Men)' },
  { value: 'best_sellers',           label: '🏆 Best Sellers',                desc: 'Most popular products (Men)' },
  { value: 'categories',             label: '📂 Shop by Category',            desc: 'Gender-tabbed category grid' },
  { value: 'offer_banner',           label: '📣 Editorial / Offer Banner',    desc: 'Full-width dark quote banner' },
  { value: 'women_collection_banner',label: '👗 Women\'s Collection Banner',  desc: 'Dark promo banner for Women\'s section' },
  { value: 'women_new_arrivals',     label: '👗 Women — New Arrivals',        desc: 'Latest products for women' },
  { value: 'women_best_sellers',     label: '👗 Women — Best Sellers',        desc: 'Most popular products for women' },
  { value: 'women_trending',         label: '👗 Women — Trending',            desc: 'Trending products for women' },
  { value: 'women_ethnic',           label: '👗 Women — Ethnic Collection',   desc: 'Kurtis, suits, ethnic wear' },
  { value: 'women_western',          label: '👗 Women — Western Collection',  desc: 'Dresses, tops, western wear' },
  { value: 'reels',                  label: '🎬 Reels / Videos',              desc: 'Short vertical video shop-the-look section' },
  { value: 'video_section',          label: '📽️ Horizontal Video Section',    desc: 'Full-width cinematic video player (16:9)' },
  { value: 'mid_banner',             label: '🎯 Mid-Page Banner',              desc: 'Full-width banner slider in the middle of homepage' },
];

const DEFAULT_SECTIONS = [
  { type: 'categories',             title: 'The Collections',        subtitle: '',                               sort_order: 1 },
  { type: 'new_arrivals',           title: 'New Arrivals',           subtitle: 'Just dropped for you',           sort_order: 2 },
  { type: 'offer_banner',           title: 'Crafted Beyond Trends.', subtitle: 'Wear confidence. Designed to endure. Modern heritage for every journey.', sort_order: 3 },
  { type: 'featured_products',      title: 'Signature Collection',   subtitle: 'Handpicked by our team',         sort_order: 4 },
  { type: 'mid_banner',             title: 'Mid-Page Banner',        subtitle: '',                               sort_order: 5 },
  { type: 'women_collection_banner',title: '',                       subtitle: '',                               sort_order: 6 },
  { type: 'women_new_arrivals',     title: "Women's New Arrivals",   subtitle: '',                               sort_order: 7 },
  { type: 'trending_products',      title: 'Trending Now',           subtitle: '',                               sort_order: 8 },
  { type: 'women_trending',         title: 'Trending in Women',      subtitle: '',                               sort_order: 9 },
  { type: 'women_ethnic',           title: 'Ethnic Wear for Women',  subtitle: '',                               sort_order: 10 },
  { type: 'best_sellers',           title: 'Best Sellers',           subtitle: '',                               sort_order: 11 },
  { type: 'women_western',          title: "Women's Western Collection", subtitle: '',                           sort_order: 12 },
  { type: 'reels',                  title: 'Shop the Look',          subtitle: '',                               sort_order: 13 },
];

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const blank = { type: 'new_arrivals', title: '', subtitle: '', sort_order: 0, is_active: true, config: {} };

/* ── Section Products Panel ─────────────────────────────── */
function SectionProducts({ section }) {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState(null);

  const query = SECTION_QUERY[section.type];

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    const p = new URLSearchParams(query);
    api.get(`/products?${p}`)
      .then(r => setProducts(r.data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [section.type]);

  const toggleFlag = async (product, field) => {
    setToggling(product.id + field);
    try {
      await api.put(`/admin/products/${product.id}`, { [field]: !product[field] });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, [field]: !p[field] } : p));
      toast.success(`${field === 'is_featured' ? 'Featured' : 'Trending'} ${!product[field] ? 'ON' : 'OFF'} for "${product.title}"`);
    } catch { toast.error('Failed to update'); }
    finally { setToggling(null); }
  };

  if (!query) {
    return (
      <div style={{ padding: '16px 20px', background: '#f9fafb', borderRadius: 10, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
        <strong>How this section works:</strong> {SECTION_HOW[section.type] || 'This section has no product list.'}
      </div>
    );
  }

  return (
    <div>
      {/* How it works info */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#0369a1', marginBottom: 14, lineHeight: 1.6 }}>
        <strong>How products are selected:</strong> {SECTION_HOW[section.type]}
        {(section.type === 'featured_products' || section.type === 'trending_products' || section.type === 'women_trending') && (
          <span style={{ marginLeft: 6, color: '#0369a1' }}>
            — Toggle the flags below to add/remove products from this section.
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ width: 80, height: 100, borderRadius: 8 }} />)}
        </div>
      ) : products.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 8 }}>
          No products in this section yet.
          {section.type === 'featured_products' && ' Go to Products and toggle ⭐ Featured on products.'}
          {section.type === 'trending_products' && ' Go to Products and toggle 🔥 Trending on products.'}
          {section.type === 'women_trending'    && ' Go to Products and toggle 🔥 Trending on Women\'s products.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(p => {
            const isFeaturedSection = section.type === 'featured_products';
            const isTrendingSection = ['trending_products','women_trending'].includes(section.type);
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #f3f4f6', borderRadius: 10, padding: '8px 12px' }}>
                <img src={p.primary_image || 'https://placehold.co/44x52/f9fafb/9ca3af?text=IMG'} alt=""
                  style={{ width: 40, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                    ₹{p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : p.price}
                    {p.category_name ? ` · ${p.category_name}` : ''}
                    {p.gender ? ` · ${p.gender}` : ''}
                  </div>
                </div>
                {/* Featured toggle */}
                <button
                  onClick={() => toggleFlag(p, 'is_featured')}
                  disabled={toggling === p.id + 'is_featured'}
                  title={p.is_featured ? 'Remove from Featured' : 'Add to Featured'}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: p.is_featured ? '#fef9c3' : '#f3f4f6', color: p.is_featured ? '#854d0e' : '#9ca3af', opacity: toggling === p.id + 'is_featured' ? 0.5 : 1, flexShrink: 0 }}>
                  ⭐ {p.is_featured ? 'Featured' : 'Feature'}
                </button>
                {/* Trending toggle */}
                <button
                  onClick={() => toggleFlag(p, 'is_trending')}
                  disabled={toggling === p.id + 'is_trending'}
                  title={p.is_trending ? 'Remove from Trending' : 'Add to Trending'}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: p.is_trending ? '#fee2e2' : '#f3f4f6', color: p.is_trending ? '#991b1b' : '#9ca3af', opacity: toggling === p.id + 'is_trending' ? 0.5 : 1, flexShrink: 0 }}>
                  🔥 {p.is_trending ? 'Trending' : 'Trend'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminSections() {
  const [sections, setSections] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(blank);
  const [saving,   setSaving]   = useState(false);
  const [seeding,  setSeeding]  = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // section id whose products are shown

  const load = async () => {
    try { const r = await api.get('/homepage/admin/sections'); setSections(r.data); }
    catch { toast.error('Failed to load sections'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ type: s.type, title: s.title || '', subtitle: s.subtitle || '', sort_order: s.sort_order, is_active: s.is_active, config: s.config || {} });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await api.put(`/homepage/admin/sections/${editing.id}`, form); toast.success('Section updated!'); }
      else         { await api.post('/homepage/admin/sections', form);              toast.success('Section added!');   }
      setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s) => {
    try { await api.put(`/homepage/admin/sections/${s.id}`, { is_active: !s.is_active }); load(); }
    catch { toast.error('Failed'); }
  };

  const deleteSection = async (id) => {
    if (!confirm('Delete this section? It will no longer appear on the homepage.')) return;
    try { await api.delete(`/homepage/admin/sections/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const moveSection = async (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= sections.length) return;
    const a = sections[idx], b = sections[next];
    try {
      await Promise.all([
        api.put(`/homepage/admin/sections/${a.id}`, { sort_order: b.sort_order }),
        api.put(`/homepage/admin/sections/${b.id}`, { sort_order: a.sort_order }),
      ]);
      load();
    } catch { toast.error('Failed to reorder'); }
  };

  const seedDefaults = async () => {
    if (!confirm('This will add all default homepage sections. Existing sections will NOT be removed. Continue?')) return;
    setSeeding(true);
    try {
      const existing  = sections.map(s => s.type);
      const toCreate  = DEFAULT_SECTIONS.filter(d => !existing.includes(d.type));
      if (!toCreate.length) { toast('All default sections already exist!', { icon: 'ℹ️' }); setSeeding(false); return; }
      for (const s of toCreate) await api.post('/homepage/admin/sections', { ...s, is_active: true });
      toast.success(`Added ${toCreate.length} sections! Toggle, reorder, and rename them below.`);
      load();
    } catch { toast.error('Failed to seed sections'); }
    finally { setSeeding(false); }
  };

  const typeInfo  = (type) => SECTION_TYPES.find(t => t.value === type);
  const typeLabel = (type) => typeInfo(type)?.label || type;
  const typeDesc  = (type) => typeInfo(type)?.desc  || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Homepage Sections</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            Control which sections appear on the homepage and in what order.
            Toggle the eye icon to show/hide without deleting.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={seedDefaults} disabled={seeding}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', cursor: seeding ? 'not-allowed' : 'pointer', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, opacity: seeding ? 0.6 : 1 }}>
            <Zap size={14} color="#c9a96e" />
            {seeding ? 'Adding...' : sections.length === 0 ? 'Setup Default Sections' : 'Add Missing Defaults'}
          </button>
          <button onClick={openAdd} className="btn-orange"
            style={{ padding: '9px 14px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add Section
          </button>
        </div>
      </div>

      {/* ── Empty state info ── */}
      {!loading && sections.length === 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12 }}>
          <Zap size={18} color="#c9a96e" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>No sections configured yet</div>
            <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
              The homepage is showing built-in default sections that can't be controlled here.
              Click <strong>"Setup Default Sections"</strong> to import them, then enable/disable/reorder/rename each one.
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{editing ? 'Edit Section' : 'Add New Section'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Section Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inp} disabled={!!editing}>
                {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {form.type && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{typeDesc(form.type)}</p>}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Title <span style={{ fontWeight: 400 }}>(shown as section heading)</span></label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. New Arrivals" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Subtitle <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="e.g. Handpicked for you" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
              <input type="checkbox" id="sec_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: '#c9a96e', width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="sec_active" style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Visible on homepage</label>
            </div>
          </div>

          {/* Extra config for video_section */}
          {form.type === 'video_section' && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 2 }}>📽️ Video Section Settings</div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Video URL * <span style={{ fontWeight: 400 }}>(Cloudinary or any direct MP4 URL)</span></label>
                <input value={form.config?.video_url || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, video_url: e.target.value } }))} placeholder="https://res.cloudinary.com/.../video.mp4" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Poster / Thumbnail URL <span style={{ fontWeight: 400 }}>(shown before video loads)</span></label>
                <input value={form.config?.poster || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, poster: e.target.value } }))} placeholder="https://..." style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Label text <span style={{ fontWeight: 400 }}>(above title)</span></label>
                  <input value={form.config?.label || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, label: e.target.value } }))} placeholder="Campaign Film" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>CTA Button text</label>
                  <input value={form.config?.cta_text || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, cta_text: e.target.value } }))} placeholder="Shop the Look" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>CTA Link</label>
                  <input value={form.config?.cta_link || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, cta_link: e.target.value } }))} placeholder="/shop" style={inp} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                💡 Upload the video in Admin → Homepage → Banners, copy the Cloudinary URL and paste it above. Video plays on click with sound, looping, in 16:9 format.
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : editing ? 'Update Section' : 'Add Section'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Sections list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />)}
        </div>
      ) : sections.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
            <GripVertical size={14} /> Use ▲▼ to reorder. Eye icon shows/hides. Pencil to rename. Trash to delete.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sections.map((s, idx) => (
              <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${s.is_active ? '#f3f4f6' : '#fef3c7'}`, overflow: 'hidden', opacity: s.is_active ? 1 : 0.7, transition: 'opacity 0.2s' }}>

                {/* Row */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>

                {/* Up / Down */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: '#9ca3af', padding: '1px 4px', opacity: idx === 0 ? 0.2 : 1, fontSize: 11, lineHeight: 1 }}>▲</button>
                  <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1}
                    style={{ background: 'none', border: 'none', cursor: idx === sections.length - 1 ? 'default' : 'pointer', color: '#9ca3af', padding: '1px 4px', opacity: idx === sections.length - 1 ? 0.2 : 1, fontSize: 11, lineHeight: 1 }}>▼</button>
                </div>

                {/* Position number */}
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>
                  {idx + 1}
                </div>

                {/* Type badge */}
                <div style={{ fontSize: 11, background: s.is_active ? '#f0fdf4' : '#fef9c3', color: s.is_active ? '#166534' : '#854d0e', padding: '3px 8px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {typeLabel(s.type)}
                </div>

                {/* Title + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title || <span style={{ color: '#9ca3af', fontStyle: 'italic', fontWeight: 400 }}>No title</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{typeDesc(s.type)}</div>
                </div>

                {/* Eye toggle */}
                <button onClick={() => toggleActive(s)} title={s.is_active ? 'Hide from homepage' : 'Show on homepage'}
                  style={{ background: s.is_active ? '#f0fdf4' : '#fef3c7', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.is_active ? <Eye size={14} color="#16a34a" /> : <EyeOff size={14} color="#d97706" />}
                </button>

                {/* View Products expand button */}
                {!['categories','offer_banner','women_collection_banner','reels'].includes(s.type) && (
                  <button
                    onClick={() => setExpandedSection(expandedSection === s.id ? null : s.id)}
                    title="View products in this section"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: expandedSection === s.id ? '#1a1a18' : '#fff', color: expandedSection === s.id ? '#c9a96e' : '#374151', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {expandedSection === s.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {expandedSection === s.id ? 'Hide' : 'View Products'}
                  </button>
                )}

                {/* Edit + Delete */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(s)} title="Edit"
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteSection(s.id)} title="Delete"
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                </div>

                {/* ── Expanded product panel ── */}
                {expandedSection === s.id && (
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 16px 20px', background: '#fafafa' }}>
                    <SectionProducts section={s} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Live info */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
            ✓ Changes are <strong>live immediately</strong> — the homepage reads these sections in real time. No redeploy needed.
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Volume2, VolumeX, ShoppingBag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';
import { useSiteSettings } from '../context/SiteSettingsContext';

//  NOREN Static Hero (no banners) 
function StaticHero({ settings }) {
  return (
    <section style={{ position: 'relative', minHeight: 'calc(100dvh - 84px)', minHeight: 'calc(100vh - 84px)', background: '#1a1a18', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 80% 80% at 70% 50%, rgba(201,169,110,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="wrap" style={{ position: 'relative', zIndex: 2, width: '100%', paddingTop: 'clamp(40px, 8vw, 100px)', paddingBottom: 'clamp(40px, 8vw, 80px)' }}>
        <div style={{ maxWidth: 640 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'clamp(16px, 3vw, 28px)' }}>
            <div style={{ width: 24, height: 1, background: '#c9a96e' }} />
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a96e' }}>
              New Collection — 2024
            </span>
          </div>

          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 'clamp(36px, 9vw, 88px)', color: '#faf9f7', lineHeight: 1.05, letterSpacing: '-0.01em', marginBottom: 'clamp(14px, 3vw, 24px)' }}>
            {settings.hero_heading || 'Timeless\nBy Design.'}
          </h1>

          <p style={{ fontSize: 'clamp(13px, 1.8vw, 16px)', color: 'rgba(250,249,247,0.6)', lineHeight: 1.8, marginBottom: 'clamp(24px, 4vw, 44px)', maxWidth: 420, fontWeight: 300 }}>
            {settings.hero_subheading || 'NOREN is more than clothing. It\'s a statement of confidence, elegance, and individuality.'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link to={settings.hero_cta_link || '/shop'}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 'clamp(12px, 2vw, 15px) clamp(20px, 4vw, 32px)', background: '#faf9f7', color: '#1a1a18', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid #faf9f7', transition: 'all 0.25s', minHeight: 44 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.borderColor = '#c9a96e'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#faf9f7'; e.currentTarget.style.borderColor = '#faf9f7'; }}>
              {settings.hero_cta_text || 'Shop Now'}
            </Link>
            <Link to="/shop?featured=true"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 'clamp(12px, 2vw, 15px) clamp(20px, 4vw, 32px)', background: 'transparent', color: 'rgba(250,249,247,0.8)', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid rgba(250,249,247,0.25)', transition: 'all 0.25s', minHeight: 44 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(250,249,247,0.25)'; e.currentTarget.style.color = 'rgba(250,249,247,0.8)'; }}>
              New Arrivals
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}

//  Hero Banner Slider
function HeroBanner({ banners, settings }) {
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640
  );

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return <StaticHero settings={settings} />;

  return (
    <section style={{ position: 'relative', background: '#1a1a18', overflow: 'hidden' }}>

      {/* Slide stack */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: isMobile ? 'auto' : undefined,
        aspectRatio: isMobile ? 'auto' : '16/7',
        maxHeight: isMobile ? 'none' : '90vh',
        minHeight: isMobile ? 'auto' : 420,
      }}>

        {banners.map((ban, i) => {
          const bgImg = (isMobile && ban.mobile_image) ? ban.mobile_image : ban.desktop_image;
          const isActive = i === current;
          return (
            <div key={ban.id} style={{
              position: isMobile ? 'relative' : 'absolute',
              inset: isMobile ? undefined : 0,
              display: isMobile ? (isActive ? 'block' : 'none') : 'block',
              transition: isMobile ? 'none' : 'opacity 0.8s ease',
              opacity: isMobile ? 1 : (isActive ? 1 : 0),
              pointerEvents: isActive ? 'auto' : 'none',
              width: '100%',
            }}>

              {/* Background — video takes priority over image on desktop */}
              {bgImg && !ban.video_url && (
                <img
                  src={bgImg}
                  alt={ban.heading || 'NOREN'}
                  style={{ width: '100%', height: '100%', objectFit: isMobile ? 'contain' : 'cover', objectPosition: 'center center', display: 'block', background: '#1a1a18' }}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              )}
              {ban.video_url && !isMobile && (
                <video
                  src={ban.video_url}
                  autoPlay muted loop playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#1a1a18' }}
                />
              )}
              {ban.video_url && isMobile && bgImg && (
                /* On mobile show image fallback for video banners (saves data) */
                <img
                  src={bgImg}
                  alt={ban.heading || 'NOREN'}
                  style={{ width: '100%', objectFit: 'contain', display: 'block', background: '#1a1a18' }}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              )}
              {ban.video_url && isMobile && !bgImg && (
                <video
                  src={ban.video_url}
                  autoPlay muted loop playsInline
                  style={{ width: '100%', objectFit: 'contain', display: 'block', background: '#1a1a18' }}
                />
              )}
              {!bgImg && !ban.video_url && <div style={{ width: '100%', height: '100%', background: '#1a1a18' }} />
              }

              {/* Dark overlay — only on desktop (on mobile image has its own design) */}
              {!isMobile && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(10,10,8,0.82) 0%, rgba(10,10,8,0.45) 55%, transparent 100%)' }} />
              )}

              {/* Text content — desktop: overlay on image | mobile: below image */}
              {(ban.heading || ban.cta_text) && (
                isMobile ? (
                  /* Mobile: text block below the image */
                  <div style={{ background: '#1a1a18', padding: '20px 20px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 18, height: 1, background: '#c9a96e', flexShrink: 0 }} />
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e' }}>NOREN Collection</span>
                    </div>
                    {ban.heading && (
                      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 600, color: '#faf9f7', lineHeight: 1.15, marginBottom: 8, letterSpacing: '-0.01em' }}>
                        {ban.heading}
                      </h2>
                    )}
                    {ban.subheading && (
                      <p style={{ fontSize: 13, color: 'rgba(250,249,247,0.65)', marginBottom: 18, lineHeight: 1.6, fontWeight: 300 }}>
                        {ban.subheading}
                      </p>
                    )}
                    {ban.cta_text && (
                      <Link to={ban.cta_link || '/shop'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#faf9f7', color: '#1a1a18', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', minHeight: 44 }}>
                        {ban.cta_text} <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                ) : (
                  /* Desktop: text overlaid on image */
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                    <div className="wrap" style={{ width: '100%' }}>
                      <div style={{ maxWidth: 560 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div style={{ width: 18, height: 1, background: '#c9a96e', flexShrink: 0 }} />
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e' }}>NOREN Collection</span>
                        </div>
                        {ban.heading && (
                          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 600, color: '#faf9f7', lineHeight: 1.1, marginBottom: 14, letterSpacing: '-0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                            {ban.heading}
                          </h2>
                        )}
                        {ban.subheading && (
                          <p style={{ fontSize: 'clamp(13px, 1.4vw, 16px)', color: 'rgba(250,249,247,0.72)', marginBottom: 28, lineHeight: 1.65, fontWeight: 300, maxWidth: 400 }}>
                            {ban.subheading}
                          </p>
                        )}
                        {ban.cta_text && (
                          <Link to={ban.cta_link || '/shop'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 30px', background: '#faf9f7', color: '#1a1a18', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', transition: 'all 0.2s', minHeight: 44 }}
                            onMouseEnter={e => e.currentTarget.style.background = '#c9a96e'}
                            onMouseLeave={e => e.currentTarget.style.background = '#faf9f7'}>
                            {ban.cta_text} <ArrowRight size={13} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })}

        {/* Prev / Next arrows — desktop only */}
        {banners.length > 1 && !isMobile && (
          <>
            <button onClick={() => setCurrent(c => (c - 1 + banners.length) % banners.length)}
              style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, background: 'rgba(250,249,247,0.1)', border: '1px solid rgba(250,249,247,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#faf9f7', transition: 'all 0.2s', zIndex: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,169,110,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(250,249,247,0.1)'}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setCurrent(c => (c + 1) % banners.length)}
              style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, background: 'rgba(250,249,247,0.1)', border: '1px solid rgba(250,249,247,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#faf9f7', transition: 'all 0.2s', zIndex: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,169,110,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(250,249,247,0.1)'}>
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dots — desktop only (absolute), mobile dots shown below */}
        {banners.length > 1 && !isMobile && (
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? '#c9a96e' : 'rgba(250,249,247,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>
        )}

      </div>

      {/* Mobile dots — below image+text */}
      {banners.length > 1 && isMobile && (
        <div style={{ background: '#1a1a18', display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 18px' }}>
          {banners.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? '#c9a96e' : 'rgba(250,249,247,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
          ))}
        </div>
      )}

    </section>
  );
}

//  Brand Promise Strip 
function BrandPromise() {
  const pillars = [
    { icon: '✦', label: 'Premium Quality', sub: 'Finest Fabrics' },
    { icon: '◇', label: 'Timeless Design', sub: 'Made to Last' },
    { icon: '↩', label: 'Easy Returns', sub: 'Hassle Free' },
    { icon: '⊕', label: 'Secure Payments', sub: '100% Protected' },
    { icon: '→', label: 'Worldwide Shipping', sub: 'Swift Delivery' },
  ];
  return (
    <section style={{ background: '#f5f0e8', borderBottom: '1px solid #e8ddd0', padding: '20px 0' }}>
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }}
          className="brand-promise-strip">
          {pillars.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 12px', border: '1px solid #e8ddd0', gap: 6 }}>
              <span style={{ fontSize: 16, color: '#c9a96e', lineHeight: 1 }}>{p.icon}</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1a18', marginBottom: 2 }}>{p.label}</p>
                <p style={{ fontSize: 10, color: '#9e9a94', letterSpacing: '0.04em' }}>{p.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

//  Shop By Category (gender-aware with tab switcher) 
const CAT_FALLBACKS = {
  't-shirts':    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
  'shirts':      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80',
  'jeans':       'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
  'jackets':     'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
  'hoodies':     'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80',
  'accessories': 'https://images.unsplash.com/photo-1523779105320-d1cd346ff52b?w=600&q=80',
  'kurtis':      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80',
  'dresses':     'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80',
  'tops':        'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80',
  'leggings':    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&q=80',
  'salwar-suits':'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80',
};
const CAT_DEFAULT = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80';

function CategoriesSection({ section }) {
  const [activeGender, setActiveGender] = useState('men');
  const [menCats, setMenCats]           = useState([]);
  const [womenCats, setWomenCats]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [hoveredCat, setHovered]        = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/products/categories?gender=men'),
      api.get('/products/categories?gender=women'),
    ])
      .then(([m, w]) => {
        setMenCats(m.data || []);
        setWomenCats(w.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cats = activeGender === 'women' ? womenCats : menCats;
  // Show up to 10 categories
  const displayCats = cats.slice(0, 10);

  return (
    <section style={{ background: '#faf9f7', padding: 'clamp(48px, 8vw, 96px) 0' }}>
      <div className="wrap">
        {/* Header with gender tabs */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>Shop By Category</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 600, color: '#1a1a18', letterSpacing: '-0.01em', marginBottom: 24 }}>
            {section.title || 'The Collections'}
          </h2>
          {/* Gender toggle tabs */}
          <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 100, padding: 4, gap: 4 }}>
            {[
              { label: 'Men', value: 'men' },
              { label: 'Women', value: 'women' },
            ].map(g => (
              <button
                key={g.value}
                onClick={() => setActiveGender(g.value)}
                style={{
                  padding: '8px 28px',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: activeGender === g.value ? '#1a1a18' : 'transparent',
                  color: activeGender === g.value ? '#faf9f7' : '#6b7280',
                  boxShadow: activeGender === g.value ? '0 2px 8px rgba(26,26,24,0.18)' : 'none',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid-2-3-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/4' }} />)}
          </div>
        ) : displayCats.length > 0 ? (
          <div className="grid-2-3-5">
            {displayCats.map(cat => {
              const img = cat.image_url || CAT_FALLBACKS[cat.slug] || CAT_DEFAULT;
              const isHov = hoveredCat === cat.slug;
              return (
                <Link
                  key={cat.id || cat.slug}
                  to={`/shop?gender=${activeGender}&category=${cat.slug}`}
                  onMouseEnter={() => setHovered(cat.slug)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ display: 'block', position: 'relative', textDecoration: 'none', aspectRatio: '3/4', background: '#1a1a18', overflow: 'hidden' }}
                >
                  <img src={img} alt={cat.name} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)', transform: isHov ? 'scale(1.07)' : 'scale(1)', filter: isHov ? 'brightness(0.75)' : 'brightness(0.85)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,26,24,0.8) 0%, rgba(26,26,24,0.1) 50%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px', transition: 'transform 0.3s ease', transform: isHov ? 'translateY(-4px)' : 'translateY(0)' }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#faf9f7', letterSpacing: '0.04em', marginBottom: 4, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{cat.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isHov ? 1 : 0.6, transition: 'opacity 0.3s' }}>
                      <span style={{ fontSize: 10, color: '#c9a96e', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                        {cat.product_count || 0} pieces
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.4)' }} />
                      <ArrowRight size={12} color="#c9a96e" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>No categories found.</p>
          </div>
        )}

        {/* View all link */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link
            to={`/shop?gender=${activeGender}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #1a1a18', paddingBottom: 3, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c9a96e'; e.currentTarget.style.borderBottomColor = '#c9a96e'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#1a1a18'; e.currentTarget.style.borderBottomColor = '#1a1a18'; }}
          >
            Shop All {activeGender === 'women' ? "Women's" : "Men's"} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}

//  Product Section 
function ProductSection({ section }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: 8 });
    if (section.type === 'featured_products') params.set('featured', 'true');
    if (section.type === 'trending_products') params.set('trending', 'true');
    if (section.type === 'new_arrivals')      params.set('sort', 'newest');
    if (section.type === 'best_sellers')      params.set('sort', 'popular');
    api.get(`/products?${params}`).then(r => setProducts(r.data.products || [])).catch(() => {}).finally(() => setLoading(false));
  }, [section.type]);

  if (!loading && !products.length) return null;

  const labels = {
    featured_products: { tag: 'Curated Selection',  title: 'Signature Collection' },
    trending_products: { tag: 'Right Now',           title: 'Trending Now' },
    new_arrivals:      { tag: 'Just Arrived',        title: 'New Arrivals' },
    best_sellers:      { tag: 'Most Loved',          title: 'Best Sellers' },
  };
  const { tag, title } = labels[section.type] || { tag: '', title: section.title || '' };
  const isAlternate = section.type === 'trending_products' || section.type === 'best_sellers';

  return (
    <section style={{ background: isAlternate ? '#f5f0e8' : '#faf9f7', padding: 'clamp(48px, 8vw, 96px) 0' }}>
      <div className="wrap">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 12 }}>{tag}</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(26px, 4vw, 48px)', fontWeight: 600, color: '#1a1a18', letterSpacing: '-0.01em' }}>
              {section.title || title}
            </h2>
            {section.subtitle && <p style={{ fontSize: 13, color: '#9e9a94', marginTop: 6, letterSpacing: '0.02em' }}>{section.subtitle}</p>}
          </div>
          <Link to="/shop" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #1a1a18', paddingBottom: 2, transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c9a96e'; e.currentTarget.style.borderBottomColor = '#c9a96e'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#1a1a18'; e.currentTarget.style.borderBottomColor = '#1a1a18'; }}>
            View All <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="grid-2-3-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/4' }} />)}
          </div>
        ) : (
          <div className="grid-2-3-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

//  Editorial Banner 
function EditorialBanner({ section }) {
  return (
    <section style={{ background: '#1a1a18', padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 60% 60% at 80% 50%, rgba(201,169,110,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div className="wrap" style={{ position: 'relative', textAlign: 'center' }}>
        <div style={{ width: 40, height: 1, background: '#c9a96e', margin: '0 auto 24px' }} />
        <p className="section-label" style={{ marginBottom: 24, color: '#c9a96e' }}>The NOREN Story</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 500, color: '#faf9f7', marginBottom: 20, lineHeight: 1.15, letterSpacing: '-0.01em', fontStyle: 'italic' }}>
          "{section.title || 'Crafted Beyond Trends.'}"
        </h2>
        <p style={{ color: 'rgba(250,249,247,0.5)', marginBottom: 48, fontSize: 15, maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.8, fontWeight: 300 }}>
          {section.subtitle || 'Wear confidence. Designed to endure. Modern heritage for every journey.'}
        </p>
        <div style={{ width: 40, height: 1, background: 'rgba(201,169,110,0.3)', margin: '0 auto 40px' }} />
        <Link to="/shop"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 40px', border: '1px solid rgba(201,169,110,0.5)', color: '#c9a96e', fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', transition: 'all 0.25s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.color = '#1a1a18'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c9a96e'; }}>
          Explore Collection <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}

//  Reels Section 
function ReelsSection({ reels }) {
  const [muted, setMuted]       = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const videoRefs               = useRef([]);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === activeIdx) { v.play().catch(() => {}); } else { v.pause(); v.currentTime = 0; }
    });
  }, [activeIdx]);

  if (!reels.length) return null;

  return (
    <section style={{ background: '#0f0f0d', padding: '80px 0' }}>
      <div className="wrap">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 12 }}>Editorial</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 600, color: '#faf9f7' }}>Shop the Look</h2>
          </div>
          <button onClick={() => setMuted(m => !m)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(250,249,247,0.12)', color: '#9e9a94', padding: '8px 16px', cursor: 'pointer', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(250,249,247,0.12)'; e.currentTarget.style.color = '#9e9a94'; }}>
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {reels.map((reel, i) => (
            <div key={reel.id} onClick={() => setActiveIdx(i)}
              style={{ position: 'relative', flexShrink: 0, width: i === activeIdx ? 180 : 116, aspectRatio: '9/16', background: '#1a1a18', overflow: 'hidden', cursor: 'pointer', border: i === activeIdx ? '1px solid #c9a96e' : '1px solid transparent', transition: 'all 0.3s ease' }}>
              <video ref={el => videoRefs.current[i] = el} src={reel.video_url} poster={reel.thumbnail_url || undefined} muted={muted} loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,26,24,0.85) 0%, transparent 50%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px' }}>
                {reel.title && <div style={{ fontSize: 11, color: '#faf9f7', fontWeight: 400, lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{reel.title}</div>}
                {reel.product_id && (
                  <Link to={`/product/${reel.product_id}`} onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#c9a96e', color: '#1a1a18', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px', textDecoration: 'none' }}>
                    <ShoppingBag size={9} /> Shop
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

//  Women's Product Section 
function WomenProductSection({ section }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: 8, gender: 'women' });
    if (section.type === 'women_new_arrivals') params.set('sort', 'newest');
    if (section.type === 'women_best_sellers') params.set('sort', 'popular');
    if (section.type === 'women_trending')     params.set('trending', 'true');
    if (section.type === 'women_ethnic')       params.set('category', 'kurtis');
    if (section.type === 'women_western')      params.set('category', 'dresses');
    api.get(`/products?${params}`).then(r => setProducts(r.data.products || [])).catch(() => {}).finally(() => setLoading(false));
  }, [section.type]);

  if (!loading && !products.length) return null;

  const labels = {
    women_new_arrivals: { tag: 'Just Arrived',     title: "Women's New Arrivals",      link: '/shop?gender=women&sort=newest'  },
    women_best_sellers: { tag: 'Most Loved',       title: "Women's Best Sellers",       link: '/shop?gender=women&sort=popular' },
    women_trending:     { tag: 'Trending Now',     title: 'Trending in Women',          link: '/shop?gender=women&trending=true'},
    women_ethnic:       { tag: 'Ethnic Collection',title: 'Ethnic Wear for Women',      link: '/shop?gender=women&category=kurtis'},
    women_western:      { tag: 'Western Wear',     title: "Women's Western Collection", link: '/shop?gender=women&category=dresses'},
  };
  const { tag, title, link } = labels[section.type] || { tag: '', title: section.title || '', link: '/shop?gender=women' };
  const isAlternate = section.type === 'women_trending' || section.type === 'women_best_sellers';

  return (
    <section style={{ background: isAlternate ? '#fdf2f8' : '#faf9f7', padding: 'clamp(48px, 8vw, 96px) 0' }}>
      <div className="wrap">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 24, height: 1, background: '#c9a96e' }} />
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a96e' }}>{tag}</p>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(26px, 4vw, 48px)', fontWeight: 600, color: '#1a1a18', letterSpacing: '-0.01em' }}>
              {section.title || title}
            </h2>
            {section.subtitle && <p style={{ fontSize: 13, color: '#9e9a94', marginTop: 6, letterSpacing: '0.02em' }}>{section.subtitle}</p>}
          </div>
          <Link to={link} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #1a1a18', paddingBottom: 2, transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c9a96e'; e.currentTarget.style.borderBottomColor = '#c9a96e'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#1a1a18'; e.currentTarget.style.borderBottomColor = '#1a1a18'; }}>
            View All <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="grid-2-3-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/4' }} />)}
          </div>
        ) : (
          <div className="grid-2-3-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

//  Women's Collection Banner 
function WomensCollectionBanner() {
  return (
    <section style={{ background: '#1a1a18', padding: 'clamp(48px, 8vw, 80px) 0', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle pink-gold gradient accent */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 60% 60% at 30% 50%, rgba(201,169,110,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div className="wrap" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'clamp(28px, 5vw, 40px)' }}>
          <div style={{ maxWidth: 520, flex: '1 1 280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 32, height: 1, background: '#c9a96e' }} />
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c9a96e' }}>
                New Arrivals — Women's Fashion
              </span>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 600, color: '#faf9f7', lineHeight: 1.1, marginBottom: 18, letterSpacing: '-0.01em' }}>
              Elegance,<br />Redefined for Her.
            </h2>
            <p style={{ fontSize: 'clamp(13px, 1.5vw, 15px)', color: 'rgba(250,249,247,0.6)', lineHeight: 1.8, marginBottom: 36, fontWeight: 300 }}>
              Discover our curated Women's collection — from timeless ethnic wear to contemporary western styles, crafted with the same NOREN precision.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link to="/shop?gender=women"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 'clamp(11px, 2vw, 14px) clamp(20px, 3vw, 32px)', background: '#faf9f7', color: '#1a1a18', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', transition: 'all 0.25s', minHeight: 44 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#c9a96e'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#faf9f7'; }}>
                Shop Women's <ArrowRight size={13} />
              </Link>
              <Link to="/shop?gender=women&category=kurtis"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 'clamp(11px, 2vw, 14px) clamp(20px, 3vw, 32px)', background: 'transparent', color: 'rgba(250,249,247,0.75)', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid rgba(250,249,247,0.2)', transition: 'all 0.25s', minHeight: 44 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(250,249,247,0.2)'; e.currentTarget.style.color = 'rgba(250,249,247,0.75)'; }}>
                Ethnic Wear
              </Link>
            </div>
          </div>
          {/* Category quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: '0 1 auto', width: '100%', maxWidth: 320 }}>
            {[
              { label: 'Kurtis & Kurtas', link: '/shop?gender=women&category=kurtis' },
              { label: 'Co-Ord Sets',     link: '/shop?gender=women&category=co-ord-sets' },
              { label: 'Dresses',         link: '/shop?gender=women&category=dresses' },
              { label: 'Tops & Shirts',   link: '/shop?gender=women&category=tops' },
              { label: 'Leggings',        link: '/shop?gender=women&category=leggings' },
              { label: 'Accessories',     link: '/shop?gender=women&category=dupattas' },
            ].map(item => (
              <Link key={item.label} to={item.link}
                style={{ padding: '10px 14px', background: 'rgba(250,249,247,0.05)', border: '1px solid rgba(250,249,247,0.1)', color: 'rgba(250,249,247,0.75)', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textDecoration: 'none', transition: 'all 0.2s', minHeight: 44, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,169,110,0.12)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.4)'; e.currentTarget.style.color = '#c9a96e'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,249,247,0.05)'; e.currentTarget.style.borderColor = 'rgba(250,249,247,0.1)'; e.currentTarget.style.color = 'rgba(250,249,247,0.75)'; }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

//  Mid-Page Banner Slider (same as HeroBanner but for middle of page)
function MidBanner({ banners }) {
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <section style={{ position: 'relative', background: '#0f0f0d', overflow: 'hidden' }}>

      {/* Slide container — responsive aspect ratio */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isMobile ? '16/9' : '16/6',
        maxHeight: isMobile ? '60vw' : '60vh',
        minHeight: isMobile ? 200 : 280,
        overflow: 'hidden',
      }}>

        {banners.map((ban, i) => {
          const bgImg = (isMobile && ban.mobile_image) ? ban.mobile_image : ban.desktop_image;
          const isActive = i === current;

          return (
            <div key={ban.id} style={{
              position: 'absolute', inset: 0,
              transition: 'opacity 0.7s ease',
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
            }}>

              {/* Background — video on desktop, image everywhere */}
              {ban.video_url && !isMobile ? (
                <video src={ban.video_url} autoPlay muted loop playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : bgImg ? (
                <img src={bgImg} alt={ban.heading || 'NOREN'}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }}
                  loading="lazy" />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a18 0%, #2c2c29 100%)' }} />
              )}

              {/* Gradient overlay — bottom-heavy for text readability on both devices */}
              <div style={{
                position: 'absolute', inset: 0,
                background: isMobile
                  ? 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.1) 100%)'
                  : 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
              }} />

              {/* Text content — always overlaid on image */}
              {(ban.heading || ban.cta_text) && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex',
                  alignItems: isMobile ? 'flex-end' : 'center',
                  padding: isMobile ? 'clamp(16px, 5vw, 28px)' : undefined,
                }}>
                  {isMobile ? (
                    /* Mobile: text anchored to bottom of image */
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 14, height: 1, background: '#c9a96e', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a96e' }}>NOREN</span>
                      </div>
                      {ban.heading && (
                        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(20px, 5.5vw, 32px)', fontWeight: 600, color: '#faf9f7', lineHeight: 1.15, marginBottom: 6, textShadow: '0 1px 8px rgba(0,0,0,0.6)', wordBreak: 'break-word' }}>
                          {ban.heading}
                        </h2>
                      )}
                      {ban.subheading && (
                        <p style={{ fontSize: 'clamp(11px, 3vw, 13px)', color: 'rgba(250,249,247,0.75)', marginBottom: 12, lineHeight: 1.5, fontWeight: 300 }}>
                          {ban.subheading}
                        </p>
                      )}
                      {ban.cta_text && (
                        <Link to={ban.cta_link || '/shop'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#faf9f7', color: '#1a1a18', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', minHeight: 44, whiteSpace: 'nowrap' }}>
                          {ban.cta_text} <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  ) : (
                    /* Desktop: text overlaid centered-left */
                    <div className="wrap" style={{ width: '100%' }}>
                      <div style={{ maxWidth: 520 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 18, height: 1, background: '#c9a96e', flexShrink: 0 }} />
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e' }}>NOREN</span>
                        </div>
                        {ban.heading && (
                          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(26px, 3.5vw, 56px)', fontWeight: 600, color: '#faf9f7', lineHeight: 1.1, marginBottom: 10, letterSpacing: '-0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                            {ban.heading}
                          </h2>
                        )}
                        {ban.subheading && (
                          <p style={{ fontSize: 'clamp(13px, 1.2vw, 15px)', color: 'rgba(250,249,247,0.72)', marginBottom: 22, lineHeight: 1.65, fontWeight: 300, maxWidth: 380 }}>
                            {ban.subheading}
                          </p>
                        )}
                        {ban.cta_text && (
                          <Link to={ban.cta_link || '/shop'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#faf9f7', color: '#1a1a18', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', transition: 'all 0.2s', minHeight: 44, whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#c9a96e'}
                            onMouseLeave={e => e.currentTarget.style.background = '#faf9f7'}>
                            {ban.cta_text} <ArrowRight size={13} />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Arrows — both devices (smaller on mobile) */}
        {banners.length > 1 && (
          <>
            <button onClick={() => setCurrent(c => (c - 1 + banners.length) % banners.length)}
              style={{ position: 'absolute', left: isMobile ? 8 : 16, top: '50%', transform: 'translateY(-50%)', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, background: 'rgba(250,249,247,0.12)', border: '1px solid rgba(250,249,247,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#faf9f7', zIndex: 10, borderRadius: 4 }}>
              <ChevronLeft size={isMobile ? 14 : 16} />
            </button>
            <button onClick={() => setCurrent(c => (c + 1) % banners.length)}
              style={{ position: 'absolute', right: isMobile ? 8 : 16, top: '50%', transform: 'translateY(-50%)', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, background: 'rgba(250,249,247,0.12)', border: '1px solid rgba(250,249,247,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#faf9f7', zIndex: 10, borderRadius: 4 }}>
              <ChevronRight size={isMobile ? 14 : 16} />
            </button>
          </>
        )}

        {/* Dots — both devices */}
        {banners.length > 1 && (
          <div style={{ position: 'absolute', bottom: isMobile ? 10 : 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 10 }}>
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 18 : 6, height: 5, borderRadius: 3, background: i === current ? '#c9a96e' : 'rgba(250,249,247,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}


//  Horizontal Video Section
function HorizontalVideoSection({ section }) {
  const videoUrl = section.config?.video_url || '';
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setPlaying(true); }
    else { videoRef.current.pause(); setPlaying(false); }
  };

  if (!videoUrl) return null;

  return (
    <section style={{ background: '#0f0f0d', padding: 'clamp(40px, 6vw, 80px) 0', overflow: 'hidden' }}>
      <div className="wrap">
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 3vw, 36px)' }}>
          {section.title && (
            <>
              <p className="section-label" style={{ marginBottom: 10, color: '#c9a96e' }}>
                {section.config?.label || 'Campaign Film'}
              </p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(24px, 4vw, 48px)', fontWeight: 600, color: '#faf9f7', letterSpacing: '-0.01em' }}>
                {section.title}
              </h2>
              {section.subtitle && (
                <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: 'rgba(250,249,247,0.5)', marginTop: 10, maxWidth: 480, margin: '10px auto 0', fontWeight: 300 }}>
                  {section.subtitle}
                </p>
              )}
            </>
          )}
        </div>

        {/* Video player */}
        <div style={{
          position: 'relative',
          borderRadius: 'clamp(8px, 1.5vw, 16px)',
          overflow: 'hidden',
          background: '#000',
          aspectRatio: '16/9',
          maxHeight: '70vh',
          cursor: 'pointer',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }} onClick={togglePlay}>

          <video
            ref={videoRef}
            src={videoUrl}
            poster={section.config?.poster || undefined}
            playsInline
            loop
            muted={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />

          {/* Gold gradient overlay — fades out when playing */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)',
            opacity: playing ? 0 : 1,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
          }} />

          {/* Play / Pause button */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: playing ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}>
            <div style={{
              width: 'clamp(56px, 8vw, 80px)', height: 'clamp(56px, 8vw, 80px)',
              borderRadius: '50%',
              background: 'rgba(201,169,110,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(201,169,110,0.4)',
              transform: playing ? 'scale(0.8)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#1a1a18">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>

          {/* Title overlay at bottom */}
          {(section.config?.cta_text || section.title) && !playing && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(16px, 3vw, 28px)', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
              {section.config?.cta_text && (
                <a href={section.config?.cta_link || '/shop'}
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: '#c9a96e', color: '#1a1a18', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 4, marginTop: 8 }}>
                  {section.config.cta_text} <ArrowRight size={13} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


export default function Home() {
  const { settings }              = useSiteSettings();
  const [banners, setBanners]     = useState([]);
  const [midBanners, setMidBanners] = useState([]);
  const [sections, setSections]   = useState([]);
  const [reels, setReels]         = useState([]);
  const [loaded, setLoaded]       = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/homepage/banners').catch(() => ({ data: [] })),
      api.get('/homepage/mid-banners').catch(() => ({ data: [] })),
      api.get('/homepage/sections').catch(() => ({ data: [] })),
      api.get('/homepage/reels').catch(() => ({ data: [] })),
    ]).then(([b, mb, s, r]) => {
      setBanners(b.data || []);
      setMidBanners(mb.data || []);
      setSections(s.data || []);
      setReels(r.data || []);
    }).finally(() => setLoaded(true));
  }, []);

  const renderSection = (section) => {
    switch (section.type) {
      case 'featured_products':
      case 'trending_products':
      case 'new_arrivals':
      case 'best_sellers':
        return <ProductSection key={section.id} section={section} />;
      case 'women_new_arrivals':
      case 'women_best_sellers':
      case 'women_trending':
      case 'women_ethnic':
      case 'women_western':
        return <WomenProductSection key={section.id} section={section} />;
      case 'categories':
        return <CategoriesSection key={section.id} section={section} />;
      case 'offer_banner':
        return <EditorialBanner key={section.id} section={section} />;
      case 'women_collection_banner':
        return <WomensCollectionBanner key={section.id} />;
      case 'video_section':
        return <HorizontalVideoSection key={section.id} section={section} />;
      case 'mid_banner':
        return <MidBanner key={section.id} banners={midBanners} />;
      case 'reels':
        return reels.length > 0 ? <ReelsSection key={section.id} reels={reels} /> : null;
      default:
        return null;
    }
  };

  const hasCustomSections = sections.length > 0;

  return (
    <div style={{ background: '#faf9f7', minHeight: '100vh' }}>
      {/* Hero */}
      <HeroBanner banners={banners} settings={settings} />

      {/* Brand Promise */}
      <BrandPromise />

      {/* Dynamic or Default Sections */}
      {hasCustomSections ? (
        sections.map(s => renderSection(s))
      ) : (
        <>
          {/* Categories */}
          <CategoriesSection section={{ title: 'The Collections' }} />

          {/* New Arrivals — Men */}
          <ProductSection section={{ type: 'new_arrivals', title: 'New Arrivals' }} />

          {/* Editorial Banner */}
          <EditorialBanner section={{ title: 'Crafted Beyond Trends.', subtitle: 'Wear confidence. Designed to endure. Modern heritage for every journey.' }} />

          {/* Featured / Signature — Men */}
          <ProductSection section={{ type: 'featured_products', title: 'Signature Collection' }} />

          {/* Women's Collection Banner */}
          <WomensCollectionBanner />

          {/* Women's New Arrivals */}
          <WomenProductSection section={{ type: 'women_new_arrivals' }} />

          {/* Trending — Men */}
          <ProductSection section={{ type: 'trending_products', title: 'Trending Now' }} />

          {/* Women's Trending */}
          <WomenProductSection section={{ type: 'women_trending' }} />

          {/* Women's Ethnic Collection */}
          <WomenProductSection section={{ type: 'women_ethnic' }} />

          {/* Best Sellers — Men */}
          <ProductSection section={{ type: 'best_sellers', title: 'Best Sellers' }} />

          {/* Women's Western */}
          <WomenProductSection section={{ type: 'women_western' }} />

          {/* Reels */}
          {reels.length > 0 && <ReelsSection reels={reels} />}
        </>
      )}
    </div>
  );
}

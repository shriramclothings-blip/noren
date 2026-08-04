import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { ShoppingBag, Search, Menu, X, User, LogOut, Package, LayoutDashboard, ChevronDown, Heart, Bell } from 'lucide-react';
import api from '../utils/api';

function NorenLogo({ height = 40 }) {
  return (
    <img
      src="/logo.png"
      alt="NOREN"
      style={{ height, width: 'auto', maxWidth: 140, objectFit: 'contain', display: 'block' }}
    />
  );
}

function NotifDropdown({ onClose }) {
  const { setNotifCount } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/notifications');
      setNotifs(res.data);
      await api.put('/users/notifications/read');
      setNotifCount(0);
    } catch {} finally { setLoading(false); }
  }, [setNotifCount]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  return (
    <div ref={ref} className="fade-in" style={{
      position: 'absolute', right: 0, top: 'calc(100% + 10px)',
      width: 'min(340px, calc(100vw - 24px))', maxHeight: 440, background: '#faf9f7',
      border: '1px solid #e6e0d8', boxShadow: '0 16px 48px rgba(26,26,24,0.12)',
      zIndex: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e6e0d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#1a1a18' }}>Notifications</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', display: 'flex' }}><X size={15} /></button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid #f2ede6' }}>
              <div className="skeleton" style={{ height: 13, borderRadius: 2, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 10, borderRadius: 2, width: '55%' }} />
            </div>
          ))
        ) : notifs.length === 0 ? (
          <div style={{ padding: '40px 18px', textAlign: 'center' }}>
            <Bell size={24} style={{ margin: '0 auto 10px', color: '#e6e0d8' }} />
            <p style={{ fontSize: 12, color: '#9e9a94', letterSpacing: '0.06em' }}>No notifications yet</p>
          </div>
        ) : notifs.map(n => (
          <div key={n.id} onClick={onClose}
            style={{ padding: '12px 18px', borderBottom: '1px solid #f2ede6', cursor: 'pointer', background: n.is_read ? 'transparent' : '#f5f0e8', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
            onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : '#f5f0e8'}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.is_read ? 'transparent' : '#c9a96e', flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: '#2c2c29', lineHeight: 1.5, marginBottom: 3 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: '#9e9a94' }}>{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 18px', borderTop: '1px solid #e6e0d8', flexShrink: 0 }}>
        <Link to="/profile?tab=Notifications" onClick={onClose}
          style={{ fontSize: 11, color: '#c9a96e', fontWeight: 500, letterSpacing: '0.1em', textDecoration: 'none' }}>
          View all notifications &rarr;
        </Link>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, logout, cartCount, wishlistCount, notifCount } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [scrolled, setScrolled]       = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [dropOpen, setDropOpen]       = useState(false);
  const [womenOpen, setWomenOpen]     = useState(false);
  const [menOpen, setMenOpen]         = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQ, setSearchQ]         = useState('');
  const dropRef   = useRef(null);
  const notifRef  = useRef(null);
  const womenRef  = useRef(null);
  const menRef    = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn(); // run immediately on mount
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
      if (womenRef.current && !womenRef.current.contains(e.target)) setWomenOpen(false);
      if (menRef.current && !menRef.current.contains(e.target)) setMenOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    setMenuOpen(false); setDropOpen(false); setNotifOpen(false); setSearchOpen(false);
    setWomenOpen(false); setMenOpen(false);
  }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(searchQ.trim())}`);
    setSearchOpen(false); setSearchQ('');
  };

  const NAV_LINKS = [
    { to: '/shop',              label: 'Shop'         },
    { to: '/shop?featured=true',label: 'New Arrivals' },
    { to: '/shop?sort=popular', label: 'Best Sellers' },
    { to: '/contact',           label: 'About'        },
  ];

  const MEN_COLLECTIONS = [
    { label: 'All Men',    slug: null,          gender: 'men' },
    { label: 'T-Shirts',   slug: 't-shirts',    gender: 'men' },
    { label: 'Shirts',     slug: 'shirts',      gender: 'men' },
    { label: 'Polo',       slug: 'polo',        gender: 'men' },
    { label: 'Jeans',      slug: 'jeans',       gender: 'men' },
    { label: 'Cargo',      slug: 'cargo',       gender: 'men' },
    { label: 'Jackets',    slug: 'jackets',     gender: 'men' },
    { label: 'Hoodies',    slug: 'hoodies',     gender: 'men' },
    { label: 'Accessories',slug: 'accessories', gender: 'men' },
    { label: 'Ethnic Wear',slug: 'ethnic-wear', gender: 'men' },
  ];

  // Women's categories grouped by type
  const WOMEN_ETHNIC = [
    { label: 'Kurtis',           slug: 'kurtis' },
    { label: 'Kurtas',           slug: 'kurtas' },
    { label: 'Kurta Sets',       slug: 'kurta-sets' },
    { label: 'Anarkali Suits',   slug: 'anarkali-suits' },
    { label: 'Salwar Suits',     slug: 'salwar-suits' },
    { label: 'Chikankari',       slug: 'chikankari' },
    { label: 'Co-Ord Sets',      slug: 'co-ord-sets' },
    { label: 'Cotton Kurtis',    slug: 'cotton-kurtis' },
    { label: 'Printed Kurtis',   slug: 'printed-kurtis' },
    { label: 'Embroidered Kurtis',slug:'embroidered-kurtis' },
    { label: 'A-Line Kurtis',    slug: 'a-line-kurtis' },
    { label: 'Straight Kurtis',  slug: 'straight-kurtis' },
  ];
  const WOMEN_BOTTOMS = [
    { label: 'Leggings', slug: 'leggings' },
    { label: 'Palazzo',  slug: 'palazzo' },
    { label: 'Pants',    slug: 'pants' },
    { label: 'Sharara',  slug: 'sharara' },
    { label: 'Gharara',  slug: 'gharara' },
  ];
  const WOMEN_WESTERN = [
    { label: 'Tops',          slug: 'tops' },
    { label: 'T-Shirts',      slug: 'women-t-shirts' },
    { label: 'Shirts',        slug: 'women-shirts' },
    { label: 'Jeans',         slug: 'women-jeans' },
    { label: 'Trousers',      slug: 'trousers' },
    { label: 'Dresses',       slug: 'dresses' },
    { label: 'Maxi Dresses',  slug: 'maxi-dresses' },
    { label: 'Midi Dresses',  slug: 'midi-dresses' },
    { label: 'Skirts',        slug: 'skirts' },
    { label: 'Jackets',       slug: 'women-jackets' },
    { label: 'Blazers',       slug: 'blazers' },
  ];
  const WOMEN_ACCESSORIES = [
    { label: 'Dupattas', slug: 'dupattas' },
    { label: 'Handbags', slug: 'handbags' },
    { label: 'Wallets',  slug: 'wallets' },
    { label: 'Belts',    slug: 'belts' },
    { label: 'Scarves',  slug: 'scarves' },
  ];

  const COLLECTIONS = MEN_COLLECTIONS; // kept for mobile menu backward compat
  const isHome = pathname === '/';
  const useDark = isHome && !scrolled;

  const navBg      = useDark ? '#1a1a18'                  : 'rgba(250,249,247,0.97)';
  const navBorder  = useDark ? 'rgba(250,249,247,0.08)'   : '#e6e0d8';
  const textColor  = useDark ? '#faf9f7'                  : '#1a1a18';
  const subColor   = useDark ? 'rgba(250,249,247,0.65)'   : '#5a5750';
  const shadow     = scrolled ? '0 2px 24px rgba(26,26,24,0.1)' : 'none';

  const iconBtn = {
    width: 40, height: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: textColor, transition: 'color 0.2s', position: 'relative',
  };

  const badgeStyle = {
    position: 'absolute', top: 3, right: 3,
    minWidth: 15, height: 15,
    background: '#c9a96e', color: '#1a1a18',
    fontSize: 8, fontWeight: 700, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 3px',
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 200 }}>

      {/* ── Announcement bar ─────────────────────────── */}
      <div style={{ background: '#1a1a18', padding: '8px 16px', textAlign: 'center', overflow: 'hidden' }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#9e9a94',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          dangerouslySetInnerHTML={{
            __html: settings.announcement_text || 'Free Shipping on Prepaid Orders &nbsp;&middot;&nbsp; Easy Returns &nbsp;&middot;&nbsp; COD Available'
          }}
        />
      </div>

      {/* ── Main nav ──────────────────────────────────── */}
      <nav style={{
        background: navBg,
        borderBottom: `1px solid ${navBorder}`,
        boxShadow: shadow,
        transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', height: 60, position: 'relative' }}>

          {/* Left nav — desktop only */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1 }}>
            {/* Men dropdown */}
            <div
              ref={menRef}
              onMouseEnter={() => { setMenOpen(true); setWomenOpen(false); }}
              onMouseLeave={() => setMenOpen(false)}
              style={{ position: 'relative' }}
            >
              <button
                onClick={() => { setMenOpen(o => !o); setWomenOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: menOpen ? '#c9a96e' : subColor, background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.2s', whiteSpace: 'nowrap', padding: 0,
                }}
              >
                Men <ChevronDown size={10} style={{ transition: 'transform 0.2s', transform: menOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {menOpen && (
                <div
                  className="fade-in"
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                    background: '#faf9f7', border: '1px solid #e6e0d8',
                    boxShadow: '0 16px 48px rgba(26,26,24,0.12)',
                    minWidth: 200, zIndex: 300, padding: '8px 0',
                  }}>
                  {/* Invisible hover bridge to fill the 8px gap */}
                  <div style={{ position: 'absolute', top: -10, left: 0, right: 0, height: 10, background: 'transparent' }} />
                  {MEN_COLLECTIONS.map(c => (
                    <Link key={c.label}
                      to={c.slug ? `/shop?gender=men&category=${c.slug}` : '/shop?gender=men'}
                      onClick={() => setMenOpen(false)}
                      style={{ display: 'block', padding: '9px 18px', fontSize: 13, color: '#2c2c29', textDecoration: 'none', borderBottom: '1px solid #f2ede6', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Women mega dropdown */}
            <div
              ref={womenRef}
              onMouseEnter={() => { setWomenOpen(true); setMenOpen(false); }}
              onMouseLeave={() => setWomenOpen(false)}
              style={{ position: 'relative' }}
            >
              <button
                onClick={() => { setWomenOpen(o => !o); setMenOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: womenOpen ? '#c9a96e' : subColor, background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.2s', whiteSpace: 'nowrap', padding: 0,
                }}
              >
                Women <ChevronDown size={10} style={{ transition: 'transform 0.2s', transform: womenOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {womenOpen && (
                <div
                  className="fade-in"
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                    background: '#faf9f7', border: '1px solid #e6e0d8',
                    boxShadow: '0 16px 48px rgba(26,26,24,0.12)',
                    width: 640, zIndex: 300, padding: '20px 24px',
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 24px',
                    maxWidth: 'calc(100vw - 32px)',
                  }}>
                  {/* Invisible hover bridge to fill the 8px gap */}
                  <div style={{ position: 'absolute', top: -10, left: 0, right: 0, height: 10, background: 'transparent' }} />
                  {/* Ethnic Wear */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Ethnic Wear</p>
                    {WOMEN_ETHNIC.map(c => (
                      <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setWomenOpen(false)}
                        style={{ display: 'block', padding: '6px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                        onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                  {/* Bottom Wear */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Bottom Wear</p>
                    {WOMEN_BOTTOMS.map(c => (
                      <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setWomenOpen(false)}
                        style={{ display: 'block', padding: '6px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                        onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>
                        {c.label}
                      </Link>
                    ))}
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginTop: 16, marginBottom: 10 }}>Accessories</p>
                    {WOMEN_ACCESSORIES.map(c => (
                      <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setWomenOpen(false)}
                        style={{ display: 'block', padding: '6px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                        onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                  {/* Western Wear */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Western Wear</p>
                    {WOMEN_WESTERN.map(c => (
                      <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setWomenOpen(false)}
                        style={{ display: 'block', padding: '6px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                        onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                  {/* All Women CTA */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Quick Links</p>
                      {[
                        { label: 'All Women', to: '/shop?gender=women' },
                        { label: 'New Arrivals', to: '/shop?gender=women&featured=true' },
                        { label: 'Best Sellers', to: '/shop?gender=women&sort=popular' },
                        { label: 'Trending Now', to: '/shop?gender=women&trending=true' },
                      ].map(item => (
                        <Link key={item.label} to={item.to} onClick={() => setWomenOpen(false)}
                          style={{ display: 'block', padding: '6px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none', fontWeight: 500 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                          onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <Link to="/shop?gender=women" onClick={() => setWomenOpen(false)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#1a1a18', color: '#faf9f7', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none', marginTop: 20, transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#c9a96e'}
                      onMouseLeave={e => e.currentTarget.style.background = '#1a1a18'}>
                      Shop All Women →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Regular nav links */}
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={label} to={to}
                style={{
                  fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: pathname === to ? '#c9a96e' : subColor,
                  textDecoration: 'none', transition: 'color 0.2s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                onMouseLeave={e => e.currentTarget.style.color = pathname === to ? '#c9a96e' : subColor}>
                {label}
              </Link>
            ))}
          </div>

          {/* Center — Logo */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'block', pointerEvents: 'auto' }}>
              <NorenLogo height={38} />
            </Link>
          </div>

          {/* Right — icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, justifyContent: 'flex-end' }}>

            {/* Search */}
            <button onClick={() => setSearchOpen(s => !s)} style={iconBtn} title="Search">
              <Search size={17} />
            </button>

            {user ? (
              <>
                {/* Notifications — desktop only, hidden on mobile */}
                <div ref={notifRef} style={{ position: 'relative' }} className="hide-mobile">
                  <button onClick={() => setNotifOpen(o => !o)} style={iconBtn} title="Notifications">
                    <Bell size={17} />
                    {notifCount > 0 && <span style={badgeStyle}>{notifCount > 9 ? '9+' : notifCount}</span>}
                  </button>
                  {notifOpen && <NotifDropdown onClose={() => setNotifOpen(false)} />}
                </div>

                {/* Wishlist — desktop only, hidden on mobile */}
                <Link to="/wishlist" className="hide-mobile" style={iconBtn} title="Wishlist">
                  <Heart size={17} />
                  {wishlistCount > 0 && <span style={badgeStyle}>{wishlistCount > 9 ? '9+' : wishlistCount}</span>}
                </Link>

                {/* Cart — always visible */}
                <Link to="/cart" style={iconBtn} title="Cart">
                  <ShoppingBag size={17} />
                  {cartCount > 0 && <span style={badgeStyle}>{cartCount > 9 ? '9+' : cartCount}</span>}
                </Link>

                {/* User avatar — always visible */}
                <div ref={dropRef} style={{ position: 'relative', marginLeft: 2 }}>
                  <button
                    onClick={() => setDropOpen(d => !d)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, minWidth: 40 }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #c9a96e' }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: useDark ? 'rgba(201,169,110,0.25)' : '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontSize: 11, fontWeight: 700 }}>
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                    }
                  </button>

                  {dropOpen && (
                    <div className="fade-in" style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: 'min(220px, calc(100vw - 24px))', background: '#faf9f7',
                      border: '1px solid #e6e0d8',
                      boxShadow: '0 12px 40px rgba(26,26,24,0.14)',
                      overflow: 'hidden', zIndex: 400,
                    }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e6e0d8', background: '#f5f0e8' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                        <div style={{ fontSize: 10, color: '#9e9a94', marginTop: 2, textTransform: 'capitalize', letterSpacing: '0.06em' }}>{(user.role || '').replace(/_/g, ' ')}</div>
                      </div>

                      {[
                        { to: '/profile',  Icon: User,    label: 'My Profile' },
                        { to: '/orders',   Icon: Package, label: 'My Orders'  },
                        { to: '/wishlist', Icon: Heart,   label: 'Wishlist'   },
                      ].map(({ to, Icon, label }) => (
                        <Link key={to} to={to} onClick={() => setDropOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13, color: '#2c2c29', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Icon size={13} color="#9e9a94" />
                          {label}
                        </Link>
                      ))}

                      {['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant'].includes(user.role) && (
                        <Link to="/admin" onClick={() => setDropOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13, color: '#c9a96e', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <LayoutDashboard size={13} color="#c9a96e" />
                          Admin Panel
                        </Link>
                      )}

                      <button
                        onClick={() => { logout(); navigate('/'); setDropOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', fontSize: 13, color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogOut size={13} color="#991b1b" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Not logged in — Login + Join on desktop, nothing extra on mobile (hamburger handles it) */
              <div className="hide-mobile-flex" style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
                <Link to="/login"
                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: subColor, textDecoration: 'none', padding: '6px 4px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                  onMouseLeave={e => e.currentTarget.style.color = subColor}>
                  Login
                </Link>
                <Link to="/register"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '8px 16px',
                    background: useDark ? '#c9a96e' : '#1a1a18',
                    color: useDark ? '#1a1a18' : '#faf9f7',
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                    textDecoration: 'none', border: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.color = '#1a1a18'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = useDark ? '#c9a96e' : '#1a1a18'; e.currentTarget.style.color = useDark ? '#1a1a18' : '#faf9f7'; }}>
                  Join NOREN
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="hide-desktop"
              style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: textColor, marginLeft: 2 }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Search bar ────────────────────────────── */}
        {searchOpen && (
          <div className="fade-in" style={{ borderTop: `1px solid ${navBorder}`, background: useDark ? '#1a1a18' : '#faf9f7', padding: '14px 20px' }}>
            <form onSubmit={handleSearch} style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10 }}>
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search NOREN collections..."
                style={{
                  flex: 1, padding: '11px 16px', fontSize: 16,
                  background: useDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  border: `1px solid ${useDark ? 'rgba(255,255,255,0.15)' : '#e6e0d8'}`,
                  color: useDark ? '#faf9f7' : '#1a1a18',
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#c9a96e'}
                onBlur={e => e.target.style.borderColor = useDark ? 'rgba(255,255,255,0.15)' : '#e6e0d8'}
              />
              <button type="submit"
                style={{ padding: '11px 24px', background: '#c9a96e', color: '#1a1a18', border: 'none', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Search
              </button>
            </form>
          </div>
        )}

        {/* ── Mobile menu ───────────────────────────── */}
        {menuOpen && (
          <div className="fade-in" style={{ borderTop: `1px solid ${navBorder}`, background: '#faf9f7', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ padding: '16px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>

              {/* Men's Collections */}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10, marginTop: 0 }}>
                Men's Collections
              </p>
              {MEN_COLLECTIONS.map(c => (
                <Link key={c.label}
                  to={c.slug ? `/shop?gender=men&category=${c.slug}` : '/shop?gender=men'}
                  onClick={() => setMenuOpen(false)}
                  style={{ display: 'block', padding: '10px 0', fontSize: 14, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6', letterSpacing: '0.01em' }}>
                  {c.label}
                </Link>
              ))}

              {/* Women's Collections */}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10, marginTop: 20 }}>
                Women's — Ethnic Wear
              </p>
              {WOMEN_ETHNIC.slice(0, 6).map(c => (
                <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setMenuOpen(false)}
                  style={{ display: 'block', padding: '10px 0', fontSize: 14, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                  {c.label}
                </Link>
              ))}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10, marginTop: 16 }}>
                Women's — Western Wear
              </p>
              {WOMEN_WESTERN.slice(0, 6).map(c => (
                <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setMenuOpen(false)}
                  style={{ display: 'block', padding: '10px 0', fontSize: 14, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                  {c.label}
                </Link>
              ))}
              <Link to="/shop?gender=women" onClick={() => setMenuOpen(false)}
                style={{ display: 'block', padding: '10px 0', fontSize: 13, color: '#c9a96e', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                → View All Women's
              </Link>

              <div style={{ marginTop: 16, paddingTop: 4 }}>
                {NAV_LINKS.map(({ to, label }) => (
                  <Link key={label} to={to} onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '10px 0', fontSize: 13, color: '#5a5750', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                    {label}
                  </Link>
                ))}
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e6e0d8' }}>
                {user ? (
                  <>
                    <Link to="/cart" onClick={() => setMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', fontSize: 13, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                      <span>Bag</span>
                      {cartCount > 0 && <span style={{ background: '#1a1a18', color: '#c9a96e', fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>{cartCount}</span>}
                    </Link>
                    <Link to="/wishlist" onClick={() => setMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', fontSize: 13, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                      <span>Wishlist</span>
                      {wishlistCount > 0 && <span style={{ background: '#1a1a18', color: '#c9a96e', fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>{wishlistCount}</span>}
                    </Link>
                    <Link to="/orders" onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '10px 0', fontSize: 13, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>My Orders</Link>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '10px 0', fontSize: 13, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>Profile</Link>
                    {['admin','super_admin','business_owner','store_admin','store_manager'].includes(user.role) && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)}
                        style={{ display: 'block', padding: '10px 0', fontSize: 13, color: '#c9a96e', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>Admin Panel</Link>
                    )}
                    <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 0', fontSize: 13, color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <Link to="/login" onClick={() => setMenuOpen(false)}
                      style={{ flex: 1, textAlign: 'center', padding: '11px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a1a18', textDecoration: 'none', border: '1px solid #1a1a18' }}>
                      Login
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)}
                      style={{ flex: 1, textAlign: 'center', padding: '11px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#faf9f7', textDecoration: 'none', background: '#1a1a18' }}>
                      Join NOREN
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

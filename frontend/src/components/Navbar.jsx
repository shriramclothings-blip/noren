import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { ShoppingBag, Search, Menu, X, User, LogOut, Package, LayoutDashboard, ChevronDown, Heart, Bell } from 'lucide-react';
import api from '../utils/api';

/* ─── Logo ─────────────────────────────────────────────── */
function Logo() {
  return (
    <img
      src="/logo.png"
      alt="NOREN"
      style={{ height: 36, width: 'auto', maxWidth: 120, objectFit: 'contain', display: 'block' }}
    />
  );
}

/* ─── Notification dropdown ────────────────────────────── */
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
      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
      width: 'min(320px, calc(100vw - 16px))', maxHeight: '80vh',
      background: '#faf9f7', border: '1px solid #e6e0d8',
      boxShadow: '0 16px 48px rgba(26,26,24,0.14)',
      zIndex: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e6e0d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1a1a18' }}>Notifications</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', display: 'flex', padding: 4 }}><X size={14} /></button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f2ede6' }}>
            <div className="skeleton" style={{ height: 12, borderRadius: 2, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 10, borderRadius: 2, width: '55%' }} />
          </div>
        )) : notifs.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Bell size={22} style={{ margin: '0 auto 8px', color: '#e6e0d8' }} />
            <p style={{ fontSize: 12, color: '#9e9a94' }}>No notifications yet</p>
          </div>
        ) : notifs.map(n => (
          <div key={n.id} onClick={onClose} style={{ padding: '12px 16px', borderBottom: '1px solid #f2ede6', cursor: 'pointer', background: n.is_read ? 'transparent' : '#f5f0e8' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.is_read ? 'transparent' : '#c9a96e', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#2c2c29', lineHeight: 1.5, marginBottom: 2 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: '#9e9a94' }}>{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid #e6e0d8', flexShrink: 0 }}>
        <Link to="/profile?tab=Notifications" onClick={onClose} style={{ fontSize: 11, color: '#c9a96e', fontWeight: 600, letterSpacing: '0.08em', textDecoration: 'none' }}>
          View all →
        </Link>
      </div>
    </div>
  );
}

/* ─── Main Navbar ──────────────────────────────────────── */
export default function Navbar() {
  const { user, logout, cartCount, wishlistCount, notifCount } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQ,     setSearchQ]     = useState('');
  const [menOpen,     setMenOpen]     = useState(false);
  const [womenOpen,   setWomenOpen]   = useState(false);

  const dropRef  = useRef(null);
  const notifRef = useRef(null);
  const menRef   = useRef(null);
  const womenRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  setDropOpen(false);
      if (menRef.current   && !menRef.current.contains(e.target))    setMenOpen(false);
      if (womenRef.current && !womenRef.current.contains(e.target))  setWomenOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    setMenuOpen(false); setDropOpen(false); setNotifOpen(false);
    setSearchOpen(false); setMenOpen(false); setWomenOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(searchQ.trim())}`);
    setSearchOpen(false); setSearchQ('');
  };

  const MEN_CATS = [
    { label: 'All Men',     slug: null },
    { label: 'T-Shirts',    slug: 't-shirts' },
    { label: 'Shirts',      slug: 'shirts' },
    { label: 'Polo',        slug: 'polo' },
    { label: 'Jeans',       slug: 'jeans' },
    { label: 'Cargo',       slug: 'cargo' },
    { label: 'Jackets',     slug: 'jackets' },
    { label: 'Hoodies',     slug: 'hoodies' },
    { label: 'Accessories', slug: 'accessories' },
    { label: 'Ethnic Wear', slug: 'ethnic-wear' },
  ];
  const WOMEN_ETHNIC = [
    { label: 'Kurtis', slug: 'kurtis' }, { label: 'Kurtas', slug: 'kurtas' },
    { label: 'Kurta Sets', slug: 'kurta-sets' }, { label: 'Anarkali Suits', slug: 'anarkali-suits' },
    { label: 'Salwar Suits', slug: 'salwar-suits' }, { label: 'Co-Ord Sets', slug: 'co-ord-sets' },
    { label: 'Cotton Kurtis', slug: 'cotton-kurtis' }, { label: 'Printed Kurtis', slug: 'printed-kurtis' },
    { label: 'Chikankari', slug: 'chikankari' }, { label: 'Straight Kurtis', slug: 'straight-kurtis' },
  ];
  const WOMEN_WESTERN = [
    { label: 'Tops', slug: 'tops' }, { label: 'Dresses', slug: 'dresses' },
    { label: 'Skirts', slug: 'skirts' }, { label: 'Jeans', slug: 'women-jeans' },
    { label: 'Trousers', slug: 'trousers' }, { label: 'Blazers', slug: 'blazers' },
    { label: 'Jackets', slug: 'women-jackets' }, { label: 'Leggings', slug: 'leggings' },
  ];
  const WOMEN_ACC = [
    { label: 'Dupattas', slug: 'dupattas' }, { label: 'Handbags', slug: 'handbags' },
    { label: 'Palazzo', slug: 'palazzo' }, { label: 'Scarves', slug: 'scarves' },
  ];
  const NAV_LINKS = [
    { to: '/shop',               label: 'Shop' },
    { to: '/shop?featured=true', label: 'New Arrivals' },
    { to: '/shop?sort=popular',  label: 'Best Sellers' },
    { to: '/contact',            label: 'About' },
  ];

  const isHome  = pathname === '/';
  const useDark = isHome && !scrolled;
  const navBg     = useDark ? '#1a1a18' : 'rgba(250,249,247,0.97)';
  const navBorder = useDark ? 'rgba(250,249,247,0.08)' : '#e6e0d8';
  const textClr   = useDark ? '#faf9f7' : '#1a1a18';
  const subClr    = useDark ? 'rgba(250,249,247,0.65)' : '#5a5750';

  const iconBtn = {
    width: 40, height: 44, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: textClr, position: 'relative',
  };
  const badge = {
    position: 'absolute', top: 6, right: 4,
    minWidth: 14, height: 14, background: '#c9a96e', color: '#1a1a18',
    fontSize: 8, fontWeight: 700, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px',
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 200 }}>

      {/* ── Announcement bar ── */}
      <div style={{ background: '#1a1a18', padding: '7px 12px', textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: '#9e9a94', margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          dangerouslySetInnerHTML={{ __html: settings.announcement_text || 'Free Shipping on Prepaid Orders &nbsp;&middot;&nbsp; Easy Returns &nbsp;&middot;&nbsp; COD Available' }} />
      </div>

      {/* ── Main nav bar ── */}
      <nav style={{ background: navBg, borderBottom: `1px solid ${navBorder}`, boxShadow: scrolled ? '0 2px 20px rgba(26,26,24,0.1)' : 'none', transition: 'all 0.3s ease' }}>
        <div className="wrap" style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>

          {/* ── LEFT: hamburger (mobile) + desktop nav links ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {/* Mobile hamburger — left side */}
            <button onClick={() => setMenuOpen(m => !m)}
              style={{ ...iconBtn, display: 'flex' }}
              className="hide-desktop"
              aria-label="Menu">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Desktop nav links */}
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Men dropdown */}
              <div ref={menRef} style={{ position: 'relative' }}
                onMouseEnter={() => { setMenOpen(true); setWomenOpen(false); }}
                onMouseLeave={() => setMenOpen(false)}>
                <button onClick={() => { setMenOpen(o => !o); setWomenOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: menOpen ? '#c9a96e' : subClr, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                  Men <ChevronDown size={10} style={{ transform: menOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>
                {menOpen && (
                  <div className="fade-in" style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, background: '#faf9f7', border: '1px solid #e6e0d8', boxShadow: '0 16px 48px rgba(26,26,24,0.12)', minWidth: 190, zIndex: 400, padding: '6px 0' }}>
                    <div style={{ position: 'absolute', top: -10, left: 0, right: 0, height: 10 }} />
                    {MEN_CATS.map(c => (
                      <Link key={c.label} to={c.slug ? `/shop?gender=men&category=${c.slug}` : '/shop?gender=men'} onClick={() => setMenOpen(false)}
                        style={{ display: 'block', padding: '9px 16px', fontSize: 13, color: '#2c2c29', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{c.label}</Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Women mega dropdown */}
              <div ref={womenRef} style={{ position: 'relative' }}
                onMouseEnter={() => { setWomenOpen(true); setMenOpen(false); }}
                onMouseLeave={() => setWomenOpen(false)}>
                <button onClick={() => { setWomenOpen(o => !o); setMenOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: womenOpen ? '#c9a96e' : subClr, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                  Women <ChevronDown size={10} style={{ transform: womenOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>
                {womenOpen && (
                  <div className="fade-in" style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, background: '#faf9f7', border: '1px solid #e6e0d8', boxShadow: '0 16px 48px rgba(26,26,24,0.12)', width: 580, maxWidth: 'calc(100vw - 32px)', zIndex: 400, padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
                    <div style={{ position: 'absolute', top: -10, left: 0, right: 0, height: 10 }} />
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Ethnic Wear</p>
                      {WOMEN_ETHNIC.map(c => (
                        <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setWomenOpen(false)}
                          style={{ display: 'block', padding: '5px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                          onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>{c.label}</Link>
                      ))}
                    </div>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Western Wear</p>
                      {WOMEN_WESTERN.map(c => (
                        <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setWomenOpen(false)}
                          style={{ display: 'block', padding: '5px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                          onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>{c.label}</Link>
                      ))}
                    </div>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Accessories</p>
                      {WOMEN_ACC.map(c => (
                        <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setWomenOpen(false)}
                          style={{ display: 'block', padding: '5px 0', fontSize: 13, color: '#2c2c29', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                          onMouseLeave={e => e.currentTarget.style.color = '#2c2c29'}>{c.label}</Link>
                      ))}
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f2ede6' }}>
                        {[{ label: 'New Arrivals', to: '/shop?gender=women&featured=true' }, { label: 'Best Sellers', to: '/shop?gender=women&sort=popular' }].map(i => (
                          <Link key={i.label} to={i.to} onClick={() => setWomenOpen(false)}
                            style={{ display: 'block', padding: '5px 0', fontSize: 13, color: '#c9a96e', textDecoration: 'none', fontWeight: 600 }}>{i.label}</Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Regular links */}
              {NAV_LINKS.map(({ to, label }) => (
                <Link key={label} to={to}
                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: pathname === to ? '#c9a96e' : subClr, textDecoration: 'none', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                  onMouseLeave={e => e.currentTarget.style.color = pathname === to ? '#c9a96e' : subClr}>{label}</Link>
              ))}
            </div>
          </div>

          {/* ── CENTER: Logo — always perfectly centered ── */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Logo />
          </Link>

          {/* ── RIGHT: action icons ── */}
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>

            {/* Search */}
            <button onClick={() => setSearchOpen(s => !s)} style={iconBtn} aria-label="Search">
              <Search size={18} />
            </button>

            {user ? (
              <>
                {/* Bell — desktop only */}
                <div ref={notifRef} style={{ position: 'relative' }} className="hide-mobile">
                  <button onClick={() => setNotifOpen(o => !o)} style={iconBtn} aria-label="Notifications">
                    <Bell size={18} />
                    {notifCount > 0 && <span style={badge}>{notifCount > 9 ? '9+' : notifCount}</span>}
                  </button>
                  {notifOpen && <NotifDropdown onClose={() => setNotifOpen(false)} />}
                </div>

                {/* Wishlist — desktop only */}
                <Link to="/wishlist" className="hide-mobile" style={iconBtn} aria-label="Wishlist">
                  <Heart size={18} />
                  {wishlistCount > 0 && <span style={badge}>{wishlistCount > 9 ? '9+' : wishlistCount}</span>}
                </Link>

                {/* Cart — always visible */}
                <Link to="/cart" style={iconBtn} aria-label="Cart">
                  <ShoppingBag size={18} />
                  {cartCount > 0 && <span style={badge}>{cartCount > 9 ? '9+' : cartCount}</span>}
                </Link>

                {/* Avatar dropdown — always visible */}
                <div ref={dropRef} style={{ position: 'relative' }}>
                  <button onClick={() => setDropOpen(d => !d)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 44, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #c9a96e' }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: useDark ? 'rgba(201,169,110,0.25)' : '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontSize: 12, fontWeight: 700 }}>
                          {user.name?.[0]?.toUpperCase()}
                        </div>}
                  </button>
                  {dropOpen && (
                    <div className="fade-in" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 'min(210px, calc(100vw - 16px))', background: '#faf9f7', border: '1px solid #e6e0d8', boxShadow: '0 12px 40px rgba(26,26,24,0.14)', overflow: 'hidden', zIndex: 500 }}>
                      <div style={{ padding: '12px 14px', background: '#f5f0e8', borderBottom: '1px solid #e6e0d8' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                        <div style={{ fontSize: 10, color: '#9e9a94', marginTop: 2, textTransform: 'capitalize' }}>{(user.role || '').replace(/_/g, ' ')}</div>
                      </div>
                      {[{ to: '/profile', Icon: User, label: 'My Profile' }, { to: '/orders', Icon: Package, label: 'My Orders' }, { to: '/wishlist', Icon: Heart, label: 'Wishlist' }].map(({ to, Icon, label }) => (
                        <Link key={to} to={to} onClick={() => setDropOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', fontSize: 13, color: '#2c2c29', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Icon size={13} color="#9e9a94" />{label}</Link>
                      ))}
                      {['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant'].includes(user.role) && (
                        <Link to="/admin" onClick={() => setDropOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', fontSize: 13, color: '#c9a96e', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <LayoutDashboard size={13} color="#c9a96e" />Admin Panel</Link>
                      )}
                      <button onClick={() => { logout(); navigate('/'); setDropOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', fontSize: 13, color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogOut size={13} color="#991b1b" />Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Not logged in */
              <>
                <Link to="/login" className="hide-mobile"
                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: subClr, textDecoration: 'none', padding: '6px 8px', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                  onMouseLeave={e => e.currentTarget.style.color = subClr}>Login</Link>
                <Link to="/register" className="hide-mobile"
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 14px', background: useDark ? '#c9a96e' : '#1a1a18', color: useDark ? '#1a1a18' : '#faf9f7', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 4 }}>
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Search bar ── */}
      {searchOpen && (
        <div className="fade-in" style={{ background: useDark ? '#1a1a18' : '#faf9f7', borderBottom: `1px solid ${navBorder}`, padding: '12px 16px' }}>
          <form onSubmit={handleSearch} style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 8 }}>
            <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search NOREN collections..."
              style={{ flex: 1, padding: '11px 14px', fontSize: 16, background: useDark ? 'rgba(255,255,255,0.08)' : '#fff', border: `1px solid ${useDark ? 'rgba(255,255,255,0.15)' : '#e6e0d8'}`, color: useDark ? '#faf9f7' : '#1a1a18', outline: 'none', fontFamily: 'inherit', borderRadius: 0 }}
              onFocus={e => e.target.style.borderColor = '#c9a96e'}
              onBlur={e => e.target.style.borderColor = useDark ? 'rgba(255,255,255,0.15)' : '#e6e0d8'} />
            <button type="submit" style={{ padding: '11px 20px', background: '#c9a96e', color: '#1a1a18', border: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>Go</button>
          </form>
        </div>
      )}

      {/* ── Mobile full-screen menu ── */}
      {menuOpen && (
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#faf9f7', zIndex: 300, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Top bar inside menu */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56, borderBottom: '1px solid #e6e0d8', flexShrink: 0 }}>
            <Link to="/" onClick={() => setMenuOpen(false)}>
              <Logo />
            </Link>
            <button onClick={() => setMenuOpen(false)} style={{ width: 40, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a18' }}>
              <X size={22} />
            </button>
          </div>

          <div style={{ padding: '16px 20px', flex: 1 }}>
            {/* Search */}
            <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search products..."
                style={{ flex: 1, padding: '11px 14px', fontSize: 16, border: '1.5px solid #e6e0d8', background: '#fff', color: '#1a1a18', outline: 'none', fontFamily: 'inherit', borderRadius: 8 }} />
              <button type="submit" style={{ padding: '11px 16px', background: '#1a1a18', color: '#faf9f7', border: 'none', borderRadius: 8, cursor: 'pointer' }}><Search size={16} /></button>
            </form>

            {/* Men's section */}
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 8 }}>Men's Collections</p>
            {MEN_CATS.map(c => (
              <Link key={c.label} to={c.slug ? `/shop?gender=men&category=${c.slug}` : '/shop?gender=men'} onClick={() => setMenuOpen(false)}
                style={{ display: 'block', padding: '12px 0', fontSize: 15, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                {c.label}
              </Link>
            ))}

            {/* Women's section */}
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginTop: 20, marginBottom: 8 }}>Women's — Ethnic</p>
            {WOMEN_ETHNIC.slice(0, 6).map(c => (
              <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setMenuOpen(false)}
                style={{ display: 'block', padding: '12px 0', fontSize: 15, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                {c.label}
              </Link>
            ))}
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginTop: 16, marginBottom: 8 }}>Women's — Western</p>
            {WOMEN_WESTERN.slice(0, 5).map(c => (
              <Link key={c.slug} to={`/shop?gender=women&category=${c.slug}`} onClick={() => setMenuOpen(false)}
                style={{ display: 'block', padding: '12px 0', fontSize: 15, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                {c.label}
              </Link>
            ))}
            <Link to="/shop?gender=women" onClick={() => setMenuOpen(false)}
              style={{ display: 'block', padding: '12px 0', fontSize: 13, color: '#c9a96e', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
              → View All Women's
            </Link>

            {/* Other links */}
            <div style={{ marginTop: 16 }}>
              {NAV_LINKS.map(({ to, label }) => (
                <Link key={label} to={to} onClick={() => setMenuOpen(false)}
                  style={{ display: 'block', padding: '12px 0', fontSize: 14, color: '#5a5750', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                  {label}
                </Link>
              ))}
            </div>

            {/* Auth / user actions */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '2px solid #e6e0d8' }}>
              {user ? (
                <>
                  <div style={{ padding: '12px 0', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18' }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: '#9e9a94', marginTop: 2 }}>{user.email}</div>
                  </div>
                  {[{ to: '/profile', label: 'My Profile' }, { to: '/orders', label: 'My Orders' }, { to: '/wishlist', label: 'Wishlist' }, { to: '/cart', label: `Cart${cartCount > 0 ? ` (${cartCount})` : ''}` }].map(({ to, label }) => (
                    <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '12px 0', fontSize: 14, color: '#1a1a18', textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                      {label}
                    </Link>
                  ))}
                  {['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant'].includes(user.role) && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '12px 0', fontSize: 14, color: '#c9a96e', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid #f2ede6' }}>
                      Admin Panel
                    </Link>
                  )}
                  <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', fontSize: 14, color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                    Sign Out
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link to="/login" onClick={() => setMenuOpen(false)}
                    style={{ flex: 1, textAlign: 'center', padding: '13px', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1a18', textDecoration: 'none', border: '1.5px solid #1a1a18', borderRadius: 8 }}>
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}
                    style={{ flex: 1, textAlign: 'center', padding: '13px', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#faf9f7', textDecoration: 'none', background: '#1a1a18', borderRadius: 8 }}>
                    Join NOREN
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

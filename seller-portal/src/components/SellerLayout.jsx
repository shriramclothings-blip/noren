import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSellerAuth } from '../context/SellerAuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, Wallet, ShieldCheck,
  User, LogOut, Menu, X, ChevronRight, AlertTriangle, Store, BarChart3,
} from 'lucide-react';

const NAV = [
  { path: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/products',  label: 'My Products', icon: Package },
  { path: '/inventory', label: 'Inventory',   icon: BarChart3 },
  { path: '/orders',    label: 'Orders',      icon: ShoppingCart },
  { path: '/payouts',   label: 'Payouts',     icon: Wallet },
  { path: '/kyc',       label: 'KYC & Docs',  icon: ShieldCheck },
  { path: '/profile',   label: 'Profile',     icon: User },
];

const STATUS_BADGE = {
  pending:   { bg: '#fef9c3', color: '#854d0e', label: 'Pending Approval' },
  active:    { bg: '#dcfce7', color: '#15803d', label: 'Active Seller' },
  suspended: { bg: '#fee2e2', color: '#b91c1c', label: 'Suspended' },
  rejected:  { bg: '#f3f4f6', color: '#6b7280', label: 'Rejected' },
  banned:    { bg: '#450a0a', color: '#fca5a5', label: 'Banned' },
};

export default function SellerLayout({ children }) {
  const { user, profile, logout } = useSellerAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const badge = STATUS_BADGE[profile?.status] || STATUS_BADGE.pending;

  const Sidebar = ({ mobile = false }) => (
    <aside style={{
      width: 240,
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Brand */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 20, letterSpacing: '0.32em', color: '#faf9f7', textTransform: 'uppercase' }}>NOREN</div>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#c9a96e', textTransform: 'uppercase', marginTop: 2 }}>Seller Portal</div>
        </div>
        {mobile && <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}><X size={16} /></button>}
      </div>

      {/* Seller info */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(201,169,110,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
              : <Store size={16} color="#c9a96e" />
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.brand_name || user?.name}</div>
            <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </div>
        {profile && (
          <div style={{ marginTop: 10, padding: '4px 10px', borderRadius: 999, background: badge.bg, display: 'inline-block' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: badge.color }}>{badge.label}</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {profile?.kyc_status === 'pending' && (
        <div style={{ margin: '10px 12px 0', padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} color="#fbbf24" />
            <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>KYC pending — upload docs</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
          return (
            <button key={path} onClick={() => { navigate(path); setMobileOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(201,169,110,0.12)' : 'transparent',
                color: active ? '#c9a96e' : '#64748b',
                borderLeft: `2px solid ${active ? '#c9a96e' : 'transparent'}`,
                fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left',
                marginBottom: 2, transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#cbd5e1'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
            >
              <Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={12} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: 13, transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <LogOut size={14} /><span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'none', height: '100vh', flexShrink: 0 }} className="sp-sidebar-desktop">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.7)' }} onClick={() => setMobileOpen(false)} />
          <div style={{ position: 'relative', zIndex: 51, height: '100vh' }}><Sidebar mobile /></div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .sp-sidebar-desktop { display: block !important; } .sp-hamburger { display: none !important; } }
      `}</style>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ height: 52, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
          <button className="sp-hamburger" onClick={() => setMobileOpen(true)}
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: 8, background: 'none', cursor: 'pointer', color: '#374151' }}>
            <Menu size={18} />
          </button>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 17, letterSpacing: '0.2em', color: '#0f172a' }}>NOREN</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.name}</div>
          {profile?.status === 'active' && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px #dcfce7' }} />
          )}
        </header>

        {/* Main */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 22px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

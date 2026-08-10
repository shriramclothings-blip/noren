import { useState, useEffect, useMemo, lazy, Suspense, Component } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminPushSubscription from '../../components/AdminPushSubscription';
import {
  BadgePercent, BarChart3, Bell, Boxes, BriefcaseBusiness, Building2,
  CalendarClock, Cloud, Cpu, Crown, DollarSign, Eye, FileClock,
  FolderOpen, KeyRound, Layout, LayoutDashboard, LogOut, Mail,
  MapPinned, Menu, MessageCircle, MessageSquare, Package, Phone,
  ReceiptText, ScanLine, Settings, ShieldCheck, ShoppingCart, Sparkles,
  Star, Store, Tag, Truck, Undo2, UsersRound, Video, Wallet, Warehouse,
  AlertTriangle, ChevronDown, RefreshCw, Link2, X, Megaphone,
} from 'lucide-react';
import api from '../../utils/api';
import AdminOverview from './AdminOverview';
import AdminProducts from './AdminProducts';
import AdminDelivery from './AdminDelivery';
import AdminCoupons from './AdminCoupons';
import AdminCategories from './AdminCategories';
import AdminBrands from './AdminBrands';
import AdminHomepage from './AdminHomepage';
import AdminQueries from './AdminQueries';
import AdminNotifications from './AdminNotifications';
import AdminUsers from './AdminUsers';
import AdminReviews from './AdminReviews';
import AdminCloudStorage from './AdminCloudStorage';
import AdminErp from './AdminErp';
import AdminModuleWorkspace from './AdminModuleWorkspace';
import AdminPaymentSettings from './AdminPaymentSettings';
import AdminOrders from './AdminOrders';
import AdminLoginSessions from './AdminLoginSessions';
const AdminUTMTracker          = lazy(() => import('./erp/AdminUTMTracker'));
const AdminAIAssistant         = lazy(() => import('./erp/AdminAIAssistant'));
const AdminInfluencers         = lazy(() => import('./erp/AdminInfluencers'));
const AdminInfluencerCampaigns = lazy(() => import('./erp/AdminInfluencerCampaigns'));
const AdminInfluencerLinks     = lazy(() => import('./erp/AdminInfluencerLinks'));
const AdminInfluencerPayouts   = lazy(() => import('./erp/AdminInfluencerPayouts'));
const AdminInfluencerConversions = lazy(() => import('./erp/AdminInfluencerConversions'));
const AdminInfluencerFraud     = lazy(() => import('./erp/AdminInfluencerFraud'));
const AdminInfluencerAudit     = lazy(() => import('./erp/AdminInfluencerAudit'));
const AdminPos                 = lazy(() => import('./erp/AdminPos'));
const AdminInventory           = lazy(() => import('./erp/AdminInventory'));
const AdminWarehouse           = lazy(() => import('./erp/AdminWarehouse'));
const AdminCustomers           = lazy(() => import('./erp/AdminCustomers'));
const AdminSuppliers           = lazy(() => import('./erp/AdminSuppliers'));
const AdminPurchases           = lazy(() => import('./erp/AdminPurchases'));
const AdminReturns             = lazy(() => import('./erp/AdminReturns'));
const AdminReports             = lazy(() => import('./erp/AdminReports'));
const AdminEmployees           = lazy(() => import('./erp/AdminEmployees'));
const AdminAttendance          = lazy(() => import('./erp/AdminAttendance'));
const AdminPayroll             = lazy(() => import('./erp/AdminPayroll'));
const AdminExpenses            = lazy(() => import('./erp/AdminExpenses'));
const AdminAuditLogs           = lazy(() => import('./erp/AdminAuditLogs'));
const BarcodeEngine            = lazy(() => import('./erp/BarcodeEngine'));
const AdminSalesOrders         = lazy(() => import('./erp/AdminSalesOrders'));
const AdminSettings            = lazy(() => import('./erp/AdminSettings'));
const BusinessConfigSettings   = lazy(() => import('./erp/BusinessConfigSettings'));
const AdminStoreManagement     = lazy(() => import('./erp/AdminStoreManagement'));
const AdminRoleManagement      = lazy(() => import('./erp/AdminRoleManagement'));
const AdminSuperAdmin          = lazy(() => import('./erp/AdminSuperAdmin'));
const InvoiceDesigner          = lazy(() => import('./erp/InvoiceDesigner'));
const AdminChatSupport         = lazy(() => import('./erp/AdminChatSupport'));
const AdminPrivateChat         = lazy(() => import('./erp/AdminPrivateChat'));
const AdminConversationMonitor = lazy(() => import('./erp/AdminConversationMonitor'));
const AdminVideoCalls          = lazy(() => import('./erp/AdminVideoCalls'));
const AdminVoiceCalls          = lazy(() => import('./erp/AdminVoiceCalls'));
const AdminEmailCenter         = lazy(() => import('./erp/AdminEmailCenter'));
const AdminSellerOverview      = lazy(() => import('./erp/seller/AdminSellerOverview'));
const AdminSellerAccounts      = lazy(() => import('./erp/seller/AdminSellerAccounts'));
const AdminSellerKYC           = lazy(() => import('./erp/seller/AdminSellerKYC'));
const AdminSellerProducts      = lazy(() => import('./erp/seller/AdminSellerProducts'));
const AdminSellerPayouts       = lazy(() => import('./erp/seller/AdminSellerPayouts'));
const AdminSellerAudit         = lazy(() => import('./erp/seller/AdminSellerAudit'));
import { ADMIN_ROUTE_ALIASES, ERP_MODULE_MAP, getVisibleNavGroups, canAccessModule } from './erpConfig';

const iconMap = {
  LayoutDashboard, Cpu, ScanLine, Boxes, Package, FolderOpen, BadgePercent,
  UsersRound, Truck, ShoppingCart, ReceiptText, Undo2, Warehouse, BarChart3,
  BriefcaseBusiness, CalendarClock, DollarSign, Wallet, Bell, Settings,
  Building2, Store, ShieldCheck, KeyRound, FileClock, Crown, Layout,
  MapPinned, MessageSquare, MessageCircle, Video, Phone, Star, Tag,
  Cloud, Eye, Mail, Link2, Sparkles, Megaphone,
};

const MOBILE_TABS = [
  { key: 'dashboard', label: 'Home',     icon: 'LayoutDashboard' },
  { key: 'orders',    label: 'Orders',   icon: 'ShoppingCart'    },
  { key: 'products',  label: 'Products', icon: 'Package'         },
  { key: 'pos',       label: 'POS',      icon: 'ScanLine'        },
  { key: '__menu__',  label: 'Menu',     icon: '__menu__'        },
];

/* ─── Error boundary ─────────────────────────────────────────────────────── */
class ModuleErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e) { console.error('ERP Module Error:', e); }
  render() {
    if (this.state.hasError) return (
      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
        <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 12px', display: 'block' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Module failed to load</div>
        <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{this.state.error?.message || 'Unexpected error'}</div>
        <button onClick={() => this.setState({ hasError: false, error: null })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: '#c9a96e', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
    return this.props.children;
  }
}

const ModuleLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
    {[100, 48, 48, 48].map((h, i) => (
      <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />
    ))}
  </div>
);

/* ─── Section renderer ───────────────────────────────────────────────────── */
function renderSection(section, user, navigate) {
  const mod = ERP_MODULE_MAP[section];
  const key = mod?.componentKey || section;
  switch (key) {
    case 'dashboard':         return <AdminOverview onOpenCloud={() => navigate('/admin/cloud')} />;
    case 'erp':               return <AdminErp />;
    case 'pos':               return <AdminPos />;
    case 'inventory':         return <AdminInventory />;
    case 'warehouse':         return <AdminWarehouse />;
    case 'brands':            return <AdminBrands />;
    case 'customers':         return <AdminCustomers />;
    case 'suppliers':         return <AdminSuppliers />;
    case 'purchases':         return <AdminPurchases />;
    case 'returns':           return <AdminReturns />;
    case 'reports':           return <AdminReports />;
    case 'employees':         return <AdminEmployees />;
    case 'attendance':        return <AdminAttendance />;
    case 'payroll':           return <AdminPayroll />;
    case 'expenses':          return <AdminExpenses />;
    case 'audit-logs':        return <AdminAuditLogs />;
    case 'barcode-engine':    return <BarcodeEngine />;
    case 'sales':
    case 'sales-orders':      return <AdminSalesOrders />;
    case 'settings':
    case 'business-settings': return <AdminSettings />;
    case 'business-config':   return <BusinessConfigSettings />;
    case 'store-management':  return <AdminStoreManagement />;
    case 'role-management':   return <AdminRoleManagement />;
    case 'super-admin':       return <AdminSuperAdmin />;
    case 'chat-support':      return <AdminChatSupport />;
    case 'email-center':      return <AdminEmailCenter />;
    case 'private-chat':      return <AdminPrivateChat />;
    case 'conversations':     return <AdminConversationMonitor />;
    case 'video-calls':       return <AdminVideoCalls />;
    case 'voice-calls':       return <AdminVoiceCalls />;
    case 'invoice-designer':  return <InvoiceDesigner />;
    case 'homepage':          return <AdminHomepage />;
    case 'products':          return <AdminProducts />;
    case 'delivery':          return <AdminDelivery />;
    case 'cloud':             return <AdminCloudStorage />;
    case 'reviews':           return <AdminReviews />;
    case 'user-management':   return <AdminUsers />;
    case 'queries':           return <AdminQueries />;
    case 'notifications':     return <AdminNotifications />;
    case 'categories':        return <AdminCategories />;
    case 'coupons':           return <AdminCoupons />;
    case 'payment-settings':  return <AdminPaymentSettings />;
    case 'orders':            return <AdminOrders />;
    case 'login-sessions':    return <AdminLoginSessions />;
    case 'utm-tracker':       return <AdminUTMTracker />;
    case 'ai-assistant':      return <AdminAIAssistant />;
    case 'influencers':       return <AdminInfluencers />;
    case 'inf-campaigns':     return <AdminInfluencerCampaigns />;
    case 'inf-links':         return <AdminInfluencerLinks />;
    case 'inf-conversions':   return <AdminInfluencerConversions />;
    case 'inf-payouts':       return <AdminInfluencerPayouts />;
    case 'inf-fraud':         return <AdminInfluencerFraud />;
    case 'inf-audit':         return <AdminInfluencerAudit />;
    // Seller Marketplace
    case 'seller-overview':   return <AdminSellerOverview />;
    case 'seller-accounts':   return <AdminSellerAccounts />;
    case 'seller-kyc':        return <AdminSellerKYC />;
    case 'seller-products':   return <AdminSellerProducts />;
    case 'seller-payouts':    return <AdminSellerPayouts />;
    case 'seller-audit':      return <AdminSellerAudit />;
    default:                  return <AdminModuleWorkspace module={mod} user={user} />;
  }
}

/* ─── Sidebar (defined outside component — never remounts) ──────────────── */
function Sidebar({ collapsed, onToggleCollapse, filteredGroups, sidebarFilter,
  setSidebarFilter, section, navigate, onClose, user, handleLogout, isMobileDrawer }) {

  return (
    <aside style={{
      width: collapsed ? 64 : 256,
      minWidth: collapsed ? 64 : 256,
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      position: 'relative',
    }}>

      {/* ── Brand row ─────────────────────────────────────────────────── */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 14px',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <img src="/logo.png" alt="NOREN"
            style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ lineHeight: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.04em' }}>NOREN</div>
              <div style={{ fontSize: 9, color: '#c9a96e', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 2 }}>ERP Admin</div>
            </div>
          )}
        </div>
        {isMobileDrawer ? (
          <button onClick={onClose} style={btnReset({ color: '#64748b' })}><X size={15} /></button>
        ) : (
          <button onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'} style={btnReset({ color: '#475569' })}>
            <ChevronDown size={14} style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <input
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder="Search modules…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, padding: '6px 10px',
              color: '#94a3b8', fontSize: 12, outline: 'none',
            }}
          />
        </div>
      )}

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="admin-sidebar-nav" style={{
        flex: 1, overflowY: 'scroll', overflowX: 'hidden',
        padding: collapsed ? '6px 4px' : '4px 6px 8px',
        scrollbarWidth: 'none',       /* Firefox */
        msOverflowStyle: 'none',      /* IE/Edge */
      }}>
        {filteredGroups.length === 0 && (
          <div style={{ padding: '12px 10px', fontSize: 12, color: '#475569' }}>No results</div>
        )}
        {filteredGroups.map((group, gi) => (
          <div key={group.key}>
            {!collapsed && (
              <div style={{
                padding: gi === 0 ? '8px 10px 3px' : '12px 10px 3px',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.11em',
                textTransform: 'uppercase',
                color: '#334155',
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(({ key, label, icon }) => {
              const Icon = iconMap[icon] || LayoutDashboard;
              const active = section === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    navigate(key === 'dashboard' ? '/admin/dashboard' : `/admin/${key}`);
                    onClose();
                  }}
                  title={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: collapsed ? '8px 0' : '7px 10px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: active ? 'rgba(201,169,110,0.13)' : 'transparent',
                    color: active ? '#c9a96e' : '#64748b',
                    border: 'none',
                    borderLeft: active && !collapsed ? '2px solid #c9a96e' : '2px solid transparent',
                    borderRadius: collapsed ? 6 : '0 6px 6px 0',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 400,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    lineHeight: '18px',
                    marginBottom: 1,
                    transition: 'background 0.1s, color 0.1s',
                    outline: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#cbd5e1'; }
                  }}
                  onMouseLeave={e => {
                    if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }
                  }}
                >
                  <Icon size={14} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                  {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 8px', flexShrink: 0 }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 8px' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(201,169,110,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c9a96e', fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'capitalize' }}>{String(user?.role || '').replace(/_/g, ' ')}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
            borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#ef4444', background: 'transparent',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Sign Out"
        >
          <LogOut size={13} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

/* tiny helper — reset button style base */
function btnReset(extra = {}) {
  return {
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, padding: 0, flexShrink: 0,
    ...extra,
  };
}

/* ─── Main dashboard shell ───────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const [section,       setSection]       = useState('dashboard');
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [collapsed,     setCollapsed]     = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [erpBootstrap,  setErpBootstrap]  = useState(null);

  const visibleGroups  = useMemo(() => getVisibleNavGroups(user), [user]);
  const visibleItems   = useMemo(() => visibleGroups.flatMap(g => g.items), [visibleGroups]);
  const filteredGroups = useMemo(() => {
    const q = sidebarFilter.trim().toLowerCase();
    if (!q) return visibleGroups;
    return visibleGroups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [visibleGroups, sidebarFilter]);

  const handleLogout = () => { logout(); navigate('/'); };

  /* URL → section */
  useEffect(() => {
    if (!user) return;
    const raw  = location.pathname.replace(/^\/admin\/?/, '');
    const cand = raw.split('/')[0] || 'dashboard';
    const norm = ADMIN_ROUTE_ALIASES[cand] || cand;
    if (!cand) { setSection('dashboard'); return; }
    const mod = ERP_MODULE_MAP[norm];
    if (!mod) { setSection('dashboard'); return; }
    setSection(canAccessModule(user, mod) ? norm : 'dashboard');
  }, [location.pathname, user]);

  /* ERP bootstrap */
  useEffect(() => {
    if (!user) return;
    api.get('/erp/bootstrap').then(r => setErpBootstrap(r.data)).catch(() => {});
  }, [user]);

  /* Body scroll lock when mobile drawer is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const defaultSection = visibleItems.find(i => i.key === 'dashboard')?.key || visibleItems[0]?.key || 'dashboard';
  const activeNav = ERP_MODULE_MAP[section] || ERP_MODULE_MAP[defaultSection] || { label: 'Dashboard', description: 'Admin workspace' };

  const sharedSidebarProps = {
    filteredGroups, sidebarFilter, setSidebarFilter,
    section, navigate,
    onClose: () => setMobileOpen(false),
    user, handleLogout,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>

      {/* ══ DESKTOP SIDEBAR ══════════════════════════════════════════════════ */}
      <div className="hide-mobile" style={{ height: '100vh', flexShrink: 0 }}>
        <Sidebar
          {...sharedSidebarProps}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(p => !p)}
          isMobileDrawer={false}
        />
      </div>

      {/* ══ MOBILE DRAWER ════════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.7)' }}
            onClick={() => setMobileOpen(false)} />
          <div style={{ position: 'relative', zIndex: 51, animation: 'slideInLeft 0.2s ease' }}>
            <Sidebar {...sharedSidebarProps} collapsed={false} onToggleCollapse={() => {}} isMobileDrawer={true} />
          </div>
        </div>
      )}

      {/* ══ CONTENT ══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{
          height: 56,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* Hamburger — mobile only */}
            <button
              className="hide-desktop"
              onClick={() => setMobileOpen(true)}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: 8, background: 'none', cursor: 'pointer', color: '#374151', flexShrink: 0 }}
            >
              <Menu size={18} />
            </button>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{activeNav.label}</h1>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 600 }}>
                {activeNav.description || 'Integrated admin workspace'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <AdminPushSubscription />
            <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{erpBootstrap?.tenant?.business_name || 'NOREN'}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{erpBootstrap?.tenant?.store_name || 'Main workspace'}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px #dcfce7' }} />
          </div>
        </header>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 22px',
          paddingBottom: 'max(20px, calc(64px + env(safe-area-inset-bottom, 0px)))',
        }}>
          <ModuleErrorBoundary key={section}>
            <Suspense fallback={<ModuleLoader />}>
              {renderSection(section, user, navigate)}
            </Suspense>
          </ModuleErrorBoundary>
        </main>
      </div>

      {/* ══ MOBILE BOTTOM NAV ════════════════════════════════════════════════ */}
      <nav
        className="hide-desktop"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: '#0f172a',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {MOBILE_TABS.map(tab => {
          const isMenu   = tab.key === '__menu__';
          const Icon     = isMenu ? Menu : (iconMap[tab.icon] || LayoutDashboard);
          const isActive = !isMenu && section === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => isMenu ? setMobileOpen(true) : navigate(tab.key === 'dashboard' ? '/admin/dashboard' : `/admin/${tab.key}`)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '9px 4px 10px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: isActive ? '#c9a96e' : '#475569',
                borderTop: isActive ? '2px solid #c9a96e' : '2px solid transparent',
              }}
            >
              <Icon size={19} />
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

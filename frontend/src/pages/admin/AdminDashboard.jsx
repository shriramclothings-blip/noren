import { useState, useEffect, useMemo, lazy, Suspense, Component } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BadgePercent, BarChart3, Bell, Boxes, BriefcaseBusiness, Building2,
  CalendarClock, Cloud, Cpu, Crown, DollarSign, Eye, FileClock,
  FolderOpen, KeyRound, Layout, LayoutDashboard, LogOut, Mail,
  MapPinned, Menu, MessageCircle, MessageSquare, Package, Phone,
  ReceiptText, ScanLine, Settings, ShieldCheck, ShoppingCart, Sparkles,
  Star, Store, Tag, Truck, Undo2, UsersRound, Video, Wallet, Warehouse,
  AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Link2, X,
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
const AdminUTMTracker     = lazy(() => import('./erp/AdminUTMTracker'));
const AdminAIAssistant    = lazy(() => import('./erp/AdminAIAssistant'));
const AdminPos            = lazy(() => import('./erp/AdminPos'));
const AdminInventory      = lazy(() => import('./erp/AdminInventory'));
const AdminWarehouse      = lazy(() => import('./erp/AdminWarehouse'));
const AdminCustomers      = lazy(() => import('./erp/AdminCustomers'));
const AdminSuppliers      = lazy(() => import('./erp/AdminSuppliers'));
const AdminPurchases      = lazy(() => import('./erp/AdminPurchases'));
const AdminReturns        = lazy(() => import('./erp/AdminReturns'));
const AdminReports        = lazy(() => import('./erp/AdminReports'));
const AdminEmployees      = lazy(() => import('./erp/AdminEmployees'));
const AdminAttendance     = lazy(() => import('./erp/AdminAttendance'));
const AdminPayroll        = lazy(() => import('./erp/AdminPayroll'));
const AdminExpenses       = lazy(() => import('./erp/AdminExpenses'));
const AdminAuditLogs      = lazy(() => import('./erp/AdminAuditLogs'));
const BarcodeEngine       = lazy(() => import('./erp/BarcodeEngine'));
const AdminSalesOrders    = lazy(() => import('./erp/AdminSalesOrders'));
const AdminSettings       = lazy(() => import('./erp/AdminSettings'));
const AdminStoreManagement = lazy(() => import('./erp/AdminStoreManagement'));
const AdminRoleManagement  = lazy(() => import('./erp/AdminRoleManagement'));
const AdminSuperAdmin      = lazy(() => import('./erp/AdminSuperAdmin'));
const InvoiceDesigner      = lazy(() => import('./erp/InvoiceDesigner'));
const AdminChatSupport     = lazy(() => import('./erp/AdminChatSupport'));
const AdminPrivateChat     = lazy(() => import('./erp/AdminPrivateChat'));
const AdminConversationMonitor = lazy(() => import('./erp/AdminConversationMonitor'));
const AdminVideoCalls      = lazy(() => import('./erp/AdminVideoCalls'));
const AdminVoiceCalls      = lazy(() => import('./erp/AdminVoiceCalls'));
const AdminEmailCenter     = lazy(() => import('./erp/AdminEmailCenter'));
import { ADMIN_ROUTE_ALIASES, ERP_MODULE_MAP, getVisibleNavGroups, canAccessModule } from './erpConfig';

const iconMap = {
  LayoutDashboard, Cpu, ScanLine, Boxes, Package, FolderOpen, BadgePercent,
  UsersRound, Truck, ShoppingCart, ReceiptText, Undo2, Warehouse, BarChart3,
  BriefcaseBusiness, CalendarClock, DollarSign, Wallet, Bell, Settings,
  Building2, Store, ShieldCheck, KeyRound, FileClock, Crown, Layout,
  MapPinned, MessageSquare, MessageCircle, Video, Phone, Star, Tag,
  Cloud, Eye, Mail, Link2, Sparkles,
};

// ── Mobile bottom nav tabs (most common actions) ─────────────────────────────
const MOBILE_TABS = [
  { key: 'dashboard',  label: 'Home',      icon: 'LayoutDashboard' },
  { key: 'orders',     label: 'Orders',    icon: 'ShoppingCart'    },
  { key: 'products',   label: 'Products',  icon: 'Package'         },
  { key: 'pos',        label: 'POS',       icon: 'ScanLine'        },
  { key: '__menu__',   label: 'Menu',      icon: 'Menu'            },
];

// ── Error boundary ────────────────────────────────────────────────────────────
class ModuleErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(err) { console.error('ERP Module Error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '32px 24px', textAlign: 'center', margin: 16 }}>
          <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Module failed to load</div>
          <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{this.state.error?.message || 'An unexpected error occurred'}</div>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: '#c9a96e', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ModuleLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
    {[80, 40, 40, 40].map((h, i) => (
      <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />
    ))}
  </div>
);

// ── renderSection ─────────────────────────────────────────────────────────────
function renderSection(section, user, navigate) {
  const module = ERP_MODULE_MAP[section];
  const componentKey = module?.componentKey || section;
  switch (componentKey) {
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
    default:                  return <AdminModuleWorkspace module={module} user={user} />;
  }
}

// ── Sidebar inner content (shared between desktop + mobile drawer) ────────────
function SidebarContent({ collapsed, filteredGroups, sidebarFilter, setSidebarFilter, section, navigate, closeSidebar, user, handleLogout }) {
  return (
    <>
      {/* Search filter – only when expanded */}
      {!collapsed && (
        <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
          <input
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder="Filter features…"
            style={{
              width: '100%', borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.18)',
              padding: '7px 11px', background: 'rgba(255,255,255,0.06)',
              color: '#94a3b8', fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Nav groups */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '6px 5px' : '4px 8px 12px', minHeight: 0 }}>
        {filteredGroups.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 12, padding: '12px 8px' }}>No results.</div>
        )}
        {filteredGroups.map((group, gIdx) => (
          <div key={group.key}>
            {!collapsed && (
              <div style={{
                padding: gIdx === 0 ? '6px 8px 4px' : '14px 8px 4px',
                fontSize: 10, color: '#334155', letterSpacing: '0.12em',
                textTransform: 'uppercase', fontWeight: 800,
              }}>{group.label}</div>
            )}
            {group.items.map(({ key, label, icon }) => {
              const Icon = iconMap[icon] || LayoutDashboard;
              const isActive = section === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    navigate(key === 'dashboard' ? '/admin/dashboard' : `/admin/${key}`);
                    closeSidebar();
                  }}
                  title={label}
                  aria-label={label}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : 9,
                    padding: collapsed ? '10px 0' : '8px 10px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    textAlign: 'left', width: '100%',
                    background: isActive ? 'rgba(201,169,110,0.15)' : 'transparent',
                    color: isActive ? '#c9a96e' : '#94a3b8',
                    transition: 'all 0.12s ease',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}

// ── Main AdminDashboard component ─────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const [section,          setSection]          = useState('dashboard');
  const [drawerOpen,       setDrawerOpen]        = useState(false);   // mobile drawer
  const [collapsed,        setCollapsed]         = useState(false);   // desktop collapse
  const [sidebarFilter,    setSidebarFilter]     = useState('');
  const [erpBootstrap,     setErpBootstrap]      = useState(null);
  const [isMobile,         setIsMobile]          = useState(() => window.innerWidth < 1024);

  // Track viewport
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close drawer on escape key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const visibleGroups   = useMemo(() => getVisibleNavGroups(user), [user]);
  const visibleItems    = useMemo(() => visibleGroups.flatMap(g => g.items), [visibleGroups]);
  const filteredGroups  = useMemo(() => {
    const q = sidebarFilter.trim().toLowerCase();
    if (!q) return visibleGroups;
    return visibleGroups
      .map(g => ({ ...g, items: g.items.filter(item => item.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [visibleGroups, sidebarFilter]);
  const defaultSection  = visibleItems.find(i => i.key === 'dashboard')?.key || visibleItems[0]?.key || 'dashboard';

  const handleLogout = () => { logout(); navigate('/'); };

  // URL → section sync
  useEffect(() => {
    if (!user) return;
    const rawPath  = location.pathname.replace(/^\/admin\/?/, '');
    const candidate = rawPath.split('/')[0] || 'dashboard';
    const normalized = ADMIN_ROUTE_ALIASES[candidate] || candidate;
    if (!candidate || candidate === '') { setSection('dashboard'); return; }
    const targetModule = ERP_MODULE_MAP[normalized];
    if (!targetModule) { setSection('dashboard'); return; }
    if (canAccessModule(user, targetModule)) { setSection(normalized); return; }
    setSection('dashboard');
  }, [location.pathname, user]);

  useEffect(() => {
    if (!user) return;
    api.get('/erp/bootstrap').then(res => setErpBootstrap(res.data)).catch(() => {});
  }, [user]);

  const activeNav  = ERP_MODULE_MAP[section] || ERP_MODULE_MAP[defaultSection] || { label: 'Dashboard', description: 'Admin workspace' };
  const initials   = user?.name?.[0]?.toUpperCase() ?? '?';
  const closeSidebar = () => { setDrawerOpen(false); };

  // ── Sidebar shared props
  const sidebarProps = {
    filteredGroups, sidebarFilter, setSidebarFilter,
    section, navigate, closeSidebar, user, handleLogout,
  };

  // ── Sidebar panel (used by both desktop sticky + mobile drawer) ──────────────
  const SidebarPanel = ({ collapsed: col }) => (
    <aside style={{
      width: col ? 68 : 260, minWidth: col ? 68 : 260,
      background: '#0f172a', display: 'flex', flexDirection: 'column',
      height: '100%', flexShrink: 0, overflow: 'hidden',
      transition: 'width 0.2s ease, min-width 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: col ? '14px 8px 12px' : '14px 14px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img src="/logo.png" alt="NOREN"
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            {!col && (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>NOREN</div>
                <div style={{ color: '#c9a96e', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                  Integrated ERP Admin
                </div>
              </div>
            )}
          </div>
          {/* Desktop collapse toggle — hidden inside mobile drawer */}
          {!isMobile && (
            <button
              onClick={() => setCollapsed(p => !p)}
              title={col ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.07)', color: '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}
            >
              {col ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          )}
          {/* Close button inside mobile drawer */}
          {isMobile && (
            <button onClick={closeSidebar}
              style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Nav content */}
      <SidebarContent collapsed={col} {...sidebarProps} />

      {/* Footer: user info + logout */}
      <div style={{ padding: '10px 8px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {!col && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 2 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(201,169,110,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c9a96e', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{String(user?.role || 'user').replace(/_/g, ' ')}</div>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: col ? 0 : 8,
            justifyContent: col ? 'center' : 'flex-start',
            width: '100%', padding: col ? '10px 0' : '9px 14px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#f87171', background: 'transparent', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Sign Out"
        >
          <LogOut size={15} />
          {!col && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  // ── Mobile bottom nav bar ────────────────────────────────────────────────────
  const MobileBottomNav = () => (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: '#0f172a',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {MOBILE_TABS.map(tab => {
        const Icon = tab.key === '__menu__' ? Menu : (iconMap[tab.icon] || LayoutDashboard);
        const isActive = tab.key !== '__menu__' && section === tab.key;
        const isMenu   = tab.key === '__menu__';
        return (
          <button
            key={tab.key}
            onClick={() => {
              if (isMenu) { setDrawerOpen(true); }
              else { navigate(tab.key === 'dashboard' ? '/admin/dashboard' : `/admin/${tab.key}`); }
            }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '9px 4px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: isActive ? '#c9a96e' : '#64748b',
              transition: 'color 0.15s',
              borderTop: isActive ? '2px solid #c9a96e' : '2px solid transparent',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: '0.02em' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  // ── Top header bar ────────────────────────────────────────────────────────────
  const Header = () => (
    <header style={{
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 16px',
      minHeight: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
      gap: 12,
    }}>
      {/* Left: hamburger (mobile only) + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {isMobile && (
          <button onClick={() => setDrawerOpen(true)}
            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: '1px solid #e5e7eb', cursor: 'pointer', borderRadius: 10, color: '#374151', flexShrink: 0 }}>
            <Menu size={19} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeNav.label}
          </h1>
          {!isMobile && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 560 }}>
              {activeNav.description || 'Integrated admin workspace.'}
            </p>
          )}
        </div>
      </div>

      {/* Right: tenant info + status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
            {erpBootstrap?.tenant?.business_name || 'NOREN'}
          </div>
          {!isMobile && (
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {erpBootstrap?.tenant?.store_name || 'Main workspace'}
            </div>
          )}
        </div>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
      </div>
    </header>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#f8fafc' }}>

      {/* ── Desktop sticky sidebar ─────────────────────────────────────────── */}
      {!isMobile && (
        <div style={{ height: '100dvh', position: 'sticky', top: 0, flexShrink: 0 }}>
          <SidebarPanel collapsed={collapsed} />
        </div>
      )}

      {/* ── Mobile drawer overlay ──────────────────────────────────────────── */}
      {isMobile && drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.65)' }}
            onClick={closeSidebar}
          />
          {/* Drawer panel slides in from left */}
          <div style={{
            position: 'relative', zIndex: 51, height: '100%',
            animation: 'slideInLeft 0.22s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <SidebarPanel collapsed={false} />
          </div>
        </div>
      )}

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header />

        <main style={{
          flex: 1, overflowY: 'auto',
          padding: isMobile ? '14px 12px' : '20px',
          // Bottom padding on mobile to clear the bottom nav bar
          paddingBottom: isMobile ? 'calc(68px + env(safe-area-inset-bottom, 0px))' : '20px',
        }}>
          <ModuleErrorBoundary key={section}>
            <Suspense fallback={<ModuleLoader />}>
              {renderSection(section, user, navigate)}
            </Suspense>
          </ModuleErrorBoundary>
        </main>
      </div>

      {/* ── Mobile bottom navigation bar ──────────────────────────────────── */}
      {isMobile && <MobileBottomNav />}

    </div>
  );
}

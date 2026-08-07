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
  AlertTriangle, ChevronDown, RefreshCw, Link2, X,
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
import { ADMIN_ROUTE_ALIASES, ERP_MODULE_MAP, getVisibleNavGroups, canAccessModule } from './erpConfig';

const iconMap = {
  LayoutDashboard, Cpu, ScanLine, Boxes, Package, FolderOpen, BadgePercent,
  UsersRound, Truck, ShoppingCart, ReceiptText, Undo2, Warehouse, BarChart3,
  BriefcaseBusiness, CalendarClock, DollarSign, Wallet, Bell, Settings,
  Building2, Store, ShieldCheck, KeyRound, FileClock, Crown, Layout,
  MapPinned, MessageSquare, MessageCircle, Video, Phone, Star, Tag,
  Cloud, Eye, Mail, Link2, Sparkles,
};

// Mobile bottom-nav quick links
const MOBILE_TABS = [
  { key: 'dashboard', label: 'Home',     icon: 'LayoutDashboard' },
  { key: 'orders',    label: 'Orders',   icon: 'ShoppingCart'    },
  { key: 'products',  label: 'Products', icon: 'Package'         },
  { key: 'pos',       label: 'POS',      icon: 'ScanLine'        },
  { key: '__menu__',  label: 'Menu',     icon: '__menu__'        },
];

// ─── Error boundary ───────────────────────────────────────────────────────────
class ModuleErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(err) { console.error('ERP Module Error:', err); }
  render() {
    if (this.state.hasError) return (
      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
        <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 12px', display: 'block' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Module failed to load</div>
        <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{this.state.error?.message || 'An unexpected error occurred'}</div>
        <button onClick={() => this.setState({ hasError: false, error: null })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: '#c9a96e', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    );
    return this.props.children;
  }
}

const ModuleLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
    {[80, 40, 40, 40].map((h, i) => (
      <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />
    ))}
  </div>
);

// ─── renderSection (unchanged from original) ─────────────────────────────────
function renderSection(section, user, navigate) {
  const module = ERP_MODULE_MAP[section];
  const key    = module?.componentKey || section;
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

// ─── Sidebar — defined OUTSIDE the main component so it never remounts ────────
function Sidebar({
  collapsed, onToggleCollapse,
  filteredGroups, sidebarFilter, setSidebarFilter,
  section, navigate, onClose,
  user, handleLogout,
  isMobileDrawer,          // true when rendered inside the mobile overlay
}) {
  const initials = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <aside style={{
      width: collapsed ? 68 : 260,
      minWidth: collapsed ? 68 : 260,
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
      overflow: 'hidden',
      transition: 'width 0.2s ease, min-width 0.2s ease',
    }}>

      {/* ── Logo row ─────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '14px 8px 12px' : '14px 14px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <img src="/logo.png" alt="NOREN"
              style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>NOREN</div>
                <div style={{ color: '#c9a96e', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                  Integrated ERP Admin
                </div>
              </div>
            )}
          </div>

          {/* Desktop: collapse/expand toggle */}
          {!isMobileDrawer && (
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              style={{
                width: 34, height: 34, borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}
            >
              <ChevronDown size={14} style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
            </button>
          )}

          {/* Mobile drawer: close button */}
          {isMobileDrawer && (
            <button onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search filter ────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '8px 10px 0', flexShrink: 0 }}>
          <input
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder="Filter features..."
            style={{
              width: '100%', borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.15)',
              padding: '7px 10px',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8', fontSize: 12, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* ── Nav groups ───────────────────────────────────── */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: collapsed ? '8px 6px' : '6px 8px 12px',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        {filteredGroups.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 12, padding: '12px 8px' }}>No results.</div>
        )}
        {filteredGroups.map((group, gIdx) => (
          <div key={group.key}>
            {!collapsed && (
              <div style={{
                padding: gIdx === 0 ? '6px 8px 4px' : '14px 8px 4px',
                fontSize: 10, color: '#334155',
                letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800,
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(({ key, label, icon }) => {
              const Icon = iconMap[icon] || LayoutDashboard;
              const isActive = section === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    navigate(key === 'dashboard' ? '/admin/dashboard' : `/admin/${key}`);
                    onClose();
                  }}
                  title={label}
                  aria-label={label}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : 9,
                    padding: collapsed ? '9px 0' : '8px 10px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    textAlign: 'left', width: '100%',
                    background: isActive ? 'rgba(249,115,22,0.18)' : 'transparent',
                    color: isActive ? '#c9a96e' : '#94a3b8',
                    transition: 'all 0.12s ease',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e2e8f0'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User + Logout ─────────────────────────────────── */}
      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(249,115,22,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c9a96e', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
                {String(user?.role || 'user').replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
            padding: collapsed ? '10px 8px' : '9px 14px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#f87171', background: 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Sign Out"
        >
          <LogOut size={15} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const [section,       setSection]       = useState('dashboard');
  const [sidebarOpen,   setSidebarOpen]   = useState(false);      // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse
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

  const defaultSection = visibleItems.find(i => i.key === 'dashboard')?.key || visibleItems[0]?.key || 'dashboard';
  const handleLogout   = () => { logout(); navigate('/'); };

  // URL → section sync
  useEffect(() => {
    if (!user) return;
    const raw        = location.pathname.replace(/^\/admin\/?/, '');
    const candidate  = raw.split('/')[0] || 'dashboard';
    const normalized = ADMIN_ROUTE_ALIASES[candidate] || candidate;
    if (!candidate) { setSection('dashboard'); return; }
    const mod = ERP_MODULE_MAP[normalized];
    if (!mod) { setSection('dashboard'); return; }
    setSection(canAccessModule(user, mod) ? normalized : 'dashboard');
  }, [location.pathname, user]);

  useEffect(() => {
    if (!user) return;
    api.get('/erp/bootstrap').then(r => setErpBootstrap(r.data)).catch(() => {});
  }, [user]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const activeNav = ERP_MODULE_MAP[section] || ERP_MODULE_MAP[defaultSection] || { label: 'Dashboard', description: 'Admin workspace' };

  // Shared sidebar props
  const sidebarProps = {
    filteredGroups, sidebarFilter, setSidebarFilter,
    section, navigate,
    onClose: () => setSidebarOpen(false),
    user, handleLogout,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>

      {/* ═══ DESKTOP SIDEBAR — sticky full height, always visible on lg+ ══════ */}
      <div
        className="hide-mobile"          /* hide below 1024px */
        style={{ height: '100vh', position: 'sticky', top: 0, flexShrink: 0 }}
      >
        <Sidebar
          {...sidebarProps}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
          isMobileDrawer={false}
        />
      </div>

      {/* ═══ MOBILE DRAWER — slide-in overlay on small screens ════════════════ */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          {/* backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.66)' }}
            onClick={() => setSidebarOpen(false)}
          />
          {/* panel */}
          <div style={{
            position: 'relative', zIndex: 51, height: '100%',
            animation: 'slideInLeft 0.22s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Sidebar
              {...sidebarProps}
              collapsed={false}
              onToggleCollapse={() => {}}
              isMobileDrawer={true}
            />
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Top header ────────────────────────────────────────────────────── */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 20px',
          minHeight: 68,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* Hamburger — only on mobile */}
            <button
              className="hide-desktop"
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 38, height: 38, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'none',
                border: '1px solid #e5e7eb', cursor: 'pointer',
                borderRadius: 10, color: '#374151',
              }}
            >
              <Menu size={20} />
            </button>

            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
                {activeNav.label}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280', maxWidth: 720 }}>
                {activeNav.description || 'Integrated admin workspace inside the same website and authentication system.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'grid', justifyItems: 'end' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                {erpBootstrap?.tenant?.business_name || 'NOREN'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {erpBootstrap?.tenant?.store_name || 'Main admin workspace'}
              </div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: '20px',
          /* On mobile add bottom padding so content isn't under the bottom nav */
          paddingBottom: 'max(20px, calc(64px + env(safe-area-inset-bottom, 0px)))',
        }}>
          <ModuleErrorBoundary key={section}>
            <Suspense fallback={<ModuleLoader />}>
              {renderSection(section, user, navigate)}
            </Suspense>
          </ModuleErrorBoundary>
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM NAV BAR ═════════════════════════════════════════════ */}
      <nav
        className="hide-desktop"        /* only visible below 1024px */
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: '#0f172a',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {MOBILE_TABS.map(tab => {
          const isMenuTab = tab.key === '__menu__';
          const Icon      = isMenuTab ? Menu : (iconMap[tab.icon] || LayoutDashboard);
          const isActive  = !isMenuTab && section === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (isMenuTab) { setSidebarOpen(true); }
                else { navigate(tab.key === 'dashboard' ? '/admin/dashboard' : `/admin/${tab.key}`); }
              }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 4px 10px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: isActive ? '#c9a96e' : '#64748b',
                borderTop: isActive ? '2px solid #c9a96e' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}

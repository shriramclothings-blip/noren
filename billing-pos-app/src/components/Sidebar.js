import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getSetting } from '../db/db';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, UserCog,
  BarChart3, PieChart, Settings, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon, Lock, Receipt, DollarSign, Tag, Layers,
  Brain, Flame, TrendingUp, Heart, RotateCcw, ArrowRightLeft, Activity,
  ClipboardList, Trash2, Shield, Warehouse, Hash,
  Star, Calendar, UserCheck, BarChart2, Wallet, Zap,
} from 'lucide-react';
import { DEFAULT_FEATURE_TOGGLES, isRouteEnabled, mergeFeatureToggles } from '../utils/featureSettings';
import { hasPageAccess } from '../utils/rolePermissions';

const NAV = [
  // ── Core ──
  { key: 'dashboard',      label: 'Dashboard',              icon: LayoutDashboard, group: null },
  { key: 'storeHealth',    label: 'Store Health',           icon: Heart, group: null },
  { key: 'pos',            label: 'POS / Billing',          icon: ShoppingCart, group: 'Operations' },
  { key: 'invoices',       label: 'Invoices',               icon: Receipt, group: null },
  // ── Inventory ──
  { key: 'inventory',      label: 'Inventory',              icon: Package, group: 'Inventory' },
  { key: 'batchTracking',  label: 'Batch Tracking',         icon: Hash, group: null },
  { key: 'warehouse',      label: 'Warehouse / Godown',     icon: Warehouse, group: null },
  { key: 'expiryTracker',  label: 'Expiry Tracker',         icon: Calendar, group: null },
  { key: 'abcAnalysis',    label: 'ABC Analysis',           icon: BarChart2, group: null },
  { key: 'inventoryReports', label: 'Inventory Reports',   icon: ClipboardList, group: null },
  { key: 'returnsAndExchanges', label: 'Returns & Exchanges', icon: RotateCcw, group: null },
  { key: 'stockTransfers', label: 'Stock Transfers',        icon: ArrowRightLeft, group: null },
  { key: 'inventoryMovementReports', label: 'Movement Reports', icon: Activity, group: null },
  { key: 'stockManagement',label: 'Stock Management',       icon: Layers, group: null },
  // ── Intelligence ──
  { key: 'storeHealth',    label: 'Store Health',           icon: Heart, group: 'Intelligence', _skip: true },
  { key: 'smartPurchase',  label: 'Smart Purchase',         icon: Brain, group: 'Intelligence' },
  { key: 'trendingItems',  label: 'Trending & Hot Items',   icon: Flame, group: null },
  { key: 'discountEngine', label: 'Discount Engine',        icon: Tag, group: null },
  { key: 'salesHeatmap',   label: 'Sales Heatmap',          icon: Zap, group: null },
  { key: 'profitReports',  label: 'Profit Reports',         icon: TrendingUp, group: null },
  { key: 'financialReports', label: 'Financial Reports',    icon: Wallet, group: null },
  { key: 'reports-ai',     label: 'AI Reports',             icon: Brain, group: null },
  { key: 'advancedCharts', label: 'Chart Analytics',        icon: PieChart, group: null },
  { key: 'reports',        label: 'Reports',                icon: BarChart3, group: null },
  // ── Customers ──
  { key: 'customers',      label: 'Customers',              icon: Users, group: 'Customers' },
  { key: 'customerInsights', label: 'Customer Insights',    icon: UserCheck, group: null },
  { key: 'loyaltyEngine',  label: 'Loyalty Engine',         icon: Star, group: null },
  // ── Management ──
  { key: 'purchases',      label: 'Purchases',              icon: Truck, group: 'Management' },
  { key: 'suppliers',      label: 'Suppliers',              icon: Tag, group: null },
  { key: 'staff',          label: 'Staff',                  icon: UserCog, group: null },
  { key: 'expenses',       label: 'Expenses',               icon: DollarSign, group: null },
  // ── Settings & Logs ──
  { key: 'deleteHistory',  label: 'Delete History',         icon: Trash2, group: null },
  { key: 'auditLogs',      label: 'Audit Logs',             icon: Shield, group: null },
  { key: 'settings',       label: 'Settings',               icon: Settings, group: null },
];

// Deduplicate by key (remove _skip entries)
const NAV_CLEAN = NAV.filter(n => !n._skip).filter((n, i, arr) => arr.findIndex(x => x.key === n.key) === i);

export default function Sidebar({ page, setPage }) {
  const { theme, toggleTheme, currentUser, logout, lowStockProducts, setIsLocked, company } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [featureToggles, setFeatureToggles] = useState(DEFAULT_FEATURE_TOGGLES);

  useEffect(() => {
    const loadFeatureToggles = async () => {
      try {
        const saved = await getSetting('featuresToggle');
        setFeatureToggles(mergeFeatureToggles(saved));
      } catch {
        setFeatureToggles(DEFAULT_FEATURE_TOGGLES);
      }
    };

    loadFeatureToggles();

    const onFeatureSettingsChanged = (event) => {
      setFeatureToggles(mergeFeatureToggles(event?.detail));
    };

    window.addEventListener('feature-settings-changed', onFeatureSettingsChanged);
    return () => window.removeEventListener('feature-settings-changed', onFeatureSettingsChanged);
  }, []);

  // Filter navigation items based on:
  // 1. Feature toggles (enabled/disabled features)
  // 2. User role permissions (RBAC - Role-Based Access Control)
  const navItems = NAV_CLEAN.filter((item) => {
    // Check if feature is enabled
    const featureEnabled = isRouteEnabled(item.key, featureToggles);
    
    // Check if user has role-based access to this page
    const hasAccess = hasPageAccess(currentUser, item.key);
    
    // Both conditions must be true
    return featureEnabled && hasAccess;
  });

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300 no-print`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            {company?.logoSrc && company?.showLogo !== false ? (
              <img
                src={company.logoSrc}
                alt={company.name || 'Logo'}
                className="h-8 w-8 rounded-lg object-contain flex-shrink-0 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 p-0.5"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{(company?.name || 'V')[0].toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-primary-600 truncate leading-tight">{company?.name || currentUser?.company || 'VENDEXA™'}</h1>
              <p className="text-[10px] text-gray-400 leading-tight">RetailOS™ v2.0 by DGE</p>
            </div>
          </div>
        )}
        {collapsed && company?.logoSrc && company?.showLogo !== false && (
          <img
            src={company.logoSrc}
            alt="Logo"
            className="h-7 w-7 rounded-lg object-contain border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 p-0.5 mx-auto"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        {collapsed && (!company?.logoSrc || company?.showLogo === false) && (
          <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center mx-auto">
            <span className="text-white text-[10px] font-bold">{(company?.name || 'V')[0].toUpperCase()}</span>
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 flex-shrink-0">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ key, label, icon: Icon, group }, idx) => {
          const prevGroup = idx > 0 ? navItems[idx - 1].group : null;
          const showGroupHeader = !collapsed && group && group !== prevGroup;
          return (
            <React.Fragment key={key}>
              {showGroupHeader && (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</p>
                </div>
              )}
              <button
                onClick={() => setPage(key)}
                className={`sidebar-link w-full ${page === key ? 'active' : ''}`}
                title={collapsed ? label : ''}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="text-sm">{label}</span>}
                {!collapsed && key === 'inventory' && lowStockProducts.length > 0 && (
                  <span className="ml-auto badge-red">{lowStockProducts.length}</span>
                )}
                {!collapsed && key === 'stockManagement' && lowStockProducts.length > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">{lowStockProducts.length}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
        <button onClick={toggleTheme} className="sidebar-link w-full" title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span className="text-sm">Toggle Theme</span>}
        </button>
        <button onClick={() => setIsLocked(true)} className="sidebar-link w-full" title="Lock">
          <Lock size={18} />
          {!collapsed && <span className="text-sm">Lock Screen</span>}
        </button>
        <button onClick={logout} className="sidebar-link w-full text-red-500 hover:text-red-600" title="Logout">
          <LogOut size={18} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
        {!collapsed && currentUser && (
          <div className="mt-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{currentUser.name}</p>
              <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
            </div>
            <NetworkStatusIndicator />
          </div>
        )}
      </div>
    </aside>
  );
}

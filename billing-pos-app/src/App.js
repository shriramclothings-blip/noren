import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import { NetworkSyncProvider } from './context/NetworkSyncContext';
import { getSetting } from './db/db';
import Sidebar from './components/Sidebar';
import { LoginScreen, LockScreen } from './components/AuthScreens';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Invoices from './pages/Invoices';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Staff from './pages/Staff';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import AdvancedCharts from './pages/AdvancedCharts';
import ReportsAI from './pages/ReportsAI';
// import Settings from './pages/Settings';
import SettingsEnhanced from './pages/SettingsEnhanced';
import CustomerDisplay from './pages/CustomerDisplay';
import StockManagement from './pages/StockManagement';
import SmartPurchase from './pages/SmartPurchase';
import TrendingItems from './pages/TrendingItems';
import ProfitReports from './pages/ProfitReports';
import DiscountEngine from './pages/DiscountEngine';
import StoreHealth from './pages/StoreHealth';
import ReturnsAndExchanges from './pages/ReturnsAndExchanges';
import StockTransfers from './pages/StockTransfers';
import InventoryMovementReports from './pages/InventoryMovementReports';
import InventoryReports from './pages/InventoryReports';
import DeleteHistory from './pages/DeleteHistory';
import AuditLogs from './pages/AuditLogs';
import Warehouse from './pages/Warehouse';
import BatchTracking from './pages/BatchTracking';
import WhatsAppWebViewModal from './components/WhatsAppWebViewModal';
// LicenseGate removed for web deployment
import LoyaltyEngine from './pages/LoyaltyEngine';
import ExpiryTracker from './pages/ExpiryTracker';
import CustomerInsights from './pages/CustomerInsights';
import SalesHeatmap from './pages/SalesHeatmap';
import FinancialReports from './pages/FinancialReports';
import ABCAnalysis from './pages/ABCAnalysis';
import WebsiteIntegration from './pages/WebsiteIntegration';
import AIInventoryDashboard from './components/AIInventoryDashboard';
import { DEFAULT_FEATURE_TOGGLES, isRouteEnabled, mergeFeatureToggles } from './utils/featureSettings';
import { hasPageAccess, getDefaultPageForRole } from './utils/rolePermissions';

const PAGES = {
  dashboard: Dashboard,
  pos: POS,
  invoices: Invoices,
  inventory: Inventory,
  purchases: Purchases,
  customers: Customers,
  suppliers: Suppliers,
  staff: Staff,
  expenses: Expenses,
  reports: Reports,
  advancedCharts: AdvancedCharts,
  settings: SettingsEnhanced, // Use enhanced settings
  'customer-display': CustomerDisplay,
  stockManagement: StockManagement,
  smartPurchase: SmartPurchase,
  trendingItems: TrendingItems,
  profitReports: ProfitReports,
  discountEngine: DiscountEngine,
  storeHealth: StoreHealth,
  returnsAndExchanges: ReturnsAndExchanges,
  stockTransfers: StockTransfers,
  inventoryMovementReports: InventoryMovementReports,
  inventoryReports: InventoryReports,
  deleteHistory: DeleteHistory,
  auditLogs: AuditLogs,
  warehouse: Warehouse,
  'reports-ai': ReportsAI,
  batchTracking: BatchTracking,
  loyaltyEngine: LoyaltyEngine,
  expiryTracker: ExpiryTracker,
  customerInsights: CustomerInsights,
  salesHeatmap: SalesHeatmap,
  financialReports: FinancialReports,
  abcAnalysis: ABCAnalysis,
  websiteIntegration: WebsiteIntegration,
  aiInventory: AIInventoryDashboard,
};

// Keyboard shortcuts: Alt+1..9 for navigation
const PAGE_KEYS = ['dashboard','pos','invoices','inventory','purchases','customers','suppliers','staff','reports','settings'];

function AppInner() {
  const { currentUser, isLocked } = useApp();
  const [featureToggles, setFeatureToggles] = useState(DEFAULT_FEATURE_TOGGLES);
  const featureTogglesRef = React.useRef(featureToggles);
  featureTogglesRef.current = featureToggles;

  const [page, setPage] = useState(() => {
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      return hash || 'dashboard';
    }
    return 'dashboard';
  });

  // Validate and redirect user to appropriate page based on role
  useEffect(() => {
    if (!currentUser) return;

    // Check if current page is accessible by user's role
    const hasAccess = hasPageAccess(currentUser, page);
    
    if (!hasAccess) {
      // User doesn't have access to current page - redirect to default page for their role
      const defaultPage = getDefaultPageForRole(currentUser);
      console.warn(
        `[RBAC Security] User "${currentUser.name}" (${currentUser.role}) redirected from "${page}" to "${defaultPage}" - Access denied`
      );
      setPage(defaultPage);
      if (typeof window !== 'undefined') {
        window.location.hash = defaultPage;
      }
    }
  }, [currentUser, page]);

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

    const onHashChange = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          const enabled = isRouteEnabled(hash, featureTogglesRef.current);
          setPage(enabled ? hash : 'dashboard');
        }
      }
    };
    onHashChange();

    const handler = (e) => {
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (PAGE_KEYS[idx]) setPage(PAGE_KEYS[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('hashchange', onHashChange);
    const onFeatureSettingsChanged = (event) => {
      setFeatureToggles(mergeFeatureToggles(event?.detail));
    };
    window.addEventListener('feature-settings-changed', onFeatureSettingsChanged);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('feature-settings-changed', onFeatureSettingsChanged);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isRouteEnabled(page, featureToggles)) {
      setPage('dashboard');
      if (typeof window !== 'undefined') {
        window.location.hash = 'dashboard';
      }
    }
  }, [featureToggles, page]);

  if (page === 'customer-display') return <CustomerDisplay />;
  if (!currentUser) return <LoginScreen />;
  if (isLocked) return <LockScreen />;

  const PageComponent = isRouteEnabled(page, featureToggles) ? (PAGES[page] || Dashboard) : Dashboard;

  // Redirect handler for ProtectedRoute
  const handleRedirect = (newPage) => {
    setPage(newPage);
    if (typeof window !== 'undefined') {
      window.location.hash = newPage;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar page={page} setPage={setPage} />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary key={page}>
          <ProtectedRoute page={page} onRedirect={handleRedirect}>
            <PageComponent setPage={setPage} />
          </ProtectedRoute>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <NetworkSyncProvider>
          <AppInner />
          <WhatsAppWebViewModal />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-gray-800 dark:text-white',
              style: { borderRadius: '12px', fontSize: '14px' },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </NetworkSyncProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

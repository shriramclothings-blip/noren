import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { PageLoader } from './components/ui/Spinner';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TicketList = lazy(() => import('./pages/tickets/TicketList'));
const TicketDetail = lazy(() => import('./pages/tickets/TicketDetail'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'));
const OrderList = lazy(() => import('./pages/orders/OrderList'));
const OrderDetail = lazy(() => import('./pages/orders/OrderDetail'));
const SellerList = lazy(() => import('./pages/sellers/SellerList'));
const SellerDetail = lazy(() => import('./pages/sellers/SellerDetail'));
const InfluencerList = lazy(() => import('./pages/influencers/InfluencerList'));
const InfluencerDetail = lazy(() => import('./pages/influencers/InfluencerDetail'));
const UTMAnalytics = lazy(() => import('./pages/analytics/UTMAnalytics'));
const VisitorAnalytics = lazy(() => import('./pages/analytics/VisitorAnalytics'));
const SupportAnalytics = lazy(() => import('./pages/analytics/SupportAnalytics'));
const IncidentList = lazy(() => import('./pages/technical/IncidentList'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const SLARules = lazy(() => import('./pages/admin/SLARules'));
const Team = lazy(() => import('./pages/admin/Team'));
const KnowledgeBase = lazy(() => import('./pages/kb/KnowledgeBase'));

// Route guard
function RequireAuth({ children }) {
  const { user, loading, error } = useAuth();
  if (loading) return <PageLoader />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-6 max-w-sm text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <a href="/login" className="btn btn-primary mt-4 inline-flex">Back to Login</a>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />

          {/* Tickets */}
          <Route path="tickets" element={<TicketList />} />
          <Route path="tickets/my" element={<TicketList filter="my" />} />
          <Route path="tickets/unassigned" element={<TicketList filter="unassigned" />} />
          <Route path="tickets/critical" element={<TicketList filter="critical" />} />
          <Route path="tickets/sla-risk" element={<TicketList filter="sla-risk" />} />
          <Route path="tickets/:id" element={<TicketDetail />} />

          {/* Customers */}
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/activity" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />

          {/* Orders */}
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/issues" element={<OrderList filter="issues" />} />
          <Route path="orders/:id" element={<OrderDetail />} />

          {/* Sellers */}
          <Route path="sellers" element={<SellerList />} />
          <Route path="sellers/support" element={<SellerList support />} />
          <Route path="sellers/:id" element={<SellerDetail />} />

          {/* Influencers */}
          <Route path="influencers" element={<InfluencerList />} />
          <Route path="influencers/support" element={<InfluencerList support />} />
          <Route path="influencers/:id" element={<InfluencerDetail />} />

          {/* Analytics */}
          <Route path="analytics/visitors" element={<VisitorAnalytics />} />
          <Route path="analytics/utm" element={<UTMAnalytics />} />
          <Route path="analytics/support" element={<SupportAnalytics />} />
          <Route path="analytics/marketing" element={<UTMAnalytics />} />

          {/* Technical */}
          <Route path="incidents" element={<IncidentList />} />
          <Route path="technical/logs" element={<AuditLogs />} />

          {/* KB + Quick replies */}
          <Route path="kb" element={<KnowledgeBase />} />
          <Route path="quick-replies" element={<KnowledgeBase />} />
          <Route path="email-templates" element={<KnowledgeBase />} />

          {/* Admin */}
          <Route path="admin/team" element={<Team />} />
          <Route path="admin/roles" element={<Settings />} />
          <Route path="admin/sla" element={<SLARules />} />
          <Route path="admin/automation" element={<Settings />} />
          <Route path="admin/audit-logs" element={<AuditLogs />} />
          <Route path="admin/settings" element={<Settings />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

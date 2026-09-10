import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import ErrorBoundary from './components/common/ErrorBoundary'

// Layouts
import AuthLayout from './components/layouts/AuthLayout'
import DashboardLayout from './components/layouts/DashboardLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

// Dashboard Pages
import Dashboard from './pages/Dashboard'
import Compose from './pages/Compose'
import Inbox from './pages/Inbox'
import Sent from './pages/Sent'
import Drafts from './pages/Drafts'
import Templates from './pages/Templates'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Contacts from './pages/Contacts'
import Segments from './pages/Segments'
import Analytics from './pages/Analytics'
import Automation from './pages/Automation'
import Settings from './pages/Settings'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <AuthLayout>
                <Login />
              </AuthLayout>
            </PublicRoute>
          } />
          
          <Route path="/register" element={
            <PublicRoute>
              <AuthLayout>
                <Register />
              </AuthLayout>
            </PublicRoute>
          } />
          
          <Route path="/forgot-password" element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPassword />
              </AuthLayout>
            </PublicRoute>
          } />

          {/* Protected Dashboard Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/compose" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Compose />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/inbox" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Inbox />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/sent" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Sent />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/drafts" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Drafts />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/templates" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Templates />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/campaigns" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Campaigns />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/campaigns/:id" element={
            <ProtectedRoute>
              <DashboardLayout>
                <CampaignDetail />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/contacts" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Contacts />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/segments" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Segments />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Analytics />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/automation" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Automation />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* 404 - Redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem',
            maxWidth: '500px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ErrorBoundary>
  )
}

export default App
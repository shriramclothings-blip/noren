import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, Component } from 'react';
import { SellerAuthProvider } from './context/SellerAuthContext';
import SellerProtectedRoute from './components/SellerProtectedRoute';

// Error Boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          padding: 20,
          color: '#faf9f7',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ maxWidth: 500, textAlign: 'center' }}>
            <h1 style={{ fontSize: 32, marginBottom: 12, color: '#ef4444' }}>⚠️ Oops!</h1>
            <p style={{ fontSize: 16, marginBottom: 16, lineHeight: 1.5 }}>
              Something went wrong. The error has been logged and our team will fix it.
            </p>
            <details style={{
              background: 'rgba(255,255,255,0.05)',
              padding: 12,
              borderRadius: 8,
              marginBottom: 24,
              textAlign: 'left',
              fontSize: 12,
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Error Details</summary>
              <pre style={{
                overflow: 'auto',
                maxHeight: 150,
                color: '#fca5a5',
                margin: 0,
              }}>
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                background: '#c9a96e',
                color: '#0f172a',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}>
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const ForgotPass   = lazy(() => import('./pages/ForgotPassword'));
const ResetPass    = lazy(() => import('./pages/ResetPassword'));
const Onboarding   = lazy(() => import('./pages/Onboarding'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Products     = lazy(() => import('./pages/Products'));
const ProductForm  = lazy(() => import('./pages/ProductForm'));
const Inventory    = lazy(() => import('./pages/Inventory'));
const Orders       = lazy(() => import('./pages/Orders'));
const Payouts      = lazy(() => import('./pages/Payouts'));
const KYC          = lazy(() => import('./pages/KYC'));
const Profile      = lazy(() => import('./pages/Profile'));
const Debug        = lazy(() => import('./pages/Debug'));

function Loader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', gap: 20 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 26, letterSpacing: '0.35em', color: '#faf9f7', textTransform: 'uppercase' }}>NOREN</div>
      <div style={{ fontSize: 10, letterSpacing: '0.25em', color: '#c9a96e', textTransform: 'uppercase', marginTop: -10 }}>Seller Portal</div>
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SellerAuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login"          element={<Login />} />
              <Route path="/register"       element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPass />} />
              <Route path="/reset-password"  element={<ResetPass />} />

              {/* Protected seller routes */}
              <Route path="/onboarding"     element={<SellerProtectedRoute><Onboarding /></SellerProtectedRoute>} />
              <Route path="/dashboard"      element={<SellerProtectedRoute requireProfile><Dashboard /></SellerProtectedRoute>} />
              <Route path="/products"       element={<SellerProtectedRoute requireProfile><Products /></SellerProtectedRoute>} />
              <Route path="/products/new"   element={<SellerProtectedRoute requireProfile><ProductForm /></SellerProtectedRoute>} />
              <Route path="/products/:id/edit" element={<SellerProtectedRoute requireProfile><ProductForm /></SellerProtectedRoute>} />
              <Route path="/inventory"      element={<SellerProtectedRoute requireProfile><Inventory /></SellerProtectedRoute>} />
              <Route path="/orders"         element={<SellerProtectedRoute requireProfile><Orders /></SellerProtectedRoute>} />
              <Route path="/payouts"        element={<SellerProtectedRoute requireProfile><Payouts /></SellerProtectedRoute>} />
              <Route path="/kyc"            element={<SellerProtectedRoute><KYC /></SellerProtectedRoute>} />
              <Route path="/profile"        element={<SellerProtectedRoute><Profile /></SellerProtectedRoute>} />
              <Route path="/debug"          element={<SellerProtectedRoute><Debug /></SellerProtectedRoute>} />

              {/* Default */}
              <Route path="/"               element={<Navigate to="/dashboard" replace />} />
              <Route path="*"               element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>

          <Toaster
            position="top-right"
            toastOptions={{
              style: { borderRadius: '4px', background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', fontFamily: "'Inter', sans-serif" },
              success: { iconTheme: { primary: '#c9a96e', secondary: '#1e293b' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
            }}
          />
        </BrowserRouter>
      </SellerAuthProvider>
    </ErrorBoundary>
  );
}

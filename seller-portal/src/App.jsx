import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { SellerAuthProvider } from './context/SellerAuthContext';
import SellerProtectedRoute from './components/SellerProtectedRoute';

const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const ForgotPass   = lazy(() => import('./pages/ForgotPassword'));
const ResetPass    = lazy(() => import('./pages/ResetPassword'));
const Onboarding   = lazy(() => import('./pages/Onboarding'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Products     = lazy(() => import('./pages/Products'));
const ProductForm  = lazy(() => import('./pages/ProductForm'));
const Orders       = lazy(() => import('./pages/Orders'));
const Payouts      = lazy(() => import('./pages/Payouts'));
const KYC          = lazy(() => import('./pages/KYC'));
const Profile      = lazy(() => import('./pages/Profile'));

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
            <Route path="/orders"         element={<SellerProtectedRoute requireProfile><Orders /></SellerProtectedRoute>} />
            <Route path="/payouts"        element={<SellerProtectedRoute requireProfile><Payouts /></SellerProtectedRoute>} />
            <Route path="/kyc"            element={<SellerProtectedRoute><KYC /></SellerProtectedRoute>} />
            <Route path="/profile"        element={<SellerProtectedRoute><Profile /></SellerProtectedRoute>} />

            {/* Default */}
            <Route path="/"               element={<Navigate to="/dashboard" replace />} />
            <Route path="*"               element={<Navigate to="/dashboard" replace />} />
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
  );
}

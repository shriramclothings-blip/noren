import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import PushPrompt from './components/PushPrompt';
import SeoManager from './components/SeoManager';

const Home          = lazy(() => import('./pages/Home'));
const Shop          = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Login         = lazy(() => import('./pages/Login'));
const Register      = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));
const Cart          = lazy(() => import('./pages/Cart'));
const Checkout      = lazy(() => import('./pages/Checkout'));
const OrderSuccess  = lazy(() => import('./pages/OrderSuccess'));
const OrderFailed   = lazy(() => import('./pages/OrderFailed'));
const Orders        = lazy(() => import('./pages/Orders'));
const Wishlist      = lazy(() => import('./pages/Wishlist'));
const Profile       = lazy(() => import('./pages/Profile'));
const Contact       = lazy(() => import('./pages/Contact'));
const TrackQuery    = lazy(() => import('./pages/TrackQuery'));
const TrackOrder    = lazy(() => import('./pages/TrackOrder'));
const PrivacyPolicy     = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsConditions   = lazy(() => import('./pages/legal/TermsConditions'));
const RefundPolicy      = lazy(() => import('./pages/legal/RefundPolicy'));
const ShippingPolicy    = lazy(() => import('./pages/legal/OtherPolicies').then(m => ({ default: m.ShippingPolicy })));
const CancellationPolicy = lazy(() => import('./pages/legal/OtherPolicies').then(m => ({ default: m.CancellationPolicy })));
const CookiesPolicy     = lazy(() => import('./pages/legal/OtherPolicies').then(m => ({ default: m.CookiesPolicy })));
const DisclaimerPolicy  = lazy(() => import('./pages/legal/MorePolicies').then(m => ({ default: m.DisclaimerPolicy })));
const LegalNotice       = lazy(() => import('./pages/legal/MorePolicies').then(m => ({ default: m.LegalNotice })));
const ReturnPolicy      = lazy(() => import('./pages/legal/MorePolicies').then(m => ({ default: m.ReturnPolicy })));
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'));
const InfluencerDashboard = lazy(() => import('./pages/influencer/InfluencerDashboard'));

function Loader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a18', gap: 24 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 28, letterSpacing: '0.38em', color: '#faf9f7', textTransform: 'uppercase' }}>NOREN</div>
      <div className="spinner" style={{ borderColor: 'rgba(250,249,247,0.1)', borderTopColor: '#c9a96e', width: 28, height: 28 }} />
    </div>
  );
}

function Layout({ children, hideFooter }) {
  return (
    <>
      <Navbar />
      {children}
      {!hideFooter && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SiteSettingsProvider>
      <BrowserRouter>
        <SeoManager />
        <ScrollToTop />
        <PushPrompt />
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Admin  no navbar/footer */}
            <Route path="/admin/*" element={
              <ProtectedRoute roles={['admin','super_admin','business_owner','store_admin','store_manager','cashier','warehouse_manager','accountant']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Influencer portal — no navbar/footer */}
            <Route path="/influencer/*" element={
              <ProtectedRoute roles={['influencer']}>
                <InfluencerDashboard />
              </ProtectedRoute>
            } />

            {/* Public + user routes with layout */}
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
                  <Route path="/order-failed" element={<ProtectedRoute><OrderFailed /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                  <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/track-query" element={<TrackQuery />} />
                  <Route path="/track-order/:id" element={<ProtectedRoute><TrackOrder /></ProtectedRoute>} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsConditions />} />
                  <Route path="/refund" element={<RefundPolicy />} />
                  <Route path="/return-policy" element={<ReturnPolicy />} />
                  <Route path="/shipping" element={<ShippingPolicy />} />
                  <Route path="/cancellation" element={<CancellationPolicy />} />
                  <Route path="/cookies" element={<CookiesPolicy />} />
                  <Route path="/disclaimer" element={<DisclaimerPolicy />} />
                  <Route path="/legal" element={<LegalNotice />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </Suspense>

        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '2px', background: '#faf9f7', color: '#1a1a18', border: '1px solid #e6e0d8', fontSize: '13px', letterSpacing: '0.02em', fontFamily: "'Inter', sans-serif" },
            success: { iconTheme: { primary: '#c9a96e', secondary: '#1a1a18' } },
            error:   { iconTheme: { primary: '#78281f', secondary: '#faf9f7' } },
          }}
        />
      </BrowserRouter>
      </SiteSettingsProvider>
    </AuthProvider>
  );
}

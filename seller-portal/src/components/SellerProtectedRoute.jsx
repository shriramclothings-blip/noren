import { Navigate } from 'react-router-dom';
import { useSellerAuth } from '../context/SellerAuthContext';

const Spinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
    <div className="spinner" />
  </div>
);

export default function SellerProtectedRoute({ children, requireProfile = false }) {
  const { user, profile, loading, profileLoading } = useSellerAuth();

  // Wait for auth AND profile fetch to complete
  if (loading || (user && profileLoading)) return <Spinner />;

  // Not logged in → login
  if (!user) return <Navigate to="/login" replace />;

  // Profile required but still fetching → wait
  if (requireProfile && profileLoading) return <Spinner />;

  // Profile required but no seller profile → onboarding
  // profile === null means fetch is done and no profile exists
  if (requireProfile && !profileLoading && profile === null) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

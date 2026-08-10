import { Navigate } from 'react-router-dom';
import { useSellerAuth } from '../context/SellerAuthContext';

export default function SellerProtectedRoute({ children, requireProfile = false }) {
  const { user, profile, loading } = useSellerAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div className="spinner" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // If profile required but seller hasn't registered yet → send to onboarding
  if (requireProfile && profile === null) return <Navigate to="/onboarding" replace />;

  return children;
}

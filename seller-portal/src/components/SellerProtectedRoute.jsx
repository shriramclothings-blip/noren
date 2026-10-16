import { Navigate } from 'react-router-dom';
import { useSellerAuth } from '../context/SellerAuthContext';

const Spinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
    <div className="spinner" />
  </div>
);

const ErrorPage = ({ message }) => (
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
    <div style={{ maxWidth: 400, textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12, color: '#ef4444' }}>⚠️ Error</h1>
      <p style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.5, color: '#cbd5e1' }}>
        {message}
      </p>
      <button
        onClick={() => window.location.href = '/login'}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          background: '#c9a96e',
          color: '#0f172a',
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: 14,
        }}>
        Go to Login
      </button>
    </div>
  </div>
);

export default function SellerProtectedRoute({ children, requireProfile = false }) {
  const { user, profile, loading, profileLoading, profileError } = useSellerAuth();

  // Wait for initial auth check
  if (loading) return <Spinner />;

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Profile required: wait for profile fetch to complete
  if (requireProfile && profileLoading) return <Spinner />;

  // Profile required but fetch errored → show error, let user try again
  if (requireProfile && profileError === 'error') {
    return <ErrorPage message="Failed to load your seller profile. Please refresh the page or try again." />;
  }

  // Profile required but no profile exists (404) → go to onboarding to create one
  // But check current path to prevent loops
  if (requireProfile && profileError === 'none' && profile === null) {
    // Only redirect to onboarding if not already there
    const currentPath = window.location.pathname;
    if (currentPath !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // All good!
  return children;
}

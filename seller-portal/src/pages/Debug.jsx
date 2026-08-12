import { useState, useEffect } from 'react';
import { useSellerAuth } from '../context/SellerAuthContext';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function Debug() {
  const { user, profile } = useSellerAuth();
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results = {};

    // Test 1: Check authentication
    results.auth = {
      token: !!localStorage.getItem('seller_token'),
      user: !!user,
      userId: user?.id,
    };

    // Test 2: Check seller profile
    results.profile = {
      exists: !!profile,
      sellerId: profile?.id,
      status: profile?.status,
      brandName: profile?.brand_name,
    };

    // Test 3: API connectivity
    try {
      const res = await api.get('/auth/me');
      results.apiMe = { success: true, data: res.data };
    } catch (err) {
      results.apiMe = { success: false, error: err.message };
    }

    // Test 4: Seller profile API
    try {
      const res = await api.get('/seller/profile');
      results.apiProfile = { success: true, data: res.data };
    } catch (err) {
      results.apiProfile = { success: false, error: err.response?.data?.message || err.message };
    }

    // Test 5: Products API
    try {
      const res = await api.get('/seller/products?limit=100');
      results.apiProducts = {
        success: true,
        total: res.data.total,
        count: res.data.data?.length,
        page: res.data.page,
        limit: res.data.limit,
        firstProduct: res.data.data?.[0],
        statuses: res.data.data?.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
      };
    } catch (err) {
      results.apiProducts = { success: false, error: err.response?.data?.message || err.message };
    }

    // Test 6: Database check (via dashboard endpoint)
    try {
      const res = await api.get('/seller/dashboard');
      results.apiDashboard = { success: true, stats: res.data };
    } catch (err) {
      results.apiDashboard = { success: false, error: err.response?.data?.message || err.message };
    }

    setTestResults(results);
    setTesting(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 };

  const TestResult = ({ name, result }) => {
    const isSuccess = result?.success !== false && result !== false;
    const Icon = isSuccess ? CheckCircle : XCircle;
    const color = isSuccess ? '#16a34a' : '#ef4444';

    return (
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Icon size={20} color={color} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{name}</h3>
        </div>
        <pre style={{
          background: '#f9fafb',
          padding: 12,
          borderRadius: 6,
          fontSize: 12,
          overflow: 'auto',
          maxHeight: 400,
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
              Debug & Diagnostics
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              System tests and API connectivity checks
            </p>
          </div>
          <button
            onClick={runTests}
            disabled={testing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              background: testing ? '#d1d5db' : '#0f172a',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: testing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={16} className={testing ? 'spinner' : ''} />
            {testing ? 'Testing...' : 'Run Tests'}
          </button>
        </div>

        {testing && (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <RefreshCw size={32} color="#0891b2" className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Running diagnostics...</p>
          </div>
        )}

        {!testing && Object.keys(testResults).length > 0 && (
          <>
            <TestResult name="1. Authentication Status" result={testResults.auth} />
            <TestResult name="2. Seller Profile (Context)" result={testResults.profile} />
            <TestResult name="3. API: /auth/me" result={testResults.apiMe} />
            <TestResult name="4. API: /seller/profile" result={testResults.apiProfile} />
            <TestResult name="5. API: /seller/products" result={testResults.apiProducts} />
            <TestResult name="6. API: /seller/dashboard" result={testResults.apiDashboard} />
          </>
        )}

        <div style={{ ...card, background: '#fffbeb', border: '1px solid #fde047' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                Debugging Tips
              </h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                <li>Check the browser console for detailed logs</li>
                <li>Verify seller profile status is "active" or "approved"</li>
                <li>Ensure products exist in the database for this seller</li>
                <li>Check if backend API is running on the correct port</li>
                <li>Verify VITE_API_URL environment variable is set correctly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}

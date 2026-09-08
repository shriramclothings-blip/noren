import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { login } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Spinner } from '../components/ui/Spinner';

const ALLOWED_ROLES = ['admin', 'super_admin', 'business_owner', 'store_admin'];

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      const { token, user } = res.data;
      if (!ALLOWED_ROLES.includes(user.role)) {
        setError('Access denied. This portal is for internal staff only.');
        return;
      }
      signIn(token, user);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center font-serif font-bold text-xl mx-auto mb-4"
            style={{ background: 'var(--text-primary)', color: 'var(--accent)' }}
          >
            N
          </div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            NOREN
          </h1>
          <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Support Portal
          </p>
        </div>

        <div className="card p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-1">Sign in</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Internal access only. Authorised staff accounts.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 mb-4 text-red-700 text-sm">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="admin@norenfashion.shop"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Your password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => setShowPwd(s => !s)}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" /> Signing in…
                </>
              ) : (
                <>
                  <LogIn size={14} /> Sign in
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/forgot-password"
              className="text-xs hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Forgot password?
            </a>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} NOREN. Internal use only.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSellerAuth } from '../context/SellerAuthContext';

const inp = { width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s' };

export default function Login() {
  const { login } = useSellerAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Email and password required');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a' }}>
      {/* Left brand panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, borderRight: '1px solid rgba(255,255,255,0.06)' }} className="sp-brand-panel">
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 44, letterSpacing: '0.38em', color: '#faf9f7', textTransform: 'uppercase' }}>NOREN</div>
        <div style={{ fontSize: 11, letterSpacing: '0.24em', color: '#c9a96e', textTransform: 'uppercase', marginTop: 6 }}>Seller Portal</div>
        <p style={{ marginTop: 28, fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 320, lineHeight: 1.8 }}>
          List your products on NOREN. Reach thousands of fashion-conscious customers across India.
        </p>
        <style>{`@media (max-width: 767px) { .sp-brand-panel { display: none !important; } }`}</style>
      </div>

      {/* Right form panel */}
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 36px', background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Sign in</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>Access your seller dashboard</p>

          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" style={inp} required
                onFocus={e => e.target.style.borderColor = '#c9a96e'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" style={{ ...inp, paddingRight: 40 }} required
                  onFocus={e => e.target.style.borderColor = '#c9a96e'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: -6 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: '#c9a96e', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading}
              style={{ padding: '12px', borderRadius: 8, background: '#0f172a', color: '#faf9f7', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            New seller?{' '}
            <Link to="/register" style={{ color: '#c9a96e', fontWeight: 700, textDecoration: 'none' }}>Create account</Link>
          </p>
          <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            <a href="https://www.norenfastion.shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to NOREN store</a>
          </p>
        </div>
      </div>
    </div>
  );
}

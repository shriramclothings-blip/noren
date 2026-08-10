import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSellerAuth } from '../context/SellerAuthContext';

const inp = { width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box' };
const label = (text) => <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{text}</label>;

export default function Register() {
  const { login } = useSellerAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password required');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.token, res.data.user);
      toast.success('Account created! Set up your seller profile.');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, borderRight: '1px solid rgba(255,255,255,0.06)' }} className="sp-brand-panel">
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 44, letterSpacing: '0.38em', color: '#faf9f7', textTransform: 'uppercase' }}>NOREN</div>
        <div style={{ fontSize: 11, letterSpacing: '0.24em', color: '#c9a96e', textTransform: 'uppercase', marginTop: 6 }}>Seller Portal</div>
        <p style={{ marginTop: 28, fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 320, lineHeight: 1.8 }}>
          Join the NOREN marketplace. Upload your catalogue, set your prices, and let us handle the rest.
        </p>
        <style>{`@media (max-width: 767px) { .sp-brand-panel { display: none !important; } }`}</style>
      </div>

      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 36px', background: '#fff', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Create seller account</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>Start selling on NOREN today</p>

          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <div>
              {label('Full Name')}
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" style={inp} required />
            </div>
            <div>
              {label('Email')}
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" style={inp} required />
            </div>
            <div>
              {label('Phone')}
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" style={inp} />
            </div>
            <div>
              {label('Password')}
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min 6 characters" style={{ ...inp, paddingRight: 40 }} required />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ padding: '12px', borderRadius: 8, background: '#0f172a', color: '#faf9f7', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#c9a96e', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
          <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            <a href="https://www.norenfastion.shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to NOREN store</a>
          </p>
        </div>
      </div>
    </div>
  );
}

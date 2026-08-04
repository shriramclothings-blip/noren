import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleGoogleSuccess = (data) => {
    login(data.token, data.user);
    toast.success(`Welcome, ${data.user.name}! `);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.name}! `);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 5vw, 60px) 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 4vw, 40px)' }}>
          <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            <img src="/logo.png" alt="NOREN" style={{ height: 64, width: 'auto', objectFit: 'contain', display: 'block' }} />
          </Link>
          <div style={{ width: 32, height: 1, background: '#c9a96e', margin: '16px auto 0' }} />
        </div>

        <div style={{ background: '#faf9f7', border: '1px solid #e6e0d8', padding: 'clamp(24px, 5vw, 40px)' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, color: '#1a1a18', marginBottom: 6 }}>Join NOREN</h1>
          <p style={{ fontSize: 13, color: '#9e9a94', marginBottom: 28, letterSpacing: '0.02em' }}>Create your account to begin</p>

          {/* Google Sign Up */}
          <GoogleButton onSuccess={handleGoogleSuccess} label="Continue with Google" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e6e0d8' }} />
            <span style={{ fontSize: 10, color: '#b8a898', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>or sign up with email</span>
            <div style={{ flex: 1, height: 1, background: '#e6e0d8' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a5750', marginBottom: 8 }}>Full Name</label>
              <input required value={form.name} onChange={set('name')} placeholder="Your full name" className="input" style={{ fontSize: 16 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a5750', marginBottom: 8 }}>Email Address</label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="your@email.com" className="input" style={{ fontSize: 16 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a5750', marginBottom: 8 }}>
                Phone <span style={{ color: '#b8a898', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className="input" style={{ fontSize: 16 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a5750', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  placeholder="Min. 6 characters" className="input" style={{ paddingRight: 48, fontSize: 16 }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', display: 'flex', padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 11, marginTop: 4, minHeight: 48 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9e9a94', marginTop: 24, letterSpacing: '0.02em' }}>
            Already a member?{' '}
            <Link to="/login" style={{ color: '#1a1a18', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #c9a96e' }}>Sign in</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b8a898', marginTop: 24, letterSpacing: '0.06em' }}>
          Timeless By Design.
        </p>
      </div>
    </div>
  );
}

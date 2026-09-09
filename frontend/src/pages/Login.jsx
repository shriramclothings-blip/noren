import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ChevronDown, ChevronUp, ShieldAlert, KeyRound, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import GoogleButton from '../components/GoogleButton';

const ADMIN_ROLES = ['admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant'];

function NorenWordmark() {
  return (
    <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
      <img src="/logo.png" alt="NOREN" style={{ height: 64, width: 'auto', objectFit: 'contain', display: 'block' }} />
    </Link>
  );
}

/* ── Recovery help panel ─────────────────────────────────────────────────── */
function RecoveryHelpPanel() {
  const [open, setOpen]         = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [form, setForm]         = useState({ email: '', name: '', issueType: 'forgot_password', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(null);

  const ISSUE_OPTIONS = [
    { value: 'forgot_password',     label: 'I forgot my password' },
    { value: 'no_otp',              label: 'I\'m not receiving OTP emails' },
    { value: 'account_compromised', label: 'My account may be compromised' },
    { value: 'account_locked',      label: 'My account is locked / banned' },
    { value: 'other',               label: 'Another issue' },
  ];

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) return toast.error('Email is required');
    setSubmitting(true);
    try {
      const res = await api.post('/admin/recovery/query', form);
      setSubmitted(res.data.ticketId);
      toast.success('Request submitted — check your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const inp = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1.5px solid #e6e0d8', borderRadius: 6, outline: 'none',
    fontFamily: 'inherit', color: '#1a1a18', background: '#faf9f7',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ marginTop: 8 }}>
      {/* Toggle trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, background: 'none', border: 'none', cursor: 'pointer',
          padding: '10px 0', color: '#9e9a94', fontSize: 11,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
        }}
      >
        <ShieldAlert size={13} />
        Trouble accessing your account?
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div style={{
          border: '1px solid #e6e0d8', background: '#faf9f7',
          padding: '20px 20px 16px', marginTop: 4,
          animation: 'fadeSlideIn 0.18s ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldAlert size={14} color="#c9a96e" />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Account Recovery</p>
              <p style={{ fontSize: 11, color: '#9e9a94', margin: 0 }}>Choose a recovery method below</p>
            </div>
          </div>

          {/* Recovery options grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>

            {/* Option 1 — Standard OTP */}
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', border: '1px solid #e6e0d8',
                background: '#fff', cursor: 'pointer',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a96e'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e6e0d8'}
              >
                <div style={{ width: 32, height: 32, background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={14} color="#c9a96e" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', margin: '0 0 2px' }}>Recover via OTP Email</p>
                  <p style={{ fontSize: 11, color: '#9e9a94', margin: 0 }}>Get a one-time code sent to your registered email</p>
                </div>
                <span style={{ fontSize: 18, color: '#c9a96e', lineHeight: 1 }}>›</span>
              </div>
            </Link>

            {/* Option 2 — Recovery Key */}
            <Link to="/recover-account" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', border: '1px solid #e6e0d8',
                background: '#fff', cursor: 'pointer',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a96e'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e6e0d8'}
              >
                <div style={{ width: 32, height: 32, background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <KeyRound size={14} color="#c9a96e" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', margin: '0 0 2px' }}>Use Admin Recovery Key</p>
                  <p style={{ fontSize: 11, color: '#9e9a94', margin: 0 }}>Enter the key provided to you by NOREN support</p>
                </div>
                <span style={{ fontSize: 18, color: '#c9a96e', lineHeight: 1 }}>›</span>
              </div>
            </Link>

            {/* Option 3 — Contact support */}
            <button
              type="button"
              onClick={() => setQueryOpen(q => !q)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', border: '1px solid ' + (queryOpen ? '#c9a96e' : '#e6e0d8'),
                background: '#fff', cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'border-color .15s', fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 32, height: 32, background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={14} color="#c9a96e" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', margin: '0 0 2px' }}>Contact Support Team</p>
                <p style={{ fontSize: 11, color: '#9e9a94', margin: 0 }}>Submit a request — we'll help you recover your account</p>
              </div>
              {queryOpen ? <ChevronUp size={14} color="#9e9a94" /> : <ChevronDown size={14} color="#9e9a94" />}
            </button>
          </div>

          {/* Inline support form */}
          {queryOpen && (
            <div style={{ borderTop: '1px solid #e6e0d8', paddingTop: 16, animation: 'fadeSlideIn 0.15s ease' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ width: 44, height: 44, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', margin: '0 0 4px' }}>Request Submitted!</p>
                  <p style={{ fontSize: 12, color: '#9e9a94', margin: '0 0 8px' }}>Ticket ID: <strong style={{ color: '#c9a96e', fontFamily: 'monospace' }}>{submitted}</strong></p>
                  <p style={{ fontSize: 11, color: '#9e9a94', margin: 0 }}>Check your email for confirmation. Our team will respond within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuery} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#5a5750', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Support Request</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#9e9a94', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Your Name</label>
                      <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Full name" style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#9e9a94', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Account Email *</label>
                      <input type="email" required value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="you@email.com" style={inp} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#9e9a94', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Issue Type</label>
                    <select value={form.issueType} onChange={e => setForm(p => ({ ...p, issueType: e.target.value }))}
                      style={{ ...inp, appearance: 'none' }}>
                      {ISSUE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#9e9a94', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Brief Description</label>
                    <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe your issue briefly…" rows={3}
                      style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
                  </div>

                  <button type="submit" disabled={submitting}
                    style={{
                      padding: '11px', background: '#1a1a18', color: '#faf9f7',
                      border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.16em',
                      textTransform: 'uppercase', opacity: submitting ? 0.6 : 1,
                      fontFamily: 'inherit',
                    }}>
                    {submitting ? 'Submitting…' : 'Submit Recovery Request'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Divider note */}
          <p style={{ fontSize: 10, color: '#b8a898', textAlign: 'center', margin: '12px 0 0', letterSpacing: '0.06em' }}>
            For urgent issues email <a href="mailto:supportnoren1@gmail.com" style={{ color: '#c9a96e', textDecoration: 'none' }}>supportnoren1@gmail.com</a>
          </p>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = (user) => {
    if (user.role === 'influencer') {
      navigate('/influencer/dashboard');
    } else {
      navigate(state?.from || (ADMIN_ROLES.includes(user.role) ? '/admin/dashboard' : '/'));
    }
  };

  const handleGoogleSuccess = (data) => {
    login(data.token, data.user);
    toast.success(`Welcome, ${data.user.name}.`);
    redirectAfterLogin(data.user);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}.`);
      redirectAfterLogin(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a5750', marginBottom: 8 };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 5vw, 60px) 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 4vw, 40px)' }}>
          <NorenWordmark />
          <div style={{ width: 32, height: 1, background: '#c9a96e', margin: '20px auto 0' }} />
        </div>

        <div style={{ background: '#faf9f7', border: '1px solid #e6e0d8', padding: 'clamp(24px, 5vw, 40px)' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, color: '#1a1a18', marginBottom: 6, letterSpacing: '-0.01em' }}>Welcome Back</h1>
          <p style={{ fontSize: 13, color: '#9e9a94', marginBottom: 28, letterSpacing: '0.02em' }}>Sign in to your NOREN account</p>

          {/* Google */}
          <GoogleButton onSuccess={handleGoogleSuccess} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e6e0d8' }} />
            <span style={{ fontSize: 10, color: '#b8a898', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: '#e6e0d8' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" required value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="your@email.com"
                className="input" style={{ fontSize: 16 }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 11, color: '#c9a96e', textDecoration: 'none', letterSpacing: '0.08em' }}>Forgot?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder=""
                  className="input" style={{ paddingRight: 44, fontSize: 16 }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', display: 'flex', padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 11, marginTop: 4, minHeight: 48 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9e9a94', marginTop: 24, letterSpacing: '0.02em' }}>
            New to NOREN?{' '}
            <Link to="/register" style={{ color: '#1a1a18', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #c9a96e' }}>Create account</Link>
          </p>

          {/* ── Recovery Help Panel ─────────────────────────────── */}
          <div style={{ marginTop: 8, borderTop: '1px solid #f0ece6', paddingTop: 4 }}>
            <RecoveryHelpPanel />
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b8a898', marginTop: 24, letterSpacing: '0.06em' }}>
          Timeless By Design.
        </p>
      </div>
    </div>
  );
}

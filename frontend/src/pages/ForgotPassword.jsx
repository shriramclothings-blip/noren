import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const cardRef  = useRef(null);

  const [step,     setStep]     = useState(1);
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  // Scroll card into view on every step change
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step]);

  /* ── Step 1: send OTP ─────────────────────────────────────── */
  const sendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Enter your email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep(2); // always advance — OTP was sent
      toast.success('OTP sent! Check your email.');
    } catch (err) {
      // Only stay on step 1 for real errors (network down, 5xx)
      const msg = err.response?.data?.message;
      if (err.response?.status >= 500) {
        toast.error(msg || 'Server error. Try again.');
      } else {
        // 200 / 404 both mean "if email exists OTP was sent" — advance anyway
        setStep(2);
        toast.success('OTP sent! Check your email.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: verify OTP ───────────────────────────────────── */
  const verifyOTP = async (e) => {
    e.preventDefault();
    const clean = otp.replace(/\s/g, '');
    if (clean.length !== 6) return toast.error('Enter the 6-digit OTP from your email');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: email.trim().toLowerCase(), otp: clean });
      setStep(3);
      toast.success('OTP verified! Set your new password.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect OTP. Try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: reset password ───────────────────────────────── */
  const resetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm)  return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email:    email.trim().toLowerCase(),
        otp:      otp.replace(/\s/g, ''),
        password,
      });
      setStep(4);
      toast.success('Password reset! You can now sign in.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Request a new OTP.');
    } finally {
      setLoading(false);
    }
  };

  /* ── shared styles ────────────────────────────────────────── */
  const field = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px', fontSize: 15,
    border: '1px solid #d0c9c0', background: '#fff',
    outline: 'none', color: '#1a1a18', fontFamily: 'inherit',
    borderRadius: 2, transition: 'border-color 0.2s',
  };
  const label = {
    display: 'block', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    color: '#5a5750', marginBottom: 8,
  };
  const primaryBtn = (disabled) => ({
    width: '100%', padding: '14px', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    background: disabled ? '#9e9a94' : '#1a1a18', color: '#faf9f7',
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 2, transition: 'background 0.2s', minHeight: 48,
  });

  /* ── Step labels ──────────────────────────────────────────── */
  const steps = ['Email', 'OTP', 'Password'];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>

      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', marginBottom: 28 }}>
        <img src="/logo.png" alt="NOREN" style={{ height: 60, objectFit: 'contain', display: 'block' }} />
      </Link>

      {/* Step bar */}
      {step < 4 && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, width: '100%', maxWidth: 420 }}>
          {steps.map((s, i) => {
            const n      = i + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: done ? '#c9a96e' : active ? '#1a1a18' : '#e6e0d8',
                    color: done || active ? '#faf9f7' : '#9e9a94',
                    transition: 'all 0.3s',
                  }}>
                    {done ? '✓' : n}
                  </div>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? '#1a1a18' : '#9e9a94', fontWeight: active ? 700 : 400 }}>
                    {s}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > n ? '#c9a96e' : '#e6e0d8', margin: '0 8px 18px', transition: 'background 0.4s' }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Card */}
      <div ref={cardRef} style={{ width: '100%', maxWidth: 420, background: '#faf9f7', border: '1px solid #e6e0d8', borderRadius: 2, padding: 'clamp(24px, 6vw, 40px)' }}>

        {/* ══ STEP 1 — Email ══════════════════════════════════ */}
        {step === 1 && (
          <form onSubmit={sendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', margin: '0 0 6px' }}>Forgot Password</h1>
              <p style={{ fontSize: 13, color: '#9e9a94', margin: 0, lineHeight: 1.6 }}>
                Enter your email. We'll send a 6-digit OTP.
              </p>
            </div>

            <div>
              <label style={label}>Email Address</label>
              <input
                type="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={field}
                onFocus={e => e.target.style.borderColor = '#1a1a18'}
                onBlur={e => e.target.style.borderColor = '#d0c9c0'}
              />
            </div>

            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Sending OTP…' : 'Send OTP →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#9e9a94', margin: 0 }}>
              <Link to="/login" style={{ color: '#1a1a18', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #c9a96e' }}>
                Back to Sign In
              </Link>
            </p>
          </form>
        )}

        {/* ══ STEP 2 — OTP ════════════════════════════════════ */}
        {step === 2 && (
          <form onSubmit={verifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', margin: '0 0 10px' }}>Enter OTP</h1>
              <div style={{ background: '#f5f0e8', border: '1px solid #e6e0d8', borderRadius: 2, padding: '12px 14px', fontSize: 13, color: '#5a5750', lineHeight: 1.6 }}>
                A 6-digit code was sent to <strong style={{ color: '#1a1a18' }}>{email}</strong>.<br />
                <span style={{ fontSize: 12, color: '#9e9a94' }}>Check your inbox and spam folder.</span>
              </div>
            </div>

            <div>
              <label style={label}>6-Digit OTP Code</label>
              <input
                type="text" required autoFocus
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                style={{
                  ...field,
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '0.35em',
                  textAlign: 'center',
                  padding: '16px',
                  borderColor: otp.length === 6 ? '#1a1a18' : '#d0c9c0',
                  borderWidth: otp.length === 6 ? 2 : 1,
                  color: '#1a1a18',
                  caretColor: '#c9a96e',
                }}
                onFocus={e => e.target.style.borderColor = '#c9a96e'}
                onBlur={e => e.target.style.borderColor = otp.length === 6 ? '#1a1a18' : '#d0c9c0'}
              />
              {/* dot progress */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < otp.length ? '#c9a96e' : '#e6e0d8', transition: 'background 0.15s' }} />
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || otp.length < 6} style={primaryBtn(loading || otp.length < 6)}>
              {loading ? 'Verifying…' : 'Verify OTP →'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <button type="button" onClick={() => { setStep(1); setOtp(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', padding: 0 }}>
                ← Change email
              </button>
              <button type="button" disabled={loading} onClick={async () => {
                setLoading(true);
                try {
                  await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
                  setOtp('');
                  toast.success('New OTP sent!');
                } catch { toast.error('Failed. Try again.'); }
                finally { setLoading(false); }
              }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9a96e', fontWeight: 600, padding: 0 }}>
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {/* ══ STEP 3 — New Password ════════════════════════════ */}
        {step === 3 && (
          <form onSubmit={resetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', margin: '0 0 6px' }}>New Password</h1>
              <p style={{ fontSize: 13, color: '#9e9a94', margin: 0 }}>OTP verified. Choose a strong new password.</p>
            </div>

            <div>
              <label style={label}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required autoFocus
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ ...field, paddingRight: 48 }}
                  onFocus={e => e.target.style.borderColor = '#1a1a18'}
                  onBlur={e => e.target.style.borderColor = '#d0c9c0'}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', padding: 4 }}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 3, background: '#e6e0d8', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (password.length / 12) * 100)}%`, background: password.length < 6 ? '#dc2626' : password.length < 10 ? '#d97706' : '#16a34a', borderRadius: 2, transition: 'all 0.3s' }} />
                  </div>
                  <p style={{ fontSize: 11, marginTop: 4, color: password.length < 6 ? '#dc2626' : password.length < 10 ? '#d97706' : '#16a34a' }}>
                    {password.length < 6 ? 'Too short' : password.length < 10 ? 'Good' : 'Strong ✓'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label style={label}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password" required
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  style={{ ...field, paddingRight: 48, borderColor: confirm && confirm !== password ? '#dc2626' : '#d0c9c0' }}
                  onFocus={e => e.target.style.borderColor = '#1a1a18'}
                  onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? '#dc2626' : '#d0c9c0'}
                />
              </div>
              {confirm && confirm !== password && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Passwords don't match</p>}
              {confirm && confirm === password && password.length >= 6 && <p style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Passwords match ✓</p>}
            </div>

            <button type="submit" disabled={loading || password.length < 6 || password !== confirm}
              style={primaryBtn(loading || password.length < 6 || password !== confirm)}>
              {loading ? 'Resetting…' : 'Set New Password'}
            </button>
          </form>
        )}

        {/* ══ STEP 4 — Done ═══════════════════════════════════ */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} color="#16a34a" />
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: 10 }}>Password Reset!</h2>
            <p style={{ fontSize: 14, color: '#5a5750', marginBottom: 28, lineHeight: 1.7 }}>
              Your NOREN account password has been updated. You can now sign in with your new password.
            </p>
            <button onClick={() => navigate('/login')}
              style={{ ...primaryBtn(false), maxWidth: 200, margin: '0 auto' }}>
              Sign In Now
            </button>
          </div>
        )}

      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#b8a898', marginTop: 24, letterSpacing: '0.06em' }}>
        Timeless By Design.
      </p>
    </div>
  );
}

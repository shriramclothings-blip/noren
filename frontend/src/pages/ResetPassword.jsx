/**
 * ResetPassword.jsx
 *
 * Legacy route — /reset-password?token=...
 * Supports the old link-based reset for any tokens already emailed.
 * New flow uses ForgotPassword.jsx (OTP-based, 3 steps).
 * If no token in URL, redirect to /forgot-password.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '13px 16px', fontSize: 15,
  border: '1px solid #e6e0d8', background: '#faf9f7',
  outline: 'none', color: '#1a1a18', fontFamily: 'inherit',
  borderRadius: 0, transition: 'border-color 0.2s',
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  // No token — send to new OTP flow
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <Link to="/" style={{ display: 'inline-block', marginBottom: 24 }}>
            <img src="/logo.png" alt="NOREN" style={{ height: 56, objectFit: 'contain' }} />
          </Link>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1a1a18', marginBottom: 12 }}>Reset Link Invalid</h2>
          <p style={{ fontSize: 14, color: '#5a5750', marginBottom: 24, lineHeight: 1.7 }}>
            This reset link is missing or invalid. Use the OTP-based flow to securely reset your password.
          </p>
          <Link to="/forgot-password"
            style={{ display: 'inline-block', background: '#1a1a18', color: '#faf9f7', padding: '13px 32px', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Reset Password
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 6)  return toast.error('Minimum 6 characters required');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may be expired.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,5vw,60px) 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/logo.png" alt="NOREN" style={{ height: 64, objectFit: 'contain' }} />
          </Link>
          <div style={{ width: 32, height: 1, background: '#c9a96e', margin: '16px auto 0' }} />
        </div>

        <div style={{ background: '#faf9f7', border: '1px solid #e6e0d8', padding: 'clamp(24px,5vw,40px)' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} color="#16a34a" />
              </div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>Password Reset!</h2>
              <p style={{ fontSize: 14, color: '#5a5750', marginBottom: 28, lineHeight: 1.7 }}>Your password has been updated. Sign in with your new credentials.</p>
              <button onClick={() => navigate('/login')}
                style={{ padding: '13px 36px', background: '#1a1a18', color: '#faf9f7', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: 6 }}>Set New Password</h1>
              <p style={{ fontSize: 13, color: '#9e9a94', marginBottom: 28, lineHeight: 1.6 }}>Enter and confirm your new password below.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a5750', marginBottom: 8 }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                      style={{ ...inputStyle, paddingRight: 48 }}
                      onFocus={e => e.target.style.borderColor = '#1a1a18'}
                      onBlur={e => e.target.style.borderColor = '#e6e0d8'}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', display: 'flex', padding: 8 }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a5750', marginBottom: 8 }}>Confirm Password</label>
                  <input type="password" required value={confirm}
                    onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                    style={{ ...inputStyle, borderColor: confirm && confirm !== password ? '#dc2626' : '#e6e0d8' }}
                    onFocus={e => e.target.style.borderColor = '#1a1a18'}
                    onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? '#dc2626' : '#e6e0d8'}
                  />
                  {confirm && confirm !== password && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Passwords don't match</p>}
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: '14px', background: loading ? '#9e9a94' : '#1a1a18', color: '#faf9f7', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', transition: 'background 0.2s' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.color = '#1a1a18'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = loading ? '#9e9a94' : '#1a1a18'; e.currentTarget.style.color = '#faf9f7'; }}>
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#9e9a94', marginTop: 20 }}>
                <Link to="/forgot-password" style={{ color: '#c9a96e', fontWeight: 600, textDecoration: 'none' }}>Back to Forgot Password</Link>
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b8a898', marginTop: 24, letterSpacing: '0.06em' }}>
          Timeless By Design.
        </p>
      </div>
    </div>
  );
}

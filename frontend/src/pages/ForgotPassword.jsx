import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, KeyRound, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, current, label }) {
  const done    = n < current;
  const active  = n === current;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, fontFamily: 'Georgia, serif',
        background: done ? '#c9a96e' : active ? '#1a1a18' : '#f5f0e8',
        color:      done ? '#1a1a18' : active ? '#faf9f7' : '#b8a898',
        border:     active ? '2px solid #1a1a18' : done ? '2px solid #c9a96e' : '2px solid #e6e0d8',
        transition: 'all 0.3s',
      }}>
        {done ? <CheckCircle size={14} /> : n}
      </div>
      <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: active ? '#1a1a18' : '#9e9a94', fontWeight: active ? 600 : 400 }}>{label}</span>
    </div>
  );
}

function StepLine({ done }) {
  return (
    <div style={{ flex: 1, height: 2, background: done ? '#c9a96e' : '#e6e0d8', marginBottom: 22, transition: 'background 0.4s' }} />
  );
}

// ── Shared input style ────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '13px 16px', fontSize: 15,
  border: '1px solid #e6e0d8', background: '#faf9f7',
  outline: 'none', color: '#1a1a18', fontFamily: 'inherit',
  borderRadius: 0, transition: 'border-color 0.2s',
};
const labelStyle = {
  display: 'block', fontSize: 10, fontWeight: 600,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  color: '#5a5750', marginBottom: 8,
};
const btnStyle = {
  width: '100%', padding: '14px', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.18em', textTransform: 'uppercase',
  background: '#1a1a18', color: '#faf9f7',
  border: 'none', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 8,
  transition: 'background 0.2s', minHeight: 48,
};

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Step 1: email entry
  const [email, setEmail]   = useState('');
  // Step 2: OTP entry
  const [otp, setOtp]       = useState('');
  // Step 3: new password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);

  const [step, setStep]         = useState(1); // 1 | 2 | 3 | 4(done)
  const [loading, setLoading]   = useState(false);
  const [otpInputs, setOtpInputs] = useState(['','','','','','']);

  // ── OTP digit box helpers ──────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpInputs];
    next[i] = val;
    setOtpInputs(next);
    setOtp(next.join(''));
    if (val && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otpInputs[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
    }
  };
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split('');
      setOtpInputs(arr);
      setOtp(pasted);
      document.getElementById('otp-5')?.focus();
      e.preventDefault();
    }
  };

  // ── Step 1: Request OTP ────────────────────────────────────────────────────
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return toast.error('Enter a valid email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep(2);
      toast.success('OTP sent! Check your email inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: email.trim().toLowerCase(), otp });
      setStep(3);
      toast.success('OTP verified. Set your new password.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally { setLoading(false); }
  };

  // ── Step 3: Reset password ─────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm)  return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim().toLowerCase(), otp, password });
      setStep(4);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Try again.');
    } finally { setLoading(false); }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setOtpInputs(['','','','','','']);
      setOtp('');
      toast.success('New OTP sent to your email!');
    } catch { toast.error('Failed to resend. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,5vw,60px) 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            <img src="/logo.png" alt="NOREN" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <div style={{ width: 32, height: 1, background: '#c9a96e', margin: '16px auto 0' }} />
        </div>

        {/* Step progress */}
        {step < 4 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
            <StepDot n={1} current={step} label="Email" />
            <StepLine done={step > 1} />
            <StepDot n={2} current={step} label="OTP" />
            <StepLine done={step > 2} />
            <StepDot n={3} current={step} label="Password" />
          </div>
        )}

        {/* Card */}
        <div style={{ background: '#faf9f7', border: '1px solid #e6e0d8', padding: 'clamp(24px,5vw,40px)' }}>

          {/* ── STEP 1: Email ── */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Mail size={18} color="#c9a96e" />
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', margin: 0 }}>Forgot Password</h1>
              </div>
              <p style={{ fontSize: 13, color: '#9e9a94', marginBottom: 28, lineHeight: 1.6 }}>
                Enter the email address linked to your NOREN account. We'll send a 6-digit OTP to verify it's you.
              </p>
              <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#1a1a18'}
                    onBlur={e => e.target.style.borderColor = '#e6e0d8'}
                  />
                </div>
                <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.color = '#1a1a18'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; e.currentTarget.style.color = '#faf9f7'; }}>
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </form>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#9e9a94', marginTop: 20 }}>
                Remembered it?{' '}
                <Link to="/login" style={{ color: '#1a1a18', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #c9a96e' }}>Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <KeyRound size={18} color="#c9a96e" />
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', margin: 0 }}>Enter OTP</h1>
              </div>
              <p style={{ fontSize: 13, color: '#9e9a94', marginBottom: 28, lineHeight: 1.6 }}>
                We sent a 6-digit code to <strong style={{ color: '#1a1a18' }}>{email}</strong>. It expires in 10 minutes.
              </p>
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* OTP digit boxes */}
                <div>
                  <label style={labelStyle}>One-Time Password</label>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handleOtpPaste}>
                    {otpInputs.map((d, i) => (
                      <input
                        key={i} id={`otp-${i}`}
                        type="text" inputMode="numeric" maxLength={1}
                        value={d}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        style={{
                          width: 46, height: 52, textAlign: 'center',
                          fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif',
                          border: d ? '2px solid #1a1a18' : '1px solid #e6e0d8',
                          background: d ? '#f5f0e8' : '#faf9f7',
                          color: '#1a1a18', outline: 'none', borderRadius: 0,
                          transition: 'all 0.15s',
                          letterSpacing: '0.08em',
                        }}
                        onFocus={e => e.target.style.borderColor = '#c9a96e'}
                        onBlur={e => e.target.style.borderColor = d ? '#1a1a18' : '#e6e0d8'}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading || otp.length < 6}
                  style={{ ...btnStyle, opacity: (loading || otp.length < 6) ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!loading && otp.length === 6) { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.color = '#1a1a18'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; e.currentTarget.style.color = '#faf9f7'; }}>
                  {loading ? 'Verifying…' : 'Verify OTP'}
                </button>
              </form>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9e9a94', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                  <ArrowLeft size={13} /> Change email
                </button>
                <button onClick={handleResend} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#c9a96e', fontWeight: 600, padding: 0 }}>
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 3 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Lock size={18} color="#c9a96e" />
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', margin: 0 }}>New Password</h1>
              </div>
              <p style={{ fontSize: 13, color: '#9e9a94', marginBottom: 28, lineHeight: 1.6 }}>
                OTP verified. Choose a strong new password for your account.
              </p>
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      style={{ ...inputStyle, paddingRight: 48 }}
                      onFocus={e => e.target.style.borderColor = '#1a1a18'}
                      onBlur={e => e.target.style.borderColor = '#e6e0d8'}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', display: 'flex', padding: 8 }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 3, background: '#e6e0d8', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (password.length / 12) * 100)}%`, background: password.length < 6 ? '#dc2626' : password.length < 10 ? '#d97706' : '#16a34a', transition: 'all 0.3s' }} />
                      </div>
                      <p style={{ fontSize: 11, color: password.length < 6 ? '#dc2626' : password.length < 10 ? '#d97706' : '#16a34a', marginTop: 4 }}>
                        {password.length < 6 ? 'Too short' : password.length < 10 ? 'Good' : 'Strong'}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCf ? 'text' : 'password'} required value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      style={{ ...inputStyle, paddingRight: 48, borderColor: confirm && confirm !== password ? '#dc2626' : '#e6e0d8' }}
                      onFocus={e => e.target.style.borderColor = '#1a1a18'}
                      onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? '#dc2626' : '#e6e0d8'}
                    />
                    <button type="button" onClick={() => setShowCf(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', display: 'flex', padding: 8 }}>
                      {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Passwords don't match</p>}
                </div>
                <button type="submit" disabled={loading || password.length < 6 || password !== confirm}
                  style={{ ...btnStyle, opacity: (loading || password.length < 6 || password !== confirm) ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.color = '#1a1a18'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; e.currentTarget.style.color = '#faf9f7'; }}>
                  {loading ? 'Resetting…' : 'Set New Password'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} color="#16a34a" />
              </div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>Password Reset!</h2>
              <p style={{ fontSize: 14, color: '#5a5750', marginBottom: 28, lineHeight: 1.7 }}>
                Your NOREN account password has been updated successfully. You can now sign in with your new password.
              </p>
              <button onClick={() => navigate('/login')}
                style={{ ...btnStyle, maxWidth: 240, margin: '0 auto' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.color = '#1a1a18'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; e.currentTarget.style.color = '#faf9f7'; }}>
                Sign In Now
              </button>
            </div>
          )}

        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b8a898', marginTop: 24, letterSpacing: '0.06em' }}>
          Timeless By Design.
        </p>
      </div>
    </div>
  );
}

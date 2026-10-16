import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, ShieldCheck, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSellerAuth } from '../context/SellerAuthContext';

const inp = { width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s' };
const focus = { borderColor: '#c9a96e' };
const Lbl = ({ children }) => <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{children}</label>;

// Steps: 0 = email entry, 1 = OTP verification, 2 = complete registration
const STEPS = ['Email', 'Verify', 'Details'];

// Validation utilities
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
};

const getPasswordStrength = (password) => {
  if (password.length === 0) return 0;
  if (password.length < 8) return 1;
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return 2;
  if (!/[!@#$%^&*]/.test(password)) return 3;
  return 4;
};

const validatePhone = (phone) => {
  if (!phone) return true; // optional
  const regex = /^[0-9+\s-]{10,}$/;
  return regex.test(phone);
};

function StepBar({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < step ? '#c9a96e' : i === step ? '#0f172a' : '#e2e8f0',
              color: i < step ? '#fff' : i === step ? '#fff' : '#9ca3af',
              fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
            }}>
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === step ? '#0f172a' : '#9ca3af', fontWeight: i === step ? 700 : 400 }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 48, height: 2, background: i < step ? '#c9a96e' : '#e2e8f0', margin: '0 6px', marginBottom: 18, transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── OTP Input — 6 individual boxes ───────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const refs = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const arr = value.split('');
      arr[i] = '';
      onChange(arr.join('').trimEnd());
      if (i > 0) refs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i, v) => {
    const char = v.replace(/\D/g, '').slice(-1);
    const arr = (value + '      ').slice(0, 6).split('');
    arr[i] = char;
    const next = arr.join('').replace(/\s/g, '');
    onChange(next);
    if (char && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const lastIdx = Math.min(pasted.length, 5);
    refs.current[lastIdx]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i].trim()}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 800,
            border: `2px solid ${digits[i].trim() ? '#c9a96e' : '#e2e8f0'}`,
            borderRadius: 10, outline: 'none', fontFamily: "'Inter', sans-serif",
            color: '#0f172a', background: digits[i].trim() ? '#fefce8' : '#fff',
            transition: 'all 0.15s',
          }}
        />
      ))}
    </div>
  );
}

export default function Register() {
  const { login } = useSellerAuth();
  const navigate  = useNavigate();
  const [step, setStep]     = useState(0);
  const [email, setEmail]   = useState('');
  const [otp, setOtp]       = useState('');
  const [otpError, setOtpError] = useState('');
  const [form, setForm]     = useState({ name: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [lastOtpTime, setLastOtpTime] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Step 0: Send OTP ────────────────────────────────────────────────────────
  const sendOTP = async (e) => {
    e?.preventDefault();
    
    // Validate email
    if (!email.trim()) {
      return toast.error('Email address is required');
    }
    if (!validateEmail(email)) {
      return toast.error('Enter a valid email address (e.g., you@example.com)');
    }
    
    // Prevent OTP spam - wait 30 seconds between requests
    const now = Date.now();
    if (now - lastOtpTime < 30000) {
      return toast.error(`Please wait ${Math.ceil((30000 - (now - lastOtpTime)) / 1000)}s before requesting again`);
    }
    
    setLoading(true);
    try {
      await api.post('/seller/send-otp', { email: email.trim().toLowerCase() });
      toast.success('OTP sent! Check your email inbox.');
      setLastOtpTime(now);
      setStep(1);
      setResendTimer(60);
      setOtp('');
      setOtpError('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // ── Step 1: Verify OTP ──────────────────────────────────────────────────────
  const verifyOTP = async () => {
    if (otp.length !== 6) return setOtpError('Enter the complete 6-digit code');
    setOtpError('');
    setLoading(true);
    try {
      await api.post('/seller/verify-otp', { email: email.trim().toLowerCase(), otp: otp.trim() });
      toast.success('Email verified! Complete your registration.');
      setStep(2);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Step 2: Complete Registration ───────────────────────────────────────────
  const register = async (e) => {
    e.preventDefault();
    
    // Validate name
    if (!form.name.trim()) {
      return toast.error('Full name is required');
    }
    if (form.name.trim().length < 3) {
      return toast.error('Name must be at least 3 characters');
    }
    
    // Validate phone (if provided)
    if (!validatePhone(form.phone)) {
      return toast.error('Enter a valid phone number (e.g., +91 9876543210)');
    }
    
    // Validate password strength
    if (!form.password) {
      return toast.error('Password is required');
    }
    if (form.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    if (!validatePassword(form.password)) {
      return toast.error('Password must contain uppercase, lowercase, and numbers (e.g., MyPass123)');
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { 
        name: form.name.trim(), 
        email: email.trim().toLowerCase(), 
        password: form.password, 
        phone: form.phone.trim() || null 
      });
      await login(res.data.token, res.data.user);
      toast.success('Account created! Complete your seller setup.');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a' }}>
      {/* Brand panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, borderRight: '1px solid rgba(255,255,255,0.06)' }} className="sp-brand-panel">
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 44, letterSpacing: '0.38em', color: '#faf9f7', textTransform: 'uppercase' }}>NOREN</div>
        <div style={{ fontSize: 11, letterSpacing: '0.24em', color: '#c9a96e', textTransform: 'uppercase', marginTop: 6 }}>Seller Portal</div>
        <p style={{ marginTop: 28, fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 320, lineHeight: 1.8 }}>
          Join the NOREN marketplace. Upload your catalogue, set your prices, and let us handle the rest.
        </p>
        {/* Benefits */}
        <div style={{ marginTop: 36, display: 'grid', gap: 14, width: '100%', maxWidth: 300 }}>
          {['Email-verified secure registration', 'Fast KYC & account approval', 'Products go live on NOREN store', 'Weekly settlement payouts'].map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={14} color="#c9a96e" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>{b}</span>
            </div>
          ))}
        </div>
        <style>{`@media (max-width: 767px) { .sp-brand-panel { display: none !important; } }`}</style>
      </div>

      {/* Form panel */}
      <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 36px', background: '#fff', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Step indicator */}
          <StepBar step={step} />

          {/* ── Step 0: Email ─────────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} color="#0f172a" />
                </div>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Start with your email</h1>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>We'll send a verification code</p>
                </div>
              </div>
              <form onSubmit={sendOTP} style={{ display: 'grid', gap: 14 }}>
                <div>
                  <Lbl>Email Address</Lbl>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" style={inp} required autoFocus
                    onFocus={e => e.target.style.borderColor = '#c9a96e'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: '12px', borderRadius: 8, background: '#0f172a', color: '#faf9f7', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending OTP…' : 'Send Verification Code →'}
                </button>
              </form>
              <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#c9a96e', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step 1: OTP Verification ──────────────────────────────────── */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} color="#16a34a" />
                </div>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Enter verification code</h1>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Sent to <strong style={{ color: '#0f172a' }}>{email}</strong></p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
                We sent a 6-digit code to your email. It expires in 10 minutes. Check your spam folder if you don't see it.
              </p>

              <OTPInput value={otp} onChange={setOtp} />

              {otpError && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#dc2626', textAlign: 'center' }}>
                  {otpError}
                </div>
              )}

              <button onClick={verifyOTP} disabled={loading || otp.length !== 6}
                style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 8, background: otp.length === 6 ? '#0f172a' : '#e2e8f0', color: otp.length === 6 ? '#faf9f7' : '#9ca3af', border: 'none', fontSize: 14, fontWeight: 700, cursor: otp.length === 6 ? 'pointer' : 'default', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Verifying…' : 'Verify Email →'}
              </button>

              {/* Resend */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                {resendTimer > 0 ? (
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>
                    Resend code in <strong style={{ color: '#0f172a' }}>{resendTimer}s</strong>
                  </p>
                ) : (
                  <button onClick={sendOTP} disabled={loading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#c9a96e', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    <RefreshCw size={12} /> Resend OTP
                  </button>
                )}
              </div>

              <button onClick={() => { setStep(0); setOtp(''); setOtpError(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 14, background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                <ArrowLeft size={12} /> Change email
              </button>
            </>
          )}

          {/* ── Step 2: Complete Registration ────────────────────────────── */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={18} color="#16a34a" />
                </div>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Complete your account</h1>
                  <p style={{ fontSize: 12, color: '#16a34a', margin: '2px 0 0', fontWeight: 600 }}>✓ Email verified: {email}</p>
                </div>
              </div>

              <form onSubmit={register} style={{ display: 'grid', gap: 14 }}>
                <div>
                  <Lbl>Full Name</Lbl>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your full name" style={inp} required autoFocus
                    onFocus={e => e.target.style.borderColor = '#c9a96e'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <Lbl>Phone (optional)</Lbl>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 98765 43210" style={inp}
                    onFocus={e => e.target.style.borderColor = '#c9a96e'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <Lbl>Set Password</Lbl>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Min 6 characters" style={{ ...inp, paddingRight: 40 }} required
                      onFocus={e => e.target.style.borderColor = '#c9a96e'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                      {[...Array(4)].map((_, i) => (
                        <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: getPasswordStrength(form.password) > i ? (getPasswordStrength(form.password) <= 1 ? '#f59e0b' : getPasswordStrength(form.password) === 2 ? '#eab308' : getPasswordStrength(form.password) === 3 ? '#16a34a' : '#059669') : '#e2e8f0' }} />
                      ))}
                      <span style={{ fontSize: 10, color: getPasswordStrength(form.password) <= 1 ? '#f59e0b' : getPasswordStrength(form.password) === 2 ? '#eab308' : getPasswordStrength(form.password) === 3 ? '#16a34a' : '#059669', fontWeight: 600, marginLeft: 4 }}>
                        {getPasswordStrength(form.password) === 0 ? 'N/A' : getPasswordStrength(form.password) === 1 ? 'Weak' : getPasswordStrength(form.password) === 2 ? 'Fair' : getPasswordStrength(form.password) === 3 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                  )}
                  {form.password.length > 0 && getPasswordStrength(form.password) < 4 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                      ✓ Uppercase & lowercase letters
                      <br />
                      ✓ At least one number
                      <br />
                      {form.password.length < 8 && '✓ At least 8 characters'}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: '12px', borderRadius: 8, background: '#0f172a', color: '#faf9f7', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                  {loading ? 'Creating account…' : 'Create Seller Account →'}
                </button>
              </form>
            </>
          )}

          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            <a href="https://www.norenfastion.shop" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to NOREN store</a>
          </p>
        </div>
      </div>
    </div>
  );
}

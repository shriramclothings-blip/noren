import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Strength meter ── */
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score   = checks.filter(Boolean).length;
  const labels  = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors  = ['', '#ef4444', '#f59e0b', '#3b82f6', '#16a34a'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : '#e6e0d8', transition: 'background .2s' }} />
        ))}
      </div>
      <p style={{ fontSize: 10, color: colors[score], margin: '4px 0 0', fontWeight: 600, letterSpacing: '0.06em' }}>
        {labels[score]}
      </p>
    </div>
  );
}

/* ── Wordmark ── */
function NorenWordmark() {
  return (
    <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
      <img src="/logo.png" alt="NOREN" style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block' }} />
    </Link>
  );
}

export default function RecoveryKeyLogin() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1); // 1 = enter details, 2 = success
  const [form, setForm]         = useState({ email: '', recoveryKey: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw]     = useState(false);
  const [showCPw, setShowCPw]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 600,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: '#5a5750', marginBottom: 8,
  };
  const inputStyle = {
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: '1.5px solid #e6e0d8', background: '#faf9f7',
    color: '#1a1a18', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', borderRadius: 2,
    transition: 'border-color .15s',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword)
      return toast.error('Passwords do not match');
    if (form.newPassword.length < 6)
      return toast.error('Password must be at least 6 characters');
    if (!form.recoveryKey.trim())
      return toast.error('Recovery key is required');

    setLoading(true);
    try {
      await api.post('/auth/recover-with-key', {
        email:       form.email.trim().toLowerCase(),
        recoveryKey: form.recoveryKey.trim(),
        newPassword: form.newPassword,
      });
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recovery failed. Please check your key and try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f0e8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(24px, 5vw, 60px) 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 4vw, 40px)' }}>
          <NorenWordmark />
          <div style={{ width: 32, height: 1, background: '#c9a96e', margin: '20px auto 0' }} />
        </div>

        <div style={{ background: '#faf9f7', border: '1px solid #e6e0d8', padding: 'clamp(24px, 5vw, 40px)' }}>

          {step === 1 && (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
                <div style={{ width: 44, height: 44, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <KeyRound size={20} color="#c9a96e" />
                </div>
                <div>
                  <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, color: '#1a1a18', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                    Recovery Key Login
                  </h1>
                  <p style={{ fontSize: 13, color: '#9e9a94', margin: 0, lineHeight: 1.5 }}>
                    Enter the recovery key provided by NOREN support to set a new password.
                  </p>
                </div>
              </div>

              {/* Info banner */}
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: '#fffbeb', border: '1px solid #fcd34d',
                padding: '12px 14px', marginBottom: 24,
              }}>
                <ShieldAlert size={14} color="#b45309" style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: '#b45309', margin: 0, lineHeight: 1.6 }}>
                  Recovery keys are <strong>single-use</strong> and expire after the date set by support.
                  Contact <a href="mailto:supportnoren1@gmail.com" style={{ color: '#c9a96e' }}>supportnoren1@gmail.com</a> if you need a new one.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Email */}
                <div>
                  <label style={labelStyle}>Account Email</label>
                  <input
                    type="email" required
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    style={inputStyle}
                  />
                </div>

                {/* Recovery Key */}
                <div>
                  <label style={labelStyle}>Recovery Key</label>
                  <textarea
                    required
                    value={form.recoveryKey}
                    onChange={e => setForm(p => ({ ...p, recoveryKey: e.target.value }))}
                    placeholder="Paste your full recovery key here…"
                    rows={3}
                    style={{
                      ...inputStyle, fontFamily: 'monospace', fontSize: 12,
                      resize: 'vertical', lineHeight: 1.6, letterSpacing: '0.04em',
                    }}
                  />
                  <p style={{ fontSize: 10, color: '#9e9a94', margin: '5px 0 0' }}>
                    This is a 64-character key sent to your email by our support team.
                  </p>
                </div>

                {/* New password */}
                <div>
                  <label style={labelStyle}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'} required
                      value={form.newPassword}
                      onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Minimum 6 characters"
                      style={{ ...inputStyle, paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', padding: 6 }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <PasswordStrength password={form.newPassword} />
                </div>

                {/* Confirm password */}
                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCPw ? 'text' : 'password'} required
                      value={form.confirmPassword}
                      onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Repeat your password"
                      style={{
                        ...inputStyle, paddingRight: 44,
                        borderColor: form.confirmPassword && form.confirmPassword !== form.newPassword ? '#ef4444' : inputStyle.borderColor,
                      }}
                    />
                    <button type="button" onClick={() => setShowCPw(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a94', padding: 6 }}>
                      {showCPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.confirmPassword !== form.newPassword && (
                    <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: '0.16em', marginTop: 4, minHeight: 48 }}
                >
                  {loading ? 'Verifying key…' : 'Reset Password with Key'}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} color="#16a34a" />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, color: '#1a1a18', margin: '0 0 10px' }}>
                Password Updated
              </h2>
              <p style={{ fontSize: 13, color: '#9e9a94', margin: '0 0 28px', lineHeight: 1.7 }}>
                Your password has been successfully reset using the recovery key.
                You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary"
                style={{ padding: '13px 40px', fontSize: 11, letterSpacing: '0.16em' }}
              >
                Sign In Now
              </button>
            </div>
          )}
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9e9a94', textDecoration: 'none', letterSpacing: '0.06em' }}>
            <ArrowLeft size={13} /> Back to Sign In
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b8a898', marginTop: 20, letterSpacing: '0.06em' }}>
          Timeless By Design.
        </p>
      </div>
    </div>
  );
}

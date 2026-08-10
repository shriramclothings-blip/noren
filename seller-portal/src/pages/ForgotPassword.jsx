import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const inp = { width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box' };

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 36, width: '100%', maxWidth: 400 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 22, letterSpacing: '0.3em', color: '#0f172a', marginBottom: 4 }}>NOREN</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '16px 0 6px' }}>Reset Password</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>We'll send an OTP to your registered email.</p>

        {!sent ? (
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} required />
            <button type="submit" disabled={loading}
              style={{ padding: '12px', borderRadius: 8, background: '#0f172a', color: '#faf9f7', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>OTP sent to <b>{email}</b>. Check your inbox.</p>
            <Link to="/reset-password" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Enter OTP →</Link>
          </div>
        )}

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          <Link to="/login" style={{ color: '#c9a96e', fontWeight: 600, textDecoration: 'none' }}>← Back to login</Link>
        </p>
      </div>
    </div>
  );
}

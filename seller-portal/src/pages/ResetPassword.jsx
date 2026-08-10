import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const inp = { width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box' };

export default function ResetPassword() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', otp: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', form);
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 36, width: '100%', maxWidth: 400 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Set New Password</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Enter the OTP from your email and your new password.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" style={inp} required />
          <input value={form.otp} onChange={e => setForm(p => ({ ...p, otp: e.target.value }))} placeholder="6-digit OTP" style={inp} required />
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="New password" style={{ ...inp, paddingRight: 40 }} required />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" disabled={loading}
            style={{ padding: '12px', borderRadius: 8, background: '#0f172a', color: '#faf9f7', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          <Link to="/login" style={{ color: '#c9a96e', fontWeight: 600, textDecoration: 'none' }}>← Back to login</Link>
        </p>
      </div>
    </div>
  );
}

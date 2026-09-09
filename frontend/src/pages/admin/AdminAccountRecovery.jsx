import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert, KeyRound, Send, RefreshCw, Link2, Lock,
  CheckCircle2, ChevronDown, ChevronUp, Copy, Eye, EyeOff,
  Trash2, AlertTriangle, MessageSquare, User, Mail, Zap,
  Search, X, Clock, ShieldCheck, FileText, Activity,
  RotateCcw, Shield, Terminal,
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/* ────────────────── shared micro-styles ──────────────────────────────── */
const card  = (extra = {}) => ({ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', overflow: 'hidden', ...extra });
const lbl   = { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 };
const inp   = { width: '100%', padding: '9px 13px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 9, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' };
const solidBtn = (bg = '#111827', col = '#fff', extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px',
  borderRadius: 9, border: 'none', cursor: 'pointer',
  background: bg, color: col, fontSize: 12, fontWeight: 700,
  letterSpacing: '0.03em', transition: 'opacity .15s', ...extra,
});

const STATUS_PILL = {
  open:        { bg: '#fff7ed', color: '#c2410c' },
  in_progress: { bg: '#eff6ff', color: '#1d4ed8' },
  resolved:    { bg: '#f0fdf4', color: '#15803d' },
  closed:      { bg: '#f3f4f6', color: '#6b7280' },
};
const ISSUE_LABELS = {
  forgot_password:     'Forgot Password',
  account_compromised: 'Account Compromised',
  no_otp:              'Not Receiving OTP',
  account_locked:      'Account Locked',
  other:               'Other',
};

/* ─────────────────── spinner ──────────────────────────────────────────── */
const Spin = ({ size = 14 }) => <RefreshCw size={size} style={{ animation: 'spin .7s linear infinite' }} />;

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: USER SEARCH BOX
══════════════════════════════════════════════════════════════════════ */
function UserSearchBox({ onSelect }) {
  const [q, setQ]           = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);
  const timer               = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (val) => {
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(val)}&limit=6`);
      setResults(res.data.users || []);
      setOpen(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    setQ(e.target.value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(e.target.value), 320);
  };

  const pick = (user) => {
    onSelect(user);
    setQ('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          value={q}
          onChange={handleChange}
          placeholder="Search user by name or email…"
          style={{ ...inp, paddingLeft: 36, paddingRight: loading ? 36 : 13 }}
        />
        {loading && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}><Spin /></div>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden' }}>
          {results.map(u => (
            <div key={u.id} onClick={() => pick(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatar_url ? 'transparent' : '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#c9a96e', fontSize: 12, fontWeight: 800 }}>{u.name?.[0]?.toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: u.is_banned ? '#fef2f2' : '#f0fdf4', color: u.is_banned ? '#dc2626' : '#15803d' }}>
                {u.is_banned ? 'Banned' : 'Active'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: RECOVERY ACTIONS PANEL (all 4 tools in tabs)
══════════════════════════════════════════════════════════════════════ */
export function UserRecoveryPanel({ user, onDone }) {
  const [tab, setTab]         = useState('reset');
  const [busy, setBusy]       = useState(false);
  const [note, setNote]       = useState('');
  const [newPw, setNewPw]     = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [expiryH, setExpiryH] = useState(24);
  const [expiryD, setExpiryD] = useState(7);
  const [keyLabel, setKeyLabel] = useState('');
  const [result, setResult]   = useState(null);
  const [keys, setKeys]       = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [copied, setCopied]   = useState('');

  const loadKeys = useCallback(async () => {
    if (!user?.id) return;
    setKeysLoading(true);
    try {
      const res = await api.get(`/admin/recovery/users/${user.id}/keys`);
      setKeys(res.data.keys || []);
    } catch { /* silent */ }
    finally { setKeysLoading(false); }
  }, [user?.id]);

  useEffect(() => { if (tab === 'key') loadKeys(); }, [tab, loadKeys]);
  useEffect(() => { setResult(null); setNote(''); }, [tab, user?.id]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 2500);
    });
  };

  /* ── Force Reset ── */
  const doForceReset = async () => {
    if (newPw && newPw.length < 6) return toast.error('Password must be at least 6 characters');
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/force-reset`, {
        newPassword: newPw || undefined, sendEmail, adminNote: note,
      });
      setResult({ type: 'reset', data: res.data });
      toast.success('Password reset successfully');
      setNewPw(''); setNote('');
      onDone?.();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  /* ── Send OTP ── */
  const doSendOTP = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/send-otp`, { adminNote: note });
      setResult({ type: 'otp', data: res.data });
      toast.success(res.data.message);
      setNote('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  /* ── Magic Link ── */
  const doMagicLink = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/generate-link`, {
        expiryHours: expiryH, adminNote: note, sendEmail,
      });
      setResult({ type: 'link', data: res.data });
      toast.success('Recovery link generated');
      setNote('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  /* ── Recovery Key ── */
  const doGenKey = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/generate-key`, {
        expiryDays: expiryD, label: keyLabel || undefined, adminNote: note, sendEmail,
      });
      setResult({ type: 'key', data: res.data });
      toast.success('Recovery key generated');
      setNote(''); setKeyLabel('');
      loadKeys();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const doRevoke = async (keyId) => {
    if (!confirm('Revoke this recovery key? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/recovery/keys/${keyId}`);
      toast.success('Key revoked');
      loadKeys();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (!user) return null;

  const TABS = [
    { id: 'reset', icon: Lock,     label: 'Force Reset', color: '#374151', activeColor: '#111827', activeBg: '#f9fafb' },
    { id: 'otp',   icon: Zap,      label: 'Send OTP',    color: '#374151', activeColor: '#1d4ed8', activeBg: '#eff6ff' },
    { id: 'link',  icon: Link2,    label: 'Magic Link',  color: '#374151', activeColor: '#7e22ce', activeBg: '#faf5ff' },
    { id: 'key',   icon: KeyRound, label: 'Recovery Key',color: '#374151', activeColor: '#b45309', activeBg: '#fffbeb' },
  ];

  const active = TABS.find(t => t.id === tab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── User badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', borderRadius: '12px 12px 0 0' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: user.avatar_url ? 'transparent' : '#c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '2px solid rgba(201,169,110,0.3)' }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{user.name?.[0]?.toUpperCase()}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.02em' }}>{user.name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{user.email}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: user.is_banned ? '#fef2f2' : '#f0fdf4', color: user.is_banned ? '#dc2626' : '#15803d' }}>
            {user.is_banned ? 'Banned' : 'Active'}
          </span>
          <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>ID #{user.id}</span>
        </div>
      </div>

      {/* ── Security banner ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef9c3', borderLeft: '3px solid #eab308', padding: '8px 16px', fontSize: 11, color: '#713f12' }}>
        <Shield size={12} style={{ marginTop: 1, flexShrink: 0 }} />
        All actions are logged to the audit trail and may trigger email notifications to this user.
      </div>

      {/* ── Tab strip ── */}
      <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
        {TABS.map(({ id, icon: Icon, label: lbl2, activeColor, activeBg }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '11px 6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: tab === id ? activeBg : 'transparent',
            color: tab === id ? activeColor : '#6b7280',
            fontWeight: tab === id ? 800 : 500, fontSize: 11,
            borderBottom: tab === id ? `2.5px solid ${activeColor}` : '2.5px solid transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            transition: 'all .15s',
          }}>
            <Icon size={15} />
            <span>{lbl2}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, background: active.activeBg + '55', minHeight: 280 }}>

        {/* ── FORCE RESET ── */}
        {tab === 'reset' && (
          <>
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', display: 'flex', gap: 6 }}>
              <AlertTriangle size={13} style={{ marginTop: 1, flexShrink: 0 }} />
              Leave password blank to auto-generate a temporary one. User is notified by email.
            </div>
            <div>
              <span style={lbl}>New Password <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — blank = auto-generate)</span></span>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Minimum 6 characters, or leave blank" style={{ ...inp, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <span style={lbl}>Admin Note <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(included in user email)</span></span>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Reset per your support ticket request" style={inp} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#111827' }} />
              Notify user by email (recommended)
            </label>
            <button onClick={doForceReset} disabled={busy} style={{ ...solidBtn('#111827', '#fff', { width: '100%', justifyContent: 'center', padding: '11px', opacity: busy ? 0.6 : 1 }) }}>
              {busy ? <><Spin /> Resetting…</> : <><Lock size={14} /> Force Reset Password</>}
            </button>
            {result?.type === 'reset' && (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Password reset successfully
                </p>
                {result.data.tempPassword && (
                  <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px dashed #86efac', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>TEMPORARY PASSWORD — share securely</div>
                      <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#166534', letterSpacing: '0.12em' }}>{result.data.tempPassword}</span>
                    </div>
                    <button onClick={() => copy(result.data.tempPassword, 'pw')} style={{ ...solidBtn('#f0fdf4', '#15803d', { padding: '6px 12px', flexShrink: 0 }) }}>
                      {copied === 'pw' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      {copied === 'pw' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
                {!result.data.tempPassword && (
                  <p style={{ fontSize: 12, color: '#166534', margin: 0 }}>Custom password was set. {result.data.emailSent ? 'User has been notified.' : 'Email notification was skipped.'}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── SEND OTP ── */}
        {tab === 'otp' && (
          <>
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#1d4ed8', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6, fontWeight: 700 }}><Zap size={13} />What this does:</div>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Generates a fresh <strong>6-digit OTP</strong> on behalf of this user</li>
                <li>Sends it directly to <strong>{user.email}</strong></li>
                <li>Valid for <strong>15 minutes</strong></li>
                <li>User enters it on the <strong>Forgot Password</strong> page to reset their password</li>
              </ul>
            </div>
            <div>
              <span style={lbl}>Admin Note <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(shown in the email to user)</span></span>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. As requested in your support ticket RCV-XXXXX" style={inp} />
            </div>
            <button onClick={doSendOTP} disabled={busy} style={{ ...solidBtn('#1d4ed8', '#fff', { width: '100%', justifyContent: 'center', padding: '11px', opacity: busy ? 0.6 : 1 }) }}>
              {busy ? <><Spin /> Sending OTP…</> : <><Send size={14} /> Send OTP to {user.email}</>}
            </button>
            {result?.type === 'otp' && (
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircle2 size={15} color="#1d4ed8" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', margin: '0 0 4px' }}>OTP sent successfully</p>
                  <p style={{ fontSize: 12, color: '#1e40af', margin: 0 }}>
                    A 6-digit OTP has been sent to <strong>{user.email}</strong>.
                    Ask the user to check their inbox and use it on the Forgot Password page.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MAGIC LINK ── */}
        {tab === 'link' && (
          <>
            <div style={{ background: '#faf5ff', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#7e22ce', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6, fontWeight: 700 }}><Link2 size={13} />What this does:</div>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Creates a <strong>single-use magic link</strong> pre-loaded with a reset token</li>
                <li>User clicks it → lands on Reset Password page without needing an OTP</li>
                <li>Useful when user cannot receive emails (you share the link manually)</li>
                <li>Link expires after your chosen duration</li>
              </ul>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={lbl}>Link Expiry</span>
                <select value={expiryH} onChange={e => setExpiryH(Number(e.target.value))} style={{ ...inp, appearance: 'none' }}>
                  {[1, 3, 6, 12, 24, 48, 72].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#7e22ce' }} />
                  Email link to user
                </label>
              </div>
            </div>
            <div>
              <span style={lbl}>Admin Note <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(sent in email)</span></span>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note to user…" style={inp} />
            </div>
            <button onClick={doMagicLink} disabled={busy} style={{ ...solidBtn('#7e22ce', '#fff', { width: '100%', justifyContent: 'center', padding: '11px', opacity: busy ? 0.6 : 1 }) }}>
              {busy ? <><Spin /> Generating…</> : <><Link2 size={14} /> Generate Magic Link</>}
            </button>
            {result?.type === 'link' && (
              <div style={{ background: '#faf5ff', borderRadius: 10, padding: 14, border: '1px solid #d8b4fe' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', margin: '0 0 8px', display: 'flex', gap: 6 }}>
                  <CheckCircle2 size={13} /> Magic link ready
                </p>
                <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px dashed #c4b5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#374151', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace' }}>{result.data.recoveryUrl}</span>
                  <button onClick={() => copy(result.data.recoveryUrl, 'link')} style={{ ...solidBtn('#faf5ff', '#7e22ce', { padding: '6px 10px', flexShrink: 0 }) }}>
                    {copied === 'link' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '6px 0 0' }}>
                  Expires: {new Date(result.data.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  {result.data.emailSent ? ' · Email sent to user' : ' · Copy & share manually'}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── RECOVERY KEY ── */}
        {tab === 'key' && (
          <>
            <div style={{ background: '#fffbeb', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#b45309', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6, fontWeight: 700 }}><KeyRound size={13} />What this does:</div>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Generates a <strong>64-character one-time recovery key</strong></li>
                <li>User enters it on the <strong>/recover-account</strong> page with their email + new password</li>
                <li>Key is stored as a secure bcrypt hash — the raw value is shown only once</li>
                <li>Ideal when OTP emails are blocked or user has no email access</li>
              </ul>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={lbl}>Key Label</span>
                <input value={keyLabel} onChange={e => setKeyLabel(e.target.value)} placeholder="e.g. Ticket #RCV-123" style={inp} />
              </div>
              <div>
                <span style={lbl}>Expires In</span>
                <select value={expiryD} onChange={e => setExpiryD(Number(e.target.value))} style={{ ...inp, appearance: 'none' }}>
                  {[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>
            <div>
              <span style={lbl}>Admin Note <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(sent in key email)</span></span>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note to user…" style={inp} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#b45309' }} />
              Email key directly to user
            </label>
            <button onClick={doGenKey} disabled={busy} style={{ ...solidBtn('#b45309', '#fff', { width: '100%', justifyContent: 'center', padding: '11px', opacity: busy ? 0.6 : 1 }) }}>
              {busy ? <><Spin /> Generating…</> : <><KeyRound size={14} /> Generate Recovery Key</>}
            </button>
            {result?.type === 'key' && (
              <div style={{ background: '#fffbeb', borderRadius: 10, padding: 14, border: '1px solid #fcd34d' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#b45309', margin: '0 0 8px', display: 'flex', gap: 5 }}>
                  <CheckCircle2 size={13} /> Key generated — shown only once, copy now
                </p>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#c9a96e', wordBreak: 'break-all', flex: 1, letterSpacing: '0.05em', lineHeight: 1.6 }}>
                    {result.data.recoveryKey}
                  </span>
                  <button onClick={() => copy(result.data.recoveryKey, 'key')} style={{ ...solidBtn('#1e293b', '#c9a96e', { padding: '8px 12px', flexShrink: 0 }) }}>
                    {copied === 'key' ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    {copied === 'key' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '8px 0 0' }}>
                  Prefix: <strong style={{ color: '#374151' }}>{result.data.prefix}</strong> ·
                  Expires: {new Date(result.data.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  {result.data.emailSent ? ' · Email sent to user' : ''}
                </p>
              </div>
            )}

            {/* ── Key history ── */}
            <div style={{ borderTop: '1px solid #fde68a', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key History for this user</span>
                <button onClick={loadKeys} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              {keysLoading ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: '16px 0' }}><Spin /> Loading…</div>
              ) : keys.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: '16px 0', background: '#fff', borderRadius: 8 }}>
                  No recovery keys issued yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {keys.map(k => (
                    <div key={k.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      background: k.revoked ? '#fef2f2' : k.used ? '#f3f4f6' : '#f0fdf4',
                      borderRadius: 8,
                      border: `1px solid ${k.revoked ? '#fecaca' : k.used ? '#e5e7eb' : '#bbf7d0'}`,
                    }}>
                      <Terminal size={12} color={k.revoked ? '#dc2626' : k.used ? '#9ca3af' : '#16a34a'} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#374151' }}>{k.key_prefix}••••••••</span>
                        <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8 }}>{k.label}</span>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                          By {k.created_by_name || 'Admin'} · {new Date(k.created_at).toLocaleDateString('en-IN')}
                          {k.expires_at && ` · Exp ${new Date(k.expires_at).toLocaleDateString('en-IN')}`}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap',
                        background: k.revoked ? '#fef2f2' : k.used ? '#f3f4f6' : '#f0fdf4',
                        color: k.revoked ? '#dc2626' : k.used ? '#6b7280' : '#15803d',
                      }}>
                        {k.revoked ? 'Revoked' : k.used ? 'Used' : 'Active'}
                      </span>
                      {!k.revoked && !k.used && (
                        <button onClick={() => doRevoke(k.id)} title="Revoke key"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE — Account Recovery Command Center
══════════════════════════════════════════════════════════════════════ */
export default function AdminAccountRecovery() {
  /* ── Recovery queries state ── */
  const [queries, setQueries]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState(null);
  const [loadingQ, setLoadingQ] = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]         = useState(1);
  const [selQuery, setSelQuery] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editMethod, setEditMethod] = useState('');
  /* ── Recovery actions state ── */
  const [targetUser, setTargetUser] = useState(null);
  /* ── Main view toggle ── */
  const [view, setView]         = useState('queries'); // 'queries' | 'actions'
  const LIMIT = 15;

  const loadStats = useCallback(async () => {
    try { const r = await api.get('/admin/recovery/stats'); setStats(r.data); } catch { /* silent */ }
  }, []);

  const loadQueries = useCallback(async () => {
    setLoadingQ(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter) p.set('status', statusFilter);
      const r = await api.get(`/admin/recovery/queries?${p}`);
      setQueries(r.data.queries || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load queries'); }
    finally { setLoadingQ(false); }
  }, [page, statusFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQueries(); }, [loadQueries]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const openQuery = (q) => {
    setSelQuery(q);
    setEditNotes(q.admin_notes || '');
    setEditStatus(q.status);
    setEditMethod(q.resolution_method || '');
  };

  const saveQuery = async () => {
    if (!selQuery) return;
    setUpdating(true);
    try {
      const r = await api.put(`/admin/recovery/queries/${selQuery.id}`, {
        status: editStatus, adminNotes: editNotes, resolutionMethod: editMethod,
      });
      toast.success('Query updated');
      setSelQuery(r.data.query);
      loadQueries(); loadStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setUpdating(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  /* ── Handle: when admin picks a user from a query to run recovery actions ── */
  const handleRecoverFromQuery = async (q) => {
    if (!q.user_email) return toast.error('No email on this query');
    try {
      const r = await api.get(`/admin/users?search=${encodeURIComponent(q.user_email)}&limit=1`);
      const u = r.data.users?.[0];
      if (!u) return toast.error('User account not found for this email');
      setTargetUser(u);
      setView('actions');
    } catch { toast.error('Failed to look up user'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={20} color="#c9a96e" /> Account Recovery Center
          </h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            Force-reset passwords · Send OTPs on behalf · Generate magic links & recovery keys · Manage user support tickets
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3 }}>
          {[
            { id: 'queries', icon: MessageSquare, label: 'Support Queries' },
            { id: 'actions', icon: ShieldCheck,   label: 'Recovery Actions' },
          ].map(({ id, icon: Icon, label: l }) => (
            <button key={id} onClick={() => setView(id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: view === id ? '#fff' : 'transparent',
              color: view === id ? '#111827' : '#6b7280',
              boxShadow: view === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all .15s', fontFamily: 'inherit',
            }}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }} className="grid-features">
          {[
            { label: 'Open Tickets',    value: stats.queries.open_queries,        bg: '#fff7ed', color: '#c2410c', icon: MessageSquare },
            { label: 'In Progress',     value: stats.queries.in_progress_queries, bg: '#eff6ff', color: '#1d4ed8', icon: Activity      },
            { label: 'Resolved',        value: stats.queries.resolved_queries,    bg: '#f0fdf4', color: '#15803d', icon: CheckCircle2  },
            { label: 'Today\'s Tickets',value: stats.queries.today_queries,       bg: '#faf5ff', color: '#7e22ce', icon: Clock         },
            { label: 'Active Keys',     value: stats.keys.active_keys,            bg: '#fffbeb', color: '#b45309', icon: KeyRound      },
            { label: 'Keys Used',       value: stats.keys.used_keys,              bg: '#f3f4f6', color: '#6b7280', icon: RotateCcw     },
          ].map(({ label: l, value, bg, color, icon: Icon }) => (
            <div key={l} style={{ background: bg, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexShrink: 0 }}>
                <Icon size={14} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value ?? 0}</div>
                <div style={{ fontSize: 10, color, opacity: 0.75, fontWeight: 600, marginTop: 2 }}>{l}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════ VIEW: SUPPORT QUERIES ══════════════ */}
      {view === 'queries' && (
        <div style={{ display: 'grid', gridTemplateColumns: selQuery ? '1fr 380px' : '1fr', gap: 16 }}>
          {/* Queries table */}
          <div style={card()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={15} color="#c9a96e" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Recovery Queries</span>
                <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>{total}</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
                  <button key={s} onClick={() => setStatus(s)} style={{
                    padding: '4px 10px', borderRadius: 7, border: '1.5px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                    borderColor: statusFilter === s ? '#111827' : '#e5e7eb',
                    background: statusFilter === s ? '#111827' : '#fff',
                    color: statusFilter === s ? '#fff' : '#6b7280',
                  }}>
                    {s === '' ? 'All' : s.replace('_', ' ')}
                  </button>
                ))}
                <button onClick={() => { loadQueries(); loadStats(); }} style={{ ...solidBtn('#f3f4f6', '#374151', { padding: '5px 10px' }) }}>
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {loadingQ ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 54, borderRadius: 9 }} />)}
              </div>
            ) : queries.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                <MessageSquare size={32} color="#e5e7eb" style={{ margin: '0 auto 10px', display: 'block' }} />
                No recovery queries found
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Ticket ID', 'User', 'Issue', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queries.map(q => {
                      const pill = STATUS_PILL[q.status] || STATUS_PILL.closed;
                      return (
                        <tr key={q.id} style={{ borderTop: '1px solid #f3f4f6', background: selQuery?.id === q.id ? '#f9fafb' : 'transparent', cursor: 'pointer' }}
                          onClick={() => openQuery(q)}>
                          <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#c9a96e', fontSize: 11 }}>{q.ticket_id}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{q.user_name}</div>
                            <div style={{ color: '#9ca3af', fontSize: 11 }}>{q.user_email}</div>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#374151', whiteSpace: 'nowrap' }}>{ISSUE_LABELS[q.issue_type] || q.issue_type}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ ...pill, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                              {q.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                            {new Date(q.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleRecoverFromQuery(q)}
                              title="Open Recovery Actions for this user"
                              style={{ ...solidBtn('#0f172a', '#c9a96e', { padding: '5px 10px', fontSize: 11, borderRadius: 7 }) }}>
                              <ShieldCheck size={12} /> Recover
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#9ca3af' }}>{total} queries</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, opacity: page === 1 ? 0.4 : 1, fontFamily: 'inherit' }}>Prev</button>
                  <span style={{ padding: '4px 8px', color: '#6b7280' }}>{page}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, opacity: page === totalPages ? 0.4 : 1, fontFamily: 'inherit' }}>Next</button>
                </div>
              </div>
            )}
          </div>

          {/* Query detail / update panel */}
          {selQuery && (
            <div style={{ ...card(), display: 'flex', flexDirection: 'column', maxHeight: 700, overflowY: 'auto' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={14} color="#c9a96e" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{selQuery.ticket_id}</span>
                </div>
                <button onClick={() => setSelQuery(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={16} /></button>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Info */}
                <div style={{ background: '#f9fafb', borderRadius: 9, padding: '12px 14px', fontSize: 12 }}>
                  {[
                    ['Name', selQuery.user_name],
                    ['Email', selQuery.user_email],
                    ['Issue', ISSUE_LABELS[selQuery.issue_type] || selQuery.issue_type],
                    ['Submitted', new Date(selQuery.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                      <span style={{ color: '#9ca3af', flexShrink: 0 }}>{k}</span>
                      <span style={{ fontWeight: 600, color: '#374151', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                    </div>
                  ))}
                </div>
                {selQuery.description && (
                  <div>
                    <span style={lbl}>User Description</span>
                    <div style={{ background: '#f9fafb', borderRadius: 9, padding: '10px 12px', fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{selQuery.description}</div>
                  </div>
                )}
                {/* Recover button */}
                <button onClick={() => handleRecoverFromQuery(selQuery)} style={{ ...solidBtn('#0f172a', '#c9a96e', { width: '100%', justifyContent: 'center', padding: '10px' }) }}>
                  <ShieldCheck size={14} /> Open Recovery Actions for this User
                </button>
                {/* Status update */}
                <div>
                  <span style={lbl}>Status</span>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                    {['open','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>Resolution Method</span>
                  <select value={editMethod} onChange={e => setEditMethod(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                    <option value="">— Select —</option>
                    <option value="force_reset">Force Password Reset</option>
                    <option value="otp_sent">Sent Recovery OTP</option>
                    <option value="magic_link">Sent Magic Link</option>
                    <option value="recovery_key">Issued Recovery Key</option>
                    <option value="manual">Manual Resolution</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <span style={lbl}>Admin Notes</span>
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                    placeholder="Internal notes…"
                    style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
                <button onClick={saveQuery} disabled={updating} style={{ ...solidBtn('#111827', '#fff', { width: '100%', justifyContent: 'center', padding: '10px', opacity: updating ? 0.6 : 1 }) }}>
                  {updating ? <><Spin size={13} /> Saving…</> : <><CheckCircle2 size={13} /> Save Changes</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ VIEW: RECOVERY ACTIONS ══════════════ */}
      {view === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* User search */}
          <div style={card({ padding: 18 })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <User size={15} color="#c9a96e" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Select User to Recover</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <UserSearchBox onSelect={u => setTargetUser(u)} />
              {targetUser && (
                <button onClick={() => setTargetUser(null)} style={{ ...solidBtn('#fef2f2', '#dc2626', { padding: '9px 12px', flexShrink: 0 }) }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {targetUser && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 9, border: '1px solid #bbf7d0' }}>
                <CheckCircle2 size={15} color="#15803d" />
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>User selected: {targetUser.name}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{targetUser.email}</span>
              </div>
            )}

            {!targetUser && (
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '12px 0 0', textAlign: 'center' }}>
                Search for any user by name or email above to begin recovery
              </p>
            )}
          </div>

          {/* Recovery panel — only shows when a user is selected */}
          {targetUser && (
            <div style={card()}>
              <UserRecoveryPanel
                user={targetUser}
                onDone={() => { loadStats(); }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

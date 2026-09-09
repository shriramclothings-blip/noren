import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, KeyRound, Send, RefreshCw, Link2, Lock,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Copy, Eye, EyeOff, Trash2, Search, AlertTriangle,
  MessageSquare, RotateCcw, User, Mail, Zap,
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/* ── tiny shared styles ──────────────────────────────────────────────────── */
const card  = { background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' };
const sectionHead = { padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 };
const label = { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 };
const inp   = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 9, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' };
const btn   = (bg = '#111827', color = '#fff') => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: bg, color, fontSize: 12, fontWeight: 600, transition: 'opacity .15s' });

const STATUS_COLORS = {
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

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION A — PER-USER RECOVERY PANEL
   Used from AdminUsers.jsx detail panel (receives `user` prop)
══════════════════════════════════════════════════════════════════════════ */
export function UserRecoveryPanel({ user }) {
  const [tab, setTab]           = useState('reset');   // reset | otp | link | key
  const [busy, setBusy]         = useState(false);
  const [note, setNote]         = useState('');
  const [newPw, setNewPw]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [expiryH, setExpiryH]   = useState(24);
  const [expiryD, setExpiryD]   = useState(7);
  const [keyLabel, setKeyLabel] = useState('');
  const [result, setResult]     = useState(null);
  const [keys, setKeys]         = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [copied, setCopied]     = useState(false);

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
  useEffect(() => { setResult(null); }, [tab, user?.id]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Force reset ── */
  const handleForceReset = async () => {
    if (newPw && newPw.length < 6) return toast.error('Password must be at least 6 characters');
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/force-reset`, {
        newPassword: newPw || undefined,
        sendEmail,
        adminNote: note,
      });
      setResult({ type: 'reset', data: res.data });
      toast.success('Password reset successfully');
      setNewPw(''); setNote('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  /* ── Send OTP ── */
  const handleSendOTP = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/send-otp`, { adminNote: note });
      setResult({ type: 'otp', data: res.data });
      toast.success(res.data.message);
      setNote('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  /* ── Generate recovery link ── */
  const handleGenLink = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/generate-link`, {
        expiryHours: expiryH,
        adminNote: note,
        sendEmail,
      });
      setResult({ type: 'link', data: res.data });
      toast.success('Recovery link generated');
      setNote('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  /* ── Generate recovery key ── */
  const handleGenKey = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/admin/recovery/users/${user.id}/generate-key`, {
        expiryDays: expiryD,
        label: keyLabel || undefined,
        adminNote: note,
        sendEmail,
      });
      setResult({ type: 'key', data: res.data });
      toast.success('Recovery key generated');
      setNote(''); setKeyLabel('');
      loadKeys();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const handleRevoke = async (keyId) => {
    if (!confirm('Revoke this recovery key? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/recovery/keys/${keyId}`);
      toast.success('Key revoked');
      loadKeys();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (!user) return null;

  const TABS = [
    { id: 'reset', icon: Lock,        label: 'Force Reset' },
    { id: 'otp',   icon: Zap,         label: 'Send OTP'    },
    { id: 'link',  icon: Link2,        label: 'Magic Link'  },
    { id: 'key',   icon: KeyRound,     label: 'Recovery Key'},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 12 }}>
        <ShieldAlert size={16} color="#c9a96e" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em' }}>Account Recovery</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>{user.email}</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: '#f9fafb', padding: 4, borderRadius: 10 }}>
        {TABS.map(({ id, icon: Icon, label: lbl }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === id ? '#fff' : 'transparent',
            color: tab === id ? '#111827' : '#6b7280',
            fontWeight: tab === id ? 700 : 500, fontSize: 11,
            boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            transition: 'all .15s',
          }}>
            <Icon size={14} />
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Tab: Force Reset ── */}
      {tab === 'reset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff7ed', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#92400e', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            Leave the password blank to auto-generate a temporary one. The user will be notified by email.
          </div>
          <div>
            <span style={label}>New Password (optional)</span>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="Leave blank to auto-generate" style={{ ...inp, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <span style={label}>Admin Note (sent to user)</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note..." style={inp} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 14, height: 14 }} />
            Notify user by email
          </label>
          <button onClick={handleForceReset} disabled={busy} style={{ ...btn('#111827'), opacity: busy ? 0.6 : 1 }}>
            {busy ? <RefreshCw size={13} className="spin" /> : <Lock size={13} />}
            {busy ? 'Resetting…' : 'Force Reset Password'}
          </button>

          {result?.type === 'reset' && (
            <div style={{ background: '#f0fdf4', borderRadius: 9, padding: 12, border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', margin: '0 0 6px', display: 'flex', gap: 6 }}>
                <CheckCircle2 size={14} /> Password reset successfully
              </p>
              {result.data.tempPassword && (
                <div style={{ background: '#fff', borderRadius: 7, padding: '8px 12px', border: '1px dashed #86efac', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#166534', letterSpacing: '0.1em' }}>
                    {result.data.tempPassword}
                  </span>
                  <button onClick={() => copyToClipboard(result.data.tempPassword)} style={{ ...btn('#f0fdf4', '#15803d'), padding: '5px 10px' }}>
                    {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
              <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 0' }}>Share this password securely with the user.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Send OTP ── */}
      {tab === 'otp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#eff6ff', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#1d4ed8', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Zap size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            Sends a 6-digit OTP to <strong>{user.email}</strong>. Valid for 15 minutes. User can use it on the forgot-password page.
          </div>
          <div>
            <span style={label}>Admin Note for User (optional)</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. 'As requested in your support ticket'" style={inp} />
          </div>
          <button onClick={handleSendOTP} disabled={busy} style={{ ...btn('#1d4ed8'), opacity: busy ? 0.6 : 1 }}>
            {busy ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
            {busy ? 'Sending…' : `Send OTP to ${user.email}`}
          </button>
          {result?.type === 'otp' && (
            <div style={{ background: '#f0fdf4', borderRadius: 9, padding: 12, border: '1px solid #bbf7d0', fontSize: 12, color: '#15803d', display: 'flex', gap: 6 }}>
              <CheckCircle2 size={14} />
              {result.data.message}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Magic Link ── */}
      {tab === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#faf5ff', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#7e22ce', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Link2 size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            Generates a single-use password reset link. User clicks it to land directly on the reset page — no OTP needed.
          </div>
          <div>
            <span style={label}>Link Expiry</span>
            <select value={expiryH} onChange={e => setExpiryH(Number(e.target.value))} style={{ ...inp, appearance: 'none' }}>
              {[1, 3, 6, 12, 24, 48, 72].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>Admin Note (sent to user)</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note…" style={inp} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 14, height: 14 }} />
            Email link directly to user
          </label>
          <button onClick={handleGenLink} disabled={busy} style={{ ...btn('#7e22ce'), opacity: busy ? 0.6 : 1 }}>
            {busy ? <RefreshCw size={13} className="spin" /> : <Link2 size={13} />}
            {busy ? 'Generating…' : 'Generate Recovery Link'}
          </button>
          {result?.type === 'link' && (
            <div style={{ background: '#faf5ff', borderRadius: 9, padding: 12, border: '1px solid #d8b4fe' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce', margin: '0 0 8px', display: 'flex', gap: 5 }}>
                <CheckCircle2 size={13} /> Recovery link ready
              </p>
              <div style={{ background: '#fff', borderRadius: 7, padding: '8px 10px', border: '1px dashed #c4b5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#374151', wordBreak: 'break-all', flex: 1 }}>{result.data.recoveryUrl}</span>
                <button onClick={() => copyToClipboard(result.data.recoveryUrl)} style={{ ...btn('#faf5ff', '#7e22ce'), padding: '5px 10px', flexShrink: 0 }}>
                  {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: '6px 0 0' }}>
                Expires: {new Date(result.data.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Recovery Key ── */}
      {tab === 'key' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fffbeb', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#b45309', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <KeyRound size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            Generates a one-time 64-character recovery key. User enters it on the <em>Recover Account</em> page to set a new password.
          </div>

          {/* Generate form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={label}>Key Label</span>
              <input value={keyLabel} onChange={e => setKeyLabel(e.target.value)} placeholder="e.g. Support Ticket #123" style={inp} />
            </div>
            <div>
              <span style={label}>Expires In</span>
              <select value={expiryD} onChange={e => setExpiryD(Number(e.target.value))} style={{ ...inp, appearance: 'none' }}>
                {[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>
          <div>
            <span style={label}>Admin Note (sent in email)</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note to user…" style={inp} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 14, height: 14 }} />
            Email key directly to user
          </label>
          <button onClick={handleGenKey} disabled={busy} style={{ ...btn('#b45309'), opacity: busy ? 0.6 : 1 }}>
            {busy ? <RefreshCw size={13} className="spin" /> : <KeyRound size={13} />}
            {busy ? 'Generating…' : 'Generate Recovery Key'}
          </button>

          {result?.type === 'key' && (
            <div style={{ background: '#fffbeb', borderRadius: 9, padding: 12, border: '1px solid #fcd34d' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#b45309', margin: '0 0 8px', display: 'flex', gap: 5 }}>
                <CheckCircle2 size={13} /> Recovery key generated
              </p>
              <div style={{ background: '#0f172a', borderRadius: 7, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#c9a96e', wordBreak: 'break-all', flex: 1, letterSpacing: '0.06em' }}>
                  {result.data.recoveryKey}
                </span>
                <button onClick={() => copyToClipboard(result.data.recoveryKey)} style={{ ...btn('#1e293b', '#c9a96e'), padding: '6px 10px', flexShrink: 0 }}>
                  {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: '6px 0 0' }}>
                Prefix: <strong>{result.data.prefix}</strong> · Expires: {new Date(result.data.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          )}

          {/* Existing keys list */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Keys</span>
              <button onClick={loadKeys} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                <RefreshCw size={13} />
              </button>
            </div>
            {keysLoading ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: '12px 0' }}>Loading…</div>
            ) : keys.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: '12px 0' }}>No recovery keys found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {keys.map(k => (
                  <div key={k.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    background: k.revoked ? '#fef2f2' : k.used ? '#f3f4f6' : '#f0fdf4',
                    borderRadius: 8, border: `1px solid ${k.revoked ? '#fecaca' : k.used ? '#e5e7eb' : '#bbf7d0'}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>
                        {k.key_prefix}••••••••
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        {k.label} · By {k.created_by_name || 'Admin'} · {new Date(k.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: k.revoked ? '#fef2f2' : k.used ? '#f3f4f6' : '#f0fdf4',
                      color: k.revoked ? '#dc2626' : k.used ? '#6b7280' : '#15803d',
                    }}>
                      {k.revoked ? 'Revoked' : k.used ? 'Used' : 'Active'}
                    </span>
                    {!k.revoked && !k.used && (
                      <button onClick={() => handleRevoke(k.id)} title="Revoke"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION B — FULL PAGE: Recovery Queries Dashboard
══════════════════════════════════════════════════════════════════════════ */
export default function AdminAccountRecovery() {
  const [queries, setQueries]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const LIMIT = 15;

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/recovery/stats');
      setStats(res.data);
    } catch { /* silent */ }
  }, []);

  const loadQueries = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter) p.set('status', statusFilter);
      const res = await api.get(`/admin/recovery/queries?${p}`);
      setQueries(res.data.queries || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load recovery queries'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQueries(); }, [loadQueries]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const openQuery = (q) => {
    setSelected(q);
    setEditNotes(q.admin_notes || '');
    setEditStatus(q.status);
    setEditMethod(q.resolution_method || '');
  };

  const saveQuery = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await api.put(`/admin/recovery/queries/${selected.id}`, {
        status: editStatus,
        adminNotes: editNotes,
        resolutionMethod: editMethod,
      });
      toast.success('Query updated');
      setSelected(res.data.query);
      loadQueries();
      loadStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setUpdating(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }} className="grid-features">
          {[
            { label: 'Open',        value: stats.queries.open_queries,        bg: '#fff7ed', color: '#c2410c', icon: MessageSquare },
            { label: 'In Progress', value: stats.queries.in_progress_queries, bg: '#eff6ff', color: '#1d4ed8', icon: RefreshCw     },
            { label: 'Resolved',    value: stats.queries.resolved_queries,    bg: '#f0fdf4', color: '#15803d', icon: CheckCircle2  },
            { label: 'Active Keys', value: stats.keys.active_keys,            bg: '#fffbeb', color: '#b45309', icon: KeyRound      },
          ].map(({ label: lbl, value, bg, color, icon: Icon }) => (
            <div key={lbl} style={{ background: bg, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value ?? 0}</div>
                <div style={{ fontSize: 11, color, opacity: 0.7, fontWeight: 600, marginTop: 2 }}>{lbl}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 16 }}>

        {/* Queries table */}
        <div style={card}>
          <div style={{ ...sectionHead, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} color="#c9a96e" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Recovery Queries</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '4px 10px', borderRadius: 7, border: '1.5px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  borderColor: statusFilter === s ? '#111827' : '#e5e7eb',
                  background: statusFilter === s ? '#111827' : '#fff',
                  color: statusFilter === s ? '#fff' : '#6b7280',
                }}>
                  {s === '' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
              <button onClick={() => { loadQueries(); loadStats(); }} style={{ ...btn('#f9fafb', '#374151'), padding: '5px 10px' }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : queries.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No recovery queries found
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Ticket', 'User', 'Issue', 'Status', 'Date', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queries.map(q => {
                    const sc = STATUS_COLORS[q.status] || STATUS_COLORS.closed;
                    return (
                      <tr key={q.id} style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer', background: selected?.id === q.id ? '#f9fafb' : 'transparent' }}
                        onClick={() => openQuery(q)}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#c9a96e' }}>{q.ticket_id}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{q.user_name}</div>
                          <div style={{ color: '#9ca3af', fontSize: 11 }}>{q.user_email}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#374151' }}>{ISSUE_LABELS[q.issue_type] || q.issue_type}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ ...sc, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, textTransform: 'capitalize' }}>
                            {q.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {new Date(q.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <ChevronDown size={14} color="#9ca3af" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#9ca3af' }}>{total} queries</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
                <span style={{ padding: '4px 8px', color: '#6b7280' }}>{page}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail/edit panel */}
        {selected && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...sectionHead, justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} color="#c9a96e" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{selected.ticket_id}</span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              {/* Info */}
              <div style={{ background: '#f9fafb', borderRadius: 9, padding: '12px 14px', fontSize: 12 }}>
                {[
                  ['Name', selected.user_name],
                  ['Email', selected.user_email],
                  ['Issue', ISSUE_LABELS[selected.issue_type] || selected.issue_type],
                  ['Submitted', new Date(selected.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                    <span style={{ color: '#9ca3af', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontWeight: 600, color: '#374151', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                  </div>
                ))}
              </div>

              {selected.description && (
                <div>
                  <span style={label}>User Description</span>
                  <div style={{ background: '#f9fafb', borderRadius: 9, padding: '10px 12px', fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                    {selected.description}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <span style={label}>Status</span>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                  {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Resolution method */}
              <div>
                <span style={label}>Resolution Method</span>
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

              {/* Notes */}
              <div>
                <span style={label}>Admin Notes</span>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                  placeholder="Internal notes…"
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              <button onClick={saveQuery} disabled={updating} style={{ ...btn(), opacity: updating ? 0.6 : 1 }}>
                {updating ? <RefreshCw size={13} className="spin" /> : <CheckCircle2 size={13} />}
                {updating ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Mail, Send, Trash2, Search, Users, User, Megaphone, Tag, Zap, FileText, Clock, CheckCircle, X } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff',
  boxSizing: 'border-box',
};

const TYPE_CONFIG = {
  update:     { label: 'Update',          icon: Zap,       color: '#2563eb', bg: '#dbeafe' },
  new_launch: { label: 'New Launch',      icon: Megaphone, color: '#c9a96e', bg: '#fef3c7' },
  deal:       { label: 'Special Deal',    icon: Tag,       color: '#16a34a', bg: '#dcfce7' },
  offer:      { label: 'Exclusive Offer', icon: Tag,       color: '#dc2626', bg: '#fee2e2' },
  custom:     { label: 'Custom',          icon: FileText,  color: '#5a5750', bg: '#f3f4f6' },
};

const blankForm = { subject: '', message: '', type: 'update', target: 'all', user_id: null, custom_html: '' };

// ── User Search Dropdown ──────────────────────────────────────────────────────
function UserSearch({ onSelect, selectedUser, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const search = (val) => {
    setQuery(val);
    clearTimeout(timer.current);
    if (val.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/erp/email/users/search?q=${encodeURIComponent(val)}`);
        setResults(res.data);
      } catch {} finally { setLoading(false); }
    }, 300);
  };

  if (selectedUser) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1.5px solid #c9a96e', borderRadius: 8, background: '#fefce8' }}>
      <User size={14} color="#c9a96e" />
      <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{selectedUser.name} <span style={{ color: '#6b7280' }}>({selectedUser.email})</span></span>
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} color="#6b7280" /></button>
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input style={{ ...inp, paddingLeft: 32 }} placeholder="Search by name, email or phone…" value={query} onChange={e => search(e.target.value)} />
      </div>
      {results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, zIndex: 50, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {results.map(u => (
            <button key={u.id} onClick={() => { onSelect(u); setQuery(''); setResults([]); }}
              style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', flexShrink: 0 }}>
                {u.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {loading && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af' }}>Searching…</div>}
    </div>
  );
}

// ── Compose Panel ─────────────────────────────────────────────────────────────
function ComposePanel({ onSent }) {
  const [form, setForm] = useState(blankForm);
  const [sending, setSending] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showHtml, setShowHtml] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) return toast.error('Subject is required');
    if (!form.message.trim() && !form.custom_html.trim()) return toast.error('Message is required');
    if (form.target === 'specific' && !form.user_id) return toast.error('Please select a user');
    setSending(true);
    try {
      const res = await api.post('/erp/email/send', form);
      toast.success(res.data.message);
      setForm(blankForm);
      setSelectedUser(null);
      setShowHtml(false);
      onSent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  return (
    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Type selector */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Email Type</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = form.type === key;
            return (
              <button key={key} type="button" onClick={() => set('type', key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${active ? cfg.color : '#e5e7eb'}`, background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                <Icon size={13} />{cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipients */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Recipients</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[['all', <><Users size={13} /> All Users</>], ['specific', <><User size={13} /> Specific User</>]].map(([val, label]) => (
            <button key={val} type="button" onClick={() => { set('target', val); set('user_id', null); setSelectedUser(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${form.target === val ? '#1a1a18' : '#e5e7eb'}`, background: form.target === val ? '#1a1a18' : '#fff', color: form.target === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        {form.target === 'specific' && (
          <UserSearch selectedUser={selectedUser}
            onSelect={u => { setSelectedUser(u); set('user_id', u.id); }}
            onClear={() => { setSelectedUser(null); set('user_id', null); }} />
        )}
      </div>

      {/* Subject */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Subject</label>
        <input style={inp} placeholder="e.g. New Summer Collection is Here!" value={form.subject} onChange={e => set('subject', e.target.value)} />
      </div>

      {/* Message toggle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Message</label>
          <button type="button" onClick={() => setShowHtml(p => !p)}
            style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
            {showHtml ? 'Plain Text' : 'Custom HTML'}
          </button>
        </div>
        {showHtml
          ? <textarea style={{ ...inp, minHeight: 160, resize: 'vertical' }} placeholder="Paste custom HTML here…" value={form.custom_html} onChange={e => set('custom_html', e.target.value)} />
          : <textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }} placeholder="Write your message here…" value={form.message} onChange={e => set('message', e.target.value)} />
        }
      </div>

      <button type="submit" disabled={sending}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 28px', background: sending ? '#9ca3af' : '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
        <Send size={15} />{sending ? 'Sending…' : 'Send Email'}
      </button>
    </form>
  );
}

// ── Logs Panel ────────────────────────────────────────────────────────────────
function LogsPanel({ refresh }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/email/logs');
      setLogs(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [refresh]);

  const deleteLog = async (id) => {
    if (!window.confirm('Delete this log entry?')) return;
    try {
      await api.delete(`/erp/email/logs/${id}`);
      toast.success('Log deleted');
      fetchLogs();
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading logs…</div>;
  if (!logs.length) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Mail size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
      <p style={{ color: '#9ca3af', fontSize: 14 }}>No emails sent yet</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {logs.map(log => {
        const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.custom;
        const Icon = cfg.icon;
        return (
          <div key={log.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={cfg.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{log.subject}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={11} color="#16a34a" />
                  {log.sent_count} sent
                </span>
                <span>{log.target === 'specific' ? `To: ${log.target_user_name || ''} (${log.target_user_email || ''})` : 'All users'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {log.created_by_name && <span>By: {log.created_by_name}</span>}
              </div>
            </div>
            <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
              <Trash2 size={14} color="#d1d5db" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminEmailCenter() {
  const [tab, setTab] = useState('compose');
  const [logsRefresh, setLogsRefresh] = useState(0);

  const tabs = [
    { key: 'compose', label: 'Compose & Send', icon: Send },
    { key: 'logs',    label: 'Sent History',   icon: Clock },
  ];

  return (
    <div style={{ padding: '28px 24px', maxWidth: 800, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={20} color="#faf9f7" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Email Center</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Send updates, launches, deals and custom emails to users</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, border: 'none', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#111827' : '#6b7280', fontSize: 13, fontWeight: tab === key ? 600 : 400, cursor: 'pointer', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
        {tab === 'compose'
          ? <ComposePanel onSent={() => { setLogsRefresh(p => p + 1); setTab('logs'); }} />
          : <LogsPanel refresh={logsRefresh} />
        }
      </div>
    </div>
  );
}

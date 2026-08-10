import { useState, useEffect, useRef } from 'react';
import { Mail, Send, Trash2, Search, Users, User, Megaphone, Tag, Zap,
  FileText, Clock, CheckCircle, X, AtSign, Plus } from 'lucide-react';
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

const blankForm = { subject: '', message: '', type: 'update', target: 'all', user_id: null, custom_html: '', custom_emails: '' };

// ── User Search Dropdown ──────────────────────────────────────────────────────
function UserSearch({ onSelect, selectedUser, onClear }) {
  const [query, setQuery]     = useState('');
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

// ── Custom Email Input (tag-style) ────────────────────────────────────────────
function CustomEmailInput({ value, onChange }) {
  const [input, setInput]   = useState('');
  const emails = value ? value.split(',').map(e => e.trim()).filter(Boolean) : [];

  const addEmail = (raw) => {
    const list = raw.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (!list.length) return;
    const merged = [...new Set([...emails, ...list])];
    onChange(merged.join(', '));
    setInput('');
  };

  const removeEmail = (email) => {
    const merged = emails.filter(e => e !== email);
    onChange(merged.join(', '));
  };

  const handleKeyDown = (e) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key)) {
      e.preventDefault();
      if (input.trim()) addEmail(input);
    }
    if (e.key === 'Backspace' && !input && emails.length) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    addEmail(e.clipboardData.getData('text'));
  };

  return (
    <div>
      {/* Tags */}
      {emails.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {emails.map(email => (
            <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#15803d', fontWeight: 500 }}>
              {email}
              <button onClick={() => removeEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <AtSign size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => { if (input.trim()) addEmail(input); }}
          placeholder="Type email and press Enter or comma, or paste a list…"
          style={{ ...inp, paddingLeft: 30 }}
        />
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
          {emails.length > 0 ? `${emails.length} email${emails.length !== 1 ? 's' : ''} added` : 'Paste a comma/newline-separated list or type one by one'}
        </p>
        {emails.length > 0 && (
          <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

// ── Compose Panel ─────────────────────────────────────────────────────────────
function ComposePanel({ onSent }) {
  const [form, setForm]           = useState(blankForm);
  const [sending, setSending]     = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showHtml, setShowHtml]   = useState(false);
  const [preview, setPreview]     = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) return toast.error('Subject is required');
    if (!form.message.trim() && !form.custom_html.trim()) return toast.error('Message is required');
    if (form.target === 'specific' && !form.user_id) return toast.error('Please select a user');
    if (form.target === 'custom_emails' && !form.custom_emails.trim()) return toast.error('Add at least one email address');

    const emailCount = form.target === 'custom_emails'
      ? form.custom_emails.split(',').filter(e => e.trim()).length
      : null;

    const confirmMsg = form.target === 'all'
      ? 'This will email ALL registered users. Are you sure?'
      : form.target === 'custom_emails'
        ? `Send to ${emailCount} custom email address${emailCount !== 1 ? 'es' : ''}?`
        : null;

    if (confirmMsg && !window.confirm(confirmMsg)) return;

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

  const TARGETS = [
    { val: 'all',           icon: <Users size={12} />,   label: 'All Users' },
    { val: 'specific',      icon: <User size={12} />,    label: 'Specific User' },
    { val: 'custom_emails', icon: <AtSign size={12} />,  label: 'Custom Emails' },
  ];

  return (
    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Email Type */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Email Type</label>
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
        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Send To</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {TARGETS.map(({ val, icon, label }) => (
            <button key={val} type="button"
              onClick={() => { set('target', val); set('user_id', null); set('custom_emails', ''); setSelectedUser(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${form.target === val ? '#1a1a18' : '#e5e7eb'}`, background: form.target === val ? '#1a1a18' : '#fff', color: form.target === val ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Target-specific inputs */}
        {form.target === 'specific' && (
          <UserSearch selectedUser={selectedUser}
            onSelect={u => { setSelectedUser(u); set('user_id', u.id); }}
            onClear={() => { setSelectedUser(null); set('user_id', null); }} />
        )}

        {form.target === 'custom_emails' && (
          <div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#92400e' }}>
              <strong>Marketing mode</strong> — send to any email address, even non-registered users. Use for cold outreach, partnerships, or external campaigns.
            </div>
            <CustomEmailInput value={form.custom_emails} onChange={v => set('custom_emails', v)} />
          </div>
        )}

        {form.target === 'all' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b' }}>
            ⚠️ This will send to <strong>all registered users</strong>. Use responsibly.
          </div>
        )}
      </div>

      {/* Subject */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Subject Line</label>
        <input style={inp} placeholder="e.g. Exclusive: 20% Off Everything This Weekend!" value={form.subject} onChange={e => set('subject', e.target.value)} />
      </div>

      {/* Message */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Message</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {showHtml && (
              <button type="button" onClick={() => setPreview(p => !p)}
                style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                {preview ? 'Edit' : 'Preview HTML'}
              </button>
            )}
            <button type="button" onClick={() => { setShowHtml(p => !p); setPreview(false); }}
              style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
              {showHtml ? '← Plain Text' : 'Custom HTML →'}
            </button>
          </div>
        </div>

        {showHtml ? (
          preview
            ? <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, minHeight: 200, background: '#fafafa' }} dangerouslySetInnerHTML={{ __html: form.custom_html }} />
            : <textarea style={{ ...inp, minHeight: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} placeholder="<h1>Hello</h1><p>Your message here…</p>" value={form.custom_html} onChange={e => set('custom_html', e.target.value)} />
        ) : (
          <textarea style={{ ...inp, minHeight: 130, resize: 'vertical' }} placeholder="Write your email content here. Keep it clear, friendly, and action-oriented." value={form.message} onChange={e => set('message', e.target.value)} />
        )}
      </div>

      {/* Optional CTA */}
      {!showHtml && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Button Text (optional)</label>
            <input style={inp} placeholder="Shop Now" value={form.ctaText || ''} onChange={e => set('ctaText', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Button URL (optional)</label>
            <input style={inp} placeholder="https://www.norenfastion.shop" value={form.ctaUrl || ''} onChange={e => set('ctaUrl', e.target.value)} />
          </div>
        </div>
      )}

      <button type="submit" disabled={sending}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 28px', background: sending ? '#9ca3af' : '#1a1a18', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
        <Send size={15} />{sending ? 'Sending…' : 'Send Email'}
      </button>
    </form>
  );
}

// ── Logs Panel ────────────────────────────────────────────────────────────────
function LogsPanel({ refresh }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try { const res = await api.get('/erp/email/logs'); setLogs(res.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [refresh]);

  const deleteLog = async (id) => {
    if (!window.confirm('Delete this log entry?')) return;
    try { await api.delete(`/erp/email/logs/${id}`); toast.success('Deleted'); fetchLogs(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>;
  if (!logs.length) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Mail size={36} color="#d1d5db" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
      <p style={{ color: '#9ca3af', fontSize: 14 }}>No emails sent yet</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {logs.map(log => {
        const cfg  = TYPE_CONFIG[log.type] || TYPE_CONFIG.custom;
        const Icon = cfg.icon;
        const isCustom = log.target === 'custom_emails';
        return (
          <div key={log.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: isCustom ? '#fef3c7' : cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isCustom ? <AtSign size={16} color="#d97706" /> : <Icon size={16} color={cfg.color} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{log.subject}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: isCustom ? '#fef3c7' : cfg.bg, color: isCustom ? '#d97706' : cfg.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isCustom ? 'Custom Emails' : cfg.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} color="#16a34a" />{log.sent_count} sent</span>
                <span>
                  {log.target === 'specific' ? `To: ${log.target_user_name || ''} (${log.target_user_email || ''})` :
                   log.target === 'custom_emails' && log.custom_emails ? `To: ${log.custom_emails.slice(0, 60)}${log.custom_emails.length > 60 ? '…' : ''}` :
                   'All users'}
                </span>
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
  const [tab, setTab]             = useState('compose');
  const [logsRefresh, setLogsRefresh] = useState(0);

  const tabs = [
    { key: 'compose', label: 'Compose & Send', icon: Send },
    { key: 'logs',    label: 'Sent History',   icon: Clock },
  ];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={20} color="#c9a96e" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Email Center</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Send to registered users, newsletter subscribers, or any custom email list</p>
          </div>
        </div>

        {/* Quick stats strip */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { icon: <Users size={12} color="#2563eb" />, label: 'All registered users', bg: '#eff6ff', color: '#1d4ed8' },
            { icon: <User size={12} color="#16a34a" />,  label: 'Single specific user', bg: '#f0fdf4', color: '#15803d' },
            { icon: <AtSign size={12} color="#d97706" />,label: 'Any external emails',  bg: '#fffbeb', color: '#92400e' },
          ].map(({ icon, label, bg, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: bg, fontSize: 12, color, fontWeight: 500 }}>
              {icon}{label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, border: 'none', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#111827' : '#6b7280', fontSize: 13, fontWeight: tab === key ? 600 : 400, cursor: 'pointer', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 28 }}>
        {tab === 'compose'
          ? <ComposePanel onSent={() => { setLogsRefresh(p => p + 1); setTab('logs'); }} />
          : <LogsPanel refresh={logsRefresh} />
        }
      </div>
    </div>
  );
}

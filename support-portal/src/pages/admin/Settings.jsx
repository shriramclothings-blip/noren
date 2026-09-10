import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { getSettings, updateSettings } from '../../api/settings';
import { getSLARules } from '../../api/support';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/ui/Spinner';

function useSettings(group) {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSettings(group)
      .then(r => setValues(r.data.settings || {}))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [group]);

  const save = async (data) => {
    setSaving(true);
    try {
      await updateSettings(group, data);
      setValues(p => ({ ...p, ...data }));
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    }
    setSaving(false);
  };

  return { values, setValues, loading, saving, save };
}

export default function Settings() {
  const [tab, setTab] = useState('general');
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'support', label: 'Support' },
    { id: 'email', label: 'Email' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'roles', label: 'Roles' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Portal configuration and preferences</p>
      </div>

      <div className="flex border-b border-[var(--border)] overflow-x-auto gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === 'general'       && <GeneralSettings />}
        {tab === 'support'       && <SupportSettings />}
        {tab === 'email'         && <EmailSettings />}
        {tab === 'notifications' && <NotifSettings />}
        {tab === 'security'      && <SecuritySettings />}
        {tab === 'roles'         && <RolesSettings />}
      </div>
    </div>
  );
}

function SaveButton({ onClick, saving }) {
  return (
    <button className="btn btn-primary btn-sm" onClick={onClick} disabled={saving}>
      {saving ? <><Spinner size="sm" /> Saving…</> : <><Save size={12} /> Save</>}
    </button>
  );
}

function GeneralSettings() {
  const { values, setValues, loading, saving, save } = useSettings('general');

  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>;

  const v = values;
  const set = (k, val) => setValues(p => ({ ...p, [k]: val }));

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">General</h2>
      <div>
        <label className="label">Portal Name</label>
        <input className="input" value={v.portal_name || 'NOREN Support Portal'} onChange={e => set('portal_name', e.target.value)} />
      </div>
      <div>
        <label className="label">Support Email (shown to customers)</label>
        <input className="input" type="email" value={v.support_email || 'support@norenfashion.shop'} onChange={e => set('support_email', e.target.value)} />
      </div>
      <div>
        <label className="label">Timezone</label>
        <select className="input text-xs" value={v.timezone || 'Asia/Kolkata'} onChange={e => set('timezone', e.target.value)}>
          <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
        </select>
      </div>
      <div>
        <label className="label">Date Format</label>
        <select className="input text-xs" value={v.date_format || 'DD MMM YYYY'} onChange={e => set('date_format', e.target.value)}>
          <option value="DD MMM YYYY">DD MMM YYYY (09 Sep 2026)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
        </select>
      </div>
      <SaveButton onClick={() => save(v)} saving={saving} />
    </div>
  );
}

function SupportSettings() {
  const { values, setValues, loading, saving, save } = useSettings('support');

  if (loading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>;

  const v = values;
  const set = (k, val) => setValues(p => ({ ...p, [k]: val }));

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Support Configuration</h2>

      <div>
        <label className="label">Default Priority for New Tickets</label>
        <select className="input text-xs" value={v.default_priority || 'normal'} onChange={e => set('default_priority', e.target.value)}>
          {['low', 'normal', 'high', 'urgent', 'critical'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Auto-close Resolved Tickets After (hours)</label>
        <input className="input" type="number" min={0} value={v.auto_close_hours || 72} onChange={e => set('auto_close_hours', e.target.value)} />
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Set to 0 to disable auto-close.</p>
      </div>

      <div>
        <label className="label">Max Ticket Attachments Size (MB)</label>
        <input className="input" type="number" min={1} max={50} value={v.max_attachment_mb || 5} onChange={e => set('max_attachment_mb', e.target.value)} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="send-ticket-created"
          checked={v.send_ticket_created_email !== false}
          onChange={e => set('send_ticket_created_email', e.target.checked)}
        />
        <label htmlFor="send-ticket-created" className="text-xs">Send confirmation email to customer when ticket is created</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="send-resolved"
          checked={v.send_resolved_email !== false}
          onChange={e => set('send_resolved_email', e.target.checked)}
        />
        <label htmlFor="send-resolved" className="text-xs">Send notification email to customer when ticket is resolved</label>
      </div>

      <SaveButton onClick={() => save(v)} saving={saving} />
    </div>
  );
}

function EmailSettings() {
  const { values, setValues, loading, saving, save } = useSettings('email');

  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>;

  const v = values;
  const set = (k, val) => setValues(p => ({ ...p, [k]: val }));

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Email Configuration</h2>

      <div className="p-3 rounded-md text-xs border flex items-start gap-2" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#c2410c' }} />
        <p style={{ color: '#9a3412' }}>
          Email sending is configured via backend environment variables (<code>RESEND_API_KEY</code>, <code>EMAIL_FROM</code>).
          These settings control display and template preferences only.
        </p>
      </div>

      <div>
        <label className="label">From Name (shown to recipients)</label>
        <input className="input" value={v.email_from_name || 'NOREN Support'} onChange={e => set('email_from_name', e.target.value)} />
      </div>

      <div>
        <label className="label">Reply-To Address</label>
        <input className="input" type="email" value={v.reply_to || 'support@norenfashion.shop'} onChange={e => set('reply_to', e.target.value)} />
      </div>

      <div>
        <label className="label">Email Signature</label>
        <textarea
          className="input resize-none text-xs"
          rows={4}
          value={v.signature || 'NOREN Customer Support\nsupport@norenfashion.shop\n\nNOREN Fashion — Timeless By Design'}
          onChange={e => set('signature', e.target.value)}
        />
      </div>

      <SaveButton onClick={() => save(v)} saving={saving} />
    </div>
  );
}

function NotifSettings() {
  const { values, setValues, loading, saving, save } = useSettings('notifications');

  if (loading) return <div className="space-y-3">{Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>;

  const v = values;
  const set = (k, val) => setValues(p => ({ ...p, [k]: val }));

  const items = [
    { key: 'notif_ticket_assigned', label: 'Ticket assigned to me' },
    { key: 'notif_ticket_escalated', label: 'Ticket escalated' },
    { key: 'notif_customer_reply', label: 'New customer reply' },
    { key: 'notif_sla_approaching', label: 'SLA approaching breach (2h warning)' },
    { key: 'notif_sla_breached', label: 'SLA breached' },
    { key: 'notif_critical', label: 'Critical incident created' },
    { key: 'notif_mention', label: 'Mentioned in internal note' },
  ];

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Notification Preferences</h2>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
            <span className="text-xs">{item.label}</span>
            <input
              type="checkbox"
              checked={v[item.key] !== false}
              onChange={e => set(item.key, e.target.checked)}
              className="rounded"
            />
          </div>
        ))}
      </div>
      <SaveButton onClick={() => save(v)} saving={saving} />
    </div>
  );
}

function SecuritySettings() {
  const { values, setValues, loading, saving, save } = useSettings('security');

  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>;

  const v = values;
  const set = (k, val) => setValues(p => ({ ...p, [k]: val }));

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Security</h2>

      <div className="p-3 rounded-md text-xs border flex items-start gap-2" style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#1d4ed8' }} />
        <p style={{ color: '#1e40af' }}>
          JWT secrets, DB credentials, and API keys are managed via backend environment variables. They are never stored here.
        </p>
      </div>

      <div>
        <label className="label">IP Address Visibility</label>
        <select className="input text-xs" value={v.ip_visibility || 'super_admin'} onChange={e => set('ip_visibility', e.target.value)}>
          <option value="super_admin">Super Admin only</option>
          <option value="admin">Admin and above</option>
          <option value="none">Hidden from all (maximum privacy)</option>
        </select>
      </div>

      <div>
        <label className="label">Sensitive Data Export Requires</label>
        <select className="input text-xs" value={v.export_permission || 'admin'} onChange={e => set('export_permission', e.target.value)}>
          <option value="admin">Admin role</option>
          <option value="super_admin">Super Admin only</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="audit-customer"
          checked={v.audit_customer_access !== false}
          onChange={e => set('audit_customer_access', e.target.checked)}
        />
        <label htmlFor="audit-customer" className="text-xs">Log every customer profile access in audit trail</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="audit-export"
          checked={v.audit_exports !== false}
          onChange={e => set('audit_exports', e.target.checked)}
        />
        <label htmlFor="audit-export" className="text-xs">Log every data export in audit trail</label>
      </div>

      <SaveButton onClick={() => save(v)} saving={saving} />
    </div>
  );
}

function RolesSettings() {
  const roles = [
    { role: 'super_admin', desc: 'Full access to all features, including infrastructure settings, IP visibility, and audit trails. Cannot be restricted.' },
    { role: 'admin', desc: 'Full operational access. Can manage tickets, customers, orders, sellers, influencers, and most settings. Cannot modify backend infrastructure.' },
    { role: 'business_owner', desc: 'Business-scoped admin access. Same as admin within their business scope.' },
    { role: 'store_admin', desc: 'Store-scoped management. Can handle support tickets and customer issues within their store.' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Portal Access Roles</h2>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        The following roles have access to this support portal. Permissions are enforced server-side via the NOREN backend.
        To change a user's role, update their record in the main admin panel.
      </p>
      <div className="space-y-2">
        {roles.map(r => (
          <div key={r.role} className="flex items-start gap-3 p-3 rounded-md border border-[var(--border)]" style={{ background: 'var(--surface-2)' }}>
            <span className="badge bg-blue-100 text-blue-800 capitalize flex-shrink-0 mt-0.5">{r.role.replace('_', ' ')}</span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.desc}</p>
          </div>
        ))}
      </div>
      <div className="p-3 rounded-md text-xs border" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
        Roles are stored in <code className="font-mono">src_users.role</code> and permissions in <code className="font-mono">src_role_permissions</code>.
        Changes take effect on next login.
      </div>
    </div>
  );
}

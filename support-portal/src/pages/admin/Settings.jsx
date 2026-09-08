import React, { useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [tab, setTab] = useState('general');
  const tabs = ['general', 'support', 'email', 'notifications', 'security', 'roles'];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Portal configuration and preferences</p>
      </div>

      <div className="flex border-b border-[var(--border)] overflow-x-auto gap-0">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${
              tab === t ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === 'general' && <GeneralSettings />}
        {tab === 'support' && <SupportSettings />}
        {tab === 'email' && <EmailSettings />}
        {tab === 'notifications' && <NotifSettings />}
        {tab === 'security' && <SecuritySettings />}
        {tab === 'roles' && <RolesSettings />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">General</h2>
      <div>
        <label className="label">Portal Name</label>
        <input className="input" defaultValue="NOREN Support Portal" />
      </div>
      <div>
        <label className="label">Timezone</label>
        <select className="input text-xs"><option>Asia/Kolkata</option><option>UTC</option></select>
      </div>
      <div>
        <label className="label">Date Format</label>
        <select className="input text-xs"><option>DD MMM YYYY</option><option>MM/DD/YYYY</option></select>
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => toast.success('Settings saved')}><Save size={12} /> Save</button>
    </div>
  );
}

function SupportSettings() {
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Support Configuration</h2>
      <div className="p-3 rounded-md text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
        Ticket categories, SLA rules, and automation rules are configured in their dedicated sections under Administration.
      </div>
      <div>
        <label className="label">Default Priority</label>
        <select className="input text-xs"><option>normal</option><option>high</option><option>low</option></select>
      </div>
      <div>
        <label className="label">Auto-assign tickets</label>
        <div className="flex items-center gap-2 mt-1">
          <input type="checkbox" id="auto-assign" className="rounded" />
          <label htmlFor="auto-assign" className="text-xs">Enable round-robin auto-assignment</label>
        </div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => toast.success('Settings saved')}><Save size={12} /> Save</button>
    </div>
  );
}

function EmailSettings() {
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Email Configuration</h2>
      <div className="p-3 rounded-md text-xs border border-yellow-200 bg-yellow-50 text-yellow-800">
        Email settings are managed via environment variables in the backend (<code>RESEND_API_KEY</code>, <code>EMAIL_FROM</code>).
        Templates can be managed in the Email Templates section.
      </div>
      <div>
        <label className="label">Support Email (display)</label>
        <input className="input" defaultValue="support@norenfashion.shop" />
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>This is the email shown to customers. Actual sending is via Resend.</p>
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => toast.success('Settings saved')}><Save size={12} /> Save</button>
    </div>
  );
}

function NotifSettings() {
  const items = ['Ticket assigned to me', 'Ticket escalated', 'New customer reply', 'SLA approaching breach', 'SLA breached', 'Critical incident created', 'Internal mention'];
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Notification Preferences</h2>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
            <span className="text-xs">{item}</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => toast.success('Settings saved')}><Save size={12} /> Save</button>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">Security</h2>
      <div>
        <label className="label">Session Duration</label>
        <select className="input text-xs"><option>7 days</option><option>1 day</option><option>8 hours</option></select>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Matches the JWT expiry configured in the backend.</p>
      </div>
      <div>
        <label className="label">IP Address Visibility</label>
        <select className="input text-xs"><option>Super Admin only</option><option>Admin+</option></select>
      </div>
      <div className="p-3 rounded-md text-xs border border-blue-200 bg-blue-50 text-blue-800">
        All security-sensitive settings (JWT secret, DB credentials, API keys) are managed via backend environment variables and are never exposed in this portal.
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => toast.success('Settings saved')}><Save size={12} /> Save</button>
    </div>
  );
}

function RolesSettings() {
  const roles = [
    { role: 'super_admin', desc: 'Full access to all features. Cannot be restricted.' },
    { role: 'admin', desc: 'Full operational access. Cannot modify critical infrastructure.' },
    { role: 'business_owner', desc: 'Business-scoped admin access.' },
    { role: 'store_admin', desc: 'Store-scoped management access.' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Portal Roles</h2>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Role permissions are managed in the main NOREN backend via <code className="font-mono">src_permissions</code> and <code className="font-mono">src_role_permissions</code> tables.
        The following roles have access to this support portal:
      </p>
      <div className="space-y-2">
        {roles.map(r => (
          <div key={r.role} className="flex items-start gap-3 p-3 rounded-md" style={{ background: 'var(--surface-2)' }}>
            <div className="badge bg-blue-100 text-blue-800 capitalize flex-shrink-0">{r.role.replace('_', ' ')}</div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

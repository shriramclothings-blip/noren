import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Mail, Copy, Eye } from 'lucide-react';
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '../../api/support';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { timeAgo } from '../../lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = ['general', 'orders', 'payments', 'returns', 'account', 'technical', 'seller', 'influencer'];

const ALL_VARIABLES = [
  '{{customer_name}}', '{{order_id}}', '{{ticket_id}}', '{{agent_name}}',
  '{{tracking_number}}', '{{refund_amount}}', '{{product_name}}',
  '{{store_name}}', '{{support_email}}', '{{resolution_date}}',
];

const DEFAULTS = [
  {
    name: 'Order Issue Response',
    subject: 'Update on your order {{order_id}} – NOREN Support',
    category: 'orders',
    variables: ['{{customer_name}}', '{{order_id}}', '{{agent_name}}'],
    body: `Hi {{customer_name}},

Thank you for contacting NOREN Support regarding your order {{order_id}}.

We have reviewed your query and our team is actively working on resolving this for you. We will provide a full update within 24 hours.

If you have any additional information that may help us resolve this faster, please reply to this email.

Warm regards,
{{agent_name}}
NOREN Customer Support`,
  },
  {
    name: 'Refund Confirmation',
    subject: 'Refund Processed for Order {{order_id}} – NOREN',
    category: 'payments',
    variables: ['{{customer_name}}', '{{order_id}}', '{{refund_amount}}', '{{agent_name}}'],
    body: `Hi {{customer_name}},

We are pleased to inform you that a refund of {{refund_amount}} has been processed for your order {{order_id}}.

The amount should reflect in your original payment method within 5–7 business days, depending on your bank.

Thank you for your patience.

Warm regards,
{{agent_name}}
NOREN Customer Support`,
  },
  {
    name: 'Delivery Delay Notice',
    subject: 'Important Update on Your NOREN Delivery – Order {{order_id}}',
    category: 'orders',
    variables: ['{{customer_name}}', '{{order_id}}', '{{tracking_number}}', '{{agent_name}}'],
    body: `Hi {{customer_name}},

We wanted to let you know that your order {{order_id}} is experiencing a slight delay in delivery.

Tracking Number: {{tracking_number}}

We sincerely apologize for the inconvenience and are working with our delivery partner to expedite your shipment.

Thank you for your understanding.

Warm regards,
{{agent_name}}
NOREN Customer Support`,
  },
  {
    name: 'Ticket Resolved',
    subject: 'Your Support Ticket {{ticket_id}} Has Been Resolved – NOREN',
    category: 'general',
    variables: ['{{customer_name}}', '{{ticket_id}}', '{{agent_name}}'],
    body: `Hi {{customer_name}},

We are happy to inform you that your support ticket {{ticket_id}} has been resolved.

If you feel the issue has not been fully addressed or if you have any further questions, please reply to this email and we will be happy to assist.

Thank you for choosing NOREN.

Warm regards,
{{agent_name}}
NOREN Customer Support`,
  },
  {
    name: 'Account Issue Resolution',
    subject: 'Your Account Issue Has Been Resolved – NOREN',
    category: 'account',
    variables: ['{{customer_name}}', '{{agent_name}}'],
    body: `Hi {{customer_name}},

We have successfully resolved the account issue you reported. Your account is now fully functional.

If you experience any further difficulties, please do not hesitate to contact us.

Warm regards,
{{agent_name}}
NOREN Customer Support`,
  },
];

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', body: '', category: 'general', variables: [] });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmailTemplates();
      setTemplates(res.data.templates || []);
    } catch { toast.error('Failed to load templates'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', subject: '', body: '', category: 'general', variables: [] });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditItem(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category || 'general', variables: t.variables || [] });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error('Name, subject and body are required'); return;
    }
    setSaving(true);
    try {
      // Auto-detect variables from body
      const detected = ALL_VARIABLES.filter(v => form.body.includes(v) || form.subject.includes(v));
      const data = { ...form, variables: detected };
      if (editItem) {
        await updateEmailTemplate(editItem.id, data);
        toast.success('Template updated');
      } else {
        await createEmailTemplate(data);
        toast.success('Template created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteEmailTemplate(deleteId);
      toast.success('Template deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const seedDefaults = async () => {
    try {
      for (const t of DEFAULTS) await createEmailTemplate(t);
      toast.success('Default templates added');
      load();
    } catch { toast.error('Failed to seed defaults'); }
  };

  const insertVariable = (v) => {
    set('body', form.body + v);
  };

  const filtered = templates.filter(t => {
    const m = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
    const c = !categoryFilter || t.category === categoryFilter;
    return m && c;
  });

  // Preview: replace variables with sample values
  const renderPreview = (text) => {
    return text
      .replace(/{{customer_name}}/g, 'Rahul Sharma')
      .replace(/{{order_id}}/g, 'SRC1A2B3C')
      .replace(/{{ticket_id}}/g, 'NO-A1B2C3')
      .replace(/{{agent_name}}/g, 'Support Team')
      .replace(/{{tracking_number}}/g, 'DLVY123456')
      .replace(/{{refund_amount}}/g, '₹1,499')
      .replace(/{{product_name}}/g, 'Classic Polo T-Shirt')
      .replace(/{{store_name}}/g, 'NOREN')
      .replace(/{{support_email}}/g, 'support@norenfashion.shop')
      .replace(/{{resolution_date}}/g, new Date().toLocaleDateString('en-IN'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Email Templates</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {templates.length} templates · Used when replying to tickets via email
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <button className="btn btn-outline btn-sm" onClick={seedDefaults}>Add Defaults</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={13} /> New Template
          </button>
        </div>
      </div>

      {/* Variables reference */}
      <div className="card p-3 text-xs" style={{ background: 'var(--surface-2)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Available variables: </span>
        {ALL_VARIABLES.map(v => (
          <code key={v} className="mx-1 px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--surface-3)' }}>{v}</code>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} className="input pl-8" />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <select className="input w-40 text-xs" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Mail}
            title="No email templates"
            description={search || categoryFilter ? 'No results match your filters.' : 'Create email templates for consistent customer communication.'}
            action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={12} /> Create template</button>}
          />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Variables</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="text-xs font-medium">{t.name}</td>
                  <td className="text-xs max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>{t.subject}</td>
                  <td><span className="badge bg-gray-100 text-gray-700 capitalize">{t.category || 'general'}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(t.variables || []).slice(0, 3).map(v => (
                        <code key={v} className="text-[10px] px-1 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>{v}</code>
                      ))}
                      {(t.variables || []).length > 3 && (
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{t.variables.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.updated_at || t.created_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreviewItem(t)} title="Preview"><Eye size={12} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Edit"><Edit size={12} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setDeleteId(t.id)} title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Email Template' : 'New Email Template'}
        size="xl"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-3">
            <div>
              <label className="label">Template Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Order Issue Response" />
            </div>
            <div>
              <label className="label">Subject Line *</label>
              <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Update on your order {{order_id}}" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input text-xs" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Body *</label>
              <textarea
                className="input resize-none font-mono text-xs"
                rows={12}
                value={form.body}
                onChange={e => set('body', e.target.value)}
                placeholder="Write the email body here. Use variables like {{customer_name}} for personalisation…"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Insert Variable</label>
              <div className="space-y-1">
                {ALL_VARIABLES.map(v => (
                  <button
                    key={v}
                    className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:opacity-80 transition-opacity font-mono"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
                    onClick={() => insertVariable(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      {previewItem && (
        <Modal
          open={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={`Preview: ${previewItem.name}`}
          size="lg"
          footer={<button className="btn btn-outline" onClick={() => setPreviewItem(null)}>Close</button>}
        >
          <div className="space-y-3">
            <div className="p-3 rounded" style={{ background: 'var(--surface-2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>SUBJECT</p>
              <p className="text-sm font-medium">{renderPreview(previewItem.subject)}</p>
            </div>
            <div className="p-4 rounded border border-[var(--border)] text-sm whitespace-pre-wrap leading-relaxed">
              {renderPreview(previewItem.body)}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Preview uses sample values. Actual values are filled when sending.
            </p>
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        description="This template will be permanently deleted."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, FileText, Copy } from 'lucide-react';
import { getQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply } from '../../api/support';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { debounce, timeAgo } from '../../lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = ['general', 'orders', 'payments', 'account', 'returns', 'technical', 'seller', 'influencer'];

const DEFAULT_REPLIES = [
  { title: 'Order Investigation Started', category: 'orders', body: 'Hi {{customer_name}},\n\nThank you for reaching out. We have started investigating your order {{order_id}} and will update you within 24 hours.\n\nBest regards,\n{{agent_name}}\nNOREN Support' },
  { title: 'Payment Received - Order Processing', category: 'payments', body: 'Hi {{customer_name}},\n\nWe can confirm your payment has been received and your order {{order_id}} is now being processed.\n\nBest regards,\n{{agent_name}}\nNOREN Support' },
  { title: 'Refund Initiated', category: 'payments', body: 'Hi {{customer_name}},\n\nYour refund for order {{order_id}} has been initiated and should reflect in your account within 5-7 business days.\n\nBest regards,\n{{agent_name}}\nNOREN Support' },
  { title: 'Delivery Delay Apology', category: 'orders', body: 'Hi {{customer_name}},\n\nWe sincerely apologize for the delay in delivering your order {{order_id}}. Your order is currently in transit and we expect it to arrive shortly.\n\nWe appreciate your patience.\n\nBest regards,\n{{agent_name}}\nNOREN Support' },
  { title: 'Account Verification Required', category: 'account', body: 'Hi {{customer_name}},\n\nTo resolve your account issue, we need to verify your identity. Please reply with your registered email and phone number.\n\nBest regards,\n{{agent_name}}\nNOREN Support' },
  { title: 'Technical Issue Acknowledged', category: 'technical', body: 'Hi {{customer_name}},\n\nThank you for reporting this technical issue. Our engineering team has been notified and is investigating. We will update you as soon as it is resolved.\n\nRef: {{ticket_id}}\n\nBest regards,\n{{agent_name}}\nNOREN Support' },
];

export default function QuickReplies() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'general' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQuickReplies();
      setReplies(res.data.replies || []);
    } catch {
      toast.error('Failed to load quick replies');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', body: '', category: 'general' });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditItem(r);
    setForm({ title: r.title, body: r.body, category: r.category || 'general' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await updateQuickReply(editItem.id, form);
        toast.success('Quick reply updated');
      } else {
        await createQuickReply(form);
        toast.success('Quick reply created');
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
      await deleteQuickReply(deleteId);
      toast.success('Deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const seedDefaults = async () => {
    try {
      for (const r of DEFAULT_REPLIES) await createQuickReply(r);
      toast.success('Default quick replies added');
      load();
    } catch { toast.error('Failed to seed defaults'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'));
  };

  const filtered = replies.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.body.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Quick Replies</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {replies.length} saved responses · Use in ticket conversations
          </p>
        </div>
        <div className="flex gap-2">
          {replies.length === 0 && (
            <button className="btn btn-outline btn-sm" onClick={seedDefaults}>Add Defaults</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={13} /> New Quick Reply
          </button>
        </div>
      </div>

      {/* Variables reference */}
      <div className="card p-3 text-xs" style={{ background: 'var(--surface-2)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Available variables: </span>
        {['{{customer_name}}', '{{order_id}}', '{{ticket_id}}', '{{agent_name}}', '{{tracking_number}}', '{{refund_amount}}'].map(v => (
          <code key={v} className="mx-1 px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--surface-3)' }}>{v}</code>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search quick replies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-8"
          />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <select className="input w-40 text-xs" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No quick replies"
            description={search || categoryFilter ? 'No results match your filters.' : 'Create saved responses to speed up ticket replies.'}
            action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={12} /> Create first quick reply</button>}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{r.title}</h3>
                    <span className="badge bg-gray-100 text-gray-700 capitalize flex-shrink-0">{r.category || 'general'}</span>
                  </div>
                  <p className="text-xs leading-relaxed line-clamp-2 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {r.body}
                  </p>
                  <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    Updated {timeAgo(r.updated_at || r.created_at)}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyToClipboard(r.body)}
                    title="Copy to clipboard"
                  >
                    <Copy size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} title="Edit">
                    <Edit size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setDeleteId(r.id)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Quick Reply' : 'New Quick Reply'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Order Investigation Started" />
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
              rows={8}
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder="Use {{customer_name}}, {{order_id}}, {{ticket_id}}, {{agent_name}} as variables…"
            />
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Variables like {'{{customer_name}}'} are replaced automatically when inserting into a ticket.
          </p>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Quick Reply"
        description="This quick reply will be permanently deleted."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

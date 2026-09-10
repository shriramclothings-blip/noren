import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Zap, Trash2, Edit, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule } from '../../api/support';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/Spinner';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { timeAgo } from '../../lib/utils';
import toast from 'react-hot-toast';

const TRIGGER_OPTIONS = [
  { value: 'ticket_created', label: 'Ticket is created' },
  { value: 'ticket_updated', label: 'Ticket is updated' },
  { value: 'customer_replied', label: 'Customer replies' },
  { value: 'ticket_inactive', label: 'Ticket inactive for X hours' },
  { value: 'sla_approaching', label: 'SLA is approaching breach' },
  { value: 'sla_breached', label: 'SLA is breached' },
  { value: 'priority_critical', label: 'Priority set to Critical' },
];

const CONDITION_FIELDS = [
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'source', label: 'Source' },
];

const CONDITION_OPERATORS = ['equals', 'not_equals', 'contains'];

const CONDITION_VALUES = {
  category: ['order', 'payment', 'account', 'return', 'technical', 'seller', 'influencer'],
  priority: ['low', 'normal', 'high', 'urgent', 'critical'],
  status: ['new', 'open', 'in_progress', 'waiting_customer', 'escalated'],
  source: ['portal', 'email', 'web'],
};

const ACTION_OPTIONS = [
  { value: 'assign_team', label: 'Assign to team' },
  { value: 'set_priority', label: 'Set priority' },
  { value: 'set_status', label: 'Set status' },
  { value: 'send_email', label: 'Send email to customer' },
  { value: 'notify_agent', label: 'Notify assigned agent' },
  { value: 'notify_admin', label: 'Notify admin' },
  { value: 'escalate', label: 'Escalate ticket' },
  { value: 'add_tag', label: 'Add tag' },
];

const ACTION_VALUES = {
  set_priority: ['low', 'normal', 'high', 'urgent', 'critical'],
  set_status: ['open', 'in_progress', 'waiting_customer', 'waiting_internal', 'escalated'],
};

const DEFAULTS = [
  {
    name: 'Auto-assign Payment Issues',
    trigger: 'ticket_created',
    conditions: [{ field: 'category', operator: 'equals', value: 'payment' }],
    actions: [{ type: 'set_priority', value: 'high' }],
    is_active: true,
  },
  {
    name: 'Critical Alert to Admin',
    trigger: 'ticket_created',
    conditions: [{ field: 'priority', operator: 'equals', value: 'critical' }],
    actions: [{ type: 'notify_admin', value: '' }, { type: 'escalate', value: '' }],
    is_active: true,
  },
  {
    name: 'Reopen on Customer Reply',
    trigger: 'customer_replied',
    conditions: [{ field: 'status', operator: 'equals', value: 'waiting_customer' }],
    actions: [{ type: 'set_status', value: 'open' }],
    is_active: true,
  },
  {
    name: 'SLA Breach Notification',
    trigger: 'sla_breached',
    conditions: [],
    actions: [{ type: 'notify_agent', value: '' }, { type: 'notify_admin', value: '' }],
    is_active: true,
  },
];

const emptyForm = () => ({
  name: '',
  trigger: 'ticket_created',
  conditions: [{ field: 'category', operator: 'equals', value: 'order' }],
  actions: [{ type: 'set_priority', value: 'high' }],
  is_active: true,
  inactive_hours: 24,
});

export default function AutomationRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAutomationRules();
      setRules(res.data.rules || []);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditItem(r);
    setForm({
      name: r.name,
      trigger: r.trigger,
      conditions: r.conditions || [],
      actions: r.actions || [],
      is_active: r.is_active !== false,
      inactive_hours: r.inactive_hours || 24,
    });
    setShowModal(true);
  };

  const addCondition = () => setForm(p => ({ ...p, conditions: [...p.conditions, { field: 'category', operator: 'equals', value: 'order' }] }));
  const removeCondition = (i) => setForm(p => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }));
  const updateCondition = (i, k, v) => setForm(p => {
    const c = [...p.conditions];
    c[i] = { ...c[i], [k]: v };
    if (k === 'field') c[i].value = (CONDITION_VALUES[v] || [])[0] || '';
    return { ...p, conditions: c };
  });

  const addAction = () => setForm(p => ({ ...p, actions: [...p.actions, { type: 'notify_admin', value: '' }] }));
  const removeAction = (i) => setForm(p => ({ ...p, actions: p.actions.filter((_, idx) => idx !== i) }));
  const updateAction = (i, k, v) => setForm(p => {
    const a = [...p.actions];
    a[i] = { ...a[i], [k]: v };
    return { ...p, actions: a };
  });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Rule name is required'); return; }
    if (!form.actions.length) { toast.error('At least one action is required'); return; }
    setSaving(true);
    try {
      const data = { ...form, conditions: form.conditions, actions: form.actions };
      if (editItem) {
        await updateAutomationRule(editItem.id, data);
        toast.success('Rule updated');
      } else {
        await createAutomationRule(data);
        toast.success('Rule created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const toggleActive = async (rule) => {
    try {
      await updateAutomationRule(rule.id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? 'Rule disabled' : 'Rule enabled');
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async () => {
    try {
      await deleteAutomationRule(deleteId);
      toast.success('Rule deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const seedDefaults = async () => {
    try {
      for (const r of DEFAULTS) await createAutomationRule(r);
      toast.success('Default rules added');
      load();
    } catch { toast.error('Failed to seed defaults'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Automation Rules</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {rules.length} rules · {rules.filter(r => r.is_active !== false).length} active
          </p>
        </div>
        <div className="flex gap-2">
          {rules.length === 0 && (
            <button className="btn btn-outline btn-sm" onClick={seedDefaults}>Add Defaults</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={13} /> New Rule
          </button>
        </div>
      </div>

      <div className="p-3 rounded-md text-xs border flex items-start gap-2" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>
          Rules run server-side when tickets are created or updated. Conditions use AND logic — all conditions must match.
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Zap}
            title="No automation rules"
            description="Create rules to automatically assign, prioritize, and respond to tickets."
            action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={12} /> Create rule</button>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`card p-4 ${rule.is_active === false ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} style={{ color: rule.is_active !== false ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <h3 className="text-sm font-semibold">{rule.name}</h3>
                    <span className={`badge text-[10px] ${rule.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {rule.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Trigger */}
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-muted)' }}>WHEN</span>
                      <span className="px-2 py-0.5 rounded" style={{ background: 'var(--surface-3)' }}>
                        {TRIGGER_OPTIONS.find(t => t.value === rule.trigger)?.label || rule.trigger}
                      </span>
                    </div>

                    {/* Conditions */}
                    {(rule.conditions || []).length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" style={{ color: 'var(--text-muted)' }}>IF</span>
                        {rule.conditions.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded border border-[var(--border)] text-xs">
                            {c.field} {c.operator} <strong>{c.value}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" style={{ color: 'var(--text-muted)' }}>THEN</span>
                      {(rule.actions || []).map((a, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--text-primary)' }}>
                          {ACTION_OPTIONS.find(o => o.value === a.type)?.label || a.type}
                          {a.value ? `: ${a.value}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    className="btn btn-ghost btn-sm p-1.5"
                    onClick={() => toggleActive(rule)}
                    title={rule.is_active !== false ? 'Disable' : 'Enable'}
                  >
                    {rule.is_active !== false
                      ? <ToggleRight size={16} style={{ color: '#16a34a' }} />
                      : <ToggleLeft size={16} style={{ color: 'var(--text-muted)' }} />
                    }
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(rule)}><Edit size={12} /></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => setDeleteId(rule.id)}><Trash2 size={12} /></button>
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
        title={editItem ? 'Edit Automation Rule' : 'New Automation Rule'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Rule Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Auto-escalate Critical Tickets" />
          </div>

          <div>
            <label className="label">Trigger</label>
            <select className="input text-xs" value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))}>
              {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {form.trigger === 'ticket_inactive' && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs" style={{ color: 'var(--text-muted)' }}>After</label>
                <input type="number" className="input w-20 text-xs" value={form.inactive_hours} onChange={e => setForm(p => ({ ...p, inactive_hours: e.target.value }))} min={1} />
                <label className="text-xs" style={{ color: 'var(--text-muted)' }}>hours of inactivity</label>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Conditions (optional — all must match)</label>
              <button className="btn btn-ghost btn-sm text-xs" onClick={addCondition}><Plus size={11} /> Add</button>
            </div>
            {form.conditions.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No conditions — rule applies to all matching triggers.</p>
            )}
            {form.conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select className="input text-xs flex-1" value={c.field} onChange={e => updateCondition(i, 'field', e.target.value)}>
                  {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select className="input text-xs w-28" value={c.operator} onChange={e => updateCondition(i, 'operator', e.target.value)}>
                  {CONDITION_OPERATORS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                </select>
                <select className="input text-xs flex-1" value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)}>
                  {(CONDITION_VALUES[c.field] || []).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm p-1" onClick={() => removeCondition(i)}><Trash2 size={11} style={{ color: '#dc2626' }} /></button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Actions *</label>
              <button className="btn btn-ghost btn-sm text-xs" onClick={addAction}><Plus size={11} /> Add</button>
            </div>
            {form.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select className="input text-xs flex-1" value={a.type} onChange={e => updateAction(i, 'type', e.target.value)}>
                  {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {ACTION_VALUES[a.type] ? (
                  <select className="input text-xs flex-1" value={a.value} onChange={e => updateAction(i, 'value', e.target.value)}>
                    {ACTION_VALUES[a.type].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <input className="input text-xs flex-1" placeholder="value (optional)" value={a.value} onChange={e => updateAction(i, 'value', e.target.value)} />
                )}
                <button className="btn btn-ghost btn-sm p-1" onClick={() => removeAction(i)}><Trash2 size={11} style={{ color: '#dc2626' }} /></button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="rule-active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
            <label htmlFor="rule-active" className="text-xs">Rule is active</label>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Rule"
        description="This automation rule will be permanently deleted."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

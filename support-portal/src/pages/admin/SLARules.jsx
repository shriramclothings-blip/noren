import React, { useState, useEffect } from 'react';
import { Plus, Zap, Edit, Trash2, Save, X } from 'lucide-react';
import { getSLARules, createSLARule, updateSLARule, deleteSLARule } from '../../api/support';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const DEFAULT_RULES = [
  { priority: 'critical', first_response_hours: 0.25, resolution_hours: 2 },
  { priority: 'urgent', first_response_hours: 0.5, resolution_hours: 4 },
  { priority: 'high', first_response_hours: 2, resolution_hours: 8 },
  { priority: 'normal', first_response_hours: 8, resolution_hours: 24 },
  { priority: 'low', first_response_hours: 24, resolution_hours: 72 },
];

export default function SLARules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSLARules();
      setRules(res.data.rules || res.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (rule) => {
    try {
      if (rule.id) {
        await updateSLARule(rule.id, rule);
        toast.success('SLA rule updated');
      } else {
        await createSLARule(rule);
        toast.success('SLA rule created');
      }
      setEditing(null);
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSLARule(deleteId);
      toast.success('SLA rule deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">SLA Rules</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure response and resolution time targets by priority</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="card">
          <EmptyState icon={Zap} title="No SLA rules" description="Add rules to track response and resolution times." action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={12} /> Add default rules</button>
          } />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>First Response</th>
                <th>Resolution</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id}>
                  <td><span className={`badge priority-${r.priority} capitalize`}>{r.priority}</span></td>
                  <td>
                    {editing?.id === r.id ? (
                      <input type="number" step="0.25" className="input w-24 text-xs py-1" value={editing.first_response_hours}
                        onChange={e => setEditing(p => ({ ...p, first_response_hours: e.target.value }))} />
                    ) : (
                      <span className="text-xs">{r.first_response_hours}h</span>
                    )}
                  </td>
                  <td>
                    {editing?.id === r.id ? (
                      <input type="number" step="0.5" className="input w-24 text-xs py-1" value={editing.resolution_hours}
                        onChange={e => setEditing(p => ({ ...p, resolution_hours: e.target.value }))} />
                    ) : (
                      <span className="text-xs">{r.resolution_hours}h</span>
                    )}
                  </td>
                  <td>{r.is_active !== false ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-gray-100 text-gray-700">Inactive</span>}</td>
                  <td>
                    <div className="flex gap-1">
                      {editing?.id === r.id ? (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSave(editing)}><Save size={11} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><X size={11} /></button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...r })}><Edit size={12} /></button>
                          <button className="btn btn-ghost btn-sm text-red-600" onClick={() => setDeleteId(r.id)}><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold">New SLA Rule</h3>
          <SLAForm onSave={handleSave} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete SLA Rule"
        description="This will remove the SLA rule. Existing tickets won't be affected."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function SLAForm({ rule = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    priority: rule.priority || 'normal',
    first_response_hours: rule.first_response_hours || 8,
    resolution_hours: rule.resolution_hours || 24,
    ...rule,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div>
        <label className="label">Priority</label>
        <select className="input text-xs" value={form.priority} onChange={e => set('priority', e.target.value)}>
          {['critical', 'urgent', 'high', 'normal', 'low'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="label">First Response (hours)</label>
        <input type="number" step="0.25" className="input w-28 text-xs" value={form.first_response_hours} onChange={e => set('first_response_hours', e.target.value)} />
      </div>
      <div>
        <label className="label">Resolution (hours)</label>
        <input type="number" step="0.5" className="input w-28 text-xs" value={form.resolution_hours} onChange={e => set('resolution_hours', e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm" onClick={() => onSave(form)}>Save</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

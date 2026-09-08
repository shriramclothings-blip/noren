import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Shield, RefreshCw } from 'lucide-react';
import { getIncidents, createIncident } from '../../api/support';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime, timeAgo } from '../../lib/utils';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const SERVICES = ['website', 'authentication', 'checkout', 'payment', 'orders', 'email', 'shipping', 'seller_system', 'influencer_system', 'api', 'database', 'analytics'];

export default function IncidentList() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', service: 'website', severity: 'medium', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIncidents();
      setIncidents(res.data.incidents || []);
    } catch {}
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createIncident(form);
      toast.success('Incident created');
      setShowCreate(false);
      setForm({ title: '', service: 'website', severity: 'medium', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setCreating(false);
  };

  const sevColor = (s) => ({
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  }[s] || 'bg-gray-100 text-gray-700');

  const statColor = (s) => ({
    open: 'bg-red-100 text-red-800',
    investigating: 'bg-yellow-100 text-yellow-800',
    monitoring: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
  }[s] || 'bg-gray-100 text-gray-700');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Technical Incidents</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{incidents.length} incidents</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Incident
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : incidents.length === 0 ? (
        <div className="card">
          <EmptyState icon={Shield} title="No incidents" description="No technical incidents recorded." action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={12} /> Create incident</button>
          } />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Service</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Started</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id}>
                  <td>
                    <Link to={`/incidents/${inc.id}`} className="text-xs font-mono hover:underline" style={{ color: 'var(--accent)' }}>
                      INC-{String(inc.id).padStart(4, '0')}
                    </Link>
                  </td>
                  <td className="text-xs">{inc.title}</td>
                  <td className="text-xs capitalize">{inc.service?.replace('_', ' ')}</td>
                  <td><span className={`badge capitalize ${sevColor(inc.severity)}`}>{inc.severity}</span></td>
                  <td><span className={`badge capitalize ${statColor(inc.status)}`}>{inc.status}</span></td>
                  <td className="text-xs">{timeAgo(inc.started_at || inc.created_at)}</td>
                  <td className="text-xs">{inc.resolved_at ? timeAgo(inc.resolved_at) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Incident"
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
            <button form="inc-form" type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? <><Spinner size="sm" /> Creating…</> : 'Create Incident'}
            </button>
          </>
        }
      >
        <form id="inc-form" onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Service</label>
              <select className="input text-xs" value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))}>
                {SERVICES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input text-xs" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </form>
      </Modal>
    </div>
  );
}

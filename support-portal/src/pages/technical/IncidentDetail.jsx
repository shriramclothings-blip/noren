import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save, CheckCircle } from 'lucide-react';
import { getIncident, updateIncident } from '../../api/support';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDateTime, timeAgo } from '../../lib/utils';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  monitoring: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
};

const SERVICES = ['website', 'authentication', 'checkout', 'payment', 'orders', 'email', 'shipping', 'seller_system', 'influencer_system', 'api', 'database', 'analytics'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['open', 'investigating', 'monitoring', 'resolved'];

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getIncident(id);
        const inc = res.data.incident || res.data;
        setIncident(inc);
        setForm({
          title: inc.title,
          description: inc.description || '',
          service: inc.service || 'website',
          severity: inc.severity || 'medium',
          status: inc.status || 'open',
        });
        // Parse timeline notes from description if stored as JSON
        try {
          const parsed = JSON.parse(inc.timeline || '[]');
          setNotes(Array.isArray(parsed) ? parsed : []);
        } catch { setNotes([]); }
      } catch { }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateIncident(id, form);
      setIncident(res.data.incident || res.data);
      setEditing(false);
      toast.success('Incident updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const note = { text: newNote, at: new Date().toISOString() };
    const updated = [...notes, note];
    try {
      await updateIncident(id, { timeline: JSON.stringify(updated) });
      setNotes(updated);
      setNewNote('');
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const resolve = async () => {
    setSaving(true);
    try {
      await updateIncident(id, { status: 'resolved' });
      setIncident(p => ({ ...p, status: 'resolved', resolved_at: new Date().toISOString() }));
      setForm(p => ({ ...p, status: 'resolved' }));
      toast.success('Incident resolved');
    } catch { toast.error('Failed'); }
    setSaving(false);
  };

  if (loading) return <PageLoader />;
  if (!incident) return <div className="p-4">Incident not found.</div>;

  const inc = incident;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/incidents" className="btn btn-ghost btn-sm p-1.5"><ArrowLeft size={15} /></Link>
          <div>
            <h1 className="text-base font-semibold">INC-{String(inc.id).padStart(4, '0')} — {inc.title}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Started {timeAgo(inc.started_at || inc.created_at)}
              {inc.resolved_at && ` · Resolved ${timeAgo(inc.resolved_at)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge capitalize ${SEVERITY_COLORS[inc.severity] || 'bg-gray-100 text-gray-700'}`}>{inc.severity}</span>
          <span className={`badge capitalize ${STATUS_COLORS[inc.status] || 'bg-gray-100 text-gray-700'}`}>{inc.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Details card */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Incident Details</h3>
              <button className="btn btn-ghost btn-sm text-xs" onClick={() => setEditing(e => !e)}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
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
                  <div>
                    <label className="label">Status</label>
                    <select className="input text-xs" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  <Save size={12} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{inc.description || 'No description provided.'}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-xs">
                  {[
                    ['Service', inc.service?.replace('_', ' ') || '—'],
                    ['Severity', inc.severity],
                    ['Status', inc.status],
                    ['Started', formatDateTime(inc.started_at || inc.created_at)],
                    ['Resolved', inc.resolved_at ? formatDateTime(inc.resolved_at) : '—'],
                    ['Reported by', inc.created_by_name || `User #${inc.created_by}` || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span className="capitalize font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeline / Notes */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Timeline & Notes</h3>

            <div className="space-y-3">
              {/* Created event */}
              <TimelineItem
                at={inc.started_at || inc.created_at}
                text={`Incident created: ${inc.title}`}
                type="system"
              />
              {notes.map((note, i) => (
                <TimelineItem key={i} at={note.at} text={note.text} type="note" />
              ))}
              {inc.resolved_at && (
                <TimelineItem at={inc.resolved_at} text="Incident resolved" type="resolved" />
              )}
            </div>

            {inc.status !== 'resolved' && (
              <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                <input
                  className="input flex-1 text-xs"
                  placeholder="Add a timeline note…"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                />
                <button className="btn btn-primary btn-sm" onClick={addNote} disabled={!newNote.trim()}>
                  <Plus size={12} /> Add Note
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Actions */}
          {inc.status !== 'resolved' && (
            <div className="card p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Actions</h3>
              <button className="btn btn-sm w-full justify-center" style={{ background: '#16a34a', color: 'white' }} onClick={resolve} disabled={saving}>
                <CheckCircle size={12} /> Mark Resolved
              </button>
              {['investigating', 'monitoring'].map(s => (
                <button
                  key={s}
                  className="btn btn-outline btn-sm w-full justify-center capitalize"
                  onClick={async () => {
                    try { await updateIncident(id, { status: s }); setIncident(p => ({ ...p, status: s })); toast.success(`Status → ${s}`); }
                    catch { toast.error('Failed'); }
                  }}
                >
                  Set: {s}
                </button>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="card p-4 text-xs space-y-2">
            <h3 className="font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Meta</h3>
            {[
              ['ID', `INC-${String(inc.id).padStart(4, '0')}`],
              ['Service', inc.service?.replace('_', ' ') || '—'],
              ['Severity', inc.severity],
              ['Duration', inc.resolved_at
                ? `${Math.round((new Date(inc.resolved_at) - new Date(inc.started_at || inc.created_at)) / 60000)}m`
                : `${Math.round((Date.now() - new Date(inc.started_at || inc.created_at)) / 60000)}m (ongoing)`
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span className="capitalize font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ at, text, type }) {
  const colors = { system: '#6b7280', note: 'var(--accent)', resolved: '#16a34a' };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: colors[type] || 'var(--text-muted)' }} />
        <div className="w-px flex-1 mt-1" style={{ background: 'var(--border)' }} />
      </div>
      <div className="pb-3 flex-1">
        <p className="text-xs">{text}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDateTime(at)}</p>
      </div>
    </div>
  );
}

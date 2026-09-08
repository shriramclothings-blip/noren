import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Send, Lock, User, Clock, Tag, AlertTriangle,
  ChevronDown, Paperclip, RefreshCw, CheckCircle, RotateCcw,
  TrendingUp, XCircle, UserCheck, Zap, Edit, Save, X
} from 'lucide-react';
import {
  getTicket, replyTicket, addInternalNote, assignTicket,
  escalateTicket, resolveTicket, reopenTicket, closeTicket,
  updateTicket, getTicketReplies, getAgents, getTeams,
} from '../../api/support';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { formatDateTime, timeAgo, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PRIORITIES = ['low', 'normal', 'high', 'urgent', 'critical'];
const STATUSES = ['new', 'open', 'in_progress', 'waiting_customer', 'waiting_internal', 'escalated', 'resolved', 'closed'];

function Message({ msg }) {
  const isNote = msg.type === 'internal_note';
  return (
    <div className={`flex gap-3 ${isNote ? 'opacity-90' : ''}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          background: isNote ? '#fef3c7' : msg.is_customer ? '#eff6ff' : 'var(--accent)',
          color: isNote ? '#92400e' : msg.is_customer ? '#1e40af' : 'var(--text-primary)',
        }}
      >
        {(msg.author_name || msg.name || 'A')[0]?.toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold">{msg.author_name || msg.name || 'Unknown'}</span>
          {isNote && (
            <span className="badge bg-yellow-100 text-yellow-800 text-[10px]">
              <Lock size={9} /> Internal Note
            </span>
          )}
          {msg.is_customer && <span className="badge bg-blue-100 text-blue-800 text-[10px]">Customer</span>}
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(msg.created_at)}</span>
        </div>
        <div
          className={`text-sm rounded-lg p-3 ${
            isNote
              ? 'border-l-2 border-yellow-400 bg-yellow-50'
              : msg.is_customer
              ? 'border border-[var(--border)]'
              : 'border border-[var(--border)]'
          }`}
          style={{
            background: isNote ? '#fefce8' : 'var(--surface)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.body || msg.message || ''}</div>
          {msg.attachment_url && (
            <a
              href={msg.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-2 text-xs hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              <Paperclip size={11} /> View attachment
            </a>
          )}
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {formatDateTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [mode, setMode] = useState('reply'); // reply | note
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editPriority, setEditPriority] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [editAssign, setEditAssign] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const bottomRef = useRef(null);

  const load = async () => {
    try {
      const [tRes, rRes] = await Promise.all([getTicket(id), getTicketReplies(id)]);
      setTicket(tRes.data.ticket || tRes.data);
      setReplies(rRes.data.replies || rRes.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { getAgents().then(r => setAgents(r.data.agents || r.data || [])).catch(() => {}); }, []);
  useEffect(() => { getTeams().then(r => setTeams(r.data.teams || r.data || [])).catch(() => {}); }, []);

  const sendReply = async () => {
    const body = mode === 'reply' ? replyBody : noteBody;
    if (!body.trim()) return;
    setSending(true);
    try {
      if (mode === 'reply') {
        await replyTicket(id, { body, send_email: true });
        setReplyBody('');
        toast.success('Reply sent');
      } else {
        await addInternalNote(id, { body });
        setNoteBody('');
        toast.success('Internal note added');
      }
      await load();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleAction = async (action, data = {}) => {
    try {
      if (action === 'resolve') await resolveTicket(id, data);
      if (action === 'close') await closeTicket(id, data);
      if (action === 'reopen') { await reopenTicket(id, data); }
      if (action === 'escalate') await escalateTicket(id, data);
      if (action === 'assign') await assignTicket(id, data);
      if (action === 'update') await updateTicket(id, data);
      toast.success('Ticket updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <PageLoader />;
  if (!ticket) return <div className="p-4">Ticket not found</div>;

  const t = ticket;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/tickets" className="btn btn-ghost btn-sm p-1.5">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">{t.subject}</h1>
              {t.priority === 'critical' && (
                <span className="badge bg-red-100 text-red-800 text-xs animate-pulse">🔴 CRITICAL</span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t.ticket_number || `#${t.id}`} · {t.category} · Created {timeAgo(t.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Messages */}
          <div className="card p-4 space-y-5">
            {replies.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
              </div>
            ) : (
              replies.map((msg, i) => <Message key={msg.id || i} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply composer */}
          {!['closed', 'resolved'].includes(t.status) && (
            <div className="card p-4 space-y-3">
              {/* Mode tabs */}
              <div className="flex gap-1 border-b border-[var(--border)] pb-2">
                <button
                  className={`btn btn-sm ${mode === 'reply' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMode('reply')}
                >
                  <Send size={12} /> Reply to Customer
                </button>
                <button
                  className={`btn btn-sm ${mode === 'note' ? 'btn-accent' : 'btn-ghost'}`}
                  onClick={() => setMode('note')}
                >
                  <Lock size={12} /> Internal Note
                </button>
              </div>

              {mode === 'note' && (
                <div className="text-xs p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                  ⚠️ Internal notes are <strong>never</strong> sent to customers.
                </div>
              )}

              <textarea
                className="input resize-none"
                rows={4}
                placeholder={mode === 'reply' ? 'Write a reply to the customer…' : 'Write an internal note…'}
                value={mode === 'reply' ? replyBody : noteBody}
                onChange={e => mode === 'reply' ? setReplyBody(e.target.value) : setNoteBody(e.target.value)}
                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendReply(); }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Ctrl+Enter to send</p>
                <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={sending}>
                  {sending ? 'Sending…' : mode === 'reply' ? 'Send Reply' : 'Add Note'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Actions */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {t.status !== 'resolved' && (
                <button className="btn btn-sm bg-green-600 text-white hover:bg-green-700" onClick={() => setConfirmResolve(true)}>
                  <CheckCircle size={12} /> Resolve
                </button>
              )}
              {['resolved', 'closed'].includes(t.status) && (
                <button className="btn btn-sm btn-outline" onClick={() => handleAction('reopen', { reason: 'Reopened by agent' })}>
                  <RotateCcw size={12} /> Reopen
                </button>
              )}
              {t.status !== 'closed' && (
                <button className="btn btn-sm btn-outline" onClick={() => setConfirmClose(true)}>
                  <XCircle size={12} /> Close
                </button>
              )}
              {t.status !== 'escalated' && (
                <button className="btn btn-sm btn-outline text-orange-600 border-orange-300" onClick={() => handleAction('escalate', { reason: 'Escalated by agent' })}>
                  <TrendingUp size={12} /> Escalate
                </button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Details</h3>

            {/* Priority */}
            <div>
              <label className="label">Priority</label>
              {editPriority ? (
                <div className="flex gap-1">
                  <select
                    className="input text-xs flex-1"
                    defaultValue={t.priority}
                    id="priority-select"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    handleAction('update', { priority: document.getElementById('priority-select').value });
                    setEditPriority(false);
                  }}><Save size={11} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditPriority(false)}><X size={11} /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={t.priority} />
                  <button className="btn btn-ghost btn-sm p-1" onClick={() => setEditPriority(true)}><Edit size={11} /></button>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="label">Status</label>
              {editStatus ? (
                <div className="flex gap-1">
                  <select className="input text-xs flex-1" defaultValue={t.status} id="status-select">
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    handleAction('update', { status: document.getElementById('status-select').value });
                    setEditStatus(false);
                  }}><Save size={11} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditStatus(false)}><X size={11} /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <StatusBadge status={t.status} />
                  <button className="btn btn-ghost btn-sm p-1" onClick={() => setEditStatus(true)}><Edit size={11} /></button>
                </div>
              )}
            </div>

            {/* Assignment */}
            <div>
              <label className="label">Assigned To</label>
              {editAssign ? (
                <div className="flex gap-1">
                  <select className="input text-xs flex-1" defaultValue={t.assigned_to || ''} id="agent-select">
                    <option value="">Unassigned</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    const val = document.getElementById('agent-select').value;
                    handleAction('assign', { agent_id: val || null });
                    setEditAssign(false);
                  }}><Save size={11} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditAssign(false)}><X size={11} /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs">{t.assigned_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</span>
                  <button className="btn btn-ghost btn-sm p-1" onClick={() => setEditAssign(true)}><Edit size={11} /></button>
                </div>
              )}
            </div>

            {/* SLA */}
            {t.sla_due_at && (
              <div>
                <label className="label">SLA Deadline</label>
                <p className={`text-xs ${new Date(t.sla_due_at) < new Date() ? 'text-red-600 font-semibold' : ''}`}>
                  {formatDateTime(t.sla_due_at)}
                </p>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="label">Category</label>
              <p className="text-xs capitalize">{t.category || '—'}</p>
            </div>

            {/* Tags */}
            {t.tags?.length > 0 && (
              <div>
                <label className="label">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {t.tags.map(tag => <span key={tag} className="badge bg-gray-100 text-gray-700">{tag}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Customer info */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Customer</h3>
            <div className="space-y-2 text-xs">
              <p className="font-medium">{t.name || t.customer_name || '—'}</p>
              <p style={{ color: 'var(--text-muted)' }}>
                <a href={`mailto:${t.email}`} className="hover:underline">{t.email}</a>
              </p>
              {t.phone && <p style={{ color: 'var(--text-muted)' }}>{t.phone}</p>}
              {t.user_id && (
                <Link to={`/customers/${t.user_id}`} className="btn btn-outline btn-sm w-full justify-center mt-2">
                  <User size={11} /> View Customer Profile
                </Link>
              )}
            </div>
          </div>

          {/* Linked order */}
          {t.order_ref && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Linked Order</h3>
              <Link to={`/orders/${t.order_ref}`} className="text-xs font-mono hover:underline" style={{ color: 'var(--accent)' }}>
                {t.order_ref}
              </Link>
            </div>
          )}

          {/* Ticket meta */}
          <div className="card p-4 text-xs space-y-1.5" style={{ color: 'var(--text-muted)' }}>
            <div className="flex justify-between">
              <span>Created</span>
              <span>{formatDateTime(t.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span>
              <span>{formatDateTime(t.updated_at)}</span>
            </div>
            {t.source && (
              <div className="flex justify-between">
                <span>Source</span>
                <span className="capitalize">{t.source}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm resolve */}
      <ConfirmModal
        open={confirmResolve}
        onClose={() => setConfirmResolve(false)}
        onConfirm={() => { handleAction('resolve', {}); setConfirmResolve(false); }}
        title="Resolve Ticket"
        description="Mark this ticket as resolved? The customer will be notified."
        confirmLabel="Resolve"
      />

      {/* Confirm close */}
      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => { handleAction('close', {}); setConfirmClose(false); }}
        title="Close Ticket"
        description="Close this ticket? It can be reopened if needed."
        confirmLabel="Close Ticket"
        danger
      />
    </div>
  );
}

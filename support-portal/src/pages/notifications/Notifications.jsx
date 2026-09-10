import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Check, CheckCheck, Ticket, AlertTriangle, Zap, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { EmptyState } from '../../components/ui/EmptyState';
import { timeAgo } from '../../lib/utils';
import toast from 'react-hot-toast';

const NOTIF_ICONS = {
  ticket_assigned: <Ticket size={14} style={{ color: '#7c3aed' }} />,
  ticket_escalated: <AlertTriangle size={14} style={{ color: '#c2410c' }} />,
  sla_breach: <Zap size={14} style={{ color: '#dc2626' }} />,
  sla_risk: <Zap size={14} style={{ color: '#d97706' }} />,
  new_reply: <Ticket size={14} style={{ color: '#2563eb' }} />,
  critical: <AlertTriangle size={14} style={{ color: '#dc2626' }} />,
  default: <Bell size={14} style={{ color: 'var(--text-muted)' }} />,
};

function getIcon(type = '') {
  return NOTIF_ICONS[type] || NOTIF_ICONS.default;
}

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Use existing backend notifications endpoint
      const res = await client.get('/api/notifications', { params: { limit: 100 } });
      const data = res.data;
      // Handle both array and { notifications: [] } shapes
      setNotifs(Array.isArray(data) ? data : (data.notifications || data.data || []));
    } catch {
      setNotifs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await client.patch(`/api/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await client.post('/api/notifications/mark-all-read');
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark as read'); }
  };

  const deleteNotif = async (id) => {
    try {
      await client.delete(`/api/notifications/${id}`);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch { }
  };

  const displayed = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs;
  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Notifications</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={13} />
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllRead}>
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-[var(--border)]">
        {[['all', 'All'], ['unread', 'Unread']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === val
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
            {val === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card p-4 flex gap-3">
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BellOff}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            description={filter === 'unread' ? 'You\'re all caught up.' : 'Notifications for ticket assignments, SLA alerts, and more will appear here.'}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayed.map(n => (
            <div
              key={n.id}
              className={`card p-3.5 flex items-start gap-3 transition-colors ${!n.is_read ? 'border-l-2' : ''}`}
              style={!n.is_read ? { borderLeftColor: 'var(--accent)' } : {}}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-3)' }}>
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? 'font-medium' : ''}`} style={{ color: 'var(--text-primary)' }}>
                  {n.message}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {timeAgo(n.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.is_read && (
                  <button
                    className="btn btn-ghost btn-sm p-1"
                    onClick={() => markRead(n.id)}
                    title="Mark as read"
                  >
                    <Check size={13} />
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm p-1"
                  onClick={() => deleteNotif(n.id)}
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

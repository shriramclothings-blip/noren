import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Bell, Shield, Heart, MessageCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsView() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/notifications');
      setNotifications(res.data.notifications || []);
      await api.put('/social/notifications/read');
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'security':
        return <Shield className="w-5 h-5 text-rose-400" />;
      case 'like':
        return <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-white" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-white" />;
      default:
        return <Bell className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Notifications</h2>
          <p className="text-xs text-neutral-400">Activity, security alerts, and social interactions.</p>
        </div>
        <button
          onClick={fetchNotifications}
          className="p-2.5 rounded-full btn-liquid-ghost text-white text-xs font-semibold"
          title="Refresh"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-neutral-400 font-medium">Loading notifications...</div>
      ) : !notifications.length ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-2">
          <Bell className="w-10 h-10 text-white/50 mx-auto" />
          <h4 className="text-lg font-bold text-white">All Caught Up</h4>
          <p className="text-xs text-neutral-400">No new notifications at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass-card rounded-2xl p-4 border flex items-center gap-4 transition-all ${
                n.is_read ? 'border-white/10 opacity-80' : 'border-white/20 bg-neutral-900/80 shadow-lg'
              }`}
            >
              <div className="p-3 rounded-full bg-black/60 border border-white/10 shrink-0">
                {getNotifIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

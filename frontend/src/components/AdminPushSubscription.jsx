/**
 * AdminPushSubscription
 * Shown inside the ERP admin dashboard header/sidebar.
 * Prompts super_admin / admin to enable browser push so they receive
 * real-time alerts for: new orders, new users, support tickets, low stock.
 */
import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['super_admin', 'admin', 'business_owner', 'store_admin'];

export default function AdminPushSubscription() {
  const { user } = useAuth();
  const { supported, permission, subscribed, loading, error, enableNotifications, disableNotifications } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('admin_push_dismissed') === '1');
  const [showBanner, setShowBanner] = useState(false);

  const isAdminRole = ADMIN_ROLES.includes(user?.role);

  useEffect(() => {
    if (!isAdminRole || supported === null || dismissed || subscribed || permission === 'denied') return;
    // Show banner 2 s after load
    const t = setTimeout(() => setShowBanner(true), 2000);
    return () => clearTimeout(t);
  }, [isAdminRole, supported, dismissed, subscribed, permission]);

  // Auto-hide 4 s after successful subscription
  useEffect(() => {
    if (subscribed && showBanner) {
      const t = setTimeout(() => setShowBanner(false), 4000);
      return () => clearTimeout(t);
    }
  }, [subscribed, showBanner]);

  const dismiss = () => {
    sessionStorage.setItem('admin_push_dismissed', '1');
    setDismissed(true);
    setShowBanner(false);
  };

  // Always show a compact status pill in the top bar (even when banner is gone)
  if (!isAdminRole || supported === false) return null;

  // ── Compact pill (top-bar) ──────────────────────────────────────────────────
  const Pill = () => {
    if (subscribed) {
      return (
        <button
          onClick={disableNotifications}
          title="Admin push notifications ON — click to disable"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: 'none', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          <CheckCircle size={11} /> Push ON
        </button>
      );
    }
    if (permission === 'denied') {
      return (
        <span title="Notifications blocked in browser settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700 }}>
          <AlertTriangle size={11} /> Push Blocked
        </span>
      );
    }
    return (
      <button
        onClick={() => setShowBanner(true)}
        title="Enable admin push notifications"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
      >
        <BellOff size={11} /> Enable Push
      </button>
    );
  };

  return (
    <>
      {/* Pill always visible in header */}
      <Pill />

      {/* Full banner */}
      {showBanner && !subscribed && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          width: 360, background: '#1a1a18', borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(201,169,110,0.3)',
          overflow: 'hidden',
        }}>
          {/* Gold top accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#c9a96e,#f59e0b)' }} />

          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: error ? 'rgba(239,68,68,0.15)' : 'rgba(201,169,110,0.15)' }}>
                {error ? <AlertTriangle size={20} color="#ef4444" /> : <Bell size={20} color="#c9a96e" />}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                  {error ? 'Could not enable push' : '🔔 Enable Admin Alerts'}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, marginBottom: 10 }}>
                  {error || 'Get instant browser push notifications for:\nnew orders, new users, support tickets & low stock.'}
                </p>

                {/* What you'll get */}
                {!error && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
                    {[
                      ['💳', 'New Orders'],
                      ['👤', 'New Users'],
                      ['🎫', 'Support Tickets'],
                      ['⚠️', 'Low Stock'],
                    ].map(([icon, label]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#d1d5db' }}>
                        <span>{icon}</span>{label}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={enableNotifications}
                    disabled={loading}
                    style={{ flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', background: error ? '#dc2626' : '#c9a96e', color: '#fff', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {loading
                      ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Enabling…</>
                      : <><Bell size={12} />{error ? 'Retry' : 'Enable Now'}</>
                    }
                  </button>
                  {!loading && (
                    <button onClick={dismiss} style={{ padding: '9px 12px', borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.06)', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>
                      Later
                    </button>
                  )}
                </div>

                {permission === 'denied' && (
                  <p style={{ fontSize: 10, color: '#fca5a5', marginTop: 8, lineHeight: 1.5 }}>
                    Notifications blocked. Click 🔒 in your address bar → Site Settings → Notifications → Allow, then retry.
                  </p>
                )}
              </div>

              <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2 }}>
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success banner */}
      {subscribed && showBanner && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          width: 320, background: '#14532d', borderRadius: 14,
          padding: '14px 18px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <CheckCircle size={22} color="#4ade80" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ color: '#dcfce7', fontWeight: 700, fontSize: 13, margin: 0 }}>Admin push notifications ON!</p>
            <p style={{ color: '#86efac', fontSize: 11, margin: '2px 0 0 0' }}>You'll be alerted instantly for orders, users, tickets & stock.</p>
          </div>
          <button onClick={() => setShowBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', marginLeft: 'auto' }}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}

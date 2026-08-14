import { MapPin, Monitor, Smartphone, Tablet } from 'lucide-react';

export default function LiveVisitorTable({ visitors, loading, onVisitorSelect, theme }) {
  const deviceIcon = (type) => {
    if (type === 'mobile') return <Smartphone size={13} color="#6b7280" />;
    if (type === 'tablet') return <Tablet size={13} color="#6b7280" />;
    return <Monitor size={13} color="#6b7280" />;
  };

  const formatRelativeTime = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleString();
  };

  return (
    <div
      style={{
        background: theme.panelStrong,
        borderRadius: 24,
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(148,163,184,0.14)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0 }}>
          Live Visitors
        </h3>
        <button style={{ fontSize: 11, color: '#7dd3fc', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(125,211,252,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
          View Full Visitors
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowX: 'auto', minHeight: 300 }}>
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Loading visitors...
          </div>
        ) : visitors.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <MapPin size={32} color="#e5e7eb" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
              No visitors yet
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Visitors will appear here as they click your tracking links.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(15, 23, 42, 0.9)' }}>
              <tr>
                {['Location', 'IP Address', 'Device', 'Landing Page', 'Source', 'Campaign', 'Time', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid rgba(148,163,184,0.14)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitors.slice(0, 10).map((visitor, idx) => (
                <tr
                  key={visitor.id}
                  onClick={() => onVisitorSelect(visitor)}
                  style={{
                    borderBottom: '1px solid rgba(148,163,184,0.08)',
                    background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.55)' : 'rgba(11, 17, 29, 0.7)',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(15, 23, 42, 0.8)' : 'rgba(17,24,39,0.85)')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(15, 23, 42, 0.55)' : 'rgba(11, 17, 29, 0.7)')}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} color="#c9a96e" style={{ flexShrink: 0 }} />
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                        {visitor.city || visitor.country || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#b8c3d9', fontSize: 11, fontFamily: 'monospace' }}>
                    {visitor.ip_address}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {deviceIcon(visitor.device_type)}
                      <span style={{ color: '#dbeafe', fontSize: 11 }}>
                        {visitor.device_type || '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#cbd5e1', fontSize: 11 }}>
                    {visitor.referrer ? new URL(visitor.referrer).hostname : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#cbd5e1', fontSize: 11 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: 'rgba(148,163,184,0.12)',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#dbeafe',
                        border: '1px solid rgba(148,163,184,0.18)',
                      }}
                    >
                      {visitor.utm_source || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#cbd5e1', fontSize: 11 }}>
                    {visitor.utm_campaign || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#9fb2d1', whiteSpace: 'nowrap' }}>
                    {formatRelativeTime(visitor.clicked_at)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#10b981',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                      Live
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

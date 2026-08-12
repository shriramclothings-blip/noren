import { MapPin, Monitor, Smartphone, Tablet } from 'lucide-react';

export default function LiveVisitorTable({ visitors, loading, onVisitorSelect }) {
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
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
          Live Visitors
        </h3>
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
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f9fafb' }}>
              <tr>
                {['Location', 'IP Address', 'Device', 'Landing Page', 'Source', 'Campaign', 'Time', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#9ca3af',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid #f3f4f6',
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
                    borderBottom: '1px solid #f9fafb',
                    background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#f9fafb' : '#f3f4f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} color="#c9a96e" style={{ flexShrink: 0 }} />
                      <span style={{ color: '#111827', fontWeight: 500 }}>
                        {visitor.city || visitor.country || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}>
                    {visitor.ip_address}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {deviceIcon(visitor.device_type)}
                      <span style={{ color: '#374151', fontSize: 11 }}>
                        {visitor.device_type || '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#374151', fontSize: 11 }}>
                    {visitor.referrer ? new URL(visitor.referrer).hostname : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#374151', fontSize: 11 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#f3f4f6',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#6b7280',
                      }}
                    >
                      {visitor.utm_source || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#374151', fontSize: 11 }}>
                    {visitor.utm_campaign || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
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

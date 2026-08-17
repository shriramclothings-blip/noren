import { MapPin, Monitor, Smartphone, Tablet, ExternalLink, ArrowRight } from 'lucide-react';

function DeviceIcon({ type }) {
  if (type === 'mobile') return <Smartphone size={13} color="#38bdf8" />;
  if (type === 'tablet') return <Tablet size={13} color="#38bdf8" />;
  return <Monitor size={13} color="#38bdf8" />;
}

export default function LiveVisitorTable({ visitors = [], loading, onVisitorSelect, theme }) {
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
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Table Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.5)',
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: theme.text, margin: 0 }}>
            Live Visitors Log
          </h3>
          <p style={{ fontSize: 11, color: theme.textMuted, margin: '2px 0 0' }}>
            Click any row to focus 3D Earth on visitor location
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid rgba(56, 189, 248, 0.2)',
            fontWeight: 600,
          }}
        >
          {visitors.length} Tracked Sessions
        </span>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
            Syncing live visitor stream...
          </div>
        ) : visitors.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <MapPin size={32} color="#38bdf8" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: '0 0 4px' }}>
              No recent visitor activity
            </p>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: 0 }}>
              Visitor entries will automatically pop up as clicks are tracked.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(11, 17, 29, 0.8)', borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
                {['Visitor Location', 'IP Address', 'Device / OS', 'Landing Page', 'UTM Source', 'Campaign', 'Last Activity', 'Status', 'Focus'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitors.slice(0, 15).map((visitor, idx) => {
                const isLive = new Date() - new Date(visitor.clicked_at) < 5 * 60 * 1000;

                return (
                  <tr
                    key={visitor.id || idx}
                    onClick={() => onVisitorSelect(visitor)}
                    style={{
                      borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                      background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ color: theme.text, fontWeight: 700, fontSize: 13 }}>
                            {visitor.city || visitor.region || 'Unknown City'}
                          </div>
                          <div style={{ color: theme.textMuted, fontSize: 10 }}>
                            {visitor.country || 'Global'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: 11 }}>
                      {visitor.ip_address || '—'}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DeviceIcon type={visitor.device_type} />
                        <div>
                          <div style={{ color: theme.text, fontWeight: 600, fontSize: 12 }}>
                            {visitor.device_model || visitor.device_type || 'Desktop'}
                          </div>
                          <div style={{ color: theme.textMuted, fontSize: 10 }}>
                            {visitor.browser} / {visitor.os}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {visitor.landing_page || visitor.destination || '/'}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#c084fc',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {visitor.utm_source || 'Direct'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: 11 }}>
                      {visitor.utm_campaign || '—'}
                    </td>

                    <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: 11 }}>
                      {formatRelativeTime(visitor.clicked_at)}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: isLive ? '#34d399' : '#94a3b8',
                          background: isLive ? 'rgba(52, 211, 153, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#34d399' : '#94a3b8' }} />
                        {isLive ? 'Live' : 'Offline'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVisitorSelect(visitor);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Locate <ArrowRight size={10} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

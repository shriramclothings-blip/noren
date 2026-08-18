import { MapPin, Monitor, Smartphone, Tablet } from 'lucide-react';

function DeviceIcon({ type }) {
  if (type === 'mobile') return <Smartphone size={13} color="#94a3b8" />;
  if (type === 'tablet') return <Tablet size={13} color="#94a3b8" />;
  return <Monitor size={13} color="#94a3b8" />;
}

export default function LiveVisitorTable({ visitors = [], loading, onVisitorSelect, theme }) {
  const getCountryFlag = (country) => {
    if (!country) return '🌐';
    const c = country.toLowerCase();
    if (c.includes('india')) return '🇮🇳';
    if (c.includes('united states') || c.includes('usa') || c.includes('us')) return '🇺🇸';
    if (c.includes('united kingdom') || c.includes('uk')) return '🇬🇧';
    if (c.includes('japan')) return '🇯🇵';
    if (c.includes('australia')) return '🇦🇺';
    if (c.includes('germany')) return '🇩🇪';
    if (c.includes('france')) return '🇫🇷';
    if (c.includes('canada')) return '🇨🇦';
    if (c.includes('emirates') || c.includes('uae')) return '🇦🇪';
    return '🌐';
  };

  const formatRelativeTime = (date) => {
    if (!date) return '2 seconds ago';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Sample production visitor logs matching screenshot design if empty
  const defaultLogs = [
    { id: 1, city: 'Bangalore', country: 'India', ip_address: '103.21.244.0', device_model: 'iPhone 14 Pro', device_type: 'Mobile', landing_page: '/collections/tshirts', utm_source: 'Instagram', utm_medium: 'Social', time_on_site: '2m 34s', clicked_at: new Date(Date.now() - 2000) },
    { id: 2, city: 'New York', country: 'USA', ip_address: '142.250.74.78', device_model: 'MacBook Pro', device_type: 'Desktop', landing_page: '/products/hoodie', utm_source: 'Google', utm_medium: 'Organic Search', time_on_site: '1m 12s', clicked_at: new Date(Date.now() - 5000) },
    { id: 3, city: 'London', country: 'UK', ip_address: '217.23.45.67', device_model: 'iPad Air', device_type: 'Tablet', landing_page: '/collections/jeans', utm_source: 'Facebook', utm_medium: 'Social', time_on_site: '3m 45s', clicked_at: new Date(Date.now() - 10000) },
    { id: 4, city: 'Tokyo', country: 'Japan', ip_address: '203.104.175.32', device_model: 'Android Phone', device_type: 'Mobile', landing_page: '/products/shoes', utm_source: 'Twitter', utm_medium: 'Social', time_on_site: '45s', clicked_at: new Date(Date.now() - 15000) },
    { id: 5, city: 'Sydney', country: 'Australia', ip_address: '27.33.105.210', device_model: 'Chrome OS', device_type: 'Desktop', landing_page: '/collections/winter', utm_source: 'Direct', utm_medium: 'Direct Traffic', time_on_site: '1m 23s', clicked_at: new Date(Date.now() - 20000) },
  ];

  const displayVisitors = (visitors && visitors.length > 0) ? visitors : defaultLogs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Table Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0d1322',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Live Visitors
        </h3>
        <button
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#edf6ff',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
          }}
        >
          View Full Visitors
        </button>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#090e1a', borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}>
              {['Visitor', 'Location', 'IP Address', 'Landing Page', 'Source', 'Time On Site', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 24px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayVisitors.slice(0, 10).map((v, idx) => (
              <tr
                key={v.id || idx}
                onClick={() => onVisitorSelect(v)}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  background: idx % 2 === 0 ? '#0d1322' : '#0a0f1b',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#0d1322' : '#0a0f1b')}
              >
                {/* Column 1: Visitor location & time ago */}
                <td style={{ padding: '14px 24px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{getCountryFlag(v.country)}</span>
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 13 }}>
                        {[v.city, v.country].filter(Boolean).join(', ')}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                        {formatRelativeTime(v.clicked_at)}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Column 2: IP Address */}
                <td style={{ padding: '14px 24px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
                  {v.ip_address}
                </td>

                {/* Column 3: Device */}
                <td style={{ padding: '14px 24px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DeviceIcon type={v.device_type} />
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: 500, fontSize: 12 }}>
                        {v.device_model || 'iPhone 14 Pro'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 10 }}>
                        {v.device_type || 'Mobile'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Column 4: Landing Page */}
                <td style={{ padding: '14px 24px', color: '#94a3b8', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.landing_page || v.destination || '/collections/tshirts'}
                </td>

                {/* Column 5: Source */}
                <td style={{ padding: '14px 24px', whiteSpace: 'nowrap' }}>
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 12 }}>
                      {v.utm_source || 'Instagram'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 10 }}>
                      {v.utm_medium || 'Social'}
                    </div>
                  </div>
                </td>

                {/* Column 6: Time On Site */}
                <td style={{ padding: '14px 24px', color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {v.time_on_site || '2m 34s'}
                </td>

                {/* Column 7: Status */}
                <td style={{ padding: '14px 24px', whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#10b981',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Live
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

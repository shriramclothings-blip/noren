import React from 'react';
import { Globe, AlertTriangle } from 'lucide-react';

export class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('3D Globe WebGL Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { locations = [], onLocationSelect } = this.props;

      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: 520,
            borderRadius: 20,
            background: 'radial-gradient(ellipse at center, #0b1220 0%, #030814 60%, #02050c 100%)',
            border: '1px solid rgba(148,163,184,0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            color: '#edf6ff',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          <div
            style={{
              padding: '16px 24px',
              borderRadius: 16,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              maxWidth: 500,
            }}
          >
            <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>3D WebGL Acceleration Unavailable</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                Displaying 2D Geographic Location View instead.
              </div>
            </div>
          </div>

          {/* 2D Fallback Map Representation */}
          <div
            style={{
              width: '100%',
              maxWidth: 800,
              height: 340,
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 16,
              border: '1px solid rgba(56, 189, 248, 0.2)',
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
              overflowY: 'auto',
            }}
          >
            {locations.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', paddingTop: 60 }}>
                <Globe size={36} color="#38bdf8" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }} />
                No active visitor locations recorded.
              </div>
            ) : (
              locations.map((loc, idx) => (
                <div
                  key={idx}
                  onClick={() => onLocationSelect && onLocationSelect(loc)}
                  style={{
                    background: 'rgba(11, 19, 36, 0.8)',
                    borderRadius: 12,
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    padding: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#38bdf8' }}>
                      {loc.city || 'Unknown'}, {loc.country}
                    </span>
                    <span style={{ fontSize: 10, background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                      ● {loc.visitor_count || 1} live
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Lat: {loc.latitude ? parseFloat(loc.latitude).toFixed(2) : '—'}, Lon: {loc.longitude ? parseFloat(loc.longitude).toFixed(2) : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

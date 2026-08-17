import { X, Copy, Check, ShieldCheck, MapPin, Monitor, Smartphone, Tablet, ExternalLink, Globe } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

function DeviceIcon({ type }) {
  if (type === 'mobile') return <Smartphone size={13} color="#38bdf8" />;
  if (type === 'tablet') return <Tablet size={13} color="#38bdf8" />;
  return <Monitor size={13} color="#38bdf8" />;
}

export default function VisitorDetails({ visitor, onClose, theme }) {
  const [copied, setCopied] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('IP copied to clipboard');
    });
  };

  const isLive = visitor?.status === 'live' || (visitor?.clicked_at && new Date() - new Date(visitor.clicked_at) < 5 * 60 * 1000);

  const fields = [
    { label: 'Location', value: [visitor?.city, visitor?.region, visitor?.country].filter(Boolean).join(', ') || 'Unknown Location', highlight: true },
    { label: 'Country', value: visitor?.country || '—' },
    { label: 'IP Address', value: visitor?.ip_address || '—', copyable: true },
    { label: 'Device', value: visitor?.device_model || visitor?.device_type || '—' },
    { label: 'Browser', value: visitor?.browser || '—' },
    { label: 'Operating System', value: visitor?.os || '—' },
    { label: 'UTM Source', value: visitor?.utm_source || 'Direct / None', badge: true },
    { label: 'UTM Medium', value: visitor?.utm_medium || '—' },
    { label: 'UTM Campaign', value: visitor?.utm_campaign || '—' },
    { label: 'Landing Page', value: visitor?.landing_page || visitor?.destination || '/', path: true },
    { label: 'Referrer', value: visitor?.referer ? (visitor.referer.startsWith('http') ? new URL(visitor.referer).hostname : visitor.referer) : 'Direct' },
    { label: 'First Seen', value: visitor?.clicked_at ? new Date(visitor.clicked_at).toLocaleTimeString() : '—' },
  ];

  return (
    <>
      <div
        style={{
          background: 'rgba(6, 11, 24, 0.94)',
          borderRadius: 24,
          border: '1px solid rgba(56, 189, 248, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: 560,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
            flexShrink: 0,
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#edf6ff' }}>Visitor Details</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: isLive ? '#34d399' : '#94a3b8',
                  background: isLive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 100,
                  border: isLive ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#34d399' : '#94a3b8' }} />
                {isLive ? 'Live' : 'Offline'}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
              {visitor?.city || 'City'}, {visitor?.country || 'Country'}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Panel Fields */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {fields.map((f, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {f.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: f.highlight ? 700 : 500,
                    color: f.highlight ? '#38bdf8' : '#edf6ff',
                    wordBreak: 'break-all',
                    fontFamily: f.copyable ? 'monospace' : 'inherit',
                  }}
                >
                  {f.value}
                </span>

                {f.copyable && (
                  <button
                    onClick={() => copyToClipboard(f.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: copied ? '#34d399' : '#94a3b8',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Copy IP"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Action */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
            background: 'rgba(15, 23, 42, 0.8)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowFullModal(true)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck size={14} /> View Full Details
          </button>
        </div>
      </div>

      {/* Full Modal View */}
      {showFullModal && (
        <div
          onClick={() => setShowFullModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.82)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 580,
              background: '#0b1220',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
              color: '#edf6ff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(148, 163, 184, 0.14)', pb: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>Complete Visitor Audit Record</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  ID: {visitor?.id || '—'} &nbsp;·&nbsp; Session IP: {visitor?.ip_address}
                </p>
              </div>
              <button
                onClick={() => setShowFullModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
              {fields.map((f, i) => (
                <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 12, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{f.label}</div>
                  <div style={{ marginTop: 4, fontWeight: 600, color: '#edf6ff', wordBreak: 'break-all' }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                onClick={() => setShowFullModal(false)}
                style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.8)', color: '#edf6ff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

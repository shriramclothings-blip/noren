import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function VisitorDetails({ visitor, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied');
    });
  };

  const details = [
    { label: 'Location', value: [visitor?.city, visitor?.region, visitor?.country].filter(Boolean).join(', ') || 'Unknown' },
    { label: 'Country', value: visitor?.country || '—' },
    { label: 'City', value: visitor?.city || '—' },
    { label: 'IP Address', value: visitor?.ip_address || '—', copyable: true },
    { label: 'Device', value: visitor?.device_model || '—' },
    { label: 'Device Type', value: visitor?.device_type ? visitor.device_type.toUpperCase() : '—' },
    { label: 'Browser', value: visitor?.browser || '—' },
    { label: 'OS', value: visitor?.os || '—' },
    { label: 'UTM Source', value: visitor?.utm_source || '—' },
    { label: 'UTM Medium', value: visitor?.utm_medium || '—' },
    { label: 'UTM Campaign', value: visitor?.utm_campaign || '—' },
    { label: 'Referrer', value: visitor?.referer ? new URL(visitor.referer).hostname : '—' },
    { label: 'First Seen', value: visitor?.clicked_at ? new Date(visitor.clicked_at).toLocaleString() : '—' },
  ];

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,12,28,1))',
        borderRadius: 18,
        border: '1px solid rgba(148,163,184,0.18)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        boxShadow: '0 20px 30px rgba(2, 6, 23, 0.35)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(148,163,184,0.14)',
          flexShrink: 0,
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Live Visitor
          </h3>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            {visitor?.city}, {visitor?.country}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            background: 'rgba(148,163,184,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(148,163,184,0.2)',
          }}
        >
          <X size={14} color="#e2e8f0" />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {details.map((detail, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              padding: '8px 0',
              borderBottom: idx < details.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            <label style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {detail.label}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 12, color: '#e2e8f0', wordBreak: 'break-all' }}>
                {detail.value}
              </span>
              {detail.copyable && (
                <button
                  onClick={() => copyToClipboard(detail.value)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    padding: 0,
                    flexShrink: 0,
                  }}
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #f3f4f6',
          background: '#fafafa',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 12px 24px rgba(79, 70, 229, 0.25)',
          }}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

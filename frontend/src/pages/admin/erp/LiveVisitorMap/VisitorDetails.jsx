import { X, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function VisitorDetails({ visitor, onClose, theme }) {
  const [copied, setCopied] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied IP Address');
    });
  };

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

  const details = [
    { label: 'Location', value: `${getCountryFlag(visitor?.country)} ${[visitor?.city, visitor?.country].filter(Boolean).join(', ') || 'Bangalore, India'}`, highlight: true },
    { label: 'IP Address', value: visitor?.ip_address || '103.21.244.0', copyable: true },
    { label: 'Device', value: visitor?.device_model || 'iPhone 14 Pro' },
    { label: 'Browser', value: visitor?.browser || 'Safari Mobile' },
    { label: 'Campaign', value: visitor?.utm_campaign || 'Summer Sale 2025' },
    { label: 'Landing Page', value: visitor?.landing_page || visitor?.destination || '/collections/tshirts' },
    { label: 'Referrer', value: visitor?.referer ? (visitor.referer.startsWith('http') ? new URL(visitor.referer).hostname : visitor.referer) : 'Instagram' },
    { label: 'Time on Site', value: visitor?.time_on_site || '2m 34s' },
  ];

  return (
    <>
      <div
        style={{
          background: '#0d1322',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: 560,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Live Visitor
            </h3>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.15)',
                padding: '2px 8px',
                borderRadius: 100,
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              New
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Details List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {details.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: d.highlight ? 700 : 500,
                    color: d.highlight ? '#ffffff' : '#e2e8f0',
                    fontFamily: d.copyable ? 'monospace' : 'inherit',
                    wordBreak: 'break-all',
                  }}
                >
                  {d.value}
                </span>

                {d.copyable && (
                  <button
                    onClick={() => copyToClipboard(d.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: copied ? '#10b981' : '#64748b',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                    title="Copy IP"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Full Width Button */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            background: '#0a0f1b',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowFullModal(true)}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)',
            }}
          >
            View Full Details
          </button>
        </div>
      </div>

      {/* Modal */}
      {showFullModal && (
        <div
          onClick={() => setShowFullModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
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
              maxWidth: 560,
              background: '#0d1322',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 20,
              padding: 24,
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Full Visitor Audit Session</h3>
              <button onClick={() => setShowFullModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {details.map((d, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{d.label}</div>
                  <div style={{ fontSize: 12, color: '#ffffff', fontWeight: 500, marginTop: 3 }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Share2, Copy, Check, X, MessageCircle, Mail, Send } from 'lucide-react';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://www.norenfashion.in').replace(/\/+$/, '');

// ── SVG brand icons (no external dependency needed) ──────────────────────────
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterXIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function TelegramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

// ── Share channels config ─────────────────────────────────────────────────────
function getShareChannels(url, text) {
  const enc = encodeURIComponent;
  return [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      color: '#25D366',
      bg: '#f0fdf4',
      icon: <WhatsAppIcon size={18} />,
      href: `https://wa.me/?text=${enc(`${text}\n\n${url}`)}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      color: '#1877F2',
      bg: '#eff6ff',
      icon: <FacebookIcon size={18} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
    {
      key: 'twitter',
      label: 'X (Twitter)',
      color: '#000000',
      bg: '#f9fafb',
      icon: <TwitterXIcon size={18} />,
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      color: '#0088cc',
      bg: '#f0f9ff',
      icon: <TelegramIcon size={18} />,
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      color: '#E1306C',
      bg: '#fff1f5',
      icon: <InstagramIcon size={18} />,
      // Instagram doesn't support direct web sharing — copy link for user
      href: null,
      action: 'instagram',
    },
    {
      key: 'email',
      label: 'Email',
      color: '#374151',
      bg: '#f9fafb',
      icon: <Mail size={18} />,
      href: `mailto:?subject=${enc(text)}&body=${enc(`Check out this product: ${url}`)}`,
    },
  ];
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShareProductButton({ product }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [instagramCopied, setInstagramCopied] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  const productUrl = `${SITE_URL}/product/${product.id}`;
  const shareText = `Check out "${product.title}" on NOREN`;
  const channels = getShareChannels(productUrl, shareText);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = productUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: shareText,
          url: productUrl,
        });
        return; // native sheet shown — no need to open popover
      } catch (err) {
        if (err.name === 'AbortError') return; // user cancelled
        // fall through to popover
      }
    }
    setOpen(prev => !prev);
  };

  const handleChannelClick = (ch) => {
    if (ch.action === 'instagram') {
      // Instagram has no web share API — copy link and hint user
      navigator.clipboard.writeText(productUrl).catch(() => {});
      setInstagramCopied(true);
      setTimeout(() => setInstagramCopied(false), 2500);
      return;
    }
    if (ch.href) {
      window.open(ch.href, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={handleNativeShare}
        aria-label="Share this product"
        title="Share this product"
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          border: '2px solid #e5e7eb',
          background: open ? '#1a1a18' : '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
          color: open ? '#fff' : '#374151',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }
        }}
      >
        <Share2 size={18} />
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Share product"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            right: 0,
            width: 300,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #f3f4f6',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'sharePopoverIn 0.18s ease',
          }}
        >
          <style>{`
            @keyframes sharePopoverIn {
              from { opacity: 0; transform: translateY(8px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={15} color="#c9a96e" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Share this product</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close share menu"
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: 'none', background: '#f3f4f6',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#6b7280',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Product preview strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            borderBottom: '1px solid #f3f4f6',
            background: '#fafafa',
          }}>
            {product.images?.[0]?.image_url && (
              <img
                src={product.images[0].image_url}
                alt={product.title}
                style={{ width: 40, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: '#111827',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {product.title}
              </p>
              {product.category_name && (
                <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{product.category_name}</p>
              )}
            </div>
          </div>

          {/* Social channels grid */}
          <div style={{ padding: '14px 16px 8px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 }}>
              Share via
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {channels.map(ch => (
                <button
                  key={ch.key}
                  onClick={() => handleChannelClick(ch)}
                  title={ch.key === 'instagram' ? 'Copy link to share on Instagram' : `Share on ${ch.label}`}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 5, padding: '10px 6px',
                    borderRadius: 10,
                    border: '1.5px solid transparent',
                    background: ch.bg,
                    cursor: 'pointer',
                    color: ch.color,
                    fontSize: 10, fontWeight: 600,
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = ch.color + '55';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {ch.key === 'instagram' && instagramCopied
                    ? <Check size={18} color="#16a34a" />
                    : ch.icon
                  }
                  <span style={{ color: '#374151' }}>
                    {ch.key === 'instagram' && instagramCopied ? 'Copied!' : ch.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Instagram note */}
          {instagramCopied && (
            <div style={{
              margin: '0 16px 8px',
              padding: '8px 10px',
              background: '#fef3c7',
              borderRadius: 8,
              fontSize: 11,
              color: '#92400e',
              lineHeight: 1.5,
            }}>
              Link copied! Open Instagram, create a post or story and paste the link.
            </div>
          )}

          {/* Copy link row */}
          <div style={{ padding: '8px 16px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>
              Or copy link
            </p>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: 8,
              background: '#f9fafb',
              borderRadius: 10,
              padding: '8px 10px',
              border: '1.5px solid #f3f4f6',
            }}>
              <span style={{
                flex: 1, fontSize: 11, color: '#6b7280',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}>
                {productUrl.replace('https://', '')}
              </span>
              <button
                onClick={handleCopyLink}
                aria-label="Copy product link"
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: copied ? '#ecfdf5' : '#1a1a18',
                  color: copied ? '#16a34a' : '#fff',
                  fontSize: 11, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

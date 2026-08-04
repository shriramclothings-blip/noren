import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ChevronUp, Send } from 'lucide-react';

const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
  </svg>
);
import { useSiteSettings } from '../context/SiteSettingsContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const COLLECTIONS = [
  ['Oversized T-Shirts', '/shop?category=t-shirts'],
  ['Shirts', '/shop?category=shirts'],
  ['Polo', '/shop?category=polo'],
  ['Jeans', '/shop?category=jeans'],
  ['Cargo', '/shop?category=cargo'],
  ['Jackets', '/shop?category=jackets'],
  ['Hoodies', '/shop?category=hoodies'],
  ['Accessories', '/shop?category=accessories'],
];

const QUICK_LINKS = [
  ['Home', '/'],
  ['New Arrivals', '/shop?featured=true'],
  ['About NOREN', '/contact'],
  ['Track Order', '/orders'],
  ['Contact Us', '/contact'],
  ['Track Query', '/track-query'],
];

const POLICY_LINKS = [
  ['Privacy Policy', '/privacy'],
  ['Terms & Conditions', '/terms'],
  ['Return Policy', '/return-policy'],
  ['Refund Policy', '/refund'],
  ['Shipping Policy', '/shipping'],
  ['Cancellation Policy', '/cancellation'],
  ['Cookies Policy', '/cookies'],
  ['Legal Notice', '/legal'],
];

export function ScrollToTopBtn() {
  const [visible, setVisible] = useState(false);
  if (typeof window !== 'undefined') {
    window.onscroll = () => setVisible(window.scrollY > 400);
  }
  if (!visible) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{ position: 'fixed', bottom: 96, right: 22, width: 44, height: 44, background: '#1a1a18', border: '1px solid #3d3d39', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 998, transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.borderColor = '#c9a96e'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; e.currentTarget.style.borderColor = '#3d3d39'; }}
      title="Back to top">
      <ChevronUp size={18} color="#faf9f7" />
    </button>
  );
}

export function FloatingWhatsApp({ phone }) {
  const number = (phone || '919876543210').replace(/\D/g, '');
  return (
    <a href={`https://wa.me/${number}?text=Hi! I need help with my order.`}
      target="_blank" rel="noopener noreferrer"
      style={{ position: 'fixed', bottom: 24, right: 20, width: 52, height: 52, background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.4)', zIndex: 999, textDecoration: 'none', transition: 'all 0.2s', borderRadius: '50%' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      title="Chat on WhatsApp">
      <WhatsAppIcon />
    </a>
  );
}

export default function Footer() {
  const { settings } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const phone      = settings.footer_phone    || '+91 79846 26447';
  const emailAddr  = settings.footer_email    || 'hello@norenfashion.in';
  const whatsapp   = (settings.footer_whatsapp || '917984626447').replace(/\D/g, '');
  const address    = settings.footer_address  || 'Silver Square Link, Near Sravan Choukdi, Bharuch, Gujarat - 392001, India';
  const description = settings.footer_description || 'NOREN creates timeless clothing designed for confidence, individuality and everyday elegance. A luxury unisex fashion house, crafted beyond trends.';

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return toast.error('Enter a valid email address');
    setSubscribing(true);
    try {
      await api.post('/homepage/newsletter', { email });
      toast.success('Welcome to NOREN. You are now subscribed.');
      setEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed. Try again.');
    } finally { setSubscribing(false); }
  };

  const linkStyle = { fontSize: 13, color: '#6b6760', textDecoration: 'none', transition: 'color 0.15s', letterSpacing: '0.02em' };
  const hoverGold = (e) => e.currentTarget.style.color = '#c9a96e';
  const unhover   = (e) => e.currentTarget.style.color = '#6b6760';

  const SOCIALS = [
    { href: settings.footer_instagram || '#', Icon: InstagramIcon, label: 'Instagram',  hoverBg: '#e1306c' },
    { href: settings.footer_facebook  || '#', Icon: FacebookIcon,  label: 'Facebook',   hoverBg: '#1877f2' },
    { href: settings.footer_youtube   || '#', Icon: YoutubeIcon,   label: 'YouTube',    hoverBg: '#ff0000' },
    { href: `https://wa.me/${whatsapp}`,       Icon: WhatsAppIcon,  label: 'WhatsApp',   hoverBg: '#25d366' },
  ];

  return (
    <>
      <footer style={{ background: '#111110', color: '#6b6760', borderTop: '1px solid rgba(201,169,110,0.12)' }}>

        {/* Newsletter */}
        <div style={{ borderBottom: '1px solid rgba(250,249,247,0.06)', padding: 'clamp(28px, 5vw, 40px) 0' }}>
          <div className="wrap">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div style={{ flex: '1 1 240px' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: 600, color: '#faf9f7', marginBottom: 6, letterSpacing: '0.04em' }}>Stay in the World of NOREN</p>
                <p style={{ fontSize: 13, color: '#5a5750', letterSpacing: '0.02em' }}>Exclusive drops, editorial stories and timeless style, delivered quietly.</p>
              </div>
              <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 0, flex: '1 1 280px', maxWidth: 480 }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Your email address"
                  style={{ flex: 1, minWidth: 0, padding: '12px 16px', fontSize: 16, background: 'rgba(250,249,247,0.05)', border: '1px solid rgba(250,249,247,0.1)', outline: 'none', color: '#faf9f7', fontFamily: 'inherit', borderRadius: 0 }}
                  onFocus={e => e.target.style.borderColor = '#c9a96e'}
                  onBlur={e => e.target.style.borderColor = 'rgba(250,249,247,0.1)'}
                />
                <button type="submit" disabled={subscribing}
                  style={{ flexShrink: 0, padding: '12px 20px', background: '#c9a96e', color: '#1a1a18', border: 'none', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: subscribing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: subscribing ? 0.7 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { if (!subscribing) e.currentTarget.style.background = '#a8834a'; }}
                  onMouseLeave={e => e.currentTarget.style.background = '#c9a96e'}>
                  <Send size={12} /> {subscribing ? '...' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="wrap" style={{ paddingTop: 'clamp(40px, 6vw, 64px)', paddingBottom: 'clamp(32px, 5vw, 48px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'clamp(32px, 5vw, 48px) clamp(20px, 3vw, 32px)', marginBottom: 'clamp(32px, 5vw, 56px)' }}>

            {/* Brand */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <img
                  src="/logo.png"
                  alt="NOREN"
                  style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)', marginBottom: 4 }}
                />
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: '#5a5750', marginBottom: 24, maxWidth: 240 }}>{description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SOCIALS.map(({ href, Icon, label, hoverBg }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                    style={{ width: 40, height: 40, background: 'rgba(250,249,247,0.05)', border: '1px solid rgba(250,249,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6760', textDecoration: 'none', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = hoverBg; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,249,247,0.05)'; e.currentTarget.style.color = '#6b6760'; e.currentTarget.style.borderColor = 'rgba(250,249,247,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>

            {/* Collections */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#faf9f7', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(250,249,247,0.06)' }}>Collections</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {COLLECTIONS.map(([label, to]) => (
                  <Link key={label} to={to} style={linkStyle} onMouseEnter={hoverGold} onMouseLeave={unhover}>{label}</Link>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#faf9f7', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(250,249,247,0.06)' }}>Company</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {QUICK_LINKS.map(([label, to]) => (
                  <Link key={label} to={to} style={linkStyle} onMouseEnter={hoverGold} onMouseLeave={unhover}>{label}</Link>
                ))}
              </div>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#faf9f7', letterSpacing: '0.22em', textTransform: 'uppercase', margin: '24px 0 16px', paddingBottom: 12, borderBottom: '1px solid rgba(250,249,247,0.06)' }}>Legal</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {POLICY_LINKS.map(([label, to]) => (
                  <Link key={label} to={to} style={{ ...linkStyle, fontSize: 12 }} onMouseEnter={hoverGold} onMouseLeave={unhover}>{label}</Link>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#faf9f7', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(250,249,247,0.06)' }}>Client Support</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <a href={`tel:${phone.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textDecoration: 'none', color: '#6b6760' }} onMouseEnter={hoverGold} onMouseLeave={unhover}>
                  <div style={{ width: 30, height: 30, border: '1px solid rgba(201,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Phone size={13} color="#c9a96e" /></div>
                  <div><p style={{ fontSize: 9, color: '#3d3d39', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Call</p><p style={{ fontSize: 13, color: '#9e9a94' }}>{phone}</p></div>
                </a>
                <a href={`mailto:${emailAddr}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textDecoration: 'none', color: '#6b6760' }} onMouseEnter={hoverGold} onMouseLeave={unhover}>
                  <div style={{ width: 30, height: 30, border: '1px solid rgba(201,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Mail size={13} color="#c9a96e" /></div>
                  <div><p style={{ fontSize: 9, color: '#3d3d39', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Email</p><p style={{ fontSize: 12, color: '#9e9a94', wordBreak: 'break-all' }}>{emailAddr}</p></div>
                </a>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 30, height: 30, border: '1px solid rgba(201,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MapPin size={13} color="#c9a96e" /></div>
                  <div><p style={{ fontSize: 9, color: '#3d3d39', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Address</p><p style={{ fontSize: 12, color: '#5a5750', lineHeight: 1.7 }}>{address}</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(250,249,247,0.12)', paddingTop: 'clamp(20px, 4vw, 32px)', paddingBottom: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: '1 1 260px' }}>
              <p style={{ fontSize: 14, color: '#d4c4b0', letterSpacing: '0.04em', marginBottom: 6, fontWeight: 400 }}>
                &copy; {new Date().getFullYear()} NOREN. All Rights Reserved.
              </p>
              <p style={{ fontSize: 13, color: '#9e9a94', marginTop: 4, letterSpacing: '0.02em' }}>
                Platform Managed &amp; Operated by{' '}
                <span style={{ color: '#b8a898' }}>Dinesh Global Enterprise Private Limited</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 12 }}>
                {POLICY_LINKS.map(([label, to]) => (
                  <Link key={label} to={to}
                    style={{ fontSize: 12, color: '#6b6760', textDecoration: 'none', letterSpacing: '0.02em', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6b6760'}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#9e9a94', letterSpacing: '0.1em', fontStyle: 'italic', alignSelf: 'flex-end' }}>
              Timeless By Design.
            </p>
          </div>
        </div>
      </footer>
      <FloatingWhatsApp phone={settings.footer_whatsapp} />
      <ScrollToTopBtn />
    </>
  );
}

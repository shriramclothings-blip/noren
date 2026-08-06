import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const SITE_URL = 'https://www.norenfastion.shop';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

// -- SEO config per route ------------------------------------------------------
// Rules:
//   title       = 60 chars  — Google truncates at ~60
//   description = 155 chars — Google shows ~155 in search results
//   Every description has a hook + value prop + call to action
const SEO_CONFIG = {
  '/': {
    title: 'NOREN – Wear the Silence. Premium Luxury Fashion India.',
    description: "India's premium unisex luxury fashion house. Oversized T-Shirts, Shirts, Jeans, Jackets & more. Quiet luxury. Bold identity. Shop NOREN — crafted for those who move with purpose.",
  },
  '/shop': {
    title: 'Shop NOREN – Premium Luxury Clothing. New Arrivals Daily.',
    description: 'Explore the full NOREN collection — Oversized T-Shirts, Premium Shirts, Jeans, Hoodies, Jackets & Ethnic Wear. Quiet luxury, bold identity. Find your fit. Shop now.',
  },
  '/cart': {
    title: 'Your Bag – NOREN Luxury Fashion',
    description: 'Your NOREN selections are waiting. Review your bag, confirm your style choices and move to a fast, secure checkout. Free delivery on eligible orders.',
  },
  '/checkout': {
    title: 'Secure Checkout – NOREN',
    description: 'Complete your NOREN order in seconds. Secure payment via UPI, Card or COD. Fast delivery across India. Hassle-free returns guaranteed.',
  },
  '/login': {
    title: 'Sign In – NOREN | Your Fashion Account',
    description: 'Sign in to your NOREN account. Track your orders, manage your wishlist, access exclusive drops and enjoy a personalised luxury shopping experience.',
  },
  '/register': {
    title: 'Join NOREN – Create Your Account',
    description: 'Become part of the NOREN community. Create your account for early access to new drops, exclusive offers and a fully personalised fashion experience.',
  },
  '/wishlist': {
    title: 'Your Wishlist – NOREN',
    description: "Your saved NOREN pieces — all in one place. Revisit your favourites, check availability and add to your bag when you're ready.",
  },
  '/orders': {
    title: 'My Orders – NOREN',
    description: 'Track and manage all your NOREN orders. View order history, live delivery status, invoice details and initiate returns — all from your account.',
  },
  '/profile': {
    title: 'My Profile – NOREN',
    description: 'Manage your NOREN account — update personal details, saved addresses, notification preferences and password. Your identity, your control.',
  },
  '/contact': {
    title: 'Contact NOREN – We Are Here to Help',
    description: 'Questions about your order, sizing or returns? Reach out to the NOREN team. We respond fast. Email, phone or form — we have got you covered.',
  },
  '/track-query': {
    title: 'Track Your Query – NOREN Support',
    description: 'Track the status of your NOREN support request. Enter your query ID and get real-time updates on your issue resolution.',
  },
  '/privacy': {
    title: 'Privacy Policy – NOREN',
    description: 'Read how NOREN collects, uses and protects your personal data. Your privacy matters — transparent, GDPR-aligned and customer-first.',
  },
  '/terms': {
    title: 'Terms & Conditions – NOREN',
    description: "NOREN's complete terms of service — shopping, account usage, returns and platform rules. Simple, clear and fair.",
  },
  '/shipping': {
    title: 'Shipping Policy – NOREN | Fast Delivery Across India',
    description: 'NOREN delivers across India. Read our shipping timelines, delivery partners, charges and tracking process. Most orders delivered within 4–7 business days.',
  },
  '/refund': {
    title: 'Refund Policy – NOREN',
    description: 'NOREN refund process — simple, transparent and customer-first. Understand eligibility, timelines and how to raise a refund request.',
  },
  '/return-policy': {
    title: 'Return Policy – NOREN | Hassle-Free Returns',
    description: 'Easy 7-day returns on eligible NOREN orders. No questions asked. Read how to initiate a return, what qualifies and how quickly you get refunded.',
  },
  '/cancellation': {
    title: 'Cancellation Policy – NOREN',
    description: 'Need to cancel your NOREN order? Read our cancellation policy — when you can cancel, how to do it and what happens next.',
  },
  '/cookies': {
    title: 'Cookie Policy – NOREN',
    description: 'Understand how NOREN uses cookies to improve your shopping experience. Manage your cookie preferences anytime.',
  },
  '/disclaimer': {
    title: 'Disclaimer – NOREN',
    description: 'Legal disclaimer for use of the NOREN website and platform. Read before using our services.',
  },
  '/legal': {
    title: 'Legal Notice – NOREN',
    description: "NOREN's legal notice — company information, intellectual property rights and platform ownership details.",
  },
};

// -- Helpers -------------------------------------------------------------------
function ensureMeta({ selector, createAttrs, setAttrs }) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(createAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  Object.entries(setAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
}

function ensureLink({ selector, createAttrs, setAttrs }) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    Object.entries(createAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  Object.entries(setAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
}

function applyFullSeo({ title, description, url, image }) {
  document.title = title;
  const img = image || DEFAULT_OG_IMAGE;

  ensureMeta({ selector: 'meta[name="description"]',          createAttrs: { name: 'description' },         setAttrs: { content: description } });
  ensureLink({ selector: 'link[rel="canonical"]',              createAttrs: { rel: 'canonical' },            setAttrs: { href: url } });

  // Open Graph
  ensureMeta({ selector: 'meta[property="og:title"]',         createAttrs: { property: 'og:title' },        setAttrs: { content: title } });
  ensureMeta({ selector: 'meta[property="og:description"]',   createAttrs: { property: 'og:description' },  setAttrs: { content: description } });
  ensureMeta({ selector: 'meta[property="og:url"]',           createAttrs: { property: 'og:url' },          setAttrs: { content: url } });
  ensureMeta({ selector: 'meta[property="og:image"]',         createAttrs: { property: 'og:image' },        setAttrs: { content: img } });
  ensureMeta({ selector: 'meta[property="og:site_name"]',     createAttrs: { property: 'og:site_name' },    setAttrs: { content: 'NOREN' } });

  // Twitter
  ensureMeta({ selector: 'meta[name="twitter:title"]',        createAttrs: { name: 'twitter:title' },       setAttrs: { content: title } });
  ensureMeta({ selector: 'meta[name="twitter:description"]',  createAttrs: { name: 'twitter:description' }, setAttrs: { content: description } });
  ensureMeta({ selector: 'meta[name="twitter:url"]',          createAttrs: { name: 'twitter:url' },         setAttrs: { content: url } });
  ensureMeta({ selector: 'meta[name="twitter:image"]',        createAttrs: { name: 'twitter:image' },       setAttrs: { content: img } });
}

// -- Main component ------------------------------------------------------------
export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const cleanPath = location.pathname;
    const absoluteUrl = `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}`;

    // -- Product detail page --------------------------------------------------
    const productMatch = cleanPath.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      const productId = productMatch[1];
      api.get(`/products/${productId}`)
        .then(r => {
          const p = r.data;
          const name  = p.title || 'Premium Product';
          const cat   = p.category_name ? ` | ${p.category_name}` : '';
          const price = p.price ? ` Starting ?${Number(p.price).toLocaleString('en-IN')}` : '';
          const title = `${name} – NOREN${cat}`;

          // Build a compelling description: use product description if available,
          // otherwise craft one from available data
          let description;
          if (p.description && p.description.trim().length > 20) {
            // Trim to 145 chars and add a CTA
            const trimmed = p.description.trim().replace(/\s+/g, ' ').slice(0, 120);
            description = `${trimmed}… Shop ${name} on NOREN.${price}`;
          } else {
            description = `Shop ${name} on NOREN — India's premium luxury fashion house.${cat}${price} Free delivery on eligible orders. Easy 7-day returns.`;
          }
          // Cap at 155 chars
          if (description.length > 155) description = description.slice(0, 152) + '…';

          const image = p.images?.[0]?.image_url || p.primary_image || DEFAULT_OG_IMAGE;

          applyFullSeo({ title, description, url: absoluteUrl, image });
          ensureMeta({ selector: 'meta[property="og:type"]', createAttrs: { property: 'og:type' }, setAttrs: { content: 'product' } });
        })
        .catch(() => {
          document.title = 'Premium Product – NOREN';
        });
      return;
    }

    // -- All other pages ------------------------------------------------------
    const pageSeo = SEO_CONFIG[cleanPath] || {
      title: 'NOREN – Premium Luxury Fashion India',
      description: "India's premium unisex luxury fashion house. Quiet luxury. Bold identity. Shop Oversized T-Shirts, Shirts, Jeans, Jackets & more at NOREN.",
    };

    applyFullSeo({
      title:       pageSeo.title,
      description: pageSeo.description,
      url:         absoluteUrl,
    });

    // Update JSON-LD url/logo to canonical domain
    const ld = document.head.querySelector('script[type="application/ld+json"]');
    if (ld?.textContent) {
      try {
        const data = JSON.parse(ld.textContent);
        if (data && typeof data === 'object') {
          data.url  = `${SITE_URL}/`;
          data.logo = `${SITE_URL}/logo.png`;
          ld.textContent = JSON.stringify(data);
        }
      } catch { /* ignore parse errors */ }
    }
  }, [location.pathname, location.search]);

  return null;
}

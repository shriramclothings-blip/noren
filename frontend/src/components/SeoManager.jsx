import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://www.norenfashion.shop').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

// SEO configuration for each route
const SEO_CONFIG = {
  '/': {
    title: 'NOREN  Timeless By Design. Premium Unisex Luxury Fashion.',
    description: 'NOREN is a premium luxury unisex fashion house. Shop timeless clothing  Oversized T-Shirts, Shirts, Polo, Jeans, Jackets, Hoodies and Accessories. Crafted beyond trends.',
  },
  '/shop': {
    title: 'Shop All Collections  NOREN Luxury Fashion',
    description: 'Browse the full NOREN collection. Premium unisex clothing designed for confidence and everyday elegance. Filter by category, size and style.',
  },
  '/cart': {
    title: 'Your Bag  NOREN',
    description: 'Review your selected NOREN pieces and proceed to a seamless, secure checkout.',
  },
  '/checkout': {
    title: 'Secure Checkout  NOREN',
    description: 'Complete your NOREN order securely. Fast delivery and easy returns guaranteed.',
  },
  '/login': {
    title: 'Sign In  NOREN',
    description: 'Sign in to your NOREN account to track orders, manage your wishlist and access exclusive member benefits.',
  },
  '/register': {
    title: 'Join NOREN  Create Your Account',
    description: 'Become a NOREN member. Create your account for exclusive access, early drops and a personalised shopping experience.',
  },
  '/wishlist': {
    title: 'Your Wishlist  NOREN',
    description: 'Your saved NOREN pieces. Revisit and add your favourites to your bag.',
  },
  '/orders': {
    title: 'My Orders  NOREN',
    description: 'Track and manage your NOREN orders. View order history, status and delivery updates.',
  },
  '/profile': {
    title: 'My Profile  NOREN',
    description: 'Manage your NOREN account, personal details and notification preferences.',
  },
  '/contact': {
    title: 'Contact Us  NOREN',
    description: 'Get in touch with the NOREN team. We are here to help with orders, returns and all enquiries.',
  },
  '/privacy': {
    title: 'Privacy Policy  NOREN',
    description: 'Learn how NOREN handles your personal data, privacy and security.',
  },
  '/terms': {
    title: 'Terms & Conditions  NOREN',
    description: 'Read the NOREN Terms and Conditions for shopping, returns and use of our platform.',
  },
  '/shipping': {
    title: 'Shipping Policy  NOREN',
    description: 'NOREN shipping timelines, delivery partners and charges explained.',
  },
  '/refund': {
    title: 'Refund Policy  NOREN',
    description: 'Understand the NOREN refund process  simple, transparent and customer-first.',
  },
  '/return-policy': {
    title: 'Return Policy  NOREN',
    description: 'NOREN hassle-free returns policy. Learn how to initiate a return within 7 days of delivery.',
  },
};

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

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    const cleanPath = location.pathname;
    const absoluteUrl = `${SITE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;

    // ── Product detail page: fetch product data for rich OG tags ──────────────
    const productMatch = cleanPath.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      const productId = productMatch[1];
      api.get(`/products/${productId}`)
        .then(r => {
          const p = r.data;
          const productTitle = `${p.title} — NOREN`;
          const productDesc = p.description
            ? p.description.slice(0, 160)
            : `Shop ${p.title} on NOREN — Premium luxury fashion. ${p.category_name ? `Category: ${p.category_name}.` : ''}`;
          const productImage = p.images?.[0]?.image_url || p.primary_image || DEFAULT_OG_IMAGE;

          document.title = productTitle;
          ensureMeta({ selector: 'meta[name="description"]',         createAttrs: { name: 'description' },         setAttrs: { content: productDesc } });
          ensureLink({ selector: 'link[rel="canonical"]',             createAttrs: { rel: 'canonical' },            setAttrs: { href: absoluteUrl } });
          ensureMeta({ selector: 'meta[property="og:title"]',        createAttrs: { property: 'og:title' },        setAttrs: { content: productTitle } });
          ensureMeta({ selector: 'meta[property="og:description"]',  createAttrs: { property: 'og:description' },  setAttrs: { content: productDesc } });
          ensureMeta({ selector: 'meta[property="og:url"]',          createAttrs: { property: 'og:url' },          setAttrs: { content: absoluteUrl } });
          ensureMeta({ selector: 'meta[property="og:image"]',        createAttrs: { property: 'og:image' },        setAttrs: { content: productImage } });
          ensureMeta({ selector: 'meta[property="og:type"]',         createAttrs: { property: 'og:type' },         setAttrs: { content: 'product' } });
          ensureMeta({ selector: 'meta[property="og:site_name"]',    createAttrs: { property: 'og:site_name' },    setAttrs: { content: 'NOREN' } });
          ensureMeta({ selector: 'meta[name="twitter:card"]',        createAttrs: { name: 'twitter:card' },        setAttrs: { content: 'summary_large_image' } });
          ensureMeta({ selector: 'meta[name="twitter:title"]',       createAttrs: { name: 'twitter:title' },       setAttrs: { content: productTitle } });
          ensureMeta({ selector: 'meta[name="twitter:description"]', createAttrs: { name: 'twitter:description' }, setAttrs: { content: productDesc } });
          ensureMeta({ selector: 'meta[name="twitter:url"]',         createAttrs: { name: 'twitter:url' },         setAttrs: { content: absoluteUrl } });
          ensureMeta({ selector: 'meta[name="twitter:image"]',       createAttrs: { name: 'twitter:image' },       setAttrs: { content: productImage } });
        })
        .catch(() => {
          // fallback to generic if fetch fails
          document.title = 'Product — NOREN';
        });
      return; // skip generic logic below for product pages
    }

    // Get page-specific SEO or fall back to defaults
    const pageSeo = SEO_CONFIG[cleanPath] || {
      title: 'NOREN  Luxury Fashion House',
      description: 'Premium luxury unisex fashion. Timeless by design. Crafted beyond trends.',
    };

    // Title
    document.title = pageSeo.title;

    // Description
    ensureMeta({ selector: 'meta[name="description"]', createAttrs: { name: 'description' }, setAttrs: { content: pageSeo.description } });

    // Canonical
    ensureLink({ selector: 'link[rel="canonical"]', createAttrs: { rel: 'canonical' }, setAttrs: { href: absoluteUrl } });

    // OG
    ensureMeta({ selector: 'meta[property="og:title"]',       createAttrs: { property: 'og:title' },       setAttrs: { content: pageSeo.title } });
    ensureMeta({ selector: 'meta[property="og:description"]', createAttrs: { property: 'og:description' }, setAttrs: { content: pageSeo.description } });
    ensureMeta({ selector: 'meta[property="og:url"]',         createAttrs: { property: 'og:url' },         setAttrs: { content: absoluteUrl } });
    ensureMeta({ selector: 'meta[property="og:image"]',       createAttrs: { property: 'og:image' },       setAttrs: { content: DEFAULT_OG_IMAGE } });
    ensureMeta({ selector: 'meta[property="og:site_name"]',   createAttrs: { property: 'og:site_name' },   setAttrs: { content: 'NOREN' } });

    // Twitter
    ensureMeta({ selector: 'meta[name="twitter:title"]',       createAttrs: { name: 'twitter:title' },       setAttrs: { content: pageSeo.title } });
    ensureMeta({ selector: 'meta[name="twitter:description"]', createAttrs: { name: 'twitter:description' }, setAttrs: { content: pageSeo.description } });
    ensureMeta({ selector: 'meta[name="twitter:url"]',         createAttrs: { name: 'twitter:url' },         setAttrs: { content: absoluteUrl } });
    ensureMeta({ selector: 'meta[name="twitter:image"]',       createAttrs: { name: 'twitter:image' },       setAttrs: { content: DEFAULT_OG_IMAGE } });

    // JSON-LD update
    const ld = document.head.querySelector('script[type="application/ld+json"]');
    if (ld?.textContent) {
      try {
        const data = JSON.parse(ld.textContent);
        if (data && typeof data === 'object') {
          data.url  = `${SITE_URL}/`;
          data.logo = `${SITE_URL}/logo.png`;
          if (data.name === 'NOREN') data.name = 'NOREN';
          ld.textContent = JSON.stringify(data);
        }
      } catch { /* ignore */ }
    }
  }, [location.pathname, location.search]);

  return null;
}

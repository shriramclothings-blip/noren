import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const SITE_URL = 'https://www.norenfastion.shop';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

const SEO_CONFIG = {
  '/': {
    title: 'NOREN - Wear the Silence. Premium Luxury Fashion India.',
    description: "India's premium unisex luxury fashion house. Oversized T-Shirts, Shirts, Jeans, Jackets & more. Quiet luxury. Bold identity. Shop NOREN - crafted for those who move with purpose.",
  },
  '/shop': {
    title: 'Shop NOREN - Premium Fashion for Men & Women India.',
    description: 'Shop premium fashion for men & women at NOREN. Kurtis, Anarkali, Salwar Suits, T-Shirts, Shirts, Jeans, Jackets & more. Indian & western wear. Shop now.',
  },
  '/cart': {
    title: 'Your Bag - NOREN Luxury Fashion',
    description: 'Your NOREN selections are waiting. Review your bag, confirm your style choices and move to a fast, secure checkout. Free delivery on eligible orders.',
  },
  '/checkout': {
    title: 'Secure Checkout - NOREN',
    description: 'Complete your NOREN order in seconds. Secure payment via UPI, Card or COD. Fast delivery across India. Hassle-free returns guaranteed.',
  },
  '/login': {
    title: 'Sign In - NOREN | Your Fashion Account',
    description: 'Sign in to your NOREN account. Track your orders, manage your wishlist, access exclusive drops and enjoy a personalised luxury shopping experience.',
  },
  '/register': {
    title: 'Join NOREN - Create Your Account',
    description: 'Become part of the NOREN community. Create your account for early access to new drops, exclusive offers and a fully personalised fashion experience.',
  },
  '/wishlist': {
    title: 'Your Wishlist - NOREN',
    description: "Your saved NOREN pieces - all in one place. Revisit your favourites, check availability and add to your bag when you're ready.",
  },
  '/orders': {
    title: 'My Orders - NOREN',
    description: 'Track and manage all your NOREN orders. View order history, live delivery status, invoice details and initiate returns - all from your account.',
  },
  '/profile': {
    title: 'My Profile - NOREN',
    description: 'Manage your NOREN account - update personal details, saved addresses, notification preferences and password. Your identity, your control.',
  },
  '/contact': {
    title: 'Contact NOREN - We Are Here to Help',
    description: 'Questions about your order, sizing or returns? Reach out to the NOREN team. We respond fast. Email, phone or form - we have got you covered.',
  },
  '/track-query': {
    title: 'Track Your Query - NOREN Support',
    description: 'Track the status of your NOREN support request. Enter your query ID and get real-time updates on your issue resolution.',
  },
  '/privacy': {
    title: 'Privacy Policy - NOREN',
    description: 'Read how NOREN collects, uses and protects your personal data. Your privacy matters - transparent, GDPR-aligned and customer-first.',
  },
  '/terms': {
    title: 'Terms & Conditions - NOREN',
    description: "NOREN's complete terms of service - shopping, account usage, returns and platform rules. Simple, clear and fair.",
  },
  '/shipping': {
    title: 'Shipping Policy - NOREN | Fast Delivery Across India',
    description: 'NOREN delivers across India. Read our shipping timelines, delivery partners, charges and tracking process. Most orders delivered within 4-7 business days.',
  },
  '/refund': {
    title: 'Refund Policy - NOREN',
    description: 'NOREN refund process - simple, transparent and customer-first. Understand eligibility, timelines and how to raise a refund request.',
  },
  '/return-policy': {
    title: 'Return Policy - NOREN | Hassle-Free Returns',
    description: 'Easy 7-day returns on eligible NOREN orders. No questions asked. Read how to initiate a return, what qualifies and how quickly you get refunded.',
  },
  '/cancellation': {
    title: 'Cancellation Policy - NOREN',
    description: 'Need to cancel your NOREN order? Read our cancellation policy - when you can cancel, how to do it and what happens next.',
  },
  '/cookies': {
    title: 'Cookie Policy - NOREN',
    description: 'Understand how NOREN uses cookies to improve your shopping experience. Manage your cookie preferences anytime.',
  },
  '/disclaimer': {
    title: 'Disclaimer - NOREN',
    description: 'Legal disclaimer for use of the NOREN website and platform. Read before using our services.',
  },
  '/legal': {
    title: 'Legal Notice - NOREN',
    description: "NOREN's legal notice - company information, intellectual property rights and platform ownership details.",
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

function applyFullSeo({ title, description, url, image }) {
  document.title = title;
  const img = image || DEFAULT_OG_IMAGE;

  ensureMeta({ selector: 'meta[name="description"]',         createAttrs: { name: 'description' },         setAttrs: { content: description } });
  ensureLink({ selector: 'link[rel="canonical"]',             createAttrs: { rel: 'canonical' },            setAttrs: { href: url } });
  ensureMeta({ selector: 'meta[property="og:title"]',        createAttrs: { property: 'og:title' },        setAttrs: { content: title } });
  ensureMeta({ selector: 'meta[property="og:description"]',  createAttrs: { property: 'og:description' },  setAttrs: { content: description } });
  ensureMeta({ selector: 'meta[property="og:url"]',          createAttrs: { property: 'og:url' },          setAttrs: { content: url } });
  ensureMeta({ selector: 'meta[property="og:image"]',        createAttrs: { property: 'og:image' },        setAttrs: { content: img } });
  ensureMeta({ selector: 'meta[property="og:site_name"]',    createAttrs: { property: 'og:site_name' },    setAttrs: { content: 'NOREN' } });
  ensureMeta({ selector: 'meta[name="twitter:title"]',       createAttrs: { name: 'twitter:title' },       setAttrs: { content: title } });
  ensureMeta({ selector: 'meta[name="twitter:description"]', createAttrs: { name: 'twitter:description' }, setAttrs: { content: description } });
  ensureMeta({ selector: 'meta[name="twitter:url"]',         createAttrs: { name: 'twitter:url' },         setAttrs: { content: url } });
  ensureMeta({ selector: 'meta[name="twitter:image"]',       createAttrs: { name: 'twitter:image' },       setAttrs: { content: img } });
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const cleanPath = location.pathname;
    const search    = location.search;
    const params    = new URLSearchParams(search);
    const gender    = params.get('gender')   || '';
    const category  = params.get('category') || '';
    const absoluteUrl = `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}${search}`;

    // -- Product detail page --------------------------------------------------
    const productMatch = cleanPath.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      const productId = productMatch[1];
      api.get(`/products/${productId}`)
        .then(r => {
          const p = r.data;
          const name  = p.title || 'Premium Product';
          const cat   = p.category_name ? ` | ${p.category_name}` : '';
          const price = p.price ? ` Starting Rs.${Number(p.price).toLocaleString('en-IN')}` : '';
          const title = `${name} - NOREN${cat}`;

          let description;
          if (p.description && p.description.trim().length > 20) {
            const trimmed = p.description.trim().replace(/\s+/g, ' ').slice(0, 120);
            description = `${trimmed}... Shop ${name} on NOREN.${price}`;
          } else {
            description = `Shop ${name} on NOREN - India's premium fashion house.${cat}${price} Free delivery. Easy 7-day returns.`;
          }
          if (description.length > 155) description = description.slice(0, 152) + '...';

          const image = p.images?.[0]?.image_url || p.primary_image || DEFAULT_OG_IMAGE;
          applyFullSeo({ title, description, url: `${SITE_URL}/product/${productId}`, image });
          ensureMeta({ selector: 'meta[property="og:type"]', createAttrs: { property: 'og:type' }, setAttrs: { content: 'product' } });
        })
        .catch(() => { document.title = 'Premium Product - NOREN'; });
      return;
    }

    // -- Shop page: dynamic SEO based on gender + category --------------------
    if (cleanPath === '/shop') {
      let title, description;

      if (gender === 'women' && category) {
        const catLabel = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        title       = `${catLabel} for Women - NOREN | Premium Indian & Western Wear`;
        description = `Shop premium ${catLabel} for women at NOREN. Exclusive Indian & western wear collection. Kurtis, Anarkali, Salwar Suits, Dresses, Tops & more. Free delivery on eligible orders.`;
      } else if (gender === 'women') {
        title       = "Women's Fashion - NOREN | Indian & Western Wear Online";
        description = "Shop women's fashion at NOREN - India's premium unisex fashion house. Kurtis, Anarkali Suits, Salwar Suits, Dresses, Co-Ord Sets, Tops & Ethnic Wear. Indian & western styles. Shop now.";
      } else if (gender === 'men' && category) {
        const catLabel = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        title       = `${catLabel} for Men - NOREN | Premium Luxury Fashion`;
        description = `Shop premium ${catLabel} for men at NOREN. Oversized T-Shirts, Shirts, Jeans, Jackets, Hoodies & more. Quiet luxury. Bold identity. Free delivery on eligible orders.`;
      } else if (gender === 'men') {
        title       = "Men's Fashion - NOREN | Premium Luxury Clothing India";
        description = "Shop men's premium fashion at NOREN. Oversized T-Shirts, Shirts, Polo, Jeans, Jackets, Hoodies, Ethnic Wear & more. Quiet luxury. Bold identity. New arrivals daily.";
      } else if (category) {
        const catLabel = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        title       = `${catLabel} - NOREN | Premium Fashion for Everyone`;
        description = `Shop ${catLabel} at NOREN - premium fashion for men & women. Indian & western wear. Free delivery on eligible orders. Easy 7-day returns.`;
      } else {
        title       = 'Shop NOREN - Premium Fashion for Men & Women India.';
        description = 'Shop premium fashion for men & women at NOREN. Kurtis, Anarkali, Salwar Suits, T-Shirts, Shirts, Jeans, Jackets & more. Indian & western wear. Shop now.';
      }

      if (description.length > 155) description = description.slice(0, 152) + '...';
      applyFullSeo({ title, description, url: absoluteUrl });
      return;
    }

    // -- All other pages ------------------------------------------------------
    const pageSeo = SEO_CONFIG[cleanPath] || {
      title: 'NOREN - Premium Fashion for Men & Women India',
      description: "India's premium unisex fashion house. Indian & western wear for men & women. Kurtis, T-Shirts, Shirts, Jeans, Jackets & more at NOREN.",
    };

    applyFullSeo({ title: pageSeo.title, description: pageSeo.description, url: `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}` });

    const ld = document.head.querySelector('script[type="application/ld+json"]');
    if (ld?.textContent) {
      try {
        const data = JSON.parse(ld.textContent);
        if (data && typeof data === 'object') {
          data.url  = `${SITE_URL}/`;
          data.logo = `${SITE_URL}/logo.png`;
          ld.textContent = JSON.stringify(data);
        }
      } catch { /* ignore */ }
    }
  }, [location.pathname, location.search]);

  return null;
}

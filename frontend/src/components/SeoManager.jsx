import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const SITE_URL = 'https://www.norenfastion.shop';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const BRAND = 'NOREN';

const SEO_CONFIG = {
  '/': {
    title: 'NOREN - Premium Fashion for Men & Women | Indian & Western Wear India',
    description: "India's premium unisex fashion house for men & women. Shop Kurtis, Anarkali Suits, T-Shirts, Shirts, Jeans, Jackets & more. Free delivery. Easy returns.",
  },
  '/shop': {
    title: 'Shop NOREN - Premium Fashion for Men & Women India',
    description: 'Shop premium Indian & western fashion at NOREN. Kurtis, Anarkali, Salwar Suits, T-Shirts, Shirts, Jeans, Jackets & more for men & women. Shop now.',
  },
  '/cart':          { title: 'Your Bag - NOREN',                         description: 'Review your NOREN selections. Secure checkout with UPI, Card or COD. Free delivery on eligible orders.' },
  '/checkout':      { title: 'Secure Checkout - NOREN',                  description: 'Complete your NOREN order. Secure payment via UPI, Card or COD. Fast delivery across India.' },
  '/login':         { title: 'Sign In - NOREN | Your Fashion Account',   description: 'Sign in to your NOREN account. Track orders, manage wishlist and access exclusive new drops.' },
  '/register':      { title: 'Join NOREN - Create Your Account',         description: 'Create your NOREN account for early access to new drops, exclusive offers and personalised fashion.' },
  '/wishlist':      { title: 'Your Wishlist - NOREN',                    description: 'Your saved NOREN pieces. Revisit favourites and add to bag when ready.' },
  '/orders':        { title: 'My Orders - NOREN',                        description: 'Track and manage all your NOREN orders. View history, delivery status and initiate returns.' },
  '/profile':       { title: 'My Profile - NOREN',                       description: 'Manage your NOREN account - personal details, addresses, preferences and password.' },
  '/contact':       { title: 'Contact NOREN - We Are Here to Help',      description: 'Questions about orders, sizing or returns? Contact NOREN. Fast response via email, phone or form.' },
  '/track-query':   { title: 'Track Your Query - NOREN Support',         description: 'Track your NOREN support request. Enter query ID for real-time updates.' },
  '/privacy':       { title: 'Privacy Policy - NOREN',                   description: 'How NOREN collects, uses and protects your personal data. Transparent and customer-first.' },
  '/terms':         { title: 'Terms & Conditions - NOREN',               description: "NOREN's terms of service - shopping, account usage, returns and platform rules." },
  '/shipping':      { title: 'Shipping Policy - NOREN | Fast Delivery Across India', description: 'NOREN ships across India in 4-7 business days. Read shipping timelines and charges.' },
  '/refund':        { title: 'Refund Policy - NOREN',                    description: 'NOREN refund process - simple and customer-first. Eligibility, timelines and how to raise a refund.' },
  '/return-policy': { title: 'Return Policy - NOREN | 7-Day Easy Returns', description: 'Easy 7-day returns on eligible NOREN orders. No questions asked. Fast refund process.' },
  '/cancellation':  { title: 'Cancellation Policy - NOREN',              description: 'Cancel your NOREN order - when you can cancel, how to do it and what happens next.' },
  '/cookies':       { title: 'Cookie Policy - NOREN',                    description: 'How NOREN uses cookies to improve your shopping experience.' },
  '/disclaimer':    { title: 'Disclaimer - NOREN',                       description: 'Legal disclaimer for use of the NOREN website and platform.' },
  '/legal':         { title: 'Legal Notice - NOREN',                     description: "NOREN's legal notice - company information and intellectual property rights." },
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
  ensureMeta({ selector: 'meta[name="description"]',          createAttrs: { name: 'description' },          setAttrs: { content: description } });
  ensureLink({ selector: 'link[rel="canonical"]',              createAttrs: { rel: 'canonical' },             setAttrs: { href: url } });
  ensureMeta({ selector: 'meta[property="og:title"]',         createAttrs: { property: 'og:title' },         setAttrs: { content: title } });
  ensureMeta({ selector: 'meta[property="og:description"]',   createAttrs: { property: 'og:description' },   setAttrs: { content: description } });
  ensureMeta({ selector: 'meta[property="og:url"]',           createAttrs: { property: 'og:url' },           setAttrs: { content: url } });
  ensureMeta({ selector: 'meta[property="og:image"]',         createAttrs: { property: 'og:image' },         setAttrs: { content: img } });
  ensureMeta({ selector: 'meta[property="og:image:width"]',   createAttrs: { property: 'og:image:width' },   setAttrs: { content: '1200' } });
  ensureMeta({ selector: 'meta[property="og:image:height"]',  createAttrs: { property: 'og:image:height' },  setAttrs: { content: '630' } });
  ensureMeta({ selector: 'meta[property="og:site_name"]',     createAttrs: { property: 'og:site_name' },     setAttrs: { content: BRAND } });
  ensureMeta({ selector: 'meta[name="twitter:card"]',         createAttrs: { name: 'twitter:card' },         setAttrs: { content: 'summary_large_image' } });
  ensureMeta({ selector: 'meta[name="twitter:title"]',        createAttrs: { name: 'twitter:title' },        setAttrs: { content: title } });
  ensureMeta({ selector: 'meta[name="twitter:description"]',  createAttrs: { name: 'twitter:description' },  setAttrs: { content: description } });
  ensureMeta({ selector: 'meta[name="twitter:url"]',          createAttrs: { name: 'twitter:url' },          setAttrs: { content: url } });
  ensureMeta({ selector: 'meta[name="twitter:image"]',        createAttrs: { name: 'twitter:image' },        setAttrs: { content: img } });
}

function injectOrUpdateSchema(id, data) {
  let el = document.head.querySelector(`#${id}`);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeSchema(id) {
  const el = document.head.querySelector(`#${id}`);
  if (el) el.remove();
}

function injectProductSchema(p, productUrl) {
  const price      = parseFloat(p.price || 0);
  const discount   = parseFloat(p.discount_percent || 0);
  const finalPrice = discount > 0 ? (price * (1 - discount / 100)).toFixed(2) : price.toFixed(2);

  const images = (p.images || []).map(i => i.image_url).filter(Boolean);
  if (p.primary_image && !images.includes(p.primary_image)) images.unshift(p.primary_image);
  if (!images.length) images.push(DEFAULT_OG_IMAGE);

  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const makeOffer = (extra = {}) => ({
    '@type': 'Offer',
    url: productUrl,
    priceCurrency: 'INR',
    price: finalPrice,
    priceValidUntil: expiry,
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: BRAND },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
    },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'INR' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
        transitTime:  { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' },
      },
    },
    ...extra,
  });

  const variants = p.variants || [];
  const offers = variants.length > 0
    ? variants.map(v => makeOffer({
        availability: (v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        name: v.size ? `${p.title} - Size ${v.size}` : p.title,
      }))
    : [makeOffer()];

  const reviewCount = parseInt(p.review_count || 0);
  const avgRating   = parseFloat(p.avg_rating  || 0);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.description || `${p.title} - Premium ${p.gender === 'women' ? "women's" : p.gender === 'men' ? "men's" : 'unisex'} fashion by NOREN.`,
    image: images,
    url: productUrl,
    sku: `NOREN-${p.id}`,
    mpn: `NOREN-${p.id}`,
    brand: { '@type': 'Brand', name: BRAND },
    category: p.category_name || 'Fashion',
    offers: offers.length === 1 ? offers[0] : {
      '@type': 'AggregateOffer',
      lowPrice: finalPrice,
      highPrice: finalPrice,
      priceCurrency: 'INR',
      offerCount: offers.length,
      offers,
    },
    ...(reviewCount > 0 && avgRating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating.toFixed(1),
        reviewCount,
        bestRating: '5',
        worstRating: '1',
      },
    } : {}),
    ...(p.reviews && p.reviews.length > 0 ? {
      review: p.reviews.slice(0, 5).map(r => ({
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: '5' },
        author: { '@type': 'Person', name: r.user_name || 'NOREN Customer' },
        reviewBody: r.comment || r.rating_label || 'Great product',
        datePublished: r.created_at ? r.created_at.split('T')[0] : undefined,
      })),
    } : {}),
  };

  injectOrUpdateSchema('noren-product-schema', schema);
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const cleanPath = location.pathname;
    const search    = location.search;
    const params    = new URLSearchParams(search);
    const gender    = params.get('gender')   || '';
    const category  = params.get('category') || '';

    // ── Product page ──────────────────────────────────────────────────────────
    const productMatch = cleanPath.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      const productId  = productMatch[1];
      const productUrl = `${SITE_URL}/product/${productId}`;

      api.get(`/products/${productId}`).then(r => {
        const p           = r.data;
        const name        = p.title || 'Premium Product';
        const cat         = p.category_name || '';
        const genderLabel = p.gender === 'women' ? "Women's " : p.gender === 'men' ? "Men's " : '';
        const priceStr    = p.price ? ` Rs.${Number(p.price).toLocaleString('en-IN')}` : '';
        const title       = cat ? `${name} - ${genderLabel}${cat} | NOREN` : `${name} | NOREN`;

        let description;
        if (p.description && p.description.trim().length > 20) {
          const trimmed = p.description.trim().replace(/\s+/g, ' ').slice(0, 110);
          description = `${trimmed}... Buy ${name} at NOREN.${priceStr} Free delivery. 7-day returns.`;
        } else {
          description = `Buy ${name} at NOREN - India's premium ${genderLabel.toLowerCase()}fashion.${cat ? ` ${cat}.` : ''}${priceStr} Free delivery. Easy 7-day returns.`;
        }
        if (description.length > 155) description = description.slice(0, 152) + '...';

        const image = p.images?.[0]?.image_url || p.primary_image || DEFAULT_OG_IMAGE;
        applyFullSeo({ title, description, url: productUrl, image });
        ensureMeta({ selector: 'meta[property="og:type"]',               createAttrs: { property: 'og:type' },               setAttrs: { content: 'product' } });
        ensureMeta({ selector: 'meta[property="product:price:amount"]',   createAttrs: { property: 'product:price:amount' },   setAttrs: { content: String(p.price || '') } });
        ensureMeta({ selector: 'meta[property="product:price:currency"]', createAttrs: { property: 'product:price:currency' }, setAttrs: { content: 'INR' } });
        ensureMeta({ selector: 'meta[property="product:availability"]',   createAttrs: { property: 'product:availability' },   setAttrs: { content: 'in stock' } });
        ensureMeta({ selector: 'meta[property="product:brand"]',          createAttrs: { property: 'product:brand' },          setAttrs: { content: BRAND } });
        ensureMeta({ selector: 'meta[property="product:condition"]',      createAttrs: { property: 'product:condition' },      setAttrs: { content: 'new' } });
        injectProductSchema(p, productUrl);
      }).catch(() => {
        document.title = 'Premium Product - NOREN';
        removeSchema('noren-product-schema');
      });
      return;
    }

    removeSchema('noren-product-schema');

    // ── Homepage: ImageObject + ItemList for Google image sitelinks ───────────
    if (cleanPath === '/') {
      applyFullSeo({
        title:       SEO_CONFIG['/'].title,
        description: SEO_CONFIG['/'].description,
        url:         `${SITE_URL}/`,
      });

      // Fetch mix of men + women products for image strip
      Promise.all([
        api.get('/products?limit=6&sort=newest&gender=men').catch(() => ({ data: { products: [] } })),
        api.get('/products?limit=6&sort=newest&gender=women').catch(() => ({ data: { products: [] } })),
      ]).then(([menRes, womenRes]) => {
        // Interleave men and women for visual variety (man, woman, man, woman...)
        const men   = menRes.data.products   || [];
        const women = womenRes.data.products || [];
        const mixed = [];
        const max   = Math.max(men.length, women.length);
        for (let i = 0; i < max; i++) {
          if (men[i])   mixed.push(men[i]);
          if (women[i]) mixed.push(women[i]);
        }
        const products = mixed.slice(0, 10);
        if (!products.length) return;

        // ImageObject array — triggers Google image thumbnails in search results
        const imageObjects = products.map(p => {
          const img = p.primary_image || p.image_url;
          if (!img) return null;
          return {
            '@type': 'ImageObject',
            contentUrl: img,
            url: `${SITE_URL}/product/${p.id}`,
            name: `${p.title} - NOREN`,
            description: `${p.title} | ${p.category_name || 'Fashion'} | NOREN - Premium ${p.gender === 'women' ? "Women's" : "Men's"} Fashion India`,
            representativeOfPage: false,
            width: 800,
            height: 1000,
          };
        }).filter(Boolean);

        // ItemList schema — shows product listing in Google search
        const itemList = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'NOREN - Featured Products for Men & Women',
          description: "Shop premium fashion for men & women at NOREN - Kurtis, T-Shirts, Shirts, Jeans, Jackets & more",
          url: `${SITE_URL}/shop`,
          numberOfItems: products.length,
          itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/product/${p.id}`,
            name: p.title,
            image: p.primary_image || p.image_url,
          })),
        };

        // WebPage with associated images — the key schema for Google image sitelinks
        const webPage = {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${SITE_URL}/#webpage`,
          name: SEO_CONFIG['/'].title,
          url: `${SITE_URL}/`,
          description: SEO_CONFIG['/'].description,
          inLanguage: 'en-IN',
          image: imageObjects,
          primaryImageOfPage: imageObjects[0] || undefined,
          about: {
            '@type': 'ClothingStore',
            name: BRAND,
            url: `${SITE_URL}/`,
          },
        };

        injectOrUpdateSchema('noren-homepage-images', webPage);
        injectOrUpdateSchema('noren-item-list', itemList);
      });
      return;
    }

    removeSchema('noren-homepage-images');
    removeSchema('noren-item-list');

    // ── Shop page dynamic SEO ─────────────────────────────────────────────────
    if (cleanPath === '/shop') {
      let title, description;
      if (gender === 'women' && category) {
        const lbl = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        title       = `${lbl} for Women - NOREN | Buy Online India`;
        description = `Buy ${lbl} for women online at NOREN. Premium Indian & western wear. Free delivery. Easy 7-day returns.`;
      } else if (gender === 'women') {
        title       = "Women's Fashion Online - NOREN | Kurtis, Suits, Western Wear";
        description = "Shop women's fashion at NOREN. Kurtis, Anarkali Suits, Salwar Suits, Co-Ord Sets, Dresses, Tops & more. Free delivery across India.";
      } else if (gender === 'men' && category) {
        const lbl = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        title       = `${lbl} for Men - NOREN | Buy Online India`;
        description = `Buy premium ${lbl} for men at NOREN. Free delivery across India. Easy 7-day returns.`;
      } else if (gender === 'men') {
        title       = "Men's Fashion Online - NOREN | T-Shirts, Shirts, Jeans, Jackets";
        description = "Shop men's premium fashion at NOREN. Oversized T-Shirts, Shirts, Polo, Jeans, Jackets, Hoodies & Ethnic Wear. New arrivals daily. Free delivery.";
      } else if (category) {
        const lbl = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        title       = `${lbl} - NOREN | Premium Fashion India`;
        description = `Shop ${lbl} at NOREN - premium fashion for men & women. Free delivery. Easy 7-day returns.`;
      } else {
        title       = 'Shop NOREN - Premium Fashion for Men & Women India';
        description = 'Shop premium Indian & western fashion at NOREN. Kurtis, Anarkali, T-Shirts, Shirts, Jeans, Jackets & more. Free delivery.';
      }
      if (description.length > 155) description = description.slice(0, 152) + '...';
      applyFullSeo({ title, description, url: `${SITE_URL}/shop${search}` });
      return;
    }

    // ── All other pages ───────────────────────────────────────────────────────
    const pageSeo = SEO_CONFIG[cleanPath] || {
      title: 'NOREN - Premium Fashion for Men & Women India',
      description: "India's premium unisex fashion house. Kurtis, T-Shirts, Shirts, Jeans, Jackets & more at NOREN.",
    };
    applyFullSeo({
      title:       pageSeo.title,
      description: pageSeo.description,
      url:         `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}`,
    });

    const ld = document.head.querySelector('script[type="application/ld+json"]:not([id])');
    if (ld?.textContent) {
      try {
        const data = JSON.parse(ld.textContent);
        if (data && typeof data === 'object') {
          // Only update url — do NOT touch logo (it's already a proper ImageObject in index.html)
          data.url = `${SITE_URL}/`;
          ld.textContent = JSON.stringify(data);
        }
      } catch { /* ignore */ }
    }
  }, [location.pathname, location.search]);

  return null;
}

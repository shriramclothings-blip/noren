import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const SITE_URL         = 'https://www.norenfastion.shop';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const BRAND            = 'NOREN';

// ── Static page SEO config ───────────────────────────────────────────────────
const SEO_CONFIG = {
  '/': {
    title:       'NOREN - Premium Fashion for Men & Women | Indian & Western Wear India',
    description: "India's premium unisex fashion house for men & women. Shop Kurtis, Anarkali Suits, T-Shirts, Shirts, Jeans, Jackets & more. Free delivery. Easy returns.",
  },
  '/shop': {
    title:       'Shop NOREN - Premium Fashion for Men & Women India',
    description: 'Shop premium Indian & western fashion at NOREN. Kurtis, Anarkali, Salwar Suits, T-Shirts, Shirts, Jeans, Jackets & more for men & women. Shop now.',
  },
  '/cart':          { title: 'Your Bag - NOREN',                          description: 'Review your NOREN selections. Secure checkout with UPI, Card or COD. Free delivery on eligible orders.' },
  '/checkout':      { title: 'Secure Checkout - NOREN',                   description: 'Complete your NOREN order. Secure payment via UPI, Card or COD. Fast delivery across India.' },
  '/login':         { title: 'Sign In - NOREN | Your Fashion Account',    description: 'Sign in to your NOREN account. Track orders, manage wishlist and access exclusive new drops.' },
  '/register':      { title: 'Join NOREN - Create Your Account',          description: 'Create your NOREN account for early access to new drops, exclusive offers and personalised fashion.' },
  '/wishlist':      { title: 'Your Wishlist - NOREN',                     description: 'Your saved NOREN pieces. Revisit favourites and add to bag when ready.' },
  '/orders':        { title: 'My Orders - NOREN',                         description: 'Track and manage all your NOREN orders. View history, delivery status and initiate returns.' },
  '/profile':       { title: 'My Profile - NOREN',                        description: 'Manage your NOREN account - personal details, addresses, preferences and password.' },
  '/contact':       { title: 'Contact NOREN - We Are Here to Help',       description: 'Questions about orders, sizing or returns? Contact NOREN. Fast response via email, phone or form.' },
  '/track-query':   { title: 'Track Your Query - NOREN Support',          description: 'Track your NOREN support request. Enter query ID for real-time updates.' },
  '/privacy':       { title: 'Privacy Policy - NOREN',                    description: 'How NOREN collects, uses and protects your personal data. Transparent and customer-first.' },
  '/terms':         { title: 'Terms & Conditions - NOREN',                description: "NOREN's terms of service - shopping, account usage, returns and platform rules." },
  '/shipping':      { title: 'Shipping Policy - NOREN | Fast Delivery Across India', description: 'NOREN ships across India in 4-7 business days. Read shipping timelines and charges.' },
  '/refund':        { title: 'Refund Policy - NOREN',                     description: 'NOREN refund process - simple and customer-first. Eligibility, timelines and how to raise a refund.' },
  '/return-policy': { title: 'Return Policy - NOREN | 7-Day Easy Returns',description: 'Easy 7-day returns on eligible NOREN orders. No questions asked. Fast refund process.' },
  '/cancellation':  { title: 'Cancellation Policy - NOREN',               description: 'Cancel your NOREN order - when you can cancel, how to do it and what happens next.' },
  '/cookies':       { title: 'Cookie Policy - NOREN',                     description: 'How NOREN uses cookies to improve your shopping experience.' },
  '/disclaimer':    { title: 'Disclaimer - NOREN',                        description: 'Legal disclaimer for use of the NOREN website and platform.' },
  '/legal':         { title: 'Legal Notice - NOREN',                      description: "NOREN's legal notice - company information and intellectual property rights." },
};

// ── DOM helpers ──────────────────────────────────────────────────────────────
function setMeta(selector, createAttrs, setAttrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(createAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  Object.entries(setAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
}

function setLink(selector, createAttrs, setAttrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    Object.entries(createAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  Object.entries(setAttrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
}

/**
 * applyFullSeo — sets ALL meta tags needed for:
 *   - Google indexing (title, description, canonical, robots)
 *   - Facebook / WhatsApp / LinkedIn (og:*)
 *   - Twitter / X (twitter:*)
 *   - Product-specific (product:price:*)
 *
 * Key fixes vs the old version:
 *   1. og:image:secure_url — required by Facebook & WhatsApp for HTTPS images
 *   2. og:image:type       — explicitly declares image/jpeg so parsers don't guess
 *   3. og:image always uses the first available real product image, not a fallback
 *   4. twitter:image:src   — some crawlers use this variant
 *   5. noindex pages (cart, checkout, orders etc.) get robots=noindex,nofollow
 */
const NOINDEX_PATHS = new Set(['/cart','/checkout','/orders','/profile','/wishlist','/order-success','/order-failed']);

function applyFullSeo({ title, description, url, image, isProduct = false, price, noindex = false }) {
  const img   = image || DEFAULT_OG_IMAGE;
  // Force HTTPS — Cloudinary URLs are always https, but guard against http slipping through
  const imgHttps = img.replace(/^http:\/\//, 'https://');
  const robotsContent = noindex ? 'noindex,nofollow' : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1';

  document.title = title;

  // ── Core ──
  setMeta('meta[name="description"]',         { name: 'description' },         { content: description });
  setMeta('meta[name="robots"]',              { name: 'robots' },              { content: robotsContent });
  setLink('link[rel="canonical"]',            { rel: 'canonical' },            { href: url });

  // ── Open Graph ──
  setMeta('meta[property="og:type"]',         { property: 'og:type' },         { content: isProduct ? 'product' : 'website' });
  setMeta('meta[property="og:title"]',        { property: 'og:title' },        { content: title });
  setMeta('meta[property="og:description"]',  { property: 'og:description' },  { content: description });
  setMeta('meta[property="og:url"]',          { property: 'og:url' },          { content: url });
  setMeta('meta[property="og:site_name"]',    { property: 'og:site_name' },    { content: BRAND });
  setMeta('meta[property="og:locale"]',       { property: 'og:locale' },       { content: 'en_IN' });
  setMeta('meta[property="og:image"]',        { property: 'og:image' },        { content: imgHttps });
  setMeta('meta[property="og:image:secure_url"]', { property: 'og:image:secure_url' }, { content: imgHttps });
  setMeta('meta[property="og:image:type"]',   { property: 'og:image:type' },   { content: 'image/jpeg' });
  setMeta('meta[property="og:image:width"]',  { property: 'og:image:width' },  { content: '1200' });
  setMeta('meta[property="og:image:height"]', { property: 'og:image:height' }, { content: '630' });
  setMeta('meta[property="og:image:alt"]',    { property: 'og:image:alt' },    { content: title });

  // ── Twitter / X ──
  setMeta('meta[name="twitter:card"]',        { name: 'twitter:card' },        { content: 'summary_large_image' });
  setMeta('meta[name="twitter:title"]',       { name: 'twitter:title' },       { content: title });
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, { content: description });
  setMeta('meta[name="twitter:url"]',         { name: 'twitter:url' },         { content: url });
  setMeta('meta[name="twitter:image"]',       { name: 'twitter:image' },       { content: imgHttps });
  setMeta('meta[name="twitter:image:src"]',   { name: 'twitter:image:src' },   { content: imgHttps });
  setMeta('meta[name="twitter:image:alt"]',   { name: 'twitter:image:alt' },   { content: title });

  // ── Product-specific (Facebook & Google Shopping) ──
  if (isProduct && price) {
    setMeta('meta[property="product:price:amount"]',   { property: 'product:price:amount' },   { content: String(price) });
    setMeta('meta[property="product:price:currency"]', { property: 'product:price:currency' }, { content: 'INR' });
    setMeta('meta[property="product:availability"]',   { property: 'product:availability' },   { content: 'in stock' });
    setMeta('meta[property="product:brand"]',          { property: 'product:brand' },          { content: BRAND });
    setMeta('meta[property="product:condition"]',      { property: 'product:condition' },      { content: 'new' });
  }
}

// ── JSON-LD schema helpers ────────────────────────────────────────────────────
function injectSchema(id, data) {
  let el = document.head.querySelector(`#${id}`);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id   = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data, null, 0);
}
function removeSchema(id) {
  document.head.querySelector(`#${id}`)?.remove();
}

// ── Product JSON-LD (Google Shopping + rich results) ─────────────────────────
function injectProductSchema(p, productUrl) {
  const price      = parseFloat(p.price || 0);
  const discount   = parseFloat(p.discount_percent || 0);
  const finalPrice = (discount > 0 ? price * (1 - discount / 100) : price).toFixed(2);

  // ── Collect images: primary first, then all others, then fallback ──
  // Fixes: "Google not indexing products with their old description and sizes"
  // — we now send ALL images so Google picks the most relevant one
  const imageSet = new Set();
  if (p.images && p.images.length) {
    // Sort: primary first
    const sorted = [...p.images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
    sorted.forEach(i => { if (i.image_url) imageSet.add(i.image_url.replace(/^http:\/\//, 'https://')); });
  }
  if (p.primary_image) imageSet.add(p.primary_image.replace(/^http:\/\//, 'https://'));
  if (!imageSet.size)  imageSet.add(DEFAULT_OG_IMAGE);
  const images = [...imageSet];

  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const makeOffer = (extra = {}) => ({
    '@type':         'Offer',
    url:             productUrl,
    priceCurrency:   'INR',
    price:           finalPrice,
    priceValidUntil: expiry,
    availability:    'https://schema.org/InStock',
    itemCondition:   'https://schema.org/NewCondition',
    seller:          { '@type': 'Organization', name: BRAND },
    hasMerchantReturnPolicy: {
      '@type':                  'MerchantReturnPolicy',
      returnPolicyCategory:     'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays:       7,
      returnMethod:             'https://schema.org/ReturnByMail',
      returnFees:               'https://schema.org/FreeReturn',
    },
    shippingDetails: {
      '@type':               'OfferShippingDetails',
      shippingRate:          { '@type': 'MonetaryAmount', value: '0', currency: 'INR' },
      shippingDestination:   { '@type': 'DefinedRegion', addressCountry: 'IN' },
      deliveryTime: {
        '@type':       'ShippingDeliveryTime',
        handlingTime:  { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
        transitTime:   { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' },
      },
    },
    ...extra,
  });

  // Size variants — crucial for Google to index each size separately
  const variants = p.variants || [];
  const offers   = variants.length > 0
    ? variants.map(v => makeOffer({
        availability: (v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        name:         v.size ? `${p.title} - Size ${v.size}` : p.title,
        sku:          `NOREN-${p.id}-${(v.size || 'OS').replace(/\s/g, '')}`,
      }))
    : [makeOffer({ sku: `NOREN-${p.id}` })];

  const reviewCount = parseInt(p.review_count || 0);
  const avgRating   = parseFloat(p.avg_rating   || 0);

  const genderLabel = p.gender === 'women' ? "Women's" : p.gender === 'men' ? "Men's" : 'Unisex';

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'Product',
    '@id':      productUrl,
    name:        p.title,
    description: p.description && p.description.trim().length > 20
      ? p.description.trim().replace(/\s+/g, ' ')
      : `${p.title} - Premium ${genderLabel} fashion by NOREN. ${p.category_name || ''}.`.trim(),
    image:       images,
    url:         productUrl,
    sku:         `NOREN-${p.id}`,
    mpn:         `NOREN-${p.id}`,
    brand:       { '@type': 'Brand', name: BRAND },
    category:    p.category_name || 'Fashion',
    color:       p.color || undefined,
    material:    p.material || undefined,
    audience:    {
      '@type':      'PeopleAudience',
      suggestedGender: p.gender === 'women' ? 'female' : p.gender === 'men' ? 'male' : 'unisex',
    },
    offers: offers.length === 1 ? offers[0] : {
      '@type':       'AggregateOffer',
      lowPrice:      finalPrice,
      highPrice:     finalPrice,
      priceCurrency: 'INR',
      offerCount:    offers.length,
      offers,
    },
    ...(reviewCount > 0 && avgRating > 0 ? {
      aggregateRating: {
        '@type':       'AggregateRating',
        ratingValue:   avgRating.toFixed(1),
        reviewCount,
        bestRating:    '5',
        worstRating:   '1',
      },
    } : {}),
    ...(p.reviews && p.reviews.length > 0 ? {
      review: p.reviews.slice(0, 5).map(r => ({
        '@type':        'Review',
        reviewRating:   { '@type': 'Rating', ratingValue: r.rating, bestRating: '5' },
        author:         { '@type': 'Person', name: r.user_name || 'NOREN Customer' },
        reviewBody:     r.comment || r.rating_label || 'Great product',
        datePublished:  r.created_at ? r.created_at.split('T')[0] : undefined,
      })),
    } : {}),
  };

  // Strip undefined fields so JSON-LD is clean
  const clean = JSON.parse(JSON.stringify(schema));
  injectSchema('noren-product-schema', clean);
}

// ── BreadcrumbList schema for product pages ──────────────────────────────────
function injectBreadcrumbSchema(p, productUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',  item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Shop',  item: SITE_URL + '/shop' },
      ...(p.category_name ? [{ '@type': 'ListItem', position: 3, name: p.category_name, item: `${SITE_URL}/shop?category=${p.category_slug || ''}` }] : []),
      { '@type': 'ListItem', position: p.category_name ? 4 : 3, name: p.title, item: productUrl },
    ],
  };
  injectSchema('noren-breadcrumb-schema', schema);
}

// ── Main SeoManager component ─────────────────────────────────────────────────
export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const cleanPath = location.pathname;
    const search    = location.search;
    const params    = new URLSearchParams(search);
    const gender    = params.get('gender')   || '';
    const category  = params.get('category') || '';
    const isNoindex = NOINDEX_PATHS.has(cleanPath);

    // ── PRODUCT PAGE ─────────────────────────────────────────────────────────
    const productMatch = cleanPath.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      const productId  = productMatch[1];
      const productUrl = `${SITE_URL}/product/${productId}`;

      api.get(`/products/${productId}`).then(r => {
        const p = r.data;

        const name        = p.title || 'Premium Product';
        const cat         = p.category_name || '';
        const genderLabel = p.gender === 'women' ? "Women's " : p.gender === 'men' ? "Men's " : '';
        const price       = p.price ? Number(p.price) : null;
        const disc        = parseFloat(p.discount_percent || 0);
        const finalPrice  = price ? (disc > 0 ? Math.round(price * (1 - disc / 100)) : Math.round(price)) : null;
        const priceStr    = finalPrice ? ` ₹${finalPrice.toLocaleString('en-IN')}` : '';
        const title       = cat ? `${name} - ${genderLabel}${cat} | NOREN` : `${name} | NOREN`;

        // Description: use real product description if meaningful, else build one
        let description;
        if (p.description && p.description.trim().length > 30) {
          const trimmed = p.description.trim().replace(/\s+/g, ' ').slice(0, 110);
          description = `${trimmed}... Buy at NOREN.${priceStr} Free delivery. 7-day returns.`;
        } else {
          description = `Buy ${name} at NOREN - India's premium ${genderLabel.toLowerCase()}fashion.${cat ? ` ${cat}.` : ''}${priceStr} Free delivery. Easy 7-day returns.`;
        }
        if (description.length > 155) description = description.slice(0, 152) + '...';

        // ── Pick the best image for OG:
        //    1. Primary product image
        //    2. First image in the images array
        //    3. Fallback og-image.jpg
        let ogImage = DEFAULT_OG_IMAGE;
        if (p.images && p.images.length) {
          const primary = p.images.find(i => i.is_primary);
          ogImage = (primary?.image_url || p.images[0]?.image_url || DEFAULT_OG_IMAGE)
            .replace(/^http:\/\//, 'https://');
        } else if (p.primary_image) {
          ogImage = p.primary_image.replace(/^http:\/\//, 'https://');
        }

        applyFullSeo({ title, description, url: productUrl, image: ogImage, isProduct: true, price: finalPrice });
        injectProductSchema(p, productUrl);
        injectBreadcrumbSchema(p, productUrl);
      }).catch(() => {
        document.title = 'Premium Product - NOREN';
        removeSchema('noren-product-schema');
        removeSchema('noren-breadcrumb-schema');
      });
      return;
    }

    // Cleanup product schemas on non-product pages
    removeSchema('noren-product-schema');
    removeSchema('noren-breadcrumb-schema');

    // ── HOMEPAGE ─────────────────────────────────────────────────────────────
    if (cleanPath === '/') {
      applyFullSeo({
        title:       SEO_CONFIG['/'].title,
        description: SEO_CONFIG['/'].description,
        url:         `${SITE_URL}/`,
      });

      // Fetch mixed products to populate ImageObject + ItemList schemas
      Promise.all([
        api.get('/products?limit=6&sort=newest&gender=men').catch(() => ({ data: { products: [] } })),
        api.get('/products?limit=6&sort=newest&gender=women').catch(() => ({ data: { products: [] } })),
      ]).then(([menRes, womenRes]) => {
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

        const imageObjects = products.map(p => {
          const img = (p.primary_image || p.image_url || '').replace(/^http:\/\//, 'https://');
          if (!img) return null;
          return {
            '@type':                 'ImageObject',
            contentUrl:              img,
            url:                     `${SITE_URL}/product/${p.id}`,
            name:                    `${p.title} - NOREN`,
            description:             `${p.title} | ${p.category_name || 'Fashion'} | NOREN - Premium ${p.gender === 'women' ? "Women's" : "Men's"} Fashion India`,
            representativeOfPage:    false,
            width:                   800,
            height:                  1000,
          };
        }).filter(Boolean);

        const itemList = {
          '@context':     'https://schema.org',
          '@type':        'ItemList',
          name:           'NOREN - Featured Products for Men & Women',
          description:    'Shop premium fashion for men & women at NOREN — Kurtis, T-Shirts, Shirts, Jeans, Jackets & more',
          url:            `${SITE_URL}/shop`,
          numberOfItems:  products.length,
          itemListElement: products.map((p, i) => ({
            '@type':    'ListItem',
            position:   i + 1,
            url:        `${SITE_URL}/product/${p.id}`,
            name:       p.title,
            image:      (p.primary_image || p.image_url || '').replace(/^http:\/\//, 'https://'),
          })),
        };

        const webPage = {
          '@context':    'https://schema.org',
          '@type':       'WebPage',
          '@id':         `${SITE_URL}/#webpage`,
          name:          SEO_CONFIG['/'].title,
          url:           `${SITE_URL}/`,
          description:   SEO_CONFIG['/'].description,
          inLanguage:    'en-IN',
          image:         imageObjects,
          primaryImageOfPage: imageObjects[0] || undefined,
          about: { '@type': 'ClothingStore', name: BRAND, url: `${SITE_URL}/` },
        };

        injectSchema('noren-homepage-images', webPage);
        injectSchema('noren-item-list', itemList);
      });
      return;
    }

    removeSchema('noren-homepage-images');
    removeSchema('noren-item-list');

    // ── SHOP PAGE (dynamic per gender/category) ───────────────────────────────
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

    // ── ALL OTHER PAGES ───────────────────────────────────────────────────────
    const pageSeo = SEO_CONFIG[cleanPath] || {
      title:       'NOREN - Premium Fashion for Men & Women India',
      description: "India's premium unisex fashion house. Kurtis, T-Shirts, Shirts, Jeans, Jackets & more at NOREN.",
    };
    applyFullSeo({
      title:       pageSeo.title,
      description: pageSeo.description,
      url:         `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}`,
      noindex:     isNoindex,
    });

  }, [location.pathname, location.search]);

  return null;
}

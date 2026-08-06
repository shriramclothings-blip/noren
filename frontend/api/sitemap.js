// Vercel Serverless Function
// Route: /api/sitemap  →  rewritten from  /sitemap.xml  in vercel.json
// Proxies the live dynamic sitemap from the Render backend.

const BACKEND = 'https://noren-iqk3.onrender.com';

module.exports = async function handler(req, res) {
  try {
    const upstream = await fetch(`${BACKEND}/sitemap.xml`, {
      headers: { 'User-Agent': 'Vercel-Sitemap-Proxy/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) throw new Error(`Backend responded ${upstream.status}`);

    const xml = await upstream.text();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex'); // sitemap itself shouldn't be indexed
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(xml);

  } catch (err) {
    console.error('[sitemap proxy]', err.message);

    // Fallback — always return valid XML so Google never gets a 5xx
    const today = new Date().toISOString().split('T')[0];
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.norenfashion.shop/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.norenfashion.shop/shop</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.norenfashion.shop/contact</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.norenfashion.shop/login</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://www.norenfashion.shop/register</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://www.norenfashion.shop/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.norenfashion.shop/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.norenfashion.shop/shipping</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.norenfashion.shop/refund</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.norenfashion.shop/return-policy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(fallback);
  }
};

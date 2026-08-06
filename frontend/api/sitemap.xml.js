// Vercel Serverless Function — proxies dynamic sitemap from Render backend
// Accessible at: https://www.norenfashion.shop/sitemap.xml

const BACKEND = 'https://noren-iqk3.onrender.com';

module.exports = async function handler(req, res) {
  try {
    const upstream = await fetch(`${BACKEND}/sitemap.xml`, {
      headers: { 'User-Agent': 'Vercel-Sitemap-Proxy/1.0' },
      signal: AbortSignal.timeout(12000),
    });

    if (!upstream.ok) throw new Error(`Backend ${upstream.status}`);

    const xml = await upstream.text();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(xml);

  } catch (err) {
    console.error('Sitemap proxy error:', err.message);

    // Hardcoded fallback — never return an error to Google
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.norenfashion.shop/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.norenfashion.shop/shop</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.norenfashion.shop/contact</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(fallback);
  }
};

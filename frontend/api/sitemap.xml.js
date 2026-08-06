// Vercel Serverless Function — /api/sitemap.xml
// Fetches the dynamic sitemap from the Render backend and proxies it.
// This runs on Vercel's edge so www.norenfashion.shop/sitemap.xml works.

const BACKEND = 'https://noren-iqk3.onrender.com';

export default async function handler(req, res) {
  try {
    const upstream = await fetch(`${BACKEND}/sitemap.xml`, {
      headers: { 'User-Agent': 'Vercel-Sitemap-Proxy/1.0' },
      // 10-second timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      throw new Error(`Backend returned ${upstream.status}`);
    }

    const xml = await upstream.text();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600'); // fresh every 5 min
    res.status(200).send(xml);
  } catch (err) {
    // Fallback: return a minimal valid sitemap so Google never gets a hard error
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.norenfashion.shop/</loc><priority>1.0</priority></url>
  <url><loc>https://www.norenfashion.shop/shop</loc><priority>0.9</priority></url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(fallback);
  }
}

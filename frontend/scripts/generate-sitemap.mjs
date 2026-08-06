/**
 * generate-sitemap.mjs
 * Runs after vite build. Fetches the live sitemap from the Render backend
 * and writes it to dist/sitemap.xml so Vercel serves it as a static file.
 *
 * If the backend is unreachable (cold start / timeout), falls back to
 * a hardcoded sitemap with all static routes so Google never gets a 404.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST      = join(__dirname, '..', 'dist');
const BACKEND   = 'https://noren-iqk3.onrender.com';
const SITE      = 'https://www.norenfashion.shop';
const OUT       = join(DIST, 'sitemap.xml');

const today = new Date().toISOString().split('T')[0];

const FALLBACK = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE}/shop</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE}/contact</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE}/login</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${SITE}/register</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${SITE}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/shipping</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/refund</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/return-policy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/cancellation</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/cookies</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/disclaimer</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE}/legal</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>`;

async function run() {
  if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

  console.log('[sitemap] Fetching from backend...');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const res = await fetch(`${BACKEND}/sitemap.xml`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Vercel-Build-Sitemap/1.0' },
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xml = await res.text();

    // Sanity check — must contain our domain
    if (!xml.includes('norenfashion.shop')) {
      throw new Error('Sitemap contains wrong domain, using fallback');
    }

    writeFileSync(OUT, xml, 'utf8');
    console.log(`[sitemap] ✓ Written to dist/sitemap.xml (${xml.length} bytes)`);

  } catch (err) {
    console.warn(`[sitemap] Backend fetch failed: ${err.message} — using fallback`);
    writeFileSync(OUT, FALLBACK, 'utf8');
    console.log('[sitemap] ✓ Fallback sitemap written to dist/sitemap.xml');
  }
}

run();

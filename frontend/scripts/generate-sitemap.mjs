/**
 * generate-sitemap.mjs
 * Runs AFTER vite build during Vercel deployment.
 * Fetches live sitemap from Render backend → writes to dist/sitemap.xml
 * Retries up to 3 times to handle Render cold starts (free tier sleeps).
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const DIST   = join(__dir, '..', 'dist');
const OUT    = join(DIST, 'sitemap.xml');
const BACKEND = 'https://noren-iqk3.onrender.com/sitemap.xml';
const SITE    = 'https://www.norenfashion.shop';
const today   = new Date().toISOString().split('T')[0];

/* ── Fallback: all static routes with correct domain ─── */
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

/* ── Fetch with retry ────────────────────────────────── */
async function fetchWithRetry(url, retries = 3, timeoutMs = 30000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[sitemap] Attempt ${attempt}/${retries} — fetching ${url}`);
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), timeoutMs);
      const res  = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Vercel-Build-Sitemap/1.0' },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn(`[sitemap] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        const wait = attempt * 10000; // 10s, 20s between retries
        console.log(`[sitemap] Waiting ${wait / 1000}s before retry...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  return null;
}

/* ── Main ────────────────────────────────────────────── */
async function run() {
  if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

  const xml = await fetchWithRetry(BACKEND);

  if (xml && xml.includes('norenfashion.shop') && xml.includes('<urlset')) {
    writeFileSync(OUT, xml, 'utf8');
    const count = (xml.match(/<url>/g) || []).length;
    console.log(`[sitemap] ✓ Success — ${count} URLs written to dist/sitemap.xml`);
  } else {
    console.warn('[sitemap] Using fallback sitemap (backend unreachable or wrong data)');
    writeFileSync(OUT, FALLBACK, 'utf8');
    console.log('[sitemap] ✓ Fallback written to dist/sitemap.xml');
  }
}

run();

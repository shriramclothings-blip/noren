'use strict';

const { pool } = require('../config/db');

/**
 * Parse browser name and version from User-Agent string.
 */
function parseBrowser(ua) {
  if (!ua) return { browser: null, version: null };
  // Order matters — check Edge before Chrome
  const patterns = [
    { name: 'Edge',    re: /Edg\/([0-9.]+)/i },
    { name: 'Opera',   re: /(?:OPR|Opera)\/([0-9.]+)/i },
    { name: 'Samsung', re: /SamsungBrowser\/([0-9.]+)/i },
    { name: 'Chrome',  re: /Chrome\/([0-9.]+)/i },
    { name: 'Firefox', re: /Firefox\/([0-9.]+)/i },
    { name: 'Safari',  re: /Version\/([0-9.]+).*Safari/i },
    { name: 'IE',      re: /(?:MSIE |Trident.*rv:)([0-9.]+)/i },
  ];
  for (const { name, re } of patterns) {
    const m = ua.match(re);
    if (m) return { browser: name, version: m[1].split('.')[0] }; // major version only
  }
  return { browser: 'Other', version: null };
}

/**
 * Parse OS from User-Agent string.
 */
function parseOS(ua) {
  if (!ua) return null;
  if (/Windows NT 10/i.test(ua))   return 'Windows 10/11';
  if (/Windows NT 6\.3/i.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6\.1/i.test(ua)) return 'Windows 7';
  if (/Windows/i.test(ua))         return 'Windows';
  if (/Android ([0-9.]+)/i.test(ua)) {
    const v = ua.match(/Android ([0-9.]+)/i)?.[1];
    return `Android ${v?.split('.')[0] || ''}`.trim();
  }
  if (/iPhone OS ([0-9_]+)/i.test(ua)) {
    const v = ua.match(/iPhone OS ([0-9_]+)/i)?.[1]?.replace(/_/g, '.');
    return `iOS ${v?.split('.')[0] || ''}`.trim();
  }
  if (/iPad.*OS ([0-9_]+)/i.test(ua)) return 'iPadOS';
  if (/Mac OS X/i.test(ua))       return 'macOS';
  if (/Linux/i.test(ua))          return 'Linux';
  return 'Unknown';
}

/**
 * Parse device type from User-Agent string.
 */
function parseDevice(ua) {
  if (!ua) return 'desktop';
  if (/tablet|ipad/i.test(ua))          return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Get real client IP — handles proxies, Cloudflare, Render, Vercel, etc.
 */
function getClientIP(req) {
  const cf  = req.headers['cf-connecting-ip'];
  const fwd = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  const sock = req.socket?.remoteAddress || '';

  let ip = cf || (fwd ? fwd.split(',')[0].trim() : null) || real || sock;
  // Strip IPv6 mapped IPv4 prefix
  if (ip && ip.startsWith('::ffff:')) ip = ip.slice(7);
  return (ip || '').slice(0, 60);
}

/**
 * Fetch geolocation for an IP using ip-api.com (free, no key needed, 45 req/min).
 * Falls back gracefully on failure.
 */
async function fetchGeoLocation(ip) {
  // Skip for localhost / private ranges
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { city: 'Localhost', region: null, country: 'Local', country_code: 'LO', timezone: null, isp: null, lat: null, lon: null };
  }
  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      const req = https.get(`https://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode,timezone,isp,lat,lon`, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve({}); }
        });
      });
      req.setTimeout(4000, () => { req.destroy(); resolve({}); });
      req.on('error', () => resolve({}));
    });
    if (data.status === 'success') {
      return {
        city: data.city || null,
        region: data.regionName || null,
        country: data.country || null,
        country_code: data.countryCode || null,
        timezone: data.timezone || null,
        isp: data.isp || null,
        lat: data.lat || null,
        lon: data.lon || null,
      };
    }
  } catch { /* silently ignore */ }
  return { city: null, region: null, country: null, country_code: null, timezone: null, isp: null, lat: null, lon: null };
}

/**
 * Record a login session. Never throws — login must never fail due to this.
 */
async function recordSession(req, userId, authMethod = 'local') {
  try {
    const ua         = (req.headers['user-agent'] || '').slice(0, 500);
    const ip         = getClientIP(req);
    const device     = parseDevice(ua);
    const { browser, version: browserVersion } = parseBrowser(ua);
    const os         = parseOS(ua);

    // Check if this IP+user combo is new in last 30 days (suspicious = new location)
    const ipCheck = await pool.query(
      `SELECT id FROM src_login_sessions
       WHERE user_id=$1 AND ip_address=$2 AND logged_in_at > NOW() - INTERVAL '30 days'
       LIMIT 1`,
      [userId, ip]
    );
    const isSuspicious = ipCheck.rows.length === 0;

    // Fetch geo async — insert session immediately, update geo after
    const sessionRes = await pool.query(
      `INSERT INTO src_login_sessions
         (user_id, ip_address, user_agent, device_type, browser, browser_version, os,
          auth_method, is_suspicious, logged_in_at, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),TRUE)
       RETURNING id`,
      [userId, ip, ua, device, browser, browserVersion, os, authMethod, isSuspicious]
    );

    const sessionId = sessionRes.rows[0]?.id;
    if (!sessionId) return;

    // Fetch geo in background — do NOT await so login isn't delayed
    fetchGeoLocation(ip).then(geo => {
      pool.query(
        `UPDATE src_login_sessions
         SET city=$1, region=$2, country=$3, country_code=$4,
             timezone=$5, isp=$6, latitude=$7, longitude=$8,
             location=$9
         WHERE id=$10`,
        [
          geo.city, geo.region, geo.country, geo.country_code,
          geo.timezone, geo.isp, geo.lat, geo.lon,
          [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || null,
          sessionId,
        ]
      ).catch(() => {});
    });

  } catch (err) {
    // Never block login on session tracking failure
    console.warn('[SessionService] Failed to record session:', err.message);
  }
}

module.exports = { recordSession };

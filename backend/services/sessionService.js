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
 * Parse device type AND model from User-Agent string.
 * Returns { type, model } e.g. { type: 'mobile', model: 'Samsung Galaxy S21' }
 */
function parseDevice(ua) {
  if (!ua) return { type: 'desktop', model: null };

  // ── iPhone models ──────────────────────────────────────────────────────────
  const iphoneMatch = ua.match(/iPhone OS ([0-9_]+)/i);
  if (iphoneMatch) {
    const ver = iphoneMatch[1].replace(/_/g, '.');
    const major = parseInt(ver.split('.')[0]);
    // Approximate model from iOS version
    const iphoneModel =
      major >= 17 ? 'iPhone 15 / 16' :
      major >= 16 ? 'iPhone 14 / 15' :
      major >= 15 ? 'iPhone 13 / 14' :
      major >= 14 ? 'iPhone 12 / 13' :
      major >= 13 ? 'iPhone 11 / 12' :
      major >= 12 ? 'iPhone X / XS / XR' :
      'iPhone';
    return { type: 'mobile', model: iphoneModel };
  }

  // ── iPad ───────────────────────────────────────────────────────────────────
  if (/iPad/i.test(ua)) {
    return { type: 'tablet', model: 'iPad' };
  }

  // ── Samsung ────────────────────────────────────────────────────────────────
  const samsungMatch = ua.match(/Samsung(?:Browser)?[/ ][\d.]+.*?;\s*(SM-[A-Z0-9]+)/i)
    || ua.match(/;\s*(SM-[A-Z0-9]+)\s/i);
  if (samsungMatch) {
    return { type: 'mobile', model: `Samsung ${samsungMatch[1]}` };
  }

  // ── Generic Android device ─────────────────────────────────────────────────
  const androidMatch = ua.match(/\(Linux;.*?;\s*([^;)]+)\sBuild/i);
  if (androidMatch) {
    const model = androidMatch[1].trim();
    const type = /tablet/i.test(ua) ? 'tablet' : 'mobile';
    return { type, model: model.length > 2 ? model : null };
  }

  // ── Android without model ──────────────────────────────────────────────────
  if (/android/i.test(ua)) {
    return { type: 'mobile', model: 'Android Device' };
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  if (/Windows/i.test(ua)) return { type: 'desktop', model: 'Windows PC' };
  if (/Macintosh/i.test(ua)) return { type: 'desktop', model: 'Mac' };
  if (/Linux/i.test(ua)) return { type: 'desktop', model: 'Linux PC' };

  return { type: 'desktop', model: null };
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
 * Geolocation cache (in-memory) to reduce API calls for repeated IPs
 * Production: Consider Redis for distributed caching
 */
const geoLocationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch geolocation for an IP address using real public data sources.
 * 
 * Real data sources (FREE, no API keys required):
 * - ipwho.is: Real-time IP geolocation with high accuracy
 * - ip-api.com: Backup geolocation service
 * 
 * Returns:
 * - city, region, country: Real geographic location
 * - latitude, longitude: Exact GPS coordinates
 * - timezone, isp: Additional network information
 * - accuracy_radius: Accuracy estimate (in km)
 */
async function fetchGeoLocation(ip) {
  const EMPTY = { 
    city: null, region: null, country: null, country_code: null, 
    timezone: null, isp: null, lat: null, lon: null, accuracy_radius: null 
  };

  // Skip for localhost / private ranges
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { 
      city: 'Localhost', region: null, country: 'Local', country_code: 'LO', 
      timezone: null, isp: null, lat: null, lon: null, accuracy_radius: null 
    };
  }

  // Check cache first
  if (geoLocationCache.has(ip)) {
    const cached = geoLocationCache.get(ip);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    geoLocationCache.delete(ip); // Expired
  }

  // Helper: perform a GET request and return parsed JSON with timeout
  function fetchJson(url, timeout = 5000) {
    const mod = url.startsWith('https') ? require('https') : require('http');
    return new Promise((resolve) => {
      const req = mod.get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { resolve(null); }
        });
      });
      req.setTimeout(timeout, () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
    });
  }

  // ── Primary: ipwho.is (HTTPS, free, real-time) ────────────────────────────
  try {
    const d = await fetchJson(`https://ipwho.is/${ip}?fields=ip,country,country_code,region,city,latitude,longitude,timezone,isp,connection,type`, 6000);
    if (d && d.success) {
      const result = {
        city:         d.city         || null,
        region:       d.region       || null,
        country:      d.country      || null,
        country_code: d.country_code || null,
        timezone:     d.timezone?.id || null,
        isp:          d.connection?.isp || d.org || null,
        lat:          parseFloat(d.latitude)   || null,
        lon:          parseFloat(d.longitude)  || null,
        accuracy_radius: 10, // ipwho.is typically accurate within 10km for city level
        data_source: 'ipwho.is'
      };
      
      // Cache the result
      geoLocationCache.set(ip, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (e) { 
    console.warn(`ipwho.is lookup failed for ${ip}:`, e.message);
  }

  // ── Fallback: ip-api.com (HTTP, free tier) ─────────────────────────────────
  try {
    const d = await fetchJson(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode,timezone,isp,lat,lon,reverse`, 5000);
    if (d && d.status === 'success') {
      const result = {
        city:         d.city       || null,
        region:       d.regionName || null,
        country:      d.country    || null,
        country_code: d.countryCode || null,
        timezone:     d.timezone   || null,
        isp:          d.isp        || null,
        lat:          parseFloat(d.lat) || null,
        lon:          parseFloat(d.lon) || null,
        accuracy_radius: 15, // ip-api.com typically accurate within 15km for city level
        data_source: 'ip-api.com'
      };
      
      // Cache the result
      geoLocationCache.set(ip, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (e) { 
    console.warn(`ip-api.com lookup failed for ${ip}:`, e.message);
  }

  // Return empty data if all sources fail
  return EMPTY;
}

/**
 * Record a login session. Never throws — login must never fail due to this.
 */
async function recordSession(req, userId, authMethod = 'local') {
  try {
    const ua         = (req.headers['user-agent'] || '').slice(0, 500);
    const ip         = getClientIP(req);
    const { type: device, model: deviceModel } = parseDevice(ua);
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
         (user_id, ip_address, user_agent, device_type, device_model, browser, browser_version, os,
          auth_method, is_suspicious, logged_in_at, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),TRUE)
       RETURNING id`,
      [userId, ip, ua, device, deviceModel, browser, browserVersion, os, authMethod, isSuspicious]
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

module.exports = { recordSession, fetchGeoLocation };

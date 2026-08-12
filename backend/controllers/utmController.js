'use strict';

const { pool } = require('../config/db');
const { fetchGeoLocation } = require('../services/sessionService');

// ── helpers ───────────────────────────────────────────────────────────────────
function getIP(req) {
  const cf  = req.headers['cf-connecting-ip'];
  const fwd = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  let ip = cf || (fwd ? fwd.split(',')[0].trim() : null) || real || req.socket?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip.slice(0, 60);
}

function parseUA(ua = '') {
  // device type
  let device_type = 'desktop';
  if (/tablet|ipad/i.test(ua))               device_type = 'tablet';
  else if (/mobile|android|iphone|ipod/i.test(ua)) device_type = 'mobile';

  // device model
  let device_model = null;
  const iphoneM = ua.match(/iPhone OS ([0-9_]+)/i);
  if (iphoneM) {
    const major = parseInt(iphoneM[1]);
    device_model = major >= 17 ? 'iPhone 15/16' : major >= 16 ? 'iPhone 14/15' : major >= 15 ? 'iPhone 13/14' : major >= 14 ? 'iPhone 12/13' : 'iPhone';
  } else if (/iPad/i.test(ua)) {
    device_model = 'iPad';
  } else {
    const sm = ua.match(/;\s*(SM-[A-Z0-9]+)\s/i);
    if (sm) device_model = `Samsung ${sm[1]}`;
    else {
      const am = ua.match(/\(Linux;.*?;\s*([^;)]+)\sBuild/i);
      if (am) device_model = am[1].trim();
      else if (/Windows/i.test(ua)) device_model = 'Windows PC';
      else if (/Macintosh/i.test(ua)) device_model = 'Mac';
    }
  }

  // browser
  let browser = 'Other';
  for (const [name, re] of [
    ['Edge',    /Edg\/([0-9.]+)/i],
    ['Chrome',  /Chrome\/([0-9.]+)/i],
    ['Firefox', /Firefox\/([0-9.]+)/i],
    ['Safari',  /Version\/([0-9.]+).*Safari/i],
    ['Samsung', /SamsungBrowser\/([0-9.]+)/i],
  ]) {
    if (re.test(ua)) { browser = name; break; }
  }

  // OS
  let os = 'Unknown';
  if (/Windows NT 10/i.test(ua))     os = 'Windows 10/11';
  else if (/Windows/i.test(ua))      os = 'Windows';
  else if (/Android ([0-9]+)/i.test(ua)) os = `Android ${ua.match(/Android ([0-9]+)/i)[1]}`;
  else if (/iPhone OS/i.test(ua))    os = 'iOS';
  else if (/Mac OS X/i.test(ua))     os = 'macOS';
  else if (/Linux/i.test(ua))        os = 'Linux';

  return { device_type, device_model, browser, os };
}

function randomSlug() {
  return Math.random().toString(36).slice(2, 9); // 7-char slug e.g. "k3m9x2a"
}

// ── Public: redirect + track ──────────────────────────────────────────────────
// GET /t/:slug
const trackRedirect = async (req, res) => {
  const { slug } = req.params;
  try {
    const linkRes = await pool.query(
      `SELECT id, destination, is_active FROM src_utm_links WHERE slug = $1`, [slug]
    );
    if (!linkRes.rows.length || !linkRes.rows[0].is_active) {
      return res.redirect('https://www.norenfastion.shop/');
    }
    const link = linkRes.rows[0];

    // Redirect immediately
    res.redirect(302, link.destination);

    // Track click in background
    const ip         = getIP(req);
    const ua         = (req.headers['user-agent'] || '').slice(0, 500);
    const referer    = (req.headers['referer'] || req.headers['referrer'] || '').slice(0, 500);
    const { device_type, device_model, browser, os } = parseUA(ua);

    // Check if this IP clicked before (for unique count)
    const prevClick = await pool.query(
      `SELECT id FROM src_utm_clicks WHERE link_id=$1 AND ip_address=$2 LIMIT 1`,
      [link.id, ip]
    );
    const isUnique = prevClick.rows.length === 0;

    // Insert click
    pool.query(
      `INSERT INTO src_utm_clicks
         (link_id, ip_address, device_type, device_model, browser, os, referer, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [link.id, ip, device_type, device_model, browser, os, referer, ua.slice(0, 300)]
    ).catch(() => {});

    // Update counters
    pool.query(
      `UPDATE src_utm_links
       SET total_clicks  = total_clicks + 1,
           unique_clicks = unique_clicks + $1
       WHERE id = $2`,
      [isUnique ? 1 : 0, link.id]
    ).catch(() => {});

    // Geo lookup in background — update the click row
    fetchGeoLocation(ip).then(geo => {
      pool.query(
        `UPDATE src_utm_clicks SET city=$1, region=$2, country=$3, latitude=$4, longitude=$5
         WHERE link_id=$6 AND ip_address=$7 AND clicked_at=(
           SELECT clicked_at FROM src_utm_clicks
           WHERE link_id=$6 AND ip_address=$7
           ORDER BY clicked_at DESC LIMIT 1
         )`,
        [geo.city, geo.region, geo.country, geo.lat || null, geo.lon || null, link.id, ip]
      ).catch(() => {});

      // Emit real-time event to admin clients (non-blocking)
      try {
        const realtime = require('../realtime');
        const io = realtime.get();
        if (io) {
          const payload = {
            link_id: link.id,
            city: geo.city || null,
            region: geo.region || null,
            country: geo.country || null,
            latitude: geo.lat || null,
            longitude: geo.lon || null,
            ip_address: ip ? ip.replace(/\.(\d+)$/, '.xxx') : null,
            clicked_at: new Date().toISOString(),
          };
          io.emit('utm:click', payload);
        }
      } catch (err) {
        console.warn('Failed to emit realtime utm click:', err.message);
      }
    });

  } catch (err) {
    console.error('trackRedirect error:', err.message);
    res.redirect('https://www.norenfastion.shop/');
  }
};

// ── Admin: list all links ─────────────────────────────────────────────────────
const listLinks = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.name AS creator_name
       FROM src_utm_links l
       LEFT JOIN src_users u ON u.id = l.created_by
       ORDER BY l.created_at DESC`
    );
    res.json({ links: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: create link ────────────────────────────────────────────────────────
const createLink = async (req, res) => {
  const { name, destination, source, medium, campaign } = req.body;
  if (!name || !destination) return res.status(400).json({ message: 'name and destination are required' });

  // Build UTM destination URL
  let dest = destination.trim();
  try {
    const url  = new URL(dest);
    if (source)   url.searchParams.set('utm_source',   source);
    if (medium)   url.searchParams.set('utm_medium',   medium);
    if (campaign) url.searchParams.set('utm_campaign', campaign);
    dest = url.toString();
  } catch { /* invalid URL — store as-is */ }

  const slug = randomSlug();
  try {
    const { rows } = await pool.query(
      `INSERT INTO src_utm_links (created_by, name, slug, destination, source, medium, campaign)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, name.trim(), slug, dest, source || null, medium || null, campaign || null]
    );
    res.status(201).json({ link: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: delete link ────────────────────────────────────────────────────────
const deleteLink = async (req, res) => {
  try {
    await pool.query(`DELETE FROM src_utm_links WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Link deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: get clicks for a link ──────────────────────────────────────────────
const getLinkClicks = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM src_utm_clicks
       WHERE link_id = $1
       ORDER BY clicked_at DESC
       LIMIT 200`,
      [req.params.id]
    );
    res.json({ clicks: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { trackRedirect, listLinks, createLink, deleteLink, getLinkClicks };

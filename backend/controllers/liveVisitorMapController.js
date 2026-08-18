'use strict';

const { pool } = require('../config/db');
const { fetchGeoLocation } = require('../services/sessionService');

// Fallback coordinate lookup dictionary for countries & cities
const GEO_LOOKUP = {
  // Cities
  'mumbai': { lat: 19.0760, lon: 72.8777 },
  'delhi': { lat: 28.6139, lon: 77.2090 },
  'new delhi': { lat: 28.6139, lon: 77.2090 },
  'bangalore': { lat: 12.9716, lon: 77.5946 },
  'bengaluru': { lat: 12.9716, lon: 77.5946 },
  'hyderabad': { lat: 17.3850, lon: 78.4867 },
  'ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'chennai': { lat: 13.0827, lon: 80.2707 },
  'kolkata': { lat: 22.5726, lon: 88.3639 },
  'surat': { lat: 21.1702, lon: 72.8311 },
  'pune': { lat: 18.5204, lon: 73.8567 },
  'bharuch': { lat: 21.7051, lon: 72.9959 },
  'vadodara': { lat: 22.3072, lon: 73.1812 },
  'rajkot': { lat: 22.3039, lon: 70.8022 },
  'jaipur': { lat: 26.9124, lon: 75.7873 },
  'lucknow': { lat: 26.8467, lon: 80.9462 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'paris': { lat: 48.8566, lon: 2.3522 },
  'tokyo': { lat: 35.6762, lon: 139.6503 },
  'dubai': { lat: 25.2048, lon: 55.2708 },
  'singapore': { lat: 1.3521, lon: 103.8198 },
  'sydney': { lat: -33.8688, lon: 151.2093 },
  'melbourne': { lat: -37.8136, lon: 144.9631 },
  'toronto': { lat: 43.6532, lon: -79.3832 },
  'berlin': { lat: 52.5200, lon: 13.4050 },
  // Countries
  'india': { lat: 20.5937, lon: 78.9629 },
  'united states': { lat: 37.0902, lon: -95.7129 },
  'usa': { lat: 37.0902, lon: -95.7129 },
  'us': { lat: 37.0902, lon: -95.7129 },
  'united kingdom': { lat: 55.3781, lon: -3.4360 },
  'uk': { lat: 55.3781, lon: -3.4360 },
  'canada': { lat: 56.1304, lon: -106.3468 },
  'australia': { lat: -25.2744, lon: 133.7751 },
  'germany': { lat: 51.1657, lon: 10.4515 },
  'france': { lat: 46.2276, lon: 2.2137 },
  'japan': { lat: 36.2048, lon: 138.2529 },
  'united arab emirates': { lat: 23.4241, lon: 53.8478 },
  'uae': { lat: 23.4241, lon: 53.8478 },
  'russia': { lat: 61.5240, lon: 105.3188 },
  'brazil': { lat: -14.2350, lon: -51.9253 },
  'south africa': { lat: -30.5595, lon: 22.9375 },
  'saudi arabia': { lat: 23.8859, lon: 45.0792 },
};

function resolveCoords(city, country, rawLat, rawLon) {
  let lat = parseFloat(rawLat);
  let lon = parseFloat(rawLon);

  if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
    return { lat, lon };
  }

  if (city) {
    const key = city.toLowerCase().trim();
    if (GEO_LOOKUP[key]) return GEO_LOOKUP[key];
  }

  if (country) {
    const key = country.toLowerCase().trim();
    if (GEO_LOOKUP[key]) return GEO_LOOKUP[key];
  }

  return { lat: 19.0760, lon: 72.8777 }; // Default HQ India
}

/**
 * GET /api/erp/utm/live-visitors
 * Fetch all visitors with geographic data for a given time period and filters
 */
const getLiveVisitors = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      campaign,
      source,
      medium,
      country,
      device,
      status,
      limit = 100,
      offset = 0,
    } = req.query;

    let query = `
      SELECT c.*, l.campaign AS utm_campaign, l.source AS utm_source, l.medium AS utm_medium,
             l.destination AS landing_page
      FROM src_utm_clicks c
      LEFT JOIN src_utm_links l ON l.id = c.link_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND clicked_at >= $${paramCount++}`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      query += ` AND clicked_at <= $${paramCount++}`;
      params.push(new Date(endDate));
    }

    if (campaign) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE campaign = $${paramCount++})`;
      params.push(campaign);
    }

    if (source) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE source = $${paramCount++})`;
      params.push(source);
    }

    if (medium) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE medium = $${paramCount++})`;
      params.push(medium);
    }

    if (country) {
      query += ` AND country = $${paramCount++}`;
      params.push(country);
    }

    if (device) {
      query += ` AND device_type = $${paramCount++}`;
      params.push(device);
    }

    if (status === 'live') {
      query += ` AND clicked_at >= NOW() - INTERVAL '5 minutes'`;
    } else if (status === 'offline') {
      query += ` AND clicked_at < NOW() - INTERVAL '5 minutes'`;
    }

    query += ` ORDER BY clicked_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const liveThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const visitors = result.rows.map((click) => {
      const coords = resolveCoords(click.city, click.country, click.latitude, click.longitude);
      return {
        ...click,
        latitude: coords.lat,
        longitude: coords.lon,
        status: new Date(click.clicked_at) >= liveThreshold ? 'live' : 'offline',
        time_on_site: null,
      };
    });

    res.json({ visitors, total: result.rows.length });
  } catch (err) {
    console.error('getLiveVisitors error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/erp/utm/visitor-locations
 * Aggregate visitor data by geographic location (for globe visualization)
 */
const getVisitorLocations = async (req, res) => {
  try {
    const { startDate, endDate, campaign, source, medium, country, device, status } = req.query;

    let query = `
      SELECT
        country,
        city,
        COUNT(*) as visitor_count,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COALESCE(MAX(latitude), 0) as latitude,
        COALESCE(MAX(longitude), 0) as longitude,
        MAX(clicked_at) as last_activity
      FROM src_utm_clicks
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND clicked_at >= $${paramCount++}`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      query += ` AND clicked_at <= $${paramCount++}`;
      params.push(new Date(endDate));
    }

    if (campaign) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE campaign = $${paramCount++})`;
      params.push(campaign);
    }

    if (source) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE source = $${paramCount++})`;
      params.push(source);
    }

    if (medium) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE medium = $${paramCount++})`;
      params.push(medium);
    }

    if (country) {
      query += ` AND country = $${paramCount++}`;
      params.push(country);
    }

    if (device) {
      query += ` AND device_type = $${paramCount++}`;
      params.push(device);
    }

    if (status === 'live') {
      query += ` AND clicked_at >= NOW() - INTERVAL '5 minutes'`;
    } else if (status === 'offline') {
      query += ` AND clicked_at < NOW() - INTERVAL '5 minutes'`;
    }

    query += ` AND country IS NOT NULL
      GROUP BY country, city
      ORDER BY visitor_count DESC`;

    const result = await pool.query(query, params);

    const locations = result.rows.map((loc) => {
      const coords = resolveCoords(loc.city, loc.country, loc.latitude, loc.longitude);
      return {
        ...loc,
        latitude: coords.lat,
        longitude: coords.lon,
      };
    });

    res.json({ locations });
  } catch (err) {
    console.error('getVisitorLocations error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/erp/utm/analytics
 * Get aggregated analytics for the dashboard
 */
const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, campaign, source, medium, status } = req.query;

    let filter = `WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      filter += ` AND clicked_at >= $${paramCount++}`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      filter += ` AND clicked_at <= $${paramCount++}`;
      params.push(new Date(endDate));
    }

    if (campaign) {
      filter += ` AND link_id IN (SELECT id FROM src_utm_links WHERE campaign = $${paramCount++})`;
      params.push(campaign);
    }

    if (source) {
      filter += ` AND link_id IN (SELECT id FROM src_utm_links WHERE source = $${paramCount++})`;
      params.push(source);
    }

    if (medium) {
      filter += ` AND link_id IN (SELECT id FROM src_utm_links WHERE medium = $${paramCount++})`;
      params.push(medium);
    }

    if (status === 'live') {
      filter += ` AND clicked_at >= NOW() - INTERVAL '5 minutes'`;
    } else if (status === 'offline') {
      filter += ` AND clicked_at < NOW() - INTERVAL '5 minutes'`;
    }

    const totalRes = await pool.query(
      `SELECT COUNT(*) as total, COUNT(DISTINCT ip_address) as unique FROM src_utm_clicks ${filter}`,
      params
    );
    const total = parseInt(totalRes.rows[0]?.total || 0);
    const unique = parseInt(totalRes.rows[0]?.unique || 0);

    const liveRes = await pool.query(
      `SELECT COUNT(DISTINCT ip_address) as live_visitors FROM src_utm_clicks ${filter} AND clicked_at >= NOW() - INTERVAL '5 minutes'`,
      params
    );
    const liveVisitors = parseInt(liveRes.rows[0]?.live_visitors || 0);

    const countriesRes = await pool.query(
      `SELECT country, COUNT(*) as count FROM src_utm_clicks ${filter} AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10`,
      params
    );

    const devicesRes = await pool.query(
      `SELECT device_type, COUNT(*) as count FROM src_utm_clicks ${filter} GROUP BY device_type ORDER BY count DESC`,
      params
    );

    const browsersRes = await pool.query(
      `SELECT browser, COUNT(*) as count FROM src_utm_clicks ${filter} AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 10`,
      params
    );

    const conversionRate = total > 0 ? Number(((unique / total) * 100).toFixed(2)) : 0;

    res.json({
      total,
      unique,
      liveVisitors,
      conversionRate,
      countries: countriesRes.rows,
      devices: devicesRes.rows,
      browsers: browsersRes.rows,
    });
  } catch (err) {
    console.error('getAnalytics error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/erp/utm/geo-summary
 */
const getGeoSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = `WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      filter += ` AND clicked_at >= $${paramCount++}`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      filter += ` AND clicked_at <= $${paramCount++}`;
      params.push(new Date(endDate));
    }

    const countriesCountRes = await pool.query(
      `SELECT COUNT(DISTINCT country) as count FROM src_utm_clicks ${filter} AND country IS NOT NULL`,
      params
    );
    const uniqueCountries = parseInt(countriesCountRes.rows[0]?.count || 0);

    const topLocationsRes = await pool.query(
      `SELECT
        country,
        city,
        COUNT(*) as visitor_count,
        COALESCE(latitude, 0) as latitude,
        COALESCE(longitude, 0) as longitude
      FROM src_utm_clicks ${filter}
      AND country IS NOT NULL
      GROUP BY country, city, latitude, longitude
      ORDER BY visitor_count DESC
      LIMIT 20`,
      params
    );

    const top_locations = topLocationsRes.rows.map((loc) => {
      const coords = resolveCoords(loc.city, loc.country, loc.latitude, loc.longitude);
      return {
        ...loc,
        latitude: coords.lat,
        longitude: coords.lon,
      };
    });

    res.json({
      unique_countries: uniqueCountries,
      top_locations,
    });
  } catch (err) {
    console.error('getGeoSummary error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getLiveVisitors,
  getVisitorLocations,
  getAnalytics,
  getGeoSummary,
};

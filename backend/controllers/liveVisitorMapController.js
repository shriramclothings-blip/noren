'use strict';

const { pool } = require('../config/db');
const { fetchGeoLocation } = require('../services/sessionService');

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
    const visitors = result.rows.map((click) => ({
      ...click,
      status: new Date(click.clicked_at) >= liveThreshold ? 'live' : 'offline',
      time_on_site: null,
    }));

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
        COUNT(*) as visitor_count,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COALESCE(MAX(latitude), 0) as lat,
        COALESCE(MAX(longitude), 0) as lon,
        ARRAY_AGG(DISTINCT city) FILTER (WHERE city IS NOT NULL) as cities,
        AVG(EXTRACT(EPOCH FROM (MAX(clicked_at) - MIN(clicked_at)))) as avg_session_duration
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
      GROUP BY country
      ORDER BY visitor_count DESC`;

    const result = await pool.query(query, params);
    res.json({ locations: result.rows });
  } catch (err) {
    console.error('getVisitorLocations error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/erp/utm/analytics
 * Get aggregated analytics for the dashboard (top countries, devices, sources, etc.)
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

    // Total visitors
    const totalRes = await pool.query(
      `SELECT COUNT(*) as total, COUNT(DISTINCT ip_address) as unique FROM src_utm_clicks ${filter}`,
      params
    );
    const total = parseInt(totalRes.rows[0]?.total || 0);
    const unique = parseInt(totalRes.rows[0]?.unique || 0);

    // Live visitors (last 5 minutes)
    const liveRes = await pool.query(
      `SELECT COUNT(DISTINCT ip_address) as live_visitors FROM src_utm_clicks ${filter} AND clicked_at >= NOW() - INTERVAL '5 minutes'`,
      params
    );
    const liveVisitors = parseInt(liveRes.rows[0]?.live_visitors || 0);

    // Countries
    const countriesRes = await pool.query(
      `SELECT country, COUNT(*) as count FROM src_utm_clicks ${filter} AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10`,
      params
    );

    // Devices
    const devicesRes = await pool.query(
      `SELECT device_type, COUNT(*) as count FROM src_utm_clicks ${filter} GROUP BY device_type ORDER BY count DESC`,
      params
    );

    // Browsers
    const browsersRes = await pool.query(
      `SELECT browser, COUNT(*) as count FROM src_utm_clicks ${filter} AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 10`,
      params
    );

    // Sources
    const sourcesRes = await pool.query(
      `SELECT l.source, COUNT(*) as count FROM src_utm_clicks c
       JOIN src_utm_links l ON c.link_id = l.id
       ${filter.replace('FROM src_utm_clicks', '')} GROUP BY l.source ORDER BY count DESC`,
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
      sources: sourcesRes.rows,
    });
  } catch (err) {
    console.error('getAnalytics error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/erp/utm/geo-summary
 * Get summary of geographic distribution and top visitor locations
 */
const getGeoSummary = async (req, res) => {
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

    // Unique countries
    const countriesCountRes = await pool.query(
      `SELECT COUNT(DISTINCT country) as count FROM src_utm_clicks ${filter} AND country IS NOT NULL`,
      params
    );
    const uniqueCountries = parseInt(countriesCountRes.rows[0]?.count || 0);

    // Top locations with city - allow NULL lat/lon but prefer records with coordinates
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

    res.json({
      unique_countries: uniqueCountries,
      top_locations: topLocationsRes.rows,
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

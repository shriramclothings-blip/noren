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
      limit = 100,
      offset = 0,
    } = req.query;

    let query = `SELECT * FROM src_utm_clicks WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    // Date range filter
    if (startDate) {
      query += ` AND clicked_at >= $${paramCount++}`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      query += ` AND clicked_at <= $${paramCount++}`;
      params.push(new Date(endDate));
    }

    // Campaign filter
    if (campaign) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE campaign = $${paramCount++})`;
      params.push(campaign);
    }

    // Source filter
    if (source) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE source = $${paramCount++})`;
      params.push(source);
    }

    // Medium filter
    if (medium) {
      query += ` AND link_id IN (SELECT id FROM src_utm_links WHERE medium = $${paramCount++})`;
      params.push(medium);
    }

    // Location filter
    if (country) {
      query += ` AND country = $${paramCount++}`;
      params.push(country);
    }

    // Device filter
    if (device) {
      query += ` AND device_type = $${paramCount++}`;
      params.push(device);
    }

    // Order and pagination
    query += ` ORDER BY clicked_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Fetch enriched data with link info
    const visitors = await Promise.all(
      result.rows.map(async (click) => {
        const linkRes = await pool.query(
          `SELECT campaign, source, medium FROM src_utm_links WHERE id = $1`,
          [click.link_id]
        );
        const link = linkRes.rows[0] || {};
        return {
          ...click,
          utm_campaign: link.campaign,
          utm_source: link.source,
          utm_medium: link.medium,
        };
      })
    );

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
    const { startDate, endDate, campaign, source, medium, country, device } = req.query;

    let query = `
      SELECT
        country,
        COUNT(*) as visitor_count,
        COUNT(DISTINCT ip_address) as unique_visitors,
        MAX(latitude) as lat,
        MAX(longitude) as lon,
        ARRAY_AGG(DISTINCT city) as cities,
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

    query += ` AND country IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
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
    const { startDate, endDate, campaign, source, medium } = req.query;

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

    // Total visitors
    const totalRes = await pool.query(
      `SELECT COUNT(*) as total, COUNT(DISTINCT ip_address) as unique FROM src_utm_clicks ${filter}`,
      params
    );
    const total = parseInt(totalRes.rows[0]?.total || 0);
    const unique = parseInt(totalRes.rows[0]?.unique || 0);

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

    res.json({
      total,
      unique,
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

    // Unique countries
    const countriesCountRes = await pool.query(
      `SELECT COUNT(DISTINCT country) as count FROM src_utm_clicks ${filter} AND country IS NOT NULL`,
      params
    );
    const uniqueCountries = parseInt(countriesCountRes.rows[0]?.count || 0);

    // Top locations with city
    const topLocationsRes = await pool.query(
      `SELECT
        country,
        city,
        COUNT(*) as visitor_count,
        latitude,
        longitude
      FROM src_utm_clicks ${filter}
      AND country IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
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

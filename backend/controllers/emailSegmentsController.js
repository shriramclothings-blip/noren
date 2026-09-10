'use strict';

/**
 * NOREN EMAIL PORTAL - Segments Controller
 * Handles audience segmentation with dynamic filtering
 */

const { pool } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// ═══════════════════════════════════════════════════════════════════════════
// SEGMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/segments - List segments
 */
const getSegments = async (req, res) => {
  try {
    const { segment_type, active, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (segment_type) {
      conditions.push(`segment_type = $${idx++}`);
      values.push(segment_type);
    }

    if (active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(active === 'true');
    }

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        s.id, s.name, s.description, s.segment_type, s.recipient_count,
        s.is_dynamic, s.is_active, s.last_calculated_at, s.created_at,
        u.name as created_by_name
       FROM src_email_segments s
       LEFT JOIN src_users u ON u.id = s.created_by
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_email_segments s ${whereClause}`,
      values.slice(0, -2)
    );

    res.json({
      segments: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching segments:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/segments/:id - Get segment detail
 */
const getSegmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        s.*,
        u.name as created_by_name
       FROM src_email_segments s
       LEFT JOIN src_users u ON u.id = s.created_by
       WHERE s.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Segment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching segment:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/segments - Create segment
 */
const createSegment = async (req, res) => {
  try {
    const {
      name,
      description,
      segment_type,
      filter_rules,
      is_dynamic = true,
      is_active = true,
    } = req.body;

    if (!name || !segment_type || !filter_rules) {
      return res.status(400).json({
        message: 'name, segment_type, and filter_rules are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO src_email_segments (
        name, description, segment_type, filter_rules, is_dynamic, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        description || null,
        segment_type,
        JSON.stringify(filter_rules),
        is_dynamic,
        is_active,
        req.user.id,
      ]
    );

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'create_segment',
      targetType: 'segment',
      targetId: result.rows[0].id,
      details: { name, segment_type },
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating segment:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/email/segments/:id - Update segment
 */
const updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, segment_type, filter_rules, is_dynamic, is_active } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description);
    }
    if (segment_type !== undefined) {
      updates.push(`segment_type = $${idx++}`);
      values.push(segment_type);
    }
    if (filter_rules !== undefined) {
      updates.push(`filter_rules = $${idx++}`);
      values.push(JSON.stringify(filter_rules));
    }
    if (is_dynamic !== undefined) {
      updates.push(`is_dynamic = $${idx++}`);
      values.push(is_dynamic);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE src_email_segments
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Segment not found' });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'update_segment',
      targetType: 'segment',
      targetId: id,
      details: req.body,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating segment:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/email/segments/:id - Delete segment
 */
const deleteSegment = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, name FROM src_email_segments WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Segment not found' });
    }

    await pool.query('DELETE FROM src_email_segments WHERE id = $1', [id]);

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'delete_segment',
      targetType: 'segment',
      targetId: id,
      details: { name: existing.rows[0].name },
    });

    res.json({ message: 'Segment deleted successfully' });
  } catch (err) {
    console.error('Error deleting segment:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/segments/:id/calculate - Calculate segment recipients
 */
const calculateSegment = async (req, res) => {
  try {
    const { id } = req.params;

    const segment = await pool.query(
      'SELECT * FROM src_email_segments WHERE id = $1',
      [id]
    );

    if (!segment.rows.length) {
      return res.status(404).json({ message: 'Segment not found' });
    }

    const s = segment.rows[0];
    const filterRules = s.filter_rules;

    let recipients = [];

    // Build query based on segment_type and filter_rules
    switch (s.segment_type) {
      case 'customers':
        recipients = await calculateCustomerSegment(filterRules);
        break;
      case 'subscribers':
        recipients = await calculateSubscriberSegment(filterRules);
        break;
      case 'sellers':
        recipients = await calculateSellerSegment(filterRules);
        break;
      case 'influencers':
        recipients = await calculateInfluencerSegment(filterRules);
        break;
      case 'employees':
        recipients = await calculateEmployeeSegment(filterRules);
        break;
      case 'applicants':
        recipients = await calculateApplicantSegment(filterRules);
        break;
      case 'dynamic':
        recipients = await calculateDynamicSegment(filterRules);
        break;
      default:
        return res.status(400).json({ message: 'Invalid segment type' });
    }

    // Update segment with new count
    await pool.query(
      `UPDATE src_email_segments 
       SET recipient_count = $1, last_calculated_at = NOW() 
       WHERE id = $2`,
      [recipients.length, id]
    );

    res.json({
      segment_id: id,
      recipient_count: recipients.length,
      calculated_at: new Date().toISOString(),
      recipients: recipients.slice(0, 100), // Return first 100 for preview
    });
  } catch (err) {
    console.error('Error calculating segment:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/segments/:id/preview - Preview segment recipients
 */
const previewSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const segment = await pool.query(
      'SELECT * FROM src_email_segments WHERE id = $1',
      [id]
    );

    if (!segment.rows.length) {
      return res.status(404).json({ message: 'Segment not found' });
    }

    const s = segment.rows[0];
    let recipients = [];

    // Get preview based on segment type
    switch (s.segment_type) {
      case 'customers':
        recipients = await calculateCustomerSegment(s.filter_rules, limit);
        break;
      case 'subscribers':
        recipients = await calculateSubscriberSegment(s.filter_rules, limit);
        break;
      case 'sellers':
        recipients = await calculateSellerSegment(s.filter_rules, limit);
        break;
      case 'influencers':
        recipients = await calculateInfluencerSegment(s.filter_rules, limit);
        break;
      case 'employees':
        recipients = await calculateEmployeeSegment(s.filter_rules, limit);
        break;
      default:
        recipients = [];
    }

    res.json({
      segment_id: id,
      preview_count: recipients.length,
      total_count: s.recipient_count,
      recipients,
    });
  } catch (err) {
    console.error('Error previewing segment:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEGMENT CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function calculateCustomerSegment(filterRules, limit = null) {
  let query = `
    SELECT DISTINCT u.email, u.name, 'customer' as type
    FROM src_users u
    WHERE u.role = 'customer' AND u.is_banned = FALSE AND u.email IS NOT NULL
  `;
  const values = [];

  // Apply filter rules
  if (filterRules.conditions) {
    const conditions = [];
    let paramIndex = 1;

    for (const condition of filterRules.conditions) {
      switch (condition.field) {
        case 'created_at':
          if (condition.operator === 'after') {
            conditions.push(`u.created_at >= $${paramIndex++}`);
            values.push(condition.value);
          } else if (condition.operator === 'before') {
            conditions.push(`u.created_at <= $${paramIndex++}`);
            values.push(condition.value);
          }
          break;
        case 'orders_count':
          // This would require joining with orders table
          break;
      }
    }

    if (conditions.length) {
      query += ` AND ${conditions.join(' AND ')}`;
    }
  }

  if (limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
}

async function calculateSubscriberSegment(filterRules, limit = null) {
  let query = `
    SELECT email, name, 'subscriber' as type
    FROM src_newsletter_subscribers
    WHERE is_active = TRUE AND email IS NOT NULL
  `;
  const values = [];

  if (limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
}

async function calculateSellerSegment(filterRules, limit = null) {
  let query = `
    SELECT email, business_name as name, 'seller' as type
    FROM src_sellers
    WHERE status = 'approved' AND email IS NOT NULL
  `;
  const values = [];

  if (limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
}

async function calculateInfluencerSegment(filterRules, limit = null) {
  let query = `
    SELECT email, name, 'influencer' as type
    FROM src_influencers
    WHERE is_active = TRUE AND email IS NOT NULL
  `;
  const values = [];

  if (limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
}

async function calculateEmployeeSegment(filterRules, limit = null) {
  let query = `
    SELECT email, name, 'employee' as type
    FROM src_erp_employees
    WHERE is_active = TRUE AND email IS NOT NULL
  `;
  const values = [];

  if (limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
}

async function calculateApplicantSegment(filterRules, limit = null) {
  // This would depend on your applicant tracking system
  // For now, return empty array
  return [];
}

async function calculateDynamicSegment(filterRules, limit = null) {
  // This would implement complex cross-table filtering
  // For now, return empty array
  return [];
}

module.exports = {
  getSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  calculateSegment,
  previewSegment,
};
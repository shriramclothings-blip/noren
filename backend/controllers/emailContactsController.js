'use strict';

/**
 * NOREN EMAIL PORTAL - Contacts Controller
 * Unified contact management across all user types
 */

const { pool } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED CONTACTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/email/contacts - List all contacts (unified view)
 */
const getContacts = async (req, res) => {
  try {
    const { contact_type, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let contacts = [];
    let totalCount = 0;

    if (contact_type) {
      // Get specific contact type
      const result = await getContactsByType(contact_type, search, limit, offset);
      contacts = result.contacts;
      totalCount = result.total;
    } else {
      // Get all contact types
      const allContacts = await getAllContacts(search, limit, offset);
      contacts = allContacts.contacts;
      totalCount = allContacts.total;
    }

    res.json({
      contacts,
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/contacts/:id - Get contact detail
 */
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // contact type: customer, seller, influencer, etc.

    if (!type) {
      return res.status(400).json({ message: 'Contact type is required' });
    }

    let contact = null;

    switch (type) {
      case 'customer':
        contact = await getCustomerDetail(id);
        break;
      case 'seller':
        contact = await getSellerDetail(id);
        break;
      case 'influencer':
        contact = await getInfluencerDetail(id);
        break;
      case 'employee':
        contact = await getEmployeeDetail(id);
        break;
      case 'subscriber':
        contact = await getSubscriberDetail(id);
        break;
      default:
        return res.status(400).json({ message: 'Invalid contact type' });
    }

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(contact);
  } catch (err) {
    console.error('Error fetching contact:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/contacts/:id/history - Get email history for contact
 */
const getContactHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    if (!type) {
      return res.status(400).json({ message: 'Contact type is required' });
    }

    // Get contact email first
    let contactEmail = null;

    switch (type) {
      case 'customer':
        const customer = await pool.query('SELECT email FROM src_users WHERE id = $1 AND role = $2', [id, 'customer']);
        contactEmail = customer.rows[0]?.email;
        break;
      case 'seller':
        const seller = await pool.query('SELECT email FROM src_sellers WHERE id = $1', [id]);
        contactEmail = seller.rows[0]?.email;
        break;
      case 'influencer':
        const influencer = await pool.query('SELECT email FROM src_influencers WHERE id = $1', [id]);
        contactEmail = influencer.rows[0]?.email;
        break;
      case 'employee':
        const employee = await pool.query('SELECT email FROM src_erp_employees WHERE id = $1', [id]);
        contactEmail = employee.rows[0]?.email;
        break;
      case 'subscriber':
        const subscriber = await pool.query('SELECT email FROM src_newsletter_subscribers WHERE id = $1', [id]);
        contactEmail = subscriber.rows[0]?.email;
        break;
    }

    if (!contactEmail) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Get email history
    const historyResult = await pool.query(
      `SELECT 
        e.id, e.subject, e.email_type, e.status, e.sent_at,
        e.opened_at, e.clicked_at, e.sender_email, e.sender_name,
        c.name as campaign_name,
        t.name as template_name
       FROM src_email_sent e
       LEFT JOIN src_email_campaigns c ON c.id = e.campaign_id
       LEFT JOIN src_email_templates t ON t.id = e.template_id
       WHERE (e.recipient_email = $1 OR e.sender_email = $1)
       ORDER BY e.sent_at DESC
       LIMIT $2 OFFSET $3`,
      [contactEmail, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM src_email_sent WHERE recipient_email = $1 OR sender_email = $1',
      [contactEmail]
    );

    res.json({
      contact_id: id,
      contact_type: type,
      contact_email: contactEmail,
      emails: historyResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Error fetching contact history:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/email/contacts/import - Import contacts from CSV
 */
const importContacts = async (req, res) => {
  try {
    const { contacts, contact_type = 'custom' } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ message: 'contacts array is required' });
    }

    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const contact of contacts) {
      try {
        if (!contact.email || !contact.email.includes('@')) {
          failed++;
          errors.push({ contact, error: 'Invalid email' });
          continue;
        }

        // For now, we'll add to newsletter subscribers as custom contacts
        // In a full implementation, you might have a dedicated contacts table
        const existing = await pool.query(
          'SELECT id FROM src_newsletter_subscribers WHERE email = $1',
          [contact.email.toLowerCase().trim()]
        );

        if (!existing.rows.length) {
          await pool.query(
            'INSERT INTO src_newsletter_subscribers (email, name, source, is_active) VALUES ($1, $2, $3, $4)',
            [contact.email.toLowerCase().trim(), contact.name || null, 'import', true]
          );
          imported++;
        } else {
          // Update name if provided and current is null
          if (contact.name) {
            await pool.query(
              'UPDATE src_newsletter_subscribers SET name = COALESCE(name, $1) WHERE email = $2',
              [contact.name, contact.email.toLowerCase().trim()]
            );
          }
          imported++;
        }
      } catch (err) {
        failed++;
        errors.push({ contact, error: err.message });
      }
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'import_contacts',
      targetType: 'contacts',
      targetId: null,
      details: { imported, failed, total: contacts.length },
    });

    res.json({
      message: `Import completed: ${imported} imported, ${failed} failed`,
      imported,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (err) {
    console.error('Error importing contacts:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/email/contacts/export - Export contacts
 */
const exportContacts = async (req, res) => {
  try {
    const { contact_type = 'all', format = 'csv' } = req.query;

    let contacts = [];

    if (contact_type === 'all') {
      const allContacts = await getAllContacts('', 10000, 0); // Export up to 10k contacts
      contacts = allContacts.contacts;
    } else {
      const typeContacts = await getContactsByType(contact_type, '', 10000, 0);
      contacts = typeContacts.contacts;
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'Name,Email,Type,Status,Created At\n';
      const csvRows = contacts.map(c => 
        `"${c.name || ''}","${c.email}","${c.contact_type}","${c.status || 'active'}","${c.created_at || ''}"`
      ).join('\n');
      const csv = csvHeaders + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="noren-contacts-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        contacts,
        exported_at: new Date().toISOString(),
        total: contacts.length,
      });
    }

    await logAudit(pool, {
      adminId: req.user.id,
      action: 'export_contacts',
      targetType: 'contacts',
      targetId: null,
      details: { contact_type, format, count: contacts.length },
    });
  } catch (err) {
    console.error('Error exporting contacts:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function getAllContacts(search, limit, offset) {
  const searchCondition = search ? `%${search}%` : '%';
  
  // Union all contact types
  const query = `
    (
      SELECT 
        u.id, u.name, u.email, 'customer' as contact_type, 
        CASE WHEN u.is_banned THEN 'banned' ELSE 'active' END as status,
        u.created_at
      FROM src_users u 
      WHERE u.role = 'customer' AND u.email IS NOT NULL
        AND (u.name ILIKE $1 OR u.email ILIKE $1)
    )
    UNION ALL
    (
      SELECT 
        s.id, s.business_name as name, s.email, 'seller' as contact_type,
        s.status, s.created_at
      FROM src_sellers s 
      WHERE s.email IS NOT NULL
        AND (s.business_name ILIKE $1 OR s.email ILIKE $1)
    )
    UNION ALL
    (
      SELECT 
        i.id, i.name, i.email, 'influencer' as contact_type,
        CASE WHEN i.is_active THEN 'active' ELSE 'inactive' END as status,
        i.created_at
      FROM src_influencers i 
      WHERE i.email IS NOT NULL
        AND (i.name ILIKE $1 OR i.email ILIKE $1)
    )
    UNION ALL
    (
      SELECT 
        e.id, e.name, e.email, 'employee' as contact_type,
        CASE WHEN e.is_active THEN 'active' ELSE 'inactive' END as status,
        e.created_at
      FROM src_erp_employees e 
      WHERE e.email IS NOT NULL
        AND (e.name ILIKE $1 OR e.email ILIKE $1)
    )
    UNION ALL
    (
      SELECT 
        ns.id, ns.name, ns.email, 'subscriber' as contact_type,
        CASE WHEN ns.is_active THEN 'active' ELSE 'inactive' END as status,
        ns.subscribed_at as created_at
      FROM src_newsletter_subscribers ns 
      WHERE ns.email IS NOT NULL
        AND (COALESCE(ns.name, '') ILIKE $1 OR ns.email ILIKE $1)
    )
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await pool.query(query, [searchCondition, limit, offset]);

  // Get total count (approximate)
  const countQuery = `
    SELECT 
      (SELECT COUNT(*) FROM src_users WHERE role = 'customer' AND email IS NOT NULL) +
      (SELECT COUNT(*) FROM src_sellers WHERE email IS NOT NULL) +
      (SELECT COUNT(*) FROM src_influencers WHERE email IS NOT NULL) +
      (SELECT COUNT(*) FROM src_erp_employees WHERE email IS NOT NULL) +
      (SELECT COUNT(*) FROM src_newsletter_subscribers WHERE email IS NOT NULL) as total
  `;
  const countResult = await pool.query(countQuery);

  return {
    contacts: result.rows,
    total: parseInt(countResult.rows[0].total),
  };
}

async function getContactsByType(type, search, limit, offset) {
  const searchCondition = search ? `%${search}%` : '%';
  let query, countQuery, params;

  switch (type) {
    case 'customers':
      query = `
        SELECT 
          u.id, u.name, u.email, 'customer' as contact_type,
          CASE WHEN u.is_banned THEN 'banned' ELSE 'active' END as status,
          u.created_at, u.phone
        FROM src_users u 
        WHERE u.role = 'customer' AND u.email IS NOT NULL
          AND (u.name ILIKE $1 OR u.email ILIKE $1)
        ORDER BY u.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      countQuery = `
        SELECT COUNT(*) FROM src_users u 
        WHERE u.role = 'customer' AND u.email IS NOT NULL
          AND (u.name ILIKE $1 OR u.email ILIKE $1)
      `;
      params = [searchCondition, limit, offset];
      break;

    case 'sellers':
      query = `
        SELECT 
          s.id, s.business_name as name, s.email, 'seller' as contact_type,
          s.status, s.created_at, s.phone
        FROM src_sellers s 
        WHERE s.email IS NOT NULL
          AND (s.business_name ILIKE $1 OR s.email ILIKE $1)
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      countQuery = `
        SELECT COUNT(*) FROM src_sellers s 
        WHERE s.email IS NOT NULL
          AND (s.business_name ILIKE $1 OR s.email ILIKE $1)
      `;
      params = [searchCondition, limit, offset];
      break;

    case 'influencers':
      query = `
        SELECT 
          i.id, i.name, i.email, 'influencer' as contact_type,
          CASE WHEN i.is_active THEN 'active' ELSE 'inactive' END as status,
          i.created_at, i.phone
        FROM src_influencers i 
        WHERE i.email IS NOT NULL
          AND (i.name ILIKE $1 OR i.email ILIKE $1)
        ORDER BY i.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      countQuery = `
        SELECT COUNT(*) FROM src_influencers i 
        WHERE i.email IS NOT NULL
          AND (i.name ILIKE $1 OR i.email ILIKE $1)
      `;
      params = [searchCondition, limit, offset];
      break;

    case 'employees':
      query = `
        SELECT 
          e.id, e.name, e.email, 'employee' as contact_type,
          CASE WHEN e.is_active THEN 'active' ELSE 'inactive' END as status,
          e.created_at, e.phone
        FROM src_erp_employees e 
        WHERE e.email IS NOT NULL
          AND (e.name ILIKE $1 OR e.email ILIKE $1)
        ORDER BY e.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      countQuery = `
        SELECT COUNT(*) FROM src_erp_employees e 
        WHERE e.email IS NOT NULL
          AND (e.name ILIKE $1 OR e.email ILIKE $1)
      `;
      params = [searchCondition, limit, offset];
      break;

    case 'subscribers':
      query = `
        SELECT 
          ns.id, ns.name, ns.email, 'subscriber' as contact_type,
          CASE WHEN ns.is_active THEN 'active' ELSE 'inactive' END as status,
          ns.subscribed_at as created_at, NULL as phone
        FROM src_newsletter_subscribers ns 
        WHERE ns.email IS NOT NULL
          AND (COALESCE(ns.name, '') ILIKE $1 OR ns.email ILIKE $1)
        ORDER BY ns.subscribed_at DESC
        LIMIT $2 OFFSET $3
      `;
      countQuery = `
        SELECT COUNT(*) FROM src_newsletter_subscribers ns 
        WHERE ns.email IS NOT NULL
          AND (COALESCE(ns.name, '') ILIKE $1 OR ns.email ILIKE $1)
      `;
      params = [searchCondition, limit, offset];
      break;

    default:
      return { contacts: [], total: 0 };
  }

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, params.slice(0, -2));

  return {
    contacts: result.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

async function getCustomerDetail(id) {
  const result = await pool.query(`
    SELECT 
      u.id, u.name, u.email, u.phone, u.created_at, u.is_banned,
      COUNT(o.id) as order_count,
      COALESCE(SUM(o.total_amount), 0) as total_spent,
      MAX(o.created_at) as last_order_date
    FROM src_users u
    LEFT JOIN src_orders o ON o.user_id = u.id
    WHERE u.id = $1 AND u.role = 'customer'
    GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.is_banned
  `, [id]);

  return result.rows[0] || null;
}

async function getSellerDetail(id) {
  const result = await pool.query(`
    SELECT 
      s.*,
      COUNT(p.id) as product_count,
      COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_products
    FROM src_sellers s
    LEFT JOIN src_products p ON p.seller_id = s.id
    WHERE s.id = $1
    GROUP BY s.id
  `, [id]);

  return result.rows[0] || null;
}

async function getInfluencerDetail(id) {
  const result = await pool.query(`
    SELECT 
      i.*,
      COUNT(ic.id) as conversion_count,
      COALESCE(SUM(ic.commission_amount), 0) as total_commissions
    FROM src_influencers i
    LEFT JOIN src_influencer_conversions ic ON ic.influencer_id = i.id
    WHERE i.id = $1
    GROUP BY i.id
  `, [id]);

  return result.rows[0] || null;
}

async function getEmployeeDetail(id) {
  const result = await pool.query(
    'SELECT * FROM src_erp_employees WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

async function getSubscriberDetail(id) {
  const result = await pool.query(
    'SELECT * FROM src_newsletter_subscribers WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  getContacts,
  getContactById,
  getContactHistory,
  importContacts,
  exportContacts,
};
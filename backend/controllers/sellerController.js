/**
 * sellerController.js
 * All seller-portal-facing endpoints (register, profile, KYC, products, orders, dashboard).
 */

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');

// ─── Helpers ────────────────────────────────────────────────────────────────
const sellerAudit = async (actorId, actorRole, sellerId, action, resourceType, resourceId, before, after, ip) => {
  try {
    await pool.query(
      `INSERT INTO src_seller_audit_logs (actor_id,actor_role,seller_id,action,resource_type,resource_id,before_value,after_value,ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [actorId, actorRole, sellerId, action, resourceType, resourceId,
       before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, ip || null]
    );
  } catch {}
};

// ─── Register as Seller ──────────────────────────────────────────────────────
const registerSeller = async (req, res) => {
  const { brand_name, business_type, pickup_address, pickup_city, pickup_state, pickup_pincode, description } = req.body;
  const userId = req.user.id;
  try {
    // Check if already a seller
    const existing = await pool.query('SELECT id FROM src_seller_profiles WHERE user_id=$1', [userId]);
    if (existing.rows.length) return res.status(409).json({ message: 'You already have a seller account' });

    // Update role to seller
    await pool.query(`UPDATE src_users SET role='seller' WHERE id=$1`, [userId]);

    const result = await pool.query(
      `INSERT INTO src_seller_profiles
         (user_id,brand_name,business_type,pickup_address,pickup_city,pickup_state,pickup_pincode,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [userId, brand_name || '', business_type || 'individual', pickup_address || '', pickup_city || '', pickup_state || '', pickup_pincode || '', description || '']
    );
    await sellerAudit(userId, 'seller', result.rows[0].id, 'seller_registered', 'seller_profile', result.rows[0].id, null, { brand_name }, req.ip);

    // Notify admin
    sendMail(process.env.ADMIN_EMAIL || 'supportnoren1@gmail.com', 'New Seller Registered – NOREN',
      `<p>A new seller has registered: <b>${brand_name || req.user.name}</b> (${req.user.email}). Please review their application in the Admin Panel → Seller Management.</p>`
    ).catch(() => {});

    res.status(201).json({ message: 'Seller account created', seller: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Seller Profile ──────────────────────────────────────────────────────
const getSellerProfile = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT sp.*, u.name, u.email, u.phone, u.avatar_url
       FROM src_seller_profiles sp
       JOIN src_users u ON u.id = sp.user_id
       WHERE sp.user_id=$1`,
      [req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Seller profile not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Update Seller Profile ───────────────────────────────────────────────────
const updateSellerProfile = async (req, res) => {
  const allowed = ['brand_name','business_type','gst_number','pan_number','bank_account_name',
    'bank_account_number','bank_ifsc','bank_name','pickup_address','pickup_city',
    'pickup_state','pickup_pincode','website_url','description'];
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key}=$${idx++}`);
      values.push(req.body[key]);
    }
  }
  // Handle logo upload
  if (req.file?.path) { fields.push(`logo_url=$${idx++}`); values.push(req.file.path); }
  if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
  try {
    const prev = await pool.query('SELECT * FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!prev.rows.length) return res.status(404).json({ message: 'Profile not found' });
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE src_seller_profiles SET ${fields.join(',')}, updated_at=NOW() WHERE user_id=$${idx} RETURNING *`,
      values
    );
    await sellerAudit(req.user.id, req.user.role, prev.rows[0].id, 'profile_updated', 'seller_profile', prev.rows[0].id, prev.rows[0], result.rows[0], req.ip);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Submit KYC Documents ────────────────────────────────────────────────────
const submitKYC = async (req, res) => {
  try {
    const profile = await pool.query('SELECT id,kyc_status FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!profile.rows.length) return res.status(404).json({ message: 'Seller profile not found' });
    if (profile.rows[0].kyc_status === 'approved') return res.status(400).json({ message: 'KYC already approved' });

    const files = req.files || {};
    const docFields = [];
    const docValues = [];
    let idx = 1;

    if (files.doc_gst)     { docFields.push(`doc_gst_url=$${idx++}`);     docValues.push(files.doc_gst[0].path); }
    if (files.doc_pan)     { docFields.push(`doc_pan_url=$${idx++}`);     docValues.push(files.doc_pan[0].path); }
    if (files.doc_bank)    { docFields.push(`doc_bank_url=$${idx++}`);    docValues.push(files.doc_bank[0].path); }
    if (files.doc_address) { docFields.push(`doc_address_url=$${idx++}`); docValues.push(files.doc_address[0].path); }

    docFields.push(`kyc_status='submitted'`, `kyc_submitted_at=NOW()`, `updated_at=NOW()`);
    docValues.push(req.user.id);

    await pool.query(
      `UPDATE src_seller_profiles SET ${docFields.join(',')} WHERE user_id=$${idx}`,
      docValues
    );
    await sellerAudit(req.user.id, 'seller', profile.rows[0].id, 'kyc_submitted', 'seller_profile', profile.rows[0].id, null, null, req.ip);

    sendMail(process.env.ADMIN_EMAIL || 'supportnoren1@gmail.com', 'KYC Submitted – Seller Review Required',
      `<p>Seller <b>${req.user.email}</b> has submitted KYC documents for review. Please review in Admin Panel → Seller Management → KYC.</p>`
    ).catch(() => {});

    res.json({ message: 'KYC documents submitted for review' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Seller Dashboard Stats ──────────────────────────────────────────────────
const getSellerDashboard = async (req, res) => {
  try {
    const sp = await pool.query('SELECT id,status,kyc_status FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(404).json({ message: 'Seller profile not found' });
    const sellerId = sp.rows[0].id;

    const [productsRes, ordersRes, revenueRes, pendingRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
                         SUM(CASE WHEN status='pending_review' THEN 1 ELSE 0 END) AS pending_review
                  FROM src_seller_products WHERE seller_id=$1 AND deleted_at IS NULL`, [sellerId]),
      pool.query(`SELECT COUNT(DISTINCT order_id) AS total FROM src_seller_order_items WHERE seller_id=$1`, [sellerId]),
      pool.query(`SELECT COALESCE(SUM(line_total),0) AS total_revenue,
                         COALESCE(SUM(commission_amount),0) AS total_commission,
                         COALESCE(SUM(seller_payout),0) AS total_payout
                  FROM src_seller_order_items WHERE seller_id=$1 AND status NOT IN ('cancelled','refunded')`, [sellerId]),
      pool.query(`SELECT COALESCE(SUM(net_amount),0) AS pending FROM src_seller_payouts WHERE seller_id=$1 AND status='pending'`, [sellerId]),
    ]);

    res.json({
      seller_status: sp.rows[0].status,
      kyc_status: sp.rows[0].kyc_status,
      products: productsRes.rows[0],
      orders: ordersRes.rows[0],
      revenue: revenueRes.rows[0],
      pending_payout: pendingRes.rows[0].pending,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Create Seller Product ───────────────────────────────────────────────────
const createSellerProduct = async (req, res) => {
  try {
    const sp = await pool.query('SELECT id,status FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(403).json({ message: 'Seller profile not found' });
    if (sp.rows[0].status === 'pending') return res.status(403).json({ message: 'Your seller account is pending approval' });
    if (sp.rows[0].status === 'suspended' || sp.rows[0].status === 'banned' || sp.rows[0].status === 'rejected')
      return res.status(403).json({ message: `Your seller account is ${sp.rows[0].status}` });

    const { title, description, category_id, gender, price, discount_percent, brand, fabric, care_instructions, return_policy, shipping_days } = req.body;
    if (!title || !price) return res.status(400).json({ message: 'Title and price are required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const prod = await client.query(
        `INSERT INTO src_seller_products
           (seller_id,title,description,category_id,gender,price,discount_percent,brand,fabric,care_instructions,return_policy,shipping_days,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft')
         RETURNING *`,
        [sp.rows[0].id, title, description||'', category_id||null, gender||'men', price, discount_percent||0, brand||'', fabric||'', care_instructions||'', return_policy||'', shipping_days||5]
      );
      const prodId = prod.rows[0].id;

      // Images
      const images = req.files || [];
      for (let i = 0; i < images.length; i++) {
        await client.query(
          `INSERT INTO src_seller_product_images (product_id,image_url,is_primary,sort_order) VALUES ($1,$2,$3,$4)`,
          [prodId, images[i].path, i === 0, i]
        );
      }

      // Variants
      let variants = req.body.variants;
      if (typeof variants === 'string') { try { variants = JSON.parse(variants); } catch { variants = []; } }
      if (Array.isArray(variants)) {
        for (const v of variants) {
          if (v.size) {
            await client.query(
              `INSERT INTO src_seller_product_variants (product_id,size,stock,extra_price) VALUES ($1,$2,$3,$4)`,
              [prodId, v.size, parseInt(v.stock)||0, parseFloat(v.extra_price)||0]
            );
          }
        }
      }
      await client.query('COMMIT');
      await sellerAudit(req.user.id, 'seller', sp.rows[0].id, 'product_created', 'seller_product', prodId, null, { title }, req.ip);
      res.status(201).json({ message: 'Product created as draft', product: prod.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Seller's Products ───────────────────────────────────────────────────
const getSellerProducts = async (req, res) => {
  try {
    const sp = await pool.query('SELECT id FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(404).json({ message: 'Seller profile not found' });
    const sellerId = sp.rows[0].id;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let where = `WHERE spp.seller_id=$1 AND spp.deleted_at IS NULL`;
    const params = [sellerId];
    if (status) { params.push(status); where += ` AND spp.status=$${params.length}`; }

    const [products, count] = await Promise.all([
      pool.query(
        `SELECT spp.*, c.name AS category_name,
                COALESCE(json_agg(spi ORDER BY spi.sort_order) FILTER (WHERE spi.id IS NOT NULL), '[]') AS images,
                COALESCE(json_agg(spv) FILTER (WHERE spv.id IS NOT NULL), '[]') AS variants
         FROM src_seller_products spp
         LEFT JOIN src_categories c ON c.id = spp.category_id
         LEFT JOIN src_seller_product_images spi ON spi.product_id = spp.id
         LEFT JOIN src_seller_product_variants spv ON spv.product_id = spp.id
         ${where}
         GROUP BY spp.id, c.name
         ORDER BY spp.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM src_seller_products spp ${where}`, params),
    ]);

    res.json({ products: products.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Update Seller Product ───────────────────────────────────────────────────
const updateSellerProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const sp = await pool.query('SELECT id FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(404).json({ message: 'Profile not found' });
    const prod = await pool.query('SELECT * FROM src_seller_products WHERE id=$1 AND seller_id=$2 AND deleted_at IS NULL', [id, sp.rows[0].id]);
    if (!prod.rows.length) return res.status(404).json({ message: 'Product not found' });
    if (!['draft','rejected'].includes(prod.rows[0].status))
      return res.status(400).json({ message: 'Only draft or rejected products can be edited' });

    const allowed = ['title','description','category_id','gender','price','discount_percent','brand','fabric','care_instructions','return_policy','shipping_days'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key}=$${idx++}`); values.push(req.body[key]); }
    }
    if (!fields.length && !req.files?.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(id);
    if (fields.length) {
      await pool.query(`UPDATE src_seller_products SET ${fields.join(',')}, updated_at=NOW(), status='draft' WHERE id=$${idx}`, values);
    }

    // Replace images if provided
    if (req.files?.length) {
      await pool.query('DELETE FROM src_seller_product_images WHERE product_id=$1', [id]);
      for (let i = 0; i < req.files.length; i++) {
        await pool.query(`INSERT INTO src_seller_product_images (product_id,image_url,is_primary,sort_order) VALUES ($1,$2,$3,$4)`, [id, req.files[i].path, i===0, i]);
      }
    }

    // Replace variants if provided
    let variants = req.body.variants;
    if (variants) {
      if (typeof variants === 'string') { try { variants = JSON.parse(variants); } catch { variants = null; } }
      if (Array.isArray(variants)) {
        await pool.query('DELETE FROM src_seller_product_variants WHERE product_id=$1', [id]);
        for (const v of variants) {
          if (v.size) await pool.query(`INSERT INTO src_seller_product_variants (product_id,size,stock,extra_price) VALUES ($1,$2,$3,$4)`, [id, v.size, parseInt(v.stock)||0, parseFloat(v.extra_price)||0]);
        }
      }
    }

    await sellerAudit(req.user.id, 'seller', sp.rows[0].id, 'product_updated', 'seller_product', id, prod.rows[0], req.body, req.ip);
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Submit Product for Review ───────────────────────────────────────────────
const submitProductForReview = async (req, res) => {
  const { id } = req.params;
  try {
    const sp = await pool.query('SELECT id FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(404).json({ message: 'Profile not found' });
    const prod = await pool.query('SELECT * FROM src_seller_products WHERE id=$1 AND seller_id=$2 AND deleted_at IS NULL', [id, sp.rows[0].id]);
    if (!prod.rows.length) return res.status(404).json({ message: 'Product not found' });
    if (!['draft','rejected'].includes(prod.rows[0].status))
      return res.status(400).json({ message: `Product status is "${prod.rows[0].status}" — cannot submit` });

    // Validate: must have at least 1 image and 1 variant
    const [imgCount, varCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM src_seller_product_images WHERE product_id=$1', [id]),
      pool.query('SELECT COUNT(*) FROM src_seller_product_variants WHERE product_id=$1', [id]),
    ]);
    if (parseInt(imgCount.rows[0].count) === 0) return res.status(400).json({ message: 'At least one image is required' });
    if (parseInt(varCount.rows[0].count) === 0) return res.status(400).json({ message: 'At least one size/variant is required' });

    await pool.query(`UPDATE src_seller_products SET status='pending_review', submitted_at=NOW(), updated_at=NOW() WHERE id=$1`, [id]);
    await sellerAudit(req.user.id, 'seller', sp.rows[0].id, 'product_submitted', 'seller_product', id, null, null, req.ip);

    sendMail(process.env.ADMIN_EMAIL || 'supportnoren1@gmail.com', 'New Seller Product Pending Review – NOREN',
      `<p>Seller product "<b>${prod.rows[0].title}</b>" has been submitted for review. Review in Admin Panel → Seller Products.</p>`
    ).catch(() => {});

    res.json({ message: 'Product submitted for review' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Delete Seller Product (soft) ───────────────────────────────────────────
const deleteSellerProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const sp = await pool.query('SELECT id FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(404).json({ message: 'Profile not found' });
    const prod = await pool.query('SELECT * FROM src_seller_products WHERE id=$1 AND seller_id=$2 AND deleted_at IS NULL', [id, sp.rows[0].id]);
    if (!prod.rows.length) return res.status(404).json({ message: 'Product not found' });
    if (prod.rows[0].status === 'approved')
      return res.status(400).json({ message: 'Cannot delete an approved product. Contact admin.' });
    await pool.query('UPDATE src_seller_products SET deleted_at=NOW() WHERE id=$1', [id]);
    await sellerAudit(req.user.id, 'seller', sp.rows[0].id, 'product_deleted', 'seller_product', id, null, null, req.ip);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Seller Orders ───────────────────────────────────────────────────────
const getSellerOrders = async (req, res) => {
  try {
    const sp = await pool.query('SELECT id FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(404).json({ message: 'Profile not found' });
    const sellerId = sp.rows[0].id;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [items, count] = await Promise.all([
      pool.query(
        `SELECT soi.*, o.order_id, o.full_name, o.mobile, o.address, o.city, o.state, o.pincode, o.created_at AS order_date, o.status AS order_status
         FROM src_seller_order_items soi
         JOIN src_orders o ON o.id = soi.order_id
         WHERE soi.seller_id=$1
         ORDER BY soi.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM src_seller_order_items WHERE seller_id=$1', [sellerId]),
    ]);

    res.json({ orders: items.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Seller Payouts ──────────────────────────────────────────────────────
const getSellerPayouts = async (req, res) => {
  try {
    const sp = await pool.query('SELECT id FROM src_seller_profiles WHERE user_id=$1', [req.user.id]);
    if (!sp.rows.length) return res.status(404).json({ message: 'Profile not found' });
    const r = await pool.query(
      'SELECT * FROM src_seller_payouts WHERE seller_id=$1 ORDER BY created_at DESC',
      [sp.rows[0].id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  registerSeller, getSellerProfile, updateSellerProfile, submitKYC,
  getSellerDashboard, createSellerProduct, getSellerProducts,
  updateSellerProduct, submitProductForReview, deleteSellerProduct,
  getSellerOrders, getSellerPayouts,
};

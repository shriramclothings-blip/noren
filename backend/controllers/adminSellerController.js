/**
 * adminSellerController.js
 * Admin-side endpoints for seller & seller-product management.
 */

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
const {
  sellerKYCApproved, sellerKYCRejected,
  sellerAccountApproved, sellerAccountSuspended,
  sellerProductApproved, sellerProductRejected, sellerProductRemoved,
  sellerPayoutInitiated, sellerPayoutPaid,
} = require('../services/sellerEmailTemplates');

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

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
const getSellerStats = async (req, res) => {
  try {
    const [sellersRes, pendingKycRes, productsRes, ordersRes] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='suspended' OR status='banned' THEN 1 ELSE 0 END) AS suspended
        FROM src_seller_profiles`),
      pool.query(`SELECT COUNT(*) AS count FROM src_seller_profiles WHERE kyc_status='submitted'`),
      pool.query(`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='pending_review' THEN 1 ELSE 0 END) AS pending_review,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected
        FROM src_seller_products WHERE deleted_at IS NULL`),
      pool.query(`SELECT COALESCE(SUM(line_total),0) AS total_gmv FROM src_seller_order_items WHERE status NOT IN ('cancelled','refunded')`),
    ]);
    res.json({
      sellers: sellersRes.rows[0],
      pending_kyc: pendingKycRes.rows[0].count,
      products: productsRes.rows[0],
      gmv: ordersRes.rows[0].total_gmv,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── List All Sellers ────────────────────────────────────────────────────────
const getSellers = async (req, res) => {
  const page   = parseInt(req.query.page)   || 1;
  const limit  = parseInt(req.query.limit)  || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const kyc    = req.query.kyc    || '';

  try {
    const params = [];
    let where = 'WHERE 1=1';
    if (search) { params.push(`%${search}%`); where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR sp.brand_name ILIKE $${params.length})`; }
    if (status) { params.push(status); where += ` AND sp.status=$${params.length}`; }
    if (kyc)    { params.push(kyc);    where += ` AND sp.kyc_status=$${params.length}`; }

    const [sellers, count] = await Promise.all([
      pool.query(
        `SELECT sp.*, u.name, u.email, u.phone, u.avatar_url, u.created_at AS user_created_at
         FROM src_seller_profiles sp
         JOIN src_users u ON u.id = sp.user_id
         ${where}
         ORDER BY sp.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id ${where}`, params),
    ]);
    res.json({ sellers: sellers.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Single Seller Detail ────────────────────────────────────────────────
const getSellerDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const [profileRes, productsRes, ordersRes] = await Promise.all([
      pool.query(
        `SELECT sp.*, u.name, u.email, u.phone, u.avatar_url, u.is_banned, u.created_at AS user_created_at
         FROM src_seller_profiles sp
         JOIN src_users u ON u.id = sp.user_id
         WHERE sp.id=$1`,
        [id]
      ),
      pool.query(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='pending_review' THEN 1 ELSE 0 END) AS pending
        FROM src_seller_products WHERE seller_id=$1 AND deleted_at IS NULL`, [id]),
      pool.query(`SELECT COALESCE(SUM(line_total),0) AS revenue, COALESCE(SUM(commission_amount),0) AS commission, COUNT(*) AS orders
        FROM src_seller_order_items WHERE seller_id=$1 AND status NOT IN ('cancelled','refunded')`, [id]),
    ]);
    if (!profileRes.rows.length) return res.status(404).json({ message: 'Seller not found' });
    res.json({ seller: profileRes.rows[0], products: productsRes.rows[0], orders: ordersRes.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Approve / Reject Seller Account ────────────────────────────────────────
const updateSellerStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason, commission_rate } = req.body;
  const allowed = ['pending','active','suspended','rejected','banned'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  try {
    const prev = await pool.query('SELECT sp.*,u.email,u.name FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id WHERE sp.id=$1', [id]);
    if (!prev.rows.length) return res.status(404).json({ message: 'Seller not found' });
    const seller = prev.rows[0];

    const fields = [`status=$1`];
    const values = [status];
    if (reason !== undefined) { fields.push(`suspension_reason=$${fields.length+1}`); values.push(reason); }
    if (commission_rate !== undefined) { fields.push(`commission_rate=$${fields.length+1}`); values.push(commission_rate); }
    fields.push(`updated_at=NOW()`);
    values.push(id);
    await pool.query(`UPDATE src_seller_profiles SET ${fields.join(',')} WHERE id=$${values.length}`, values);
    await sellerAudit(req.user.id, req.user.role, id, `seller_status_${status}`, 'seller_profile', id, { status: seller.status }, { status }, req.ip);

    // Email notification to seller
    const subject = status === 'active'    ? 'Your NOREN Seller Account is Approved!' :
                    status === 'rejected'  ? 'NOREN Seller Application Update' :
                    status === 'suspended' ? 'Your NOREN Seller Account has been Suspended' :
                    'NOREN Seller Account Update';

    let html;
    if (status === 'active')    html = sellerAccountApproved(seller.name, seller.brand_name);
    else if (status === 'suspended' || status === 'banned') html = sellerAccountSuspended(seller.name, reason);
    else html = `<p>Hi <b>${seller.name}</b>, your seller account status has been updated to <b>${status}</b>${reason ? `: ${reason}` : '.'}.</p>`;

    sendMail(seller.email, subject, html).catch(() => {});

    res.json({ message: `Seller status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Review KYC ──────────────────────────────────────────────────────────────
const reviewKYC = async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body; // action: 'approve' | 'reject'
  if (!['approve','reject'].includes(action)) return res.status(400).json({ message: 'action must be approve or reject' });
  try {
    const prev = await pool.query('SELECT sp.*,u.email,u.name FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id WHERE sp.id=$1', [id]);
    if (!prev.rows.length) return res.status(404).json({ message: 'Seller not found' });
    const seller = prev.rows[0];

    const newKyc    = action === 'approve' ? 'approved' : 'rejected';
    const newStatus = action === 'approve' ? 'active'   : seller.status; // activate on KYC approval

    await pool.query(
      `UPDATE src_seller_profiles
       SET kyc_status=$1, kyc_reviewed_at=NOW(), kyc_reviewed_by=$2,
           kyc_rejection_reason=$3, status=$4, updated_at=NOW()
       WHERE id=$5`,
      [newKyc, req.user.id, reason||null, newStatus, id]
    );
    await sellerAudit(req.user.id, req.user.role, id, `kyc_${action}d`, 'seller_profile', id, null, { kyc_status: newKyc }, req.ip);

    const subject = action === 'approve' ? 'KYC Approved – Your NOREN Seller Account is Active!' : 'KYC Review Update – NOREN Seller';
    const html = action === 'approve'
      ? sellerKYCApproved(seller.name, seller.brand_name)
      : sellerKYCRejected(seller.name, reason);
    sendMail(seller.email, subject, html).catch(() => {});

    res.json({ message: `KYC ${action}d` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── List Seller Products (admin view) ───────────────────────────────────────
const getAdminSellerProducts = async (req, res) => {
  const page   = parseInt(req.query.page)   || 1;
  const limit  = parseInt(req.query.limit)  || 20;
  const offset = (page - 1) * limit;
  const status = req.query.status || '';
  const search = req.query.search || '';
  const sellerId = req.query.seller_id || '';

  try {
    const params = [];
    let where = 'WHERE spp.deleted_at IS NULL';
    if (status)   { params.push(status);          where += ` AND spp.status=$${params.length}`; }
    if (search)   { params.push(`%${search}%`);   where += ` AND spp.title ILIKE $${params.length}`; }
    if (sellerId) { params.push(sellerId);         where += ` AND spp.seller_id=$${params.length}`; }

    const [products, count] = await Promise.all([
      pool.query(
        `SELECT spp.*, sp.brand_name AS seller_brand, u.name AS seller_name, u.email AS seller_email,
                c.name AS category_name,
                (SELECT spi.image_url FROM src_seller_product_images spi WHERE spi.product_id=spp.id AND spi.is_primary=TRUE LIMIT 1) AS primary_image
         FROM src_seller_products spp
         JOIN src_seller_profiles sp ON sp.id = spp.seller_id
         JOIN src_users u ON u.id = sp.user_id
         LEFT JOIN src_categories c ON c.id = spp.category_id
         ${where}
         ORDER BY spp.submitted_at DESC NULLS LAST, spp.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM src_seller_products spp
         JOIN src_seller_profiles sp ON sp.id=spp.seller_id
         JOIN src_users u ON u.id=sp.user_id ${where}`,
        params
      ),
    ]);
    res.json({ products: products.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get Single Seller Product Detail ────────────────────────────────────────
const getAdminSellerProductDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const [prod, images, variants] = await Promise.all([
      pool.query(
        `SELECT spp.*, sp.brand_name AS seller_brand, sp.commission_rate,
                u.name AS seller_name, u.email AS seller_email,
                c.name AS category_name
         FROM src_seller_products spp
         JOIN src_seller_profiles sp ON sp.id=spp.seller_id
         JOIN src_users u ON u.id=sp.user_id
         LEFT JOIN src_categories c ON c.id=spp.category_id
         WHERE spp.id=$1`,
        [id]
      ),
      pool.query('SELECT * FROM src_seller_product_images WHERE product_id=$1 ORDER BY sort_order', [id]),
      pool.query('SELECT * FROM src_seller_product_variants WHERE product_id=$1', [id]),
    ]);
    if (!prod.rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: prod.rows[0], images: images.rows, variants: variants.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Approve / Reject Seller Product ─────────────────────────────────────────
const reviewSellerProduct = async (req, res) => {
  const { id } = req.params;
  const { action, message } = req.body;
  if (!['approve','reject'].includes(action)) return res.status(400).json({ message: 'action must be approve or reject' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prev = await client.query(
      `SELECT spp.*, sp.user_id, sp.commission_rate, sp.id AS seller_profile_id,
              u.email, u.name AS seller_name
       FROM src_seller_products spp
       JOIN src_seller_profiles sp ON sp.id = spp.seller_id
       JOIN src_users u ON u.id = sp.user_id
       WHERE spp.id = $1`,
      [id]
    );
    if (!prev.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Product not found' });
    }
    const prod = prev.rows[0];

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await client.query(
      `UPDATE src_seller_products
       SET status=$1, admin_message=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW()
       WHERE id=$4`,
      [newStatus, message || null, req.user.id, id]
    );

    let platformProductId = prod.platform_product_id || null;

    if (action === 'approve') {
      if (platformProductId) {
        await client.query(
          `UPDATE src_products SET title=$1, description=$2, price=$3, discount_percent=$4,
           category_id=$5, gender=$6, status='approved' WHERE id=$7`,
          [prod.title, prod.description, prod.price, prod.discount_percent,
           prod.category_id, prod.gender, platformProductId]
        );
        await client.query('DELETE FROM src_product_images WHERE product_id=$1', [platformProductId]);
        await client.query('DELETE FROM src_product_variants WHERE product_id=$1', [platformProductId]);
      } else {
        const newProd = await client.query(
          `INSERT INTO src_products (title,description,price,discount_percent,category_id,gender,seller_id,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'approved') RETURNING id`,
          [prod.title, prod.description, prod.price, prod.discount_percent,
           prod.category_id, prod.gender, prod.user_id]
        );
        platformProductId = newProd.rows[0].id;
        await client.query('UPDATE src_seller_products SET platform_product_id=$1 WHERE id=$2', [platformProductId, id]);
        await client.query('UPDATE src_seller_profiles SET total_products=total_products+1 WHERE id=$1', [prod.seller_profile_id]);
      }

      const imgs = await client.query('SELECT * FROM src_seller_product_images WHERE product_id=$1 ORDER BY sort_order', [id]);
      for (const img of imgs.rows) {
        await client.query(
          'INSERT INTO src_product_images (product_id,image_url,is_primary,sort_order) VALUES ($1,$2,$3,$4)',
          [platformProductId, img.image_url, img.is_primary, img.sort_order]
        );
      }
      const vars = await client.query('SELECT * FROM src_seller_product_variants WHERE product_id=$1', [id]);
      for (const v of vars.rows) {
        await client.query(
          'INSERT INTO src_product_variants (product_id,size,stock,extra_price) VALUES ($1,$2,$3,$4)',
          [platformProductId, v.size, v.stock, v.extra_price]
        );
      }
    }

    if (action === 'reject' && prod.platform_product_id) {
      await client.query(`UPDATE src_products SET status='rejected' WHERE id=$1`, [prod.platform_product_id]);
    }

    await client.query('COMMIT');

    await sellerAudit(req.user.id, req.user.role, prod.seller_profile_id, `product_${newStatus}`, 'seller_product', id, { status: prod.status }, { status: newStatus }, req.ip).catch(() => {});

    const subject = action === 'approve' ? `Your Product is Live – ${prod.title}` : `Product Review Update – ${prod.title}`;
    const html = action === 'approve'
      ? sellerProductApproved(prod.seller_name, prod.title, platformProductId)
      : sellerProductRejected(prod.seller_name, prod.title, message);
    sendMail(prod.email, subject, html).catch(() => {});

    res.json({ message: `Product ${newStatus}` });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('reviewSellerProduct error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// ─── Update Seller Product Status (suspend/reinstate from admin) ─────────────
const setSellerProductStatus = async (req, res) => {
  const { id } = req.params;
  const { status, admin_message } = req.body;
  const allowed = ['approved','rejected','suspended','pending_review'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    await pool.query(
      `UPDATE src_seller_products SET status=$1, admin_message=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW() WHERE id=$4`,
      [status, admin_message||null, req.user.id, id]
    );
    res.json({ message: 'Product status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Seller Payouts (admin) ───────────────────────────────────────────────────
const getAdminPayouts = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  try {
    const [payouts, count] = await Promise.all([
      pool.query(
        `SELECT sp2.*, sp.brand_name AS seller_brand, u.name AS seller_name, u.email AS seller_email
         FROM src_seller_payouts sp2
         JOIN src_seller_profiles sp ON sp.id=sp2.seller_id
         JOIN src_users u ON u.id=sp.user_id
         ORDER BY sp2.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM src_seller_payouts'),
    ]);
    res.json({ payouts: payouts.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createAdminPayout = async (req, res) => {
  const { seller_id, net_amount, payment_method, transaction_ref, period_start, period_end, admin_notes } = req.body;
  if (!seller_id || !net_amount) return res.status(400).json({ message: 'seller_id and net_amount required' });
  try {
    const sellerRes = await pool.query('SELECT sp.*,u.email,u.name FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id WHERE sp.id=$1', [seller_id]);
    if (!sellerRes.rows.length) return res.status(404).json({ message: 'Seller not found' });
    const payout = await pool.query(
      `INSERT INTO src_seller_payouts (seller_id,net_amount,payment_method,transaction_ref,period_start,period_end,admin_notes,created_by,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [seller_id, net_amount, payment_method||'', transaction_ref||'', period_start||null, period_end||null, admin_notes||'', req.user.id]
    );
    await sellerAudit(req.user.id, req.user.role, seller_id, 'payout_created', 'seller_payout', payout.rows[0].id, null, { net_amount }, req.ip);

    // Email seller about new payout
    sendMail(sellerRes.rows[0].email,
      `Payout Initiated – ₹${Number(net_amount).toLocaleString('en-IN')} | NOREN`,
      sellerPayoutInitiated(sellerRes.rows[0].name, payout.rows[0])
    ).catch(() => {});

    res.status(201).json(payout.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updatePayoutStatus = async (req, res) => {
  const { id } = req.params;
  const { status, transaction_ref } = req.body;
  const allowed = ['pending','approved','processing','paid','failed','cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    const prev = await pool.query('SELECT * FROM src_seller_payouts WHERE id=$1', [id]);
    if (!prev.rows.length) return res.status(404).json({ message: 'Payout not found' });

    const fields = [`status=$1`, `updated_at=NOW()`];
    const values = [status];
    if (status === 'approved') { fields.push(`approved_by=$${fields.length+1}`, `approved_at=NOW()`); values.push(req.user.id); }
    if (status === 'paid') { fields.push(`paid_at=NOW()`); }
    if (transaction_ref) { fields.push(`transaction_ref=$${fields.length+1}`); values.push(transaction_ref); }
    values.push(id);

    await pool.query(`UPDATE src_seller_payouts SET ${fields.join(',')} WHERE id=$${values.length}`, values);

    // Update seller's total_payout
    if (status === 'paid') {
      await pool.query(`UPDATE src_seller_profiles SET total_payout=total_payout+$1 WHERE id=$2`, [prev.rows[0].net_amount, prev.rows[0].seller_id]);
    }
    await sellerAudit(req.user.id, req.user.role, prev.rows[0].seller_id, `payout_${status}`, 'seller_payout', id, null, { status }, req.ip);

    // Email seller when payout is paid
    if (status === 'paid') {
      try {
        const sellerInfo = await pool.query(
          `SELECT u.email, u.name FROM src_seller_profiles sp JOIN src_users u ON u.id=sp.user_id WHERE sp.id=$1`,
          [prev.rows[0].seller_id]
        );
        if (sellerInfo.rows.length) {
          const updatedPayout = { ...prev.rows[0], paid_at: new Date(), transaction_ref: transaction_ref || prev.rows[0].transaction_ref };
          sendMail(sellerInfo.rows[0].email,
            `Payout Successful – ₹${Number(prev.rows[0].net_amount).toLocaleString('en-IN')} Sent | NOREN`,
            sellerPayoutPaid(sellerInfo.rows[0].name, updatedPayout)
          ).catch(() => {});
        }
      } catch {}
    }

    res.json({ message: `Payout ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Seller Audit Logs ────────────────────────────────────────────────────────
const getSellerAuditLogs = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const sellerId = req.query.seller_id || '';
  try {
    const params = [];
    let where = 'WHERE 1=1';
    if (sellerId) { params.push(sellerId); where += ` AND sal.seller_id=$${params.length}`; }

    const [logs, count] = await Promise.all([
      pool.query(
        `SELECT sal.*, u.name AS actor_name, sp.brand_name AS seller_brand
         FROM src_seller_audit_logs sal
         LEFT JOIN src_users u ON u.id=sal.actor_id
         LEFT JOIN src_seller_profiles sp ON sp.id=sal.seller_id
         ${where}
         ORDER BY sal.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM src_seller_audit_logs sal ${where}`, params),
    ]);
    res.json({ logs: logs.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Remove Seller Product (soft delete + hide from platform + professional email) ──
const removeSellerProduct = async (req, res) => {
  const { id } = req.params;
  const { reason, category } = req.body;
  // reason: the compliance reason text
  // category: 'quality' | 'policy' | 'pricing' | 'ip' | 'safety' | 'other'
  if (!reason?.trim()) return res.status(400).json({ message: 'Removal reason is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prod = await client.query(
      `SELECT spp.*, sp.user_id, sp.id AS seller_profile_id,
              u.email, u.name AS seller_name, sp.brand_name AS seller_brand
       FROM src_seller_products spp
       JOIN src_seller_profiles sp ON sp.id = spp.seller_id
       JOIN src_users u ON u.id = sp.user_id
       WHERE spp.id = $1`,
      [id]
    );
    if (!prod.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Product not found' }); }
    const p = prod.rows[0];

    const caseRef = `NRN-${Date.now().toString(36).toUpperCase()}-${id}`;

    // 1. Soft-delete the seller product
    await client.query(
      `UPDATE src_seller_products
       SET deleted_at=NOW(), status='rejected', admin_message=$1, reviewed_by=$2, reviewed_at=NOW(), updated_at=NOW()
       WHERE id=$3`,
      [`[REMOVED] ${reason}`, req.user.id, id]
    );

    // 2. Hide / soft-delete the platform product if it was live
    if (p.platform_product_id) {
      await client.query(
        `UPDATE src_products SET deleted_at=NOW(), status='rejected' WHERE id=$1`,
        [p.platform_product_id]
      );
    }

    // 3. Decrement seller total_products count
    await client.query(
      `UPDATE src_seller_profiles SET total_products=GREATEST(0, total_products-1) WHERE id=$1`,
      [p.seller_profile_id]
    );

    await client.query('COMMIT');

    // 4. Audit log
    await sellerAudit(req.user.id, req.user.role, p.seller_profile_id, 'product_removed', 'seller_product', id,
      { status: p.status, platform_product_id: p.platform_product_id },
      { deleted_at: new Date(), reason, category, caseRef },
      req.ip
    ).catch(() => {});

    // 5. Send professional removal email
    const fullReason = buildRemovalReason(category, reason);
    sendMail(
      p.email,
      `Important: Product Listing Removal Notice – ${p.title} | NOREN`,
      sellerProductRemoved(p.seller_name, p.title, fullReason, caseRef)
    ).catch(() => {});

    res.json({ message: 'Product removed successfully', case_ref: caseRef });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('removeSellerProduct error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// Build a detailed, professional reason string from category + custom text
const buildRemovalReason = (category, reason) => {
  const prefixes = {
    quality:  'Quality & Accuracy Issue: ',
    policy:   'Marketplace Policy Violation: ',
    pricing:  'Pricing Irregularity: ',
    ip:       'Intellectual Property Concern: ',
    safety:   'Product Safety Concern: ',
    other:    '',
  };
  return (prefixes[category] || '') + reason;
};

module.exports = {
  getSellerStats, getSellers, getSellerDetail, updateSellerStatus,
  reviewKYC, getAdminSellerProducts, getAdminSellerProductDetail,
  reviewSellerProduct, setSellerProductStatus, removeSellerProduct,
  getAdminPayouts, createAdminPayout, updatePayoutStatus,
  getSellerAuditLogs,
};

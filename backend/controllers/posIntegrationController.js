'use strict';

/**
 * VENDEXA RetailOS™ × NOREN — POS Integration Controller
 *
 * Sections:
 *   A. Device management   – register, list, revoke POS terminals
 *   B. Invoice sync        – idempotent invoice creation from POS
 *   C. Token management    – generate / revoke public invoice tokens
 *   D. Public invoice      – no-login endpoint for QR-code access
 *   E. Sync queue          – status, retry, ack operations
 *   F. Admin overview      – dashboard stats, device activity
 *   G. Internal helpers
 */

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getScopedBusinessId = (req) =>
  req.tenant?.business_id || req.user?.business_id || null;

/** Append a row to src_pos_audit_events (fire-and-forget, never throws). */
async function auditEvent(db, { businessId, deviceId, actorId, eventType, refType, refId, detail, ip }) {
  try {
    await db.query(
      `INSERT INTO src_pos_audit_events
         (business_id, device_id, actor_user_id, event_type, ref_type, ref_id, detail, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [businessId ?? null, deviceId ?? null, actorId ?? null,
       eventType, refType ?? null, refId ?? null, detail ?? null, ip ?? null]
    );
  } catch (e) {
    console.error('[posAudit]', e.message);
  }
}

/** SHA-256 hex of a string (for token hashing and IP hashing). */
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Extract caller IP from Express request. */
const callerIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress || null;

// ─── A. Device management ─────────────────────────────────────────────────────

/**
 * POST /api/erp/pos/integration/devices/register
 * Body: { device_fingerprint, device_name, store_id? }
 * Authenticated by: existing staff JWT (cashier / store_admin / admin)
 *
 * Creates a pending device record and issues a one-time plaintext API key.
 * The API key is shown ONCE and then only the bcrypt hash is stored.
 */
const registerDevice = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { device_fingerprint, device_name = 'VENDEXA RetailOS', store_id } = req.body;
  if (!device_fingerprint || device_fingerprint.length < 10)
    return res.status(400).json({ message: 'device_fingerprint is required (min 10 chars)' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Prevent double-registration of the same fingerprint
    const existing = await client.query(
      `SELECT id, status FROM src_pos_devices
       WHERE business_id=$1 AND device_fingerprint=$2`,
      [business_id, device_fingerprint]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      const d = existing.rows[0];
      return res.status(409).json({
        message: `Device already registered (status: ${d.status})`,
        device_id: d.id,
      });
    }

    // Generate a cryptographically random 32-byte API key
    const rawKey   = 'vpk_' + crypto.randomBytes(32).toString('hex');  // 68 chars
    const keyHash  = await bcrypt.hash(rawKey, 12);
    const keyPrefix = rawKey.slice(0, 10);   // "vpk_XXXXXX" — safe to display

    const result = await client.query(
      `INSERT INTO src_pos_devices
         (business_id, store_id, device_fingerprint, device_name,
          registered_by, status, api_key_hash, api_key_prefix, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7,NOW(),NOW())
       RETURNING id, device_name, device_fingerprint, status, api_key_prefix, created_at`,
      [business_id, store_id || null, device_fingerprint, device_name,
       req.user.id, keyHash, keyPrefix]
    );
    const device = result.rows[0];

    await auditEvent(client, {
      businessId: business_id,
      deviceId: device.id,
      actorId: req.user.id,
      eventType: 'device.registered',
      refType: 'device',
      refId: device_fingerprint,
      detail: `Device "${device_name}" registered by ${req.user.name}`,
      ip: callerIp(req),
    });

    await client.query('COMMIT');

    // Return the plaintext API key ONCE — never again
    return res.status(201).json({
      message: 'Device registered successfully. Save the api_key — it will not be shown again.',
      device: {
        id: device.id,
        device_name: device.device_name,
        status: device.status,
        api_key_prefix: device.api_key_prefix,
        created_at: device.created_at,
      },
      api_key: rawKey,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[posIntegration] registerDevice:', err.message);
    return res.status(500).json({ message: 'Failed to register device' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/erp/pos/integration/devices
 * Returns all devices for this business (admin/manager only).
 */
const listDevices = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  try {
    const result = await pool.query(
      `SELECT d.id, d.device_name, d.device_fingerprint, d.store_id,
              d.status, d.api_key_prefix, d.last_seen_at, d.last_sync_at,
              d.last_ip, d.revoked_at, d.notes, d.created_at,
              u.name AS registered_by_name,
              s.name AS store_name,
              (SELECT COUNT(*) FROM src_pos_sync_queue q
               WHERE q.device_id = d.id AND q.status = 'pending') AS pending_ops,
              (SELECT COUNT(*) FROM src_pos_sync_queue q
               WHERE q.device_id = d.id AND q.status = 'failed')  AS failed_ops
       FROM src_pos_devices d
       LEFT JOIN src_users  u ON u.id = d.registered_by
       LEFT JOIN src_stores s ON s.id = d.store_id
       WHERE d.business_id = $1
       ORDER BY d.created_at DESC`,
      [business_id]
    );
    return res.json({ devices: result.rows });
  } catch (err) {
    console.error('[posIntegration] listDevices:', err.message);
    return res.status(500).json({ message: 'Failed to list devices' });
  }
};

/**
 * PUT /api/erp/pos/integration/devices/:id/status
 * Body: { status: 'active'|'suspended'|'revoked', notes? }
 */
const updateDeviceStatus = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;
  const { status, notes } = req.body;
  const allowed = ['active', 'suspended', 'revoked'];
  if (!allowed.includes(status))
    return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });

  try {
    const result = await pool.query(
      `UPDATE src_pos_devices
       SET status     = $1,
           notes      = COALESCE($2, notes),
           revoked_at = CASE WHEN $1 = 'revoked' THEN NOW() ELSE revoked_at END,
           revoked_by = CASE WHEN $1 = 'revoked' THEN $3 ELSE revoked_by END,
           updated_at = NOW()
       WHERE id = $4 AND business_id = $5
       RETURNING id, device_name, status`,
      [status, notes || null, req.user.id, id, business_id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: 'Device not found' });

    const device = result.rows[0];
    await auditEvent(pool, {
      businessId: business_id,
      deviceId: device.id,
      actorId: req.user.id,
      eventType: `device.${status}`,
      refType: 'device',
      refId: String(device.id),
      detail: `Device "${device.device_name}" set to ${status} by ${req.user.name}`,
      ip: callerIp(req),
    });

    return res.json({ device: result.rows[0] });
  } catch (err) {
    console.error('[posIntegration] updateDeviceStatus:', err.message);
    return res.status(500).json({ message: 'Failed to update device status' });
  }
};

/**
 * POST /api/erp/pos/integration/devices/authenticate
 * Body: { device_fingerprint, api_key }
 * Returns: { device_id, business_id, store_id, token } (short-lived JWT-like context)
 *
 * Used by the POS at startup to confirm connectivity and get its server device_id.
 */
const authenticateDevice = async (req, res) => {
  const { device_fingerprint, api_key } = req.body;
  if (!device_fingerprint || !api_key)
    return res.status(400).json({ message: 'device_fingerprint and api_key are required' });

  try {
    // Find the device by fingerprint across any business
    const result = await pool.query(
      `SELECT d.id, d.business_id, d.store_id, d.status, d.api_key_hash
       FROM src_pos_devices d
       WHERE d.device_fingerprint = $1 AND d.status = 'active'
       LIMIT 1`,
      [device_fingerprint]
    );

    if (!result.rows.length)
      return res.status(401).json({ message: 'Device not found or not active' });

    const device = result.rows[0];

    // Verify the supplied API key against the stored bcrypt hash
    const valid = await bcrypt.compare(api_key, device.api_key_hash);
    if (!valid) {
      await auditEvent(pool, {
        businessId: device.business_id,
        deviceId: device.id,
        eventType: 'device.auth_failed',
        refType: 'device',
        refId: device_fingerprint,
        detail: 'Invalid API key supplied',
        ip: callerIp(req),
      });
      return res.status(401).json({ message: 'Invalid API key' });
    }

    // Update last_seen
    await pool.query(
      `UPDATE src_pos_devices SET last_seen_at=$1, last_ip=$2, updated_at=NOW() WHERE id=$3`,
      [new Date(), callerIp(req), device.id]
    );

    await auditEvent(pool, {
      businessId: device.business_id,
      deviceId: device.id,
      eventType: 'device.authenticated',
      refType: 'device',
      refId: device_fingerprint,
      ip: callerIp(req),
    });

    return res.json({
      device_id:   device.id,
      business_id: device.business_id,
      store_id:    device.store_id,
    });
  } catch (err) {
    console.error('[posIntegration] authenticateDevice:', err.message);
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

// ─── B. Invoice synchronization ───────────────────────────────────────────────

/**
 * POST /api/erp/pos/integration/invoices/sync
 * Body: {
 *   idempotency_key,   — UUID v4, client-generated
 *   device_id,         — server device id from authenticateDevice
 *   bill_no,           — POS-side bill number (preserved as-is)
 *   items[],           — [{inventory_item_id, title, sku, quantity, unit_price,
 *                          tax_amount, discount_amount, line_total, gst_rate}]
 *   payment_method,
 *   split_payment?,
 *   customer_id?,
 *   discount_amount,
 *   tax_amount,
 *   round_off,
 *   total,
 *   notes?,
 *   store_credit_used?,
 *   created_at,        — original POS timestamp (important for offline sales)
 * }
 *
 * Returns the canonical sale record + public QR token.
 * IDEMPOTENT: re-posting the same idempotency_key returns the existing record.
 */
const syncInvoice = async (req, res) => {
  const {
    idempotency_key,
    device_id,
    bill_no,
    items,
    payment_method = 'cash',
    split_payment,
    customer_id,
    discount_amount = 0,
    tax_amount = 0,
    round_off = 0,
    total,
    notes,
    store_credit_used = 0,
    created_at: posCreatedAt,
  } = req.body;

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!idempotency_key || idempotency_key.length < 10)
    return res.status(400).json({ message: 'idempotency_key is required (UUID v4)' });
  if (!device_id)
    return res.status(400).json({ message: 'device_id is required' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'items array is required and must be non-empty' });
  if (!total || Number(total) <= 0)
    return res.status(400).json({ message: 'total must be greater than 0' });

  // Validate device belongs to a live business
  let deviceRow;
  try {
    const dr = await pool.query(
      `SELECT id, business_id, store_id, status
       FROM src_pos_devices WHERE id=$1 AND status='active'`,
      [device_id]
    );
    if (!dr.rows.length)
      return res.status(403).json({ message: 'Device not found or not active' });
    deviceRow = dr.rows[0];
  } catch (err) {
    console.error('[syncInvoice] device lookup:', err.message);
    return res.status(500).json({ message: 'Failed to verify device' });
  }

  const business_id = deviceRow.business_id;
  const store_id    = deviceRow.store_id;

  // ── Idempotency: return existing if already processed ────────────────────
  try {
    const existCheck = await pool.query(
      `SELECT s.id, s.bill_no, s.total, s.status, s.payment_status, s.created_at,
              t.token_hash AS token_prefix_hint
       FROM src_erp_sales s
       LEFT JOIN src_pos_invoice_tokens t ON t.sale_id = s.id AND t.revoked = FALSE
       WHERE s.idempotency_key = $1 AND s.business_id = $2
       LIMIT 1`,
      [idempotency_key, business_id]
    );
    if (existCheck.rows.length) {
      const existing = existCheck.rows[0];
      return res.json({
        already_synced: true,
        sale_id:   existing.id,
        bill_no:   existing.bill_no,
        total:     existing.total,
        status:    existing.status,
        public_token: existing.token_prefix_hint
          ? await _getPublicTokenForSale(existing.id)
          : null,
      });
    }
  } catch (err) {
    console.error('[syncInvoice] idempotency check:', err.message);
    return res.status(500).json({ message: 'Server error during idempotency check' });
  }

  // ── Create sale in a transaction ─────────────────────────────────────────
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Determine bill_no: prefer the one from POS; if collision, generate server-side
    let finalBillNo = bill_no;
    if (finalBillNo) {
      const billExists = await client.query(
        `SELECT id FROM src_erp_sales WHERE bill_no=$1 AND business_id=$2`,
        [finalBillNo, business_id]
      );
      if (billExists.rows.length) {
        // Collision — generate a new server-side bill number and preserve POS bill as note
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
        finalBillNo = `BILL-${datePart}-${rand}`;
      }
    } else {
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
      finalBillNo = `BILL-${datePart}-${rand}`;
    }

    // Insert the sale
    const saleResult = await client.query(
      `INSERT INTO src_erp_sales
         (business_id, store_id, customer_id, cashier_id, bill_no, channel,
          payment_method, split_payment, discount_amount, tax_amount,
          round_off, total, notes, status, payment_status,
          idempotency_key, pos_device_id, source, sync_status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'pos',$6,$7,$8,$9,$10,$11,$12,
               'completed','paid',$13,$14,'pos','synced',
               COALESCE($15::TIMESTAMPTZ, NOW()), NOW())
       RETURNING *`,
      [
        business_id,
        store_id,
        customer_id || null,
        req.user?.id || null,
        finalBillNo,
        payment_method,
        JSON.stringify(Array.isArray(split_payment) ? split_payment : []),
        Number(discount_amount),
        Number(tax_amount),
        Number(round_off),
        Number(total),
        notes || (bill_no && bill_no !== finalBillNo ? `POS Bill: ${bill_no}` : null),
        idempotency_key,
        device_id,
        posCreatedAt || null,
      ]
    );
    const sale = saleResult.rows[0];

    // Insert sale items + deduct stock
    for (const item of items) {
      const {
        inventory_item_id,
        title,
        sku,
        quantity,
        unit_price,
        tax_amount:    item_tax  = 0,
        discount_amount: item_disc = 0,
        line_total,
        gst_rate,
      } = item;

      await client.query(
        `INSERT INTO src_erp_sale_items
           (sale_id, inventory_item_id, title, sku, quantity,
            unit_price, tax_amount, discount_amount, line_total, gst_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [sale.id, inventory_item_id, title, sku || null,
         Number(quantity), Number(unit_price), Number(item_tax),
         Number(item_disc), Number(line_total), gst_rate || null]
      );

      // Atomic stock deduction
      const stockResult = await client.query(
        `UPDATE src_erp_inventory_items
         SET current_stock = current_stock - $1, updated_at = NOW()
         WHERE id = $2 AND business_id = $3 AND current_stock >= $1
         RETURNING current_stock`,
        [Number(quantity), inventory_item_id, business_id]
      );
      if (stockResult.rowCount === 0)
        throw new Error(`Insufficient stock for: ${title}`);

      await client.query(
        `INSERT INTO src_erp_inventory_movements
           (business_id, inventory_item_id, store_id, movement_type,
            quantity, balance_after, reference_type, reference_id, created_by)
         VALUES ($1,$2,$3,'sale',$4,$5,'sale',$6,$7)`,
        [business_id, inventory_item_id, store_id,
         -Number(quantity), stockResult.rows[0].current_stock,
         finalBillNo, req.user?.id || null]
      );
    }

    // Loyalty points
    if (customer_id) {
      const bizResult = await client.query(
        `SELECT settings FROM src_businesses WHERE id=$1`, [business_id]
      );
      const settings = bizResult.rows[0]?.settings || {};
      const loyaltyRate = parseFloat(settings.loyalty_rate || '1');
      const pointsEarned = Math.floor((Number(total) / 100) * loyaltyRate);

      await client.query(
        `UPDATE src_erp_customers
         SET loyalty_points = loyalty_points + $1,
             store_credit   = GREATEST(store_credit - $2, 0),
             updated_at     = NOW()
         WHERE id=$3 AND business_id=$4`,
        [pointsEarned, Number(store_credit_used), customer_id, business_id]
      );
    }

    // ── Generate secure public invoice token ─────────────────────────────
    const rawToken  = crypto.randomBytes(32).toString('hex');  // 64-char hex
    const tokenHash = sha256(rawToken);
    const tokenPfx  = rawToken.slice(0, 8);

    await client.query(
      `INSERT INTO src_pos_invoice_tokens
         (sale_id, business_id, token_hash, token_prefix, created_at)
       VALUES ($1,$2,$3,$4,NOW())`,
      [sale.id, business_id, tokenHash, tokenPfx]
    );

    await auditEvent(client, {
      businessId: business_id,
      deviceId: device_id,
      actorId: req.user?.id,
      eventType: 'invoice.created',
      refType: 'sale',
      refId: finalBillNo,
      detail: `₹${total} — ${items.length} item(s)`,
      ip: callerIp(req),
    });

    await auditEvent(client, {
      businessId: business_id,
      deviceId: device_id,
      actorId: req.user?.id,
      eventType: 'token.generated',
      refType: 'token',
      refId: tokenPfx,
      detail: `Token for sale ${finalBillNo}`,
      ip: callerIp(req),
    });

    // Update device last_sync_at
    await client.query(
      `UPDATE src_pos_devices SET last_sync_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [device_id]
    );

    await client.query('COMMIT');

    // ── Trigger service integrations (async, non-blocking) ──────────────────
    // This happens after commit to avoid blocking the sync response
    setImmediate(async () => {
      try {
        const { processInvoiceServices } = require('../services/posServiceIntegration');
        
        // Prepare invoice data for services
        const invoiceData = {
          saleId: sale.id,
          invoiceNumber: finalBillNo,
          customerName: req.body.customer_name || 'Valued Customer',
          customerEmail: req.body.customer_email,
          customerPhone: req.body.customer_phone,
          date: posCreatedAt || sale.created_at,
          total: sale.total,
          items: items.map(item => ({
            name: item.title,
            qty: item.quantity,
            price: item.unit_price,
            lineTotal: item.line_total
          })),
          paymentMode: payment_method,
          notes: notes,
          invoiceToken: rawToken,
          qrUrl: `${process.env.FRONTEND_URL?.split(',')[0] || ''}/my-billing/invoice/${rawToken}`,
          deviceId: device_id,
          userId: req.user?.id
        };

        // Process all services (email, AI insights, notifications)
        await processInvoiceServices(invoiceData, {
          sendEmail: true,              // Send receipt email if customer email provided
          generateInsights: false,      // Optional: enable AI insights for analytics
          sendNotification: false       // Optional: enable messaging notifications
        });
      } catch (err) {
        console.error('[syncInvoice] Service integration error:', err.message);
        // Don't fail the sync if service integration fails
      }
    });

    return res.status(201).json({
      sale_id:      sale.id,
      bill_no:      finalBillNo,
      total:        sale.total,
      status:       sale.status,
      payment_status: sale.payment_status,
      public_token: rawToken,
      public_url: `${process.env.FRONTEND_URL?.split(',')[0] || ''}/my-billing/invoice/${rawToken}`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[posIntegration] syncInvoice:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to sync invoice' });
  } finally {
    client.release();
  }
};

/** Helper: retrieve the active (non-revoked) public token string prefix for a sale. */
async function _getPublicTokenForSale(saleId) {
  try {
    const r = await pool.query(
      `SELECT token_prefix FROM src_pos_invoice_tokens
       WHERE sale_id=$1 AND revoked=FALSE ORDER BY created_at DESC LIMIT 1`,
      [saleId]
    );
    return r.rows[0]?.token_prefix || null;
  } catch { return null; }
}

// ─── C. Token management ─────────────────────────────────────────────────────

/**
 * POST /api/erp/pos/integration/invoices/:saleId/revoke-token
 * Revokes the current token and optionally generates a replacement.
 * Body: { reason?, generate_replacement?: true }
 */
const revokeToken = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { saleId } = req.params;
  const { reason, generate_replacement = true } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find the active token for this sale
    const tokenRes = await client.query(
      `SELECT id, token_prefix FROM src_pos_invoice_tokens
       WHERE sale_id=$1 AND business_id=$2 AND revoked=FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [saleId, business_id]
    );
    if (!tokenRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No active token found for this invoice' });
    }
    const oldToken = tokenRes.rows[0];

    // Revoke it
    await client.query(
      `UPDATE src_pos_invoice_tokens
       SET revoked=TRUE, revoked_at=NOW(), revoked_by=$1
       WHERE id=$2`,
      [req.user.id, oldToken.id]
    );

    await auditEvent(client, {
      businessId: business_id,
      actorId: req.user.id,
      eventType: 'token.revoked',
      refType: 'token',
      refId: oldToken.token_prefix,
      detail: reason || 'Admin revocation',
      ip: callerIp(req),
    });

    let newToken = null;
    let newPublicUrl = null;

    if (generate_replacement) {
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);
      const tokenPfx  = rawToken.slice(0, 8);

      const newTokenRes = await client.query(
        `INSERT INTO src_pos_invoice_tokens
           (sale_id, business_id, token_hash, token_prefix, created_at)
         VALUES ($1,$2,$3,$4,NOW())
         RETURNING id`,
        [saleId, business_id, tokenHash, tokenPfx]
      );

      // Link old token → replacement
      await client.query(
        `UPDATE src_pos_invoice_tokens SET replacement_id=$1 WHERE id=$2`,
        [newTokenRes.rows[0].id, oldToken.id]
      );

      newToken = rawToken;
      newPublicUrl = `${process.env.FRONTEND_URL?.split(',')[0] || ''}/my-billing/invoice/${rawToken}`;

      await auditEvent(client, {
        businessId: business_id,
        actorId: req.user.id,
        eventType: 'token.generated',
        refType: 'token',
        refId: tokenPfx,
        detail: `Replacement for revoked token ${oldToken.token_prefix}`,
        ip: callerIp(req),
      });
    }

    await client.query('COMMIT');

    return res.json({
      revoked_token_prefix: oldToken.token_prefix,
      new_token: newToken,
      new_public_url: newPublicUrl,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[posIntegration] revokeToken:', err.message);
    return res.status(500).json({ message: 'Failed to revoke token' });
  } finally {
    client.release();
  }
};

// ─── D. Public invoice access (no auth required) ─────────────────────────────

/**
 * GET /api/invoices/public/:token
 * Rate-limited, no authentication needed.
 * Returns only the data required for the customer invoice view.
 * Never exposes: internal IDs, customer phone, email, raw payment credentials.
 */
const getPublicInvoice = async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 20)
    return res.status(400).json({ message: 'Invalid token' });

  const tokenHash = sha256(token);

  try {
    // Resolve token → sale
    const tokenRes = await pool.query(
      `SELECT t.id AS token_id, t.sale_id, t.revoked, t.expires_at,
              t.business_id
       FROM src_pos_invoice_tokens t
       WHERE t.token_hash = $1`,
      [tokenHash]
    );

    if (!tokenRes.rows.length)
      return res.status(404).json({ message: 'Invoice not found' });

    const tok = tokenRes.rows[0];

    if (tok.revoked)
      return res.status(410).json({ message: 'This invoice link has been revoked' });

    if (tok.expires_at && new Date(tok.expires_at) < new Date())
      return res.status(410).json({ message: 'This invoice link has expired' });

    // Fetch the full sale + items + store info
    const saleRes = await pool.query(
      `SELECT
          s.id, s.bill_no, s.total, s.discount_amount, s.tax_amount,
          s.round_off, s.payment_method, s.payment_status, s.status,
          s.split_payment, s.notes, s.created_at,
          b.name AS business_name,
          b.address AS business_address,
          b.phone AS business_phone,
          b.email AS business_email,
          b.gst_number,
          st.name AS store_name,
          st.address AS store_address,
          st.phone AS store_phone,
          COALESCE(
            (SELECT json_agg(
               json_build_object(
                 'title',           i.title,
                 'sku',             i.sku,
                 'quantity',        i.quantity,
                 'unit_price',      i.unit_price,
                 'discount_amount', i.discount_amount,
                 'tax_amount',      i.tax_amount,
                 'gst_rate',        i.gst_rate,
                 'line_total',      i.line_total
               )
             ) FROM src_erp_sale_items i WHERE i.sale_id = s.id
            ), '[]'
          ) AS items,
          CASE WHEN s.customer_id IS NOT NULL THEN
            (SELECT c.name FROM src_erp_customers c WHERE c.id = s.customer_id)
          ELSE NULL END AS customer_name
       FROM src_erp_sales s
       JOIN src_businesses b ON b.id = s.business_id
       LEFT JOIN src_stores st ON st.id = s.store_id
       WHERE s.id = $1`,
      [tok.sale_id]
    );

    if (!saleRes.rows.length)
      return res.status(404).json({ message: 'Invoice record not found' });

    const sale = saleRes.rows[0];

    // Increment access counter (fire-and-forget)
    pool.query(
      `UPDATE src_pos_invoice_tokens
       SET access_count = access_count + 1, last_accessed = NOW()
       WHERE id = $1`,
      [tok.token_id]
    ).catch(() => {});

    // Log access (no raw IP stored)
    pool.query(
      `INSERT INTO src_pos_invoice_access_log
         (token_id, business_id, ip_hash, user_agent, action)
       VALUES ($1,$2,$3,$4,'view')`,
      [
        tok.token_id,
        tok.business_id,
        sha256(callerIp(req) || 'unknown'),
        (req.headers['user-agent'] || '').slice(0, 500),
      ]
    ).catch(() => {});

    return res.json({ invoice: sale });
  } catch (err) {
    console.error('[posIntegration] getPublicInvoice:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve invoice' });
  }
};

/**
 * POST /api/invoices/verify
 * Body: { token }
 * Returns a server-signed verification payload — does NOT expose extra PII.
 */
const verifyInvoice = async (req, res) => {
  const { token } = req.body;
  if (!token || token.length < 20)
    return res.status(400).json({ message: 'token is required' });

  const tokenHash = sha256(token);

  try {
    const result = await pool.query(
      `SELECT t.revoked, t.expires_at, t.access_count, t.created_at,
              s.bill_no, s.total, s.payment_status, s.status,
              b.name AS business_name
       FROM src_pos_invoice_tokens t
       JOIN src_erp_sales s ON s.id = t.sale_id
       JOIN src_businesses b ON b.id = t.business_id
       WHERE t.token_hash = $1`,
      [tokenHash]
    );

    if (!result.rows.length)
      return res.json({
        valid: false,
        exists: false,
        message: 'No invoice matches this token',
      });

    const r = result.rows[0];
    const expired = r.expires_at && new Date(r.expires_at) < new Date();

    return res.json({
      valid:          !r.revoked && !expired,
      exists:         true,
      revoked:        r.revoked,
      expired,
      bill_no:        r.bill_no,
      total:          r.total,
      payment_status: r.payment_status,
      invoice_status: r.status,
      business_name:  r.business_name,
      issued_at:      r.created_at,
      // HMAC signature so the frontend can show a "verified by NOREN" badge
      signature: crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'noren-verify')
        .update(`${r.bill_no}|${r.total}|${r.payment_status}`)
        .digest('hex')
        .slice(0, 16),
    });
  } catch (err) {
    console.error('[posIntegration] verifyInvoice:', err.message);
    return res.status(500).json({ message: 'Verification failed' });
  }
};

// ─── E. Sync queue ────────────────────────────────────────────────────────────

/** GET /api/erp/pos/integration/sync/status  */
const getSyncStatus = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const device_id = req.query.device_id;

  try {
    const params = [business_id];
    let deviceClause = '';
    if (device_id) {
      deviceClause = ' AND device_id = $2';
      params.push(device_id);
    }

    const result = await pool.query(
      `SELECT
         status,
         COUNT(*)                                      AS count,
         MAX(updated_at)                               AS last_updated,
         SUM(CASE WHEN retry_count >= 3 THEN 1 ELSE 0 END) AS exhausted
       FROM src_pos_sync_queue
       WHERE business_id = $1${deviceClause}
       GROUP BY status`,
      params
    );

    const stats = { pending: 0, processing: 0, done: 0, failed: 0, conflict: 0, exhausted: 0 };
    for (const row of result.rows) {
      stats[row.status] = parseInt(row.count);
      if (row.status === 'failed') stats.exhausted = parseInt(row.exhausted || 0);
    }

    return res.json({ sync_status: stats });
  } catch (err) {
    console.error('[posIntegration] getSyncStatus:', err.message);
    return res.status(500).json({ message: 'Failed to get sync status' });
  }
};

/** POST /api/erp/pos/integration/sync/retry — re-queue failed items */
const retrySyncItems = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { item_ids } = req.body;  // optional: specific IDs; omit to retry all failed

  try {
    let q;
    if (Array.isArray(item_ids) && item_ids.length) {
      q = await pool.query(
        `UPDATE src_pos_sync_queue
         SET status='pending', last_error=NULL, updated_at=NOW()
         WHERE business_id=$1 AND status='failed'
           AND id = ANY($2::int[])
         RETURNING id`,
        [business_id, item_ids]
      );
    } else {
      q = await pool.query(
        `UPDATE src_pos_sync_queue
         SET status='pending', last_error=NULL, updated_at=NOW()
         WHERE business_id=$1 AND status='failed'
         RETURNING id`,
        [business_id]
      );
    }
    return res.json({ retried: q.rowCount });
  } catch (err) {
    console.error('[posIntegration] retrySyncItems:', err.message);
    return res.status(500).json({ message: 'Failed to retry sync items' });
  }
};

// ─── F. Admin overview ────────────────────────────────────────────────────────

/** GET /api/erp/pos/integration/overview */
const getAdminOverview = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  try {
    const [devicesRes, invoicesRes, syncRes, recentErrorsRes] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*) AS count FROM src_pos_devices
         WHERE business_id=$1 GROUP BY status`,
        [business_id]
      ),
      pool.query(
        `SELECT
           COUNT(*)                                          AS total_invoices,
           COALESCE(SUM(total), 0)                          AS total_revenue,
           COUNT(*) FILTER (WHERE payment_status = 'paid')  AS paid_count,
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS today_count,
           COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) AS today_revenue
         FROM src_erp_sales
         WHERE business_id=$1 AND source='pos'`,
        [business_id]
      ),
      pool.query(
        `SELECT status, COUNT(*) AS count FROM src_pos_sync_queue
         WHERE business_id=$1 GROUP BY status`,
        [business_id]
      ),
      pool.query(
        `SELECT event_type, ref_id, detail, created_at
         FROM src_pos_audit_events
         WHERE business_id=$1 AND event_type LIKE '%.failed%'
         ORDER BY created_at DESC LIMIT 10`,
        [business_id]
      ),
    ]);

    const deviceStats = {};
    for (const r of devicesRes.rows) deviceStats[r.status] = parseInt(r.count);

    const syncStats = {};
    for (const r of syncRes.rows) syncStats[r.status] = parseInt(r.count);

    return res.json({
      devices:      deviceStats,
      invoices:     invoicesRes.rows[0],
      sync:         syncStats,
      recent_errors: recentErrorsRes.rows,
    });
  } catch (err) {
    console.error('[posIntegration] getAdminOverview:', err.message);
    return res.status(500).json({ message: 'Failed to get overview' });
  }
};

/**
 * GET /api/erp/pos/integration/invoices
 * Paginated, server-side filtered invoice list for admin dashboard.
 */
const listAdminInvoices = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const limit    = Math.min(100, parseInt(req.query.limit) || 20);
  const offset   = (page - 1) * limit;
  const { q, date_from, date_to, payment_status, status: invoiceStatus } = req.query;

  try {
    const conditions = ['s.business_id = $1', "s.source = 'pos'"];
    const params = [business_id];
    let idx = 2;

    if (q) {
      conditions.push(`(s.bill_no ILIKE $${idx} OR c.name ILIKE $${idx})`);
      params.push(`%${q}%`); idx++;
    }
    if (date_from) { conditions.push(`s.created_at >= $${idx}`); params.push(date_from); idx++; }
    if (date_to)   { conditions.push(`s.created_at <= $${idx}`); params.push(date_to); idx++; }
    if (payment_status) { conditions.push(`s.payment_status = $${idx}`); params.push(payment_status); idx++; }
    if (invoiceStatus)  { conditions.push(`s.status = $${idx}`);         params.push(invoiceStatus); idx++; }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_erp_sales s
       LEFT JOIN src_erp_customers c ON c.id = s.customer_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const listRes = await pool.query(
      `SELECT s.id, s.bill_no, s.total, s.discount_amount, s.tax_amount,
              s.payment_method, s.payment_status, s.status, s.created_at,
              s.sync_status,
              c.name AS customer_name,
              d.device_name,
              t.token_prefix,
              t.revoked AS token_revoked
       FROM src_erp_sales s
       LEFT JOIN src_erp_customers c ON c.id = s.customer_id
       LEFT JOIN src_pos_devices d ON d.id = s.pos_device_id
       LEFT JOIN LATERAL (
         SELECT token_prefix, revoked FROM src_pos_invoice_tokens
         WHERE sale_id = s.id ORDER BY created_at DESC LIMIT 1
       ) t ON TRUE
       WHERE ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return res.json({ invoices: listRes.rows, total, page, limit });
  } catch (err) {
    console.error('[posIntegration] listAdminInvoices:', err.message);
    return res.status(500).json({ message: 'Failed to list invoices' });
  }
};

/**
 * GET /api/erp/pos/integration/invoices/:saleId
 * Full invoice detail for admin (includes internal fields).
 */
const getAdminInvoiceDetail = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { saleId } = req.params;

  try {
    const saleRes = await pool.query(
      `SELECT s.*,
              c.name  AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              d.device_name, d.device_fingerprint,
              u.name  AS cashier_name,
              st.name AS store_name
       FROM src_erp_sales s
       LEFT JOIN src_erp_customers c ON c.id = s.customer_id
       LEFT JOIN src_pos_devices   d ON d.id = s.pos_device_id
       LEFT JOIN src_users         u ON u.id = s.cashier_id
       LEFT JOIN src_stores       st ON st.id = s.store_id
       WHERE s.id=$1 AND s.business_id=$2`,
      [saleId, business_id]
    );
    if (!saleRes.rows.length)
      return res.status(404).json({ message: 'Invoice not found' });

    const itemsRes = await pool.query(
      `SELECT * FROM src_erp_sale_items WHERE sale_id=$1`, [saleId]
    );
    const tokensRes = await pool.query(
      `SELECT id, token_prefix, revoked, revoked_at, access_count, created_at
       FROM src_pos_invoice_tokens WHERE sale_id=$1 ORDER BY created_at DESC`,
      [saleId]
    );

    return res.json({
      invoice: { ...saleRes.rows[0], items: itemsRes.rows },
      tokens: tokensRes.rows,
    });
  } catch (err) {
    console.error('[posIntegration] getAdminInvoiceDetail:', err.message);
    return res.status(500).json({ message: 'Failed to get invoice detail' });
  }
};

// ─── G. Email receipt ─────────────────────────────────────────────────────────

/**
 * POST /api/erp/pos/integration/invoices/:saleId/send-email
 * Body: { email, name? }
 * Sends the digital receipt to the customer's email using the existing mail service.
 */
const sendReceiptEmail = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { saleId } = req.params;
  const { email, name } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: 'Valid email address is required' });

  try {
    // Fetch the sale
    const saleRes = await pool.query(
      `SELECT s.bill_no, s.total, s.discount_amount, s.tax_amount,
              s.payment_method, s.payment_status, s.status, s.created_at,
              b.name AS business_name,
              t.token_hash AS token_prefix
       FROM src_erp_sales s
       JOIN src_businesses b ON b.id = s.business_id
       LEFT JOIN src_pos_invoice_tokens t
         ON t.sale_id = s.id AND t.revoked = FALSE
       WHERE s.id=$1 AND s.business_id=$2
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [saleId, business_id]
    );

    if (!saleRes.rows.length)
      return res.status(404).json({ message: 'Invoice not found' });

    const sale = saleRes.rows[0];

    // Get the active public URL (find token prefix → not the hash)
    const tokenRow = await pool.query(
      `SELECT token_prefix FROM src_pos_invoice_tokens
       WHERE sale_id=$1 AND revoked=FALSE ORDER BY created_at DESC LIMIT 1`,
      [saleId]
    );
    const tokenPrefix = tokenRow.rows[0]?.token_prefix;
    // We need the full token — not stored; use prefix for display only;
    // send the admin link for the PDF instead
    const adminUrl = `${process.env.FRONTEND_URL?.split(',')[0] || ''}/admin/pos/invoices/${saleId}`;

    const itemsRes = await pool.query(
      `SELECT title, quantity, unit_price, line_total FROM src_erp_sale_items WHERE sale_id=$1`,
      [saleId]
    );

    const itemRows = itemsRes.rows.map(i =>
      `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f0ede8">${i.title}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0ede8;text-align:center">${i.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0ede8;text-align:right">₹${Number(i.unit_price).toFixed(2)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0ede8;text-align:right">₹${Number(i.line_total).toFixed(2)}</td>
      </tr>`
    ).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Invoice ${sale.bill_no}</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr><td style="background:#1a1a18;padding:28px 32px;text-align:center">
          <div style="font-family:'Georgia',serif;font-size:26px;font-weight:700;letter-spacing:.3em;color:#faf9f7;text-transform:uppercase">NOREN</div>
          <div style="color:#c9a96e;font-size:12px;letter-spacing:.15em;margin-top:4px">DIGITAL INVOICE</div>
        </td></tr>
        <!-- Greeting -->
        <tr><td style="padding:28px 32px 0">
          <p style="margin:0;font-size:15px;color:#3d3d3a">Dear ${name || 'Customer'},</p>
          <p style="margin:8px 0 0;font-size:14px;color:#6b6b68">Thank you for your purchase at <strong>${sale.business_name}</strong>. Your digital invoice is below.</p>
        </td></tr>
        <!-- Invoice meta -->
        <tr><td style="padding:20px 32px 0">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;border-radius:6px;padding:16px">
            <tr>
              <td style="font-size:12px;color:#9b9b97;text-transform:uppercase;letter-spacing:.08em">Invoice No.</td>
              <td style="font-size:14px;font-weight:600;color:#1a1a18;text-align:right">${sale.bill_no}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#9b9b97;text-transform:uppercase;letter-spacing:.08em;padding-top:8px">Date</td>
              <td style="font-size:14px;color:#3d3d3a;text-align:right;padding-top:8px">${new Date(sale.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#9b9b97;text-transform:uppercase;letter-spacing:.08em;padding-top:8px">Payment</td>
              <td style="font-size:14px;color:#3d3d3a;text-align:right;padding-top:8px;text-transform:capitalize">${sale.payment_method}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#9b9b97;text-transform:uppercase;letter-spacing:.08em;padding-top:8px">Status</td>
              <td style="text-align:right;padding-top:8px">
                <span style="background:${sale.payment_status === 'paid' ? '#dcfce7' : '#fef9c3'};color:${sale.payment_status === 'paid' ? '#166534' : '#854d0e'};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.06em">${sale.payment_status}</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Items table -->
        <tr><td style="padding:20px 32px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr style="background:#1a1a18">
                <th style="padding:8px;font-size:11px;font-weight:600;color:#c9a96e;letter-spacing:.06em;text-align:left">ITEM</th>
                <th style="padding:8px;font-size:11px;font-weight:600;color:#c9a96e;letter-spacing:.06em;text-align:center">QTY</th>
                <th style="padding:8px;font-size:11px;font-weight:600;color:#c9a96e;letter-spacing:.06em;text-align:right">PRICE</th>
                <th style="padding:8px;font-size:11px;font-weight:600;color:#c9a96e;letter-spacing:.06em;text-align:right">TOTAL</th>
              </tr>
            </thead>
            <tbody style="font-size:13px;color:#3d3d3a">${itemRows}</tbody>
          </table>
        </td></tr>
        <!-- Totals -->
        <tr><td style="padding:16px 32px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${Number(sale.discount_amount) > 0 ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b6b68">Discount</td><td style="text-align:right;font-size:13px;color:#ef4444">- ₹${Number(sale.discount_amount).toFixed(2)}</td></tr>` : ''}
            ${Number(sale.tax_amount) > 0 ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b6b68">Tax (GST)</td><td style="text-align:right;font-size:13px;color:#3d3d3a">₹${Number(sale.tax_amount).toFixed(2)}</td></tr>` : ''}
            <tr style="border-top:2px solid #1a1a18">
              <td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#1a1a18">TOTAL</td>
              <td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:700;color:#1a1a18">₹${Number(sale.total).toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:28px 32px;text-align:center;border-top:1px solid #f0ede8;margin-top:20px">
          <p style="margin:0;font-size:12px;color:#9b9b97">Thank you for shopping with us.</p>
          <p style="margin:4px 0 0;font-size:11px;color:#c2bfba">${sale.business_name}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const sent = await sendMail(
      email,
      `Your Invoice from ${sale.business_name} — ${sale.bill_no}`,
      html
    );

    await auditEvent(pool, {
      businessId: business_id,
      actorId: req.user.id,
      eventType: 'invoice.email_sent',
      refType: 'sale',
      refId: sale.bill_no,
      detail: `Receipt sent to ${email}`,
      ip: callerIp(req),
    });

    return res.json({ sent, bill_no: sale.bill_no });
  } catch (err) {
    console.error('[posIntegration] sendReceiptEmail:', err.message);
    return res.status(500).json({ message: 'Failed to send receipt email' });
  }
};

// ─── H. Connection test / health ─────────────────────────────────────────────

/** GET /api/erp/pos/integration/health  (used by POS Settings panel) */
const integrationHealth = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  try {
    await pool.query('SELECT 1');
    return res.json({
      status: 'ok',
      business_id,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (err) {
    return res.status(503).json({ status: 'degraded', message: err.message });
  }
};

module.exports = {
  // Device
  registerDevice,
  listDevices,
  updateDeviceStatus,
  authenticateDevice,
  // Invoice
  syncInvoice,
  revokeToken,
  sendReceiptEmail,
  // Public (no auth)
  getPublicInvoice,
  verifyInvoice,
  // Sync queue
  getSyncStatus,
  retrySyncItems,
  // Admin
  getAdminOverview,
  listAdminInvoices,
  getAdminInvoiceDetail,
  // Health
  integrationHealth,
};

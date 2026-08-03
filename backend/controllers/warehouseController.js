'use strict';

const { pool, logAudit } = require('../config/db');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

const VALID_ZONE_TYPES = ['receiving', 'dispatch', 'storage', 'returns', 'damaged'];

// ── Zones ─────────────────────────────────────────────────────────────────────

const listZones = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { warehouse_id } = req.query;
    const params = [businessId];
    let where = 'WHERE z.business_id = $1';
    if (warehouse_id) {
      params.push(warehouse_id);
      where += ` AND z.warehouse_id = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT z.*, w.name AS warehouse_name,
              COUNT(b.id) AS bin_count
       FROM src_warehouse_zones z
       LEFT JOIN src_warehouses w ON w.id = z.warehouse_id
       LEFT JOIN src_warehouse_bins b ON b.zone_id = z.id
       ${where}
       GROUP BY z.id, w.name
       ORDER BY z.name ASC`,
      params
    );
    res.json({ zones: result.rows });
  } catch (err) {
    console.error('listZones error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const createZone = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { warehouse_id, name, zone_type = 'storage', capacity = 0 } = req.body;
    if (!warehouse_id || !name) return res.status(400).json({ message: 'warehouse_id and name are required' });
    if (!VALID_ZONE_TYPES.includes(zone_type)) {
      return res.status(400).json({ message: `zone_type must be one of: ${VALID_ZONE_TYPES.join(', ')}` });
    }
    // Verify warehouse belongs to this business
    const whCheck = await pool.query(
      `SELECT id FROM src_warehouses WHERE id = $1 AND business_id = $2`,
      [warehouse_id, businessId]
    );
    if (!whCheck.rows.length) return res.status(400).json({ message: 'warehouse_id not found for this business' });
    const result = await pool.query(
      `INSERT INTO src_warehouse_zones (warehouse_id, business_id, name, zone_type, capacity)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [warehouse_id, businessId, name.trim(), zone_type, Number(capacity)]
    );
    await logAudit(pool, { adminId: req.user?.id, action: 'warehouse.zone_created', targetType: 'zone', targetId: result.rows[0].id, details: name });
    res.status(201).json({ zone: result.rows[0] });
  } catch (err) {
    console.error('createZone error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const updateZone = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { id } = req.params;
    const { name, zone_type, capacity, is_active } = req.body;
    if (zone_type !== undefined && !VALID_ZONE_TYPES.includes(zone_type)) {
      return res.status(400).json({ message: `zone_type must be one of: ${VALID_ZONE_TYPES.join(', ')}` });
    }
    const result = await pool.query(
      `UPDATE src_warehouse_zones
       SET name = COALESCE($1, name),
           zone_type = COALESCE($2, zone_type),
           capacity = COALESCE($3, capacity),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 AND business_id = $6
       RETURNING *`,
      [name, zone_type, capacity !== undefined ? Number(capacity) : null, is_active, id, businessId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Zone not found' });
    res.json({ zone: result.rows[0] });
  } catch (err) {
    console.error('updateZone error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── Bins ──────────────────────────────────────────────────────────────────────

const listBins = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { zone_id, warehouse_id } = req.query;
    const params = [businessId];
    let where = 'WHERE b.business_id = $1';
    if (zone_id) { params.push(zone_id); where += ` AND b.zone_id = $${params.length}`; }
    if (warehouse_id) { params.push(warehouse_id); where += ` AND b.warehouse_id = $${params.length}`; }
    const result = await pool.query(
      `SELECT b.*, z.name AS zone_name FROM src_warehouse_bins b
       LEFT JOIN src_warehouse_zones z ON z.id = b.zone_id
       ${where} ORDER BY b.bin_code ASC`,
      params
    );
    res.json({ bins: result.rows });
  } catch (err) {
    console.error('listBins error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const createBin = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { zone_id, warehouse_id, bin_code, description } = req.body;
    if (!zone_id || !warehouse_id || !bin_code) return res.status(400).json({ message: 'zone_id, warehouse_id and bin_code are required' });
    // Verify zone belongs to this business
    const zoneCheck = await pool.query(
      `SELECT id FROM src_warehouse_zones WHERE id = $1 AND business_id = $2`,
      [zone_id, businessId]
    );
    if (!zoneCheck.rows.length) return res.status(400).json({ message: 'zone_id not found for this business' });
    const result = await pool.query(
      `INSERT INTO src_warehouse_bins (zone_id, warehouse_id, business_id, bin_code, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [zone_id, warehouse_id, businessId, bin_code.trim(), description || null]
    );
    res.status(201).json({ bin: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Bin code already exists in this warehouse' });
    console.error('createBin error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const updateBin = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { id } = req.params;
    const { bin_code, description, is_active } = req.body;
    const result = await pool.query(
      `UPDATE src_warehouse_bins
       SET bin_code = COALESCE($1, bin_code),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 AND business_id = $5 RETURNING *`,
      [bin_code, description, is_active, id, businessId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Bin not found' });
    res.json({ bin: result.rows[0] });
  } catch (err) {
    console.error('updateBin error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── Transfer Requests ─────────────────────────────────────────────────────────

const createTransferRequest = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { inventory_item_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;
    if (!inventory_item_id || !from_warehouse_id || !to_warehouse_id || !quantity) {
      return res.status(400).json({ message: 'inventory_item_id, from_warehouse_id, to_warehouse_id and quantity are required' });
    }
    if (Number(from_warehouse_id) === Number(to_warehouse_id)) {
      return res.status(400).json({ message: 'Source and destination warehouses must be different' });
    }
    // Verify item belongs to business
    const itemRes = await pool.query(
      `SELECT id, title, current_stock FROM src_erp_inventory_items WHERE id = $1 AND business_id = $2`,
      [inventory_item_id, businessId]
    );
    if (!itemRes.rows.length) return res.status(404).json({ message: 'Inventory item not found' });
    if (itemRes.rows[0].current_stock < Number(quantity)) {
      return res.status(422).json({ message: `Insufficient stock. Available: ${itemRes.rows[0].current_stock}` });
    }

    const result = await pool.query(
      `INSERT INTO src_erp_transfer_requests
         (business_id, inventory_item_id, from_warehouse_id, to_warehouse_id, quantity, notes, status, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,'pending_approval',$7) RETURNING *`,
      [businessId, inventory_item_id, from_warehouse_id, to_warehouse_id, Number(quantity), notes || null, req.user.id]
    );
    await logAudit(pool, {
      adminId: req.user.id, action: 'warehouse.transfer_requested',
      targetType: 'transfer_request', targetId: result.rows[0].id,
      details: `Item: ${itemRes.rows[0].title}, qty: ${quantity}`,
    });

    // Notify warehouse managers via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`business:${businessId}`).emit('warehouse:transfer_request', {
          id: result.rows[0].id,
          item_title: itemRes.rows[0].title,
          quantity,
          requested_by: req.user.name,
        });
      }
    } catch {}

    res.status(201).json({ transfer_request: result.rows[0] });
  } catch (err) {
    console.error('createTransferRequest error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const listTransferRequests = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { status } = req.query;
    const params = [businessId];
    let where = 'WHERE tr.business_id = $1';
    if (status) { params.push(status); where += ` AND tr.status = $${params.length}`; }
    const result = await pool.query(
      `SELECT tr.*,
              i.title AS item_title, i.sku,
              fw.name AS from_warehouse_name,
              tw.name AS to_warehouse_name,
              u1.name AS requested_by_name,
              u2.name AS approved_by_name
       FROM src_erp_transfer_requests tr
       LEFT JOIN src_erp_inventory_items i ON i.id = tr.inventory_item_id
       LEFT JOIN src_warehouses fw ON fw.id = tr.from_warehouse_id
       LEFT JOIN src_warehouses tw ON tw.id = tr.to_warehouse_id
       LEFT JOIN src_users u1 ON u1.id = tr.requested_by
       LEFT JOIN src_users u2 ON u2.id = tr.approved_by
       ${where}
       ORDER BY tr.created_at DESC`,
      params
    );
    res.json({ transfer_requests: result.rows });
  } catch (err) {
    console.error('listTransferRequests error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const approveTransfer = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const trRes = await client.query(
      `SELECT * FROM src_erp_transfer_requests WHERE id = $1 AND business_id = $2 FOR UPDATE`,
      [id, businessId]
    );
    if (!trRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Transfer request not found' }); }
    const tr = trRes.rows[0];
    if (tr.status !== 'pending_approval') { await client.query('ROLLBACK'); return res.status(409).json({ message: `Transfer is already ${tr.status}` }); }

    // Check stock again under lock
    const stockRes = await client.query(
      `UPDATE src_erp_inventory_items
       SET current_stock = current_stock - $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3 AND current_stock >= $1
       RETURNING current_stock`,
      [tr.quantity, tr.inventory_item_id, businessId]
    );
    if (!stockRes.rows.length) { await client.query('ROLLBACK'); return res.status(422).json({ message: 'Insufficient stock to complete transfer' }); }
    const balanceAfter = stockRes.rows[0].current_stock;

    // Insert transfer_out movement
    await client.query(
      `INSERT INTO src_erp_inventory_movements
         (business_id, inventory_item_id, warehouse_id, movement_type, quantity, balance_after, reference_type, reference_id, notes, created_by)
       VALUES ($1,$2,$3,'transfer_out',$4,$5,'transfer_request',$6,$7,$8)`,
      [businessId, tr.inventory_item_id, tr.from_warehouse_id, -tr.quantity, balanceAfter, String(id), tr.notes, req.user.id]
    );
    // Insert transfer_in movement
    await client.query(
      `INSERT INTO src_erp_inventory_movements
         (business_id, inventory_item_id, warehouse_id, movement_type, quantity, balance_after, reference_type, reference_id, notes, created_by)
       VALUES ($1,$2,$3,'transfer_in',$4,$5,'transfer_request',$6,$7,$8)`,
      [businessId, tr.inventory_item_id, tr.to_warehouse_id, tr.quantity, balanceAfter, String(id), tr.notes, req.user.id]
    );
    // Update request status
    const updated = await client.query(
      `UPDATE src_erp_transfer_requests
       SET status = 'completed', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );
    await logAudit(client, { adminId: req.user.id, action: 'warehouse.transfer_approved', targetType: 'transfer_request', targetId: id });
    await client.query('COMMIT');
    res.json({ transfer_request: updated.rows[0], balance_after: balanceAfter });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('approveTransfer error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

const rejectTransfer = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { id } = req.params;
    const { reason } = req.body;
    const result = await pool.query(
      `UPDATE src_erp_transfer_requests
       SET status = 'rejected', approved_by = $1, approved_at = NOW(), notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3 AND business_id = $4 AND status = 'pending_approval' RETURNING *`,
      [req.user.id, reason || null, id, businessId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Pending transfer request not found' });
    await logAudit(pool, { adminId: req.user.id, action: 'warehouse.transfer_rejected', targetType: 'transfer_request', targetId: id, details: reason });
    res.json({ transfer_request: result.rows[0] });
  } catch (err) {
    console.error('rejectTransfer error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listZones, createZone, updateZone,
  listBins, createBin, updateBin,
  createTransferRequest, listTransferRequests, approveTransfer, rejectTransfer,
};

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  Database = null;
}

let db = null;

const SCHEMA_VERSION = 2;

function ensureDbOpen() {
  if (!Database) {
    throw new Error('SQLite engine missing (better-sqlite3 not installed)');
  }
  if (db) return db;

  const dir = app.getPath('userData');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, 'billingpos.sqlite');

  db = new Database(dbPath);
  // Performance + integrity defaults for desktop POS
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  initSchema();
  return db;
}

function initSchema() {
  const d = ensureDbOpen();

  d.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
    INSERT OR IGNORE INTO meta(key, value) VALUES ('migrated_from_indexeddb', '0');
    INSERT OR IGNORE INTO meta(key, value) VALUES ('migrated_at', '');

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      category TEXT,
      barcode TEXT,
      sku TEXT,
      price REAL,
      costPrice REAL,
      stock REAL,
      minStock REAL,
      taxRate REAL,
      hsn TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNumber TEXT,
      invoiceBarcode TEXT,
      date TEXT,
      customerId INTEGER,
      customerName TEXT,
      status TEXT,
      paymentMode TEXT,
      total REAL,
      subtotal REAL,
      taxAmt REAL,
      discountAmt REAL,
      customerBarcode TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      items_json TEXT,
      taxBreakdown_json TEXT,
      paymentBreakdown_json TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
    CREATE INDEX IF NOT EXISTS idx_invoices_customerId ON invoices(customerId);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoiceNumber ON invoices(invoiceNumber);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      supplierId INTEGER,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
    CREATE INDEX IF NOT EXISTS idx_purchases_supplierId ON purchases(supplierId);

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      role TEXT,
      active INTEGER,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      amount REAL,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity(date);

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      level TEXT,
      message TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      detail TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

    CREATE TABLE IF NOT EXISTS paymentAttempts (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      status TEXT,
      invoiceId INTEGER,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_paymentAttempts_orderId ON paymentAttempts(orderId);
    CREATE INDEX IF NOT EXISTS idx_paymentAttempts_status ON paymentAttempts(status);
    CREATE INDEX IF NOT EXISTS idx_paymentAttempts_invoiceId ON paymentAttempts(invoiceId);

    CREATE TABLE IF NOT EXISTS paymentLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      attemptId TEXT,
      orderId TEXT,
      level TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_paymentLogs_date ON paymentLogs(date);
    CREATE INDEX IF NOT EXISTS idx_paymentLogs_attemptId ON paymentLogs(attemptId);
    CREATE INDEX IF NOT EXISTS idx_paymentLogs_orderId ON paymentLogs(orderId);

    -- ── Enterprise Product Architecture (v2) ──────────────────────────────

    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      label TEXT,
      size TEXT,
      color TEXT,
      sku TEXT,
      barcode TEXT,
      stock REAL DEFAULT 0,
      price REAL,
      costPrice REAL,
      taxRate REAL,
      minStock REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      archived INTEGER DEFAULT 0,
      soldQuantity REAL DEFAULT 0,
      purchaseQuantity REAL DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_variants_productId ON variants(productId);
    CREATE INDEX IF NOT EXISTS idx_variants_barcode ON variants(barcode);
    CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku);
    CREATE INDEX IF NOT EXISTS idx_variants_status ON variants(status);

    CREATE TABLE IF NOT EXISTS inventoryBatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER,
      variantId INTEGER,
      batchNumber TEXT,
      quantity REAL DEFAULT 0,
      purchaseCost REAL DEFAULT 0,
      supplierId INTEGER,
      purchaseDate TEXT,
      invoiceRef TEXT,
      notes TEXT,
      createdBy TEXT,
      productName TEXT,
      variantLabel TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_inventoryBatches_productId ON inventoryBatches(productId);
    CREATE INDEX IF NOT EXISTS idx_inventoryBatches_variantId ON inventoryBatches(variantId);
    CREATE INDEX IF NOT EXISTS idx_inventoryBatches_batchNumber ON inventoryBatches(batchNumber);
    CREATE INDEX IF NOT EXISTS idx_inventoryBatches_supplierId ON inventoryBatches(supplierId);
    CREATE INDEX IF NOT EXISTS idx_inventoryBatches_purchaseDate ON inventoryBatches(purchaseDate);

    CREATE TABLE IF NOT EXISTS stockMovements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      productId INTEGER,
      variantId INTEGER,
      batchId INTEGER,
      batchNumber TEXT,
      quantity REAL DEFAULT 0,
      costPrice REAL,
      supplierId INTEGER,
      reason TEXT,
      notes TEXT,
      createdBy TEXT,
      date TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_stockMovements_productId ON stockMovements(productId);
    CREATE INDEX IF NOT EXISTS idx_stockMovements_variantId ON stockMovements(variantId);
    CREATE INDEX IF NOT EXISTS idx_stockMovements_type ON stockMovements(type);
    CREATE INDEX IF NOT EXISTS idx_stockMovements_date ON stockMovements(date);

    CREATE TABLE IF NOT EXISTS barcodePrintLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER,
      variantId INTEGER,
      barcode TEXT,
      qty INTEGER DEFAULT 1,
      printedBy TEXT,
      date TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_barcodePrintLogs_productId ON barcodePrintLogs(productId);
    CREATE INDEX IF NOT EXISTS idx_barcodePrintLogs_variantId ON barcodePrintLogs(variantId);
    CREATE INDEX IF NOT EXISTS idx_barcodePrintLogs_barcode ON barcodePrintLogs(barcode);
    CREATE INDEX IF NOT EXISTS idx_barcodePrintLogs_date ON barcodePrintLogs(date);

    CREATE TABLE IF NOT EXISTS variantBarcodes (
      barcode TEXT PRIMARY KEY,
      variantId INTEGER,
      productId INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_variantBarcodes_variantId ON variantBarcodes(variantId);
    CREATE INDEX IF NOT EXISTS idx_variantBarcodes_productId ON variantBarcodes(productId);

    -- Update schema version
    UPDATE meta SET value = '2' WHERE key = 'schema_version';
  `);
}

function getMeta(key) {
  const d = ensureDbOpen();
  const row = d.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? String(row.value || '') : '';
}

function setMeta(key, value) {
  const d = ensureDbOpen();
  d.prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, String(value ?? ''));
}

function status() {
  const d = ensureDbOpen();
  const dbPath = d.name;
  const migrated = getMeta('migrated_from_indexeddb') === '1';
  const migratedAt = getMeta('migrated_at') || '';
  const schemaVersion = Number(getMeta('schema_version') || SCHEMA_VERSION);
  return { backend: 'sqlite', dbPath, migrated, migratedAt, schemaVersion };
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj ?? null);
  } catch {
    return 'null';
  }
}

function parseJson(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

const STORE_TABLE = {
  settings: 'settings',
  products: 'products',
  categories: 'categories',
  customers: 'customers',
  invoices: 'invoices',
  suppliers: 'suppliers',
  purchases: 'purchases',
  staff: 'staff',
  expenses: 'expenses',
  activity: 'activity',
  logs: 'logs',
  paymentAttempts: 'paymentAttempts',
  paymentLogs: 'paymentLogs',
  // Enterprise product architecture (v2)
  variants: 'variants',
  inventoryBatches: 'inventoryBatches',
  stockMovements: 'stockMovements',
  barcodePrintLogs: 'barcodePrintLogs',
  variantBarcodes: 'variantBarcodes',
};

function normalizeRow(store, row) {
  if (!row) return null;
  if (store === 'settings') {
    return { key: row.key, value: parseJson(row.value_json), createdAt: row.createdAt, updatedAt: row.updatedAt };
  }
  const data = parseJson(row.data_json) || {};
  return { ...data, id: row.id };
}

function getAll(store) {
  const d = ensureDbOpen();
  const table = STORE_TABLE[store];
  if (!table) throw new Error(`Unknown store: ${store}`);

  if (store === 'settings') {
    const rows = d.prepare('SELECT * FROM settings').all();
    return rows.map((r) => normalizeRow(store, r));
  }

  const rows = d.prepare(`SELECT id, data_json FROM ${table} ORDER BY id ASC`).all();
  return rows.map((r) => normalizeRow(store, r));
}

function get(store, id) {
  const d = ensureDbOpen();
  const table = STORE_TABLE[store];
  if (!table) throw new Error(`Unknown store: ${store}`);

  if (store === 'settings') {
    const row = d.prepare('SELECT * FROM settings WHERE key=?').get(String(id));
    return normalizeRow(store, row);
  }

  const row = d.prepare(`SELECT id, data_json FROM ${table} WHERE id=?`).get(Number(id));
  return normalizeRow(store, row);
}

function put(store, data) {
  const d = ensureDbOpen();
  const table = STORE_TABLE[store];
  if (!table) throw new Error(`Unknown store: ${store}`);

  const now = new Date().toISOString();

  if (store === 'settings') {
    const key = String(data?.key || '');
    d.prepare(`
      INSERT INTO settings(key, value_json, createdAt, updatedAt)
      VALUES(?, ?, COALESCE(?, ?), ?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updatedAt=excluded.updatedAt
    `).run(key, safeJson(data?.value), data?.createdAt || null, now, now);
    return key;
  }

  const id = Number(data?.id);
  if (!Number.isFinite(id)) throw new Error(`Missing id for put(${store})`);

  const row = { ...(data || {}) };
  delete row.id;

  if (store === 'products') {
    d.prepare(`
      INSERT INTO products(id, name, category, barcode, sku, price, costPrice, stock, minStock, taxRate, hsn, createdAt, updatedAt, data_json)
      VALUES(@id, @name, @category, @barcode, @sku, @price, @costPrice, @stock, @minStock, @taxRate, @hsn, COALESCE(@createdAt, @now), @now, @data_json)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, category=excluded.category, barcode=excluded.barcode, sku=excluded.sku,
        price=excluded.price, costPrice=excluded.costPrice, stock=excluded.stock, minStock=excluded.minStock,
        taxRate=excluded.taxRate, hsn=excluded.hsn, updatedAt=excluded.updatedAt, data_json=excluded.data_json
    `).run({
      id,
      name: row.name ?? null,
      category: row.category ?? null,
      barcode: row.barcode ?? null,
      sku: row.sku ?? null,
      price: row.price ?? null,
      costPrice: row.costPrice ?? null,
      stock: row.stock ?? null,
      minStock: row.minStock ?? null,
      taxRate: row.taxRate ?? null,
      hsn: row.hsn ?? null,
      createdAt: row.createdAt ?? null,
      now,
      data_json: safeJson({ ...row }),
    });
    return id;
  }

  if (store === 'customers') {
    d.prepare(`
      INSERT INTO customers(id, name, phone, createdAt, updatedAt, data_json)
      VALUES(@id, @name, @phone, COALESCE(@createdAt, @now), @now, @data_json)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, updatedAt=excluded.updatedAt, data_json=excluded.data_json
    `).run({
      id,
      name: row.name ?? null,
      phone: row.phone ?? null,
      createdAt: row.createdAt ?? null,
      now,
      data_json: safeJson({ ...row }),
    });
    return id;
  }

  if (store === 'invoices') {
    d.prepare(`
      INSERT INTO invoices(
        id, invoiceNumber, invoiceBarcode, date, customerId, customerName, status, paymentMode,
        total, subtotal, taxAmt, discountAmt, customerBarcode,
        createdAt, updatedAt, items_json, taxBreakdown_json, paymentBreakdown_json, data_json
      )
      VALUES(
        @id, @invoiceNumber, @invoiceBarcode, @date, @customerId, @customerName, @status, @paymentMode,
        @total, @subtotal, @taxAmt, @discountAmt, @customerBarcode,
        COALESCE(@createdAt, @now), @now, @items_json, @taxBreakdown_json, @paymentBreakdown_json, @data_json
      )
      ON CONFLICT(id) DO UPDATE SET
        invoiceNumber=excluded.invoiceNumber, invoiceBarcode=excluded.invoiceBarcode, date=excluded.date,
        customerId=excluded.customerId, customerName=excluded.customerName, status=excluded.status, paymentMode=excluded.paymentMode,
        total=excluded.total, subtotal=excluded.subtotal, taxAmt=excluded.taxAmt, discountAmt=excluded.discountAmt,
        customerBarcode=excluded.customerBarcode,
        updatedAt=excluded.updatedAt, items_json=excluded.items_json, taxBreakdown_json=excluded.taxBreakdown_json,
        paymentBreakdown_json=excluded.paymentBreakdown_json, data_json=excluded.data_json
    `).run({
      id,
      invoiceNumber: row.invoiceNumber ?? null,
      invoiceBarcode: row.invoiceBarcode ?? null,
      date: row.date ?? null,
      customerId: row.customerId ?? null,
      customerName: row.customerName ?? null,
      status: row.status ?? null,
      paymentMode: row.paymentMode ?? null,
      total: row.total ?? null,
      subtotal: row.subtotal ?? null,
      taxAmt: row.taxAmt ?? null,
      discountAmt: row.discountAmt ?? null,
      customerBarcode: row.customerBarcode ?? null,
      createdAt: row.createdAt ?? null,
      now,
      items_json: safeJson(row.items ?? []),
      taxBreakdown_json: safeJson(row.taxBreakdown ?? []),
      paymentBreakdown_json: safeJson(row.paymentBreakdown ?? []),
      data_json: safeJson({ ...row }),
    });
    return id;
  }

  // Generic fallback: store whole JSON in data_json
  d.prepare(`
    INSERT INTO ${table}(id, createdAt, updatedAt, data_json)
    VALUES(@id, COALESCE(@createdAt, @now), @now, @data_json)
    ON CONFLICT(id) DO UPDATE SET updatedAt=excluded.updatedAt, data_json=excluded.data_json
  `).run({ id, createdAt: row.createdAt ?? null, now, data_json: safeJson({ ...row }) });
  return id;
}

function add(store, data) {
  const d = ensureDbOpen();
  const table = STORE_TABLE[store];
  if (!table) throw new Error(`Unknown store: ${store}`);

  const now = new Date().toISOString();

  if (store === 'settings') {
    const key = String(data?.key || '');
    d.prepare(`
      INSERT INTO settings(key, value_json, createdAt, updatedAt)
      VALUES(?, ?, COALESCE(?, ?), ?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updatedAt=excluded.updatedAt
    `).run(key, safeJson(data?.value), data?.createdAt || null, now, now);
    return key;
  }

  // Payment attempts: id is string key
  if (store === 'paymentAttempts') {
    const id = String(data?.id || '');
    const row = { ...(data || {}) };
    d.prepare(`
      INSERT INTO paymentAttempts(id, orderId, status, invoiceId, createdAt, updatedAt, data_json)
      VALUES(@id, @orderId, @status, @invoiceId, COALESCE(@createdAt, @now), @now, @data_json)
      ON CONFLICT(id) DO UPDATE SET
        orderId=excluded.orderId, status=excluded.status, invoiceId=excluded.invoiceId,
        updatedAt=excluded.updatedAt, data_json=excluded.data_json
    `).run({
      id,
      orderId: row.orderId ?? null,
      status: row.status ?? null,
      invoiceId: row.invoiceId ?? null,
      createdAt: row.createdAt ?? null,
      now,
      data_json: safeJson({ ...row }),
    });
    return id;
  }

  const row = { ...(data || {}) };
  delete row.id;

  if (store === 'products') {
    const info = d.prepare(`
      INSERT INTO products(name, category, barcode, sku, price, costPrice, stock, minStock, taxRate, hsn, createdAt, updatedAt, data_json)
      VALUES(@name, @category, @barcode, @sku, @price, @costPrice, @stock, @minStock, @taxRate, @hsn, COALESCE(@createdAt, @now), @now, @data_json)
    `).run({
      name: row.name ?? null,
      category: row.category ?? null,
      barcode: row.barcode ?? null,
      sku: row.sku ?? null,
      price: row.price ?? null,
      costPrice: row.costPrice ?? null,
      stock: row.stock ?? null,
      minStock: row.minStock ?? null,
      taxRate: row.taxRate ?? null,
      hsn: row.hsn ?? null,
      createdAt: row.createdAt ?? null,
      now,
      data_json: safeJson({ ...row }),
    });
    return Number(info.lastInsertRowid);
  }

  if (store === 'customers') {
    const info = d.prepare(`
      INSERT INTO customers(name, phone, createdAt, updatedAt, data_json)
      VALUES(@name, @phone, COALESCE(@createdAt, @now), @now, @data_json)
    `).run({
      name: row.name ?? null,
      phone: row.phone ?? null,
      createdAt: row.createdAt ?? null,
      now,
      data_json: safeJson({ ...row }),
    });
    return Number(info.lastInsertRowid);
  }

  if (store === 'invoices') {
    const info = d.prepare(`
      INSERT INTO invoices(
        invoiceNumber, invoiceBarcode, date, customerId, customerName, status, paymentMode,
        total, subtotal, taxAmt, discountAmt, customerBarcode,
        createdAt, updatedAt, items_json, taxBreakdown_json, paymentBreakdown_json, data_json
      )
      VALUES(
        @invoiceNumber, @invoiceBarcode, @date, @customerId, @customerName, @status, @paymentMode,
        @total, @subtotal, @taxAmt, @discountAmt, @customerBarcode,
        COALESCE(@createdAt, @now), @now, @items_json, @taxBreakdown_json, @paymentBreakdown_json, @data_json
      )
    `).run({
      invoiceNumber: row.invoiceNumber ?? null,
      invoiceBarcode: row.invoiceBarcode ?? null,
      date: row.date ?? null,
      customerId: row.customerId ?? null,
      customerName: row.customerName ?? null,
      status: row.status ?? null,
      paymentMode: row.paymentMode ?? null,
      total: row.total ?? null,
      subtotal: row.subtotal ?? null,
      taxAmt: row.taxAmt ?? null,
      discountAmt: row.discountAmt ?? null,
      customerBarcode: row.customerBarcode ?? null,
      createdAt: row.createdAt ?? null,
      now,
      items_json: safeJson(row.items ?? []),
      taxBreakdown_json: safeJson(row.taxBreakdown ?? []),
      paymentBreakdown_json: safeJson(row.paymentBreakdown ?? []),
      data_json: safeJson({ ...row }),
    });
    return Number(info.lastInsertRowid);
  }

  // variantBarcodes: string PK
  if (store === 'variantBarcodes') {
    const barcodeKey = String(row.barcode || data?.barcode || '');
    d.prepare(`
      INSERT INTO variantBarcodes(barcode, variantId, productId, createdAt, updatedAt)
      VALUES(@barcode, @variantId, @productId, COALESCE(@createdAt, @now), @now)
      ON CONFLICT(barcode) DO UPDATE SET variantId=excluded.variantId, productId=excluded.productId, updatedAt=excluded.updatedAt
    `).run({ barcode: barcodeKey, variantId: row.variantId ?? null, productId: row.productId ?? null, createdAt: row.createdAt ?? null, now });
    return barcodeKey;
  }

  // variants
  if (store === 'variants') {
    const info = d.prepare(`
      INSERT INTO variants(productId, label, size, color, sku, barcode, stock, price, costPrice, taxRate, minStock, status, archived, soldQuantity, purchaseQuantity, createdAt, updatedAt, data_json)
      VALUES(@productId, @label, @size, @color, @sku, @barcode, @stock, @price, @costPrice, @taxRate, @minStock, @status, @archived, @soldQuantity, @purchaseQuantity, COALESCE(@createdAt, @now), @now, @data_json)
    `).run({
      productId: row.productId ?? null,
      label: row.label ?? row.size ?? null,
      size: row.size ?? null,
      color: row.color ?? null,
      sku: row.sku ?? null,
      barcode: row.barcode ?? null,
      stock: row.stock ?? 0,
      price: row.price ?? null,
      costPrice: row.costPrice ?? null,
      taxRate: row.taxRate ?? null,
      minStock: row.minStock ?? 0,
      status: row.status ?? 'Active',
      archived: row.archived ? 1 : 0,
      soldQuantity: row.soldQuantity ?? 0,
      purchaseQuantity: row.purchaseQuantity ?? 0,
      createdAt: row.createdAt ?? null, now,
      data_json: safeJson({ ...row }),
    });
    return Number(info.lastInsertRowid);
  }

  // inventoryBatches
  if (store === 'inventoryBatches') {
    const info = d.prepare(`
      INSERT INTO inventoryBatches(productId, variantId, batchNumber, quantity, purchaseCost, supplierId, purchaseDate, invoiceRef, notes, createdBy, productName, variantLabel, createdAt, updatedAt, data_json)
      VALUES(@productId, @variantId, @batchNumber, @quantity, @purchaseCost, @supplierId, @purchaseDate, @invoiceRef, @notes, @createdBy, @productName, @variantLabel, COALESCE(@createdAt, @now), @now, @data_json)
    `).run({
      productId: row.productId ?? null,
      variantId: row.variantId ?? null,
      batchNumber: row.batchNumber ?? null,
      quantity: row.quantity ?? 0,
      purchaseCost: row.purchaseCost ?? 0,
      supplierId: row.supplierId ?? null,
      purchaseDate: row.purchaseDate ?? null,
      invoiceRef: row.invoiceRef ?? null,
      notes: row.notes ?? null,
      createdBy: row.createdBy ?? null,
      productName: row.productName ?? null,
      variantLabel: row.variantLabel ?? null,
      createdAt: row.createdAt ?? null, now,
      data_json: safeJson({ ...row }),
    });
    return Number(info.lastInsertRowid);
  }

  // stockMovements
  if (store === 'stockMovements') {
    const info = d.prepare(`
      INSERT INTO stockMovements(type, productId, variantId, batchId, batchNumber, quantity, costPrice, supplierId, reason, notes, createdBy, date, createdAt, updatedAt, data_json)
      VALUES(@type, @productId, @variantId, @batchId, @batchNumber, @quantity, @costPrice, @supplierId, @reason, @notes, @createdBy, @date, COALESCE(@createdAt, @now), @now, @data_json)
    `).run({
      type: row.type ?? null,
      productId: row.productId ?? null,
      variantId: row.variantId ?? null,
      batchId: row.batchId ?? null,
      batchNumber: row.batchNumber ?? null,
      quantity: row.quantity ?? 0,
      costPrice: row.costPrice ?? null,
      supplierId: row.supplierId ?? null,
      reason: row.reason ?? null,
      notes: row.notes ?? null,
      createdBy: row.createdBy ?? null,
      date: row.date ?? null,
      createdAt: row.createdAt ?? null, now,
      data_json: safeJson({ ...row }),
    });
    return Number(info.lastInsertRowid);
  }

  // barcodePrintLogs
  if (store === 'barcodePrintLogs') {
    const info = d.prepare(`
      INSERT INTO barcodePrintLogs(productId, variantId, barcode, qty, printedBy, date, createdAt, updatedAt, data_json)
      VALUES(@productId, @variantId, @barcode, @qty, @printedBy, @date, COALESCE(@createdAt, @now), @now, @data_json)
    `).run({
      productId: row.productId ?? null,
      variantId: row.variantId ?? null,
      barcode: row.barcode ?? null,
      qty: row.qty ?? 1,
      printedBy: row.printedBy ?? null,
      date: row.date ?? null,
      createdAt: row.createdAt ?? null, now,
      data_json: safeJson({ ...row }),
    });
    return Number(info.lastInsertRowid);
  }

  // Generic add: create minimal row with data_json
  const info = d.prepare(`
    INSERT INTO ${table}(createdAt, updatedAt, data_json)
    VALUES(COALESCE(@createdAt, @now), @now, @data_json)
  `).run({ createdAt: row.createdAt ?? null, now, data_json: safeJson({ ...row }) });

  return Number(info.lastInsertRowid);
}

function remove(store, id) {
  const d = ensureDbOpen();
  const table = STORE_TABLE[store];
  if (!table) throw new Error(`Unknown store: ${store}`);

  if (store === 'settings') {
    d.prepare('DELETE FROM settings WHERE key=?').run(String(id));
    return true;
  }
  if (store === 'paymentAttempts') {
    d.prepare('DELETE FROM paymentAttempts WHERE id=?').run(String(id));
    return true;
  }
  d.prepare(`DELETE FROM ${table} WHERE id=?`).run(Number(id));
  return true;
}

function clear(store) {
  const d = ensureDbOpen();
  const table = STORE_TABLE[store];
  if (!table) throw new Error(`Unknown store: ${store}`);

  if (store === 'settings') d.exec('DELETE FROM settings');
  else if (store === 'paymentAttempts') d.exec('DELETE FROM paymentAttempts');
  else d.exec(`DELETE FROM ${table}`);
  return true;
}

function migrateFromBackupJson(backupJsonStr) {
  const d = ensureDbOpen();
  const migrated = getMeta('migrated_from_indexeddb') === '1';
  if (migrated) return { ok: true, already: true, status: status() };

  const parsed = typeof backupJsonStr === 'string' ? JSON.parse(backupJsonStr) : (backupJsonStr || {});

  const backupDir = app.getPath('userData');
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const backupPath = path.join(backupDir, `indexeddb-backup-${stamp}.json`);
  try {
    fs.writeFileSync(backupPath, JSON.stringify(parsed, null, 2), 'utf-8');
  } catch {}

  const counts = {};

  const tx = d.transaction(() => {
    // Clear target tables to avoid partial merges
    Object.values(STORE_TABLE).forEach((t) => {
      if (t === 'meta') return;
      d.exec(`DELETE FROM ${t}`);
    });

    // Insert settings
    (parsed.settings || []).forEach((row) => {
      d.prepare(`
        INSERT INTO settings(key, value_json, createdAt, updatedAt)
        VALUES(?, ?, ?, ?)
      `).run(String(row.key), safeJson(row.value), row.createdAt || null, row.updatedAt || null);
    });

    // Helper for generic id stores
    const insertGeneric = (table, rows) => {
      const stmt = d.prepare(`INSERT INTO ${table}(id, createdAt, updatedAt, data_json) VALUES(?, ?, ?, ?)`);
      rows.forEach((r) => {
        const id = Number(r.id);
        const copy = { ...(r || {}) };
        delete copy.id;
        stmt.run(id, r.createdAt || null, r.updatedAt || null, safeJson(copy));
      });
    };

    // Products/customers/invoices need extracted columns
    (parsed.products || []).forEach((p) => {
      const id = Number(p.id);
      const copy = { ...(p || {}) };
      delete copy.id;
      d.prepare(`
        INSERT INTO products(id, name, category, barcode, sku, price, costPrice, stock, minStock, taxRate, hsn, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        p.name ?? null,
        p.category ?? null,
        p.barcode ?? null,
        p.sku ?? null,
        p.price ?? null,
        p.costPrice ?? null,
        p.stock ?? null,
        p.minStock ?? null,
        p.taxRate ?? null,
        p.hsn ?? null,
        p.createdAt || null,
        p.updatedAt || null,
        safeJson(copy)
      );
    });

    (parsed.customers || []).forEach((c) => {
      const id = Number(c.id);
      const copy = { ...(c || {}) };
      delete copy.id;
      d.prepare(`
        INSERT INTO customers(id, name, phone, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?)
      `).run(
        id,
        c.name ?? null,
        c.phone ?? null,
        c.createdAt || null,
        c.updatedAt || null,
        safeJson(copy)
      );
    });

    (parsed.invoices || []).forEach((inv) => {
      const id = Number(inv.id);
      const copy = { ...(inv || {}) };
      delete copy.id;
      d.prepare(`
        INSERT INTO invoices(
          id, invoiceNumber, invoiceBarcode, date, customerId, customerName, status, paymentMode,
          total, subtotal, taxAmt, discountAmt, customerBarcode,
          createdAt, updatedAt, items_json, taxBreakdown_json, paymentBreakdown_json, data_json
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        inv.invoiceNumber ?? null,
        inv.invoiceBarcode ?? null,
        inv.date ?? null,
        inv.customerId ?? null,
        inv.customerName ?? null,
        inv.status ?? null,
        inv.paymentMode ?? null,
        inv.total ?? null,
        inv.subtotal ?? null,
        inv.taxAmt ?? null,
        inv.discountAmt ?? null,
        inv.customerBarcode ?? null,
        inv.createdAt || null,
        inv.updatedAt || null,
        safeJson(inv.items ?? []),
        safeJson(inv.taxBreakdown ?? []),
        safeJson(inv.paymentBreakdown ?? []),
        safeJson(copy)
      );
    });

    insertGeneric('categories', parsed.categories || []);
    insertGeneric('suppliers', parsed.suppliers || []);
    // Purchases needs date/supplierId (but optional)
    (parsed.purchases || []).forEach((pur) => {
      const id = Number(pur.id);
      const copy = { ...(pur || {}) };
      delete copy.id;
      d.prepare(`
        INSERT INTO purchases(id, date, supplierId, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?)
      `).run(
        id,
        pur.date ?? null,
        pur.supplierId ?? null,
        pur.createdAt || null,
        pur.updatedAt || null,
        safeJson(copy)
      );
    });

    // Staff + Expenses + Activity + Logs
    (parsed.staff || []).forEach((s) => {
      const id = Number(s.id);
      const copy = { ...(s || {}) };
      delete copy.id;
      d.prepare(`
        INSERT INTO staff(id, username, role, active, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        s.username ?? null,
        s.role ?? null,
        s.active ? 1 : 0,
        s.createdAt || null,
        s.updatedAt || null,
        safeJson(copy)
      );
    });

    (parsed.expenses || []).forEach((e) => {
      const id = Number(e.id);
      const copy = { ...(e || {}) };
      delete copy.id;
      d.prepare(`
        INSERT INTO expenses(id, date, amount, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?)
      `).run(
        id,
        e.date ?? null,
        e.amount ?? null,
        e.createdAt || null,
        e.updatedAt || null,
        safeJson(copy)
      );
    });

    insertGeneric('activity', parsed.activity || []);

    (parsed.logs || []).forEach((l) => {
      const id = Number(l.id);
      const copy = { ...(l || {}) };
      delete copy.id;
      d.prepare(`
        INSERT INTO logs(id, date, level, message, createdAt, updatedAt, detail, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        l.date ?? null,
        l.level ?? null,
        l.message ?? null,
        l.createdAt || null,
        l.updatedAt || null,
        l.detail ?? null,
        safeJson(copy)
      );
    });

    // Payment Attempts (string PK)
    (parsed.paymentAttempts || []).forEach((pa) => {
      const copy = { ...(pa || {}) };
      d.prepare(`
        INSERT INTO paymentAttempts(id, orderId, status, invoiceId, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(pa.id),
        pa.orderId ?? null,
        pa.status ?? null,
        pa.invoiceId ?? null,
        pa.createdAt || null,
        pa.updatedAt || null,
        safeJson(copy)
      );
    });

    insertGeneric('paymentLogs', parsed.paymentLogs || []);

    // ── Enterprise product stores (v2) ──────────────────────────────────
    (parsed.variants || []).forEach((v) => {
      const id = Number(v.id);
      const copy = { ...(v || {}) }; delete copy.id;
      d.prepare(`
        INSERT INTO variants(id, productId, label, size, color, sku, barcode, stock, price, costPrice, taxRate, minStock, status, archived, soldQuantity, purchaseQuantity, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, v.productId ?? null, v.label ?? v.size ?? null, v.size ?? null, v.color ?? null, v.sku ?? null, v.barcode ?? null, v.stock ?? 0, v.price ?? null, v.costPrice ?? null, v.taxRate ?? null, v.minStock ?? 0, v.status ?? 'Active', v.archived ? 1 : 0, v.soldQuantity ?? 0, v.purchaseQuantity ?? 0, v.createdAt || null, v.updatedAt || null, safeJson(copy));
    });

    (parsed.inventoryBatches || []).forEach((b) => {
      const id = Number(b.id);
      const copy = { ...(b || {}) }; delete copy.id;
      d.prepare(`
        INSERT INTO inventoryBatches(id, productId, variantId, batchNumber, quantity, purchaseCost, supplierId, purchaseDate, invoiceRef, notes, createdBy, productName, variantLabel, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, b.productId ?? null, b.variantId ?? null, b.batchNumber ?? null, b.quantity ?? 0, b.purchaseCost ?? 0, b.supplierId ?? null, b.purchaseDate ?? null, b.invoiceRef ?? null, b.notes ?? null, b.createdBy ?? null, b.productName ?? null, b.variantLabel ?? null, b.createdAt || null, b.updatedAt || null, safeJson(copy));
    });

    (parsed.stockMovements || []).forEach((m) => {
      const id = Number(m.id);
      const copy = { ...(m || {}) }; delete copy.id;
      d.prepare(`
        INSERT INTO stockMovements(id, type, productId, variantId, batchId, batchNumber, quantity, costPrice, supplierId, reason, notes, createdBy, date, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, m.type ?? null, m.productId ?? null, m.variantId ?? null, m.batchId ?? null, m.batchNumber ?? null, m.quantity ?? 0, m.costPrice ?? null, m.supplierId ?? null, m.reason ?? null, m.notes ?? null, m.createdBy ?? null, m.date ?? null, m.createdAt || null, m.updatedAt || null, safeJson(copy));
    });

    (parsed.barcodePrintLogs || []).forEach((l) => {
      const id = Number(l.id);
      const copy = { ...(l || {}) }; delete copy.id;
      d.prepare(`
        INSERT INTO barcodePrintLogs(id, productId, variantId, barcode, qty, printedBy, date, createdAt, updatedAt, data_json)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, l.productId ?? null, l.variantId ?? null, l.barcode ?? null, l.qty ?? 1, l.printedBy ?? null, l.date ?? null, l.createdAt || null, l.updatedAt || null, safeJson(copy));
    });

    (parsed.variantBarcodes || []).forEach((vb) => {
      d.prepare(`
        INSERT INTO variantBarcodes(barcode, variantId, productId, createdAt, updatedAt)
        VALUES(?, ?, ?, ?, ?)
        ON CONFLICT(barcode) DO UPDATE SET variantId=excluded.variantId, productId=excluded.productId
      `).run(String(vb.barcode || ''), vb.variantId ?? null, vb.productId ?? null, vb.createdAt || null, vb.updatedAt || null);
    });

    // Save counts
    Object.keys(STORE_TABLE).forEach((store) => {
      if (store === 'settings') {
        counts.settings = d.prepare('SELECT COUNT(*) AS c FROM settings').get().c;
      } else if (store === 'paymentAttempts') {
        counts.paymentAttempts = d.prepare('SELECT COUNT(*) AS c FROM paymentAttempts').get().c;
      } else {
        const table = STORE_TABLE[store];
        counts[store] = d.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
      }
    });

    setMeta('migrated_from_indexeddb', '1');
    setMeta('migrated_at', new Date().toISOString());
  });

  tx();

  return { ok: true, backupPath, counts, status: status() };
}

// Invoice number reservation will be upgraded later to new format; for now expose a generic reserve API.
function reserveLegacyInvoiceNumber({ dayKey, dd, mm, yy }) {
  const d = ensureDbOpen();
  // Keep per-day counter in settings
  const counterKey = `invoiceSeq:${dayKey}`;
  const getRow = d.prepare('SELECT value_json FROM settings WHERE key=?').get(counterKey);
  const cur = parseJson(getRow?.value_json);
  let seq = Number(cur) || 0;

  const tx = d.transaction(() => {
    for (let attempts = 0; attempts < 100; attempts++) {
      const next = seq + 1;
      if (next > 999) throw new Error('Daily invoice limit exceeded (999)');
      const invoiceNumber = `${dd}${mm}${String(next).padStart(3, '0')}${yy}`;

      const exists = d.prepare('SELECT id FROM invoices WHERE invoiceNumber=? LIMIT 1').get(invoiceNumber);
      if (!exists) {
        d.prepare(`
          INSERT INTO settings(key, value_json, createdAt, updatedAt)
          VALUES(?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updatedAt=excluded.updatedAt
        `).run(counterKey, safeJson(next), new Date().toISOString(), new Date().toISOString());
        return invoiceNumber;
      }
      seq = next;
    }
    throw new Error('Unable to reserve unique invoice number');
  });

  return tx();
}

module.exports = {
  ensureDbOpen,
  status,
  getAll,
  get,
  add,
  put,
  delete: remove,
  clear,
  migrateFromBackupJson,
  reserveLegacyInvoiceNumber,
};


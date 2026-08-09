const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════════════════════
//  BULLETPROOF 3-DATABASE FAILOVER SYSTEM
//  Logic: Try DB1 → if any error → try DB2 → if any error → try DB3
//  No polling. No background checks. Switches instantly on any failure.
//  Recovers back to primary after 1 hour (1 single check, not repeated polling).
// ═══════════════════════════════════════════════════════════════════════════════

const RAW_URLS = [
  process.env.DATABASE_URL_1,
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
].filter(Boolean);

if (RAW_URLS.length === 0) {
  console.error('❌ No DATABASE_URL_1/2/3 found in .env — cannot start');
  process.exit(1);
}

// Clean a Neon URL — strip sslmode & channel_binding from query string,
// then pass ssl option via Pool config so pg handles it correctly.
function cleanUrl(raw) {
  return raw
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/[?&]+$/, '');
}

// Build a fresh Pool for a given index
function makePool(index) {
  const url = RAW_URLS[index];
  return new Pool({
    connectionString: cleanUrl(url),
    ssl: { rejectUnauthorized: false },   // works for Neon + local
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
}

// ─── State ─────────────────────────────────────────────────────────────────────
let activeIndex = 0;
let pools = RAW_URLS.map((_, i) => makePool(i));
let queryCountOnBackup = 0;
let lastRecoveryAttempt = 0;

const RECOVERY_MS       = 60 * 60 * 1000;  // try primary again after 1 hour
const RECOVERY_QUERIES  = 100;              // or after 100 queries on backup

RAW_URLS.forEach((_, i) => console.log(`✅ DB${i + 1} pool created`));

// ─── Is this error a reason to failover? ───────────────────────────────────────
function shouldFailover(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';

  // TCP / OS level
  if (['ECONNREFUSED','ENOTFOUND','ETIMEDOUT','ECONNRESET','EPIPE','EHOSTUNREACH'].includes(code)) return true;

  // PostgreSQL wire protocol
  if (['57P03','08006','08001','08004','08P01','57014'].includes(code)) return true;

  // Neon cloud-specific messages
  if (/quota|compute time|upgrade your plan|suspended|exceeded|project is disabled|unavailable|starting up|not accepting connections/i.test(msg)) return true;

  // Generic connectivity words
  if (/connect(ion)?|timeout|timed out|econnrefused|network|socket/i.test(msg)) return true;

  return false;
}

// ─── Lazy recovery — try to get back to primary ────────────────────────────────
async function tryRecoverToPrimary() {
  if (activeIndex === 0) return;
  const now = Date.now();
  if (queryCountOnBackup < RECOVERY_QUERIES && (now - lastRecoveryAttempt) < RECOVERY_MS) return;

  lastRecoveryAttempt = now;
  queryCountOnBackup  = 0;

  try {
    // Rebuild the primary pool fresh (old one may be in a broken state)
    await pools[0].end().catch(() => {});
    pools[0] = makePool(0);
    const client = await pools[0].connect();
    await client.query('SELECT 1');
    client.release();
    console.log(`✅ Primary DB1 is back — switching from DB${activeIndex + 1} to DB1`);
    activeIndex = 0;
  } catch {
    // Still down — stay on current backup, rebuild pool so next attempt is fresh
    await pools[0].end().catch(() => {});
    pools[0] = makePool(0);
  }
}

// ─── Core query with full failover ─────────────────────────────────────────────
async function query(text, params) {
  await tryRecoverToPrimary();

  for (let i = activeIndex; i < pools.length; i++) {
    try {
      const result = await pools[i].query(text, params);
      if (i !== activeIndex) {
        console.log(`🔀 Switched to DB${i + 1} (DB${activeIndex + 1} was unavailable)`);
        activeIndex = i;
        queryCountOnBackup = 0;
      }
      if (activeIndex > 0) queryCountOnBackup++;
      return result;
    } catch (err) {
      if (shouldFailover(err) && i < pools.length - 1) {
        console.warn(`⚠️  DB${i + 1} error: "${err.message}" — trying DB${i + 2}...`);
        // Rebuild broken pool so future attempts start fresh
        await pools[i].end().catch(() => {});
        pools[i] = makePool(i);
        if (i === activeIndex) activeIndex = i + 1;
        continue;
      }
      throw err;  // Real query error (e.g. bad SQL) — don't failover
    }
  }
}

// ─── connect() for transaction clients ─────────────────────────────────────────
async function connect() {
  await tryRecoverToPrimary();

  for (let i = activeIndex; i < pools.length; i++) {
    try {
      const client = await pools[i].connect();
      if (i !== activeIndex) {
        console.log(`🔀 Connected to DB${i + 1} (DB${activeIndex + 1} was unavailable)`);
        activeIndex = i;
        queryCountOnBackup = 0;
      }
      return client;
    } catch (err) {
      if (shouldFailover(err) && i < pools.length - 1) {
        console.warn(`⚠️  DB${i + 1} connect error: "${err.message}" — trying DB${i + 2}...`);
        await pools[i].end().catch(() => {});
        pools[i] = makePool(i);
        if (i === activeIndex) activeIndex = i + 1;
        continue;
      }
      throw err;
    }
  }
}

// ─── Exported pool object (drop-in replacement for pg.Pool) ────────────────────
const pool = { query, connect };

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Core tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        owner_id INTEGER,
        gst_number VARCHAR(50),
        phone VARCHAR(30),
        email VARCHAR(150),
        address TEXT,
        currency VARCHAR(10) DEFAULT 'INR',
        timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
        settings JSONB DEFAULT '{}'::jsonb,
        business_config JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Add business_config column to existing tables (upgrade path)
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'src_businesses' AND column_name = 'business_config'
        ) THEN
          ALTER TABLE src_businesses ADD COLUMN business_config JSONB DEFAULT '{}'::jsonb;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS src_stores (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        store_code VARCHAR(30) UNIQUE,
        address TEXT,
        phone VARCHAR(30),
        email VARCHAR(150),
        manager_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_warehouses (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        address TEXT,
        phone VARCHAR(30),
        manager_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(30) DEFAULT 'user' CHECK (role IN ('user', 'seller', 'admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee')),
        avatar_url TEXT,
        phone VARCHAR(20),
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE SET NULL,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        employee_code VARCHAR(30) UNIQUE,
        is_banned BOOLEAN DEFAULT FALSE,
        google_id VARCHAR(200),
        auth_provider VARCHAR(20) DEFAULT 'local' CHECK (auth_provider IN ('local','google')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS src_products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        category_id INTEGER REFERENCES src_categories(id) ON DELETE SET NULL,
        seller_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        is_featured BOOLEAN DEFAULT FALSE,
        is_trending BOOLEAN DEFAULT FALSE,
        views INTEGER DEFAULT 0,
        admin_message TEXT,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS src_product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        size VARCHAR(10) NOT NULL CHECK (size IN ('XS','S','M','L','XL','XXL','Free')),
        stock INTEGER DEFAULT 0,
        extra_price DECIMAL(10,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS src_cart (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES src_product_variants(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, product_id, variant_id)
      );

      CREATE TABLE IF NOT EXISTS src_wishlist (
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS src_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        full_name VARCHAR(200) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        landmark VARCHAR(200),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percent DECIMAL(5,2),
        discount_flat DECIMAL(10,2),
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(30) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        coupon_code VARCHAR(50),
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
        payment_method VARCHAR(50),
        razorpay_order_id VARCHAR(200),
        razorpay_payment_id VARCHAR(200),
        razorpay_signature VARCHAR(500),
        paytm_txn_id VARCHAR(200),
        paytm_order_id VARCHAR(200),
        paytm_signature VARCHAR(500),
        full_name VARCHAR(200) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(150) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        landmark VARCHAR(200),
        notes TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES src_product_variants(id) ON DELETE SET NULL,
        title VARCHAR(200),
        size VARCHAR(10),
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS src_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES src_products(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        rating_label VARCHAR(50) NOT NULL DEFAULT 'Excellent',
        suggestion VARCHAR(150),
        comment TEXT,
        image_url TEXT,
        is_hidden BOOLEAN DEFAULT FALSE,
        is_pinned BOOLEAN DEFAULT FALSE,
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS src_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_internal_chat_messages (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        sender_user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_private_chat_threads (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        user_one_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        user_two_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_one_id, user_two_id)
      );

      CREATE TABLE IF NOT EXISTS src_private_chat_messages (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER REFERENCES src_private_chat_threads(id) ON DELETE CASCADE,
        sender_user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        message TEXT,
        attachment_url TEXT,
        message_type VARCHAR(50) DEFAULT 'text',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_internal_meetings (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        room_name VARCHAR(200) UNIQUE NOT NULL,
        mode VARCHAR(20) NOT NULL CHECK (mode IN ('video','voice')),
        is_audio_only BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        action VARCHAR(200) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,
        description TEXT,
        group_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_role_permissions (
        role VARCHAR(50) NOT NULL,
        permission_id INTEGER REFERENCES src_permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role, permission_id)
      );

      CREATE TABLE IF NOT EXISTS src_domains (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        host VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) DEFAULT 'business',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_banners (
        id SERIAL PRIMARY KEY,
        heading VARCHAR(200),
        subheading VARCHAR(300),
        cta_text VARCHAR(100),
        cta_link VARCHAR(300),
        desktop_image TEXT,
        mobile_image TEXT,
        video_url TEXT,
        banner_slot VARCHAR(20) DEFAULT 'hero',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Add video_url column if it doesn't exist yet (migration for existing DBs)
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_banners' AND column_name='video_url') THEN
          ALTER TABLE src_banners ADD COLUMN video_url TEXT;
        END IF;
      END $$;

      -- Add banner_slot column if it doesn't exist yet
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_banners' AND column_name='banner_slot') THEN
          ALTER TABLE src_banners ADD COLUMN banner_slot VARCHAR(20) DEFAULT 'hero';
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS src_homepage_sections (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200),
        subtitle VARCHAR(300),
        config JSONB DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_reels (
        id SERIAL PRIMARY KEY,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        title VARCHAR(200),
        product_id INTEGER REFERENCES src_products(id) ON DELETE SET NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_homepage_settings (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        key VARCHAR(100) NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (business_id, key)
      );

      -- ── Migrate legacy global settings (business_id IS NULL) to composite key ──
      -- If the old single-column PK constraint still exists, recreate safely.
      DO $$ BEGIN
        -- Add business_id column if it doesn't exist (upgrade path)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'src_homepage_settings' AND column_name = 'business_id'
        ) THEN
          ALTER TABLE src_homepage_settings ADD COLUMN business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE;
          -- Add the unique composite constraint
          ALTER TABLE src_homepage_settings DROP CONSTRAINT IF EXISTS src_homepage_settings_pkey;
          ALTER TABLE src_homepage_settings ADD COLUMN IF NOT EXISTS id SERIAL;
          ALTER TABLE src_homepage_settings ADD CONSTRAINT src_homepage_settings_biz_key_unique UNIQUE (business_id, key);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS src_queries (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(20),
        subject VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved')),
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
        admin_reply TEXT,
        replied_at TIMESTAMP,
        user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        keys JSONB NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_notification_campaigns (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        redirect_url TEXT,
        target VARCHAR(20) DEFAULT 'all' CHECK (target IN ('all','specific')),
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent')),
        sent_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_cart_reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        type VARCHAR(20) CHECK (type IN ('cart','wishlist')),
        reminder_count INTEGER DEFAULT 0,
        last_reminded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_admin_cloud_folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(250) UNIQUE NOT NULL,
        parent_id INTEGER REFERENCES src_admin_cloud_folders(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_admin_cloud_files (
        id SERIAL PRIMARY KEY,
        public_id TEXT NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        folder_id INTEGER REFERENCES src_admin_cloud_folders(id) ON DELETE SET NULL,
        resource_type VARCHAR(50) NOT NULL,
        format VARCHAR(50),
        mime_type VARCHAR(100),
        size_bytes BIGINT DEFAULT 0,
        width INTEGER,
        height INTEGER,
        secure_url TEXT NOT NULL,
        thumbnail_url TEXT,
        cdn_url TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
        is_favorite BOOLEAN DEFAULT FALSE,
        is_trashed BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        uploaded_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_folder_id ON src_admin_cloud_files(folder_id);
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_is_trashed ON src_admin_cloud_files(is_trashed);
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_display_name ON src_admin_cloud_files USING gin (to_tsvector('english', display_name));
      CREATE INDEX IF NOT EXISTS idx_admin_cloud_files_tags ON src_admin_cloud_files USING gin (tags);

      CREATE TABLE IF NOT EXISTS src_admin_cloud_history (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        file_id INTEGER REFERENCES src_admin_cloud_files(id) ON DELETE CASCADE,
        folder_id INTEGER REFERENCES src_admin_cloud_folders(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_brands (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(180) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (business_id, slug)
      );

      CREATE TABLE IF NOT EXISTS src_erp_customers (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        customer_code VARCHAR(40) UNIQUE NOT NULL,
        name VARCHAR(180) NOT NULL,
        phone VARCHAR(30),
        email VARCHAR(150),
        gst_number VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        loyalty_points INTEGER DEFAULT 0,
        store_credit DECIMAL(12,2) DEFAULT 0,
        outstanding_amount DECIMAL(12,2) DEFAULT 0,
        membership VARCHAR(30) DEFAULT 'regular',
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_suppliers (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        supplier_code VARCHAR(40) UNIQUE NOT NULL,
        name VARCHAR(180) NOT NULL,
        phone VARCHAR(30),
        email VARCHAR(150),
        gst_number VARCHAR(50),
        address TEXT,
        payment_terms_days INTEGER DEFAULT 0,
        balance_due DECIMAL(12,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_inventory_items (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        brand_id INTEGER REFERENCES src_erp_brands(id) ON DELETE SET NULL,
        supplier_id INTEGER REFERENCES src_erp_suppliers(id) ON DELETE SET NULL,
        title VARCHAR(220) NOT NULL,
        category VARCHAR(120),
        subcategory VARCHAR(120),
        department VARCHAR(120),
        collection_name VARCHAR(120),
        sku VARCHAR(80) UNIQUE NOT NULL,
        barcode VARCHAR(80) UNIQUE,
        internal_product_id VARCHAR(80) UNIQUE NOT NULL,
        hsn_code VARCHAR(30),
        gst_rate DECIMAL(5,2) DEFAULT 0,
        variant_color VARCHAR(60),
        variant_size VARCHAR(60),
        purchase_price DECIMAL(12,2) DEFAULT 0,
        selling_price DECIMAL(12,2) DEFAULT 0,
        mrp DECIMAL(12,2) DEFAULT 0,
        reorder_level INTEGER DEFAULT 0,
        current_stock INTEGER DEFAULT 0,
        unit_weight DECIMAL(10,2) DEFAULT 0,
        rack_code VARCHAR(50),
        shelf_code VARCHAR(50),
        batch_no VARCHAR(80),
        serial_no VARCHAR(120),
        expiry_date DATE,
        manufacturing_date DATE,
        image_url TEXT,
        notes TEXT,
        status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_inventory_movements (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        inventory_item_id INTEGER REFERENCES src_erp_inventory_items(id) ON DELETE CASCADE,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('opening','purchase','sale','return','adjustment','damage','transfer_in','transfer_out','count')),
        quantity INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reference_type VARCHAR(40),
        reference_id VARCHAR(80),
        notes TEXT,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_sales (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        customer_id INTEGER REFERENCES src_erp_customers(id) ON DELETE SET NULL,
        cashier_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        bill_no VARCHAR(50) UNIQUE NOT NULL,
        channel VARCHAR(30) DEFAULT 'pos',
        payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending','partial','paid','failed','refunded')),
        payment_method VARCHAR(30) DEFAULT 'cash',
        split_payment JSONB DEFAULT '[]'::jsonb,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        round_off DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) NOT NULL,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('draft','hold','completed','void','returned')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES src_erp_sales(id) ON DELETE CASCADE,
        inventory_item_id INTEGER REFERENCES src_erp_inventory_items(id) ON DELETE SET NULL,
        title VARCHAR(220) NOT NULL,
        sku VARCHAR(80),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        line_total DECIMAL(12,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS src_erp_pos_holds (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        hold_code VARCHAR(40) UNIQUE NOT NULL,
        customer_name VARCHAR(180),
        cart_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        total DECIMAL(12,2) DEFAULT 0,
        held_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        held_at TIMESTAMP DEFAULT NOW(),
        resumed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS src_erp_expenses (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        category VARCHAR(120) NOT NULL,
        title VARCHAR(180) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_mode VARCHAR(30) DEFAULT 'cash',
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_attendance (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
        check_in TIME,
        check_out TIME,
        status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present','absent','half_day','leave')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (employee_id, attendance_date)
      );

      CREATE TABLE IF NOT EXISTS src_erp_purchase_orders (
        id              SERIAL PRIMARY KEY,
        business_id     INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id        INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        po_number       TEXT NOT NULL,
        supplier_id     INTEGER REFERENCES src_erp_suppliers(id) ON DELETE SET NULL,
        status          VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','ordered','partial','received','cancelled')),
        expected_date   DATE,
        freight_amount  DECIMAL(12,2) DEFAULT 0,
        subtotal        DECIMAL(12,2) DEFAULT 0,
        tax_amount      DECIMAL(12,2) DEFAULT 0,
        total           DECIMAL(12,2) DEFAULT 0,
        notes           TEXT,
        created_by      INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW(),
        UNIQUE(business_id, po_number)
      );

      CREATE TABLE IF NOT EXISTS src_erp_purchase_items (
        id                  SERIAL PRIMARY KEY,
        purchase_order_id   INTEGER REFERENCES src_erp_purchase_orders(id) ON DELETE CASCADE,
        inventory_item_id   INTEGER REFERENCES src_erp_inventory_items(id) ON DELETE SET NULL,
        title               VARCHAR(220),
        sku                 VARCHAR(80),
        hsn_code            VARCHAR(30),
        gst_rate            DECIMAL(5,2) DEFAULT 0,
        quantity_ordered    INTEGER NOT NULL DEFAULT 0,
        quantity_received   INTEGER DEFAULT 0,
        unit_cost           DECIMAL(12,2) NOT NULL DEFAULT 0,
        line_total          DECIMAL(12,2) DEFAULT 0,
        created_at          TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_erp_returns (
        id                  SERIAL PRIMARY KEY,
        business_id         INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id            INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        return_no           TEXT NOT NULL,
        original_sale_id    INTEGER REFERENCES src_erp_sales(id) ON DELETE SET NULL,
        customer_id         INTEGER REFERENCES src_erp_customers(id) ON DELETE SET NULL,
        return_type         VARCHAR(30) DEFAULT 'refund' CHECK (return_type IN ('refund','store_credit','exchange')),
        status              VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending','completed','cancelled')),
        total_amount        DECIMAL(12,2) DEFAULT 0,
        notes               TEXT,
        processed_by        INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE(business_id, return_no)
      );

      CREATE TABLE IF NOT EXISTS src_erp_return_items (
        id                  SERIAL PRIMARY KEY,
        return_id           INTEGER REFERENCES src_erp_returns(id) ON DELETE CASCADE,
        sale_item_id        INTEGER REFERENCES src_erp_sale_items(id) ON DELETE SET NULL,
        inventory_item_id   INTEGER REFERENCES src_erp_inventory_items(id) ON DELETE SET NULL,
        title               VARCHAR(220),
        quantity            INTEGER NOT NULL DEFAULT 0,
        unit_price          DECIMAL(12,2) DEFAULT 0,
        line_total          DECIMAL(12,2) DEFAULT 0,
        created_at          TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_erp_inventory_business ON src_erp_inventory_items(business_id);
      CREATE INDEX IF NOT EXISTS idx_erp_inventory_stock ON src_erp_inventory_items(current_stock);
      CREATE INDEX IF NOT EXISTS idx_erp_movements_item ON src_erp_inventory_movements(inventory_item_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_erp_sales_business_date ON src_erp_sales(business_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_erp_expenses_business_date ON src_erp_expenses(business_id, expense_date DESC);
      CREATE INDEX IF NOT EXISTS idx_erp_purchase_orders_business ON src_erp_purchase_orders(business_id);
      CREATE INDEX IF NOT EXISTS idx_erp_returns_business ON src_erp_returns(business_id);
      CREATE INDEX IF NOT EXISTS idx_erp_attendance_business_date ON src_erp_attendance(business_id, attendance_date DESC);
    `);

    // G��G�� Migrations: add columns if they don't exist G��G��
    await client.query(`
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(200);
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES src_businesses(id) ON DELETE SET NULL;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(30);

      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100);
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS shipment_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS tracking_synced_at TIMESTAMP;

      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS is_free_delivery BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS free_delivery_expiry TIMESTAMP;
      ALTER TABLE src_users ADD COLUMN IF NOT EXISTS free_delivery_note VARCHAR(300);

      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS free_delivery_applied BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES src_businesses(id) ON DELETE SET NULL;
      ALTER TABLE src_order_items ADD COLUMN IF NOT EXISTS business_id INTEGER;
      CREATE TABLE IF NOT EXISTS src_payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE CASCADE,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE SET NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_method VARCHAR(100),
        provider_response JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_src_orders_business_id ON src_orders(business_id);
      CREATE INDEX IF NOT EXISTS idx_src_payments_business_id ON src_payments(business_id);

      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS rating_label VARCHAR(50) NOT NULL DEFAULT 'Excellent';
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS suggestion VARCHAR(150);
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS comment TEXT;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS admin_note TEXT;
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE src_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `).catch(() => {});

    // G��G�� Migrate src_stores to add enterprise fields G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
    await client.query(`
      ALTER TABLE src_stores ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
      ALTER TABLE src_stores ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE src_stores ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE src_stores ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
      ALTER TABLE src_stores ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
      ALTER TABLE src_stores ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';
      ALTER TABLE src_stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `).catch(() => {});

    // G��G�� Migrate src_users role CHECK constraint to include all ERP roles G��G��G��G��G��G��
    // Drop old constraint and recreate with full role list (idempotent via catch)
    await client.query(`ALTER TABLE src_users DROP CONSTRAINT IF EXISTS src_users_role_check`).catch(() => {});
    await client.query(`
      ALTER TABLE src_users ADD CONSTRAINT src_users_role_check
        CHECK (role IN (
          'user','seller','admin','super_admin',
          'business_owner','store_admin','store_manager',
          'cashier','warehouse_manager','accountant','employee'
        ))
    `).catch(() => {});

    // G��G�� Migrate ERP customer table columns G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
    await client.query(`
      ALTER TABLE src_erp_customers ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
      ALTER TABLE src_erp_customers ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE src_erp_customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE src_erp_customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE src_erp_customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
      ALTER TABLE src_erp_customers ADD COLUMN IF NOT EXISTS membership VARCHAR(30) DEFAULT 'regular';
      ALTER TABLE src_erp_customers ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS notes TEXT;
    `).catch(() => {});

    // G��G�� Fix attendance check_in/check_out to store as TIME not TIMESTAMP G��G��G��G��G��G��G��
    await client.query(`
      ALTER TABLE src_erp_attendance ALTER COLUMN check_in TYPE TIME USING check_in::time;
      ALTER TABLE src_erp_attendance ALTER COLUMN check_out TYPE TIME USING check_out::time;
    `).catch(() => {});

    // G��G�� Ensure inventory items has internal_product_id G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
    await client.query(`
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS internal_product_id VARCHAR(80);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(30);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT 0;
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS variant_color VARCHAR(60);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS variant_size VARCHAR(60);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS rack_code VARCHAR(50);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS shelf_code VARCHAR(50);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS batch_no VARCHAR(80);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS serial_no VARCHAR(120);
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE src_erp_inventory_items ADD COLUMN IF NOT EXISTS unit_weight DECIMAL(10,2) DEFAULT 0;
    `).catch(() => {});

    // G��G�� Ensure ERP sales has all required columns G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
    await client.query(`
      ALTER TABLE src_erp_sales ADD COLUMN IF NOT EXISTS split_payment JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE src_erp_sales ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
      ALTER TABLE src_erp_sales ADD COLUMN IF NOT EXISTS coupon_code TEXT;
      ALTER TABLE src_erp_sales ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE src_erp_sales ADD COLUMN IF NOT EXISTS cashier_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL;
      ALTER TABLE src_erp_sales ADD COLUMN IF NOT EXISTS round_off DECIMAL(12,2) DEFAULT 0;
      ALTER TABLE src_erp_sales ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;
    `).catch(() => {});

    // Tracking logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_tracking_logs (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE CASCADE,
        awb VARCHAR(100),
        status VARCHAR(200),
        location VARCHAR(300),
        instructions TEXT,
        scanned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Newsletter subscribers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) UNIQUE NOT NULL,
        name VARCHAR(100),
        subscribed_at TIMESTAMP DEFAULT NOW(),
        unsubscribed_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_newsletter_email ON src_newsletter_subscribers(email);
      CREATE INDEX IF NOT EXISTS idx_newsletter_active ON src_newsletter_subscribers(is_active);
    `);

    // Payroll table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_erp_payroll (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        employee_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        year INTEGER NOT NULL,
        basic_salary DECIMAL(12,2) DEFAULT 0,
        allowances DECIMAL(12,2) DEFAULT 0,
        deductions DECIMAL(12,2) DEFAULT 0,
        bonus DECIMAL(12,2) DEFAULT 0,
        net_salary DECIMAL(12,2) DEFAULT 0,
        payment_mode VARCHAR(30) DEFAULT 'bank',
        payment_date DATE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
        notes TEXT,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (business_id, employee_id, month, year)
      );
      CREATE INDEX IF NOT EXISTS idx_erp_payroll_business ON src_erp_payroll(business_id, year, month);
      CREATE INDEX IF NOT EXISTS idx_erp_payroll_employee ON src_erp_payroll(employee_id);
    `);

    // Login sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_login_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        ip_address VARCHAR(60),
        user_agent TEXT,
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),
        location VARCHAR(200),
        logged_in_at TIMESTAMP DEFAULT NOW(),
        logged_out_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
      CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON src_login_sessions(user_id, logged_in_at DESC);
    `);

    // ── Migrate login_sessions: add missing columns ─────────────────────────
    await client.query(`
      ALTER TABLE src_login_sessions
        ADD COLUMN IF NOT EXISTS is_suspicious   BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS auth_method     VARCHAR(20) DEFAULT 'local',
        ADD COLUMN IF NOT EXISTS city            VARCHAR(100),
        ADD COLUMN IF NOT EXISTS region          VARCHAR(100),
        ADD COLUMN IF NOT EXISTS country         VARCHAR(100),
        ADD COLUMN IF NOT EXISTS country_code    VARCHAR(4),
        ADD COLUMN IF NOT EXISTS timezone        VARCHAR(60),
        ADD COLUMN IF NOT EXISTS latitude        DECIMAL(9,6),
        ADD COLUMN IF NOT EXISTS longitude       DECIMAL(9,6),
        ADD COLUMN IF NOT EXISTS isp             VARCHAR(200),
        ADD COLUMN IF NOT EXISTS browser_version VARCHAR(40),
        ADD COLUMN IF NOT EXISTS device_model    VARCHAR(120);
      CREATE INDEX IF NOT EXISTS idx_login_sessions_ip   ON src_login_sessions(ip_address);
      CREATE INDEX IF NOT EXISTS idx_login_sessions_time ON src_login_sessions(logged_in_at DESC);
    `).catch(() => {});

    // UTM tracking links table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_utm_links (
        id          SERIAL PRIMARY KEY,
        created_by  INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        name        VARCHAR(200) NOT NULL,
        slug        VARCHAR(80)  UNIQUE NOT NULL,
        destination TEXT         NOT NULL,
        source      VARCHAR(100),
        medium      VARCHAR(100),
        campaign    VARCHAR(200),
        total_clicks INTEGER DEFAULT 0,
        unique_clicks INTEGER DEFAULT 0,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS src_utm_clicks (
        id          SERIAL PRIMARY KEY,
        link_id     INTEGER REFERENCES src_utm_links(id) ON DELETE CASCADE,
        ip_address  VARCHAR(60),
        city        VARCHAR(100),
        region      VARCHAR(100),
        country     VARCHAR(100),
        device_type VARCHAR(50),
        device_model VARCHAR(120),
        browser     VARCHAR(100),
        os          VARCHAR(100),
        referer     TEXT,
        user_agent  TEXT,
        clicked_at  TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_utm_clicks_link ON src_utm_clicks(link_id, clicked_at DESC);
      CREATE INDEX IF NOT EXISTS idx_utm_links_slug  ON src_utm_links(slug);
    `).catch(() => {});

    // POS sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_erp_pos_sessions (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
        cashier_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        opening_cash DECIMAL(12,2) DEFAULT 0,
        closing_cash DECIMAL(12,2),
        total_sales DECIMAL(12,2) DEFAULT 0,
        total_bills INTEGER DEFAULT 0,
        opened_at TIMESTAMP DEFAULT NOW(),
        closed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed'))
      );
      CREATE INDEX IF NOT EXISTS idx_pos_sessions_business ON src_erp_pos_sessions(business_id, opened_at DESC);
    `);

    // Footer settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_footer_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        type VARCHAR(20) DEFAULT 'text',
        updated_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed footer settings with defaults
    await client.query(`
      INSERT INTO src_footer_settings (key, value, type) VALUES
        ('store_name', 'NOREN', 'text'),
        ('store_address', 'Silver Square Link, Near Sravan Choukdi, Bharuch, Gujarat G�� 392001, India', 'text'),
        ('phone_number', '+91 9876543210', 'text'),
        ('whatsapp_number', '919876543210', 'text'),
        ('support_email', 'support@norenfashion.in', 'text'),
        ('working_hours', 'Mon G�� Sat: 9:00 AM to 8:00 PM', 'text'),
        ('brand_description', 'Premium Men''s Fashion Brand delivering trendy and high-quality clothing across India.', 'text'),
        ('google_maps_url', 'https://maps.google.com/?q=Bharuch,Gujarat,India', 'url'),
        ('instagram_url', '#', 'url'),
        ('facebook_url', '#', 'url'),
        ('youtube_url', '#', 'url'),
        ('copyright_text', '-� 2026 NOREN. All Rights Reserved.', 'text'),
        ('tagline', 'Designed for Premium Men''s Fashion Experience', 'text')
      ON CONFLICT (key) DO NOTHING;
    `);

    // ── Migration: add gender field to src_products ────────────────────────────
    await client.query(`
      ALTER TABLE src_products
        ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'men';
    `).catch(() => {});

    // Fix any NULL gender values to 'men'
    await client.query(`
      UPDATE src_products SET gender = 'men' WHERE gender IS NULL;
    `).catch(() => {});

    // ── Auto-approve products created by admin roles that are still pending ────
    await client.query(`
      UPDATE src_products
      SET status = 'approved'
      WHERE status = 'pending'
        AND seller_id IN (
          SELECT id FROM src_users
          WHERE role IN ('admin','super_admin','business_owner','store_admin','store_manager')
        )
        AND deleted_at IS NULL;
    `).catch(() => {});

    // ── Migration: add gender field to src_categories ──────────────────────────
    await client.query(`
      ALTER TABLE src_categories
        ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT NULL;
    `).catch(() => {});

    // Seed default Men's categories
    await client.query(`
      INSERT INTO src_categories (name, slug, sort_order, gender) VALUES
        ('T-Shirts', 't-shirts', 1, 'men'),
        ('Shirts', 'shirts', 2, 'men'),
        ('Jeans', 'jeans', 3, 'men'),
        ('Jackets', 'jackets', 4, 'men'),
        ('Ethnic Wear', 'ethnic-wear', 5, 'men'),
        ('Polo', 'polo', 6, 'men'),
        ('Hoodies', 'hoodies', 7, 'men'),
        ('Sweatshirts', 'sweatshirts', 8, 'men'),
        ('Trousers', 'trousers', 9, 'men'),
        ('Shorts', 'shorts', 10, 'men'),
        ('Track Pants', 'track-pants', 11, 'men'),
        ('Blazers', 'blazers', 12, 'men'),
        ('Men Kurta Sets', 'men-kurta-sets', 13, 'men'),
        ('Activewear', 'activewear', 14, 'men'),
        ('Innerwear', 'innerwear', 15, 'men'),
        ('Accessories', 'accessories', 16, 'men')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Seed Women's categories
    await client.query(`
      INSERT INTO src_categories (name, slug, sort_order, gender) VALUES
        ('Kurtis', 'kurtis', 101, 'women'),
        ('Kurtas', 'kurtas', 102, 'women'),
        ('Kurta Sets', 'kurta-sets', 103, 'women'),
        ('Anarkali Suits', 'anarkali-suits', 104, 'women'),
        ('Salwar Suits', 'salwar-suits', 105, 'women'),
        ('Chikankari', 'chikankari', 106, 'women'),
        ('Co-Ord Sets', 'co-ord-sets', 107, 'women'),
        ('Cotton Kurtis', 'cotton-kurtis', 108, 'women'),
        ('Printed Kurtis', 'printed-kurtis', 109, 'women'),
        ('Embroidered Kurtis', 'embroidered-kurtis', 110, 'women'),
        ('A-Line Kurtis', 'a-line-kurtis', 111, 'women'),
        ('Straight Kurtis', 'straight-kurtis', 112, 'women'),
        ('Leggings', 'leggings', 113, 'women'),
        ('Palazzo', 'palazzo', 114, 'women'),
        ('Pants', 'pants', 115, 'women'),
        ('Sharara', 'sharara', 116, 'women'),
        ('Gharara', 'gharara', 117, 'women'),
        ('Tops', 'tops', 118, 'women'),
        ('Women T-Shirts', 'women-t-shirts', 119, 'women'),
        ('Women Shirts', 'women-shirts', 120, 'women'),
        ('Women Jeans', 'women-jeans', 121, 'women'),
        ('Trousers', 'trousers', 122, 'women'),
        ('Dresses', 'dresses', 123, 'women'),
        ('Maxi Dresses', 'maxi-dresses', 124, 'women'),
        ('Midi Dresses', 'midi-dresses', 125, 'women'),
        ('Skirts', 'skirts', 126, 'women'),
        ('Women Jackets', 'women-jackets', 127, 'women'),
        ('Blazers', 'blazers', 128, 'women'),
        ('Dupattas', 'dupattas', 129, 'women'),
        ('Handbags', 'handbags', 130, 'women'),
        ('Wallets', 'wallets', 131, 'women'),
        ('Belts', 'belts', 132, 'women'),
        ('Scarves', 'scarves', 133, 'women')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Seed ERP permissions
    await client.query(`
      INSERT INTO src_permissions (name, description, group_name) VALUES
        ('erp.view_dashboard', 'View ERP dashboard', 'ERP'),
        ('erp.manage_domains', 'Manage tenant domains', 'ERP'),
        ('erp.manage_users', 'Manage users and employees', 'ERP'),
        ('erp.manage_orders', 'Manage orders and shipments', 'ERP'),
        ('erp.manage_inventory', 'Manage inventory and products', 'ERP'),
        ('erp.manage_finance', 'Manage invoices, payments and reports', 'ERP'),
        ('erp.manage_notifications', 'Send notifications and campaigns', 'ERP'),
        ('erp.view_reports', 'View sales and business reports', 'ERP'),
        ('erp.manage_settings', 'Manage business settings', 'ERP'),
        ('erp.manage_suppliers', 'Manage suppliers and purchase orders', 'ERP'),
        ('erp.view_audit_logs', 'View immutable audit logs', 'ERP'),
        ('erp.manage_pos', 'Operate billing POS and held bills', 'ERP'),
        ('erp.manage_warehouse', 'Manage warehouses and stock transfers', 'ERP')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'super_admin', p.id FROM src_permissions p
        WHERE p.name LIKE 'erp.%'
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'admin', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_users','erp.manage_orders','erp.manage_inventory','erp.view_reports','erp.manage_settings','erp.manage_notifications','erp.view_audit_logs','erp.manage_pos','erp.manage_warehouse','erp.manage_suppliers')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'business_owner', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_users','erp.manage_orders','erp.manage_inventory','erp.view_reports','erp.manage_settings','erp.manage_finance','erp.manage_suppliers','erp.view_audit_logs','erp.manage_pos','erp.manage_warehouse')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'store_admin', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_orders','erp.manage_inventory','erp.manage_users','erp.manage_notifications','erp.manage_pos','erp.manage_warehouse','erp.view_reports')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'store_manager', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_orders','erp.manage_inventory','erp.manage_notifications','erp.manage_pos','erp.manage_warehouse','erp.view_reports')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'cashier', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_orders','erp.manage_finance','erp.manage_pos')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'warehouse_manager', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_inventory','erp.manage_orders','erp.manage_warehouse','erp.view_reports')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'accountant', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard','erp.manage_finance','erp.view_reports','erp.view_audit_logs')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'employee', p.id FROM src_permissions p
        WHERE p.name IN ('erp.view_dashboard')
      ON CONFLICT DO NOTHING;
    `);

    const defaultAdminEmail = 'admin@norenfashion.in';
    const defaultAdminPassword = await bcrypt.hash('Admin@1234', 12);
    await client.query(`
      INSERT INTO src_users (name, email, password, role, is_banned)
      VALUES ($1, $2, $3, 'super_admin', FALSE)
      ON CONFLICT (email) DO NOTHING;
    `, ['Super Admin', defaultAdminEmail, defaultAdminPassword]);

    // G��G�� Seed default business, store and warehouse G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
    await client.query(`
      INSERT INTO src_businesses (name, slug, currency, timezone, is_active)
      VALUES ('NOREN', 'shriramclothings', 'INR', 'Asia/Kolkata', TRUE)
      ON CONFLICT (slug) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_stores (business_id, name, slug, store_code, is_active)
      SELECT b.id, 'Main Store', 'main-store', 'STORE-001', TRUE
      FROM src_businesses b WHERE b.slug = 'shriramclothings'
      ON CONFLICT (slug) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO src_warehouses (business_id, name, is_active)
      SELECT b.id, 'Main Warehouse', TRUE
      FROM src_businesses b
      WHERE b.slug = 'shriramclothings'
        AND NOT EXISTS (
          SELECT 1 FROM src_warehouses w WHERE w.business_id = b.id
        );
    `);

    // Link admin user to default business (runs after column migration)
    await client.query(`
      UPDATE src_users
      SET business_id = (SELECT id FROM src_businesses WHERE slug = 'shriramclothings' LIMIT 1)
      WHERE email = $1
        AND (business_id IS NULL OR business_id = 0)
    `, [defaultAdminEmail]).catch(() => {});

    console.log('G�� NOREN DB initialized');

    // G��G�� Phase 2: Schema extensions G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
    await client.query(`
      -- Message status, edit/delete, reply, pin, star on private chat messages
      ALTER TABLE src_private_chat_messages
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent',
        ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS deleted_for_sender BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES src_private_chat_messages(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_starred_by JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS forward_from_id INTEGER;
    `).catch(() => {});

    await client.query(`
      -- Message reactions
      CREATE TABLE IF NOT EXISTS src_message_reactions (
        id         SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES src_private_chat_messages(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        emoji      VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      );
      CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON src_message_reactions(message_id);
    `).catch(() => {});

    await client.query(`
      -- Call logs for in-house WebRTC
      CREATE TABLE IF NOT EXISTS src_erp_call_logs (
        id               SERIAL PRIMARY KEY,
        business_id      INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        caller_id        INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        callee_id        INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        call_type        VARCHAR(10) DEFAULT 'audio',
        status           VARCHAR(20) DEFAULT 'completed',
        start_time       TIMESTAMP,
        end_time         TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0,
        created_at       TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_call_logs_business ON src_erp_call_logs(business_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_call_logs_caller   ON src_erp_call_logs(caller_id);
      CREATE INDEX IF NOT EXISTS idx_call_logs_callee   ON src_erp_call_logs(callee_id);
    `).catch(() => {});

    await client.query(`
      -- Warehouse zones and bin locations
      CREATE TABLE IF NOT EXISTS src_warehouse_zones (
        id           SERIAL PRIMARY KEY,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE CASCADE,
        business_id  INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        name         VARCHAR(150) NOT NULL,
        zone_type    VARCHAR(50) DEFAULT 'storage',
        capacity     INTEGER DEFAULT 0,
        is_active    BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_warehouse_zones_wh ON src_warehouse_zones(warehouse_id);

      CREATE TABLE IF NOT EXISTS src_warehouse_bins (
        id           SERIAL PRIMARY KEY,
        zone_id      INTEGER REFERENCES src_warehouse_zones(id) ON DELETE CASCADE,
        warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE CASCADE,
        business_id  INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        bin_code     VARCHAR(50) NOT NULL,
        description  TEXT,
        is_active    BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMP DEFAULT NOW(),
        UNIQUE(warehouse_id, bin_code)
      );
      CREATE INDEX IF NOT EXISTS idx_warehouse_bins_zone ON src_warehouse_bins(zone_id);
    `).catch(() => {});

    await client.query(`
      -- Transfer approval requests
      CREATE TABLE IF NOT EXISTS src_erp_transfer_requests (
        id                SERIAL PRIMARY KEY,
        business_id       INTEGER REFERENCES src_businesses(id) ON DELETE CASCADE,
        inventory_item_id INTEGER REFERENCES src_erp_inventory_items(id) ON DELETE CASCADE,
        from_warehouse_id INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        to_warehouse_id   INTEGER REFERENCES src_warehouses(id) ON DELETE SET NULL,
        quantity          INTEGER NOT NULL,
        notes             TEXT,
        status            VARCHAR(30) DEFAULT 'pending_approval',
        requested_by      INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        approved_by       INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        approved_at       TIMESTAMP,
        created_at        TIMESTAMP DEFAULT NOW(),
        updated_at        TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_transfer_requests_business ON src_erp_transfer_requests(business_id, status);
    `).catch(() => {});

    // Add zone/bin columns to inventory items
    await client.query(`
      ALTER TABLE src_erp_inventory_items
        ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES src_warehouse_zones(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS bin_id  INTEGER REFERENCES src_warehouse_bins(id)  ON DELETE SET NULL;
    `).catch(() => {});

    // Add session_id to sales
    await client.query(`
      ALTER TABLE src_erp_sales
        ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES src_erp_pos_sessions(id) ON DELETE SET NULL;
    `).catch(() => {});

    // Seed approve_transfers permission
    await client.query(`
      INSERT INTO src_permissions (name, description, group_name)
      VALUES ('erp.approve_transfers', 'Approve or reject warehouse transfer requests', 'ERP')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'warehouse_manager', p.id FROM src_permissions p
        WHERE p.name = 'erp.approve_transfers'
      ON CONFLICT DO NOTHING;

      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'store_admin', p.id FROM src_permissions p
        WHERE p.name = 'erp.approve_transfers'
      ON CONFLICT DO NOTHING;

      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'business_owner', p.id FROM src_permissions p
        WHERE p.name = 'erp.approve_transfers'
      ON CONFLICT DO NOTHING;
    `).catch(() => {});

    console.log('G�� Phase 2 schema extensions applied');

    // ═══════════════════════════════════════════════════════════════════════
    //  PHASE 3 — Influencer & Affiliate Management System Schema
    // ═══════════════════════════════════════════════════════════════════════

    // 3a. Add 'influencer' to the users role CHECK constraint
    await client.query(`ALTER TABLE src_users DROP CONSTRAINT IF EXISTS src_users_role_check`).catch(() => {});
    await client.query(`
      ALTER TABLE src_users ADD CONSTRAINT src_users_role_check
        CHECK (role IN (
          'user','seller','admin','super_admin',
          'business_owner','store_admin','store_manager',
          'cashier','warehouse_manager','accountant','employee',
          'influencer'
        ))
    `).catch(() => {});

    // 3b. Influencer profiles (extended info beyond src_users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES src_users(id) ON DELETE CASCADE,
        display_name VARCHAR(100),
        username VARCHAR(80) UNIQUE,
        category VARCHAR(120),
        niche VARCHAR(200),
        location VARCHAR(200),
        bio TEXT,
        website_url TEXT,
        profile_photo TEXT,
        commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('percentage','fixed')),
        commission_rate DECIMAL(10,4) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','pending')),
        fraud_status VARCHAR(20) DEFAULT 'normal' CHECK (fraud_status IN ('normal','review','suspicious','blocked')),
        agreement_status VARCHAR(20) DEFAULT 'pending' CHECK (agreement_status IN ('pending','signed','expired','terminated')),
        contract_start_date DATE,
        contract_end_date DATE,
        notes TEXT,
        admin_notes TEXT,
        payment_method VARCHAR(50),
        payment_details JSONB DEFAULT '{}'::jsonb,
        tax_info JSONB DEFAULT '{}'::jsonb,
        total_clicks BIGINT DEFAULT 0,
        total_unique_visitors BIGINT DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        total_revenue DECIMAL(14,4) DEFAULT 0,
        total_commission DECIMAL(14,4) DEFAULT 0,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_profiles_user ON src_inf_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_inf_profiles_status ON src_inf_profiles(status);
    `);

    // 3c. Social media handles
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_social_profiles (
        id SERIAL PRIMARY KEY,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        handle VARCHAR(200),
        url TEXT,
        followers_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(influencer_id, platform)
      );
    `);

    // 3d. Campaigns
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(220) UNIQUE NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','paused','completed','archived')),
        start_date DATE,
        end_date DATE,
        budget DECIMAL(14,2),
        commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('percentage','fixed')),
        commission_rate DECIMAL(10,4) DEFAULT 0,
        target_product_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
        target_category_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
        terms TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_campaigns_status ON src_inf_campaigns(status);
    `);

    // 3e. Campaign <-> Influencer assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_campaign_influencers (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES src_inf_campaigns(id) ON DELETE CASCADE,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        commission_type VARCHAR(20),
        commission_rate DECIMAL(10,4),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','removed')),
        assigned_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(campaign_id, influencer_id)
      );
      CREATE INDEX IF NOT EXISTS idx_inf_ci_campaign ON src_inf_campaign_influencers(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_inf_ci_influencer ON src_inf_campaign_influencers(influencer_id);
    `);

    // 3f. Tracking/UTM links (influencer-specific)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_links (
        id SERIAL PRIMARY KEY,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES src_inf_campaigns(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(32) UNIQUE NOT NULL,
        destination TEXT NOT NULL,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(200),
        utm_content VARCHAR(200),
        utm_term VARCHAR(200),
        ref_code VARCHAR(32) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        deleted_at TIMESTAMP,
        total_clicks BIGINT DEFAULT 0,
        unique_clicks BIGINT DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        total_revenue DECIMAL(14,4) DEFAULT 0,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_links_influencer ON src_inf_links(influencer_id);
      CREATE INDEX IF NOT EXISTS idx_inf_links_campaign ON src_inf_links(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_inf_links_slug ON src_inf_links(slug);
      CREATE INDEX IF NOT EXISTS idx_inf_links_ref ON src_inf_links(ref_code);
    `);

    // 3g. Click/visit tracking events
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_clicks (
        id BIGSERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL REFERENCES src_inf_links(id) ON DELETE CASCADE,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES src_inf_campaigns(id) ON DELETE SET NULL,
        session_token VARCHAR(64),
        ip_address VARCHAR(60),
        is_unique BOOLEAN DEFAULT FALSE,
        landing_page TEXT,
        referer TEXT,
        device_type VARCHAR(30),
        device_model VARCHAR(120),
        browser VARCHAR(60),
        os VARCHAR(60),
        city VARCHAR(100),
        region VARCHAR(100),
        country VARCHAR(100),
        user_agent TEXT,
        clicked_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_clicks_link ON src_inf_clicks(link_id, clicked_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_clicks_influencer ON src_inf_clicks(influencer_id, clicked_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_clicks_session ON src_inf_clicks(session_token);
      CREATE INDEX IF NOT EXISTS idx_inf_clicks_date ON src_inf_clicks(clicked_at DESC);
    `);

    // 3h. Tracking sessions (attribution window)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_sessions (
        id SERIAL PRIMARY KEY,
        session_token VARCHAR(64) UNIQUE NOT NULL,
        link_id INTEGER REFERENCES src_inf_links(id) ON DELETE SET NULL,
        influencer_id INTEGER REFERENCES src_inf_profiles(id) ON DELETE SET NULL,
        campaign_id INTEGER REFERENCES src_inf_campaigns(id) ON DELETE SET NULL,
        ip_address VARCHAR(60),
        user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        attribution_model VARCHAR(30) DEFAULT 'last_click',
        attribution_window_days INTEGER DEFAULT 30,
        expires_at TIMESTAMP NOT NULL,
        converted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_sessions_token ON src_inf_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_inf_sessions_ip ON src_inf_sessions(ip_address, expires_at);
      CREATE INDEX IF NOT EXISTS idx_inf_sessions_expires ON src_inf_sessions(expires_at);
    `);

    // 3i. Tracking funnel events
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_events (
        id BIGSERIAL PRIMARY KEY,
        session_token VARCHAR(64),
        link_id INTEGER REFERENCES src_inf_links(id) ON DELETE SET NULL,
        influencer_id INTEGER REFERENCES src_inf_profiles(id) ON DELETE SET NULL,
        campaign_id INTEGER REFERENCES src_inf_campaigns(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('landing','product_view','add_to_cart','checkout_start','order_placed','payment_success','order_completed')),
        product_id INTEGER REFERENCES src_products(id) ON DELETE SET NULL,
        order_id INTEGER REFERENCES src_orders(id) ON DELETE SET NULL,
        value DECIMAL(14,4),
        metadata JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(60),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_events_session ON src_inf_events(session_token, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_events_influencer ON src_inf_events(influencer_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_events_type ON src_inf_events(event_type, created_at DESC);
    `);

    // 3j. Conversions (order attributions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_conversions (
        id SERIAL PRIMARY KEY,
        conversion_uid VARCHAR(64) UNIQUE NOT NULL,
        order_id INTEGER UNIQUE NOT NULL REFERENCES src_orders(id) ON DELETE CASCADE,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES src_inf_campaigns(id) ON DELETE SET NULL,
        link_id INTEGER REFERENCES src_inf_links(id) ON DELETE SET NULL,
        session_token VARCHAR(64),
        attribution_model VARCHAR(30) DEFAULT 'last_click',
        attribution_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        order_total DECIMAL(14,4) NOT NULL,
        eligible_total DECIMAL(14,4) NOT NULL,
        commission_type VARCHAR(20) NOT NULL,
        commission_rate DECIMAL(10,4) NOT NULL,
        commission_amount DECIMAL(14,4) NOT NULL,
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected','cancelled','reversed','paid')),
        admin_note TEXT,
        reviewed_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        idempotency_key VARCHAR(128) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_conversions_influencer ON src_inf_conversions(influencer_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_conversions_order ON src_inf_conversions(order_id);
      CREATE INDEX IF NOT EXISTS idx_inf_conversions_status ON src_inf_conversions(status);
    `);

    // 3k. Commission adjustments (refunds, manual overrides)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_commission_adjustments (
        id SERIAL PRIMARY KEY,
        conversion_id INTEGER NOT NULL REFERENCES src_inf_conversions(id) ON DELETE CASCADE,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('refund_reversal','manual_increase','manual_decrease','admin_override','cancellation')),
        amount DECIMAL(14,4) NOT NULL,
        reason TEXT NOT NULL,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_adj_conversion ON src_inf_commission_adjustments(conversion_id);
      CREATE INDEX IF NOT EXISTS idx_inf_adj_influencer ON src_inf_commission_adjustments(influencer_id);
    `);

    // 3l. Payouts
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_payouts (
        id SERIAL PRIMARY KEY,
        payout_uid VARCHAR(64) UNIQUE NOT NULL,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        period_start DATE,
        period_end DATE,
        conversion_count INTEGER DEFAULT 0,
        gross_commission DECIMAL(14,4) DEFAULT 0,
        adjustments DECIMAL(14,4) DEFAULT 0,
        final_amount DECIMAL(14,4) NOT NULL,
        payment_method VARCHAR(80),
        transaction_ref VARCHAR(200),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','paid','failed','cancelled')),
        admin_notes TEXT,
        created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        approved_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_payouts_influencer ON src_inf_payouts(influencer_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_payouts_status ON src_inf_payouts(status);
    `);

    // 3m. Payout items (conversions included in a payout)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_payout_items (
        id SERIAL PRIMARY KEY,
        payout_id INTEGER NOT NULL REFERENCES src_inf_payouts(id) ON DELETE CASCADE,
        conversion_id INTEGER NOT NULL REFERENCES src_inf_conversions(id) ON DELETE CASCADE,
        commission_amount DECIMAL(14,4) NOT NULL,
        UNIQUE(payout_id, conversion_id)
      );
    `);

    // 3n. Daily analytics aggregation (for fast dashboard queries)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_daily_stats (
        id SERIAL PRIMARY KEY,
        influencer_id INTEGER NOT NULL REFERENCES src_inf_profiles(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES src_inf_campaigns(id) ON DELETE SET NULL,
        link_id INTEGER REFERENCES src_inf_links(id) ON DELETE SET NULL,
        stat_date DATE NOT NULL,
        clicks BIGINT DEFAULT 0,
        unique_visitors BIGINT DEFAULT 0,
        orders INTEGER DEFAULT 0,
        revenue DECIMAL(14,4) DEFAULT 0,
        commission DECIMAL(14,4) DEFAULT 0,
        UNIQUE(influencer_id, campaign_id, link_id, stat_date)
      );
      CREATE INDEX IF NOT EXISTS idx_inf_daily_influencer_date ON src_inf_daily_stats(influencer_id, stat_date DESC);
    `);

    // 3o. Fraud events
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_fraud_events (
        id SERIAL PRIMARY KEY,
        influencer_id INTEGER REFERENCES src_inf_profiles(id) ON DELETE SET NULL,
        link_id INTEGER REFERENCES src_inf_links(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_reviewed BOOLEAN DEFAULT FALSE,
        reviewed_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_fraud_influencer ON src_inf_fraud_events(influencer_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_fraud_reviewed ON src_inf_fraud_events(is_reviewed);
    `);

    // 3p. Influencer audit log (immutable)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_inf_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        actor_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        actor_role VARCHAR(30),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(60),
        resource_id VARCHAR(60),
        ip_address VARCHAR(60),
        user_agent TEXT,
        before_value JSONB,
        after_value JSONB,
        result VARCHAR(20) DEFAULT 'success',
        request_id VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inf_audit_actor ON src_inf_audit_logs(actor_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inf_audit_resource ON src_inf_audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_inf_audit_date ON src_inf_audit_logs(created_at DESC);
    `);

    // 3q. Influencer permissions seed
    await client.query(`
      INSERT INTO src_permissions (name, description, group_name) VALUES
        ('influencer.view',    'View influencer accounts',        'Influencer'),
        ('influencer.create',  'Create influencer accounts',      'Influencer'),
        ('influencer.update',  'Update influencer accounts',      'Influencer'),
        ('influencer.disable', 'Disable influencer accounts',     'Influencer'),
        ('campaign.view',      'View campaigns',                  'Influencer'),
        ('campaign.create',    'Create campaigns',                'Influencer'),
        ('campaign.update',    'Update campaigns',                'Influencer'),
        ('tracking.view',      'View tracking links/analytics',   'Influencer'),
        ('commission.view',    'View commission records',         'Influencer'),
        ('commission.update',  'Modify commission records',       'Influencer'),
        ('payout.view',        'View payout records',             'Influencer'),
        ('payout.approve',     'Approve payouts',                 'Influencer'),
        ('payout.mark_paid',   'Mark payouts as paid',            'Influencer'),
        ('security.view',      'View security/fraud events',      'Influencer'),
        ('reports.export',     'Export influencer reports',       'Influencer')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign all influencer permissions to super_admin and admin
    await client.query(`
      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'super_admin', p.id FROM src_permissions p
        WHERE p.group_name = 'Influencer'
      ON CONFLICT DO NOTHING;

      INSERT INTO src_role_permissions (role, permission_id)
        SELECT 'admin', p.id FROM src_permissions p
        WHERE p.group_name = 'Influencer'
      ON CONFLICT DO NOTHING;
    `);

    // Add attribution_window_days config to settings if missing
    await client.query(`
      INSERT INTO src_settings (key, value) VALUES ('influencer_attribution_window_days', '30')
      ON CONFLICT (key) DO NOTHING;

      INSERT INTO src_settings (key, value) VALUES ('influencer_attribution_model', 'last_click')
      ON CONFLICT (key) DO NOTHING;

      INSERT INTO src_settings (key, value) VALUES ('influencer_commission_hold_days', '7')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Add influencer attribution columns to src_orders
    await client.query(`
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS inf_session_token VARCHAR(64);
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS inf_link_id INTEGER REFERENCES src_inf_links(id) ON DELETE SET NULL;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS inf_influencer_id INTEGER REFERENCES src_inf_profiles(id) ON DELETE SET NULL;
      ALTER TABLE src_orders ADD COLUMN IF NOT EXISTS inf_campaign_id INTEGER REFERENCES src_inf_campaigns(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_inf_session ON src_orders(inf_session_token);
    `).catch(() => {});

    console.log('✅ Phase 3 — Influencer schema applied');

  } finally {
    client.release();
  }
};

/**
 * Append an immutable audit log entry.
 * Must be called with a pg client (not pool) when inside a transaction.
 * @param {import('pg').Client | import('pg').Pool} db - pool or transaction client
 * @param {{ adminId?: number, action: string, targetType?: string, targetId?: number|string, details?: string }} opts
 */
const logAudit = async (db, { adminId = null, action, targetType = null, targetId = null, details = null }) => {
  try {
    await db.query(
      `INSERT INTO src_activity_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, targetType, targetId ? String(targetId) : null, details]
    );
  } catch (err) {
    // Never throw from audit G�� log failure silently so it doesn't break the main transaction
    console.error('Audit log error:', err.message);
  }
};

module.exports = { pool, initDB, logAudit };



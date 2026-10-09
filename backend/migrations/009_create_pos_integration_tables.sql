-- ============================================================================
-- VENDEXA RetailOS™ × NOREN — POS Integration Tables
-- Migration 009: POS Device Registry, Invoice Tokens, Sync Queue, Audit Events
-- ============================================================================
-- Rules:
--   • All tables are prefixed src_pos_*
--   • Every write operation that touches src_erp_sales or inventory is
--     idempotent via idempotency_key UNIQUE constraints
--   • Public invoice tokens store only the SHA-256 hash of the random token
--     (the plaintext token is returned once on creation and never stored)
--   • Audit events are append-only; no UPDATE/DELETE is permitted on that table
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. POS DEVICE REGISTRY
--    One row per physical VENDEXA RetailOS installation.
--    device_fingerprint comes from the Electron hardware-ID (see electron-main.js).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_pos_devices (
  id                   SERIAL PRIMARY KEY,
  business_id          INTEGER NOT NULL REFERENCES src_businesses(id) ON DELETE CASCADE,
  store_id             INTEGER REFERENCES src_stores(id) ON DELETE SET NULL,
  device_fingerprint   VARCHAR(100) NOT NULL,             -- hardware ID from Electron
  device_name          VARCHAR(200) NOT NULL DEFAULT 'VENDEXA RetailOS',
  registered_by        INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','active','suspended','revoked')),
  api_key_hash         VARCHAR(255),                      -- bcrypt hash of the issued API key
  api_key_prefix       VARCHAR(10),                       -- first 8 chars, for display only
  last_seen_at         TIMESTAMPTZ,
  last_sync_at         TIMESTAMPTZ,
  last_ip              VARCHAR(64),
  revoked_at           TIMESTAMPTZ,
  revoked_by           INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_pos_devices_business  ON src_pos_devices(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_devices_status    ON src_pos_devices(status);
CREATE INDEX IF NOT EXISTS idx_pos_devices_key_pfx   ON src_pos_devices(api_key_prefix);

COMMENT ON TABLE  src_pos_devices IS 'Registered VENDEXA RetailOS POS terminals per business';
COMMENT ON COLUMN src_pos_devices.api_key_hash IS 'bcrypt hash of the device API key; plaintext is shown once on registration';
COMMENT ON COLUMN src_pos_devices.api_key_prefix IS 'First 8 characters of the API key, shown in the admin UI for identification';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. POS INVOICE PUBLIC-ACCESS TOKENS
--    One row per finalized POS sale.  The plaintext token is returned once to
--    the POS and embedded in the QR code URL.  Only the SHA-256 hex hash is
--    stored here.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_pos_invoice_tokens (
  id             SERIAL PRIMARY KEY,
  sale_id        INTEGER NOT NULL REFERENCES src_erp_sales(id) ON DELETE CASCADE,
  business_id    INTEGER NOT NULL REFERENCES src_businesses(id) ON DELETE CASCADE,
  token_hash     VARCHAR(64) NOT NULL UNIQUE,   -- SHA-256 hex of the 32-byte token
  token_prefix   VARCHAR(10) NOT NULL,           -- first 8 chars, for log correlation
  expires_at     TIMESTAMPTZ,                    -- NULL = never expires
  access_count   INTEGER NOT NULL DEFAULT 0,
  last_accessed  TIMESTAMPTZ,
  revoked        BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at     TIMESTAMPTZ,
  revoked_by     INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  replacement_id INTEGER REFERENCES src_pos_invoice_tokens(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_tokens_sale     ON src_pos_invoice_tokens(sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_tokens_business ON src_pos_invoice_tokens(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_tokens_revoked  ON src_pos_invoice_tokens(revoked);
CREATE INDEX IF NOT EXISTS idx_pos_tokens_hash     ON src_pos_invoice_tokens(token_hash);

COMMENT ON TABLE  src_pos_invoice_tokens IS 'Public QR-code access tokens for POS invoices';
COMMENT ON COLUMN src_pos_invoice_tokens.token_hash IS 'SHA-256 hex hash of the 32-byte cryptographically random token';
COMMENT ON COLUMN src_pos_invoice_tokens.replacement_id IS 'Points to the new token when this one is revoked and replaced';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. POS SYNCHRONISATION QUEUE
--    Stores outbound operations queued by the POS while offline.
--    The backend processes each entry exactly once (idempotency_key UNIQUE).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_pos_sync_queue (
  id                SERIAL PRIMARY KEY,
  device_id         INTEGER NOT NULL REFERENCES src_pos_devices(id) ON DELETE CASCADE,
  business_id       INTEGER NOT NULL REFERENCES src_businesses(id) ON DELETE CASCADE,
  operation_type    VARCHAR(50) NOT NULL
                      CHECK (operation_type IN (
                        'invoice_create','invoice_update',
                        'inventory_adjust','customer_upsert',
                        'payment_update','refund','cancellation'
                      )),
  idempotency_key   VARCHAR(100) NOT NULL UNIQUE,   -- client-generated UUID v4
  local_ref         VARCHAR(100),                    -- POS-side bill_no / local ID
  payload           JSONB NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','processing','done','failed','conflict')),
  server_ref        VARCHAR(100),                    -- server bill_no / sale_id after success
  retry_count       INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_device   ON src_pos_sync_queue(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_business ON src_pos_sync_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status   ON src_pos_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_idem     ON src_pos_sync_queue(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created  ON src_pos_sync_queue(created_at DESC);

COMMENT ON TABLE  src_pos_sync_queue IS 'Offline-first operation queue from VENDEXA RetailOS devices';
COMMENT ON COLUMN src_pos_sync_queue.idempotency_key IS 'Client UUID; UNIQUE constraint prevents duplicate processing on network retries';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. POS INTEGRATION AUDIT LOG
--    Append-only.  Rows must never be updated or deleted.
--    Records every security-sensitive or financially significant event.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_pos_audit_events (
  id             SERIAL PRIMARY KEY,
  business_id    INTEGER REFERENCES src_businesses(id) ON DELETE SET NULL,
  device_id      INTEGER REFERENCES src_pos_devices(id) ON DELETE SET NULL,
  actor_user_id  INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  event_type     VARCHAR(80) NOT NULL,
  -- e.g. device.registered, device.revoked, invoice.created,
  --      invoice.cancelled, token.generated, token.revoked,
  --      sync.success, sync.failed, payment.changed, refund.processed
  ref_type       VARCHAR(50),    -- 'sale', 'token', 'device', 'sync_op', ...
  ref_id         VARCHAR(100),   -- bill_no, token_prefix, device fingerprint, ...
  detail         TEXT,
  ip             VARCHAR(64),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_audit_business  ON src_pos_audit_events(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_audit_device    ON src_pos_audit_events(device_id);
CREATE INDEX IF NOT EXISTS idx_pos_audit_type      ON src_pos_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pos_audit_created   ON src_pos_audit_events(created_at DESC);

COMMENT ON TABLE src_pos_audit_events IS 'Append-only security and financial audit log for POS integration events';

-- ────────────────────────────────────────────────────────────────────────────
-- 5. INVOICE ACCESS LOG  (privacy-conscious — no PII logged)
--    One row every time a customer opens a public invoice link.
--    Useful for analytics and detecting token abuse.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_pos_invoice_access_log (
  id           SERIAL PRIMARY KEY,
  token_id     INTEGER NOT NULL REFERENCES src_pos_invoice_tokens(id) ON DELETE CASCADE,
  business_id  INTEGER NOT NULL REFERENCES src_businesses(id) ON DELETE CASCADE,
  ip_hash      VARCHAR(64),    -- SHA-256 of IP, NOT the raw IP
  user_agent   VARCHAR(500),
  action       VARCHAR(30) NOT NULL DEFAULT 'view'
                 CHECK (action IN ('view','download','verify','share')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_access_log_token    ON src_pos_invoice_access_log(token_id);
CREATE INDEX IF NOT EXISTS idx_pos_access_log_business ON src_pos_invoice_access_log(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_access_log_created  ON src_pos_invoice_access_log(created_at DESC);

COMMENT ON TABLE  src_pos_invoice_access_log IS 'Access events for public invoice QR links (no raw PII stored)';
COMMENT ON COLUMN src_pos_invoice_access_log.ip_hash IS 'SHA-256 hash of the visitor IP — raw IP is never stored';

-- ────────────────────────────────────────────────────────────────────────────
-- 6. SAFETY GUARDS  — add missing columns to src_erp_sales if needed
--    These ALTER statements are idempotent (IF NOT EXISTS).
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  -- sync_status tracks whether the POS has received server confirmation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'src_erp_sales' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE src_erp_sales
      ADD COLUMN sync_status VARCHAR(20) DEFAULT 'synced'
        CHECK (sync_status IN ('synced','pending','failed'));
  END IF;
END $$;

DO $$ BEGIN
  -- source distinguishes POS sales from online orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'src_erp_sales' AND column_name = 'source'
  ) THEN
    ALTER TABLE src_erp_sales
      ADD COLUMN source VARCHAR(20) DEFAULT 'pos'
        CHECK (source IN ('pos','online','manual'));
  END IF;
END $$;

DO $$ BEGIN
  -- device_id links the sale back to the POS terminal that created it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'src_erp_sales' AND column_name = 'pos_device_id'
  ) THEN
    ALTER TABLE src_erp_sales
      ADD COLUMN pos_device_id INTEGER REFERENCES src_pos_devices(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  -- idempotency_key prevents duplicate invoice creation on retries
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'src_erp_sales' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE src_erp_sales ADD COLUMN idempotency_key VARCHAR(100);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_erp_sales_idem
      ON src_erp_sales(idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. RECORD THIS MIGRATION
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_migrations (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO src_migrations (name)
VALUES ('009_create_pos_integration_tables.sql')
ON CONFLICT (name) DO NOTHING;

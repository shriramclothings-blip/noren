require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ─── Admin credentials ─────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@shriramclothings.com';
const ADMIN_PASSWORD = 'Admin@2024';
const ADMIN_NAME     = 'Super Admin';

// ─── All 3 database URLs ───────────────────────────────────────────────────────
const DB_URLS = [
  { label: 'DB1 (Primary)',   url: process.env.DATABASE_URL_1 },
  { label: 'DB2 (Secondary)', url: process.env.DATABASE_URL_2 },
  { label: 'DB3 (Backup)',    url: process.env.DATABASE_URL_3 },
].filter(d => d.url);

function buildPool(url) {
  const clean = url
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/[?&]+$/, '');
  return new Pool({
    connectionString: clean,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
}

async function ensureTablesExist(client) {
  // Ensure src_users table exists (minimal, in case DB is fresh)
  await client.query(`
    CREATE TABLE IF NOT EXISTS src_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255),
      role VARCHAR(30) DEFAULT 'user',
      avatar_url TEXT,
      phone VARCHAR(20),
      business_id INTEGER,
      store_id INTEGER,
      warehouse_id INTEGER,
      employee_code VARCHAR(30),
      is_banned BOOLEAN DEFAULT FALSE,
      google_id VARCHAR(200),
      auth_provider VARCHAR(20) DEFAULT 'local',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function seedAdmin(label, url) {
  const pool = buildPool(url);
  const client = await pool.connect();
  try {
    console.log(`\n🔄 Connecting to ${label}...`);

    await ensureTablesExist(client);

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const result = await client.query(
      `INSERT INTO src_users (name, email, password, role)
       VALUES ($1, $2, $3, 'super_admin')
       ON CONFLICT (email)
       DO UPDATE SET
         password  = EXCLUDED.password,
         role      = 'super_admin',
         is_banned = FALSE,
         name      = EXCLUDED.name
       RETURNING id, email, role`,
      [ADMIN_NAME, ADMIN_EMAIL, hash]
    );

    const row = result.rows[0];
    console.log(`✅ ${label} — Admin ready: ID=${row.id} | ${row.email} | role=${row.role}`);
  } catch (err) {
    console.error(`❌ ${label} — FAILED: ${err.message}`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   NOREN — Admin Seeder (All DBs)');
  console.log('═══════════════════════════════════════════════');
  console.log(`Email    : ${ADMIN_EMAIL}`);
  console.log(`Password : ${ADMIN_PASSWORD}`);
  console.log(`Role     : super_admin`);
  console.log('═══════════════════════════════════════════════');

  if (DB_URLS.length === 0) {
    console.error('❌ No DATABASE_URL_1/2/3 found in .env');
    process.exit(1);
  }

  // Run all 3 in parallel
  await Promise.allSettled(DB_URLS.map(({ label, url }) => seedAdmin(label, url)));

  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Done — Admin seeded on all available databases');
  console.log('═══════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

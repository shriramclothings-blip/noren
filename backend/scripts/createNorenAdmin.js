require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const ADMIN_EMAIL    = 'admin@norenfashion.in';
const ADMIN_PASSWORD = 'Noren@Admin2024';
const ADMIN_NAME     = 'NOREN Super Admin';

// Try DB2 first (DB1 has quota issues), then DB3
const DB_URLS = [
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
  process.env.DATABASE_URL_1,
].filter(Boolean);

function buildPool(url) {
  const clean = url
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/[?&]+$/, '');
  return new Pool({
    connectionString: clean,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 5000,
  });
}

async function createAdmin() {
  let lastErr = null;

  for (const url of DB_URLS) {
    const pool = buildPool(url);
    try {
      console.log('Connecting to DB...');
      const client = await pool.connect();

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
      client.release();
      await pool.end();

      console.log('\n===========================================');
      console.log('  NOREN ADMIN CREATED / UPDATED');
      console.log('===========================================');
      console.log('  Email    :', ADMIN_EMAIL);
      console.log('  Password :', ADMIN_PASSWORD);
      console.log('  Role     :', row.role);
      console.log('  User ID  :', row.id);
      console.log('===========================================\n');
      return;

    } catch (err) {
      lastErr = err;
      console.warn('DB attempt failed:', err.message.slice(0, 80));
      try { await pool.end(); } catch {}
    }
  }

  console.error('All DB connections failed. Last error:', lastErr?.message);
  process.exit(1);
}

createAdmin();

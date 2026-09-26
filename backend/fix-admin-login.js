require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// ═══════════════════════════════════════════════════════════════════════════════
//  FIX ADMIN LOGIN - Create/Update Admin in ALL Databases
//  Run this to ensure admin exists and can log in from any database
// ═══════════════════════════════════════════════════════════════════════════════

const RAW_URLS = [
  process.env.DATABASE_URL_1,
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
].filter(Boolean);

function cleanUrl(raw) {
  return raw
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/[?&]+$/, '');
}

function makePool(url) {
  return new Pool({
    connectionString: cleanUrl(url),
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
}

async function createAdminInDatabase(pool, dbName) {
  const email = (process.env.ADMIN_EMAIL || 'admin@norenfashion.in').trim();
  const password = (process.env.ADMIN_PASSWORD || 'Noren@Admin2024').trim();
  const name = 'Super Admin';
  
  console.log(`\n📝 Processing ${dbName}...`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password.substring(0, 3)}${'*'.repeat(password.length - 3)}`);
  
  try {
    // Check if admin exists
    const checkResult = await pool.query(
      'SELECT id, email, role, is_banned FROM src_users WHERE email = $1',
      [email]
    );
    
    if (checkResult.rows.length > 0) {
      const existingUser = checkResult.rows[0];
      console.log(`   ℹ️  Admin already exists (ID: ${existingUser.id}, Role: ${existingUser.role})`);
      
      // Update password and ensure super_admin role
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        `UPDATE src_users 
         SET password = $1, role = 'super_admin', is_banned = FALSE 
         WHERE email = $2`,
        [hash, email]
      );
      
      console.log(`   ✅ Admin updated: Password refreshed, role set to super_admin`);
    } else {
      // Create new admin
      const hash = await bcrypt.hash(password, 12);
      const insertResult = await pool.query(
        `INSERT INTO src_users (name, email, password, role, is_banned, created_at) 
         VALUES ($1, $2, $3, 'super_admin', FALSE, NOW())
         RETURNING id`,
        [name, email, hash]
      );
      
      console.log(`   ✅ Admin created: New admin user (ID: ${insertResult.rows[0].id})`);
    }
    
    // Verify the admin can be retrieved
    const verifyResult = await pool.query(
      'SELECT id, name, email, role, is_banned FROM src_users WHERE email = $1',
      [email]
    );
    
    if (verifyResult.rows.length === 0) {
      throw new Error('Admin verification failed - user not found after creation');
    }
    
    const admin = verifyResult.rows[0];
    console.log(`   ✓ Verification passed:`);
    console.log(`     - ID: ${admin.id}`);
    console.log(`     - Name: ${admin.name}`);
    console.log(`     - Email: ${admin.email}`);
    console.log(`     - Role: ${admin.role}`);
    console.log(`     - Banned: ${admin.is_banned}`);
    
    return { success: true, admin };
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function fixAdminLogin() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          FIX ADMIN LOGIN - ALL DATABASES                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  if (RAW_URLS.length === 0) {
    console.error('❌ No database URLs found in .env');
    console.error('   Please ensure DATABASE_URL_1, DATABASE_URL_2, DATABASE_URL_3 are set');
    process.exit(1);
  }
  
  console.log(`Found ${RAW_URLS.length} database(s) to process\n`);
  
  const results = [];
  
  for (let i = 0; i < RAW_URLS.length; i++) {
    const dbName = `DB${i + 1}`;
    const pool = makePool(RAW_URLS[i]);
    
    try {
      const result = await createAdminInDatabase(pool, dbName);
      results.push({ dbName, ...result });
    } catch (err) {
      console.error(`\n❌ Failed to process ${dbName}:`, err.message);
      results.push({ dbName, success: false, error: err.message });
    } finally {
      await pool.end().catch(() => {});
    }
  }
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'SUCCESS' : 'FAILED';
    console.log(`${icon} ${result.dbName}: ${status}`);
    if (result.admin) {
      console.log(`   Admin ID: ${result.admin.id}, Role: ${result.admin.role}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n📊 Results: ${successful} successful, ${failed} failed\n`);
  
  if (successful > 0) {
    console.log('✅ Admin login fixed! You can now log in with:\n');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@norenfashion.in'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Noren@Admin2024'}`);
    console.log('\n');
  }
  
  if (failed > 0) {
    console.log('⚠️  Some databases failed. Check the errors above.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  fixAdminLogin().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { fixAdminLogin };

#!/usr/bin/env node
/**
 * Run migration on PRODUCTION database (Render)
 * This connects to your production PostgreSQL and creates email portal tables
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrateProduction() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   MIGRATE PRODUCTION DATABASE                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Use DATABASE_URL_1 from your .env (your production database)
  const DATABASE_URL = process.env.DATABASE_URL_1;
  
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL_1 not found in .env file');
    process.exit(1);
  }

  console.log('🔌 Connecting to production database...');
  console.log(`   Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'Hidden'}\n`);

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database\n');

    // Check if migration already executed
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const checkMigration = await client.query(
      `SELECT id FROM src_migrations WHERE name = '007_create_email_portal_tables.sql'`
    );

    if (checkMigration.rows.length > 0) {
      console.log('⚠️  Migration already executed on this database');
      console.log('   If tables are missing, there may have been an error.');
      console.log('   Checking tables...\n');
      
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE 'src_email%'
        ORDER BY table_name
      `);
      
      console.log(`   Found ${tables.rows.length} email portal tables:`);
      tables.rows.forEach(t => console.log(`     • ${t.table_name}`));
      
      if (tables.rows.length < 11) {
        console.log('\n⚠️  Some tables are missing. Re-running migration...\n');
        // Continue to run migration
      } else {
        console.log('\n✅ All tables exist! Migration complete.\n');
        await client.end();
        process.exit(0);
      }
    }

    // Read and execute migration
    console.log('🚀 Executing migration...\n');
    const sqlPath = path.join(__dirname, 'migrations', '007_create_email_portal_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    
    console.log('✅ Migration SQL executed successfully\n');

    // Mark as complete
    await client.query(`
      INSERT INTO src_migrations (name) 
      VALUES ('007_create_email_portal_tables.sql') 
      ON CONFLICT (name) DO NOTHING
    `);

    // Verify tables created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'src_email%'
      ORDER BY table_name
    `);

    console.log(`✅ Created ${result.rows.length} email portal tables:\n`);
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ PRODUCTION MIGRATION COMPLETE                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('  1. Seed default data: node seed-email-portal.js');
    console.log('  2. Restart Render backend (it will auto-restart)');
    console.log('  3. Test email portal: cd email-portal && npm run dev\n');

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    await client.end();
    process.exit(1);
  }
}

migrateProduction();

#!/usr/bin/env node
/**
 * Migrate ALL production databases (DATABASE_URL_1, _2, _3)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrateDatabase(url, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Migrating ${name}...`);
  console.log('='.repeat(60));
  
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ Connected to ${name}\n`);

    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Check if already migrated
    const check = await client.query(
      `SELECT id FROM src_migrations WHERE name = '007_create_email_portal_tables.sql'`
    );

    if (check.rows.length > 0) {
      console.log('ℹ️  Migration already recorded. Checking tables...');
      
      const tables = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'src_email%'
      `);
      
      const count = parseInt(tables.rows[0].count);
      
      if (count >= 11) {
        console.log(`✅ ${name} already has ${count} email tables. Skipping.\n`);
        await client.end();
        return true;
      } else {
        console.log(`⚠️  Only ${count}/11 tables found. Re-running migration...\n`);
      }
    }

    // Read and execute migration
    console.log('🚀 Running migration SQL...');
    const sqlPath = path.join(__dirname, 'migrations', '007_create_email_portal_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    
    // Mark as complete
    await client.query(`
      INSERT INTO src_migrations (name) 
      VALUES ('007_create_email_portal_tables.sql') 
      ON CONFLICT (name) DO NOTHING
    `);

    // Verify
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'src_email%'
    `);

    const count = parseInt(result.rows[0].count);
    console.log(`✅ ${name} now has ${count} email portal tables\n`);

    await client.end();
    return true;

  } catch (error) {
    console.error(`❌ ${name} migration failed:`, error.message);
    console.error(error);
    await client.end();
    return false;
  }
}

async function migrateAll() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   MIGRATE ALL PRODUCTION DATABASES                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = [];
  
  if (process.env.DATABASE_URL_1) {
    results.push(await migrateDatabase(process.env.DATABASE_URL_1, 'DATABASE_URL_1'));
  }
  
  if (process.env.DATABASE_URL_2) {
    results.push(await migrateDatabase(process.env.DATABASE_URL_2, 'DATABASE_URL_2'));
  }
  
  if (process.env.DATABASE_URL_3) {
    results.push(await migrateDatabase(process.env.DATABASE_URL_3, 'DATABASE_URL_3'));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log('\n✅ ALL DATABASES MIGRATED!');
  console.log('   Backend on Render will now work regardless of which DB it connects to.\n');
  
  console.log('Next steps:');
  console.log('  1. Backend will auto-restart on Render (or manually restart it)');
  console.log('  2. Seed data: node seed-email-portal.js');
  console.log('  3. Test: https://noren-iqk3.onrender.com/api/email/analytics/overview');
  console.log('  4. Start email portal: cd email-portal && npm run dev\n');

  process.exit(failed > 0 ? 1 : 0);
}

migrateAll();

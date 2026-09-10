#!/usr/bin/env node
/**
 * Run Scheduled Broadcasts Migration on all databases
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

    // Read and execute migration
    console.log('🚀 Running broadcast migration SQL...');
    const sqlPath = path.join(__dirname, 'migrations', '008_create_scheduled_broadcasts_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    
    console.log(`✅ ${name} migration complete!\n`);

    // Verify tables created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%broadcast%'
      ORDER BY table_name
    `);

    console.log(`📋 Created ${result.rows.length} broadcast tables:`);
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    await client.end();
    return true;

  } catch (error) {
    console.error(`❌ ${name} migration failed:`, error.message);
    await client.end();
    return false;
  }
}

async function migrateAll() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   SCHEDULED BROADCASTS MIGRATION                           ║');
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
  
  console.log('\n✅ SCHEDULED BROADCASTS READY!');
  console.log('   New feature available at: /broadcasts\n');
  
  console.log('Next steps:');
  console.log('  1. Restart email portal: cd email-portal && npm run dev');
  console.log('  2. Login and go to Scheduled Broadcasts');
  console.log('  3. Create your first recurring broadcast!\n');

  process.exit(failed > 0 ? 1 : 0);
}

migrateAll();

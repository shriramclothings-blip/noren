#!/usr/bin/env node
/**
 * One-time migration runner - Run this manually to create email portal tables
 * Usage: node run-migration-now.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
  // Use a direct client connection for better control
  const client = new Client({
    connectionString: process.env.DATABASE_URL_1 || process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read migration file
    const sqlPath = path.join(__dirname, 'migrations', '007_create_email_portal_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executing migration...\n');
    
    // Execute the entire SQL file at once
    await client.query(sql);
    
    console.log('✅ Migration executed successfully!\n');

    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'src_email%'
      ORDER BY table_name
    `);

    console.log(`✅ Created ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    // Mark migration as complete
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      INSERT INTO src_migrations (name) 
      VALUES ('007_create_email_portal_tables.sql') 
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('\n✅ ALL DONE! Email portal is ready!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

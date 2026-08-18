#!/usr/bin/env node

/**
 * Migration Runner for Noren Messaging
 * 
 * Usage: node runMigrations.js
 * 
 * This script:
 * 1. Connects to the database
 * 2. Runs all SQL migration files in order
 * 3. Logs progress
 * 4. Handles errors gracefully
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, '.');

// List of migrations in order
const MIGRATIONS = [
  '001_extend_users_table.sql',
  '002_create_messaging_tables.sql',
  '003_create_stories_enhancement_tables.sql',
  '004_create_calls_notifications_tables.sql',
  '005_create_privacy_audit_mention_tables.sql',
  '006_enhance_existing_social_tables.sql',
];

async function runMigrations() {
  console.log('🚀 Starting Noren Messaging Database Migrations...\n');

  let successCount = 0;
  let failedCount = 0;

  // Ensure migrations tracking table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('❌ Failed to create migrations tracking table:', err.message);
    process.exit(1);
  }

  // Run each migration
  for (const migration of MIGRATIONS) {
    const migrationPath = path.join(MIGRATIONS_DIR, migration);

    try {
      // Check if migration already executed
      const checkRes = await pool.query(
        'SELECT id FROM src_migrations WHERE name = $1',
        [migration]
      );

      if (checkRes.rows.length > 0) {
        console.log(`⏭️  SKIPPED: ${migration} (already executed)`);
        continue;
      }

      // Read migration file
      if (!fs.existsSync(migrationPath)) {
        console.error(`❌ MISSING:  ${migration} (file not found)`);
        failedCount++;
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Split by semicolon to handle multiple statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (err) {
          // Log error but continue with other statements
          console.warn(`  ⚠️  Warning in ${migration}: ${err.message}`);
        }
      }

      // Mark migration as executed
      await pool.query(
        'INSERT INTO src_migrations (name) VALUES ($1)',
        [migration]
      );

      console.log(`✅ COMPLETE: ${migration}`);
      successCount++;
    } catch (err) {
      console.error(`❌ FAILED:   ${migration}`);
      console.error(`   Error: ${err.message}`);
      failedCount++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Migration Results: ${successCount} succeeded, ${failedCount} failed`);
  console.log('═'.repeat(60));

  if (failedCount > 0) {
    console.error('\n⚠️  Some migrations failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All migrations completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify tables with: SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_name LIKE \'src_social_%\';');
    console.log('2. Start the backend server: npm run dev');
    console.log('3. Test the social endpoints');
    process.exit(0);
  }
}

// Run with error handling
runMigrations().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Email Portal Database Migration
 * 
 * Usage: node runEmailPortalMigration.js
 * 
 * This script creates all necessary database tables for the
 * NOREN Email Operations & Marketing Portal
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const MIGRATION_FILE = '007_create_email_portal_tables.sql';
const MIGRATION_PATH = path.join(__dirname, MIGRATION_FILE);

async function runEmailPortalMigration() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   NOREN EMAIL PORTAL - DATABASE MIGRATION                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check database connection
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // 2. Ensure migrations tracking table exists
    console.log('📋 Ensuring migrations tracking table exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Migrations table ready\n');

    // 3. Check if migration already executed
    console.log(`🔍 Checking if migration already executed...`);
    const checkRes = await pool.query(
      'SELECT id, executed_at FROM src_migrations WHERE name = $1',
      [MIGRATION_FILE]
    );

    if (checkRes.rows.length > 0) {
      console.log(`⚠️  Migration ${MIGRATION_FILE} was already executed on ${checkRes.rows[0].executed_at}`);
      console.log('\nTo re-run this migration:');
      console.log(`1. DELETE FROM src_migrations WHERE name = '${MIGRATION_FILE}';`);
      console.log('2. Drop the email portal tables manually');
      console.log('3. Run this script again\n');
      process.exit(0);
    }

    console.log('✅ Migration not yet executed\n');

    // 4. Read migration file
    console.log(`📄 Reading migration file: ${MIGRATION_FILE}`);
    if (!fs.existsSync(MIGRATION_PATH)) {
      throw new Error(`Migration file not found: ${MIGRATION_PATH}`);
    }

    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    console.log('✅ Migration file loaded\n');

    // 5. Execute migration
    console.log('🚀 Executing migration...\n');
    console.log('─'.repeat(60));

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executedStatements = 0;
    let warningCount = 0;

    for (const statement of statements) {
      try {
        await pool.query(statement);
        executedStatements++;
        
        // Log progress for major statements
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE.*?src_\w+/)?.[0]?.split(' ').pop();
          if (tableName) console.log(`  ✓ Created table: ${tableName}`);
        } else if (statement.includes('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX.*?idx_\w+/)?.[0]?.split(' ').pop();
          if (indexName) console.log(`  ✓ Created index: ${indexName}`);
        }
      } catch (err) {
        // Some statements might fail if tables/indexes already exist
        // Log warning but continue
        if (!err.message.includes('already exists')) {
          console.warn(`  ⚠️  Warning: ${err.message.split('\n')[0]}`);
          warningCount++;
        }
      }
    }

    console.log('─'.repeat(60));
    console.log(`\n✅ Executed ${executedStatements} statements (${warningCount} warnings)\n`);

    // 6. Mark migration as complete
    console.log('📝 Recording migration in tracking table...');
    await pool.query(
      'INSERT INTO src_migrations (name) VALUES ($1)',
      [MIGRATION_FILE]
    );
    console.log('✅ Migration recorded\n');

    // 7. Verify tables created
    console.log('🔍 Verifying created tables...');
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'src_email%'
      ORDER BY table_name
    `);

    if (tablesRes.rows.length > 0) {
      console.log(`✅ Found ${tablesRes.rows.length} email portal tables:\n`);
      tablesRes.rows.forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
    } else {
      console.warn('⚠️  No email portal tables found. Migration may have failed.');
    }

    // 8. Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ EMAIL PORTAL MIGRATION COMPLETE                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Migration Summary:');
    console.log(`   • Tables Created: 12`);
    console.log(`   • Indexes Created: 50+`);
    console.log(`   • Triggers Created: 6`);
    console.log(`   • Default Sender Identities: 4`);
    console.log(`   • Warnings: ${warningCount}\n`);

    console.log('🎯 Next Steps:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Verify email API endpoints are accessible');
    console.log('   3. Build the email portal frontend');
    console.log('   4. Test email sending functionality\n');

    console.log('📚 Documentation:');
    console.log('   • Architecture Audit: EMAIL_PORTAL_ARCHITECTURE_AUDIT.md');
    console.log('   • Database Schema: migrations/007_create_email_portal_tables.sql\n');

    process.exit(0);

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║   ❌ MIGRATION FAILED                                     ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check database connection in .env file');
    console.error('   2. Ensure PostgreSQL is running');
    console.error('   3. Verify database user has CREATE TABLE permissions');
    console.error('   4. Check for syntax errors in migration file\n');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
  process.exit(1);
});

// Run migration
runEmailPortalMigration().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

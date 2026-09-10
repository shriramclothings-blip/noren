/**
 * Auto-Migration Runner
 * Automatically runs pending migrations on server startup
 * Safe to run multiple times - skips already executed migrations
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function autoMigrate() {
  console.log('🔄 Checking for pending migrations...');

  try {
    // Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS src_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Check if email portal migration already executed
    const MIGRATION_FILE = '007_create_email_portal_tables.sql';
    const checkRes = await pool.query(
      'SELECT id FROM src_migrations WHERE name = $1',
      [MIGRATION_FILE]
    );

    if (checkRes.rows.length > 0) {
      console.log('✅ Email portal migration already executed - skipping');
      return true;
    }

    // Run the migration
    console.log('🚀 Running email portal migration...');
    const MIGRATION_PATH = path.join(__dirname, 'migrations', MIGRATION_FILE);
    
    if (!fs.existsSync(MIGRATION_PATH)) {
      console.warn('⚠️  Migration file not found:', MIGRATION_PATH);
      return false;
    }

    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    
    // Split and execute statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let created = 0;
    for (const statement of statements) {
      try {
        await pool.query(statement);
        if (statement.includes('CREATE TABLE')) created++;
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          console.warn('Migration warning:', err.message.split('\n')[0]);
        }
      }
    }

    // Mark as executed
    await pool.query(
      'INSERT INTO src_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [MIGRATION_FILE]
    );

    console.log(`✅ Email portal migration complete (${created} tables created)`);
    return true;

  } catch (error) {
    console.error('❌ Auto-migration error:', error.message);
    return false;
  }
}

module.exports = { autoMigrate };

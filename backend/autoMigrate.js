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
    
    // Execute entire SQL file at once to preserve complex statements
    // This is safer than splitting as it respects triggers, functions, etc.
    try {
      await pool.query(sql);
      console.log('✅ Email portal migration executed successfully');
    } catch (err) {
      // If batch execution fails, try individual statements (fallback)
      console.log('⚠️  Batch execution failed, trying statement-by-statement...');
      
      // Better splitting that respects $$ delimiters and function bodies
      const statements = [];
      let current = '';
      let inDollarQuote = false;
      let dollarTag = '';
      
      for (const line of sql.split('\n')) {
        const trimmed = line.trim();
        
        // Skip comments
        if (trimmed.startsWith('--') || trimmed.length === 0) {
          continue;
        }
        
        // Track $$ or $tag$ delimiters for functions/triggers
        const dollarMatches = line.match(/\$(\w*)\$/g);
        if (dollarMatches) {
          for (const match of dollarMatches) {
            if (!inDollarQuote) {
              inDollarQuote = true;
              dollarTag = match;
            } else if (match === dollarTag) {
              inDollarQuote = false;
              dollarTag = '';
            }
          }
        }
        
        current += line + '\n';
        
        // Only split on ; if not inside a dollar-quoted block
        if (!inDollarQuote && trimmed.endsWith(';')) {
          if (current.trim().length > 0) {
            statements.push(current.trim());
          }
          current = '';
        }
      }
      
      // Add any remaining statement
      if (current.trim().length > 0) {
        statements.push(current.trim());
      }

      let created = 0;
      for (const statement of statements) {
        if (statement.startsWith('--') || statement.length < 5) continue;
        
        try {
          await pool.query(statement);
          if (statement.toUpperCase().includes('CREATE TABLE')) created++;
        } catch (err) {
          // Only log unexpected errors
          const msg = err.message;
          if (!msg.includes('already exists') && !msg.includes('does not exist')) {
            console.warn('Migration warning:', msg.split('\n')[0]);
          }
        }
      }
      
      console.log(`✅ Migration completed (${created} tables created)`);
    }

    // Mark as executed
    await pool.query(
      'INSERT INTO src_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [MIGRATION_FILE]
    );

    console.log('✅ Email portal migration recorded');
    return true;

  } catch (error) {
    console.error('❌ Auto-migration error:', error.message);
    return false;
  }
}

module.exports = { autoMigrate };

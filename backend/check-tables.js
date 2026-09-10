require('dotenv').config();
const { pool } = require('./config/db');

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'src_email%'
      ORDER BY table_name
    `);
    
    console.log(`\n✅ Found ${result.rows.length} email portal tables:\n`);
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    
    if (result.rows.length === 12) {
      console.log('\n✅ ALL TABLES CREATED SUCCESSFULLY!\n');
    } else {
      console.log(`\n⚠️  Expected 12 tables, found ${result.rows.length}\n`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();

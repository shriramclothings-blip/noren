#!/usr/bin/env node
/**
 * Check which database has email portal tables
 */

require('dotenv').config();
const { Client } = require('pg');

async function checkDatabase(url, name) {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'src_email%'
    `);
    
    const count = parseInt(result.rows[0].count);
    console.log(`${name}: ${count} email portal tables`);
    
    if (count > 0) {
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE 'src_email%'
        ORDER BY table_name
      `);
      tables.rows.forEach(t => console.log(`     • ${t.table_name}`));
    }
    
    await client.end();
    return count;
  } catch (error) {
    console.log(`${name}: ERROR - ${error.message}`);
    return 0;
  }
}

async function checkAll() {
  console.log('🔍 Checking all databases for email portal tables...\n');
  
  const db1 = await checkDatabase(process.env.DATABASE_URL_1, 'DATABASE_URL_1');
  console.log('');
  const db2 = await checkDatabase(process.env.DATABASE_URL_2, 'DATABASE_URL_2');
  console.log('');
  const db3 = await checkDatabase(process.env.DATABASE_URL_3, 'DATABASE_URL_3');
  
  console.log('\n' + '='.repeat(60));
  if (db1 >= 11) console.log('✅ DATABASE_URL_1 is ready');
  else console.log('❌ DATABASE_URL_1 needs migration');
  
  if (db2 >= 11) console.log('✅ DATABASE_URL_2 is ready');
  else console.log('❌ DATABASE_URL_2 needs migration');
  
  if (db3 >= 11) console.log('✅ DATABASE_URL_3 is ready');
  else console.log('❌ DATABASE_URL_3 needs migration');
  
  console.log('');
  process.exit(0);
}

checkAll();

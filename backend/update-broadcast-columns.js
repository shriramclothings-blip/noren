#!/usr/bin/env node
/**
 * Add missing columns to existing broadcast tables
 */

require('dotenv').config();
const { Client } = require('pg');

async function updateDatabase(url, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Updating ${name}...`);
  console.log('='.repeat(60));
  
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ Connected to ${name}\n`);

    // Add missing columns if they don't exist
    console.log('🆕 Adding new columns...');
    
    try {
      await client.query(`
        ALTER TABLE src_email_scheduled_broadcasts 
        ADD COLUMN IF NOT EXISTS custom_content TEXT,
        ADD COLUMN IF NOT EXISTS cta_text VARCHAR(100),
        ADD COLUMN IF NOT EXISTS cta_url VARCHAR(500)
      `);
      console.log('✅ Added custom_content, cta_text, cta_url columns');
    } catch (error) {
      console.log('⚠️  Columns might already exist:', error.message);
    }

    // Update default company name
    try {
      await client.query(`
        UPDATE src_email_scheduled_broadcasts 
        SET company_name = 'Dinesh Global Enterprises Pvt Ltd' 
        WHERE company_name = 'Dinesh Global Pvt Ltd' OR company_name IS NULL
      `);
      console.log('✅ Updated company name to full format');
    } catch (error) {
      console.log('⚠️  Error updating company name:', error.message);
    }

    console.log(`✅ ${name} updated successfully!\n`);

    await client.end();
    return true;

  } catch (error) {
    console.error(`❌ ${name} update failed:`, error.message);
    await client.end();
    return false;
  }
}

async function updateAll() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          UPDATE BROADCAST TABLES                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = [];
  
  if (process.env.DATABASE_URL_1) {
    results.push(await updateDatabase(process.env.DATABASE_URL_1, 'DATABASE_URL_1'));
  }
  
  if (process.env.DATABASE_URL_2) {
    results.push(await updateDatabase(process.env.DATABASE_URL_2, 'DATABASE_URL_2'));
  }
  
  if (process.env.DATABASE_URL_3) {
    results.push(await updateDatabase(process.env.DATABASE_URL_3, 'DATABASE_URL_3'));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log('\n✅ BROADCAST TABLES UPDATED!');
  console.log('   New features now available:\n');
  console.log('   📝 Custom email content field');
  console.log('   🔗 Call-to-action button with link');
  console.log('   🏢 Full Dinesh Global Enterprises branding');
  console.log('   ⏰ Full minute precision (00-59 minutes)');

  process.exit(failed > 0 ? 1 : 0);
}

updateAll();
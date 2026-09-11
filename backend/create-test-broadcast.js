#!/usr/bin/env node
/**
 * Create Test Broadcast for immediate testing
 */

require('dotenv').config();
const { pool } = require('./config/db');

async function createTestBroadcast() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              CREATE TEST BROADCAST                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Create a broadcast that will trigger in 2 minutes
    const now = new Date();
    const nextRun = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now

    const result = await pool.query(`
      INSERT INTO src_email_scheduled_broadcasts (
        name, description, subject, company_name,
        frequency, send_time, audience_type, custom_recipient_list,
        is_active, next_run_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      'Test Broadcast - Immediate',
      'Quick test broadcast to verify scheduler is working',
      '🧪 Test Email from Dinesh Global Pvt Ltd',
      'Dinesh Global Pvt Ltd',
      'one_time',
      '09:00',
      'custom_list',
      'your-email@example.com', // Change this to your real email
      true,
      nextRun,
      1
    ]);

    const broadcast = result.rows[0];

    console.log('✅ Test broadcast created successfully!');
    console.log(`📧 Broadcast ID: ${broadcast.id}`);
    console.log(`📅 Name: ${broadcast.name}`);
    console.log(`⏰ Will send at: ${nextRun.toISOString()}`);
    console.log(`📬 Recipients: ${broadcast.custom_recipient_list}`);

    console.log('\n💡 Next steps:');
    console.log('   1. Make sure backend is running with scheduler');
    console.log('   2. Check console logs in 2 minutes for execution');
    console.log('   3. Check your email inbox');
    console.log('   4. Or run: node test-broadcast-scheduler.js (immediate)');

  } catch (error) {
    console.error('❌ Error creating test broadcast:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createTestBroadcast();
#!/usr/bin/env node
/**
 * Test Broadcast Scheduler - Force execute broadcasts for testing
 */

require('dotenv').config();
const { pool } = require('./config/db');
const broadcastScheduler = require('./services/broadcastScheduler');

async function testBroadcasts() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  TEST BROADCAST SCHEDULER                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Get all active broadcasts
    const result = await pool.query(`
      SELECT * FROM src_email_scheduled_broadcasts
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No active broadcasts found');
      console.log('\n💡 To test:');
      console.log('   1. Go to http://localhost:5177/broadcasts');
      console.log('   2. Create a broadcast');
      console.log('   3. Run this script again');
      process.exit(1);
    }

    console.log(`📬 Found ${result.rows.length} active broadcast(s):`);
    result.rows.forEach((broadcast, i) => {
      console.log(`   ${i + 1}. "${broadcast.name}" - ${broadcast.frequency} at ${broadcast.send_time}`);
      console.log(`      Next run: ${broadcast.next_run_at}`);
      console.log(`      Audience: ${broadcast.audience_type}`);
    });

    console.log('\n🚀 Force executing all broadcasts...');

    for (const broadcast of result.rows) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📤 EXECUTING: "${broadcast.name}"`);
      console.log('='.repeat(60));

      await broadcastScheduler.executeBroadcast(broadcast);
    }

    console.log('\n✅ All broadcasts executed!');
    console.log('\n💡 Check your email inbox for the broadcasts.');

  } catch (error) {
    console.error('❌ Error testing broadcasts:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the test
testBroadcasts();
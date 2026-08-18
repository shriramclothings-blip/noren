#!/usr/bin/env node

/**
 * Migration Verification Test
 * 
 * Verifies that all required tables and columns exist
 * after running migrations
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function verifyMigrations() {
  console.log('🔍 Verifying Noren Messaging Database Schema...\n');

  let passed = 0;
  let failed = 0;

  const check = async (condition, testName) => {
    if (condition) {
      console.log(`  ✅ ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ ${testName}`);
      failed++;
    }
  };

  try {
    // 1. Check User Extensions
    console.log('Checking User Table Extensions...');
    const userCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'src_users'
    `);
    const userColNames = userCols.rows.map(r => r.column_name);
    await check(userColNames.includes('username'), 'Column: src_users.username');
    await check(userColNames.includes('bio'), 'Column: src_users.bio');
    await check(userColNames.includes('is_verified'), 'Column: src_users.is_verified');
    await check(userColNames.includes('followers_count'), 'Column: src_users.followers_count');
    await check(userColNames.includes('profile_pic_url'), 'Column: src_users.profile_pic_url');
    await check(userColNames.includes('is_private'), 'Column: src_users.is_private');

    // 2. Check Messaging Tables
    console.log('\nChecking Messaging Tables...');
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'src_social_%'
    `);
    const tableNames = tables.rows.map(r => r.table_name);
    
    await check(tableNames.includes('src_social_conversations'), 'Table: src_social_conversations');
    await check(tableNames.includes('src_social_conversation_members'), 'Table: src_social_conversation_members');
    await check(tableNames.includes('src_social_messages'), 'Table: src_social_messages');
    await check(tableNames.includes('src_social_message_reactions'), 'Table: src_social_message_reactions');

    // 3. Check Story Enhancement Tables
    console.log('\nChecking Story Enhancement Tables...');
    await check(tableNames.includes('src_social_story_reactions'), 'Table: src_social_story_reactions');
    await check(tableNames.includes('src_social_story_replies'), 'Table: src_social_story_replies');
    await check(tableNames.includes('src_social_story_viewers'), 'Table: src_social_story_viewers');

    // 4. Check Call & Notification Tables
    console.log('\nChecking Call & Notification Tables...');
    await check(tableNames.includes('src_social_calls'), 'Table: src_social_calls');
    await check(tableNames.includes('src_social_call_participants'), 'Table: src_social_call_participants');
    await check(tableNames.includes('src_social_notifications'), 'Table: src_social_notifications');

    // 5. Check Privacy & Audit Tables
    console.log('\nChecking Privacy & Audit Tables...');
    await check(tableNames.includes('src_social_restrictions'), 'Table: src_social_restrictions');
    await check(tableNames.includes('src_social_mentions'), 'Table: src_social_mentions');
    await check(tableNames.includes('src_social_audit_logs'), 'Table: src_social_audit_logs');
    await check(tableNames.includes('src_social_hashtag_followers'), 'Table: src_social_hashtag_followers');

    // 6. Check Enhanced Existing Tables
    console.log('\nChecking Enhanced Existing Tables...');
    await check(tableNames.includes('src_social_posts'), 'Table: src_social_posts');
    await check(tableNames.includes('src_social_comments'), 'Table: src_social_comments');
    await check(tableNames.includes('src_social_reels'), 'Table: src_social_reels');
    await check(tableNames.includes('src_social_follows'), 'Table: src_social_follows');
    await check(tableNames.includes('src_social_privacy_settings'), 'Table: src_social_privacy_settings');
    await check(tableNames.includes('src_social_feature_flags'), 'Table: src_social_feature_flags');

    // 7. Check Post Columns
    console.log('\nChecking Post Table Columns...');
    const postCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'src_social_posts'
    `);
    const postColNames = postCols.rows.map(r => r.column_name);
    await check(postColNames.includes('alt_text'), 'Column: src_social_posts.alt_text');
    await check(postColNames.includes('is_comments_disabled'), 'Column: src_social_posts.is_comments_disabled');
    await check(postColNames.includes('privacy'), 'Column: src_social_posts.privacy');
    await check(postColNames.includes('shares_count'), 'Column: src_social_posts.shares_count');
    await check(postColNames.includes('reposts_count'), 'Column: src_social_posts.reposts_count');

    // 8. Check Message Columns
    console.log('\nChecking Message Table Columns...');
    const msgCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'src_social_messages'
    `);
    const msgColNames = msgCols.rows.map(r => r.column_name);
    await check(msgColNames.includes('delivery_status'), 'Column: src_social_messages.delivery_status');
    await check(msgColNames.includes('client_id'), 'Column: src_social_messages.client_id');
    await check(msgColNames.includes('message_type'), 'Column: src_social_messages.message_type');

    // 9. Check Indexes
    console.log('\nChecking Critical Indexes...');
    const indexes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename LIKE 'src_social_%'
    `);
    const indexNames = indexes.rows.map(r => r.indexname);
    await check(indexNames.length > 20, `Created indexes: ${indexNames.length} indexes exist`);

    // 10. Check Feature Flags Seeding
    console.log('\nChecking Feature Flags...');
    const flags = await pool.query('SELECT COUNT(*) as count FROM src_social_feature_flags');
    const flagCount = parseInt(flags.rows[0].count);
    await check(flagCount >= 10, `Feature flags seeded: ${flagCount} flags exist`);

    // 11. Check Migrations Tracking
    console.log('\nChecking Migration Tracking...');
    const migrations = await pool.query('SELECT COUNT(*) as count FROM src_migrations');
    const migCount = parseInt(migrations.rows[0].count);
    await check(migCount > 0, `Migration tracking: ${migCount} migrations recorded`);

    console.log('\n' + '═'.repeat(60));
    console.log(`📊 Verification Results: ${passed} passed, ${failed} failed`);
    console.log('═'.repeat(60));

    if (failed > 0) {
      console.error('\n❌ Some checks failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ All database checks passed!');
      console.log('\nYou can now:');
      console.log('1. Start the server: npm run dev');
      console.log('2. Test social endpoints');
      console.log('3. Begin PHASE 4: Backend API Implementation');
      process.exit(0);
    }
  } catch (err) {
    console.error('\n❌ Verification error:', err.message);
    process.exit(1);
  }
}

verifyMigrations();

require('dotenv').config();
const { pool } = require('../config/db');

async function testSocialPlatform() {
  console.log('🧪 Starting Noren Messaging Automated Integration & Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    // 1. Verify Database Schema Extensions
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'src_social_%'
    `);
    const tableNames = tablesRes.rows.map(r => r.table_name);
    assert(tableNames.includes('src_social_posts'), 'Table src_social_posts exists');
    assert(tableNames.includes('src_social_reels'), 'Table src_social_reels exists');
    assert(tableNames.includes('src_social_stories'), 'Table src_social_stories exists');
    assert(tableNames.includes('src_social_follows'), 'Table src_social_follows exists');
    assert(tableNames.includes('src_social_comments'), 'Table src_social_comments exists');
    assert(tableNames.includes('src_social_likes'), 'Table src_social_likes exists');
    assert(tableNames.includes('src_social_reports'), 'Table src_social_reports exists');
    assert(tableNames.includes('src_social_privacy_settings'), 'Table src_social_privacy_settings exists');
    assert(tableNames.includes('src_social_feature_flags'), 'Table src_social_feature_flags exists');

    // 2. Verify User Schema Extensions
    const colsRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'src_users'
    `);
    const cols = colsRes.rows.map(r => r.column_name);
    assert(cols.includes('username'), 'Column src_users.username exists');
    assert(cols.includes('bio'), 'Column src_users.bio exists');
    assert(cols.includes('is_verified'), 'Column src_users.is_verified exists');
    assert(cols.includes('followers_count'), 'Column src_users.followers_count exists');

    // 3. Test Feature Flags Data
    const flagsRes = await pool.query('SELECT key, enabled FROM src_social_feature_flags');
    assert(flagsRes.rows.length >= 7, 'Platform Feature Flags correctly seeded (7+ flags)');

    // 4. Test User Social Query
    const userRes = await pool.query('SELECT id, name, username, followers_count FROM src_users LIMIT 1');
    assert(userRes.rows.length > 0, 'Can query user social profiles from existing user base');

    console.log(`\n========================================`);
    console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err.message);
    process.exit(1);
  }
}

testSocialPlatform();

const { pool } = require('../config/db');

async function migrateUserCodes() {
  try {
    console.log('🔄 Running 6-Digit Unique User Code Migration...');

    // 1. Add user_code column if not exists
    await pool.query(`
      ALTER TABLE src_users 
      ADD COLUMN IF NOT EXISTS user_code VARCHAR(10) UNIQUE;
    `);

    // 2. Populate 6-digit user codes for any users who don't have one
    const usersRes = await pool.query(`SELECT id FROM src_users WHERE user_code IS NULL`);
    console.log(`Found ${usersRes.rows.length} users needing 6-digit user codes.`);

    for (const u of usersRes.rows) {
      // Deterministic or padded 6-digit code e.g. 100000 + id or random 6-digit
      let code = (100000 + parseInt(u.id)).toString();
      if (code.length > 6) {
        code = code.slice(-6);
      }
      
      // Ensure uniqueness
      let attempts = 0;
      let isUnique = false;
      while (!isUnique && attempts < 10) {
        const check = await pool.query('SELECT id FROM src_users WHERE user_code = $1 AND id != $2', [code, u.id]);
        if (check.rows.length === 0) {
          isUnique = true;
        } else {
          code = Math.floor(100000 + Math.random() * 900000).toString();
        }
        attempts++;
      }

      await pool.query('UPDATE src_users SET user_code = $1 WHERE id = $2', [code, u.id]);
    }

    // 3. Create index for fast user code lookups
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_src_users_user_code ON src_users(user_code);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_src_users_username ON src_users(username);`);

    console.log('✅ 6-Digit Unique User Code Migration Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrateUserCodes();

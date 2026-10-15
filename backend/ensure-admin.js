/**
 * Ensure Admin User Exists
 * Creates or updates super admin account
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./config/db');

async function ensureAdmin() {
  try {
    console.log('🔧 Initializing database connection...');
    await initDB();
    
    const email = process.env.ADMIN_EMAIL || 'admin@norenfashion.in';
    const password = process.env.ADMIN_PASSWORD || 'Noren@Admin2024';
    const name = 'Super Admin';
    
    console.log(`\n📝 Admin Configuration:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    
    console.log(`\n🔐 Hashing password...`);
    const hash = await bcrypt.hash(password, 12);
    
    console.log(`\n💾 Creating/updating admin user...`);
    const result = await pool.query(
      `INSERT INTO src_users (name, email, password, role, email_verified)
       VALUES ($1, $2, $3, 'super_admin', true)
       ON CONFLICT (email) 
       DO UPDATE SET 
         password = $3,
         role = 'super_admin',
         email_verified = true,
         updated_at = NOW()
       RETURNING id, name, email, role`,
      [name, email, hash]
    );
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log(`\n✅ Admin user ready!`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      
      console.log(`\n🔑 Login Credentials:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`\n✅ You can now login to:`);
      console.log(`   - Admin Dashboard: https://www.norenfastion.shop/admin`);
      console.log(`   - POS Backend API: https://noren-iqk3.onrender.com/api`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

ensureAdmin();

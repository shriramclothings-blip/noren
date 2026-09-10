#!/usr/bin/env node
/**
 * Check if admin user exists for email portal login
 */

require('dotenv').config();
const { pool } = require('./config/db');
const bcrypt = require('bcrypt');

async function checkOrCreateAdmin() {
  console.log('🔍 Checking admin user for email portal...\n');

  try {
    // Check existing admin users
    const result = await pool.query(`
      SELECT id, name, email, role 
      FROM src_users 
      WHERE role IN ('admin', 'super_admin', 'business_owner')
      ORDER BY id
      LIMIT 5
    `);

    if (result.rows.length > 0) {
      console.log('✅ Found admin users:\n');
      result.rows.forEach(user => {
        console.log(`   • ID: ${user.id} | ${user.email} | ${user.name} | Role: ${user.role}`);
      });
      
      console.log('\n📋 Login Credentials:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Password: Check your ADMIN_PASSWORD in .env file`);
      console.log(`   (Default: ${process.env.ADMIN_PASSWORD || 'Not set'})`);
      
    } else {
      console.log('⚠️  No admin users found. Creating one...\n');
      
      // Create admin user
      const email = process.env.ADMIN_EMAIL || 'admin@norenfashion.in';
      const password = process.env.ADMIN_PASSWORD || 'Noren@Admin2024';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await pool.query(`
        INSERT INTO src_users (name, email, password, role, is_verified, created_at)
        VALUES ($1, $2, $3, 'admin', true, NOW())
        RETURNING id, name, email, role
      `, ['NOREN Admin', email, hashedPassword]);
      
      console.log('✅ Admin user created:\n');
      console.log(`   • ID: ${newUser.rows[0].id}`);
      console.log(`   • Email: ${newUser.rows[0].email}`);
      console.log(`   • Password: ${password}`);
      console.log(`   • Role: ${newUser.rows[0].role}`);
    }

    console.log('\n🌐 Email Portal Login:');
    console.log('   URL: http://localhost:5177/login');
    console.log('   Email: admin@norenfashion.in (or ADMIN_EMAIL from .env)');
    console.log('   Password: Your ADMIN_PASSWORD from .env\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkOrCreateAdmin();

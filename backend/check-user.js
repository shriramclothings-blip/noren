require('dotenv').config();
const { pool } = require('./config/db');

pool.query("SELECT id, name, email, role FROM src_users WHERE role IN ('admin', 'super_admin') LIMIT 5")
  .then(r => {
    console.log('\n✅ Admin users found:', r.rows.length);
    r.rows.forEach(u => console.log(`   • ${u.email} (${u.role})`));
    console.log('\nLogin at http://localhost:5177/login with above email\n');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });

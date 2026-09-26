require('dotenv').config();
const { pool } = require('./config/db');

async function checkProducts() {
  try {
    const result = await pool.query(`
      SELECT p.title, c.name as category 
      FROM src_products p 
      LEFT JOIN src_categories c ON p.category_id = c.id 
      WHERE p.deleted_at IS NULL AND p.status = 'approved' 
      ORDER BY p.title 
      LIMIT 20
    `);
    
    console.log(`Available Products (${result.rows.length} shown):`);
    result.rows.forEach(p => {
      console.log(`- "${p.title}" (${p.category || 'No category'})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkProducts();
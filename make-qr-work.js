/**
 * Make QR Code Work - Insert Test Invoice
 * This script inserts the test invoice directly into the database
 * so your QR code will work immediately
 */

const { Pool } = require('pg');
const fs = require('fs');

// Database connection (using same config as backend)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_1 || 'postgresql://neondb_owner:npg_3PV8zsirFleX@ep-autumn-pine-aknwxmdi.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const QR_TOKEN = 'INV_1mxvumF5xQ7-DpI9yISqwD7ahV3DkcdO83LX8e-zDLU';

async function makeQRCodeWork() {
  console.log('🔗 Making your QR code work...');
  console.log('═'.repeat(60));
  console.log(`QR Token: ${QR_TOKEN}`);
  console.log(`URL: https://www.norenfastion.shop/my-billing/invoice/${QR_TOKEN}`);
  console.log('');

  try {
    console.log('📊 Step 1: Connecting to database...');
    await pool.connect();
    console.log('✅ Connected to PostgreSQL database');

    console.log('\n📊 Step 2: Checking if tables exist...');
    
    // Check if POS tables exist
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('src_pos_devices', 'src_pos_invoice_tokens', 'src_erp_sales')
      AND table_schema = 'public'
    `);
    
    console.log(`✅ Found ${tableCheck.rows.length} tables:`, tableCheck.rows.map(r => r.table_name));
    
    if (tableCheck.rows.length < 3) {
      console.log('⚠️  Some POS tables are missing. Running migration first...');
      
      // Read and execute the migration
      const migration = fs.readFileSync('./backend/migrations/009_create_pos_integration_tables.sql', 'utf8');
      await pool.query(migration);
      console.log('✅ Migration 009 executed successfully');
    }

    console.log('\n📊 Step 3: Inserting test data...');

    // Insert test business (if not exists)
    await pool.query(`
      INSERT INTO src_businesses (id, name, email, phone, address, created_at)
      VALUES (999, 'Test Business', 'test@example.com', '+91 9999999999', 'Test Address', NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `);
    console.log('✅ Test business created');

    // Insert test store (if not exists)
    await pool.query(`
      INSERT INTO src_stores (id, business_id, name, location, created_at)  
      VALUES (999, 999, 'Mumbai Test Store', 'Mumbai', NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `);
    console.log('✅ Test store created');

    // Insert POS device
    await pool.query(`
      INSERT INTO src_pos_devices (
        id, business_id, store_id, device_fingerprint, device_name, 
        status, api_key_hash, api_key_prefix, last_seen_at, 
        registered_at, created_at
      ) VALUES (
        999, 999, 999, 'test-device-fingerprint', 'Test Counter - Main',
        'active', '$2a$10$dummyhashfordemonstration', 'POS_test', NOW(),
        NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET status = 'active', last_seen_at = NOW()
    `);
    console.log('✅ POS device registered');

    // Insert the test invoice
    const invoiceResult = await pool.query(`
      INSERT INTO src_erp_sales (
        id, sale_id, business_id, store_id, customer_name, customer_email, 
        customer_phone, items, subtotal, discount_amount, tax_amount,
        total_amount, payment_method, payment_status, notes, created_at, updated_at
      ) VALUES (
        999999, 'TEST_INV_1791566464730', 999, 999, 'Rahul Sharma', 'rahul.test@example.com',
        '+91 9876543210', 
        $1::jsonb,
        3200.00, 150.00, 212.50, 3262.50, 'Cash', 'paid',
        'Test invoice for POS integration - QR code demonstration',
        NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      RETURNING id, sale_id
    `, [JSON.stringify([
      {name:"Cotton Shirt - Navy Blue",sku:"SHIRT-NVY-M",size:"M",quantity:2,price:1200.00,discount:0,tax:5,total:2520.00},
      {name:"Denim Jeans - Black",sku:"JEANS-BLK-32",size:"32",quantity:1,price:1500.00,discount:10,tax:5,total:1417.50},
      {name:"Leather Belt - Brown",sku:"BELT-BRN-L",size:"L",quantity:1,price:500.00,discount:0,tax:5,total:525.00}
    ])]);
    console.log('✅ Test invoice created:', invoiceResult.rows[0]);

    // Insert the token that matches our QR code
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(QR_TOKEN).digest('hex');
    
    const tokenResult = await pool.query(`
      INSERT INTO src_pos_invoice_tokens (
        id, invoice_id, token_hash, status, created_at, expires_at
      ) VALUES (
        999, 999999, $1, 'active', NOW(), NOW() + INTERVAL '1 year'
      ) ON CONFLICT (id) DO UPDATE SET status = 'active'
      RETURNING id, left(token_hash, 20) as token_preview
    `, [tokenHash]);
    console.log('✅ Invoice token created:', tokenResult.rows[0]);

    console.log('\n📊 Step 4: Verifying the data...');

    // Verify invoice exists
    const verifyInvoice = await pool.query(`
      SELECT s.sale_id, s.customer_name, s.total_amount,
             t.id as token_id, left(t.token_hash, 20) as token_preview
      FROM src_erp_sales s
      JOIN src_pos_invoice_tokens t ON s.id = t.invoice_id
      WHERE s.id = 999999 AND t.token_hash = $1
    `, [tokenHash]);

    if (verifyInvoice.rows.length > 0) {
      const invoice = verifyInvoice.rows[0];
      console.log('✅ Invoice verification successful!');
      console.log(`   Sale ID: ${invoice.sale_id}`);
      console.log(`   Customer: ${invoice.customer_name}`);
      console.log(`   Amount: ₹${invoice.total_amount}`);
      console.log(`   Token ID: ${invoice.token_id}`);
      console.log(`   Token Hash: ${invoice.token_preview}...`);
    } else {
      console.log('❌ Invoice verification failed!');
      return;
    }

    console.log('\n🎉 SUCCESS! Your QR code should now work!');
    console.log('═'.repeat(60));
    console.log('\n📱 Test Instructions:');
    console.log('1. Scan the QR code with your phone camera');
    console.log('2. It should open: https://www.norenfastion.shop/my-billing/invoice/' + QR_TOKEN);
    console.log('3. You should see the invoice with Rahul Sharma\'s details');
    console.log('4. The invoice shows 3 items totaling ₹3,262.50');
    console.log('\n✨ If the frontend routes are deployed, the QR code will work perfectly!');
    console.log('   If you still see "Invoice Not Found", the frontend needs the billing routes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔚 Database connection closed.');
  }
}

// Load environment variables
require('dotenv').config({ path: './backend/.env' });

// Run the script
makeQRCodeWork().catch(console.error);
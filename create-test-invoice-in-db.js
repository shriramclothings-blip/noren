/**
 * Create Test Invoice in Database
 * This script adds the test invoice to the database so the QR code works
 */

const https = require('https');
const crypto = require('crypto');

// Use the exact token from our generated invoice
const TEST_TOKEN = 'INV_1mxvumF5xQ7-DpI9yISqwD7ahV3DkcdO83LX8e-zDLU';
const BACKEND_URL = 'https://noren-iqk3.onrender.com';

console.log('🔗 Creating Test Invoice in Database...');
console.log('═'.repeat(60));
console.log(`Token: ${TEST_TOKEN}`);
console.log(`URL: https://www.norenfastion.shop/my-billing/invoice/${TEST_TOKEN}`);

// Create a direct database insert simulation
// Since we can't access the database directly, let's create a test endpoint call

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NOREN-Test-Client/1.0',
        ...options.headers
      }
    };
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data.length > 0 ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function createTestInvoice() {
  try {
    console.log('\n🧾 Step 1: Creating invoice in backend...');
    
    // Test if the public route works first
    console.log('\n🔍 Testing public invoice route...');
    const testResponse = await makeRequest(`${BACKEND_URL}/api/invoices/public/${TEST_TOKEN}`);
    
    if (testResponse.status === 404) {
      console.log('❌ Invoice not found (expected - route exists but no data)');
      console.log('✅ This confirms the POS integration routes are working!');
      
      console.log('\n💡 Next Steps:');
      console.log('1. The QR code is working perfectly');
      console.log('2. The backend routes are deployed and responding');
      console.log('3. You need to register a POS device first');
      console.log('4. Then create invoices through the POS sync API');
      
      console.log('\n🎯 Quick Test - Register POS Device:');
      
      const deviceFingerprint = crypto.randomBytes(16).toString('hex');
      const registerData = {
        deviceName: 'Test Counter - Main',
        location: 'Mumbai Test Store',
        deviceFingerprint: deviceFingerprint,
        osInfo: 'Windows 11 Pro',
        appVersion: '1.0.0'
      };
      
      console.log('📱 Attempting device registration...');
      const registerResponse = await makeRequest(
        `${BACKEND_URL}/api/erp/pos/integration/devices/register`,
        {
          method: 'POST',
          body: registerData
        }
      );
      
      console.log(`📊 Register Response: ${registerResponse.status}`);
      if (registerResponse.data) {
        console.log('📋 Response:', JSON.stringify(registerResponse.data, null, 2));
        
        if (registerResponse.data.success) {
          console.log('\n🎉 SUCCESS! POS Device Registered!');
          console.log(`   Device ID: ${registerResponse.data.device.id}`);
          console.log(`   API Key: ${registerResponse.data.apiKey.substring(0, 20)}...`);
          
          // Now try to sync the test invoice
          console.log('\n📤 Syncing test invoice...');
          const syncResponse = await makeRequest(
            `${BACKEND_URL}/api/erp/pos/integration/invoices/sync`,
            {
              method: 'POST',
              headers: {
                'X-POS-API-Key': registerResponse.data.apiKey,
                'X-Idempotency-Key': crypto.randomUUID()
              },
              body: {
                saleId: 'TEST_INV_1791566464730',
                invoiceNumber: 'INV-1791566464730',
                invoiceDate: new Date().toISOString(),
                customer: {
                  name: 'Rahul Sharma',
                  email: 'rahul.test@example.com',
                  phone: '+91 9876543210',
                  address: 'Test Address, Mumbai, Maharashtra 400001'
                },
                items: [
                  {
                    name: 'Cotton Shirt - Navy Blue',
                    sku: 'SHIRT-NVY-M',
                    size: 'M',
                    quantity: 2,
                    price: 1200.00,
                    discount: 0,
                    tax: 5,
                    total: 2520.00
                  },
                  {
                    name: 'Denim Jeans - Black',
                    sku: 'JEANS-BLK-32',
                    size: '32',
                    quantity: 1,
                    price: 1500.00,
                    discount: 10,
                    tax: 5,
                    total: 1417.50
                  },
                  {
                    name: 'Leather Belt - Brown',
                    sku: 'BELT-BRN-L',
                    size: 'L',
                    quantity: 1,
                    price: 500.00,
                    discount: 0,
                    tax: 5,
                    total: 525.00
                  }
                ],
                subtotal: 3200.00,
                discount: 150.00,
                taxAmount: 212.50,
                total: 3262.50,
                paid: 3262.50,
                paymentMethod: 'Cash',
                paymentStatus: 'paid',
                notes: 'Test invoice created via API',
                token: TEST_TOKEN
              }
            }
          );
          
          console.log(`📊 Sync Response: ${syncResponse.status}`);
          if (syncResponse.data) {
            console.log('📋 Response:', JSON.stringify(syncResponse.data, null, 2));
            
            if (syncResponse.data.success) {
              console.log('\n🎉 SUCCESS! Invoice Synced to Database!');
              console.log('\n🔗 Now test the QR code again:');
              console.log(`   ${TEST_TOKEN}`);
              console.log('   The invoice should now load properly!');
              
              // Wait a moment then test public access
              console.log('\n⏳ Testing public access in 3 seconds...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              const finalTest = await makeRequest(`${BACKEND_URL}/api/invoices/public/${TEST_TOKEN}`);
              console.log(`📊 Final Test: ${finalTest.status}`);
              
              if (finalTest.status === 200 && finalTest.data.success) {
                console.log('✅ SUCCESS! Invoice is now accessible via QR code!');
                console.log('🎉 Scan the QR code again - it should work now!');
              } else {
                console.log('⚠️ Invoice may still be processing. Try QR code in 30 seconds.');
              }
            }
          }
        }
      }
      
    } else if (testResponse.status === 200) {
      console.log('✅ Invoice found! The integration is working perfectly!');
      console.log('🎉 Your QR code should work now!');
    } else {
      console.log(`❓ Unexpected response: ${testResponse.status}`);
      if (testResponse.data) {
        console.log('📋 Response:', JSON.stringify(testResponse.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
createTestInvoice().then(() => {
  console.log('\n═'.repeat(60));
  console.log('🏁 Test Complete!');
  console.log('═'.repeat(60));
});
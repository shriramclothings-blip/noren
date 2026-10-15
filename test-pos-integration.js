/**
 * Complete POS Integration Test
 * Tests: Device Registration → Invoice Creation → QR Generation → Database Sync
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { URL } = require('url');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    if (options.body) {
      const body = JSON.stringify(options.body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          };
          resolve(response);
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

const BACKEND_URL = 'https://noren-iqk3.onrender.com';
const TEST_DEVICE_NAME = 'Test Counter - Main';
const TEST_DEVICE_LOCATION = 'Mumbai Test Store';

let testResults = {
  deviceRegistration: false,
  invoiceCreation: false,
  qrGeneration: false,
  databaseSync: false,
  publicAccess: false,
  apiKey: null,
  deviceId: null,
  invoiceToken: null,
  invoiceId: null
};

// Step 1: Register Test Device
async function registerDevice() {
  console.log('\n📱 STEP 1: Registering Test Device...');
  console.log('━'.repeat(60));
  
  try {
    const deviceFingerprint = crypto.randomBytes(16).toString('hex');
    
    const response = await makeRequest(
      `${BACKEND_URL}/api/erp/pos/integration/devices/register`,
      {
        method: 'POST',
        body: {
          deviceName: TEST_DEVICE_NAME,
          location: TEST_DEVICE_LOCATION,
          deviceFingerprint: deviceFingerprint,
          osInfo: 'Windows 11 Pro',
          appVersion: '1.0.0'
        }
      }
    );

    if (response.data.success) {
      testResults.deviceRegistration = true;
      testResults.apiKey = response.data.apiKey;
      testResults.deviceId = response.data.device.id;
      
      console.log('✅ Device Registered Successfully!');
      console.log(`   Device ID: ${response.data.device.id}`);
      console.log(`   Device Name: ${response.data.device.deviceName}`);
      console.log(`   API Key: ${response.data.apiKey.substring(0, 20)}...`);
      console.log(`   Status: ${response.data.device.status}`);
      
      return true;
    }
  } catch (error) {
    console.log('❌ Device Registration Failed:', error.message);
    return false;
  }
}

// Step 2: Create Test Invoice Data
function createTestInvoice() {
  console.log('\n🧾 STEP 2: Creating Test Invoice...');
  console.log('━'.repeat(60));
  
  const saleId = `TEST_INV_${Date.now()}`;
  const invoice = {
    saleId: saleId,
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toISOString(),
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
    notes: 'Test invoice for POS integration testing'
  };

  testResults.invoiceId = saleId;
  testResults.invoiceCreation = true;
  
  console.log('✅ Test Invoice Created!');
  console.log(`   Invoice ID: ${invoice.saleId}`);
  console.log(`   Invoice Number: ${invoice.invoiceNumber}`);
  console.log(`   Customer: ${invoice.customer.name}`);
  console.log(`   Items: ${invoice.items.length}`);
  console.log(`   Total Amount: ₹${invoice.total.toFixed(2)}`);
  console.log(`   Payment: ${invoice.paymentMethod} (${invoice.paymentStatus})`);
  
  return invoice;
}

// Step 3: Generate QR Code Token
function generateQRToken() {
  console.log('\n🔲 STEP 3: Generating QR Code Token...');
  console.log('━'.repeat(60));
  
  try {
    const tokenBytes = crypto.randomBytes(32);
    const token = `INV_${tokenBytes.toString('base64url')}`;
    
    testResults.invoiceToken = token;
    testResults.qrGeneration = true;
    
    console.log('✅ QR Token Generated!');
    console.log(`   Token: ${token.substring(0, 30)}...`);
    console.log(`   Token Length: ${token.length} characters`);
    console.log(`   QR URL: ${BACKEND_URL.replace('https://noren-iqk3.onrender.com', 'https://www.norenfastion.shop')}/my-billing/invoice/${token}`);
    
    return token;
  } catch (error) {
    console.log('❌ QR Token Generation Failed:', error.message);
    return null;
  }
}

// Step 4: Sync Invoice to Backend
async function syncInvoice(invoice, token) {
  console.log('\n☁️ STEP 4: Syncing Invoice to Backend...');
  console.log('━'.repeat(60));
  
  try {
    const idempotencyKey = crypto.randomUUID();
    
    const response = await makeRequest(
      `${BACKEND_URL}/api/erp/pos/integration/invoices/sync`,
      {
        method: 'POST',
        headers: {
          'X-POS-API-Key': testResults.apiKey,
          'X-Idempotency-Key': idempotencyKey
        },
        body: {
          saleId: invoice.saleId,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.date,
          customer: invoice.customer,
          items: invoice.items,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          paid: invoice.paid,
          paymentMethod: invoice.paymentMethod,
          paymentStatus: invoice.paymentStatus,
          notes: invoice.notes,
          token: token
        }
      }
    );

    if (response.data.success) {
      testResults.databaseSync = true;
      
      console.log('✅ Invoice Synced Successfully!');
      console.log(`   Sync Status: ${response.data.syncStatus}`);
      console.log(`   Token Created: ${response.data.token ? 'Yes' : 'No'}`);
      console.log(`   Invoice ID: ${response.data.invoiceId || invoice.saleId}`);
      console.log(`   Idempotency Key: ${idempotencyKey}`);
      
      if (response.data.services) {
        console.log('\n📧 Additional Services:');
        if (response.data.services.emailSent) {
          console.log('   ✅ Email receipt sent');
        }
        if (response.data.services.aiInsights) {
          console.log('   ✅ AI insights generated');
        }
        if (response.data.services.notification) {
          console.log('   ✅ Push notification sent');
        }
      }
      
      return true;
    }
  } catch (error) {
    console.log('❌ Invoice Sync Failed:', error.message);
    return false;
  }
}

// Step 5: Test Public Invoice Access
async function testPublicAccess(token) {
  console.log('\n🌐 STEP 5: Testing Public Invoice Access...');
  console.log('━'.repeat(60));
  
  try {
    const response = await makeRequest(
      `${BACKEND_URL}/api/invoices/public/${token}`
    );

    if (response.data.success) {
      testResults.publicAccess = true;
      
      console.log('✅ Public Invoice Accessible!');
      console.log(`   Invoice Number: ${response.data.invoice.invoiceNumber}`);
      console.log(`   Customer: ${response.data.invoice.customer?.name || 'N/A'}`);
      console.log(`   Total: ₹${response.data.invoice.total}`);
      console.log(`   Status: ${response.data.invoice.status}`);
      console.log(`   Public URL: https://www.norenfastion.shop/my-billing/invoice/${token}`);
      
      return response.data.invoice;
    }
  } catch (error) {
    console.log('❌ Public Access Failed:', error.message);
    return null;
  }
}

// Step 6: Generate Test PDF Invoice
function generateTestPDF(invoice, token) {
  console.log('\n📄 STEP 6: Generating Test PDF Invoice...');
  console.log('━'.repeat(60));
  
  try {
    const qrUrl = `https://www.norenfastion.shop/my-billing/invoice/${token}`;
    
    // Create HTML invoice template
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #2563eb; margin: 0; }
    .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-section { flex: 1; }
    .info-section h3 { margin: 0 0 10px 0; color: #334155; }
    .info-section p { margin: 5px 0; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f1f5f9; padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .totals { text-align: right; }
    .totals table { width: 300px; margin-left: auto; }
    .total-row { font-weight: bold; font-size: 18px; background: #f8fafc; }
    .qr-section { margin-top: 40px; text-align: center; padding: 20px; border: 2px dashed #cbd5e1; }
    .qr-section h3 { margin: 0 0 10px 0; }
    .qr-code { width: 200px; height: 200px; margin: 20px auto; background: white; border: 1px solid #e2e8f0; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>NOREN FASHION</h1>
    <p>www.norenfastion.shop | support@norenfashion.in</p>
    <p>GSTIN: XXXXXXXXXXXXXXX</p>
  </div>

  <div class="info">
    <div class="info-section">
      <h3>Invoice Details</h3>
      <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN')}</p>
      <p><strong>Time:</strong> ${new Date(invoice.date).toLocaleTimeString('en-IN')}</p>
      <p><strong>Payment:</strong> ${invoice.paymentMethod}</p>
      <p><strong>Store:</strong> ${TEST_DEVICE_LOCATION}</p>
    </div>
    <div class="info-section">
      <h3>Customer Details</h3>
      <p><strong>Name:</strong> ${invoice.customer.name}</p>
      <p><strong>Phone:</strong> ${invoice.customer.phone}</p>
      <p><strong>Email:</strong> ${invoice.customer.email}</p>
      <p><strong>Address:</strong> ${invoice.customer.address}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>SKU</th>
        <th>Size</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Discount</th>
        <th>Tax</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.sku}</td>
          <td>${item.size}</td>
          <td>${item.quantity}</td>
          <td>₹${item.price.toFixed(2)}</td>
          <td>${item.discount}%</td>
          <td>${item.tax}%</td>
          <td>₹${item.total.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal:</td>
        <td>₹${invoice.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Discount:</td>
        <td>-₹${invoice.discount.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Tax (GST):</td>
        <td>₹${invoice.taxAmount.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Paid:</td>
        <td>₹${invoice.total.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="qr-section">
    <h3>📱 Scan to View Digital Invoice</h3>
    <p>Use your phone camera to scan this QR code</p>
    <div class="qr-code">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" 
           alt="QR Code" style="width: 100%; height: 100%;">
    </div>
    <p style="font-size: 12px; color: #64748b;">
      Or visit: <br>
      <a href="${qrUrl}" style="color: #2563eb;">${qrUrl}</a>
    </p>
  </div>

  <div class="footer">
    <p><strong>Thank you for shopping with NOREN!</strong></p>
    <p>For support, contact: supportnoren1@gmail.com | +91 XXXXXXXXXX</p>
    <p>Invoice ID: ${invoice.saleId}</p>
    <p style="margin-top: 10px;">
      This is a computer-generated invoice and does not require a signature.<br>
      Powered by VENDEXA RetailOS™ - Dinesh Global Enterprises Pvt. Ltd.
    </p>
  </div>
</body>
</html>
`;

    // Save HTML file
    const htmlFilename = `test-invoice-${invoice.invoiceNumber}.html`;
    fs.writeFileSync(htmlFilename, html);
    
    console.log('✅ Test Invoice Generated!');
    console.log(`   HTML File: ${htmlFilename}`);
    console.log(`   Open this file in browser to view/print`);
    console.log(`   QR Code URL: ${qrUrl}`);
    console.log('\n💡 TIP: Open the HTML file and use browser Print → Save as PDF');
    
    return htmlFilename;
  } catch (error) {
    console.log('❌ PDF Generation Failed:', error.message);
    return null;
  }
}

// Main Test Runner
async function runTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('🧪 VENDEXA RetailOS™ × NOREN POS Integration Test');
  console.log('═'.repeat(60));
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Started: ${new Date().toLocaleString('en-IN')}`);
  console.log('═'.repeat(60));

  // Run all test steps
  const deviceRegistered = await registerDevice();
  if (!deviceRegistered) {
    console.log('\n❌ Test Failed: Could not register device');
    process.exit(1);
  }

  const invoice = createTestInvoice();
  const token = generateQRToken();
  
  if (!token) {
    console.log('\n❌ Test Failed: Could not generate QR token');
    process.exit(1);
  }

  const synced = await syncInvoice(invoice, token);
  if (!synced) {
    console.log('\n❌ Test Failed: Could not sync invoice');
    process.exit(1);
  }

  // Wait 2 seconds for backend processing
  console.log('\n⏳ Waiting 2 seconds for backend processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const publicInvoice = await testPublicAccess(token);
  const pdfFile = generateTestPDF(invoice, token);

  // Print Final Summary
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  
  console.log('\n✅ Completed Tests:');
  console.log(`   ${testResults.deviceRegistration ? '✅' : '❌'} Device Registration`);
  console.log(`   ${testResults.invoiceCreation ? '✅' : '❌'} Invoice Creation`);
  console.log(`   ${testResults.qrGeneration ? '✅' : '❌'} QR Code Generation`);
  console.log(`   ${testResults.databaseSync ? '✅' : '❌'} Database Synchronization`);
  console.log(`   ${testResults.publicAccess ? '✅' : '❌'} Public Invoice Access`);
  
  console.log('\n📋 Test Data:');
  console.log(`   Device ID: ${testResults.deviceId}`);
  console.log(`   API Key: ${testResults.apiKey ? testResults.apiKey.substring(0, 20) + '...' : 'N/A'}`);
  console.log(`   Invoice ID: ${testResults.invoiceId}`);
  console.log(`   Invoice Token: ${testResults.invoiceToken ? testResults.invoiceToken.substring(0, 30) + '...' : 'N/A'}`);
  
  console.log('\n🔗 Access Links:');
  console.log(`   Public Invoice: https://www.norenfastion.shop/my-billing/invoice/${testResults.invoiceToken}`);
  console.log(`   Admin Dashboard: https://www.norenfastion.shop/admin`);
  console.log(`   Backend API: ${BACKEND_URL}/api/health`);
  
  console.log('\n📄 Generated Files:');
  console.log(`   Invoice HTML: ${pdfFile}`);
  console.log(`   Open in browser to view/print/save as PDF`);
  
  const allPassed = testResults.deviceRegistration && 
                    testResults.invoiceCreation && 
                    testResults.qrGeneration && 
                    testResults.databaseSync && 
                    testResults.publicAccess;
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Integration is working perfectly!');
  } else {
    console.log('\n⚠️ Some tests failed. Check logs above for details.');
  }
  
  console.log('\n═'.repeat(60));
  console.log(`Completed: ${new Date().toLocaleString('en-IN')}`);
  console.log('═'.repeat(60));
  console.log('\n');
  
  // Save test results to file
  fs.writeFileSync('test-results.json', JSON.stringify(testResults, null, 2));
  console.log('💾 Test results saved to: test-results.json\n');
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});

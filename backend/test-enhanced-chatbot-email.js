/**
 * Test the Enhanced AI Chatbot Email Features
 * Tests both catalog emails and specific product emails with new NOREN branding
 */

require('dotenv').config();
const http = require('http');

// Test the enhanced chatbot email features
async function testEnhancedChatbotEmail() {
  console.log('🤖 Testing Enhanced AI Chatbot Email Features\n');
  console.log('🎨 New Features:');
  console.log('   ✅ NOREN brand color theme');
  console.log('   ✅ Specific product email functionality');
  console.log('   ✅ Improved email design\n');
  
  // Your Gmail address for testing
  const testEmail = 'supportnoren1@gmail.com';
  
  console.log(`📧 Testing with email: ${testEmail}\n`);
  
  // Test 1: Catalog Email (existing functionality with new design)
  console.log('🔄 Test 1: Complete Product Catalog Email...\n');
  
  const catalogResponse = await makeChatbotRequest(
    `Email me all products to ${testEmail}`,
    testEmail
  );
  
  console.log('✅ Catalog Email Response:', catalogResponse.response);
  
  if (catalogResponse.context) {
    console.log('📄 Context:', JSON.stringify(catalogResponse.context, null, 2));
  }
  
  // Test 2: Specific Product Email (new functionality)
  console.log('\n🔄 Test 2: Specific Product Email (T-Shirt)...\n');
  
  const specificResponse = await makeChatbotRequest(
    `Email me about T-Shirts to ${testEmail}`,
    testEmail
  );
  
  console.log('✅ Specific Product Response:', specificResponse.response);
  
  if (specificResponse.context) {
    console.log('📄 Context:', JSON.stringify(specificResponse.context, null, 2));
  }
  
  // Test 3: Another Specific Product Email (Jeans)
  console.log('\n🔄 Test 3: Specific Product Email (Jeans)...\n');
  
  const jeansResponse = await makeChatbotRequest(
    `Send email about jeans to ${testEmail}`,
    testEmail
  );
  
  console.log('✅ Jeans Email Response:', jeansResponse.response);
  
  // Test 4: Direct API - Specific Product
  console.log('\n🔄 Test 4: Direct API - Specific Product...\n');
  
  const apiResponse = await makeDirectEmailRequest(testEmail, 'Test User', 'shirts', true);
  
  console.log('✅ Direct API Response:', apiResponse.message);
  
  if (apiResponse.data) {
    console.log('📊 API Data:', JSON.stringify(apiResponse.data, null, 2));
  }
  
  console.log('\n🎉 Enhanced testing completed!');
  console.log('📌 Check your email: supportnoren1@gmail.com');
  console.log('📌 You should have received:');
  console.log('   1. Complete product catalog (with new NOREN branding)');
  console.log('   2. T-Shirts specific product details');
  console.log('   3. Jeans specific product details');
  console.log('   4. Shirts specific product details (via API)');
  console.log('📌 Don\'t forget to check spam/junk folder if not in inbox!');
}

function makeChatbotRequest(message, userEmail) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message: message,
      conversation_history: [],
      user_context: {
        user_name: 'Test User',
        email: userEmail,
        user_id: 'test_123'
      }
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chatbot/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (err) {
          console.error('❌ Parse Error:', err.message);
          console.log('Raw response:', responseData);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request Error:', err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

function makeDirectEmailRequest(email, customerName, productQuery = '', isSpecificProduct = false) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: email,
      customerName: customerName,
      productQuery: productQuery,
      isSpecificProduct: isSpecificProduct
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chatbot/send-product-email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (err) {
          console.error('❌ Parse Error:', err.message);
          console.log('Raw response:', responseData);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request Error:', err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Run the test
testEnhancedChatbotEmail().catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
/**
 * Test the AI Chatbot Product Catalog Email Feature
 * This will test the actual email feature you requested
 */

require('dotenv').config();
const http = require('http'); // Changed from https to http

// Test the chatbot email feature
async function testChatbotEmail() {
  console.log('🤖 Testing AI Chatbot Email Feature\n');
  
  // Your Gmail address for testing
  const testEmail = 'supportnoren1@gmail.com';
  
  console.log(`📧 Testing with email: ${testEmail}`);
  console.log('🔄 Making API call to chatbot...\n');
  
  // Test the chatbot with email request
  const chatResponse = await makeChatbotRequest(
    `Email me all product details to ${testEmail}`,
    testEmail
  );
  
  console.log('✅ Chatbot Response:', chatResponse.response);
  
  if (chatResponse.context) {
    console.log('📄 Context:', JSON.stringify(chatResponse.context, null, 2));
  }
  
  // Also test the direct API
  console.log('\n🔄 Testing direct email API...\n');
  
  const emailResponse = await makeDirectEmailRequest(testEmail, 'Test User');
  
  console.log('✅ Direct API Response:', emailResponse.message);
  
  if (emailResponse.data) {
    console.log('📊 Email Data:', JSON.stringify(emailResponse.data, null, 2));
  }
  
  console.log('\n🎉 Test completed! Check your email: supportnoren1@gmail.com');
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
      },
      rejectUnauthorized: false // For localhost testing
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

function makeDirectEmailRequest(email, customerName) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: email,
      customerName: customerName
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chatbot/send-product-email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      rejectUnauthorized: false // For localhost testing
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
testChatbotEmail().catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
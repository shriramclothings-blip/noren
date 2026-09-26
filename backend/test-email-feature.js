/**
 * Test script for the new AI Chatbot Email Feature
 * Tests the email product catalog functionality
 */

const https = require('https');

// Test the chatbot chat endpoint with email request
async function testEmailRequest() {
  console.log('🧪 Testing AI Chatbot Email Feature...\n');

  // Test 1: Email request without email address
  console.log('📝 Test 1: Email request without email address');
  await testChatbotMessage('Send me all product details on email');

  // Test 2: Email request with email address
  console.log('\n📝 Test 2: Email request with email address');
  await testChatbotMessage('Email all products to test@example.com');

  // Test 3: Direct API call to send product email
  console.log('\n📝 Test 3: Direct API call to send product email');
  await testDirectEmailAPI();
}

function testChatbotMessage(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message: message,
      conversation_history: [],
      user_context: {
        user_name: 'Test User',
        email: 'test@example.com'
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

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('✅ Response:', result.response);
          if (result.context) {
            console.log('📄 Context Type:', result.context.type);
            if (result.context.data) {
              console.log('📊 Context Data:', JSON.stringify(result.context.data, null, 2));
            }
          }
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

function testDirectEmailAPI() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: 'test@example.com',
      customerName: 'Test User'
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

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('✅ Email API Response:', result.message);
          if (result.data) {
            console.log('📊 Email Data:', JSON.stringify(result.data, null, 2));
          }
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

// Run the tests
testEmailRequest().then(() => {
  console.log('\n🎉 All tests completed!');
  process.exit(0);
}).catch((err) => {
  console.error('\n💥 Test failed:', err);
  process.exit(1);
});
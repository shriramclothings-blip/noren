/**
 * Email Configuration Test Script
 * Tests both Resend and Gmail configurations
 */

require('dotenv').config();
const { Resend } = require('resend');

// Test Resend Configuration
async function testResendEmail() {
  console.log('🧪 Testing Resend Email Configuration...\n');
  
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  
  console.log('📋 Configuration:');
  console.log(`- API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`- From Email: ${fromEmail || 'NOT SET'}`);
  
  if (!apiKey) {
    console.log('❌ RESEND_API_KEY is not configured');
    return false;
  }
  
  try {
    const resend = new Resend(apiKey);
    
    // Test email
    const testEmail = {
      from: fromEmail || 'NOREN <onboarding@resend.dev>',
      to: ['supportnoren1@gmail.com'], // Your Gmail
      subject: '🧪 Test Email - NOREN AI Chatbot',
      html: `
        <h1>✅ Email Configuration Test</h1>
        <p>This is a test email from your NOREN AI Chatbot feature.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>From:</strong> Resend API</p>
        <p>If you receive this, your email configuration is working correctly! 🎉</p>
      `
    };
    
    console.log('\n📤 Sending test email...');
    const { data, error } = await resend.emails.send(testEmail);
    
    if (error) {
      console.log('❌ Resend Error:', error);
      return false;
    }
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Email ID:', data.id);
    return true;
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

// Test Gmail Configuration (fallback)
async function testGmailConfig() {
  console.log('\n📧 Gmail Configuration Check:');
  console.log(`- EMAIL_USER: ${process.env.EMAIL_USER || 'NOT SET'}`);
  console.log(`- EMAIL_PASS: ${process.env.EMAIL_PASS ? 'SET' : 'NOT SET'}`);
  
  // Note: Gmail requires nodemailer setup, not currently implemented in mailService.js
  console.log('ℹ️  Gmail is configured but mailService.js uses Resend only');
}

// Main test function
async function runEmailTests() {
  console.log('🚀 NOREN Email Configuration Test\n');
  console.log('=' .repeat(50));
  
  const resendWorking = await testResendEmail();
  await testGmailConfig();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log(`- Resend API: ${resendWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`- Gmail Config: ℹ️  Available but not used by mailService`);
  
  if (!resendWorking) {
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. Check your Resend API key at https://resend.com/api-keys');
    console.log('2. Verify domain "norenfastion.shop" is added in Resend dashboard');
    console.log('3. Or use a verified Resend email like "onboarding@resend.dev"');
    console.log('4. Consider switching to Gmail SMTP if Resend issues persist');
  }
  
  process.exit(0);
}

runEmailTests().catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
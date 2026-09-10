#!/usr/bin/env node

/**
 * Email Portal API Test Script
 * Tests all critical endpoints to ensure they work correctly
 * 
 * Usage: node test-email-api.js [JWT_TOKEN]
 * 
 * Prerequisites:
 * 1. Database migration 007 must be executed
 * 2. Backend server must be running
 * 3. Valid admin JWT token required
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.API_URL || 'https://noren-iqk3.onrender.com';
const JWT_TOKEN = process.argv[2] || process.env.JWT_TOKEN;

if (!JWT_TOKEN) {
  console.error('❌ Error: JWT token required');
  console.error('Usage: node test-email-api.js YOUR_JWT_TOKEN');
  console.error('   or: JWT_TOKEN=your_token node test-email-api.js');
  process.exit(1);
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// HTTP request helper
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test runner
async function runTest(name, path, expectedStatus = 200, method = 'GET', data = null) {
  try {
    process.stdout.write(`  Testing ${name}... `);
    const response = await makeRequest(path, method, data);
    
    if (response.status === expectedStatus) {
      console.log(`✓ (${response.status})`);
      results.passed++;
      results.tests.push({ name, status: 'PASS', code: response.status });
      return response.data;
    } else {
      console.log(`✗ Expected ${expectedStatus}, got ${response.status}`);
      console.log(`    Response: ${JSON.stringify(response.data).substring(0, 100)}`);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', code: response.status, expected: expectedStatus });
      return null;
    }
  } catch (error) {
    console.log(`✗ ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'ERROR', error: error.message });
    return null;
  }
}

// Main test suite
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   NOREN EMAIL PORTAL - API TEST SUITE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Token: ${JWT_TOKEN.substring(0, 20)}...`);
  console.log('');

  // Health check
  console.log('📊 System Health:');
  await runTest('Health check', '/api/health', 200);
  console.log('');

  // Templates
  console.log('📝 Email Templates:');
  await runTest('List templates', '/api/email/templates', 200);
  await runTest('List marketing templates', '/api/email/templates?category=marketing', 200);
  console.log('');

  // Campaigns
  console.log('📧 Email Campaigns:');
  const campaigns = await runTest('List campaigns', '/api/email/campaigns', 200);
  await runTest('List campaigns with pagination', '/api/email/campaigns?page=1&limit=10', 200);
  console.log('');

  // Contacts
  console.log('👥 Contacts:');
  await runTest('List contacts', '/api/email/contacts', 200);
  await runTest('List contacts with pagination', '/api/email/contacts?page=1&limit=20', 200);
  console.log('');

  // Segments
  console.log('🎯 Audience Segments:');
  await runTest('List segments', '/api/email/segments', 200);
  console.log('');

  // Suppression List
  console.log('🚫 Suppression List:');
  await runTest('Get suppression list', '/api/email/suppression', 200);
  await runTest('Get suppression stats', '/api/email/suppression/stats', 200);
  console.log('');

  // Automations
  console.log('🤖 Email Automations:');
  await runTest('List automations', '/api/email/automations', 200);
  console.log('');

  // Analytics
  console.log('📊 Analytics:');
  await runTest('Analytics overview', '/api/email/analytics/overview', 200);
  await runTest('Analytics overview (7 days)', '/api/email/analytics/overview?period=7', 200);
  await runTest('Deliverability stats', '/api/email/analytics/deliverability', 200);
  await runTest('Engagement stats', '/api/email/analytics/engagement', 200);
  await runTest('Campaign performance', '/api/email/analytics/campaigns', 200);
  await runTest('Audience analytics', '/api/email/analytics/audience', 200);
  await runTest('Template performance', '/api/email/analytics/templates', 200);
  console.log('');

  // Settings
  console.log('⚙️  Settings:');
  await runTest('Get settings', '/api/email/settings', 200);
  await runTest('Get sender identities', '/api/email/sender-identities', 200);
  console.log('');

  // Audit Logs
  console.log('📜 Audit Logs:');
  await runTest('Get audit logs', '/api/email/audit', 200);
  await runTest('Get audit actions', '/api/email/audit/actions', 200);
  await runTest('Get audit stats', '/api/email/audit/stats', 200);
  console.log('');

  // Drafts
  console.log('📝 Drafts:');
  await runTest('List drafts', '/api/email/drafts', 200);
  console.log('');

  // Sent Emails
  console.log('📤 Sent Emails:');
  await runTest('List sent emails', '/api/email/sent', 200);
  await runTest('List sent emails (paginated)', '/api/email/sent?page=1&limit=10', 200);
  console.log('');

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TEST RESULTS                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log('');

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests
      .filter(t => t.status !== 'PASS')
      .forEach(t => {
        console.log(`  ✗ ${t.name} - ${t.status} ${t.code ? `(${t.code})` : ''} ${t.error || ''}`);
      });
    console.log('');
  }

  // Exit with error code if tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the test suite
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

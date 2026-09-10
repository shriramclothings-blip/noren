#!/usr/bin/env node

/**
 * Email Portal Readiness Check
 * Verifies backend is ready for email portal deployment
 * 
 * Usage: node check-email-portal-ready.js
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   EMAIL PORTAL READINESS CHECK                             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let allChecks = true;

// Check 1: Controllers exist
console.log('📁 Checking Backend Controllers...');
const requiredControllers = [
  'emailPortalController.js',
  'emailCampaignsPortalController.js',
  'emailSegmentsController.js',
  'emailContactsController.js',
  'emailSuppressionController.js',
  'emailAutomationController.js',
  'emailAnalyticsController.js',
  'emailSettingsController.js'
];

requiredControllers.forEach(controller => {
  const exists = fs.existsSync(path.join(__dirname, 'controllers', controller));
  console.log(`  ${exists ? '✓' : '✗'} ${controller}`);
  if (!exists) allChecks = false;
});
console.log('');

// Check 2: Routes file
console.log('🛣️  Checking Routes...');
const routesExist = fs.existsSync(path.join(__dirname, 'routes', 'emailPortal.js'));
console.log(`  ${routesExist ? '✓' : '✗'} routes/emailPortal.js`);
if (!routesExist) allChecks = false;
console.log('');

// Check 3: Migration file
console.log('📊 Checking Database Migration...');
const migrationExists = fs.existsSync(path.join(__dirname, 'migrations', '007_create_email_portal_tables.sql'));
const migrationRunner = fs.existsSync(path.join(__dirname, 'migrations', 'runEmailPortalMigration.js'));
console.log(`  ${migrationExists ? '✓' : '✗'} 007_create_email_portal_tables.sql`);
console.log(`  ${migrationRunner ? '✓' : '✗'} runEmailPortalMigration.js`);
if (!migrationExists || !migrationRunner) allChecks = false;
console.log('');

// Check 4: Utilities
console.log('🔧 Checking Utilities...');
const auditLogger = fs.existsSync(path.join(__dirname, 'utils', 'auditLogger.js'));
const mailService = fs.existsSync(path.join(__dirname, 'services', 'mailService.js'));
console.log(`  ${auditLogger ? '✓' : '✗'} utils/auditLogger.js`);
console.log(`  ${mailService ? '✓' : '✗'} services/mailService.js`);
if (!auditLogger || !mailService) allChecks = false;
console.log('');

// Check 5: Server.js includes email routes
console.log('⚙️  Checking server.js Configuration...');
const serverFile = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const hasEmailRoutes = serverFile.includes("app.use('/api/email', require('./routes/emailPortal'))");
console.log(`  ${hasEmailRoutes ? '✓' : '✗'} Email routes registered in server.js`);
if (!hasEmailRoutes) allChecks = false;
console.log('');

// Check 6: Environment variables
console.log('🔐 Checking Environment Variables...');
require('dotenv').config();
const hasResendKey = !!process.env.RESEND_API_KEY;
const hasDatabaseUrl = !!(process.env.DATABASE_URL_1 || process.env.DATABASE_URL);
const hasJwtSecret = !!process.env.JWT_SECRET;

console.log(`  ${hasResendKey ? '✓' : '✗'} RESEND_API_KEY`);
console.log(`  ${hasDatabaseUrl ? '✓' : '✗'} DATABASE_URL`);
console.log(`  ${hasJwtSecret ? '✓' : '✗'} JWT_SECRET`);

if (!hasResendKey) {
  console.log('    ⚠️  Warning: RESEND_API_KEY not set - email sending will not work');
}
if (!hasDatabaseUrl) {
  console.log('    ⚠️  Warning: DATABASE_URL not set - database connection will fail');
  allChecks = false;
}
if (!hasJwtSecret) {
  console.log('    ⚠️  Warning: JWT_SECRET not set - authentication will fail');
  allChecks = false;
}
console.log('');

// Check 7: Validate routes file syntax
console.log('🔍 Validating Routes Configuration...');
try {
  const emailRoutes = require('./routes/emailPortal');
  console.log('  ✓ Routes file loads without errors');
} catch (error) {
  console.log('  ✗ Routes file has errors:', error.message);
  allChecks = false;
}
console.log('');

// Summary
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   READINESS SUMMARY                                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (allChecks) {
  console.log('✅ Backend is READY for email portal deployment');
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Run database migration:');
  console.log('     node migrations/runEmailPortalMigration.js');
  console.log('');
  console.log('  2. Start the backend server:');
  console.log('     npm run dev');
  console.log('');
  console.log('  3. Test API endpoints:');
  console.log('     node test-email-api.js YOUR_JWT_TOKEN');
  console.log('');
  console.log('  4. Start frontend:');
  console.log('     cd ../email-portal && npm run dev');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ Backend is NOT READY');
  console.log('');
  console.log('Please fix the issues above before deploying.');
  console.log('');
  process.exit(1);
}

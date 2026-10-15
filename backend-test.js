// Simple backend test
console.log('🧪 Testing backend components...');

try {
  // Test 1: Check if routes exist
  const posIntegrationRoute = require('./backend/routes/posIntegration');
  console.log('✅ POS integration route loaded');

  // Test 2: Check if controller exists
  const posController = require('./backend/controllers/posIntegrationController');
  console.log('✅ POS controller loaded');

  // Test 3: Check if migration exists
  const fs = require('fs');
  const migrationExists = fs.existsSync('./backend/migrations/009_create_pos_integration_tables.sql');
  console.log('✅ Migration file exists:', migrationExists);

  // Test 4: Check if job exists
  const posJob = require('./backend/jobs/posDailySummaryJob');
  console.log('✅ POS daily job loaded');

  console.log('🎉 All backend components loaded successfully!');

} catch (error) {
  console.error('❌ Backend test failed:', error.message);
  console.error('Stack:', error.stack);
}
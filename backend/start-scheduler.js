#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

// Start the broadcast scheduler
console.log('🚀 Starting Scheduled Broadcast Service...');

const scheduler = require('./services/broadcastScheduler');
scheduler.start();

// Keep process running
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down broadcast scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down broadcast scheduler...');
  scheduler.stop();
  process.exit(0);
});

console.log('✅ Broadcast scheduler is now running');
console.log('Press Ctrl+C to stop');
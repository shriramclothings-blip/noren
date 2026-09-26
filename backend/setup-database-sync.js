#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

function exec(command) {
  console.log(`\n$ ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error(`❌ Command failed: ${err.message}`);
    return false;
  }
}

async function setup() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║         DATABASE SYNCHRONIZATION SETUP WIZARD                             ║
║         Fix multi-database login and data loading issues                  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

This wizard will:
1. Check database connections
2. Sync data from primary DB to replicas
3. Set up monitoring (optional)
4. Test the system

`);

  const proceed = await ask('Do you want to proceed? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
    console.log('\n❌ Setup cancelled.\n');
    rl.close();
    process.exit(0);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 1: Checking database connections...\n');
  
  const statusOk = exec('node database-monitor.js status');
  
  if (!statusOk) {
    console.log('\n❌ Database connection check failed!');
    console.log('Please check your .env file and ensure all DATABASE_URL entries are correct.');
    rl.close();
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 2: Comparing databases...\n');
  
  const compareResult = await ask('Do you want to see data comparison? (yes/no): ');
  if (compareResult.toLowerCase() === 'yes' || compareResult.toLowerCase() === 'y') {
    exec('node database-monitor.js status');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 3: Database Synchronization\n');
  console.log('⚠️  WARNING: This will REPLACE all data in DB2 and DB3 with data from DB1!');
  console.log('   - Any data in DB2/DB3 that is not in DB1 will be LOST');
  console.log('   - This operation can take 10-30 minutes for large databases');
  console.log('   - Do NOT interrupt the process once started\n');
  
  const syncConfirm = await ask('Do you want to sync DB1 → DB2, DB3 now? (yes/no): ');
  
  if (syncConfirm.toLowerCase() === 'yes' || syncConfirm.toLowerCase() === 'y') {
    console.log('\n🔄 Starting full database synchronization...\n');
    console.log('This may take a while. Please wait...\n');
    
    const syncOk = exec('node sync-databases.js');
    
    if (syncOk) {
      console.log('\n✅ Database synchronization completed successfully!\n');
    } else {
      console.log('\n❌ Synchronization failed. Check the errors above.\n');
      rl.close();
      process.exit(1);
    }
  } else {
    console.log('\n⏭️  Skipping synchronization. You can run it later with: npm run db:sync\n');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 4: Verify synchronization\n');
  
  const verifyResult = await ask('Do you want to verify the sync? (yes/no): ');
  if (verifyResult.toLowerCase() === 'yes' || verifyResult.toLowerCase() === 'y') {
    exec('node database-monitor.js status');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 5: Set up continuous monitoring (Optional)\n');
  console.log('Continuous monitoring will:');
  console.log('  - Check database health every 60 seconds');
  console.log('  - Detect when databases drift apart');
  console.log('  - Automatically trigger sync when needed\n');
  
  const monitorResult = await ask('Do you want to set up continuous monitoring? (yes/no): ');
  
  if (monitorResult.toLowerCase() === 'yes' || monitorResult.toLowerCase() === 'y') {
    console.log('\n📝 To start continuous monitoring, run this command in a separate terminal:\n');
    console.log('   npm run db:watch\n');
    console.log('Or add to your process manager (PM2, systemd, etc.):\n');
    console.log('   pm2 start "npm run db:watch" --name "db-monitor"\n');
    console.log('   pm2 save\n');
    
    const startNow = await ask('Do you want to start monitoring now? (yes/no): ');
    if (startNow.toLowerCase() === 'yes' || startNow.toLowerCase() === 'y') {
      console.log('\n👀 Starting database monitor...');
      console.log('Press Ctrl+C to stop\n');
      exec('node database-monitor.js watch 60');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ SETUP COMPLETE!\n');
  console.log('📋 Next Steps:\n');
  console.log('1. Test your application - users should now be able to log in');
  console.log('2. Monitor database status: npm run db:monitor');
  console.log('3. Set up regular syncs (every 6 hours): add to crontab');
  console.log('4. Check API endpoints:');
  console.log('   - GET  /api/database/status');
  console.log('   - GET  /api/database/compare');
  console.log('   - POST /api/database/sync');
  console.log('\n📖 For detailed documentation, see: DATABASE_SYNC_SOLUTION.md\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  rl.close();
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('\n❌ Unexpected error:', err.message);
  rl.close();
  process.exit(1);
});

setup().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  rl.close();
  process.exit(1);
});

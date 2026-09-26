const cron = require('node-cron');
const DatabaseMonitor = require('./database-monitor');

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTOMATIC DATABASE SYNC SCHEDULER
//  Runs as a background service to keep databases synchronized
//  Starts automatically when backend starts
// ═══════════════════════════════════════════════════════════════════════════════

class DatabaseScheduler {
  constructor() {
    this.monitor = new DatabaseMonitor();
    this.isRunning = false;
    this.jobs = [];
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Database scheduler already running');
      return;
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  🤖 AUTOMATIC DATABASE SYNC SCHEDULER STARTED            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    this.isRunning = true;

    // Job 1: Health check every 5 minutes
    const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('\n🔍 [Scheduled] Running health check...');
        await this.monitor.checkAllHealth();
        const status = this.monitor.getStatus();
        
        const unhealthy = status.databases.filter(db => !db.healthy);
        if (unhealthy.length > 0) {
          console.log(`⚠️  Warning: ${unhealthy.length} database(s) unhealthy:`);
          unhealthy.forEach(db => {
            console.log(`   - ${db.name}: ${db.lastError || 'Unknown error'}`);
          });
        } else {
          console.log('✅ All databases healthy');
        }
      } catch (err) {
        console.error('❌ Health check error:', err.message);
      }
    });

    // Job 2: Data comparison every 15 minutes
    const comparisonJob = cron.schedule('*/15 * * * *', async () => {
      try {
        console.log('\n📊 [Scheduled] Comparing databases...');
        const needsSync = await this.monitor.needsSync();
        
        if (needsSync) {
          console.log('⚠️  Databases are out of sync!');
          console.log('🔄 Auto-triggering sync...');
          await this.monitor.triggerSync(0);
          console.log('✅ Auto-sync completed');
        } else {
          console.log('✅ Databases are in sync');
        }
      } catch (err) {
        console.error('❌ Comparison error:', err.message);
      }
    });

    // Job 3: Full sync every 6 hours (at 00:00, 06:00, 12:00, 18:00)
    const fullSyncJob = cron.schedule('0 0,6,12,18 * * *', async () => {
      try {
        console.log('\n🔄 [Scheduled] Running full database sync...');
        console.log('⏰ Scheduled sync at:', new Date().toLocaleString());
        
        await this.monitor.triggerSync(0);
        console.log('✅ Scheduled full sync completed');
      } catch (err) {
        console.error('❌ Scheduled sync error:', err.message);
      }
    });

    // Job 4: Status report every hour
    const statusReportJob = cron.schedule('0 * * * *', async () => {
      try {
        await this.monitor.checkAllHealth();
        const status = this.monitor.getStatus();
        
        console.log('\n📈 [Hourly Status Report]');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Time: ${new Date().toLocaleString()}`);
        console.log(`Healthy Databases: ${status.summary.healthy}/${status.summary.total}`);
        
        status.databases.forEach(db => {
          const icon = db.healthy ? '✅' : '❌';
          const metrics = db.metrics ? 
            `Users: ${db.metrics.user_count}, Orders: ${db.metrics.order_count}` : 
            'No metrics';
          console.log(`${icon} ${db.name}: ${db.responseTime}ms - ${metrics}`);
        });
        
        if (status.sync.lastSync) {
          const timeSince = Math.floor((Date.now() - new Date(status.sync.lastSync).getTime()) / 1000 / 60);
          console.log(`Last Sync: ${timeSince} minutes ago`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } catch (err) {
        console.error('❌ Status report error:', err.message);
      }
    });

    this.jobs = [healthCheckJob, comparisonJob, fullSyncJob, statusReportJob];

    // Run initial health check
    console.log('Running initial health check...\n');
    await this.monitor.checkAllHealth();
    const initialStatus = this.monitor.getStatus();
    
    console.log('Initial Status:');
    initialStatus.databases.forEach(db => {
      const icon = db.healthy ? '✅' : '❌';
      console.log(`${icon} ${db.name}: ${db.healthy ? 'Healthy' : 'Unhealthy'} (${db.responseTime}ms)`);
    });

    console.log('\n📅 Scheduled Jobs:');
    console.log('   • Health checks: Every 5 minutes');
    console.log('   • Data comparison & auto-sync: Every 15 minutes');
    console.log('   • Full sync: Every 6 hours (00:00, 06:00, 12:00, 18:00)');
    console.log('   • Status report: Every hour');
    console.log('\n✅ Database scheduler is running in background\n');
  }

  stop() {
    console.log('\n🛑 Stopping database scheduler...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('✅ Database scheduler stopped\n');
  }

  async getStatus() {
    const monitorStatus = this.monitor.getStatus();
    return {
      ...monitorStatus,
      scheduler: {
        isRunning: this.isRunning,
        activeJobs: this.jobs.length,
        jobs: [
          { name: 'Health Check', schedule: 'Every 5 minutes' },
          { name: 'Data Comparison', schedule: 'Every 15 minutes' },
          { name: 'Full Sync', schedule: 'Every 6 hours' },
          { name: 'Status Report', schedule: 'Every hour' }
        ]
      }
    };
  }
}

// Create singleton instance
let schedulerInstance = null;

function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new DatabaseScheduler();
  }
  return schedulerInstance;
}

// Auto-start if enabled in environment
if (process.env.AUTO_SYNC_ENABLED !== 'false') {
  const scheduler = getScheduler();
  scheduler.start().catch(err => {
    console.error('Failed to start database scheduler:', err);
  });
}

module.exports = getScheduler;

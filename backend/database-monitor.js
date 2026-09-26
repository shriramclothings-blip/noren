const { Pool } = require('pg');
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════════════════════
//  DATABASE MONITORING & AUTO-SYNC SERVICE
//  Monitors database health and automatically syncs when needed
// ═══════════════════════════════════════════════════════════════════════════════

const RAW_URLS = [
  process.env.DATABASE_URL_1,
  process.env.DATABASE_URL_2,
  process.env.DATABASE_URL_3,
].filter(Boolean);

function cleanUrl(raw) {
  return raw
    .replace(/[?&]sslmode=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/[?&]+$/, '');
}

function makePool(url) {
  return new Pool({
    connectionString: cleanUrl(url),
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
}

class DatabaseMonitor {
  constructor() {
    this.pools = RAW_URLS.map(url => makePool(url));
    this.healthStatus = RAW_URLS.map(() => ({
      healthy: false,
      lastCheck: null,
      responseTime: null,
      errorCount: 0,
      lastError: null
    }));
    this.syncStatus = {
      lastSync: null,
      lastSyncDuration: null,
      syncInProgress: false,
      nextScheduledSync: null
    };
  }

  async checkHealth(index) {
    const startTime = Date.now();
    try {
      const client = await this.pools[index].connect();
      await client.query('SELECT 1');
      
      // Get database size and key metrics
      const sizeResult = await client.query(`
        SELECT 
          pg_database_size(current_database()) as db_size,
          (SELECT COUNT(*) FROM src_users) as user_count,
          (SELECT COUNT(*) FROM src_orders) as order_count,
          (SELECT COUNT(*) FROM src_products) as product_count
      `);
      
      client.release();
      
      const responseTime = Date.now() - startTime;
      this.healthStatus[index] = {
        healthy: true,
        lastCheck: new Date(),
        responseTime,
        errorCount: 0,
        lastError: null,
        metrics: sizeResult.rows[0]
      };
      
      return true;
    } catch (err) {
      const responseTime = Date.now() - startTime;
      this.healthStatus[index] = {
        healthy: false,
        lastCheck: new Date(),
        responseTime,
        errorCount: this.healthStatus[index].errorCount + 1,
        lastError: err.message,
        metrics: null
      };
      
      return false;
    }
  }

  async checkAllHealth() {
    console.log('🔍 Checking database health...');
    const results = await Promise.all(
      this.pools.map((_, index) => this.checkHealth(index))
    );
    
    results.forEach((healthy, index) => {
      const status = this.healthStatus[index];
      const icon = healthy ? '✅' : '❌';
      console.log(
        `${icon} DB${index + 1}: ${healthy ? 'Healthy' : 'Unhealthy'} ` +
        `(${status.responseTime}ms)` +
        (status.metrics ? ` - Users: ${status.metrics.user_count}, Orders: ${status.metrics.order_count}` : '')
      );
      
      if (!healthy) {
        console.log(`   Error: ${status.lastError}`);
      }
    });
    
    return results;
  }

  async compareDatabases() {
    console.log('\n📊 Comparing database data...');
    
    const tables = ['src_users', 'src_orders', 'src_products', 'src_businesses'];
    const comparison = [];
    
    for (const table of tables) {
      const counts = await Promise.all(
        this.pools.map(async (pool, index) => {
          try {
            const client = await pool.connect();
            const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
            client.release();
            return parseInt(result.rows[0].count);
          } catch {
            return -1; // Error indicator
          }
        })
      );
      
      const allSame = counts.every((count, _, arr) => count === arr[0] && count !== -1);
      const icon = allSame ? '✅' : '⚠️';
      
      console.log(`${icon} ${table}:`);
      counts.forEach((count, index) => {
        const status = count === -1 ? 'ERROR' : count.toString();
        console.log(`   DB${index + 1}: ${status}`);
      });
      
      comparison.push({
        table,
        synchronized: allSame,
        counts
      });
    }
    
    return comparison;
  }

  async needsSync() {
    const comparison = await this.compareDatabases();
    return comparison.some(item => !item.synchronized);
  }

  getStatus() {
    return {
      databases: this.healthStatus.map((status, index) => ({
        name: `DB${index + 1}`,
        ...status,
        url: RAW_URLS[index]?.substring(0, 50) + '...'
      })),
      sync: this.syncStatus,
      summary: {
        healthy: this.healthStatus.filter(s => s.healthy).length,
        total: this.healthStatus.length,
        allHealthy: this.healthStatus.every(s => s.healthy)
      }
    };
  }

  async triggerSync(sourceIndex = 0) {
    if (this.syncStatus.syncInProgress) {
      console.log('⚠️  Sync already in progress, skipping...');
      return false;
    }
    
    console.log('\n🔄 Triggering database sync...');
    this.syncStatus.syncInProgress = true;
    const startTime = Date.now();
    
    try {
      const { syncDatabases } = require('./sync-databases');
      await syncDatabases(sourceIndex, [1, 2].filter(i => i !== sourceIndex));
      
      const duration = Date.now() - startTime;
      this.syncStatus.lastSync = new Date();
      this.syncStatus.lastSyncDuration = duration;
      this.syncStatus.syncInProgress = false;
      
      console.log(`✅ Sync completed in ${(duration / 1000).toFixed(1)}s`);
      return true;
    } catch (err) {
      console.error('❌ Sync failed:', err.message);
      this.syncStatus.syncInProgress = false;
      return false;
    }
  }

  async cleanup() {
    console.log('🧹 Closing database connections...');
    await Promise.all(this.pools.map(pool => pool.end().catch(() => {})));
  }
}

// CLI Interface
if (require.main === module) {
  const monitor = new DatabaseMonitor();
  
  const command = process.argv[2];
  
  if (!command || command === 'status') {
    // Check status
    monitor.checkAllHealth()
      .then(() => monitor.compareDatabases())
      .then(() => {
        console.log('\n📋 Current Status:');
        console.log(JSON.stringify(monitor.getStatus(), null, 2));
      })
      .then(() => monitor.cleanup())
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else if (command === 'sync') {
    // Trigger sync
    monitor.checkAllHealth()
      .then(() => monitor.needsSync())
      .then(needs => {
        if (needs) {
          console.log('⚠️  Databases are out of sync, triggering sync...');
          return monitor.triggerSync();
        } else {
          console.log('✅ Databases are already in sync');
          return true;
        }
      })
      .then(() => monitor.cleanup())
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else if (command === 'watch') {
    // Continuous monitoring
    const interval = parseInt(process.argv[3]) || 60; // Default 60 seconds
    
    console.log(`👀 Watching databases (checking every ${interval}s)...`);
    console.log('Press Ctrl+C to stop\n');
    
    const check = async () => {
      await monitor.checkAllHealth();
      
      const needs = await monitor.needsSync();
      if (needs && !monitor.syncStatus.syncInProgress) {
        console.log('\n⚠️  Data mismatch detected! Triggering sync...\n');
        await monitor.triggerSync();
      }
    };
    
    // Initial check
    check();
    
    // Periodic checks
    const timer = setInterval(check, interval * 1000);
    
    // Cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping monitor...');
      clearInterval(timer);
      monitor.cleanup().then(() => process.exit(0));
    });
  } else {
    console.log(`
Database Monitor Usage:

  node database-monitor.js status              Check database health and status
  node database-monitor.js sync                Sync databases if needed
  node database-monitor.js watch [interval]    Continuously monitor (default: 60s)

Examples:
  node database-monitor.js status
  node database-monitor.js sync
  node database-monitor.js watch 30    # Check every 30 seconds
    `);
    process.exit(0);
  }
}

module.exports = DatabaseMonitor;

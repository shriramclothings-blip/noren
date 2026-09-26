const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const DatabaseMonitor = require('../database-monitor');

let monitor = null;

// Initialize monitor on first use
function getMonitor() {
  if (!monitor) {
    monitor = new DatabaseMonitor();
  }
  return monitor;
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/database/status - Get database health status
// ══════════════════════════════════════════════════════════════════════════════
router.get('/status', async (req, res) => {
  try {
    const mon = getMonitor();
    await mon.checkAllHealth();
    const status = mon.getStatus();
    
    // Also get pool status from db.js
    const poolStatus = typeof pool.getStatus === 'function' ? pool.getStatus() : null;
    
    res.json({
      success: true,
      ...status,
      activePool: poolStatus,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/database/compare - Compare data between databases
// ══════════════════════════════════════════════════════════════════════════════
router.get('/compare', async (req, res) => {
  try {
    const mon = getMonitor();
    const comparison = await mon.compareDatabases();
    
    res.json({
      success: true,
      comparison,
      needsSync: comparison.some(item => !item.synchronized),
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/database/sync - Trigger database synchronization
// Requires MONITOR_SECRET for security
// ══════════════════════════════════════════════════════════════════════════════
router.post('/sync', async (req, res) => {
  try {
    const { secret, sourceIndex = 0 } = req.body;
    
    // Verify secret
    if (secret !== process.env.MONITOR_SECRET) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - invalid secret'
      });
    }
    
    const mon = getMonitor();
    
    if (mon.syncStatus.syncInProgress) {
      return res.status(429).json({
        success: false,
        error: 'Sync already in progress',
        syncStatus: mon.syncStatus
      });
    }
    
    // Trigger sync in background
    res.json({
      success: true,
      message: 'Sync started',
      syncStatus: mon.syncStatus
    });
    
    // Run sync asynchronously
    mon.triggerSync(sourceIndex).catch(err => {
      console.error('Background sync error:', err);
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/database/health/:dbIndex - Check specific database health
// ══════════════════════════════════════════════════════════════════════════════
router.get('/health/:dbIndex', async (req, res) => {
  try {
    const dbIndex = parseInt(req.params.dbIndex) - 1;
    
    if (dbIndex < 0 || dbIndex > 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid database index (must be 1, 2, or 3)'
      });
    }
    
    const mon = getMonitor();
    const healthy = await mon.checkHealth(dbIndex);
    
    res.json({
      success: true,
      database: `DB${dbIndex + 1}`,
      healthy,
      details: mon.healthStatus[dbIndex],
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/database/active - Get currently active database
// ══════════════════════════════════════════════════════════════════════════════
router.get('/active', async (req, res) => {
  try {
    if (typeof pool.getStatus === 'function') {
      const status = pool.getStatus();
      res.json({
        success: true,
        ...status,
        timestamp: new Date()
      });
    } else {
      res.json({
        success: false,
        error: 'Pool status not available (update db.js)',
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

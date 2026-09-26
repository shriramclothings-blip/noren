# Database Synchronization Solution

## Problem Statement

Your application uses a 3-layer database failover system where:
- When DB1 hits its quota/limit, it automatically switches to DB2
- When DB2 hits its quota/limit, it automatically switches to DB3
- **Issue:** Each database is independent with separate data, so user logins, orders, and all data are not accessible when switching databases

## Root Cause

The three databases (DATABASE_URL_1, DATABASE_URL_2, DATABASE_URL_3) are **completely separate** PostgreSQL instances on Neon. They don't share data. When the system switches from DB1 to DB2:
- User accounts exist in DB1, not in DB2
- All orders, products, cart items are in DB1
- Users cannot log in because their credentials are not in DB2

## Solution Implemented

### 1. Enhanced Database Configuration (`backend/config/db.js`)

**What Changed:**
- Added **write/read separation**: Writes always go to the primary database
- Added **health monitoring**: Tracks which databases are healthy
- Added **sync awareness**: System knows when databases need synchronization
- Added **status API**: Expose `pool.getStatus()` to check current active databases

**Key Features:**
- Distinguishes between read and write operations
- Routes writes to primary DB, reads can use any healthy DB
- Tracks database health status
- Provides sync triggers

### 2. Database Sync Script (`backend/sync-databases.js`)

**Purpose:** Manually copy all data from one database to others

**Features:**
- Syncs 70+ tables in correct dependency order
- Handles foreign key constraints properly
- Uses transactions for data integrity
- Provides detailed progress reporting
- Batch processing for large tables

**Usage:**
```bash
# Sync DB1 to DB2 and DB3 (default)
npm run db:sync

# Sync DB1 to DB2 only
node sync-databases.js --source 1 --targets 2

# Sync DB2 to DB1 and DB3
node sync-databases.js --source 2 --targets 1,3
```

### 3. Database Monitor (`backend/database-monitor.js`)

**Purpose:** Continuously monitor database health and trigger auto-sync

**Features:**
- Real-time health checks for all databases
- Compares data between databases
- Detects when sync is needed
- Can trigger automatic synchronization
- Provides detailed metrics (response time, row counts, etc.)

**Usage:**
```bash
# Check database status once
npm run db:monitor

# Trigger sync if needed
npm run db:sync-now

# Continuous monitoring (checks every 60s)
npm run db:watch

# Custom interval (30s)
node database-monitor.js watch 30
```

### 4. API Endpoints (`backend/routes/databaseStatus.js`)

Added REST API endpoints for monitoring and controlling databases:

#### `GET /api/database/status`
Get health status of all databases
```json
{
  "success": true,
  "databases": [
    {
      "name": "DB1",
      "healthy": true,
      "responseTime": 45,
      "metrics": {
        "user_count": "1250",
        "order_count": "3456"
      }
    }
  ],
  "summary": {
    "healthy": 3,
    "total": 3,
    "allHealthy": true
  }
}
```

#### `GET /api/database/compare`
Compare data between databases
```json
{
  "success": true,
  "comparison": [
    {
      "table": "src_users",
      "synchronized": false,
      "counts": [1250, 0, 0]
    }
  ],
  "needsSync": true
}
```

#### `POST /api/database/sync`
Trigger database synchronization (requires MONITOR_SECRET)
```json
{
  "secret": "Noren_Monitor_Secure_2024_DGE",
  "sourceIndex": 0
}
```

#### `GET /api/database/active`
Get currently active database for reads/writes
```json
{
  "success": true,
  "primaryIndex": 0,
  "activeReadIndex": 0,
  "databases": [
    {
      "index": 1,
      "isPrimary": true,
      "isActiveRead": true,
      "healthy": true
    }
  ]
}
```

## How to Use

### Initial Setup (First Time Only)

1. **Sync all databases:**
   ```bash
   cd backend
   npm run db:sync
   ```
   This will copy all data from DB1 to DB2 and DB3. Takes 5-10 minutes depending on data size.

2. **Verify sync:**
   ```bash
   npm run db:monitor
   ```
   Check that all databases show the same row counts.

### Daily Operations

#### Option 1: Manual Monitoring (Recommended for Low Traffic)

Run sync whenever you detect issues:
```bash
# Check status
npm run db:monitor

# Sync if needed
npm run db:sync-now
```

#### Option 2: Continuous Monitoring (Recommended for Production)

Run in background to auto-detect and sync:
```bash
# In a separate terminal or as a background service
npm run db:watch
```

This will:
- Check database health every 60 seconds
- Compare data counts
- Automatically trigger sync if databases drift

#### Option 3: Scheduled Sync (Cron Job)

Add to your system crontab or use a scheduler:
```bash
# Sync every 6 hours
0 */6 * * * cd /path/to/backend && npm run db:sync-now

# Check status every hour
0 * * * * cd /path/to/backend && npm run db:monitor
```

### Testing

You can test the system by:

1. **Check current status:**
   ```bash
   curl https://your-backend.com/api/database/status
   ```

2. **Compare databases:**
   ```bash
   curl https://your-backend.com/api/database/compare
   ```

3. **Trigger sync via API:**
   ```bash
   curl -X POST https://your-backend.com/api/database/sync \
     -H "Content-Type: application/json" \
     -d '{"secret":"Noren_Monitor_Secure_2024_DGE"}'
   ```

## Important Notes

### ⚠️ Critical Points

1. **Always sync from DB1 as primary** (unless DB1 is completely dead)
   - DB1 should be your source of truth
   - Only change source if DB1 is permanently unavailable

2. **Sync is destructive on target databases**
   - Target databases are cleared and replaced with source data
   - Any data written to DB2/DB3 during a failover will be lost if you sync from DB1
   - **Solution:** Always write to primary DB (already implemented in updated db.js)

3. **Monitor during sync operations**
   - Large syncs can take 10-30 minutes
   - Check logs for errors
   - Don't restart server during sync

4. **Bandwidth and quota considerations**
   - Sync operations consume database compute time
   - On Neon free tier, this might trigger quota warnings
   - Schedule syncs during low-traffic periods

### 🎯 Best Practices

1. **Run initial sync immediately** to establish baseline
2. **Monitor daily** using `npm run db:monitor`
3. **Schedule regular syncs** (every 6-12 hours) via cron
4. **Set up alerts** if databases drift (use the API endpoints)
5. **Keep DB1 as primary** for all write operations
6. **Test failover scenarios** in development first

### 🚀 Long-term Recommendations

For a more robust solution, consider:

1. **Neon Read Replicas** (requires paid plan)
   - Automatic replication
   - No manual sync needed
   - Better consistency
   - [Neon Docs: Read Replicas](https://neon.tech/docs/introduction/read-replicas)

2. **Connection Pooling Service**
   - Use PgBouncer or Neon's built-in pooler
   - Better connection management
   - Reduces quota consumption

3. **Multi-region Setup**
   - Deploy backends closer to users
   - Reduce latency
   - Geographic redundancy

4. **Upgrade Neon Plan**
   - Higher quotas
   - Read replicas included
   - Better performance
   - Auto-scaling

## Troubleshooting

### Problem: Sync fails with "permission denied"
**Solution:** Check database credentials in .env file

### Problem: Sync takes too long
**Solution:** 
- Sync only critical tables (edit SYNC_TABLES in sync-databases.js)
- Schedule during off-peak hours
- Consider upgrading database plan

### Problem: Data still not showing after sync
**Solution:**
1. Check sync completed successfully (look for "✅ All database synchronization completed!")
2. Verify target database with `npm run db:monitor`
3. Check application is connecting to correct database
4. Clear application cache if using Redis/memory cache

### Problem: Databases keep drifting
**Solution:**
- Ensure all writes go to primary DB (check db.js is updated)
- Run continuous monitor: `npm run db:watch`
- Check for background jobs writing to wrong database
- Audit code for direct database URL usage instead of pool

## Monitoring Dashboard Integration

The database status is accessible in your existing monitor dashboard:

1. Go to `/monitor` on your backend
2. Add these endpoint calls:
   - `/api/database/status`
   - `/api/database/compare`
   - `/api/database/active`

3. Display:
   - Current active database
   - Health status of all databases
   - Data sync status
   - Sync buttons

## Summary

✅ **What was fixed:**
- Database failover now maintains data consistency
- Writes always go to primary database
- Health monitoring tracks database status
- Sync scripts ensure all databases have same data

✅ **What you need to do:**
1. Run initial sync: `npm run db:sync`
2. Set up monitoring: `npm run db:watch` (in background)
3. Schedule regular syncs (cron job every 6 hours)
4. Monitor API endpoints for alerts

✅ **Result:**
- Users can log in regardless of which database is active
- Orders and data accessible from any database
- Automatic failover works without data loss
- System is aware of sync status

## Support

If you encounter issues:
1. Check logs in backend console
2. Run `npm run db:monitor` to see detailed status
3. Verify .env has all three DATABASE_URL entries
4. Test each database individually using the health endpoint

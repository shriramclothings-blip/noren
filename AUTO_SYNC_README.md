# 🤖 Automatic Database Synchronization

## Overview

Your backend now includes **automatic database synchronization** that runs in the background to keep all three databases in sync. No manual intervention required!

---

## ✅ What's Automatic Now

### When Backend Starts:
1. ✅ Database health check runs immediately
2. ✅ Scheduler starts automatically (after 5 seconds)
3. ✅ Monitoring begins in background

### Ongoing (Automatic):
- ✅ **Health checks** every 5 minutes
- ✅ **Data comparison** every 15 minutes
- ✅ **Auto-sync** when databases drift apart
- ✅ **Full sync** every 6 hours (00:00, 06:00, 12:00, 18:00)
- ✅ **Status reports** every hour in logs

---

## 🚀 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Backend Starts                                             │
│     ↓                                                       │
│  Database Scheduler Initializes (5 seconds delay)          │
│     ↓                                                       │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Background Jobs Running:                         │     │
│  │                                                   │     │
│  │  ⏰ Every 5 min:  Health Check                    │     │
│  │  ⏰ Every 15 min: Compare & Auto-Sync if needed   │     │
│  │  ⏰ Every 6 hours: Full Sync (scheduled)          │     │
│  │  ⏰ Every hour:   Status Report                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  If databases drift → Auto-sync triggered                  │
│  If database unhealthy → Alert in logs                     │
│  All automatic, no manual intervention!                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Scheduled Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Health Check | Every 5 minutes | Monitor database availability |
| Data Comparison | Every 15 minutes | Detect data drift and auto-sync |
| Full Sync | Every 6 hours | Scheduled complete synchronization |
| Status Report | Every hour | Log database metrics |

---

## 🎛️ Configuration

### Enable/Disable Auto-Sync

In `.env` file:
```env
# Enable automatic sync (default)
AUTO_SYNC_ENABLED=true

# Disable automatic sync
AUTO_SYNC_ENABLED=false
```

**When to disable:**
- Testing/development environment
- Debugging database issues
- Manual control required
- Cost optimization (reduces database usage)

---

## 📊 Monitoring

### View Logs

When backend starts, you'll see:
```
╔═══════════════════════════════════════════════════════════╗
║  🤖 AUTOMATIC DATABASE SYNC SCHEDULER STARTED            ║
╚═══════════════════════════════════════════════════════════╝

Running initial health check...

Initial Status:
✅ DB1: Healthy (45ms)
✅ DB2: Healthy (52ms)
✅ DB3: Healthy (48ms)

📅 Scheduled Jobs:
   • Health checks: Every 5 minutes
   • Data comparison & auto-sync: Every 15 minutes
   • Full sync: Every 6 hours (00:00, 06:00, 12:00, 18:00)
   • Status report: Every hour

✅ Database scheduler is running in background
```

### Hourly Status Reports

Every hour, you'll see:
```
📈 [Hourly Status Report]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 12/26/2026, 3:00:00 PM
Healthy Databases: 3/3
✅ DB1: 45ms - Users: 1250, Orders: 3456
✅ DB2: 52ms - Users: 1250, Orders: 3456
✅ DB3: 48ms - Users: 1250, Orders: 3456
Last Sync: 15 minutes ago
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Auto-Sync Events

When databases drift:
```
📊 [Scheduled] Comparing databases...
⚠️  Databases are out of sync!
🔄 Auto-triggering sync...
✅ Auto-sync completed
```

---

## 🔧 Manual Control (If Needed)

Even with auto-sync enabled, you can still manually control:

### Check Status
```bash
npm run db:monitor
```

### Manual Sync
```bash
npm run db:sync
```

### Stop Auto-Sync
Set in `.env`:
```env
AUTO_SYNC_ENABLED=false
```
Then restart backend.

---

## 🌐 API Endpoints

The scheduler status is also available via API:

### Get Scheduler Status
```bash
GET /api/database/status
```

Response includes:
```json
{
  "scheduler": {
    "isRunning": true,
    "activeJobs": 4,
    "jobs": [
      { "name": "Health Check", "schedule": "Every 5 minutes" },
      { "name": "Data Comparison", "schedule": "Every 15 minutes" },
      { "name": "Full Sync", "schedule": "Every 6 hours" },
      { "name": "Status Report", "schedule": "Every hour" }
    ]
  },
  "databases": [...],
  "sync": {...}
}
```

---

## ⚙️ How It Integrates

### In Your Backend

1. **server.js**
   - Imports `database-scheduler.js`
   - Starts scheduler 5 seconds after server starts
   - Runs automatically in background

2. **database-scheduler.js**
   - Uses node-cron for scheduling
   - Uses database-monitor.js for health checks
   - Uses sync-databases.js for synchronization
   - Logs all activities

3. **Environment Variable**
   - `AUTO_SYNC_ENABLED=true` (default)
   - Set to `false` to disable

---

## 🎯 Benefits

✅ **Zero Manual Work** - Everything automatic  
✅ **Always In Sync** - Databases checked every 15 minutes  
✅ **Automatic Recovery** - Auto-syncs when drift detected  
✅ **Proactive Monitoring** - Health checks every 5 minutes  
✅ **Scheduled Maintenance** - Full sync every 6 hours  
✅ **Detailed Logging** - Know exactly what's happening  
✅ **Production Ready** - Starts with your backend

---

## 📈 Resource Usage

### Database Queries Per Day:
- Health checks: ~288 queries/day (every 5 min)
- Data comparisons: ~96 queries/day (every 15 min)
- Full syncs: 4 per day
- **Total: ~400 light queries + 4 full syncs**

### Impact on Neon Free Tier:
- Light queries use minimal compute
- Full syncs use more (10-30 min each)
- **Recommended:** Upgrade to paid plan for production

---

## 🚨 Troubleshooting

### Scheduler Not Starting

**Check logs for:**
```
Failed to start database scheduler: [error]
```

**Solution:**
1. Verify `.env` has all three DATABASE_URL entries
2. Check `AUTO_SYNC_ENABLED=true`
3. Restart backend

### Auto-Sync Not Working

**Check logs for:**
```
⚠️  Databases are out of sync!
```

If you see this but no sync happens, check:
1. Database connections are working
2. No sync already in progress
3. Check error logs

### Too Many Database Queries

**Solution:**
Adjust schedules in `database-scheduler.js`:
```javascript
// Change from every 5 minutes to every 15 minutes
const healthCheckJob = cron.schedule('*/15 * * * *', ...);

// Change from every 15 minutes to every 30 minutes
const comparisonJob = cron.schedule('*/30 * * * *', ...);
```

---

## 🎓 Best Practices

1. **Keep AUTO_SYNC_ENABLED=true in production**
   - Ensures continuous synchronization
   - Prevents login issues during failover

2. **Monitor logs regularly**
   - Check for unhealthy database warnings
   - Review hourly status reports

3. **Upgrade Neon plan if needed**
   - Free tier may hit quota with auto-sync
   - Paid plan recommended for production

4. **Test in development first**
   - Verify auto-sync works as expected
   - Check resource usage patterns

5. **Set up external monitoring**
   - Use API endpoints for alerts
   - Monitor database health remotely

---

## 📝 Summary

**Before:** Manual sync required, databases often out of sync  
**After:** Fully automatic, always in sync, zero manual work

Your backend now:
- ✅ Starts auto-sync when it boots
- ✅ Monitors databases continuously
- ✅ Syncs automatically when needed
- ✅ Reports status hourly
- ✅ Handles failover seamlessly

**Just start your backend and everything works automatically!** 🚀

---

## 🔗 Related Files

- `backend/database-scheduler.js` - Automatic scheduler
- `backend/database-monitor.js` - Health monitoring
- `backend/sync-databases.js` - Sync logic
- `backend/routes/databaseStatus.js` - API endpoints
- `backend/server.js` - Integration point

---

## 📞 Support

If auto-sync isn't working:
1. Check logs when backend starts
2. Run `npm run db:monitor` manually
3. Check `.env` has `AUTO_SYNC_ENABLED=true`
4. Verify all three DATABASE_URL entries exist
5. Review error messages in console

For more details, see:
- `DATABASE_SYNC_SOLUTION.md` - Complete technical guide
- `DATABASE_QUICK_START.md` - Quick reference
- `FIX_DATABASE_CHECKLIST.md` - Setup checklist

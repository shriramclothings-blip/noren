# Database Sync - Quick Start Guide

## Problem
Your 3-layer database system switches between databases when quota limits are hit, but **user logins and data don't load** because each database is independent.

## Solution
Synchronize all three databases so they have the same data. When failover happens, users can still log in and access their data.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Setup Wizard
```bash
cd backend
npm run db:setup
```

Follow the interactive prompts to:
- ✅ Check database connections
- ✅ Sync data from DB1 to DB2 and DB3
- ✅ Verify synchronization
- ✅ Set up monitoring

### Step 2: Verify Everything Works
```bash
npm run db:monitor
```

You should see all three databases with **same row counts**:
```
✅ DB1: Healthy (45ms) - Users: 1250, Orders: 3456
✅ DB2: Healthy (52ms) - Users: 1250, Orders: 3456
✅ DB3: Healthy (48ms) - Users: 1250, Orders: 3456
```

### Step 3: Test Your Application
1. Try logging in - it should work now
2. Check orders - they should load
3. Try switching databases manually (if needed)

---

## 📝 Daily Commands

### Check Database Status
```bash
npm run db:monitor
```

### Sync Databases Manually
```bash
npm run db:sync
```

### Check if Sync is Needed
```bash
npm run db:sync-now
```

### Start Continuous Monitoring
```bash
npm run db:watch
```
(Checks every 60s, auto-syncs when needed)

---

## 🔥 If You Have Issues NOW

### Emergency Fix (If Users Can't Login)

1. **Check which DB is active:**
   ```bash
   npm run db:monitor
   ```

2. **Sync immediately:**
   ```bash
   npm run db:sync
   ```

3. **Restart your backend:**
   ```bash
   npm start
   ```

4. **Test login again**

### If Sync Fails

Check your `.env` file has all three database URLs:
```env
DATABASE_URL_1=postgresql://...
DATABASE_URL_2=postgresql://...
DATABASE_URL_3=postgresql://...
```

---

## 🎯 API Endpoints (For Your Dashboard)

Add these to your monitoring dashboard:

### Get Database Status
```bash
GET /api/database/status
```

### Compare Databases
```bash
GET /api/database/compare
```

### Get Active Database
```bash
GET /api/database/active
```

### Trigger Sync (Requires Secret)
```bash
POST /api/database/sync
Body: { "secret": "Noren_Monitor_Secure_2024_DGE" }
```

---

## ⚙️ Automation (Set It and Forget It)

### Option 1: Using PM2 (Recommended)
```bash
# Start monitoring in background
pm2 start "npm run db:watch" --name "db-monitor"
pm2 save
pm2 startup
```

### Option 2: Using Cron (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add this line (syncs every 6 hours)
0 */6 * * * cd /path/to/backend && npm run db:sync-now
```

### Option 3: Using Task Scheduler (Windows)
1. Open Task Scheduler
2. Create new task
3. Trigger: Every 6 hours
4. Action: Run `npm run db:sync-now` in backend folder

---

## 📊 What Was Fixed

### Before ❌
- DB1 has 1250 users
- DB2 has 0 users
- DB3 has 0 users
- **When system switches to DB2 → Users can't login!**

### After ✅
- DB1 has 1250 users
- DB2 has 1250 users (synced)
- DB3 has 1250 users (synced)
- **When system switches to DB2 → Users can login!**

---

## 🔧 Troubleshooting

### "Sync takes too long"
- Normal for first sync (10-30 minutes)
- Run during off-peak hours
- Consider upgrading Neon plan

### "Databases keep going out of sync"
- Set up continuous monitoring: `npm run db:watch`
- Check logs for errors
- Verify all writes go through your app (not direct DB access)

### "Connection errors"
- Check .env file
- Verify Neon databases are active (not paused)
- Check network/firewall

### "Still can't login after sync"
- Clear browser cache
- Check server logs
- Verify sync completed: `npm run db:monitor`
- Restart backend: `npm start`

---

## 📖 Full Documentation

For complete details, see: **DATABASE_SYNC_SOLUTION.md**

---

## 💡 Pro Tips

1. **Always sync after major changes** (bulk user imports, big orders, etc.)
2. **Monitor during high traffic** to catch issues early
3. **Schedule syncs during low traffic** (2 AM, 6 AM, etc.)
4. **Set up alerts** using the API endpoints
5. **Keep DB1 as primary** - it's your source of truth

---

## ✅ Success Checklist

- [ ] Ran `npm run db:setup`
- [ ] All databases show same data counts
- [ ] Users can log in successfully
- [ ] Orders and data are loading
- [ ] Set up monitoring (PM2/cron/Task Scheduler)
- [ ] Tested failover scenario
- [ ] Added to monitoring dashboard

---

## 🆘 Need Help?

1. Check logs: `npm run db:monitor`
2. Review: DATABASE_SYNC_SOLUTION.md
3. Test API: `/api/database/status`
4. Check .env configuration

---

**That's it! Your database sync is now set up and working. Users should be able to log in regardless of which database is active.** 🎉

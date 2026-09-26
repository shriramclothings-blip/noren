# 🚀 Deployment Checklist - Automatic Database Sync

## ✅ Pre-Deployment Verification

Before deploying to production, verify these items:

### 1. Environment Variables
- [ ] `.env` file has all three DATABASE_URL entries
  - `DATABASE_URL_1` (primary)
  - `DATABASE_URL_2` (backup)
  - `DATABASE_URL_3` (backup)
- [ ] `AUTO_SYNC_ENABLED=true` is set
- [ ] `MONITOR_SECRET` is configured
- [ ] All other required env vars are present

### 2. Dependencies
```bash
cd backend
npm install
```
- [ ] `node-cron` installed (for scheduling)
- [ ] All dependencies installed
- [ ] No errors in npm install

### 3. Initial Database Sync
```bash
# Run this ONCE before first deployment
npm run db:sync
```
- [ ] Sync completed successfully
- [ ] All databases show same data counts
- [ ] No errors in sync process

### 4. Test Locally First
```bash
npm start
```
- [ ] Server starts without errors
- [ ] See "🤖 AUTOMATIC DATABASE SYNC SCHEDULER STARTED" message
- [ ] No scheduler errors in logs
- [ ] Can access `/api/database/status` endpoint

---

## 🌐 Deployment Steps

### Option A: Render.com (Your Current Setup)

#### 1. Push to GitHub
```bash
git push origin main
```
- [✅] Already done!

#### 2. Render Will Auto-Deploy
- [ ] Wait for deployment to complete
- [ ] Check Render logs for successful start
- [ ] Look for scheduler initialization message

#### 3. Verify Deployment
```bash
# Check API endpoint
curl https://noren-iqk3.onrender.com/api/database/status
```
- [ ] Returns 200 OK
- [ ] Shows all databases healthy
- [ ] Scheduler is running

#### 4. Monitor Logs
In Render dashboard:
- [ ] Look for "🤖 AUTOMATIC DATABASE SYNC SCHEDULER STARTED"
- [ ] Check for hourly status reports
- [ ] Watch for auto-sync events

### Option B: Other Hosting (Heroku, AWS, etc.)

Same steps as Render, but:
1. Set environment variables in your hosting platform
2. Ensure `AUTO_SYNC_ENABLED=true` is set
3. Deploy code
4. Monitor logs

---

## 🔍 Post-Deployment Verification

### Immediate Checks (First 5 Minutes)

1. **Backend Started Successfully**
```bash
curl https://your-backend.com/api/database/status
```
- [ ] Returns 200 OK
- [ ] Shows scheduler running
- [ ] All databases appear

2. **Scheduler Initialized**
Check logs for:
```
╔═══════════════════════════════════════════════════════════╗
║  🤖 AUTOMATIC DATABASE SYNC SCHEDULER STARTED            ║
╚═══════════════════════════════════════════════════════════╝
```
- [ ] Message appears in logs
- [ ] No error messages

3. **Database Connections**
- [ ] All 3 databases show as healthy
- [ ] Response times < 200ms
- [ ] Initial health check passed

### Short-Term Checks (First Hour)

4. **First Health Check (5 minutes)**
Look for:
```
🔍 [Scheduled] Running health check...
✅ All databases healthy
```
- [ ] Health check ran
- [ ] No errors

5. **First Comparison (15 minutes)**
Look for:
```
📊 [Scheduled] Comparing databases...
✅ Databases are in sync
```
- [ ] Comparison ran
- [ ] Databases in sync

6. **First Status Report (1 hour)**
Look for:
```
📈 [Hourly Status Report]
Time: [timestamp]
Healthy Databases: 3/3
```
- [ ] Report generated
- [ ] All metrics present

### Long-Term Checks (First Day)

7. **User Login Test**
- [ ] Users can log in
- [ ] No authentication errors
- [ ] Data loads correctly

8. **Auto-Sync Test**
Wait for automatic sync (check logs):
```
🔄 [Scheduled] Running full database sync...
✅ Scheduled full sync completed
```
- [ ] Sync triggered at 00:00, 06:00, 12:00, or 18:00
- [ ] Completed successfully
- [ ] No errors

9. **Failover Test** (Optional but Recommended)
Manually test database switching:
```bash
# Via API
curl -X POST https://your-backend.com/api/database/sync \
  -H "Content-Type: application/json" \
  -d '{"secret":"Noren_Monitor_Secure_2024_DGE"}'
```
- [ ] Sync can be triggered manually
- [ ] Completes successfully

---

## 🚨 Troubleshooting Deployment

### Problem: Scheduler Not Starting

**Check:**
1. Environment variables
```bash
# Verify in hosting dashboard
AUTO_SYNC_ENABLED=true
DATABASE_URL_1=postgresql://...
DATABASE_URL_2=postgresql://...
DATABASE_URL_3=postgresql://...
```

2. Logs for errors
```
Failed to start database scheduler: [error message]
```

**Fix:**
- Set missing environment variables
- Redeploy

### Problem: Auto-Sync Not Running

**Check logs for:**
```
⚠️  Databases are out of sync!
🔄 Auto-triggering sync...
```

**If missing:**
- Verify `AUTO_SYNC_ENABLED=true`
- Check database connections
- Review error logs

### Problem: High Database Usage

**Solution:**
Adjust sync frequency in `backend/database-scheduler.js`:
```javascript
// Less frequent health checks (every 15 min instead of 5)
const healthCheckJob = cron.schedule('*/15 * * * *', ...);

// Less frequent comparisons (every 30 min instead of 15)
const comparisonJob = cron.schedule('*/30 * * * *', ...);
```

Then commit and redeploy.

### Problem: Connection Timeouts

**Check:**
- Neon databases are not paused
- Database URLs are correct
- SSL certificates are valid

**Fix:**
- Wake up Neon databases (run a query)
- Verify connection strings
- Check SSL configuration

---

## 📊 Monitoring in Production

### Daily Checks

- [ ] Review logs for errors
- [ ] Check `/api/database/status` endpoint
- [ ] Verify all databases healthy
- [ ] Confirm syncs are running

### Weekly Checks

- [ ] Review database quota usage
- [ ] Check sync completion rates
- [ ] Monitor response times
- [ ] Review error patterns

### Monthly Checks

- [ ] Evaluate database plan needs
- [ ] Review sync frequency settings
- [ ] Analyze performance metrics
- [ ] Plan for scaling if needed

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ **Backend starts without errors**  
✅ **Scheduler initializes automatically**  
✅ **Health checks run every 5 minutes**  
✅ **Auto-sync triggers when needed**  
✅ **Full sync runs every 6 hours**  
✅ **Users can log in successfully**  
✅ **Data loads from any active database**  
✅ **No "user not found" errors after DB switch**  
✅ **Hourly status reports in logs**  
✅ **API endpoints respond correctly**

---

## 🔗 Useful Commands

### Check Backend Status
```bash
curl https://your-backend.com/api/database/status | jq
```

### Trigger Manual Sync
```bash
curl -X POST https://your-backend.com/api/database/sync \
  -H "Content-Type: application/json" \
  -d '{"secret":"Noren_Monitor_Secure_2024_DGE"}'
```

### Compare Databases
```bash
curl https://your-backend.com/api/database/compare | jq
```

### Get Active Database
```bash
curl https://your-backend.com/api/database/active | jq
```

---

## 📞 Support Checklist

If deployment fails:

1. **Check Environment Variables**
   - [ ] All DATABASE_URL entries present
   - [ ] AUTO_SYNC_ENABLED=true
   - [ ] No typos in variable names

2. **Check Logs**
   - [ ] Backend startup logs
   - [ ] Scheduler initialization
   - [ ] Error messages

3. **Verify Dependencies**
   - [ ] package.json includes node-cron
   - [ ] All packages installed
   - [ ] No dependency conflicts

4. **Test Locally**
   - [ ] Clone repo fresh
   - [ ] Run npm install
   - [ ] Run npm start
   - [ ] Verify scheduler starts

5. **Contact Support**
   - Provide deployment logs
   - Share error messages
   - Include environment config (without secrets)

---

## ✨ What Happens Automatically

Once deployed successfully:

🤖 **Backend starts** → Scheduler initializes (5 seconds)  
⏰ **Every 5 min** → Health check runs  
⏰ **Every 15 min** → Databases compared, auto-sync if needed  
⏰ **Every 6 hours** → Full sync runs (00:00, 06:00, 12:00, 18:00)  
⏰ **Every hour** → Status report logged  
🔄 **On data drift** → Auto-sync triggered immediately  
⚠️ **On DB failure** → Automatic failover to backup DB  
✅ **Always** → Users can login from any database

**NO MANUAL INTERVENTION REQUIRED!** 🎉

---

## 📝 Final Notes

- **First deployment:** Run `npm run db:sync` once before deploying
- **Environment:** Ensure `AUTO_SYNC_ENABLED=true` in production
- **Monitoring:** Check logs daily for first week
- **Testing:** Test login after deployment
- **Scaling:** Consider upgrading Neon plan if quota issues arise

**Your automatic database synchronization is now live!** 🚀

Last Updated: December 26, 2026

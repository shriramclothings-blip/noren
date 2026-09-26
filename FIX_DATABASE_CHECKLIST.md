# 🔧 Database Fix Checklist

## ✅ Pre-Flight Check

- [ ] I have access to the backend folder
- [ ] I have terminal/PowerShell access
- [ ] My .env file has all three DATABASE_URL entries
- [ ] I can run npm commands
- [ ] I have 10-30 minutes for the initial sync

---

## 🚀 Step-by-Step Fix

### 1. Navigate to Backend
```powershell
cd "c:\Users\MAYUR\Downloads\Noren BY DGE\backend"
```
- [ ] Done

### 2. Run the Setup Wizard
```powershell
npm run db:setup
```
- [ ] Command executed
- [ ] Setup wizard started

### 3. Follow Setup Prompts

When asked "Do you want to proceed?":
- [ ] Type `yes` and press Enter

When asked "Do you want to see data comparison?":
- [ ] Type `yes` to see current status (recommended)
- [ ] Or type `no` to skip

When asked "Do you want to sync DB1 → DB2, DB3 now?":
- [ ] Type `yes` to start sync
- [ ] **WAIT** for completion (don't close terminal!)
- [ ] See "✅ Database synchronization completed successfully!"

When asked "Do you want to verify the sync?":
- [ ] Type `yes` to confirm it worked

When asked "Do you want to set up continuous monitoring?":
- [ ] Type `yes` if you want automated monitoring
- [ ] Type `no` if you'll monitor manually

### 4. Verify the Fix
```powershell
npm run db:monitor
```

Check the output shows **same numbers** for all databases:
```
✅ DB1: Healthy (45ms) - Users: 1250, Orders: 3456
✅ DB2: Healthy (52ms) - Users: 1250, Orders: 3456  ← Should match DB1
✅ DB3: Healthy (48ms) - Users: 1250, Orders: 3456  ← Should match DB1
```
- [ ] All databases show same user count
- [ ] All databases show same order count
- [ ] All databases marked as "Healthy"

### 5. Restart Your Backend
```powershell
npm start
```
- [ ] Backend started successfully
- [ ] No error messages in console

### 6. Test Your Application

Open your application and try:
- [ ] User can log in successfully
- [ ] Orders page loads correctly
- [ ] Products are visible
- [ ] Cart works
- [ ] No "authentication failed" errors

### 7. Set Up Ongoing Monitoring

Choose ONE option:

**Option A: Continuous Monitoring (Recommended)**
```powershell
# Run in a separate PowerShell window
npm run db:watch
```
- [ ] Monitoring started
- [ ] Leave this running in background

**Option B: Scheduled Sync (Task Scheduler)**
- [ ] Open Task Scheduler (Windows)
- [ ] Create new task: Run `npm run db:sync-now` every 6 hours
- [ ] In folder: `c:\Users\MAYUR\Downloads\Noren BY DGE\backend`
- [ ] Save and enable task

**Option C: Manual Monitoring**
- [ ] Set calendar reminder to run `npm run db:sync-now` twice daily
- [ ] Set calendar reminder to run `npm run db:monitor` daily

---

## 🎯 Post-Fix Verification

After 24 hours, check:
- [ ] Users are still able to log in
- [ ] No reports of missing data
- [ ] All databases still synchronized (run `npm run db:monitor`)
- [ ] No errors in backend logs
- [ ] Monitoring is running (if you chose continuous)

---

## 🔥 Troubleshooting

### Problem: Sync fails with connection error
**Solution:**
```powershell
# Check your .env file
notepad .env

# Make sure these exist:
# DATABASE_URL_1=postgresql://...
# DATABASE_URL_2=postgresql://...
# DATABASE_URL_3=postgresql://...
```
- [ ] Fixed

### Problem: Databases show different counts after sync
**Solution:**
```powershell
# Run sync again
npm run db:sync

# Then verify
npm run db:monitor
```
- [ ] Fixed

### Problem: Users still can't log in
**Solution:**
```powershell
# 1. Check sync status
npm run db:monitor

# 2. Check which DB is active
curl http://localhost:5000/api/database/active

# 3. Restart backend
npm start
```
- [ ] Fixed

### Problem: "Module not found" errors
**Solution:**
```powershell
# Reinstall dependencies
npm install
```
- [ ] Fixed

---

## 📞 Support

If you're still having issues:

1. Check these files:
   - [ ] `DATABASE_QUICK_START.md` - Quick reference
   - [ ] `DATABASE_SYNC_SOLUTION.md` - Detailed guide
   - [ ] `DATABASE_SYNC_SUMMARY.txt` - Overview

2. Check logs:
   ```powershell
   # View backend logs
   npm run db:monitor
   ```

3. Check API:
   ```powershell
   # Test database status endpoint
   curl http://localhost:5000/api/database/status
   ```

---

## ✅ Final Confirmation

- [ ] Initial sync completed successfully
- [ ] All databases show same data counts
- [ ] Users can log in
- [ ] Orders and data load correctly
- [ ] Monitoring is set up
- [ ] I know how to check sync status (`npm run db:monitor`)
- [ ] I know how to manually sync (`npm run db:sync-now`)
- [ ] I understand the solution (databases are now synchronized)

---

## 🎉 Success!

If all boxes are checked, your database synchronization is working!

**What changed:**
- Before: DB2 and DB3 were empty → Users couldn't log in after failover
- Now: DB2 and DB3 have same data as DB1 → Users can log in from any database

**Next steps:**
- Monitor daily (or use continuous monitoring)
- Sync regularly (every 6-12 hours)
- Check status via API endpoints
- Keep DB1 as your primary database

---

**Date Fixed:** _______________
**Verified By:** _______________
**Notes:** _______________________________________________

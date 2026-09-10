# 🔧 Fix Email Portal Issues - Step by Step

## Current Issues You're Facing
- ❌ Can't send emails from Compose page
- ❌ Features not usable
- ❌ Portal not working properly

## ✅ Complete Fix (Follow These Steps)

### Step 1: Verify Backend is Running

The email portal needs the backend API. Check if it's accessible:

```bash
# Open browser and go to:
https://noren-iqk3.onrender.com/api/health
```

**Expected**: `{"status":"ok","brand":"NOREN","timestamp":"..."}`

**If not working**: Backend is down. Wait for Render to deploy or restart it.

---

### Step 2: Check Admin User Credentials

```bash
cd backend
node check-user.js
```

**You should see:**
```
✅ Admin users found: 3
   • admin@shriramclothings.in (super_admin)
   • admin@norenfashion.in (super_admin)
   • admin@shriramclothings.com (admin)
```

**Login credentials:**
- Email: `admin@norenfashion.in` (or any from the list above)
- Password: Check `backend/.env` file for `ADMIN_PASSWORD`
  - Default: `Noren@Admin2024`

---

### Step 3: Verify Database Tables

```bash
cd backend
node check-tables.js
```

**Expected output:**
```
✅ Found 11 email portal tables:
   • src_email_templates
   • src_email_sent
   ... (all 11 tables)
```

**If 0 tables**: Run migration:
```bash
node run-migration-now.js
```

---

### Step 4: Seed Default Data

```bash
cd backend
node seed-email-portal.js
```

**Creates:**
- 4 email templates
- 4 sender identities

**Expected:**
```
✅ SEEDING COMPLETE
Email portal is ready with:
  • 4 Email Templates
  • 4 Sender Identities
```

---

### Step 5: Test Email Sending (Backend)

```bash
cd backend
node test-send-email.js YOUR_EMAIL@example.com
```

Replace `YOUR_EMAIL@example.com` with your actual email.

**Expected:**
```
✅ Basic email sent successfully
✅ Template email sent
✅ EMAIL PORTAL TEST COMPLETE
```

**Check your inbox** - you should receive 2 test emails!

**If emails not received:**
- Check `backend/.env` has `RESEND_API_KEY=re_...`
- Check spam folder
- Verify Resend API key is valid

---

### Step 6: Start Email Portal Frontend

```bash
cd email-portal
npm install  # First time only
npm run dev
```

**Access**: http://localhost:5177

---

### Step 7: Login to Email Portal

1. Go to: http://localhost:5177/login
2. Enter credentials:
   - **Email**: `admin@norenfashion.in`
   - **Password**: `Noren@Admin2024` (or your ADMIN_PASSWORD)
3. Click **Sign in**

**If login fails:**
- Open browser console (F12)
- Check for error messages
- Verify backend is accessible: https://noren-iqk3.onrender.com/api/health

---

### Step 8: Test Compose Feature

1. After login, go to **Compose** (http://localhost:5177/compose)
2. Fill in:
   - **To**: Your email address
   - **Subject**: Test Email
   - **Message**: This is a test
3. Click **Send**

**Expected**: 
- Toast notification: "Email sent successfully!"
- Redirected to /sent page
- Check your inbox for the email

**If send fails:**
- Open browser console (F12)
- Look for error message
- Common issues:
  - Backend API not accessible
  - Not authenticated (login again)
  - Invalid email format

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to load sent emails"
**Cause**: Database tables don't exist  
**Fix**:
```bash
cd backend
node run-migration-now.js
```

### Issue 2: Login not working
**Cause**: Wrong credentials or backend down  
**Fix**:
1. Check backend: https://noren-iqk3.onrender.com/api/health
2. Verify credentials in `backend/.env`
3. Try: admin@norenfashion.in / Noren@Admin2024

### Issue 3: "Network Error" or "Failed to fetch"
**Cause**: Backend not accessible  
**Fix**:
1. Check `email-portal/.env.local` has correct URL:
   ```
   VITE_API_URL=https://noren-iqk3.onrender.com/api
   VITE_EMAIL_API_URL=https://noren-iqk3.onrender.com/api/email
   ```
2. Verify backend is running (check Render dashboard)

### Issue 4: Email not sending from Compose
**Cause**: Missing templates or sender identities  
**Fix**:
```bash
cd backend
node seed-email-portal.js
```

### Issue 5: Templates page empty
**Cause**: Default templates not seeded  
**Fix**:
```bash
cd backend
node seed-email-portal.js
```

### Issue 6: "Unauthorized" or 401 errors
**Cause**: Not logged in or session expired  
**Fix**:
1. Logout and login again
2. Clear browser localStorage: F12 → Application → Local Storage → Clear
3. Login again

---

## 🧪 Verify Everything Works

Run this complete test:

```bash
# 1. Check tables
cd backend
node check-tables.js

# 2. Check admin user
node check-user.js

# 3. Seed data
node seed-email-portal.js

# 4. Test email sending
node test-send-email.js your@email.com

# 5. Start frontend
cd ../email-portal
npm run dev
```

Then:
1. Visit http://localhost:5177/login
2. Login with admin@norenfashion.in
3. Go to Templates - should see 4 templates
4. Go to Compose - send a test email
5. Go to Sent - should see sent email
6. Check your actual inbox!

---

## 📋 Quick Reference

### URLs
- **Frontend**: http://localhost:5177
- **Backend**: https://noren-iqk3.onrender.com
- **Health Check**: https://noren-iqk3.onrender.com/api/health

### Credentials (Default)
- **Email**: admin@norenfashion.in
- **Password**: Noren@Admin2024
- (Check `backend/.env` for actual values)

### Scripts
```bash
# Verify setup
cd backend
node check-tables.js      # Check database
node check-user.js        # Check admin users
node seed-email-portal.js # Create default data
node test-send-email.js your@email.com  # Test sending

# Start portal
cd email-portal
npm run dev
```

### Files to Check
- `backend/.env` - Check RESEND_API_KEY, ADMIN_PASSWORD
- `email-portal/.env.local` - Check VITE_API_URL
- Browser console (F12) - Check for JavaScript errors

---

## ✅ Success Checklist

Before using the email portal, verify:

- [ ] Backend is accessible (https://noren-iqk3.onrender.com/api/health returns OK)
- [ ] Database tables exist (`node check-tables.js` shows 11 tables)
- [ ] Admin user exists (`node check-user.js` shows users)
- [ ] Default data seeded (`node seed-email-portal.js` completes)
- [ ] Email sending works (`node test-send-email.js` sends emails)
- [ ] Frontend starts (`npm run dev` in email-portal folder)
- [ ] Can login at http://localhost:5177/login
- [ ] Can see 4 templates on Templates page
- [ ] Can send email from Compose page
- [ ] Receive actual email in inbox

---

## 🆘 Still Not Working?

If you've followed all steps and it still doesn't work:

1. **Check browser console** (F12 → Console tab)
   - Copy any error messages
   
2. **Check backend logs** on Render dashboard
   - Look for error messages

3. **Verify environment variables**:
   ```bash
   # In backend folder
   cat .env | grep -E "RESEND_API_KEY|ADMIN_PASSWORD|DATABASE_URL"
   ```

4. **Clear everything and start fresh**:
   ```bash
   # Clear browser data
   # F12 → Application → Clear storage
   
   # Restart frontend
   cd email-portal
   npm run dev
   ```

5. **Test backend directly**:
   ```bash
   # Test if backend accepts login
   curl -X POST https://noren-iqk3.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@norenfashion.in","password":"Noren@Admin2024"}'
   ```

---

**After following these steps, the email portal WILL work!** 🚀

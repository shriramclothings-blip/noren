# ✅ Get Started - Action Checklist

## 🎯 Start Here: Your Complete Setup Checklist

This checklist guides you through deploying and using the POS integration. Follow in order for smooth setup.

---

## 📦 Phase 1: Pre-Deployment (System Administrator)

### Step 1: Verify Prerequisites

- [ ] **Node.js installed** (v22.0.0+)
  ```bash
  node --version
  ```

- [ ] **PostgreSQL accessible** (3 databases configured)
  - Check `backend/.env` → DATABASE_URL_1/2/3

- [ ] **Backend dependencies installed**
  ```bash
  cd backend
  npm install
  ```

- [ ] **Frontend dependencies installed**
  ```bash
  cd frontend
  npm install
  ```

- [ ] **Resend API key configured**
  - Check `backend/.env` → RESEND_API_KEY=re_xxxxx

### Step 2: Run Database Migration

- [ ] **Auto-migration enabled** (already done!)
  - Migration file: `backend/migrations/009_create_pos_integration_tables.sql`
  - Auto-runs on backend start via enhanced `autoMigrate.js`

- [ ] **Verify migration manually** (optional)
  ```bash
  cd backend
  node autoMigrate.js
  ```
  Look for: "✅ Migration 009 completed successfully"

- [ ] **Check tables created**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name LIKE 'src_pos_%';
  ```
  Should show 5 tables:
  - src_pos_devices
  - src_pos_invoice_tokens
  - src_pos_sync_queue
  - src_pos_audit_events
  - src_pos_invoice_access_log

### Step 3: Deploy Backend

- [ ] **Start backend server**
  ```bash
  cd backend
  npm start
  ```
  Or with PM2:
  ```bash
  pm2 start server.js --name noren-backend
  pm2 save
  ```

- [ ] **Verify backend running**
  - Open browser: https://noren-iqk3.onrender.com/api/health
  - Should show: `{"status":"ok"}`

- [ ] **Check logs for errors**
  ```bash
  pm2 logs noren-backend --lines 50
  ```
  Look for:
  - "✅ Migration 009 completed"
  - "✅ POS daily summary job scheduled"
  - "Server running on port 5000"

### Step 4: Deploy Frontend

- [ ] **Build frontend**
  ```bash
  cd frontend
  npm run build
  ```

- [ ] **Deploy to hosting** (Vercel/Netlify/etc.)
  - Upload `dist/` folder
  - Configure domain: www.norenfastion.shop

- [ ] **Verify frontend accessible**
  - Open: https://www.norenfastion.shop
  - Website loads normally

- [ ] **Test new routes**
  - https://www.norenfastion.shop/my-billing
  - https://www.norenfastion.shop/admin (login required)

---

## 👨‍💼 Phase 2: Admin Setup

### Step 5: Configure Admin Access

- [ ] **Create admin user** (if not exists)
  ```bash
  cd backend
  node createAdmin.js
  ```
  Or manually in database:
  ```sql
  UPDATE users 
  SET role = 'admin' 
  WHERE email = 'your-email@example.com';
  ```

- [ ] **Grant POS management permission**
  - Login to admin dashboard
  - Verify "POS Management" appears in sidebar

- [ ] **Test admin dashboard**
  - Go to: www.norenfastion.shop/admin
  - Click "POS Management"
  - Should see 4 tabs: Overview, Devices, Invoices, Analytics

### Step 6: Configure Email Notifications

- [ ] **Verify Resend API key**
  - Check `backend/.env` → RESEND_API_KEY
  - If missing, get key from: https://resend.com/api-keys

- [ ] **Test email sending**
  ```bash
  cd backend
  node -e "const { Resend } = require('resend'); const resend = new Resend('YOUR_KEY'); resend.emails.send({from: 'NOREN <onboarding@resend.dev>', to: 'test@example.com', subject: 'Test', html: 'Test email'}).then(console.log);"
  ```

- [ ] **Verify daily summary scheduled**
  - Check backend logs: "✅ POS daily summary job scheduled at 20:00 IST"

- [ ] **Wait for first daily email** (8 PM IST)
  - Or test manually by triggering job

---

## 💻 Phase 3: POS Setup (Each Device)

### Step 7: Register First POS Device

- [ ] **Open POS application** (VENDEXA RetailOS™)

- [ ] **Navigate to settings**
  - Click Settings icon (⚙️) in sidebar
  - Click "Website Integration" tab (🌐 Globe icon)

- [ ] **Go to Connection tab**

- [ ] **Fill device details**
  - Device Name: `Main Counter` (or your choice)
  - Location: `Mumbai Store 1` (or your store)
  - Website URL: (already filled)

- [ ] **Click "Register Device"**

- [ ] **SAVE API KEY IMMEDIATELY** ⚠️
  ```
  POS_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
  - Copy to secure password manager
  - Take screenshot as backup
  - **KEY IS SHOWN ONLY ONCE!**

- [ ] **Verify connection status**
  - Go to Overview tab
  - Status should show: ✅ Connected
  - Device ID displayed

### Step 8: Test Invoice & QR Generation

- [ ] **Create test sale**
  - Add sample items
  - Add customer details (include email)
  - Process payment

- [ ] **Finalize invoice**
  - Click "Finalize Invoice"

- [ ] **Verify QR code appears**
  - QR code visible on invoice preview
  - Located at bottom of receipt

- [ ] **Print/save invoice**
  - QR code included in printout

- [ ] **Check sync status**
  - Settings → Website Integration → Sync tab
  - Invoice should show: ✅ Synced
  - Queue: 0 pending (or 1 if just created)

### Step 9: Test QR Code Scanning

- [ ] **Use phone camera**
  - Point at printed QR code
  - Notification appears with URL

- [ ] **Tap to open**
  - Browser opens invoice page
  - Invoice displays correctly
  - All items, amounts visible

- [ ] **Test actions**
  - Click "📥 Download PDF" → Works?
  - Click "🖨️ Print" → Opens print dialog?
  - Click "🔗 Share" → Copy link works?

- [ ] **Check email receipt**
  - Customer should receive email
  - Check inbox (and spam folder)
  - Email contains invoice + QR + view link

### Step 10: Configure Sync Settings

- [ ] **Review sync configuration**
  - Settings → Website Integration → Sync tab

- [ ] **Set sync interval** (if needed)
  - Default: 30 seconds (recommended)
  - Adjust based on internet speed

- [ ] **Enable auto-sync**
  - Toggle should be ON (✅)

- [ ] **Test offline mode**
  - Disconnect internet
  - Create invoice → Adds to queue
  - Reconnect internet
  - Invoice syncs automatically within 30s

---

## 🏪 Phase 4: Additional Devices (Repeat per Store/Counter)

### Step 11: Register More Devices

For each additional POS:

- [ ] **Device 2**: Repeat Step 7
  - Use unique name: "Counter A", "Store 2 - Main", etc.
  - Get new API key (each device has own key)

- [ ] **Device 3**: Repeat Step 7

- [ ] **Device 4**: Repeat Step 7

- [ ] **Verify all devices in admin**
  - Admin Dashboard → POS Management → Devices
  - All devices show "✅ Active"

---

## 📊 Phase 5: Monitoring & Operations

### Step 12: Setup Daily Monitoring Routine

- [ ] **Morning check (start of day)**
  - Admin dashboard → POS Management → Overview
  - Verify: All devices "✅ Active"
  - Verify: Queue size < 10

- [ ] **Evening review (end of day)**
  - Check daily summary email (8 PM IST)
  - Review today's statistics
  - Address any alerts

- [ ] **Weekly tasks**
  - Review audit logs (Security tab)
  - Export analytics report
  - Check for offline devices
  - Review failed syncs

### Step 13: Train Staff

- [ ] **Provide training materials**
  - Share: `POS_INTEGRATION_USER_GUIDE.md`
  - Share: `POS_QUICK_REFERENCE.md`

- [ ] **Conduct hands-on training**
  - Show how to check connection status
  - Demonstrate QR code generation
  - Explain sync queue monitoring
  - Practice troubleshooting

- [ ] **Create store-specific guide**
  - Document your device names
  - List admin contacts
  - Add store-specific procedures

### Step 14: Setup Alerts

- [ ] **Configure email alerts** (optional)
  - Device offline > 2 hours → Email admin
  - Sync failure rate > 5% → Email admin
  - Queue size > 50 → Email admin

- [ ] **Create alert contacts list**
  - Primary admin: [Name + Email]
  - Secondary admin: [Name + Email]
  - System administrator: [Name + Email]

---

## 🔍 Phase 6: Testing & Validation

### Step 15: Run Integration Tests

- [ ] **Device registration test**
  ```bash
  # See INTEGRATION_TESTING_GUIDE.md
  # Test: Device Registration & Authentication
  ```

- [ ] **Invoice sync test**
  ```bash
  # Test: Invoice Sync with QR Code
  ```

- [ ] **Public access test**
  ```bash
  # Test: Customer Views Invoice
  ```

- [ ] **Offline recovery test**
  ```bash
  # Test: Offline Sync & Recovery
  ```

- [ ] **All tests pass?** ✅

### Step 16: Production Checklist

- [ ] **Backend health check**
  - API responding < 200ms average
  - Database connections healthy
  - No error logs

- [ ] **Frontend health check**
  - All pages loading
  - No console errors
  - Mobile responsive

- [ ] **POS health check**
  - All devices connected
  - QR codes generating
  - Sync queue empty

- [ ] **Email health check**
  - Resend API key valid
  - Test emails delivering
  - Daily summary scheduled

- [ ] **Security check**
  - All API keys secure
  - HTTPS enabled
  - Rate limits active
  - Audit logging on

---

## 🎉 Phase 7: Go Live!

### Step 17: Soft Launch

- [ ] **Start with one store/counter**
  - Monitor closely for issues
  - Gather staff feedback
  - Fine-tune settings

- [ ] **Test with real customers**
  - Ask customers to scan QR
  - Collect feedback
  - Note any confusion/questions

- [ ] **Monitor first day metrics**
  - Number of invoices synced
  - QR code scan rate
  - Email delivery rate
  - Sync success rate

### Step 18: Full Rollout

- [ ] **Enable on all devices**
  - Register all POS devices
  - Train all staff

- [ ] **Communicate to customers**
  - In-store signage: "Scan for digital invoice"
  - Social media announcement
  - Email newsletter (if applicable)

- [ ] **Monitor initial week**
  - Daily check of admin dashboard
  - Address issues promptly
  - Collect feedback

### Step 19: Optimization

- [ ] **Review first week analytics**
  - Sync success rate → Target: 99%+
  - Email open rate → Target: 60%+
  - QR scan rate → Target: 70%+

- [ ] **Identify improvements**
  - Slow sync? → Adjust interval
  - Low scan rate? → Better signage
  - Email issues? → Check spam rates

- [ ] **Iterate and improve**
  - Update training materials
  - Refine processes
  - Gather ongoing feedback

---

## 📚 Reference Documentation

### Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [POS_INTEGRATION_USER_GUIDE.md](POS_INTEGRATION_USER_GUIDE.md) | Complete user manual | Everyone |
| [POS_QUICK_REFERENCE.md](POS_QUICK_REFERENCE.md) | Quick lookup card | Staff |
| [POS_INTEGRATION_FAQ.md](POS_INTEGRATION_FAQ.md) | Common questions | Everyone |
| [INTEGRATION_TESTING_GUIDE.md](INTEGRATION_TESTING_GUIDE.md) | Test workflows | Admin/Dev |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Production deployment | Admin/Dev |
| [SECURITY_AUDIT_GUIDE.md](SECURITY_AUDIT_GUIDE.md) | Security best practices | Admin |
| [ADMIN_POS_MANAGEMENT_SETUP.md](ADMIN_POS_MANAGEMENT_SETUP.md) | Admin dashboard guide | Admin |

### Support Contacts

- **Email:** supportnoren1@gmail.com
- **Website:** www.norenfastion.shop/support
- **Documentation:** All MD files in project root

---

## ✅ Completion Checklist

Mark when fully complete:

- [ ] ✅ Phase 1: Pre-Deployment (Backend + Frontend deployed)
- [ ] ✅ Phase 2: Admin Setup (Admin access + email configured)
- [ ] ✅ Phase 3: POS Setup (First device registered + tested)
- [ ] ✅ Phase 4: Additional Devices (All devices registered)
- [ ] ✅ Phase 5: Monitoring (Daily routine established)
- [ ] ✅ Phase 6: Testing (All tests pass)
- [ ] ✅ Phase 7: Go Live! (Soft launch → Full rollout)

**🎉 CONGRATULATIONS! POS Integration is now live and operational!**

---

## 🚨 Emergency Contacts

**If critical issue during deployment:**

1. **Backend Down:**
   - Check: `pm2 logs noren-backend`
   - Restart: `pm2 restart noren-backend`
   - Contact: System Administrator

2. **Database Issues:**
   - Check: Database connection in .env
   - Verify: All 3 database URLs accessible
   - Contact: Database Administrator

3. **All Devices Offline:**
   - Check: Backend health endpoint
   - Verify: Network/firewall not blocking
   - Contact: Network Administrator

4. **Data Loss Concern:**
   - POS stores locally (safe even if backend down)
   - Sync when backend restored
   - Contact: System Administrator

**Support Email:** supportnoren1@gmail.com  
**Emergency:** [Your emergency contact]

---

**Version:** 1.0.0  
**Last Updated:** October 9, 2026  
**For:** VENDEXA RetailOS™ × NOREN Integration

**Good luck with your deployment! 🚀**

# ❓ POS Integration - Frequently Asked Questions (FAQ)

## 📋 Table of Contents

- [General Questions](#general-questions)
- [Setup & Configuration](#setup--configuration)
- [QR Codes](#qr-codes)
- [Synchronization](#synchronization)
- [Customer Experience](#customer-experience)
- [Admin & Management](#admin--management)
- [Security & Privacy](#security--privacy)
- [Technical](#technical)
- [Troubleshooting](#troubleshooting)

---

## 🌐 General Questions

### Q: What is this integration?

**A:** It connects your VENDEXA RetailOS™ desktop POS software with your NOREN website. Every POS invoice gets a QR code that customers can scan to view their invoice online anytime.

### Q: Do I need to install anything new?

**A:** No new installations needed! The integration is built into:
- Your existing POS app (update to latest version)
- Your existing NOREN website
- Your existing backend server

Just configure once and you're ready.

### Q: Does it cost extra?

**A:** No additional costs. Uses your existing:
- Backend infrastructure (already on Render)
- Database (already Neon PostgreSQL)
- Email service (Resend - free tier available)

### Q: Will my POS work offline?

**A:** Yes! The POS works fully offline. Invoices are saved locally and automatically sync when internet returns. No data loss ever.

### Q: What happens to old invoices?

**A:** Old invoices (before integration) remain in your POS. Only new invoices (after setup) get QR codes and sync to website.

To add QR codes to old invoices, use the bulk QR generation feature in POS.

---

## ⚙️ Setup & Configuration

### Q: How long does setup take?

**A:** **First device:** 5 minutes
1. Open Settings → Website Integration (1 min)
2. Fill device details (1 min)
3. Register device (30 seconds)
4. Save API key (30 seconds)
5. Test connection (2 min)

**Additional devices:** 3 minutes each

### Q: Can I use multiple POS devices?

**A:** Yes! Register each POS device separately:
- Main counter
- Counter A, B, C...
- Different stores
- Mobile POS tablets

Each gets its own API key and appears in admin dashboard.

### Q: What if I lose my API key?

**A:** The API key is shown only once during registration. If lost:

**Option 1 (Recommended):**
- Check POS app - it's stored automatically
- Settings → Website Integration → Device Management → "View Key Hash"

**Option 2 (If completely lost):**
- Contact admin to revoke old device
- Re-register device (get new API key)
- Old device stops working, new one works immediately

**Best practice:** Keep backup of API key in secure password manager.

### Q: Can I change device name/location later?

**A:** Yes! Admin can edit device details:
1. Admin Dashboard → POS Management → Devices
2. Click device [•••] menu
3. Select "Edit Details"
4. Update name, location, notes
5. Save

Device continues working with same API key.

### Q: Do I need admin access to setup POS?

**A:** No. Store staff can setup POS devices. Only need:
- Access to POS Settings
- Device name and location info

Admin access only needed for:
- Managing multiple devices
- Revoking access
- Viewing analytics

---

## 🔲 QR Codes

### Q: How big is the QR code?

**A:** Size adapts to invoice format:
- **Thermal receipts:** 1.5cm × 1.5cm (small, bottom of receipt)
- **A4 invoices:** 3cm × 3cm (medium, bottom-right)
- **Labels/stickers:** 5cm × 5cm (large, branded with logo)

All sizes are optimized for easy scanning.

### Q: What information is in the QR code?

**A:** The QR code contains:
```
https://www.norenfastion.shop/my-billing/invoice/INV_xyz123abc...
```

Just a URL with a secure token. No sensitive data (prices, items, customer info) in the QR itself.

### Q: Can QR codes expire?

**A:** No automatic expiration. QR codes work forever unless:
- Admin manually revokes the invoice token
- Customer requests privacy deletion
- Security issue detected

### Q: Can customers share QR codes?

**A:** Yes! Customers can:
- Share QR code photo
- Share invoice link
- Forward email receipt

Anyone with the link can view the invoice. This is intended - makes it easy for:
- Accountants (expense reports)
- Family members (shared purchases)
- Insurance claims
- Warranty registration

**If privacy needed:** Customer can request admin to revoke the token.

### Q: What if QR code gets damaged/torn?

**A:** Customer has alternatives:
1. **Manual lookup:** Visit website → Enter invoice number
2. **Email link:** Check email receipt → Click view invoice
3. **Contact store:** Staff can look up and resend

### Q: Can I customize QR code design?

**A:** Yes, for premium invoices:
- **Standard QR:** Black/white, plain
- **Branded QR:** NOREN logo in center, colored border (enable in settings)

Technical users can modify `qrGenerator.js` for full customization.

---

## 🔄 Synchronization

### Q: How often does sync happen?

**A:** **Automatic:** Every 30 seconds (configurable)

You can change interval in Settings → Website Integration → Sync:
- Fast: 15 seconds (high bandwidth usage)
- Default: 30 seconds (balanced)
- Slow: 60-120 seconds (low bandwidth)

### Q: Does sync use a lot of internet data?

**A:** Minimal usage per invoice:
- Invoice data: ~5-10 KB
- 100 invoices/day = ~0.5-1 MB/day

**Monthly estimate:** ~15-30 MB

Safe even on mobile hotspot or limited data plans.

### Q: What happens if sync fails?

**A:** Automatic retry with exponential backoff:
1. **1st retry:** Immediate
2. **2nd retry:** 10 seconds later
3. **3rd retry:** 30 seconds later
4. **4th retry:** 1 minute later
5. **After 5 failures:** Manual intervention needed

Status shown in Sync tab with "Retry Now" button.

### Q: Can I disable auto-sync?

**A:** Yes, but not recommended:
1. Settings → Website Integration → Sync
2. Toggle "Enable Auto-Sync" OFF

**When disabled:**
- Invoices queue up locally
- QR codes show placeholder
- Must click "Sync Now" manually
- Customers can't view invoices until synced

**Use case:** Testing, network maintenance, data plan limit.

### Q: How many invoices can queue?

**A:** No hard limit! Queue can hold:
- Hundreds of invoices (typical: 0-50)
- Limited only by device storage

**Large queues** (100+):
- Sync takes longer (batch processing)
- Performance may slow down
- Consider increasing sync frequency

### Q: Can I prioritize certain invoices?

**A:** Currently FIFO (First In, First Out). All invoices sync in order created.

**Future feature:** Priority flags for VIP customers, high-value sales.

### Q: What if I reinstall POS app?

**A:** **Before reinstalling:**
1. Ensure sync queue is empty (0 pending)
2. Save API key backup

**After reinstalling:**
1. Settings → Website Integration → Connection
2. Enter saved API key
3. Device reconnects automatically
4. Continue syncing

**If API key lost:** Must re-register (admin revokes old, create new).

---

## 👤 Customer Experience

### Q: Do customers need an account?

**A:** No! Customers can:
- Scan QR code → View invoice (no login)
- Use any phone camera (no app)
- Access anytime without registration

**Optional:** Future feature will let customers create account to view all purchase history.

### Q: Do customers get email automatically?

**A:** Yes, if:
- Customer email entered during checkout in POS
- Invoice successfully synced

**Email contains:**
- Professional invoice template
- Items, amounts, payment details
- QR code image
- Link to view online
- NOREN branding

**If no email provided:** Customer can still scan QR or manual lookup.

### Q: Can customers download PDF?

**A:** Yes! Invoice page has **"📥 Download PDF"** button:
- High-quality PDF generated
- Includes QR code
- Printable format
- Suitable for expense reports

### Q: Can customers print invoice at home?

**A:** Yes! **"🖨️ Print"** button opens browser print dialog:
- Optimized print layout
- QR code included
- No ads or website navigation

### Q: What if customer deletes email?

**A:** No problem! They can:
1. **Scan original QR** on paper receipt (if kept)
2. **Manual lookup:** Website → Enter invoice number
3. **Contact store:** Staff can look up and resend email

### Q: Can customers return items with digital invoice?

**A:** Yes! Digital invoice is valid proof of purchase:
1. Customer opens invoice on phone
2. Shows at store counter
3. Staff verifies invoice number
4. Processes return normally

No paper receipt needed.

### Q: Is invoice accessible on desktop/laptop?

**A:** Yes! Invoice link works on:
- Mobile phones (any browser)
- Tablets (iPad, Android)
- Desktop computers
- Laptops

Responsive design adapts to screen size.

---

## 👨‍💼 Admin & Management

### Q: How do I become admin?

**A:** Admins are configured in backend:
1. User account must have `role: 'admin'`
2. Email must be in `SUPER_ADMIN_EMAILS` env variable
3. Login to website → Admin panel appears

Contact system administrator to grant admin access.

### Q: Can I see who viewed an invoice?

**A:** Yes! Admin can view access logs:
1. Admin Dashboard → POS Management → Invoices
2. Click invoice → View Details
3. See "Access Stats":
   - Number of views
   - Last viewed date/time
   - Device type (Mobile/Desktop/Tablet)

**Note:** No personal tracking (IP, location). Only aggregate stats for business insights.

### Q: How do I revoke a device?

**A:** Admin can revoke device access:
1. Admin Dashboard → POS Management → Devices
2. Find device in list
3. Click [•••] menu → "Revoke Access"
4. Confirm revocation

**Effect:**
- Device's API key invalidated immediately
- All sync attempts fail with 401 error
- POS shows "Access Revoked - Contact Admin"
- Existing invoices remain accessible
- Device must re-register to restore access

### Q: How do I revoke an invoice?

**A:** Admin can revoke invoice token:
1. Admin Dashboard → POS Management → Invoices
2. Find invoice
3. Click [View] → "🔒 Revoke Token"
4. Enter reason (required for audit)
5. Confirm

**Effect:**
- QR code stops working immediately
- Public link shows "No longer accessible"
- Admin still has access (for records)
- Customer can request new invoice if needed

### Q: Can I export data for analysis?

**A:** Yes! Analytics tab has **"📥 Export Report"**:

**Formats:**
- **CSV:** Import to Excel, Google Sheets
- **PDF:** Formatted report with charts
- **JSON:** Raw data for custom analysis

**Data includes:**
- All invoices (date, amount, device, status)
- Device performance metrics
- Sync statistics
- Revenue by store/device
- System health data

### Q: How do I add new admin users?

**A:** Contact system administrator to:
1. Create user account (if doesn't exist)
2. Set `role: 'admin'` in database
3. Add email to `SUPER_ADMIN_EMAILS` in .env
4. Restart backend server

Or use admin creation script:
```bash
cd backend
node createAdmin.js
```

### Q: Can different admins have different permissions?

**A:** Currently all admins have full access. Future feature will support:
- **Super Admin:** Full control
- **Store Manager:** View own store only
- **Viewer:** Read-only access

### Q: How do I check system health?

**A:** Admin Dashboard → POS Management → Analytics → System Health section shows:
- API status (operational/down)
- Database health
- Sync queue size
- Email service status
- Storage availability
- Response times

**Alert if:**
- Queue > 50 items (⚠️ warning)
- Queue > 100 items (🚨 critical)
- Response time > 2 seconds (⚠️ warning)
- Any service down (🚨 critical)

---

## 🔒 Security & Privacy

### Q: Is the API key secure?

**A:** Yes! Security measures:
1. **Shown once:** During registration only (can't be retrieved later)
2. **Hashed:** Stored as SHA-256 hash in database (original never stored)
3. **Transmitted securely:** HTTPS only
4. **Header-based:** Sent in `X-POS-API-Key` header (not in URL)
5. **Rate limited:** Max 100 requests/minute per device

**Best practice:** Treat API key like a password - keep secure, don't share.

### Q: Can someone steal my QR code and misuse it?

**A:** QR code shows read-only invoice - no security risk:
- Cannot modify invoice
- Cannot access payment details (only amount, not card number)
- Cannot see other invoices
- Cannot access POS system

**Worst case:** Someone views your invoice (same as keeping paper receipt).

**If concern:** Admin can revoke invoice token anytime.

### Q: Is customer data safe?

**A:** Yes! Data protection:
1. **Encrypted:** All traffic over HTTPS
2. **Database:** Secure PostgreSQL with authentication
3. **Access control:** Token-based, no guessing
4. **Audit logs:** Every access logged
5. **No PII in QR:** Only secure token in QR code

**Compliance:** Designed for GDPR/PCI DSS requirements.

### Q: Can I delete customer data?

**A:** Yes! GDPR "Right to be forgotten":
1. Customer requests deletion
2. Admin revokes invoice token
3. Invoice becomes inaccessible to public
4. Backend retains for business records (legal requirement)

**Full deletion:** Contact system administrator for database removal.

### Q: Are payment details exposed?

**A:** No! Public invoice shows:
- Items and amounts
- Payment method (e.g., "Cash", "Card")
- Transaction status (Paid/Pending)

**Never shown:**
- Credit card numbers
- CVV, expiry date
- UPI VPA
- Bank account details

### Q: What if device is stolen?

**A:** Immediate action:
1. **Contact admin** urgently
2. **Admin revokes device** access immediately
3. **Thief cannot sync** new invoices (401 error)
4. **Existing invoices** remain safe (thief has no access to website admin)

**Data on stolen device:**
- Local invoices (same as paper receipts)
- API key (admin revokes it)
- No customer payment details stored

### Q: Are audit logs tamper-proof?

**A:** Audit logs are:
- Written to database (not editable by POS)
- Timestamped immutably
- Include actor, action, IP address
- Reviewed by admins only

**Cannot be deleted/modified** by POS users. Only database admin can access.

### Q: Do you track customer location?

**A:** No GPS/location tracking. Only logged:
- Device type (Mobile/Desktop/Tablet)
- Timestamp of access
- Number of views

**No tracking:**
- IP addresses (not stored)
- GPS coordinates
- User identity (if not logged in)

---

## 🔧 Technical

### Q: What technology is used?

**A:** 
- **POS:** Electron (Windows desktop) + React + IndexedDB
- **Website:** React + Vite (frontend), Node.js + Express (backend)
- **Database:** PostgreSQL (Neon, 3-database replication)
- **Email:** Resend API
- **AI (optional):** Google Gemini
- **Hosting:** Render (backend), Vercel (frontend)

### Q: Can I integrate with other systems?

**A:** Yes! Integration points:
1. **REST APIs:** Document in `API_QUICK_REFERENCE.md`
2. **Webhooks:** Future feature (notify external systems)
3. **Export data:** CSV/JSON formats

**Examples:**
- Accounting software (Tally, QuickBooks)
- Inventory systems
- CRM tools
- Analytics platforms

### Q: Is the code open source?

**A:** Project is proprietary (NOREN/Dinesh Global Enterprises). Source code access by:
- Internal development team
- Licensed partners
- Audit/compliance review (under NDA)

### Q: Can I customize invoice template?

**A:** Yes! Technical users can edit:
- **Backend:** `backend/services/emailTemplates.js` (email template)
- **Frontend:** `frontend/src/pages/billing/DigitalInvoice.jsx` (web view)

Requires development knowledge (React/HTML/CSS).

### Q: What database tables are used?

**A:** 5 new tables (migration 009):
1. `src_pos_devices` - Registered devices
2. `src_pos_invoice_tokens` - Invoice access tokens
3. `src_pos_sync_queue` - Offline sync queue
4. `src_pos_audit_events` - Security audit log
5. `src_pos_invoice_access_log` - Invoice view tracking

See `backend/migrations/009_create_pos_integration_tables.sql`

### Q: How are tokens generated?

**A:** Cryptographically secure:
1. Generate random 32 bytes via `crypto.randomBytes(32)`
2. Encode as base64url
3. Prefix with `INV_` for identification
4. Hash with SHA-256 before storing
5. Original token shown once to POS, never stored

Example: `INV_xYz123AbC...` (48 characters)

### Q: Can I run this on-premise?

**A:** Yes! All components can be self-hosted:
1. **Backend:** Node.js server (Linux/Windows)
2. **Database:** PostgreSQL (self-hosted)
3. **Frontend:** Any web host (Nginx, Apache)
4. **POS:** Desktop app (no cloud dependency)

See `DEPLOYMENT_GUIDE.md` for self-hosting instructions.

### Q: What's the API rate limit?

**A:** Per device limits:
- **100 requests/minute** - Normal sync operations
- **500 requests/hour** - Burst protection
- **5,000 requests/day** - Daily cap

**Public invoice access (no auth):**
- **1,000 requests/hour** - Protects against scraping
- **No daily limit** - Customers can access anytime

### Q: How do I update the integration?

**A:** Update process:
1. **Backend:** `git pull` → `npm install` → restart server
2. **Frontend:** `git pull` → `npm run build` → deploy
3. **POS:** Check for updates in app (auto-update or manual download)

Database migrations run automatically via `autoMigrate.js`.

---

## 🛠️ Troubleshooting

### Q: QR code not working - how to debug?

**A:** Step-by-step debugging:

**Step 1: Check POS side**
```
Settings → Website Integration → Overview
Status: ✅ Connected? (if not, see next question)

Find invoice in POS:
- Does it show "✅ Synced" badge?
- If ⏳ Pending or ❌ Failed, click "Retry Sync"
```

**Step 2: Test QR code manually**
```
Open invoice PDF/receipt
Use online QR reader: https://webqr.com
Does it show URL starting with https://www.norenfastion.shop/my-billing/invoice/?
```

**Step 3: Test URL directly**
```
Copy URL from QR decode
Open in browser
Does invoice load?
- Yes: QR code is fine, camera issue
- No: Backend issue (see logs)
```

**Step 4: Check backend**
```bash
pm2 logs noren-backend --lines 50
```
Look for errors around invoice sync time.

### Q: "Device not connected" - how to fix?

**A:** Connection checklist:

**1. Check internet connection**
```
Open browser on POS computer
Visit https://www.norenfastion.shop
Does it load?
```

**2. Verify API key**
```
Settings → Website Integration → Device Management
Is API key filled in "Current API Key Hash" field?
If empty: Device not registered (register again)
```

**3. Test backend connection**
```
Open browser on POS computer
Visit: https://noren-iqk3.onrender.com/api/health
Should show: {"status":"ok"}
```

**4. Check device status with admin**
```
Ask admin to check:
Admin Dashboard → Devices → Find your device
Status should be "✅ Active"
If "🔴 Revoked", need re-registration
```

**5. Last resort: Re-register**
```
Settings → Website Integration → Connection
Click "Re-register Device"
Enter details again
Save new API key
```

### Q: Sync queue keeps growing - what's wrong?

**A:** Queue growing means sync failing. Check:

**1. Internet speed**
```
Run speed test: https://fast.com
Need at least 1 Mbps upload
```

**2. Backend status**
```
Visit https://noren-iqk3.onrender.com/api/health
If not loading: Backend down (contact admin)
```

**3. Device rate limit**
```
If syncing 100+ invoices at once:
- Rate limit may kick in (100 req/min)
- Wait a few minutes
- Sync will resume automatically
```

**4. Database issues**
```
Admin: Check backend logs
pm2 logs noren-backend --lines 100
Look for "Database connection failed" errors
```

**5. Temporary fix**
```
Reduce sync frequency:
Settings → Sync → Set interval to 60 or 120 seconds
Gives system more breathing room
```

### Q: Email receipts not sending - why?

**A:** Email debugging:

**1. Check email configured in POS**
```
Open invoice in POS
Verify customer email is correct
Update if wrong
Click "Resend Email" (if option available)
```

**2. Check Resend service status**
```
Admin: Check backend .env file
RESEND_API_KEY=re_xxxxx (should be filled)

Test Resend directly:
Visit https://resend.com/status
All systems operational?
```

**3. Check backend logs**
```bash
pm2 logs noren-backend | grep -i email
```
Look for:
- "Email sent successfully" (✅ good)
- "Email failed" (❌ check error)
- "Resend API error" (❌ API key issue)

**4. Check spam folder**
```
Customer: Check email spam/junk folder
Sender: NOREN <onboarding@resend.dev>
Mark as "Not Spam"
```

**5. Email delivery limits**
```
Resend free tier: 100 emails/day
If limit reached: Upgrade plan or wait 24 hours
```

### Q: Admin dashboard not loading - help?

**A:** Dashboard troubleshooting:

**1. Verify admin access**
```
Login to website
Do you see "Admin" link in navigation?
- Yes: Click it to access dashboard
- No: You don't have admin role (contact system admin)
```

**2. Check browser console**
```
Open browser Developer Tools (F12)
Go to Console tab
Any red errors?
Common: "401 Unauthorized" → Need to login again
```

**3. Clear cache**
```
Browser: Ctrl+Shift+Delete
Clear cache and cookies
Refresh page
Login again
```

**4. Try different browser**
```
Test in Chrome, Firefox, Edge
If works: Original browser issue (update/reinstall)
```

**5. Backend health**
```
Visit https://noren-iqk3.onrender.com/api/health
Should show: {"status":"ok"}
If not loading: Backend down (contact hosting provider)
```

---

## 📞 Still Need Help?

### For Store Staff:
- **Manager:** Contact your store manager first
- **Email:** supportnoren1@gmail.com
- **Phone:** [Your support phone number]
- **WhatsApp:** [Your WhatsApp business number]

### For Admins:
- **Technical Docs:** Check `DEPLOYMENT_GUIDE.md`, `SECURITY_AUDIT_GUIDE.md`
- **Backend Logs:** `pm2 logs noren-backend`
- **Database:** `ADMIN_POS_MANAGEMENT_SETUP.md` for SQL queries
- **Email:** supportnoren1@gmail.com

### For Developers:
- **API Reference:** `API_QUICK_REFERENCE.md`
- **Testing Guide:** `INTEGRATION_TESTING_GUIDE.md`
- **Code:** Review controller/service files in `backend/`

---

## 🎓 Training Resources

**Video Tutorials (Coming Soon):**
- POS Setup Walkthrough (5 min)
- Customer Experience Demo (2 min)
- Admin Dashboard Tour (10 min)

**Documentation:**
- 📘 [Complete User Guide](POS_INTEGRATION_USER_GUIDE.md)
- 📋 [Quick Reference](POS_QUICK_REFERENCE.md)
- 🎨 [Visual Workflows](POS_INTEGRATION_VISUAL_WORKFLOWS.md)
- 🔐 [Security Guide](SECURITY_AUDIT_GUIDE.md)
- 🚀 [Deployment Guide](DEPLOYMENT_GUIDE.md)

---

**Last Updated:** October 9, 2026  
**Version:** 1.0.0  
**For:** VENDEXA RetailOS™ × NOREN Integration

---

*Have a question not answered here? Email supportnoren1@gmail.com and we'll add it!*

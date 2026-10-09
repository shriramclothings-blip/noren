# 🎯 VENDEXA RetailOS™ × NOREN Integration - Complete User Guide

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [For POS Users](#for-pos-users)
3. [For Customers](#for-customers)
4. [For Admin Users](#for-admin-users)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### What This Integration Does

- **Generate QR codes** on every POS invoice
- **Customers scan QR** to view digital invoice on your website
- **Automatic sync** between POS and website (works offline!)
- **Email receipts** sent automatically
- **Admin dashboard** to manage devices and view analytics

---

## 💻 For POS Users

### Step 1: First-Time Setup (One-Time Configuration)

#### 1.1 Open Website Integration Settings

1. Launch **VENDEXA RetailOS™** POS app
2. Click **Settings** (⚙️ icon in sidebar)
3. Click **Website Integration** tab (🌐 Globe icon)

You'll see 4 tabs: **Overview**, **Connection**, **Device Management**, **Sync**

#### 1.2 Register Your POS Device

**Go to "Connection" tab:**

```
┌─────────────────────────────────────────┐
│ 📡 Connection Configuration             │
├─────────────────────────────────────────┤
│ Website URL: [Already filled]           │
│ Device Name: [Enter name, e.g., "Store Main Counter"] │
│ Location: [Enter location, e.g., "Mumbai Store 1"] │
│                                         │
│ [Register Device] button                │
└─────────────────────────────────────────┘
```

**Fill in:**
- **Device Name**: Give your POS a recognizable name (e.g., "Main Counter", "Store 2 - Counter A")
- **Location**: Store location (e.g., "Mumbai - Phoenix Mall", "Delhi Store")

**Click "Register Device"**

#### 1.3 Save Your API Key ⚠️ IMPORTANT

After registration, you'll see:

```
✅ Device Registered Successfully!

🔑 Your API Key (SAVE THIS NOW - shown only once):

POS_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Device ID: dev_abc123...
```

**⚠️ CRITICAL:** Copy and save this API key immediately! You cannot retrieve it later.

The POS app will **automatically save** it, but keep a backup in case you need to reconfigure.

#### 1.4 Verify Connection Status

Go to **"Overview" tab** - you should see:

```
✅ Connected
Device: Main Counter
Status: Active
Last Sync: Just now
```

### Step 2: Using QR Codes on Invoices

#### 2.1 Automatic QR Generation

**Every finalized invoice automatically gets a QR code!**

When you complete a sale:

1. **Finalize the invoice** as usual in POS
2. **QR code appears** automatically on invoice preview
3. **Print** or **save PDF** - QR code is included

#### 2.2 QR Code Placement

The QR code appears:
- **Thermal receipts**: Bottom of receipt (small size)
- **A4 invoices**: Bottom-right corner (medium size)
- **Label format**: Branded QR with logo

#### 2.3 Show QR to Customer

```
┌─────────────────────────┐
│ NOREN Invoice #12345    │
│ Date: 09/10/2026        │
│                         │
│ Items: ...              │
│ Total: ₹2,450           │
│                         │
│ Scan for digital copy:  │
│   ┌─────────────┐       │
│   │  QR CODE    │       │
│   │   HERE      │       │
│   └─────────────┘       │
└─────────────────────────┘
```

**Tell customer:** *"Scan this QR code to view your invoice online anytime!"*

### Step 3: Offline Mode & Sync

#### 3.1 How Offline Sync Works

**The POS works even without internet!**

- **No internet?** Invoices are saved locally in a **sync queue**
- **Internet back?** Automatic background sync every 30 seconds
- **Never lose data** - all invoices eventually sync

#### 3.2 Monitor Sync Status

Go to **Settings → Website Integration → Sync tab:**

```
┌──────────────────────────────────────┐
│ 🔄 Sync Status                       │
├──────────────────────────────────────┤
│ Status: ✅ Connected                 │
│ Queue: 3 pending                     │
│ Last Sync: 2 minutes ago             │
│                                      │
│ Recent Activity:                     │
│ ✅ INV-12345 synced                  │
│ ⏳ INV-12346 pending                 │
│ ⏳ INV-12347 pending                 │
│                                      │
│ [Sync Now] [View Queue]              │
└──────────────────────────────────────┘
```

**Options:**
- **Enable Auto-Sync**: Toggle automatic background sync
- **Sync Interval**: Set frequency (default: 30 seconds)
- **Sync Now**: Manually trigger sync
- **Clear Queue**: Remove failed items

#### 3.3 What Gets Synced

Every invoice sync includes:
- Invoice details (items, amounts, customer)
- Payment information
- QR code token
- Timestamp

**Plus these automatic services:**
- 📧 **Email receipt** to customer
- 🤖 **AI insights** (optional)
- 📱 **Push notification** (if enabled)

### Step 4: View Synced Invoices

#### 4.1 Check Individual Invoice Status

In POS **Invoices List**, look for sync indicators:

```
Invoice #12345  ✅ Synced  [View Online]
Invoice #12346  ⏳ Pending
Invoice #12347  ❌ Failed  [Retry]
```

**Click "View Online"** to see how customers see it on website.

#### 4.2 Sync Error Handling

If sync fails:

```
❌ Sync Failed: Invoice #12346
Reason: Network timeout
Actions:
  [Retry Now]
  [View Details]
  [Remove from Queue]
```

**Common fixes:**
- Check internet connection
- Click **"Retry Now"**
- Contact admin if persistent

### Step 5: Special Features

#### 5.1 Bulk QR Code Generation

Need QR codes for old invoices?

1. Go to **Invoices** section
2. Select multiple invoices (checkbox)
3. Click **"Generate QR Codes"**
4. Choose format: Thermal / A4 / Labels
5. Click **"Download All"**

#### 5.2 Email Receipts

**Automatic emails when:**
- Customer email is entered in invoice
- Invoice is finalized and synced

**Email contains:**
- Professional invoice template
- Payment confirmation
- QR code image
- Link to view online

**To disable:** Settings → Website Integration → Device Management → Toggle "Send Email Receipts"

#### 5.3 Branded QR Codes

**For special invoices:**

1. Select invoice
2. Click **"Generate Branded QR"**
3. QR includes NOREN logo in center
4. Use for premium customers or marketing

---

## 👤 For Customers

### Step 1: Scan the QR Code

#### 1.1 Using Your Phone

1. **Open phone camera** (iPhone/Android)
2. **Point at QR code** on receipt
3. **Tap notification** that appears
4. **Browser opens** invoice page automatically

**No app needed!** Works with any modern phone camera.

#### 1.2 Alternative: Manual Website Lookup

If QR scan doesn't work:

1. Visit **www.norenfastion.shop/my-billing**
2. Click **"Lookup Invoice"**
3. Enter **invoice number** from receipt
4. Click **"Find Invoice"**

### Step 2: View Your Digital Invoice

#### 2.1 Invoice Page Features

```
┌─────────────────────────────────────────┐
│ 🧾 NOREN Invoice #12345                 │
├─────────────────────────────────────────┤
│ Date: October 9, 2026                   │
│ Store: Mumbai - Phoenix Mall            │
│ Cashier: Store Main Counter             │
│                                         │
│ Items Purchased:                        │
│ • Shirt (Navy Blue, Size M)   ₹1,200   │
│ • Jeans (Black, Size 32)      ₹1,500   │
│                                         │
│ Subtotal:                     ₹2,700   │
│ Discount (10%):               -₹270    │
│ Tax (GST 5%):                 ₹121.50  │
│ ─────────────────────────────────────  │
│ Total Paid:                   ₹2,551.50│
│                                         │
│ Payment: Cash                           │
│ Status: ✅ Paid                         │
│                                         │
│ [📥 Download] [🖨️ Print] [📧 Email]    │
│ [🔗 Share]                              │
└─────────────────────────────────────────┘
```

#### 2.2 Action Buttons

**📥 Download PDF**
- Click to save invoice as PDF
- Useful for expense reports

**🖨️ Print**
- Print invoice on home/office printer
- Opens browser print dialog

**📧 Email to Me**
- Enter your email
- Get invoice copy sent

**🔗 Share**
- Copy link to invoice
- Share via WhatsApp/SMS/social media

### Step 3: Return/Exchange with Digital Invoice

**For returns or warranty:**

1. Open invoice on phone (scan QR again)
2. Show digital invoice at store
3. Store staff verifies invoice authentically
4. No need for paper receipt!

### Step 4: View All Your Invoices

#### 4.1 Invoice History (Coming Soon)

If you create an account on norenfastion.shop:

1. Login to your account
2. Go to **"My Orders"** → **"Store Purchases"**
3. See all your POS invoices
4. Filter by date, store, amount

---

## 👨‍💼 For Admin Users

### Step 1: Access POS Management Dashboard

#### 1.1 Login as Admin

1. Go to **www.norenfastion.shop/admin**
2. Login with admin credentials
3. Click **"POS Management"** in sidebar

You'll see the POS Management Dashboard with 4 tabs:

```
┌─────────────────────────────────────────┐
│ 📊 POS Integration Dashboard            │
├─────────────────────────────────────────┤
│ [Overview] [Devices] [Invoices] [Analytics] │
└─────────────────────────────────────────┘
```

### Step 2: Overview Tab - Quick Stats

**Shows real-time metrics:**

```
┌──────────────────────────────────────────┐
│ 📊 System Overview                       │
├──────────────────────────────────────────┤
│ 💻 Active Devices:      5 / 8 registered │
│ 🧾 Today's Invoices:    127 synced       │
│ ⏳ Sync Queue:          3 pending        │
│ 📈 Success Rate:        99.2%            │
│                                          │
│ Recent Activity (Last 24h):              │
│ • 08:45 - Store 1 device connected       │
│ • 09:12 - Invoice #12345 synced          │
│ • 10:30 - Store 2 sync completed (50)    │
│                                          │
│ ⚠️ Alerts:                               │
│ • Store 3 device offline (2 hours)       │
│ • 5 invoices failed sync (network)       │
└──────────────────────────────────────────┘
```

### Step 3: Devices Tab - Manage POS Devices

#### 3.1 View All Registered Devices

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search: [__________]  Filter: [All Status ▼]             │
├──────────────┬──────────────┬──────────┬──────────┬─────────┤
│ Device Name  │ Location     │ Status   │ Last Sync│ Actions │
├──────────────┼──────────────┼──────────┼──────────┼─────────┤
│ Main Counter │ Mumbai Store │ ✅ Active│ 2 min ago│ [•••]   │
│ Counter A    │ Delhi Store  │ ✅ Active│ 5 min ago│ [•••]   │
│ Counter B    │ Delhi Store  │ ⏸️ Paused│ 1 hr ago │ [•••]   │
│ Store 3 POS  │ Bangalore    │ 🔴 Offline│ 2 hrs ago│ [•••]   │
└──────────────┴──────────────┴──────────┴──────────┴─────────┘
```

#### 3.2 Device Actions Menu (•••)

Click the dots for options:

**✅ Active Device:**
- 📊 View Analytics
- ⏸️ Pause Sync
- 🔄 Force Sync Now
- ✏️ Edit Details
- ❌ Revoke Access

**⏸️ Paused Device:**
- ▶️ Resume Sync
- 🔄 Force Sync
- ❌ Revoke Access

**🔴 Offline Device:**
- 🔔 Send Alert to User
- 📞 Contact Store
- ❌ Revoke Access

#### 3.3 Revoke Device Access

**When to revoke:**
- Device stolen/lost
- Employee terminated
- Store closed
- Security concern

**How to revoke:**

1. Click device **[•••]** menu
2. Select **"Revoke Access"**
3. Confirm revocation

```
⚠️ Revoke Device Access?

Device: Store 3 POS
Location: Bangalore

This will:
• Invalidate API key immediately
• Stop all sync operations
• Device cannot reconnect (must re-register)
• Existing invoices remain accessible

[Cancel] [Revoke Access]
```

**After revocation:**
- Device gets **401 Unauthorized** on next sync
- POS app shows "Access Revoked - Contact Admin"
- Must re-register to restore access

### Step 4: Invoices Tab - Monitor All Synced Invoices

#### 4.1 Invoice List View

```
┌──────────────────────────────────────────────────────────────────┐
│ 📅 Date Range: [Last 7 Days ▼]  🏪 Store: [All Stores ▼]       │
├──────────┬────────────┬─────────┬──────────┬─────────┬──────────┤
│ Invoice# │ Date/Time  │ Amount  │ Device   │ Status  │ Actions  │
├──────────┼────────────┼─────────┼──────────┼─────────┼──────────┤
│ INV-12345│ 09/10 14:30│ ₹2,551  │ Store 1  │ ✅ Active│ [View]   │
│ INV-12346│ 09/10 14:45│ ₹1,890  │ Store 1  │ ✅ Active│ [View]   │
│ INV-12347│ 09/10 15:00│ ₹5,420  │ Store 2  │ ✅ Active│ [View]   │
│ INV-12348│ 09/10 15:15│ ₹899    │ Store 1  │ 🔒 Revoked│ [View]  │
└──────────┴────────────┴─────────┴──────────┴─────────┴──────────┘
```

#### 4.2 View Individual Invoice

Click **[View]** to see:

```
┌─────────────────────────────────────────┐
│ Invoice Details: INV-12345              │
├─────────────────────────────────────────┤
│ 📅 Created: Oct 9, 2026 14:30:45       │
│ 💻 Device: Main Counter (Store 1)      │
│ 💰 Amount: ₹2,551.50                    │
│ 👤 Customer: Rahul Sharma              │
│ 📧 Email: rahul@example.com            │
│                                         │
│ Sync History:                           │
│ ✅ 14:30:50 - Synced successfully       │
│ ✅ 14:31:00 - Email sent                │
│ ✅ 14:31:05 - QR generated              │
│                                         │
│ Access Stats:                           │
│ 👁️ Views: 3 times                       │
│ 📱 Last viewed: Oct 9, 15:45 (Mobile)  │
│                                         │
│ [📥 Download PDF] [🔒 Revoke Token]    │
│ [📧 Resend Email] [👁️ View Public]     │
└─────────────────────────────────────────┘
```

#### 4.3 Revoke Invoice Token

**When to revoke:**
- Customer requests privacy
- Fraudulent activity suspected
- Invoice disputed
- Security concern

**How to revoke:**

1. Click **[🔒 Revoke Token]**
2. Enter reason (required)
3. Confirm

```
🔒 Revoke Invoice Access?

Invoice: INV-12345
Reason: [Customer privacy request_____]

This will:
• QR code stops working immediately
• Public link becomes invalid
• Admin still has access
• Action is logged for audit

[Cancel] [Revoke Access]
```

**After revocation:**
- Customer sees: *"This invoice is no longer accessible"*
- Logged in audit trail with reason + timestamp
- Admin can still view in dashboard

### Step 5: Analytics Tab - Business Insights

#### 5.1 Key Metrics

```
┌─────────────────────────────────────────┐
│ 📊 POS Integration Analytics            │
├─────────────────────────────────────────┤
│ Last 30 Days:                           │
│                                         │
│ 🧾 Total Invoices:        1,847        │
│ 💰 Total Revenue:         ₹12,45,890   │
│ ✅ Sync Success Rate:     99.6%        │
│ ⏱️ Avg Sync Time:         1.2 seconds  │
│ 👥 Unique Customers:      923          │
│ 📧 Email Open Rate:       67.8%        │
│ 👁️ Invoice View Rate:     89.2%        │
│                                         │
│ Top Performing Stores:                  │
│ 1. Mumbai Store 1       ₹4,23,560      │
│ 2. Delhi Store         ₹3,89,220      │
│ 3. Bangalore Store     ₹2,98,110      │
└─────────────────────────────────────────┘
```

#### 5.2 System Health Monitoring

```
┌─────────────────────────────────────────┐
│ 🏥 System Health                        │
├─────────────────────────────────────────┤
│ API Status:        ✅ Operational       │
│ Database:          ✅ Healthy           │
│ Sync Queue:        ⚠️ 15 pending        │
│ Email Service:     ✅ Operational       │
│ Storage:           ✅ 67% available     │
│                                         │
│ Response Times:                         │
│ • Device Auth:     82ms (✅ Good)       │
│ • Invoice Sync:    124ms (✅ Good)      │
│ • Public Access:   45ms (✅ Excellent)  │
│                                         │
│ [📥 Export Report] [🔄 Refresh]         │
└─────────────────────────────────────────┘
```

#### 5.3 Export Analytics

Click **[📥 Export Report]** to download:

- **CSV**: Raw data for Excel analysis
- **PDF**: Formatted report with charts
- **JSON**: Data for custom analysis

**Report includes:**
- Device performance metrics
- Invoice sync statistics
- Revenue by store/device
- Customer engagement metrics
- System health data
- Error logs and trends

### Step 6: Daily Email Summary

**Admins automatically receive daily email at 8:00 PM IST:**

```
Subject: 📊 NOREN POS Daily Summary - October 9, 2026

─────────────────────────────────────────
📈 Today's Performance

🧾 Invoices Created:     127
💰 Total Revenue:        ₹87,450
✅ Sync Success Rate:    99.2%
⚠️ Failed Syncs:         1

─────────────────────────────────────────
🏪 Store Performance

Mumbai Store 1:      45 invoices | ₹32,890
Delhi Store:         38 invoices | ₹28,450
Bangalore Store:     44 invoices | ₹26,110

─────────────────────────────────────────
⚠️ Attention Required

• Store 3 device offline since 2:30 PM
• 5 invoices pending retry (network issue)

[View Full Dashboard →]
─────────────────────────────────────────
```

**To disable:** Contact system administrator to update job schedule.

### Step 7: Security & Audit

#### 7.1 View Audit Logs

Navigate to **Settings → Audit Logs** (or POS Management → Security tab):

```
┌─────────────────────────────────────────────────────────────┐
│ 🔐 Security Audit Log                                       │
├─────────────┬────────────┬──────────────┬──────────────────┤
│ Timestamp   │ Event      │ Actor        │ Details          │
├─────────────┼────────────┼──────────────┼──────────────────┤
│ 14:30:45    │ Device Auth│ Main Counter │ Success (200)    │
│ 14:30:50    │ Invoice Sync│ Main Counter│ INV-12345 synced │
│ 15:45:00    │ Token Revoke│ Admin User  │ INV-12348 revoked│
│ 16:00:00    │ Failed Auth│ Unknown      │ Invalid API key  │
└─────────────┴────────────┴──────────────┴──────────────────┘
```

**Filter by:**
- Date range
- Event type (Auth, Sync, Revoke, Access)
- Device
- Success/Failure

#### 7.2 Security Alerts

**Automatic alerts for:**
- Multiple failed auth attempts (5+ in 10 min)
- Suspicious sync patterns
- Unusual access times
- Large batch sync failures
- Rate limit violations

**Alert delivery:**
- 📧 Email to admin
- 🔔 Dashboard notification
- 📱 Push notification (if configured)

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Issue 1: QR Code Not Generating

**Symptoms:**
- Invoice prints without QR code
- QR placeholder shows but no code

**Solutions:**

✅ **Check device registration:**
1. Settings → Website Integration → Overview
2. Verify status is "✅ Connected"
3. If not, re-register device

✅ **Check invoice finalization:**
- QR only generates on finalized invoices
- Draft/pending invoices don't get QR codes

✅ **Check sync queue:**
- Settings → Sync tab
- If many items pending, click "Sync Now"

#### Issue 2: Customer Can't Scan QR

**Symptoms:**
- Camera doesn't recognize QR
- Nothing happens when scanning

**Solutions:**

✅ **Check QR print quality:**
- Ensure QR is not blurry/faded
- Thermal printer may need ribbon replacement
- Test with phone flashlight for better contrast

✅ **Try different camera app:**
- Native camera app (iOS/Android)
- Google Lens
- WhatsApp camera

✅ **Manual lookup alternative:**
1. Visit www.norenfastion.shop/my-billing
2. Click "Lookup Invoice"
3. Enter invoice number from receipt

#### Issue 3: Sync Stuck "Pending"

**Symptoms:**
- Invoices stay in sync queue
- Queue count increasing
- No sync errors shown

**Solutions:**

✅ **Check internet connection:**
- Test other websites/apps
- Restart WiFi/router if needed

✅ **Manual sync:**
1. Settings → Website Integration → Sync
2. Click "Sync Now"
3. Wait 30 seconds

✅ **Check device status:**
1. Settings → Device Management
2. If "Suspended" or "Revoked", contact admin

✅ **Clear failed items:**
1. Settings → Sync → View Queue
2. Select failed items
3. Click "Retry" or "Remove"

#### Issue 4: "Access Revoked" Error

**Symptoms:**
- POS shows "Access Revoked - Contact Admin"
- All syncs failing with 401 error

**Cause:**
- Admin revoked device access
- API key expired/invalid
- Security policy change

**Solutions:**

✅ **Contact admin:**
- Ask why access was revoked
- Request device re-activation

✅ **Re-register device (if approved):**
1. Settings → Website Integration
2. Click "Re-register Device"
3. Save new API key

#### Issue 5: Invoice Shows "Not Found"

**Symptoms:**
- Customer scans QR → "Invoice not found"
- Public link says "Invalid or expired"

**Causes:**
- Invoice not yet synced
- Token revoked by admin
- Sync failed

**Solutions:**

✅ **Wait and retry:**
- If invoice just created, wait 1 minute
- Background sync may still be processing

✅ **Check sync status in POS:**
- Find invoice in POS
- Look for sync status icon
- If failed, click "Retry Sync"

✅ **Contact store:**
- Admin may have revoked token
- Ask for new invoice/receipt

#### Issue 6: Email Receipt Not Received

**Symptoms:**
- Customer entered email
- No receipt email received

**Solutions:**

✅ **Check spam folder:**
- Look for sender: NOREN <onboarding@resend.dev>
- Mark as "Not Spam" for future

✅ **Verify email in invoice:**
1. Open invoice in POS
2. Check email address is correct
3. Update if wrong

✅ **Resend email:**
1. Admin Dashboard → POS Management → Invoices
2. Find invoice
3. Click "Resend Email"

✅ **Check email service status:**
- Admin: Backend logs for email errors
- May be temporary Resend service issue

#### Issue 7: Slow Sync Performance

**Symptoms:**
- Sync takes several minutes
- Large queue backlog

**Solutions:**

✅ **Reduce sync frequency:**
1. Settings → Sync
2. Increase interval from 30s to 60s or 120s
3. Reduces server load

✅ **Batch sync during off-hours:**
- If many pending items
- Sync during closing time when store is quiet

✅ **Check internet speed:**
- Run speed test
- Contact ISP if < 1 Mbps upload

✅ **Contact admin:**
- May be server-side performance issue
- Admin can check backend logs

### Getting Help

**POS Users:**
- Contact store manager
- Call support: [Your support phone]
- Email: supportnoren1@gmail.com

**Customers:**
- Visit: www.norenfastion.shop/support
- WhatsApp: [Your WhatsApp business number]
- Email: supportnoren1@gmail.com

**Admins:**
- Check: DEPLOYMENT_GUIDE.md
- Check: SECURITY_AUDIT_GUIDE.md
- Backend logs: `pm2 logs noren-backend`
- Database query: See ADMIN_POS_MANAGEMENT_SETUP.md

---

## 📚 Additional Resources

**Documentation Files:**
- `INTEGRATION_TESTING_GUIDE.md` - Testing workflows
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `SECURITY_AUDIT_GUIDE.md` - Security best practices
- `SERVICE_INTEGRATION_GUIDE.md` - Email/AI/messaging setup
- `OFFLINE_SYNC_GUIDE.md` - Offline operation details
- `ADMIN_POS_MANAGEMENT_SETUP.md` - Admin dashboard setup

**API Reference:**
- Device Registration: POST /api/erp/pos/integration/devices/register
- Invoice Sync: POST /api/erp/pos/integration/invoices/sync
- Public Invoice: GET /api/invoices/public/:token

---

## 🎉 Best Practices

### For Store Staff

1. **Always tell customers about QR codes:**
   - "Scan this to view your invoice online anytime!"
   - "No need to keep paper - it's all digital!"

2. **Collect customer emails:**
   - Increases email receipt delivery
   - Better customer engagement

3. **Check sync status daily:**
   - Start of day: Verify device connected
   - End of day: Ensure queue is empty

4. **Keep device registered:**
   - Don't delete/reinstall POS app unnecessarily
   - If you must reinstall, save API key backup

### For Admins

1. **Monitor dashboard daily:**
   - Check device health
   - Review sync success rates
   - Address offline devices promptly

2. **Review audit logs weekly:**
   - Look for security anomalies
   - Verify no unauthorized access

3. **Setup alerts:**
   - Email alerts for device offline > 2 hours
   - Alerts for sync failure rate > 5%

4. **Train staff properly:**
   - Show them how to check sync status
   - Teach troubleshooting basics

5. **Document store-specific setup:**
   - Note each device's location
   - Keep device registry updated

### For Customers

1. **Save invoice links:**
   - Bookmark important purchases
   - Add to phone's home screen

2. **Use for returns:**
   - No need to keep paper receipts
   - Digital invoice is proof of purchase

3. **Check spam folder:**
   - If email receipt not in inbox
   - Mark as safe sender

---

## 🚀 Success Metrics

**You'll know integration is working when:**

✅ **99%+ sync success rate** - Dashboard shows green health
✅ **Every invoice has QR code** - Visible on all printed receipts
✅ **Email delivery > 95%** - Most customers receive receipts
✅ **Queue typically < 10 items** - Syncs process quickly
✅ **Customers use QR codes** - View count increases
✅ **Zero device access issues** - No revocation needed

---

**Questions? Need help?**
- 📧 Email: supportnoren1@gmail.com
- 🌐 Website: www.norenfastion.shop/support
- 📱 WhatsApp: [Your number]

---

*Last Updated: October 9, 2026*
*Version: 1.0.0*
*VENDEXA RetailOS™ × NOREN Integration*

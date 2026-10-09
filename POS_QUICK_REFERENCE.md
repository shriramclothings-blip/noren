# 🎯 POS Integration - Quick Reference Card

## 🚀 Quick Setup (First Time)

```
POS App → Settings (⚙️) → Website Integration (🌐)
→ Connection Tab → Fill Device Name & Location
→ Click "Register Device" → SAVE API KEY!
```

**⚠️ CRITICAL:** Save API key immediately - shown only once!

---

## 💻 For POS Users

### Check Connection Status
```
Settings → Website Integration → Overview
✅ Connected = Good
🔴 Disconnected = Check internet
```

### QR Codes on Invoices
- **Automatic** on every finalized invoice
- **Location:** Bottom of receipt
- **Tell customer:** "Scan for digital copy!"

### Monitor Sync
```
Settings → Website Integration → Sync Tab
Queue: 0-5 = Good | 10+ = Check connection
```

### Manual Sync
```
Sync Tab → Click "Sync Now" button
Wait 30 seconds
```

### Common Status Icons
- ✅ **Synced** - Invoice on website
- ⏳ **Pending** - In queue
- ❌ **Failed** - Click retry

---

## 👤 For Customers

### View Invoice (3 Ways)

**Method 1: Scan QR Code**
```
Phone Camera → Point at QR → Tap notification
```

**Method 2: Manual Lookup**
```
Visit: www.norenfastion.shop/my-billing
Click "Lookup Invoice"
Enter invoice number
```

**Method 3: Email Link**
```
Check email (including spam)
Click "View Invoice" button
```

### Invoice Actions
- 📥 **Download** - Save as PDF
- 🖨️ **Print** - Print at home
- 📧 **Email** - Send to yourself
- 🔗 **Share** - Send to others

---

## 👨‍💼 For Admins

### Access Dashboard
```
www.norenfastion.shop/admin
Login → POS Management (sidebar)
```

### Daily Checks
```
Overview Tab:
✅ Active devices (should match total)
✅ Sync success rate (>99%)
✅ Queue size (<10)
```

### Manage Devices
```
Devices Tab:
[•••] Menu → View Analytics / Pause / Revoke
```

### Revoke Device Access
```
Devices Tab → [•••] → Revoke Access
⚠️ Device cannot sync until re-registered
```

### Revoke Invoice Token
```
Invoices Tab → Find invoice → [View]
→ Click "🔒 Revoke Token"
⚠️ QR code stops working immediately
```

### View Analytics
```
Analytics Tab:
• Revenue by store
• Sync performance
• System health
• Customer engagement
```

### Export Reports
```
Analytics Tab → "📥 Export Report"
Choose: CSV | PDF | JSON
```

---

## 🔧 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| **QR not generating** | Check device connected, invoice finalized |
| **Can't scan QR** | Try Google Lens or manual lookup |
| **Sync stuck** | Check internet, click "Sync Now" |
| **Access revoked** | Contact admin for re-activation |
| **Invoice not found** | Wait 1 min for sync, or retry |
| **No email receipt** | Check spam, verify email in invoice |

---

## 📞 Support Contacts

- **Email:** supportnoren1@gmail.com
- **Website:** www.norenfastion.shop/support
- **Documentation:** POS_INTEGRATION_USER_GUIDE.md

---

## 🔑 Key URLs

| Purpose | URL |
|---------|-----|
| **Customer - Scan invoices** | www.norenfastion.shop/my-billing |
| **Customer - Manual lookup** | www.norenfastion.shop/my-billing/scan |
| **Admin Dashboard** | www.norenfastion.shop/admin |
| **Backend API** | https://noren-iqk3.onrender.com/api |

---

## 📊 Health Indicators

### Good Signs ✅
- Sync success rate > 99%
- Queue size < 10 items
- All devices "Active"
- Email delivery > 95%

### Warning Signs ⚠️
- Queue size 10-50 items
- Sync rate 95-99%
- Device offline 1-2 hours

### Critical Issues 🚨
- Queue size > 50 items
- Sync rate < 95%
- Device offline > 2 hours
- Multiple failed auth attempts

---

## 💡 Pro Tips

**For Staff:**
- Check sync status at start/end of day
- Always show customers the QR code
- Collect customer emails for receipts

**For Admins:**
- Monitor dashboard daily (5 min check)
- Review audit logs weekly
- Setup email alerts for offline devices

**For Customers:**
- Scan QR code before leaving store
- Check spam if no email receipt
- Bookmark invoice for easy access

---

**Version 1.0.0 | October 2026**

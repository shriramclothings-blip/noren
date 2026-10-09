# ⚡ Cloud Sync — Quick Start Guide

## Get Started in 3 Steps

### Step 1: Open Cloud Sync Settings
1. Launch your POS app
2. Click **Settings** in sidebar (⚙️ gear icon)
3. Click the **Cloud Sync** tab

---

### Step 2: Fill in Your Details

The API endpoint is **already configured** for you: `https://ram1-ai0s.onrender.com`

Just fill in these 3 required fields:

| Field | What to Enter | Example |
|-------|---------------|---------|
| ☑️ **Enable Cloud Sync** | Check this box | ✓ |
| 🏢 **Business ID** | Your business name (no spaces) | `DINESH-GLOBAL-001` |
| 💻 **Device ID** | Name for this POS terminal | `POS-TERMINAL-01` |

**Optional fields** (leave blank for now):
- Sync Secret Key — for authentication
- JWT Token — for API authentication  
- Device Auth Token — for device-specific auth

---

### Step 3: Save & Test

1. Click **Test Connection** button  
   ✅ You should see: "Endpoint reachable" or "Server responded"

2. Click **Save Settings** button  
   ✅ System will connect and start syncing

3. Check the status dashboard:
   - **Connected** = Green badge (all good!)
   - **Pending** = Number of records waiting to sync
   - **Synced** = Total records uploaded to cloud

---

## ✅ You're Done!

Your POS is now syncing automatically:
- ✅ All sales, products, customers → sent to cloud every 10 seconds
- ✅ Works offline — data queued and synced when online
- ✅ Never blocks billing — background sync only

---

## 📊 What Happens Now?

### Automatic Background Sync
Every 10 seconds, the POS will:
1. Check for pending changes in local queue
2. Upload up to 10 records at a time
3. Retry failed items with exponential backoff
4. Update the sync status on your dashboard

### What Data Gets Synced?
Everything you create, edit, or delete:
- Products, Categories, Brands, Variants
- Sales & Invoices (every bill)
- Customers & Suppliers
- Stock Adjustments & Inventory
- Purchases
- Staff/Users (passwords excluded)
- Settings

### Offline Mode
- No internet? **No problem!**
- All POS operations work 100% offline
- Changes are queued locally
- When you're back online, sync resumes automatically

---

## 🛠️ Troubleshooting

### "Cannot reach server"
- Check internet connection
- Your Render backend may be sleeping (free tier) — wait 30 seconds and test again

### Pending items not syncing
- Check "Recent Sync Logs" at bottom of Cloud Sync page
- Look for error messages (404, 500, etc.)
- Your backend may need the `/api/sync/push` endpoint implemented

### All items show "Failed"
1. Click **Retry Failed Sync** button
2. Check "Last Error" message in status bar
3. Backend may need configuration

---

## 📖 More Help

- **Full Setup Guide:** See `CLOUD_SYNC_SETUP_GUIDE.md`
- **Backend API Spec:** See `cloud-backend-api-spec.md` (for developers)
- **View Sync Logs:** Click **Cloud Sync Logs** in sidebar

---

## 🎯 Quick Actions

| Button | What It Does |
|--------|--------------|
| **Test Connection** | Check if server is reachable |
| **Save Settings** | Save config and start sync |
| **Force Sync Now** | Manually trigger sync worker |
| **Retry Failed Sync** | Re-queue all failed items |
| **Clear Sync Cache** | Delete all queue items (reset) |
| **Refresh Status** | Update dashboard counters |

---

**Cloud API:** https://ram1-ai0s.onrender.com  
**Last Updated:** July 6, 2026

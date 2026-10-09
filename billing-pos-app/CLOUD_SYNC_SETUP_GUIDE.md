# Cloud Sync Setup Guide

## Overview
Your POS system is now configured to sync all data to your cloud API at:
**https://ram1-ai0s.onrender.com**

All local changes (products, sales, customers, inventory, etc.) are automatically queued and synced to the cloud in the background without blocking your billing operations.

---

## Quick Setup Instructions

### 1. Open Settings
- Launch your POS app
- Click **Settings** in the sidebar
- Navigate to the **Cloud Sync** tab

### 2. Configure Connection
The API endpoint is pre-filled with your Render cloud URL. You just need to set:

| Field | Description | Example Value |
|-------|-------------|---------------|
| **Enable Cloud Sync** | Toggle ON | ✓ Checked |
| **API Endpoint** | Pre-filled with Render URL | `https://ram1-ai0s.onrender.com` |
| **Business ID** | Your unique business identifier | `DINESH-GLOBAL-001` |
| **Device ID** | Unique ID for this POS terminal | `POS-TERMINAL-01` |
| **Sync Secret Key** | (Optional) Your API secret | Leave blank for now |
| **JWT Token** | (Optional) Authentication token | Leave blank for now |
| **Device Auth Token** | (Optional) Device-specific token | Leave blank for now |
| **Auto Sync** | Keep enabled | ✓ Checked |
| **Sync Interval** | How often to sync (seconds) | `10` |
| **Batch Size** | Records per sync batch | `10` |
| **Retry Interval** | Retry delay for failures | `30` |
| **Max Retry Attempts** | Maximum retries before giving up | `5` |

### 3. Test Connection
1. Click **Test Connection** button
2. Wait for the response
3. You should see: "Endpoint reachable" or "Server responded"
4. If you get an error, check your internet connection and verify the URL

### 4. Save Settings
1. Click **Save Settings** button
2. The system will:
   - Validate your configuration
   - Test the connection
   - Start the background sync worker
   - Begin syncing any pending changes

### 5. Verify Sync Status
Look at the status dashboard at the top of the Cloud Sync page:
- **Pending**: Records waiting to sync
- **Synced**: Successfully uploaded records
- **Failed**: Records that couldn't sync (will retry automatically)
- **Queue**: Total items in sync queue

---

## How It Works

### Offline-First Architecture
- All POS operations happen **locally first** (IndexedDB)
- Changes are instantly recorded and your billing never waits for the cloud
- A background worker runs every 10 seconds to push pending changes

### What Gets Synced?
The following data is automatically synced:
- ✅ Products, Categories, Brands, Variants
- ✅ Customers, Suppliers
- ✅ Sales, Sale Items (every invoice)
- ✅ Purchases, Purchase Items
- ✅ Inventory, Stock Adjustments
- ✅ Staff/Users
- ✅ Settings

### Queue & Retry Logic
- Failed syncs are automatically retried with exponential backoff:
  - Retry 1: after 30 seconds
  - Retry 2: after 2 minutes
  - Retry 3: after 5 minutes
  - Retry 4-5: after 15 minutes
- After 5 failed attempts, the record stays in "Failed" state until you manually retry

### Idempotency
- Every sync request includes a unique `syncHash` to prevent duplicates
- If the server receives the same data twice, it will respond with `409 Conflict` (treated as success)

---

## Cloud API Endpoints

Your Render cloud backend should support these endpoints:

### GET /health
Health check endpoint. Returns server status.

**Response:**
```json
{
  "status": "ok" | "degraded",
  "service": "pos-sync-backend",
  "version": "2.0.0",
  "db": "available" | "unavailable"
}
```

### POST /api/sync/push
Main sync endpoint for pushing POS data to cloud.

**Request Headers:**
```
Content-Type: application/json
X-Business-Id: <your-business-id>
X-Device-Id: <your-device-id>
X-Queue-UUID: <unique-queue-item-id>
X-Transaction-UUID: <unique-transaction-id>
X-Timestamp: <ISO-8601 timestamp>
Authorization: Bearer <jwt-token> (optional)
X-Device-Auth: <device-token> (optional)
X-Request-Signature: <hash> (optional)
```

**Request Body:**
```json
{
  "queueUuid": "abc-123",
  "transactionUuid": "xyz-789",
  "entityType": "products" | "sales" | "customers" | etc.,
  "entityId": 42,
  "actionType": "create" | "update" | "delete",
  "payload": { /* the full record data */ },
  "businessId": "DINESH-GLOBAL-001",
  "deviceId": "POS-TERMINAL-01",
  "syncHash": "a1b2c3d4...",
  "timestamp": "2026-07-06T10:30:00.000Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Record synced",
  "recordId": 42
}
```

**Response (Duplicate - 409 Conflict):**
```json
{
  "success": true,
  "message": "Already synced",
  "duplicate": true
}
```

---

## Troubleshooting

### Connection Test Fails
**Error:** "Cannot reach server"
- Check your internet connection
- Verify the URL is correct: `https://ram1-ai0s.onrender.com`
- Your Render backend may be sleeping (free tier) — try again after 30 seconds

**Error:** "Timed out after 15 seconds"
- Render free tier may be slow to wake up
- Try again, or upgrade to paid tier for instant response

### Sync Queue Keeps Growing
**Problem:** Pending records increase but never sync
- Check "Recent Sync Logs" at the bottom of Cloud Sync page
- Look for error messages like "404 Not Found" or "500 Server Error"
- Your backend `/api/sync/push` endpoint may not be implemented yet

**Solution:**
- Ensure your Render backend handles POST `/api/sync/push`
- Return HTTP 200 with `{"success": true}` for successful syncs
- See the API spec above

### All Items Show "Failed"
**Problem:** Every sync attempt fails immediately
- Check "Last Error" in the status bar
- Common causes:
  - Backend is down or returning errors
  - Wrong Business ID / Device ID
  - Backend validation rejects the data format

**Solution:**
1. Click **Retry Failed Sync** to re-queue all failed items
2. Check backend logs on Render dashboard
3. Verify your backend accepts the JSON format shown above

### Clear Sync Cache
If you need to **reset everything** (e.g., testing):
1. Click **Clear Sync Cache** button
2. This deletes all pending, synced, and failed items from the local queue
3. Future changes will start fresh

---

## Viewing Sync Logs

### In the App
1. Go to **Settings** → **Cloud Sync** tab
2. Scroll down to "Recent Sync Logs"
3. You'll see the 8 most recent sync events

### Detailed Logs Page
1. Click **Cloud Sync Logs** in the sidebar (under Reports section)
2. View all sync events with filters:
   - All Logs
   - Failed Only
   - Today
   - This Week
   - This Month
3. Export logs as JSON for debugging

---

## Advanced: Adding Your Own Backend

If you want to host your own sync server (not using Render), you can:

1. Build a Node.js/Express backend that implements the endpoints above
2. Deploy to any cloud provider (Heroku, DigitalOcean, AWS, etc.)
3. Update the **API Endpoint** field in Cloud Sync settings
4. Set **Sync Secret Key**, **JWT Token**, and **Device Auth Token** for security
5. The POS will send signed requests with `X-Request-Signature` header

---

## Support

For questions or issues:
- Check the **Diagnostics** tab in Settings for system logs
- Export logs and review sync errors
- Contact your system administrator or developer

---

**Last Updated:** July 6, 2026
**POS System:** VENDEXA RetailOS
**Cloud API:** https://ram1-ai0s.onrender.com

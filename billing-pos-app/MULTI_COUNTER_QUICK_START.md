# Multi-Counter Quick Start Guide
## Get Your Network Synchronization Running in 5 Minutes

This guide will help you quickly set up multi-device synchronization for VENDEXA RetailOS.

---

## 📋 Prerequisites

Before you start, ensure:
- ✅ All devices are on the **same WiFi network** OR connected via **LAN cable**
- ✅ You have **at least 2 devices** (1 main counter with printer + 1 or more secondary counters)
- ✅ The `ws` package is installed: `npm install ws@^8.18.0`
- ✅ Your app is wrapped with `NetworkSyncProvider`

---

## 🚀 Setup Steps

### Step 1: Install Dependencies

```bash
cd billing-pos-app
npm install
```

This installs the WebSocket library required for network communication.

### Step 2: Start the Application

On all devices, start the application:

```bash
npm run electron:dev
```

Or for production builds:

```bash
npm run electron:build
```

---

## 🖥️ Main Device Setup (Server)

This is the device connected to the thermal printer.

1. **Open Network Settings**
   - Click the network status indicator in the top bar
   - OR navigate to Settings > Network

2. **Configure as Server**
   - Click "Server Setup" tab
   - Keep default port (9876) or change if needed
   - Enter a device name: e.g., "Main Counter"
   - Click **"Start Server"**

3. **Note the IP Address**
   - The server will display its IP address (e.g., `192.168.1.100`)
   - Write this down for connecting other devices

4. **Verify Server is Running**
   - Status indicator should show "Server Active" in green
   - Network icon should pulse

### Quick Server Start Checklist:
- ✅ Device has printer connected
- ✅ Server started successfully  
- ✅ IP address noted down
- ✅ Green "Server Active" status

---

## 📱 Secondary Devices Setup (Clients)

These are additional counter devices without printers.

### Automatic Connection (Recommended):

1. **Open Network Settings**
   - Click network status indicator
   - Click "Client Setup" tab

2. **Discover Server**
   - Click the **"Discover"** button
   - Wait 3-5 seconds for servers to appear

3. **Connect**
   - Click **"Connect"** button next to your main server
   - Done! Connection established automatically

### Manual Connection:

1. **Open Network Settings**
   - Go to Client Setup > Manual Connection

2. **Enter Server Details**
   - **Server IP**: Enter the main device IP (e.g., `192.168.1.100`)
   - **Port**: Enter `9876` (or the port you configured)
   - **Device Name**: Enter a name like "Counter 2"
   - ✅ Check "Auto-reconnect if connection is lost"

3. **Connect**
   - Click **"Connect to Server"**
   - Wait for "Connected" status

### Quick Client Setup Checklist:
- ✅ Same network as server
- ✅ Server IP address known
- ✅ "Connected" status shown in green
- ✅ Auto-reconnect enabled

---

## ✅ Verify Everything Works

### Test 1: Data Synchronization

**On Secondary Device (Client):**
1. Create a new product
2. Name it "Sync Test"
3. Click Save

**On Main Device (Server):**
1. Navigate to Products
2. Look for "Sync Test" product
3. ✅ If it appears, sync is working!

### Test 2: Remote Printing

**On Secondary Device (Client):**
1. Create a test invoice
2. Click "Print" button
3. Check the main device's printer

**Expected Result:**
- ✅ Print job sent to main device
- ✅ Invoice prints on main device's printer
- ✅ Success notification appears

### Test 3: Bidirectional Sync

**On Main Device (Server):**
1. Update a product price
2. Save changes

**On Secondary Device (Client):**
1. Open the same product
2. ✅ Price should be updated automatically

---

## 🔧 Troubleshooting

### Problem: Can't Discover Server

**Solutions:**
1. Make sure both devices are on same WiFi network
2. Check firewall settings (allow port 9876 and 9877)
3. Use **manual connection** with server IP instead
4. Restart both devices

### Problem: Connection Keeps Dropping

**Solutions:**
1. Enable "Auto-reconnect" in client settings
2. Check WiFi signal strength
3. Consider using **LAN cable** for stability
4. Ensure no VPN is interfering

### Problem: Data Not Syncing

**Solutions:**
1. Check connection status (should be green)
2. Look at network indicator - sync queue should be near 0
3. Try disconnecting and reconnecting
4. Perform a full sync (disconnect, reconnect)

### Problem: Remote Print Not Working

**Solutions:**
1. Verify printer is connected to **main device**
2. Test local printing on main device first
3. Check connection between devices
4. Print will fallback to local if remote fails

### Problem: Firewall Blocking Connection

**Windows Firewall Fix:**
1. Search "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Find "Electron" or "VENDEXA RetailOS"
4. Check both Private and Public boxes
5. Click OK

---

## 📊 Using the Test Panel (Optional)

For advanced troubleshooting:

```jsx
import NetworkTestPanel from './components/NetworkTestPanel';

// Add to your settings or debug page
<NetworkTestPanel onClose={() => {}} />
```

This will run automated tests and generate a detailed report.

---

## 🎯 Best Practices

### DO:
- ✅ Keep main device (server) on **stable wired connection**
- ✅ Enable **auto-reconnect** on all clients
- ✅ Name devices clearly ("Counter 1", "Counter 2", etc.)
- ✅ Monitor network status indicator regularly
- ✅ Test after setup to ensure everything works

### DON'T:
- ❌ Expose server to the internet (use private network only)
- ❌ Change IP addresses frequently (use DHCP reservation)
- ❌ Mix different app versions across devices
- ❌ Ignore connection warnings
- ❌ Skip testing after setup

---

## 📱 Day-to-Day Usage

### Starting Your Day:
1. Turn on **main device** first (wait for "Server Active")
2. Turn on **secondary devices**
3. Secondary devices should auto-connect
4. Verify all devices show "Connected" status

### During Operation:
- Check network indicator occasionally
- Green = Good, everything syncing
- Orange/Red = Connection issue, resolve immediately

### Ending Your Day:
- No special shutdown needed
- Network connections close automatically
- Data is saved locally on all devices

---

## 🆘 Emergency Procedures

### If Main Device Goes Down:
1. Secondary devices will show "Disconnected"
2. They can **continue working offline**
3. When main device comes back, they'll auto-reconnect
4. All offline data will sync automatically

### If Network Goes Down:
1. All devices work **offline independently**
2. Each has full local database copy
3. When network returns, enable sync again
4. Perform full sync to reconcile changes

---

## 📈 What Gets Synced

### Automatically Synced:
- ✅ Products & Variants
- ✅ Inventory & Stock movements
- ✅ Invoices & Sales
- ✅ Customers
- ✅ Suppliers & Purchases
- ✅ Categories
- ✅ Staff members
- ✅ Expenses
- ✅ Settings (most)

### NOT Synced:
- ❌ Network configuration
- ❌ Device-specific settings
- ❌ Local files/images
- ❌ Print queue
- ❌ Login sessions

---

## 🎓 Next Steps

After successful setup:

1. **Read the full guide**: See `NETWORK_INTEGRATION_GUIDE.md`
2. **Review security**: Ensure network is private
3. **Train staff**: Show them network indicator
4. **Monitor usage**: Check sync statistics
5. **Plan backups**: Sync doesn't replace backups!

---

## 📞 Need Help?

### Common Resources:
- 📖 Full Documentation: `NETWORK_INTEGRATION_GUIDE.md`
- 🔧 API Reference: See integration guide
- 🐛 Check Console: F12 for error messages
- 📊 Test Panel: Run diagnostics

### Before Asking for Help:
1. Run the test panel
2. Check console for errors (F12)
3. Verify firewall settings
4. Try manual connection
5. Test with a simple sync (create product)

---

## ✨ You're All Set!

Your multi-counter system is now ready for production use. 

**Key Reminders:**
- 🟢 Keep main device stable
- 🔄 Auto-reconnect enabled on clients
- 📡 Monitor network indicator
- 💾 Regular backups (sync ≠ backup)
- 🧪 Test after any changes

**Enjoy seamless multi-device billing! 🎉**

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│  MULTI-COUNTER QUICK REFERENCE          │
├─────────────────────────────────────────┤
│  Server Port:        9876               │
│  Discovery Port:     9877               │
│  Auto-reconnect:     Recommended        │
│  Network Type:       WiFi or LAN        │
│  Main Device:        Has printer        │
│  Secondary Devices:  No printer needed  │
│                                          │
│  Status Colors:                         │
│  🟢 Green  = Connected                  │
│  🟠 Orange = Warning                    │
│  🔴 Red    = Disconnected               │
│  ⚪ Gray   = Standalone                 │
└─────────────────────────────────────────┘
```

**Print this and keep at each counter for reference!**

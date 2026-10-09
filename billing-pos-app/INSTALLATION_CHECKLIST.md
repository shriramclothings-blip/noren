# Multi-Counter Installation Checklist

Complete this checklist to ensure everything is properly installed and configured.

---

## ✅ Phase 1: Prerequisites

- [ ] Node.js installed (v16 or higher)
- [ ] npm installed and working
- [ ] Git installed (optional)
- [ ] At least 2 devices available
- [ ] All devices on same network
- [ ] Thermal printer connected to main device

---

## ✅ Phase 2: Installation

### Install Dependencies

```bash
npm install
```

**Expected Result:** All packages installed without errors

- [ ] `ws@^8.18.0` installed
- [ ] All dependencies installed successfully
- [ ] No error messages in console

---

## ✅ Phase 3: File Verification

Verify all network files exist:

### Core Network Files:
- [ ] `src/network/NetworkServer.js`
- [ ] `src/network/NetworkClient.js`
- [ ] `src/network/DataSyncEngine.js`

### Electron Main Process:
- [ ] `electron-network-server.js`
- [ ] `electron-network-client.js`
- [ ] `electron-network-discovery.js`
- [ ] `electron-main.js` (updated)
- [ ] `electron-preload.js` (updated)

### React Components:
- [ ] `src/components/NetworkSettingsPanel.js`
- [ ] `src/components/NetworkStatusIndicator.js`
- [ ] `src/components/NetworkTestPanel.js`

### Context & Hooks:
- [ ] `src/context/NetworkSyncContext.js`
- [ ] `src/hooks/useSyncedDB.js`

### Database & Services:
- [ ] `src/db/dbSync.js`
- [ ] `src/services/RemotePrintService.js`

### Documentation:
- [ ] `NETWORK_INTEGRATION_GUIDE.md`
- [ ] `MULTI_COUNTER_QUICK_START.md`
- [ ] `INSTALLATION_CHECKLIST.md` (this file)

### Testing:
- [ ] `src/utils/networkTester.js`

---

## ✅ Phase 4: Code Integration

### Step 1: Wrap App with Provider

**File:** `src/App.js` or `src/index.js`

```jsx
import { NetworkSyncProvider } from './context/NetworkSyncContext';

function App() {
  return (
    <NetworkSyncProvider>
      {/* Your app */}
    </NetworkSyncProvider>
  );
}
```

- [ ] NetworkSyncProvider imported
- [ ] App wrapped with provider
- [ ] No console errors

### Step 2: Add Status Indicator

**File:** Your main layout component

```jsx
import NetworkStatusIndicator from './components/NetworkStatusIndicator';

// In your header/navbar:
<NetworkStatusIndicator />
```

- [ ] NetworkStatusIndicator imported
- [ ] Added to UI (header/navbar)
- [ ] Displays in interface

### Step 3: Use Synced Database (Optional but Recommended)

**Before:**
```jsx
import { dbAdd, dbPut } from './db/db';
```

**After:**
```jsx
import { useSyncedDB } from './hooks/useSyncedDB';

function MyComponent() {
  const db = useSyncedDB();
  // Use db.add(), db.put(), etc.
}
```

- [ ] Updated imports in key components
- [ ] Database operations still work
- [ ] No breaking changes

---

## ✅ Phase 5: Development Testing

### Test 1: App Starts

```bash
npm run electron:dev
```

**Verify:**
- [ ] App launches without errors
- [ ] No console errors
- [ ] NetworkStatusIndicator visible
- [ ] Shows "Standalone" mode initially

### Test 2: Network Settings Opens

**Actions:**
1. Click network status indicator
2. Network settings panel should open

**Verify:**
- [ ] Panel opens smoothly
- [ ] Three tabs visible (Overview, Server, Client)
- [ ] Device ID displayed
- [ ] No errors in console

### Test 3: Start Server

**Actions:**
1. Click "Server Setup" tab
2. Click "Start Server"

**Verify:**
- [ ] Server starts successfully
- [ ] IP address displayed
- [ ] Status changes to "Server Active"
- [ ] Green indicator shown
- [ ] Console shows: "Network server started on..."

### Test 4: Discover Server (Different Device)

**Actions:**
1. On second device, open network settings
2. Click "Client Setup" tab
3. Click "Discover" button

**Verify:**
- [ ] Server found automatically
- [ ] Correct IP and name shown
- [ ] "Connect" button available

### Test 5: Connect Client to Server

**Actions:**
1. Click "Connect" on discovered server

**Verify:**
- [ ] Connection successful
- [ ] Status changes to "Connected"
- [ ] Green indicator on both devices
- [ ] Console shows: "Connected to server..."

### Test 6: Data Synchronization

**On Client Device:**
1. Create a test product
2. Name it "Sync Test Product"
3. Save

**On Server Device:**
1. Navigate to products list
2. Look for "Sync Test Product"

**Verify:**
- [ ] Product appears on server within 2-3 seconds
- [ ] All data fields match
- [ ] No errors in console

### Test 7: Bidirectional Sync

**On Server Device:**
1. Edit "Sync Test Product"
2. Change price to 99.99
3. Save

**On Client Device:**
1. View the same product
2. Check the price

**Verify:**
- [ ] Price updated to 99.99
- [ ] Update happens within 2-3 seconds
- [ ] Both devices show same data

### Test 8: Remote Printing

**On Client Device:**
1. Create a simple test invoice
2. Click print

**On Server Device:**
- [ ] Print request received
- [ ] Printer starts printing
- [ ] Invoice printed successfully

**Alternative (if no printer):**
- [ ] Print dialog appears on server
- [ ] No errors thrown

---

## ✅ Phase 6: Network Tests

### Run Automated Tests

**File:** Add to settings or create test page

```jsx
import NetworkTestPanel from './components/NetworkTestPanel';

<NetworkTestPanel onClose={() => {}} />
```

**Actions:**
1. Enter server IP
2. Click "Run All Tests"

**Verify:**
- [ ] All tests run without crashes
- [ ] Test report generated
- [ ] Most/all tests pass
- [ ] Can download HTML report

---

## ✅ Phase 7: Production Build

### Build for Production

```bash
npm run electron:build
```

**Verify:**
- [ ] Build completes successfully
- [ ] Executable created in `dist/` folder
- [ ] No build errors
- [ ] File size reasonable (not too large)

### Test Production Build

1. Install the built application
2. Launch on both devices
3. Repeat Tests 3-8 from Phase 5

**Verify:**
- [ ] All features work in production
- [ ] Server starts correctly
- [ ] Client connects successfully
- [ ] Data syncs properly
- [ ] Printing works

---

## ✅ Phase 8: Network Configuration

### Firewall Configuration

**Windows:**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find your app
4. Check Private and Public

**Verify:**
- [ ] App allowed through firewall
- [ ] Both TCP and UDP allowed
- [ ] Port 9876 accessible
- [ ] Port 9877 accessible

### Network Setup

**Verify:**
- [ ] All devices on same subnet
- [ ] Can ping server from client
- [ ] No VPN interfering
- [ ] Router not blocking ports

---

## ✅ Phase 9: Documentation Review

- [ ] Read MULTI_COUNTER_QUICK_START.md
- [ ] Read NETWORK_INTEGRATION_GUIDE.md
- [ ] Understand server/client roles
- [ ] Know troubleshooting steps
- [ ] Printed quick reference card

---

## ✅ Phase 10: User Training

### Train Staff On:
- [ ] What the network indicator means
- [ ] How to identify connection issues
- [ ] When to call for help
- [ ] How to work offline if needed

### Create Documentation:
- [ ] Quick reference guide for staff
- [ ] Troubleshooting flowchart
- [ ] Support contact information
- [ ] Emergency procedures

---

## 🎉 Installation Complete!

If all checkboxes are checked, your multi-counter system is ready for production.

### Post-Installation:

1. **Monitor First Week**
   - Watch for connection issues
   - Check sync performance
   - Gather staff feedback

2. **Regular Maintenance**
   - Check connection status daily
   - Review sync queue occasionally
   - Update all devices together

3. **Backup Strategy**
   - Continue regular backups
   - Sync is NOT a backup replacement
   - Test restore procedures

---

## 🐛 Common Issues During Installation

### Issue: `ws` module not found
**Solution:** Run `npm install ws@^8.18.0`

### Issue: NetworkSyncProvider not defined
**Solution:** Check import path and provider wrapper

### Issue: Server won't start
**Solution:** 
- Check if port 9876 is already in use
- Try a different port
- Check firewall settings

### Issue: Can't discover server
**Solution:**
- Use manual connection
- Check if both on same network
- Verify server is running

### Issue: Sync not working
**Solution:**
- Verify connection is active (green)
- Check console for errors
- Try disconnect and reconnect

---

## 📞 Installation Support

### Before Requesting Help:

1. Complete all checklist items
2. Run the Network Test Panel
3. Check console logs (F12)
4. Note any error messages
5. Document steps to reproduce

### Information to Provide:

- Operating system version
- Node.js version (`node --version`)
- Error messages from console
- Network test report (if available)
- Steps taken so far

---

## 🎯 Success Criteria

Your installation is successful when:

✅ **Core Functionality:**
- Server starts and shows IP
- Client connects automatically
- Green status on both devices

✅ **Data Synchronization:**
- Products sync in 2-3 seconds
- Changes sync bidirectionally
- No data loss or corruption

✅ **Remote Printing:**
- Print jobs route to main device
- Prints complete successfully
- Fallback works if connection lost

✅ **Stability:**
- Auto-reconnect works
- No frequent disconnections
- Handles network interruptions

✅ **User Experience:**
- Status indicator always visible
- Clear connection state
- Easy to configure

---

## 📋 Installation Record

**Installation Date:** _______________

**Installed By:** _______________

**Server Device:**
- Device Name: _______________
- IP Address: _______________
- OS Version: _______________

**Client Devices:**
1. Device Name: _______________ | IP: _______________
2. Device Name: _______________ | IP: _______________
3. Device Name: _______________ | IP: _______________

**Network Details:**
- Network Name: _______________
- Router IP: _______________
- Network Type: [ ] WiFi [ ] LAN

**Test Results:**
- Data Sync: [ ] Pass [ ] Fail
- Remote Print: [ ] Pass [ ] Fail
- Auto-reconnect: [ ] Pass [ ] Fail

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

**Sign-off:** _______________ Date: _______________

---

**Congratulations! Your multi-counter installation is complete! 🎉**

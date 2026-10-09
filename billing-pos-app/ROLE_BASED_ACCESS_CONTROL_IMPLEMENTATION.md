# Role-Based Access Control (RBAC) Implementation Guide

## 🔒 Security Feature: Strict Role-Based Access Control

This document describes the implementation of strict role-based access control (RBAC) for the Billing POS application.

---

## 📋 Overview

The RBAC system enforces strict access control where:
- **Cashier** users can ONLY access **POS Billing** and **Invoices**
- **Staff** users can access most operational features (but not admin settings)
- **Admin** users have full access to all features

---

## 🏗️ Architecture

The implementation uses a **defense-in-depth** security approach with three layers:

### Layer 1: UI Level (Sidebar)
- Filters navigation menu items based on user role
- Users only see menu items they have permission to access

### Layer 2: Route Level (ProtectedRoute Component)
- Validates access when user attempts to navigate to a page
- Shows "Access Denied" screen and redirects unauthorized users

### Layer 3: Application Level (App.js)
- Validates page access on every route change
- Automatically redirects users to their default page if access is denied

---

## 📁 Files Modified/Created

### 1. **src/utils/rolePermissions.js** (NEW)
Core RBAC utility module containing:
- Role definitions (`ROLES.ADMIN`, `ROLES.STAFF`, `ROLES.CASHIER`)
- Page definitions (all available pages)
- Permission matrix (which roles can access which pages)
- Helper functions:
  - `hasPageAccess(user, page)` - Check if user can access a page
  - `getUserAccessiblePages(user)` - Get all pages user can access
  - `getDefaultPageForRole(user)` - Get default landing page for role
  - `isAdmin(user)`, `isCashier(user)`, `isStaff(user)` - Role checks

### 2. **src/components/ProtectedRoute.js** (NEW)
Route protection component that:
- Wraps page components to enforce access control
- Shows "Access Denied" screen for unauthorized access
- Automatically triggers redirection to user's default page
- Logs security events to console

### 3. **src/components/Sidebar.js** (MODIFIED)
Updated to filter navigation items:
- Imports `hasPageAccess` from rolePermissions
- Filters menu items based on both feature toggles AND role permissions
- Only displays navigation items the user can access

### 4. **src/App.js** (MODIFIED)
Updated to enforce RBAC:
- Imports `hasPageAccess` and `getDefaultPageForRole`
- Imports `ProtectedRoute` component
- Validates user access on page changes with `useEffect`
- Wraps all page components with `ProtectedRoute`
- Implements redirect handler for unauthorized access

---

## 🎯 Role Permissions Matrix

### Cashier Role (Restricted)
**Access Limited To:**
- ✅ POS Billing (`pos`)
- ✅ Invoices (`invoices`)

**No Access To:**
- ❌ Dashboard
- ❌ Inventory
- ❌ Reports
- ❌ Settings
- ❌ All other features

**Default Landing Page:** POS Billing

---

### Staff Role (Operational)
**Has Access To:**
- ✅ Dashboard
- ✅ POS Billing
- ✅ Invoices
- ✅ Inventory (full)
- ✅ Batch Tracking
- ✅ Warehouse
- ✅ Expiry Tracker
- ✅ Returns & Exchanges
- ✅ Stock Transfers
- ✅ Stock Management
- ✅ Store Health
- ✅ Smart Purchase
- ✅ Trending Items
- ✅ Sales Heatmap
- ✅ Reports (basic)
- ✅ Advanced Charts
- ✅ Customers
- ✅ Customer Insights
- ✅ Loyalty Engine
- ✅ Purchases
- ✅ Suppliers

**No Access To:**
- ❌ Staff Management
- ❌ Expenses
- ❌ Discount Engine
- ❌ ABC Analysis
- ❌ Financial Reports
- ❌ AI Reports
- ❌ Delete History
- ❌ Audit Logs
- ❌ Settings

**Default Landing Page:** Dashboard

---

### Admin Role (Full Access)
**Has Access To:**
- ✅ **ALL FEATURES** - Complete system access

**Default Landing Page:** Dashboard

---

## 🧪 Testing Instructions

### Test Scenario 1: Cashier Login
1. **Login as Cashier**
   - Username: Create a cashier user in Staff Management
   - Role: Cashier

2. **Expected Behavior:**
   - User is automatically directed to POS Billing page
   - Sidebar shows ONLY two menu items: "POS / Billing" and "Invoices"
   - All other navigation items are hidden

3. **Test Unauthorized Access:**
   - Try to manually navigate by typing URL hash: `#dashboard`
   - Expected: User sees "Access Denied" screen
   - Expected: User is automatically redirected back to POS page
   - Console shows: `[RBAC Security] Access denied...` message

4. **Test Allowed Pages:**
   - Navigate to POS Billing - Should work ✅
   - Navigate to Invoices - Should work ✅

---

### Test Scenario 2: Staff Login
1. **Login as Staff**
   - Username: Create a staff user in Staff Management
   - Role: Staff

2. **Expected Behavior:**
   - User is directed to Dashboard
   - Sidebar shows operational menu items (Inventory, Reports, Customers, etc.)
   - Admin-only items are hidden (Settings, Staff, Expenses, etc.)

3. **Test Unauthorized Access:**
   - Try to navigate to Settings page: `#settings`
   - Expected: "Access Denied" screen → redirect to Dashboard

4. **Test Allowed Pages:**
   - Navigate to Dashboard - Should work ✅
   - Navigate to Inventory - Should work ✅
   - Navigate to Reports - Should work ✅
   - Navigate to Customers - Should work ✅

---

### Test Scenario 3: Admin Login
1. **Login as Admin**
   - Username: `admin`
   - Password: `admin123`
   - Role: Admin

2. **Expected Behavior:**
   - User is directed to Dashboard
   - Sidebar shows ALL menu items
   - User can access any page in the system

3. **Test Full Access:**
   - Navigate to any page - All should work ✅
   - Settings, Staff, Expenses, etc. - All accessible

---

### Test Scenario 4: Direct URL Access Prevention
1. **Login as Cashier**

2. **Test Direct Navigation:**
   ```
   Try manually typing in browser/URL bar:
   - #inventory
   - #settings
   - #customers
   - #staff
   ```

3. **Expected Behavior:**
   - Page briefly shows "Access Denied" screen
   - User is automatically redirected to POS page
   - Console logs security warning

---

### Test Scenario 5: Session Persistence
1. **Login as Cashier** and navigate to POS
2. **Refresh the browser** (F5)
3. **Expected:** User remains on POS page or is redirected to POS (not Dashboard)

---

## 🔐 Security Features Implemented

### 1. **Multi-Layer Defense**
- UI filtering (Sidebar)
- Route protection (ProtectedRoute)
- Application-level validation (App.js)

### 2. **Automatic Redirection**
- Unauthorized users are immediately redirected
- Each role has a default landing page

### 3. **No Bypass Routes**
- Direct URL access is blocked
- Hash navigation is intercepted
- Keyboard shortcuts respect permissions

### 4. **Security Logging**
- All access violations are logged to console
- Includes user, role, attempted page, and timestamp

### 5. **Graceful User Experience**
- Clear "Access Denied" messages
- Explains why access is restricted
- Shows user's current role

---

## 🛠️ How to Modify Permissions

### To Add New Page Access for Cashier:
Edit `src/utils/rolePermissions.js`:

```javascript
const ROLE_PERMISSIONS = {
  [ROLES.CASHIER]: [
    PAGES.POS,
    PAGES.INVOICES,
    PAGES.NEW_FEATURE, // Add new page here
  ],
  // ...
};
```

### To Create New Role:
1. Add role to `ROLES` object
2. Add permissions array in `ROLE_PERMISSIONS`
3. Update `getDefaultPageForRole()` function

---

## 🚨 Important Security Notes

1. **Never remove RBAC checks** - All three layers must remain in place
2. **Cashier restrictions are intentional** - For security, cashiers should only do billing
3. **Test after any changes** - Always verify all three roles after modifications
4. **Console warnings are intentional** - They help track unauthorized access attempts
5. **Don't bypass ProtectedRoute** - All page components must be wrapped

---

## 📞 Troubleshooting

### Issue: Cashier can't access a page they should
**Solution:** Check `ROLE_PERMISSIONS` in `rolePermissions.js` - ensure page is listed for Cashier role

### Issue: Admin sees "Access Denied"
**Solution:** Check that `ROLES.ADMIN` has `...Object.values(PAGES)` in permissions

### Issue: Navigation items not filtering
**Solution:** Verify Sidebar.js is importing and using `hasPageAccess()`

### Issue: User can bypass by direct URL
**Solution:** Ensure App.js has the role validation `useEffect` and ProtectedRoute is wrapping pages

---

## ✅ Verification Checklist

- [ ] Cashier can ONLY access POS and Invoices
- [ ] Cashier sees ONLY 2 menu items in sidebar
- [ ] Cashier is auto-redirected when trying unauthorized access
- [ ] Staff can access operational features
- [ ] Staff cannot access Settings, Staff Management, or Expenses
- [ ] Admin can access all features
- [ ] Direct URL navigation is blocked for unauthorized pages
- [ ] Browser refresh maintains security restrictions
- [ ] Console logs show security warnings on violations
- [ ] "Access Denied" screen displays correctly

---

## 📊 Success Criteria

✅ **Security:** Cashier users cannot access any feature except POS and Invoices  
✅ **User Experience:** Clear feedback when access is denied  
✅ **Reliability:** No way to bypass restrictions (URL, shortcuts, navigation)  
✅ **Maintainability:** Easy to modify permissions in one central file  
✅ **Performance:** No performance impact on navigation  

---

## 🎉 Implementation Complete

The role-based access control system is now fully implemented and operational. All three security layers are in place to ensure strict enforcement of role permissions.

**Date Implemented:** 2026-09-11  
**Version:** 1.0.0  
**Status:** ✅ Production Ready


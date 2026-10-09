# 🎨 RBAC Visual Guide

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGIN                               │
│  (Admin / Staff / Cashier)                                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   App Context   │
                    │  currentUser    │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
      ┌─────────┐      ┌─────────┐    ┌──────────┐
      │ CASHIER │      │  STAFF  │    │  ADMIN   │
      │  Role   │      │  Role   │    │   Role   │
      └────┬────┘      └────┬────┘    └────┬─────┘
           │                │              │
           │                │              │
           ▼                ▼              ▼
    ┌──────────┐      ┌──────────┐   ┌───────────┐
    │ 2 Pages  │      │ ~20 Pages│   │ ALL Pages │
    │ POS +    │      │Operational│   │  (Full   │
    │ Invoices │      │ Features │   │  Access)  │
    └──────────┘      └──────────┘   └───────────┘
```

---

## 🛡️ Three-Layer Security Flow

```
USER ATTEMPTS TO NAVIGATE
         │
         ▼
┌─────────────────────────────┐
│   LAYER 1: SIDEBAR CHECK    │◄───── UI Level
│  hasPageAccess(user, page)  │
│  • Filters menu items       │
│  • Hides unauthorized items │
└─────────────┬───────────────┘
              │ IF VISIBLE
              ▼
┌─────────────────────────────┐
│ LAYER 2: PROTECTEDROUTE     │◄───── Route Level
│  Page access validation     │
│  • Shows "Access Denied"    │
│  • Triggers redirect        │
└─────────────┬───────────────┘
              │ IF AUTHORIZED
              ▼
┌─────────────────────────────┐
│   LAYER 3: APP.JS CHECK     │◄───── App Level
│  useEffect validation       │
│  • Final security check     │
│  • Auto-redirect on fail    │
└─────────────┬───────────────┘
              │ IF PASSES ALL
              ▼
        ┌───────────┐
        │  RENDER   │
        │   PAGE    │
        └───────────┘
```

---

## 🎯 What Each Role Sees

### Cashier View (Restricted Mode)
```
┌─────────────────────────────────────┐
│  VENDEXA™ POS - Cashier Mode        │
├─────────────────────────────────────┤
│  Sidebar (2 items only):            │
│  ┌──────────────────────────────┐   │
│  │ 🛒 POS / Billing        [⬅️]│   │ ← Default page
│  │ 📄 Invoices                  │   │
│  └──────────────────────────────┘   │
│                                     │
│  ⚠️ All other menu items HIDDEN    │
│                                     │
│  If tries #dashboard:               │
│  ➡️ "Access Denied" ➡️ Back to POS │
│                                     │
└─────────────────────────────────────┘
```

### Staff View (Operational Mode)
```
┌─────────────────────────────────────┐
│  VENDEXA™ POS - Staff Mode          │
├─────────────────────────────────────┤
│  Sidebar (~20 items):               │
│  ┌──────────────────────────────┐   │
│  │ 📊 Dashboard            [⬅️] │   │ ← Default page
│  │ ❤️ Store Health              │   │
│  │ 🛒 POS / Billing             │   │
│  │ 📄 Invoices                  │   │
│  │ ─────────── Inventory ────── │   │
│  │ 📦 Inventory                 │   │
│  │ #️⃣ Batch Tracking            │   │
│  │ 🏢 Warehouse                 │   │
│  │ ─────────── Reports ──────── │   │
│  │ 📈 Reports                   │   │
│  │ 🔥 Trending Items            │   │
│  │ ─────────── Customers ─────  │   │
│  │ 👥 Customers                 │   │
│  │ ⭐ Loyalty Engine            │   │
│  │ ─────────── Suppliers ─────  │   │
│  │ 🚚 Purchases                 │   │
│  │ 🏷️ Suppliers                 │   │
│  └──────────────────────────────┘   │
│                                     │
│  ❌ Settings - HIDDEN              │
│  ❌ Staff Management - HIDDEN      │
│  ❌ Expenses - HIDDEN              │
└─────────────────────────────────────┘
```

### Admin View (Full Access Mode)
```
┌─────────────────────────────────────┐
│  VENDEXA™ POS - Admin Mode          │
├─────────────────────────────────────┤
│  Sidebar (ALL items):               │
│  ┌──────────────────────────────┐   │
│  │ 📊 Dashboard            [⬅️] │   │ ← Default page
│  │ ❤️ Store Health              │   │
│  │ 🛒 POS / Billing             │   │
│  │ 📄 Invoices                  │   │
│  │ ─────────── Inventory ────── │   │
│  │ 📦 Inventory                 │   │
│  │ [... all inventory items]    │   │
│  │ ─────────── Intelligence ──── │   │
│  │ 🧠 AI Reports                │   │
│  │ 📊 Financial Reports         │   │
│  │ [... all reports]            │   │
│  │ ─────────── Management ───── │   │
│  │ 👤 Staff                     │   │ ✅ Admin only
│  │ 💵 Expenses                  │   │ ✅ Admin only
│  │ ⚙️ Settings                  │   │ ✅ Admin only
│  │ 🗑️ Delete History            │   │ ✅ Admin only
│  │ 🛡️ Audit Logs                │   │ ✅ Admin only
│  └──────────────────────────────┘   │
│                                     │
│  ✅ FULL ACCESS - All features     │
└─────────────────────────────────────┘
```

---

## 🚫 Access Denied Screen

When unauthorized access is attempted:

```
┌─────────────────────────────────────────┐
│                                         │
│            ⚠️                           │
│      ACCESS DENIED                      │
│                                         │
│  You do not have permission to          │
│  access this page.                      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Your Role: cashier                │ │
│  │                                   │ │
│  │ As a Cashier, you can only        │ │
│  │ access POS Billing and Invoices.  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Redirecting to your home page...      │
│                                         │
└─────────────────────────────────────────┘

[Automatically redirects in 1-2 seconds]
```

---

## 🔄 Navigation Flow Examples

### Example 1: Cashier Tries to Access Dashboard

```
1. Cashier logged in
   ↓
2. Types "#dashboard" in URL
   ↓
3. App.js detects: hasPageAccess(cashier, "dashboard") = FALSE
   ↓
4. ProtectedRoute renders "Access Denied" screen
   ↓
5. Console logs: "[RBAC Security] Access denied..."
   ↓
6. Auto-redirect to "pos" (default for cashier)
   ↓
7. Cashier is back on POS page
```

### Example 2: Staff Accesses Inventory (Allowed)

```
1. Staff logged in
   ↓
2. Clicks "Inventory" in sidebar
   ↓
3. App.js validates: hasPageAccess(staff, "inventory") = TRUE
   ↓
4. ProtectedRoute allows access
   ↓
5. Inventory page renders successfully
```

### Example 3: Staff Tries to Access Settings (Denied)

```
1. Staff logged in
   ↓
2. Types "#settings" in URL
   ↓
3. App.js detects: hasPageAccess(staff, "settings") = FALSE
   ↓
4. "Access Denied" screen appears
   ↓
5. Auto-redirect to "dashboard" (default for staff)
```

---

## 📋 Permission Matrix Visual

```
┌─────────────────────┬─────────┬───────┬────────┐
│      Feature        │ Cashier │ Staff │ Admin  │
├─────────────────────┼─────────┼───────┼────────┤
│ POS Billing         │   ✅    │  ✅   │   ✅   │
│ Invoices            │   ✅    │  ✅   │   ✅   │
├─────────────────────┼─────────┼───────┼────────┤
│ Dashboard           │   ❌    │  ✅   │   ✅   │
│ Inventory           │   ❌    │  ✅   │   ✅   │
│ Customers           │   ❌    │  ✅   │   ✅   │
│ Reports             │   ❌    │  ✅   │   ✅   │
│ Purchases           │   ❌    │  ✅   │   ✅   │
├─────────────────────┼─────────┼───────┼────────┤
│ Settings            │   ❌    │  ❌   │   ✅   │
│ Staff Management    │   ❌    │  ❌   │   ✅   │
│ Expenses            │   ❌    │  ❌   │   ✅   │
│ Audit Logs          │   ❌    │  ❌   │   ✅   │
│ Delete History      │   ❌    │  ❌   │   ✅   │
└─────────────────────┴─────────┴───────┴────────┘

Legend:
✅ = Full Access
❌ = No Access (blocked & redirected)
```

---

## 🔐 Security Checkpoint Visualization

```
                    USER NAVIGATION
                          │
                          ▼
              ┌───────────────────────┐
              │  Is user logged in?   │
              └─────────┬─────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
           YES│                   │NO
              │                   │
              ▼                   ▼
    ┌─────────────────┐    ┌──────────┐
    │ Check role      │    │  BLOCK   │
    │ permissions     │    │ Redirect │
    └────────┬────────┘    │ to Login │
             │             └──────────┘
    ┌────────┴────────┐
    │                 │
 HAS│                 │NO
ACCESS               ACCESS
    │                 │
    ▼                 ▼
┌────────┐    ┌──────────────┐
│ ALLOW  │    │ ACCESS DENIED│
│ Render │    │ + Redirect   │
│  Page  │    └──────────────┘
└────────┘
```

---

## 🎬 Real-World Scenario

### Scenario: Cashier Working a Shift

```
Time: 9:00 AM
User: John (Cashier)
Action: Logs in to system

✅ System authenticates John
✅ Identifies role: Cashier
✅ Redirects to: POS Billing (default)
✅ Sidebar shows: POS + Invoices only

─────────────────────────────────────

Time: 9:15 AM
Action: John processes customer sale

✅ Access to POS: ALLOWED
✅ Creates invoice
✅ Prints receipt
✅ Customer checkout complete

─────────────────────────────────────

Time: 10:30 AM
Action: John tries to check inventory

❌ Types "#inventory" in browser
⚠️ Access Denied screen appears
❌ "You can only access POS and Invoices"
➡️ Redirected back to POS automatically
🔔 Security event logged

─────────────────────────────────────

Time: 2:00 PM
Action: John views past invoices

✅ Clicks "Invoices" from sidebar
✅ Access ALLOWED
✅ Can view and reprint invoices
✅ No issues

─────────────────────────────────────

Result: Cashier stayed within permitted
        areas all day. Security worked
        perfectly - blocked unauthorized
        access, allowed authorized work.
```

---

## 🎯 Quick Visual Test

### What You Should See:

**1. Login as Cashier:**
```
Sidebar:
┌────────────────┐
│ 🛒 POS         │ ← Only 2 items!
│ 📄 Invoices    │
└────────────────┘
```

**2. Login as Staff:**
```
Sidebar:
┌────────────────┐
│ 📊 Dashboard   │
│ 🛒 POS         │
│ 📄 Invoices    │
│ 📦 Inventory   │ ← Many items
│ 👥 Customers   │
│ 📈 Reports     │
│ ...            │
└────────────────┘
(Settings NOT shown)
```

**3. Login as Admin:**
```
Sidebar:
┌────────────────┐
│ 📊 Dashboard   │
│ 🛒 POS         │
│ 📄 Invoices    │
│ 📦 Inventory   │
│ 👥 Customers   │
│ ⚙️ Settings    │ ← ALL items
│ 👤 Staff       │    including
│ 💵 Expenses    │    admin-only
│ ...            │
└────────────────┘
```

---

## ✅ Visual Verification Checklist

**Print this and check off during testing:**

```
CASHIER TEST:
□ Sidebar shows exactly 2 items
□ No other menu items visible
□ Lands on POS page by default
□ Can access POS ✓
□ Can access Invoices ✓
□ Cannot access Dashboard (redirects)
□ Cannot access Settings (redirects)
□ Cannot access Inventory (redirects)
□ "Access Denied" appears when trying unauthorized page
□ Console shows security warning

STAFF TEST:
□ Sidebar shows ~20 operational items
□ Settings NOT visible
□ Staff Management NOT visible  
□ Expenses NOT visible
□ Lands on Dashboard by default
□ Can access all shown items
□ Cannot access Settings (redirects)

ADMIN TEST:
□ Sidebar shows ALL items
□ Can access every single page
□ No restrictions
```

---

## 🎊 Success Indicators

**✅ System is working correctly when:**

1. Cashier sees **exactly 2** sidebar items
2. Cashier **cannot** type URLs to bypass
3. "Access Denied" screen appears on violations
4. Console logs security warnings
5. Auto-redirect happens within 1-2 seconds
6. No error messages or crashes
7. All three roles behave differently
8. Admin has unrestricted access

---

**RBAC System: ACTIVE & ENFORCED** 🔐


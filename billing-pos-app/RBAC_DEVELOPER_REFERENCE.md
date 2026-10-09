# 👨‍💻 RBAC Developer Reference Card

## Quick API Reference

### Import Statements

```javascript
// In any component that needs role checking
import { 
  hasPageAccess, 
  getUserAccessiblePages,
  getDefaultPageForRole,
  isAdmin,
  isCashier,
  isStaff,
  ROLES,
  PAGES
} from '../utils/rolePermissions';

// Get current user from context
import { useApp } from '../context/AppContext';
const { currentUser } = useApp();
```

---

## Core Functions

### `hasPageAccess(user, page)`
**Purpose:** Check if user can access a specific page  
**Returns:** `boolean`

```javascript
const canAccess = hasPageAccess(currentUser, 'inventory');
if (canAccess) {
  // Allow access
} else {
  // Deny access
}
```

---

### `getUserAccessiblePages(user)`
**Purpose:** Get all pages user can access  
**Returns:** `Array<string>` of page keys

```javascript
const accessiblePages = getUserAccessiblePages(currentUser);
// For cashier: ['pos', 'invoices']
// For admin: [all pages]
```

---

### `getDefaultPageForRole(user)`
**Purpose:** Get default landing page for user's role  
**Returns:** `string` (page key)

```javascript
const defaultPage = getDefaultPageForRole(currentUser);
// For cashier: 'pos'
// For staff: 'dashboard'
// For admin: 'dashboard'
```

---

### Role Check Functions

```javascript
// Check if user is admin
if (isAdmin(currentUser)) {
  // Admin-only code
}

// Check if user is cashier
if (isCashier(currentUser)) {
  // Cashier-only code
}

// Check if user is staff
if (isStaff(currentUser)) {
  // Staff-only code
}
```

---

## Role Constants

```javascript
import { ROLES } from '../utils/rolePermissions';

ROLES.ADMIN    // 'admin'
ROLES.STAFF    // 'staff'
ROLES.CASHIER  // 'cashier'
```

---

## Page Constants

```javascript
import { PAGES } from '../utils/rolePermissions';

PAGES.POS                         // 'pos'
PAGES.INVOICES                    // 'invoices'
PAGES.DASHBOARD                   // 'dashboard'
PAGES.INVENTORY                   // 'inventory'
PAGES.SETTINGS                    // 'settings'
// ... all other pages
```

---

## Common Use Cases

### 1. Conditionally Render UI Elements

```javascript
function MyComponent() {
  const { currentUser } = useApp();
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show only to admin */}
      {isAdmin(currentUser) && (
        <button>Admin Settings</button>
      )}
      
      {/* Show only to admin and staff */}
      {!isCashier(currentUser) && (
        <div>Advanced Reports</div>
      )}
      
      {/* Check specific page access */}
      {hasPageAccess(currentUser, PAGES.SETTINGS) && (
        <Link to="#settings">Settings</Link>
      )}
    </div>
  );
}
```

---

### 2. Protect a Custom Component

```javascript
import ProtectedRoute from '../components/ProtectedRoute';

function CustomPage() {
  return (
    <ProtectedRoute page="customPage" onRedirect={(page) => setPage(page)}>
      <div>Protected Content</div>
    </ProtectedRoute>
  );
}
```

---

### 3. Programmatic Navigation with Role Check

```javascript
function NavigationHandler() {
  const { currentUser } = useApp();
  
  const navigateToSettings = () => {
    if (hasPageAccess(currentUser, PAGES.SETTINGS)) {
      window.location.hash = 'settings';
    } else {
      toast.error('You do not have permission to access Settings');
      // Redirect to default page
      const defaultPage = getDefaultPageForRole(currentUser);
      window.location.hash = defaultPage;
    }
  };
  
  return <button onClick={navigateToSettings}>Go to Settings</button>;
}
```

---

### 4. Filter Menu Items Based on Role

```javascript
const menuItems = [
  { key: 'pos', label: 'POS', icon: ShoppingCart },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'settings', label: 'Settings', icon: Settings },
];

// Filter by role
const accessibleItems = menuItems.filter(item => 
  hasPageAccess(currentUser, item.key)
);

// Render only accessible items
return (
  <nav>
    {accessibleItems.map(item => (
      <MenuItem key={item.key} {...item} />
    ))}
  </nav>
);
```

---

### 5. Show Role-Specific Welcome Message

```javascript
function WelcomeMessage() {
  const { currentUser } = useApp();
  
  let message = 'Welcome!';
  
  if (isCashier(currentUser)) {
    message = 'Welcome to POS System! Start billing customers.';
  } else if (isStaff(currentUser)) {
    message = 'Welcome! Check today\'s store performance.';
  } else if (isAdmin(currentUser)) {
    message = 'Welcome, Admin! Full system access available.';
  }
  
  return <h2>{message}</h2>;
}
```

---

## Debugging

### Check Current User's Permissions

```javascript
// In browser console or component
console.log('Current User:', currentUser);
console.log('Role:', currentUser?.role);
console.log('Accessible Pages:', getUserAccessiblePages(currentUser));
console.log('Default Page:', getDefaultPageForRole(currentUser));
console.log('Can access inventory?', hasPageAccess(currentUser, 'inventory'));
```

---

### Enable Security Logging

Security events are automatically logged to console:

```javascript
// Console output when access is denied:
[RBAC Security] Access denied: User "John Doe" (cashier) 
attempted to access "dashboard" without permission. 
Redirecting to "pos".
```

---

## Modifying Permissions

### Add New Page to Cashier Role

Edit `src/utils/rolePermissions.js`:

```javascript
const ROLE_PERMISSIONS = {
  [ROLES.CASHIER]: [
    PAGES.POS,
    PAGES.INVOICES,
    PAGES.NEW_FEATURE, // ← Add here
  ],
  // ...
};
```

### Create Custom Permission Check

```javascript
// Custom function for complex logic
export const canEditPrices = (user) => {
  return isAdmin(user) || (
    isStaff(user) && 
    user.permissions?.includes('edit_prices')
  );
};

// Usage
if (canEditPrices(currentUser)) {
  // Allow price editing
}
```

---

## Testing Helpers

### Mock Users for Testing

```javascript
// Mock cashier user
const mockCashier = {
  name: 'Test Cashier',
  username: 'cashier_test',
  role: 'cashier',
};

// Test permissions
console.log(hasPageAccess(mockCashier, 'pos'));       // true
console.log(hasPageAccess(mockCashier, 'dashboard')); // false

// Mock admin user
const mockAdmin = {
  name: 'Test Admin',
  username: 'admin_test',
  role: 'admin',
};

// Test permissions
console.log(hasPageAccess(mockAdmin, 'settings')); // true
```

---

## Common Patterns

### Pattern 1: Conditional Feature Access

```javascript
<FeatureComponent>
  {isAdmin(currentUser) ? (
    <AdminControls />
  ) : isCashier(currentUser) ? (
    <BasicControls />
  ) : (
    <StaffControls />
  )}
</FeatureComponent>
```

### Pattern 2: Guard Clause

```javascript
function sensitiveOperation() {
  // Early return if not admin
  if (!isAdmin(currentUser)) {
    toast.error('Admin access required');
    return;
  }
  
  // Admin-only operation
  performSensitiveAction();
}
```

### Pattern 3: Dynamic Navigation

```javascript
function DynamicNav() {
  const { currentUser } = useApp();
  const accessiblePages = getUserAccessiblePages(currentUser);
  
  return (
    <nav>
      {accessiblePages.map(pageKey => (
        <NavItem key={pageKey} page={pageKey} />
      ))}
    </nav>
  );
}
```

---

## Security Best Practices

### ✅ DO:
- Always check permissions before rendering sensitive UI
- Use `hasPageAccess()` for route-level checks
- Use role-specific functions (`isAdmin`, etc.) for component logic
- Log security events for audit trails
- Test with all three roles

### ❌ DON'T:
- Don't rely only on hiding UI elements (always check server-side too)
- Don't hardcode role names as strings (use `ROLES` constants)
- Don't bypass ProtectedRoute component
- Don't modify role permissions without testing
- Don't expose admin features based on client-side checks alone

---

## Error Handling

### Handle Permission Denials Gracefully

```javascript
function handleNavigation(page) {
  if (!hasPageAccess(currentUser, page)) {
    // Log for debugging
    console.warn(`Access denied to ${page} for ${currentUser.role}`);
    
    // Show user-friendly message
    toast.error(`You don't have permission to access ${page}`);
    
    // Redirect to safe page
    const safePage = getDefaultPageForRole(currentUser);
    window.location.hash = safePage;
    
    return;
  }
  
  // Proceed with navigation
  window.location.hash = page;
}
```

---

## Integration with Existing Code

### Add RBAC to Existing Component

```javascript
// Before
function MyPage() {
  return <div>Content</div>;
}

// After
import { hasPageAccess } from '../utils/rolePermissions';
import { useApp } from '../context/AppContext';

function MyPage() {
  const { currentUser } = useApp();
  
  if (!hasPageAccess(currentUser, 'myPage')) {
    return <AccessDenied />;
  }
  
  return <div>Content</div>;
}
```

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| User can access unauthorized page | Check if page is in ROLE_PERMISSIONS |
| Redirect loop | Verify default page is in user's permissions |
| Console errors | Ensure currentUser object has `role` property |
| Menu items not filtering | Check Sidebar.js imports hasPageAccess |
| Access denied for admin | Verify admin has `...Object.values(PAGES)` |

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/utils/rolePermissions.js` | Core RBAC logic |
| `src/components/ProtectedRoute.js` | Route guard |
| `src/components/Sidebar.js` | UI filtering |
| `src/App.js` | App-level enforcement |

---

## Quick Command Cheat Sheet

```javascript
// Check access
hasPageAccess(user, page)

// Get pages
getUserAccessiblePages(user)

// Get default
getDefaultPageForRole(user)

// Role checks
isAdmin(user)
isCashier(user)
isStaff(user)

// Constants
ROLES.ADMIN / STAFF / CASHIER
PAGES.POS / INVOICES / etc.
```

---

## Need More Help?

- **Full Documentation:** `ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md`
- **Testing Guide:** `RBAC_QUICK_TEST_GUIDE.md`
- **Visual Guide:** `RBAC_VISUAL_GUIDE.md`
- **Summary:** `RBAC_IMPLEMENTATION_SUMMARY.md`

---

**RBAC Developer Reference v1.0.0**  
**Last Updated:** September 11, 2026


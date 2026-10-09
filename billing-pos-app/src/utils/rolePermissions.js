/**
 * Role-Based Access Control (RBAC) System
 * 
 * This module defines strict access control rules for different user roles.
 * Security Implementation: Cashier users can ONLY access POS Billing and Invoices.
 * All other features are restricted to Admin and Staff roles.
 */

// Define all available roles in the system
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CASHIER: 'cashier',
};

// Define all available pages/routes in the system
export const PAGES = {
  // Core Operations
  DASHBOARD: 'dashboard',
  POS: 'pos',
  INVOICES: 'invoices',
  
  // Inventory Management
  INVENTORY: 'inventory',
  BATCH_TRACKING: 'batchTracking',
  WAREHOUSE: 'warehouse',
  EXPIRY_TRACKER: 'expiryTracker',
  ABC_ANALYSIS: 'abcAnalysis',
  INVENTORY_REPORTS: 'inventoryReports',
  RETURNS_AND_EXCHANGES: 'returnsAndExchanges',
  STOCK_TRANSFERS: 'stockTransfers',
  INVENTORY_MOVEMENT_REPORTS: 'inventoryMovementReports',
  STOCK_MANAGEMENT: 'stockManagement',
  
  // Intelligence & Analytics
  STORE_HEALTH: 'storeHealth',
  SMART_PURCHASE: 'smartPurchase',
  TRENDING_ITEMS: 'trendingItems',
  DISCOUNT_ENGINE: 'discountEngine',
  SALES_HEATMAP: 'salesHeatmap',
  PROFIT_REPORTS: 'profitReports',
  FINANCIAL_REPORTS: 'financialReports',
  REPORTS_AI: 'reports-ai',
  ADVANCED_CHARTS: 'advancedCharts',
  REPORTS: 'reports',
  
  // Customer Management
  CUSTOMERS: 'customers',
  CUSTOMER_INSIGHTS: 'customerInsights',
  LOYALTY_ENGINE: 'loyaltyEngine',
  
  // Supplier & Purchase Management
  PURCHASES: 'purchases',
  SUPPLIERS: 'suppliers',
  
  // Staff & Expense Management
  STAFF: 'staff',
  EXPENSES: 'expenses',
  
  // System & Settings
  DELETE_HISTORY: 'deleteHistory',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
  
  // Special Pages
  CUSTOMER_DISPLAY: 'customer-display',
};

/**
 * STRICT ROLE PERMISSIONS MATRIX
 * 
 * Cashier Role: Can ONLY access POS and Invoices (for billing operations)
 * Staff Role: Can access most operational features (no admin settings)
 * Admin Role: Full access to all features
 */
const ROLE_PERMISSIONS = {
  [ROLES.CASHIER]: [
    PAGES.POS,           // ✓ POS Billing - PRIMARY FUNCTION
    PAGES.INVOICES,      // ✓ Invoices - View/Print invoices
    // CASHIER HAS NO OTHER PERMISSIONS - STRICT SECURITY
  ],
  
  [ROLES.STAFF]: [
    // Core Operations
    PAGES.DASHBOARD,
    PAGES.POS,
    PAGES.INVOICES,
    
    // Inventory (View/Limited Edit)
    PAGES.INVENTORY,
    PAGES.BATCH_TRACKING,
    PAGES.WAREHOUSE,
    PAGES.EXPIRY_TRACKER,
    PAGES.INVENTORY_REPORTS,
    PAGES.RETURNS_AND_EXCHANGES,
    PAGES.STOCK_TRANSFERS,
    PAGES.INVENTORY_MOVEMENT_REPORTS,
    PAGES.STOCK_MANAGEMENT,
    
    // Intelligence & Analytics (View Only)
    PAGES.STORE_HEALTH,
    PAGES.SMART_PURCHASE,
    PAGES.TRENDING_ITEMS,
    PAGES.SALES_HEATMAP,
    PAGES.PROFIT_REPORTS,
    PAGES.ADVANCED_CHARTS,
    PAGES.REPORTS,
    
    // Customer Management
    PAGES.CUSTOMERS,
    PAGES.CUSTOMER_INSIGHTS,
    PAGES.LOYALTY_ENGINE,
    
    // Purchases (Limited)
    PAGES.PURCHASES,
    PAGES.SUPPLIERS,
    
    // NO ACCESS TO:
    // - Staff Management (can't manage other staff)
    // - Expenses (admin only)
    // - Discount Engine (admin only)
    // - ABC Analysis (admin only)
    // - Financial Reports (admin only)
    // - AI Reports (admin only)
    // - Delete History (admin only)
    // - Audit Logs (admin only)
    // - Settings (admin only)
  ],
  
  [ROLES.ADMIN]: [
    // Admin has FULL ACCESS to ALL features
    ...Object.values(PAGES),
  ],
};

/**
 * Check if a user has permission to access a specific page
 * @param {Object} user - Current user object with role property
 * @param {string} page - Page/route key to check
 * @returns {boolean} - True if user has access, false otherwise
 */
export const hasPageAccess = (user, page) => {
  if (!user || !user.role) return false;
  
  const userRole = String(user.role).toLowerCase();
  const allowedPages = ROLE_PERMISSIONS[userRole] || [];
  
  return allowedPages.includes(page);
};

/**
 * Get all pages accessible by a user based on their role
 * @param {Object} user - Current user object with role property
 * @returns {Array} - Array of page keys the user can access
 */
export const getUserAccessiblePages = (user) => {
  if (!user || !user.role) return [];
  
  const userRole = String(user.role).toLowerCase();
  return ROLE_PERMISSIONS[userRole] || [];
};

/**
 * Get the default landing page for a user based on their role
 * @param {Object} user - Current user object with role property
 * @returns {string} - Default page key for the user's role
 */
export const getDefaultPageForRole = (user) => {
  if (!user || !user.role) return PAGES.POS;
  
  const userRole = String(user.role).toLowerCase();
  
  // Cashier always starts at POS
  if (userRole === ROLES.CASHIER) {
    return PAGES.POS;
  }
  
  // Staff starts at Dashboard
  if (userRole === ROLES.STAFF) {
    return PAGES.DASHBOARD;
  }
  
  // Admin starts at Dashboard
  if (userRole === ROLES.ADMIN) {
    return PAGES.DASHBOARD;
  }
  
  // Fallback
  return PAGES.POS;
};

/**
 * Check if user is admin
 * @param {Object} user - Current user object
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = (user) => {
  return user && String(user.role).toLowerCase() === ROLES.ADMIN;
};

/**
 * Check if user is cashier
 * @param {Object} user - Current user object
 * @returns {boolean} - True if user is cashier
 */
export const isCashier = (user) => {
  return user && String(user.role).toLowerCase() === ROLES.CASHIER;
};

/**
 * Check if user is staff
 * @param {Object} user - Current user object
 * @returns {boolean} - True if user is staff
 */
export const isStaff = (user) => {
  return user && String(user.role).toLowerCase() === ROLES.STAFF;
};

/**
 * Get a human-readable description of role permissions
 * @param {string} role - Role to describe
 * @returns {string} - Description of role permissions
 */
export const getRoleDescription = (role) => {
  const roleKey = String(role).toLowerCase();
  
  const descriptions = {
    [ROLES.CASHIER]: 'Cashier - Can only access POS Billing and Invoices. This is a security-restricted role for front-desk operations.',
    [ROLES.STAFF]: 'Staff - Can access most operational features including inventory, customers, and reports. Cannot access admin settings.',
    [ROLES.ADMIN]: 'Admin - Full access to all features including settings, staff management, and system configuration.',
  };
  
  return descriptions[roleKey] || 'Unknown role';
};

// Export default permissions object for reference
export default ROLE_PERMISSIONS;

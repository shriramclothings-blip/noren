import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { hasPageAccess, getDefaultPageForRole, isCashier } from '../utils/rolePermissions';
import { AlertTriangle, ShieldOff } from 'lucide-react';

/**
 * ProtectedRoute Component
 * 
 * Enforces role-based access control at the route level.
 * If a user attempts to access a page they don't have permission for,
 * they are automatically redirected to their default page.
 * 
 * This provides defense-in-depth security:
 * - Sidebar filters menu items (UI level)
 * - ProtectedRoute blocks unauthorized page access (Route level)
 * - App.js validates and redirects (Application level)
 */
const ProtectedRoute = ({ page, children, onRedirect }) => {
  const { currentUser } = useApp();

  useEffect(() => {
    // If user doesn't have access to this page, redirect them
    if (currentUser && !hasPageAccess(currentUser, page)) {
      const defaultPage = getDefaultPageForRole(currentUser);
      
      console.warn(
        `[RBAC Security] Access denied: User "${currentUser.name}" (${currentUser.role}) ` +
        `attempted to access "${page}" without permission. Redirecting to "${defaultPage}".`
      );
      
      // Trigger redirect callback
      if (onRedirect) {
        onRedirect(defaultPage);
      }
    }
  }, [currentUser, page, onRedirect]);

  // Check if user has access
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4 p-8">
          <ShieldOff className="mx-auto text-red-500" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Not Authenticated
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has permission for this page
  const hasAccess = hasPageAccess(currentUser, page);

  if (!hasAccess) {
    // Show access denied screen momentarily before redirect
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4 p-8 max-w-md">
          <AlertTriangle className="mx-auto text-amber-500" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access this page.
          </p>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Your Role:</strong> {currentUser.role}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              {isCashier(currentUser) 
                ? 'As a Cashier, you can only access POS Billing and Invoices.'
                : 'Contact your administrator if you need access to this feature.'}
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Redirecting to your home page...
          </p>
        </div>
      </div>
    );
  }

  // User has access, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;

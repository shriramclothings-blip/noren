/**
 * Inventory Alert Badge Component
 * Compact notification badge for inventory alerts
 */

import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Package, ChevronDown, Eye } from 'lucide-react';
import { useAIInventory } from '../hooks/useAIInventory';

export default function InventoryAlertBadge({ onViewDashboard }) {
  const { 
    alerts, 
    criticalAlerts, 
    lowStockAlerts, 
    outOfStockAlerts, 
    hasAlerts,
    isLoading 
  } = useAIInventory();
  
  const [showDropdown, setShowDropdown] = useState(false);

  if (isLoading || !hasAlerts) {
    return null;
  }

  const getBadgeColor = () => {
    if (outOfStockAlerts.length > 0) return 'bg-red-500';
    if (criticalAlerts.length > 0) return 'bg-orange-500';
    if (lowStockAlerts.length > 0) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getIcon = () => {
    if (outOfStockAlerts.length > 0) return <AlertTriangle size={16} />;
    if (criticalAlerts.length > 0) return <AlertCircle size={16} />;
    return <Package size={16} />;
  };

  return (
    <div className="relative">
      {/* Badge Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white font-medium text-sm ${getBadgeColor()} hover:opacity-90 transition-opacity`}
      >
        {getIcon()}
        <span>{alerts.length} Alert{alerts.length !== 1 ? 's' : ''}</span>
        <ChevronDown size={14} className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Inventory Alerts
                </h4>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    if (onViewDashboard) onViewDashboard();
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              
              {/* Summary */}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                {outOfStockAlerts.length > 0 && (
                  <span className="text-red-600">
                    {outOfStockAlerts.length} Out of Stock
                  </span>
                )}
                {criticalAlerts.length > 0 && (
                  <span className="text-orange-600">
                    {criticalAlerts.length} Critical
                  </span>
                )}
                {lowStockAlerts.length > 0 && (
                  <span className="text-yellow-600">
                    {lowStockAlerts.length} Low Stock
                  </span>
                )}
              </div>
            </div>

            {/* Alert List */}
            <div className="max-h-64 overflow-y-auto">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.type === 'out_of_stock' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : alert.severity === 'critical' ? (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Package className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {alert.productName}
                        </h5>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {alert.currentStock} units • {alert.daysUntilEmpty ? `${alert.daysUntilEmpty} days left` : 'Reorder now'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {alerts.length > 5 && (
                <div className="p-3 text-center">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      if (onViewDashboard) onViewDashboard();
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2 mx-auto"
                  >
                    <Eye size={14} />
                    View {alerts.length - 5} more alerts
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { InventoryAlertBadge };
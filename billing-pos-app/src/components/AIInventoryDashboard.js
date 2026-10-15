/**
 * AI Inventory Dashboard Component
 * 
 * Comprehensive inventory management dashboard with AI predictions:
 * - Real-time stock level monitoring
 * - Demand forecasting and trend analysis  
 * - Low stock alerts and recommendations
 * - Seasonal analysis and reorder suggestions
 * - Interactive charts and visualizations
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Calendar,
  Target,
  Zap,
  RefreshCw,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  ShoppingCart,
  Eye,
  Settings
} from 'lucide-react';
import aiInventoryPredictionService from '../services/aiInventoryPredictionService';

export default function AIInventoryDashboard({ onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [predictions, setPredictions] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Initialize component and load data
   */
  useEffect(() => {
    initializeDashboard();
  }, []);

  /**
   * Initialize dashboard data
   */
  const initializeDashboard = async () => {
    setIsLoading(true);
    try {
      // Initialize service if needed
      await aiInventoryPredictionService.initialize();
      
      // Load current predictions
      const data = aiInventoryPredictionService.getCurrentPredictions();
      setPredictions(data.predictions);
      setAlerts(data.alerts);
      setLastAnalysis(data.lastAnalysis);
    } catch (error) {
      console.error('Failed to initialize inventory dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh predictions
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await aiInventoryPredictionService.refreshPredictions();
      setPredictions(data.predictions);
      setAlerts(data.alerts);
      setLastAnalysis(data.lastAnalysis);
    } catch (error) {
      console.error('Failed to refresh predictions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Filter and sort alerts based on current settings
   */
  const filteredAlerts = useMemo(() => {
    let filtered = alerts.filter(alert => {
      // Search filter
      if (searchTerm && !alert.productName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Severity filter
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) {
        return false;
      }
      
      return true;
    });

    // Sort alerts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'urgency':
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        case 'name':
          return a.productName.localeCompare(b.productName);
        case 'stock':
          return a.currentStock - b.currentStock;
        case 'days':
          return (a.daysUntilEmpty || 999) - (b.daysUntilEmpty || 999);
        default:
          return 0;
      }
    });

    return filtered;
  }, [alerts, searchTerm, filterSeverity, sortBy]);

  /**
   * Get summary statistics
   */
  const summaryStats = useMemo(() => {
    const totalProducts = Object.keys(predictions).length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const lowStockAlerts = alerts.filter(a => a.type === 'low_stock').length;
    const outOfStockAlerts = alerts.filter(a => a.type === 'out_of_stock').length;
    
    return {
      totalProducts,
      criticalAlerts,
      lowStockAlerts,
      outOfStockAlerts,
      healthyStock: totalProducts - criticalAlerts - lowStockAlerts - outOfStockAlerts
    };
  }, [predictions, alerts]);

  /**
   * Get alert severity color
   */
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  /**
   * Get alert icon
   */
  const getAlertIcon = (type, severity) => {
    if (type === 'out_of_stock') {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (severity === 'critical') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <Package className="w-5 h-5 text-orange-500" />;
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading AI predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Inventory Dashboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {formatTimeAgo(lastAnalysis)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summaryStats.totalProducts}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Critical Alerts</p>
              <p className="text-2xl font-semibold text-red-700 dark:text-red-300">
                {summaryStats.criticalAlerts}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400">Low Stock</p>
              <p className="text-2xl font-semibold text-orange-700 dark:text-orange-300">
                {summaryStats.lowStockAlerts}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Out of Stock</p>
              <p className="text-2xl font-semibold text-red-700 dark:text-red-300">
                {summaryStats.outOfStockAlerts}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Healthy Stock</p>
              <p className="text-2xl font-semibold text-green-700 dark:text-green-300">
                {summaryStats.healthyStock}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="urgency">Urgency</option>
              <option value="name">Product Name</option>
              <option value="stock">Stock Level</option>
              <option value="days">Days Until Empty</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Inventory Alerts ({filteredAlerts.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Alerts
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {alerts.length === 0 
                  ? "All inventory levels are healthy!"
                  : "No alerts match your current filters."}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type, alert.severity)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {alert.productName}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Current: {alert.currentStock} units</span>
                        {alert.daysUntilEmpty && (
                          <span>Days left: {alert.daysUntilEmpty}</span>
                        )}
                        <span>Reorder at: {alert.reorderPoint} units</span>
                      </div>
                      
                      {alert.recommendation && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
                          <strong>Recommendation:</strong> {alert.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProduct(alert.productId)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          productId={selectedProduct}
          prediction={predictions[selectedProduct]}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

/**
 * Product Detail Modal Component
 */
function ProductDetailModal({ productId, prediction, onClose }) {
  if (!prediction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {prediction.productName} - AI Analysis
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Status */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Current Status</h4>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Current Stock:</span>
                    <span className="ml-2 font-medium">{prediction.currentStock} units</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reorder Point:</span>
                    <span className="ml-2 font-medium">{prediction.reorderPoint} units</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max Stock:</span>
                    <span className="ml-2 font-medium">{prediction.maxStock} units</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <span className="ml-2 font-medium">{Math.round(prediction.confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Historical Data */}
              <h4 className="font-medium text-gray-900 dark:text-white">Sales History</h4>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Avg Daily:</span>
                    <span className="ml-2 font-medium">{prediction.historicalData?.averageDaily?.toFixed(1)} units</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Weekly:</span>
                    <span className="ml-2 font-medium">{prediction.historicalData?.averageWeekly?.toFixed(1)} units</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Monthly:</span>
                    <span className="ml-2 font-medium">{prediction.historicalData?.averageMonthly?.toFixed(1)} units</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Sales:</span>
                    <span className="ml-2 font-medium">{prediction.historicalData?.totalSales} transactions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">AI Recommendations</h4>
              
              <div className="space-y-2">
                {prediction.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">{rec}</span>
                  </div>
                ))}
              </div>

              {/* Predictions Chart Placeholder */}
              <h4 className="font-medium text-gray-900 dark:text-white">30-Day Forecast</h4>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Demand prediction chart would be displayed here
                  <br />
                  {prediction.predictions?.length} days of predictions available
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
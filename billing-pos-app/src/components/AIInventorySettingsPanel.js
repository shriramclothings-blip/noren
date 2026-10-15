/**
 * AI Inventory Settings Panel
 * Configuration for AI inventory predictions and alerts
 */

import React, { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  Settings,
  RefreshCw,
  CheckCircle,
  Calendar,
  BarChart3,
  Target
} from 'lucide-react';
import { useAIInventory } from '../hooks/useAIInventory';

export default function AIInventorySettingsPanel() {
  const { updateConfig, isLoading } = useAIInventory();
  const [config, setConfig] = useState({
    predictionDays: 30,
    minHistoryDays: 7,
    lowStockThreshold: 0.2,
    alertFrequency: 'daily',
    enableSeasonalAdjustment: true,
    enableTrendAnalysis: true,
    confidenceThreshold: 0.7
  });
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle configuration changes
   */
  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  /**
   * Save configuration
   */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig(config);
    } catch (error) {
      console.error('Failed to save AI inventory configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Inventory Predictions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure intelligent inventory forecasting and low stock alerts
            </p>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prediction Settings
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Adjust how AI analyzes your inventory and generates predictions
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Prediction Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4" />
                Forecast Period (Days)
              </label>
              <select
                value={config.predictionDays}
                onChange={(e) => handleConfigChange('predictionDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <p className="text-sm text-gray-500">
                How far into the future to generate predictions
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                <BarChart3 className="w-4 h-4" />
                Minimum History (Days)
              </label>
              <select
                value={config.minHistoryDays}
                onChange={(e) => handleConfigChange('minHistoryDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
              <p className="text-sm text-gray-500">
                Minimum sales history required for predictions
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                <AlertTriangle className="w-4 h-4" />
                Low Stock Threshold
              </label>
              <select
                value={config.lowStockThreshold}
                onChange={(e) => handleConfigChange('lowStockThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={0.1}>10% of monthly sales</option>
                <option value={0.2}>20% of monthly sales</option>
                <option value={0.3}>30% of monthly sales</option>
                <option value={0.5}>50% of monthly sales</option>
              </select>
              <p className="text-sm text-gray-500">
                When to trigger low stock alerts
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                <Target className="w-4 h-4" />
                Confidence Threshold
              </label>
              <select
                value={config.confidenceThreshold}
                onChange={(e) => handleConfigChange('confidenceThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={0.5}>50% - Low confidence</option>
                <option value={0.7}>70% - Medium confidence</option>
                <option value={0.8}>80% - High confidence</option>
                <option value={0.9}>90% - Very high confidence</option>
              </select>
              <p className="text-sm text-gray-500">
                Minimum confidence required for predictions
              </p>
            </div>
          </div>

          {/* Alert Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Alert Frequency
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'realtime', label: 'Real-time', description: 'Immediate alerts as stock gets low' },
                { value: 'daily', label: 'Daily', description: 'Once per day summary' },
                { value: 'weekly', label: 'Weekly', description: 'Weekly inventory review' }
              ].map(({ value, label, description }) => (
                <label key={value} className="flex items-start p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="alertFrequency"
                    value={value}
                    checked={config.alertFrequency === value}
                    onChange={(e) => handleConfigChange('alertFrequency', e.target.value)}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-white">{label}</div>
                    <div className="text-sm text-gray-500">{description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Features */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Advanced Features
            </h4>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.enableSeasonalAdjustment}
                  onChange={(e) => handleConfigChange('enableSeasonalAdjustment', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Seasonal Adjustment
                  </div>
                  <div className="text-sm text-gray-500">
                    Adjust predictions based on seasonal sales patterns
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <input
                  type="checkbox"
                  checked={config.enableTrendAnalysis}
                  onChange={(e) => handleConfigChange('enableTrendAnalysis', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Trend Analysis
                  </div>
                  <div className="text-sm text-gray-500">
                    Factor in growth/decline trends for more accurate predictions
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Changes take effect after saving and will be applied to new predictions
            </p>
            
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          💡 Tips for Better Predictions
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Ensure you have at least 2 weeks of sales data for accurate predictions</li>
          <li>• Enable seasonal adjustment if your business has seasonal patterns</li>
          <li>• Lower confidence threshold will show more predictions but may be less accurate</li>
          <li>• Real-time alerts are best for fast-moving products</li>
        </ul>
      </div>
    </div>
  );
}
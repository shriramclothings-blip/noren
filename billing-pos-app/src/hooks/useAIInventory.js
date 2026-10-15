/**
 * useAIInventory Hook
 * React hook for AI inventory predictions and alerts
 */

import { useState, useEffect, useCallback } from 'react';
import aiInventoryPredictionService from '../services/aiInventoryPredictionService';

export function useAIInventory() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Initialize the AI inventory service
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiInventoryPredictionService.initialize();
      
      if (result.success) {
        setIsInitialized(true);
        await refreshData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  /**
   * Refresh predictions data
   */
  const refreshData = useCallback(async () => {
    try {
      const data = aiInventoryPredictionService.getCurrentPredictions();
      setPredictions(data.predictions);
      setAlerts(data.alerts);
      setLastAnalysis(data.lastAnalysis);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  /**
   * Force refresh predictions
   */
  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await aiInventoryPredictionService.refreshPredictions();
      setPredictions(data.predictions);
      setAlerts(data.alerts);
      setLastAnalysis(data.lastAnalysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get prediction for specific product
   */
  const getProductPrediction = useCallback((productId) => {
    return aiInventoryPredictionService.getProductPrediction(productId);
  }, []);

  /**
   * Update configuration
   */
  const updateConfig = useCallback(async (newConfig) => {
    try {
      await aiInventoryPredictionService.updateConfiguration(newConfig);
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  }, [refreshData]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Periodic refresh
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(refreshData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [isInitialized, refreshData]);

  return {
    // State
    isInitialized,
    isLoading,
    predictions,
    alerts,
    lastAnalysis,
    error,

    // Actions
    initialize,
    refreshData,
    forceRefresh,
    getProductPrediction,
    updateConfig,

    // Computed
    criticalAlerts: alerts.filter(a => a.severity === 'critical'),
    lowStockAlerts: alerts.filter(a => a.type === 'low_stock'),
    outOfStockAlerts: alerts.filter(a => a.type === 'out_of_stock'),
    totalProducts: Object.keys(predictions).length,
    hasAlerts: alerts.length > 0
  };
}

export default useAIInventory;
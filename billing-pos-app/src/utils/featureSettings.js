export const DEFAULT_FEATURE_TOGGLES = {
  loyaltyEnabled: true,
  expiryTrackerEnabled: true,
  discountEngineEnabled: true,
  abcAnalysisEnabled: true,
  salesHeatmapEnabled: true,
  customerInsightsEnabled: true,
  warehouseEnabled: true,
  smartPurchaseEnabled: true,
};

export const FEATURE_ROUTE_MAP = {
  loyaltyEngine: 'loyaltyEnabled',
  expiryTracker: 'expiryTrackerEnabled',
  discountEngine: 'discountEngineEnabled',
  abcAnalysis: 'abcAnalysisEnabled',
  salesHeatmap: 'salesHeatmapEnabled',
  customerInsights: 'customerInsightsEnabled',
  warehouse: 'warehouseEnabled',
  smartPurchase: 'smartPurchaseEnabled',
};

export function mergeFeatureToggles(saved) {
  return {
    ...DEFAULT_FEATURE_TOGGLES,
    ...(saved || {}),
  };
}

export function isRouteEnabled(routeKey, featureToggles) {
  const toggleKey = FEATURE_ROUTE_MAP[routeKey];
  if (!toggleKey) return true;
  return featureToggles?.[toggleKey] !== false;
}

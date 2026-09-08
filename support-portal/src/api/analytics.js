import client from './client';

export const getVisitorSessions = (params) => client.get('/api/support/analytics/visitors', { params });
export const getUTMAnalytics = (params) => client.get('/api/support/analytics/utm', { params });
export const getMarketingAnalytics = (params) => client.get('/api/support/analytics/marketing', { params });
export const getLiveVisitors = () => client.get('/api/support/analytics/live');
export const getDashboardMetrics = (params) => client.get('/api/support/dashboard', { params });
export const getAdminStats = () => client.get('/api/admin/stats');

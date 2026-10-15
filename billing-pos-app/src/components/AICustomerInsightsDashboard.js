import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, Target, Heart, AlertTriangle, 
  Crown, Star, Gift, Calendar, RefreshCw, // Eye
} from 'lucide-react';
import aiCustomerInsightsService from '../services/aiCustomerInsightsService';
import { dbGetAll } from '../db/db';
import toast from 'react-hot-toast';

export default function AICustomerInsightsDashboard({ customers = null, invoices = null }) {
  const [insights, setInsights] = useState({
    segments: [],
    topCustomers: [],
    riskCustomers: [],
    recommendations: [],
    summary: null,
    loading: true,
    error: null
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setInsights(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Get data from DB if not provided
      let customerData = customers;
      let invoiceData = invoices;
      
      if (!customerData || !invoiceData) {
        const [customersDB, invoicesDB] = await Promise.all([
          dbGetAll('customers'),
          dbGetAll('invoices')
        ]);
        customerData = customerData || customersDB;
        invoiceData = invoiceData || invoicesDB;
      }

      if (!customerData || customerData.length === 0) {
        setInsights(prev => ({
          ...prev,
          loading: false,
          error: 'No customers found'
        }));
        return;
      }

      // Generate customer segmentation
      const segmentation = await aiCustomerInsightsService.segmentCustomers(
        customerData, 
        invoiceData
      );

      // Calculate summary metrics
      const summary = calculateSummaryMetrics(customerData, invoiceData, segmentation);

      // Identify top and at-risk customers
      const topCustomers = identifyTopCustomers(segmentation.customers || customerData);
      const riskCustomers = identifyRiskCustomers(segmentation.customers || customerData);

      setInsights({
        segments: segmentation.segments || [],
        topCustomers: topCustomers.slice(0, 10),
        riskCustomers: riskCustomers.slice(0, 10),
        recommendations: segmentation.insights || [],
        summary,
        loading: false,
        error: null
      });

    } catch (err) {
      console.error('Failed to load customer insights:', err);
      setInsights(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
      toast.error('Failed to load customer insights: ' + err.message);
    }
  };

  const analyzeSpecificCustomer = async (customer) => {
    setAnalyzing(true);
    try {
      const invoiceData = invoices || await dbGetAll('invoices');
      
      const [behavior, recommendations, valueAnalysis] = await Promise.all([
        aiCustomerInsightsService.analyzeCustomerBehavior(customer, invoiceData),
        aiCustomerInsightsService.generateProductRecommendations(customer, invoiceData),
        aiCustomerInsightsService.predictCustomerValue(customer, invoiceData)
      ]);

      setCustomerDetail({
        customer,
        behavior,
        recommendations,
        valueAnalysis,
        analyzedAt: new Date().toISOString()
      });

      toast.success(`Analysis complete for ${customer.name}`);
    } catch (err) {
      toast.error('Customer analysis failed: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const calculateSummaryMetrics = (customers, invoices, segmentation) => {
    const customerInvoices = {};
    invoices.forEach(inv => {
      if (inv.customer?.id || inv.customer?.name) {
        const key = inv.customer.id || inv.customer.name;
        if (!customerInvoices[key]) {
          customerInvoices[key] = [];
        }
        customerInvoices[key].push(inv);
      }
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const activeCustomers = Object.keys(customerInvoices).length;
    const avgCustomerValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    // Calculate retention (customers who made purchases in last 60 days)
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const recentCustomers = new Set();
    
    invoices.forEach(inv => {
      if (new Date(inv.date) >= sixtyDaysAgo && inv.customer?.id) {
        recentCustomers.add(inv.customer.id);
      }
    });

    const retentionRate = activeCustomers > 0 ? (recentCustomers.size / activeCustomers) * 100 : 0;

    return {
      totalCustomers: customers.length,
      activeCustomers,
      retentionRate,
      avgCustomerValue,
      totalRevenue,
      segmentCount: segmentation.segments?.length || 0
    };
  };

  const identifyTopCustomers = (customers) => {
    return customers
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  };

  const identifyRiskCustomers = (customers) => {
    return customers
      .filter(c => c.recency > 60 && c.totalSpent > 1000) // Haven't visited in 60+ days but have spent money
      .sort((a, b) => b.totalSpent - a.totalSpent);
  };

  const getSegmentColor = (segmentName) => {
    const colors = {
      'vip': 'bg-purple-100 text-purple-800',
      'loyal': 'bg-blue-100 text-blue-800',
      'regular': 'bg-green-100 text-green-800',
      'occasional': 'bg-yellow-100 text-yellow-800',
      'at_risk': 'bg-orange-100 text-orange-800',
      'new': 'bg-gray-100 text-gray-800'
    };
    return colors[segmentName?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getSegmentIcon = (segmentName) => {
    const icons = {
      'vip': Crown,
      'loyal': Heart,
      'regular': Users,
      'occasional': Calendar,
      'at_risk': AlertTriangle,
      'new': Star
    };
    return icons[segmentName?.toLowerCase()] || Users;
  };

  if (insights.loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-3 text-gray-600">Analyzing customer insights...</span>
        </div>
      </div>
    );
  }

  if (insights.error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Insights Unavailable</h3>
          <p className="text-gray-600 mb-4">{insights.error}</p>
          <button
            onClick={loadInsights}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Insights</h2>
            <p className="text-gray-600">AI-powered customer behavior analysis</p>
          </div>
        </div>
        
        <button
          onClick={loadInsights}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Insights
        </button>
      </div>

      {/* Summary Metrics */}
      {insights.summary && (
        <div className="grid grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {insights.summary.totalCustomers}
                </div>
                <div className="text-sm text-gray-600">Total Customers</div>
              </div>
              <Users className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {insights.summary.activeCustomers}
                </div>
                <div className="text-sm text-gray-600">Active Customers</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {insights.summary.retentionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Retention Rate</div>
              </div>
              <Heart className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  ₹{insights.summary.avgCustomerValue.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Avg Customer Value</div>
              </div>
              <Target className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-indigo-600">
                  {insights.summary.segmentCount}
                </div>
                <div className="text-sm text-gray-600">Segments</div>
              </div>
              <Gift className="w-8 h-8 text-indigo-600 opacity-20" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Customer Segments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
          
          <div className="space-y-3">
            {insights.segments.map((segment, index) => {
              const SegmentIcon = getSegmentIcon(segment.name);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <SegmentIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">{segment.name}</div>
                      <div className="text-sm text-gray-600">{segment.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{segment.customerCount || 0}</div>
                    <div className="text-xs text-gray-500">customers</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
          
          <div className="space-y-3">
            {insights.topCustomers.map((customer, index) => (
              <div key={customer.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                   onClick={() => analyzeSpecificCustomer(customer)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600">{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-600">
                      {customer.frequency || 0} visits • {customer.recency || 0} days ago
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">₹{customer.totalSpent?.toFixed(0) || '0'}</div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getSegmentColor(customer.segment)}`}>
                    {customer.segment || 'regular'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Customers */}
      {insights.riskCustomers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            At-Risk Customers
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {insights.riskCustomers.map((customer, index) => (
              <div key={customer.id || index} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <div className="font-medium text-gray-900">{customer.name}</div>
                  <div className="text-sm text-orange-700">
                    Last visit: {customer.recency || 0} days ago
                  </div>
                  <div className="text-sm text-gray-600">
                    Total spent: ₹{customer.totalSpent?.toFixed(0) || '0'}
                  </div>
                </div>
                <button
                  onClick={() => analyzeSpecificCustomer(customer)}
                  className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                >
                  Analyze
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h3>
          
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-2">
                  <Gift className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-purple-900">{recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {customerDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {customerDetail.customer.name} - AI Analysis
                </h3>
                <button
                  onClick={() => setCustomerDetail(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Profile */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Customer Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Segment:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getSegmentColor(customerDetail.behavior?.profile?.segment)}`}>
                        {customerDetail.behavior?.profile?.segment || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loyalty Score:</span>
                      <span className="font-medium">
                        {Math.round((customerDetail.behavior?.profile?.loyaltyScore || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Churn Risk:</span>
                      <span className="font-medium text-orange-600">
                        {Math.round((customerDetail.valueAnalysis?.churnRisk?.probability || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lifetime Value:</span>
                      <span className="font-medium text-green-600">
                        ₹{customerDetail.valueAnalysis?.lifetimeValue?.predicted?.toFixed(0) || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Growth Potential:</span>
                      <span className="font-medium">
                        {customerDetail.valueAnalysis?.growth?.potential || 'Medium'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">AI Insights</h4>
                <div className="space-y-2">
                  {customerDetail.behavior?.insights?.map((insight, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
                      • {insight}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Product Recommendations</h4>
                <div className="space-y-2">
                  {customerDetail.recommendations?.recommendations?.map((rec, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">{rec.productName}</div>
                        <div className="text-sm text-green-700">{rec.reason}</div>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {Math.round(rec.confidence * 100)}% confidence
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
            <span className="text-gray-700">Analyzing customer behavior...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export { AICustomerInsightsDashboard };
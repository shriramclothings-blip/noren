import React, { useState, useEffect } from 'react';
import { 
  Brain, TrendingUp, Shield, AlertTriangle, CheckCircle, 
  BarChart3, PieChart, Zap, Target, Clock, RefreshCw 
} from 'lucide-react';
import aiInvoiceAnalysisService from '../services/aiInvoiceAnalysisService';
import { dbGetAll } from '../db/db';
import toast from 'react-hot-toast';

export default function AIInsightsDashboard({ invoices = null }) {
  const [insights, setInsights] = useState({
    summary: null,
    recentAnalysis: [],
    fraudAlerts: [],
    patterns: [],
    recommendations: [],
    loading: true,
    error: null
  });

  const [timeframe, setTimeframe] = useState('7d');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [timeframe]);

  const loadInsights = async () => {
    setInsights(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Get invoices from DB if not provided
      let invoiceData = invoices;
      if (!invoiceData) {
        invoiceData = await dbGetAll('invoices');
      }

      // Filter by timeframe
      const filteredInvoices = filterByTimeframe(invoiceData, timeframe);
      
      if (filteredInvoices.length === 0) {
        setInsights(prev => ({
          ...prev,
          loading: false,
          error: 'No invoices found for selected timeframe'
        }));
        return;
      }

      // Generate AI insights
      const businessInsights = await aiInvoiceAnalysisService.getBusinessInsights(
        filteredInvoices, 
        timeframe
      );

      // Analyze recent invoices for fraud
      const recentInvoices = filteredInvoices.slice(-10);
      const fraudChecks = await Promise.all(
        recentInvoices.map(async (invoice) => {
          try {
            const fraudResult = await aiInvoiceAnalysisService.quickFraudCheck(invoice);
            return { invoice, ...fraudResult };
          } catch (err) {
            return { 
              invoice, 
              riskLevel: 'low', 
              riskScore: 0.1, 
              error: err.message 
            };
          }
        })
      );

      // Calculate summary stats
      const summary = calculateSummary(filteredInvoices, fraudChecks);

      setInsights({
        summary,
        recentAnalysis: fraudChecks.slice(0, 5),
        fraudAlerts: fraudChecks.filter(check => check.riskLevel === 'high' || check.riskLevel === 'critical'),
        patterns: businessInsights.patterns || [],
        recommendations: businessInsights.opportunities || [],
        keyInsights: businessInsights.keyInsights || [],
        loading: false,
        error: null
      });

    } catch (err) {
      console.error('Failed to load AI insights:', err);
      setInsights(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
      toast.error('Failed to load AI insights: ' + err.message);
    }
  };

  const analyzeNewInvoice = async (invoice) => {
    setAnalyzing(true);
    try {
      const analysis = await aiInvoiceAnalysisService.analyzeInvoice(invoice);
      toast.success('Invoice analyzed successfully!');
      
      // Add to recent analysis
      setInsights(prev => ({
        ...prev,
        recentAnalysis: [{ invoice, ...analysis }, ...prev.recentAnalysis.slice(0, 4)]
      }));

      return analysis;
    } catch (err) {
      toast.error('Analysis failed: ' + err.message);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  const filterByTimeframe = (invoices, timeframe) => {
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeframe) {
      case '1d':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
      default:
        return invoices;
    }

    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.date || invoice.timestamp);
      return invoiceDate >= cutoff;
    });
  };

  const calculateSummary = (invoices, fraudChecks) => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const avgTransaction = totalRevenue / invoices.length;
    const highRiskCount = fraudChecks.filter(check => 
      check.riskLevel === 'high' || check.riskLevel === 'critical'
    ).length;

    return {
      totalInvoices: invoices.length,
      totalRevenue,
      avgTransaction,
      fraudAlerts: highRiskCount,
      fraudPercentage: (highRiskCount / fraudChecks.length) * 100
    };
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
      case 'high': return AlertTriangle;
      case 'medium': return Clock;
      default: return CheckCircle;
    }
  };

  if (insights.loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Analyzing invoices with AI...</span>
        </div>
      </div>
    );
  }

  if (insights.error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis Unavailable</h3>
          <p className="text-gray-600 mb-4">{insights.error}</p>
          <button
            onClick={loadInsights}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
          <Brain className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Invoice Insights</h2>
            <p className="text-gray-600">Powered by advanced AI analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <button
            onClick={loadInsights}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {insights.summary && (
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {insights.summary.totalInvoices}
                </div>
                <div className="text-sm text-gray-600">Total Invoices</div>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{insights.summary.totalRevenue?.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{insights.summary.avgTransaction?.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Avg Transaction</div>
              </div>
              <Target className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {insights.summary.fraudAlerts}
                </div>
                <div className="text-sm text-gray-600">Fraud Alerts</div>
              </div>
              <Shield className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Key Insights */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Key Insights
          </h3>
          
          <div className="space-y-3">
            {insights.keyInsights?.length > 0 ? (
              insights.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Zap className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{insight}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No insights available yet
              </div>
            )}
          </div>
        </div>

        {/* Fraud Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Fraud Detection
          </h3>
          
          <div className="space-y-3">
            {insights.fraudAlerts?.length > 0 ? (
              insights.fraudAlerts.map((alert, index) => {
                const RiskIcon = getRiskIcon(alert.riskLevel);
                return (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <RiskIcon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-900">
                        Invoice #{alert.invoice?.invoiceNumber}
                      </div>
                      <div className="text-sm text-red-700">
                        Risk: {alert.riskLevel} ({Math.round(alert.riskScore * 100)}%)
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-green-600 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                No fraud alerts detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoice Analysis</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Invoice #</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Risk Level</th>
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {insights.recentAnalysis?.map((analysis, index) => {
                const RiskIcon = getRiskIcon(analysis.riskLevel);
                return (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 font-medium">
                      {analysis.invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-2">
                      ₹{analysis.invoice?.total?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(analysis.riskLevel)}`}>
                        <RiskIcon className="w-3 h-3" />
                        {analysis.riskLevel}
                      </div>
                    </td>
                    <td className="py-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {analysis.category || 'mixed'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">
                      {analysis.invoice?.date ? new Date(analysis.invoice.date).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      {insights.recommendations?.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            AI Recommendations
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-blue-900">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export method to analyze a single invoice from outside
export { AIInsightsDashboard };
export const analyzeInvoiceWithAI = (invoice) => {
  return aiInvoiceAnalysisService.analyzeInvoice(invoice);
};
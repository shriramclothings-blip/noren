import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, TrendingUp, Shield, Zap, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

export default function EnhancedAISettingsPanel({ onSave }) {
  const [config, setConfig] = useState({
    aiEnabled: true,
    groqApiKey: GROQ_API_KEY || '',
    
    // AI Features
    enableInvoiceAnalysis: true,
    enableCustomerInsights: true,
    enableSalesForecasting: true,
    enableInventoryPredictions: true,
    enableFraudDetection: true,
    enableSmartRecommendations: true,
    
    // AI Models
    primaryModel: 'llama-3.3-70b-versatile',
    fastModel: 'llama-3.1-8b-instant',
    
    // Thresholds
    fraudDetectionThreshold: 0.7,
    lowStockPredictionDays: 7,
    forecastAccuracyTarget: 0.85,
    
    // Automation
    autoApplyInsights: false,
    autoLowStockAlerts: true,
    autoFraudAlerts: true,
  });

  const [testStatus, setTestStatus] = useState({ testing: false, result: null });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('aiSettings');
      if (saved) {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    }
  };

  const testAIConnection = async () => {
    if (!config.groqApiKey) {
      toast.error('Please enter Groq API Key');
      return;
    }

    setTestStatus({ testing: true, result: null });

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.fastModel,
          messages: [{ role: 'user', content: 'Test connection: Say "OK"' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        setTestStatus({ testing: false, result: 'success' });
        toast.success('✅ AI connection successful!');
      } else {
        const error = await response.json();
        setTestStatus({ testing: false, result: 'error' });
        toast.error('AI connection failed: ' + (error.error?.message || 'Unknown error'));
      }
    } catch (err) {
      setTestStatus({ testing: false, result: 'error' });
      toast.error('AI connection failed: ' + err.message);
    }
  };

  const handleSave = () => {
    localStorage.setItem('aiSettings', JSON.stringify(config));
    
    // Also save to individual keys for easy access
    localStorage.setItem('ai_enabled', config.aiEnabled.toString());
    localStorage.setItem('groq_api_key', config.groqApiKey);
    
    toast.success('🤖 AI settings saved!');
    if (onSave) onSave(config);
  };

  const aiFeatures = [
    {
      key: 'enableInvoiceAnalysis',
      title: 'Invoice Analysis',
      description: 'Smart categorization, anomaly detection, and pattern recognition',
      icon: Brain,
    },
    {
      key: 'enableCustomerInsights',
      title: 'Customer Insights',
      description: 'Purchase patterns, loyalty predictions, and personalized recommendations',
      icon: TrendingUp,
    },
    {
      key: 'enableSalesForecasting',
      title: 'Sales Forecasting',
      description: 'Predict future sales trends and demand patterns',
      icon: TrendingUp,
    },
    {
      key: 'enableInventoryPredictions',
      title: 'Inventory Predictions',
      description: 'AI-powered low stock alerts and reorder recommendations',
      icon: Zap,
    },
    {
      key: 'enableFraudDetection',
      title: 'Fraud Detection',
      description: 'Detect suspicious transactions and unusual patterns',
      icon: Shield,
    },
    {
      key: 'enableSmartRecommendations',
      title: 'Smart Recommendations',
      description: 'Product bundles, cross-sell, and upsell suggestions',
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6">
      {/* AI Status */}
      <div className={`p-4 rounded-lg border-2 ${
        config.aiEnabled ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className={`w-5 h-5 ${config.aiEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
            <div>
              <div className="font-semibold text-gray-900">
                AI Features {config.aiEnabled ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-sm text-gray-600">
                Powered by Groq AI (Ultra-fast inference)
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.aiEnabled}
              onChange={(e) => setConfig({ ...config, aiEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* API Configuration */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI API Configuration
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Groq API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={config.groqApiKey}
              onChange={(e) => setConfig({ ...config, groqApiKey: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="gsk_..."
            />
            <button
              onClick={testAIConnection}
              disabled={testStatus.testing || !config.groqApiKey}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testStatus.testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : testStatus.result === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  Connected
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Get your free API key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">console.groq.com</a>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Model (Accuracy)
            </label>
            <select
              value={config.primaryModel}
              onChange={(e) => setConfig({ ...config, primaryModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Best)</option>
              <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fast Model (Speed)
            </label>
            <select
              value={config.fastModel}
              onChange={(e) => setConfig({ ...config, fastModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
              <option value="gemma2-9b-it">Gemma 2 9B</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Features */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">AI Features</h3>
        
        <div className="grid grid-cols-1 gap-3">
          {aiFeatures.map((feature) => (
            <label
              key={feature.key}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={config[feature.key]}
                onChange={(e) => setConfig({ ...config, [feature.key]: e.target.checked })}
                className="mt-1 w-5 h-5 text-purple-600"
                disabled={!config.aiEnabled}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <feature.icon className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-900">{feature.title}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Advanced Settings</h3>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-700">Auto-Apply AI Insights</div>
            <div className="text-xs text-gray-500">Automatically apply recommendations (experimental)</div>
          </div>
          <input
            type="checkbox"
            checked={config.autoApplyInsights}
            onChange={(e) => setConfig({ ...config, autoApplyInsights: e.target.checked })}
            className="w-5 h-5 text-purple-600"
            disabled={!config.aiEnabled}
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Auto Low Stock Alerts</span>
          <input
            type="checkbox"
            checked={config.autoLowStockAlerts}
            onChange={(e) => setConfig({ ...config, autoLowStockAlerts: e.target.checked })}
            className="w-5 h-5 text-purple-600"
            disabled={!config.aiEnabled}
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Auto Fraud Alerts</span>
          <input
            type="checkbox"
            checked={config.autoFraudAlerts}
            onChange={(e) => setConfig({ ...config, autoFraudAlerts: e.target.checked })}
            className="w-5 h-5 text-purple-600"
            disabled={!config.aiEnabled}
          />
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        Save AI Settings
      </button>

      {/* Warning */}
      {!config.aiEnabled && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>AI features are disabled.</strong> Enable AI to unlock intelligent insights, predictions, and automated recommendations.
          </div>
        </div>
      )}
    </div>
  );
}

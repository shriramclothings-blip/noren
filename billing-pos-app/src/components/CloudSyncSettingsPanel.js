import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, Check, X, Wifi, WifiOff, Database, AlertCircle, CheckCircle, Clock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://noren-iqk3.onrender.com/api';

export default function CloudSyncSettingsPanel({ onSave }) {
  const [config, setConfig] = useState({
    enabled: true,
    apiUrl: API_URL,
    deviceId: localStorage.getItem('pos_device_id') || '',
    apiKey: localStorage.getItem('pos_api_key') || '',
    autoSync: true,
    syncInterval: 300000, // 5 minutes
    syncOnSale: true,
    syncInvoices: true,
    syncCustomers: true,
    syncProducts: true,
    syncInventory: true,
  });

  const [status, setStatus] = useState({
    connected: false,
    lastSync: null,
    pendingSync: 0,
    testing: false,
  });

  useEffect(() => {
    loadSettings();
    checkConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = localStorage.getItem('cloudSyncSettings');
      if (saved) {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
      
      // Load sync status
      const lastSync = localStorage.getItem('lastCloudSync');
      const pending = localStorage.getItem('syncQueueCount') || '0';
      setStatus(prev => ({
        ...prev,
        lastSync: lastSync ? new Date(lastSync) : null,
        pendingSync: parseInt(pending),
      }));
    } catch (err) {
      console.error('Failed to load cloud sync settings:', err);
    }
  };

  const checkConnection = async () => {
    if (!config.apiUrl) return;
    
    setStatus(prev => ({ ...prev, testing: true }));
    try {
      const response = await fetch(`${config.apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      const data = await response.json();
      setStatus(prev => ({
        ...prev,
        connected: response.ok && data.status === 'ok',
        testing: false,
      }));
      
      if (response.ok) {
        toast.success('✅ Connected to NOREN Cloud');
      }
    } catch (err) {
      setStatus(prev => ({ ...prev, connected: false, testing: false }));
      console.error('Connection test failed:', err);
    }
  };

  const registerDevice = async () => {
    if (!config.deviceId) {
      // Generate device ID
      const deviceId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setConfig(prev => ({ ...prev, deviceId }));
      localStorage.setItem('pos_device_id', deviceId);
    }

    try {
      const response = await fetch(`${config.apiUrl}/erp/pos/integration/devices/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: config.deviceId,
          device_name: `VENDEXA RetailOS - ${navigator.platform}`,
          device_type: 'desktop_pos',
          store_name: process.env.REACT_APP_STORE_NAME || 'NOREN Store',
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.api_key) {
        setConfig(prev => ({ ...prev, apiKey: data.api_key }));
        localStorage.setItem('pos_api_key', data.api_key);
        toast.success('🎉 Device registered successfully!');
        checkConnection();
      } else {
        toast.error('Failed to register device: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Registration failed: ' + err.message);
    }
  };

  const handleSave = () => {
    localStorage.setItem('cloudSyncSettings', JSON.stringify(config));
    toast.success('Cloud Sync settings saved!');
    if (onSave) onSave(config);
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={`p-4 rounded-lg border-2 ${
        status.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status.testing ? (
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            ) : status.connected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <div className="font-semibold text-gray-900">
                {status.testing ? 'Testing Connection...' : status.connected ? 'Connected to Cloud' : 'Not Connected'}
              </div>
              <div className="text-sm text-gray-600">
                Last sync: {formatTime(status.lastSync)} • Pending: {status.pendingSync}
              </div>
            </div>
          </div>
          <button
            onClick={checkConnection}
            disabled={status.testing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Test Connection
          </button>
        </div>
      </div>

      {/* API Configuration */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          API Configuration
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Backend API URL
          </label>
          <input
            type="url"
            value={config.apiUrl}
            onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://noren-iqk3.onrender.com/api"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.deviceId}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Auto-generated on registration"
            />
            <button
              onClick={registerDevice}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {config.deviceId ? 'Re-register' : 'Register Device'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="password"
            value={config.apiKey}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            placeholder="Generated after device registration"
          />
          <p className="text-xs text-gray-500 mt-1">
            API key is auto-generated when you register your device
          </p>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Sync Settings
        </h3>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Enable Cloud Sync</span>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-5 h-5 text-blue-600"
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Auto Sync (Every 5 min)</span>
          <input
            type="checkbox"
            checked={config.autoSync}
            onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
            className="w-5 h-5 text-blue-600"
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Sync Immediately After Sale</span>
          <input
            type="checkbox"
            checked={config.syncOnSale}
            onChange={(e) => setConfig({ ...config, syncOnSale: e.target.checked })}
            className="w-5 h-5 text-blue-600"
          />
        </label>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Sync Data Types:</p>
          <div className="space-y-2">
            {['Invoices', 'Customers', 'Products', 'Inventory'].map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config[`sync${type}`]}
                  onChange={(e) => setConfig({ ...config, [`sync${type}`]: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
      >
        <Cloud className="w-5 h-5" />
        Save Cloud Sync Settings
      </button>
    </div>
  );
}

/**
 * Website Integration Settings
 * Configure cloud sync, device registration, and QR invoice generation
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, CloudOff, CheckCircle, XCircle, AlertTriangle, 
  RefreshCw, Settings, Link as LinkIcon, QrCode, 
  Server, Activity, Database, Download, Upload,
  Eye, EyeOff, Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSetting, saveSetting } from '../db/db';
import {
  authenticateDevice,
  testConnection,
  registerDevice,
  getSyncStatus,
  processSyncQueue,
  getWebsiteURL
} from '../services/cloudSyncService';

export default function WebsiteIntegration() {
  const [activeTab, setActiveTab] = useState('overview');
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    cloudBackendURL: '',
    websiteURL: '',
    deviceFingerprint: '',
    cloudDeviceId: '',
    cloudApiKey: '',
    autoSync: true,
    syncInterval: 5 // minutes
  });

  useEffect(() => {
    loadSettings();
    checkConnectionStatus();
    loadSyncStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const loaded = {};
      for (const key of Object.keys(settings)) {
        const value = await getSetting(key);
        if (value !== null) loaded[key] = value;
      }

      // Generate device fingerprint if not exists
      if (!loaded.deviceFingerprint) {
        const fingerprint = await getDeviceFingerprint();
        loaded.deviceFingerprint = fingerprint;
        await saveSetting('deviceFingerprint', fingerprint);
      }

      setSettings(prev => ({ ...prev, ...loaded }));
      setDeviceRegistered(!!(loaded.cloudDeviceId && loaded.cloudApiKey));
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceFingerprint = async () => {
    if (window.electronAPI?.getDeviceFingerprint) {
      return await window.electronAPI.getDeviceFingerprint();
    }
    // Fallback: generate from local data
    return `VENDEXA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  };

  const checkConnectionStatus = async () => {
    try {
      const connected = await testConnection();
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const loadSyncStats = async () => {
    try {
      const stats = await getSyncStatus();
      setSyncStats(stats);
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  };

  const handleTestConnection = async () => {
    toast.loading('Testing connection...', { id: 'test-connection' });
    try {
      const connected = await testConnection();
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      
      if (connected) {
        toast.success('Connection successful!', { id: 'test-connection' });
      } else {
        toast.error('Connection failed. Check backend URL.', { id: 'test-connection' });
      }
    } catch (error) {
      toast.error('Connection test failed', { id: 'test-connection' });
      setConnectionStatus('error');
    }
  };

  const handleAuthenticateDevice = async () => {
    if (!deviceRegistered) {
      toast.error('Please register device first');
      return;
    }

    toast.loading('Authenticating...', { id: 'auth' });
    try {
      const auth = await authenticateDevice();
      toast.success(`Authenticated! Device ID: ${auth.device_id}`, { id: 'auth' });
      checkConnectionStatus();
    } catch (error) {
      toast.error(error.message || 'Authentication failed', { id: 'auth' });
    }
  };

  const handleSyncNow = async () => {
    toast.loading('Syncing invoices...', { id: 'sync' });
    try {
      const results = await processSyncQueue();
      await loadSyncStats();
      
      const message = `Synced ${results.success.length} invoices. ` +
        (results.failed.length > 0 ? `${results.failed.length} failed.` : '');
      
      if (results.success.length > 0) {
        toast.success(message, { id: 'sync' });
      } else if (results.skipped.length > 0) {
        toast.success('No pending invoices to sync', { id: 'sync' });
      } else {
        toast.error('Sync failed', { id: 'sync' });
      }
    } catch (error) {
      toast.error(error.message || 'Sync failed', { id: 'sync' });
    }
  };

  const handleSaveSettings = async () => {
    toast.loading('Saving settings...', { id: 'save' });
    try {
      // Save all settings
      await setSetting('websiteIntegrationConfig', settings);
      
      // Save individual settings for backward compatibility
      for (const [key, value] of Object.entries(settings)) {
        await saveSetting(key, value);
      }
      
      toast.success('Settings saved successfully', { id: 'save' });
      
      // Restart background worker with new settings
      try {
        const { default: backgroundSyncWorker } = await import('../services/backgroundSyncWorker');
        await backgroundSyncWorker.updateConfig(settings);
        
        // Re-initialize invoice hooks
        const { default: invoiceSyncHooks } = await import('../services/invoiceSyncHooks');
        if (settings.enabled && settings.autoSync) {
          await invoiceSyncHooks.enable();
        } else {
          invoiceSyncHooks.disable();
        }
      } catch (error) {
        console.error('Failed to update background worker:', error);
      }
      
      await checkConnectionStatus();
    } catch (error) {
      toast.error('Failed to save settings', { id: 'save' });
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'connection', label: 'Connection', icon: LinkIcon },
    { id: 'device', label: 'Device', icon: Server },
    { id: 'sync', label: 'Sync', icon: RefreshCw }
  ];

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <RefreshCw size={32} className="spinner" style={{ color: '#999', marginBottom: 16 }} />
        <p style={{ color: '#666' }}>Loading integration settings...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '24px 32px', 
        borderBottom: '2px solid #e0e0e0',
        background: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <Cloud size={32} style={{ color: '#007bff' }} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
              Website Integration
            </h1>
            <p style={{ fontSize: 14, color: '#666', margin: '4px 0 0' }}>
              Connect to NOREN website for digital invoices and cloud sync
            </p>
          </div>
        </div>

        {/* Connection Status Badge */}
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        padding: '0 32px',
        borderBottom: '1px solid #e0e0e0',
        background: '#fafafa'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 20px',
                background: isActive ? '#fff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #007bff' : '3px solid transparent',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#007bff' : '#666',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32, background: '#f5f5f5' }}>
        {activeTab === 'overview' && (
          <OverviewTab 
            connectionStatus={connectionStatus}
            deviceRegistered={deviceRegistered}
            syncStats={syncStats}
            onTestConnection={handleTestConnection}
            onAuthenticate={handleAuthenticateDevice}
            onSync={handleSyncNow}
          />
        )}

        {activeTab === 'connection' && (
          <ConnectionTab
            settings={settings}
            setSettings={setSettings}
            onSave={handleSaveSettings}
            onTest={handleTestConnection}
          />
        )}

        {activeTab === 'device' && (
          <DeviceTab
            settings={settings}
            setSettings={setSettings}
            deviceRegistered={deviceRegistered}
            onRegister={() => {}}
            onSave={handleSaveSettings}
          />
        )}

        {activeTab === 'sync' && (
          <SyncTab
            settings={settings}
            setSettings={setSettings}
            syncStats={syncStats}
            onSync={handleSyncNow}
            onRefreshStats={loadSyncStats}
            onSave={handleSaveSettings}
          />
        )}
      </div>

      <style>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ConnectionStatusBadge({ status }) {
  const configs = {
    connected: {
      icon: CheckCircle,
      color: '#28a745',
      bg: '#d4edda',
      label: 'Connected'
    },
    disconnected: {
      icon: XCircle,
      color: '#dc3545',
      bg: '#f8d7da',
      label: 'Disconnected'
    },
    error: {
      icon: AlertTriangle,
      color: '#ffc107',
      bg: '#fff3cd',
      label: 'Connection Error'
    },
    unknown: {
      icon: CloudOff,
      color: '#6c757d',
      bg: '#e2e3e5',
      label: 'Unknown'
    }
  };

  const config = configs[status] || configs.unknown;
  const Icon = config.icon;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: config.bg,
      borderRadius: 20,
      marginTop: 12
    }}>
      <Icon size={16} style={{ color: config.color }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}

function OverviewTab({ 
  connectionStatus, 
  deviceRegistered, 
  syncStats,
  onTestConnection,
  onAuthenticate,
  onSync
}) {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        marginBottom: 32
      }}>
        <StatusCard
          icon={<Server size={32} style={{ color: '#007bff' }} />}
          title="Device Status"
          value={deviceRegistered ? 'Registered' : 'Not Registered'}
          status={deviceRegistered ? 'success' : 'warning'}
        />

        <StatusCard
          icon={<LinkIcon size={32} style={{ color: '#28a745' }} />}
          title="Connection"
          value={connectionStatus === 'connected' ? 'Active' : 'Inactive'}
          status={connectionStatus === 'connected' ? 'success' : 'error'}
        />

        <StatusCard
          icon={<Database size={32} style={{ color: '#17a2b8' }} />}
          title="Pending Syncs"
          value={syncStats ? syncStats.pending : '-'}
          status={syncStats && syncStats.pending > 0 ? 'warning' : 'success'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <ActionCard
          icon={<LinkIcon />}
          title="Test Connection"
          description="Check if backend is reachable"
          buttonLabel="Test Now"
          onClick={onTestConnection}
        />

        <ActionCard
          icon={<Server />}
          title="Authenticate Device"
          description="Verify device credentials with server"
          buttonLabel="Authenticate"
          onClick={onAuthenticate}
          disabled={!deviceRegistered}
        />

        <ActionCard
          icon={<RefreshCw />}
          title="Sync Invoices"
          description="Upload pending invoices to cloud"
          buttonLabel="Sync Now"
          onClick={onSync}
          badge={syncStats?.pending > 0 ? `${syncStats.pending} pending` : null}
        />
      </div>
    </div>
  );
}

function ConnectionTab({ settings, setSettings, onSave, onTest }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card title="Backend Configuration">
        <SettingInput
          label="Backend API URL"
          value={settings.cloudBackendURL || 'https://noren-iqk3.onrender.com/api'}
          onChange={(e) => setSettings(prev => ({ ...prev, cloudBackendURL: e.target.value }))}
          placeholder="https://noren-iqk3.onrender.com/api"
          helper="URL of the NOREN backend server"
        />

        <SettingInput
          label="Website URL"
          value={settings.websiteURL || 'https://norenfastion.shop'}
          onChange={(e) => setSettings(prev => ({ ...prev, websiteURL: e.target.value }))}
          placeholder="https://norenfastion.shop"
          helper="Customer-facing website URL for QR codes"
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={onTest} style={secondaryButtonStyle}>
            <LinkIcon size={16} />
            Test Connection
          </button>
          <button onClick={onSave} style={primaryButtonStyle}>
            Save Settings
          </button>
        </div>
      </Card>
    </div>
  );
}

function DeviceTab({ settings, deviceRegistered, onSave }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyFingerprint = () => {
    navigator.clipboard.writeText(settings.deviceFingerprint);
    setCopied(true);
    toast.success('Device fingerprint copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card title="Device Information">
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>
            Device Fingerprint
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={settings.deviceFingerprint || 'Not generated'}
              readOnly
              style={{ ...inputStyle, flex: 1, background: '#f8f8f8', fontFamily: 'monospace' }}
            />
            <button onClick={copyFingerprint} style={iconButtonStyle}>
              {copied ? <Check size={16} style={{ color: '#28a745' }} /> : <Copy size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Unique hardware identifier for this POS terminal
          </p>
        </div>

        <SettingInput
          label="Device ID (Server-assigned)"
          value={settings.cloudDeviceId || 'Not registered'}
          readOnly
          helper="Assigned after successful registration"
        />

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>
            API Key
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.cloudApiKey || 'Not registered'}
              readOnly
              style={{ ...inputStyle, flex: 1, background: '#f8f8f8', fontFamily: 'monospace', fontSize: 12 }}
            />
            <button 
              onClick={() => setShowApiKey(!showApiKey)} 
              style={iconButtonStyle}
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Keep this secret and secure
          </p>
        </div>

        <div style={{
          padding: 16,
          background: deviceRegistered ? '#d4edda' : '#fff3cd',
          border: `1px solid ${deviceRegistered ? '#c3e6cb' : '#ffeeba'}`,
          borderRadius: 8,
          marginTop: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
            {deviceRegistered ? (
              <CheckCircle size={20} style={{ color: '#28a745', flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={20} style={{ color: '#856404', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: deviceRegistered ? '#155724' : '#856404' }}>
                {deviceRegistered ? 'Device Registered' : 'Device Not Registered'}
              </div>
              <div style={{ fontSize: 13, color: deviceRegistered ? '#155724' : '#856404', marginTop: 4 }}>
                {deviceRegistered 
                  ? 'This device is authorized to sync with the NOREN backend'
                  : 'Register this device through the admin panel to enable cloud sync'
                }
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SyncTab({ settings, setSettings, syncStats, onSync, onRefreshStats, onSave }) {
  const [workerStatus, setWorkerStatus] = React.useState(null);

  // Load background worker status
  React.useEffect(() => {
    const loadWorkerStatus = async () => {
      try {
        const { default: backgroundSyncWorker } = await import('../services/backgroundSyncWorker');
        const status = await backgroundSyncWorker.getStatus();
        setWorkerStatus(status);
      } catch (error) {
        console.error('Failed to load worker status:', error);
      }
    };

    loadWorkerStatus();
    const interval = setInterval(loadWorkerStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Background Worker Status Card */}
      <Card title="Background Sync Worker" style={{ marginBottom: 24 }}>
        {workerStatus && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: workerStatus.isRunning ? '#28a745' : '#dc3545'
              }} />
              <span style={{ fontWeight: 600 }}>
                {workerStatus.isRunning ? 'Running' : 'Stopped'}
              </span>
              {workerStatus.syncInProgress && (
                <span style={{ 
                  fontSize: 12, 
                  color: '#ffc107',
                  marginLeft: 8 
                }}>
                  (Syncing...)
                </span>
              )}
            </div>

            <div style={{ 
              background: '#f8f9fa', 
              padding: 16, 
              borderRadius: 8,
              fontSize: 13,
              color: '#495057',
              marginBottom: 16
            }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Network:</strong> {workerStatus.networkOnline ? '🟢 Online' : '🔴 Offline'}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Device Authenticated:</strong> {workerStatus.deviceAuthenticated ? '✓ Yes' : '✗ No'}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Last Sync:</strong> {workerStatus.stats?.lastSyncTime 
                  ? new Date(workerStatus.stats.lastSyncTime).toLocaleString() 
                  : 'Never'}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Total Synced:</strong> {workerStatus.stats?.totalSynced || 0}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Total Failed:</strong> {workerStatus.stats?.totalFailed || 0}
              </div>
              {workerStatus.stats?.lastError && (
                <div style={{ color: '#dc3545', marginTop: 8 }}>
                  <strong>Last Error:</strong> {workerStatus.stats.lastError}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
              <StatItem label="Queue Total" value={workerStatus.queue?.total || 0} color="#6c757d" />
              <StatItem label="Pending" value={workerStatus.queue?.pending || 0} color="#ffc107" />
              <StatItem label="Syncing" value={workerStatus.queue?.syncing || 0} color="#17a2b8" />
              <StatItem label="Synced" value={workerStatus.queue?.synced || 0} color="#28a745" />
              <StatItem label="Failed" value={workerStatus.queue?.failed || 0} color="#dc3545" />
            </div>
          </>
        )}
      </Card>

      <Card title="Sync Statistics">
        {syncStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
            <StatItem label="Total" value={syncStats.total} color="#6c757d" />
            <StatItem label="Pending" value={syncStats.pending} color="#ffc107" />
            <StatItem label="Done" value={syncStats.done} color="#28a745" />
            <StatItem label="Failed" value={syncStats.failed} color="#dc3545" />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={onSync} style={primaryButtonStyle}>
            <Upload size={16} />
            Sync Now
          </button>
          <button onClick={onRefreshStats} style={secondaryButtonStyle}>
            <RefreshCw size={16} />
            Refresh Stats
          </button>
        </div>
      </Card>

      <Card title="Automatic Sync" style={{ marginTop: 24 }}>
        <SettingToggle
          label="Enable Auto-Sync"
          checked={settings.autoSync !== false}
          onChange={(checked) => setSettings(prev => ({ ...prev, autoSync: checked }))}
          description="Automatically sync invoices in the background"
        />

        <SettingInput
          label="Sync Interval (seconds)"
          type="number"
          value={settings.syncIntervalSeconds || 30}
          onChange={(e) => setSettings(prev => ({ ...prev, syncIntervalSeconds: parseInt(e.target.value) || 30 }))}
          helper="How often to check for pending syncs (minimum 10 seconds)"
          min={10}
          max={3600}
        />

        <SettingInput
          label="Batch Size"
          type="number"
          value={settings.batchSize || 10}
          onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 10 }))}
          helper="Number of items to sync per batch"
          min={1}
          max={50}
        />

        <SettingInput
          label="Max Retry Attempts"
          type="number"
          value={settings.maxRetries || 5}
          onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 5 }))}
          helper="Maximum retry attempts for failed syncs"
          min={1}
          max={10}
        />

        <button onClick={onSave} style={{ ...primaryButtonStyle, marginTop: 20 }}>
          Save Settings
        </button>
      </Card>
    </div>
  );
}

// Reusable Components

function Card({ title, children, style = {} }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      ...style
    }}>
      {title && (
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 20 }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function StatusCard({ icon, title, value, status }) {
  const colors = {
    success: { bg: '#d4edda', text: '#155724' },
    warning: { bg: '#fff3cd', text: '#856404' },
    error: { bg: '#f8d7da', text: '#721c24' }
  };

  const config = colors[status] || colors.success;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{title}</div>
      <div style={{ 
        fontSize: 24, 
        fontWeight: 700, 
        color: config.text,
        background: config.bg,
        padding: '8px 16px',
        borderRadius: 8,
        display: 'inline-block'
      }}>
        {value}
      </div>
    </div>
  );
}

function ActionCard({ icon, title, description, buttonLabel, onClick, disabled, badge }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      position: 'relative'
    }}>
      {badge && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '4px 10px',
          background: '#ffc107',
          color: '#fff',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700
        }}>
          {badge}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {React.cloneElement(icon, { size: 28, style: { color: '#007bff' } })}
      </div>
      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{title}</h4>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>{description}</p>
      <button onClick={onClick} disabled={disabled} style={primaryButtonStyle}>
        {buttonLabel}
      </button>
    </div>
  );
}

function StatItem({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SettingInput({ label, value, onChange, helper, readOnly, ...props }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        style={{ ...inputStyle, background: readOnly ? '#f8f8f8' : '#fff' }}
        {...props}
      />
      {helper && (
        <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{helper}</p>
      )}
    </div>
  );
}

function SettingToggle({ label, checked, onChange, description }) {
  return (
    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'start', gap: 12 }}>
      <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute',
          cursor: 'pointer',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: checked ? '#007bff' : '#ccc',
          borderRadius: 26,
          transition: '0.3s'
        }}>
          <span style={{
            position: 'absolute',
            content: '',
            height: 20,
            width: 20,
            left: checked ? 25 : 3,
            bottom: 3,
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: '0.3s'
          }} />
        </span>
      </label>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{description}</div>
        )}
      </div>
    </div>
  );
}

// Styles

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  border: '2px solid #e0e0e0',
  borderRadius: 6,
  outline: 'none',
  transition: 'border 0.2s'
};

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  background: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s'
};

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: '#fff',
  color: '#007bff',
  border: '2px solid #007bff'
};

const iconButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  background: '#fff',
  border: '2px solid #e0e0e0',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

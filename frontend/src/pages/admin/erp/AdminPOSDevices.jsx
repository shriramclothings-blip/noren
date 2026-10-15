/**
 * Admin POS Devices Management
 * View and manage all registered POS devices across the business
 */

import { useState, useEffect } from 'react';
import {
  Monitor,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  Shield,
  Activity,
  Wifi,
  WifiOff,
  Ban,
  Play,
  Pause,
  Trash2,
  Eye,
  Key,
  Store
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function AdminPOSDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, suspended, revoked
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    revoked: 0,
    online: 0,
  });

  useEffect(() => {
    loadDevices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async (showToast = false) => {
    try {
      setRefreshing(true);
      const response = await api.get('/erp/pos/integration/devices');
      const devicesData = response.data.devices || [];
      
      setDevices(devicesData);
      
      // Calculate stats
      const now = new Date();
      const stats = {
        total: devicesData.length,
        active: devicesData.filter(d => d.status === 'active').length,
        suspended: devicesData.filter(d => d.status === 'suspended').length,
        revoked: devicesData.filter(d => d.status === 'revoked').length,
        online: devicesData.filter(d => {
          if (!d.last_seen_at) return false;
          const lastSeen = new Date(d.last_seen_at);
          const diffMinutes = (now - lastSeen) / 1000 / 60;
          return diffMinutes < 5; // Online if seen in last 5 minutes
        }).length,
      };
      setStats(stats);
      
      if (showToast) {
        toast.success('Devices refreshed');
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateDeviceStatus = async (deviceId, newStatus, notes = '') => {
    try {
      await api.put(`/erp/pos/integration/devices/${deviceId}/status`, {
        status: newStatus,
        notes: notes || undefined,
      });
      
      toast.success(`Device ${newStatus}`);
      loadDevices();
    } catch (error) {
      console.error('Failed to update device:', error);
      toast.error('Failed to update device status');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
          <CheckCircle size={14} />
          Active
        </span>
      ),
      suspended: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
          <Pause size={14} />
          Suspended
        </span>
      ),
      revoked: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
          <Ban size={14} />
          Revoked
        </span>
      ),
    };
    return badges[status] || badges.active;
  };

  const isDeviceOnline = (lastSeenAt) => {
    if (!lastSeenAt) return false;
    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const diffMinutes = (now - lastSeen) / 1000 / 60;
    return diffMinutes < 5; // Online if seen in last 5 minutes
  };

  const getOnlineBadge = (lastSeenAt) => {
    const online = isDeviceOnline(lastSeenAt);
    return online ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
        <Wifi size={14} />
        Online
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
        <WifiOff size={14} />
        Offline
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const filteredDevices = devices.filter(device => {
    if (filter === 'all') return true;
    return device.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
          <p className="text-gray-600 dark:text-gray-400">Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Monitor size={28} />
            POS Devices
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and monitor all registered POS terminals
          </p>
        </div>
        
        <button
          onClick={() => loadDevices(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Monitor size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {stats.active}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Online Now</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {stats.online}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Wifi size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Suspended</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {stats.suspended}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <Pause size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Revoked</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {stats.revoked}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <Ban size={24} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Active ({stats.active})
        </button>
        <button
          onClick={() => setFilter('suspended')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'suspended'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Suspended ({stats.suspended})
        </button>
        <button
          onClick={() => setFilter('revoked')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'revoked'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Revoked ({stats.revoked})
        </button>
      </div>

      {/* Devices Grid */}
      {filteredDevices.length === 0 ? (
        <div className="card p-12 text-center">
          <Monitor size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Devices Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'all'
              ? 'No POS devices have been registered yet.'
              : `No ${filter} devices found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              {/* Device Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDeviceOnline(device.last_seen_at)
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Monitor size={24} className={
                      isDeviceOnline(device.last_seen_at)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    } />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {device.device_name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      ID: {device.id}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(device.status)}
                  {getOnlineBadge(device.last_seen_at)}
                </div>
              </div>

              {/* Device Info */}
              <div className="space-y-3 mb-4">
                {device.store_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Store size={16} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {device.store_name}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Key size={16} className="text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                    {device.api_key_prefix}***
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Activity size={16} className="text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Last seen: {formatRelativeTime(device.last_seen_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Registered: {formatDate(device.created_at)}
                  </span>
                </div>

                {device.last_ip && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                      {device.last_ip}
                    </span>
                  </div>
                )}

                {device.registered_by_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Shield size={16} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      By: {device.registered_by_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Sync Queue Status */}
              {(device.pending_ops > 0 || device.failed_ops > 0) && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-700 dark:text-amber-300">
                      {device.pending_ops > 0 && `${device.pending_ops} pending`}
                      {device.pending_ops > 0 && device.failed_ops > 0 && ', '}
                      {device.failed_ops > 0 && `${device.failed_ops} failed`}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {device.status === 'active' && (
                  <>
                    <button
                      onClick={() => {
                        if (confirm(`Suspend device "${device.device_name}"?`)) {
                          updateDeviceStatus(device.id, 'suspended', 'Manually suspended by admin');
                        }
                      }}
                      className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                    >
                      <Pause size={14} />
                      Suspend
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Revoke device "${device.device_name}"? This cannot be undone.`)) {
                          updateDeviceStatus(device.id, 'revoked', 'Manually revoked by admin');
                        }
                      }}
                      className="flex-1 btn-danger text-sm py-2 flex items-center justify-center gap-2"
                    >
                      <Ban size={14} />
                      Revoke
                    </button>
                  </>
                )}
                
                {device.status === 'suspended' && (
                  <>
                    <button
                      onClick={() => updateDeviceStatus(device.id, 'active', 'Reactivated by admin')}
                      className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                    >
                      <Play size={14} />
                      Activate
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Revoke device "${device.device_name}"? This cannot be undone.`)) {
                          updateDeviceStatus(device.id, 'revoked', 'Manually revoked by admin');
                        }
                      }}
                      className="flex-1 btn-danger text-sm py-2 flex items-center justify-center gap-2"
                    >
                      <Ban size={14} />
                      Revoke
                    </button>
                  </>
                )}

                {device.status === 'revoked' && (
                  <div className="flex-1 text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                    Permanently revoked
                  </div>
                )}
              </div>

              {device.notes && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Notes:</strong> {device.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

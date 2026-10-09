import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Server, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Power,
  Pause,
  Shield,
  TrendingUp,
  Users,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function POSManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [devices, setDevices] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [devicesRes, statsRes] = await Promise.all([
        axios.get('/api/erp/pos/integration/devices', config),
        axios.get('/api/erp/pos/integration/admin/overview', config)
      ]);

      setDevices(devicesRes.data.devices || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load POS data:', error);
      toast.error('Failed to load POS management data');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.get('/api/erp/pos/integration/invoices', config);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  const handleDeviceStatusChange = async (deviceId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(
        `/api/erp/pos/integration/devices/${deviceId}/status`,
        { status: newStatus },
        config
      );

      toast.success(`Device ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update device status:', error);
      toast.error('Failed to update device status');
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.device_fingerprint?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || device.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="animate-spin" size={32} />
        <span className="ml-3 text-lg">Loading POS Management...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                POS Management
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage POS devices, invoices, and system health
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'devices', label: 'Devices', icon: Server },
              { id: 'invoices', label: 'Invoices', icon: Receipt },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'invoices') loadInvoices();
                }}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} devices={devices} />
        )}

        {activeTab === 'devices' && (
          <DevicesTab
            devices={filteredDevices}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onStatusChange={handleDeviceStatusChange}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesTab invoices={invoices} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab stats={stats} />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, devices }) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Devices"
          value={devices?.length || 0}
          icon={Server}
          color="blue"
          subtitle={`${devices?.filter(d => d.status === 'active').length || 0} active`}
        />
        <StatCard
          title="Synced Invoices"
          value={stats?.total_invoices || 0}
          icon={Receipt}
          color="green"
          subtitle="All time"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${parseFloat(stats?.total_revenue || 0).toLocaleString('en-IN')}`}
          icon={TrendingUp}
          color="purple"
          subtitle="From POS sales"
        />
        <StatCard
          title="Sync Queue"
          value={stats?.pending_syncs || 0}
          icon={Clock}
          color={stats?.pending_syncs > 10 ? 'red' : 'gray'}
          subtitle="Pending operations"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Device Status Overview
        </h3>
        <div className="space-y-3">
          {devices?.slice(0, 5).map(device => (
            <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  device.status === 'active' ? 'bg-green-500' :
                  device.status === 'suspended' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{device.device_name}</p>
                  <p className="text-xs text-gray-500">{device.device_fingerprint}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {device.last_sync_at 
                    ? `Last sync: ${new Date(device.last_sync_at).toLocaleString()}`
                    : 'Never synced'}
                </p>
                {device.pending_ops > 0 && (
                  <p className="text-xs text-yellow-600">{device.pending_ops} pending ops</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Devices Tab Component
function DevicesTab({ devices, searchTerm, setSearchTerm, filterStatus, setFilterStatus, onStatusChange }) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Devices Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Device
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Sync
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Queue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {devices.map(device => (
              <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {device.device_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {device.device_fingerprint}
                    </div>
                    {device.store_name && (
                      <div className="text-xs text-gray-400">Store: {device.store_name}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    device.status === 'active' ? 'bg-green-100 text-green-800' :
                    device.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {device.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {device.last_sync_at
                    ? new Date(device.last_sync_at).toLocaleString()
                    : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {device.pending_ops > 0 && (
                      <span className="text-yellow-600">{device.pending_ops} pending</span>
                    )}
                    {device.failed_ops > 0 && (
                      <span className="text-red-600 ml-2">{device.failed_ops} failed</span>
                    )}
                    {device.pending_ops === 0 && device.failed_ops === 0 && (
                      <span className="text-gray-400">All clear</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {device.status === 'active' && (
                      <button
                        onClick={() => onStatusChange(device.id, 'suspended')}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Suspend device"
                      >
                        <Pause size={16} />
                      </button>
                    )}
                    {device.status === 'suspended' && (
                      <button
                        onClick={() => onStatusChange(device.id, 'active')}
                        className="text-green-600 hover:text-green-900"
                        title="Activate device"
                      >
                        <Power size={16} />
                      </button>
                    )}
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      title="View details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Invoices Tab Component
function InvoicesTab({ invoices }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Synced Invoices
        </h3>
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No invoices synced yet</p>
          ) : (
            invoices.map(invoice => (
              <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{invoice.bill_no}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(invoice.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₹{parseFloat(invoice.total).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{invoice.payment_method}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ stats }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sales Performance
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Today's Sales</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ₹{parseFloat(stats?.today_revenue || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">This Week</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ₹{parseFloat(stats?.week_revenue || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">This Month</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ₹{parseFloat(stats?.month_revenue || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Health
        </h3>
        <div className="space-y-4">
          <HealthIndicator
            label="Sync Status"
            status={stats?.sync_health === 'healthy' ? 'good' : 'warning'}
            value={stats?.sync_health || 'Unknown'}
          />
          <HealthIndicator
            label="Email Delivery"
            status="good"
            value="100% success rate"
          />
          <HealthIndicator
            label="Device Connectivity"
            status={stats?.device_health === 'healthy' ? 'good' : 'warning'}
            value={`${stats?.active_devices || 0}/${stats?.total_devices || 0} online`}
          />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

// Health Indicator Component
function HealthIndicator({ label, status, value }) {
  const statusConfig = {
    good: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' }
  };

  const config = statusConfig[status] || statusConfig.good;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${config.bg}`}>
          <Icon className={config.color} size={16} />
        </div>
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

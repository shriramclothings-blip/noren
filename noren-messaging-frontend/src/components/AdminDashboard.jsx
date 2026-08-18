import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

/**
 * AdminDashboard Component
 * Comprehensive admin/moderation panel with analytics, user management, content moderation
 */

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('metrics'); // metrics, users, content, reports, flags, logs
  const [loading, setLoading] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);

  // Users State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  // Content State
  const [content, setContent] = useState([]);
  const [contentType, setContentType] = useState('all');

  // Reports State
  const [reports, setReports] = useState([]);
  const [reportStatus, setReportStatus] = useState('pending');

  // Feature Flags State
  const [flags, setFlags] = useState([]);

  // Audit Logs State
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'metrics') loadMetrics();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'content') loadContent();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'flags') loadFlags();
    if (activeTab === 'logs') loadLogs();
  }, [activeTab, userSearch, userFilter, contentType, reportStatus]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [m, t] = await Promise.all([
        api.get('/admin/social/metrics?days=30'),
        api.get('/admin/social/analytics/trends?days=30')
      ]);
      setMetrics(m.data);
      setTrends(t.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = [];
      if (userSearch) params.push(`search=${userSearch}`);
      if (userFilter !== 'all') params.push(`status=${userFilter}`);
      const query = params.length > 0 ? '?' + params.join('&') : '';

      const res = await api.get(`/admin/social/users${query}&limit=50`);
      setUsers(res.data?.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      const query = contentType !== 'all' ? `?type=${contentType}` : '';
      const res = await api.get(`/admin/social/content${query}&limit=50`);
      setContent(res.data?.content || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const query = reportStatus !== 'all' ? `?status=${reportStatus}` : '';
      const res = await api.get(`/admin/social/reports${query}&limit=50`);
      setReports(res.data?.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadFlags = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/social/feature-flags');
      setFlags(res.data?.feature_flags || []);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/social/audit-logs?limit=100');
      setLogs(res.data?.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId) => {
    try {
      await api.put(`/admin/social/users/${userId}/status`, {
        action: 'ban',
        reason: 'Admin action'
      });
      toast.success('User banned');
      loadUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error('Failed to ban user');
    }
  };

  const verifyUser = async (userId) => {
    try {
      await api.put(`/admin/social/users/${userId}/status`, {
        action: 'verify',
        reason: 'Admin verification'
      });
      toast.success('User verified');
      loadUsers();
    } catch (error) {
      console.error('Failed to verify user:', error);
      toast.error('Failed to verify user');
    }
  };

  const removeContent = async (contentType, contentId) => {
    try {
      await api.post('/admin/social/content/action', {
        content_type: contentType,
        content_id: contentId,
        action: 'remove',
        reason: 'Admin removal'
      });
      toast.success('Content removed');
      loadContent();
    } catch (error) {
      console.error('Failed to remove content:', error);
      toast.error('Failed to remove content');
    }
  };

  const resolveReport = async (reportId, action) => {
    try {
      await api.put(`/admin/social/reports/${reportId}`, {
        status: 'resolved',
        action_taken: action,
        moderator_note: `Action taken: ${action}`
      });
      toast.success('Report resolved');
      loadReports();
    } catch (error) {
      console.error('Failed to resolve report:', error);
      toast.error('Failed to resolve report');
    }
  };

  const toggleFeatureFlag = async (flagKey, currentValue) => {
    try {
      await api.put('/admin/social/feature-flags', {
        key: flagKey,
        enabled: !currentValue
      });
      toast.success('Feature flag updated');
      loadFlags();
    } catch (error) {
      console.error('Failed to update feature flag:', error);
      toast.error('Failed to update feature flag');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your platform, users, and content</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {['metrics', 'users', 'content', 'reports', 'flags', 'logs'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-semibold capitalize border-b-2 transition ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : activeTab === 'metrics' ? (
          <div className="space-y-8">
            {/* Metrics Cards */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-2">Total Users</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.users.total_active}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-2">New (30d)</h3>
                  <p className="text-3xl font-bold text-green-600">{metrics.users.new_last_30days}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-2">Banned</h3>
                  <p className="text-3xl font-bold text-red-600">{metrics.users.banned}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-2">Pending Reports</h3>
                  <p className="text-3xl font-bold text-orange-600">{metrics.moderation.pending_reports}</p>
                </div>
              </div>
            )}

            {/* Content Stats */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1">Posts</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.content.posts}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1">Reels</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.content.reels}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1">Messages</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.content.total_messages}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1">Calls</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.content.total_calls}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1">Engagement</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.content.average_engagement}</p>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="verified">Verified</option>
                <option value="new">New (7d)</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Followers</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{u.followers_count}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          u.is_banned ? 'bg-red-100 text-red-800' : u.is_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {u.is_banned ? 'Banned' : u.is_verified ? 'Verified' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        {!u.is_verified && (
                          <button
                            onClick={() => verifyUser(u.id)}
                            className="text-green-600 hover:text-green-700 font-semibold"
                          >
                            Verify
                          </button>
                        )}
                        {!u.is_banned && (
                          <button
                            onClick={() => banUser(u.id)}
                            className="text-red-600 hover:text-red-700 font-semibold"
                          >
                            Ban
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'content' ? (
          <div className="space-y-4">
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Content</option>
              <option value="post">Posts</option>
              <option value="reel">Reels</option>
              <option value="comment">Comments</option>
            </select>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Author</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Caption</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {content.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white capitalize">{c.content_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 truncate">{c.caption || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{c.likes_count || 0} likes</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => removeContent(c.content_type, c.id)}
                          className="text-red-600 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'reports' ? (
          <div className="space-y-4">
            <select
              value={reportStatus}
              onChange={(e) => setReportStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Reports</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Reporter</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{r.reporter_name}</td>
                      <td className="px-6 py-4 text-sm capitalize text-gray-600 dark:text-gray-400">{r.category}</td>
                      <td className="px-6 py-4 text-sm capitalize text-gray-600 dark:text-gray-400">{r.target_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{r.reason}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                          r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => resolveReport(r.id, 'removed')}
                              className="text-red-600 hover:text-red-700 font-semibold text-xs"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => resolveReport(r.id, 'warned')}
                              className="text-orange-600 hover:text-orange-700 font-semibold text-xs"
                            >
                              Warn
                            </button>
                            <button
                              onClick={() => resolveReport(r.id, 'rejected')}
                              className="text-gray-600 hover:text-gray-700 font-semibold text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'flags' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Feature</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {flags.map(f => (
                  <tr key={f.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white capitalize">{f.key.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        f.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {f.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => toggleFeatureFlag(f.key, f.enabled)}
                        className="text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {f.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{l.admin_id}</td>
                    <td className="px-6 py-4 text-sm capitalize text-gray-600 dark:text-gray-400">{l.action.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm capitalize text-gray-600 dark:text-gray-400">{l.target_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{l.reason || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

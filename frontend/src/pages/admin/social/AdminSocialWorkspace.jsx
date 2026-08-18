import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, AlertTriangle, Settings, RefreshCw, CheckCircle2,
  XCircle, ShieldAlert, Sparkles, Video, MessageSquare, ShieldCheck, Eye, Trash2, Check, Lock
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function AdminSocialWorkspace({ initialTab = 'dashboard' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [reports, setReports] = useState([]);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportFilter, setReportFilter] = useState('pending');

  const [contentList, setContentList] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab, reportFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard' || activeTab === 'social-dashboard') {
        const res = await api.get('/admin/social/metrics');
        setMetrics(res.data.metrics);
      } else if (activeTab === 'posts' || activeTab === 'reels') {
        const res = await api.get(`/admin/social/content?type=${activeTab}`);
        setContentList(res.data.content || []);
      } else if (activeTab === 'reports' || activeTab === 'social-reports') {
        const res = await api.get(`/admin/social/reports?status=${reportFilter}`);
        setReports(res.data);
      } else if (activeTab === 'flags' || activeTab === 'social-flags') {
        const res = await api.get('/admin/social/feature-flags');
        setFeatureFlags(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin social data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDeleteContent = async (contentType, contentId) => {
    if (!window.confirm(`Are you sure you want to delete this ${contentType}?`)) return;
    try {
      await api.post('/admin/social/content/action', {
        content_type: contentType,
        content_id: contentId,
        action: 'remove',
        reason: 'Removed by Admin'
      });
      toast.success(`${contentType} deleted successfully`);
      setContentList(prev => prev.filter(c => c.id !== contentId));
    } catch {
      toast.error('Failed to delete content');
    }
  };

  const handleToggleFlag = async (key, currentEnabled) => {
    try {
      await api.put('/admin/social/feature-flags', { key, enabled: !currentEnabled });
      toast.success(`Feature '${key}' ${!currentEnabled ? 'enabled' : 'disabled'}`);
      setFeatureFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !currentEnabled } : f));
    } catch {
      toast.error('Failed to update feature flag');
    }
  };

  const handleResolveReport = async (reportId, status, actionTaken) => {
    try {
      await api.put(`/admin/social/reports/${reportId}`, {
        status,
        action_taken: actionTaken,
        moderator_note: 'Resolved via Admin Social Dashboard'
      });
      toast.success(`Report marked as ${status}`);
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch {
      toast.error('Failed to update report');
    }
  };

  const handleUserAction = async (userId, action, isVerified, isBanned) => {
    try {
      await api.put(`/admin/social/users/${userId}`, { action, is_verified: isVerified, is_banned: isBanned });
      toast.success(`User action '${action}' completed`);
      fetchData();
    } catch {
      toast.error('Failed to update user');
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0f172a' }}>NOREN Social Administration</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Central social platform moderation, analytics, user verification, and feature flags.
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { key: 'posts', label: 'Posts Management', icon: LayoutDashboard },
          { key: 'reels', label: 'Reels Management', icon: Video },
          { key: 'reports', label: 'Moderation Queue', icon: AlertTriangle },
          { key: 'flags', label: 'Feature Flags', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key || activeTab === `social-${t.key}`;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                border: 'none', borderBottom: isActive ? '2px solid #0284c7' : '2px solid transparent',
                background: 'none', color: isActive ? '#0284c7' : '#64748b',
                fontWeight: isActive ? 600 : 500, cursor: 'pointer'
              }}>
              <Icon size={18} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading administrative data...</div>
      ) : activeTab === 'dashboard' || activeTab === 'social-dashboard' ? (
        <div>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Social Users', value: metrics?.total_social_users || 0, icon: Users, color: '#3b82f6' },
              { label: 'Total Posts', value: metrics?.total_posts || 0, icon: LayoutDashboard, color: '#10b981' },
              { label: 'Total Reels', value: metrics?.total_reels || 0, icon: Video, color: '#8b5cf6' },
              { label: 'Active Stories', value: metrics?.active_stories || 0, icon: Sparkles, color: '#f59e0b' },
              { label: 'Total DM Messages', value: metrics?.total_messages || 0, icon: MessageSquare, color: '#ec4899' },
              { label: 'Pending Moderation', value: metrics?.pending_reports || 0, icon: AlertTriangle, color: '#ef4444' },
              { label: 'Banned Accounts', value: metrics?.banned_accounts || 0, icon: ShieldAlert, color: '#64748b' },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div key={idx} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{kpi.label}</span>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={kpi.color} />
                    </div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{kpi.value.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'reports' || activeTab === 'social-reports' ? (
        <div>
          {/* Moderation Queue */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {['pending', 'resolved', 'dismissed', 'all'].map(st => (
              <button
                key={st}
                onClick={() => setReportFilter(st)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1',
                  background: reportFilter === st ? '#0f172a' : '#fff',
                  color: reportFilter === st ? '#fff' : '#475569',
                  textTransform: 'capitalize', cursor: 'pointer', fontSize: 13, fontWeight: 500
                }}>
                {st} Reports
              </button>
            ))}
          </div>

          {!reports.length ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
              No moderation reports found for category '{reportFilter}'.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map(rep => (
                <div key={rep.id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ px: 8, py: 2, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 12, fontWeight: 700, padding: '2px 8px' }}>
                        {rep.category.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 13, color: '#64748b' }}>Target: <strong>{rep.target_type} #{rep.target_id}</strong></span>
                    </div>
                    <div style={{ fontSize: 14, color: '#1e293b', marginTop: 6 }}>{rep.reason || 'No specific reason given'}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Reported by {rep.reporter_name} ({rep.reporter_email}) on {new Date(rep.created_at).toLocaleString()}</div>
                  </div>

                  {rep.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'resolved', 'content_removed')}
                        style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        Remove & Resolve
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'dismissed', 'no_action')}
                        style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'posts' || activeTab === 'reels' ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>{activeTab} Management</h3>
          {!contentList.length ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No {activeTab} published yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contentList.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>({new Date(item.created_at).toLocaleString()})</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#334155' }}>{item.caption || 'No caption'}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Likes: {item.likes_count || 0}</div>
                  </div>
                  <button
                    onClick={() => handleAdminDeleteContent(item.content_type || (activeTab === 'posts' ? 'post' : 'reel'), item.id)}
                    style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={14} /> Remove Content
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'flags' || activeTab === 'social-flags' ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Platform Feature Flags</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {featureFlags.map(flag => (
              <div key={flag.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{flag.key}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{flag.description}</div>
                </div>
                <button
                  onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, border: 'none',
                    background: flag.enabled ? '#10b981' : '#cbd5e1',
                    color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13
                  }}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

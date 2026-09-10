import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw, Users, ShoppingBag, BarChart2 } from 'lucide-react';
import { getUTMAnalytics } from '../../api/analytics';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

const RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

const COLORS = ['#c9a96e', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#34d399', '#f59e0b'];

export default function MarketingIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const load = useCallback(async (r = range) => {
    setLoading(true);
    try {
      const res = await getUTMAnalytics({ range: r });
      setData(res.data);
    } catch { }
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, []);

  const links = data?.links || [];

  // Aggregate by source
  const bySource = links.reduce((acc, l) => {
    const src = l.source || 'direct';
    const existing = acc.find(a => a.source === src);
    if (existing) {
      existing.clicks += (l.total_clicks || 0);
      existing.unique_clicks += (l.unique_clicks || 0);
      existing.links += 1;
    } else {
      acc.push({ source: src, clicks: l.total_clicks || 0, unique_clicks: l.unique_clicks || 0, links: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.clicks - a.clicks);

  // Aggregate by campaign
  const byCampaign = links.reduce((acc, l) => {
    const camp = l.campaign || 'No Campaign';
    const existing = acc.find(a => a.campaign === camp);
    if (existing) {
      existing.clicks += (l.total_clicks || 0);
      existing.unique_clicks += (l.unique_clicks || 0);
    } else {
      acc.push({ campaign: camp, clicks: l.total_clicks || 0, unique_clicks: l.unique_clicks || 0 });
    }
    return acc;
  }, []).sort((a, b) => b.clicks - a.clicks).slice(0, 10);

  // Aggregate by medium
  const byMedium = links.reduce((acc, l) => {
    const med = l.medium || 'unknown';
    const existing = acc.find(a => a.medium === med);
    if (existing) { existing.value += (l.total_clicks || 0); }
    else { acc.push({ medium: med, value: l.total_clicks || 0 }); }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const totalClicks = links.reduce((s, l) => s + (l.total_clicks || 0), 0);
  const totalUnique = links.reduce((s, l) => s + (l.unique_clicks || 0), 0);
  const activeLinks = links.filter(l => l.is_active).length;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Marketing Intelligence</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Campaign performance from legitimate UTM tracking data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[var(--border)] rounded-md overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r.value}
                className={`px-3 py-1.5 text-xs transition-colors ${range === r.value ? 'bg-[var(--text-primary)] text-[var(--surface)]' : 'hover:bg-[var(--surface-3)]'}`}
                onClick={() => { setRange(r.value); load(r.value); }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => load(range)}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={TrendingUp}
            title="No marketing data"
            description="UTM tracking links and their click data will appear here once campaigns are running."
          />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: BarChart2, color: '#2563eb' },
              { label: 'Unique Clicks', value: totalUnique.toLocaleString(), icon: Users, color: '#7c3aed' },
              { label: 'Active Links', value: activeLinks, icon: TrendingUp, color: '#16a34a' },
              { label: 'Sources', value: bySource.length, icon: ShoppingBag, color: 'var(--accent)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Source */}
            {bySource.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-3">Clicks by Source</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bySource.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="clicks" name="Total Clicks" fill="var(--accent)" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="unique_clicks" name="Unique" fill="#60a5fa" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By Medium */}
            {byMedium.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-3">Clicks by Medium</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={byMedium}
                      dataKey="value"
                      nameKey="medium"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ medium, percent }) => `${medium} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {byMedium.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top campaigns */}
          {byCampaign.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold">Campaign Performance</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Total Clicks</th>
                    <th>Unique Clicks</th>
                    <th>Click Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {byCampaign.map((c, i) => (
                    <tr key={i}>
                      <td className="text-xs font-medium">{c.campaign}</td>
                      <td className="text-xs">{c.clicks.toLocaleString()}</td>
                      <td className="text-xs">{c.unique_clicks.toLocaleString()}</td>
                      <td className="text-xs">
                        {c.clicks > 0 ? `${Math.round((c.unique_clicks / c.clicks) * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* All links table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold">All Tracking Links</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Medium</th>
                  <th>Campaign</th>
                  <th>Clicks</th>
                  <th>Unique</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id}>
                    <td className="text-xs font-medium">{l.name}</td>
                    <td className="text-xs">{l.source || '—'}</td>
                    <td className="text-xs">{l.medium || '—'}</td>
                    <td className="text-xs">{l.campaign || '—'}</td>
                    <td className="text-xs font-medium">{(l.total_clicks || 0).toLocaleString()}</td>
                    <td className="text-xs">{(l.unique_clicks || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge text-[10px] ${l.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                        {l.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

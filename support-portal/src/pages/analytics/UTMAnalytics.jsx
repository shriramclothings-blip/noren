import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { getUTMAnalytics } from '../../api/analytics';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

export default function UTMAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const load = async (r = range) => {
    setLoading(true);
    try {
      const res = await getUTMAnalytics({ range: r });
      setData(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const links = data?.links || [];
  const topClicks = [...links].sort((a, b) => (b.total_clicks || 0) - (a.total_clicks || 0)).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">UTM Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Campaign link performance from real tracking data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[var(--border)] rounded-md overflow-hidden">
            {DATE_RANGES.map(r => (
              <button
                key={r.value}
                className={`px-3 py-1.5 text-xs transition-colors ${range === r.value ? 'bg-[var(--text-primary)] text-[var(--surface)]' : 'hover:bg-[var(--surface-3)]'}`}
                onClick={() => { setRange(r.value); load(r.value); }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : links.length === 0 ? (
        <div className="card">
          <EmptyState icon={TrendingUp} title="No UTM data" description="No tracking links or clicks found for this period." />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Links', value: links.length },
              { label: 'Total Clicks', value: links.reduce((s, l) => s + (l.total_clicks || 0), 0).toLocaleString() },
              { label: 'Unique Clicks', value: links.reduce((s, l) => s + (l.unique_clicks || 0), 0).toLocaleString() },
              { label: 'Active Links', value: links.filter(l => l.is_active).length },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {topClicks.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-4">Top Links by Clicks</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topClicks} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total_clicks" name="Total Clicks" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="unique_clicks" name="Unique Clicks" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Links table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Link Name</th>
                  <th>Source</th>
                  <th>Medium</th>
                  <th>Campaign</th>
                  <th>Total Clicks</th>
                  <th>Unique Clicks</th>
                  <th>Active</th>
                  <th>Created</th>
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
                    <td>{l.is_active ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-gray-100 text-gray-700">Inactive</span>}</td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(l.created_at)}</td>
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

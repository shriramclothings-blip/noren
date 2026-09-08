import React, { useState, useEffect } from 'react';
import { BarChart2, RefreshCw } from 'lucide-react';
import { getSupportAnalytics, getAgentWorkload } from '../../api/support';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['#c9a96e', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c'];
const RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

export default function SupportAnalytics() {
  const [data, setData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const load = async (r = range) => {
    setLoading(true);
    try {
      const [aRes, wRes] = await Promise.allSettled([
        getSupportAnalytics({ range: r }),
        getAgentWorkload({ range: r }),
      ]);
      if (aRes.status === 'fulfilled') setData(aRes.value.data);
      if (wRes.status === 'fulfilled') setAgents(wRes.value.data.agents || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageLoader />;

  const byStatus = data?.by_status || [];
  const byPriority = data?.by_priority || [];
  const byCategory = data?.by_category || [];
  const byDay = data?.by_day || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Support Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ticket performance and team metrics</p>
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
          <button className="btn btn-ghost btn-sm" onClick={() => load()}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tickets', value: data?.total_tickets ?? '—' },
          { label: 'Resolved', value: data?.resolved_count ?? '—' },
          { label: 'Avg Response', value: data?.avg_response_hours ? `${data.avg_response_hours}h` : '—' },
          { label: 'SLA Breaches', value: data?.sla_breaches ?? '—' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By status */}
        {byStatus.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">By Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By priority */}
        {byPriority.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">By Priority</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trend over time */}
        {byDay.length > 0 && (
          <div className="card p-4 md:col-span-2">
            <h3 className="text-sm font-semibold mb-4">Tickets Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="created" name="Created" stroke="var(--accent)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#4ade80" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Agent workload */}
      {agents.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold">Agent Workload</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Open</th>
                <th>In Progress</th>
                <th>Resolved Today</th>
                <th>Avg Response</th>
                <th>SLA Risk</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id}>
                  <td className="text-xs font-medium">{a.name}</td>
                  <td className="text-xs">{a.open_count ?? 0}</td>
                  <td className="text-xs">{a.in_progress_count ?? 0}</td>
                  <td className="text-xs">{a.resolved_today ?? 0}</td>
                  <td className="text-xs">{a.avg_response_hours ? `${a.avg_response_hours}h` : '—'}</td>
                  <td>
                    {a.sla_risk_count > 0 ? (
                      <span className="badge bg-red-100 text-red-800">{a.sla_risk_count}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

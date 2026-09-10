import React, { useState, useEffect, useCallback } from 'react';
import { Download, BarChart2, RefreshCw, FileText } from 'lucide-react';
import { getSupportAnalytics, getAgentWorkload } from '../../api/support';
import client from '../../api/client';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate, formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

const COLORS = ['#c9a96e', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#34d399'];

const REPORT_TABS = ['support', 'orders', 'sellers', 'influencers'];

export default function Reports() {
  const [tab, setTab] = useState('support');
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (r = range) => {
    setLoading(true);
    try {
      const [supportRes, agentRes, ordersRes] = await Promise.allSettled([
        getSupportAnalytics({ range: r }),
        getAgentWorkload({ range: r }),
        client.get('/api/support/orders', { params: { limit: 1 } }),
      ]);
      if (supportRes.status === 'fulfilled') setData(supportRes.value.data);
      if (agentRes.status === 'fulfilled') setAgents(agentRes.value.data.agents || []);
      if (ordersRes.status === 'fulfilled') setOrderStats(ordersRes.value.data);
    } catch { }
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, []);

  const exportCSV = async (type) => {
    setExporting(true);
    try {
      let rows = [];
      let filename = `noren-${type}-report-${new Date().toISOString().split('T')[0]}.csv`;

      if (type === 'tickets') {
        const res = await client.get('/api/support/tickets', { params: { limit: 1000, range } });
        const tickets = res.data.tickets || [];
        rows = [
          ['Ticket #', 'Subject', 'Status', 'Priority', 'Category', 'Customer', 'Email', 'Assigned To', 'Created', 'Resolved'],
          ...tickets.map(t => [
            t.ticket_number || t.id,
            `"${(t.subject || '').replace(/"/g, '""')}"`,
            t.status,
            t.priority,
            t.category,
            `"${(t.name || '').replace(/"/g, '""')}"`,
            t.email,
            t.assigned_name || 'Unassigned',
            formatDate(t.created_at),
            t.resolved_at ? formatDate(t.resolved_at) : '',
          ]),
        ];
      } else if (type === 'agents') {
        rows = [
          ['Agent', 'Email', 'Open Tickets', 'In Progress', 'Resolved Today', 'Avg Response (h)', 'SLA Risk'],
          ...agents.map(a => [a.name, a.email, a.open_count || 0, a.in_progress_count || 0, a.resolved_today || 0, a.avg_response_hours || '', a.sla_risk_count || 0]),
        ];
        filename = `noren-agents-report-${new Date().toISOString().split('T')[0]}.csv`;
      }

      if (!rows.length) { toast.error('No data to export'); setExporting(false); return; }

      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  };

  if (loading) return <PageLoader />;

  const byStatus = data?.by_status || [];
  const byPriority = data?.by_priority || [];
  const byCategory = data?.by_category || [];
  const byDay = data?.by_day || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Reports</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Performance and operational metrics</p>
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
          <button className="btn btn-ghost btn-sm" onClick={() => load(range)} disabled={loading}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {REPORT_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 whitespace-nowrap transition-colors ${
              tab === t ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Support Reports */}
      {tab === 'support' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Tickets', value: data?.total_tickets ?? 0 },
              { label: 'Resolved', value: data?.resolved_count ?? 0 },
              { label: 'Avg Response', value: data?.avg_response_hours ? `${data.avg_response_hours}h` : '—' },
              { label: 'SLA Breaches', value: data?.sla_breaches ?? 0 },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byStatus.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-3">Tickets by Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                      {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {byPriority.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-3">Tickets by Priority</h3>
                <ResponsiveContainer width="100%" height={200}>
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

            {byDay.length > 0 && (
              <div className="card p-4 md:col-span-2">
                <h3 className="text-sm font-semibold mb-3">Ticket Volume Over Time</h3>
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

          {/* Agent table */}
          {agents.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold">Agent Performance</h3>
                <button className="btn btn-outline btn-sm" onClick={() => exportCSV('agents')} disabled={exporting}>
                  <Download size={12} /> {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
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
                      <td className="text-xs">{a.open_count || 0}</td>
                      <td className="text-xs">{a.in_progress_count || 0}</td>
                      <td className="text-xs">{a.resolved_today || 0}</td>
                      <td className="text-xs">{a.avg_response_hours ? `${a.avg_response_hours}h` : '—'}</td>
                      <td>{a.sla_risk_count > 0 ? <span className="badge bg-red-100 text-red-800">{a.sla_risk_count}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Export tickets */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Export Ticket Data</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Download up to 1,000 tickets for the selected period as CSV
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => exportCSV('tickets')} disabled={exporting}>
                <Download size={12} /> {exporting ? 'Exporting…' : 'Export Tickets CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Reports */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="card p-6 text-center">
            <BarChart2 size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium">Order Reports</p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Export order issue data for the selected period</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                setExporting(true);
                try {
                  const res = await client.get('/api/support/orders', { params: { limit: 1000 } });
                  const orders = res.data.orders || [];
                  const rows = [
                    ['Order ID', 'Customer', 'Email', 'Status', 'Payment', 'Total', 'Method', 'Date'],
                    ...orders.map(o => [o.order_id, `"${(o.full_name || '').replace(/"/g, '""')}"`, o.email, o.status, o.payment_status, o.total, o.payment_method, formatDate(o.created_at)]),
                  ];
                  const csv = rows.map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `noren-orders-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Orders exported');
                } catch { toast.error('Export failed'); }
                setExporting(false);
              }}
              disabled={exporting}
            >
              <Download size={12} /> {exporting ? 'Exporting…' : 'Export Orders CSV'}
            </button>
          </div>
        </div>
      )}

      {/* Sellers Reports */}
      {tab === 'sellers' && (
        <div className="card p-6 text-center">
          <FileText size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium">Seller Reports</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Export seller performance data</p>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              setExporting(true);
              try {
                const res = await client.get('/api/support/sellers', { params: { limit: 500 } });
                const sellers = res.data.sellers || [];
                const rows = [
                  ['Brand', 'Name', 'Email', 'Status', 'KYC', 'Products', 'Orders', 'Revenue', 'Joined'],
                  ...sellers.map(s => [s.brand_name || '', s.user_name || '', s.email, s.status, s.kyc_status, s.total_products || 0, s.total_orders || 0, s.total_revenue || 0, formatDate(s.created_at)]),
                ];
                const csv = rows.map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `noren-sellers-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Sellers exported');
              } catch { toast.error('Export failed'); }
              setExporting(false);
            }}
            disabled={exporting}
          >
            <Download size={12} /> {exporting ? 'Exporting…' : 'Export Sellers CSV'}
          </button>
        </div>
      )}

      {/* Influencers Reports */}
      {tab === 'influencers' && (
        <div className="card p-6 text-center">
          <FileText size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium">Influencer Reports</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Export influencer performance data</p>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              setExporting(true);
              try {
                const res = await client.get('/api/support/influencers', { params: { limit: 500 } });
                const influencers = res.data.influencers || [];
                const rows = [
                  ['Display Name', 'Username', 'Email', 'Status', 'Category', 'Clicks', 'Orders', 'Revenue', 'Commission'],
                  ...influencers.map(i => [i.display_name || '', i.username || '', i.email, i.status, i.category || '', i.total_clicks || 0, i.total_orders || 0, i.total_revenue || 0, i.total_commission || 0]),
                ];
                const csv = rows.map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `noren-influencers-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Influencers exported');
              } catch { toast.error('Export failed'); }
              setExporting(false);
            }}
            disabled={exporting}
          >
            <Download size={12} /> {exporting ? 'Exporting…' : 'Export Influencers CSV'}
          </button>
        </div>
      )}
    </div>
  );
}

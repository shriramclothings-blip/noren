import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket, Users, ShoppingBag, AlertTriangle, Zap, CheckCircle,
  Clock, TrendingUp, AlertCircle, Store, UserCheck, RefreshCw,
  ArrowRight, Activity
} from 'lucide-react';
import { getDashboardMetrics, getAdminStats } from '../api/analytics';
import { getTicketStats } from '../api/support';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { formatDateTime, timeAgo, formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)', link, loading }) {
  const inner = (
    <div className="stat-card hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 skeleton w-16 rounded" />
      ) : (
        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</div>
      )}
      {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      {link && <Link to={link} className="text-xs flex items-center gap-1 mt-1 hover:opacity-80" style={{ color }}>View all <ArrowRight size={11} /></Link>}
    </div>
  );
  return inner;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [stats, setStats] = useState(null);
  const [ticketStats, setTicketStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [metricsRes, statsRes, ticketRes] = await Promise.allSettled([
        getDashboardMetrics(),
        getAdminStats(),
        getTicketStats(),
      ]);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (ticketRes.status === 'fulfilled') {
        setTicketStats(ticketRes.value.data?.stats);
        setRecentTickets(ticketRes.value.data?.recent || []);
      }
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, []);

  const ts = ticketStats || {};
  const s = stats || {};

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Welcome back, {user?.name}. Last updated {timeAgo(lastRefresh)}.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Ticket stats */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Ticket Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {loading ? (
            Array(10).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard icon={Ticket} label="Open Tickets" value={ts.open ?? 0} color="#2563eb" link="/tickets?status=open" />
              <StatCard icon={AlertCircle} label="Unassigned" value={ts.unassigned ?? 0} color="#d97706" link="/tickets/unassigned" />
              <StatCard icon={Ticket} label="My Tickets" value={ts.my ?? 0} color="#7c3aed" link="/tickets/my" />
              <StatCard icon={AlertTriangle} label="Critical" value={ts.critical ?? 0} color="#dc2626" link="/tickets/critical" />
              <StatCard icon={Zap} label="SLA Risk" value={ts.sla_risk ?? 0} color="#c2410c" link="/tickets/sla-risk" />
              <StatCard icon={Clock} label="Waiting Customer" value={ts.waiting_customer ?? 0} color="#0369a1" />
              <StatCard icon={TrendingUp} label="Escalated" value={ts.escalated ?? 0} color="#be185d" />
              <StatCard icon={CheckCircle} label="Resolved Today" value={ts.resolved_today ?? 0} color="#15803d" />
              <StatCard icon={Activity} label="Avg Response" value={ts.avg_response ? `${ts.avg_response}h` : '—'} color="var(--accent)" sub="First response time" />
              <StatCard icon={Activity} label="Avg Resolution" value={ts.avg_resolution ? `${ts.avg_resolution}h` : '—'} color="var(--accent)" sub="Resolution time" />
            </>
          )}
        </div>
      </section>

      {/* Operations stats */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Operations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {loading ? (
            Array(5).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard icon={Users} label="New Customers" value={s.new_customers_today ?? 0} color="#16a34a" sub="Today" link="/customers" />
              <StatCard icon={ShoppingBag} label="Orders Today" value={s.orders_today ?? 0} color="#2563eb" sub="All orders" link="/orders" />
              <StatCard icon={AlertCircle} label="Failed Payments" value={s.failed_payments ?? 0} color="#dc2626" sub="Today" />
              <StatCard icon={Store} label="Seller Issues" value={ts.seller_tickets ?? 0} color="#d97706" link="/sellers/support" />
              <StatCard icon={UserCheck} label="Influencer Issues" value={ts.influencer_tickets ?? 0} color="#7c3aed" link="/influencers/support" />
            </>
          )}
        </div>
      </section>

      {/* Recent tickets */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Recent Tickets
          </h2>
          <Link to="/tickets" className="btn btn-ghost btn-sm text-xs">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-3 flex-1 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent tickets</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Customer</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map(t => (
                    <tr key={t.id}>
                      <td>
                        <Link
                          to={`/tickets/${t.id}`}
                          className="text-xs font-mono font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          #{t.ticket_number || t.id}
                        </Link>
                      </td>
                      <td className="max-w-xs">
                        <Link to={`/tickets/${t.id}`} className="text-xs hover:underline line-clamp-1">
                          {t.subject}
                        </Link>
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td className="text-xs">{t.customer_name || t.name || '—'}</td>
                      <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(t.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

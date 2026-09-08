import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingBag, Ticket, Activity, Monitor } from 'lucide-react';
import { getCustomer, getCustomerOrders, getCustomerTickets, getCustomerActivity, getCustomerSessions } from '../../api/customers';
import { PageLoader } from '../../components/ui/Spinner';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { formatDate, formatDateTime, timeAgo, formatCurrency, truncate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activity, setActivity] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, oRes, tRes] = await Promise.all([
          getCustomer(id),
          getCustomerOrders(id),
          getCustomerTickets(id),
        ]);
        setCustomer(cRes.data.customer || cRes.data);
        setOrders(oRes.data.orders || []);
        setTickets(tRes.data.tickets || []);

        // Load activity and sessions (less critical)
        getCustomerActivity(id).then(r => setActivity(r.data.activity || [])).catch(() => {});
        if (can('view_sessions')) {
          getCustomerSessions(id).then(r => setSessions(r.data.sessions || [])).catch(() => {});
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!customer) return <div className="p-4">Customer not found.</div>;

  const c = customer;
  const totalSpend = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link to="/customers" className="btn btn-ghost btn-sm p-1.5"><ArrowLeft size={15} /></Link>
        <h1 className="text-lg font-semibold">Customer Profile</h1>
      </div>

      {/* Profile card */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
          >
            {(c.name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{c.name}</h2>
              <span className="badge bg-gray-100 text-gray-700 capitalize">{c.role}</span>
              {c.is_banned && <span className="badge bg-red-100 text-red-800">Banned</span>}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><Mail size={11} />{c.email}</span>
              {c.phone && <span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
              <span className="flex items-center gap-1"><Calendar size={11} />Joined {formatDate(c.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border)]">
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Orders</p>
            <p className="text-xl font-bold">{orders.length}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Spend</p>
            <p className="text-xl font-bold">{formatCurrency(totalSpend)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tickets</p>
            <p className="text-xl font-bold">{tickets.length}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Account</p>
            <p className="text-sm font-medium capitalize">{c.auth_provider || 'local'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] flex gap-0 overflow-x-auto">
        <Tab label="Orders" active={tab === 'orders'} onClick={() => setTab('orders')} />
        <Tab label="Support Tickets" active={tab === 'tickets'} onClick={() => setTab('tickets')} />
        <Tab label="Activity" active={tab === 'activity'} onClick={() => setTab('activity')} />
        {can('view_sessions') && <Tab label="Sessions" active={tab === 'sessions'} onClick={() => setTab('sessions')} />}
      </div>

      {/* Tab content */}
      {tab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="card p-8 text-center">
              <ShoppingBag size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No orders found.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/orders/${o.order_id}`} className="text-xs font-mono hover:underline" style={{ color: 'var(--accent)' }}>
                          {o.order_id}
                        </Link>
                      </td>
                      <td className="text-xs">{formatDate(o.created_at)}</td>
                      <td><span className="badge bg-blue-100 text-blue-800 capitalize">{o.status}</span></td>
                      <td><span className="badge bg-gray-100 text-gray-700 capitalize">{o.payment_status}</span></td>
                      <td className="text-xs font-medium">{formatCurrency(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'tickets' && (
        <div>
          {tickets.length === 0 ? (
            <div className="card p-8 text-center">
              <Ticket size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tickets found.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/tickets/${t.id}`} className="text-xs font-mono hover:underline" style={{ color: 'var(--accent)' }}>
                          {t.ticket_number || `#${t.id}`}
                        </Link>
                      </td>
                      <td className="text-xs">{truncate(t.subject, 50)}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="card p-4">
          {activity.length === 0 ? (
            <div className="py-8 text-center">
              <Activity size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity data available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-[var(--accent)]" />
                  <div>
                    <p>{a.action || a.description}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{formatDateTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div>
          {sessions.length === 0 ? (
            <div className="card p-8 text-center">
              <Monitor size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sessions found.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>Location</th>
                    <th>IP</th>
                    <th>Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td className="text-xs">{formatDateTime(s.logged_in_at)}</td>
                      <td className="text-xs">{s.device_model || s.device_type || '—'}</td>
                      <td className="text-xs">{s.browser}{s.browser_version ? ` ${s.browser_version}` : ''}</td>
                      <td className="text-xs">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="text-xs font-mono">{can('view_ip') ? s.ip_address : '••••••••'}</td>
                      <td className="text-xs capitalize">{s.auth_method || 'local'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

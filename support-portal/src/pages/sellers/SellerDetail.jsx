import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Store, Package, ShoppingBag, Ticket, Plus } from 'lucide-react';
import { getSeller, getSellerTickets, getSellerOrders, getSellerProducts } from '../../api/sellers';
import { PageLoader } from '../../components/ui/Spinner';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { formatDate, formatCurrency, timeAgo, truncate } from '../../lib/utils';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{label}</button>
  );
}

export default function SellerDetail() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const sRes = await getSeller(id);
        setSeller(sRes.data.seller || sRes.data);
        const [tRes, oRes, pRes] = await Promise.all([
          getSellerTickets(id),
          getSellerOrders(id),
          getSellerProducts(id),
        ]);
        setTickets(tRes.data.tickets || []);
        setOrders(oRes.data.orders || []);
        setProducts(pRes.data.products || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!seller) return <div className="p-4">Seller not found.</div>;

  const s = seller;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/sellers" className="btn btn-ghost btn-sm p-1.5"><ArrowLeft size={15} /></Link>
        <h1 className="text-lg font-semibold">{s.brand_name || s.user_name || 'Seller Profile'}</h1>
        <button className="btn btn-primary btn-sm ml-auto" onClick={() => setShowCreate(true)}>
          <Plus size={12} /> Create Ticket
        </button>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          {s.logo_url ? (
            <img src={s.logo_url} alt={s.brand_name} className="w-14 h-14 rounded-lg object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
              <Store size={24} style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-base font-semibold">{s.brand_name || s.user_name}</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.email} · {s.business_type}</p>
            <div className="flex gap-2 mt-2">
              <span className={`badge capitalize ${s.status === 'active' ? 'bg-green-100 text-green-800' : s.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{s.status}</span>
              <span className={`badge capitalize ${s.kyc_status === 'approved' ? 'bg-green-100 text-green-800' : s.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>KYC: {s.kyc_status}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border)]">
          {[
            { label: 'Products', value: s.total_products ?? 0 },
            { label: 'Orders', value: s.total_orders ?? 0 },
            { label: 'Revenue', value: formatCurrency(s.total_revenue) },
            { label: 'Tickets', value: tickets.length },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--border)] flex gap-0">
        <Tab label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
        <Tab label={`Tickets (${tickets.length})`} active={tab === 'tickets'} onClick={() => setTab('tickets')} />
        <Tab label="Orders" active={tab === 'orders'} onClick={() => setTab('orders')} />
        <Tab label="Products" active={tab === 'products'} onClick={() => setTab('products')} />
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4 space-y-2 text-xs">
            <h3 className="font-semibold mb-2">Business Details</h3>
            {[
              ['GST', s.gst_number || '—'],
              ['PAN', s.pan_number ? s.pan_number.slice(0, 3) + '•••••' + s.pan_number.slice(-2) : '—'],
              ['Bank', s.bank_name || '—'],
              ['Commission', `${s.commission_rate || 10}%`],
              ['Joined', formatDate(s.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <div className="card p-4 space-y-2 text-xs">
            <h3 className="font-semibold mb-2">Pickup Address</h3>
            <p>{s.pickup_address || '—'}</p>
            {s.pickup_city && <p>{s.pickup_city}, {s.pickup_state} – {s.pickup_pincode}</p>}
            {s.admin_notes && (
              <div className="mt-3 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                <p className="font-semibold mb-1">Admin Notes</p>
                <p>{s.admin_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'tickets' && (
        tickets.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tickets.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Ticket</th><th>Subject</th><th>Status</th><th>Priority</th><th>Created</th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td><Link to={`/tickets/${t.id}`} className="text-xs font-mono hover:underline" style={{ color: 'var(--accent)' }}>{t.ticket_number || `#${t.id}`}</Link></td>
                    <td className="text-xs">{truncate(t.subject, 50)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'orders' && (
        orders.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No orders.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Order</th><th>Status</th><th>Payout</th><th>Commission</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><Link to={`/orders/${o.order_id}`} className="text-xs font-mono hover:underline" style={{ color: 'var(--accent)' }}>{o.order_id}</Link></td>
                    <td><span className="badge bg-blue-100 text-blue-800 capitalize">{o.status}</span></td>
                    <td className="text-xs">{formatCurrency(o.seller_payout)}</td>
                    <td className="text-xs">{formatCurrency(o.commission_amount)}</td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'products' && (
        products.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No products.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Product</th><th>Status</th><th>Price</th><th>Submitted</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="text-xs">{truncate(p.title, 50)}</td>
                    <td><span className={`badge capitalize ${p.status === 'approved' ? 'bg-green-100 text-green-800' : p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span></td>
                    <td className="text-xs">{formatCurrency(p.price)}</td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(p.submitted_at || p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <CreateTicketModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => setShowCreate(false)}
      />
    </div>
  );
}

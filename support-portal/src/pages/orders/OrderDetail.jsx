import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, CreditCard, Ticket } from 'lucide-react';
import { getOrder, getOrderTickets } from '../../api/orders';
import { PageLoader } from '../../components/ui/Spinner';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { formatDate, formatDateTime, formatCurrency, timeAgo, truncate } from '../../lib/utils';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, tRes] = await Promise.all([getOrder(id), getOrderTickets(id)]);
        setOrder(oRes.data.order || oRes.data);
        setTickets(tRes.data.tickets || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!order) return <div className="p-4">Order not found.</div>;

  const o = order;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/orders" className="btn btn-ghost btn-sm p-1.5"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="text-lg font-semibold font-mono">{o.order_id}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Placed {formatDateTime(o.created_at)}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <span className="badge bg-blue-100 text-blue-800 capitalize">{o.status}</span>
          <span className={`badge capitalize ${o.payment_status === 'paid' ? 'bg-green-100 text-green-800' : o.payment_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{o.payment_status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order items */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            <Package size={12} className="inline mr-1" />Items
          </h3>
          <div className="space-y-3">
            {(o.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="w-10 h-10 object-cover rounded" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{truncate(item.title, 40)}</p>
                  <p style={{ color: 'var(--text-muted)' }}>Size: {item.size} × {item.quantity}</p>
                </div>
                <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] mt-3 pt-3 space-y-1 text-xs">
            <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span>{formatCurrency(o.subtotal)}</span></div>
            {o.discount_amount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{formatCurrency(o.discount_amount)}</span></div>}
            {o.delivery_charge > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Delivery</span><span>{formatCurrency(o.delivery_charge)}</span></div>}
            <div className="flex justify-between font-semibold pt-1 border-t border-[var(--border)]"><span>Total</span><span>{formatCurrency(o.total)}</span></div>
          </div>
        </div>

        {/* Shipping + Payment */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={12} className="inline mr-1" />Shipping Address
            </h3>
            <div className="text-xs space-y-0.5">
              <p className="font-medium">{o.full_name}</p>
              <p>{o.address}</p>
              <p>{o.city}, {o.state} – {o.pincode}</p>
              {o.landmark && <p style={{ color: 'var(--text-muted)' }}>Landmark: {o.landmark}</p>}
              <p>📞 {o.mobile}</p>
              <p>✉ {o.email}</p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              <CreditCard size={12} className="inline mr-1" />Payment
            </h3>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Method</span>
                <span className="capitalize">{o.payment_method || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className="capitalize">{o.payment_status}</span>
              </div>
              {o.coupon_code && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Coupon</span>
                  <span className="font-mono">{o.coupon_code}</span>
                </div>
              )}
              {/* Never show full payment credentials */}
              {o.razorpay_payment_id && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Razorpay Ref</span>
                  <span className="font-mono text-[10px]">{o.razorpay_payment_id.slice(0, 16)}…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related tickets */}
      {tickets.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            <Ticket size={12} className="inline mr-1" />Support Tickets
          </h3>
          <div className="space-y-2">
            {tickets.map(t => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center gap-3 text-xs hover:bg-[var(--surface-2)] p-2 rounded transition-colors">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <span>{truncate(t.subject, 60)}</span>
                <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.created_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

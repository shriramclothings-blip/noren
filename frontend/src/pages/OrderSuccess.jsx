import { useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { CheckCircle, Package, ArrowRight, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderSuccess() {
  const { state } = useLocation();
  const orderFromState = state?.order;
  const [order, setOrder] = useState(orderFromState || null);

  useEffect(() => {
    if (order) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      api.get(`/orders/${orderId}`).then(r => setOrder(r.data)).catch(() => {});
    }
  }, [order]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div
        className="scale-in"
        style={{ background: '#faf9f7', padding: '48px 40px', maxWidth: 460, width: '100%', textAlign: 'center', border: '1px solid #e6e0d8', boxShadow: '0 20px 60px rgba(26,26,24,0.1)' }}
      >
        {/* Success icon */}
        <div style={{ width: 64, height: 64, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={28} color="#c9a96e" strokeWidth={1.5} />
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 12 }}>Order Confirmed</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, fontWeight: 600, color: '#1a1a18', marginBottom: 8, letterSpacing: '-0.01em' }}>Thank You.</h1>
        <p style={{ color: '#9e9a94', fontSize: 14, marginBottom: 32, letterSpacing: '0.02em' }}>Your NOREN pieces are being prepared with care.</p>

        {order && (
          <div style={{ background: '#f5f0e8', padding: '20px', marginBottom: 28, textAlign: 'left', border: '1px solid #e6e0d8' }}>
            {[
              ['Order Reference', `#${order.order_id}`],
              ['Total', `${Number(order.total).toLocaleString('en-IN')}`],
              ['Payment', order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method],
              ['Status', order.status],
              ...(order.tracking_id ? [['Tracking ID', order.tracking_id]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: '#9e9a94', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ fontWeight: 600, color: label === 'Tracking ID' ? '#c9a96e' : '#1a1a18', textTransform: 'capitalize', fontFamily: label === 'Order Reference' ? "'Cormorant Garamond', Georgia, serif" : 'inherit', fontSize: label === 'Order Reference' ? 14 : 13 }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {order && (
            <Link to={`/track-order/${order.id}`} className="btn-primary"
              style={{ padding: '13px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Truck size={14} /> Track My Order
            </Link>
          )}
          <Link to="/orders" className="btn-outline"
            style={{ padding: '13px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Package size={14} /> View All Orders
          </Link>
          <Link to="/shop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9e9a94', textDecoration: 'none' }}>
            Continue Shopping <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

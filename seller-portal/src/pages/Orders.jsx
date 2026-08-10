import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import SellerLayout from '../components/SellerLayout';

const STATUS_COLORS = {
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  confirmed:  { bg: '#dbeafe', color: '#1d4ed8' },
  shipped:    { bg: '#ede9fe', color: '#6d28d9' },
  delivered:  { bg: '#dcfce7', color: '#15803d' },
  cancelled:  { bg: '#f3f4f6', color: '#6b7280' },
  refunded:   { bg: '#fee2e2', color: '#b91c1c' },
};

const btn = (bg = '#f3f4f6', color = '#374151') => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [expanded, setExpanded] = useState(null);
  const LIMIT = 20;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/seller/orders?page=${page}&limit=${LIMIT}`);
      setOrders(r.data.orders || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Orders</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{total} total orders from your products</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Loading…</div>
        ) : !orders.length ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
            <ShoppingCart size={40} color="#d1d5db" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>No orders yet</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Once customers buy your products, orders will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {orders.map(o => {
              const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
              const isOpen = expanded === o.id;
              return (
                <div key={o.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' }}
                    onClick={() => setExpanded(isOpen ? null : o.id)}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{o.order_id}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {o.full_name} · {new Date(o.order_date).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>₹{Number(o.line_total).toLocaleString('en-IN')}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>×{o.quantity} {o.title}</div>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{o.status}</span>
                    <span style={{ fontSize: 18, color: '#9ca3af' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 18px', background: '#fafafa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, fontSize: 13 }}>
                        {[
                          ['Size', o.size || '—'],
                          ['Quantity', o.quantity],
                          ['Unit Price', `₹${o.unit_price}`],
                          ['Commission', `₹${Number(o.commission_amount||0).toFixed(2)} (${o.commission_rate}%)`],
                          ['Your Payout', `₹${Number(o.seller_payout||0).toFixed(2)}`],
                          ['Order Status', o.order_status],
                          ['City', `${o.city}, ${o.state}`],
                          ['Pincode', o.pincode],
                        ].map(([k, v]) => (
                          <div key={k} style={{ background: '#fff', borderRadius: 8, padding: '9px 12px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                            <div style={{ fontWeight: 700, color: '#111827' }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btn()}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btn()}><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}

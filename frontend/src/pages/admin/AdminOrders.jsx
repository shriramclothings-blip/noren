import { useState, useEffect, useCallback } from 'react';
import { Search, Truck, X, ChevronDown, ChevronUp, MapPin, CreditCard, Package, User, Phone, Mail, Hash, Calendar, Tag, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

const STATUS_STYLE = {
  pending:    { bg: '#fef9c3', color: '#854d0e',  dot: '#f59e0b' },
  confirmed:  { bg: '#dbeafe', color: '#1e40af',  dot: '#3b82f6' },
  processing: { bg: '#f3e8ff', color: '#6b21a8',  dot: '#a855f7' },
  shipped:    { bg: '#e0e7ff', color: '#3730a3',  dot: '#6366f1' },
  delivered:  { bg: '#dcfce7', color: '#166534',  dot: '#22c55e' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b',  dot: '#ef4444' },
  refunded:   { bg: '#f3f4f6', color: '#374151',  dot: '#9ca3af' },
};

const PAY_STYLE = {
  paid:    { bg: '#dcfce7', color: '#166534' },
  pending: { bg: '#fef9c3', color: '#854d0e' },
  failed:  { bg: '#fee2e2', color: '#991b1b' },
  refunded:{ bg: '#f3f4f6', color: '#374151' },
};

const fmtDate  = (d) => new Date(d).toLocaleDateString('en-IN',  { day:'2-digit', month:'short', year:'numeric' });
const fmtTime  = (d) => new Date(d).toLocaleTimeString('en-IN',  { hour:'2-digit', minute:'2-digit' });
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ── Small reusable label ──────────────────────────────────────────────────────
function Badge({ label, bg, color }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'capitalize', letterSpacing: '0.03em' }}>
      {label}
    </span>
  );
}

// ── Info row inside the detail panel ─────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
      <Icon size={13} color="#c9a96e" style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ── Section heading inside detail ─────────────────────────────────────────────
function SectionHead({ title }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 4, marginTop: 4 }}>
      {title}
    </p>
  );
}

export default function AdminOrders() {
  const [orders, setOrders]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState(null);
  const [updating, setUpdating]   = useState(null);
  const [shipping, setShipping]   = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const LIMIT = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter) p.set('status', statusFilter);
      if (search.trim()) p.set('search', search.trim());
      const res = await api.get(`/admin/orders?${p}`);
      setOrders(res.data.orders || []);
      setTotal(res.data.total  || 0);
    } catch { toast.error('Failed to load orders'); }
    finally  { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      toast.success(`Marked as ${status}`);
      fetchOrders();
    } catch { toast.error('Failed to update status'); }
    finally { setUpdating(null); }
  };

  const shipOrder = async (id) => {
    if (!confirm('Create Delhivery shipment for this order?')) return;
    setShipping(id);
    try {
      const res = await api.post(`/shipments/${id}/ship`);
      toast.success(`Shipped! AWB: ${res.data.awb}`);
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to ship'); }
    finally { setShipping(null); }
  };

  const cancelOrder = async (id) => {
    const reason = prompt('Cancellation reason (optional):');
    if (reason === null) return;
    setCancelling(id);
    try {
      await api.post(`/shipments/${id}/admin-cancel`, { reason });
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
    finally { setCancelling(null); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order ID, name, phone, email..."
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 9, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', width: 280 }}
          />
        </div>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{total} total orders</span>
      </div>

      {/* ── Status pills ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['', ...STATUSES].map(s => {
          const st = STATUS_STYLE[s];
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatus(s)}
              style={{
                padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                textTransform: 'capitalize', transition: 'all 0.15s',
                background: active ? (st?.dot || '#c9a96e') : '#fff',
                color:      active ? '#fff' : '#6b7280',
                boxShadow:  active ? `0 2px 8px ${st?.dot || '#c9a96e'}55` : '0 0 0 1.5px #e5e7eb',
              }}>
              {s || 'All'}
            </button>
          );
        })}
      </div>

      {/* ── Orders list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)
          : orders.map(o => {
              const s  = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
              const ps = PAY_STYLE[o.payment_status] || PAY_STYLE.pending;
              const isOpen = expanded === o.id;
              const itemCount = o.items?.length || 0;

              return (
                <div key={o.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${isOpen ? '#e6e0d8' : '#f3f4f6'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                  {/* ── Collapsed header row ── */}
                  <div
                    style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}
                    onClick={() => setExpanded(isOpen ? null : o.id)}>

                    {/* Status dot */}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />

                    {/* Order ID + badges */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#111827' }}>#{o.order_id}</span>
                        <Badge label={o.status}         bg={s.bg}  color={s.color} />
                        <Badge label={o.payment_status} bg={ps.bg} color={ps.color} />
                        {o.payment_method && (
                          <Badge label={o.payment_method === 'cod' ? 'COD' : o.payment_method} bg="#f5f0e8" color="#5a5750" />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        <span>👤 {o.full_name}</span>
                        <span>📞 {o.mobile}</span>
                        <span>📦 {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Amount + date */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>{fmtMoney(o.total)}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{fmtDate(o.created_at)}</div>
                    </div>

                    {isOpen ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
                  </div>

                  {/* ── Expanded detail panel ── */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                      {/* Row: Customer + Payment side by side */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

                        {/* Customer Info */}
                        <div style={{ background: '#faf9f7', borderRadius: 12, padding: '14px 16px', border: '1px solid #f0ebe3' }}>
                          <SectionHead title="Customer Information" />
                          <InfoRow icon={User}     label="Full Name"  value={o.full_name} />
                          <InfoRow icon={Phone}    label="Mobile"     value={o.mobile} mono />
                          <InfoRow icon={Mail}     label="Email"      value={o.email} />
                          {o.user_name && o.user_name !== o.full_name && (
                            <InfoRow icon={User}   label="Account"    value={o.user_name} />
                          )}
                          {o.user_email && o.user_email !== o.email && (
                            <InfoRow icon={Mail}   label="Account Email" value={o.user_email} />
                          )}
                        </div>

                        {/* Payment Info */}
                        <div style={{ background: '#faf9f7', borderRadius: 12, padding: '14px 16px', border: '1px solid #f0ebe3' }}>
                          <SectionHead title="Payment Details" />
                          <InfoRow icon={CreditCard} label="Method"        value={o.payment_method === 'cod' ? 'Cash on Delivery (COD)' : o.payment_method} />
                          <InfoRow icon={CheckCircle} label="Pay Status"   value={o.payment_status?.toUpperCase()} />
                          <InfoRow icon={Hash}        label="Razorpay ID"  value={o.razorpay_payment_id} mono />
                          <InfoRow icon={Hash}        label="Razorpay Ord" value={o.razorpay_order_id}   mono />
                          <InfoRow icon={Hash}        label="Paytm TxnID"  value={o.paytm_txn_id}        mono />
                          <InfoRow icon={Hash}        label="Paytm Ord"    value={o.paytm_order_id}      mono />
                          <InfoRow icon={Tag}         label="Coupon"       value={o.coupon_code} />
                          {o.free_delivery_applied && (
                            <div style={{ fontSize: 12, color: '#166534', background: '#f0fdf4', borderRadius: 8, padding: '6px 10px', marginTop: 6 }}>🚚 Free delivery applied</div>
                          )}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div style={{ background: '#faf9f7', borderRadius: 12, padding: '14px 16px', border: '1px solid #f0ebe3' }}>
                        <SectionHead title="Delivery Address" />
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 6 }}>
                          <MapPin size={16} color="#c9a96e" style={{ flexShrink: 0, marginTop: 1 }} />
                          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{o.full_name}</div>
                            <div>{o.address}</div>
                            <div>{o.city}, {o.state} — {o.pincode}</div>
                            {o.landmark && <div style={{ color: '#9ca3af' }}>Near: {o.landmark}</div>}
                            <div style={{ marginTop: 4, color: '#6b7280' }}>📞 {o.mobile}</div>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div style={{ background: '#faf9f7', borderRadius: 12, border: '1px solid #f0ebe3', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0ebe3' }}>
                          <SectionHead title={`Order Items (${o.items?.length || 0})`} />
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#f5f0e8' }}>
                                {['Product', 'Size', 'Qty', 'Unit Price', 'Line Total'].map(h => (
                                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5a5750', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(o.items || []).map((item, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #f0ebe3' }}>
                                  <td style={{ padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      {item.image_url
                                        ? <img src={item.image_url} alt="" style={{ width: 40, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #e6e0d8' }} />
                                        : <div style={{ width: 40, height: 48, borderRadius: 6, background: '#e6e0d8', flexShrink: 0 }} />
                                      }
                                      <span style={{ fontWeight: 600, color: '#111827', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{item.size || '—'}</td>
                                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{item.quantity}</td>
                                  <td style={{ padding: '10px 14px', color: '#374151' }}>{fmtMoney(item.price)}</td>
                                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>{fmtMoney(item.price * item.quantity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                        <div style={{ background: '#faf9f7', borderRadius: 12, padding: '14px 16px', border: '1px solid #f0ebe3' }}>
                          <SectionHead title="Price Breakdown" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                            {[
                              { label: 'Subtotal',          value: fmtMoney(o.subtotal) },
                              { label: 'Discount',          value: o.discount_amount > 0 ? `-${fmtMoney(o.discount_amount)}` : '—', color: '#16a34a' },
                              { label: 'Delivery Charge',   value: o.delivery_charge > 0 ? fmtMoney(o.delivery_charge) : 'FREE 🚚', color: '#16a34a' },
                              { label: 'Total Paid',        value: fmtMoney(o.total), bold: true },
                            ].map(row => (
                              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: row.bold ? 14 : 13, borderTop: row.bold ? '1px solid #e6e0d8' : 'none', paddingTop: row.bold ? 8 : 0, marginTop: row.bold ? 4 : 0 }}>
                                <span style={{ color: '#6b7280' }}>{row.label}</span>
                                <span style={{ fontWeight: row.bold ? 800 : 600, color: row.color || '#111827' }}>{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipment Info */}
                        <div style={{ background: '#faf9f7', borderRadius: 12, padding: '14px 16px', border: '1px solid #f0ebe3' }}>
                          <SectionHead title="Shipment & Timeline" />
                          <InfoRow icon={Hash}      label="AWB / Tracking"  value={o.tracking_id}      mono />
                          <InfoRow icon={Truck}     label="Courier"          value={o.courier_name} />
                          <InfoRow icon={Package}   label="Ship Status"      value={o.shipment_status} />
                          <InfoRow icon={Calendar}  label="Ordered At"       value={o.created_at ? `${fmtDate(o.created_at)} ${fmtTime(o.created_at)}` : null} />
                          <InfoRow icon={Clock}     label="Shipped At"       value={o.shipped_at   ? `${fmtDate(o.shipped_at)} ${fmtTime(o.shipped_at)}` : null} />
                          <InfoRow icon={CheckCircle} label="Delivered At"   value={o.delivered_at ? `${fmtDate(o.delivered_at)} ${fmtTime(o.delivered_at)}` : null} />
                          <InfoRow icon={Calendar}  label="Est. Delivery"    value={o.estimated_delivery ? fmtDate(o.estimated_delivery) : null} />
                          {o.notes && <InfoRow icon={Tag} label="Order Notes" value={o.notes} />}
                          {o.rejection_reason && (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b', background: '#fee2e2', borderRadius: 8, padding: '6px 10px' }}>
                              ✗ {o.rejection_reason}
                            </div>
                          )}
                          {o.cancellation_reason && (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b', background: '#fee2e2', borderRadius: 8, padding: '6px 10px' }}>
                              Cancelled: {o.cancellation_reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Actions bar ── */}
                      <div style={{ background: '#f5f0e8', borderRadius: 12, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>

                        {/* Ship Now */}
                        {!o.tracking_id && !['cancelled','delivered','refunded'].includes(o.status) && (
                          <button onClick={() => shipOrder(o.id)} disabled={shipping === o.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#c9a96e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: shipping === o.id ? 'not-allowed' : 'pointer', opacity: shipping === o.id ? 0.7 : 1 }}>
                            <Truck size={14} /> {shipping === o.id ? 'Creating...' : 'Ship via Delhivery'}
                          </button>
                        )}

                        {/* Cancel Order */}
                        {!['cancelled','delivered','refunded'].includes(o.status) && (
                          <button onClick={() => cancelOrder(o.id)} disabled={cancelling === o.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: '1.5px solid #ef4444', background: '#fff', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: cancelling === o.id ? 0.6 : 1 }}>
                            <X size={14} /> {cancelling === o.id ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        )}

                        {/* Refresh */}
                        <button onClick={fetchOrders}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e6e0d8', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                          <RefreshCw size={13} /> Refresh
                        </button>
                      </div>

                      {/* ── Status update buttons ── */}
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>Update Order Status</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {STATUSES.filter(st => st !== o.status).map(st => {
                            const style = STATUS_STYLE[st];
                            return (
                              <button key={st} onClick={() => updateStatus(o.id, st)} disabled={updating === o.id}
                                style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, border: `1.5px solid ${style?.dot || '#e5e7eb'}`, background: '#fff', color: style?.color || '#374151', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s', opacity: updating === o.id ? 0.5 : 1 }}
                                onMouseEnter={e => { e.currentTarget.style.background = style?.bg || '#f9fafb'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
          })
        }

        {!loading && !orders.length && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 64, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            {search || statusFilter ? `No orders match your filters.` : `No orders yet.`}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#9ca3af' }}>{total} orders</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>
              ← Prev
            </button>
            <span style={{ padding: '6px 12px', color: '#6b7280', background: '#f9fafb', borderRadius: 9, fontWeight: 600 }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

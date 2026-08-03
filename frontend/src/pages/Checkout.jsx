import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [freeDelivery, setFreeDelivery] = useState(null);
  const [paySettings, setPaySettings] = useState(null); // loaded from admin
  const [addrForm, setAddrForm] = useState({ full_name: user?.name || '', mobile: user?.phone || '', address: '', city: '', state: '', pincode: '', landmark: '', is_default: false });

  useEffect(() => {
    if (!state?.items?.length) { navigate('/cart'); return; }
    api.get('/users/addresses').then(r => {
      setAddresses(r.data);
      const def = r.data.find(a => a.is_default) || r.data[0];
      if (def) setSelectedAddr(def);
    }).catch(() => {});
    api.get('/users/free-delivery')
      .then(r => setFreeDelivery(r.data))
      .catch(() => setFreeDelivery({ eligible: false }));
    // Load payment settings from admin
    api.get('/homepage/settings')
      .then(r => setPaySettings(r.data))
      .catch(() => setPaySettings({}));
  }, [state, navigate]);

  // Derive payment options from settings
  const codEnabled      = !paySettings || paySettings.payment_cod_enabled      !== 'false';
  const paytmEnabled    = !paySettings || paySettings.payment_paytm_enabled     !== 'false';
  const razorpayEnabled = paySettings?.payment_razorpay_enabled === 'true';
  const freeThreshold   = Number(paySettings?.shipping_free_threshold ?? 999);
  const standardCost    = Number(paySettings?.shipping_standard_cost  ?? 99);
  const alwaysFree      = paySettings?.shipping_free_always === 'true';
  const codExtraCharge  = Number(paySettings?.cod_extra_charge ?? 0);
  const codExtraLabel   = paySettings?.cod_extra_label || 'COD handling fee';
  const minOrderAmt     = Number(paySettings?.min_order_amount ?? 0);
  const codNote         = paySettings?.checkout_cod_note    || 'Pay when your order is delivered.';
  const onlineNote      = paySettings?.checkout_online_note || 'Secure online payment.';

  // Auto-select first enabled payment method
  useEffect(() => {
    if (!paySettings) return;
    if (!codEnabled && paytmEnabled) setPaymentMethod('paytm');
    else if (!codEnabled && razorpayEnabled) setPaymentMethod('razorpay');
    else setPaymentMethod('cod');
  }, [paySettings]);

  const baseTotal = Number.isFinite(state?.total)
    ? state.total
    : Number.isFinite(state?.finalTotal) ? state.finalTotal : 0;

  const isFreeDelivery = alwaysFree || freeDelivery?.eligible || baseTotal >= freeThreshold;
  const shippingCost = isFreeDelivery ? 0 : standardCost;
  const codCharge = paymentMethod === 'cod' ? codExtraCharge : 0;
  const finalTotal = baseTotal + shippingCost + codCharge;

  const saveAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users/addresses', addrForm);
      setAddresses(prev => [...prev, res.data]);
      setSelectedAddr(res.data);
      setShowAddrForm(false);
      toast.success('Address saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const buildOrderPayload = () => state.items.map(item => ({
    product_id: item.product_id,
    variant_id: item.variant_id,
    title: item.title,
    size: item.size,
    price: item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price,
    quantity: item.quantity,
    image_url: item.image_url,
  }));

  const handlePayment = async () => {
    if (!selectedAddr) return toast.error('Please select a delivery address');
    setPlacing(true);

    const payload = {
      items: buildOrderPayload(),
      subtotal: state.subtotal,
      discount_amount: state.discount,
      total: finalTotal,
      delivery_charge: shippingCost,
      free_delivery_applied: isFreeDelivery,
      coupon_code: state.coupon_code,
      ...selectedAddr,
      email: user.email,
      payment_method: 'cod',
    };

    try {
      const res = await api.post('/orders', payload);
      navigate('/order-success', { state: { order: res.data.order } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order placement failed');
    } finally {
      setPlacing(false);
    }
  };

  const handlePaytm = async () => {
    if (!selectedAddr) return toast.error('Please select a delivery address');
    setPlacing(true);

    try {
      const payload = {
        items: buildOrderPayload(),
        subtotal: state.subtotal,
        discount_amount: state.discount,
        total: finalTotal,
        delivery_charge: shippingCost,
        free_delivery_applied: isFreeDelivery,
        coupon_code: state.coupon_code,
        ...selectedAddr,
        email: user.email,
      };

      const res = await api.post('/orders/paytm/initiate', payload);
      const paytmUrl = res.data.paytmUrl;
      const params = res.data.params || {};

      if (!paytmUrl || !Object.keys(params).length) {
        throw new Error('Invalid Paytm response');
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paytmUrl;
      form.style.display = 'none';
      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Paytm payment initiation failed');
      setPlacing(false);
    }
  };

  if (!state?.items?.length) return null;

  const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 0 60px' }}>
      <div className="wrap">
        <div style={{ marginBottom: 28 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#111827' }}>Checkout</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Complete your order</p>
        </div>

        <div className="checkout-grid">
          <div className="checkout-main">
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={15} color="#c9a96e" /> Delivery Address
                </p>
                <button
                  onClick={() => setShowAddrForm((s) => !s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#c9a96e', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showAddrForm ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <X size={13} /> Cancel
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={13} /> Add New
                    </span>
                  )}
                </button>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {showAddrForm && (
                  <form onSubmit={saveAddress} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 16, marginBottom: 4 }}>
                    <div className="form-grid-2">
                      {[
                        ['full_name', 'Full Name', true],
                        ['mobile', 'Mobile Number', true],
                        ['address', 'Street Address', true],
                        ['city', 'City', true],
                        ['state', 'State', true],
                        ['pincode', 'Pincode', true],
                        ['landmark', 'Landmark (Optional)', false],
                      ].map(([field, label, required]) => (
                        <div key={field} className={field === 'full_name' || field === 'address' || field === 'landmark' ? 'col-span-2' : ''}>
                          <input
                            required={required}
                            value={addrForm[field] || ''}
                            onChange={(e) => setAddrForm((p) => ({ ...p, [field]: e.target.value }))}
                            placeholder={label}
                            style={inp}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button type="submit" className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>Save Address</button>
                      <button type="button" onClick={() => setShowAddrForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>Cancel</button>
                    </div>
                  </form>
                )}

                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: 16,
                      borderRadius: 12,
                      border: `2px solid ${selectedAddr?.id === addr.id ? '#111827' : '#f3f4f6'}`,
                      cursor: 'pointer',
                      background: selectedAddr?.id === addr.id ? '#f9fafb' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddr?.id === addr.id}
                      onChange={() => setSelectedAddr(addr)}
                      style={{ marginTop: 2, accentColor: '#c9a96e', flexShrink: 0 }}
                    />
                    <div style={{ fontSize: 13, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: '#111827' }}>
                        {addr.full_name} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· {addr.mobile}</span>
                      </p>
                      <p style={{ color: '#6b7280', marginTop: 3, fontSize: 12, lineHeight: 1.5 }}>
                        {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      {addr.landmark ? <p style={{ color: '#9ca3af', fontSize: 12 }}>Near: {addr.landmark}</p> : null}
                      {addr.is_default ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#c9a96e', background: '#fff7ed', padding: '2px 7px', borderRadius: 10, display: 'inline-block', marginTop: 4 }}>
                          Default
                        </span>
                      ) : null}
                    </div>
                  </label>
                ))}

                {!addresses.length && !showAddrForm ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                    <MapPin size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p style={{ fontSize: 13 }}>No saved addresses. Add one above.</p>
                  </div>
                ) : null}

                <div style={{ marginTop: 12, padding: 16, borderRadius: 16, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Payment Method</div>

                  {/* Minimum order warning */}
                  {minOrderAmt > 0 && baseTotal < minOrderAmt && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                      ⚡ Minimum order amount is ₹{minOrderAmt}. Add ₹{minOrderAmt - baseTotal} more to checkout.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {codEnabled && (
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderRadius: 10, border: `2px solid ${paymentMethod === 'cod' ? '#111827' : '#e5e7eb'}`, background: paymentMethod === 'cod' ? '#f9fafb' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ accentColor: '#c9a96e', marginTop: 2 }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Cash on Delivery</span>
                            {codExtraCharge > 0 && (
                              <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: 100, fontWeight: 600 }}>
                                +₹{codExtraCharge} {codExtraLabel}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{codNote}</p>
                        </div>
                      </label>
                    )}

                    {paytmEnabled && (
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderRadius: 10, border: `2px solid ${paymentMethod === 'paytm' ? '#111827' : '#e5e7eb'}`, background: paymentMethod === 'paytm' ? '#f9fafb' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <input type="radio" name="payment" value="paytm" checked={paymentMethod === 'paytm'} onChange={() => setPaymentMethod('paytm')} style={{ accentColor: '#c9a96e', marginTop: 2 }} />
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Online Payment — Paytm</span>
                          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{onlineNote}</p>
                        </div>
                      </label>
                    )}

                    {razorpayEnabled && (
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderRadius: 10, border: `2px solid ${paymentMethod === 'razorpay' ? '#111827' : '#e5e7eb'}`, background: paymentMethod === 'razorpay' ? '#f9fafb' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} style={{ accentColor: '#c9a96e', marginTop: 2 }} />
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Online Payment — Razorpay</span>
                          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{onlineNote}</p>
                        </div>
                      </label>
                    )}

                    {!codEnabled && !paytmEnabled && !razorpayEnabled && (
                      <div style={{ padding: 12, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                        No payment methods available. Please contact support.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Order Summary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {state.items.map((item, i) => {
                  const price = item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10 }}>
                      <img src={item.image_url || 'https://placehold.co/48x56/f5f5f5/999?text=IMG'} alt="" style={{ width: 44, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#f9fafb' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{item.title}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Size: {item.size} · Qty: {item.quantity}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 2 }}>₹{price * item.quantity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>₹{state.subtotal}</span>
                </div>

                {state.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Discount</span>
                    <span style={{ fontWeight: 600 }}>-₹{state.discount}</span>
                  </div>
                )}

                {/* Free delivery badge */}
                {(freeDelivery?.eligible || alwaysFree) && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🎉 <strong>Free Delivery Applied!</strong>
                    {freeDelivery?.expiry && <span style={{ color: '#9ca3af', marginLeft: 4 }}>Valid till {new Date(freeDelivery.expiry).toLocaleDateString('en-IN')}</span>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>Shipping</span>
                  <span style={{ fontWeight: 600, color: isFreeDelivery ? '#16a34a' : '#111827' }}>
                    {isFreeDelivery ? 'FREE 🚚' : `₹${standardCost}`}
                  </span>
                </div>

                {!isFreeDelivery && !alwaysFree && baseTotal < freeThreshold && (
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>
                    Add ₹{freeThreshold - baseTotal} more for free shipping
                  </p>
                )}

                {codCharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                    <span>{codExtraLabel}</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>₹{codCharge}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: '#111827', borderTop: '1px solid #f3f4f6', paddingTop: 10, marginTop: 4 }}>
                  <span>Total</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>
            </div>

            <button
              onClick={paymentMethod === 'paytm' ? handlePaytm : handlePayment}
              disabled={placing || !selectedAddr || (minOrderAmt > 0 && baseTotal < minOrderAmt) || (!codEnabled && !paytmEnabled && !razorpayEnabled)}
              className="btn-orange"
              style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (placing || !selectedAddr || (minOrderAmt > 0 && baseTotal < minOrderAmt)) ? 0.5 : 1 }}>
              {placing ? 'Processing...'
                : paymentMethod === 'paytm' ? '💳 Pay with Paytm'
                : paymentMethod === 'razorpay' ? '💳 Pay with Razorpay'
                : '📦 Place Order (COD)'}
            </button>

            <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
              {paymentMethod === 'paytm' || paymentMethod === 'razorpay'
                ? onlineNote
                : codNote}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

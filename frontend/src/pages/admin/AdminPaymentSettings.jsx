import { useState, useEffect } from 'react';
import { Save, CreditCard, Truck, BadgePercent, ShieldCheck, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '10px 13px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 9, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
  boxSizing: 'border-box',
};

const defaultSettings = {
  // Payment methods
  payment_cod_enabled: 'true',
  payment_paytm_enabled: 'true',
  payment_razorpay_enabled: 'false',
  // Shipping
  shipping_free_threshold: '999',
  shipping_standard_cost: '99',
  shipping_free_always: 'false',
  // COD extra charge
  cod_extra_charge: '0',
  cod_extra_label: 'COD handling fee',
  // Checkout messages
  checkout_cod_note: 'Pay when your order is delivered.',
  checkout_online_note: 'Secure online payment via Paytm.',
  // Minimum order
  min_order_amount: '0',
};

function Toggle({ value, onChange, label, description }) {
  const on = value === 'true' || value === true;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: '#9ca3af' }}>{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(on ? 'false' : 'true')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: on ? '#22c55e' : '#d1d5db', flexShrink: 0, display: 'flex' }}>
        {on ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
      </button>
    </div>
  );
}

function Card({ icon: Icon, title, color = '#c9a96e', children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</span>
      </div>
      <div style={{ padding: '4px 20px 16px' }}>{children}</div>
    </div>
  );
}

export default function AdminPaymentSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/homepage/settings')
      .then(r => {
        const merged = { ...defaultSettings };
        Object.entries(r.data || {}).forEach(([k, v]) => {
          if (k in defaultSettings) merged[k] = v;
        });
        setSettings(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/homepage/admin/settings', settings);
      toast.success('Payment settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#c9a96e' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 740, display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Checkout & Payment Settings</h2>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Control which payment methods and shipping options appear at checkout</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#faf9f7', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#c9a96e'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Payment Methods */}
      <Card icon={CreditCard} title="Payment Methods" color="#6366f1">
        <Toggle
          value={settings.payment_cod_enabled}
          onChange={v => set('payment_cod_enabled', v)}
          label="Cash on Delivery (COD)"
          description="Allow customers to pay when the order is delivered"
        />
        <Toggle
          value={settings.payment_paytm_enabled}
          onChange={v => set('payment_paytm_enabled', v)}
          label="Paytm Online Payment"
          description="Allow customers to pay online via Paytm gateway"
        />
        <Toggle
          value={settings.payment_razorpay_enabled}
          onChange={v => set('payment_razorpay_enabled', v)}
          label="Razorpay Online Payment"
          description="Allow customers to pay online via Razorpay gateway"
        />

        {/* COD extra charge */}
        {(settings.payment_cod_enabled === 'true') && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>COD Extra Charge (₹)</label>
              <input type="number" min="0" value={settings.cod_extra_charge} onChange={e => set('cod_extra_charge', e.target.value)} style={inp} placeholder="0" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>COD Charge Label</label>
              <input type="text" value={settings.cod_extra_label} onChange={e => set('cod_extra_label', e.target.value)} style={inp} placeholder="COD handling fee" />
            </div>
          </div>
        )}
      </Card>

      {/* Shipping */}
      <Card icon={Truck} title="Shipping & Delivery" color="#0ea5e9">
        <Toggle
          value={settings.shipping_free_always}
          onChange={v => set('shipping_free_always', v)}
          label="Always Free Shipping"
          description="Override threshold — make shipping free for all orders"
        />
        {settings.shipping_free_always !== 'true' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Free Shipping Above (₹)</label>
              <input type="number" min="0" value={settings.shipping_free_threshold} onChange={e => set('shipping_free_threshold', e.target.value)} style={inp} placeholder="999" />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Orders above this amount get free shipping</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Standard Shipping Cost (₹)</label>
              <input type="number" min="0" value={settings.shipping_standard_cost} onChange={e => set('shipping_standard_cost', e.target.value)} style={inp} placeholder="99" />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Charged when order is below free shipping threshold</p>
            </div>
          </div>
        )}
      </Card>

      {/* Order restrictions */}
      <Card icon={BadgePercent} title="Order Restrictions" color="#f59e0b">
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Minimum Order Amount (₹)</label>
          <input type="number" min="0" value={settings.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} style={{ ...inp, maxWidth: 220 }} placeholder="0" />
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Set 0 to allow all order amounts</p>
        </div>
      </Card>

      {/* Checkout notes */}
      <Card icon={ShieldCheck} title="Checkout Messages" color="#10b981">
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>COD Note (shown at checkout)</label>
            <input type="text" value={settings.checkout_cod_note} onChange={e => set('checkout_cod_note', e.target.value)} style={inp} placeholder="Pay when your order is delivered." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Online Payment Note (shown at checkout)</label>
            <input type="text" value={settings.checkout_online_note} onChange={e => set('checkout_online_note', e.target.value)} style={inp} placeholder="Secure online payment via Paytm." />
          </div>
        </div>
      </Card>

      {/* Live Preview */}
      <div style={{ background: '#f9fafb', border: '1.5px dashed #e5e7eb', borderRadius: 14, padding: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Live Preview — Checkout Payment Section</p>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Payment method</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {settings.payment_cod_enabled === 'true' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #c9a96e', background: '#c9a96e', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>Cash on Delivery</span>
                  {Number(settings.cod_extra_charge) > 0 && (
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>+₹{settings.cod_extra_charge} {settings.cod_extra_label}</span>
                  )}
                </div>
              </label>
            )}
            {settings.payment_paytm_enabled === 'true' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #e5e7eb', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#111827' }}>Online Payment — Paytm</span>
              </label>
            )}
            {settings.payment_razorpay_enabled === 'true' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #e5e7eb', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#111827' }}>Online Payment — Razorpay</span>
              </label>
            )}
            {settings.payment_cod_enabled !== 'true' && settings.payment_paytm_enabled !== 'true' && settings.payment_razorpay_enabled !== 'true' && (
              <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>⚠ No payment methods enabled — customers cannot checkout!</p>
            )}
          </div>
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
            {settings.shipping_free_always === 'true'
              ? '🚚 Free shipping on all orders'
              : `🚚 Free shipping on orders above ₹${settings.shipping_free_threshold} · ₹${settings.shipping_standard_cost} otherwise`}
          </div>
          {Number(settings.min_order_amount) > 0 && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fefce8', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              ⚡ Minimum order amount: ₹{settings.min_order_amount}
            </div>
          )}
        </div>
      </div>

      {/* Bottom save */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#faf9f7', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#c9a96e'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

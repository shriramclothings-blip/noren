import { useState, useEffect } from 'react';
import {
  Settings, Percent, FileText, Palette, Zap,
  Bell, ShoppingCart, Truck, Save, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' };
const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const row3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };

const SECTIONS = [
  { key: 'tax',           label: 'Tax & GST',            icon: Percent,      color: '#6366f1' },
  { key: 'invoice',       label: 'Invoice & Receipt',    icon: FileText,     color: '#0ea5e9' },
  { key: 'theme',         label: 'Storefront Theme',     icon: Palette,      color: '#c9a96e' },
  { key: 'features',      label: 'Feature Flags',        icon: Zap,          color: '#10b981' },
  { key: 'notifications', label: 'Notifications',        icon: Bell,         color: '#f59e0b' },
  { key: 'checkout',      label: 'Checkout & Orders',    icon: ShoppingCart, color: '#ef4444' },
  { key: 'shipping',      label: 'Shipping & Delivery',  icon: Truck,        color: '#8b5cf6' },
];

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0 0' }}>{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
          background: value ? '#22c55e' : '#d1d5db', position: 'relative', transition: 'background 0.2s',
        }}
        aria-label={label}
        aria-checked={value}
        role="switch"
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ sectionKey, label, icon: Icon, color, config, onChange, saving, onSave }) {
  const [open, setOpen] = useState(false);

  const set = (key, val) => onChange(sectionKey, key, val);

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', border: 'none', background: '#fafafa', cursor: 'pointer', borderBottom: open ? '1px solid #f3f4f6' : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color={color} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{label}</span>
        </div>
        {open ? <ChevronDown size={16} color="#9ca3af" /> : <ChevronRight size={16} color="#9ca3af" />}
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '16px 20px 20px' }}>
          {/* ── TAX ── */}
          {sectionKey === 'tax' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Toggle value={config.gst_enabled} onChange={v => set('gst_enabled', v)} label="GST Enabled" description="Collect GST on all sales" />
              <Toggle value={config.tax_inclusive_pricing} onChange={v => set('tax_inclusive_pricing', v)} label="Tax-Inclusive Pricing" description="Prices shown include tax (MRP-style)" />
              <Toggle value={config.hsn_mandatory} onChange={v => set('hsn_mandatory', v)} label="HSN Code Mandatory" description="Require HSN code on all inventory items" />
              <div style={{ ...row2, marginTop: 14 }}>
                <div>
                  <label style={lbl}>Default GST Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={config.default_gst_rate ?? 0} onChange={e => set('default_gst_rate', parseFloat(e.target.value) || 0)} style={inp} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Applied when item has no specific GST rate</p>
                </div>
              </div>
            </div>
          )}

          {/* ── INVOICE ── */}
          {sectionKey === 'invoice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={row2}>
                <div>
                  <label style={lbl}>Invoice Prefix</label>
                  <input value={config.prefix || ''} onChange={e => set('prefix', e.target.value)} placeholder="INV" style={inp} />
                </div>
              </div>
              <Toggle value={config.show_logo} onChange={v => set('show_logo', v)} label="Show Logo on Invoice" />
              <Toggle value={config.show_gst} onChange={v => set('show_gst', v)} label="Show GST Breakdown" />
              <Toggle value={config.show_signature_line} onChange={v => set('show_signature_line', v)} label="Show Signature Line" />
              <div>
                <label style={lbl}>Invoice Footer Note</label>
                <textarea value={config.footer_note || ''} onChange={e => set('footer_note', e.target.value)} rows={2} placeholder="Thank you for your business!" style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div>
                <label style={lbl}>Terms & Conditions</label>
                <textarea value={config.terms_and_conditions || ''} onChange={e => set('terms_and_conditions', e.target.value)} rows={3} placeholder="Goods once sold will not be taken back..." style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div>
                <label style={lbl}>Bank Details (for B2B invoices)</label>
                <textarea value={config.bank_details || ''} onChange={e => set('bank_details', e.target.value)} rows={2} placeholder="Bank: HDFC · A/C: 12345678 · IFSC: HDFC0001234" style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* ── THEME ── */}
          {sectionKey === 'theme' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={row3}>
                <div>
                  <label style={lbl}>Primary Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={config.primary_color || '#c9a96e'} onChange={e => set('primary_color', e.target.value)} style={{ width: 40, height: 36, border: '1.5px solid #e5e7eb', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                    <input value={config.primary_color || '#c9a96e'} onChange={e => set('primary_color', e.target.value)} style={{ ...inp, flex: 1 }} placeholder="#c9a96e" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Accent Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={config.accent_color || '#1a1a18'} onChange={e => set('accent_color', e.target.value)} style={{ width: 40, height: 36, border: '1.5px solid #e5e7eb', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                    <input value={config.accent_color || '#1a1a18'} onChange={e => set('accent_color', e.target.value)} style={{ ...inp, flex: 1 }} placeholder="#1a1a18" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Font Family</label>
                  <select value={config.font || 'Inter'} onChange={e => set('font', e.target.value)} style={inp}>
                    {['Inter', 'Poppins', 'Roboto', 'Lato', 'Montserrat', 'Nunito', 'Open Sans'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={row2}>
                <div>
                  <label style={lbl}>Logo URL</label>
                  <input value={config.logo_url || ''} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Favicon URL</label>
                  <input value={config.favicon_url || ''} onChange={e => set('favicon_url', e.target.value)} placeholder="https://..." style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Store Mode</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['b2c', 'b2b', 'hybrid'].map(mode => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                      <input type="radio" name="store_mode" value={mode} checked={config.store_mode === mode} onChange={() => set('store_mode', mode)} />
                      {mode.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FEATURES ── */}
          {sectionKey === 'features' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['loyalty_enabled',        'Loyalty Points',          'Earn & redeem loyalty points at checkout'],
                ['reviews_enabled',        'Product Reviews',         'Allow customers to leave product reviews'],
                ['wishlist_enabled',       'Wishlist',                'Let customers save items to a wishlist'],
                ['coupons_enabled',        'Coupons & Discounts',     'Apply coupon codes at checkout'],
                ['pos_enabled',            'Point of Sale (POS)',     'In-store billing and POS terminal'],
                ['online_store_enabled',   'Online Storefront',       'Public-facing e-commerce store'],
                ['multi_store_enabled',    'Multi-Store Mode',        'Manage multiple store branches'],
                ['inventory_alerts',       'Inventory Low-Stock Alerts', 'Email alerts when stock hits reorder level'],
                ['whatsapp_notifications', 'WhatsApp Notifications',  'Send order updates via WhatsApp'],
              ].map(([key, label, desc]) => (
                <Toggle key={key} value={config[key]} onChange={v => set(key, v)} label={label} description={desc} />
              ))}
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {sectionKey === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Toggle value={config.order_email} onChange={v => set('order_email', v)} label="Order Confirmation Email" description="Send email to customer on new order" />
              <Toggle value={config.order_sms} onChange={v => set('order_sms', v)} label="Order SMS" description="Send SMS alerts (requires SMS integration)" />
              <Toggle value={config.order_whatsapp} onChange={v => set('order_whatsapp', v)} label="Order WhatsApp" description="Send WhatsApp messages on orders" />
              <Toggle value={config.low_stock_email} onChange={v => set('low_stock_email', v)} label="Low Stock Email Alert" />
              <div style={{ ...row2, marginTop: 14 }}>
                <div>
                  <label style={lbl}>Low Stock Threshold (units)</label>
                  <input type="number" min="0" value={config.low_stock_threshold ?? 5} onChange={e => set('low_stock_threshold', parseInt(e.target.value) || 0)} style={inp} />
                </div>
              </div>
            </div>
          )}

          {/* ── CHECKOUT ── */}
          {sectionKey === 'checkout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Toggle value={config.require_phone} onChange={v => set('require_phone', v)} label="Require Phone at Checkout" />
              <Toggle value={config.require_email} onChange={v => set('require_email', v)} label="Require Email at Checkout" />
              <Toggle value={config.allow_guest_checkout} onChange={v => set('allow_guest_checkout', v)} label="Allow Guest Checkout" description="Let unregistered users place orders" />
              <Toggle value={config.cod_enabled} onChange={v => set('cod_enabled', v)} label="Cash on Delivery (COD)" />
              <div style={{ ...row2, marginTop: 14 }}>
                <div>
                  <label style={lbl}>Minimum Order Amount (₹)</label>
                  <input type="number" min="0" value={config.min_order_amount ?? 0} onChange={e => set('min_order_amount', parseFloat(e.target.value) || 0)} style={inp} placeholder="0 = no minimum" />
                </div>
                <div>
                  <label style={lbl}>Max COD Amount (₹)</label>
                  <input type="number" min="0" value={config.max_cod_amount ?? 0} onChange={e => set('max_cod_amount', parseFloat(e.target.value) || 0)} style={inp} placeholder="0 = no limit" />
                </div>
              </div>
            </div>
          )}

          {/* ── SHIPPING ── */}
          {sectionKey === 'shipping' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Toggle value={config.free_always} onChange={v => set('free_always', v)} label="Always Free Shipping" description="Override threshold — free shipping on all orders" />
              {!config.free_always && (
                <div style={{ ...row2, marginTop: 14 }}>
                  <div>
                    <label style={lbl}>Free Shipping Above (₹)</label>
                    <input type="number" min="0" value={config.free_above ?? 999} onChange={e => set('free_above', parseFloat(e.target.value) || 0)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Standard Shipping Cost (₹)</label>
                    <input type="number" min="0" value={config.standard_cost ?? 99} onChange={e => set('standard_cost', parseFloat(e.target.value) || 0)} style={inp} />
                  </div>
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <label style={lbl}>Carrier / Partner</label>
                <input value={config.carrier || ''} onChange={e => set('carrier', e.target.value)} placeholder="e.g. Delhivery, Shiprocket, Self-ship" style={{ ...inp, maxWidth: 320 }} />
              </div>
            </div>
          )}

          {/* Section save button */}
          <button
            type="button"
            onClick={() => onSave(sectionKey)}
            disabled={saving}
            style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 9, border: 'none', background: color, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            <Save size={13} /> {saving ? 'Saving…' : `Save ${label}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BusinessConfigSettings() {
  const [config, setConfig]   = useState(null);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/business-config');
      setConfig(res.data.config);
      setMeta({ name: res.data.name, currency: res.data.currency, gst_number: res.data.gst_number });
    } catch {
      toast.error('Failed to load business configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Update a single key within a section
  const handleChange = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  // Save only the changed section
  const handleSave = async (section) => {
    setSaving(true);
    try {
      await api.put('/erp/business-config', { [section]: config[section] });
      toast.success(`${SECTIONS.find(s => s.key === section)?.label} saved`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        Could not load configuration.{' '}
        <button onClick={load} style={{ color: '#c9a96e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={18} color="#6b7280" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Business Configuration</h2>
            {meta && (
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0 0' }}>
                {meta.name} · {meta.currency} {meta.gst_number ? `· GST: ${meta.gst_number}` : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={load}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}
        >
          <RefreshCw size={13} /> Reload
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1d4ed8', marginBottom: 20 }}>
        Each section is saved independently. Expand a section, make changes, and click its Save button.
        Settings are isolated to <strong>{meta?.name}</strong> and do not affect other tenants.
      </div>

      {/* Sections */}
      {SECTIONS.map(({ key, label, icon, color }) => (
        <SectionCard
          key={key}
          sectionKey={key}
          label={label}
          icon={icon}
          color={color}
          config={config[key] || {}}
          onChange={handleChange}
          saving={saving}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}

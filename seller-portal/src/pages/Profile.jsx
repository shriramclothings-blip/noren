import { useState, useRef } from 'react';
import { User, Store, MapPin, CreditCard, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSellerAuth } from '../context/SellerAuthContext';
import SellerLayout from '../components/SellerLayout';

const inp = { width: '100%', padding: '10px 13px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box' };
const Lbl = ({ children }) => <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{children}</label>;

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <Icon size={16} color="#c9a96e" />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, profile, refreshProfile } = useSellerAuth();
  const logoRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [form, setForm] = useState({
    brand_name: profile?.brand_name || '',
    business_type: profile?.business_type || 'individual',
    gst_number: profile?.gst_number || '',
    pan_number: profile?.pan_number || '',
    description: profile?.description || '',
    pickup_address: profile?.pickup_address || '',
    pickup_city: profile?.pickup_city || '',
    pickup_state: profile?.pickup_state || '',
    pickup_pincode: profile?.pickup_pincode || '',
    bank_account_name: profile?.bank_account_name || '',
    bank_account_number: profile?.bank_account_number || '',
    bank_ifsc: profile?.bank_ifsc || '',
    bank_name: profile?.bank_name || '',
    website_url: profile?.website_url || '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const onLogoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (logoFile) fd.append('logo', logoFile);
      await api.put('/seller/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const currentLogo = logoPreview || profile?.logo_url;

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Seller Profile</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Keep your business information up to date.</p>
          </div>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 9, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Account info (read-only) */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #e5e7eb' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{user?.email}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Account ID: #{user?.id}</div>
          </div>
        </div>

        {/* Brand + Logo */}
        <Section title="Brand Information" icon={Store}>
          <div style={{ display: 'grid', gap: 14 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 72, height: 72, borderRadius: 14, border: '2px solid #e5e7eb', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentLogo
                    ? <img src={currentLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Store size={26} color="#d1d5db" />
                  }
                </div>
                <button onClick={() => logoRef.current?.click()} style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: '#0f172a', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={11} color="#fff" />
                </button>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Store Logo</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Square image, min 200×200px, max 2MB</div>
                <button onClick={() => logoRef.current?.click()} style={{ marginTop: 6, padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                  Change Logo
                </button>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogoChange} />
            </div>

            <div>
              <Lbl>Brand / Store Name</Lbl>
              <input value={form.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder="Your brand name" style={inp} />
            </div>
            <div>
              <Lbl>Business Type</Lbl>
              <select value={form.business_type} onChange={e => set('business_type', e.target.value)} style={inp}>
                {[['individual','Individual'],['sole_proprietor','Sole Proprietor'],['partnership','Partnership'],['pvt_ltd','Private Limited'],['llp','LLP'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Lbl>GST Number</Lbl>
                <input value={form.gst_number} onChange={e => set('gst_number', e.target.value)} placeholder="22AAAAA0000A1Z5" style={inp} />
              </div>
              <div>
                <Lbl>PAN Number</Lbl>
                <input value={form.pan_number} onChange={e => set('pan_number', e.target.value)} placeholder="AAAAA0000A" style={inp} />
              </div>
            </div>
            <div>
              <Lbl>Website URL</Lbl>
              <input value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://yourbrand.com" style={inp} />
            </div>
            <div>
              <Lbl>About Your Store</Lbl>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe your brand and products…" style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        </Section>

        {/* Pickup Address */}
        <Section title="Pickup Address" icon={MapPin}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <Lbl>Street Address</Lbl>
              <textarea value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} rows={2} placeholder="Building, street, area…" style={{ ...inp, resize: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <Lbl>City</Lbl>
                <input value={form.pickup_city} onChange={e => set('pickup_city', e.target.value)} placeholder="Mumbai" style={inp} />
              </div>
              <div>
                <Lbl>State</Lbl>
                <input value={form.pickup_state} onChange={e => set('pickup_state', e.target.value)} placeholder="Maharashtra" style={inp} />
              </div>
              <div>
                <Lbl>Pincode</Lbl>
                <input value={form.pickup_pincode} onChange={e => set('pickup_pincode', e.target.value)} placeholder="400001" style={inp} />
              </div>
            </div>
          </div>
        </Section>

        {/* Bank Details */}
        <Section title="Bank Details" icon={CreditCard}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 14 }}>
            Bank details are used only for payout settlements and kept strictly confidential.
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <Lbl>Account Holder Name</Lbl>
              <input value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} placeholder="As per bank records" style={inp} />
            </div>
            <div>
              <Lbl>Account Number</Lbl>
              <input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} placeholder="XXXXXXXXXXXX" style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Lbl>IFSC Code</Lbl>
                <input value={form.bank_ifsc} onChange={e => set('bank_ifsc', e.target.value)} placeholder="SBIN0001234" style={inp} />
              </div>
              <div>
                <Lbl>Bank Name</Lbl>
                <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="State Bank of India" style={inp} />
              </div>
            </div>
          </div>
        </Section>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 9, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </SellerLayout>
  );
}

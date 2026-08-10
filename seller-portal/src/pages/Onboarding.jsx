import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, User, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSellerAuth } from '../context/SellerAuthContext';

const inp = { width: '100%', padding: '10px 13px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff', boxSizing: 'border-box' };
const Lbl = ({ children, required }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
  </label>
);

const STEPS = ['Business Info', 'Address', 'Bank Details'];

export default function Onboarding() {
  const { refreshProfile } = useSellerAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand_name: '', business_type: 'individual', description: '',
    gst_number: '', pan_number: '',
    pickup_address: '', pickup_city: '', pickup_state: '', pickup_pincode: '',
    bank_account_name: '', bank_account_number: '', bank_ifsc: '', bank_name: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    if (!form.brand_name) return toast.error('Brand name is required');
    setSaving(true);
    try {
      await api.post('/seller/register', form);
      await refreshProfile();
      toast.success('Seller account created! Complete your KYC to go live.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create seller account');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 28, letterSpacing: '0.35em', color: '#faf9f7' }}>NOREN</div>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', color: '#c9a96e', marginTop: 4, textTransform: 'uppercase' }}>Seller Portal</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginTop: 20 }}>Set Up Your Seller Account</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Complete all steps to start listing products on NOREN.</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? '#c9a96e' : i === step ? '#fff' : 'rgba(255,255,255,0.1)',
                  color: i < step ? '#fff' : i === step ? '#0f172a' : '#475569',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                }}>
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span style={{ fontSize: 10, color: i === step ? '#faf9f7' : '#475569', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 60, height: 1, background: i < step ? '#c9a96e' : 'rgba(255,255,255,0.1)', margin: '0 6px', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px' }}>

          {/* Step 0 — Business Info */}
          {step === 0 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Store size={18} color="#c9a96e" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Business Information</span>
              </div>
              <div>
                <Lbl required>Brand / Store Name</Lbl>
                <input value={form.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder="e.g. Aryan Fashion" style={inp} />
              </div>
              <div>
                <Lbl>Business Type</Lbl>
                <select value={form.business_type} onChange={e => set('business_type', e.target.value)} style={inp}>
                  {[['individual','Individual'],['sole_proprietor','Sole Proprietor'],['partnership','Partnership'],['pvt_ltd','Private Limited'],['llp','LLP'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Lbl>GST Number</Lbl>
                <input value={form.gst_number} onChange={e => set('gst_number', e.target.value)} placeholder="22AAAAA0000A1Z5" style={inp} />
              </div>
              <div>
                <Lbl>PAN Number</Lbl>
                <input value={form.pan_number} onChange={e => set('pan_number', e.target.value)} placeholder="AAAAA0000A" style={inp} />
              </div>
              <div>
                <Lbl>About Your Store</Lbl>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Tell customers about your brand…" style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Step 1 — Address */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <MapPin size={18} color="#c9a96e" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Pickup Address</span>
              </div>
              <div>
                <Lbl required>Street Address</Lbl>
                <textarea value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} rows={2} placeholder="Building, street, area…" style={{ ...inp, resize: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Lbl required>City</Lbl>
                  <input value={form.pickup_city} onChange={e => set('pickup_city', e.target.value)} placeholder="Mumbai" style={inp} />
                </div>
                <div>
                  <Lbl required>State</Lbl>
                  <input value={form.pickup_state} onChange={e => set('pickup_state', e.target.value)} placeholder="Maharashtra" style={inp} />
                </div>
              </div>
              <div>
                <Lbl required>Pincode</Lbl>
                <input value={form.pickup_pincode} onChange={e => set('pickup_pincode', e.target.value)} placeholder="400001" style={{ ...inp, maxWidth: 160 }} />
              </div>
            </div>
          )}

          {/* Step 2 — Bank Details */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <User size={18} color="#c9a96e" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Bank Details (for payouts)</span>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                Your bank details are securely stored and used only for payout settlements.
              </div>
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
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
            <button onClick={prev} disabled={step === 0}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={submit} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#c9a96e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#475569' }}>
          You can update all details later from your profile.
        </p>
      </div>
    </div>
  );
}

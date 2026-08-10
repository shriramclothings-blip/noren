import { useState, useRef } from 'react';
import { ShieldCheck, Upload, CheckCircle, Clock, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSellerAuth } from '../context/SellerAuthContext';
import SellerLayout from '../components/SellerLayout';

const btn = (bg = '#0f172a', color = '#fff', disabled = false) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 9, border: 'none', background: bg, color, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 });

function DocUploadSlot({ label, fieldKey, files, setFiles, existingUrl }) {
  const ref = useRef(null);
  const file = files[fieldKey];
  return (
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{label}</div>
        {existingUrl && (
          <a href={existingUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6366f1', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <ExternalLink size={12} /> View Existing
          </a>
        )}
      </div>

      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8 }}>
          <CheckCircle size={14} color="#16a34a" />
          <span style={{ fontSize: 12, color: '#15803d', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          <button onClick={() => setFiles(p => ({ ...p, [fieldKey]: null }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: '1.5px dashed #d1d5db', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
          <Upload size={14} /> Upload {label}
        </button>
      )}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) setFiles(p => ({ ...p, [fieldKey]: e.target.files[0] })); e.target.value = ''; }} />
      <p style={{ margin: '6px 0 0', fontSize: 10, color: '#9ca3af' }}>JPG, PNG or PDF · Max 5MB</p>
    </div>
  );
}

export default function KYC() {
  const { profile, refreshProfile } = useSellerAuth();
  const [files, setFiles] = useState({ doc_gst: null, doc_pan: null, doc_bank: null, doc_address: null });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const hasAny = Object.values(files).some(Boolean);
    if (!hasAny) return toast.error('Please upload at least one document');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });
      await api.post('/seller/kyc', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Documents submitted for review!');
      await refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setSaving(false); }
  };

  const kycStatus = profile?.kyc_status || 'pending';

  const statusBanner = () => {
    if (kycStatus === 'approved') return (
      <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>KYC Verified ✓</div>
          <div style={{ fontSize: 13, color: '#166534', marginTop: 3 }}>Your documents have been verified. Your seller account is active.</div>
        </div>
      </div>
    );
    if (kycStatus === 'submitted') return (
      <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <Clock size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 14 }}>Under Review</div>
          <div style={{ fontSize: 13, color: '#1e40af', marginTop: 3 }}>Your documents are being reviewed by NOREN admin. Usually 1-2 business days.</div>
        </div>
      </div>
    );
    if (kycStatus === 'rejected') return (
      <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
        <XCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>KYC Rejected</div>
          <div style={{ fontSize: 13, color: '#991b1b', marginTop: 3 }}>
            {profile?.kyc_rejection_reason || 'Your documents could not be verified. Please resubmit correct documents.'}
          </div>
        </div>
      </div>
    );
    return (
      <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
        <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>KYC Not Submitted</div>
          <div style={{ fontSize: 13, color: '#78350f', marginTop: 3 }}>Upload your business documents to activate your seller account and start getting orders.</div>
        </div>
      </div>
    );
  };

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>KYC Verification</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Upload your business documents to verify your seller account.</p>
        </div>

        {statusBanner()}

        {/* Docs to upload */}
        {kycStatus !== 'approved' && (
          <>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Required Documents</h3>
              <p style={{ margin: '0 0 18px', fontSize: 12, color: '#9ca3af' }}>Upload clear, readable copies. PDFs or high-quality images accepted.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                <DocUploadSlot label="GST Certificate" fieldKey="doc_gst" files={files} setFiles={setFiles} existingUrl={profile?.doc_gst_url} />
                <DocUploadSlot label="PAN Card" fieldKey="doc_pan" files={files} setFiles={setFiles} existingUrl={profile?.doc_pan_url} />
                <DocUploadSlot label="Bank Statement / Passbook" fieldKey="doc_bank" files={files} setFiles={setFiles} existingUrl={profile?.doc_bank_url} />
                <DocUploadSlot label="Address Proof" fieldKey="doc_address" files={files} setFiles={setFiles} existingUrl={profile?.doc_address_url} />
              </div>
            </div>

            <div>
              <button onClick={submit} disabled={saving} style={btn('#0f172a', '#fff', saving)}>
                <ShieldCheck size={14} />
                {saving ? 'Submitting…' : 'Submit for Verification'}
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 18px', fontSize: 12, color: '#6b7280', border: '1px solid #e5e7eb' }}>
              <strong>Why do we need this?</strong> NOREN verifies all sellers to maintain a safe marketplace. Documents are stored securely and shared only with our compliance team.
            </div>
          </>
        )}
      </div>
    </SellerLayout>
  );
}

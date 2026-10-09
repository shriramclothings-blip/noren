import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Palette, Save, Eye, Type, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULTS = {
  headerBg: '#1e40af',
  headerText: '#ffffff',
  accentColor: '#3b82f6',
  footerText: 'Thank you for your business! Visit us again.',
  tagline: 'Quality Products • Best Prices • Fast Service',
  socialFacebook: '',
  socialInstagram: '',
  socialWhatsApp: '',
  website: '',
  showLogo: true,
  showQR: false,
  qrText: '',
  showBarcode: true,
  showSignature: false,
  signatureLabel: 'Authorized Signature',
  termsText: 'Goods once sold will not be taken back. Subject to local jurisdiction.',
  fontStyle: 'default',
  invoiceTitle: 'TAX INVOICE',
  showStamp: false,
  stampText: 'PAID',
  stampColor: '#10b981',
};

export default function InvoiceBrandingStudio() {
  const { company, saveCompany } = useApp();
  const [form, setForm] = useState({ ...DEFAULTS, ...(company.branding || {}) });
  const [preview, setPreview] = useState(false);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    await saveCompany({ ...company, branding: form });
    toast.success('Invoice branding saved!');
  };

  const Field = ({ label, children }) => (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="text-violet-500" size={26} /> Invoice Branding Studio</h1>
          <p className="text-sm text-gray-400 mt-0.5">Customize your invoice appearance, colors, footer, and social links</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreview(p => !p)} className="btn-secondary flex items-center gap-2"><Eye size={15} /> {preview ? 'Hide' : 'Preview'}</button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save size={15} /> Save Branding</button>
        </div>
      </div>

      <div className={`grid gap-6 ${preview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Settings Panel */}
        <div className="space-y-5">
          {/* Colors */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Palette size={15} className="text-violet-500" /> Colors & Theme</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Header Background">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.headerBg} onChange={e => set('headerBg', e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
                  <input className="input flex-1" value={form.headerBg} onChange={e => set('headerBg', e.target.value)} />
                </div>
              </Field>
              <Field label="Header Text Color">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.headerText} onChange={e => set('headerText', e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
                  <input className="input flex-1" value={form.headerText} onChange={e => set('headerText', e.target.value)} />
                </div>
              </Field>
              <Field label="Accent Color">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
                  <input className="input flex-1" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} />
                </div>
              </Field>
            </div>
          </div>

          {/* Text Content */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Type size={15} className="text-primary-500" /> Text & Content</h3>
            <div className="space-y-3">
              <Field label="Invoice Title">
                <input className="input" value={form.invoiceTitle} onChange={e => set('invoiceTitle', e.target.value)} placeholder="TAX INVOICE" />
              </Field>
              <Field label="Tagline (shown below company name)">
                <input className="input" value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Quality Products • Best Prices" />
              </Field>
              <Field label="Footer Message">
                <textarea className="input resize-none" rows={2} value={form.footerText} onChange={e => set('footerText', e.target.value)} />
              </Field>
              <Field label="Terms & Conditions">
                <textarea className="input resize-none" rows={2} value={form.termsText} onChange={e => set('termsText', e.target.value)} />
              </Field>
              <Field label="Signature Label">
                <input className="input" value={form.signatureLabel} onChange={e => set('signatureLabel', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Social & Contact */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Social Media & Website</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Facebook">
                <input className="input" value={form.socialFacebook} onChange={e => set('socialFacebook', e.target.value)} placeholder="facebook.com/yourpage" />
              </Field>
              <Field label="Instagram">
                <input className="input" value={form.socialInstagram} onChange={e => set('socialInstagram', e.target.value)} placeholder="@yourhandle" />
              </Field>
              <Field label="WhatsApp Number">
                <input className="input" value={form.socialWhatsApp} onChange={e => set('socialWhatsApp', e.target.value)} placeholder="+91 9999999999" />
              </Field>
              <Field label="Website">
                <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.yourstore.com" />
              </Field>
            </div>
          </div>

          {/* QR & Options */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><QrCode size={15} className="text-emerald-500" /> QR Code & Options</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'showLogo', label: 'Show Logo' },
                  { key: 'showQR', label: 'Show QR Code' },
                  { key: 'showBarcode', label: 'Show Invoice Barcode' },
                  { key: 'showSignature', label: 'Show Signature Line' },
                  { key: 'showStamp', label: 'Show PAID Stamp' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="checkbox" checked={!!form[opt.key]} onChange={e => set(opt.key, e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              {form.showQR && (
                <Field label="QR Code Content (URL or text)">
                  <input className="input" value={form.qrText} onChange={e => set('qrText', e.target.value)} placeholder="https://yourstore.com or UPI ID" />
                </Field>
              )}
              {form.showStamp && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Stamp Text">
                    <input className="input" value={form.stampText} onChange={e => set('stampText', e.target.value)} />
                  </Field>
                  <Field label="Stamp Color">
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.stampColor} onChange={e => set('stampColor', e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
                      <input className="input flex-1" value={form.stampColor} onChange={e => set('stampColor', e.target.value)} />
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {preview && (
          <div className="card p-4 sticky top-4 self-start">
            <h3 className="font-semibold mb-3 text-sm text-gray-500">Invoice Preview</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden text-xs" style={{ fontFamily: 'monospace' }}>
              {/* Header */}
              <div className="p-4" style={{ backgroundColor: form.headerBg, color: form.headerText }}>
                <div className="font-bold text-base">{company.name || 'Your Store Name'}</div>
                {form.tagline && <div className="text-xs opacity-80 mt-0.5">{form.tagline}</div>}
                <div className="text-xs opacity-70 mt-1">{company.address || 'Store Address'}</div>
                <div className="text-xs opacity-70">{company.phone || 'Phone'} {company.email ? `• ${company.email}` : ''}</div>
                {company.gstin && <div className="text-xs opacity-70">GSTIN: {company.gstin}</div>}
              </div>

              {/* Invoice Title */}
              <div className="px-4 py-2 text-center font-bold text-sm border-b border-gray-200 dark:border-gray-700" style={{ color: form.accentColor }}>
                {form.invoiceTitle}
              </div>

              {/* Body */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-gray-500">
                  <span>Invoice #: INV-001</span>
                  <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
                  <div className="flex justify-between font-semibold border-b border-gray-100 dark:border-gray-800 pb-1 mb-1">
                    <span>Item</span><span>Qty</span><span>Amount</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Sample Product</span><span>2</span><span>₹200</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold" style={{ color: form.accentColor }}>
                  <span>Total</span><span>₹200</span>
                </div>

                {form.showStamp && (
                  <div className="text-center">
                    <span className="text-lg font-black border-2 px-3 py-1 rounded" style={{ color: form.stampColor, borderColor: form.stampColor }}>
                      {form.stampText}
                    </span>
                  </div>
                )}

                {form.showSignature && (
                  <div className="text-right mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-400 w-32 ml-auto mb-1" />
                    <div className="text-gray-500">{form.signatureLabel}</div>
                  </div>
                )}
              </div>

              {/* Social */}
              {(form.socialFacebook || form.socialInstagram || form.socialWhatsApp || form.website) && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-500 text-center space-y-0.5">
                  {form.website && <div>🌐 {form.website}</div>}
                  {form.socialWhatsApp && <div>📱 {form.socialWhatsApp}</div>}
                  {form.socialInstagram && <div>📸 {form.socialInstagram}</div>}
                  {form.socialFacebook && <div>👍 {form.socialFacebook}</div>}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-3 text-center text-gray-500 border-t border-gray-100 dark:border-gray-800">
                <div>{form.footerText}</div>
                {form.termsText && <div className="text-gray-400 mt-1 text-[10px]">{form.termsText}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

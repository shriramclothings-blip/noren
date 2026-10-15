import React, { useState, useEffect } from 'react';
import { QrCode, Globe, Link2, Check, Copy, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

const WEBSITE_URL = process.env.REACT_APP_WEBSITE_URL || 'https://www.norenfastion.shop';
const INVOICE_VIEW_URL = process.env.REACT_APP_INVOICE_VIEW_URL || `${WEBSITE_URL}/my-billing/invoice`;

export default function OnlineInvoiceQRPanel({ onSave }) {
  const [config, setConfig] = useState({
    qrType: 'online', // 'online' or 'local'
    qrSize: 400,
    includeQROnInvoice: true,
    qrPosition: 'bottom-right', // 'bottom-right', 'bottom-center', 'top-right'
    autoEmailInvoice: false,
    websiteUrl: WEBSITE_URL,
    invoiceViewUrl: INVOICE_VIEW_URL,
  });

  const [previewToken, setPreviewToken] = useState('INV_preview_token_example');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Update preview URL when config changes
    if (config.qrType === 'online') {
      setPreviewUrl(`${config.invoiceViewUrl}/${previewToken}`);
    }
  }, [config, previewToken]);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('invoiceQRSettings');
      if (saved) {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (err) {
      console.error('Failed to load QR settings:', err);
    }
  };

  const handleSave = () => {
    localStorage.setItem('invoiceQRSettings', JSON.stringify(config));
    
    // Save individual settings to env-like storage
    localStorage.setItem('qr_type', config.qrType);
    localStorage.setItem('qr_size', config.qrSize.toString());
    localStorage.setItem('qr_position', config.qrPosition);
    localStorage.setItem('auto_email_invoice', config.autoEmailInvoice.toString());
    
    toast.success('✅ QR Code settings saved!');
    if (onSave) onSave(config);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(previewUrl);
    toast.success('URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* QR Type Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code Type
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setConfig({ ...config, qrType: 'online' })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              config.qrType === 'online'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className={`w-5 h-5 ${config.qrType === 'online' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="font-medium">Online Invoice</span>
              {config.qrType === 'online' && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
            </div>
            <p className="text-sm text-gray-600">
              QR points to web-based invoice. Customers can view, download, and share online.
            </p>
            <div className="mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded inline-block">
              Recommended
            </div>
          </button>

          <button
            onClick={() => setConfig({ ...config, qrType: 'local' })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              config.qrType === 'local'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <QrCode className={`w-5 h-5 ${config.qrType === 'local' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="font-medium">Local Data</span>
              {config.qrType === 'local' && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
            </div>
            <p className="text-sm text-gray-600">
              QR contains invoice data. Works offline but limited data capacity.
            </p>
          </button>
        </div>
      </div>

      {/* Online Invoice Settings */}
      {config.qrType === 'online' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-gray-900">Online Invoice Configuration</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={config.websiteUrl}
              onChange={(e) => setConfig({ ...config, websiteUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.norenfastion.shop"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice View URL
            </label>
            <input
              type="url"
              value={config.invoiceViewUrl}
              onChange={(e) => setConfig({ ...config, invoiceViewUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.norenfastion.shop/my-billing/invoice"
            />
            <p className="text-xs text-gray-500 mt-1">
              Base URL for invoice viewing. Token will be appended automatically.
            </p>
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={previewUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
              />
              <button
                onClick={copyUrl}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Open in browser"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            {/* QR Preview */}
            <div className="mt-4 flex justify-center">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                <QRCodeSVG
                  value={previewUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
                <p className="text-center text-xs text-gray-500 mt-2">Scan to view invoice</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">QR Code Settings</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QR Code Size (pixels)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="200"
              max="600"
              step="50"
              value={config.qrSize}
              onChange={(e) => setConfig({ ...config, qrSize: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-700 w-16">{config.qrSize}px</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            QR Position on Invoice
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'top-right', label: 'Top Right' },
              { value: 'bottom-right', label: 'Bottom Right' },
              { value: 'bottom-center', label: 'Bottom Center' },
            ].map((pos) => (
              <button
                key={pos.value}
                onClick={() => setConfig({ ...config, qrPosition: pos.value })}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  config.qrPosition === pos.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Include QR Code on Printed Invoice</span>
          <input
            type="checkbox"
            checked={config.includeQROnInvoice}
            onChange={(e) => setConfig({ ...config, includeQROnInvoice: e.target.checked })}
            className="w-5 h-5 text-blue-600"
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-700">Auto Email Invoice to Customer</div>
            <div className="text-xs text-gray-500">Automatically send invoice via email after checkout</div>
          </div>
          <input
            type="checkbox"
            checked={config.autoEmailInvoice}
            onChange={(e) => setConfig({ ...config, autoEmailInvoice: e.target.checked })}
            className="w-5 h-5 text-blue-600"
          />
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        Save QR Code Settings
      </button>

      {/* Info Box */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>💡 Pro Tip:</strong> Online invoices allow customers to view their invoices anytime, 
          share with others, and download PDF copies. QR codes work even after months!
        </p>
      </div>
    </div>
  );
}

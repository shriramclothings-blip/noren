/**
 * Invoice QR Code Component
 * Displays a QR code for invoice access with automatic generation and error handling
 */

import React, { useState, useEffect, useRef } from 'react';
import { QrCode, AlertCircle, CheckCircle, Download, Loader } from 'lucide-react';
import { generateInvoiceQRCode, validateInvoiceURL } from '../utils/qrGenerator';
import toast from 'react-hot-toast';

export default function InvoiceQRCode({ 
  publicToken, 
  baseURL, 
  printerType = 'thermal',
  size = 200,
  showURL = true,
  showDownload = false,
  className = '',
  onGenerated = null 
}) {
  const [qrData, setQRData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (publicToken && baseURL) {
      generateQR();
    }
  }, [publicToken, baseURL, printerType, size]);

  const generateQR = async () => {
    try {
      setLoading(true);
      setError(null);

      const qrCode = await generateInvoiceQRCode(publicToken, baseURL, {
        printerType,
        width: size
      });

      setQRData(qrCode);

      if (onGenerated) {
        onGenerated(qrCode);
      }
    } catch (err) {
      console.error('QR generation failed:', err);
      setError(err.message || 'Failed to generate QR code');
      toast.error('QR code generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrData) return;

    const link = document.createElement('a');
    link.download = `invoice-qr-${publicToken.slice(0, 8)}.png`;
    link.href = qrData.dataURL;
    link.click();

    toast.success('QR code downloaded');
  };

  const handleCopyURL = () => {
    if (!qrData) return;

    navigator.clipboard.writeText(qrData.url);
    toast.success('Invoice URL copied to clipboard');
  };

  if (loading) {
    return (
      <div className={`qr-code-container loading ${className}`}>
        <div style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          borderRadius: 8,
          border: '2px dashed #ccc'
        }}>
          <Loader size={32} style={{ color: '#999', animation: 'spin 1s linear infinite' }} />
        </div>
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Generating QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`qr-code-container error ${className}`}>
        <div style={{
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fee',
          borderRadius: 8,
          border: '2px solid #fcc',
          padding: 16,
          textAlign: 'center'
        }}>
          <AlertCircle size={32} style={{ color: '#c00', marginBottom: 8 }} />
          <p style={{ fontSize: 12, color: '#c00', fontWeight: 600 }}>QR Generation Failed</p>
          <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{error}</p>
        </div>
        <button
          onClick={generateQR}
          style={{
            marginTop: 8,
            padding: '6px 12px',
            background: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!qrData) return null;

  return (
    <div className={`qr-code-container ${className}`} style={{ textAlign: 'center' }}>
      {/* QR Code Image */}
      <div style={{
        display: 'inline-block',
        padding: 12,
        background: '#fff',
        borderRadius: 8,
        border: '2px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <img
          src={qrData.dataURL}
          alt="Invoice QR Code"
          style={{
            width: size,
            height: size,
            display: 'block'
          }}
        />
        
        {/* Label */}
        <div style={{
          marginTop: 8,
          padding: '4px 8px',
          background: '#f8f8f8',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          color: '#666',
          textAlign: 'center',
          letterSpacing: '0.5px'
        }}>
          SCAN TO VIEW INVOICE
        </div>
      </div>

      {/* URL Display */}
      {showURL && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: '#f8f8f8',
          borderRadius: 6,
          fontSize: 11,
          color: '#666',
          wordBreak: 'break-all',
          maxWidth: size + 24,
          margin: '12px auto 0'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#444' }}>
            Invoice URL:
          </div>
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: 10,
            cursor: 'pointer',
            color: '#007bff'
          }}
          onClick={handleCopyURL}
          title="Click to copy"
          >
            {qrData.url}
          </div>
        </div>
      )}

      {/* Actions */}
      {showDownload && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#007bff'}
          >
            <Download size={14} />
            Download
          </button>

          <button
            onClick={handleCopyURL}
            style={{
              padding: '8px 14px',
              background: '#fff',
              color: '#007bff',
              border: '2px solid #007bff',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#007bff';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = '#007bff';
            }}
          >
            Copy URL
          </button>
        </div>
      )}

      {/* Status Badge */}
      <div style={{
        marginTop: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: '#e8f5e9',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: '#2e7d32'
      }}>
        <CheckCircle size={14} />
        QR Code Ready
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact version for printing on receipts
 */
export function InvoiceQRCodeCompact({ publicToken, baseURL, size = 150 }) {
  const [qrDataURL, setQRDataURL] = useState(null);

  useEffect(() => {
    if (publicToken && baseURL) {
      generateInvoiceQRCode(publicToken, baseURL, {
        printerType: 'thermal',
        width: size
      })
        .then(qr => setQRDataURL(qr.dataURL))
        .catch(err => console.error('Compact QR generation failed:', err));
    }
  }, [publicToken, baseURL, size]);

  if (!qrDataURL) {
    return (
      <div style={{
        width: size,
        height: size,
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <QrCode size={size * 0.4} style={{ color: '#ccc' }} />
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: 8 }}>
      <img
        src={qrDataURL}
        alt="Invoice QR"
        style={{ width: size, height: size, display: 'block', margin: '0 auto' }}
      />
      <div style={{
        marginTop: 4,
        fontSize: 10,
        fontWeight: 600,
        color: '#333',
        letterSpacing: '0.5px'
      }}>
        SCAN TO VIEW INVOICE
      </div>
    </div>
  );
}

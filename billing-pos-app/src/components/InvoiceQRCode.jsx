/**
 * Invoice QR Code Component
 * Displays a QR code for online invoice access with secure token generation
 * Connects to NOREN backend for token creation and validation
 */

import React, { useState, useEffect, useRef } from 'react';
import { QrCode, AlertCircle, CheckCircle, Download, Loader, ExternalLink, Cloud } from 'lucide-react';
import { onlineInvoiceQRService } from '../services/onlineInvoiceQRService';
import toast from 'react-hot-toast';

export default function InvoiceQRCode({ 
  invoiceData,  // Complete invoice data object
  printerType = 'thermal',
  size = 200,
  showURL = true,
  showDownload = false,
  className = '',
  onGenerated = null,
  onTokenGenerated = null
}) {
  const [qrData, setQRData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (invoiceData && invoiceData.id) {
      generateOnlineQR();
    }
  }, [invoiceData, printerType, size]);

  const generateOnlineQR = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create secure token and generate online QR code
      const result = await onlineInvoiceQRService.generateInvoiceQR(invoiceData, {
        printerType,
        size
      });

      setQRData(result.qrCode);
      setTokenData(result.token);

      if (onGenerated) {
        onGenerated(result.qrCode);
      }

      if (onTokenGenerated) {
        onTokenGenerated(result.token);
      }

      toast.success('Online invoice QR generated successfully');
    } catch (err) {
      console.error('Online QR generation failed:', err);
      setError(err.message || 'Failed to generate online QR code');
      toast.error('Online QR code generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrData) return;

    const link = document.createElement('a');
    link.download = `online-invoice-qr-${tokenData?.token?.slice(0, 8) || 'unknown'}.png`;
    link.href = qrData.dataURL;
    link.click();

    toast.success('Online QR code downloaded');
  };

  const handleCopyURL = () => {
    if (!qrData) return;

    navigator.clipboard.writeText(qrData.url);
    toast.success('Online invoice URL copied to clipboard');
  };

  const handleOpenOnline = () => {
    if (!qrData) return;
    
    window.open(qrData.url, '_blank');
    toast.success('Opening online invoice in browser');
  };

  const handleRefreshToken = async () => {
    if (!tokenData) return;

    try {
      setLoading(true);
      const newToken = await onlineInvoiceQRService.refreshToken(tokenData.token);
      
      // Regenerate QR with new token
      const result = await onlineInvoiceQRService.generateInvoiceQR(invoiceData, {
        printerType,
        size,
        existingToken: newToken.token
      });

      setQRData(result.qrCode);
      setTokenData(result.token);
      toast.success('Invoice access refreshed');
    } catch (err) {
      toast.error('Failed to refresh invoice access');
    } finally {
      setLoading(false);
    }
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
          onClick={generateOnlineQR}
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
        
        <div style={{
          marginTop: 8,
          padding: '4px 8px',
          background: '#e3f2fd',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          color: '#1565c0',
          textAlign: 'center',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4
        }}>
          <Cloud size={12} />
          SCAN FOR ONLINE INVOICE
        </div>
      </div>

      {/* URL Display */}
      {showURL && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: '#f0f8ff',
          borderRadius: 6,
          fontSize: 11,
          color: '#666',
          wordBreak: 'break-all',
          maxWidth: size + 24,
          margin: '12px auto 0',
          border: '1px solid #e0e8f0'
        }}>
          <div style={{ 
            fontWeight: 600, 
            marginBottom: 4, 
            color: '#1565c0',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Cloud size={12} />
            Online Invoice URL:
          </div>
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: 10,
            cursor: 'pointer',
            color: '#007bff',
            marginBottom: 6
          }}
          onClick={handleCopyURL}
          title="Click to copy"
          >
            {qrData.url}
          </div>
          
          {/* Token Info */}
          {tokenData && (
            <div style={{
              fontSize: 9,
              color: '#888',
              paddingTop: 6,
              borderTop: '1px solid #e0e8f0'
            }}>
              <div>Token: {tokenData.token?.slice(0, 16)}...</div>
              <div>Expires: {tokenData.expiresAt ? new Date(tokenData.expiresAt).toLocaleString() : 'Never'}</div>
              <div>Generated: {new Date().toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {showDownload && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
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
            onClick={handleOpenOnline}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#218838'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#28a745'}
          >
            <ExternalLink size={14} />
            Open Online
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

          {tokenData && (
            <button
              onClick={handleRefreshToken}
              style={{
                padding: '8px 14px',
                background: '#fff',
                color: '#ffc107',
                border: '2px solid #ffc107',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffc107';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = '#ffc107';
              }}
            >
              Refresh Access
            </button>
          )}
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
        Online QR Ready
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
 * Compact version for printing on receipts - Online QR Integration
 */
export function InvoiceQRCodeCompact({ invoiceData, size = 150 }) {
  const [qrDataURL, setQRDataURL] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (invoiceData && invoiceData.id) {
      generateCompactOnlineQR();
    }
  }, [invoiceData, size]);

  const generateCompactOnlineQR = async () => {
    try {
      setLoading(true);
      const result = await onlineInvoiceQRService.generateInvoiceQR(invoiceData, {
        printerType: 'thermal',
        size
      });
      setQRDataURL(result.qrCode.dataURL);
    } catch (err) {
      console.error('Compact online QR generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        width: size,
        height: size,
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed #ccc'
      }}>
        <Loader size={size * 0.3} style={{ color: '#ccc', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

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
        alt="Online Invoice QR"
        style={{ width: size, height: size, display: 'block', margin: '0 auto' }}
      />
      <div style={{
        marginTop: 4,
        fontSize: 10,
        fontWeight: 600,
        color: '#333',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2
      }}>
        <Cloud size={10} />
        SCAN FOR ONLINE INVOICE
      </div>
    </div>
  );
}

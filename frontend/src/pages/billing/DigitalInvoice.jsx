import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, Download, Share2, CheckCircle, AlertCircle, 
  ArrowLeft, Printer, Mail, Shield, Calendar, CreditCard,
  MapPin, Phone, Building
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DigitalInvoice() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    if (token) {
      fetchInvoice();
    }
  }, [token]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/invoices/public/${token}`);
      setInvoice(response.data.invoice);
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
      setError(err.response?.data?.message || 'Failed to load invoice. Please check the link and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const response = await axios.post(`${API_URL}/invoices/verify`, { token });
      setVerified(response.data);
      
      if (response.data.valid) {
        toast.success('Invoice verified successfully!');
      } else {
        toast.error('Invoice verification failed');
      }
    } catch (err) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = () => {
    // In production, this would generate a PDF
    toast.success('PDF download started...');
    // window.open(`${API_URL}/invoices/${token}/pdf`, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice?.bill_no}`,
          text: `View my invoice from ${invoice?.business_name}`,
          url: window.location.href
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#faf9f7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ 
            width: 48, 
            height: 48, 
            margin: '0 auto 24px',
            borderColor: 'rgba(201, 169, 110, 0.2)',
            borderTopColor: '#c9a96e'
          }} />
          <p style={{ fontSize: 16, color: '#6b6b68' }}>Loading your invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#faf9f7',
        padding: 24
      }}>
        <div style={{ 
          maxWidth: 500, 
          textAlign: 'center',
          background: '#fff',
          padding: 48,
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          <AlertCircle size={64} style={{ color: '#ef4444', marginBottom: 24 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a18', marginBottom: 16 }}>
            Invoice Not Found
          </h2>
          <p style={{ fontSize: 15, color: '#6b6b68', marginBottom: 32, lineHeight: 1.6 }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/my-billing')}
            style={{
              padding: '14px 28px',
              background: '#c9a96e',
              color: '#1a1a18',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <ArrowLeft size={18} />
            Back to Billing Portal
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const paymentStatusColors = {
    paid: { bg: '#dcfce7', text: '#166534', label: 'PAID' },
    pending: { bg: '#fef9c3', text: '#854d0e', label: 'PENDING' },
    failed: { bg: '#fee2e2', text: '#991b1b', label: 'FAILED' }
  };

  const statusConfig = paymentStatusColors[invoice.payment_status] || paymentStatusColors.pending;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0' }} className="invoice-container">
      {/* Navigation Bar */}
      <div style={{ 
        background: '#fff', 
        borderBottom: '1px solid #e6e0d8',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }} className="no-print">
        <button
          onClick={() => navigate('/my-billing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'transparent',
            border: '1px solid #e6e0d8',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#3d3d3a',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#faf9f7'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleVerify}
            disabled={verifying}
            style={{
              padding: '10px 16px',
              background: verified?.valid ? '#dcfce7' : 'transparent',
              border: `1px solid ${verified?.valid ? '#166534' : '#e6e0d8'}`,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: verified?.valid ? '#166534' : '#3d3d3a',
              cursor: verifying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <Shield size={18} />
            {verifying ? 'Verifying...' : verified ? 'Verified' : 'Verify'}
          </button>

          <button
            onClick={handleDownload}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid #e6e0d8',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#3d3d3a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Download size={18} />
            Download PDF
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid #e6e0d8',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#3d3d3a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Printer size={18} />
            Print
          </button>

          <button
            onClick={handleShare}
            style={{
              padding: '10px 16px',
              background: '#c9a96e',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#1a1a18',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px 40px' }}>
        <div style={{ 
          background: '#fff', 
          borderRadius: 16, 
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #e6e0d8'
        }}>
          {/* Invoice Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d28 100%)', 
            padding: '40px 32px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: '#faf9f7',
              marginBottom: 8
            }}>
              {invoice.business_name || 'NOREN'}
            </div>
            <div style={{ fontSize: 13, color: '#c9a96e', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Digital Invoice
            </div>
          </div>

          {/* Invoice Info Grid */}
          <div style={{ padding: 32 }}>
            {/* Status Badge */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 20px',
                background: statusConfig.bg,
                color: statusConfig.text,
                borderRadius: 24,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em'
              }}>
                <CheckCircle size={16} />
                {statusConfig.label}
              </span>
            </div>

            {/* Key Details */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 24,
              marginBottom: 32,
              padding: 24,
              background: '#faf9f7',
              borderRadius: 12
            }}>
              <InfoItem
                icon={<FileText size={20} style={{ color: '#c9a96e' }} />}
                label="Invoice Number"
                value={invoice.bill_no}
              />
              <InfoItem
                icon={<Calendar size={20} style={{ color: '#c9a96e' }} />}
                label="Date"
                value={new Date(invoice.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
              <InfoItem
                icon={<CreditCard size={20} style={{ color: '#c9a96e' }} />}
                label="Payment Method"
                value={invoice.payment_method?.replace('_', ' ').toUpperCase()}
              />
            </div>

            {/* Business & Store Details */}
            {(invoice.business_address || invoice.store_address) && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 24,
                marginBottom: 32,
                padding: 24,
                background: '#f5f4f0',
                borderRadius: 12
              }}>
                {invoice.business_address && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 12,
                      color: '#6b6b68',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}>
                      <Building size={16} />
                      Business Address
                    </div>
                    <div style={{ fontSize: 14, color: '#3d3d3a', lineHeight: 1.6 }}>
                      {invoice.business_address}
                      {invoice.business_phone && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Phone size={14} style={{ color: '#9b9b97' }} />
                          {invoice.business_phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {invoice.store_address && invoice.store_name && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 12,
                      color: '#6b6b68',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}>
                      <MapPin size={16} />
                      Store: {invoice.store_name}
                    </div>
                    <div style={{ fontSize: 14, color: '#3d3d3a', lineHeight: 1.6 }}>
                      {invoice.store_address}
                      {invoice.store_phone && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Phone size={14} style={{ color: '#9b9b97' }} />
                          {invoice.store_phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div style={{ marginBottom: 32, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1a1a18' }}>
                    <th style={tableHeaderStyle}>Item</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Qty</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Price</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={tableCellStyle}>
                        <div style={{ fontWeight: 600, color: '#1a1a18', marginBottom: 4 }}>
                          {item.title}
                        </div>
                        {item.sku && (
                          <div style={{ fontSize: 12, color: '#9b9b97' }}>
                            SKU: {item.sku}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                        {item.quantity}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                        ₹{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 600 }}>
                        ₹{Number(item.line_total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ 
              maxWidth: 400, 
              marginLeft: 'auto',
              padding: 24,
              background: '#faf9f7',
              borderRadius: 12
            }}>
              {Number(invoice.discount_amount) > 0 && (
                <TotalRow label="Discount" value={`- ₹${Number(invoice.discount_amount).toFixed(2)}`} color="#ef4444" />
              )}
              {Number(invoice.tax_amount) > 0 && (
                <TotalRow label="Tax (GST)" value={`₹${Number(invoice.tax_amount).toFixed(2)}`} />
              )}
              {Number(invoice.round_off) !== 0 && (
                <TotalRow label="Round Off" value={`₹${Number(invoice.round_off).toFixed(2)}`} />
              )}
              <div style={{ 
                borderTop: '2px solid #1a1a18', 
                marginTop: 16, 
                paddingTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a18', letterSpacing: '0.02em' }}>
                  TOTAL
                </span>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#1a1a18' }}>
                  ₹{Number(invoice.total).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer Note */}
            {invoice.notes && (
              <div style={{ 
                marginTop: 32,
                padding: 20,
                background: '#f5f4f0',
                borderRadius: 12,
                fontSize: 14,
                color: '#6b6b68',
                lineHeight: 1.6
              }}>
                <strong style={{ color: '#3d3d3a' }}>Note:</strong> {invoice.notes}
              </div>
            )}

            {/* Thank You Message */}
            <div style={{ 
              marginTop: 32, 
              textAlign: 'center',
              padding: '24px 0',
              borderTop: '1px solid #e6e0d8'
            }}>
              <p style={{ fontSize: 15, color: '#3d3d3a', marginBottom: 8 }}>
                Thank you for shopping with us!
              </p>
              <p style={{ fontSize: 13, color: '#9b9b97' }}>
                {invoice.business_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .invoice-container {
            background: white !important;
          }
        }
        
        .spinner {
          border: 3px solid;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8, 
        marginBottom: 8,
        fontSize: 12,
        fontWeight: 600,
        color: '#6b6b68',
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
      }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18' }}>
        {value}
      </div>
    </div>
  );
}

function TotalRow({ label, value, color = '#3d3d3a' }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      padding: '8px 0',
      fontSize: 14,
      color
    }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const tableHeaderStyle = {
  padding: '12px 16px',
  fontSize: 12,
  fontWeight: 700,
  color: '#c9a96e',
  letterSpacing: '0.08em',
  textAlign: 'left',
  textTransform: 'uppercase'
};

const tableCellStyle = {
  padding: '16px',
  fontSize: 14,
  color: '#3d3d3a'
};

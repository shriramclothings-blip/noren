import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, CheckCircle, HelpCircle, QrCode, Smartphone } from 'lucide-react';

export default function MyBilling() {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) return;
    
    setLoading(true);
    // Navigate to invoice lookup with query
    window.location.href = `/my-billing/lookup?q=${encodeURIComponent(invoiceNumber)}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #faf9f7 0%, #f5f4f0 100%)' }}>
      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d28 100%)', 
        padding: '80px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(201, 169, 110, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(201, 169, 110, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 12, 
            background: 'rgba(201, 169, 110, 0.1)', 
            padding: '8px 20px', 
            borderRadius: 30,
            marginBottom: 24,
            border: '1px solid rgba(201, 169, 110, 0.2)'
          }}>
            <FileText size={18} style={{ color: '#c9a96e' }} />
            <span style={{ color: '#c9a96e', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Digital Invoice Portal
            </span>
          </div>

          <h1 style={{ 
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(32px, 6vw, 56px)',
            fontWeight: 600,
            color: '#faf9f7',
            marginBottom: 20,
            letterSpacing: '0.02em',
            lineHeight: 1.2
          }}>
            Your Digital Invoice
          </h1>

          <p style={{ 
            fontSize: 17, 
            color: 'rgba(250, 249, 247, 0.8)', 
            maxWidth: 560, 
            margin: '0 auto 40px',
            lineHeight: 1.6
          }}>
            Access your purchase receipt instantly. Scan your QR code or enter your invoice number below.
          </p>

          {/* Quick Actions */}
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            marginTop: 32
          }}>
            <Link 
              to="/my-billing/scan" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 28px',
                background: '#c9a96e',
                color: '#1a1a18',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.02em'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <QrCode size={20} />
              Scan QR Code
            </Link>

            <a 
              href="#lookup" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 28px',
                background: 'rgba(250, 249, 247, 0.1)',
                color: '#faf9f7',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
                border: '1px solid rgba(250, 249, 247, 0.2)',
                cursor: 'pointer',
                letterSpacing: '0.02em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(250, 249, 247, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(250, 249, 247, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(250, 249, 247, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(250, 249, 247, 0.2)';
              }}
            >
              <Search size={20} />
              Enter Invoice Number
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        {/* Invoice Lookup Form */}
        <div id="lookup" style={{ 
          maxWidth: 600, 
          margin: '0 auto 80px',
          background: '#fff',
          padding: 40,
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #e6e0d8'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #c9a96e 0%, #b8976a 100%)',
              borderRadius: 16,
              marginBottom: 20
            }}>
              <Search size={28} style={{ color: '#fff' }} />
            </div>
            <h2 style={{ 
              fontSize: 28, 
              fontWeight: 600, 
              color: '#1a1a18',
              marginBottom: 8,
              fontFamily: "'Cormorant Garamond', Georgia, serif"
            }}>
              Find Your Invoice
            </h2>
            <p style={{ fontSize: 15, color: '#6b6b68', lineHeight: 1.5 }}>
              Enter your invoice number to view your digital receipt
            </p>
          </div>

          <form onSubmit={handleLookup}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#3d3d3a',
                marginBottom: 8,
                letterSpacing: '0.02em'
              }}>
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g., BILL-20261009-123456"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 15,
                  border: '2px solid #e6e0d8',
                  borderRadius: 8,
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontFamily: "'Inter', sans-serif",
                  color: '#1a1a18'
                }}
                onFocus={(e) => e.target.style.borderColor = '#c9a96e'}
                onBlur={(e) => e.target.style.borderColor = '#e6e0d8'}
                required
              />
              <p style={{ fontSize: 13, color: '#9b9b97', marginTop: 8 }}>
                You can find this on your printed receipt
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !invoiceNumber.trim()}
              style={{
                width: '100%',
                padding: '16px',
                background: loading || !invoiceNumber.trim() ? '#e6e0d8' : '#c9a96e',
                color: loading || !invoiceNumber.trim() ? '#9b9b97' : '#1a1a18',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading || !invoiceNumber.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.02em'
              }}
              onMouseEnter={(e) => {
                if (!loading && invoiceNumber.trim()) {
                  e.currentTarget.style.background = '#b8976a';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && invoiceNumber.trim()) {
                  e.currentTarget.style.background = '#c9a96e';
                }
              }}
            >
              {loading ? 'Searching...' : 'View Invoice'}
            </button>
          </form>
        </div>

        {/* Features Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 32,
          marginBottom: 60
        }}>
          <FeatureCard
            icon={<Smartphone size={32} style={{ color: '#c9a96e' }} />}
            title="Mobile Friendly"
            description="Access your invoices from any device, anywhere, anytime"
          />
          <FeatureCard
            icon={<CheckCircle size={32} style={{ color: '#c9a96e' }} />}
            title="Instant Verification"
            description="Verify invoice authenticity with our secure validation system"
          />
          <FeatureCard
            icon={<FileText size={32} style={{ color: '#c9a96e' }} />}
            title="Download & Share"
            description="Download PDF copies and share invoices via email or messaging"
          />
        </div>

        {/* Help Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, #faf9f7 0%, #f5f4f0 100%)',
          padding: 40,
          borderRadius: 16,
          textAlign: 'center',
          border: '1px solid #e6e0d8'
        }}>
          <HelpCircle size={48} style={{ color: '#c9a96e', marginBottom: 20 }} />
          <h3 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>
            Need Help?
          </h3>
          <p style={{ fontSize: 15, color: '#6b6b68', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            Can't find your invoice or facing issues? We're here to help.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/my-billing/help"
              style={{
                padding: '12px 24px',
                background: '#c9a96e',
                color: '#1a1a18',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
                display: 'inline-block'
              }}
            >
              View Help & FAQ
            </Link>
            <Link
              to="/contact"
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#3d3d3a',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
                display: 'inline-block',
                border: '2px solid #e6e0d8'
              }}
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div style={{
      background: '#fff',
      padding: 32,
      borderRadius: 16,
      border: '1px solid #e6e0d8',
      textAlign: 'center',
      transition: 'all 0.3s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ marginBottom: 20 }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: '#6b6b68', lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
}

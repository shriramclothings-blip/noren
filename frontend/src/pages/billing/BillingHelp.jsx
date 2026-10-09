import { Link } from 'react-router-dom';
import { HelpCircle, QrCode, FileText, Shield, Download, Share2, ArrowLeft, Mail, Phone } from 'lucide-react';

export default function BillingHelp() {
  const faqs = [
    {
      question: 'How do I access my digital invoice?',
      answer: 'You can access your invoice by scanning the QR code printed on your receipt using your smartphone camera, or by entering your invoice number on the billing portal.'
    },
    {
      question: 'What if I lost my printed receipt?',
      answer: 'If you have your invoice number or email confirmation, you can retrieve it from the billing portal. Otherwise, contact our support team with your purchase details.'
    },
    {
      question: 'Can I download a PDF copy of my invoice?',
      answer: 'Yes! Once you open your digital invoice, click the "Download PDF" button to save a copy to your device.'
    },
    {
      question: 'How do I verify my invoice is authentic?',
      answer: 'Every digital invoice has a "Verify" button. Click it to check the authenticity of your invoice against our secure database.'
    },
    {
      question: 'Can I share my invoice with someone else?',
      answer: 'Yes, you can share your invoice link via email, WhatsApp, or any messaging app using the "Share" button.'
    },
    {
      question: 'Is my invoice data secure?',
      answer: 'Absolutely. All invoice links are encrypted and unique to your purchase. Only someone with the exact link can view your invoice.'
    },
    {
      question: 'What payment methods are shown on the invoice?',
      answer: 'Your invoice displays the payment method you used (Cash, UPI, Card, etc.) along with the payment status.'
    },
    {
      question: 'Can I get a refund or return based on this invoice?',
      answer: 'Yes, your digital invoice serves as proof of purchase for returns and refunds according to our return policy.'
    }
  ];

  const steps = [
    {
      icon: <QrCode size={32} style={{ color: '#c9a96e' }} />,
      title: 'Scan QR Code',
      description: 'Open your camera app and point it at the QR code on your receipt'
    },
    {
      icon: <FileText size={32} style={{ color: '#c9a96e' }} />,
      title: 'View Invoice',
      description: 'Your digital invoice opens automatically in your web browser'
    },
    {
      icon: <Download size={32} style={{ color: '#c9a96e' }} />,
      title: 'Download or Share',
      description: 'Save PDF, print, or share your invoice with a tap'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d28 100%)',
        padding: '40px 24px',
        textAlign: 'center'
      }}>
        <Link
          to="/my-billing"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'rgba(250, 249, 247, 0.1)',
            border: '1px solid rgba(250, 249, 247, 0.2)',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#faf9f7',
            textDecoration: 'none',
            marginBottom: 32,
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={18} />
          Back to Billing Portal
        </Link>

        <div style={{
          width: 80,
          height: 80,
          background: 'rgba(201, 169, 110, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          border: '2px solid rgba(201, 169, 110, 0.3)'
        }}>
          <HelpCircle size={40} style={{ color: '#c9a96e' }} />
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(32px, 6vw, 48px)',
          fontWeight: 600,
          color: '#faf9f7',
          marginBottom: 16,
          letterSpacing: '0.02em'
        }}>
          Help & Support
        </h1>

        <p style={{
          fontSize: 16,
          color: 'rgba(250, 249, 247, 0.8)',
          maxWidth: 600,
          margin: '0 auto'
        }}>
          Everything you need to know about accessing and using your digital invoices
        </p>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>
        {/* How It Works */}
        <div style={{ marginBottom: 80 }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#1a1a18',
            marginBottom: 40,
            textAlign: 'center',
            fontFamily: "'Cormorant Garamond', Georgia, serif"
          }}>
            How It Works
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32
          }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{
                background: '#fff',
                padding: 32,
                borderRadius: 16,
                border: '1px solid #e6e0d8',
                textAlign: 'center',
                position: 'relative'
              }}>
                {idx < steps.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: 48,
                    right: -16,
                    width: 32,
                    height: 2,
                    background: '#e6e0d8',
                    display: window.innerWidth >= 900 ? 'block' : 'none'
                  }} />
                )}

                <div style={{
                  width: 64,
                  height: 64,
                  background: 'linear-gradient(135deg, #faf9f7 0%, #f5f4f0 100%)',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '2px solid #e6e0d8'
                }}>
                  {step.icon}
                </div>

                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: -12,
                  width: 32,
                  height: 32,
                  background: '#c9a96e',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1a1a18'
                }}>
                  {idx + 1}
                </div>

                <h3 style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#1a1a18',
                  marginBottom: 12
                }}>
                  {step.title}
                </h3>

                <p style={{
                  fontSize: 14,
                  color: '#6b6b68',
                  lineHeight: 1.6
                }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ marginBottom: 80 }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#1a1a18',
            marginBottom: 40,
            textAlign: 'center',
            fontFamily: "'Cormorant Garamond', Georgia, serif"
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{
                background: '#fff',
                padding: 28,
                borderRadius: 12,
                border: '1px solid #e6e0d8',
                marginBottom: 16
              }}>
                <h3 style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: '#1a1a18',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'start',
                  gap: 12
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: 24,
                    height: 24,
                    background: 'linear-gradient(135deg, #c9a96e 0%, #b8976a 100%)',
                    borderRadius: '50%',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    Q
                  </span>
                  {faq.question}
                </h3>
                <p style={{
                  fontSize: 15,
                  color: '#6b6b68',
                  lineHeight: 1.7,
                  paddingLeft: 36
                }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d28 100%)',
          padding: 48,
          borderRadius: 16,
          textAlign: 'center',
          color: '#faf9f7'
        }}>
          <Shield size={48} style={{ color: '#c9a96e', marginBottom: 24 }} />

          <h2 style={{
            fontSize: 28,
            fontWeight: 600,
            marginBottom: 16,
            fontFamily: "'Cormorant Garamond', Georgia, serif"
          }}>
            Still Need Help?
          </h2>

          <p style={{
            fontSize: 16,
            color: 'rgba(250, 249, 247, 0.8)',
            marginBottom: 32,
            maxWidth: 500,
            margin: '0 auto 32px'
          }}>
            Our support team is here to assist you with any questions or issues
          </p>

          <div style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link
              to="/contact"
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
                transition: 'all 0.2s'
              }}
            >
              <Mail size={20} />
              Contact Support
            </Link>

            <a
              href="tel:+911234567890"
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
                border: '1px solid rgba(250, 249, 247, 0.2)'
              }}
            >
              <Phone size={20} />
              Call Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

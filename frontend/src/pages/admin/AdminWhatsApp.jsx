import { useState, useEffect } from 'react';
import { MessageSquare, Phone, CheckCircle, XCircle, RefreshCw, Send, Users, BarChart3 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminWhatsApp() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'logs', 'analytics'
  const [qrCode, setQrCode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    fetchAnalytics();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/instances/default/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/whatsapp/logs?limit=50');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/whatsapp/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await api.post('/whatsapp/instances/create', {
        instanceId: 'default',
        name: 'NOREN Main Instance'
      });
      
      if (res.data.qrCode) {
        setQrCode(res.data.qrCode);
        toast.success('Scan QR code with WhatsApp');
        
        // Poll for connection status
        const pollInterval = setInterval(async () => {
          const statusRes = await api.get('/whatsapp/instances/default/status');
          if (statusRes.data.status === 'connected') {
            clearInterval(pollInterval);
            setQrCode(null);
            setStatus(statusRes.data);
            toast.success('WhatsApp connected successfully!');
            setIsConnecting(false);
          }
        }, 3000);

        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsConnecting(false);
        }, 120000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect WhatsApp');
      setIsConnecting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset WhatsApp connection? You will need to scan QR code again.')) {
      return;
    }
    
    try {
      await api.post('/whatsapp/instances/default/reset');
      toast.success('Connection reset. Please reconnect.');
      setStatus({ ...status, status: 'disconnected' });
      setQrCode(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset connection');
    }
  };

  const tabButtonStyle = (isActive) => ({
    flex: 1,
    padding: '12px 16px',
    background: isActive ? '#1a1a18' : '#fff',
    color: isActive ? '#faf9f7' : '#9e9a94',
    border: `1px solid ${isActive ? '#1a1a18' : '#e6e0d8'}`,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  });

  const cardStyle = {
    background: '#faf9f7',
    border: '1px solid #e6e0d8',
    padding: '24px',
    marginBottom: '20px',
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#c9a96e' }} />
        <p style={{ marginTop: 16, color: '#9e9a94' }}>Loading WhatsApp settings...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <MessageSquare size={28} style={{ color: '#25D366' }} />
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1a1a18', margin: 0 }}>
            WhatsApp Management
          </h1>
        </div>
        <p style={{ color: '#9e9a94', fontSize: 14 }}>
          Manage WhatsApp connection, view logs, and monitor analytics
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setActiveTab('status')} style={tabButtonStyle(activeTab === 'status')}>
          <Phone size={14} />
          Connection Status
        </button>
        <button onClick={() => setActiveTab('logs')} style={tabButtonStyle(activeTab === 'logs')}>
          <Send size={14} />
          Message Logs
        </button>
        <button onClick={() => setActiveTab('analytics')} style={tabButtonStyle(activeTab === 'analytics')}>
          <BarChart3 size={14} />
          Analytics
        </button>
      </div>

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div>
          {/* Connection Status Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a18', marginBottom: 8 }}>
                  Connection Status
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {status?.status === 'connected' ? (
                    <>
                      <CheckCircle size={20} style={{ color: '#22c55e' }} />
                      <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle size={20} style={{ color: '#ef4444' }} />
                      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>
                        Disconnected
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {status?.status === 'connected' ? (
                  <>
                    <button
                      onClick={fetchStatus}
                      style={{
                        padding: '10px 16px',
                        background: '#fff',
                        border: '1px solid #e6e0d8',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </button>
                    <button
                      onClick={handleReset}
                      style={{
                        padding: '10px 16px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Reset Connection
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    style={{
                      padding: '10px 16px',
                      background: '#25D366',
                      color: '#fff',
                      border: 'none',
                      cursor: isConnecting ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      opacity: isConnecting ? 0.6 : 1,
                    }}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect WhatsApp'}
                  </button>
                )}
              </div>
            </div>

            {status?.status === 'connected' && status?.phoneNumber && (
              <div style={{ 
                background: '#f0fdf4', 
                border: '1px solid #86efac',
                padding: '16px',
                marginTop: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Phone size={18} style={{ color: '#16a34a' }} />
                  <div>
                    <p style={{ fontSize: 11, color: '#166534', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Connected Number
                    </p>
                    <p style={{ fontSize: 16, color: '#166534', fontWeight: 700, margin: 0 }}>
                      {status.phoneNumber}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {qrCode && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 16 }}>
                  Scan this QR code with WhatsApp
                </p>
                <div style={{ 
                  display: 'inline-block',
                  padding: 20,
                  background: '#fff',
                  border: '2px solid #e6e0d8',
                }}>
                  <img src={qrCode} alt="WhatsApp QR Code" style={{ width: 256, height: 256 }} />
                </div>
                <p style={{ fontSize: 12, color: '#9e9a94', marginTop: 12 }}>
                  Open WhatsApp → Settings → Linked Devices → Link a Device
                </p>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>
                Features Active
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ fontSize: 13, color: '#5a5750', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: '#22c55e' }} />
                  Password Reset OTP
                </li>
                <li style={{ fontSize: 13, color: '#5a5750', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: '#22c55e' }} />
                  Phone Login/Signup
                </li>
                <li style={{ fontSize: 13, color: '#5a5750', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: '#22c55e' }} />
                  Order Notifications
                </li>
              </ul>
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', marginBottom: 12 }}>
                Setup URL
              </h3>
              <p style={{ fontSize: 12, color: '#9e9a94', marginBottom: 12 }}>
                Access the standalone setup page:
              </p>
              <a 
                href={`${api.defaults.baseURL.replace('/api', '')}/whatsapp-setup.html`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  background: '#f5f0e8',
                  border: '1px solid #e6e0d8',
                  color: '#c9a96e',
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                }}
              >
                Open Setup Page →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a18', margin: 0 }}>
              Recent Messages
            </h2>
            <button
              onClick={fetchLogs}
              style={{
                padding: '8px 12px',
                background: '#fff',
                border: '1px solid #e6e0d8',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9e9a94', padding: '40px 0' }}>
              No messages sent yet
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e6e0d8' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 11, fontWeight: 600, color: '#5a5750', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Phone
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 11, fontWeight: 600, color: '#5a5750', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Type
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 11, fontWeight: 600, color: '#5a5750', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Status
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 11, fontWeight: 600, color: '#5a5750', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0ece6' }}>
                      <td style={{ padding: '12px 8px', fontSize: 13, color: '#1a1a18' }}>
                        {log.phone_number}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 13, color: '#5a5750' }}>
                        {log.message_type || 'text'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          background: log.status === 'sent' ? '#f0fdf4' : '#fef2f2',
                          color: log.status === 'sent' ? '#16a34a' : '#dc2626',
                          border: `1px solid ${log.status === 'sent' ? '#86efac' : '#fecaca'}`,
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 12, color: '#9e9a94' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Send size={20} style={{ color: '#c9a96e' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', margin: 0 }}>
                  Total Sent
                </h3>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1a18', margin: 0 }}>
                {analytics?.totalSent || 0}
              </p>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', margin: 0 }}>
                  Delivered
                </h3>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#22c55e', margin: 0 }}>
                {analytics?.delivered || 0}
              </p>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <XCircle size={20} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', margin: 0 }}>
                  Failed
                </h3>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#ef4444', margin: 0 }}>
                {analytics?.failed || 0}
              </p>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Users size={20} style={{ color: '#c9a96e' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', margin: 0 }}>
                  Unique Users
                </h3>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1a18', margin: 0 }}>
                {analytics?.uniqueNumbers || 0}
              </p>
            </div>
          </div>

          {analytics?.byType && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a18', marginBottom: 16 }}>
                Messages by Type
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(analytics.byType).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#5a5750', textTransform: 'capitalize' }}>
                      {type}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

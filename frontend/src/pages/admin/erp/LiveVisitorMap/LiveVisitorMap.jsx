import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';
import Globe from './Globe.jsx';
import VisitorStats from './VisitorStats';
import MapFilters from './MapFilters';
import LiveVisitorTable from './LiveVisitorTable';
import VisitorDetails from './VisitorDetails';
import { useVisitorLocations } from './hooks/useVisitorLocations';

export default function LiveVisitorMap() {
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    campaign: '',
    source: '',
    medium: '',
    country: '',
    device: '',
    status: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    unique: 0,
    countries: 0,
    liveVisitors: 0,
    totalClicks: 0,
    conversionRate: 0,
  });

  const [visitors, setVisitors] = useState([]);
  const socketRef = useRef(null);
  const refreshTimer = useRef(null);

  const { locations: geoLocations } = useVisitorLocations(filters);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const visitorsRes = await api.get('/erp/utm/live-visitors', { params: filters });
      setVisitors(visitorsRes.data.visitors || []);

      const analyticsRes = await api.get('/erp/utm/analytics', { params: filters });
      const geoRes = await api.get('/erp/utm/geo-summary', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          campaign: filters.campaign,
          source: filters.source,
          medium: filters.medium,
          status: filters.status,
        },
      });

      setStats({
        total: analyticsRes.data.total || 0,
        unique: analyticsRes.data.unique || 0,
        countries: geoRes.data.unique_countries || 0,
        liveVisitors: analyticsRes.data.liveVisitors || 0,
        totalClicks: analyticsRes.data.total || 0,
        conversionRate: analyticsRes.data.conversionRate || 0,
      });
    } catch (err) {
      toast.error('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    const token = localStorage.getItem('noren_token');
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => fetchAnalytics(), 500);
    };

    socket.on('utm:click', scheduleRefresh);

    return () => {
      socket.off('utm:click', scheduleRefresh);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics();
    toast.success('Data refreshed');
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleVisitorSelect = (visitor) => {
    setSelectedVisitor(visitor);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Live Visitor Map</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>
            Real-time visitor locations and journey visualization
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRefresh}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 10,
              border: '1.5px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 10,
              border: 'none',
              background: '#1a1a18',
              color: '#faf9f7',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <VisitorStats stats={stats} loading={loading} />

      {/* Filters */}
      <MapFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Globe + Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, minHeight: 600 }}>
        {/* Globe */}
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #f3f4f6',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <Globe locations={geoLocations} onLocationSelect={handleVisitorSelect} />
        </div>

        {/* Right Panel - Selected Visitor or Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedVisitor ? (
            <VisitorDetails visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
          ) : (
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #f3f4f6',
                padding: 20,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 13, color: '#9ca3af' }}>
                Click on a marker or select a visitor to view details
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Visitors Table */}
      <LiveVisitorTable
        visitors={visitors}
        loading={loading}
        onVisitorSelect={handleVisitorSelect}
      />
      <div style={{ position: 'fixed', bottom: 20, right: 20, padding: 12, borderRadius: 16, background: 'rgba(14, 29, 64, 0.92)', color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#34d399' : '#9ca3af' }} />
        {socketConnected ? 'Realtime connected' : 'Realtime disconnected' }
      </div>
    </div>
  );
}

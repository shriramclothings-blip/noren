import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';
import CesiumGlobe from './CesiumGlobe.jsx';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0 12px', background: '#050f1d', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 0 2px' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>Live Visitor Map</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
            Real-time visitor locations and journey visualization
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.22)',
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.08)',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(79,70,229,0.28)',
            }}
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <VisitorStats stats={stats} loading={loading} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <MapFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, minHeight: 560 }}>
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(12, 18, 31, 0.92), rgba(5, 11, 20, 1))',
            borderRadius: 18,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 20px 45px rgba(2, 6, 23, 0.45)',
          }}
        >
          <CesiumGlobe 
            locations={geoLocations} 
            selectedVisitor={selectedVisitor}
            onLocationSelect={handleVisitorSelect} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedVisitor ? (
            <VisitorDetails visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
          ) : (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(8,12,28,0.98))',
                borderRadius: 18,
                border: '1px solid rgba(148, 163, 184, 0.18)',
                padding: 20,
                textAlign: 'center',
                minHeight: 180,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                boxShadow: '0 20px 30px rgba(2, 6, 23, 0.35)',
              }}
            >
              <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                Click on a marker or select a visitor to view details
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'linear-gradient(180deg, rgba(10,16,28,0.94), rgba(7,12,23,1))', borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)', overflow: 'hidden', boxShadow: '0 18px 40px rgba(2,6,23,0.32)' }}>
        <LiveVisitorTable
          visitors={visitors}
          loading={loading}
          onVisitorSelect={handleVisitorSelect}
        />
      </div>
      <div style={{ position: 'fixed', bottom: 20, right: 20, padding: 12, borderRadius: 16, background: 'rgba(14, 29, 64, 0.92)', color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.45)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#34d399' : '#9ca3af' }} />
        {socketConnected ? 'Realtime connected' : 'Realtime disconnected' }
      </div>
    </div>
  );
}

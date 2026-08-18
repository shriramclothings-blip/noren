import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Globe as GlobeIcon, Cpu, SunMedium, MoonStar } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';
import Globe from './Globe';
import CesiumGlobe from './CesiumGlobe';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';
import VisitorStats from './VisitorStats';
import MapFilters from './MapFilters';
import LiveVisitorTable from './LiveVisitorTable';
import VisitorDetails from './VisitorDetails';
import { useVisitorLocations } from './hooks/useVisitorLocations';

export default function LiveVisitorMap() {
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [themeMode, setThemeMode] = useState('dark');
  const [globeEngine, setGlobeEngine] = useState('three'); // Default: 'three' (Three.js 3D Cyber Globe)
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
  const isDark = themeMode === 'dark';

  const theme = {
    pageBg: '#060b17',
    panel: 'rgba(13, 19, 34, 0.94)',
    panelStrong: '#0a0f1d',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(56, 189, 248, 0.3)',
    text: '#ffffff',
    textMuted: '#94a3b8',
    textSoft: '#cbd5e1',
    shadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
    buttonBg: 'rgba(255, 255, 255, 0.06)',
    inputBg: '#070c18',
  };

  const { locations: geoLocations } = useVisitorLocations(filters);

  // Fetch live visitor records and analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const [visitorsRes, analyticsRes, geoRes] = await Promise.all([
        api.get('/erp/utm/live-visitors', { params: filters }),
        api.get('/erp/utm/analytics', { params: filters }),
        api.get('/erp/utm/geo-summary', { params: filters }),
      ]);

      const fetchedVisitors = visitorsRes.data.visitors || [];
      setVisitors(fetchedVisitors);

      // Auto-select latest active visitor by default if none selected
      if (fetchedVisitors.length > 0 && !selectedVisitor) {
        setSelectedVisitor(fetchedVisitors[0]);
      }

      setStats({
        total: analyticsRes.data.total || 0,
        unique: analyticsRes.data.unique || 0,
        countries: geoRes.data.unique_countries || 0,
        liveVisitors: analyticsRes.data.liveVisitors || 0,
        totalClicks: analyticsRes.data.total || 0,
        conversionRate: analyticsRes.data.conversionRate || 0,
      });
    } catch (err) {
      toast.error('Failed to update live visitor stream');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedVisitor]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Socket.io real-time connection
  useEffect(() => {
    const token = localStorage.getItem('noren_token');
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    const handleNewClick = (data) => {
      toast.custom((t) => (
        <div style={{ background: '#0b1220', border: '1px solid #38bdf8', padding: '10px 14px', borderRadius: 12, color: '#edf6ff', fontSize: 12, fontWeight: 600 }}>
          ⚡ New Visitor from {data.city || data.country || 'Global'}
        </div>
      ), { duration: 3000 });

      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => fetchAnalytics(), 300);
    };

    socket.on('utm:click', handleNewClick);

    return () => {
      socket.off('utm:click', handleNewClick);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics();
    toast.success('Live map refreshed');
  };

  // Determine active visitor to show in right panel (selected or first in list)
  const activeVisitor = selectedVisitor || (visitors.length > 0 ? visitors[0] : null);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: theme.pageBg,
        color: theme.text,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 20px 40px',
        boxSizing: 'border-box',
        borderRadius: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1600,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Top Control Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            padding: '12px 18px',
            background: '#0a0f1d',
            borderRadius: 16,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: '#34d399',
                background: 'rgba(52, 211, 153, 0.12)',
                padding: '4px 10px',
                borderRadius: 100,
                border: '1px solid rgba(52, 211, 153, 0.25)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'ping 2s infinite' }} />
              REAL-TIME LIVE STREAM
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: socketConnected ? '#38bdf8' : '#f43f5e',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '4px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: socketConnected ? '#38bdf8' : '#f43f5e' }} />
              {socketConnected ? 'Websocket Active' : 'Polling Sync'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Globe Engine Switcher */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#070c18',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 3,
                gap: 2,
              }}
            >
              <button
                onClick={() => setGlobeEngine('cesium')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: globeEngine === 'cesium' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                  color: globeEngine === 'cesium' ? '#fff' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <GlobeIcon size={13} /> Google Earth 3D
              </button>

              <button
                onClick={() => setGlobeEngine('three')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: globeEngine === 'three' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'transparent',
                  color: globeEngine === 'three' ? '#fff' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Cpu size={13} /> Cyber 3D Globe
              </button>
            </div>

            <button
              onClick={handleRefresh}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: theme.buttonBg,
                color: theme.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Top Analytics Cards */}
        <VisitorStats stats={stats} loading={loading} theme={theme} />

        {/* Filters */}
        <MapFilters filters={filters} onFilterChange={setFilters} theme={theme} />

        {/* Main Section: 3D Earth Globe + Visitor Detail Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16, minHeight: 560 }}>
          {/* Globe Canvas Container */}
          <div
            style={{
              background: '#0a0f1d',
              borderRadius: 20,
              border: `1px solid ${theme.border}`,
              overflow: 'hidden',
              boxShadow: theme.shadow,
              position: 'relative',
            }}
          >
            <WebGLErrorBoundary locations={geoLocations} onLocationSelect={setSelectedVisitor}>
              {globeEngine === 'cesium' ? (
                <CesiumGlobe
                  locations={geoLocations}
                  selectedVisitor={selectedVisitor}
                  onLocationSelect={setSelectedVisitor}
                />
              ) : (
                <Globe
                  locations={geoLocations}
                  selectedVisitor={selectedVisitor}
                  onLocationSelect={setSelectedVisitor}
                />
              )}
            </WebGLErrorBoundary>
          </div>

          {/* Visitor Details Panel (Always populated with selected or latest visitor) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <VisitorDetails visitor={activeVisitor} onClose={() => setSelectedVisitor(null)} theme={theme} />
          </div>
        </div>

        {/* Live Visitor Data Table */}
        <div
          style={{
            background: '#0a0f1d',
            borderRadius: 20,
            border: `1px solid ${theme.border}`,
            overflow: 'hidden',
            boxShadow: theme.shadow,
          }}
        >
          <LiveVisitorTable
            visitors={visitors}
            loading={loading}
            onVisitorSelect={setSelectedVisitor}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}

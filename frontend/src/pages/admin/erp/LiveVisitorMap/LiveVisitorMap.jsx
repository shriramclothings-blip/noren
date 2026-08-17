import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Download, SunMedium, MoonStar, Activity, MapPin } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';
import Globe from './Globe';
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

  const theme = isDark
    ? {
        pageBg: 'radial-gradient(ellipse at top, #090e1a 0%, #040812 50%, #020409 100%)',
        panel: 'rgba(9, 15, 29, 0.82)',
        panelStrong: 'rgba(11, 19, 36, 0.94)',
        border: 'rgba(148, 163, 184, 0.12)',
        borderStrong: 'rgba(56, 189, 248, 0.25)',
        text: '#edf6ff',
        textMuted: '#94a3b8',
        textSoft: '#cbd5e1',
        shadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        buttonBg: 'rgba(15, 23, 42, 0.9)',
        inputBg: 'rgba(15, 23, 42, 0.8)',
      }
    : {
        pageBg: 'radial-gradient(ellipse at top, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
        panel: 'rgba(255, 255, 255, 0.85)',
        panelStrong: 'rgba(255, 255, 255, 0.96)',
        border: 'rgba(148, 163, 184, 0.22)',
        borderStrong: 'rgba(56, 189, 248, 0.35)',
        text: '#0f172a',
        textMuted: '#64748b',
        textSoft: '#334155',
        shadow: '0 18px 50px rgba(15, 23, 42, 0.12)',
        buttonBg: 'rgba(255, 255, 255, 0.9)',
        inputBg: 'rgba(255, 255, 255, 0.9)',
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

      setVisitors(visitorsRes.data.visitors || []);

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
  }, [filters]);

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

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: theme.pageBg,
        color: theme.text,
        display: 'flex',
        justifyContent: 'center',
        padding: '12px 16px 32px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1560,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: theme.text, margin: 0, letterSpacing: '-0.02em' }}>
                Live Visitor Map
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#34d399',
                  background: 'rgba(52, 211, 153, 0.12)',
                  padding: '3px 8px',
                  borderRadius: 100,
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'ping 2s infinite' }} />
                REAL-TIME STREAM
              </span>
            </div>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: '4px 0 0' }}>
              Futuristic 3D Earth visualization of real-time global traffic & UTM campaigns
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 10,
                border: `1px solid ${theme.borderStrong}`,
                background: theme.panelStrong,
                color: theme.text,
                cursor: 'pointer',
              }}
              title={isDark ? 'Light theme' : 'Dark theme'}
            >
              {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
            </button>

            <button
              onClick={handleRefresh}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                border: `1px solid ${theme.borderStrong}`,
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

        {/* 3D Earth Globe + Detail Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, minHeight: 560 }}>
          <div
            style={{
              background: theme.panelStrong,
              borderRadius: 24,
              border: `1px solid ${theme.border}`,
              overflow: 'hidden',
              boxShadow: theme.shadow,
              position: 'relative',
            }}
          >
            <WebGLErrorBoundary locations={geoLocations} onLocationSelect={setSelectedVisitor}>
              <Globe
                locations={geoLocations}
                selectedVisitor={selectedVisitor}
                onLocationSelect={setSelectedVisitor}
              />
            </WebGLErrorBoundary>
          </div>

          {/* Visitor Details Panel */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedVisitor ? (
              <VisitorDetails visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} theme={theme} />
            ) : (
              <div
                style={{
                  height: '100%',
                  minHeight: 280,
                  background: theme.panelStrong,
                  borderRadius: 24,
                  border: `1px solid ${theme.border}`,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: theme.textMuted,
                  boxShadow: theme.shadow,
                }}
              >
                <MapPin size={36} color="#38bdf8" style={{ marginBottom: 12, opacity: 0.6 }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>Select a Visitor</div>
                <div style={{ fontSize: 12, marginTop: 4, maxWidth: 220 }}>
                  Click any glowing marker on the 3D Earth or a row in the live table to inspect session details.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Visitor Data Table */}
        <div
          style={{
            background: theme.panelStrong,
            borderRadius: 24,
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

        {/* Floating Socket Connection Status */}
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            padding: '8px 12px',
            borderRadius: 12,
            background: 'rgba(6, 11, 24, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#edf6ff',
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backdropFilter: 'blur(10px)',
            zIndex: 100,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#34d399' : '#f43f5e' }} />
          {socketConnected ? 'Live Websocket Active' : 'Polling Sync Mode'}
        </div>
      </div>
    </div>
  );
}

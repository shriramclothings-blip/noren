import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Download, SunMedium, MoonStar } from 'lucide-react';
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
        pageBg: 'radial-gradient(circle at top, #0b1220 0%, #030915 42%, #02070f 100%)',
        panel: 'rgba(10, 16, 28, 0.8)',
        panelStrong: 'rgba(17, 24, 39, 0.94)',
        panelSubtle: 'rgba(15, 23, 42, 0.72)',
        border: 'rgba(148, 163, 184, 0.12)',
        borderStrong: 'rgba(125, 211, 252, 0.24)',
        text: '#edf6ff',
        textMuted: '#9ab0c8',
        textSoft: '#cbd5e1',
        accent: '#7c3aed',
        accentSoft: '#4f46e5',
        accentCyan: '#38bdf8',
        accentGreen: '#34d399',
        shadow: '0 24px 80px rgba(2, 6, 23, 0.6)',
        buttonBg: 'rgba(15, 23, 42, 0.9)',
        inputBg: 'rgba(15, 23, 42, 0.78)',
        navBg: 'rgba(8, 12, 20, 0.75)',
      }
    : {
        pageBg: 'radial-gradient(circle at top, #f6f9ff 0%, #eef4ff 35%, #e8edf7 100%)',
        panel: 'rgba(255, 255, 255, 0.78)',
        panelStrong: 'rgba(255, 255, 255, 0.94)',
        panelSubtle: 'rgba(240, 244, 255, 0.76)',
        border: 'rgba(148, 163, 184, 0.22)',
        borderStrong: 'rgba(96, 165, 250, 0.28)',
        text: '#0f172a',
        textMuted: '#53627b',
        textSoft: '#334155',
        accent: '#6d5efc',
        accentSoft: '#3b82f6',
        accentCyan: '#0ea5e9',
        accentGreen: '#10b981',
        shadow: '0 22px 60px rgba(15, 23, 42, 0.12)',
        buttonBg: 'rgba(255, 255, 255, 0.82)',
        inputBg: 'rgba(255, 255, 255, 0.82)',
        navBg: 'rgba(255,255,255,0.68)',
      };

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
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: theme.pageBg,
        color: theme.text,
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 10px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1560,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: '8px 0 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            padding: '4px 6px 2px',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: theme.text, margin: 0, letterSpacing: '-0.03em' }}>Live Visitor Map</h2>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: '4px 0 0' }}>
              Real-time visitor locations and journey visualization
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: 42,
                height: 42,
                borderRadius: 12,
                border: `1px solid ${theme.borderStrong}`,
                background: theme.panelStrong,
                color: theme.text,
                cursor: 'pointer',
                boxShadow: isDark ? '0 10px 30px rgba(14, 165, 233, 0.15)' : '0 10px 24px rgba(87, 100, 255, 0.12)',
              }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
            </button>

            <button
              onClick={handleRefresh}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 12,
                border: `1px solid ${theme.borderStrong}`,
                background: theme.buttonBg,
                color: theme.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: isDark ? 'inset 0 0 0 1px rgba(148,163,184,0.04)' : 'inset 0 0 0 1px rgba(71,85,105,0.04)',
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
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 12px 24px rgba(79,70,229,0.28)',
              }}
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <VisitorStats stats={stats} loading={loading} theme={theme} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <MapFilters filters={filters} onFilterChange={handleFilterChange} theme={theme} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 16, minHeight: 560 }}>
          <div
            style={{
              background: isDark ? 'linear-gradient(180deg, rgba(10, 17, 27, 0.96), rgba(3, 9, 18, 1))' : 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(239,245,255,0.96))',
              borderRadius: 24,
              border: `1px solid ${theme.border}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: theme.shadow,
            }}
          >
            <CesiumGlobe
              locations={geoLocations}
              selectedVisitor={selectedVisitor}
              onLocationSelect={handleVisitorSelect}
              themeMode={themeMode}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedVisitor ? (
              <VisitorDetails visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} theme={theme} />
            ) : (
              <div
                style={{
                  background: isDark ? 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(8,12,28,0.98))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(240,245,255,0.96))',
                  borderRadius: 24,
                  border: `1px solid ${theme.border}`,
                  padding: 20,
                  textAlign: 'center',
                  minHeight: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.textSoft,
                  boxShadow: theme.shadow,
                }}
              >
                <div style={{ fontSize: 13, color: theme.textSoft }}>
                  Click on a marker or select a visitor to view details
                </div>
              </div>
            )}
          </div>
        </div>

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
            onVisitorSelect={handleVisitorSelect}
            theme={theme}
          />
        </div>

        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            padding: 12,
            borderRadius: 16,
            background: isDark ? 'rgba(14, 29, 64, 0.92)' : 'rgba(255, 255, 255, 0.85)',
            color: isDark ? '#fff' : '#0f172a',
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: `1px solid ${theme.borderStrong}`,
            boxShadow: theme.shadow,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#34d399' : '#9ca3af' }} />
          {socketConnected ? 'Realtime connected' : 'Realtime disconnected'}
        </div>
      </div>
    </div>
  );
}

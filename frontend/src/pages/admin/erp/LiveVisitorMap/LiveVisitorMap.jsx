import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';
import Globe from './Globe';
import VisitorStats from './VisitorStats';
import MapFilters from './MapFilters';
import LiveVisitorTable from './LiveVisitorTable';
import VisitorDetails from './VisitorDetails';
import { useVisitorLocations } from './hooks/useVisitorLocations';

export default function LiveVisitorMap() {
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    campaign: '',
    source: '',
    medium: '',
    country: '',
    device: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    unique: 0,
    countries: 0,
    totalClicks: 0,
    conversionRate: 0,
  });

  const [visitors, setVisitors] = useState([]);

  const { locations: geoLocations } = useVisitorLocations(filters);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch live visitors
      const visitorsRes = await api.get('/erp/utm/live-visitors', { params: filters });
      setVisitors(visitorsRes.data.visitors || []);

      // Fetch analytics
      const analyticsRes = await api.get('/erp/utm/analytics', { params: filters });

      // Fetch geo summary
      const geoRes = await api.get('/erp/utm/geo-summary', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });

      setStats({
        total: analyticsRes.data.total || 0,
        unique: analyticsRes.data.unique || 0,
        countries: geoRes.data.unique_countries || 0,
        totalClicks: analyticsRes.data.total || 0,
        conversionRate: 3.24,
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
    </div>
  );
}

import { ChevronDown, X, Filter } from 'lucide-react';
import { useState } from 'react';

export default function MapFilters({ filters, onFilterChange, theme }) {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleReset = () => {
    onFilterChange({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      campaign: '',
      source: '',
      medium: '',
      country: '',
      device: '',
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== filters.startDate && v !== filters.endDate).length;

  const inp = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
    color: '#ffffff',
    background: '#090e1a',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        background: '#0d1322',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 20px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid rgba(255, 255, 255, 0.07)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={15} color="#8b5cf6" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Filter Visitor Activity</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#8b5cf6',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          style={{
            color: '#94a3b8',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => handleChange('endDate', e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                Campaign
              </label>
              <input
                type="text"
                placeholder="All campaigns"
                value={filters.campaign}
                onChange={e => handleChange('campaign', e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                Source
              </label>
              <select
                value={filters.source}
                onChange={e => handleChange('source', e.target.value)}
                style={inp}
              >
                <option value="">All sources</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                Medium
              </label>
              <select
                value={filters.medium}
                onChange={e => handleChange('medium', e.target.value)}
                style={inp}
              >
                <option value="">All mediums</option>
                <option value="social">Social</option>
                <option value="email">Email</option>
                <option value="paid">Paid</option>
                <option value="organic">Organic</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                Country
              </label>
              <input
                type="text"
                placeholder="All countries"
                value={filters.country}
                onChange={e => handleChange('country', e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                Device
              </label>
              <select
                value={filters.device}
                onChange={e => handleChange('device', e.target.value)}
                style={inp}
              >
                <option value="">All devices</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={13} /> Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

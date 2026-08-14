import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

export default function MapFilters({ filters, onFilterChange }) {
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
    fontSize: 13,
    border: '1.5px solid rgba(148,163,184,0.2)',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
    color: '#e2e8f0',
    background: 'rgba(15, 23, 42, 0.9)',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.78)',
        borderRadius: 14,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        overflow: 'hidden',
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
          padding: '14px 18px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid rgba(148,163,184,0.18)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Filters</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
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
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1.5px solid #e5e7eb',
                background: '#f9fafb',
                color: '#374151',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={12} /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

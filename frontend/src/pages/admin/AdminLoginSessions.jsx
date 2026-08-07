import { useState, useEffect, useCallback } from 'react';
import { Search, Monitor, Smartphone, Tablet, Globe, Shield, ShieldAlert, MapPin, Wifi, Clock, LogOut, RefreshCw, User, Filter, ExternalLink } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtDuration = (secs) => {
  if (!secs || secs < 0) return null;
  if (secs < 60)   return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
};

function DeviceIcon({ type, size = 14 }) {
  if (type === 'mobile')  return <Smartphone size={size} />;
  if (type === 'tablet')  return <Tablet size={size} />;
  return <Monitor size={size} />;
}

const AUTH_COLOR = {
  local:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Password' },
  google:   { bg: '#fef2f2', color: '#dc2626', label: 'Google'   },
  register: { bg: '#f0fdf4', color: '#166534', label: 'Register' },
};

/** Build a human-readable location name from city / region / country fields */
function buildLocationName(s) {
  const parts = [s.city, s.region, s.country].filter(Boolean);
  return parts.length ? parts.join(', ') : (s.location || null);
}

/** Small precise map — Google Maps static embed with exact pin */
function MiniMap({ lat, lon, locationName }) {
  if (!lat || !lon) return null;

  const latN = Number(lat);
  const lonN = Number(lon);
  // Google Maps embed — shows precise pin at exact coordinates, zoom 13 = city block level
  const mapUrl  = `https://maps.google.com/maps?q=${latN},${lonN}&z=13&output=embed`;
  const gLink   = `https://www.google.com/maps/search/?api=1&query=${latN},${lonN}`;

  return (
    <div style={{ background: '#faf9f7', borderRadius: 10, border: '1px solid #f0ebe3', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #f0ebe3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} color="#c9a96e" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a96e' }}>Location</span>
        </div>
        <a href={gLink} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6b7280', textDecoration: 'none', fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.color = '#c9a96e'}
          onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
          Open in Google Maps <ExternalLink size={10} />
        </a>
      </div>
      {locationName && (
        <div style={{ padding: '8px 14px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={12} color="#374151" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{locationName}</span>
        </div>
      )}
      <div style={{ padding: '2px 14px 8px', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
        {latN.toFixed(5)}, {lonN.toFixed(5)}
      </div>
      <iframe
        src={mapUrl}
        title={`Map — ${locationName || 'Login location'}`}
        style={{ width: '100%', height: 220, border: 'none', display: 'block' }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function SessionCard({ s, onTerminate }) {
  const [open, setOpen] = useState(false);
  const auth = AUTH_COLOR[s.auth_method] || AUTH_COLOR.local;
  const locationName = buildLocationName(s);
  const hasMap = !!(s.latitude && s.longitude);

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${s.is_suspicious ? '#fecaca' : '#f3f4f6'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>

      {/* Header row */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}
        onClick={() => setOpen(o => !o)}>

        {/* Avatar */}
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {s.user_name?.[0]?.toUpperCase() || '?'}
        </div>

        {/* User + device info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.user_name || 'Unknown'}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{s.user_role}</span>
            {/* Active badge */}
            {s.is_active
              ? <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 100 }}>🟢 Active</span>
              : <span style={{ fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 100 }}>Ended</span>
            }
            {/* Suspicious */}
            {s.is_suspicious && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 3 }}>
                <ShieldAlert size={10} /> New Location
              </span>
            )}
            {/* Auth method */}
            <span style={{ fontSize: 10, fontWeight: 700, background: auth.bg, color: auth.color, padding: '2px 8px', borderRadius: 100 }}>
              {auth.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <DeviceIcon type={s.device_type} size={12} />
              {s.device_model || s.device_type}
            </span>
            <span>{s.browser} {s.browser_version}</span>
            <span>{s.os}</span>
            {/* Location name shown prominently in header */}
            {locationName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: hasMap ? '#374151' : '#6b7280', fontWeight: hasMap ? 600 : 400 }}>
                <MapPin size={11} color={hasMap ? '#c9a96e' : '#9ca3af'} />
                {locationName}
                {hasMap && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>MAP</span>}
              </span>
            )}
          </div>
        </div>

        {/* Time */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{fmtDate(s.logged_in_at)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmtTime(s.logged_in_at)}</div>
        </div>

        <span style={{ color: '#9ca3af', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>

          {/* Identity */}
          <div style={{ background: '#faf9f7', borderRadius: 10, padding: '12px 14px', border: '1px solid #f0ebe3' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>User</p>
            {[
              { icon: User,  label: 'Name',    val: s.user_name },
              { icon: Globe, label: 'Email',   val: s.user_email },
              { icon: Shield,label: 'Role',    val: s.user_role },
              { icon: Shield,label: 'Auth',    val: auth.label },
            ].map(r => r.val ? (
              <div key={r.label} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <r.icon size={12} color="#c9a96e" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 60 }}>{r.label}</span>
                <span style={{ fontSize: 12, color: '#111827', fontWeight: 500, wordBreak: 'break-all' }}>{r.val}</span>
              </div>
            ) : null)}
          </div>

          {/* Network */}
          <div style={{ background: '#faf9f7', borderRadius: 10, padding: '12px 14px', border: '1px solid #f0ebe3' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Network</p>
            {[
              { icon: Wifi,    label: 'IP Address', val: s.ip_address, mono: true },
              { icon: Globe,   label: 'ISP',        val: s.isp },
              { icon: MapPin,  label: 'City',       val: s.city },
              { icon: MapPin,  label: 'Region',     val: s.region },
              { icon: Globe,   label: 'Country',    val: s.country ? `${s.country} (${s.country_code})` : null },
              { icon: Clock,   label: 'Timezone',   val: s.timezone },
              { icon: MapPin,  label: 'Coords',     val: (s.latitude && s.longitude) ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : null },
            ].map(r => r.val ? (
              <div key={r.label} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <r.icon size={12} color="#c9a96e" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 60 }}>{r.label}</span>
                <span style={{ fontSize: 12, color: '#111827', fontWeight: 500, fontFamily: r.mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{r.val}</span>
              </div>
            ) : null)}
          </div>

          {/* Device & Session */}
          <div style={{ background: '#faf9f7', borderRadius: 10, padding: '12px 14px', border: '1px solid #f0ebe3' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Device & Session</p>
            {[
              { icon: Monitor, label: 'Device',     val: s.device_model ? `${s.device_model} (${s.device_type})` : s.device_type },
              { icon: Globe,   label: 'Browser',    val: s.browser ? `${s.browser} ${s.browser_version || ''}`.trim() : null },
              { icon: Monitor, label: 'OS',         val: s.os },
              { icon: Clock,   label: 'Login At',   val: `${fmtDate(s.logged_in_at)} ${fmtTime(s.logged_in_at)}` },
              { icon: Clock,   label: 'Logout At',  val: s.logged_out_at ? `${fmtDate(s.logged_out_at)} ${fmtTime(s.logged_out_at)}` : null },
              { icon: Clock,   label: 'Duration',   val: fmtDuration(s.duration_seconds) },
              { icon: Shield,  label: 'Session ID', val: String(s.id), mono: true },
            ].map(r => r.val ? (
              <div key={r.label} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <r.icon size={12} color="#c9a96e" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 70 }}>{r.label}</span>
                <span style={{ fontSize: 12, color: '#111827', fontWeight: 500, fontFamily: r.mono ? 'monospace' : 'inherit' }}>{r.val}</span>
              </div>
            ) : null)}
            {/* UA string */}
            <div style={{ marginTop: 8, padding: '6px 8px', background: '#f3f4f6', borderRadius: 6, fontSize: 10, color: '#6b7280', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
              {s.user_agent?.slice(0, 220)}{s.user_agent?.length > 220 ? '…' : ''}
            </div>
          </div>

          {/* Location map — full-width row when lat/lon available */}
          {hasMap && (
            <div style={{ gridColumn: '1 / -1' }}>
              <MiniMap lat={s.latitude} lon={s.longitude} locationName={locationName} />
            </div>
          )}

          {/* No-coordinates fallback: show location name in a card */}
          {!hasMap && locationName && (
            <div style={{ gridColumn: '1 / -1', background: '#faf9f7', borderRadius: 10, padding: '12px 14px', border: '1px solid #f0ebe3', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={14} color="#c9a96e" />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9a96e', margin: 0, marginBottom: 2 }}>Location</p>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{locationName}</span>
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>(coordinates not available)</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {s.is_active && onTerminate && (
            <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 4 }}>
              <button onClick={() => onTerminate(s.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #ef4444', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                <LogOut size={13} /> Terminate Session
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminLoginSessions() {
  const [tab, setTab]           = useState('live');   // 'live' | 'history'
  const [sessions, setSessions] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [filterDevice, setFilterDevice] = useState('');
  const [filterAuth, setFilterAuth]     = useState('');
  const [backfilling, setBackfilling]   = useState(false);
  const LIMIT = 20;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search.trim()) p.set('search', search.trim());
      const endpoint = tab === 'live'
        ? `/erp/sessions/live?${p}`
        : `/erp/sessions/history?${p}`;
      const res = await api.get(endpoint);
      setSessions(res.data.sessions || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { setPage(1); }, [tab, search]);

  const terminate = async (sessionId) => {
    if (!confirm('Force-terminate this session?')) return;
    try {
      await api.delete(`/erp/sessions/${sessionId}`);
      toast.success('Session terminated');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to terminate');
    }
  };

  const backfillGeo = async () => {
    if (!confirm('This will fetch location data for all sessions that are missing it. Continue?')) return;
    setBackfilling(true);
    try {
      const res = await api.post('/erp/sessions/backfill-geo');
      toast.success(res.data.message || 'Location data updated');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  };

  // Client-side filter by device / auth after fetch
  const filtered = sessions.filter(s => {
    if (filterDevice && s.device_type !== filterDevice) return false;
    if (filterAuth   && s.auth_method  !== filterAuth)   return false;
    return true;
  });

  const totalPages = Math.ceil(total / LIMIT);

  // Stats
  const liveCount      = sessions.filter(s => s.is_active).length;
  const suspiciousCount = sessions.filter(s => s.is_suspicious).length;
  const mobileCount    = sessions.filter(s => s.device_type === 'mobile').length;
  const uniqueIPs      = new Set(sessions.map(s => s.ip_address)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Login Sessions</h2>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Every login captured — IP address, browser, device, location, and session status</p>
        </div>
        <button
          onClick={backfillGeo}
          disabled={backfilling}
          title="Fetch missing location/map data for all sessions"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #c9a96e', background: backfilling ? '#fef3c7' : '#fff7ed', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: backfilling ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: backfilling ? 0.7 : 1 }}
        >
          <MapPin size={13} />
          {backfilling ? 'Fetching locations…' : 'Fix Location Data'}
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total',       value: total,          color: '#111827', bg: '#f9fafb', icon: '📋' },
          { label: 'Active Now',  value: liveCount,      color: '#166534', bg: '#dcfce7', icon: '🟢' },
          { label: 'Suspicious',  value: suspiciousCount,color: '#991b1b', bg: '#fee2e2', icon: '⚠️' },
          { label: 'Unique IPs',  value: uniqueIPs,      color: '#1e40af', bg: '#dbeafe', icon: '🌐' },
          { label: 'Mobile',      value: mobileCount,    color: '#5a5750', bg: '#f5f0e8', icon: '📱' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, borderRadius: 12, padding: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab + Toolbar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'live',    label: '🟢 Live Sessions'  },
            { key: 'history', label: '📋 All History' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#111827' : '#6b7280', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, IP, location..."
              style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, fontSize: 12, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', width: 230 }} />
          </div>

          {/* Device filter */}
          <select value={filterDevice} onChange={e => setFilterDevice(e.target.value)}
            style={{ padding: '8px 10px', fontSize: 12, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#374151', cursor: 'pointer' }}>
            <option value="">All Devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>

          {/* Auth filter */}
          <select value={filterAuth} onChange={e => setFilterAuth(e.target.value)}
            style={{ padding: '8px 10px', fontSize: 12, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#374151', cursor: 'pointer' }}>
            <option value="">All Methods</option>
            <option value="local">Password</option>
            <option value="google">Google</option>
            <option value="register">Register</option>
          </select>

          {/* Refresh */}
          <button onClick={fetchSessions}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Sessions list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 64, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          {search || filterDevice || filterAuth ? 'No sessions match your filters.' : tab === 'live' ? 'No active sessions right now.' : 'No login history found.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => (
            <SessionCard key={s.id} s={s} onTerminate={tab === 'live' ? terminate : null} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#9ca3af' }}>{total} total sessions</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
            <span style={{ padding: '6px 12px', background: '#f9fafb', borderRadius: 9, fontWeight: 600, color: '#6b7280' }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

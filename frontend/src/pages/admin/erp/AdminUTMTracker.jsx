import { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, Trash2, BarChart2, Copy, Check, RefreshCw, X, Monitor, Smartphone, Tablet, MapPin, Globe, ChevronDown, ChevronUp, ExternalLink, MapPinned } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import LiveVisitorMap from './LiveVisitorMap/LiveVisitorMap.jsx';

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://noren-iqk3.onrender.com';
const SITE    = 'https://www.norenfastion.shop';

const SOURCES = ['whatsapp', 'instagram', 'facebook', 'email', 'sms', 'telegram', 'youtube', 'twitter', 'google', 'other'];
const MEDIUMS = ['social', 'message', 'email', 'organic', 'paid', 'referral', 'influencer'];

const inp = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  outline: 'none', fontFamily: 'inherit', color: '#111827',
  background: '#fff', boxSizing: 'border-box',
};

function DeviceIcon({ type }) {
  if (type === 'mobile')  return <Smartphone size={13} color="#6b7280" />;
  if (type === 'tablet')  return <Tablet size={13} color="#6b7280" />;
  return <Monitor size={13} color="#6b7280" />;
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} title="Copy link"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: copied ? '#f0fdf4' : '#f9fafb', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: copied ? '#16a34a' : '#374151', whiteSpace: 'nowrap' }}>
      {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  );
}

function ClicksDrawer({ link, onClose }) {
  const [clicks, setClicks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/erp/utm/links/${link.id}/clicks`)
      .then(r => setClicks(r.data.clicks || []))
      .catch(() => toast.error('Failed to load clicks'))
      .finally(() => setLoading(false));
  }, [link.id]);

  const fmtDt = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 780, background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 40px)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{link.name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0' }}>
              <span style={{ color: '#111827', fontWeight: 600 }}>{link.total_clicks}</span> total clicks &nbsp;·&nbsp;
              <span style={{ color: '#c9a96e', fontWeight: 600 }}>{link.unique_clicks}</span> unique visitors
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={15} color="#374151" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading clicks...</div>
          ) : clicks.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <BarChart2 size={40} color="#e5e7eb" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>No clicks yet</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Share the link to start tracking visitors.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#f9fafb' }}>
                  {['Time', 'Location', 'Device & Model', 'Browser / OS'].map(h => (
                    <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clicks.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 20px', whiteSpace: 'nowrap', color: '#374151', fontSize: 12 }}>{fmtDt(c.clicked_at)}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <MapPin size={12} color="#c9a96e" />
                        <span style={{ color: '#111827', fontWeight: 500, fontSize: 13 }}>
                          {[c.city, c.region, c.country].filter(Boolean).join(', ') || <span style={{ color: '#d1d5db' }}>Unknown</span>}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', paddingLeft: 17 }}>{c.ip_address}</div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DeviceIcon type={c.device_type} />
                        <div>
                          <div style={{ color: '#111827', fontWeight: 500, fontSize: 13 }}>{c.device_model || '—'}</div>
                          <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'capitalize' }}>{c.device_type}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>{c.browser || '—'}</div>
                      <div style={{ color: '#9ca3af', fontSize: 11 }}>{c.os || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f3f4f6', background: '#fafafa', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Showing latest {clicks.length} clicks</span>
          <button onClick={onClose}
            style={{ padding: '7px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUTMTracker() {
  const [activeTab, setActiveTab] = useState('links');
  const [links,     setLinks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [selected,  setSelected]  = useState(null); // link to show clicks for
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', destination: SITE + '/', source: 'whatsapp', medium: 'social', campaign: '',
  });

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/erp/utm/links');
      setLinks(r.data.links || []);
    } catch { toast.error('Failed to load links'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.destination.trim()) return toast.error('Name and destination are required');
    setSubmitting(true);
    try {
      await api.post('/erp/utm/links', form);
      toast.success('Tracking link created');
      setShowForm(false);
      setForm({ name: '', destination: SITE + '/', source: 'whatsapp', medium: 'social', campaign: '' });
      fetchLinks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? All click data will be lost.`)) return;
    try {
      await api.delete(`/erp/utm/links/${id}`);
      toast.success('Link deleted');
      fetchLinks();
    } catch { toast.error('Failed to delete'); }
  };

  const trackUrl = (slug) => `${BACKEND}/t/${slug}`;

  const sourceColor = (src) => ({
    whatsapp:  { bg: '#dcfce7', color: '#15803d' },
    instagram: { bg: '#fce7f3', color: '#be185d' },
    facebook:  { bg: '#dbeafe', color: '#1d4ed8' },
    email:     { bg: '#f3f4f6', color: '#374151' },
    sms:       { bg: '#fef9c3', color: '#854d0e' },
    telegram:  { bg: '#e0f2fe', color: '#0369a1' },
    youtube:   { bg: '#fee2e2', color: '#b91c1c' },
    twitter:   { bg: '#f1f5f9', color: '#0f172a' },
    google:    { bg: '#fff7ed', color: '#c2410c' },
  }[src] || { bg: '#f3f4f6', color: '#374151' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Module Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb', pb: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('links')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'links' ? '#111827' : '#f3f4f6',
              color: activeTab === 'links' ? '#fff' : '#4b5563',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Link2 size={15} /> Tracking Links
          </button>

          <button
            onClick={() => setActiveTab('map')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'map' ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f3f4f6',
              color: activeTab === 'map' ? '#fff' : '#4b5563',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeTab === 'map' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none',
            }}
          >
            <MapPinned size={15} /> Live Visitor Map 3D
          </button>
        </div>

        {activeTab === 'links' && (
          <button onClick={() => setShowForm(s => !s)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: showForm ? '#f3f4f6' : '#1a1a18', color: showForm ? '#374151' : '#faf9f7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Link</>}
          </button>
        )}
      </div>

      {/* Render Active Tab */}
      {activeTab === 'map' ? (
        <LiveVisitorMap />
      ) : (
        <>


      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate}
          style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>Create Tracking Link</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Link Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. WhatsApp Campaign Aug" style={inp} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Destination URL *</label>
              <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="https://www.norenfastion.shop/shop" style={inp} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Source</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inp}>
                {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Medium</label>
              <select value={form.medium} onChange={e => setForm(f => ({ ...f, medium: e.target.value }))} style={inp}>
                {MEDIUMS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Campaign Name</label>
              <input value={form.campaign} onChange={e => setForm(f => ({ ...f, campaign: e.target.value }))}
                placeholder="e.g. eid-sale-2025" style={inp} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={submitting}
              style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#c9a96e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Creating…' : 'Create Link'}
            </button>
          </div>
        </form>
      )}

      {/* Links list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: 'linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
        </div>
      ) : links.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 60, textAlign: 'center' }}>
          <Link2 size={40} color="#e5e7eb" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No tracking links yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Create your first link to start tracking where your visitors come from.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map(link => {
            const sc = sourceColor(link.source);
            const url = trackUrl(link.slug);
            return (
              <div key={link.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{link.name}</span>
                      {link.source && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                          {link.source}
                        </span>
                      )}
                      {link.medium && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: '#f3f4f6', color: '#6b7280', textTransform: 'capitalize' }}>
                          {link.medium}
                        </span>
                      )}
                      {link.campaign && (
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>#{link.campaign}</span>
                      )}
                    </div>

                    {/* Tracking URL */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 8, padding: '6px 10px', marginBottom: 6 }}>
                      <Link2 size={12} color="#9ca3af" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {url}
                      </span>
                      <CopyBtn text={url} />
                      <a href={url} target="_blank" rel="noopener noreferrer" title="Test link">
                        <ExternalLink size={12} color="#9ca3af" />
                      </a>
                    </div>

                    {/* Destination */}
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      → {link.destination}
                    </p>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{link.total_clicks}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Clicks</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#c9a96e', lineHeight: 1 }}>{link.unique_clicks}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unique</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setSelected(link)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #c9a96e', background: '#fff7ed', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <BarChart2 size={13} /> Details
                      </button>
                      <button onClick={() => handleDelete(link.id, link.name)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clicks drawer */}
      {selected && <ClicksDrawer link={selected} onClose={() => setSelected(null)} />}

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </>
      )}
    </div>
  );
}


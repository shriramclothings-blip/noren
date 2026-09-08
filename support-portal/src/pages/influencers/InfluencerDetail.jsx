import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Link as LinkIcon, Ticket, TrendingUp, Plus } from 'lucide-react';
import { getInfluencer, getInfluencerTickets, getInfluencerCampaigns, getInfluencerLinks } from '../../api/influencers';
import { PageLoader } from '../../components/ui/Spinner';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { formatDate, formatCurrency, timeAgo, truncate } from '../../lib/utils';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{label}</button>
  );
}

export default function InfluencerDetail() {
  const { id } = useParams();
  const [inf, setInf] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const iRes = await getInfluencer(id);
        setInf(iRes.data.influencer || iRes.data.profile || iRes.data);
        const [tRes, cRes, lRes] = await Promise.all([
          getInfluencerTickets(id),
          getInfluencerCampaigns(id),
          getInfluencerLinks(id),
        ]);
        setTickets(tRes.data.tickets || []);
        setCampaigns(cRes.data.campaigns || []);
        setLinks(lRes.data.links || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!inf) return <div className="p-4">Influencer not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/influencers" className="btn btn-ghost btn-sm p-1.5"><ArrowLeft size={15} /></Link>
        <h1 className="text-lg font-semibold">{inf.display_name || inf.name}</h1>
        <button className="btn btn-primary btn-sm ml-auto" onClick={() => setShowCreate(true)}>
          <Plus size={12} /> Create Ticket
        </button>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          {inf.profile_photo ? (
            <img src={inf.profile_photo} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}>
              {(inf.display_name || 'I')[0]}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{inf.display_name}</h2>
              <span className={`badge capitalize ${inf.status === 'active' ? 'bg-green-100 text-green-800' : inf.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{inf.status}</span>
              {inf.fraud_status !== 'normal' && <span className="badge bg-red-100 text-red-800 capitalize">{inf.fraud_status}</span>}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>@{inf.username} · {inf.category}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t border-[var(--border)]">
          {[
            { label: 'Clicks', value: (inf.total_clicks || 0).toLocaleString() },
            { label: 'Unique', value: (inf.total_unique_visitors || 0).toLocaleString() },
            { label: 'Orders', value: inf.total_orders || 0 },
            { label: 'Revenue', value: formatCurrency(inf.total_revenue) },
            { label: 'Commission', value: formatCurrency(inf.total_commission) },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--border)] flex gap-0">
        <Tab label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
        <Tab label={`Tickets (${tickets.length})`} active={tab === 'tickets'} onClick={() => setTab('tickets')} />
        <Tab label={`Campaigns (${campaigns.length})`} active={tab === 'campaigns'} onClick={() => setTab('campaigns')} />
        <Tab label={`Links (${links.length})`} active={tab === 'links'} onClick={() => setTab('links')} />
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4 text-xs space-y-2">
            <h3 className="font-semibold mb-2">Profile</h3>
            {[
              ['Commission', `${inf.commission_rate}% (${inf.commission_type})`],
              ['Agreement', inf.agreement_status],
              ['Contract', inf.contract_start_date ? `${formatDate(inf.contract_start_date)} → ${formatDate(inf.contract_end_date)}` : '—'],
              ['Payment', inf.payment_method || '—'],
              ['Joined', formatDate(inf.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span className="capitalize">{v}</span>
              </div>
            ))}
          </div>
          {inf.admin_notes && (
            <div className="card p-4 text-xs">
              <h3 className="font-semibold mb-2">Admin Notes</h3>
              <p className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded">{inf.admin_notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'tickets' && (
        tickets.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tickets.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Ticket</th><th>Subject</th><th>Status</th><th>Priority</th><th>Created</th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td><Link to={`/tickets/${t.id}`} className="text-xs font-mono hover:underline" style={{ color: 'var(--accent)' }}>{t.ticket_number || `#${t.id}`}</Link></td>
                    <td className="text-xs">{truncate(t.subject, 50)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'campaigns' && (
        campaigns.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No campaigns.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Campaign</th><th>Status</th><th>Commission</th><th>Period</th></tr></thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="text-xs font-medium">{c.name}</td>
                    <td><span className="badge bg-blue-100 text-blue-800 capitalize">{c.status}</span></td>
                    <td className="text-xs">{c.commission_rate}% ({c.commission_type})</td>
                    <td className="text-xs">{formatDate(c.start_date)} – {formatDate(c.end_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'links' && (
        links.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tracking links.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Clicks</th><th>Orders</th><th>Revenue</th><th>Active</th></tr></thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id}>
                    <td className="text-xs">{l.name}</td>
                    <td className="text-xs">{(l.total_clicks || 0).toLocaleString()}</td>
                    <td className="text-xs">{l.total_orders || 0}</td>
                    <td className="text-xs">{formatCurrency(l.total_revenue)}</td>
                    <td>{l.is_active ? <span className="badge bg-green-100 text-green-800">Yes</span> : <span className="badge bg-gray-100 text-gray-700">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <CreateTicketModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { getAgents, getTeams } from '../../api/support';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';

export default function Team() {
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('agents');

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([getAgents(), getTeams()]);
      setAgents(aRes.data.agents || aRes.data || []);
      setTeams(tRes.data.teams || tRes.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Team Management</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{agents.length} agents across {teams.length} teams</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
      </div>

      <div className="flex border-b border-[var(--border)] gap-0">
        {['agents', 'teams'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{t}</button>
        ))}
      </div>

      {tab === 'agents' && (
        agents.length === 0 ? (
          <div className="card"><EmptyState icon={Users} title="No agents" description="Admin/staff users with portal access appear here." /></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Open Tickets</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}>
                          {(a.name || 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td><span className="badge bg-blue-100 text-blue-800 capitalize">{a.role?.replace('_', ' ')}</span></td>
                    <td className="text-xs">{a.email}</td>
                    <td className="text-xs">{a.open_tickets ?? '—'}</td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'teams' && (
        teams.length === 0 ? (
          <div className="card"><EmptyState icon={Users} title="No teams" description="Create teams to organise support agents." /></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Team</th><th>Description</th><th>Members</th></tr></thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.id}>
                    <td className="text-xs font-medium">{t.name}</td>
                    <td className="text-xs">{t.description || '—'}</td>
                    <td className="text-xs">{t.member_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Store, Users, Package, Wallet, ShieldCheck, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../../../../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' };

function StatCard({ icon: Icon, label, value, sub, color = '#1a1a18', bg = '#f8fafc', onClick }) {
  return (
    <div onClick={onClick} style={{ ...card, cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function AdminSellerOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/sellers/stats');
      setStats(r.data);
    } catch { toast.error('Failed to load seller stats'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div style={{ padding: 32, color: '#9ca3af', fontSize: 14 }}>Loading...</div>;

  const s = stats?.sellers || {};
  const p = stats?.products || {};

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Seller Marketplace</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Overview of all sellers, listings, and revenue.</p>
        </div>
        <button onClick={fetch} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard icon={Users}       label="Total Sellers"   value={s.total}     sub={`${s.active} active`}    color="#2563eb" bg="#eff6ff"  onClick={() => navigate('/admin/seller-accounts')} />
        <StatCard icon={Clock}       label="Pending Approval" value={s.pending}  sub="awaiting review"         color="#d97706" bg="#fffbeb" onClick={() => navigate('/admin/seller-accounts')} />
        <StatCard icon={ShieldCheck} label="Pending KYC"     value={stats?.pending_kyc} sub="docs submitted"  color="#7c3aed" bg="#f5f3ff" onClick={() => navigate('/admin/seller-kyc')} />
        <StatCard icon={Package}     label="Pending Products" value={p.pending_review} sub="awaiting review"  color="#dc2626" bg="#fef2f2" onClick={() => navigate('/admin/seller-products')} />
        <StatCard icon={TrendingUp}  label="Approved Products" value={p.approved} sub={`${p.total} total`}    color="#16a34a" bg="#f0fdf4" />
        <StatCard icon={Wallet}      label="Total GMV"        value={`₹${Number(stats?.gmv||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="all time"  color="#0891b2" bg="#ecfeff" />
        <StatCard icon={AlertTriangle} label="Suspended"     value={s.suspended} sub="needs attention"        color="#9f1239" bg="#fff1f2" />
      </div>

      {/* Quick actions */}
      <div style={card}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Review Seller Accounts', path: '/admin/seller-accounts', color: '#2563eb' },
            { label: 'Review KYC Docs', path: '/admin/seller-kyc', color: '#7c3aed', badge: stats?.pending_kyc },
            { label: 'Approve Products', path: '/admin/seller-products', color: '#dc2626', badge: p.pending_review },
            { label: 'Manage Payouts', path: '/admin/seller-payouts', color: '#16a34a' },
            { label: 'View Audit Logs', path: '/admin/seller-audit', color: '#374151' },
          ].map(({ label, path, color, badge }) => (
            <button key={path} onClick={() => navigate(path)}
              style={{ position: 'relative', padding: '10px 20px', borderRadius: 9, border: `1.5px solid ${color}`, background: '#fff', color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {label}
              {badge > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 6px', lineHeight: 1.4 }}>{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

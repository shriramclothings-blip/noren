import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Wallet, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSellerAuth } from '../context/SellerAuthContext';
import SellerLayout from '../components/SellerLayout';

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px' };

function StatCard({ icon: Icon, label, value, sub, color = '#0f172a', bg = '#f8fafc' }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={19} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1.1, marginTop: 2 }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function StatusAlert({ profile }) {
  if (!profile) return null;
  if (profile.status === 'active' && profile.kyc_status === 'approved') return null;

  const alerts = [];

  if (profile.status === 'pending') {
    alerts.push({ type: 'warning', icon: Clock, msg: 'Your seller account is pending approval by NOREN admin. You can still upload products but they won\'t go live until your account is approved.' });
  }
  if (profile.status === 'suspended') {
    alerts.push({ type: 'error', icon: AlertTriangle, msg: `Your seller account is suspended. Reason: ${profile.suspension_reason || 'Contact support.'}` });
  }
  if (profile.kyc_status === 'pending') {
    alerts.push({ type: 'warning', icon: AlertTriangle, msg: 'KYC documents not submitted. Submit your GST, PAN, and bank documents to start selling.' });
  }
  if (profile.kyc_status === 'submitted') {
    alerts.push({ type: 'info', icon: Clock, msg: 'Your KYC documents are under review. We\'ll notify you within 1-2 business days.' });
  }
  if (profile.kyc_status === 'rejected') {
    alerts.push({ type: 'error', icon: AlertTriangle, msg: `KYC rejected: ${profile.kyc_rejection_reason || 'Please resubmit with correct documents.'}` });
  }

  const colors = { warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', iconColor: '#f59e0b' }, error: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', iconColor: '#ef4444' }, info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', iconColor: '#3b82f6' } };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {alerts.map((a, i) => {
        const c = colors[a.type];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, background: c.bg, border: `1px solid ${c.border}` }}>
            <a.icon size={16} color={c.iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: c.color, lineHeight: 1.5 }}>{a.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useSellerAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/seller/dashboard');
      setStats(r.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const prod = stats?.products || {};
  const rev  = stats?.revenue  || {};

  return (
    <SellerLayout>
      <div style={{ display: 'grid', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
              {profile?.brand_name ? `Welcome, ${profile.brand_name}` : 'Seller Dashboard'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Here's your performance overview.</p>
          </div>
          <button onClick={() => navigate('/products/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, background: '#0f172a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Add Product
          </button>
        </div>

        {/* Alerts */}
        <StatusAlert profile={profile} />

        {/* Stats */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ ...card, height: 88, background: '#f8fafc' }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
            <StatCard icon={Package}     label="Total Products"  value={prod.total}    sub={`${prod.approved} approved`}  color="#6366f1" bg="#eef2ff" />
            <StatCard icon={Clock}       label="Pending Review"  value={prod.pending_review} sub="awaiting admin"        color="#f59e0b" bg="#fffbeb" />
            <StatCard icon={ShoppingCart} label="Total Orders"   value={stats?.orders?.total} sub="all time"             color="#0891b2" bg="#ecfeff" />
            <StatCard icon={TrendingUp}  label="Revenue"         value={`₹${Number(rev.total_revenue||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="gross"  color="#16a34a" bg="#f0fdf4" />
            <StatCard icon={Wallet}      label="My Earnings"     value={`₹${Number(rev.total_payout||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="paid out" color="#7c3aed" bg="#f5f3ff" />
            <StatCard icon={CheckCircle} label="Pending Payout"  value={`₹${Number(stats?.pending_payout||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="to be paid" color="#c9a96e" bg="#fffbeb" />
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {[
            { label: 'Add New Product',   desc: 'Upload images, set price and stock', path: '/products/new', icon: Plus, color: '#0f172a' },
            { label: 'View My Products',  desc: 'Manage your product listings', path: '/products', icon: Package, color: '#6366f1' },
            { label: 'View Orders',       desc: 'Track customer orders', path: '/orders', icon: ShoppingCart, color: '#0891b2' },
            { label: 'Complete KYC',      desc: 'Upload verification documents', path: '/kyc', icon: CheckCircle, color: '#16a34a', hide: profile?.kyc_status === 'approved' },
          ].filter(a => !a.hide).map(({ label, desc, path, icon: Icon, color }) => (
            <button key={path} onClick={() => navigate(path)}
              style={{ ...card, cursor: 'pointer', border: `1.5px solid #e5e7eb`, background: '#fff', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s', padding: '18px 20px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={color} />
                </div>
                <ArrowRight size={14} color="#9ca3af" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{label}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </SellerLayout>
  );
}

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Link2, BarChart2, ShoppingBag, Wallet, User,
  Bell, LogOut, Menu, X, TrendingUp, Copy, Check, ChevronDown,
  Shield, HelpCircle, Star
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const InfluencerHome      = lazy(() => import('./sections/InfluencerHome'));
const InfluencerMyLinks   = lazy(() => import('./sections/InfluencerMyLinks'));
const InfluencerEarnings  = lazy(() => import('./sections/InfluencerEarnings'));
const InfluencerOrders    = lazy(() => import('./sections/InfluencerOrders'));
const InfluencerPayouts   = lazy(() => import('./sections/InfluencerPayouts'));
const InfluencerProfile   = lazy(() => import('./sections/InfluencerProfile'));

const NAV = [
  { key:'dashboard', label:'Dashboard',  icon: LayoutDashboard },
  { key:'links',     label:'My Links',   icon: Link2 },
  { key:'orders',    label:'Conversions',icon: ShoppingBag },
  { key:'earnings',  label:'Earnings',   icon: BarChart2 },
  { key:'payouts',   label:'Payouts',    icon: Wallet },
  { key:'profile',   label:'My Profile', icon: User },
];

function Loader() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'8px 0' }}>
      {[100,48,48,48].map((h,i) => <div key={i} style={{ height:h, borderRadius:12, background:'#f3f4f6', animation:'pulse 1.5s infinite' }} />)}
    </div>
  );
}

export default function InfluencerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [section, setSection]     = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile]     = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const raw = location.pathname.replace(/^\/influencer\/?/, '') || 'dashboard';
    const sec = raw.split('/')[0];
    const valid = NAV.map(n=>n.key);
    setSection(valid.includes(sec) ? sec : 'dashboard');
  }, [location.pathname]);

  useEffect(() => {
    api.get('/influencer/me/profile').then(r => setProfile(r.data)).catch(() => {});
    api.get('/influencer/me/notifications').then(r => {
      const unread = (r.data.notifications || []).filter(n => !n.is_read).length;
      setNotifCount(unread);
    }).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const goTo = (key) => { navigate(key === 'dashboard' ? '/influencer/dashboard' : `/influencer/${key}`); setMobileOpen(false); };

  function renderSection() {
    switch(section) {
      case 'dashboard': return <InfluencerHome profile={profile} />;
      case 'links':     return <InfluencerMyLinks />;
      case 'orders':    return <InfluencerOrders />;
      case 'earnings':  return <InfluencerEarnings />;
      case 'payouts':   return <InfluencerPayouts />;
      case 'profile':   return <InfluencerProfile profile={profile} onUpdate={setProfile} />;
      default:          return <InfluencerHome profile={profile} />;
    }
  }

  const activeNav = NAV.find(n => n.key === section) || NAV[0];

  function SidebarContent({ isMobile }) {
    return (
      <aside style={{ width:240, minWidth:240, background:'#0f172a', display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', borderRight:'1px solid rgba(255,255,255,0.06)' }}>
        {/* Brand */}
        <div style={{ height:56, display:'flex', alignItems:'center', padding:'0 16px', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo.png" alt="NOREN" style={{ width:28, height:28, borderRadius:6, objectFit:'cover' }} />
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.04em' }}>NOREN</div>
              <div style={{ fontSize:9, color:'#c9a96e', fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase' }}>Influencer</div>
            </div>
          </div>
          {isMobile && <button onClick={() => setMobileOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', display:'flex' }}><X size={16}/></button>}
        </div>

        {/* Profile mini */}
        {profile && (
          <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:8, background:'rgba(201,169,110,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#c9a96e', fontWeight:700, fontSize:13, flexShrink:0, overflow:'hidden' }}>
                {profile.profile_photo ? <img src={profile.profile_photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (profile.display_name||user?.name||'?')[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.display_name || user?.name}</div>
                <div style={{ fontSize:10, color:'#475569' }}>@{profile.username || 'influencer'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'6px 6px', scrollbarWidth:'none' }}>
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button key={key} onClick={() => goTo(key)}
                style={{ display:'flex', alignItems:'center', gap:9, width:'100%', boxSizing:'border-box', padding:'8px 10px', background:active?'rgba(201,169,110,0.13)':'transparent', color:active?'#c9a96e':'#64748b', border:'none', borderLeft:active?'2px solid #c9a96e':'2px solid transparent', borderRadius:'0 6px 6px 0', cursor:'pointer', fontSize:12.5, fontWeight:active?600:400, textAlign:'left', marginBottom:1, transition:'background 0.1s, color 0.1s', outline:'none' }}
                onMouseEnter={e => { if(!active){e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='#cbd5e1';} }}
                onMouseLeave={e => { if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#64748b';} }}>
                <Icon size={14} style={{ flexShrink:0, opacity:active?1:0.7 }} />
                <span>{label}</span>
                {key==='profile' && notifCount > 0 && <span style={{ marginLeft:'auto', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:100, background:'#c9a96e', color:'#fff' }}>{notifCount}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 8px', flexShrink:0 }}>
          <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'7px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, color:'#ef4444', background:'transparent', transition:'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <LogOut size={13} /><span>Sign Out</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#f1f5f9' }}>
      {/* Desktop sidebar */}
      <div className="hide-mobile" style={{ height:'100vh', flexShrink:0 }}><SidebarContent isMobile={false} /></div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(2,6,23,0.7)' }} onClick={() => setMobileOpen(false)} />
          <div style={{ position:'relative', zIndex:51 }}><SidebarContent isMobile={true} /></div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        {/* Header */}
        <header style={{ height:56, background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:30, gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <button className="hide-desktop" onClick={() => setMobileOpen(true)} style={{ width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #e2e8f0', borderRadius:8, background:'none', cursor:'pointer', color:'#374151', flexShrink:0 }}>
              <Menu size={18}/>
            </button>
            <div>
              <h1 style={{ margin:0, fontSize:14, fontWeight:700, color:'#0f172a', lineHeight:1.2 }}>{activeNav.label}</h1>
              {profile && <p style={{ margin:0, fontSize:11, color:'#94a3b8', marginTop:1 }}>Commission: {profile.commission_type==='percentage'?`${profile.commission_rate}%`:`₹${profile.commission_rate} fixed`}</p>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {notifCount > 0 && <div style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:100, background:'#fef3c7', color:'#92400e' }}>{notifCount} alerts</div>}
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px #dcfce7' }} />
          </div>
        </header>

        {/* Content */}
        <main style={{ flex:1, overflowY:'auto', padding:'20px', paddingBottom:'max(20px, calc(64px + env(safe-area-inset-bottom, 0px)))' }}>
          <Suspense fallback={<Loader />}>
            {renderSection()}
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="hide-desktop" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:40, background:'#0f172a', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
        {NAV.slice(0,5).map(({ key, label, icon: Icon }) => {
          const active = section === key;
          return (
            <button key={key} onClick={() => goTo(key)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, padding:'9px 4px 10px', border:'none', background:'transparent', cursor:'pointer', color:active?'#c9a96e':'#475569', borderTop:active?'2px solid #c9a96e':'2px solid transparent' }}>
              <Icon size={18}/>
              <span style={{ fontSize:9.5, fontWeight:active?700:400 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @media(max-width:768px){.hide-mobile{display:none!important}}
        @media(min-width:769px){.hide-desktop{display:none!important}}
      `}</style>
    </div>
  );
}

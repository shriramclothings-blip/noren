import { useState } from 'react';
import { User, Instagram, Youtube, Facebook, Globe, Edit2, Check, X } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const PLATFORM_ICONS = { instagram: Instagram, youtube: Youtube, facebook: Facebook };
const inp = (e={}) => ({ width:'100%', padding:'9px 12px', fontSize:13, border:'1.5px solid #e5e7eb', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#111827', background:'#fff', boxSizing:'border-box', ...e });

export default function InfluencerProfile({ profile, onUpdate }) {
  const [editBio, setEditBio]   = useState(false);
  const [bio, setBio]           = useState(profile?.bio || '');
  const [website, setWebsite]   = useState(profile?.website_url || '');
  const [saving, setSaving]     = useState(false);
  const [pwForm, setPwForm]     = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const saveBio = async () => {
    setSaving(true);
    try {
      await api.patch('/influencer/me/profile', { bio, website_url: website, display_name: profile?.display_name });
      toast.success('Profile updated');
      setEditBio(false);
      if (onUpdate) onUpdate({ ...profile, bio, website_url: website });
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 8)          return toast.error('Password must be at least 8 characters');
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setShowPw(false);
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setPwSaving(false); }
  };

  if (!profile) return <div style={{ padding:48, textAlign:'center', color:'#9ca3af' }}>Loading profile…</div>;

  const STATUS_COLORS = { active:'#dcfce7', inactive:'#f3f4f6', suspended:'#fee2e2', pending:'#fef9c3' };
  const STATUS_TEXT   = { active:'#15803d', inactive:'#6b7280', suspended:'#b91c1c', pending:'#854d0e' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:700 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>My Profile</h2>
        <p style={{ fontSize:13, color:'#9ca3af', margin:'4px 0 0' }}>Your influencer account information</p>
      </div>

      {/* Profile card */}
      <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:16, overflow:'hidden' }}>
        {/* Hero */}
        <div style={{ height:80, background:'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }} />
        <div style={{ padding:'0 24px 24px', position:'relative' }}>
          {/* Avatar */}
          <div style={{ position:'relative', display:'inline-block', marginTop:-32 }}>
            <div style={{ width:64, height:64, borderRadius:14, border:'3px solid #fff', overflow:'hidden', background:'rgba(201,169,110,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#c9a96e', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
              {profile.profile_photo
                ? <img src={profile.profile_photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : (profile.display_name || profile.name || '?')[0]?.toUpperCase()}
            </div>
          </div>

          <div style={{ marginTop:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:18, fontWeight:800, color:'#111827' }}>{profile.display_name || profile.name}</span>
              {profile.username && <span style={{ fontSize:13, color:'#9ca3af' }}>@{profile.username}</span>}
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:STATUS_COLORS[profile.status]||'#f3f4f6', color:STATUS_TEXT[profile.status]||'#374151' }}>{profile.status}</span>
            </div>
            <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>{profile.email}</div>
          </div>

          {/* Info grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginTop:16 }}>
            {[
              ['Commission', profile.commission_type==='percentage' ? `${profile.commission_rate}%` : `₹${profile.commission_rate} fixed`],
              ['Category',   profile.category  || '—'],
              ['Niche',      profile.niche     || '—'],
              ['Location',   profile.location  || '—'],
              ['Agreement',  profile.agreement_status || '—'],
              ['Joined',     profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN') : '—'],
            ].map(([k,v]) => (
              <div key={k} style={{ background:'#f9fafb', borderRadius:9, padding:'10px 14px' }}>
                <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.06em' }}>Bio / About</span>
              {!editBio && <button onClick={() => setEditBio(true)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'#c9a96e', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}><Edit2 size={11}/> Edit</button>}
            </div>
            {editBio ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell brands about yourself…"
                  style={{ ...inp(), resize:'vertical' }} />
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Website URL</label>
                  <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" style={inp()} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={saveBio} disabled={saving}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 16px', borderRadius:8, border:'none', background:'#1a1a18', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', opacity:saving?0.7:1 }}>
                    <Check size={12}/> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditBio(false); setBio(profile.bio||''); }}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, border:'none', background:'#f3f4f6', color:'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    <X size={12}/> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize:13, color: bio ? '#374151' : '#9ca3af', margin:0, lineHeight:1.7 }}>
                {bio || 'No bio added yet. Click Edit to add one.'}
              </p>
            )}
          </div>

          {/* Social profiles */}
          {profile.social_profiles?.filter(Boolean).length > 0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Social Profiles</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {profile.social_profiles.filter(Boolean).map((sp,i) => {
                  const Icon = PLATFORM_ICONS[sp.platform] || Globe;
                  return (
                    <a key={i} href={sp.url || '#'} target="_blank" rel="noopener noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:20, background:'#f3f4f6', fontSize:12, fontWeight:600, color:'#374151', textDecoration:'none', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#e5e7eb'}
                      onMouseLeave={e => e.currentTarget.style.background='#f3f4f6'}>
                      <Icon size={13}/> {sp.platform} · {sp.handle || 'View'}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div style={{ background:'#fff', border:'1px solid #f3f4f6', borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom: showPw ? '1px solid #f3f4f6' : 'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#111827' }}>Security — Change Password</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>Use a strong password with letters, numbers and symbols</div>
          </div>
          <button onClick={() => setShowPw(s => !s)}
            style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', color:'#374151' }}>
            {showPw ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {showPw && (
          <form onSubmit={changePassword} style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Current Password</label>
              <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f=>({...f,currentPassword:e.target.value}))} style={inp()} required />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>New Password (min 8 chars)</label>
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f=>({...f,newPassword:e.target.value}))} style={inp()} required minLength={8} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f=>({...f,confirm:e.target.value}))} style={inp()} required />
            </div>
            <button type="submit" disabled={pwSaving}
              style={{ alignSelf:'flex-start', padding:'9px 20px', borderRadius:9, border:'none', background:'#1a1a18', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:pwSaving?0.7:1 }}>
              {pwSaving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      {/* Account details (read-only) */}
      <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px 18px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Account Details</div>
        <div style={{ fontSize:12, color:'#6b7280', display:'flex', flexDirection:'column', gap:4 }}>
          <span>To update your commission rate, payment details, or other account settings, contact your account manager.</span>
          {profile.contract_start_date && <span>Contract: {new Date(profile.contract_start_date).toLocaleDateString('en-IN')} → {profile.contract_end_date ? new Date(profile.contract_end_date).toLocaleDateString('en-IN') : 'Ongoing'}</span>}
        </div>
      </div>
    </div>
  );
}

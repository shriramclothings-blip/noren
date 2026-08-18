import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { UserCheck, UserPlus, Lock, Grid, Video, Settings, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileView() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [canView, setCanView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const target = username || currentUser?.username || currentUser?.id;
      const res = await api.get(`/social/profile/${target}`);
      setProfile(res.data.profile);
      setPosts(res.data.posts);
      setCanView(res.data.can_view_content);
      setIsFollowing(res.data.profile.is_following);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      if (isFollowing) {
        await api.post(`/social/users/${profile.id}/unfollow`);
        setIsFollowing(false);
        setProfile(prev => ({ ...prev, followers_count: Math.max(0, parseInt(prev.followers_count) - 1) }));
      } else {
        const res = await api.post(`/social/users/${profile.id}/follow`);
        setIsFollowing(res.data.status === 'accepted');
        if (res.data.status === 'accepted') {
          setProfile(prev => ({ ...prev, followers_count: parseInt(prev.followers_count) + 1 }));
        }
      }
    } catch {
      toast.error('Failed to update follow state');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading social profile...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-slate-400">User profile not found.</div>;
  }

  const isOwner = currentUser?.id === profile.id;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Profile Header Card */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative w-28 h-28 rounded-full bg-slate-800 ring-4 ring-cyan-500/30 overflow-hidden shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-slate-300">
              {profile.name?.[0]}
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">{profile.name}</h2>
                {profile.is_verified && (
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-xs font-black">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-cyan-400">@{profile.username}</p>
            </div>

            {/* Actions */}
            {!isOwner ? (
              <button
                onClick={handleFollowToggle}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm transition-all ${
                  isFollowing
                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20'
                }`}
              >
                {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            ) : (
              <Link
                to="/settings"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
              >
                <Settings className="w-4 h-4" /> Edit Profile
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-center md:justify-start gap-8 pt-2 border-t border-slate-800/60">
            <div>
              <span className="block text-lg font-black text-white">{profile.posts_count}</span>
              <span className="text-xs text-slate-400">Posts</span>
            </div>
            <div>
              <span className="block text-lg font-black text-white">{profile.followers_count}</span>
              <span className="text-xs text-slate-400">Followers</span>
            </div>
            <div>
              <span className="block text-lg font-black text-white">{profile.following_count}</span>
              <span className="text-xs text-slate-400">Following</span>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && <p className="text-sm text-slate-300">{profile.bio}</p>}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline">
              {profile.website}
            </a>
          )}
        </div>
      </div>

      {/* Media Grid / Private Warning */}
      {!canView ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-slate-800 space-y-2">
          <Lock className="w-10 h-10 text-cyan-400 mx-auto" />
          <h4 className="text-lg font-bold text-white">This Account is Private</h4>
          <p className="text-xs text-slate-400">Follow this account to see their photos and videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {posts.map((post) => (
            <div key={post.id} className="aspect-square rounded-2xl bg-slate-900 overflow-hidden relative group cursor-pointer border border-slate-800">
              {post.primary_media ? (
                <img src={post.primary_media} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full p-4 flex items-center justify-center text-xs text-slate-300 font-medium">
                  {post.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

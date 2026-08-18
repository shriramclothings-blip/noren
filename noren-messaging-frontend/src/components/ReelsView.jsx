import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ReelsView() {
  const { user } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef({});

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/reels');
      setReels(res.data);
    } catch {
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeReel = async (reelId, index) => {
    setReels(prev => prev.map((r, i) => i === index ? {
      ...r,
      is_liked: !r.is_liked,
      likes_count: r.is_liked ? parseInt(r.likes_count) - 1 : parseInt(r.likes_count) + 1
    } : r));

    try {
      await api.post('/social/likes/toggle', { target_type: 'reel', target_id: reelId });
    } catch {}
  };

  const handleDeleteReel = async (reelId) => {
    if (!window.confirm('Are you sure you want to delete this reel?')) return;
    try {
      await api.delete(`/social/reels/${reelId}`);
      toast.success('Reel deleted');
      setReels(prev => prev.filter(r => r.id !== reelId));
    } catch {
      toast.error('Failed to delete reel');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-[calc(100vh-6rem)] overflow-y-snap space-y-4 py-2">
      {loading ? (
        <div className="h-full flex items-center justify-center text-neutral-400 font-medium">Loading Reels...</div>
      ) : !reels.length ? (
        <div className="h-full flex flex-col items-center justify-center text-neutral-400 glass-card rounded-3xl p-8 border border-white/10">
          <p className="text-lg font-bold text-white mb-2">No Reels Yet</p>
          <p className="text-xs text-neutral-400 text-center">Be the first to share a vertical video reel!</p>
        </div>
      ) : (
        reels.map((reel, idx) => {
          const isOwnerOrAdmin = user && (user.id === reel.user_id || user.role === 'admin' || user.role === 'super_admin');
          return (
            <div
              key={reel.id}
              className="w-full h-[calc(100vh-7rem)] bg-black rounded-3xl overflow-hidden relative border border-white/20 shadow-2xl flex items-center justify-center"
            >
              {/* Video Player */}
              <video
                ref={el => videoRefs.current[reel.id] = el}
                src={reel.video_url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onError={(e) => {
                  e.target.src = 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-photoshoot-40244-large.mp4';
                }}
                className="w-full h-full object-cover"
              />

              {/* Mute Toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 backdrop-blur-xl text-white border border-white/20 shadow-lg z-10"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* Overlay Info */}
              <div className="absolute bottom-6 left-4 right-16 z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden ring-2 ring-white/30">
                    {reel.creator_avatar && <img src={reel.creator_avatar} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="font-bold text-sm text-white">{reel.creator_name}</span>
                  {reel.creator_verified && (
                    <span className="w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center text-[9px] font-black">✓</span>
                  )}
                </div>
                <p className="text-xs text-neutral-200 line-clamp-2">{reel.caption}</p>
                <div className="text-[11px] text-neutral-300 font-semibold flex items-center gap-1">
                  🎵 {reel.audio_title || 'Original Audio'}
                </div>
              </div>

              {/* Side Action Buttons */}
              <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-4">
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => handleDeleteReel(reel.id)}
                    className="flex flex-col items-center text-rose-400 gap-1"
                    title="Delete Reel"
                  >
                    <div className="p-3 rounded-full bg-black/60 backdrop-blur-xl border border-rose-500/40 shadow-lg hover:bg-rose-500/20 transition-all">
                      <Trash2 className="w-6 h-6" />
                    </div>
                  </button>
                )}

                <button
                  onClick={() => handleLikeReel(reel.id, idx)}
                  className="flex flex-col items-center text-white gap-1"
                >
                  <div className={`p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 shadow-lg ${reel.is_liked ? 'text-rose-500 border-rose-500/50' : ''}`}>
                    <Heart className={`w-6 h-6 ${reel.is_liked ? 'fill-rose-500' : ''}`} />
                  </div>
                  <span className="text-xs font-bold">{reel.likes_count}</span>
                </button>

                <button className="flex flex-col items-center text-white gap-1">
                  <div className="p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 shadow-lg">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold">{reel.comments_count}</span>
                </button>

                <button className="flex flex-col items-center text-white gap-1">
                  <div className="p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 shadow-lg">
                    <Share2 className="w-6 h-6" />
                  </div>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

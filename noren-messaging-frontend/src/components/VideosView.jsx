import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Tv, Play, Pause, Heart, MessageCircle, Share2, Eye, UploadCloud, CheckCircle, Volume2, VolumeX, Maximize } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FALLBACK_VIDEOS = [
  {
    id: 99901,
    user_id: 1,
    caption: '✨ NOREN Fashion Widescreen Showcase 2026',
    likes_count: 124,
    views_count: 1540,
    created_at: new Date().toISOString(),
    author_name: 'NOREN Official',
    author_username: 'noren_official',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    author_verified: true,
    media: [
      {
        id: 101,
        media_type: 'video',
        media_url: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-photoshoot-40244-large.mp4',
        aspect_ratio: '16:9',
      },
    ],
  },
  {
    id: 99902,
    user_id: 2,
    caption: '🎬 NOREN Urban Streetwear Runway Show',
    likes_count: 98,
    views_count: 890,
    created_at: new Date().toISOString(),
    author_name: 'Studio Noren',
    author_username: 'studio_noren',
    author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    author_verified: true,
    media: [
      {
        id: 102,
        media_type: 'video',
        media_url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
        aspect_ratio: '16:9',
      },
    ],
  },
];

export default function VideosView({ onOpenUpload }) {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const mainVideoRef = useRef(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/videos');
      const data = (Array.isArray(res.data) && res.data.length > 0) ? res.data : DEFAULT_FALLBACK_VIDEOS;
      setVideos(data);
      setActiveVideo(data[0]);
    } catch (err) {
      console.warn('Backend videos fetch fallback:', err.message);
      setVideos(DEFAULT_FALLBACK_VIDEOS);
      setActiveVideo(DEFAULT_FALLBACK_VIDEOS[0]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video) => {
    setActiveVideo(video);
    setIsPlaying(true);
    if (mainVideoRef.current) {
      mainVideoRef.current.currentTime = 0;
      mainVideoRef.current.play().catch(() => {});
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePlay = () => {
    if (!mainVideoRef.current) return;
    if (isPlaying) {
      mainVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      mainVideoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleLike = async (postId) => {
    if (!activeVideo) return;
    setActiveVideo((prev) => ({
      ...prev,
      is_liked: !prev.is_liked,
      likes_count: prev.is_liked ? parseInt(prev.likes_count) - 1 : parseInt(prev.likes_count) + 1,
    }));
    try {
      await api.post('/social/likes/toggle', { target_type: 'post', target_id: postId });
    } catch {}
  };

  const currentMedia = activeVideo?.media?.[0] || {};
  const currentVideoUrl = currentMedia.media_url || 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-photoshoot-40244-large.mp4';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Tv className="w-7 h-7 text-amber-400" />
            <span>NOREN Watch (Horizontal Videos)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">YouTube-style 16:9 widescreen video streaming & sharing</p>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full btn-liquid-solid font-black text-xs text-black shadow-xl hover:scale-[1.03] transition-all"
        >
          <UploadCloud className="w-4 h-4 text-black" />
          <span>Upload Widescreen Video</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-400 font-semibold">Loading Widescreen Videos...</div>
      ) : activeVideo ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main YouTube Widescreen Player Section (2 Cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-white/15 shadow-2xl group">
              <video
                ref={mainVideoRef}
                src={currentVideoUrl}
                autoPlay
                playsInline
                muted={isMuted}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={(e) => {
                  e.target.src = 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-photoshoot-40244-large.mp4';
                }}
                className="w-full h-full object-contain bg-black cursor-pointer"
                onClick={togglePlay}
              />

              {/* Video Overlay Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between gap-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={togglePlay} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                <div className="flex items-center gap-3">
                  <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button onClick={() => mainVideoRef.current?.requestFullscreen?.()} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Video Details & Author Info */}
            <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-4 shadow-xl">
              <h1 className="text-xl font-bold text-white leading-snug">{activeVideo.caption || 'Untitled Horizontal Video'}</h1>

              <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-white/10">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-neutral-800 ring-2 ring-amber-400/50 overflow-hidden shrink-0">
                    {activeVideo.author_avatar ? (
                      <img src={activeVideo.author_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-white text-sm">
                        {activeVideo.author_name?.[0]}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-white text-sm">{activeVideo.author_name}</h4>
                      {activeVideo.author_verified && <CheckCircle className="w-3.5 h-3.5 text-amber-400 fill-current" />}
                    </div>
                    <p className="text-xs text-neutral-400">@{activeVideo.author_username || 'creator'}</p>
                  </div>
                </div>

                {/* Interaction Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(activeVideo.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      activeVideo.is_liked
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${activeVideo.is_liked ? 'fill-current' : ''}`} />
                    <span>{activeVideo.likes_count || 0}</span>
                  </button>

                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-neutral-300">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>{activeVideo.views_count || 120} Views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Up Next / Playlist Column (1 Col on lg) */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-neutral-300 uppercase tracking-widest px-1">
              Up Next & Related Videos ({videos.length})
            </h3>

            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {videos.map((vid) => {
                const vidMedia = vid.media?.[0] || {};
                const vidUrl = vidMedia.media_url || 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-photoshoot-40244-large.mp4';
                const isSelected = activeVideo?.id === vid.id;

                return (
                  <div
                    key={vid.id}
                    onClick={() => handleSelectVideo(vid)}
                    className={`group flex gap-3 p-2.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400/40 ring-1 ring-amber-400/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {/* Widescreen Video Thumbnail */}
                    <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                      <video src={vidUrl} muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-current opacity-80 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-400 border border-white/10">
                        16:9
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                        {vid.caption || 'NOREN Horizontal Video'}
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-1 truncate">@{vid.author_username}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{vid.views_count || 45} views</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 glass-panel rounded-3xl border border-white/10 space-y-4">
          <p className="text-neutral-300 font-semibold">No widescreen horizontal videos yet</p>
          <button
            onClick={onOpenUpload}
            className="px-6 py-3 rounded-full btn-liquid-solid font-black text-xs text-black shadow-xl"
          >
            Upload First Horizontal Video
          </button>
        </div>
      )}
    </div>
  );
}

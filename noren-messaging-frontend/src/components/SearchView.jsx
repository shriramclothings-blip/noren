import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { Search, Film, Heart, Eye } from 'lucide-react';

export default function SearchView() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState({ users: [], hashtags: [] });
  const [exploreData, setExploreData] = useState({ posts: [], reels: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryParam) {
      performSearch(queryParam);
    } else {
      fetchExplore();
    }
  }, [queryParam]);

  const fetchExplore = async () => {
    try {
      const res = await api.get('/social/explore');
      setExploreData(res.data || { posts: [], reels: [] });
    } catch {}
  };

  const performSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/social/search?q=${encodeURIComponent(searchTerm)}`);
      setResults(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
        <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search accounts, hashtags (#fashion, #noren)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 text-sm rounded-2xl glass-input border border-white/10 text-white placeholder-neutral-500"
        />
      </form>

      {loading ? (
        <div className="text-center p-8 text-neutral-400 font-medium">Searching Noren network...</div>
      ) : query ? (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* User Results */}
          {results.users.length > 0 && (
            <div className="glass-card rounded-3xl p-4 border border-white/10 space-y-2 shadow-xl">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-2 mb-3">People</h4>
              {results.users.map((u) => (
                <Link
                  key={u.id}
                  to={`/profile/${u.username || u.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden ring-2 ring-white/20">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-neutral-300">
                        {u.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h5 className="text-sm font-bold text-white">{u.name}</h5>
                      {u.is_verified && <span className="text-white text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-neutral-400">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Hashtag Results */}
          {results.hashtags.length > 0 && (
            <div className="glass-card rounded-3xl p-4 border border-white/10 space-y-2 shadow-xl">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-2 mb-3">Hashtags</h4>
              {results.hashtags.map((h) => (
                <div key={h.id} className="p-2.5 rounded-2xl hover:bg-white/10 transition-colors flex justify-between items-center">
                  <span className="font-bold text-white text-sm">#{h.tag}</span>
                  <span className="text-xs text-neutral-400 font-mono">{h.posts_count} posts</span>
                </div>
              ))}
            </div>
          )}

          {!results.users.length && !results.hashtags.length && (
            <div className="text-center p-8 text-neutral-400 font-medium">No results found for "{query}"</div>
          )}
        </div>
      ) : (
        /* Explore Grid Section */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <span>Explore Trending & Reels</span>
            </h3>
          </div>

          {/* Explore Masonry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Reels */}
            {exploreData.reels.map((reel) => (
              <Link
                key={`reel-${reel.id}`}
                to="/reels"
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg hover:ring-2 hover:ring-amber-400/50 transition-all"
              >
                <video
                  src={reel.video_url}
                  muted
                  playsInline
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 p-3 flex flex-col justify-end">
                  <div className="flex items-center gap-1.5 text-xs text-white font-bold truncate">
                    <span>@{reel.author_username || 'noren'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-300 mt-1 font-semibold">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-amber-400" /> {reel.views_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500" /> {reel.likes_count || 0}</span>
                  </div>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-amber-400 border border-white/20">
                  REEL
                </div>
              </Link>
            ))}

            {/* Posts Media */}
            {exploreData.posts.map((post) => {
              const firstMedia = post.media?.[0];
              if (!firstMedia?.media_url) return null;
              const isVideo = firstMedia.media_type === 'video' || firstMedia.media_url.match(/\.(mp4|webm|mov)$/i);

              return (
                <div
                  key={`post-${post.id}`}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg"
                >
                  {isVideo ? (
                    <video src={firstMedia.media_url} muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={firstMedia.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <p className="text-xs text-white font-bold line-clamp-2">{post.caption}</p>
                    <span className="text-[11px] text-neutral-400 font-semibold mt-1">@{post.author_username}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { Search, User, Hash } from 'lucide-react';

export default function SearchView() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState({ users: [], hashtags: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryParam) {
      performSearch(queryParam);
    }
  }, [queryParam]);

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
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search accounts, hashtags (#fashion, #noren)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 text-sm rounded-2xl glass-input border border-slate-700"
        />
      </form>

      {loading ? (
        <div className="text-center p-8 text-slate-400">Searching Noren network...</div>
      ) : (
        <div className="space-y-6">
          {/* User Results */}
          {results.users.length > 0 && (
            <div className="glass-card rounded-3xl p-4 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">People</h4>
              {results.users.map((u) => (
                <Link
                  key={u.id}
                  to={`/profile/${u.username || u.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-800/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden ring-2 ring-cyan-500/30">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-300">
                        {u.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h5 className="text-sm font-bold text-white">{u.name}</h5>
                      {u.is_verified && <span className="text-cyan-400 text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-slate-400">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Hashtag Results */}
          {results.hashtags.length > 0 && (
            <div className="glass-card rounded-3xl p-4 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Hashtags</h4>
              {results.hashtags.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                      #
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">#{h.tag}</h5>
                      <p className="text-xs text-slate-400">{h.posts_count} posts</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

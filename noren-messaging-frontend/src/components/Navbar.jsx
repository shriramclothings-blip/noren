import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, PlusSquare, Bell, Sparkles, MessageCircle, LogOut, User } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Navbar({ onOpenCreatePost }) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white font-display">
            NOREN <span className="text-cyan-400 font-normal text-sm tracking-widest uppercase">Social</span>
          </span>
        </Link>

        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Search accounts, hashtags, reels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-full glass-input placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/30 transition-all"
          />
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenCreatePost}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all"
              >
                <PlusSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Create Post</span>
              </button>

              <Link
                to="/messages"
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800/60 transition-colors relative"
                title="Direct Messages"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>

              <Link
                to="/notifications"
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800/60 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>

              {/* Profile Avatar */}
              <Link to={`/profile/${user.username || user.id}`} className="flex items-center gap-2 pl-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 ring-2 ring-cyan-500/40 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </Link>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-full hover:bg-slate-800/60 transition-colors ml-1"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

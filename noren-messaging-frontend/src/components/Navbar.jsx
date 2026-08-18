import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, PlusSquare, Bell, MessageCircle, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* NOREN Social Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <svg className="w-6 h-6 text-white group-hover:scale-105 transition-transform shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <g transform="rotate(-30 12 12)">
              <circle cx="7.3" cy="3.2" r="1.45"/>
              <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8"/>
              <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8"/>
              <circle cx="16.7" cy="20.8" r="1.45"/>
            </g>
          </svg>
          <span className="text-xl font-extrabold tracking-tight text-white">
            NOREN <span className="font-serif-italic font-normal text-neutral-400 text-lg tracking-normal">Social</span>
          </span>
        </Link>

        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Search accounts, hashtags, reels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-full glass-input placeholder-neutral-500 focus:ring-2 focus:ring-white/20 transition-all"
          />
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenCreatePost}
                className="flex items-center gap-2 px-4 py-2 rounded-full btn-liquid-solid text-xs sm:text-sm font-medium shadow-md transition-all"
              >
                <PlusSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Create Post</span>
              </button>

              <Link
                to="/messages"
                className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition-colors relative"
                title="Direct Messages"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>

              <Link
                to="/notifications"
                className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>

              {/* Profile Avatar */}
              <Link to={`/profile/${user.username || user.id}`} className="flex items-center gap-2 pl-2">
                <div className="w-8 h-8 rounded-full bg-neutral-800 ring-2 ring-white/30 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-300">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </Link>

              <button
                onClick={logout}
                className="p-2 text-neutral-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors ml-1"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-5 py-2 rounded-full btn-liquid-solid text-sm font-medium transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

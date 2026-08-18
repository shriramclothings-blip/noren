import { NavLink } from 'react-router-dom';
import { Home, Compass, Video, Tv, MessageCircle, Bell, User, Settings, Bookmark, Shield, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onOpenCreatePost }) {
  const { user } = useAuth();

  const navItems = [
    { label: 'Home Feed', path: '/', icon: Home },
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Reels', path: '/reels', icon: Video },
    { label: 'Watch Videos', path: '/videos', icon: Tv },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { label: 'Profile', path: user ? `/profile/${user.user_code || user.username || user.id}` : '/login', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-white/10 p-4 sticky top-16 h-[calc(100vh-4rem)]">
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'liquid-pill text-white font-semibold shadow-lg shadow-white/5 border-white/40'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bulk Upload Action Button */}
      {onOpenCreatePost && (
        <div className="pt-3 pb-2 border-t border-white/10">
          <button
            onClick={onOpenCreatePost}
            className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl btn-liquid-solid font-black text-xs text-black shadow-xl transition-all hover:scale-[1.02]"
          >
            <UploadCloud className="w-4 h-4 text-black" />
            <span>Bulk Upload Media</span>
          </button>
        </div>
      )}

      {/* Admin Panel Access */}
      {user && (user.role === 'admin' || user.role === 'super_admin') && (
        <div className="pt-4 border-t border-white/10">
          <a
            href="http://localhost:5173/admin"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl btn-liquid-ghost text-xs font-semibold text-white border border-white/20 transition-all"
          >
            <Shield className="w-4 h-4 text-white" />
            Admin Panel Access
          </a>
        </div>
      )}
    </aside>
  );
}

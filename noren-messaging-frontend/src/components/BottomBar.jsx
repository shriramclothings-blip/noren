import { NavLink } from 'react-router-dom';
import { Home, Compass, Video, Tv, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomBar() {
  const { user } = useAuth();

  const mobileTabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Reels', path: '/reels', icon: Video },
    { label: 'Watch', path: '/videos', icon: Tv },
    { label: 'Direct', path: '/messages', icon: MessageCircle },
    { label: 'Profile', path: user ? `/profile/${user.user_code || user.username || user.id}` : '/login', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 px-2 py-2.5">
      <div className="flex items-center justify-around">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${
                  isActive ? 'text-white font-bold scale-105' : 'text-neutral-400 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

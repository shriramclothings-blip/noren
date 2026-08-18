import { NavLink } from 'react-router-dom';
import { Home, Compass, Video, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomBar() {
  const { user } = useAuth();

  const mobileTabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Reels', path: '/reels', icon: Video },
    { label: 'Direct', path: '/messages', icon: MessageCircle },
    { label: 'Profile', path: user ? `/profile/${user.username || user.id}` : '/login', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800/80 px-2 py-2">
      <div className="flex items-center justify-around">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

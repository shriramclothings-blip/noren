import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Sun, Moon, Bell, Search, LogOut, User, Settings, ChevronDown, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSocket } from '../../contexts/SocketContext';
import { logout } from '../../api/auth';
import toast from 'react-hot-toast';

export function Header({ onToggleSidebar }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K global search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    signOut();
    navigate('/login');
    toast.success('Logged out');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchOpen(false);
      setSearchQ('');
    }
  };

  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center gap-2 px-4 border-b border-[var(--border)]"
      style={{
        left: 'var(--sidebar-w, 240px)',
        height: 'var(--header-h)',
        background: 'var(--surface)',
        transition: 'left 0.2s',
      }}
    >
      <button
        className="btn btn-ghost btn-sm p-1.5"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu size={16} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        {searchOpen ? (
          <input
            ref={searchRef}
            type="text"
            placeholder="Search tickets, customers, orders…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={handleSearch}
            onBlur={() => { if (!searchQ) setSearchOpen(false); }}
            className="input py-1.5 pl-8 text-xs w-full"
          />
        ) : (
          <button
            className="flex items-center gap-2 text-xs rounded-md px-3 py-1.5 border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}
            onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
          >
            <Search size={12} />
            <span>Search…</span>
            <kbd className="ml-4 text-[10px] px-1 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border)]">⌘K</kbd>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Socket status */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
          title={connected ? 'Connected' : 'Disconnected'}
          style={{ color: connected ? 'var(--success)' : 'var(--text-muted)' }}
        >
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        </div>

        {/* Theme */}
        <button className="btn btn-ghost btn-sm p-1.5" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <button className="btn btn-ghost btn-sm p-1.5 relative" onClick={() => navigate('/notifications')} aria-label="Notifications">
          <Bell size={15} />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-1.5 btn btn-ghost btn-sm px-2"
            onClick={() => setUserMenuOpen(o => !o)}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
            >
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="text-xs hidden sm:block max-w-[80px] truncate">{user?.name}</span>
            <ChevronDown size={12} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 card shadow-lg py-1 z-50"
              style={{ background: 'var(--surface)' }}
            >
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <p className="text-xs font-medium truncate">{user?.name}</p>
                <p className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role?.replace('_', ' ')}</p>
              </div>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--surface-3)] transition-colors"
                onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
              >
                <User size={13} /> Profile
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--surface-3)] transition-colors"
                onClick={() => { navigate('/admin/settings'); setUserMenuOpen(false); }}
              >
                <Settings size={13} /> Settings
              </button>
              <div className="border-t border-[var(--border)] mt-1" />
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--surface-3)] transition-colors text-red-600"
                onClick={handleLogout}
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

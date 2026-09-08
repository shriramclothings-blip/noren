import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, Users, ShoppingBag, Store, UserCheck,
  BarChart3, Settings, Shield, BookOpen, Zap, AlertTriangle,
  MessageSquare, ChevronDown, ChevronRight, Activity, Globe,
  TrendingUp, ClipboardList, FileText, Bell, Database, Search,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const NAV = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Support',
    items: [
      { to: '/tickets', label: 'All Tickets', icon: Ticket },
      { to: '/tickets/my', label: 'My Tickets', icon: ClipboardList },
      { to: '/tickets/unassigned', label: 'Unassigned', icon: Bell },
      { to: '/tickets/critical', label: 'Critical', icon: AlertTriangle, badge: 'critical' },
      { to: '/tickets/sla-risk', label: 'SLA Risk', icon: Zap },
    ],
  },
  {
    section: 'Customers',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/customers/activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    section: 'Orders',
    items: [
      { to: '/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/orders/issues', label: 'Order Issues', icon: AlertTriangle },
    ],
  },
  {
    section: 'Technical',
    items: [
      { to: '/incidents', label: 'Incidents', icon: Shield },
      { to: '/technical/logs', label: 'API / Errors', icon: Database },
    ],
    minRole: 'admin',
  },
  {
    section: 'Sellers',
    items: [
      { to: '/sellers', label: 'Sellers', icon: Store },
      { to: '/sellers/support', label: 'Seller Support', icon: MessageSquare },
    ],
  },
  {
    section: 'Influencers',
    items: [
      { to: '/influencers', label: 'Influencers', icon: UserCheck },
      { to: '/influencers/support', label: 'Influencer Support', icon: MessageSquare },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { to: '/analytics/visitors', label: 'Visitors', icon: Globe },
      { to: '/analytics/utm', label: 'UTM Analytics', icon: TrendingUp },
      { to: '/analytics/support', label: 'Support Analytics', icon: BarChart3 },
      { to: '/analytics/marketing', label: 'Marketing Intel', icon: Search },
    ],
  },
  {
    section: 'Communication',
    items: [
      { to: '/kb', label: 'Knowledge Base', icon: BookOpen },
      { to: '/quick-replies', label: 'Quick Replies', icon: FileText },
      { to: '/email-templates', label: 'Email Templates', icon: MessageSquare },
    ],
  },
  {
    section: 'Administration',
    minRole: 'admin',
    items: [
      { to: '/admin/team', label: 'Team', icon: Users },
      { to: '/admin/roles', label: 'Roles & Permissions', icon: Shield },
      { to: '/admin/sla', label: 'SLA Rules', icon: Zap },
      { to: '/admin/automation', label: 'Automation', icon: Activity },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }) {
  const { user, isAtLeast } = useAuth();
  const location = useLocation();
  const [collapsed2, setCollapsed2] = useState({});

  const toggleSection = (s) => setCollapsed2(p => ({ ...p, [s]: !p[s] }));

  return (
    <aside
      className="fixed top-0 left-0 h-full z-30 flex flex-col border-r border-[var(--border)] transition-all duration-200"
      style={{
        width: collapsed ? '56px' : '240px',
        background: 'var(--surface)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-[var(--border)]" style={{ height: 'var(--header-h)' }}>
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-serif font-bold text-base"
          style={{ background: 'var(--text-primary)', color: 'var(--accent)' }}
        >
          N
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-semibold tracking-wide truncate">NOREN</div>
            <div className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Support Portal</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV.map(({ section, items, minRole }) => {
          if (minRole && !isAtLeast(minRole)) return null;
          const isOpen = !collapsed2[section];
          return (
            <div key={section} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section)}
                  className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-semibold tracking-widest uppercase hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {section}
                  {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
              )}
              {(isOpen || collapsed) && (
                <div className="space-y-0.5">
                  {items.map(({ to, label, icon: Icon, badge }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        cn('sidebar-item', isActive && 'active', collapsed && 'justify-center px-2')
                      }
                      title={collapsed ? label : undefined}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {!collapsed && badge === 'critical' && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom user */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
            >
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-medium truncate">{user?.name || 'Admin'}</div>
              <div className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

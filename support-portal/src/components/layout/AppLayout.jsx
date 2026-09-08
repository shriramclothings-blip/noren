import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    window.innerWidth < 1024
  );

  useEffect(() => {
    const handler = () => setSidebarCollapsed(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const sidebarW = sidebarCollapsed ? '56px' : '240px';

  return (
    <div className="min-h-screen">
      <style>{`:root { --sidebar-w: ${sidebarW}; }`}</style>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <div
        className="flex flex-col min-h-screen transition-all duration-200"
        style={{ marginLeft: sidebarW }}
      >
        <Header onToggleSidebar={() => setSidebarCollapsed(c => !c)} />

        <main
          className="flex-1 p-4 md:p-6"
          style={{ marginTop: 'var(--header-h)', background: 'var(--surface-2)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

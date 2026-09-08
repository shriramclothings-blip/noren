import React from 'react';
import { cn } from '../../lib/utils';

export function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' }[size];
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', s, className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-[var(--accent)]" />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    </div>
  );
}

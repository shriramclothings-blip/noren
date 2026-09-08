import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, variant = 'default', className, dot }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    accent: 'bg-amber-100 text-amber-800',
    purple: 'bg-purple-100 text-purple-800',
    outline: 'border border-[var(--border)] text-[var(--text-secondary)]',
  };
  return (
    <span className={cn('badge', variants[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge priority-${priority}`}>
      {priority === 'critical' && '🔴 '}
      {priority === 'urgent' && '🟠 '}
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </span>
  );
}

export function StatusBadge({ status }) {
  const labels = {
    new: 'New', open: 'Open', in_progress: 'In Progress',
    waiting_customer: 'Waiting Customer', waiting_internal: 'Waiting Internal',
    escalated: 'Escalated', resolved: 'Resolved', closed: 'Closed', reopened: 'Reopened',
  };
  return (
    <span className={`badge status-${status}`}>
      {labels[status] || status}
    </span>
  );
}

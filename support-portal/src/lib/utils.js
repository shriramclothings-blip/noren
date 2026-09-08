import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatDate(d, opts = {}) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts,
  });
}

export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function formatCurrency(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function priorityLabel(p) {
  return { critical: 'Critical', urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' }[p] || p;
}

export function statusLabel(s) {
  return {
    new: 'New', open: 'Open', in_progress: 'In Progress',
    waiting_customer: 'Waiting Customer', waiting_internal: 'Waiting Internal',
    escalated: 'Escalated', resolved: 'Resolved', closed: 'Closed', reopened: 'Reopened',
  }[s] || s;
}

export function truncate(str, n = 60) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function getRoleColor(role) {
  const map = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    support: 'bg-green-100 text-green-800',
    technical: 'bg-yellow-100 text-yellow-800',
    seller: 'bg-orange-100 text-orange-800',
    influencer: 'bg-pink-100 text-pink-800',
    user: 'bg-gray-100 text-gray-700',
  };
  return map[role] || 'bg-gray-100 text-gray-700';
}

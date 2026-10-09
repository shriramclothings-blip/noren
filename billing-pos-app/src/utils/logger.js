import { dbAdd } from '../db/db';

const MAX_DETAIL_LEN = 4000;

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncate(str, maxLen = MAX_DETAIL_LEN) {
  const s = String(str ?? '');
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

export async function logEvent(level, message, detail) {
  try {
    await dbAdd('logs', {
      level,
      message: truncate(message),
      detail: detail == null ? null : truncate(typeof detail === 'string' ? detail : safeStringify(detail)),
      date: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
  } catch {
    // Never crash the app due to logging
  }
}

export function initGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Avoid double-registration
  if (window.__POS_LOGGING_INITIALIZED__) return;
  window.__POS_LOGGING_INITIALIZED__ = true;

  window.addEventListener('error', (event) => {
    const err = event?.error;
    logEvent('error', event?.message || 'Window error', {
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno,
      stack: err?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    logEvent('error', 'Unhandled promise rejection', {
      reason: typeof reason === 'object' ? (reason?.message || safeStringify(reason)) : String(reason),
      stack: reason?.stack,
    });
  });
}


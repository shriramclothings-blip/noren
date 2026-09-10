'use strict';
/**
 * NOREN Real-Time Monitor — Central Event Bus
 * ─────────────────────────────────────────────
 * All server events (HTTP requests, errors, emails, OTPs, orders, DB)
 * flow through here. Socket.IO picks them up and streams to the dashboard.
 *
 * Design:
 *  - Circular ring buffer (last 500 events kept in memory)
 *  - Per-route hit counters (resets on server restart)
 *  - Per-minute request rate tracking (last 60 mins)
 *  - Error log ring buffer (last 100 errors)
 *  - Special event log for named actions (orders, emails, OTPs, logins…)
 */

const EventEmitter = require('events');

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_EVENTS   = 500;   // live log ring buffer
const MAX_ERRORS   = 100;   // error log ring buffer
const MAX_ACTIVITY = 200;   // named activity ring buffer
const HISTORY_MINS = 60;    // per-minute buckets to keep

// ── Internal state ────────────────────────────────────────────────────────────
const bus = new EventEmitter();
bus.setMaxListeners(50);

// Circular buffers
const _events   = [];   // every HTTP hit
const _errors   = [];   // 4xx / 5xx
const _activity = [];   // named events (order, email, otp, login…)

// Counters
const _routeHits    = {};   // { 'GET /api/orders': 42 }
const _statusCounts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
const _methodCounts = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0, OTHER: 0 };

// Per-minute bucket — array of 60 numbers (index = minute offset, newest at tail)
const _perMinute = new Array(HISTORY_MINS).fill(0);
let _currentMinute = minuteKey();

// Process start time
const _startedAt = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────
function minuteKey() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function pushRing(arr, item, max) {
  arr.push(item);
  if (arr.length > max) arr.shift();
}

function bumpMinute() {
  const now = minuteKey();
  if (now !== _currentMinute) {
    // Gap fill with zeros if server was idle
    let diff = now - _currentMinute;
    if (diff < 0) diff += 24 * 60; // midnight rollover
    for (let i = 0; i < Math.min(diff, HISTORY_MINS); i++) {
      pushRing(_perMinute, 0, HISTORY_MINS);
    }
    _currentMinute = now;
  }
  _perMinute[_perMinute.length - 1]++;
}

// ── Core: record an HTTP request ─────────────────────────────────────────────
function recordRequest({ method, path, status, ms, ip, userAgent, error }) {
  bumpMinute();

  const m = (method || 'GET').toUpperCase();
  const routeKey = `${m} ${path}`;
  _routeHits[routeKey] = (_routeHits[routeKey] || 0) + 1;

  // status bucket
  const s = Math.floor(status / 100);
  const bucket = `${s}xx`;
  if (_statusCounts[bucket] !== undefined) _statusCounts[bucket]++;

  // method bucket
  _methodCounts[_methodCounts[m] !== undefined ? m : 'OTHER']++;

  const ev = {
    id:        Date.now() + Math.random(),
    ts:        new Date().toISOString(),
    type:      'http',
    method:    m,
    path,
    status,
    ms,
    ip:        ip || '—',
    userAgent: (userAgent || '').slice(0, 80),
    error:     error || null,
  };

  pushRing(_events, ev, MAX_EVENTS);

  if (status >= 400) {
    pushRing(_errors, { ...ev, type: 'error' }, MAX_ERRORS);
    bus.emit('error_event', ev);
  }

  bus.emit('request', ev);
  return ev;
}

// ── Named activity events (order, email, otp, login, signup…) ────────────────
function recordActivity({ type, label, detail, level, meta }) {
  const ev = {
    id:     Date.now() + Math.random(),
    ts:     new Date().toISOString(),
    type:   type   || 'event',
    label:  label  || type,
    detail: detail || '',
    level:  level  || 'info',   // info | success | warn | error
    meta:   meta   || {},
  };
  pushRing(_activity, ev, MAX_ACTIVITY);
  bus.emit('activity', ev);
  return ev;
}

// ── Getters ───────────────────────────────────────────────────────────────────
function getSnapshot() {
  return {
    uptime:       Math.floor((Date.now() - _startedAt) / 1000),
    startedAt:    new Date(_startedAt).toISOString(),
    totalRequests: Object.values(_statusCounts).reduce((a, b) => a + b, 0),
    statusCounts:  { ..._statusCounts },
    methodCounts:  { ..._methodCounts },
    perMinute:     [..._perMinute],
    topRoutes:     getTopRoutes(15),
    recentEvents:  [..._events].slice(-100).reverse(),
    recentErrors:  [..._errors].slice(-50).reverse(),
    recentActivity:[..._activity].slice(-50).reverse(),
    errorRate:     calcErrorRate(),
  };
}

function getTopRoutes(n = 10) {
  return Object.entries(_routeHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([route, hits]) => ({ route, hits }));
}

function calcErrorRate() {
  const total = Object.values(_statusCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return ((_statusCounts['4xx'] + _statusCounts['5xx']) / total * 100).toFixed(1);
}

// ── Expose ────────────────────────────────────────────────────────────────────
module.exports = {
  bus,
  recordRequest,
  recordActivity,
  getSnapshot,
  getTopRoutes,
  // direct access for the route handler
  _events,
  _errors,
  _activity,
  _routeHits,
  _statusCounts,
  _methodCounts,
  _perMinute,
  _startedAt,
};

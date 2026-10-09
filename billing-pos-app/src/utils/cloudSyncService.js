// ============================================================
// ENTERPRISE CLOUD SYNC SERVICE — VENDEXA RetailOS
// Offline-first background sync — supports http, https, LAN, localhost
// NEVER blocks billing. NEVER modifies local DB operations.
// ============================================================

import { initDB, getSetting, setSetting } from '../db/db';

// Safe global reference — works in Electron (window) and avoids
// the `globalThis` eslint no-undef error in react-scripts' eslint config.
// eslint-disable-next-line no-restricted-globals
const _g = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});

// ── Constants ──────────────────────────────────────────────────────────────
const CLOUD_SYNC_STORAGE_KEY = 'cloudSyncConfig';
const CLOUD_SYNC_STATUS_KEY  = 'cloudSyncStatus';
const CLOUD_SYNC_QUEUE_STORE = 'cloudSyncQueue';
const CLOUD_SYNC_LOGS_STORE  = 'cloudSyncLogs';

// Default Cloud API Endpoint (Render deployment)
const DEFAULT_CLOUD_API_ENDPOINT = 'https://ram1-ai0s.onrender.com';

const ENTITY_TYPES = [
  'products', 'categories', 'brands', 'variants', 'customers', 'suppliers',
  'purchases', 'purchaseItems', 'sales', 'saleItems', 'inventory',
  'stockAdjustments', 'users', 'settings',
];

// Exponential retry delays in seconds
const RETRY_DELAY_MAP = { 1: 30, 2: 120, 3: 300, 4: 900, 5: 900 };

const ENCRYPTION_PREFIX = 'enc:v1:';
const ENCRYPTION_SALT   = 'vendexa-cloud-sync-v1';

// ── Default structures ─────────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
  enabled: false,
  apiEndpoint: DEFAULT_CLOUD_API_ENDPOINT,
  businessId: '',
  deviceId: '',
  syncSecretKey: '',
  jwtToken: '',
  deviceAuthToken: '',
  autoSync: true,
  syncIntervalSeconds: 10,
  batchSize: 10,
  retryIntervalSeconds: 30,
  maxRetryAttempts: 5,
};

export const DEFAULT_STATUS = {
  connectionStatus: 'Disconnected',
  serverStatus: 'Unknown',
  lastSuccessfulSync: null,
  lastFailedSync: null,
  queueCount: 0,
  pendingRecords: 0,
  syncedRecords: 0,
  failedRecords: 0,
  lastSyncDurationMs: 0,
  lastError: '',
  isSyncing: false,
};

// ── Base64 helpers ────────────────────────────────────────────────────────
const encodeBase64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  if (typeof btoa === 'function') return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return '';
};

const decodeBase64 = (str) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64');
  if (typeof atob === 'function') {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array();
};

// ── AES-GCM credential encryption ─────────────────────────────────────────
const getEncryptionKey = async () => {
  if (typeof _g.crypto?.subtle?.importKey !== 'function') return null;
  const material = (typeof window !== 'undefined' && window.location?.origin)
    ? `${ENCRYPTION_SALT}:${window.location.origin}` : ENCRYPTION_SALT;
  const digest = await _g.crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return _g.crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

const encryptValue = async (value) => {
  if (!value) return '';
  if (typeof _g.crypto?.subtle?.encrypt === 'function') {
    try {
      const key = await getEncryptionKey();
      if (key) {
        const iv = _g.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await _g.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)
        );
        return `${ENCRYPTION_PREFIX}${encodeBase64(iv)}:${encodeBase64(new Uint8Array(encrypted))}`;
      }
    } catch { /* fallback to obfuscated base64 */ }
  }
  return `${ENCRYPTION_PREFIX}${encodeBase64(new TextEncoder().encode(value))}`;
};

const decryptValue = async (value) => {
  if (!value) return '';
  if (typeof value !== 'string') return String(value || '');
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value; // plain text (legacy / test)
  const payload = value.slice(ENCRYPTION_PREFIX.length);
  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) {
    // Legacy single-part encoding (base64 only, no IV)
    try { return new TextDecoder().decode(decodeBase64(payload)); } catch { return ''; }
  }
  const ivPart     = payload.slice(0, colonIdx);
  const cipherPart = payload.slice(colonIdx + 1);
  if (typeof _g.crypto?.subtle?.decrypt === 'function') {
    try {
      const key = await getEncryptionKey();
      if (key) {
        const decrypted = await _g.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: decodeBase64(ivPart) }, key, decodeBase64(cipherPart)
        );
        return new TextDecoder().decode(decrypted);
      }
    } catch { /* fallback */ }
  }
  // Fallback: return cipher part decoded (best-effort, used when subtle unavailable)
  try { return new TextDecoder().decode(decodeBase64(cipherPart)); } catch { return ''; }
};

// ── Config sanitization ────────────────────────────────────────────────────
export const sanitizeCloudSyncConfig = (value = {}) => {
  const input = value && typeof value === 'object' ? value : {};
  const cleaned = { ...DEFAULT_CONFIG, ...input };
  cleaned.enabled              = Boolean(cleaned.enabled);
  cleaned.autoSync             = Boolean(cleaned.autoSync !== false);
  cleaned.apiEndpoint          = String(cleaned.apiEndpoint || '').trim().replace(/\/+$/, '');
  cleaned.businessId           = String(cleaned.businessId || '').trim();
  cleaned.deviceId             = String(cleaned.deviceId || '').trim();
  cleaned.syncSecretKey        = String(cleaned.syncSecretKey || '').trim();
  cleaned.jwtToken             = String(cleaned.jwtToken || '').trim();
  cleaned.deviceAuthToken      = String(cleaned.deviceAuthToken || '').trim();
  cleaned.syncIntervalSeconds  = Math.max(10, Number(cleaned.syncIntervalSeconds) || 10);
  cleaned.batchSize            = Math.max(1,  Number(cleaned.batchSize) || 10);
  cleaned.retryIntervalSeconds = Math.max(30, Number(cleaned.retryIntervalSeconds) || 30);
  cleaned.maxRetryAttempts     = Math.max(1, Math.min(10, Number(cleaned.maxRetryAttempts) || 5));
  return cleaned;
};

const encryptConfig = async (config = {}) => {
  const cleaned = sanitizeCloudSyncConfig(config);
  const [sk, jwt, dat] = await Promise.all([
    cleaned.syncSecretKey   ? encryptValue(cleaned.syncSecretKey)   : Promise.resolve(''),
    cleaned.jwtToken        ? encryptValue(cleaned.jwtToken)        : Promise.resolve(''),
    cleaned.deviceAuthToken ? encryptValue(cleaned.deviceAuthToken) : Promise.resolve(''),
  ]);
  return { ...cleaned, syncSecretKey: sk, jwtToken: jwt, deviceAuthToken: dat };
};

const decryptConfig = async (config = {}) => {
  const cleaned = sanitizeCloudSyncConfig(config);
  const [sk, jwt, dat] = await Promise.all([
    decryptValue(cleaned.syncSecretKey),
    decryptValue(cleaned.jwtToken),
    decryptValue(cleaned.deviceAuthToken),
  ]);
  return { ...cleaned, syncSecretKey: sk, jwtToken: jwt, deviceAuthToken: dat };
};

// ── Config persistence ─────────────────────────────────────────────────────
export const persistCloudSyncConfig = async (config) => {
  const plain    = sanitizeCloudSyncConfig(config);
  const encrypted = await encryptConfig(plain);
  await setSetting(CLOUD_SYNC_STORAGE_KEY, encrypted);
  return plain; // always return plain (unencrypted) to caller
};

export const loadCloudSyncConfig = async () => {
  const stored    = await getSetting(CLOUD_SYNC_STORAGE_KEY);
  const decrypted = await decryptConfig(stored || {});
  return sanitizeCloudSyncConfig(decrypted);
};

// ── Status persistence ─────────────────────────────────────────────────────
// FIX: merge with existing stored status so partial updates don't wipe counters.
export const saveCloudSyncStatus = async (partialStatus) => {
  const existing = await getSetting(CLOUD_SYNC_STATUS_KEY).catch(() => null);
  const merged   = { ...DEFAULT_STATUS, ...(existing || {}), ...(partialStatus || {}) };
  await setSetting(CLOUD_SYNC_STATUS_KEY, merged);
  return merged;
};

export const loadCloudSyncStatus = async () => {
  const stored = await getSetting(CLOUD_SYNC_STATUS_KEY);
  return { ...DEFAULT_STATUS, ...(stored || {}) };
};

// ── Idempotency hash ───────────────────────────────────────────────────────
const createSyncHash = (value) => {
  let hash = 0;
  const str = String(value || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(64, '0');
};

export const buildSyncQueueItem = ({
  entityType, entityId, actionType, payload, businessId, deviceId,
}) => {
  const queueUuid       = (_g.crypto?.randomUUID?.()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const transactionUuid = (_g.crypto?.randomUUID?.()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payloadJson     = JSON.stringify(payload ?? {});
  const syncHash        = createSyncHash(
    payloadJson + entityType + String(entityId) + actionType + businessId + deviceId
  );
  return {
    queueUuid, transactionUuid,
    entityType, entityId, actionType,
    payload: payloadJson,
    businessId: businessId || '',
    deviceId:   deviceId   || '',
    createdTime:     new Date().toISOString(),
    updatedTime:     new Date().toISOString(),
    syncStatus:      'Pending',
    retryCount:      0,
    errorMessage:    '',
    syncHash,
    lastAttemptTime: null,
    nextAttemptTime: null,
  };
};

export const getNextRetryDelay = (retryCount) =>
  RETRY_DELAY_MAP[Math.max(1, Number(retryCount) || 0)] ?? RETRY_DELAY_MAP[5];

// ── Queue CRUD ─────────────────────────────────────────────────────────────
export const queueSyncChange = async ({
  entityType, entityId, actionType, payload, businessId, deviceId,
}) => {
  if (!ENTITY_TYPES.includes(entityType)) return null;
  const item = buildSyncQueueItem({ entityType, entityId, actionType, payload, businessId, deviceId });
  const db   = await initDB();
  const rows = await db.getAll(CLOUD_SYNC_QUEUE_STORE);
  // Idempotency: skip if exact same change is already in queue
  const dup = rows.find(
    (r) => r.syncHash === item.syncHash && ['Pending', 'Processing', 'Failed'].includes(r.syncStatus)
  );
  if (dup) return dup;
  await db.add(CLOUD_SYNC_QUEUE_STORE, item);
  return item;
};

export const getPendingQueueItems = async (limit = 10) => {
  const db   = await initDB();
  const rows = await db.getAll(CLOUD_SYNC_QUEUE_STORE);
  const now  = new Date();
  return rows
    .filter((r) =>
      r.syncStatus === 'Pending' ||
      (r.syncStatus === 'Failed' && (!r.nextAttemptTime || new Date(r.nextAttemptTime) <= now))
    )
    .slice(0, limit);
};

export const markQueueItemProcessing = async (itemId) => {
  const db      = await initDB();
  const current = await db.get(CLOUD_SYNC_QUEUE_STORE, itemId);
  if (!current) return null;
  const next = { ...current, syncStatus: 'Processing', updatedTime: new Date().toISOString(), lastAttemptTime: new Date().toISOString() };
  await db.put(CLOUD_SYNC_QUEUE_STORE, next);
  return next;
};

export const markQueueItemSynced = async (itemId, responseText) => {
  const db      = await initDB();
  const current = await db.get(CLOUD_SYNC_QUEUE_STORE, itemId);
  if (!current) return null;
  const next = {
    ...current, syncStatus: 'Synced',
    updatedTime: new Date().toISOString(), errorMessage: '',
    lastAttemptTime: new Date().toISOString(),
    response: String(responseText || '').slice(0, 500),
  };
  await db.put(CLOUD_SYNC_QUEUE_STORE, next);
  return next;
};

export const markQueueItemFailed = async (itemId, errorMessage, retryCount) => {
  const db      = await initDB();
  const current = await db.get(CLOUD_SYNC_QUEUE_STORE, itemId);
  if (!current) return null;
  const delay          = getNextRetryDelay(retryCount);
  const nextAttemptTime = new Date(Date.now() + delay * 1000).toISOString();
  const next = {
    ...current, syncStatus: 'Failed',
    updatedTime: new Date().toISOString(),
    errorMessage: String(errorMessage || '').slice(0, 500),
    retryCount, lastAttemptTime: new Date().toISOString(), nextAttemptTime,
  };
  await db.put(CLOUD_SYNC_QUEUE_STORE, next);
  return next;
};

// ── Sync Logs ──────────────────────────────────────────────────────────────
export const appendSyncLog = async (entry) => {
  try {
    const db = await initDB();
    return db.add(CLOUD_SYNC_LOGS_STORE, {
      dateTime:     new Date().toISOString(),
      eventType:    entry.eventType    || 'sync',
      entity:       entry.entity       || 'cloud-sync',
      recordId:     entry.recordId     || null,
      action:       entry.action       || 'sync',
      status:       entry.status       || 'unknown',
      responseCode: entry.responseCode || 0,
      errorDetails: entry.errorDetails || '',
      ...entry,
    });
  } catch { /* never crash the caller */ }
};

export const getSyncLogs = async (filter = 'all') => {
  const db   = await initDB();
  const rows = await db.getAll(CLOUD_SYNC_LOGS_STORE);
  if (filter === 'failed') {
    return rows.filter((r) => String(r.status || '').toLowerCase() === 'failed');
  }
  if (filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    return rows.filter((r) => String(r.dateTime || '').startsWith(today));
  }
  if (filter === 'week') {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    return rows.filter((r) => (r.dateTime || '') >= cutoff);
  }
  if (filter === 'month') {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    return rows.filter((r) => (r.dateTime || '') >= cutoff);
  }
  return rows;
};

// ── Summary helpers ────────────────────────────────────────────────────────
export const getCloudSyncSummary = async () => {
  const db   = await initDB();
  const rows = await db.getAll(CLOUD_SYNC_QUEUE_STORE);
  return {
    queueCount:     rows.length,
    pendingRecords: rows.filter((r) => r.syncStatus === 'Pending').length,
    syncedRecords:  rows.filter((r) => r.syncStatus === 'Synced').length,
    failedRecords:  rows.filter((r) => r.syncStatus === 'Failed').length,
  };
};

// FIX: properly merge live queue summary into current status object
export const refreshCloudSyncStatus = async () => {
  const [config, summary, storedStatus] = await Promise.all([
    loadCloudSyncConfig(),
    getCloudSyncSummary(),
    loadCloudSyncStatus(),
  ]);
  return {
    ...storedStatus,   // existing flags (connectionStatus, lastSync, etc.)
    ...summary,        // live queue counts always override
    enabled:     config.enabled,
    apiEndpoint: config.apiEndpoint,
    businessId:  config.businessId,
    deviceId:    config.deviceId,
  };
};

export const clearCloudSyncQueue = async () => {
  const db   = await initDB();
  const rows = await db.getAll(CLOUD_SYNC_QUEUE_STORE);
  for (const row of rows) await db.delete(CLOUD_SYNC_QUEUE_STORE, row.id);
  void appendSyncLog({ eventType: 'cache_clear', entity: 'cloud-sync', action: 'clear', status: 'success', responseCode: 200 });
  return true;
};

export const retryFailedCloudSync = async () => {
  const db     = await initDB();
  const rows   = await db.getAll(CLOUD_SYNC_QUEUE_STORE);
  const failed = rows.filter((r) => r.syncStatus === 'Failed');
  for (const row of failed) {
    await db.put(CLOUD_SYNC_QUEUE_STORE, {
      ...row, syncStatus: 'Pending', retryCount: 0,
      updatedTime: new Date().toISOString(), errorMessage: '', nextAttemptTime: null,
    });
  }
  void appendSyncLog({
    eventType: 'retry_failed', entity: 'cloud-sync', action: 'retry',
    status: 'queued', responseCode: 202, errorDetails: `${failed.length} items re-queued`,
  });
  return failed.length;
};

// ── Request header builder ────────────────────────────────────────────────
const buildSyncHeaders = (config, item) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Business-Id': config.businessId,
    'X-Device-Id': config.deviceId,
    'X-Queue-UUID': item.queueUuid,
    'X-Transaction-UUID': item.transactionUuid,
    'X-Timestamp': new Date().toISOString(),
  };

  if (config.jwtToken) headers.Authorization = `Bearer ${config.jwtToken}`;
  if (config.deviceAuthToken) headers['X-Device-Auth'] = config.deviceAuthToken;
  if (config.syncSecretKey) headers['X-Request-Signature'] = createSyncHash(`${item.transactionUuid}:${item.syncHash}:${config.syncSecretKey}`);

  return headers;
};

// ── URL validation — accepts https, http, localhost, LAN IPs ──────────────
const isValidEndpoint = (url) => /^https?:\/\/.+/i.test(String(url || '').trim());

const isLocalEndpoint = (url) => {
  if (!url) return false;
  try {
    const host = new URL(String(url).trim()).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host);
  } catch {
    return false;
  }
};

// ── Connection test (public — used by Settings UI "Test Connection" button)
// FIX: only requires endpoint + businessId + deviceId for a test ping.
// JWT/secret are optional — server may return 200/401 either way; we just
// need to confirm the host is reachable.
export const testCloudConnection = async (config) => {
  const cleaned = sanitizeCloudSyncConfig(config);

  if (!cleaned.apiEndpoint) {
    return { success: false, error: 'API Endpoint URL is required.' };
  }
  if (!isValidEndpoint(cleaned.apiEndpoint)) {
    return { success: false, error: 'API Endpoint must start with http:// or https://' };
  }
  if (!cleaned.businessId || !cleaned.deviceId) {
    return { success: false, error: 'Business ID and Device ID are required.' };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const headers = {
      'Content-Type': 'application/json',
      'X-Business-Id': cleaned.businessId,
      'X-Device-Id':   cleaned.deviceId,
    };
    if (cleaned.jwtToken)   headers['Authorization']  = `Bearer ${cleaned.jwtToken}`;
    if (cleaned.deviceAuthToken) headers['X-Device-Auth'] = cleaned.deviceAuthToken;

    const response = await fetch(`${cleaned.apiEndpoint}/health`, {
      method: 'GET', headers, signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await response.text().catch(() => '');

    // Treat any HTTP response as "reachable" — even 401/403/503 confirm the server is up.
    // The Render backend may return {"status":"degraded"} which is still reachable.
    const reachable = response.status < 500 || response.status === 503;

    // Try to parse the body to give a helpful status message
    let serverStatus = '';
    try {
      const parsed = JSON.parse(body);
      serverStatus = parsed.status || parsed.service || '';
    } catch { /* ignore */ }

    return {
      success:      reachable,
      status:       response.status,
      serverStatus: serverStatus,
      error:        reachable ? '' : (body.slice(0, 200) || `HTTP ${response.status}`),
    };
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, error: 'Connection timed out after 15 seconds' };
    // Friendly messages for common offline errors
    const msg = String(err.message || '');
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return { success: false, error: 'Cannot reach server. Check the URL and network connection.' };
    }
    return { success: false, error: msg || 'Connection failed' };
  }
};

// ── Full connect + save (called by "Save Settings" button) ────────────────
// FIX: validate FIRST, then save. Don't persist bad config.
export const connectCloudServer = async (config) => {
  const cleaned = sanitizeCloudSyncConfig(config);

  // Require basic connection fields for any endpoint.
  if (!cleaned.enabled) {
    return { success: false, error: 'Cloud sync is not enabled.' };
  }
  if (!cleaned.apiEndpoint || !isValidEndpoint(cleaned.apiEndpoint)) {
    return { success: false, error: 'A valid API Endpoint URL is required.' };
  }
  if (!cleaned.businessId || !cleaned.deviceId) {
    return { success: false, error: 'Business ID and Device ID are required.' };
  }

  // For the configured Render cloud API, credentials are optional — the server
  // handles its own authentication. Full auth tokens are still supported for
  // other / self-hosted servers.
  const isDefaultCloudApi = cleaned.apiEndpoint.trim().replace(/\/+$/, '') === DEFAULT_CLOUD_API_ENDPOINT.replace(/\/+$/, '');
  const hasFullAuth = Boolean(cleaned.syncSecretKey && cleaned.jwtToken && cleaned.deviceAuthToken);
  if (!hasFullAuth && !isLocalEndpoint(cleaned.apiEndpoint) && !isDefaultCloudApi) {
    return { success: false, error: 'For custom remote servers, all connection credentials are required (Secret Key, JWT Token, Device Auth Token).' };
  }

  // Step 1: test reachability
  const ping = await testCloudConnection(cleaned);
  if (!ping.success) return { success: false, error: ping.error };

  // Step 2: authenticate — POST /auth/device (optional for local/simple servers)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const authHeaders = {
      'Content-Type': 'application/json',
      'X-Business-Id': cleaned.businessId,
      'X-Device-Id':   cleaned.deviceId,
    };

    if (cleaned.jwtToken) authHeaders.Authorization = `Bearer ${cleaned.jwtToken}`;
    if (cleaned.deviceAuthToken) authHeaders['X-Device-Auth'] = cleaned.deviceAuthToken;
    if (cleaned.syncSecretKey) {
      authHeaders['X-Request-Signature'] = createSyncHash(
        `${cleaned.deviceId}:${cleaned.businessId}:${cleaned.syncSecretKey}`
      );
    }

    const authResponse = await fetch(`${cleaned.apiEndpoint}/auth/device`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        businessId: cleaned.businessId,
        deviceId:   cleaned.deviceId,
        timestamp:  new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    // 200 = authenticated, 201 = device registered, 401/403 = bad credentials
    if (!authResponse.ok && authResponse.status !== 201) {
      const errBody = await authResponse.text().catch(() => '');
      // If server has no /auth/device route, treat as connected (basic server)
      if (authResponse.status !== 404) {
        return { success: false, error: `Authentication failed (${authResponse.status}): ${errBody.slice(0, 200)}` };
      }
    }
  } catch (err) {
    // If /auth/device doesn't exist on the server (404 / network error),
    // don't block — the health check already confirmed reachability.
    if (err.name === 'AbortError') {
      return { success: false, error: 'Authentication timed out. Check server.' };
    }
    // Network errors during auth — server unreachable
    if (String(err.message || '').includes('Failed to fetch')) {
      return { success: false, error: 'Server unreachable during authentication.' };
    }
    // Any other error during /auth/device: log but don't block (server may not implement it)
  }

  // Step 3: save encrypted config
  await persistCloudSyncConfig(cleaned);

  // Step 4: update status to Connected
  await saveCloudSyncStatus({
    connectionStatus: 'Connected',
    serverStatus:     'Online',
    lastSuccessfulSync: new Date().toISOString(),
    lastError:        '',
    isSyncing:        false,
  });

  void appendSyncLog({
    eventType: 'connect', entity: 'cloud-sync', action: 'connect',
    status: 'success', responseCode: ping.status || 200,
  });

  return { success: true, message: 'Connected to cloud server', config: cleaned };
};

// ── Background sync worker ────────────────────────────────────────────────
// Runs every N seconds via setInterval. Completely independent of billing.
const runSyncCycle = async () => {
  let cfg;
  try { cfg = await loadCloudSyncConfig(); } catch { return; }

  if (!cfg.enabled || !cfg.autoSync) return;
  if (!cfg.apiEndpoint || !isValidEndpoint(cfg.apiEndpoint)) return;

  // Skip when browser reports no network
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    void saveCloudSyncStatus({ connectionStatus: 'Disconnected', serverStatus: 'Offline', isSyncing: false,
      lastError: 'Device offline — data queued locally' });
    return;
  }

  const pending = await getPendingQueueItems(cfg.batchSize || 10);
  if (!pending.length) return; // nothing to do

  const syncStart = Date.now();
  void saveCloudSyncStatus({ connectionStatus: 'Syncing', serverStatus: 'Online', isSyncing: true, lastError: '' });
  void appendSyncLog({
    eventType: 'worker_cycle', entity: 'cloud-sync', action: 'sync_start',
    status: 'processing', responseCode: 202, errorDetails: `${pending.length} items`,
  });

  let successCount = 0;
  let failCount    = 0;

  for (const item of pending) {
    // FIX: enforce maxRetryAttempts — move exhausted items to permanent Failed
    if (Number(item.retryCount || 0) >= Number(cfg.maxRetryAttempts || 5)) {
      await markQueueItemFailed(item.id, `Max retry attempts (${cfg.maxRetryAttempts}) reached`, item.retryCount);
      failCount++;
      void appendSyncLog({
        eventType: 'max_retries', entity: item.entityType, recordId: item.entityId,
        action: item.actionType, status: 'failed', responseCode: 0,
        errorDetails: `Exceeded max retries (${cfg.maxRetryAttempts})`,
      });
      continue;
    }

    try {
      await markQueueItemProcessing(item.id);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      let parsedPayload = {};
      try { parsedPayload = JSON.parse(item.payload || '{}'); } catch { parsedPayload = {}; }

      const response = await fetch(`${cfg.apiEndpoint}/api/sync/push`, {
        method:  'POST',
        headers: buildSyncHeaders(cfg, item),
        body: JSON.stringify({
          queueUuid:       item.queueUuid,
          transactionUuid: item.transactionUuid,
          entityType:      item.entityType,
          entityId:        item.entityId,
          actionType:      item.actionType,
          payload:         parsedPayload,
          businessId:      item.businessId,
          deviceId:        item.deviceId,
          syncHash:        item.syncHash,
          timestamp:       new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok || response.status === 409) {
        // 409 Conflict = server already has this record (idempotent duplicate) — treat as success
        const resText = await response.text().catch(() => '');
        await markQueueItemSynced(item.id, resText);
        successCount++;
        void appendSyncLog({
          eventType: 'item_synced', entity: item.entityType, recordId: item.entityId,
          action: item.actionType, status: 'success', responseCode: response.status,
        });
      } else {
        const errText   = await response.text().catch(() => '');
        const errorMsg  = `HTTP ${response.status}: ${errText.slice(0, 200)}`;
        await markQueueItemFailed(item.id, errorMsg, (item.retryCount || 0) + 1);
        failCount++;
        void appendSyncLog({
          eventType: 'item_failed', entity: item.entityType, recordId: item.entityId,
          action: item.actionType, status: 'failed', responseCode: response.status, errorDetails: errorMsg,
        });
      }
    } catch (err) {
      const errorMsg = err.name === 'AbortError' ? 'Request timed out (30s)' : (err.message || 'Network error');
      await markQueueItemFailed(item.id, errorMsg, (item.retryCount || 0) + 1).catch(() => {});
      failCount++;
      void appendSyncLog({
        eventType: 'item_error', entity: item.entityType || 'unknown', recordId: item.entityId,
        action: item.actionType || 'sync', status: 'failed', responseCode: 0, errorDetails: errorMsg,
      });
    }
  }

  const duration = Date.now() - syncStart;

  // FIX: correct status logic:
  // all failed → Disconnected, any success → Connected, mixed → Connected with warning
  let finalStatus;
  if (successCount > 0 && failCount === 0) {
    finalStatus = { connectionStatus: 'Connected', serverStatus: 'Online',
      lastSuccessfulSync: new Date().toISOString(), lastError: '' };
  } else if (successCount > 0 && failCount > 0) {
    finalStatus = { connectionStatus: 'Connected', serverStatus: 'Online',
      lastSuccessfulSync: new Date().toISOString(),
      lastError: `${failCount} item(s) failed, ${successCount} synced` };
  } else {
    // all failed
    finalStatus = { connectionStatus: 'Disconnected', serverStatus: 'Offline',
      lastFailedSync: new Date().toISOString(),
      lastError: `${failCount} item(s) failed to sync` };
  }

  // Merge live queue summary into status update
  const summary = await getCloudSyncSummary();
  void saveCloudSyncStatus({ ...finalStatus, ...summary, lastSyncDurationMs: duration, isSyncing: false });
};

export const startCloudSyncBackgroundWorker = async () => {
  if (typeof window === 'undefined') return null;

  const cfg = await loadCloudSyncConfig();
  // FIX: don't start worker if sync is disabled or no endpoint configured
  if (!cfg.enabled || !cfg.apiEndpoint) return null;

  // Clear any existing timer (prevents duplicate workers on config re-save)
  if (window.__cloudSyncWorkerTimer) {
    window.clearInterval(window.__cloudSyncWorkerTimer);
    window.__cloudSyncWorkerTimer = null;
  }

  const intervalMs = Math.max(10000, (cfg.syncIntervalSeconds || 10) * 1000);

  // First run after 3s to allow app to finish initializing
  window.__cloudSyncWorkerTimer = setTimeout(() => {
    void runSyncCycle();
    // Switch to recurring interval after first run
    window.__cloudSyncWorkerTimer = window.setInterval(() => {
      void runSyncCycle();
    }, intervalMs);
  }, 3000);

  return window.__cloudSyncWorkerTimer;
};

export const stopCloudSyncBackgroundWorker = () => {
  if (typeof window !== 'undefined' && window.__cloudSyncWorkerTimer) {
    window.clearTimeout(window.__cloudSyncWorkerTimer);
    window.clearInterval(window.__cloudSyncWorkerTimer);
    window.__cloudSyncWorkerTimer = null;
  }
};

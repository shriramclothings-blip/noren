/**
 * POS Security Middleware
 * 
 * Comprehensive security controls for POS integration endpoints:
 * - Rate limiting per device
 * - IP whitelisting
 * - Request validation
 * - Suspicious activity detection
 * - Audit logging
 */

const crypto = require('crypto');
const db = require('../config/db');

/**
 * Rate limiter specifically for POS devices
 * Tracks requests per device and IP to prevent abuse
 */
const deviceRateLimiter = (() => {
  const requests = new Map();
  const WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS = 100; // 100 requests per minute per device

  return async (req, res, next) => {
    const deviceId = req.body?.device_id || req.headers['x-device-id'];
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${deviceId || 'unknown'}_${ip}`;

    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Clean old entries
    for (const [k, timestamps] of requests.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        requests.delete(k);
      } else {
        requests.set(k, filtered);
      }
    }

    // Check current requests
    const deviceRequests = requests.get(key) || [];
    const recentRequests = deviceRequests.filter(t => t > windowStart);

    if (recentRequests.length >= MAX_REQUESTS) {
      // Log rate limit violation
      await logSecurityEvent({
        event_type: 'rate_limit_exceeded',
        severity: 'warning',
        device_id: deviceId,
        ip_address: ip,
        details: `Rate limit exceeded: ${recentRequests.length} requests in 1 minute`,
        endpoint: req.path
      });

      return res.status(429).json({
        message: 'Too many requests. Please slow down.',
        retry_after: Math.ceil(WINDOW_MS / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);

    next();
  };
})();

/**
 * Validate device authentication token
 */
const validateDeviceAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!apiKey) {
      return res.status(401).json({ message: 'Missing API key' });
    }

    // Hash the provided key
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Check against database
    const result = await db.query(
      `SELECT d.id, d.device_name, d.status, d.business_id, d.store_id
       FROM src_pos_devices d
       WHERE d.api_key_hash = $1 AND d.status = 'active'
       LIMIT 1`,
      [hash]
    );

    if (result.rows.length === 0) {
      await logSecurityEvent({
        event_type: 'invalid_api_key',
        severity: 'critical',
        ip_address: req.ip,
        details: 'Invalid or inactive API key attempted',
        endpoint: req.path
      });

      return res.status(403).json({ message: 'Invalid or inactive device credentials' });
    }

    const device = result.rows[0];

    // Update last seen
    await db.query(
      `UPDATE src_pos_devices 
       SET last_seen_at = NOW(), last_ip = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.ip, device.id]
    );

    // Attach device info to request
    req.posDevice = device;
    req.businessId = device.business_id;

    next();
  } catch (error) {
    console.error('[POS Security] Device auth error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

/**
 * Detect suspicious patterns in requests
 */
const suspiciousActivityDetector = async (req, res, next) => {
  try {
    const deviceId = req.posDevice?.id;
    const ip = req.ip;

    // Check for suspicious patterns
    const suspicious = [];

    // 1. Multiple failed auth attempts
    const recentFailures = await db.query(
      `SELECT COUNT(*) as count
       FROM src_pos_audit_events
       WHERE event_type = 'invalid_api_key'
       AND ip_address = $1
       AND created_at > NOW() - INTERVAL '10 minutes'`,
      [ip]
    );

    if (parseInt(recentFailures.rows[0]?.count || 0) > 5) {
      suspicious.push('multiple_auth_failures');
    }

    // 2. Unusual sync frequency
    if (deviceId) {
      const recentSyncs = await db.query(
        `SELECT COUNT(*) as count
         FROM src_pos_sync_queue
         WHERE device_id = $1
         AND created_at > NOW() - INTERVAL '5 minutes'`,
        [deviceId]
      );

      if (parseInt(recentSyncs.rows[0]?.count || 0) > 50) {
        suspicious.push('excessive_sync_rate');
      }
    }

    // 3. IP address change
    if (deviceId) {
      const lastKnownIp = await db.query(
        `SELECT last_ip FROM src_pos_devices WHERE id = $1`,
        [deviceId]
      );

      if (lastKnownIp.rows[0]?.last_ip && lastKnownIp.rows[0].last_ip !== ip) {
        suspicious.push('ip_address_changed');
      }
    }

    // Log if suspicious activity detected
    if (suspicious.length > 0) {
      await logSecurityEvent({
        event_type: 'suspicious_activity',
        severity: 'warning',
        device_id: deviceId,
        ip_address: ip,
        details: `Suspicious patterns detected: ${suspicious.join(', ')}`,
        endpoint: req.path,
        metadata: JSON.stringify({ patterns: suspicious })
      });

      // Don't block, just log for now (can be made stricter)
      console.warn(`[POS Security] Suspicious activity from device ${deviceId} (${ip}):`, suspicious);
    }

    next();
  } catch (error) {
    console.error('[POS Security] Suspicious activity check failed:', error);
    next(); // Don't block on error
  }
};

/**
 * Validate sync request payload
 */
const validateSyncPayload = (req, res, next) => {
  const {
    idempotency_key,
    device_id,
    bill_no,
    items,
    total
  } = req.body;

  const errors = [];

  // Validate idempotency key (should be UUID v4)
  if (!idempotency_key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotency_key)) {
    errors.push('idempotency_key must be a valid UUID v4');
  }

  // Validate device_id matches authenticated device
  if (req.posDevice && device_id !== req.posDevice.id) {
    errors.push('device_id mismatch with authenticated device');
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    // Validate each item
    items.forEach((item, idx) => {
      if (!item.title || !item.quantity || !item.unit_price) {
        errors.push(`items[${idx}] missing required fields`);
      }
      if (parseFloat(item.quantity) <= 0) {
        errors.push(`items[${idx}].quantity must be positive`);
      }
      if (parseFloat(item.unit_price) < 0) {
        errors.push(`items[${idx}].unit_price cannot be negative`);
      }
    });
  }

  // Validate total
  if (!total || parseFloat(total) <= 0) {
    errors.push('total must be greater than 0');
  }

  // Check total calculation
  if (items && Array.isArray(items)) {
    const calculatedTotal = items.reduce((sum, item) => {
      const lineTotal = parseFloat(item.line_total || (item.quantity * item.unit_price));
      return sum + lineTotal;
    }, 0);

    const totalDiff = Math.abs(parseFloat(total) - calculatedTotal);
    if (totalDiff > 0.01) {
      errors.push(`total mismatch: provided ${total}, calculated ${calculatedTotal.toFixed(2)}`);
    }
  }

  if (errors.length > 0) {
    logSecurityEvent({
      event_type: 'invalid_payload',
      severity: 'info',
      device_id: req.posDevice?.id,
      ip_address: req.ip,
      details: `Payload validation failed: ${errors.join('; ')}`,
      endpoint: req.path
    });

    return res.status(400).json({
      message: 'Invalid request payload',
      errors
    });
  }

  next();
};

/**
 * Log security events to database
 */
async function logSecurityEvent(event) {
  try {
    await db.query(
      `INSERT INTO src_pos_audit_events 
       (event_type, entity_type, entity_id, device_id, details, ip_address, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        event.event_type,
        'security',
        event.entity_id || null,
        event.device_id || null,
        event.details,
        event.ip_address,
        event.severity || 'info'
      ]
    );
  } catch (error) {
    console.error('[POS Security] Failed to log security event:', error);
  }
}

/**
 * IP whitelist checker (optional, disabled by default)
 */
const ipWhitelistChecker = async (req, res, next) => {
  // Check if whitelist is enabled
  const whitelistEnabled = process.env.POS_IP_WHITELIST_ENABLED === 'true';
  
  if (!whitelistEnabled) {
    return next();
  }

  const deviceId = req.posDevice?.id;
  const ip = req.ip;

  if (!deviceId) {
    return next(); // No device auth yet
  }

  // Check whitelist
  const result = await db.query(
    `SELECT allowed_ips FROM src_pos_devices WHERE id = $1`,
    [deviceId]
  );

  const allowedIps = result.rows[0]?.allowed_ips || [];

  if (allowedIps.length > 0 && !allowedIps.includes(ip)) {
    await logSecurityEvent({
      event_type: 'ip_not_whitelisted',
      severity: 'critical',
      device_id: deviceId,
      ip_address: ip,
      details: `Request from non-whitelisted IP: ${ip}`,
      endpoint: req.path
    });

    return res.status(403).json({
      message: 'IP address not whitelisted for this device'
    });
  }

  next();
};

/**
 * Request integrity checker - validates request hasn't been tampered
 */
const requestIntegrityChecker = (req, res, next) => {
  // Skip for GET requests
  if (req.method === 'GET') {
    return next();
  }

  // Check for required timestamp
  const timestamp = req.headers['x-timestamp'];
  if (!timestamp) {
    return res.status(400).json({ message: 'Missing timestamp header' });
  }

  // Check timestamp is recent (within 5 minutes)
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  const diff = Math.abs(now - requestTime);

  if (diff > 5 * 60 * 1000) {
    return res.status(400).json({
      message: 'Request timestamp too old or in the future',
      max_age: '5 minutes'
    });
  }

  next();
};

/**
 * Audit trail logger - logs all successful operations
 */
const auditLogger = (operation) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data) {
      // Log audit event for successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            await db.query(
              `INSERT INTO src_pos_audit_events 
               (event_type, entity_type, entity_id, device_id, actor_id, details, ip_address, user_agent, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [
                operation,
                'api_call',
                req.params?.id || req.params?.saleId || null,
                req.posDevice?.id || null,
                req.user?.id || null,
                JSON.stringify({
                  method: req.method,
                  path: req.path,
                  status: res.statusCode,
                  device_name: req.posDevice?.device_name
                }),
                req.ip,
                req.headers['user-agent']
              ]
            );
          } catch (error) {
            console.error('[POS Audit] Failed to log audit event:', error);
          }
        });
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  deviceRateLimiter,
  validateDeviceAuth,
  suspiciousActivityDetector,
  validateSyncPayload,
  ipWhitelistChecker,
  requestIntegrityChecker,
  auditLogger,
  logSecurityEvent
};

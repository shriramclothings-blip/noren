const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * PII Patterns to detect and mask
 */
const PII_PATTERNS = {
  phone: /(\+?1?[\s.-]?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{4}))/gi,
  email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
  ssn: /(\d{3}-\d{2}-\d{4})/gi,
  creditCard: /(\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4})/gi,
  zipcode: /\b\d{5}(-\d{4})?\b/g,
};

/**
 * Mask personally identifiable information in query
 * Returns: { maskedQuery, piiDetected, categories }
 */
function maskPII(query) {
  if (!query || typeof query !== 'string') return { maskedQuery: query, piiDetected: false, categories: [] };

  let maskedQuery = query;
  const piiCategories = [];

  // Mask email addresses
  if (PII_PATTERNS.email.test(maskedQuery)) {
    maskedQuery = maskedQuery.replace(PII_PATTERNS.email, '[EMAIL_MASKED]');
    piiCategories.push('email');
  }

  // Mask phone numbers
  if (PII_PATTERNS.phone.test(maskedQuery)) {
    maskedQuery = maskedQuery.replace(PII_PATTERNS.phone, '[PHONE_MASKED]');
    piiCategories.push('phone');
  }

  // Mask SSN
  if (PII_PATTERNS.ssn.test(maskedQuery)) {
    maskedQuery = maskedQuery.replace(PII_PATTERNS.ssn, '[SSN_MASKED]');
    piiCategories.push('ssn');
  }

  // Mask credit card
  if (PII_PATTERNS.creditCard.test(maskedQuery)) {
    maskedQuery = maskedQuery.replace(PII_PATTERNS.creditCard, '[CREDITCARD_MASKED]');
    piiCategories.push('creditcard');
  }

  const piiDetected = piiCategories.length > 0;
  if (piiDetected) {
    logger.info({ categories: piiCategories }, 'PII detected and masked');
  }

  return {
    maskedQuery,
    piiDetected,
    categories: piiCategories,
  };
}

/**
 * Validate SQL statement: ONLY SELECT, no dangerous keywords
 * Returns: true if safe SELECT, false otherwise
 */
function validateSelectOnlySQL(sql) {
  if (!sql || typeof sql !== 'string') return false;

  const normalized = sql.trim().toUpperCase();

  // Check if starts with SELECT
  if (!normalized.startsWith('SELECT')) {
    logger.warn({ sql: sql.substring(0, 100) }, 'SQL validation failed: not a SELECT statement');
    return false;
  }

  // Check for dangerous keywords (write operations, system access, etc.)
  const dangerousKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
    'TRUNCATE', 'EXEC', 'EXECUTE', 'PRAGMA', 'ATTACH', 'DETACH',
    'VACUUM', 'ANALYZE', 'REPLACE', 'GRANT', 'REVOKE',
  ];

  for (const keyword of dangerousKeywords) {
    if (normalized.includes(` ${keyword} `) || normalized.includes(`\n${keyword} `) || normalized.includes(`\t${keyword} `)) {
      logger.warn({ sql: sql.substring(0, 100), keyword }, 'SQL validation failed: dangerous keyword detected');
      return false;
    }
  }

  // Check for SQL injection patterns (multiple statements)
  if (sql.split(';').filter(s => s.trim().length > 0).length > 1) {
    logger.warn({ sql: sql.substring(0, 100) }, 'SQL validation failed: multiple statements detected');
    return false;
  }

  return true;
}

/**
 * Mask PII in response before returning to user
 */
function maskPIIInResponse(response) {
  if (!response || typeof response !== 'string') return response;

  let masked = response;

  // Mask common PII patterns in responses
  masked = masked.replace(PII_PATTERNS.email, '[EMAIL]');
  masked = masked.replace(PII_PATTERNS.phone, '[PHONE]');
  masked = masked.replace(PII_PATTERNS.ssn, '[SSN]');
  masked = masked.replace(PII_PATTERNS.creditCard, '[CARD]');

  return masked;
}

/**
 * Rate limit check per user
 * In production, use Redis or a database for distributed rate limiting
 */
const userQueryCounts = new Map();

function checkRateLimit(userId, maxPerHour = 100) {
  const now = Date.now();
  const key = `${userId}:${Math.floor(now / 3600000)}`;
  const count = userQueryCounts.get(key) || 0;

  if (count >= maxPerHour) {
    logger.warn({ userId, count, maxPerHour }, 'Rate limit exceeded');
    return false;
  }

  userQueryCounts.set(key, count + 1);

  // Cleanup old entries
  if (userQueryCounts.size > 10000) {
    for (const [k] of userQueryCounts.entries()) {
      if (k < now - 7200000) userQueryCounts.delete(k);
    }
  }

  return true;
}

module.exports = {
  maskPII,
  maskPIIInResponse,
  validateSelectOnlySQL,
  checkRateLimit,
};

/**
 * Audit Logging Utility
 * Creates immutable audit trail for sensitive operations
 */

/**
 * Log an audit event
 * @param {Object} pool - Database pool
 * @param {Object} options - Audit event details
 * @param {number} options.adminId - User ID performing action
 * @param {string} options.action - Action performed
 * @param {string} options.targetType - Type of resource affected
 * @param {number} options.targetId - ID of affected resource
 * @param {Object} options.details - Additional details
 * @param {string} options.ipAddress - IP address (optional)
 * @param {string} options.userAgent - User agent (optional)
 */
async function logAudit(pool, options) {
  const {
    adminId,
    action,
    targetType,
    targetId,
    details = {},
    ipAddress = null,
    userAgent = null,
  } = options;

  try {
    await pool.query(
      `INSERT INTO src_email_audit (
        user_id, action, resource_type, resource_id, 
        details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminId,
        action,
        targetType,
        targetId || null,
        JSON.stringify(details),
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    // Log audit failure but don't throw - auditing shouldn't break operations
    console.error('Audit logging failed:', err.message);
  }
}

module.exports = { logAudit };

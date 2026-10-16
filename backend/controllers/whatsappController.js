/**
 * WhatsApp Controller - API Endpoints
 * Handles WhatsApp instance management, messaging, and administration
 * 
 * @module controllers/whatsappController
 */

const { pool } = require('../config/db');
const whatsappService = require('../services/whatsappService');

/**
 * Create new WhatsApp instance
 * POST /api/whatsapp/instances/create
 */
exports.createInstance = async (req, res) => {
    try {
        const { instanceName } = req.body;
        
        if (!instanceName) {
            return res.status(400).json({
                success: false,
                message: 'Instance name is required'
            });
        }
        
        const result = await whatsappService.createInstance(instanceName);
        
        res.json(result);
    } catch (error) {
        console.error('Error creating WhatsApp instance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create WhatsApp instance',
            error: error.message
        });
    }
};

/**
 * Get instance status and QR code
 * GET /api/whatsapp/instances/:instanceName/status
 */
exports.getInstanceStatus = async (req, res) => {
    try {
        const { instanceName } = req.params;
        
        const result = await whatsappService.getInstanceStatus(instanceName);
        
        res.json(result);
    } catch (error) {
        console.error('Error getting instance status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get instance status',
            error: error.message
        });
    }
};

/**
 * List all instances
 * GET /api/whatsapp/instances
 */
exports.listInstances = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, instance_name, phone_number, status, connected_at, 
                    created_at, is_active, is_default
             FROM wa_instances
             ORDER BY is_default DESC, created_at DESC`
        );
        
        res.json({
            success: true,
            instances: result.rows
        });
    } catch (error) {
        console.error('Error listing instances:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list instances',
            error: error.message
        });
    }
};

/**
 * Disconnect instance
 * POST /api/whatsapp/instances/:instanceName/disconnect
 */
exports.disconnectInstance = async (req, res) => {
    try {
        const { instanceName } = req.params;
        
        const result = await whatsappService.disconnectInstance(instanceName);
        
        res.json(result);
    } catch (error) {
        console.error('Error disconnecting instance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect instance',
            error: error.message
        });
    }
};

/**
 * Send manual message
 * POST /api/whatsapp/send
 */
exports.sendMessage = async (req, res) => {
    try {
        const { phone, message, instanceName = 'default' } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                message: 'Phone and message are required'
            });
        }
        
        const result = await whatsappService.sendMessage(instanceName, phone, message);
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            data: result
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

/**
 * Send template message
 * POST /api/whatsapp/send-template
 */
exports.sendTemplateMessage = async (req, res) => {
    try {
        const { templateName, phone, variables, instanceName = 'default' } = req.body;
        
        if (!templateName || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Template name and phone are required'
            });
        }
        
        const result = await whatsappService.sendTemplateMessage(
            templateName,
            phone,
            variables,
            instanceName
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error sending template message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send template message',
            error: error.message
        });
    }
};

/**
 * Get message templates
 * GET /api/whatsapp/templates
 */
exports.getTemplates = async (req, res) => {
    try {
        const { category, type } = req.query;
        
        let query = 'SELECT * FROM wa_message_templates WHERE is_active = true';
        const params = [];
        
        if (category) {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }
        
        if (type) {
            params.push(type);
            query += ` AND template_type = $${params.length}`;
        }
        
        query += ' ORDER BY priority DESC, template_name ASC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            templates: result.rows
        });
    } catch (error) {
        console.error('Error getting templates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get templates',
            error: error.message
        });
    }
};

/**
 * Create or update template
 * POST /api/whatsapp/templates
 */
exports.saveTemplate = async (req, res) => {
    try {
        const {
            id,
            templateName,
            templateType,
            category,
            subject,
            messageBody,
            variables,
            isActive
        } = req.body;
        
        if (!templateName || !messageBody || !category) {
            return res.status(400).json({
                success: false,
                message: 'Template name, message body, and category are required'
            });
        }
        
        let result;
        
        if (id) {
            // Update existing template
            result = await pool.query(
                `UPDATE wa_message_templates
                 SET template_name = $1, template_type = $2, category = $3,
                     subject = $4, message_body = $5, variables = $6,
                     is_active = $7, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $8
                 RETURNING *`,
                [templateName, templateType, category, subject, messageBody, 
                 JSON.stringify(variables || []), isActive !== false, id]
            );
        } else {
            // Create new template
            result = await pool.query(
                `INSERT INTO wa_message_templates
                 (template_name, template_type, category, subject, message_body, 
                  variables, is_active, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [templateName, templateType, category, subject, messageBody,
                 JSON.stringify(variables || []), isActive !== false, req.user?.id]
            );
        }
        
        res.json({
            success: true,
            message: id ? 'Template updated successfully' : 'Template created successfully',
            template: result.rows[0]
        });
    } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save template',
            error: error.message
        });
    }
};

/**
 * Delete template
 * DELETE /api/whatsapp/templates/:id
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query(
            'UPDATE wa_message_templates SET is_active = false WHERE id = $1',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete template',
            error: error.message
        });
    }
};

/**
 * Get message logs
 * GET /api/whatsapp/logs
 */
exports.getMessageLogs = async (req, res) => {
    try {
        const { 
            status, 
            messageType, 
            phone, 
            startDate, 
            endDate, 
            limit = 100, 
            offset = 0 
        } = req.query;
        
        let query = `
            SELECT l.*, t.template_name, i.instance_name
            FROM wa_message_logs l
            LEFT JOIN wa_message_templates t ON l.template_id = t.id
            LEFT JOIN wa_instances i ON l.instance_id = i.id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            params.push(status);
            query += ` AND l.status = $${params.length}`;
        }
        
        if (messageType) {
            params.push(messageType);
            query += ` AND l.message_type = $${params.length}`;
        }
        
        if (phone) {
            params.push(`%${phone}%`);
            query += ` AND l.recipient_phone LIKE $${params.length}`;
        }
        
        if (startDate) {
            params.push(startDate);
            query += ` AND l.created_at >= $${params.length}`;
        }
        
        if (endDate) {
            params.push(endDate);
            query += ` AND l.created_at <= $${params.length}`;
        }
        
        query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) FROM wa_message_logs l WHERE 1=1
            ${status ? `AND l.status = '${status}'` : ''}
            ${messageType ? `AND l.message_type = '${messageType}'` : ''}
            ${phone ? `AND l.recipient_phone LIKE '%${phone}%'` : ''}
        `;
        const countResult = await pool.query(countQuery);
        
        res.json({
            success: true,
            logs: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error getting message logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get message logs',
            error: error.message
        });
    }
};

/**
 * Get WhatsApp settings
 * GET /api/whatsapp/settings
 */
exports.getSettings = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM wa_settings ORDER BY category, setting_key'
        );
        
        // Convert to key-value object
        const settings = {};
        result.rows.forEach(row => {
            let value = row.setting_value;
            
            // Parse value based on type
            if (row.setting_type === 'boolean') {
                value = value === 'true';
            } else if (row.setting_type === 'number') {
                value = parseFloat(value);
            } else if (row.setting_type === 'json') {
                value = JSON.parse(value);
            }
            
            settings[row.setting_key] = {
                value,
                type: row.setting_type,
                category: row.category,
                description: row.description
            };
        });
        
        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get settings',
            error: error.message
        });
    }
};

/**
 * Update WhatsApp setting
 * PUT /api/whatsapp/settings/:key
 */
exports.updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        
        // Get current setting
        const current = await pool.query(
            'SELECT * FROM wa_settings WHERE setting_key = $1',
            [key]
        );
        
        if (current.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }
        
        // Convert value to string based on type
        let stringValue = value;
        if (typeof value === 'object') {
            stringValue = JSON.stringify(value);
        } else {
            stringValue = String(value);
        }
        
        await pool.query(
            `UPDATE wa_settings 
             SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE setting_key = $3`,
            [stringValue, req.user?.id, key]
        );
        
        res.json({
            success: true,
            message: 'Setting updated successfully'
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting',
            error: error.message
        });
    }
};

/**
 * Get analytics/dashboard data
 * GET /api/whatsapp/analytics
 */
exports.getAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Total messages by status
        const statusStats = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM wa_message_logs
            ${startDate ? `WHERE created_at >= $1` : ''}
            ${startDate && endDate ? `AND created_at <= $2` : endDate ? `WHERE created_at <= $1` : ''}
            GROUP BY status
        `, startDate && endDate ? [startDate, endDate] : startDate ? [startDate] : endDate ? [endDate] : []);
        
        // Messages by type
        const typeStats = await pool.query(`
            SELECT message_type, COUNT(*) as count
            FROM wa_message_logs
            ${startDate ? `WHERE created_at >= $1` : ''}
            ${startDate && endDate ? `AND created_at <= $2` : endDate ? `WHERE created_at <= $1` : ''}
            GROUP BY message_type
        `, startDate && endDate ? [startDate, endDate] : startDate ? [startDate] : endDate ? [endDate] : []);
        
        // Daily message count (last 7 days)
        const dailyStats = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count, status
            FROM wa_message_logs
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(created_at), status
            ORDER BY date DESC
        `);
        
        // Instance stats
        const instanceStats = await pool.query(`
            SELECT i.instance_name, i.status, i.phone_number,
                   COUNT(l.id) as total_messages,
                   COUNT(CASE WHEN l.status = 'sent' THEN 1 END) as sent_count,
                   COUNT(CASE WHEN l.status = 'delivered' THEN 1 END) as delivered_count
            FROM wa_instances i
            LEFT JOIN wa_message_logs l ON i.id = l.instance_id
            GROUP BY i.id, i.instance_name, i.status, i.phone_number
        `);
        
        res.json({
            success: true,
            analytics: {
                statusStats: statusStats.rows,
                typeStats: typeStats.rows,
                dailyStats: dailyStats.rows,
                instanceStats: instanceStats.rows
            }
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics',
            error: error.message
        });
    }
};

/**
 * Get incoming messages
 * GET /api/whatsapp/incoming
 */
exports.getIncomingMessages = async (req, res) => {
    try {
        const { limit = 50, offset = 0, isRead } = req.query;
        
        let query = `
            SELECT m.*, i.instance_name
            FROM wa_incoming_messages m
            LEFT JOIN wa_instances i ON m.instance_id = i.id
            WHERE 1=1
        `;
        const params = [];
        
        if (isRead !== undefined) {
            params.push(isRead === 'true');
            query += ` AND m.is_read = $${params.length}`;
        }
        
        query += ` ORDER BY m.received_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            messages: result.rows
        });
    } catch (error) {
        console.error('Error getting incoming messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get incoming messages',
            error: error.message
        });
    }
};

/**
 * Mark incoming message as read
 * PUT /api/whatsapp/incoming/:id/read
 */
exports.markMessageRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query(
            'UPDATE wa_incoming_messages SET is_read = true WHERE id = $1',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Message marked as read'
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark message as read',
            error: error.message
        });
    }
};

module.exports = exports;

/**
 * Reset/Clear WhatsApp instance session
 * POST /api/whatsapp/instances/:instanceName/reset
 */
exports.resetInstance = async (req, res) => {
    try {
        const { instanceName } = req.params;
        
        // Clear from memory
        const whatsappService = require('../services/whatsappService');
        const instance = whatsappService.instances.get(instanceName);
        if (instance) {
            try {
                await instance.socket.logout();
            } catch (e) {
                // Ignore logout errors
            }
            whatsappService.instances.delete(instanceName);
        }
        
        // Clear from database
        await pool.query(
            `UPDATE wa_instances 
             SET status = 'disconnected',
                 session_data = NULL,
                 qr_code = NULL,
                 phone_number = NULL,
                 disconnected_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE instance_name = $1`,
            [instanceName]
        );
        
        console.log(`🧹 Instance ${instanceName} reset successfully`);
        
        res.json({
            success: true,
            message: 'Instance reset successfully. You can now generate a new QR code.'
        });
    } catch (error) {
        console.error('Error resetting instance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset instance',
            error: error.message
        });
    }
};

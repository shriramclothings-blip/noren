/**
 * WhatsApp Campaign Controller
 * Handles promotional campaigns and bulk messaging
 * 
 * @module controllers/whatsappCampaignController
 */

const pool = require('../config/db');
const { sendBulkPromotional } = require('../utils/whatsappNotifications');
const whatsappService = require('../services/whatsappService');

/**
 * Create new campaign
 * POST /api/whatsapp/campaigns
 */
exports.createCampaign = async (req, res) => {
    try {
        const {
            campaignName,
            templateId,
            targetAudience,
            scheduleTime,
            instanceName = 'default'
        } = req.body;
        
        if (!campaignName || !templateId) {
            return res.status(400).json({
                success: false,
                message: 'Campaign name and template are required'
            });
        }
        
        // Get instance ID
        const instanceResult = await pool.query(
            'SELECT id FROM wa_instances WHERE instance_name = $1',
            [instanceName]
        );
        
        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'WhatsApp instance not found'
            });
        }
        
        const instanceId = instanceResult.rows[0].id;
        
        // Calculate target recipients count
        let countQuery = 'SELECT COUNT(*) FROM src_users WHERE mobile IS NOT NULL';
        const countParams = [];
        
        if (targetAudience?.minOrders) {
            countParams.push(targetAudience.minOrders);
            countQuery += ` AND (SELECT COUNT(*) FROM src_orders WHERE user_id = src_users.id) >= $${countParams.length}`;
        }
        
        if (targetAudience?.status) {
            countParams.push(targetAudience.status);
            countQuery += ` AND status = $${countParams.length}`;
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const totalRecipients = parseInt(countResult.rows[0].count);
        
        // Create campaign
        const result = await pool.query(
            `INSERT INTO wa_campaigns 
             (campaign_name, template_id, instance_id, target_audience, 
              total_recipients, schedule_time, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                campaignName,
                templateId,
                instanceId,
                JSON.stringify(targetAudience || {}),
                totalRecipients,
                scheduleTime || null,
                scheduleTime ? 'scheduled' : 'draft',
                req.user?.id
            ]
        );
        
        res.json({
            success: true,
            message: 'Campaign created successfully',
            campaign: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create campaign',
            error: error.message
        });
    }
};

/**
 * Get all campaigns
 * GET /api/whatsapp/campaigns
 */
exports.getCampaigns = async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT c.*, t.template_name, i.instance_name, u.name as created_by_name
            FROM wa_campaigns c
            LEFT JOIN wa_message_templates t ON c.template_id = t.id
            LEFT JOIN wa_instances i ON c.instance_id = i.id
            LEFT JOIN src_users u ON c.created_by = u.id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            params.push(status);
            query += ` AND c.status = $${params.length}`;
        }
        
        query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            campaigns: result.rows
        });
    } catch (error) {
        console.error('Error getting campaigns:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get campaigns',
            error: error.message
        });
    }
};

/**
 * Get campaign by ID with recipients
 * GET /api/whatsapp/campaigns/:id
 */
exports.getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get campaign details
        const campaignResult = await pool.query(`
            SELECT c.*, t.template_name, t.message_body, i.instance_name
            FROM wa_campaigns c
            LEFT JOIN wa_message_templates t ON c.template_id = t.id
            LEFT JOIN wa_instances i ON c.instance_id = i.id
            WHERE c.id = $1
        `, [id]);
        
        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }
        
        const campaign = campaignResult.rows[0];
        
        // Get recipients
        const recipientsResult = await pool.query(`
            SELECT r.*, u.name as user_name
            FROM wa_campaign_recipients r
            LEFT JOIN src_users u ON r.user_id = u.id
            WHERE r.campaign_id = $1
            ORDER BY r.sent_at DESC NULLS LAST
        `, [id]);
        
        res.json({
            success: true,
            campaign: {
                ...campaign,
                recipients: recipientsResult.rows
            }
        });
    } catch (error) {
        console.error('Error getting campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get campaign',
            error: error.message
        });
    }
};

/**
 * Start/launch campaign
 * POST /api/whatsapp/campaigns/:id/launch
 */
exports.launchCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { variables = {} } = req.body;
        
        // Get campaign details
        const campaignResult = await pool.query(`
            SELECT c.*, t.template_name, i.instance_name
            FROM wa_campaigns c
            LEFT JOIN wa_message_templates t ON c.template_id = t.id
            LEFT JOIN wa_instances i ON c.instance_id = i.id
            WHERE c.id = $1
        `, [id]);
        
        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }
        
        const campaign = campaignResult.rows[0];
        
        if (campaign.status === 'running' || campaign.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: `Campaign is already ${campaign.status}`
            });
        }
        
        // Update campaign status
        await pool.query(
            `UPDATE wa_campaigns 
             SET status = 'running', started_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [id]
        );
        
        // Get target users
        const targetAudience = campaign.target_audience || {};
        let userQuery = 'SELECT id, name, mobile FROM src_users WHERE mobile IS NOT NULL';
        const userParams = [];
        
        if (targetAudience.minOrders) {
            userParams.push(targetAudience.minOrders);
            userQuery += ` AND (SELECT COUNT(*) FROM src_orders WHERE user_id = src_users.id) >= $${userParams.length}`;
        }
        
        if (targetAudience.status) {
            userParams.push(targetAudience.status);
            userQuery += ` AND status = $${userParams.length}`;
        }
        
        const usersResult = await pool.query(userQuery, userParams);
        
        // Create campaign recipients
        for (const user of usersResult.rows) {
            await pool.query(
                `INSERT INTO wa_campaign_recipients 
                 (campaign_id, user_id, phone_number, status)
                 VALUES ($1, $2, $3, 'pending')`,
                [id, user.id, user.mobile]
            );
        }
        
        // Start sending messages asynchronously
        sendCampaignMessages(id, campaign.template_name, variables).catch(error => {
            console.error('Error sending campaign messages:', error);
        });
        
        res.json({
            success: true,
            message: 'Campaign launched successfully',
            recipientsCount: usersResult.rows.length
        });
    } catch (error) {
        console.error('Error launching campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to launch campaign',
            error: error.message
        });
    }
};

/**
 * Pause campaign
 * POST /api/whatsapp/campaigns/:id/pause
 */
exports.pauseCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query(
            `UPDATE wa_campaigns SET status = 'paused' WHERE id = $1`,
            [id]
        );
        
        res.json({
            success: true,
            message: 'Campaign paused successfully'
        });
    } catch (error) {
        console.error('Error pausing campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to pause campaign',
            error: error.message
        });
    }
};

/**
 * Cancel campaign
 * POST /api/whatsapp/campaigns/:id/cancel
 */
exports.cancelCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query(
            `UPDATE wa_campaigns SET status = 'cancelled' WHERE id = $1`,
            [id]
        );
        
        res.json({
            success: true,
            message: 'Campaign cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel campaign',
            error: error.message
        });
    }
};

/**
 * Delete campaign
 * DELETE /api/whatsapp/campaigns/:id
 */
exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Delete campaign recipients first
        await pool.query('DELETE FROM wa_campaign_recipients WHERE campaign_id = $1', [id]);
        
        // Delete campaign
        await pool.query('DELETE FROM wa_campaigns WHERE id = $1', [id]);
        
        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete campaign',
            error: error.message
        });
    }
};

/**
 * Internal function to send campaign messages
 */
async function sendCampaignMessages(campaignId, templateName, variables) {
    try {
        // Get pending recipients
        const recipientsResult = await pool.query(`
            SELECT r.*, u.name as user_name
            FROM wa_campaign_recipients r
            LEFT JOIN src_users u ON r.user_id = u.id
            WHERE r.campaign_id = $1 AND r.status = 'pending'
            ORDER BY r.id
        `, [campaignId]);
        
        let sentCount = 0;
        let failedCount = 0;
        
        for (const recipient of recipientsResult.rows) {
            try {
                const userVariables = {
                    customerName: recipient.user_name || 'Customer',
                    ...variables
                };
                
                await whatsappService.sendTemplateMessage(
                    templateName,
                    recipient.phone_number,
                    userVariables
                );
                
                // Update recipient status
                await pool.query(
                    `UPDATE wa_campaign_recipients 
                     SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
                     WHERE id = $1`,
                    [recipient.id]
                );
                
                sentCount++;
            } catch (error) {
                console.error(`Failed to send to ${recipient.phone_number}:`, error);
                
                await pool.query(
                    `UPDATE wa_campaign_recipients 
                     SET status = 'failed' 
                     WHERE id = $1`,
                    [recipient.id]
                );
                
                failedCount++;
            }
            
            // Update campaign progress
            await pool.query(
                `UPDATE wa_campaigns 
                 SET sent_count = $1, failed_count = $2 
                 WHERE id = $3`,
                [sentCount, failedCount, campaignId]
            );
            
            // Add small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Mark campaign as completed
        await pool.query(
            `UPDATE wa_campaigns 
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [campaignId]
        );
        
        console.log(`✅ Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
    } catch (error) {
        console.error('Error in sendCampaignMessages:', error);
        
        // Mark campaign as failed
        await pool.query(
            `UPDATE wa_campaigns SET status = 'failed' WHERE id = $1`,
            [campaignId]
        );
    }
}

module.exports = exports;

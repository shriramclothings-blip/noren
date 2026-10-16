/**
 * WhatsApp Notification Helpers
 * Helper functions to send WhatsApp notifications for various events
 * 
 * @module utils/whatsappNotifications
 */

const { pool } = require('../config/db');

// Lazy-load whatsappService to avoid blocking server startup
function getWhatsAppService() {
    return require('../services/whatsappService');
}

/**
 * Check if WhatsApp notifications are enabled globally
 */
async function isWhatsAppEnabled(category = 'general') {
    try {
        const result = await pool.query(
            'SELECT setting_value FROM wa_settings WHERE setting_key = $1',
            [`wa_${category}_enabled`]
        );
        
        if (result.rows.length === 0) return false;
        return result.rows[0].setting_value === 'true';
    } catch (error) {
        console.error('Error checking WhatsApp enabled status:', error);
        return false;
    }
}

/**
 * Get user's phone number
 */
async function getUserPhone(userId) {
    try {
        const result = await pool.query(
            'SELECT mobile, phone FROM src_users WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) return null;
        return result.rows[0].mobile || result.rows[0].phone;
    } catch (error) {
        console.error('Error getting user phone:', error);
        return null;
    }
}

/**
 * Send order confirmation WhatsApp message
 */
async function sendOrderConfirmation(orderId, userId) {
    try {
        // Check if order notifications are enabled
        const enabled = await isWhatsAppEnabled('order_notifications');
        if (!enabled) {
            console.log('WhatsApp order notifications are disabled');
            return;
        }
        
        // Get order details
        const orderResult = await pool.query(`
            SELECT o.*, u.name as customer_name, u.mobile, u.email
            FROM src_orders o
            JOIN src_users u ON o.user_id = u.id
            WHERE o.id = $1
        `, [orderId]);
        
        if (orderResult.rows.length === 0) {
            console.error('Order not found:', orderId);
            return;
        }
        
        const order = orderResult.rows[0];
        
        // Get order items count
        const itemsResult = await pool.query(
            'SELECT COUNT(*) as count FROM src_order_items WHERE order_id = $1',
            [orderId]
        );
        
        const itemCount = itemsResult.rows[0].count;
        
        // Calculate delivery date (7 days from now)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 7);
        const formattedDate = deliveryDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        // Get phone number
        const phone = order.mobile || await getUserPhone(userId);
        if (!phone) {
            console.error('No phone number found for user:', userId);
            return;
        }
        
        // Send WhatsApp message
        const whatsappService = getWhatsAppService();
        await whatsappService.sendTemplateMessage(
            'order_confirmed',
            phone,
            {
                customerName: order.customer_name || order.full_name || 'Customer',
                orderNumber: order.order_id,
                amount: order.total.toFixed(2),
                itemCount: itemCount,
                deliveryDate: formattedDate,
                trackingUrl: `${process.env.SITE_URL}/orders/${order.order_id}`
            }
        );
        
        console.log(`✅ Order confirmation WhatsApp sent to ${phone} for order ${order.order_id}`);
    } catch (error) {
        console.error('Error sending order confirmation WhatsApp:', error);
    }
}

/**
 * Send order shipped notification
 */
async function sendOrderShipped(orderId, trackingId, courierName) {
    try {
        const enabled = await isWhatsAppEnabled('order_notifications');
        if (!enabled) return;
        
        const orderResult = await pool.query(`
            SELECT o.*, u.name as customer_name, u.mobile
            FROM src_orders o
            JOIN src_users u ON o.user_id = u.id
            WHERE o.id = $1
        `, [orderId]);
        
        if (orderResult.rows.length === 0) return;
        const order = orderResult.rows[0];
        
        const phone = order.mobile;
        if (!phone) return;
        
        // Calculate expected delivery
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);
        const formattedDate = deliveryDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
        
        // Format delivery address
        const deliveryAddress = `${order.address}, ${order.city}, ${order.state} - ${order.pincode}`;
        
        const whatsappService = getWhatsAppService();
        await whatsappService.sendTemplateMessage(
            'order_shipped',
            phone,
            {
                customerName: order.customer_name || order.full_name,
                orderNumber: order.order_id,
                trackingId: trackingId || 'Being generated',
                courierName: courierName || 'Delhivery',
                deliveryAddress: deliveryAddress,
                deliveryDate: formattedDate,
                trackingUrl: `${process.env.SITE_URL}/track/${trackingId || order.order_id}`
            }
        );
        
        console.log(`✅ Order shipped WhatsApp sent for order ${order.order_id}`);
    } catch (error) {
        console.error('Error sending order shipped WhatsApp:', error);
    }
}

/**
 * Send order delivered notification
 */
async function sendOrderDelivered(orderId) {
    try {
        const enabled = await isWhatsAppEnabled('order_notifications');
        if (!enabled) return;
        
        const orderResult = await pool.query(`
            SELECT o.*, u.name as customer_name, u.mobile
            FROM src_orders o
            JOIN src_users u ON o.user_id = u.id
            WHERE o.id = $1
        `, [orderId]);
        
        if (orderResult.rows.length === 0) return;
        const order = orderResult.rows[0];
        
        const phone = order.mobile;
        if (!phone) return;
        
        const deliveredDate = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        const whatsappService = getWhatsAppService();
        await whatsappService.sendTemplateMessage(
            'order_delivered',
            phone,
            {
                customerName: order.customer_name || order.full_name,
                orderNumber: order.order_id,
                deliveredDate: deliveredDate,
                reviewUrl: `${process.env.SITE_URL}/review/${order.order_id}`
            }
        );
        
        console.log(`✅ Order delivered WhatsApp sent for order ${order.order_id}`);
    } catch (error) {
        console.error('Error sending order delivered WhatsApp:', error);
    }
}

/**
 * Send order cancelled notification
 */
async function sendOrderCancelled(orderId, reason = 'Requested by customer') {
    try {
        const enabled = await isWhatsAppEnabled('order_notifications');
        if (!enabled) return;
        
        const orderResult = await pool.query(`
            SELECT o.*, u.name as customer_name, u.mobile
            FROM src_orders o
            JOIN src_users u ON o.user_id = u.id
            WHERE o.id = $1
        `, [orderId]);
        
        if (orderResult.rows.length === 0) return;
        const order = orderResult.rows[0];
        
        const phone = order.mobile;
        if (!phone) return;
        
        const whatsappService = getWhatsAppService();
        await whatsappService.sendTemplateMessage(
            'order_cancelled',
            phone,
            {
                customerName: order.customer_name || order.full_name,
                orderNumber: order.order_id,
                amount: order.total.toFixed(2),
                refundMethod: order.payment_method === 'cod' ? 'N/A (COD)' : 'Original payment method',
                refundDays: order.payment_method === 'cod' ? '0' : '5-7',
                cancellationReason: reason
            }
        );
        
        console.log(`✅ Order cancelled WhatsApp sent for order ${order.order_id}`);
    } catch (error) {
        console.error('Error sending order cancelled WhatsApp:', error);
    }
}

/**
 * Send login alert notification
 */
async function sendLoginAlert(userId, deviceInfo = {}) {
    try {
        const enabled = await isWhatsAppEnabled('login_alerts');
        if (!enabled) return;
        
        const userResult = await pool.query(
            'SELECT name, phone FROM src_users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) return;
        const user = userResult.rows[0];
        
        const phone = user.phone;
        if (!phone) return;
        
        const now = new Date();
        const loginTime = now.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        const whatsappService = getWhatsAppService();
        await whatsappService.sendTemplateMessage(
            'login_alert',
            phone,
            {
                userName: user.name || 'User',
                deviceName: deviceInfo.device || 'Unknown Device',
                location: deviceInfo.location || 'Unknown Location',
                ipAddress: deviceInfo.ip || 'N/A',
                loginTime: loginTime
            }
        );
        
        console.log(`✅ Login alert WhatsApp sent to ${phone}`);
    } catch (error) {
        console.error('Error sending login alert WhatsApp:', error);
    }
}

/**
 * Send promotional message to user
 */
async function sendPromotionalMessage(userId, campaignName, customVariables = {}) {
    try {
        const enabled = await isWhatsAppEnabled('promotional');
        if (!enabled) return;
        
        const userResult = await pool.query(
            'SELECT name, phone FROM src_users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) return;
        const user = userResult.rows[0];
        
        const phone = user.phone;
        if (!phone) return;
        
        const variables = {
            customerName: user.name || 'Customer',
            ...customVariables
        };
        
        const whatsappService = getWhatsAppService();
        await whatsappService.sendTemplateMessage(
            campaignName,
            phone,
            variables
        );
        
        console.log(`✅ Promotional WhatsApp sent to ${phone}: ${campaignName}`);
    } catch (error) {
        console.error('Error sending promotional WhatsApp:', error);
    }
}

/**
 * Send bulk promotional messages (campaign)
 */
async function sendBulkPromotional(templateName, targetAudience = {}, variables = {}) {
    try {
        const enabled = await isWhatsAppEnabled('promotional');
        if (!enabled) {
            console.log('Promotional WhatsApp messages are disabled');
            return { success: false, message: 'Promotional messages disabled' };
        }
        
        // Build query based on target audience
        let query = 'SELECT id, name, mobile FROM src_users WHERE mobile IS NOT NULL';
        const params = [];
        
        if (targetAudience.minOrders) {
            params.push(targetAudience.minOrders);
            query += ` AND (SELECT COUNT(*) FROM src_orders WHERE user_id = src_users.id) >= $${params.length}`;
        }
        
        if (targetAudience.status) {
            params.push(targetAudience.status);
            query += ` AND status = $${params.length}`;
        }
        
        const usersResult = await pool.query(query, params);
        
        let successCount = 0;
        let failedCount = 0;
        
        const whatsappService = getWhatsAppService();
        
        for (const user of usersResult.rows) {
            try {
                const userVariables = {
                    customerName: user.name || 'Customer',
                    ...variables
                };
                
                await whatsappService.sendTemplateMessage(
                    templateName,
                    user.mobile,
                    userVariables
                );
                
                successCount++;
            } catch (error) {
                console.error(`Failed to send to ${user.mobile}:`, error);
                failedCount++;
            }
        }
        
        console.log(`📊 Bulk promotional campaign: ${successCount} sent, ${failedCount} failed`);
        
        return {
            success: true,
            totalRecipients: usersResult.rows.length,
            successCount,
            failedCount
        };
    } catch (error) {
        console.error('Error sending bulk promotional messages:', error);
        return { success: false, message: error.message };
    }
}

module.exports = {
    sendOrderConfirmation,
    sendOrderShipped,
    sendOrderDelivered,
    sendOrderCancelled,
    sendLoginAlert,
    sendPromotionalMessage,
    sendBulkPromotional,
    isWhatsAppEnabled,
    getUserPhone
};

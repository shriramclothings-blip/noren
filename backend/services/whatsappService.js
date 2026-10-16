/**
 * WhatsApp Service - Industrial Grade Implementation
 * Using @whiskeysockets/baileys for WhatsApp Web API
 * 
 * Features:
 * - Multi-instance support
 * - Automatic reconnection
 * - Session management
 * - Rate limiting
 * - Message queuing
 * - Error handling & retry logic
 * - QR code generation
 * - Status tracking
 * 
 * @module services/whatsappService
 */

const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    delay
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs').promises;
const path = require('path');
const QRCode = require('qrcode-terminal');
const { pool } = require('../config/db');

class WhatsAppService {
    constructor() {
        this.instances = new Map(); // Store active WhatsApp instances
        this.messageQueue = [];
        this.isProcessingQueue = false;
        this.rateLimitPerMinute = 20; // Baileys safe limit
        this.messagesSentThisMinute = 0;
        this.authPath = path.join(__dirname, '..', 'whatsapp_sessions');
        
        // Initialize async - don't block constructor
        this.initializeAsync();
        
        console.log('✅ WhatsApp Service initialized (async initialization in progress)');
    }
    
    async initializeAsync() {
        try {
            // Create sessions directory
            await this.initializeSessionsDirectory();
            
            // Reset rate limit counter every minute
            setInterval(() => {
                this.messagesSentThisMinute = 0;
            }, 60000);
            
            // Process queue every 3 seconds
            setInterval(() => this.processQueue(), 3000);
            
            console.log('✅ WhatsApp Service fully initialized');
        } catch (error) {
            console.error('⚠️ WhatsApp Service initialization error (non-fatal):', error.message);
        }
    }
    
    async initializeAsync() {
        try {
            // Create sessions directory
            await fs.mkdir(this.authPath, { recursive: true });
            
            // Reset rate limit counter every minute
            setInterval(() => {
                this.messagesSentThisMinute = 0;
            }, 60000);
            
            // Process queue every 3 seconds
            setInterval(() => this.processQueue(), 3000);
            
            this.initialized = true;
            console.log('✅ WhatsApp Service fully initialized');
        } catch (error) {
            console.error('⚠️ WhatsApp Service initialization error (non-fatal):', error.message);
        }
    }
    
    /**
     * Create or connect WhatsApp instance
     */
    async createInstance(instanceName) {
        try {
            if (this.instances.has(instanceName)) {
                return { success: false, message: 'Instance already exists' };
            }
            
            const sessionPath = path.join(this.authPath, instanceName);
            await fs.mkdir(sessionPath, { recursive: true });
            
            // Get instance from database
            const dbInstance = await pool.query(
                'SELECT * FROM wa_instances WHERE instance_name = $1',
                [instanceName]
            );
            
            if (dbInstance.rows.length === 0) {
                // Create new instance in database
                await pool.query(
                    `INSERT INTO wa_instances (instance_name, status) 
                     VALUES ($1, 'connecting')`,
                    [instanceName]
                );
            }
            
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            const { version } = await fetchLatestBaileysVersion();
            
            // Create WhatsApp socket
            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                browser: ['NOREN Fashion', 'Chrome', '10.0'],
                markOnlineOnConnect: true,
                syncFullHistory: false,
                getMessage: async (key) => {
                    return { conversation: 'Message not available' };
                }
            });
            
            // Store instance
            this.instances.set(instanceName, {
                socket: sock,
                state: 'connecting',
                qr: null,
                phoneNumber: null,
                connectedAt: null
            });
            
            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                await this.handleConnectionUpdate(instanceName, update);
            });
            
            // Handle credentials update
            sock.ev.on('creds.update', saveCreds);
            
            // Handle incoming messages
            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                await this.handleIncomingMessages(instanceName, messages, type);
            });
            
            // Handle message status updates (sent, delivered, read)
            sock.ev.on('messages.update', async (updates) => {
                await this.handleMessageStatusUpdates(instanceName, updates);
            });
            
            return {
                success: true,
                message: 'Instance created successfully',
                instanceName
            };
        } catch (error) {
            console.error('Error creating WhatsApp instance:', error);
            
            // Update instance status to error
            await pool.query(
                `UPDATE wa_instances 
                 SET status = 'error', updated_at = CURRENT_TIMESTAMP 
                 WHERE instance_name = $1`,
                [instanceName]
            );
            
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Handle connection updates (QR code, connected, disconnected)
     */
    async handleConnectionUpdate(instanceName, update) {
        const { connection, lastDisconnect, qr } = update;
        const instance = this.instances.get(instanceName);
        
        if (!instance) return;
        
        // QR Code received
        if (qr) {
            console.log(`📱 QR Code generated for ${instanceName}`);
            
            // Generate QR code data URL
            const QRCode = require('qrcode');
            const qrDataUrl = await QRCode.toDataURL(qr);
            
            instance.qr = qrDataUrl;
            instance.state = 'qr_generated';
            
            // Save to database
            await pool.query(
                `UPDATE wa_instances 
                 SET qr_code = $1, qr_generated_at = CURRENT_TIMESTAMP, 
                     status = 'connecting', updated_at = CURRENT_TIMESTAMP 
                 WHERE instance_name = $2`,
                [qrDataUrl, instanceName]
            );
            
            // Also print to terminal for debugging
            QRCode.generate(qr, { small: true });
        }
        
        // Connected
        if (connection === 'open') {
            console.log(`✅ WhatsApp connected: ${instanceName}`);
            
            instance.state = 'connected';
            instance.connectedAt = new Date();
            instance.qr = null;
            
            // Get phone number
            const phoneNumber = instance.socket.user?.id?.split(':')[0] || null;
            instance.phoneNumber = phoneNumber;
            
            await pool.query(
                `UPDATE wa_instances 
                 SET status = 'connected', 
                     phone_number = $1,
                     connected_at = CURRENT_TIMESTAMP,
                     qr_code = NULL,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE instance_name = $2`,
                [phoneNumber, instanceName]
            );
        }
        
        // Disconnected
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log(`❌ WhatsApp disconnected: ${instanceName}`, 
                       shouldReconnect ? '(Reconnecting...)' : '(Logged out)');
            
            if (shouldReconnect) {
                // Reconnect after 5 seconds
                setTimeout(() => {
                    console.log(`🔄 Reconnecting ${instanceName}...`);
                    this.createInstance(instanceName);
                }, 5000);
            } else {
                // Logged out - remove instance
                this.instances.delete(instanceName);
                
                await pool.query(
                    `UPDATE wa_instances 
                     SET status = 'disconnected', 
                         disconnected_at = CURRENT_TIMESTAMP,
                         qr_code = NULL,
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE instance_name = $1`,
                    [instanceName]
                );
            }
        }
    }
    
    /**
     * Handle incoming messages from customers
     */
    async handleIncomingMessages(instanceName, messages, type) {
        try {
            if (type !== 'notify') return;
            
            const instanceResult = await pool.query(
                'SELECT id FROM wa_instances WHERE instance_name = $1',
                [instanceName]
            );
            
            if (instanceResult.rows.length === 0) return;
            const instanceId = instanceResult.rows[0].id;
            
            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;
                
                const senderPhone = msg.key.remoteJid?.split('@')[0];
                const messageType = Object.keys(msg.message)[0];
                let messageContent = '';
                
                if (messageType === 'conversation') {
                    messageContent = msg.message.conversation;
                } else if (messageType === 'extendedTextMessage') {
                    messageContent = msg.message.extendedTextMessage.text;
                }
                
                // Save to database
                await pool.query(
                    `INSERT INTO wa_incoming_messages 
                     (instance_id, sender_phone, sender_name, message_type, 
                      message_content, whatsapp_message_id, received_at)
                     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
                    [
                        instanceId,
                        senderPhone,
                        msg.pushName || 'Unknown',
                        messageType,
                        messageContent,
                        msg.key.id
                    ]
                );
                
                console.log(`📩 Incoming message from ${senderPhone}: ${messageContent}`);
            }
        } catch (error) {
            console.error('Error handling incoming messages:', error);
        }
    }
    
    /**
     * Handle message status updates (delivered, read)
     */
    async handleMessageStatusUpdates(instanceName, updates) {
        try {
            for (const update of updates) {
                const messageId = update.key.id;
                const status = update.update.status;
                
                let updateField = '';
                if (status === 3) updateField = 'delivered_at'; // Delivered
                if (status === 4) updateField = 'read_at'; // Read
                
                if (updateField) {
                    await pool.query(
                        `UPDATE wa_message_logs 
                         SET status = $1, ${updateField} = CURRENT_TIMESTAMP, 
                             updated_at = CURRENT_TIMESTAMP
                         WHERE whatsapp_message_id = $2`,
                        [status === 3 ? 'delivered' : 'read', messageId]
                    );
                }
            }
        } catch (error) {
            console.error('Error handling message status updates:', error);
        }
    }
    
    /**
     * Send WhatsApp message
     */
    async sendMessage(instanceName, recipientPhone, message, options = {}) {
        try {
            const instance = this.instances.get(instanceName);
            
            if (!instance || instance.state !== 'connected') {
                throw new Error('WhatsApp instance not connected');
            }
            
            // Format phone number (remove +, add country code if needed)
            const formattedPhone = this.formatPhoneNumber(recipientPhone);
            const jid = `${formattedPhone}@s.whatsapp.net`;
            
            // Send message
            const sent = await instance.socket.sendMessage(jid, {
                text: message,
                ...options
            });
            
            this.messagesSentThisMinute++;
            
            return {
                success: true,
                messageId: sent.key.id,
                timestamp: sent.messageTimestamp
            };
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }
    
    /**
     * Send message with template
     */
    async sendTemplateMessage(templateName, recipientPhone, variables = {}, instanceName = 'default') {
        try {
            // Get template from database
            const template = await pool.query(
                'SELECT * FROM wa_message_templates WHERE template_name = $1 AND is_active = true',
                [templateName]
            );
            
            if (template.rows.length === 0) {
                throw new Error(`Template ${templateName} not found`);
            }
            
            const templateData = template.rows[0];
            let messageBody = templateData.message_body;
            
            // Replace variables in template
            for (const [key, value] of Object.entries(variables)) {
                messageBody = messageBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
            
            // Add to queue or send immediately
            const queueItem = {
                instanceName,
                recipientPhone,
                message: messageBody,
                templateId: templateData.id,
                messageType: templateData.template_type,
                metadata: variables,
                priority: templateData.category === 'transactional' ? 1 : 5
            };
            
            this.messageQueue.push(queueItem);
            this.messageQueue.sort((a, b) => a.priority - b.priority);
            
            return {
                success: true,
                message: 'Message queued successfully',
                queuePosition: this.messageQueue.length
            };
        } catch (error) {
            console.error('Error sending template message:', error);
            throw error;
        }
    }
    
    /**
     * Process message queue with rate limiting
     */
    async processQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0) return;
        if (this.messagesSentThisMinute >= this.rateLimitPerMinute) return;
        
        this.isProcessingQueue = true;
        
        try {
            const batchSize = Math.min(
                5,
                this.rateLimitPerMinute - this.messagesSentThisMinute,
                this.messageQueue.length
            );
            
            const batch = this.messageQueue.splice(0, batchSize);
            
            for (const item of batch) {
                try {
                    // Get instance ID
                    const instanceResult = await pool.query(
                        'SELECT id FROM wa_instances WHERE instance_name = $1',
                        [item.instanceName]
                    );
                    
                    if (instanceResult.rows.length === 0) continue;
                    const instanceId = instanceResult.rows[0].id;
                    
                    // Create log entry
                    const logResult = await pool.query(
                        `INSERT INTO wa_message_logs 
                         (instance_id, template_id, message_type, recipient_phone, 
                          message_content, status, metadata)
                         VALUES ($1, $2, $3, $4, $5, 'pending', $6)
                         RETURNING id`,
                        [
                            instanceId,
                            item.templateId,
                            item.messageType,
                            item.recipientPhone,
                            item.message,
                            JSON.stringify(item.metadata || {})
                        ]
                    );
                    
                    const logId = logResult.rows[0].id;
                    
                    // Send message
                    const result = await this.sendMessage(
                        item.instanceName,
                        item.recipientPhone,
                        item.message
                    );
                    
                    // Update log
                    await pool.query(
                        `UPDATE wa_message_logs 
                         SET status = 'sent', 
                             whatsapp_message_id = $1,
                             sent_at = CURRENT_TIMESTAMP,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2`,
                        [result.messageId, logId]
                    );
                    
                    console.log(`✅ WhatsApp sent to ${item.recipientPhone}`);
                    
                    // Small delay between messages
                    await delay(1000);
                } catch (error) {
                    console.error('Error processing queue item:', error);
                    
                    // Update log with error
                    await pool.query(
                        `UPDATE wa_message_logs 
                         SET status = 'failed', 
                             error_message = $1,
                             failed_at = CURRENT_TIMESTAMP,
                             retry_count = retry_count + 1,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE recipient_phone = $2 AND status = 'pending'`,
                        [error.message, item.recipientPhone]
                    );
                    
                    // Re-queue if retries available
                    if (item.retryCount < 3) {
                        item.retryCount = (item.retryCount || 0) + 1;
                        this.messageQueue.push(item);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing message queue:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }
    
    /**
     * Format phone number for WhatsApp
     */
    formatPhoneNumber(phone) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Add country code if not present (assuming India +91)
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }
        
        return cleaned;
    }
    
    /**
     * Get instance status and QR code
     */
    async getInstanceStatus(instanceName) {
        const instance = this.instances.get(instanceName);
        
        const dbInstance = await pool.query(
            'SELECT * FROM wa_instances WHERE instance_name = $1',
            [instanceName]
        );
        
        if (dbInstance.rows.length === 0) {
            return { success: false, message: 'Instance not found' };
        }
        
        return {
            success: true,
            instance: {
                name: instanceName,
                status: instance?.state || dbInstance.rows[0].status,
                phoneNumber: instance?.phoneNumber || dbInstance.rows[0].phone_number,
                qrCode: instance?.qr || dbInstance.rows[0].qr_code,
                connectedAt: dbInstance.rows[0].connected_at,
                isActive: !!instance
            }
        };
    }
    
    /**
     * Disconnect and logout instance
     */
    async disconnectInstance(instanceName) {
        try {
            const instance = this.instances.get(instanceName);
            
            if (instance) {
                await instance.socket.logout();
                this.instances.delete(instanceName);
            }
            
            // Delete session files
            const sessionPath = path.join(this.authPath, instanceName);
            await fs.rm(sessionPath, { recursive: true, force: true });
            
            // Update database
            await pool.query(
                `UPDATE wa_instances 
                 SET status = 'disconnected', 
                     disconnected_at = CURRENT_TIMESTAMP,
                     qr_code = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE instance_name = $1`,
                [instanceName]
            );
            
            return { success: true, message: 'Instance disconnected successfully' };
        } catch (error) {
            console.error('Error disconnecting instance:', error);
            return { success: false, message: error.message };
        }
    }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;

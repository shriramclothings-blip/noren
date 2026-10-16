/**
 * Auto-migrate WhatsApp tables on server startup
 * This ensures WhatsApp tables exist before the app starts
 */

const { pool } = require('./config/db');

async function autoMigrateWhatsApp() {
    console.log('🔍 Checking WhatsApp tables...');
    
    try {
        // Check if wa_settings table exists
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'wa_settings'
            );
        `);
        
        if (checkTable.rows[0].exists) {
            console.log('✅ WhatsApp tables already exist');
            return;
        }
        
        console.log('📦 Creating WhatsApp tables...');
        
        // Create all WhatsApp tables
        await pool.query(`
            -- WhatsApp Instances
            CREATE TABLE IF NOT EXISTS wa_instances (
                id SERIAL PRIMARY KEY,
                instance_name VARCHAR(100) UNIQUE NOT NULL,
                phone_number VARCHAR(20),
                status VARCHAR(20) DEFAULT 'disconnected',
                qr_code TEXT,
                qr_generated_at TIMESTAMP,
                connected_at TIMESTAMP,
                disconnected_at TIMESTAMP,
                session_data JSONB,
                is_active BOOLEAN DEFAULT true,
                is_default BOOLEAN DEFAULT false,
                webhook_url TEXT,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Message Templates
            CREATE TABLE IF NOT EXISTS wa_message_templates (
                id SERIAL PRIMARY KEY,
                template_name VARCHAR(100) UNIQUE NOT NULL,
                template_type VARCHAR(50) NOT NULL,
                category VARCHAR(50) NOT NULL,
                subject VARCHAR(200),
                message_body TEXT NOT NULL,
                variables JSONB DEFAULT '[]',
                has_media BOOLEAN DEFAULT false,
                media_type VARCHAR(20),
                media_url TEXT,
                buttons JSONB,
                is_active BOOLEAN DEFAULT true,
                priority INTEGER DEFAULT 0,
                usage_count INTEGER DEFAULT 0,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Message Logs
            CREATE TABLE IF NOT EXISTS wa_message_logs (
                id SERIAL PRIMARY KEY,
                instance_id INTEGER,
                template_id INTEGER,
                message_type VARCHAR(50) NOT NULL,
                recipient_phone VARCHAR(20) NOT NULL,
                recipient_name VARCHAR(200),
                message_content TEXT NOT NULL,
                media_url TEXT,
                status VARCHAR(30) DEFAULT 'pending',
                whatsapp_message_id VARCHAR(100),
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                metadata JSONB DEFAULT '{}',
                sent_at TIMESTAMP,
                delivered_at TIMESTAMP,
                read_at TIMESTAMP,
                failed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Settings
            CREATE TABLE IF NOT EXISTS wa_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type VARCHAR(30) DEFAULT 'string',
                category VARCHAR(50),
                description TEXT,
                is_encrypted BOOLEAN DEFAULT false,
                updated_by INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Campaigns
            CREATE TABLE IF NOT EXISTS wa_campaigns (
                id SERIAL PRIMARY KEY,
                campaign_name VARCHAR(200) NOT NULL,
                template_id INTEGER,
                instance_id INTEGER,
                target_audience JSONB DEFAULT '{}',
                status VARCHAR(30) DEFAULT 'draft',
                total_recipients INTEGER DEFAULT 0,
                sent_count INTEGER DEFAULT 0,
                delivered_count INTEGER DEFAULT 0,
                failed_count INTEGER DEFAULT 0,
                schedule_time TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Campaign Recipients
            CREATE TABLE IF NOT EXISTS wa_campaign_recipients (
                id SERIAL PRIMARY KEY,
                campaign_id INTEGER,
                user_id INTEGER,
                phone_number VARCHAR(20) NOT NULL,
                message_log_id INTEGER,
                status VARCHAR(30) DEFAULT 'pending',
                sent_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Incoming Messages
            CREATE TABLE IF NOT EXISTS wa_incoming_messages (
                id SERIAL PRIMARY KEY,
                instance_id INTEGER,
                sender_phone VARCHAR(20) NOT NULL,
                sender_name VARCHAR(200),
                message_type VARCHAR(30),
                message_content TEXT,
                media_url TEXT,
                whatsapp_message_id VARCHAR(100) UNIQUE,
                is_read BOOLEAN DEFAULT false,
                replied_to_message_id INTEGER,
                metadata JSONB DEFAULT '{}',
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Message Queue
            CREATE TABLE IF NOT EXISTS wa_message_queue (
                id SERIAL PRIMARY KEY,
                instance_id INTEGER,
                recipient_phone VARCHAR(20) NOT NULL,
                message_data JSONB NOT NULL,
                priority INTEGER DEFAULT 5,
                status VARCHAR(30) DEFAULT 'queued',
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_wa_instances_status ON wa_instances(status);
            CREATE INDEX IF NOT EXISTS idx_wa_message_logs_status ON wa_message_logs(status);
            CREATE INDEX IF NOT EXISTS idx_wa_message_logs_recipient ON wa_message_logs(recipient_phone);
            CREATE INDEX IF NOT EXISTS idx_wa_campaigns_status ON wa_campaigns(status);
            CREATE INDEX IF NOT EXISTS idx_wa_incoming_messages_phone ON wa_incoming_messages(sender_phone);
            CREATE INDEX IF NOT EXISTS idx_wa_queue_status ON wa_message_queue(status);
        `);

        console.log('✅ WhatsApp tables created');

        // Insert default settings
        await pool.query(`
            INSERT INTO wa_settings (setting_key, setting_value, setting_type, category, description) VALUES
            ('wa_enabled', 'true', 'boolean', 'general', 'Enable/disable WhatsApp messaging globally'),
            ('wa_order_notifications_enabled', 'true', 'boolean', 'orders', 'Send WhatsApp notifications for order updates'),
            ('wa_login_alerts_enabled', 'true', 'boolean', 'authentication', 'Send WhatsApp alerts for login events'),
            ('wa_promotional_enabled', 'true', 'boolean', 'promotional', 'Enable promotional WhatsApp campaigns'),
            ('wa_rate_limit_per_minute', '20', 'number', 'general', 'Maximum messages per minute'),
            ('wa_retry_failed_messages', 'true', 'boolean', 'general', 'Automatically retry failed messages'),
            ('wa_max_retries', '3', 'number', 'general', 'Maximum retry attempts'),
            ('wa_business_name', 'NOREN Fashion', 'string', 'general', 'Business name'),
            ('wa_support_phone', '+917984626447', 'string', 'general', 'Support phone')
            ON CONFLICT (setting_key) DO NOTHING;
        `);

        console.log('✅ Default settings inserted');

        // Insert default templates
        await pool.query(`
            INSERT INTO wa_message_templates (template_name, template_type, category, subject, message_body, variables, is_active) VALUES
            (
                'order_confirmed',
                'order_confirmed',
                'transactional',
                'Order Confirmed',
                '✅ *Order Confirmed!*

Hello {{customerName}}! 👋

Thank you for your order at NOREN Fashion! 🛍️

📦 *Order Details:*
Order ID: #{{orderNumber}}
Amount: ₹{{amount}}
Items: {{itemCount}} item(s)

🚚 We are preparing your order!
Expected delivery: {{deliveryDate}}

Track: {{trackingUrl}}

*NOREN Fashion* ✨',
                ''["customerName", "orderNumber", "amount", "itemCount", "deliveryDate", "trackingUrl"]'',
                true
            ),
            (
                'login_alert',
                'login_alert',
                'authentication',
                'New Login',
                '🔐 *Security Alert*

Hi {{userName}}! 👋

New login detected:

📱 Device: {{deviceName}}
📍 Location: {{location}}
🌐 IP: {{ipAddress}}
⏰ Time: {{loginTime}}

Was this you?

*NOREN Fashion Security*',
                ''["userName", "deviceName", "location", "ipAddress", "loginTime"]'',
                true
            )
            ON CONFLICT (template_name) DO NOTHING;
        `);

        console.log('✅ Default templates inserted');
        console.log('🎉 WhatsApp setup complete!');

    } catch (error) {
        console.error('❌ WhatsApp migration error:', error.message);
        console.log('⚠️ WhatsApp features will be disabled');
    }
}

module.exports = { autoMigrateWhatsApp };

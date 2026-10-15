-- WhatsApp Integration Tables for Production System
-- Created: 2026-01-15
-- Purpose: Industrial-grade WhatsApp messaging system with Baileys API

-- WhatsApp Instances (Multi-instance support)
CREATE TABLE IF NOT EXISTS wa_instances (
    id SERIAL PRIMARY KEY,
    instance_name VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'disconnected', -- disconnected, connecting, connected, error
    qr_code TEXT,
    qr_generated_at TIMESTAMP,
    connected_at TIMESTAMP,
    disconnected_at TIMESTAMP,
    session_data JSONB, -- Baileys session storage
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    webhook_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Message Templates
CREATE TABLE IF NOT EXISTS wa_message_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- order_confirmed, order_shipped, order_delivered, order_cancelled, login_alert, promotional, custom
    category VARCHAR(50) NOT NULL, -- transactional, promotional, authentication
    subject VARCHAR(200),
    message_body TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable names: ["customerName", "orderNumber", "amount"]
    has_media BOOLEAN DEFAULT false,
    media_type VARCHAR(20), -- image, video, document
    media_url TEXT,
    buttons JSONB, -- Optional buttons array
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Message Logs (Complete audit trail)
CREATE TABLE IF NOT EXISTS wa_message_logs (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES wa_instances(id),
    template_id INTEGER REFERENCES wa_message_templates(id),
    message_type VARCHAR(50) NOT NULL, -- order_notification, login_alert, promotional, manual
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(200),
    message_content TEXT NOT NULL,
    media_url TEXT,
    status VARCHAR(30) DEFAULT 'pending', -- pending, sent, delivered, read, failed, queued
    whatsapp_message_id VARCHAR(100),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}', -- Store order_id, user_id, campaign_id, etc.
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Settings (Global configuration)
CREATE TABLE IF NOT EXISTS wa_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(30) DEFAULT 'string', -- string, boolean, number, json
    category VARCHAR(50), -- general, orders, authentication, promotional
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Campaigns (Promotional messaging)
CREATE TABLE IF NOT EXISTS wa_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(200) NOT NULL,
    template_id INTEGER REFERENCES wa_message_templates(id),
    instance_id INTEGER REFERENCES wa_instances(id),
    target_audience JSONB DEFAULT '{}', -- Filters: {"status": "active", "orders_count": ">5"}
    status VARCHAR(30) DEFAULT 'draft', -- draft, scheduled, running, completed, paused, cancelled
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    schedule_time TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Campaign Recipients (Track individual sends)
CREATE TABLE IF NOT EXISTS wa_campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES wa_campaigns(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    phone_number VARCHAR(20) NOT NULL,
    message_log_id INTEGER REFERENCES wa_message_logs(id),
    status VARCHAR(30) DEFAULT 'pending',
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Incoming Messages (Customer replies)
CREATE TABLE IF NOT EXISTS wa_incoming_messages (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES wa_instances(id),
    sender_phone VARCHAR(20) NOT NULL,
    sender_name VARCHAR(200),
    message_type VARCHAR(30), -- text, image, video, document, audio
    message_content TEXT,
    media_url TEXT,
    whatsapp_message_id VARCHAR(100) UNIQUE,
    is_read BOOLEAN DEFAULT false,
    replied_to_message_id INTEGER REFERENCES wa_message_logs(id),
    metadata JSONB DEFAULT '{}',
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Queue (Rate limiting and retry logic)
CREATE TABLE IF NOT EXISTS wa_message_queue (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES wa_instances(id),
    recipient_phone VARCHAR(20) NOT NULL,
    message_data JSONB NOT NULL,
    priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
    status VARCHAR(30) DEFAULT 'queued', -- queued, processing, sent, failed
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wa_instances_status ON wa_instances(status);
CREATE INDEX IF NOT EXISTS idx_wa_instances_is_active ON wa_instances(is_active);
CREATE INDEX IF NOT EXISTS idx_wa_message_logs_status ON wa_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_message_logs_recipient ON wa_message_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_wa_message_logs_created ON wa_message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_wa_message_logs_type ON wa_message_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_wa_campaigns_status ON wa_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_wa_incoming_messages_phone ON wa_incoming_messages(sender_phone);
CREATE INDEX IF NOT EXISTS idx_wa_incoming_messages_read ON wa_incoming_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_wa_queue_status ON wa_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_wa_queue_scheduled ON wa_message_queue(scheduled_for);

-- Insert default settings
INSERT INTO wa_settings (setting_key, setting_value, setting_type, category, description) VALUES
('wa_enabled', 'true', 'boolean', 'general', 'Enable/disable WhatsApp messaging globally'),
('wa_order_notifications_enabled', 'true', 'boolean', 'orders', 'Send WhatsApp notifications for order updates'),
('wa_login_alerts_enabled', 'true', 'boolean', 'authentication', 'Send WhatsApp alerts for login events'),
('wa_promotional_enabled', 'true', 'boolean', 'promotional', 'Enable promotional WhatsApp campaigns'),
('wa_rate_limit_per_minute', '20', 'number', 'general', 'Maximum messages per minute (Baileys limit)'),
('wa_retry_failed_messages', 'true', 'boolean', 'general', 'Automatically retry failed messages'),
('wa_max_retries', '3', 'number', 'general', 'Maximum retry attempts for failed messages'),
('wa_business_name', 'NOREN Fashion', 'string', 'general', 'Business name shown in messages'),
('wa_support_phone', '+917984626447', 'string', 'general', 'Support WhatsApp number')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default message templates
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

🚚 We''re preparing your order for shipment!
Expected delivery: {{deliveryDate}}

Track your order: {{trackingUrl}}

Need help? Reply to this message or call us at +91 7984626447

*NOREN Fashion* - Where Style Meets Elegance ✨',
    '["customerName", "orderNumber", "amount", "itemCount", "deliveryDate", "trackingUrl"]',
    true
),
(
    'order_shipped',
    'order_shipped',
    'transactional',
    'Order Shipped',
    '🚚 *Your Order is On The Way!*

Hi {{customerName}}! 📦

Great news! Your order has been shipped! 🎉

📦 *Shipment Details:*
Order ID: #{{orderNumber}}
Tracking ID: {{trackingId}}
Courier: {{courierName}}

📍 Delivery Address:
{{deliveryAddress}}

⏰ Expected Delivery: {{deliveryDate}}

🔍 Track Live: {{trackingUrl}}

Your package will reach you soon! 💫

Questions? We''re here to help!
📞 +91 7984626447

*NOREN Fashion* 🛍️',
    '["customerName", "orderNumber", "trackingId", "courierName", "deliveryAddress", "deliveryDate", "trackingUrl"]',
    true
),
(
    'order_delivered',
    'order_delivered',
    'transactional',
    'Order Delivered',
    '🎉 *Delivered Successfully!*

Hello {{customerName}}! ✨

Your order has been delivered! We hope you love it! 💖

📦 Order #{{orderNumber}}
✅ Delivered on: {{deliveredDate}}

💬 *How was your experience?*
We''d love to hear from you! Rate your purchase: {{reviewUrl}}

🎁 *Exclusive Offer:*
Get 10% off on your next order! Use code: THANKYOU10

Any issues? Let us know immediately.
📞 +91 7984626447

Shop again: https://www.norenfastion.shop

*NOREN Fashion* - Thank you for shopping with us! 🙏',
    '["customerName", "orderNumber", "deliveredDate", "reviewUrl"]',
    true
),
(
    'order_cancelled',
    'order_cancelled',
    'transactional',
    'Order Cancelled',
    '❌ *Order Cancelled*

Hi {{customerName}},

Your order #{{orderNumber}} has been cancelled.

💰 *Refund Details:*
Amount: ₹{{amount}}
Refund Method: {{refundMethod}}
Expected in: {{refundDays}} business days

❓ *Reason:* {{cancellationReason}}

We''re sorry to see this order go! 😔

🛍️ Browse our latest collection: https://www.norenfastion.shop

Need assistance? We''re here to help!
📞 +91 7984626447

*NOREN Fashion* 🙏',
    '["customerName", "orderNumber", "amount", "refundMethod", "refundDays", "cancellationReason"]',
    true
),
(
    'login_alert',
    'login_alert',
    'authentication',
    'New Login Detected',
    '🔐 *Security Alert - New Login*

Hi {{userName}}! 👋

A new login was detected on your NOREN Fashion account.

📱 *Login Details:*
Device: {{deviceName}}
Location: {{location}}
IP Address: {{ipAddress}}
Time: {{loginTime}}

✅ Was this you?
If yes, you can ignore this message.

❌ Not you?
Secure your account immediately:
1. Change your password
2. Enable 2FA
3. Contact support: +91 7984626447

🔒 Account security is our priority!

*NOREN Fashion Security Team*',
    '["userName", "deviceName", "location", "ipAddress", "loginTime"]',
    true
),
(
    'promotional_new_arrival',
    'promotional',
    'promotional',
    'New Arrivals Alert',
    '✨ *NEW COLLECTION ALERT!*

Hey {{customerName}}! 🎉

Fresh styles just dropped at NOREN Fashion! 🔥

👗 *What''s New:*
• Latest fashion trends
• Premium quality fabrics
• Exclusive designs
• Limited stock!

💥 *SPECIAL OFFER:*
{{discountPercentage}}% OFF on new arrivals!
Code: {{promoCode}}
Valid till: {{validTill}}

🛍️ Shop Now: {{shopUrl}}

Don''t miss out! Limited time offer! ⏰

Unsubscribe: Reply STOP

*NOREN Fashion* - Elevate Your Style 💫',
    '["customerName", "discountPercentage", "promoCode", "validTill", "shopUrl"]',
    true
),
(
    'promotional_sale',
    'promotional',
    'promotional',
    'Flash Sale Alert',
    '🔥 *FLASH SALE ALERT!*

{{customerName}}, This is HUGE! 🎯

💥 *{{saleTitle}}*

⚡ {{discountText}}
🎁 Plus FREE Shipping!
⏰ {{duration}} ONLY!

🛒 Categories on Sale:
{{categories}}

💳 Use Code: {{promoCode}}

👉 Shop Now: {{shopUrl}}

Hurry! Stocks are flying! 🚀

Reply STOP to unsubscribe

*NOREN Fashion* 🛍️',
    '["customerName", "saleTitle", "discountText", "duration", "categories", "promoCode", "shopUrl"]',
    true
)
ON CONFLICT (template_name) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wa_instances_updated_at BEFORE UPDATE ON wa_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wa_message_templates_updated_at BEFORE UPDATE ON wa_message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wa_message_logs_updated_at BEFORE UPDATE ON wa_message_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wa_settings_updated_at BEFORE UPDATE ON wa_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wa_campaigns_updated_at BEFORE UPDATE ON wa_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

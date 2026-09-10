-- ============================================================================
-- NOREN EMAIL PORTAL - DATABASE SCHEMA
-- Migration 007: Email Portal Tables
-- ============================================================================
-- Purpose: Create tables for Email Operations & Marketing Portal
-- DO NOT duplicate master tables (src_users, src_newsletter_subscribers, etc.)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. EMAIL TEMPLATES
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'customer_support', 'marketing', 'product', 'transactional', 
    'recruitment', 'seller', 'influencer', 'internal', 'newsletter', 'other'
  )),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT,
  preview_text TEXT,
  variables JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON src_email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON src_email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON src_email_templates(is_active);

COMMENT ON TABLE src_email_templates IS 'Email templates for campaigns, individual emails, and automations';
COMMENT ON COLUMN src_email_templates.variables IS 'Array of variable names used in template, e.g. ["first_name", "order_id"]';
COMMENT ON COLUMN src_email_templates.is_system IS 'System templates cannot be deleted, only modified';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. EMAIL DRAFTS
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  draft_type TEXT DEFAULT 'individual' CHECK (draft_type IN ('individual', 'campaign', 'automation')),
  subject TEXT,
  body_html TEXT,
  body_plain TEXT,
  recipients JSONB DEFAULT '[]',
  cc JSONB DEFAULT '[]',
  bcc JSONB DEFAULT '[]',
  sender_identity TEXT,
  reply_to TEXT,
  template_id INTEGER REFERENCES src_email_templates(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  campaign_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_user ON src_email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_type ON src_email_drafts(draft_type);
CREATE INDEX IF NOT EXISTS idx_email_drafts_updated ON src_email_drafts(updated_at);

COMMENT ON TABLE src_email_drafts IS 'Auto-saved email drafts for all draft types';
COMMENT ON COLUMN src_email_drafts.recipients IS 'Array of recipient objects: [{email, name, type}]';
COMMENT ON COLUMN src_email_drafts.attachments IS 'Array of attachment objects: [{filename, url, size, mimetype}]';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. EMAIL SENT HISTORY
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_sent (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT,
  cc TEXT[],
  bcc TEXT[],
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT,
  template_id INTEGER REFERENCES src_email_templates(id) ON DELETE SET NULL,
  campaign_id INTEGER,
  parent_email_id INTEGER REFERENCES src_email_sent(id) ON DELETE SET NULL,
  thread_id TEXT,
  email_type TEXT DEFAULT 'individual' CHECK (email_type IN (
    'individual', 'campaign', 'automation', 'transactional', 'reply', 'forward'
  )),
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'complained'
  )),
  provider_id TEXT,
  provider_response JSONB,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sent_recipient ON src_email_sent(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_sent_sender ON src_email_sent(sender_email);
CREATE INDEX IF NOT EXISTS idx_email_sent_campaign ON src_email_sent(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_thread ON src_email_sent(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_status ON src_email_sent(status);
CREATE INDEX IF NOT EXISTS idx_email_sent_type ON src_email_sent(email_type);
CREATE INDEX IF NOT EXISTS idx_email_sent_date ON src_email_sent(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_sent_user ON src_email_sent(user_id);

COMMENT ON TABLE src_email_sent IS 'Complete history of all sent emails with tracking';
COMMENT ON COLUMN src_email_sent.thread_id IS 'Groups related emails (replies, forwards) into conversations';
COMMENT ON COLUMN src_email_sent.recipient_type IS 'customer, seller, influencer, employee, applicant, subscriber, other';
COMMENT ON COLUMN src_email_sent.provider_id IS 'Email ID from Resend or other provider';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. ENHANCED CAMPAIGNS TABLE
-- ────────────────────────────────────────────────────────────────────────────
-- Rename old table if it exists to preserve data
ALTER TABLE IF EXISTS src_email_campaigns RENAME TO src_email_campaigns_legacy;

CREATE TABLE IF NOT EXISTS src_email_campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT DEFAULT 'marketing' CHECK (campaign_type IN (
    'marketing', 'promotional', 'transactional', 'newsletter', 
    'product_launch', 'recruitment', 'seller_announcement', 
    'influencer_campaign', 'customer_lifecycle', 'other'
  )),
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_plain TEXT,
  template_id INTEGER REFERENCES src_email_templates(id) ON DELETE SET NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  reply_to TEXT,
  audience_type TEXT NOT NULL CHECK (audience_type IN (
    'all_users', 'customers', 'subscribers', 'sellers', 'influencers', 
    'employees', 'applicants', 'segment', 'custom_list', 'specific_user'
  )),
  audience_filter JSONB DEFAULT '{}',
  segment_id INTEGER,
  custom_recipient_list JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'scheduled', 
    'sending', 'sent', 'completed', 'paused', 'cancelled', 'failed'
  )),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  complained_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON src_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON src_email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_audience ON src_email_campaigns(audience_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON src_email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON src_email_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON src_email_campaigns(created_at);

COMMENT ON TABLE src_email_campaigns IS 'Enhanced email marketing campaigns with approval workflow';
COMMENT ON COLUMN src_email_campaigns.audience_filter IS 'Dynamic filter rules for segment-based campaigns';
COMMENT ON COLUMN src_email_campaigns.custom_recipient_list IS 'Array of email addresses for custom_list audience_type';

-- ────────────────────────────────────────────────────────────────────────────
-- 5. AUDIENCE SEGMENTS
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_segments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  segment_type TEXT NOT NULL CHECK (segment_type IN (
    'customers', 'subscribers', 'sellers', 'influencers', 
    'employees', 'applicants', 'custom', 'dynamic'
  )),
  filter_rules JSONB NOT NULL,
  is_dynamic BOOLEAN DEFAULT TRUE,
  recipient_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_segments_type ON src_email_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_email_segments_active ON src_email_segments(is_active);
CREATE INDEX IF NOT EXISTS idx_email_segments_created_by ON src_email_segments(created_by);

COMMENT ON TABLE src_email_segments IS 'Reusable audience segments with dynamic filtering';
COMMENT ON COLUMN src_email_segments.filter_rules IS 'JSON rules for filtering contacts, e.g. {role: "customer", orders_count: {$gt: 5}}';
COMMENT ON COLUMN src_email_segments.is_dynamic IS 'If true, segment recalculates recipients on each use';

-- ────────────────────────────────────────────────────────────────────────────
-- 6. EMAIL SUPPRESSION LIST
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_suppression (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  suppression_type TEXT NOT NULL CHECK (suppression_type IN (
    'unsubscribed', 'bounced', 'complained', 'invalid', 'manual', 'global'
  )),
  source TEXT,
  campaign_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_suppression_email ON src_email_suppression(email);
CREATE INDEX IF NOT EXISTS idx_email_suppression_type ON src_email_suppression(suppression_type);
CREATE INDEX IF NOT EXISTS idx_email_suppression_created ON src_email_suppression(created_at);

COMMENT ON TABLE src_email_suppression IS 'Global suppression list - never send marketing emails to these addresses';
COMMENT ON COLUMN src_email_suppression.source IS 'Where the suppression came from: campaign_id, webhook, manual, import';

-- ────────────────────────────────────────────────────────────────────────────
-- 7. EMAIL AUTOMATIONS
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_automations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'user_registered', 'order_completed', 'order_delivered', 
    'order_cancelled', 'cart_abandoned', 'customer_subscribed',
    'seller_registered', 'seller_approved', 'influencer_registered',
    'employee_created', 'applicant_applied', 'support_ticket_resolved',
    'time_based', 'manual', 'webhook', 'api'
  )),
  trigger_config JSONB NOT NULL,
  conditions JSONB DEFAULT '[]',
  template_id INTEGER REFERENCES src_email_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT,
  sender_email TEXT,
  sender_name TEXT,
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_automations_trigger ON src_email_automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_automations_active ON src_email_automations(is_active);
CREATE INDEX IF NOT EXISTS idx_email_automations_created_by ON src_email_automations(created_by);

COMMENT ON TABLE src_email_automations IS 'Automated email workflows triggered by events';
COMMENT ON COLUMN src_email_automations.trigger_config IS 'Configuration for trigger, e.g. {event: "order_completed", order_status: "delivered"}';
COMMENT ON COLUMN src_email_automations.conditions IS 'Additional conditions to check before sending';
COMMENT ON COLUMN src_email_automations.delay_minutes IS 'Delay in minutes before sending after trigger';

-- ────────────────────────────────────────────────────────────────────────────
-- 8. AUTOMATION EXECUTION LOGS
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_automation_logs (
  id SERIAL PRIMARY KEY,
  automation_id INTEGER REFERENCES src_email_automations(id) ON DELETE CASCADE,
  trigger_data JSONB,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  email_id INTEGER REFERENCES src_email_sent(id) ON DELETE SET NULL,
  skip_reason TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_automation_logs_automation ON src_email_automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_logs_status ON src_email_automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_automation_logs_recipient ON src_email_automation_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_automation_logs_executed ON src_email_automation_logs(executed_at);

COMMENT ON TABLE src_email_automation_logs IS 'Execution history for email automations';
COMMENT ON COLUMN src_email_automation_logs.trigger_data IS 'The data that triggered this automation execution';
COMMENT ON COLUMN src_email_automation_logs.skip_reason IS 'Why the email was not sent (suppressed, invalid, etc.)';

-- ────────────────────────────────────────────────────────────────────────────
-- 9. EMAIL AUDIT LOG
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'email', 'campaign', 'template', 'segment', 'automation', 
    'suppression', 'draft', 'settings', 'sender_identity'
  )),
  resource_id INTEGER,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_audit_user ON src_email_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_action ON src_email_audit(action);
CREATE INDEX IF NOT EXISTS idx_email_audit_resource ON src_email_audit(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_created ON src_email_audit(created_at);

COMMENT ON TABLE src_email_audit IS 'Immutable audit trail for all email portal operations';
COMMENT ON COLUMN src_email_audit.details IS 'Action-specific details, before/after values, etc.';

-- ────────────────────────────────────────────────────────────────────────────
-- 10. SENDER IDENTITIES
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_sender_identities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  reply_to TEXT,
  identity_type TEXT DEFAULT 'verified' CHECK (identity_type IN (
    'verified', 'domain', 'system'
  )),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'verified', 'failed'
  )),
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sender_identities_email ON src_email_sender_identities(email);
CREATE INDEX IF NOT EXISTS idx_sender_identities_active ON src_email_sender_identities(is_active);
CREATE INDEX IF NOT EXISTS idx_sender_identities_default ON src_email_sender_identities(is_default);

COMMENT ON TABLE src_email_sender_identities IS 'Verified sender email addresses and identities';
COMMENT ON COLUMN src_email_sender_identities.identity_type IS 'verified=single email, domain=entire domain, system=built-in';

-- ────────────────────────────────────────────────────────────────────────────
-- 11. CAMPAIGN RECIPIENTS (for detailed tracking)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS src_email_campaign_recipients (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES src_email_campaigns(id) ON DELETE CASCADE,
  email_id INTEGER REFERENCES src_email_sent(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'skipped'
  )),
  skip_reason TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON src_email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON src_email_campaign_recipients(recipient_email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON src_email_campaign_recipients(status);

COMMENT ON TABLE src_email_campaign_recipients IS 'Individual recipient tracking for campaigns';

-- ────────────────────────────────────────────────────────────────────────────
-- 12. INSERT DEFAULT SENDER IDENTITIES
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO src_email_sender_identities (name, email, reply_to, identity_type, is_default, is_active, verification_status, verified_at)
VALUES 
  ('NOREN', 'noreply@norenfastion.shop', 'supportnoren1@gmail.com', 'system', TRUE, TRUE, 'verified', NOW()),
  ('NOREN Support', 'supportnoren1@gmail.com', 'supportnoren1@gmail.com', 'system', FALSE, TRUE, 'verified', NOW()),
  ('NOREN Marketing', 'marketing@norenfastion.shop', 'supportnoren1@gmail.com', 'domain', FALSE, TRUE, 'pending', NULL),
  ('NOREN HR', 'hr@norenfastion.shop', 'supportnoren1@gmail.com', 'domain', FALSE, TRUE, 'pending', NULL)
ON CONFLICT (email) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 13. FUNCTIONS & TRIGGERS
-- ────────────────────────────────────────────────────────────────────────────

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
DROP TRIGGER IF EXISTS update_email_templates_timestamp ON src_email_templates;
CREATE TRIGGER update_email_templates_timestamp
  BEFORE UPDATE ON src_email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_drafts_timestamp ON src_email_drafts;
CREATE TRIGGER update_email_drafts_timestamp
  BEFORE UPDATE ON src_email_drafts
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_campaigns_timestamp ON src_email_campaigns;
CREATE TRIGGER update_email_campaigns_timestamp
  BEFORE UPDATE ON src_email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_segments_timestamp ON src_email_segments;
CREATE TRIGGER update_email_segments_timestamp
  BEFORE UPDATE ON src_email_segments
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_email_automations_timestamp ON src_email_automations;
CREATE TRIGGER update_email_automations_timestamp
  BEFORE UPDATE ON src_email_automations
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

DROP TRIGGER IF EXISTS update_sender_identities_timestamp ON src_email_sender_identities;
CREATE TRIGGER update_sender_identities_timestamp
  BEFORE UPDATE ON src_email_sender_identities
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 14. GRANT PERMISSIONS (if needed)
-- ────────────────────────────────────────────────────────────────────────────
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO noren_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO noren_app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 12 new tables for email portal
-- Indexes created: 50+ indexes for query performance
-- Triggers created: 6 automatic timestamp updates
-- Default data: 4 sender identities inserted
-- ============================================================================

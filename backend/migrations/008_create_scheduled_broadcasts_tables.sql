-- ============================================================================
-- SCHEDULED BROADCASTS TABLES
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS src_email_broadcast_logs CASCADE;
DROP TABLE IF EXISTS src_email_scheduled_broadcasts CASCADE;

-- ============================================================================
-- src_email_scheduled_broadcasts
-- Stores recurring email broadcasts (daily, weekly, custom schedules)
-- ============================================================================
CREATE TABLE src_email_scheduled_broadcasts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  template_id INTEGER REFERENCES src_email_templates(id) ON DELETE SET NULL,
  company_name VARCHAR(255) DEFAULT 'Dinesh Global Pvt Ltd',
  
  -- Schedule configuration
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'custom', 'one_time')),
  custom_days JSONB, -- Array of day numbers [0-6] for custom frequency
  send_time TIME NOT NULL, -- Time to send email (e.g., '09:00')
  
  -- Audience configuration
  audience_type VARCHAR(50) NOT NULL CHECK (audience_type IN ('all_contacts', 'subscribers', 'customers', 'custom_list')),
  custom_recipient_list TEXT, -- Comma-separated emails for custom_list
  
  -- Status and tracking
  is_active BOOLEAN DEFAULT TRUE,
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,
  
  -- Audit fields
  created_by INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for scheduled_broadcasts
CREATE INDEX idx_broadcasts_frequency ON src_email_scheduled_broadcasts(frequency);
CREATE INDEX idx_broadcasts_is_active ON src_email_scheduled_broadcasts(is_active);
CREATE INDEX idx_broadcasts_next_run ON src_email_scheduled_broadcasts(next_run_at) WHERE is_active = TRUE;
CREATE INDEX idx_broadcasts_created_by ON src_email_scheduled_broadcasts(created_by);

-- ============================================================================
-- src_email_broadcast_logs
-- Logs each execution of a scheduled broadcast
-- ============================================================================
CREATE TABLE src_email_broadcast_logs (
  id SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES src_email_scheduled_broadcasts(id) ON DELETE CASCADE,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed', 'partial')),
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for broadcast_logs
CREATE INDEX idx_broadcast_logs_broadcast_id ON src_email_broadcast_logs(broadcast_id);
CREATE INDEX idx_broadcast_logs_sent_at ON src_email_broadcast_logs(sent_at);
CREATE INDEX idx_broadcast_logs_status ON src_email_broadcast_logs(status);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_broadcast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_broadcast_updated_at
BEFORE UPDATE ON src_email_scheduled_broadcasts
FOR EACH ROW
EXECUTE FUNCTION update_broadcast_updated_at();

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Example daily newsletter
INSERT INTO src_email_scheduled_broadcasts (
  name, description, subject, company_name, frequency, send_time, audience_type, is_active, created_by
) VALUES (
  'Daily Newsletter',
  'Send daily updates to all subscribers',
  'Your Daily Update from Dinesh Global',
  'Dinesh Global Pvt Ltd',
  'daily',
  '09:00',
  'all_contacts',
  FALSE, -- Inactive by default
  1
);

-- Example weekly summary
INSERT INTO src_email_scheduled_broadcasts (
  name, description, subject, company_name, frequency, send_time, audience_type, is_active, created_by
) VALUES (
  'Weekly Summary',
  'Weekly summary of activities and updates',
  'Your Weekly Digest from Dinesh Global',
  'Dinesh Global Pvt Ltd',
  'weekly',
  '10:00',
  'subscribers',
  FALSE,
  1
);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE src_email_scheduled_broadcasts IS 'Stores recurring scheduled email broadcasts';
COMMENT ON TABLE src_email_broadcast_logs IS 'Logs execution history of scheduled broadcasts';

COMMENT ON COLUMN src_email_scheduled_broadcasts.frequency IS 'Broadcast frequency: daily, weekly, custom, or one_time';
COMMENT ON COLUMN src_email_scheduled_broadcasts.custom_days IS 'Array of weekday numbers (0=Sunday, 6=Saturday) for custom frequency';
COMMENT ON COLUMN src_email_scheduled_broadcasts.send_time IS 'Time of day to send broadcast (24-hour format)';
COMMENT ON COLUMN src_email_scheduled_broadcasts.audience_type IS 'Target audience: all_contacts, subscribers, customers, or custom_list';
COMMENT ON COLUMN src_email_scheduled_broadcasts.next_run_at IS 'Next scheduled execution time';

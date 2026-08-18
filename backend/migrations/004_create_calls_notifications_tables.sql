-- Migration: Create Calls and Notifications Tables
-- Description: Voice/video call tracking and social notifications
-- Run Date: 2026-08-18

-- Voice and Video Calls
CREATE TABLE IF NOT EXISTS src_social_calls (
  id SERIAL PRIMARY KEY,
  call_type VARCHAR(20) DEFAULT 'voice',  -- 'voice', 'video', 'group_video'
  initiator_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  recipient_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,  -- NULL for group calls
  conversation_id INTEGER REFERENCES src_social_conversations(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'ringing',  -- 'ringing', 'accepted', 'rejected', 'missed', 'completed', 'failed'
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  rejection_reason VARCHAR(100),  -- 'declined', 'busy', 'timeout', 'network_error'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_initiator_id ON src_social_calls(initiator_id);
CREATE INDEX IF NOT EXISTS idx_calls_recipient_id ON src_social_calls(recipient_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON src_social_calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON src_social_calls(created_at DESC);

-- Call Participants (for group calls)
CREATE TABLE IF NOT EXISTS src_social_call_participants (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES src_social_calls(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  duration_seconds INTEGER,
  UNIQUE (call_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON src_social_call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON src_social_call_participants(user_id);

-- Social Notifications
CREATE TABLE IF NOT EXISTS src_social_notifications (
  id SERIAL PRIMARY KEY,
  recipient_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  actor_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,  -- who triggered the notification
  notification_type VARCHAR(50) NOT NULL,  -- 'follow', 'like', 'comment', 'mention', 'message', 'call', 'story_reaction', 'follow_request', 'verification'
  target_type VARCHAR(50),  -- 'post', 'comment', 'user', 'message', 'story', 'conversation', 'call'
  target_id INTEGER,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  deep_link VARCHAR(255),  -- URL/route to navigate to in app
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON src_social_notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON src_social_notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON src_social_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON src_social_notifications(created_at DESC);

-- Commit message
-- Created call tracking and notification tables for social interactions

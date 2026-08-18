-- Migration: Create Privacy, Moderation and Audit Tables
-- Description: User restrictions, mentions, content moderation audit logs
-- Run Date: 2026-08-18

-- User Restrictions (restrict without blocking)
CREATE TABLE IF NOT EXISTS src_social_restrictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  restricted_user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, restricted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_restrictions_user_id ON src_social_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_restricted_user_id ON src_social_restrictions(restricted_user_id);

-- Mentions (track mentions in posts, comments, messages)
CREATE TABLE IF NOT EXISTS src_social_mentions (
  id SERIAL PRIMARY KEY,
  mentioned_user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  post_id INTEGER REFERENCES src_social_posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES src_social_comments(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES src_social_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT mention_target CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL) OR (message_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_id ON src_social_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON src_social_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_comment_id ON src_social_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_mentions_message_id ON src_social_mentions(message_id);

-- Audit Logs for Admin Actions
CREATE TABLE IF NOT EXISTS src_social_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,  -- 'ban_user', 'unban_user', 'remove_post', 'restore_post', 'verify_user', 'remove_verification', 'resolve_report'
  target_type VARCHAR(50),  -- 'user', 'post', 'reel', 'comment', 'message', 'report'
  target_id INTEGER,
  reason TEXT,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON src_social_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON src_social_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON src_social_audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON src_social_audit_logs(created_at DESC);

-- Ensure Hashtags table exists and has proper structure
CREATE TABLE IF NOT EXISTS src_social_hashtags (
  id SERIAL PRIMARY KEY,
  tag VARCHAR(100) UNIQUE NOT NULL,
  posts_count INTEGER DEFAULT 0,
  reels_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  trending_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON src_social_hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_posts_count ON src_social_hashtags(posts_count DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_trending_at ON src_social_hashtags(trending_at DESC);

-- Hashtag Followers (users following hashtags)
CREATE TABLE IF NOT EXISTS src_social_hashtag_followers (
  id SERIAL PRIMARY KEY,
  hashtag_id INTEGER REFERENCES src_social_hashtags(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  followed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (hashtag_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hashtag_followers_hashtag_id ON src_social_hashtag_followers(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_hashtag_followers_user_id ON src_social_hashtag_followers(user_id);

-- Commit message
-- Created user restrictions, mentions, audit logs, and hashtag tracking tables

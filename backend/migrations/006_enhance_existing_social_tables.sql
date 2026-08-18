-- Migration: Enhance Existing Social Tables
-- Description: Add missing columns to existing social tables
-- Run Date: 2026-08-18

-- Ensure src_social_posts has all required columns
ALTER TABLE src_social_posts
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS is_comments_disabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_likes_hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) DEFAULT 'public',  -- 'public', 'private', 'close_friends'
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON src_social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON src_social_posts(privacy);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON src_social_posts(created_at DESC);

-- Ensure src_social_post_media has all columns
ALTER TABLE src_social_post_media
  ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(20) DEFAULT '1:1',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration INTEGER,  -- for video in seconds
  ADD COLUMN IF NOT EXISTS file_size INTEGER;  -- in bytes

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON src_social_post_media(post_id);

-- Ensure src_social_comments has all required columns
ALTER TABLE src_social_comments
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES src_social_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(20),  -- 'post' or 'reel'
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_comments_target_type_id ON src_social_comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON src_social_comments(user_id);

-- Ensure src_social_reels has all columns
ALTER TABLE src_social_reels
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audio_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS music_artist VARCHAR(255),
  ADD COLUMN IF NOT EXISTS duration INTEGER,  -- in seconds
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_reels_user_id ON src_social_reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON src_social_reels(created_at DESC);

-- Ensure src_social_follows has status column
ALTER TABLE src_social_follows
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'accepted',  -- 'pending', 'accepted', 'rejected'
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON src_social_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON src_social_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON src_social_follows(status);

-- Ensure src_social_likes has created_at
ALTER TABLE src_social_likes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON src_social_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON src_social_likes(target_type, target_id);

-- Ensure src_social_bookmarks has created_at
ALTER TABLE src_social_bookmarks
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON src_social_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_target ON src_social_bookmarks(target_type, target_id);

-- Ensure src_social_blocks has timestamps
ALTER TABLE src_social_blocks
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON src_social_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON src_social_blocks(blocked_id);

-- Ensure src_social_reports has all columns
ALTER TABLE src_social_reports
  ADD COLUMN IF NOT EXISTS moderator_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_taken VARCHAR(100),  -- 'removed', 'warned', 'suspended', 'banned', 'restored', 'rejected'
  ADD COLUMN IF NOT EXISTS moderator_note TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'in_review', 'resolved', 'rejected'
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_reports_status ON src_social_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON src_social_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_moderator_id ON src_social_reports(moderator_id);

-- Ensure src_social_privacy_settings exists
CREATE TABLE IF NOT EXISTS src_social_privacy_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  who_can_message VARCHAR(20) DEFAULT 'everyone',  -- 'everyone', 'followers', 'following', 'none'
  who_can_comment VARCHAR(20) DEFAULT 'everyone',  -- 'everyone', 'followers', 'following', 'none'
  who_can_tag VARCHAR(20) DEFAULT 'everyone',  -- 'everyone', 'followers', 'following', 'none'
  hidden_words TEXT[] DEFAULT '{}',  -- array of words to auto-censor
  show_activity_status BOOLEAN DEFAULT TRUE,
  show_online_status BOOLEAN DEFAULT TRUE,
  allow_story_replies BOOLEAN DEFAULT TRUE,
  story_privacy VARCHAR(20) DEFAULT 'everyone',  -- 'everyone', 'followers', 'close_friends', 'none'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure src_social_feature_flags exists
CREATE TABLE IF NOT EXISTS src_social_feature_flags (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default feature flags if they don't exist
INSERT INTO src_social_feature_flags (key, description) VALUES
  ('posts_enabled', 'Allow users to create and view posts'),
  ('reels_enabled', 'Enable short-form video reels'),
  ('stories_enabled', 'Enable 24-hour stories'),
  ('messaging_enabled', 'Enable direct messaging'),
  ('voice_calls_enabled', 'Enable voice calling'),
  ('video_calls_enabled', 'Enable video calling'),
  ('group_chat_enabled', 'Enable group conversations'),
  ('hashtag_search_enabled', 'Enable hashtag search and pages'),
  ('mentions_enabled', 'Enable mentions in posts/comments'),
  ('reposts_enabled', 'Enable repost/share functionality')
ON CONFLICT (key) DO NOTHING;

-- Commit message
-- Enhanced all existing social tables with required columns and indexes

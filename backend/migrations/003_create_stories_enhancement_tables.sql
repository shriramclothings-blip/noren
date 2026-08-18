-- Migration: Create Stories Enhancement Tables
-- Description: Story reactions, replies, and viewer tracking
-- Run Date: 2026-08-18

-- Story Reactions (emoji reactions on stories)
CREATE TABLE IF NOT EXISTS src_social_story_reactions (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES src_social_stories(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON src_social_story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user_id ON src_social_story_reactions(user_id);

-- Story Replies (text replies to stories, can be sent as DM)
CREATE TABLE IF NOT EXISTS src_social_story_replies (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES src_social_stories(id) ON DELETE CASCADE NOT NULL,
  sender_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  reply_text TEXT NOT NULL,
  is_sent_as_dm BOOLEAN DEFAULT FALSE,  -- if true, also create a DM
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_replies_story_id ON src_social_story_replies(story_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_sender_id ON src_social_story_replies(sender_id);

-- Story Viewers (who viewed each story)
CREATE TABLE IF NOT EXISTS src_social_story_viewers (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES src_social_stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_viewers_story_id ON src_social_story_viewers(story_id);
CREATE INDEX IF NOT EXISTS idx_story_viewers_viewer_id ON src_social_story_viewers(viewer_id);

-- Ensure src_social_stories table has required columns
ALTER TABLE src_social_stories
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS music_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sticker_data JSONB,
  ADD COLUMN IF NOT EXISTS location_tag VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON src_social_stories(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON src_social_stories(user_id);

-- Commit message
-- Created story reactions, replies, and viewer tracking tables

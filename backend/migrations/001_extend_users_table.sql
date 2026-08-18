-- Migration: Add Social Columns to src_users
-- Description: Extend user table with social platform fields
-- Run Date: 2026-08-18

-- Step 1: Add social profile columns if they don't exist
ALTER TABLE src_users 
  ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_pic_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reels_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stories_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Step 2: Create indexes for social queries
CREATE INDEX IF NOT EXISTS idx_users_username ON src_users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON src_users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_is_private ON src_users(is_private);
CREATE INDEX IF NOT EXISTS idx_users_followers_count ON src_users(followers_count DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON src_users(created_at DESC);

-- Step 3: Ensure avatar_url exists (might already exist)
ALTER TABLE src_users 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 4: Set default username for existing users (if not set)
UPDATE src_users 
  SET username = LOWER(CONCAT('user_', id)) 
  WHERE username IS NULL;

-- Step 5: Alter username to NOT NULL after defaults are set
ALTER TABLE src_users 
  ALTER COLUMN username SET NOT NULL;

-- Commit message
-- Extended src_users table with social profile fields
-- All existing users now have auto-generated usernames

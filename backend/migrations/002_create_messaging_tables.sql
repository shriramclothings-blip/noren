-- Migration: Create Direct Messaging Tables
-- Description: Tables for one-to-one and group conversations
-- Run Date: 2026-08-18

-- Conversations (1:1 and group)
CREATE TABLE IF NOT EXISTS src_social_conversations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),  -- NULL for 1:1, filled for group
  is_group BOOLEAN DEFAULT FALSE,
  creator_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  last_message_id INTEGER,
  last_message_at TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON src_social_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON src_social_conversations(last_message_at DESC);

-- Conversation Members (who's in each conversation)
CREATE TABLE IF NOT EXISTS src_social_conversation_members (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES src_social_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,  -- for group conversations
  is_muted BOOLEAN DEFAULT FALSE,
  last_read_message_id INTEGER,
  last_read_at TIMESTAMP,
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON src_social_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON src_social_conversation_members(conversation_id);

-- Messages in conversations
CREATE TABLE IF NOT EXISTS src_social_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES src_social_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',  -- 'text', 'image', 'video', 'audio', 'file'
  media_url TEXT,
  media_thumbnail TEXT,
  media_duration INTEGER,  -- for audio/video in seconds
  media_size INTEGER,  -- in bytes
  is_forwarded BOOLEAN DEFAULT FALSE,
  forwarded_from_message_id INTEGER REFERENCES src_social_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted_for_all BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  delivery_status VARCHAR(20) DEFAULT 'sending',  -- 'sending', 'sent', 'delivered', 'read', 'failed'
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  client_id VARCHAR(100),  -- prevent duplicate messages
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (conversation_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON src_social_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON src_social_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON src_social_messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON src_social_messages(created_at DESC);

-- Message Reactions (emoji reactions to messages)
CREATE TABLE IF NOT EXISTS src_social_message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES src_social_messages(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON src_social_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON src_social_message_reactions(user_id);

-- Commit message
-- Created direct messaging tables: conversations, members, messages, reactions

require('dotenv').config();
const { pool } = require('../config/db');

async function runSocialMigration() {
  console.log('🚀 Starting Noren Messaging Database Migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Extend src_users with social profile fields
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='username') THEN
          ALTER TABLE src_users ADD COLUMN username VARCHAR(100) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='bio') THEN
          ALTER TABLE src_users ADD COLUMN bio TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='website') THEN
          ALTER TABLE src_users ADD COLUMN website VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='is_verified') THEN
          ALTER TABLE src_users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='is_private') THEN
          ALTER TABLE src_users ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='followers_count') THEN
          ALTER TABLE src_users ADD COLUMN followers_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='following_count') THEN
          ALTER TABLE src_users ADD COLUMN following_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_users' AND column_name='posts_count') THEN
          ALTER TABLE src_users ADD COLUMN posts_count INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    // Populate username for existing users without username
    await client.query(`
      UPDATE src_users
      SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || id
      WHERE username IS NULL;
    `);

    // 2. Posts & Media
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        caption TEXT,
        location VARCHAR(255),
        alt_text TEXT,
        is_comments_disabled BOOLEAN DEFAULT FALSE,
        is_likes_hidden BOOLEAN DEFAULT FALSE,
        privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'followers', 'private')),
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_social_post_media (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES src_social_posts(id) ON DELETE CASCADE,
        media_type VARCHAR(20) CHECK (media_type IN ('image', 'video')),
        media_url TEXT NOT NULL,
        thumbnail_url TEXT,
        aspect_ratio VARCHAR(20) DEFAULT '1:1',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Reels
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_reels (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        audio_title VARCHAR(200) DEFAULT 'Original Audio',
        views_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4. Stories & Story Views
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_stories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'text')),
        media_url TEXT,
        text_content TEXT,
        background_color VARCHAR(50) DEFAULT '#0f172a',
        is_close_friends BOOLEAN DEFAULT FALSE,
        views_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_social_story_views (
        story_id INTEGER REFERENCES src_social_stories(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        reaction_emoji VARCHAR(20),
        viewed_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (story_id, user_id)
      );
    `);

    // 5. Follow system
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_follows (
        follower_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (follower_id, following_id)
      );
    `);

    // 6. Polymorphic Likes
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_likes (
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) CHECK (target_type IN ('post', 'reel', 'comment')),
        target_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, target_type, target_id)
      );
    `);

    // 7. Comments
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) CHECK (target_type IN ('post', 'reel')),
        target_id INTEGER NOT NULL,
        parent_comment_id INTEGER REFERENCES src_social_comments(id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 8. Bookmarks (Saved content) & Reposts
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_bookmarks (
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) CHECK (target_type IN ('post', 'reel')),
        target_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, target_type, target_id)
      );

      CREATE TABLE IF NOT EXISTS src_social_reposts (
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) CHECK (target_type IN ('post', 'reel')),
        target_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, target_type, target_id)
      );
    `);

    // 9. Hashtags
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_hashtags (
        id SERIAL PRIMARY KEY,
        tag VARCHAR(100) UNIQUE NOT NULL,
        posts_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS src_social_post_hashtags (
        post_id INTEGER REFERENCES src_social_posts(id) ON DELETE CASCADE,
        hashtag_id INTEGER REFERENCES src_social_hashtags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, hashtag_id)
      );
    `);

    // 10. Reports & Moderation
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) CHECK (target_type IN ('user', 'post', 'reel', 'story', 'comment', 'message')),
        target_id INTEGER NOT NULL,
        category VARCHAR(50) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
        moderator_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
        action_taken VARCHAR(100),
        moderator_note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 11. Safety: Blocks & Restrictions
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_blocks (
        blocker_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        blocked_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (blocker_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS src_social_restrictions (
        restricting_user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        restricted_user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (restricting_user_id, restricted_user_id)
      );
    `);

    // 12. User Privacy Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_privacy_settings (
        user_id INTEGER PRIMARY KEY REFERENCES src_users(id) ON DELETE CASCADE,
        who_can_message VARCHAR(20) DEFAULT 'everyone' CHECK (who_can_message IN ('everyone', 'following', 'no_one')),
        who_can_comment VARCHAR(20) DEFAULT 'everyone' CHECK (who_can_comment IN ('everyone', 'following', 'no_one')),
        who_can_mention VARCHAR(20) DEFAULT 'everyone' CHECK (who_can_mention IN ('everyone', 'following', 'no_one')),
        who_can_call VARCHAR(20) DEFAULT 'everyone' CHECK (who_can_call IN ('everyone', 'following', 'no_one')),
        show_online_status BOOLEAN DEFAULT TRUE,
        show_read_receipts BOOLEAN DEFAULT TRUE,
        hidden_words TEXT[] DEFAULT ARRAY[]::TEXT[],
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 13. Platform Feature Flags & Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_social_feature_flags (
        key VARCHAR(100) PRIMARY KEY,
        enabled BOOLEAN DEFAULT TRUE,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO src_social_feature_flags (key, enabled, description) VALUES
        ('reels_enabled', TRUE, 'Enable Reels feature and vertical video feed'),
        ('stories_enabled', TRUE, 'Enable 24-hour ephemeral stories'),
        ('voice_calls_enabled', TRUE, 'Enable WebRTC voice calling'),
        ('video_calls_enabled', TRUE, 'Enable WebRTC video calling'),
        ('group_chat_enabled', TRUE, 'Enable group direct messaging'),
        ('reposts_enabled', TRUE, 'Enable post and reel reposting'),
        ('public_profiles_enabled', TRUE, 'Enable public user social profiles')
      ON CONFLICT (key) DO NOTHING;
    `);

    // 14. Message Reactions & Metadata (if missing from private chat tables)
    await client.query(`
      CREATE TABLE IF NOT EXISTS src_message_reactions (
        message_id INTEGER REFERENCES src_private_chat_messages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
        emoji VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (message_id, user_id, emoji)
      );

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_private_chat_messages' AND column_name='edited_at') THEN
          ALTER TABLE src_private_chat_messages ADD COLUMN edited_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_private_chat_messages' AND column_name='deleted_for_all') THEN
          ALTER TABLE src_private_chat_messages ADD COLUMN deleted_for_all BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_private_chat_messages' AND column_name='status') THEN
          ALTER TABLE src_private_chat_messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='src_private_chat_messages' AND column_name='client_msg_id') THEN
          ALTER TABLE src_private_chat_messages ADD COLUMN client_msg_id VARCHAR(100);
        END IF;
      END $$;
    `);

    // Indexes for high performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON src_social_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON src_social_posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_social_reels_user_id ON src_social_reels(user_id);
      CREATE INDEX IF NOT EXISTS idx_social_stories_user_id_expires ON src_social_stories(user_id, expires_at);
      CREATE INDEX IF NOT EXISTS idx_social_comments_target ON src_social_comments(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_social_likes_target ON src_social_likes(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_social_follows_following ON src_social_follows(following_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Noren Messaging Database Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runSocialMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runSocialMigration };

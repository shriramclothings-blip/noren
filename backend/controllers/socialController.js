const { pool } = require('../config/db');

// Helper to sanitize hidden words according to user privacy settings
const applyContentFilters = async (userId, content) => {
  if (!content) return content;
  try {
    const privRes = await pool.query(
      'SELECT hidden_words FROM src_social_privacy_settings WHERE user_id = $1',
      [userId]
    );
    const hiddenWords = privRes.rows[0]?.hidden_words || [];
    if (!hiddenWords.length) return content;

    let filtered = content;
    for (const word of hiddenWords) {
      if (word.trim()) {
        const regex = new RegExp(`\\b${word.trim()}\\b`, 'gi');
        filtered = filtered.replace(regex, '***');
      }
    }
    return filtered;
  } catch {
    return content;
  }
};

// Check if feature is enabled via feature flags
const isFeatureEnabled = async (flagKey) => {
  try {
    const res = await pool.query(
      'SELECT enabled FROM src_social_feature_flags WHERE key = $1',
      [flagKey]
    );
    return res.rows.length ? res.rows[0].enabled : true;
  } catch {
    return true;
  }
};

// ─── HOME FEED ─────────────────────────────────────────────────────────────
const getFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : new Date();

    // Query posts from followed users + public user posts
    const postsRes = await pool.query(
      `SELECT p.id, p.user_id, p.caption, p.location, p.alt_text,
              p.is_comments_disabled, p.is_likes_hidden, p.privacy,
              p.likes_count, p.comments_count, p.shares_count, p.reposts_count,
              p.is_edited, p.created_at,
              u.name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar, u.is_verified AS author_verified,
              EXISTS (SELECT 1 FROM src_social_likes WHERE user_id = $1 AND target_type = 'post' AND target_id = p.id) AS is_liked,
              EXISTS (SELECT 1 FROM src_social_bookmarks WHERE user_id = $1 AND target_type = 'post' AND target_id = p.id) AS is_saved,
              EXISTS (SELECT 1 FROM src_social_reposts WHERE user_id = $1 AND target_type = 'post' AND target_id = p.id) AS is_reposted,
              COALESCE(json_agg(
                json_build_object(
                  'id', m.id,
                  'media_type', m.media_type,
                  'media_url', m.media_url,
                  'thumbnail_url', m.thumbnail_url,
                  'aspect_ratio', m.aspect_ratio,
                  'sort_order', m.sort_order
                ) ORDER BY m.sort_order ASC
              ) FILTER (WHERE m.id IS NOT NULL), '[]') AS media
       FROM src_social_posts p
       JOIN src_users u ON u.id = p.user_id
       LEFT JOIN src_social_post_media m ON m.post_id = p.id
       WHERE p.created_at < $2
         AND p.user_id NOT IN (SELECT blocked_id FROM src_social_blocks WHERE blocker_id = $1)
         AND p.user_id NOT IN (SELECT blocker_id FROM src_social_blocks WHERE blocked_id = $1)
         AND (
           p.user_id = $1
           OR p.user_id IN (SELECT following_id FROM src_social_follows WHERE follower_id = $1 AND status = 'accepted')
           OR u.is_private = FALSE
         )
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [userId, cursor, limit]
    );

    const posts = postsRes.rows;
    const nextCursor = posts.length ? posts[posts.length - 1].created_at : null;

    // Fetch account suggestions
    const suggestionsRes = await pool.query(
      `SELECT u.id, u.name, u.username, u.avatar_url, u.is_verified, u.followers_count
       FROM src_users u
       WHERE u.id != $1
         AND u.is_banned = FALSE
         AND u.id NOT IN (SELECT following_id FROM src_social_follows WHERE follower_id = $1)
         AND u.id NOT IN (SELECT blocked_id FROM src_social_blocks WHERE blocker_id = $1)
       ORDER BY u.followers_count DESC, u.created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      posts,
      nextCursor,
      hasMore: posts.length === limit,
      suggestions: suggestionsRes.rows,
    });
  } catch (err) {
    console.error('getFeed error:', err.message);
    res.status(500).json({ message: 'Failed to fetch feed' });
  }
};

// ─── POSTS CRUD ─────────────────────────────────────────────────────────────
const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      caption,
      location,
      alt_text,
      is_comments_disabled,
      is_likes_hidden,
      privacy,
      media = []
    } = req.body;

    if (!media.length) {
      return res.status(400).json({ message: 'At least one media item is required' });
    }

    const filteredCaption = await applyContentFilters(userId, caption);

    const postRes = await pool.query(
      `INSERT INTO src_social_posts
         (user_id, caption, location, alt_text, is_comments_disabled, is_likes_hidden, privacy)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, filteredCaption, location, alt_text, !!is_comments_disabled, !!is_likes_hidden, privacy || 'public']
    );

    const post = postRes.rows[0];

    // Insert post media items
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      await pool.query(
        `INSERT INTO src_social_post_media (post_id, media_type, media_url, thumbnail_url, aspect_ratio, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [post.id, m.media_type || 'image', m.media_url, m.thumbnail_url || null, m.aspect_ratio || '1:1', i]
      );
    }

    // Process Hashtags
    if (filteredCaption) {
      const hashtags = (filteredCaption.match(/#[\w_]+/g) || []).map(h => h.slice(1).toLowerCase());
      for (const tag of hashtags) {
        const tagRes = await pool.query(
          `INSERT INTO src_social_hashtags (tag, posts_count) VALUES ($1, 1)
           ON CONFLICT (tag) DO UPDATE SET posts_count = src_social_hashtags.posts_count + 1
           RETURNING id`,
          [tag]
        );
        await pool.query(
          `INSERT INTO src_social_post_hashtags (post_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [post.id, tagRes.rows[0].id]
        );
      }
    }

    // Increment user post count
    await pool.query('UPDATE src_users SET posts_count = posts_count + 1 WHERE id = $1', [userId]);

    res.status(201).json({ message: 'Post created successfully', post_id: post.id });
  } catch (err) {
    console.error('createPost error:', err.message);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id || 0;

    const postRes = await pool.query(
      `SELECT p.id, p.user_id, p.caption, p.location, p.alt_text,
              p.is_comments_disabled, p.is_likes_hidden, p.privacy,
              p.likes_count, p.comments_count, p.shares_count, p.reposts_count,
              p.is_edited, p.created_at,
              u.name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar, u.is_verified AS author_verified,
              EXISTS (SELECT 1 FROM src_social_likes WHERE user_id = $2 AND target_type = 'post' AND target_id = p.id) AS is_liked,
              EXISTS (SELECT 1 FROM src_social_bookmarks WHERE user_id = $2 AND target_type = 'post' AND target_id = p.id) AS is_saved,
              EXISTS (SELECT 1 FROM src_social_reposts WHERE user_id = $2 AND target_type = 'post' AND target_id = p.id) AS is_reposted,
              COALESCE(json_agg(
                json_build_object(
                  'id', m.id,
                  'media_type', m.media_type,
                  'media_url', m.media_url,
                  'thumbnail_url', m.thumbnail_url,
                  'aspect_ratio', m.aspect_ratio,
                  'sort_order', m.sort_order
                ) ORDER BY m.sort_order ASC
              ) FILTER (WHERE m.id IS NOT NULL), '[]') AS media
       FROM src_social_posts p
       JOIN src_users u ON u.id = p.user_id
       LEFT JOIN src_social_post_media m ON m.post_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.id`,
      [postId, userId]
    );

    if (!postRes.rows.length) return res.status(404).json({ message: 'Post not found' });
    res.json(postRes.rows[0]);
  } catch (err) {
    console.error('getPostById error:', err.message);
    res.status(500).json({ message: 'Failed to fetch post' });
  }
};

const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { caption, location, alt_text, is_comments_disabled, is_likes_hidden } = req.body;

    const checkRes = await pool.query('SELECT user_id FROM src_social_posts WHERE id = $1', [postId]);
    if (!checkRes.rows.length) return res.status(404).json({ message: 'Post not found' });
    if (checkRes.rows[0].user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Unauthorized to edit this post' });
    }

    const filteredCaption = await applyContentFilters(userId, caption);

    await pool.query(
      `UPDATE src_social_posts
       SET caption = COALESCE($1, caption),
           location = COALESCE($2, location),
           alt_text = COALESCE($3, alt_text),
           is_comments_disabled = COALESCE($4, is_comments_disabled),
           is_likes_hidden = COALESCE($5, is_likes_hidden),
           is_edited = TRUE,
           updated_at = NOW()
       WHERE id = $6`,
      [filteredCaption, location, alt_text, is_comments_disabled, is_likes_hidden, postId]
    );

    res.json({ message: 'Post updated successfully' });
  } catch (err) {
    console.error('updatePost error:', err.message);
    res.status(500).json({ message: 'Failed to update post' });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const checkRes = await pool.query('SELECT user_id FROM src_social_posts WHERE id = $1', [postId]);
    if (!checkRes.rows.length) return res.status(404).json({ message: 'Post not found' });
    if (checkRes.rows[0].user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this post' });
    }

    await pool.query('DELETE FROM src_social_posts WHERE id = $1', [postId]);
    await pool.query('UPDATE src_users SET posts_count = GREATEST(0, posts_count - 1) WHERE id = $1', [userId]);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('deletePost error:', err.message);
    res.status(500).json({ message: 'Failed to delete post' });
  }
};

// ─── LIKES, REPOSTS & BOOKMARKS ──────────────────────────────────────────────
const toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_type, target_id } = req.body;

    if (!['post', 'reel', 'comment'].includes(target_type)) {
      return res.status(400).json({ message: 'Invalid target type' });
    }

    const checkRes = await pool.query(
      'SELECT 1 FROM src_social_likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [userId, target_type, target_id]
    );

    let isLiked = false;
    if (checkRes.rows.length) {
      await pool.query(
        'DELETE FROM src_social_likes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
        [userId, target_type, target_id]
      );
      if (target_type === 'post') {
        await pool.query('UPDATE src_social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [target_id]);
      } else if (target_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [target_id]);
      } else if (target_type === 'comment') {
        await pool.query('UPDATE src_social_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [target_id]);
      }
    } else {
      await pool.query(
        'INSERT INTO src_social_likes (user_id, target_type, target_id) VALUES ($1, $2, $3)',
        [userId, target_type, target_id]
      );
      isLiked = true;
      if (target_type === 'post') {
        await pool.query('UPDATE src_social_posts SET likes_count = likes_count + 1 WHERE id = $1', [target_id]);
      } else if (target_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET likes_count = likes_count + 1 WHERE id = $1', [target_id]);
      } else if (target_type === 'comment') {
        await pool.query('UPDATE src_social_comments SET likes_count = likes_count + 1 WHERE id = $1', [target_id]);
      }
    }

    res.json({ is_liked: isLiked });
  } catch (err) {
    console.error('toggleLike error:', err.message);
    res.status(500).json({ message: 'Failed to toggle like' });
  }
};

const toggleBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_type, target_id } = req.body;

    const checkRes = await pool.query(
      'SELECT 1 FROM src_social_bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [userId, target_type, target_id]
    );

    let isSaved = false;
    if (checkRes.rows.length) {
      await pool.query(
        'DELETE FROM src_social_bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
        [userId, target_type, target_id]
      );
    } else {
      await pool.query(
        'INSERT INTO src_social_bookmarks (user_id, target_type, target_id) VALUES ($1, $2, $3)',
        [userId, target_type, target_id]
      );
      isSaved = true;
    }

    res.json({ is_saved: isSaved });
  } catch (err) {
    console.error('toggleBookmark error:', err.message);
    res.status(500).json({ message: 'Failed to toggle bookmark' });
  }
};

const toggleRepost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_type, target_id } = req.body;

    const checkRes = await pool.query(
      'SELECT 1 FROM src_social_reposts WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [userId, target_type, target_id]
    );

    let isReposted = false;
    if (checkRes.rows.length) {
      await pool.query(
        'DELETE FROM src_social_reposts WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
        [userId, target_type, target_id]
      );
      if (target_type === 'post') {
        await pool.query('UPDATE src_social_posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = $1', [target_id]);
      } else if (target_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = $1', [target_id]);
      }
    } else {
      await pool.query(
        'INSERT INTO src_social_reposts (user_id, target_type, target_id) VALUES ($1, $2, $3)',
        [userId, target_type, target_id]
      );
      isReposted = true;
      if (target_type === 'post') {
        await pool.query('UPDATE src_social_posts SET reposts_count = reposts_count + 1 WHERE id = $1', [target_id]);
      } else if (target_type === 'reel') {
        await pool.query('UPDATE src_social_reels SET reposts_count = reposts_count + 1 WHERE id = $1', [target_id]);
      }
    }

    res.json({ is_reposted: isReposted });
  } catch (err) {
    console.error('toggleRepost error:', err.message);
    res.status(500).json({ message: 'Failed to toggle repost' });
  }
};

// ─── COMMENTS ─────────────────────────────────────────────────────────────
const getComments = async (req, res) => {
  try {
    const { target_type, target_id } = req.query;
    const userId = req.user?.id || 0;

    const commentsRes = await pool.query(
      `SELECT c.id, c.user_id, c.parent_comment_id, c.comment_text, c.likes_count, c.created_at,
              u.name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar, u.is_verified AS author_verified,
              EXISTS (SELECT 1 FROM src_social_likes WHERE user_id = $3 AND target_type = 'comment' AND target_id = c.id) AS is_liked
       FROM src_social_comments c
       JOIN src_users u ON u.id = c.user_id
       WHERE c.target_type = $1 AND c.target_id = $2 AND c.is_hidden = FALSE
       ORDER BY c.created_at ASC`,
      [target_type, target_id, userId]
    );

    res.json(commentsRes.rows);
  } catch (err) {
    console.error('getComments error:', err.message);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

const addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_type, target_id, parent_comment_id, comment_text } = req.body;

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    const filteredText = await applyContentFilters(userId, comment_text);

    const commentRes = await pool.query(
      `INSERT INTO src_social_comments (user_id, target_type, target_id, parent_comment_id, comment_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, target_type, target_id, parent_comment_id || null, filteredText]
    );

    if (target_type === 'post') {
      await pool.query('UPDATE src_social_posts SET comments_count = comments_count + 1 WHERE id = $1', [target_id]);
    } else if (target_type === 'reel') {
      await pool.query('UPDATE src_social_reels SET comments_count = comments_count + 1 WHERE id = $1', [target_id]);
    }

    const fullCommentRes = await pool.query(
      `SELECT c.id, c.user_id, c.parent_comment_id, c.comment_text, c.likes_count, c.created_at,
              u.name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar, u.is_verified AS author_verified
       FROM src_social_comments c
       JOIN src_users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [commentRes.rows[0].id]
    );

    res.status(201).json(fullCommentRes.rows[0]);
  } catch (err) {
    console.error('addComment error:', err.message);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;

    const checkRes = await pool.query('SELECT user_id, target_type, target_id FROM src_social_comments WHERE id = $1', [commentId]);
    if (!checkRes.rows.length) return res.status(404).json({ message: 'Comment not found' });
    const comm = checkRes.rows[0];

    if (comm.user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await pool.query('DELETE FROM src_social_comments WHERE id = $1', [commentId]);

    if (comm.target_type === 'post') {
      await pool.query('UPDATE src_social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1', [comm.target_id]);
    } else if (comm.target_type === 'reel') {
      await pool.query('UPDATE src_social_reels SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1', [comm.target_id]);
    }

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err.message);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};

// ─── REELS ─────────────────────────────────────────────────────────────────
const getReels = async (req, res) => {
  try {
    const enabled = await isFeatureEnabled('reels_enabled');
    if (!enabled) return res.status(403).json({ message: 'Reels feature is currently disabled' });

    const userId = req.user?.id || 0;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const reelsRes = await pool.query(
      `SELECT r.id, r.user_id, r.video_url, r.thumbnail_url, r.caption, r.audio_title,
              r.views_count, r.likes_count, r.comments_count, r.shares_count, r.reposts_count, r.created_at,
              u.name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar, u.is_verified AS creator_verified,
              EXISTS (SELECT 1 FROM src_social_likes WHERE user_id = $1 AND target_type = 'reel' AND target_id = r.id) AS is_liked,
              EXISTS (SELECT 1 FROM src_social_bookmarks WHERE user_id = $1 AND target_type = 'reel' AND target_id = r.id) AS is_saved,
              EXISTS (SELECT 1 FROM src_social_reposts WHERE user_id = $1 AND target_type = 'reel' AND target_id = r.id) AS is_reposted,
              EXISTS (SELECT 1 FROM src_social_follows WHERE follower_id = $1 AND following_id = r.user_id AND status = 'accepted') AS is_following
       FROM src_social_reels r
       JOIN src_users u ON u.id = r.user_id
       WHERE r.is_hidden = FALSE
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json(reelsRes.rows);
  } catch (err) {
    console.error('getReels error:', err.message);
    res.status(500).json({ message: 'Failed to fetch reels' });
  }
};

const createReel = async (req, res) => {
  try {
    const enabled = await isFeatureEnabled('reels_enabled');
    if (!enabled) return res.status(403).json({ message: 'Reels feature is currently disabled' });

    const userId = req.user.id;
    const { video_url, thumbnail_url, caption, audio_title } = req.body;

    if (!video_url) return res.status(400).json({ message: 'Video URL is required' });

    const filteredCaption = await applyContentFilters(userId, caption);

    const reelRes = await pool.query(
      `INSERT INTO src_social_reels (user_id, video_url, thumbnail_url, caption, audio_title)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, video_url, thumbnail_url || null, filteredCaption, audio_title || 'Original Audio']
    );

    res.status(201).json(reelRes.rows[0]);
  } catch (err) {
    console.error('createReel error:', err.message);
    res.status(500).json({ message: 'Failed to create reel' });
  }
};

const recordReelView = async (req, res) => {
  try {
    const reelId = req.params.id;
    await pool.query('UPDATE src_social_reels SET views_count = views_count + 1 WHERE id = $1', [reelId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record view' });
  }
};

// ─── STORIES ──────────────────────────────────────────────────────────────
const getActiveStories = async (req, res) => {
  try {
    const enabled = await isFeatureEnabled('stories_enabled');
    if (!enabled) return res.status(403).json({ message: 'Stories feature is currently disabled' });

    const userId = req.user.id;

    // Retrieve active unexpired stories from followed users and self
    const storiesRes = await pool.query(
      `SELECT s.id, s.user_id, s.media_type, s.media_url, s.text_content, s.background_color,
              s.is_close_friends, s.views_count, s.expires_at, s.created_at,
              u.name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar, u.is_verified AS author_verified,
              EXISTS (SELECT 1 FROM src_social_story_views WHERE story_id = s.id AND user_id = $1) AS is_viewed
       FROM src_social_stories s
       JOIN src_users u ON u.id = s.user_id
       WHERE s.expires_at > NOW()
         AND (
           s.user_id = $1
           OR s.user_id IN (SELECT following_id FROM src_social_follows WHERE follower_id = $1 AND status = 'accepted')
         )
       ORDER BY is_viewed ASC, s.created_at DESC`,
      [userId]
    );

    // Group stories by user
    const userMap = {};
    for (const story of storiesRes.rows) {
      if (!userMap[story.user_id]) {
        userMap[story.user_id] = {
          user_id: story.user_id,
          author_name: story.author_name,
          author_username: story.author_username,
          author_avatar: story.author_avatar,
          author_verified: story.author_verified,
          has_unviewed: false,
          stories: [],
        };
      }
      if (!story.is_viewed) userMap[story.user_id].has_unviewed = true;
      userMap[story.user_id].stories.push(story);
    }

    res.json(Object.values(userMap));
  } catch (err) {
    console.error('getActiveStories error:', err.message);
    res.status(500).json({ message: 'Failed to fetch stories' });
  }
};

const createStory = async (req, res) => {
  try {
    const enabled = await isFeatureEnabled('stories_enabled');
    if (!enabled) return res.status(403).json({ message: 'Stories feature is currently disabled' });

    const userId = req.user.id;
    const { media_type, media_url, text_content, background_color, is_close_friends, duration_hours = 24 } = req.body;

    const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000);

    const storyRes = await pool.query(
      `INSERT INTO src_social_stories (user_id, media_type, media_url, text_content, background_color, is_close_friends, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, media_type || 'image', media_url || null, text_content || null, background_color || '#0f172a', !!is_close_friends, expiresAt]
    );

    res.status(201).json(storyRes.rows[0]);
  } catch (err) {
    console.error('createStory error:', err.message);
    res.status(500).json({ message: 'Failed to create story' });
  }
};

const recordStoryView = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.id;
    const { reaction_emoji } = req.body;

    await pool.query(
      `INSERT INTO src_social_story_views (story_id, user_id, reaction_emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (story_id, user_id) DO UPDATE SET reaction_emoji = COALESCE($3, src_social_story_views.reaction_emoji)`,
      [storyId, userId, reaction_emoji || null]
    );

    await pool.query('UPDATE src_social_stories SET views_count = views_count + 1 WHERE id = $1', [storyId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record story view' });
  }
};

// ─── USER PROFILE & FOLLOW SYSTEM ──────────────────────────────────────────
const getUserProfile = async (req, res) => {
  try {
    const username = req.params.username;
    const viewerId = req.user?.id || 0;

    const userRes = await pool.query(
      `SELECT u.id, u.name, u.username, u.email, u.avatar_url, u.bio, u.website,
              u.is_verified, u.is_private, u.followers_count, u.following_count, u.posts_count,
              EXISTS (SELECT 1 FROM src_social_follows WHERE follower_id = $2 AND following_id = u.id AND status = 'accepted') AS is_following,
              EXISTS (SELECT 1 FROM src_social_follows WHERE follower_id = $2 AND following_id = u.id AND status = 'pending') AS is_follow_pending,
              EXISTS (SELECT 1 FROM src_social_blocks WHERE blocker_id = $2 AND blocked_id = u.id) AS is_blocked
       FROM src_users u
       WHERE LOWER(u.username) = LOWER($1) OR u.id::text = $1`,
      [username, viewerId]
    );

    if (!userRes.rows.length) return res.status(404).json({ message: 'User profile not found' });
    const profile = userRes.rows[0];

    // Fetch user posts if public, or if viewer is self/follower
    let posts = [];
    const isOwner = viewerId === profile.id;
    const canViewContent = !profile.is_private || isOwner || profile.is_following;

    if (canViewContent) {
      const postsRes = await pool.query(
        `SELECT p.id, p.caption, p.likes_count, p.comments_count, p.created_at,
                (SELECT media_url FROM src_social_post_media WHERE post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS primary_media,
                (SELECT media_type FROM src_social_post_media WHERE post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS media_type
         FROM src_social_posts p
         WHERE p.user_id = $1
         ORDER BY p.created_at DESC`,
        [profile.id]
      );
      posts = postsRes.rows;
    }

    res.json({ profile, posts, can_view_content: canViewContent });
  } catch (err) {
    console.error('getUserProfile error:', err.message);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, username, bio, website, avatar_url, is_private } = req.body;

    if (username) {
      const checkRes = await pool.query('SELECT id FROM src_users WHERE LOWER(username) = LOWER($1) AND id != $2', [username, userId]);
      if (checkRes.rows.length) return res.status(400).json({ message: 'Username is already taken' });
    }

    await pool.query(
      `UPDATE src_users
       SET name = COALESCE($1, name),
           username = COALESCE($2, username),
           bio = COALESCE($3, bio),
           website = COALESCE($4, website),
           avatar_url = COALESCE($5, avatar_url),
           is_private = COALESCE($6, is_private)
       WHERE id = $7`,
      [name, username, bio, website, avatar_url, is_private, userId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('updateProfile error:', err.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

const followUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const targetUserId = parseInt(req.params.id);

    if (followerId === targetUserId) return res.status(400).json({ message: 'Cannot follow yourself' });

    const targetRes = await pool.query('SELECT is_private FROM src_users WHERE id = $1', [targetUserId]);
    if (!targetRes.rows.length) return res.status(404).json({ message: 'User not found' });

    const isPrivate = targetRes.rows[0].is_private;
    const status = isPrivate ? 'pending' : 'accepted';

    await pool.query(
      `INSERT INTO src_social_follows (follower_id, following_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (follower_id, following_id) DO UPDATE SET status = EXCLUDED.status`,
      [followerId, targetUserId, status]
    );

    if (status === 'accepted') {
      await pool.query('UPDATE src_users SET following_count = following_count + 1 WHERE id = $1', [followerId]);
      await pool.query('UPDATE src_users SET followers_count = followers_count + 1 WHERE id = $1', [targetUserId]);
    }

    res.json({ status });
  } catch (err) {
    console.error('followUser error:', err.message);
    res.status(500).json({ message: 'Failed to follow user' });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const targetUserId = parseInt(req.params.id);

    const checkRes = await pool.query('SELECT status FROM src_social_follows WHERE follower_id = $1 AND following_id = $2', [followerId, targetUserId]);
    if (!checkRes.rows.length) return res.json({ status: 'unfollowed' });

    const wasAccepted = checkRes.rows[0].status === 'accepted';
    await pool.query('DELETE FROM src_social_follows WHERE follower_id = $1 AND following_id = $2', [followerId, targetUserId]);

    if (wasAccepted) {
      await pool.query('UPDATE src_users SET following_count = GREATEST(0, following_count - 1) WHERE id = $1', [followerId]);
      await pool.query('UPDATE src_users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = $1', [targetUserId]);
    }

    res.json({ status: 'unfollowed' });
  } catch (err) {
    console.error('unfollowUser error:', err.message);
    res.status(500).json({ message: 'Failed to unfollow user' });
  }
};

// ─── SEARCH ────────────────────────────────────────────────────────────────
const globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [], hashtags: [], posts: [] });

    const usersRes = await pool.query(
      `SELECT id, name, username, avatar_url, is_verified, followers_count
       FROM src_users
       WHERE (name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1)
         AND is_banned = FALSE
       ORDER BY followers_count DESC, name ASC
       LIMIT 10`,
      [`%${q}%`]
    );

    const hashtagsRes = await pool.query(
      `SELECT id, tag, posts_count
       FROM src_social_hashtags
       WHERE tag ILIKE $1
       ORDER BY posts_count DESC
       LIMIT 10`,
      [`%${q.replace(/^#/, '')}%`]
    );

    res.json({
      users: usersRes.rows,
      hashtags: hashtagsRes.rows,
    });
  } catch (err) {
    console.error('globalSearch error:', err.message);
    res.status(500).json({ message: 'Search failed' });
  }
};

// ─── REPORTS & SAFETY ──────────────────────────────────────────────────────
const submitReport = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { target_type, target_id, category, reason } = req.body;

    if (!target_type || !target_id || !category) {
      return res.status(400).json({ message: 'Missing required report fields' });
    }

    await pool.query(
      `INSERT INTO src_social_reports (reporter_id, target_type, target_id, category, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [reporterId, target_type, target_id, category, reason || null]
    );

    res.status(201).json({ message: 'Report submitted successfully. Our moderation team will review it.' });
  } catch (err) {
    console.error('submitReport error:', err.message);
    res.status(500).json({ message: 'Failed to submit report' });
  }
};

const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.body.blocked_id);

    if (blockerId === blockedId) return res.status(400).json({ message: 'Cannot block yourself' });

    await pool.query(
      'INSERT INTO src_social_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [blockerId, blockedId]
    );

    // Remove any existing follow relationships
    await pool.query('DELETE FROM src_social_follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)', [blockerId, blockedId]);

    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to block user' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.id);

    await pool.query('DELETE FROM src_social_blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, blockedId]);
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unblock user' });
  }
};

const getPrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const resSettings = await pool.query('SELECT * FROM src_social_privacy_settings WHERE user_id = $1', [userId]);

    if (!resSettings.rows.length) {
      return res.json({
        who_can_message: 'everyone',
        who_can_comment: 'everyone',
        who_can_mention: 'everyone',
        who_can_call: 'everyone',
        show_online_status: true,
        show_read_receipts: true,
        hidden_words: [],
      });
    }

    res.json(resSettings.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get privacy settings' });
  }
};

const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { who_can_message, who_can_comment, who_can_mention, who_can_call, show_online_status, show_read_receipts, hidden_words } = req.body;

    await pool.query(
      `INSERT INTO src_social_privacy_settings
         (user_id, who_can_message, who_can_comment, who_can_mention, who_can_call, show_online_status, show_read_receipts, hidden_words, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         who_can_message = COALESCE(EXCLUDED.who_can_message, src_social_privacy_settings.who_can_message),
         who_can_comment = COALESCE(EXCLUDED.who_can_comment, src_social_privacy_settings.who_can_comment),
         who_can_mention = COALESCE(EXCLUDED.who_can_mention, src_social_privacy_settings.who_can_mention),
         who_can_call = COALESCE(EXCLUDED.who_can_call, src_social_privacy_settings.who_can_call),
         show_online_status = COALESCE(EXCLUDED.show_online_status, src_social_privacy_settings.show_online_status),
         show_read_receipts = COALESCE(EXCLUDED.show_read_receipts, src_social_privacy_settings.show_read_receipts),
         hidden_words = COALESCE(EXCLUDED.hidden_words, src_social_privacy_settings.hidden_words),
         updated_at = NOW()`,
      [userId, who_can_message, who_can_comment, who_can_mention, who_can_call, show_online_status, show_read_receipts, hidden_words || []]
    );

    res.json({ message: 'Privacy settings saved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update privacy settings' });
  }
const deleteReel = async (req, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.user.id;

    const checkRes = await pool.query('SELECT user_id FROM src_social_reels WHERE id = $1', [reelId]);
    if (!checkRes.rows.length) return res.status(404).json({ message: 'Reel not found' });
    if (checkRes.rows[0].user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this reel' });
    }

    await pool.query('DELETE FROM src_social_reels WHERE id = $1', [reelId]);
    res.json({ message: 'Reel deleted successfully' });
  } catch (err) {
    console.error('deleteReel error:', err.message);
    res.status(500).json({ message: 'Failed to delete reel' });
  }
};

const getBookmarks = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ posts: [] });
    const postsRes = await pool.query(
      `SELECT p.id, p.user_id, p.caption, p.location, p.alt_text,
              p.is_comments_disabled, p.is_likes_hidden, p.privacy,
              p.likes_count, p.comments_count, p.shares_count, p.reposts_count,
              p.is_edited, p.created_at,
              u.name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar, u.is_verified AS author_verified,
              EXISTS (SELECT 1 FROM src_social_likes WHERE user_id = $1 AND target_type = 'post' AND target_id = p.id) AS is_liked,
              TRUE AS is_saved,
              COALESCE(json_agg(
                json_build_object(
                  'id', m.id,
                  'media_type', m.media_type,
                  'media_url', m.media_url,
                  'thumbnail_url', m.thumbnail_url,
                  'aspect_ratio', m.aspect_ratio,
                  'sort_order', m.sort_order
                ) ORDER BY m.sort_order ASC
              ) FILTER (WHERE m.id IS NOT NULL), '[]') AS media
       FROM src_social_bookmarks b
       JOIN src_social_posts p ON p.id = b.target_id AND b.target_type = 'post'
       JOIN src_users u ON u.id = p.user_id
       LEFT JOIN src_social_post_media m ON m.post_id = p.id
       WHERE b.user_id = $1
       GROUP BY p.id, u.id, b.created_at
       ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json({ posts: postsRes.rows });
  } catch (err) {
    console.error('getBookmarks error:', err.message);
    res.status(500).json({ message: 'Failed to fetch saved bookmarks' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ notifications: [] });
    const notifsRes = await pool.query(
      `SELECT id, message, type, is_read, created_at
       FROM src_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ notifications: notifsRes.rows });
  } catch (err) {
    console.error('getNotifications error:', err.message);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.json({ message: 'OK' });
    await pool.query(
      `UPDATE src_notifications SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notifications' });
  }
};

module.exports = {
  getFeed,
  createPost,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  toggleBookmark,
  getBookmarks,
  toggleRepost,
  getComments,
  addComment,
  deleteComment,
  getReels,
  createReel,
  deleteReel,
  recordReelView,
  getActiveStories,
  createStory,
  recordStoryView,
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  globalSearch,
  getNotifications,
  markNotificationsRead,
  submitReport,
  blockUser,
  unblockUser,
  getPrivacySettings,
  updatePrivacySettings,
};

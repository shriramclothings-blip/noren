const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');

// ─── CREATE OR GET 1:1 CONVERSATION ─────────────────────────────────────
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipient_id, group_members = [] } = req.body;

    if (!recipient_id && !group_members.length) {
      return res.status(400).json({ message: 'recipient_id or group_members required' });
    }

    if (!recipient_id && group_members.length) {
      // Create group conversation
      const groupName = req.body.name || `Group (${group_members.length + 1})`;
      const convRes = await pool.query(
        `INSERT INTO src_social_conversations (is_group, creator_id, name)
         VALUES (TRUE, $1, $2)
         RETURNING id`,
        [userId, groupName]
      );
      const convId = convRes.rows[0].id;

      // Add creator as member
      await pool.query(
        `INSERT INTO src_social_conversation_members (conversation_id, user_id, is_admin)
         VALUES ($1, $2, TRUE)`,
        [convId, userId]
      );

      // Add other members
      for (const memberId of group_members) {
        await pool.query(
          `INSERT INTO src_social_conversation_members (conversation_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [convId, memberId]
        );
      }

      res.status(201).json({ conversation_id: convId, is_group: true });
      return;
    }

    // For 1:1 conversation, check if already exists
    const existingConvRes = await pool.query(
      `SELECT DISTINCT cm1.conversation_id
       FROM src_social_conversation_members cm1
       JOIN src_social_conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       JOIN src_social_conversations c ON c.id = cm1.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2 AND c.is_group = FALSE
       LIMIT 1`,
      [userId, recipient_id]
    );

    if (existingConvRes.rows.length) {
      return res.json({ conversation_id: existingConvRes.rows[0].conversation_id, is_group: false });
    }

    // Create new 1:1 conversation
    const convRes = await pool.query(
      `INSERT INTO src_social_conversations (is_group, creator_id)
       VALUES (FALSE, $1)
       RETURNING id`,
      [userId]
    );
    const convId = convRes.rows[0].id;

    // Add both members
    await pool.query(
      `INSERT INTO src_social_conversation_members (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)`,
      [convId, userId, recipient_id]
    );

    res.status(201).json({ conversation_id: convId, is_group: false });
  } catch (err) {
    console.error('getOrCreateConversation error:', err.message);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
};

// ─── LIST USER CONVERSATIONS ──────────────────────────────────────────────
const listConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const convsRes = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.is_group,
        c.avatar_url,
        c.last_message_at,
        c.created_at,
        COALESCE(m.id, 0) as last_message_id,
        COALESCE(m.content, '') as last_message_content,
        COALESCE(m.sender_id, 0) as last_sender_id,
        COALESCE(u.name, '') as last_sender_name,
        COALESCE(m.message_type, 'text') as last_message_type,
        COALESCE(cm.last_read_message_id, 0) as last_read_message_id,
        COUNT(CASE WHEN m.id > cm.last_read_message_id AND m.sender_id != $1 THEN 1 END) as unread_count
       FROM src_social_conversations c
       JOIN src_social_conversation_members cm ON c.id = cm.conversation_id
       LEFT JOIN src_social_messages m ON c.id = m.conversation_id AND m.id = c.last_message_id
       LEFT JOIN src_users u ON m.sender_id = u.id
       WHERE cm.user_id = $1
       GROUP BY c.id, m.id, u.id, cm.id
       ORDER BY c.last_message_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      conversations: convsRes.rows,
      limit,
      offset,
      hasMore: convsRes.rows.length === limit
    });
  } catch (err) {
    console.error('listConversations error:', err.message);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// ─── GET CONVERSATION DETAILS ──────────────────────────────────────────────
const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = parseInt(req.params.id);

    // Verify user is member
    const memberCheck = await pool.query(
      'SELECT id FROM src_social_conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [convId, userId]
    );

    if (!memberCheck.rows.length) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const convRes = await pool.query(
      `SELECT c.*, 
        json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url)) as members
       FROM src_social_conversations c
       JOIN src_social_conversation_members cm ON c.id = cm.conversation_id
       JOIN src_users u ON cm.user_id = u.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [convId]
    );

    if (!convRes.rows.length) return res.status(404).json({ message: 'Conversation not found' });

    res.json(convRes.rows[0]);
  } catch (err) {
    console.error('getConversation error:', err.message);
    res.status(500).json({ message: 'Failed to fetch conversation' });
  }
};

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversation_id, content, message_type = 'text', media_url, media_thumbnail, media_duration, client_id } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ message: 'conversation_id required' });
    }

    if (!content && !media_url) {
      return res.status(400).json({ message: 'content or media_url required' });
    }

    // Verify membership
    const memberCheck = await pool.query(
      'SELECT id FROM src_social_conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversation_id, userId]
    );

    if (!memberCheck.rows.length) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    // Create message
    const msgRes = await pool.query(
      `INSERT INTO src_social_messages
        (conversation_id, sender_id, content, message_type, media_url, media_thumbnail, media_duration, client_id, delivery_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sending')
       RETURNING *`,
      [conversation_id, userId, content || null, message_type, media_url || null, media_thumbnail || null, media_duration || null, client_id]
    );

    const message = msgRes.rows[0];

    // Update conversation last message
    await pool.query(
      `UPDATE src_social_conversations
       SET last_message_id = $1, last_message_at = NOW()
       WHERE id = $2`,
      [message.id, conversation_id]
    );

    // Update sender's read receipt
    await pool.query(
      `UPDATE src_social_conversation_members
       SET last_read_message_id = $1, last_read_at = NOW()
       WHERE conversation_id = $2 AND user_id = $3`,
      [message.id, conversation_id, userId]
    );

    // Emit WebSocket event (handled in realtime.js)
    res.status(201).json({
      ...message,
      delivery_status: 'sent'
    });
  } catch (err) {
    console.error('sendMessage error:', err.message);
    
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ message: 'Message already sent (duplicate client_id)' });
    }

    res.status(500).json({ message: 'Failed to send message' });
  }
};

// ─── GET MESSAGES IN CONVERSATION ─────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 50;
    const beforeId = parseInt(req.query.beforeId) || Number.MAX_SAFE_INTEGER;

    // Verify membership
    const memberCheck = await pool.query(
      'SELECT id FROM src_social_conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [convId, userId]
    );

    if (!memberCheck.rows.length) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    // Get messages (ordered oldest first, then reversed)
    const msgsRes = await pool.query(
      `SELECT m.*,
        json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) as sender,
        COALESCE(json_agg(json_build_object('emoji', mr.emoji, 'user_id', mr.user_id)) FILTER (WHERE mr.id IS NOT NULL), '[]') as reactions
       FROM src_social_messages m
       JOIN src_users u ON m.sender_id = u.id
       LEFT JOIN src_social_message_reactions mr ON m.id = mr.message_id
       WHERE m.conversation_id = $1 AND m.id < $2 AND m.is_deleted_for_all = FALSE
       GROUP BY m.id, u.id
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [convId, beforeId, limit]
    );

    res.json({
      messages: msgsRes.rows.reverse(),
      limit,
      hasMore: msgsRes.rows.length === limit
    });
  } catch (err) {
    console.error('getMessages error:', err.message);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// ─── MARK MESSAGES AS READ ────────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversation_id, message_id } = req.body;

    // Update member's last read
    await pool.query(
      `UPDATE src_social_conversation_members
       SET last_read_message_id = $1, last_read_at = NOW()
       WHERE conversation_id = $2 AND user_id = $3`,
      [message_id, conversation_id, userId]
    );

    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('markAsRead error:', err.message);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// ─── DELETE MESSAGE (FOR ALL) ──────────────────────────────────────────────
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = parseInt(req.params.id);
    const { forAll = false } = req.body;

    const msgRes = await pool.query(
      'SELECT * FROM src_social_messages WHERE id = $1',
      [messageId]
    );

    if (!msgRes.rows.length) return res.status(404).json({ message: 'Message not found' });

    const msg = msgRes.rows[0];

    // Only sender or admin can delete
    if (msg.sender_id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (forAll) {
      // Delete for all users
      await pool.query(
        `UPDATE src_social_messages
         SET is_deleted_for_all = TRUE, deleted_at = NOW()
         WHERE id = $1`,
        [messageId]
      );
    } else {
      // Delete just for me (mark as hidden)
      await pool.query(
        `INSERT INTO src_social_message_deletions (message_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [messageId, userId]
      );
    }

    res.json({ message: 'Message deleted' });
  } catch (err) {
    console.error('deleteMessage error:', err.message);
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// ─── ADD REACTION TO MESSAGE ──────────────────────────────────────────────
const addMessageReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = parseInt(req.params.id);
    const { emoji } = req.body;

    if (!emoji || emoji.length > 10) {
      return res.status(400).json({ message: 'Invalid emoji' });
    }

    await pool.query(
      `INSERT INTO src_social_message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
      [messageId, userId, emoji]
    );

    res.status(201).json({ message: 'Reaction added' });
  } catch (err) {
    console.error('addMessageReaction error:', err.message);
    res.status(500).json({ message: 'Failed to add reaction' });
  }
};

module.exports = {
  getOrCreateConversation,
  listConversations,
  getConversation,
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  addMessageReaction
};

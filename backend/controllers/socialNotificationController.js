const { pool } = require('../config/db');

// ─── GET USER NOTIFICATIONS ───────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const isRead = req.query.is_read ? req.query.is_read === 'true' : null;

    let query = `
      SELECT n.*,
        json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) as actor
      FROM src_social_notifications n
      LEFT JOIN src_users u ON n.actor_id = u.id
      WHERE n.recipient_id = $1
    `;
    const params = [userId];

    if (isRead !== null) {
      params.push(isRead);
      query += ` AND n.is_read = $${params.length}`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const notifRes = await pool.query(query, params);

    res.json({
      notifications: notifRes.rows,
      limit,
      offset,
      hasMore: notifRes.rows.length === limit
    });
  } catch (err) {
    console.error('getNotifications error:', err.message);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

// ─── GET UNREAD NOTIFICATION COUNT ─────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const countRes = await pool.query(
      'SELECT COUNT(*) as count FROM src_social_notifications WHERE recipient_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ unread_count: parseInt(countRes.rows[0].count) });
  } catch (err) {
    console.error('getUnreadCount error:', err.message);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
};

// ─── MARK NOTIFICATION AS READ ────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifId = parseInt(req.params.id);

    await pool.query(
      `UPDATE src_social_notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND recipient_id = $2`,
      [notifId, userId]
    );

    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('markAsRead error:', err.message);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// ─── MARK ALL NOTIFICATIONS AS READ ────────────────────────────────────────
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE src_social_notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('markAllAsRead error:', err.message);
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

// ─── DELETE NOTIFICATION ──────────────────────────────────────────────────
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifId = parseInt(req.params.id);

    await pool.query(
      `DELETE FROM src_social_notifications
       WHERE id = $1 AND recipient_id = $2`,
      [notifId, userId]
    );

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('deleteNotification error:', err.message);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};

// ─── INTERNAL: CREATE NOTIFICATION ────────────────────────────────────────
// Called by other controllers when social events happen
const createNotification = async (recipientId, actorId, type, targetType, targetId, content, deepLink) => {
  try {
    await pool.query(
      `INSERT INTO src_social_notifications
        (recipient_id, actor_id, notification_type, target_type, target_id, content, deep_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [recipientId, actorId, type, targetType, targetId, content, deepLink]
    );

    // Emit WebSocket event to notify user in real-time
    const io = require('../realtime').get();
    if (io) {
      io.to(`user:${recipientId}`).emit('notification:new', {
        type,
        content,
        actor_id: actorId,
        target_type: targetType,
        target_id: targetId
      });
    }
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
};

// ─── NOTIFICATION HELPERS ─────────────────────────────────────────────────

// Notify when someone follows
const notifyFollow = async (followerId, followingId) => {
  const followerRes = await pool.query(
    'SELECT name FROM src_users WHERE id = $1',
    [followerId]
  );
  const followerName = followerRes.rows[0]?.name || 'Someone';

  await createNotification(
    followingId,
    followerId,
    'follow',
    'user',
    followerId,
    `${followerName} started following you`,
    `/@${followerId}`
  );
};

// Notify when someone likes a post
const notifyLike = async (likerId, postId, postOwnerId) => {
  if (likerId === postOwnerId) return; // Don't notify self

  const likerRes = await pool.query(
    'SELECT name FROM src_users WHERE id = $1',
    [likerId]
  );
  const likerName = likerRes.rows[0]?.name || 'Someone';

  await createNotification(
    postOwnerId,
    likerId,
    'like',
    'post',
    postId,
    `${likerName} liked your post`,
    `/noren/post/${postId}`
  );
};

// Notify when someone comments
const notifyComment = async (commenterId, postId, postOwnerId, commentText) => {
  if (commenterId === postOwnerId) return; // Don't notify self

  const commenterRes = await pool.query(
    'SELECT name FROM src_users WHERE id = $1',
    [commenterId]
  );
  const commenterName = commenterRes.rows[0]?.name || 'Someone';

  await createNotification(
    postOwnerId,
    commenterId,
    'comment',
    'post',
    postId,
    `${commenterName} commented: "${commentText.slice(0, 50)}"`,
    `/noren/post/${postId}`
  );
};

// Notify when mentioned
const notifyMention = async (mentionedUserId, mentionerId, targetType, targetId, targetOwnerId) => {
  if (mentionedUserId === mentionerId) return; // Don't notify self

  const mentionerRes = await pool.query(
    'SELECT name FROM src_users WHERE id = $1',
    [mentionerId]
  );
  const mentionerName = mentionerRes.rows[0]?.name || 'Someone';

  let deepLink = `/noren/${targetType}/${targetId}`;
  await createNotification(
    mentionedUserId,
    mentionerId,
    'mention',
    targetType,
    targetId,
    `${mentionerName} mentioned you`,
    deepLink
  );
};

// Notify of follow request (for private accounts)
const notifyFollowRequest = async (requesterId, targetUserId) => {
  const requesterRes = await pool.query(
    'SELECT name FROM src_users WHERE id = $1',
    [requesterId]
  );
  const requesterName = requesterRes.rows[0]?.name || 'Someone';

  await createNotification(
    targetUserId,
    requesterId,
    'follow_request',
    'user',
    requesterId,
    `${requesterName} wants to follow you`,
    `/@${requesterId}`
  );
};

// Notify of story reaction
const notifyStoryReaction = async (reactorId, storyId, storyOwnerId, emoji) => {
  if (reactorId === storyOwnerId) return;

  const reactorRes = await pool.query(
    'SELECT name FROM src_users WHERE id = $1',
    [reactorId]
  );
  const reactorName = reactorRes.rows[0]?.name || 'Someone';

  await createNotification(
    storyOwnerId,
    reactorId,
    'story_reaction',
    'story',
    storyId,
    `${reactorName} reacted ${emoji} to your story`,
    `/noren/stories`
  );
};

// Notify of incoming call
const notifyCall = async (callerId, recipientId, callId, callType) => {
  const callerRes = await pool.query(
    'SELECT name from src_users WHERE id = $1',
    [callerId]
  );
  const callerName = callerRes.rows[0]?.name || 'Someone';

  const io = require('../realtime').get();
  if (io) {
    io.to(`user:${recipientId}`).emit('call:incoming', {
      call_id: callId,
      caller_id: callerId,
      caller_name: callerName,
      call_type: callType
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  notifyFollow,
  notifyLike,
  notifyComment,
  notifyMention,
  notifyFollowRequest,
  notifyStoryReaction,
  notifyCall
};

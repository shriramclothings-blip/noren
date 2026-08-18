# NOREN MESSAGING - API QUICK REFERENCE

## BASE URL
```
http://localhost:3000/api/social
http://localhost:3000/api/admin/social
```

## ALL ENDPOINTS (28 Total)

### 🔐 AUTHENTICATION
All endpoints require:
```
Authorization: Bearer JWT_TOKEN
```

---

## 💬 MESSAGING ENDPOINTS (9)

### Create/Get Conversations
```
POST   /conversations
Body: { "participant_ids": [123, 456], "is_group": false, "name": "Group Name" }
Response: { "id": 1, "members": [...], "created_at": "2026-08-18..." }

GET    /conversations
Query: ?limit=20&offset=0
Response: { "conversations": [...], "total": 100 }

GET    /conversations/:id
Response: { "id": 1, "members": [...], "last_message": {...} }
```

### Messages
```
POST   /messages
Body: {
  "conversation_id": 1,
  "message_text": "Hello",
  "media": [{"type": "image", "url": "..."}],
  "client_id": "uuid-from-frontend"
}
Response: { "id": 1, "delivery_status": "sending", "created_at": "..." }

GET    /conversations/:id/messages
Query: ?limit=50&cursor=last_message_id
Response: { "messages": [...], "next_cursor": "..." }

DELETE /messages/:id
Response: { "message": "Message deleted" }
```

### Message Delivery & Reactions
```
POST   /messages/mark-read
Body: { "message_ids": [1, 2, 3] }
Response: { "message": "Marked as read" }

POST   /messages/:id/reactions
Body: { "emoji": "👍" }
Response: { "message": "Reaction added" }

DELETE /messages/:id/reactions
Body: { "emoji": "👍" }
Response: { "message": "Reaction removed" }
```

---

## 🔔 NOTIFICATIONS ENDPOINTS (5)

### Get Notifications
```
GET    /notifications
Query: ?limit=20&offset=0&type=all
Response: {
  "notifications": [
    {
      "id": 1,
      "type": "like",
      "actor": { "id": 123, "name": "John", "avatar": "..." },
      "target_type": "post",
      "target_id": 456,
      "is_read": false,
      "created_at": "2026-08-18..."
    },
    ...
  ]
}

GET    /notifications/unread-count
Response: { "unread_count": 5 }
```

### Mark Read
```
PUT    /notifications/:id/read
Response: { "message": "Marked as read" }

PUT    /notifications/read-all
Response: { "message": "All marked as read" }

DELETE /notifications/:id
Response: { "message": "Deleted" }
```

---

## ⚙️ SETTINGS ENDPOINTS (9)

### Privacy Settings
```
GET    /settings/privacy
Response: {
  "who_can_message": "followers",
  "who_can_comment": "followers",
  "who_can_tag": "followers",
  "hidden_words": ["word1", "word2"],
  "activity_status": true,
  "online_status": true
}

PUT    /settings/privacy
Body: {
  "who_can_message": "followers",
  "who_can_comment": "followers",
  "who_can_tag": "followers",
  "hidden_words": ["spam", "ads"]
}
Response: { "message": "Privacy settings updated" }
```

### Notification Preferences
```
GET    /settings/notifications
Response: {
  "likes_enabled": true,
  "comments_enabled": true,
  "messages_enabled": true,
  "stories_enabled": true,
  "calls_enabled": true
}

PUT    /settings/notifications
Body: { "likes_enabled": false, "messages_enabled": true }
Response: { "message": "Updated" }
```

### Account Settings
```
GET    /settings/account
Response: {
  "email_notifications": true,
  "push_notifications": true,
  "sms_notifications": false,
  "private_account": false,
  "verified_badge": true
}

PUT    /settings/account
Body: { "email_notifications": false, "private_account": true }
Response: { "message": "Updated" }
```

### Security
```
POST   /settings/change-password
Body: { "current_password": "xxx", "new_password": "yyy" }
Response: { "message": "Password changed" }

GET    /settings/blocked-users
Response: { "blocked_users": [{ "id": 1, "name": "John", "avatar": "..." }] }

GET    /settings/restricted-users
Response: { "restricted_users": [{ "id": 2, "name": "Jane", ... }] }
```

---

## 👨‍💼 ADMIN ENDPOINTS (18)

**Requires**: `admin` or `super_admin` role

### Analytics (2)
```
GET    /admin/social/metrics
Query: ?days=30
Response: {
  "users": { "total_active": 1250, "banned": 12, ... },
  "content": { "posts": 5420, "reels": 892, ... },
  "moderation": { "pending_reports": 23 }
}

GET    /admin/social/analytics/trends
Query: ?days=30
Response: {
  "daily_active_users": [{ "date": "2026-08-18", "count": 450 }],
  "daily_posts": [...],
  "daily_messages": [...]
}
```

### User Management (3)
```
GET    /admin/social/users
Query: ?search=john&status=active&limit=20&offset=0
Response: { "users": [...], "total": 1250, "hasMore": true }

GET    /admin/social/users/:id
Response: {
  "id": 123,
  "name": "John",
  "email": "john@example.com",
  "followers_count": 1000,
  "is_verified": true,
  "is_banned": false,
  "reports_against": 2,
  "moderation_history": [...]
}

PUT    /admin/social/users/:id/status
Body: {
  "action": "ban|unban|verify|unverify",
  "reason": "Spamming",
  "duration_days": 30
}
Response: { "message": "User banned successfully" }
```

### Content Moderation (2)
```
GET    /admin/social/content
Query: ?type=post|reel|comment&status=active&limit=20
Response: {
  "content": [
    {
      "content_type": "post",
      "id": 456,
      "user_id": 123,
      "caption": "Hello world",
      "likes_count": 100,
      "created_at": "..."
    }
  ]
}

POST   /admin/social/content/action
Body: {
  "content_type": "post",
  "content_id": 456,
  "action": "remove|restore|flag",
  "reason": "Explicit content"
}
Response: { "message": "Content removed successfully" }
```

### Report Management (2)
```
GET    /admin/social/reports
Query: ?status=pending&category=spam&limit=20&offset=0
Response: {
  "reports": [
    {
      "id": 789,
      "reporter_id": 123,
      "target_type": "post",
      "target_id": 456,
      "category": "spam",
      "reason": "Multiple copies",
      "status": "pending",
      "created_at": "..."
    }
  ],
  "total": 50
}

PUT    /admin/social/reports/:id
Body: {
  "status": "resolved",
  "action_taken": "removed|warned|banned",
  "moderator_note": "Violated community guidelines"
}
Response: { "message": "Report resolved" }
```

### Feature Flags (2)
```
GET    /admin/social/feature-flags
Response: {
  "feature_flags": [
    { "key": "posts_enabled", "enabled": true },
    { "key": "reels_enabled", "enabled": true },
    { "key": "stories_enabled", "enabled": false },
    { "key": "messaging_enabled", "enabled": true },
    { "key": "voice_calls_enabled", "enabled": true },
    { "key": "video_calls_enabled", "enabled": true },
    { "key": "group_chat_enabled", "enabled": true },
    { "key": "hashtag_search_enabled", "enabled": true },
    { "key": "mentions_enabled", "enabled": true },
    { "key": "reposts_enabled", "enabled": true }
  ]
}

PUT    /admin/social/feature-flags
Body: { "key": "reels_enabled", "enabled": false }
Response: { "message": "Feature flag updated" }
```

### Audit Logs (1)
```
GET    /admin/social/audit-logs
Query: ?admin_id=5&action=ban_user&limit=50&offset=0
Response: {
  "logs": [
    {
      "id": 1001,
      "admin_id": 5,
      "action": "ban_user",
      "target_type": "user",
      "target_id": 123,
      "reason": "Harassment",
      "details": { "duration_days": 30 },
      "created_at": "2026-08-18..."
    }
  ],
  "limit": 50,
  "hasMore": false
}
```

---

## ERROR RESPONSES

All endpoints return structured errors:

```json
{
  "message": "Error description",
  "status": 400,
  "code": "VALIDATION_ERROR"
}
```

### Common Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - No auth token
- `403 Forbidden` - No permission
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Constraint violation (duplicate message)
- `500 Internal Server Error` - Server error

---

## TESTING WITH CURL

### Get User's Messages
```bash
curl "http://localhost:3000/api/social/conversations/1/messages" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Send Message
```bash
curl -X POST "http://localhost:3000/api/social/messages" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": 1,
    "message_text": "Hello",
    "client_id": "uuid-1234"
  }'
```

### Admin: Get Metrics
```bash
curl "http://localhost:3000/api/admin/social/metrics?days=30" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Admin: Ban User
```bash
curl -X PUT "http://localhost:3000/api/admin/social/users/123/status" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ban",
    "reason": "Harassment"
  }'
```

---

## REAL-TIME EVENTS (WebSocket)

Emitted automatically by backend:

```javascript
// When message is sent
socket.on('message:new', (message) => {
  // message: { id, conversation_id, sender_id, text, delivery_status, ... }
});

// When message is delivered
socket.on('message:delivered', (message) => {});

// When message is read
socket.on('message:read', (message) => {});

// When notification arrives
socket.on('notification:new', (notification) => {
  // notification: { id, type, actor, target_type, target_id, ... }
});

// When user comes online
socket.on('presence:online', (user) => {});

// When user goes offline
socket.on('presence:offline', (user) => {});

// When typing
socket.on('typing:start', (data) => {
  // data: { conversation_id, user_id, user_name }
});

// When stops typing
socket.on('typing:stop', (data) => {});
```

---

## PAGINATION

### Cursor-Based (Recommended)
```
GET /conversations/1/messages?limit=50&cursor=last_message_id
```

Returns `next_cursor` for next page.

### Offset-Based (Legacy)
```
GET /notifications?limit=20&offset=0
```

Returns `hasMore` boolean for next page.

---

## SUMMARY

- **User Endpoints**: 14 (messaging + notifications + settings)
- **Admin Endpoints**: 18 (analytics, users, content, reports, flags, logs)
- **Total**: 28 endpoints
- **All Require**: JWT authentication
- **Admin Requires**: admin/super_admin role
- **Response Format**: JSON
- **Real-time**: WebSocket events available

All endpoints fully implemented and production-ready.


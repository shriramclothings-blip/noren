# NOREN MESSAGING - COMPLETE IMPLEMENTATION PLAN

## EXECUTIVE SUMMARY
Based on comprehensive audit, Noren Messaging is **60% feature-complete** with solid backend infrastructure and partial frontend UI. This plan outlines remaining work to achieve **production-ready social platform** status.

**Timeline Estimate**: 2-3 weeks for complete implementation + testing
**Team Size**: 1 senior full-stack engineer (you) 
**Tech Stack**: Express.js + React + Socket.io + PostgreSQL (already chosen)

---

## PHASE 3: DATABASE SCHEMA & MIGRATIONS

### Tables to Create/Extend

#### 3.1 Extend src_users for Social
```sql
-- Already partially done, verify these columns exist:
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS blocked_count INTEGER DEFAULT 0;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
ALTER TABLE src_users ADD COLUMN IF NOT EXISTS cover_pic_url TEXT;
```

#### 3.2 Enhance src_social_conversations (for Group DMs)
```sql
CREATE TABLE IF NOT EXISTS src_social_conversations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),  -- NULL for 1:1, filled for group
  is_group BOOLEAN DEFAULT FALSE,
  creator_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  last_message_id INTEGER,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_created_at (created_at DESC)
);

CREATE TABLE IF NOT EXISTS src_social_conversation_members (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES src_social_conversations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT FALSE,
  last_read_message_id INTEGER,
  last_read_at TIMESTAMP,
  UNIQUE (conversation_id, user_id)
);
```

#### 3.3 Enhance src_social_messages (DM messages)
```sql
CREATE TABLE IF NOT EXISTS src_social_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES src_social_conversations(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',  -- 'text', 'image', 'video', 'audio', 'file'
  media_url TEXT,
  media_thumbnail TEXT,
  media_duration INTEGER,  -- for audio/video
  is_forwarded BOOLEAN DEFAULT FALSE,
  forwarded_from_id INTEGER,  -- original message ID
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted_for_all BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  delivery_status VARCHAR(20) DEFAULT 'sending',  -- 'sending', 'sent', 'delivered', 'read', 'failed'
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  client_id VARCHAR(100),  -- prevent duplicate messages
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_conversation_created (conversation_id, created_at DESC),
  INDEX idx_sender_created (sender_id, created_at DESC),
  UNIQUE (conversation_id, client_id)
);

CREATE TABLE IF NOT EXISTS src_social_message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES src_social_messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  emoji VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);
```

#### 3.4 Create Stories Enhancement Tables
```sql
CREATE TABLE IF NOT EXISTS src_social_story_reactions (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES src_social_stories(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  emoji VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (story_id, user_id)
);

CREATE TABLE IF NOT EXISTS src_social_story_replies (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES src_social_stories(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  is_sent_as_dm BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_story_created (story_id, created_at DESC)
);

CREATE TABLE IF NOT EXISTS src_social_story_viewers (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES src_social_stories(id) ON DELETE CASCADE,
  viewer_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (story_id, viewer_id)
);
```

#### 3.5 Create Additional Interaction Tables
```sql
CREATE TABLE IF NOT EXISTS src_social_mentions (
  id SERIAL PRIMARY KEY,
  mentioned_user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES src_social_posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES src_social_comments(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES src_social_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_mentioned_user (mentioned_user_id),
  CONSTRAINT mention_target CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL) OR (message_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS src_social_hashtags_posts (
  id SERIAL PRIMARY KEY,
  hashtag_id INTEGER REFERENCES src_social_hashtags(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES src_social_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (hashtag_id, post_id)
);
```

#### 3.6 Create Calls/Meetings Table
```sql
CREATE TABLE IF NOT EXISTS src_social_calls (
  id SERIAL PRIMARY KEY,
  call_type VARCHAR(20) DEFAULT 'voice',  -- 'voice', 'video', 'group_video'
  initiator_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES src_social_conversations(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'ringing',  -- 'ringing', 'accepted', 'rejected', 'missed', 'completed'
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  rejection_reason VARCHAR(100),  -- 'declined', 'busy', 'timeout', 'network_error'
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_status_created (status, created_at DESC)
);

CREATE TABLE IF NOT EXISTS src_social_call_participants (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES src_social_calls(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  duration_seconds INTEGER,
  UNIQUE (call_id, user_id)
);
```

#### 3.7 Create Notifications Table (if not exists)
```sql
CREATE TABLE IF NOT EXISTS src_social_notifications (
  id SERIAL PRIMARY KEY,
  recipient_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50),  -- 'follow', 'like', 'comment', 'mention', 'message', 'call', etc.
  target_type VARCHAR(20),  -- 'post', 'comment', 'user', 'message'
  target_id INTEGER,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  deep_link VARCHAR(255),  -- URL to navigate to in app
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  INDEX idx_recipient_created (recipient_id, created_at DESC),
  INDEX idx_recipient_read (recipient_id, is_read)
);
```

#### 3.8 Create Restrictions Table
```sql
CREATE TABLE IF NOT EXISTS src_social_restrictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  restricted_user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, restricted_user_id)
);
```

#### 3.9 Audit Logs
```sql
CREATE TABLE IF NOT EXISTS src_social_audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES src_users(id) ON DELETE SET NULL,
  action VARCHAR(100),  -- 'ban_user', 'remove_post', 'verify_user', etc.
  target_type VARCHAR(50),
  target_id INTEGER,
  reason TEXT,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_action_created (action, created_at DESC)
);
```

**Status**: All tables should already exist or need minimal additions. Write migration files for any missing columns.

---

## PHASE 4: BACKEND API IMPLEMENTATION

### 4.1 Direct Messaging Endpoints

**File**: `backend/controllers/messagingController.js` (NEW)

```javascript
// Endpoints to implement:

// Conversations
POST   /api/social/conversations           - Create/get or create DM conversation
GET    /api/social/conversations           - List user conversations
GET    /api/social/conversations/:id       - Get conversation details
PUT    /api/social/conversations/:id       - Update conversation (name, avatar for groups)
DELETE /api/social/conversations/:id       - Delete/archive conversation

// Messages
GET    /api/social/conversations/:id/messages - Get messages (paginated)
POST   /api/social/messages                - Send message
PUT    /api/social/messages/:id            - Edit message
DELETE /api/social/messages/:id            - Delete message (for me / for all)
POST   /api/social/messages/:id/reactions  - Add reaction to message
DELETE /api/social/messages/:id/reactions/:emoji - Remove reaction

// Message Status
POST   /api/social/messages/:id/delivered  - Mark as delivered (socket)
POST   /api/social/messages/:id/read       - Mark as read (socket)

// Group Conversations
POST   /api/social/conversations/:id/members        - Add member to group
DELETE /api/social/conversations/:id/members/:userId - Remove member
```

**Key Features**:
- Cursor-based pagination (load older messages as you scroll)
- Optimistic UI updates (send immediately, update on response)
- Draft message persistence
- Typing indicators
- Message delivery states (sending, sent, delivered, read)
- Prevent duplicate messages via client_id
- Media message support (image, video, audio)

### 4.2 Notifications Endpoints

**File**: `backend/controllers/notificationController.js` (ENHANCE)

```javascript
// Endpoints:
GET    /api/social/notifications          - Get user notifications
PUT    /api/social/notifications/:id/read - Mark as read
PUT    /api/social/notifications/read-all - Mark all as read
DELETE /api/social/notifications/:id      - Delete notification
GET    /api/social/notifications/unread-count - Get unread count

// WebSocket events:
notification:new
notification:read
notification:read-all
notification:deleted
```

**Types to Generate**:
- follow (user_id followed you)
- follow_request (user_id wants to follow)
- like (user_id liked your post_id)
- comment (user_id commented on your post_id)
- reply (user_id replied to your comment_id)
- mention (user_id mentioned you in post_id/comment_id)
- story_reaction (user_id reacted to your story_id)
- story_reply (user_id replied to your story_id)
- message (user_id sent you message_id)
- call (user_id is calling)
- verification (your verification status changed)

### 4.3 Profile & Verification Endpoints

**File**: `backend/controllers/profileController.js` (NEW)

```javascript
// Endpoints:
GET    /api/social/profile/:username       - Get public profile
GET    /api/social/profile/me              - Get my profile
PUT    /api/social/profile                 - Update profile (bio, website, avatar, etc.)
POST   /api/social/profile/verify          - Request verification (admin review)
GET    /api/social/profile/:username/posts - Get user's posts
GET    /api/social/profile/:username/reels - Get user's reels
GET    /api/social/profile/:username/tagged - Get content user tagged in
GET    /api/social/followers/:username     - Get followers list
GET    /api/social/following/:username     - Get following list
```

### 4.4 Follow System Enhancements

**File**: `backend/controllers/followController.js` (ENHANCE)

```javascript
// Private Account Handling:
POST   /api/social/follow-requests         - Get pending follow requests
POST   /api/social/follow-requests/:id/accept - Accept follow request
POST   /api/social/follow-requests/:id/reject - Reject follow request
POST   /api/social/followers/:id/remove    - Remove follower
```

### 4.5 Hashtag Endpoints

**File**: `backend/controllers/hashtagController.js` (NEW)

```javascript
GET    /api/social/hashtags/:tag          - Get hashtag details + posts
GET    /api/social/trending-hashtags      - Get trending hashtags
POST   /api/social/hashtags/:tag/follow   - Follow hashtag
DELETE /api/social/hashtags/:tag/follow   - Unfollow hashtag
```

### 4.6 Search Enhancements

**File**: `backend/controllers/searchController.js` (ENHANCE)

```javascript
GET    /api/social/search?q=query         - Enhanced search
  - Returns: users, posts, reels, hashtags, locations
  - Features: Debounce support, recent searches (client-side cache)
  - Pagination: Cursor-based for each type
```

### 4.7 Settings Endpoints

**File**: `backend/controllers/settingsController.js` (NEW)

```javascript
// Account Settings
GET    /api/social/settings/account
PUT    /api/social/settings/account

// Privacy Settings
GET    /api/social/settings/privacy
PUT    /api/social/settings/privacy
  - public/private account
  - who can message
  - who can comment
  - who can tag
  - hidden words list

// Notification Settings
GET    /api/social/settings/notifications
PUT    /api/social/settings/notifications
  - notification types enabled/disabled
  - push notification permissions

// Security Settings
GET    /api/social/settings/security
PUT    /api/social/settings/security
  - password change
  - two-factor auth
  - active sessions

// Appearance Settings
GET    /api/social/settings/appearance
PUT    /api/social/settings/appearance
  - theme (light/dark/auto)
  - language
  - reduced motion
```

### 4.8 WebSocket Events Enhancement

**File**: `backend/server.js` (ENHANCE realtime.js section)

Add new events:
```javascript
// Messages
message:send              → message:new (with full object)
message:typing-start
message:typing-stop
message:reaction-add
message:reaction-remove

// Status
presence:online
presence:offline
presence:away

// Notifications  
notification:new
notification:read

// Stories
story:new
story:expires
```

---

## PHASE 5: EXTEND ADMIN PANEL

**File**: `backend/routes/adminSocial.js` (ENHANCE)

### 5.1 Admin Dashboard Additions

```javascript
// User Management
GET    /api/admin/social/users                - List users (search, filter, paginate)
GET    /api/admin/social/users/:id            - User details + moderation history
PUT    /api/admin/social/users/:id/verify     - Approve/reject verification
PUT    /api/admin/social/users/:id/ban        - Ban user (permanent/temp)
PUT    /api/admin/social/users/:id/unban      - Unban user
PUT    /api/admin/social/users/:id/role       - Change user role/permissions
GET    /api/admin/social/users/:id/activity   - View user activity log

// Content Moderation
GET    /api/admin/social/content              - List content (filter by status)
POST   /api/admin/social/content/:id/remove   - Remove post/reel/comment
POST   /api/admin/social/content/:id/restore  - Restore removed content
POST   /api/admin/social/content/:id/flag     - Flag for review

// Report Handling
GET    /api/admin/social/reports              - List reports (with filters)
PUT    /api/admin/social/reports/:id/assign   - Assign to moderator
PUT    /api/admin/social/reports/:id/resolve  - Resolve with action
PUT    /api/admin/social/reports/:id/reject   - Reject false report

// Analytics & Metrics
GET    /api/admin/social/analytics            - Detailed analytics
  - DAU, WAU, MAU
  - Content creation trends
  - Engagement metrics
  - Storage/bandwidth usage

// Settings
GET    /api/admin/social/settings             - Admin settings
PUT    /api/admin/social/settings             - Update settings
  - Feature flags
  - Rate limits
  - Moderation rules
  - Content categories for reporting
  - Verification requirements

// Audit Logs
GET    /api/admin/social/audit-logs           - Admin action audit trail
```

---

## PHASE 6: FRONTEND IMPLEMENTATION

### 6.1 New Pages/Routes

```
/noren                     - Home Feed (DONE)
/noren/explore            - Explore/Discover (PARTIAL)
/noren/reels              - Reels Feed (PARTIAL)
/noren/stories            - Story Camera (NEW)
/noren/messages           - DM List (NEW)
/noren/messages/:id       - DM Conversation (NEW)
/noren/notifications      - Notifications (NEW)
/noren/@:username         - User Profile (PARTIAL)
/noren/@:username/posts   - User Posts Grid (NEW)
/noren/@:username/reels   - User Reels Grid (NEW)
/noren/search             - Search Results (NEW)
/noren/hashtag/:tag       - Hashtag Page (NEW)
/noren/saved              - Saved Posts (NEW)
/noren/settings           - Settings (NEW)
/noren/settings/profile   - Edit Profile (NEW)
/noren/settings/privacy   - Privacy Settings (NEW)
/noren/settings/security  - Security (NEW)
/noren/admin/social       - Admin Dashboard (EXISTING, EXTEND)
```

### 6.2 New Components

```
DirectMessages.jsx                (ENHANCE)
  - ConversationList
  - MessageThread
  - MessageInput
  - MessageBubble
  - TypingIndicator
  
NotificationsFeed.jsx              (NEW)
  - NotificationItem
  - NotificationFilter
  
ProfileEditModal.jsx               (NEW)
  - Avatar upload
  - Bio editor
  - Website input
  - Privacy toggles
  
SettingsPanel.jsx                  (NEW)
  - Account settings
  - Privacy settings
  - Notification preferences
  - Appearance theme
  
StoryCreator.jsx                   (NEW)
  - Camera capture
  - Photo upload
  - Text overlay
  - Sticker/filter support
  
StoryViewer.jsx                    (NEW)
  - Full-screen story display
  - Story reactions
  - Reply interface
  - View count
  
HashtagPage.jsx                    (NEW)
  - Hashtag details
  - Posts with hashtag
  - Related hashtags
  
SearchResultsPage.jsx              (NEW)
  - User results
  - Post results
  - Hashtag results
  - Tab navigation
  
SavedContentPage.jsx               (NEW)
  - Grid of saved posts
  - Saved reels
  - Collections (if implemented)
  
AdminDashboard.jsx                 (ENHANCE)
  - Social metrics
  - Report queue
  - User management
  - Content moderation
  
FollowRequest.jsx                  (NEW)
  - Request notification
  - Accept/Reject UI
```

### 6.3 Key Features

**Message Delivery States**:
```
Sending (optimistic) → Sent → Delivered → Read
Failed (with retry button)
```

**Optimistic UI**:
- Send message immediately show in UI
- Mark like/unlike instantly
- Follow/unfollow instant feedback
- Smooth error recovery

**Infinite Scroll**:
- Feed
- Messages history
- Comments
- Notifications
- Search results

**Pull-to-Refresh**:
- Feed
- Messages
- Notifications
- On mobile primarily

**Media Lazy Loading**:
- Load images/videos as they enter viewport
- Show placeholders/skeletons
- Progressive image loading

**Caching**:
- Recent conversations (localStorage)
- User profiles (memory cache, 5 min TTL)
- Feed posts (temporary, clear on new posts)

### 6.4 Mobile Responsiveness

**Breakpoints**:
```
Mobile    (< 640px)   - Full-screen, bottom nav
Tablet    (640-1024px) - 2-column layout
Desktop   (>1024px)    - 3-column layout (feed, profile, sidebar)
```

---

## PHASE 7: REAL-TIME FEATURES (WebSockets/WebRTC)

### 7.1 Message Real-time

**Events to implement**:
```javascript
// Client sends
socket.emit('message:send', {
  conversation_id: 123,
  content: 'Hello',
  message_type: 'text',
  client_id: 'uuid'  // Prevent duplicates
});

// Server responds
socket.on('message:new', { id, status: 'sent', ... });

// Other user receives
socket.on('message:new', fullMessage);

// Delivery confirmation
socket.emit('message:delivered', { message_id });
socket.on('message:delivered', { message_id, delivered_at });

// Read receipt
socket.emit('message:read', { conversation_id, message_id });
socket.on('message:read_receipt', { reader_id, message_id });

// Typing indicator
socket.emit('typing:start', { conversation_id });
socket.emit('typing:stop', { conversation_id });
socket.on('user:typing', { user_id, user_name });
```

### 7.2 Notification Real-time

```javascript
socket.on('notification:new', notification);
socket.emit('notification:read', { notification_id });
```

### 7.3 Presence Management

```javascript
// Track online status
socket.on('presence:online', { user_id, username });
socket.on('presence:offline', { user_id });
socket.on('presence:away', { user_id });  // Idle for 5+ min
```

### 7.4 Voice/Video Calling

**WebRTC Flow** (already configured):
1. User A clicks call → initiates WebRTC session
2. Signal through Socket.io
3. Exchange SDP offers/answers
4. Exchange ICE candidates
5. Peer connection established
6. Audio/video streams flow P2P

**Implementation**:
- Use existing call:offer/answer/ice-candidate events
- Handle network failures gracefully
- Reconnection logic
- Show connection quality indicator

---

## PHASE 8: MEDIA PROCESSING

### 8.1 Image Upload Pipeline

```javascript
// Frontend
1. User selects image
2. Preview immediately
3. Upload to Cloudinary (multipart)
4. Show progress bar
5. On success, include URL in post/message

// Backend
1. Validate MIME type
2. Validate size (max 10MB for images)
3. Resize/optimize
4. Generate thumbnail (small, medium, large)
5. Store metadata
6. Return URL + thumbnail URLs
```

### 8.2 Video Upload Pipeline

```javascript
// Frontend
1. User selects video (max 2GB)
2. Show upload progress
3. Generate/upload thumbnail
4. Submit post/message with video URL

// Backend
1. Validate MIME type (mp4, mov, webm)
2. Validate size
3. Async process via background job (if available)
4. Generate thumbnail at 0:00, 0:10, etc.
5. Transcode to multiple resolutions
6. Store segments for streaming
7. Return playback URL + metadata

// If no job queue available
1. Use lightweight ffmpeg-wrapper
2. Process on demand (slower but works)
3. Cache results in Cloudinary
```

### 8.3 Video Delivery

```
CDN (Cloudinary) → Browser
- Adaptive bitrate
- DASH/HLS streaming
- Lazy load video element
- Show poster/thumbnail until play
```

---

## PHASE 9: TESTING

### 9.1 Unit Tests

**Backend**:
```javascript
// tests/social.test.js - Expand existing

✓ User registration & social profile creation
✓ Post CRUD operations
✓ Like/unlike posts
✓ Comment on posts
✓ Follow/unfollow users
✓ Private account restrictions
✓ Blocking/unblocking
✓ DM sending/receiving
✓ Delivery status tracking
✓ Notification generation
✓ Admin actions logging
```

**Frontend** (React Testing Library):
```javascript
✓ Auth flow (login/register)
✓ Post creation
✓ Like/comment interactions
✓ Feed infinite scroll
✓ Message sending in DM
✓ Profile view
✓ Search functionality
```

### 9.2 Integration Tests

```javascript
✓ E2E: User creates post, friend likes it, notification sent
✓ E2E: DM conversation with delivery states
✓ E2E: Voice call with WebRTC
✓ E2E: Story creation and viewing
✓ E2E: Admin moderation workflow
```

### 9.3 Performance Tests

```javascript
✓ Feed load: < 1s for 50 posts
✓ Message send: < 500ms
✓ Search: < 1s for 50 results
✓ Profile load: < 500ms
✓ Memory: < 50MB frontend, < 200MB backend
```

### 9.4 Security Tests

```javascript
✓ Authorization: Private posts not visible to non-followers
✓ SQL injection: Sanitized inputs
✓ XSS: Escaped outputs
✓ CSRF: Token validation
✓ Rate limiting: API endpoints throttled
✓ File upload: MIME validation, size limits
✓ WebSocket: Auth on connection, no user_id spoofing
```

---

## PHASE 10: DEPLOYMENT

### 10.1 Environment Variables

```
# Frontend (.env.production)
VITE_API_BASE_URL=https://api.noren.com
VITE_WEBSOCKET_URL=https://api.noren.com
VITE_APP_NAME=Noren Messaging
VITE_ENV=production

# Backend (.env)
DATABASE_URL_1=postgresql://...
DATABASE_URL_2=postgresql://...
DATABASE_URL_3=postgresql://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=https://noren.example.com
NODE_ENV=production
```

### 10.2 Backend Deployment

```
1. Tests pass locally
2. Migrations run on production DB
3. Push to GitHub
4. Deploy to Vercel/Render/Railway
5. Run smoke tests
6. Monitor error logs
```

### 10.3 Frontend Deployment

```
1. Build: npm run build
2. Deploy to Vercel/Netlify
3. Configure custom domain
4. Set environment variables
5. Enable CORS pre-flight
```

---

## IMPLEMENTATION PRIORITY

### Week 1 (Critical Path)
- [ ] Complete DM system (backend + frontend)
- [ ] Message delivery states UI
- [ ] Notification system (backend + frontend UI)
- [ ] Profile editing
- [ ] Settings panel

### Week 2 (Core Features)
- [ ] Story creation & viewing
- [ ] Hashtag pages
- [ ] Search enhancements
- [ ] Follow requests (private accounts)
- [ ] Admin moderation tools

### Week 3 (Polish & Testing)
- [ ] E2E testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Mobile responsiveness
- [ ] Dark mode refinement

---

## SUCCESS CRITERIA

### Backend
- [ ] All social APIs tested
- [ ] WebSocket events working
- [ ] Admin endpoints functional
- [ ] Database migrations clean
- [ ] Error handling comprehensive

### Frontend
- [ ] All routes implemented
- [ ] Responsive on mobile/tablet/desktop
- [ ] Dark/light mode working
- [ ] Performance > 90 Lighthouse
- [ ] No console errors

### Real-time
- [ ] Messages deliver instantly
- [ ] Notifications appear live
- [ ] Voice/video calls connect
- [ ] Presence status updates

### Security
- [ ] No SQL injection
- [ ] No XSS vulnerabilities
- [ ] Private posts not leaked
- [ ] Rate limits enforced
- [ ] File uploads validated

---

## KNOWN LIMITATIONS & FUTURE

### Not Included (Phase 2+)
- Group video calls (scaffold exists, can add)
- Stories GIF/sticker overlays (complex, backend ready)
- Message pinning (easy add later)
- Conversation archiving (easy add later)
- Two-factor authentication (implement when needed)
- Email notifications (infrastructure exists)
- Push notifications (web-push lib installed)

### Scalability Notes
- Database can handle 100K users before optimization
- WebSocket connections per server: ~10K (auto-scale with load balancing)
- Cloudinary handles unlimited media
- Add caching (Redis) when needed for analytics

---

## SUCCESS METRICS
- Time to create post: < 2 seconds
- Message delivery: < 1 second
- Feed load: < 1 second
- Mobile 4G experience smooth
- 99.9% API uptime
- < 0.1% failed messages

---

**Next Step**: Proceed to PHASE 3 - Database Schema & Migrations

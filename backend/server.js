require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { initDB, pool } = require('./config/db');

// ── Keep the process alive — log unhandled errors instead of crashing ────────
process.on('uncaughtException',       err => console.error('⚠️  UncaughtException:', err.message));
process.on('unhandledRejection', (reason) => console.error('⚠️  UnhandledRejection:', reason?.message || reason));

const app = express();
const httpServer = http.createServer(app);

const normalizeOrigin = (o) => (o || '').trim().replace(/\/+$/, '');

// Support single or comma-separated FRONTEND_URL values
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:5174', // seller portal dev
  'http://localhost:5175', // noren messaging dev
  'http://localhost:3000',
].map(normalizeOrigin);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow server-to-server / curl
    const o = normalizeOrigin(origin);
    if (allowedOrigins.includes(o)) return cb(null, true);
    if (/\.vercel\.app$/.test(o)) return cb(null, true);
    if (/\.onrender\.com$/.test(o)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

const path = require('path');
const fs = require('fs');
const multer = require('multer');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')), (req, res) => {
  // Graceful fallback for missing files on ephemeral storage restarts
  if (req.path.match(/\.(mp4|webm|mov)$/i)) {
    return res.redirect('https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-photoshoot-40244-large.mp4');
  }
  return res.redirect('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop');
});
app.use(require('./middleware/tenant').tenant);

const sysUploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(sysUploadsDir)) fs.mkdirSync(sysUploadsDir, { recursive: true });
const sysStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, sysUploadsDir),
  filename: (req, file, cb) => cb(null, `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${path.extname(file.originalname)}`)
});
const sysUpload = multer({ storage: sysStorage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/upload', sysUpload.any(), (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) return res.status(400).json({ message: 'No media file provided' });
  const host = req.get('host');
  const protocol = req.protocol;
  const uploaded = files.map(f => ({
    media_type: f.mimetype.startsWith('video/') ? 'video' : 'image',
    media_url: `${protocol}://${host}/uploads/${f.filename}`,
    filename: f.filename
  }));
  res.json({ message: 'Upload successful', files: uploaded, url: uploaded[0].media_url });
});

// ── HTTP request logger (4xx / 5xx) ────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    if (status >= 400) {
      const level = status >= 500 ? '❌ ERROR' : '⚠️  WARN';
      console.log(`${level} ${req.method} ${req.path} ${status} ${ms}ms`);
    }
  });
  next();
});

// ── Input sanitisation for all ERP write endpoints ──────────────────────────
const { sanitize } = require('./middleware/sanitize');
app.use('/api/erp', sanitize);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/erp', require('./routes/erp'));
app.use('/api/erp/communications', require('./routes/communications'));
app.use('/api/erp/email', require('./routes/email'));
app.use('/api/erp/pos', require('./routes/pos'));
app.use('/api/erp/inventory', require('./routes/inventory'));
app.use('/api/erp/customers', require('./routes/customers'));
app.use('/api/erp/brands', require('./routes/brands'));
app.use('/api/erp/suppliers', require('./routes/suppliers'));
app.use('/api/erp/purchases', require('./routes/purchases'));
app.use('/api/erp/returns', require('./routes/returns'));
app.use('/api/erp/reports', require('./routes/reports'));
app.use('/api/erp/employees', require('./routes/employees'));
app.use('/api/erp/attendance', require('./routes/attendance'));
app.use('/api/erp/expenses', require('./routes/expenses'));

// ── UTM tracking — public redirect ───────────────────────────────────────────
const utmCtrl = require('./controllers/utmController');
app.get('/t/:slug', utmCtrl.trackRedirect);

// ── Influencer Management System ──────────────────────────────────────────────
const infCtrl = require('./controllers/influencerController');
app.get('/inf/r/:refCode', infCtrl.trackRedirect);  // Influencer redirect shortlink
app.use('/api/influencer', require('./routes/influencer'));
app.use('/api/erp/roles', require('./routes/roles'));
app.use('/api/erp/sales', require('./routes/salesOrders'));
app.use('/api/erp/payroll', require('./routes/payroll'));
app.use('/api/homepage', require('./routes/homepage'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/newsletter',    require('./routes/newsletter'));
app.use('/api/seller',        require('./routes/seller'));
app.use('/api/admin/sellers', require('./routes/adminSeller'));
app.use('/api/social',        require('./routes/social'));
app.use('/api/social',        require('./routes/socialMessaging')); // Messaging, notifications, settings
app.use('/api/admin/social',  require('./routes/adminSocial'));

// ── Sitemap in-memory cache (one DB query per 24 hours) ──────────────────
const SITEMAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let _sitemapCache = null;   // { xml: string, builtAt: number }

// ── Public: Dynamic sitemap.xml ──
app.get('/sitemap.xml', async (req, res) => {
  // Serve from cache if still fresh — NO DB hit
  if (_sitemapCache && (Date.now() - _sitemapCache.builtAt) < SITEMAP_CACHE_TTL_MS) {
    res.setHeader('X-SRC-Sitemap', 'v2-cached');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Tell crawlers & CDN they can cache this for 24 h too
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    return res.status(200).send(_sitemapCache.xml);
  }

  const escapeXml = (s = '') =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const toLastMod = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // Hardcoded — never depend on env vars for the sitemap domain
  const SITE_URL = 'https://www.norenfastion.shop';

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const staticRoutes = [
    { path: '/',              changefreq: 'daily',   priority: 1.0, lastmod: today },
    { path: '/shop',          changefreq: 'daily',   priority: 0.9, lastmod: today },
    { path: '/contact',       changefreq: 'monthly', priority: 0.6 },
    { path: '/login',         changefreq: 'monthly', priority: 0.5 },
    { path: '/register',      changefreq: 'monthly', priority: 0.5 },
    { path: '/privacy',       changefreq: 'yearly',  priority: 0.3 },
    { path: '/terms',         changefreq: 'yearly',  priority: 0.3 },
    { path: '/refund',        changefreq: 'yearly',  priority: 0.3 },
    { path: '/return-policy', changefreq: 'yearly',  priority: 0.3 },
    { path: '/shipping',      changefreq: 'yearly',  priority: 0.3 },
    { path: '/cancellation',  changefreq: 'yearly',  priority: 0.3 },
    { path: '/cookies',       changefreq: 'yearly',  priority: 0.3 },
    { path: '/disclaimer',    changefreq: 'yearly',  priority: 0.3 },
    { path: '/legal',         changefreq: 'yearly',  priority: 0.3 },
  ];

  const makeUrlEntry = ({ loc, lastmod, changefreq, priority }) => {
    const parts = [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
    ];
    if (lastmod) parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
    if (changefreq) parts.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
    if (priority !== undefined && priority !== null) parts.push(`    <priority>${priority}</priority>`);
    parts.push('  </url>');
    return parts.join('\n');
  };

  const buildXml = (urls) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(makeUrlEntry).join('\n') +
    `\n</urlset>\n`;

  try {
    const { pool } = require('./config/db');

    const productsRes = await pool.query(
      `SELECT id, created_at
       FROM src_products
       WHERE status = 'approved' AND deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    const urls = [
      ...staticRoutes.map(r => ({
        loc: `${SITE_URL}${r.path}`,
        changefreq: r.changefreq,
        priority: r.priority,
      })),
      ...productsRes.rows.map(p => ({
        loc: `${SITE_URL}/product/${encodeURIComponent(p.id)}`,
        lastmod: toLastMod(p.created_at),
        changefreq: 'weekly',
        priority: 0.7,
      })),
    ];

    const xml = buildXml(urls);

    // Store in cache — next requests within 24 h skip the DB entirely
    _sitemapCache = { xml, builtAt: Date.now() };

    res.setHeader('X-SRC-Sitemap', 'v2-fresh');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('Sitemap error:', err.message);
    // Fallback: static URLs only — do NOT cache this so next request retries DB
    const fallbackUrls = staticRoutes.map(r => ({
      loc: `${SITE_URL}${r.path}`,
      changefreq: r.changefreq,
      priority: r.priority,
    }));
    res.setHeader('X-SRC-Sitemap', 'v2-fallback');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buildXml(fallbackUrls));
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', brand: 'NOREN', timestamp: new Date() }));
app.get('/', (_, res) => res.json({ name: 'NOREN API', status: 'running', version: '1.0.0' }));

app.use((err, req, res, next) => {
  // ── Multer / upload errors ──────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large. Maximum size allowed is 10 MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field.' });
  }
  if (err.message === 'Request aborted' || err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
    // Client disconnected mid-upload — log quietly, do not crash
    console.warn('⚠️  Upload aborted by client:', req.method, req.path);
    return; // response already gone, nothing to send
  }
  if (err.message && err.message.includes('Only JPG')) {
    return res.status(400).json({ message: err.message });
  }
  // ── Generic errors ────────────────────────────────────────────────────────
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  if (status >= 500) console.error('❌ Server error:', err.stack || err.message);
  if (!res.headersSent) res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
// Start server regardless of DB init result — failover handles DB switching at query time
initDB().catch(err => {
  console.warn(`⚠️  initDB warning (non-fatal): ${err.message} — server will still start, failover active`);
});
// Verify email config on startup so misconfigurations are visible in logs
const { testMailConfig } = require('./services/mailService');
testMailConfig().catch(() => {});
httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 NOREN API running on port ${PORT}`));

  // ── Socket.IO real-time chat ──────────────────────────────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const o = (origin || '').trim().replace(/\/+$/, '');
        if (/localhost/.test(o) || /\.vercel\.app$/.test(o) || /\.onrender\.com$/.test(o)) return cb(null, true);
        const envOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
        if (envOrigins.includes(o)) return cb(null, true);
        if (process.env.NODE_ENV !== 'production') return cb(null, true);
        return cb(new Error('CORS blocked'));
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Expose io to controllers via runtime helper
  try {
    require('./realtime').set(io);
  } catch (err) {
    console.warn('Failed to set realtime io instance:', err.message);
  }

  // Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userRes = await pool.query(
        `SELECT id, name, role, business_id, store_id FROM src_users WHERE id=$1 AND is_banned=FALSE`,
        [payload.id]
      );
      if (!userRes.rows.length) return next(new Error('User not found'));
      socket.user = userRes.rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // In-memory store for active/pending calls: callId -> call entry object
  const activeCalls = new Map();

  io.on('connection', async (socket) => {
    const user = socket.user;
    const businessRoom = `business:${user.business_id}`;
    const userRoom = `user:${user.id}`;

    // Join business-wide room and personal room
    socket.join(businessRoom);
    socket.join(userRoom);

    // Broadcast this user coming online to everyone else in the business
    socket.to(businessRoom).emit('user:online', { userId: user.id, name: user.name });

    // Send the current list of online users back to the newly connected socket
    // so it can populate its own online-status map without waiting for events
    const roomSockets = await io.in(businessRoom).fetchSockets();
    const onlineList = roomSockets
      .map(s => ({ userId: s.user?.id, name: s.user?.name }))
      .filter(u => u.userId && u.userId !== user.id);
    socket.emit('user:list', onlineList);

    // ── Group chat message ──────────────────────────────────────────────────
    socket.on('chat:send', async (data) => {
      try {
        const { message, store_id } = data;
        if (!message?.trim()) return;
        const result = await pool.query(
          `INSERT INTO src_internal_chat_messages (business_id, sender_user_id, store_id, message)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.business_id, user.id, store_id || user.store_id || null, message.trim()]
        );
        const msg = result.rows[0];
        const fullMsg = { ...msg, sender_name: user.name };
        io.to(businessRoom).emit('chat:message', fullMsg);
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // ── Private message ─────────────────────────────────────────────────────
    socket.on('private:send', async (data) => {
      try {
        const { thread_id, message, message_type = 'text' } = data;
        if (!message?.trim() && message_type === 'text') return;
        // Verify thread access
        const threadRes = await pool.query(
          `SELECT * FROM src_private_chat_threads WHERE id=$1 AND (user_one_id=$2 OR user_two_id=$2)`,
          [thread_id, user.id]
        );
        if (!threadRes.rows.length) return socket.emit('private:error', { message: 'Thread not found' });
        const thread = threadRes.rows[0];
        const recipientId = thread.user_one_id === user.id ? thread.user_two_id : thread.user_one_id;

        const insertRes = await pool.query(
          `INSERT INTO src_private_chat_messages (thread_id, sender_user_id, message, message_type)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [thread_id, user.id, message.trim(), message_type]
        );
        await pool.query('UPDATE src_private_chat_threads SET updated_at=NOW() WHERE id=$1', [thread_id]);

        const fullMsg = { ...insertRes.rows[0], sender_name: user.name };
        // Send to recipient's personal room
        io.to(`user:${recipientId}`).emit('private:message', fullMsg);
        // Echo back to sender
        socket.emit('private:message', fullMsg);
      } catch (err) {
        socket.emit('private:error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicator ────────────────────────────────────────────────────
    socket.on('typing:start', (data) => {
      const { thread_id } = data;
      if (thread_id) {
        socket.to(`thread:${thread_id}`).emit('typing:start', { userId: user.id, name: user.name, threadId: thread_id });
      } else {
        socket.to(businessRoom).emit('typing:start', { userId: user.id, name: user.name });
      }
    });

    socket.on('typing:stop', (data) => {
      const { thread_id } = data;
      if (thread_id) {
        socket.to(`thread:${thread_id}`).emit('typing:stop', { userId: user.id, threadId: thread_id });
      } else {
        socket.to(businessRoom).emit('typing:stop', { userId: user.id });
      }
    });

    // ── Join private thread room ────────────────────────────────────────────
    socket.on('thread:join', (data) => {
      socket.join(`thread:${data.thread_id}`);
    });

    socket.on('thread:leave', (data) => {
      socket.leave(`thread:${data.thread_id}`);
    });

    // ── Phase 2: WebRTC signalling ───────────────────────────────────────────
    // activeCalls: callId -> { callerId, calleeId, callType, dbLogId, startTime, ringingTimer }
    socket.on('call:initiate', async (data) => {
      try {
        const { callee_id, call_type = 'audio', offer } = data;

        // Check callee is online
        const calleeSockets = await io.in(`user:${callee_id}`).allSockets();
        if (!calleeSockets.size) {
          return socket.emit('call:error', { message: 'User is offline' });
        }

        const callId = `call-${user.id}-${callee_id}-${Date.now()}`;

        // Insert call log with status 'ringing'
        let dbLogId = null;
        try {
          const logRes = await pool.query(
            `INSERT INTO src_erp_call_logs
               (business_id, caller_id, callee_id, call_type, status, start_time)
             VALUES ($1,$2,$3,$4,'ringing',NOW())
             RETURNING id`,
            [user.business_id, user.id, callee_id, call_type]
          );
          dbLogId = logRes.rows[0]?.id ?? null;
        } catch (dbErr) {
          console.error('call log insert error:', dbErr.message);
        }

        // Store in-memory call entry
        activeCalls.set(callId, {
          callerId: user.id,
          calleeId: callee_id,
          callType: call_type,
          dbLogId,
          startTime: null,
        });

        // Auto-expire ringing after 60 s → mark missed
        const ringingTimer = setTimeout(async () => {
          const entry = activeCalls.get(callId);
          if (entry && !entry.startTime) {
            activeCalls.delete(callId);
            io.to(`user:${user.id}`).emit('call:ended', { call_id: callId, reason: 'no_answer' });
            if (entry.dbLogId) {
              try {
                await pool.query(
                  `UPDATE src_erp_call_logs
                   SET status='missed', end_time=NOW(), duration_seconds=0
                   WHERE id=$1`,
                  [entry.dbLogId]
                );
              } catch {}
            }
          }
        }, 60000);

        // Store timer reference so we can cancel it on accept/reject/end
        const entry = activeCalls.get(callId);
        if (entry) entry.ringingTimer = ringingTimer;

        // Notify callee
        io.to(`user:${callee_id}`).emit('call:incoming', {
          call_id: callId,
          caller_id: user.id,
          caller_name: user.name,
          call_type,
          offer: offer || null,
        });

        // Confirm ringing to caller
        socket.emit('call:ringing', { call_id: callId, callee_id });
      } catch (err) {
        console.error('call:initiate error:', err.message);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call:accept', async (data) => {
      const { call_id, caller_id } = data;

      const entry = activeCalls.get(call_id);
      if (entry?.ringingTimer) clearTimeout(entry.ringingTimer);

      if (entry) {
        entry.startTime = Date.now();
        // Update call log to 'active'
        if (entry.dbLogId) {
          try {
            await pool.query(
              `UPDATE src_erp_call_logs SET status='active', start_time=NOW() WHERE id=$1`,
              [entry.dbLogId]
            );
          } catch {}
        }
      }

      io.to(`user:${caller_id}`).emit('call:accepted', {
        call_id,
        callee_id: user.id,
        callee_name: user.name,
        answer: answer || null,
      });

      if (answer) {
        io.to(`user:${caller_id}`).emit('call:answer', {
          call_id,
          answer,
          from_id: user.id,
        });
      }
    });

    socket.on('call:reject', async (data) => {
      const { call_id, caller_id } = data;

      const entry = activeCalls.get(call_id);
      if (entry?.ringingTimer) clearTimeout(entry.ringingTimer);
      activeCalls.delete(call_id);

      io.to(`user:${caller_id}`).emit('call:rejected', { call_id, callee_name: user.name });

      // Update or insert call log with status 'missed'
      try {
        if (entry?.dbLogId) {
          await pool.query(
            `UPDATE src_erp_call_logs
             SET status='missed', end_time=NOW(), duration_seconds=0
             WHERE id=$1`,
            [entry.dbLogId]
          );
        } else {
          await pool.query(
            `INSERT INTO src_erp_call_logs
               (business_id, caller_id, callee_id, call_type, status, start_time, end_time, duration_seconds)
             VALUES ($1,$2,$3,$4,'missed',NOW(),NOW(),0)`,
            [user.business_id, caller_id, user.id, entry?.callType || 'audio']
          );
        }
      } catch {}
    });

    socket.on('call:end', async (data) => {
      const { call_id, other_user_id } = data;

      const entry = activeCalls.get(call_id);
      if (entry?.ringingTimer) clearTimeout(entry.ringingTimer);
      activeCalls.delete(call_id);

      // Notify both parties
      io.to(`user:${other_user_id}`).emit('call:ended', { call_id });
      socket.emit('call:ended', { call_id });

      // Update existing call log with end_time, duration, status='completed'
      try {
        if (entry?.dbLogId) {
          const durationSeconds = entry.startTime
            ? Math.max(0, Math.round((Date.now() - entry.startTime) / 1000))
            : 0;
          await pool.query(
            `UPDATE src_erp_call_logs
             SET status='completed', end_time=NOW(), duration_seconds=$1
             WHERE id=$2`,
            [durationSeconds, entry.dbLogId]
          );
        } else {
          // Fallback: insert a completed log if there was no prior ringing entry
          const { is_caller, duration_seconds = 0, call_type = 'audio' } = data;
          const caller_id = is_caller ? user.id : other_user_id;
          const callee_id = is_caller ? other_user_id : user.id;
          await pool.query(
            `INSERT INTO src_erp_call_logs
               (business_id, caller_id, callee_id, call_type, status,
                start_time, end_time, duration_seconds)
             VALUES ($1,$2,$3,$4,'completed',
                NOW() - ($5 * INTERVAL '1 second'), NOW(), $5)`,
            [user.business_id, caller_id, callee_id, call_type,
             Math.max(0, parseInt(duration_seconds) || 0)]
          );
        }
      } catch {}
    });

    // Relay WebRTC signalling messages to the target peer
    socket.on('call:offer',         (data) => io.to(`user:${data.target_id}`).emit('call:offer',         { ...data, from_id: user.id }));
    socket.on('call:answer',        (data) => io.to(`user:${data.target_id}`).emit('call:answer',        { ...data, from_id: user.id }));
    socket.on('call:ice-candidate', (data) => io.to(`user:${data.target_id}`).emit('call:ice-candidate', { ...data, from_id: user.id }));
    socket.on('call:busy',          (data) => io.to(`user:${data.caller_id}`).emit('call:busy',          { from_id: user.id, call_id: data.call_id }));

    // ── Phase 2: Message reactions, edit, delete ─────────────────────────────
    socket.on('message:react', async (data) => {
      const { thread_id, message_id, emoji } = data;
      try {
        await pool.query(
          `INSERT INTO src_message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [message_id, user.id, emoji]
        );
        io.to(`thread:${thread_id}`).emit('message:reaction_added', { message_id, user_id: user.id, user_name: user.name, emoji });
      } catch {}
    });

    socket.on('message:unreact', async (data) => {
      const { thread_id, message_id, emoji } = data;
      try {
        await pool.query(`DELETE FROM src_message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3`, [message_id, user.id, emoji]);
        io.to(`thread:${thread_id}`).emit('message:reaction_removed', { message_id, user_id: user.id, emoji });
      } catch {}
    });

    socket.on('message:edit', async (data) => {
      const { thread_id, message_id, new_message } = data;
      try {
        const result = await pool.query(
          `UPDATE src_private_chat_messages SET message=$1, edited_at=NOW()
           WHERE id=$2 AND sender_user_id=$3 AND edited_at IS NULL OR (NOW() - created_at < INTERVAL '24 hours')
           RETURNING *`,
          [new_message, message_id, user.id]
        );
        if (result.rows.length) {
          io.to(`thread:${thread_id}`).emit('message:edited', { message_id, new_message, edited_at: result.rows[0].edited_at });
        }
      } catch {}
    });

    socket.on('message:delete_for_all', async (data) => {
      const { thread_id, message_id } = data;
      try {
        await pool.query(
          `UPDATE src_private_chat_messages SET deleted_for_all=TRUE WHERE id=$1 AND sender_user_id=$2`,
          [message_id, user.id]
        );
        io.to(`thread:${thread_id}`).emit('message:deleted_for_all', { message_id });
      } catch {}
    });

    socket.on('message:read', async (data) => {
      const { thread_id, other_user_id } = data;
      try {
        await pool.query(
          `UPDATE src_private_chat_messages SET status='read'
           WHERE thread_id=$1 AND sender_user_id=$2 AND status != 'read'`,
          [thread_id, other_user_id]
        );
        io.to(`user:${other_user_id}`).emit('message:read_receipt', { thread_id, reader_id: user.id });
      } catch {}
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      socket.to(businessRoom).emit('user:offline', { userId: user.id });
    });
  });

  // Expose io for use in controllers
  app.set('io', io);

  // ── Cron: Cart reminders every 6 hours ──
  const cron = require('node-cron');
  const { sendCartReminders } = require('./controllers/notificationController');
  cron.schedule('0 */6 * * *', () => {
    console.log('⏰ Running cart reminder cron...');
    sendCartReminders();
  });

  // ── Cron: Delhivery tracking sync every 3 hours ──
  const { syncTracking } = require('./controllers/shipmentController');
  cron.schedule('0 */3 * * *', () => {
    console.log('🚚 Running Delhivery tracking sync...');
    syncTracking();
  });

  // ── Cron: Seller monthly performance summary (1st of every month at 8 AM) ──
  cron.schedule('0 8 1 * *', async () => {
    console.log('📊 Sending seller monthly summaries...');
    try {
      const { sendMail } = require('./services/mailService');
      const { sellerMonthlySummary } = require('./services/sellerEmailTemplates');
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthName = prevMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const monthStart = prevMonth.toISOString().split('T')[0];
      const monthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      const sellers = await pool.query(
        `SELECT sp.id, sp.brand_name, u.name, u.email,
                COUNT(DISTINCT soi.order_id)        AS orders,
                COALESCE(SUM(soi.line_total),0)     AS revenue,
                COALESCE(SUM(soi.commission_amount),0) AS commission,
                COALESCE(SUM(soi.seller_payout),0)  AS payout,
                (SELECT COUNT(*) FROM src_seller_products WHERE seller_id=sp.id AND deleted_at IS NULL) AS products,
                (SELECT COUNT(*) FROM src_seller_products WHERE seller_id=sp.id AND status='approved' AND deleted_at IS NULL) AS approved_products
         FROM src_seller_profiles sp
         JOIN src_users u ON u.id=sp.user_id
         LEFT JOIN src_seller_order_items soi ON soi.seller_id=sp.id
           AND soi.created_at >= $1 AND soi.created_at <= $2
           AND soi.status NOT IN ('cancelled','refunded')
         WHERE sp.status='active'
         GROUP BY sp.id, sp.brand_name, u.name, u.email`,
        [monthStart, monthEnd]
      );

      for (const s of sellers.rows) {
        sendMail(s.email, `Your NOREN Seller Report – ${monthName}`,
          sellerMonthlySummary(s.name, {
            orders: s.orders, revenue: s.revenue, commission: s.commission,
            payout: s.payout, products: s.products, approved_products: s.approved_products,
          }, monthName)
        ).catch(() => {});
      }
      console.log(`✅ Sent monthly summaries to ${sellers.rows.length} sellers`);
    } catch (e) { console.error('Seller monthly summary error:', e.message); }
  });

  // ── Cron: Seller low stock alert (daily at 9 AM) ─────────────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      const { sendMail } = require('./services/mailService');
      const { sellerLowStock } = require('./services/sellerEmailTemplates');

      const lowStockSellers = await pool.query(
        `SELECT sp.id AS seller_id, u.name, u.email,
                json_agg(json_build_object('title', spp.title, 'stock', v.total_stock)) AS products
         FROM src_seller_profiles sp
         JOIN src_users u ON u.id=sp.user_id
         JOIN src_seller_products spp ON spp.seller_id=sp.id AND spp.status='approved' AND spp.deleted_at IS NULL
         JOIN (
           SELECT product_id, SUM(stock) AS total_stock
           FROM src_seller_product_variants
           GROUP BY product_id
           HAVING SUM(stock) <= 5
         ) v ON v.product_id=spp.id
         WHERE sp.status='active'
         GROUP BY sp.id, u.name, u.email`
      );

      for (const s of lowStockSellers.rows) {
        if (s.products?.length) {
          sendMail(s.email, '⚠️ Low Stock Alert – NOREN Seller',
            sellerLowStock(s.name, s.products)
          ).catch(() => {});
        }
      }
    } catch (e) { console.error('Low stock cron error:', e.message); }
  });
  const { aggregateDailyStats, syncCampaignStatuses } = require('./controllers/influencerController');
  cron.schedule('0 2 * * *', () => {
    console.log('📊 Aggregating influencer daily stats...');
    aggregateDailyStats();
    syncCampaignStatuses();
  });
  const { sendCampaign } = require('./controllers/notificationController');
  cron.schedule('* * * * *', async () => {
    try {
      const due = await pool.query(
        `SELECT id FROM src_notification_campaigns WHERE status='scheduled' AND scheduled_at <= NOW()`
      );
      for (const c of due.rows) {
        await sendCampaign({ params: { id: c.id }, user: { id: 0 } }, { json: () => {} });
      }
    } catch {}
  });


# VENDEXA RetailOS™ × NOREN - Deployment Guide

## Project Overview

**Name:** VENDEXA RetailOS™ × NOREN POS Integration  
**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Completion:** 13/14 Tasks (93%)

Complete integration system connecting VENDEXA RetailOS™ desktop POS application with existing NOREN ecommerce website for digital invoices, QR code generation, and cloud synchronization.

## Architecture Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                     System Architecture                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐         ┌──────────────────┐              │
│  │  VENDEXA POS    │◄───────►│  NOREN Backend   │              │
│  │  Desktop App    │  Sync   │  Node.js/Express │              │
│  │  (Electron)     │         │  PostgreSQL      │              │
│  └─────────────────┘         └──────────────────┘              │
│          │                            │                          │
│          │                            │                          │
│          ▼                            ▼                          │
│  ┌─────────────────┐         ┌──────────────────┐              │
│  │   IndexedDB     │         │   NOREN Website  │              │
│  │  Local Storage  │         │   React/Vite     │              │
│  └─────────────────┘         └──────────────────┘              │
│                                       │                          │
│                                       ▼                          │
│                              ┌──────────────────┐               │
│                              │   /my-billing    │               │
│                              │  Customer Portal │               │
│                              └──────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

## System Components

### 1. Backend API (Node.js/Express)

**Location:** `backend/`

**New Files:**
- `migrations/009_create_pos_integration_tables.sql`
- `controllers/posIntegrationController.js`
- `routes/posIntegration.js`
- `routes/publicInvoice.js`
- `middleware/posSecurityMiddleware.js`
- `services/posServiceIntegration.js`
- `jobs/posDailySummaryJob.js`

**Modified Files:**
- `server.js` (added routes, scheduler)
- `autoMigrate.js` (runs POS migration)
- `services/emailTemplates.js` (added invoice templates)

### 2. Frontend Website (React/Vite)

**Location:** `frontend/`

**New Files:**
- `src/pages/billing/MyBilling.jsx`
- `src/pages/billing/ScanQR.jsx`
- `src/pages/billing/DigitalInvoice.jsx`
- `src/pages/billing/BillingHelp.jsx`
- `src/pages/admin/POSManagement.jsx`

**Modified Files:**
- `src/App.jsx` (added billing routes)
- `src/pages/admin/AdminDashboard.jsx` (added POS management)

### 3. POS Desktop App (Electron/React)

**Location:** `billing-pos-app/`

**New Files:**
- `src/pages/WebsiteIntegration.js`
- `src/services/backgroundSyncWorker.js`
- `src/services/invoiceSyncHooks.js`
- `src/services/cloudSyncService.js`
- `src/utils/qrGenerator.js`
- `src/components/InvoiceQRCode.jsx`

**Modified Files:**
- `src/App.js` (added route)
- `src/pages/Settings.js` (added tab)
- `src/context/AppContext.js` (added sync initialization)
- `src/db/db.js` (added sync queue functions)

## Database Schema

### New Tables (5 total)

1. **src_pos_devices** - Device registry
2. **src_pos_invoice_tokens** - Public invoice tokens
3. **src_pos_sync_queue** - Offline sync queue
4. **src_pos_audit_events** - Audit trail
5. **src_pos_invoice_access_log** - Access analytics

**Migration File:** `backend/migrations/009_create_pos_integration_tables.sql`

## Deployment Steps

### Step 1: Backend Deployment

**Prerequisites:**
- PostgreSQL database
- Node.js 18+ installed
- npm/yarn package manager

**Commands:**
```bash
cd backend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
nano .env

# Required variables:
# DATABASE_URL=postgresql://user:pass@host:port/database
# FRONTEND_URL=https://your-site.com
# RESEND_API_KEY=re_xxxxx (for emails)
# JWT_SECRET=your-secure-secret
# NODE_ENV=production

# Run migrations (automatically runs on startup)
npm run migrate  # or node autoMigrate.js

# Start server
npm start

# For production with PM2:
pm2 start server.js --name noren-api
pm2 save
```

**Verify:**
```bash
curl http://localhost:5000/api/health
# Should return 200 OK
```

### Step 2: Frontend Deployment

**Prerequisites:**
- Node.js 18+ installed
- Backend API URL

**Commands:**
```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
nano .env

# Required variables:
# VITE_API_URL=https://your-api.com
# VITE_FRONTEND_URL=https://your-site.com

# Build for production
npm run build

# Deploy dist/ folder to hosting
# Options: Vercel, Netlify, AWS S3, etc.

# For Vercel:
vercel --prod

# For traditional hosting:
scp -r dist/* user@server:/var/www/html/
```

**Verify:**
```bash
curl https://your-site.com/my-billing
# Should return 200 OK
```

### Step 3: POS App Configuration

**Prerequisites:**
- POS app installed on desktop
- Backend API accessible

**Setup:**
1. Open POS app
2. Go to Settings → Website Integration
3. Enter Configuration:
   - Backend URL: `https://your-api.com`
   - Website URL: `https://your-site.com`
4. Register Device:
   - Enter device name
   - Click "Register Device"
   - Copy API key (shown once!)
5. Test Connection:
   - Click "Test Connection"
   - Should show "Connected"
6. Enable Auto-Sync:
   - Go to Sync tab
   - Enable "Auto-Sync"
   - Set interval (30 seconds recommended)
7. Save Configuration

### Step 4: Admin Setup

**Create Admin User:**
```sql
-- If not exists, create admin user
INSERT INTO src_users (name, email, password_hash, role)
VALUES (
  'Admin',
  'admin@yourdomain.com',
  -- Hash your password first
  '$2b$10$...',
  'admin'
);
```

**Grant Permissions:**
```sql
-- Grant POS management permissions
UPDATE src_users 
SET permissions = permissions || '["erp.manage_pos"]'::jsonb
WHERE role IN ('admin', 'super_admin');
```

**Access Admin Dashboard:**
1. Login to website as admin
2. Navigate to `/admin/pos-management`
3. Verify dashboard loads
4. Check Overview tab shows stats

### Step 5: Email Configuration

**Setup Resend:**
1. Sign up at https://resend.com
2. Create API key
3. Add to backend `.env`:
   ```env
   RESEND_API_KEY=re_xxxxx
   EMAIL_FROM=NOREN <noreply@yourdomain.com>
   ```
4. Test email:
   ```bash
   node backend/test-send-email.js
   ```

**Verify Email Templates:**
```bash
# Check templates exist
ls backend/services/emailTemplates.js

# Should include:
# - posInvoiceReceipt
# - posPaymentConfirmation
# - posDailySalesSummary
```

### Step 6: Security Configuration

**Enable Security Features:**
```env
# In backend/.env

# Optional: IP Whitelisting
POS_IP_WHITELIST_ENABLED=false

# Rate Limiting (already enabled by default)
# Adjust in middleware/posSecurityMiddleware.js if needed
```

**SSL/HTTPS:**
```bash
# For production, ensure HTTPS is enabled
# Use Let's Encrypt or cloud provider SSL

# Force HTTPS redirect in nginx:
server {
  listen 80;
  return 301 https://$server_name$request_uri;
}
```

**Firewall Rules:**
```bash
# Allow only necessary ports
# Port 5000 (backend API) - behind reverse proxy
# Port 443 (HTTPS) - public
# Port 5432 (PostgreSQL) - internal only
```

### Step 7: Monitoring Setup

**PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# View logs
pm2 logs noren-api --lines 100

# Monitor
pm2 monit
```

**Database Monitoring:**
```sql
-- Create monitoring view
CREATE VIEW pos_health_stats AS
SELECT 
  (SELECT COUNT(*) FROM src_pos_devices WHERE status = 'active') as active_devices,
  (SELECT COUNT(*) FROM src_pos_sync_queue WHERE status = 'pending') as pending_syncs,
  (SELECT COUNT(*) FROM src_pos_audit_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
  (SELECT COUNT(*) FROM src_pos_invoice_tokens WHERE created_at > NOW() - INTERVAL '24 hours') as tokens_24h;

-- Query health
SELECT * FROM pos_health_stats;
```

**Alert Setup:**
```bash
# Set up alerts for:
# - High pending sync queue (> 100)
# - Rate limit violations spike
# - Auth failure spike
# - Database connection errors
# - High response times (> 500ms)
```

## Production Checklist

### Pre-Launch

**Backend:**
- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] HTTPS enabled and forced
- [ ] CORS configured for frontend domain
- [ ] Rate limiting active
- [ ] Security middleware enabled
- [ ] Audit logging working
- [ ] Email service configured
- [ ] Daily summary scheduler running
- [ ] Error logging configured
- [ ] Health endpoint responding

**Frontend:**
- [ ] Production build successful
- [ ] API URL points to production backend
- [ ] All routes accessible
- [ ] No console errors
- [ ] QR scanner works (HTTPS required)
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Performance optimized (Lighthouse > 90)

**POS App:**
- [ ] Backend URL configured
- [ ] Device registered
- [ ] API key stored securely
- [ ] Test invoice synced successfully
- [ ] QR code generated
- [ ] Offline sync tested
- [ ] Background worker running
- [ ] Settings saved

**Database:**
- [ ] Backups configured (daily)
- [ ] Indexes created
- [ ] Connection pool sized appropriately
- [ ] Monitoring enabled
- [ ] Replication configured (if applicable)

**Security:**
- [ ] SSL certificates valid
- [ ] API keys rotated from defaults
- [ ] Database passwords strong
- [ ] Firewall rules configured
- [ ] Security headers set
- [ ] Audit logging enabled
- [ ] Rate limiting tested

### Post-Launch

**Day 1:**
- [ ] Monitor error rates
- [ ] Check sync success rate
- [ ] Verify emails sending
- [ ] Review audit logs
- [ ] Test customer QR flow
- [ ] Check admin dashboard
- [ ] Monitor performance

**Week 1:**
- [ ] Review all audit logs
- [ ] Analyze sync patterns
- [ ] Check device health
- [ ] Review customer feedback
- [ ] Optimize based on usage
- [ ] Update documentation

**Month 1:**
- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification
- [ ] User training
- [ ] Feature requests review
- [ ] Plan improvements

## Backup & Recovery

### Database Backups

**Automated Backups:**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="noren"

pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/noren_$DATE.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "noren_*.sql.gz" -mtime +30 -delete

# Add to crontab:
# 0 2 * * * /path/to/backup-script.sh
```

**Recovery:**
```bash
# Restore from backup
gunzip -c noren_20250109_020000.sql.gz | psql -U postgres noren
```

### Application Backups

**Code:**
```bash
# Git repository is source of truth
git clone https://your-repo.com/noren-pos-integration.git
```

**Configuration:**
```bash
# Backup .env files (encrypted!)
tar -czf env-backup.tar.gz backend/.env frontend/.env
gpg -c env-backup.tar.gz
```

## Scaling Considerations

### Horizontal Scaling

**Backend:**
- Use load balancer (Nginx, HAProxy)
- Run multiple Node.js instances
- Share session state (Redis)
- Database connection pooling

**Database:**
- Read replicas for analytics
- Connection pooling (PgBouncer)
- Vertical scaling first (more RAM/CPU)
- Sharding if > 1M invoices/month

**Frontend:**
- CDN for static assets
- Edge caching
- Image optimization

### Performance Optimization

**Backend:**
```javascript
// Cache device lookups (5 min TTL)
const deviceCache = new Map();

// Batch audit log writes
const auditQueue = [];
setInterval(flushAuditQueue, 5000);

// Use indexes
CREATE INDEX idx_pos_sync_queue_status ON src_pos_sync_queue(status);
CREATE INDEX idx_pos_devices_fingerprint ON src_pos_devices(device_fingerprint);
```

**Frontend:**
```javascript
// Code splitting
const DigitalInvoice = lazy(() => import('./pages/billing/DigitalInvoice'));

// Image lazy loading
<img loading="lazy" src="..." />

// Service worker caching
// Already implemented in PWA config
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check sync queue health
- Review security events

**Weekly:**
- Analyze performance metrics
- Review audit logs
- Check disk space
- Test backups

**Monthly:**
- Rotate API keys
- Update dependencies
- Security audit
- Performance review

**Quarterly:**
- Full system audit
- Penetration testing
- Disaster recovery drill
- User feedback review

## Support & Troubleshooting

### Common Issues

**Issue: Migrations fail**
```bash
# Check migration status
SELECT * FROM schema_migrations ORDER BY version DESC;

# Manually run migration
psql -U postgres noren < backend/migrations/009_create_pos_integration_tables.sql
```

**Issue: Sync queue growing**
```sql
-- Check pending items
SELECT status, COUNT(*) 
FROM src_pos_sync_queue 
GROUP BY status;

-- Retry failed items
UPDATE src_pos_sync_queue 
SET status = 'pending', retryCount = 0 
WHERE status = 'failed';
```

**Issue: Rate limit errors**
```bash
# Adjust limits in posSecurityMiddleware.js
const MAX_REQUESTS = 200; // Increase from 100
```

### Getting Help

**Documentation:**
- `INTEGRATION_TESTING_GUIDE.md` - Testing procedures
- `SECURITY_AUDIT_GUIDE.md` - Security features
- `SERVICE_INTEGRATION_GUIDE.md` - Email/AI/Messaging
- `OFFLINE_SYNC_GUIDE.md` - Sync system
- `ADMIN_POS_MANAGEMENT_SETUP.md` - Admin dashboard

**Support Channels:**
- Email: support@norenfashion.shop
- Documentation: This guide and linked docs
- Code: Well-commented, production-ready

## Rollback Plan

**If issues occur:**

1. **Disable POS Sync:**
   ```sql
   UPDATE src_pos_devices SET status = 'suspended';
   ```

2. **Rollback Database:**
   ```bash
   # Restore from backup
   psql -U postgres noren < backup.sql
   ```

3. **Rollback Code:**
   ```bash
   git revert <commit-hash>
   git push
   pm2 restart noren-api
   ```

4. **Communicate:**
   - Notify users
   - Update status page
   - Document incident

## Success Metrics

**Key Performance Indicators:**
- Sync success rate > 99.5%
- API response time < 100ms p95
- Email delivery rate > 95%
- Zero data loss
- Uptime > 99.9%
- Customer satisfaction > 4.5/5

**Business Metrics:**
- Digital invoice adoption rate
- QR code scan rate
- Customer engagement
- Admin efficiency improvement

## Next Steps

**Future Enhancements:**
1. Mobile app integration
2. WhatsApp notifications
3. Multi-currency support
4. Advanced analytics dashboard
5. Customer loyalty integration
6. Inventory sync
7. Multi-location support
8. API webhooks

---

**Deployment Status:** ✅ Ready for Production  
**Version:** 1.0.0  
**Last Updated:** January 2025  
**Maintained By:** NOREN Development Team

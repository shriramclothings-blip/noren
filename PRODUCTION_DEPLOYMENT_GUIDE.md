# NOREN Email Portal - Production Deployment Guide

## 🚀 Quick Deployment Checklist

### ✅ Completed
- [x] Backend controllers created (8 controllers, 70+ endpoints)
- [x] Database migration file ready (`007_create_email_portal_tables.sql`)
- [x] Routes configured in `backend/server.js`
- [x] Frontend built with React + Vite
- [x] API integration configured
- [x] Mock mode disabled
- [x] Error handling implemented
- [x] Code pushed to GitHub

### 📋 Required Steps for Production

## 1. Backend Deployment (Render)

Your backend should auto-deploy from GitHub. Monitor at:
- Dashboard: https://dashboard.render.com
- Live URL: https://noren-iqk3.onrender.com

**Verify deployment:**
```bash
curl https://noren-iqk3.onrender.com/api/health
```

Expected response:
```json
{"status":"ok","brand":"NOREN","timestamp":"2026-09-10T..."}
```

## 2. Database Migration (CRITICAL)

The email portal tables must be created in your production database.

### Option A: Run Migration via Render Shell

1. Go to Render Dashboard → Your Service → Shell
2. Execute:
```bash
cd backend
node migrations/runEmailPortalMigration.js
```

### Option B: Run Migration Locally Against Production DB

1. Get your DATABASE_URL from Render environment variables
2. Run locally:
```bash
cd backend
export DATABASE_URL_1="your-production-database-url"
node migrations/runEmailPortalMigration.js
```

### Option C: Direct SQL Execution

1. Connect to your PostgreSQL database
2. Execute the SQL file:
```bash
psql $DATABASE_URL_1 < migrations/007_create_email_portal_tables.sql
```

### Verify Migration Success

Check if tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'src_email%'
ORDER BY table_name;
```

Expected 12 tables:
- src_email_templates
- src_email_drafts
- src_email_sent
- src_email_campaigns
- src_email_campaign_recipients
- src_email_segments
- src_email_segment_contacts
- src_email_suppression_list
- src_email_automations
- src_email_automation_logs
- src_email_sender_identities
- src_email_settings

## 3. Environment Variables

Ensure these are set in Render:

```env
# Resend API for email sending
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend URLs (for CORS)
FRONTEND_URL=https://www.norenfastion.shop,http://localhost:5177
```

## 4. Test Backend Endpoints

After migration, test critical endpoints:

### Test Analytics
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://noren-iqk3.onrender.com/api/email/analytics/overview
```

### Test Campaigns
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://noren-iqk3.onrender.com/api/email/campaigns
```

### Test Templates
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://noren-iqk3.onrender.com/api/email/templates
```

## 5. Frontend Deployment

### Local Development
```bash
cd email-portal
npm install
npm run dev
```

Access at: http://localhost:5177

### Production Build (for Vercel/Netlify)
```bash
cd email-portal
npm run build
# Deploy the 'dist' folder
```

## 6. Verify End-to-End Integration

1. **Login**: Navigate to http://localhost:5177/login
2. **Dashboard**: Should load real analytics data
3. **Campaigns**: Should show actual campaigns (initially empty)
4. **Templates**: Should show 4 default templates
5. **Send Email**: Test sending an email

## 🔍 Troubleshooting

### Issue: 404 on /api/email endpoints

**Fix**: Ensure backend redeployed after latest push
```bash
git log --oneline -1  # Should show: "fix: Remove undefined email portal route handlers"
```

### Issue: "Table does not exist" errors

**Fix**: Run database migration (Step 2 above)

### Issue: CORS errors

**Fix**: Check FRONTEND_URL in Render includes `http://localhost:5177`

### Issue: Authentication errors

**Fix**: Ensure user exists in `src_users` table with proper role
```sql
SELECT id, email, role FROM src_users WHERE role IN ('admin', 'super_admin');
```

### Issue: Email sending fails

**Fix**: Verify RESEND_API_KEY is set and valid
```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@norenfashion.in","to":"test@example.com","subject":"Test","html":"Test"}'
```

## 📊 Expected Initial State

After successful deployment:

- **Templates**: 4 default templates created
- **Sender Identities**: 4 default identities (admin@, support@, marketing@, noreply@)
- **Campaigns**: Empty (create your first campaign)
- **Contacts**: Synced from `src_newsletter_subscribers` table
- **Analytics**: Shows 0 until emails are sent

## 🎯 Production Readiness

- [x] No mock data
- [x] Error handling implemented
- [x] Loading states on all pages
- [x] API timeouts configured (30s)
- [x] 401 auto-redirect to login
- [x] Network error handling
- [x] React ErrorBoundary
- [x] Toast notifications
- [x] Form validation

## 📚 Documentation

- **Architecture**: `EMAIL_PORTAL_ARCHITECTURE_AUDIT.md`
- **Database Schema**: `backend/migrations/007_create_email_portal_tables.sql`
- **API Reference**: `API_QUICK_REFERENCE.md`
- **Phase Summaries**: `EMAIL_PORTAL_PHASE{3,4}_SUMMARY.md`

## 🔐 Security Notes

1. All endpoints require JWT authentication
2. Role-based access control (admin, store_manager, etc.)
3. Audit logging on all write operations
4. SQL injection protection (parameterized queries)
5. XSS protection (React escaping + DOMPurify)
6. CORS restrictions
7. Rate limiting on email sending

## 🚦 Go Live Checklist

- [ ] Database migration executed successfully
- [ ] Backend deployment confirmed (check Render logs)
- [ ] RESEND_API_KEY configured
- [ ] Test login successful
- [ ] Dashboard loads real data
- [ ] Can create template
- [ ] Can send test email
- [ ] Analytics tracking works
- [ ] No console errors
- [ ] Mobile responsive verified

---

**Status**: Ready for production deployment after database migration

**Last Updated**: September 10, 2026

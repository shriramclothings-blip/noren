# NOREN EMAIL PORTAL - ARCHITECTURE AUDIT & INTEGRATION MAP

**Generated:** Phase 1 Complete  
**Purpose:** Comprehensive analysis of existing NOREN infrastructure for Email Portal integration

---

## EXECUTIVE SUMMARY

The NOREN platform has a **mature, production-ready email infrastructure** that can be extended for a full-featured Email Operations Portal. The system uses:

- **Email Provider:** Resend (HTTPS API)
- **Email Service:** Centralized mailService.js with monitoring integration
- **Existing Templates:** Professional HTML email templates (18+ templates)
- **Database:** PostgreSQL (3 Neon instances with pooling)
- **Authentication:** JWT-based with role-based access control
- **Existing Campaigns:** Basic email campaign functionality exists

**KEY FINDING:** Do NOT build a separate backend. Extend the existing Node.js/Express backend at `backend/` with new routes and controllers.

---

## 1. EXISTING EMAIL INFRASTRUCTURE

### 1.1 Email Service Provider

```javascript
// backend/services/mailService.js
Provider: Resend
Configuration: process.env.RESEND_API_KEY
From Address: process.env.EMAIL_FROM = "NOREN <noreply@norenfastion.shop>"
Status: ✅ PRODUCTION READY
```

**Capabilities:**
- HTML email sending via HTTPS API
- Works on free-tier hosting (Render)
- Automatic monitoring and event emission
- Error handling and logging
- Returns email ID on success

**Integration:** Reuse existing `sendMail(to, subject, html)` function

---

### 1.2 Existing Email Templates

**Location:** `backend/services/emailTemplates.js`

**Available Templates (18+):**

1. **Authentication:**
   - `forgotPasswordOTP(name, otp)`
   - `passwordChanged(name, time)`

2. **Admin Recovery:**
   - `adminRecoveryOTP(name, otp, adminNote)`
   - `adminRecoveryLink(name, recoveryUrl, expiresIn, adminNote)`
   - `adminRecoveryKey(name, recoveryKey, expiresAt, adminNote)`
   - `adminForcedPasswordReset(name, time, tempPassword, adminNote)`
   - `recoveryQueryConfirm(name, ticketId, issueType)`

3. **Newsletter:**
   - `subscribeConfirm(email, name)` - Premium luxury welcome email

4. **Employee:**
   - `employeeWelcome(name, email, password, role, businessName)`
   - `employeeOfferLetter(name, role, businessName, startDate)`

5. **Influencer:**
   - `influencerWelcome(name, email, password, commissionType, commissionRate)`
   - `influencerPayout(name, amount, status, conversionCount, payoutRef, txnRef)`
   - `influencerCommission(name, commission, orderTotal, orderId, commissionStatus)`
   - `influencerCommissionUpdate(name, commission, orderId, oldStatus, newStatus)`

6. **Orders:**
   - `orderConfirm(name, orderId, total, items, address)`
   - `orderStatusUpdate(name, orderId, status, trackingId, awb)`

7. **Marketing:**
   - `offerEmail(name, subject, message, ctaText, ctaUrl, type)`
   - `productEmail(name, product, message)`

**Template Architecture:**
- Consistent NOREN branding (header/footer)
- Responsive design
- Variable substitution support
- Premium luxury aesthetic
- Unsubscribe footer support

**Integration:** Extend existing template system, add new template management table

---

### 1.3 Existing Campaign System

**Location:** `backend/controllers/emailCampaignController.js`

**Current Capabilities:**
- ✅ Send to all users
- ✅ Send to specific user
- ✅ Send to newsletter subscribers
- ✅ Send to custom email list (non-users)
- ✅ Batch sending (10 per batch)
- ✅ Campaign logging
- ✅ Search users
- ✅ Product email campaigns
- ✅ Custom HTML support

**Database Table:**
```sql
src_email_campaigns (
  id, subject, body_html, type, target, user_id, 
  custom_emails, sent_count, status, created_by, created_at
)
```

**Integration:** Extend this foundation, add scheduling, automation, analytics

---

## 2. DATABASE ANALYSIS

### 2.1 Existing Tables (Reusable)

```sql
-- ✅ REUSE THESE - DO NOT DUPLICATE

src_users (
  id, name, email, phone, role, avatar_url, 
  business_id, store_id, warehouse_id, is_banned
)
Roles: super_admin, admin, business_owner, store_admin, 
       store_manager, cashier, warehouse_manager, accountant, 
       employee, customer, seller, influencer

src_newsletter_subscribers (
  id, email, name, is_active, subscribed_at, 
  unsubscribed_at, source
)

src_email_campaigns (
  id, subject, body_html, type, target, user_id, 
  custom_emails, sent_count, status, created_by, created_at
)

src_businesses (
  id, name, slug, gst_number, phone, email, address,
  currency, timezone, is_active
)

src_stores (
  id, business_id, name, slug, store_code, 
  address, phone, email, is_active
)

src_erp_customers (
  id, business_id, customer_code, name, phone, email,
  gst_number, address, city, state, pincode, membership
)

src_sellers (
  id, business_name, email, phone, status, commission_rate
)

src_influencers (
  id, name, email, phone, commission_type, commission_rate
)

src_erp_employees (
  id, business_id, employee_code, name, email, phone,
  department, designation
)
```

---

### 2.2 New Tables Required

```sql
-- Email Portal Extensions (DO NOT duplicate master tables)

CREATE TABLE src_email_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES src_users(id),
  updated_by INTEGER REFERENCES src_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id) ON DELETE CASCADE,
  subject TEXT,
  body_html TEXT,
  body_plain TEXT,
  recipients JSONB DEFAULT '[]',
  cc JSONB DEFAULT '[]',
  bcc JSONB DEFAULT '[]',
  template_id INTEGER REFERENCES src_email_templates(id),
  attachments JSONB DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  campaign_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_sent (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  cc TEXT[],
  bcc TEXT[],
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT,
  template_id INTEGER REFERENCES src_email_templates(id),
  campaign_id INTEGER REFERENCES src_email_campaigns(id),
  parent_email_id INTEGER REFERENCES src_email_sent(id),
  thread_id TEXT,
  status TEXT DEFAULT 'sent',
  provider_id TEXT,
  provider_response JSONB,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_campaigns_v2 (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  template_id INTEGER REFERENCES src_email_templates(id),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  reply_to TEXT,
  audience_type TEXT NOT NULL,
  audience_filter JSONB DEFAULT '{}',
  segment_id INTEGER,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES src_users(id),
  approved_by INTEGER REFERENCES src_users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_segments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  segment_type TEXT NOT NULL,
  filter_rules JSONB NOT NULL,
  is_dynamic BOOLEAN DEFAULT TRUE,
  recipient_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES src_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_suppression (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  suppression_type TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_automations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  conditions JSONB DEFAULT '[]',
  template_id INTEGER REFERENCES src_email_templates(id),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES src_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_automation_logs (
  id SERIAL PRIMARY KEY,
  automation_id INTEGER REFERENCES src_email_automations(id),
  trigger_data JSONB,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  email_id INTEGER REFERENCES src_email_sent(id),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE src_email_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES src_users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_sent_recipient ON src_email_sent(recipient_email);
CREATE INDEX idx_email_sent_campaign ON src_email_sent(campaign_id);
CREATE INDEX idx_email_sent_thread ON src_email_sent(thread_id);
CREATE INDEX idx_email_sent_status ON src_email_sent(status);
CREATE INDEX idx_email_suppression_email ON src_email_suppression(email);
CREATE INDEX idx_email_audit_user ON src_email_audit(user_id);
CREATE INDEX idx_email_audit_created ON src_email_audit(created_at);
```

---

## 3. AUTHENTICATION & AUTHORIZATION

### 3.1 Existing Auth System

**Middleware:** `backend/middleware/auth.js`

```javascript
// ✅ REUSE THIS

auth - Validates JWT token, loads user from src_users
requireRole(...roles) - Restricts by role
requirePermission(permission) - Checks src_role_permissions
optionalAuth - Allows guest access
```

**JWT Configuration:**
- Secret: `process.env.JWT_SECRET`
- User fields: id, name, email, role, avatar_url, phone, business_id, store_id, warehouse_id
- Permissions loaded from `src_role_permissions` join table

---

### 3.2 Email Portal Role Permissions

**Proposed RBAC:**

```javascript
super_admin:
  - Full access to all email portal features
  - Manage sender identities
  - View all campaigns
  - Configure suppression lists
  - View audit logs

admin:
  - Create/send campaigns
  - Manage templates
  - View analytics
  - Send bulk emails
  - Manage contacts
  - Cannot modify sender identities

business_owner:
  - Same as admin for their business

marketing_team (new role or permission):
  - Create campaigns (requires approval)
  - Use templates
  - View analytics
  - Cannot send directly

customer_support:
  - Send individual customer emails
  - Reply to conversations
  - View customer email history
  - Use customer templates

hr_team (permission):
  - Send recruitment emails
  - Manage applicant communication
  - Use recruitment templates

seller_team (permission):
  - Send seller announcements
  - View seller email history

influencer_team (permission):
  - Send influencer communications
  - View influencer campaigns
```

**Implementation:** Use existing `requireRole()` and add new permission checks

---

## 4. EXISTING API ENDPOINTS

### 4.1 Currently Available

```javascript
// ✅ REUSE THESE

// Email Campaigns
POST   /api/erp/email/send              - Send campaign
POST   /api/erp/email/send-product      - Send product email
GET    /api/erp/email/logs              - Campaign history
DELETE /api/erp/email/logs/:id          - Delete log
GET    /api/erp/email/users/search      - Search users

// Newsletter
POST   /api/newsletter/subscribe        - Subscribe
POST   /api/newsletter/unsubscribe      - Unsubscribe
GET    /api/newsletter/subscribers      - List subscribers
POST   /api/newsletter/broadcast        - Broadcast to subscribers

// Authentication
POST   /api/auth/login                  - Login
POST   /api/auth/register               - Register
POST   /api/auth/logout                 - Logout
GET    /api/auth/me                     - Current user

// Users (for contact management)
GET    /api/users                       - List users (admin)
GET    /api/users/:id                   - User detail

// Customers (ERP)
GET    /api/erp/customers               - List customers
GET    /api/erp/customers/:id           - Customer detail

// Sellers
GET    /api/seller                      - List sellers
GET    /api/seller/:id                  - Seller detail

// Influencers
GET    /api/influencer                  - List influencers
GET    /api/influencer/:id              - Influencer detail

// Employees
GET    /api/erp/employees               - List employees
GET    /api/erp/employees/:id           - Employee detail
```

---

### 4.2 New API Endpoints Required

```javascript
// Email Portal - Inbox & Compose
GET    /api/email/inbox                 - List received emails
GET    /api/email/sent                  - List sent emails
GET    /api/email/drafts                - List drafts
GET    /api/email/threads/:id           - Email thread
POST   /api/email/send                  - Send individual email
POST   /api/email/reply/:id             - Reply to email
POST   /api/email/forward/:id           - Forward email
POST   /api/email/draft                 - Save/update draft
DELETE /api/email/draft/:id             - Delete draft
GET    /api/email/:id                   - Email detail

// Templates
GET    /api/email/templates             - List templates
GET    /api/email/templates/:id         - Template detail
POST   /api/email/templates             - Create template
PUT    /api/email/templates/:id         - Update template
DELETE /api/email/templates/:id         - Delete template
POST   /api/email/templates/:id/duplicate - Duplicate template

// Campaigns (Enhanced)
GET    /api/email/campaigns             - List campaigns
GET    /api/email/campaigns/:id         - Campaign detail
POST   /api/email/campaigns             - Create campaign
PUT    /api/email/campaigns/:id         - Update campaign
DELETE /api/email/campaigns/:id         - Delete campaign
POST   /api/email/campaigns/:id/schedule - Schedule campaign
POST   /api/email/campaigns/:id/send    - Send campaign now
POST   /api/email/campaigns/:id/approve - Approve campaign
POST   /api/email/campaigns/:id/test    - Send test email
GET    /api/email/campaigns/:id/analytics - Campaign analytics
GET    /api/email/campaigns/:id/recipients - Campaign recipients

// Segments
GET    /api/email/segments              - List segments
GET    /api/email/segments/:id          - Segment detail
POST   /api/email/segments              - Create segment
PUT    /api/email/segments/:id          - Update segment
DELETE /api/email/segments/:id          - Delete segment
POST   /api/email/segments/:id/calculate - Calculate recipients
GET    /api/email/segments/:id/preview  - Preview recipients

// Contacts (Unified)
GET    /api/email/contacts              - List all contacts
GET    /api/email/contacts/:id          - Contact detail
GET    /api/email/contacts/:id/history  - Email history
POST   /api/email/contacts/import       - Import contacts
GET    /api/email/contacts/export       - Export contacts

// Suppression
GET    /api/email/suppression           - List suppressed emails
POST   /api/email/suppression           - Add to suppression
DELETE /api/email/suppression/:id       - Remove from suppression
POST   /api/email/suppression/import    - Bulk import
GET    /api/email/suppression/export    - Export list

// Automation
GET    /api/email/automations           - List automations
GET    /api/email/automations/:id       - Automation detail
POST   /api/email/automations           - Create automation
PUT    /api/email/automations/:id       - Update automation
DELETE /api/email/automations/:id       - Delete automation
POST   /api/email/automations/:id/toggle - Enable/disable
GET    /api/email/automations/:id/logs  - Automation logs

// Analytics & Reporting
GET    /api/email/analytics/overview    - Dashboard stats
GET    /api/email/analytics/deliverability - Delivery rates
GET    /api/email/analytics/engagement  - Open/click rates
GET    /api/email/analytics/campaigns   - Campaign performance
GET    /api/email/analytics/audience    - Audience analytics
GET    /api/email/analytics/revenue     - Revenue attribution

// Settings & Administration
GET    /api/email/settings              - Email settings
PUT    /api/email/settings              - Update settings
GET    /api/email/sender-identities     - Sender identities
POST   /api/email/sender-identities     - Add sender
DELETE /api/email/sender-identities/:id - Remove sender
GET    /api/email/audit                 - Audit logs
```

---

## 5. FRONTEND PORTALS

### 5.1 Existing Portals

```
frontend/               - Main ecommerce (customers)
seller-portal/          - Seller dashboard
support-portal/         - Customer support system
noren-messaging-frontend/ - Internal messaging
```

**Stack:** React + Vite  
**Styling:** Tailwind CSS  
**State:** Context API / Local state  
**Router:** React Router DOM  

---

### 5.2 Email Portal Structure

```
email-portal/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Layout.jsx
│   │   ├── email/
│   │   │   ├── Composer.jsx
│   │   │   ├── EmailList.jsx
│   │   │   ├── EmailThread.jsx
│   │   │   ├── RichEditor.jsx
│   │   │   └── VariablePicker.jsx
│   │   ├── campaigns/
│   │   │   ├── CampaignBuilder.jsx
│   │   │   ├── CampaignList.jsx
│   │   │   ├── AudienceSelector.jsx
│   │   │   └── CampaignAnalytics.jsx
│   │   ├── templates/
│   │   │   ├── TemplateEditor.jsx
│   │   │   ├── TemplateList.jsx
│   │   │   └── TemplatePreview.jsx
│   │   ├── contacts/
│   │   │   ├── ContactList.jsx
│   │   │   ├── ContactDetail.jsx
│   │   │   └── SegmentBuilder.jsx
│   │   ├── automation/
│   │   │   ├── AutomationBuilder.jsx
│   │   │   ├── AutomationList.jsx
│   │   │   └── TriggerConfig.jsx
│   │   └── analytics/
│   │       ├── Dashboard.jsx
│   │       ├── CampaignStats.jsx
│   │       └── DeliverabilityStats.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Inbox.jsx
│   │   ├── Compose.jsx
│   │   ├── Campaigns.jsx
│   │   ├── Templates.jsx
│   │   ├── Contacts.jsx
│   │   ├── Automation.jsx
│   │   ├── Analytics.jsx
│   │   └── Settings.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useApi.js
│   │   └── useToast.js
│   ├── services/
│   │   └── api.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .env
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 6. ENVIRONMENT CONFIGURATION

### 6.1 Backend (.env)

```bash
# ✅ ALREADY CONFIGURED

# Email Provider
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=NOREN <noreply@norenfastion.shop>

# Database (3 instances)
DATABASE_URL_1=postgresql://... (primary)
DATABASE_URL_2=postgresql://... (backup)
DATABASE_URL_3=postgresql://... (backup)

# Authentication
JWT_SECRET=noren_fashion_jwt_secret_2024_secure

# Frontend URLs
FRONTEND_URL=https://www.norenfastion.shop,https://sell.norenfastion.shop,https://support.norenfastion.shop

# Admin
ADMIN_EMAIL=admin@norenfashion.in
ADMIN_PASSWORD=Noren@Admin2024
SUPER_ADMIN_EMAILS=supportnoren1@gmail.com
```

**Required Addition:**
```bash
# Email Portal
EMAIL_PORTAL_URL=https://mail.norenfastion.shop
```

---

### 6.2 Email Portal (.env)

```bash
VITE_API_URL=https://noren-iqk3.onrender.com/api
VITE_SITE_NAME=NOREN Mail
VITE_ENABLE_DARK_MODE=true
```

---

## 7. DEPLOYMENT ARCHITECTURE

### 7.1 Current Deployment

```
Backend:         Render.com (https://noren-iqk3.onrender.com)
Main Frontend:   Vercel (https://www.norenfastion.shop)
Seller Portal:   Vercel (https://sell.norenfastion.shop)
Support Portal:  Vercel (https://support.norenfastion.shop)
Database:        Neon PostgreSQL (3 instances)
Email:           Resend API
Storage:         Cloudinary
```

---

### 7.2 Email Portal Deployment

```
Subdomain: mail.norenfastion.shop
Platform:  Vercel (recommended, same as other portals)
Backend:   REUSE existing Render backend
CORS:      Add mail.norenfastion.shop to FRONTEND_URL

// backend/server.js - ADD THIS
const allowedOrigins = [
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177', // <-- Email portal dev
  'https://mail.norenfastion.shop', // <-- Production
];
```

---

## 8. INTEGRATION REQUIREMENTS

### 8.1 Cross-Portal Integration

**Support Portal ↔ Email Portal:**
- From support ticket → Open email composer with customer preselected
- From email portal → Open customer support ticket
- Shared customer email history

**Admin Panel ↔ Email Portal:**
- Deep link from Admin → Email Center (existing)
- Shared authentication session

**Seller Portal ↔ Email Portal:**
- Seller announcements from email portal
- Seller email history visible in seller detail

---

### 8.2 Data Sharing

```javascript
// DO NOT DUPLICATE - ALWAYS QUERY FROM MASTER TABLES

Customers:     src_users (role='customer')
               + src_erp_customers (business context)
Sellers:       src_sellers
Influencers:   src_influencers
Employees:     src_erp_employees
Subscribers:   src_newsletter_subscribers
Users:         src_users (all roles)
```

---

## 9. MONITORING & LOGGING

### 9.1 Existing Monitoring

**Location:** `backend/monitor.js`

```javascript
// ✅ EMAIL EVENTS ALREADY MONITORED

mon.recordActivity({
  type: 'email',
  label: 'Email Sent' | 'Email Failed' | 'Email Skipped',
  detail: `To: ${to} | ${subject}`,
  level: 'success' | 'error' | 'info',
  meta: { to, subject }
});
```

**Socket.IO:** Real-time broadcast to monitor dashboard

---

### 9.2 Email Portal Monitoring

**Add these events:**
- Campaign created
- Campaign scheduled
- Campaign sent
- Bulk send initiated
- Template created/updated
- Automation triggered
- Suppression list updated
- Large audience warning

---

## 10. SECURITY CONSIDERATIONS

### 10.1 Existing Security

✅ JWT authentication  
✅ CORS protection  
✅ Input sanitization (`backend/middleware/sanitize.js`)  
✅ SQL injection protection (parameterized queries)  
✅ Rate limiting (`backend/middleware/rateLimiter.js`)  
✅ Role-based access control  
✅ Password hashing (bcrypt)  
✅ HTTPS in production  

---

### 10.2 Email Portal Security

**Required:**
- ✅ Server-side authorization on all email endpoints
- ✅ Validate sender permissions
- ✅ Prevent BCC disclosure
- ✅ Suppress list enforcement
- ✅ Large send confirmation
- ✅ Audit logging for sensitive actions
- ✅ File upload validation (attachments)
- ✅ XSS protection in email composer
- ✅ CSRF protection for state-changing operations
- ✅ Email content scanning (if needed)

**Do NOT:**
- ❌ Expose RESEND_API_KEY to frontend
- ❌ Allow unauthenticated email sending
- ❌ Bypass suppression lists
- ❌ Allow arbitrary sender spoofing
- ❌ Store passwords in email logs
- ❌ Expose BCC recipients

---

## 11. PERFORMANCE OPTIMIZATION

### 11.1 Database

- Use indexes on email_sent (recipient, campaign, thread, status)
- Paginate email lists (50-100 per page)
- Use connection pooling (already configured)
- Archive old campaigns (> 1 year)
- Aggregate analytics data (daily/weekly rollups)

---

### 11.2 Frontend

- Virtual scrolling for large email lists
- Lazy load email content
- Debounce search inputs
- Cache template list
- Optimize rich editor performance
- Use React.memo for list items
- Implement infinite scroll for inbox

---

### 11.3 Email Sending

- Batch processing (10 per batch - already implemented)
- Queue large campaigns
- Retry failed sends with exponential backoff
- Rate limiting per Resend API limits
- Throttle automation triggers

---

## 12. MIGRATION PLAN

### Step 1: Extend Database Schema
Run migration to create email portal tables (Phase 2)

### Step 2: Add Backend API Routes
Create new controllers and routes (Phase 3)

### Step 3: Build Frontend Foundation
Initialize email-portal directory (Phase 4)

### Step 4: Core Features
Composer, inbox, templates (Phases 5-7)

### Step 5: Advanced Features
Campaigns, automation, analytics (Phases 8-13)

### Step 6: Security & Testing
RBAC, audit, testing (Phases 14-15)

### Step 7: Production Deployment
mail.norenfastion.shop subdomain

---

## 13. TIMELINE ESTIMATE

**Phase 1:** Architecture Audit ✅ COMPLETE  
**Phase 2:** Database Schema - 2 hours  
**Phase 3:** Backend APIs - 8 hours  
**Phase 4:** Frontend Foundation - 4 hours  
**Phase 5:** Email Composer - 6 hours  
**Phase 6:** Templates - 6 hours  
**Phase 7:** Inbox/Threading - 6 hours  
**Phase 8:** Campaign Builder - 8 hours  
**Phase 9:** Bulk Email Safety - 4 hours  
**Phase 10:** Contact Management - 6 hours  
**Phase 11:** Specialized Communication - 4 hours  
**Phase 12:** Automation - 8 hours  
**Phase 13:** Analytics - 6 hours  
**Phase 14:** Security & RBAC - 4 hours  
**Phase 15:** Testing & Deployment - 6 hours  

**Total:** ~78 hours (10-12 days of development)

---

## 14. RISK ASSESSMENT

### LOW RISK ✅
- Extending existing backend
- Reusing authentication system
- Reusing email infrastructure
- Database migrations

### MEDIUM RISK ⚠️
- Email threading implementation
- Large campaign performance
- Analytics accuracy
- Cross-portal integration

### HIGH RISK 🔴
- Suppression list enforcement (compliance)
- Bulk send confirmation UX
- Rate limiting vs. Resend API limits
- Email deliverability monitoring

**Mitigation:** Strict testing, gradual rollout, admin-only access initially

---

## 15. SUCCESS CRITERIA

### Phase 1 Complete ✅
- [x] Architecture audit document created
- [x] Integration map defined
- [x] Existing infrastructure analyzed
- [x] Database schema planned
- [x] API endpoints planned
- [x] Security considerations documented
- [x] Deployment strategy defined

### Final Acceptance Criteria (All Phases)
- [ ] Uses existing NOREN backend
- [ ] No duplicate customer database
- [ ] Individual emails work
- [ ] Inbox & threads work
- [ ] 5+ professional templates exist
- [ ] Bulk email with safeguards works
- [ ] Campaign scheduling works
- [ ] Audience segmentation works
- [ ] Suppression list works
- [ ] Analytics show real data
- [ ] RBAC enforced server-side
- [ ] Audit logging works
- [ ] Portal deployable to mail.norenfastion.shop
- [ ] Existing website unaffected

---

## CONCLUSION

The NOREN platform has a solid foundation for an enterprise Email Operations Portal. By extending the existing backend rather than creating duplicate infrastructure, we ensure:

1. **Single source of truth** for customer data
2. **Consistent authentication** across portals
3. **Unified monitoring** and logging
4. **Reduced complexity** and maintenance burden
5. **Production-ready** email infrastructure

**Ready to proceed to Phase 2: Database Schema Extensions**

---

**Document Version:** 1.0  
**Last Updated:** Phase 1 Complete  
**Next Phase:** Database Schema Design & Migration Scripts

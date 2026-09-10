# NOREN EMAIL PORTAL - DATABASE SCHEMA DOCUMENTATION

**Version:** 1.0  
**Migration File:** `007_create_email_portal_tables.sql`  
**Tables Created:** 12 tables  
**Indexes Created:** 50+ indexes  

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Table Relationships](#table-relationships)
3. [Table Definitions](#table-definitions)
4. [Indexes](#indexes)
5. [Data Types & Constraints](#data-types--constraints)
6. [Usage Examples](#usage-examples)

---

## OVERVIEW

The Email Portal database schema extends the existing NOREN infrastructure **without duplicating master tables**. It reuses:

- ✅ `src_users` (authentication, user profiles)
- ✅ `src_newsletter_subscribers` (newsletter subscriptions)
- ✅ `src_erp_customers` (customer data)
- ✅ `src_sellers` (seller accounts)
- ✅ `src_influencers` (influencer accounts)
- ✅ `src_erp_employees` (employee records)

**New Tables Added:** 12 email-specific tables for templates, campaigns, automation, and tracking.

---

## TABLE RELATIONSHIPS

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EMAIL PORTAL SCHEMA                          │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   src_users     │ (EXISTING - REUSED)
                    │  (master table) │
                    └────────┬────────┘
                            │
        ┏━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━┓
        ┃                                        ┃
  ┌─────▼──────┐                       ┌────────▼────────┐
  │ src_email_ │                       │  src_email_     │
  │ templates  │◄──────────────────────┤  campaigns      │
  └────────────┘                       └────────┬────────┘
        │                                       │
        │                              ┌────────▼────────┐
        │                              │  src_email_     │
        │                              │  campaign_      │
        │                              │  recipients     │
        │                              └─────────────────┘
        │
        │                              ┌─────────────────┐
        ├──────────────────────────────►  src_email_     │
        │                              │  sent           │◄───┐
        │                              └────────┬────────┘    │
        │                                       │             │
        │                                       │ (threading) │
        │                              ┌────────▼────────┐    │
        ├──────────────────────────────►  src_email_     │    │
        │                              │  drafts         │    │
        │                              └─────────────────┘    │
        │                                                     │
        │                              ┌─────────────────┐    │
        ├──────────────────────────────►  src_email_     │    │
        │                              │  automations    │    │
        │                              └────────┬────────┘    │
        │                                       │             │
        │                              ┌────────▼────────┐    │
        │                              │  src_email_     │    │
        │                              │  automation_    │────┘
        │                              │  logs           │
        │                              └─────────────────┘
        │
        │                              ┌─────────────────┐
        │                              │  src_email_     │
        │                              │  segments       │
        │                              └─────────────────┘
        │
        │                              ┌─────────────────┐
        │                              │  src_email_     │
        │                              │  suppression    │
        │                              └─────────────────┘
        │
        │                              ┌─────────────────┐
        │                              │  src_email_     │
        │                              │  sender_        │
        │                              │  identities     │
        │                              └─────────────────┘
        │
        │                              ┌─────────────────┐
        └──────────────────────────────►  src_email_     │
                                       │  audit          │
                                       └─────────────────┘
```

---

## TABLE DEFINITIONS

### 1. src_email_templates

**Purpose:** Reusable email templates with variables

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| name | TEXT NOT NULL | Template display name |
| slug | TEXT UNIQUE NOT NULL | URL-safe identifier |
| category | TEXT NOT NULL | customer_support, marketing, product, etc. |
| subject | TEXT NOT NULL | Email subject line |
| body_html | TEXT NOT NULL | HTML email body |
| body_plain | TEXT | Plain text version |
| preview_text | TEXT | Email preview/preheader text |
| variables | JSONB | Array of variable names, e.g. ["first_name", "order_id"] |
| thumbnail_url | TEXT | Template preview image |
| is_system | BOOLEAN | System templates cannot be deleted |
| is_active | BOOLEAN | Active/archived status |
| created_by | INTEGER FK → src_users | Creator user ID |
| updated_by | INTEGER FK → src_users | Last editor user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Categories:**
- `customer_support` - Support/help emails
- `marketing` - Marketing campaigns
- `product` - Product announcements
- `transactional` - Order confirmations, receipts
- `recruitment` - Job/vacancy emails
- `seller` - Seller communications
- `influencer` - Influencer campaigns
- `internal` - Internal team communications
- `newsletter` - Newsletter formats
- `other` - Custom templates

**Example:**
```json
{
  "name": "Order Confirmation",
  "slug": "order-confirmation",
  "category": "transactional",
  "subject": "Your NOREN Order #{{order_id}} is Confirmed",
  "variables": ["customer_name", "order_id", "order_total", "items"]
}
```

---

### 2. src_email_drafts

**Purpose:** Auto-saved drafts for all email types

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| user_id | INTEGER FK → src_users | Draft owner |
| draft_type | TEXT | individual, campaign, automation |
| subject | TEXT | Email subject |
| body_html | TEXT | HTML content |
| body_plain | TEXT | Plain text content |
| recipients | JSONB | Array of recipients [{email, name, type}] |
| cc | JSONB | CC recipients |
| bcc | JSONB | BCC recipients |
| sender_identity | TEXT | Selected sender email |
| reply_to | TEXT | Reply-to address |
| template_id | INTEGER FK → src_email_templates | Associated template |
| attachments | JSONB | Array of attachments [{filename, url, size}] |
| scheduled_at | TIMESTAMPTZ | Scheduled send time |
| campaign_id | INTEGER | Associated campaign ID |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Auto-save timestamp |

**Draft Types:**
- `individual` - Single email drafts
- `campaign` - Campaign drafts
- `automation` - Automation email drafts

---

### 3. src_email_sent

**Purpose:** Complete history of all sent emails with tracking

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| user_id | INTEGER FK → src_users | Sender user ID |
| sender_email | TEXT NOT NULL | From email address |
| sender_name | TEXT | From display name |
| recipient_email | TEXT NOT NULL | To email address |
| recipient_name | TEXT | To display name |
| recipient_type | TEXT | customer, seller, influencer, etc. |
| cc | TEXT[] | CC addresses |
| bcc | TEXT[] | BCC addresses |
| subject | TEXT NOT NULL | Email subject |
| body_html | TEXT NOT NULL | HTML content |
| body_plain | TEXT | Plain text content |
| template_id | INTEGER FK → src_email_templates | Template used |
| campaign_id | INTEGER | Campaign ID if part of campaign |
| parent_email_id | INTEGER FK → src_email_sent | Parent email for replies |
| thread_id | TEXT | Conversation thread identifier |
| email_type | TEXT | individual, campaign, automation, etc. |
| status | TEXT | sent, delivered, opened, clicked, etc. |
| provider_id | TEXT | Email ID from Resend |
| provider_response | JSONB | Response from email provider |
| opened_at | TIMESTAMPTZ | First open timestamp |
| clicked_at | TIMESTAMPTZ | First click timestamp |
| bounced_at | TIMESTAMPTZ | Bounce timestamp |
| complained_at | TIMESTAMPTZ | Complaint timestamp |
| delivered_at | TIMESTAMPTZ | Delivery timestamp |
| metadata | JSONB | Additional metadata |
| sent_at | TIMESTAMPTZ | Send timestamp |

**Email Types:**
- `individual` - One-off emails
- `campaign` - Campaign emails
- `automation` - Automated emails
- `transactional` - Order/system emails
- `reply` - Reply to existing email
- `forward` - Forwarded email

**Statuses:**
- `sent` - Successfully sent
- `delivered` - Delivered to inbox
- `opened` - Email opened
- `clicked` - Link clicked
- `bounced` - Hard/soft bounce
- `failed` - Send failed
- `complained` - Spam complaint

---

### 4. src_email_campaigns

**Purpose:** Enhanced marketing campaigns with approval workflow

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| name | TEXT NOT NULL | Campaign internal name |
| description | TEXT | Campaign description |
| campaign_type | TEXT | marketing, promotional, newsletter, etc. |
| subject | TEXT NOT NULL | Email subject |
| preview_text | TEXT | Email preview/preheader |
| body_html | TEXT NOT NULL | HTML content |
| body_plain | TEXT | Plain text content |
| template_id | INTEGER FK → src_email_templates | Template used |
| sender_email | TEXT NOT NULL | From address |
| sender_name | TEXT | From name |
| reply_to | TEXT | Reply-to address |
| audience_type | TEXT NOT NULL | all_users, customers, segment, etc. |
| audience_filter | JSONB | Dynamic filter rules |
| segment_id | INTEGER | Segment ID if using segment |
| custom_recipient_list | JSONB | Array of emails for custom_list type |
| status | TEXT | draft, scheduled, sending, completed, etc. |
| scheduled_at | TIMESTAMPTZ | Scheduled send time |
| started_at | TIMESTAMPTZ | Campaign start time |
| completed_at | TIMESTAMPTZ | Campaign completion time |
| total_recipients | INTEGER | Total recipient count |
| sent_count | INTEGER | Successfully sent |
| delivered_count | INTEGER | Successfully delivered |
| opened_count | INTEGER | Unique opens |
| clicked_count | INTEGER | Unique clicks |
| bounced_count | INTEGER | Bounces |
| failed_count | INTEGER | Failed sends |
| unsubscribed_count | INTEGER | Unsubscribes from this campaign |
| complained_count | INTEGER | Spam complaints |
| metadata | JSONB | Additional metadata |
| created_by | INTEGER FK → src_users | Creator |
| approved_by | INTEGER FK → src_users | Approver |
| approved_at | TIMESTAMPTZ | Approval timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Campaign Types:**
- `marketing` - General marketing
- `promotional` - Sales/offers
- `transactional` - System emails
- `newsletter` - Regular newsletter
- `product_launch` - New products
- `recruitment` - Job vacancies
- `seller_announcement` - Seller updates
- `influencer_campaign` - Influencer outreach
- `customer_lifecycle` - Onboarding/re-engagement
- `other` - Custom campaigns

**Audience Types:**
- `all_users` - All registered users
- `customers` - Customers only
- `subscribers` - Newsletter subscribers
- `sellers` - Seller accounts
- `influencers` - Influencer accounts
- `employees` - Employee accounts
- `applicants` - Job applicants
- `segment` - Dynamic segment
- `custom_list` - Custom email list
- `specific_user` - Single recipient

**Statuses:**
- `draft` - Being created
- `pending_approval` - Awaiting approval
- `approved` - Approved, ready to send
- `scheduled` - Scheduled for future
- `sending` - Currently sending
- `sent` - Sending complete
- `completed` - Campaign finished
- `paused` - Paused during sending
- `cancelled` - Cancelled
- `failed` - Campaign failed

---

### 5. src_email_segments

**Purpose:** Reusable audience segments with dynamic filtering

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| name | TEXT NOT NULL | Segment name |
| description | TEXT | Segment description |
| segment_type | TEXT | customers, subscribers, sellers, etc. |
| filter_rules | JSONB NOT NULL | Filter configuration |
| is_dynamic | BOOLEAN | Recalculate on each use |
| recipient_count | INTEGER | Cached recipient count |
| last_calculated_at | TIMESTAMPTZ | Last calculation timestamp |
| is_active | BOOLEAN | Active/archived status |
| created_by | INTEGER FK → src_users | Creator |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Segment Types:**
- `customers` - Customer segments
- `subscribers` - Newsletter segments
- `sellers` - Seller segments
- `influencers` - Influencer segments
- `employees` - Employee segments
- `applicants` - Applicant segments
- `custom` - Custom segments
- `dynamic` - Dynamic rule-based

**Filter Rules Example:**
```json
{
  "conditions": [
    {"field": "role", "operator": "equals", "value": "customer"},
    {"field": "orders_count", "operator": "greater_than", "value": 5},
    {"field": "created_at", "operator": "after", "value": "2024-01-01"}
  ],
  "logic": "AND"
}
```

---

### 6. src_email_suppression

**Purpose:** Global suppression list - never send to these addresses

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| email | TEXT NOT NULL UNIQUE | Suppressed email address |
| reason | TEXT NOT NULL | Reason for suppression |
| suppression_type | TEXT NOT NULL | unsubscribed, bounced, complained, etc. |
| source | TEXT | Where suppression came from |
| campaign_id | INTEGER | Campaign that caused suppression |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Suppression timestamp |

**Suppression Types:**
- `unsubscribed` - User unsubscribed
- `bounced` - Hard bounce
- `complained` - Spam complaint
- `invalid` - Invalid email address
- `manual` - Manually added
- `global` - Platform-wide block

---

### 7. src_email_automations

**Purpose:** Automated email workflows triggered by events

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| name | TEXT NOT NULL | Automation name |
| description | TEXT | Automation description |
| trigger_type | TEXT NOT NULL | user_registered, order_completed, etc. |
| trigger_config | JSONB NOT NULL | Trigger configuration |
| conditions | JSONB | Additional conditions |
| template_id | INTEGER FK → src_email_templates | Template to use |
| subject | TEXT NOT NULL | Email subject |
| body_html | TEXT NOT NULL | HTML content |
| body_plain | TEXT | Plain text content |
| sender_email | TEXT | From address |
| sender_name | TEXT | From name |
| delay_minutes | INTEGER | Delay before sending |
| is_active | BOOLEAN | Active/paused status |
| last_executed_at | TIMESTAMPTZ | Last trigger timestamp |
| execution_count | INTEGER | Total executions |
| success_count | INTEGER | Successful sends |
| failure_count | INTEGER | Failed sends |
| metadata | JSONB | Additional metadata |
| created_by | INTEGER FK → src_users | Creator |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Trigger Types:**
- `user_registered` - New user signup
- `order_completed` - Order placed
- `order_delivered` - Order delivered
- `order_cancelled` - Order cancelled
- `cart_abandoned` - Abandoned cart
- `customer_subscribed` - Newsletter signup
- `seller_registered` - New seller
- `seller_approved` - Seller approved
- `influencer_registered` - New influencer
- `employee_created` - New employee
- `applicant_applied` - Job application
- `support_ticket_resolved` - Ticket closed
- `time_based` - Scheduled trigger
- `manual` - Manual trigger
- `webhook` - External webhook
- `api` - API trigger

---

### 8. src_email_automation_logs

**Purpose:** Execution history for automations

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| automation_id | INTEGER FK → src_email_automations | Automation ID |
| trigger_data | JSONB | Data that triggered execution |
| recipient_email | TEXT NOT NULL | Recipient address |
| recipient_name | TEXT | Recipient name |
| status | TEXT NOT NULL | pending, sent, failed, skipped |
| email_id | INTEGER FK → src_email_sent | Sent email ID |
| skip_reason | TEXT | Why email was skipped |
| error_message | TEXT | Error if failed |
| metadata | JSONB | Additional context |
| executed_at | TIMESTAMPTZ | Execution timestamp |

---

### 9. src_email_audit

**Purpose:** Immutable audit trail for all email portal operations

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| user_id | INTEGER FK → src_users | User who performed action |
| action | TEXT NOT NULL | Action performed |
| resource_type | TEXT NOT NULL | email, campaign, template, etc. |
| resource_id | INTEGER | ID of affected resource |
| details | JSONB | Action details, before/after |
| ip_address | TEXT | User IP address |
| user_agent | TEXT | User browser/client |
| created_at | TIMESTAMPTZ | Action timestamp |

**Resource Types:**
- `email` - Individual emails
- `campaign` - Campaigns
- `template` - Templates
- `segment` - Segments
- `automation` - Automations
- `suppression` - Suppression list
- `draft` - Drafts
- `settings` - Settings changes
- `sender_identity` - Sender identities

---

### 10. src_email_sender_identities

**Purpose:** Verified sender email addresses

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| name | TEXT NOT NULL | Sender name |
| email | TEXT NOT NULL UNIQUE | Sender email address |
| reply_to | TEXT | Reply-to address |
| identity_type | TEXT | verified, domain, system |
| is_default | BOOLEAN | Default sender |
| is_active | BOOLEAN | Active status |
| verification_status | TEXT | pending, verified, failed |
| verification_token | TEXT | Verification token |
| verified_at | TIMESTAMPTZ | Verification timestamp |
| metadata | JSONB | Additional metadata |
| created_by | INTEGER FK → src_users | Creator |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Identity Types:**
- `verified` - Single verified email
- `domain` - Entire domain verified
- `system` - Built-in system identity

**Default Identities:**
1. `NOREN <noreply@norenfastion.shop>` (default, verified)
2. `NOREN Support <supportnoren1@gmail.com>` (verified)
3. `NOREN Marketing <marketing@norenfastion.shop>` (pending)
4. `NOREN HR <hr@norenfastion.shop>` (pending)

---

### 11. src_email_campaign_recipients

**Purpose:** Individual recipient tracking for campaigns

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique identifier |
| campaign_id | INTEGER FK → src_email_campaigns | Campaign ID |
| email_id | INTEGER FK → src_email_sent | Sent email ID |
| recipient_email | TEXT NOT NULL | Recipient address |
| recipient_name | TEXT | Recipient name |
| recipient_type | TEXT | customer, seller, etc. |
| status | TEXT | pending, sent, delivered, etc. |
| skip_reason | TEXT | Why skipped |
| sent_at | TIMESTAMPTZ | Send timestamp |
| delivered_at | TIMESTAMPTZ | Delivery timestamp |
| opened_at | TIMESTAMPTZ | Open timestamp |
| clicked_at | TIMESTAMPTZ | Click timestamp |
| bounced_at | TIMESTAMPTZ | Bounce timestamp |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## INDEXES

### Performance Indexes Created:

**src_email_templates:**
- `idx_email_templates_category` ON (category)
- `idx_email_templates_slug` ON (slug)
- `idx_email_templates_active` ON (is_active)

**src_email_drafts:**
- `idx_email_drafts_user` ON (user_id)
- `idx_email_drafts_type` ON (draft_type)
- `idx_email_drafts_updated` ON (updated_at)

**src_email_sent:**
- `idx_email_sent_recipient` ON (recipient_email)
- `idx_email_sent_sender` ON (sender_email)
- `idx_email_sent_campaign` ON (campaign_id)
- `idx_email_sent_thread` ON (thread_id)
- `idx_email_sent_status` ON (status)
- `idx_email_sent_type` ON (email_type)
- `idx_email_sent_date` ON (sent_at)
- `idx_email_sent_user` ON (user_id)

**src_email_campaigns:**
- `idx_email_campaigns_status` ON (status)
- `idx_email_campaigns_type` ON (campaign_type)
- `idx_email_campaigns_audience` ON (audience_type)
- `idx_email_campaigns_created_by` ON (created_by)
- `idx_email_campaigns_scheduled` ON (scheduled_at)
- `idx_email_campaigns_created` ON (created_at)

**src_email_segments:**
- `idx_email_segments_type` ON (segment_type)
- `idx_email_segments_active` ON (is_active)
- `idx_email_segments_created_by` ON (created_by)

**src_email_suppression:**
- `idx_email_suppression_email` ON (email)
- `idx_email_suppression_type` ON (suppression_type)
- `idx_email_suppression_created` ON (created_at)

**src_email_automations:**
- `idx_email_automations_trigger` ON (trigger_type)
- `idx_email_automations_active` ON (is_active)
- `idx_email_automations_created_by` ON (created_by)

**src_email_automation_logs:**
- `idx_email_automation_logs_automation` ON (automation_id)
- `idx_email_automation_logs_status` ON (status)
- `idx_email_automation_logs_recipient` ON (recipient_email)
- `idx_email_automation_logs_executed` ON (executed_at)

**src_email_audit:**
- `idx_email_audit_user` ON (user_id)
- `idx_email_audit_action` ON (action)
- `idx_email_audit_resource` ON (resource_type, resource_id)
- `idx_email_audit_created` ON (created_at)

**src_email_sender_identities:**
- `idx_sender_identities_email` ON (email)
- `idx_sender_identities_active` ON (is_active)
- `idx_sender_identities_default` ON (is_default)

**src_email_campaign_recipients:**
- `idx_campaign_recipients_campaign` ON (campaign_id)
- `idx_campaign_recipients_email` ON (recipient_email)
- `idx_campaign_recipients_status` ON (status)

---

## DATA TYPES & CONSTRAINTS

### CHECK Constraints:

1. **src_email_templates.category:** Limited to predefined categories
2. **src_email_drafts.draft_type:** individual, campaign, automation
3. **src_email_sent.email_type:** individual, campaign, automation, transactional, reply, forward
4. **src_email_sent.status:** sent, delivered, opened, clicked, bounced, failed, complained
5. **src_email_campaigns.campaign_type:** 10 predefined campaign types
6. **src_email_campaigns.audience_type:** 10 audience targeting options
7. **src_email_campaigns.status:** 10 campaign lifecycle statuses
8. **src_email_segments.segment_type:** 8 segment types
9. **src_email_suppression.suppression_type:** 6 suppression reasons
10. **src_email_automations.trigger_type:** 18 trigger event types
11. **src_email_automation_logs.status:** pending, sent, failed, skipped
12. **src_email_audit.resource_type:** 9 resource types
13. **src_email_sender_identities.identity_type:** verified, domain, system
14. **src_email_sender_identities.verification_status:** pending, verified, failed
15. **src_email_campaign_recipients.status:** 8 recipient statuses

### Foreign Key Relationships:

- All `user_id` columns → `src_users(id)`
- All `template_id` columns → `src_email_templates(id)`
- `campaign_id` → `src_email_campaigns(id)`
- `automation_id` → `src_email_automations(id)`
- `parent_email_id` → `src_email_sent(id)`
- `email_id` → `src_email_sent(id)`

### Automatic Triggers:

- `update_email_templates_timestamp` - Auto-update updated_at
- `update_email_drafts_timestamp` - Auto-update updated_at
- `update_email_campaigns_timestamp` - Auto-update updated_at
- `update_email_segments_timestamp` - Auto-update updated_at
- `update_email_automations_timestamp` - Auto-update updated_at
- `update_sender_identities_timestamp` - Auto-update updated_at

---

## USAGE EXAMPLES

### Example 1: Create Email Template

```sql
INSERT INTO src_email_templates (
  name, slug, category, subject, body_html, variables, 
  is_system, created_by
) VALUES (
  'Welcome Email',
  'welcome-email',
  'marketing',
  'Welcome to NOREN, {{first_name}}!',
  '<html>...</html>',
  '["first_name", "email"]',
  false,
  1
);
```

### Example 2: Save Email Draft

```sql
INSERT INTO src_email_drafts (
  user_id, draft_type, subject, body_html, 
  recipients, template_id
) VALUES (
  1,
  'individual',
  'Thank you for your order',
  '<html>...</html>',
  '[{"email": "customer@example.com", "name": "John Doe"}]',
  5
);
```

### Example 3: Record Sent Email

```sql
INSERT INTO src_email_sent (
  user_id, sender_email, sender_name, 
  recipient_email, recipient_name, recipient_type,
  subject, body_html, email_type, 
  status, provider_id
) VALUES (
  1,
  'noreply@norenfastion.shop',
  'NOREN',
  'customer@example.com',
  'John Doe',
  'customer',
  'Your order is confirmed',
  '<html>...</html>',
  'transactional',
  'sent',
  'resend_email_id_123'
);
```

### Example 4: Create Campaign

```sql
INSERT INTO src_email_campaigns (
  name, campaign_type, subject, body_html,
  sender_email, sender_name, audience_type,
  status, created_by
) VALUES (
  'Summer Sale 2026',
  'promotional',
  '50% Off Summer Collection',
  '<html>...</html>',
  'marketing@norenfastion.shop',
  'NOREN Marketing',
  'subscribers',
  'draft',
  1
);
```

### Example 5: Add to Suppression List

```sql
INSERT INTO src_email_suppression (
  email, reason, suppression_type, source
) VALUES (
  'unsubscribe@example.com',
  'User requested unsubscribe',
  'unsubscribed',
  'campaign_123'
);
```

### Example 6: Create Automation

```sql
INSERT INTO src_email_automations (
  name, trigger_type, trigger_config,
  subject, body_html, template_id,
  is_active, created_by
) VALUES (
  'Welcome New Customers',
  'user_registered',
  '{"role": "customer"}',
  'Welcome to NOREN!',
  '<html>...</html>',
  3,
  true,
  1
);
```

### Example 7: Query Email Thread

```sql
SELECT 
  id, subject, sender_email, recipient_email, 
  email_type, sent_at
FROM src_email_sent
WHERE thread_id = 'thread_abc123'
ORDER BY sent_at ASC;
```

### Example 8: Campaign Analytics

```sql
SELECT 
  id, name, status,
  total_recipients,
  sent_count,
  delivered_count,
  opened_count,
  ROUND(opened_count::numeric / NULLIF(delivered_count, 0) * 100, 2) as open_rate,
  clicked_count,
  ROUND(clicked_count::numeric / NULLIF(delivered_count, 0) * 100, 2) as click_rate,
  bounced_count,
  unsubscribed_count
FROM src_email_campaigns
WHERE status = 'completed'
ORDER BY created_at DESC;
```

### Example 9: Check Suppression Before Sending

```sql
SELECT EXISTS (
  SELECT 1 FROM src_email_suppression 
  WHERE email = 'test@example.com'
) as is_suppressed;
```

### Example 10: Audit Trail Query

```sql
SELECT 
  a.id, a.action, a.resource_type, a.resource_id,
  u.name as user_name, u.email as user_email,
  a.created_at
FROM src_email_audit a
LEFT JOIN src_users u ON u.id = a.user_id
WHERE a.resource_type = 'campaign'
  AND a.resource_id = 123
ORDER BY a.created_at DESC;
```

---

## MIGRATION INSTRUCTIONS

### Run Migration:

```bash
cd backend/migrations
node runEmailPortalMigration.js
```

### Or use general migration runner:

```bash
cd backend/migrations
node runMigrations.js
```

### Verify Tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'src_email%'
ORDER BY table_name;
```

### Check Sender Identities:

```sql
SELECT * FROM src_email_sender_identities;
```

---

## MAINTENANCE

### Archive Old Emails:

```sql
-- Archive emails older than 1 year
DELETE FROM src_email_sent
WHERE sent_at < NOW() - INTERVAL '1 year'
  AND status NOT IN ('failed', 'bounced');
```

### Clean Old Drafts:

```sql
-- Remove drafts not updated in 30 days
DELETE FROM src_email_drafts
WHERE updated_at < NOW() - INTERVAL '30 days';
```

### Vacuum Tables:

```sql
VACUUM ANALYZE src_email_sent;
VACUUM ANALYZE src_email_campaigns;
VACUUM ANALYZE src_email_audit;
```

---

## SECURITY NOTES

1. **Never expose BCC recipients** in queries or APIs
2. **Enforce suppression list** on all marketing sends
3. **Audit sensitive operations** (bulk sends, suppression changes)
4. **Validate sender permissions** server-side
5. **Rate limit** email sending operations
6. **Sanitize HTML** in email bodies
7. **Validate email addresses** before sending
8. **Log all campaign sends** for compliance

---

## NEXT STEPS

1. ✅ Migration complete
2. → Create backend API controllers
3. → Implement email service wrapper
4. → Build frontend email portal
5. → Test email sending
6. → Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** Phase 2 Complete  
**Next Phase:** Backend API Endpoints

# Integration Testing Guide - VENDEXA RetailOS™ × NOREN

## Overview

Comprehensive testing guide for the POS integration, covering all critical workflows from device registration to customer invoice viewing. This guide ensures the integration is production-ready.

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Layers                           │
├─────────────────────────────────────────────────────────────┤
│  1. Unit Tests         → Individual components              │
│  2. Integration Tests  → API endpoints & services           │
│  3. E2E Tests          → Complete user workflows            │
│  4. Security Tests     → Auth, rate limiting, validation    │
│  5. Performance Tests  → Load testing & benchmarks          │
│  6. Manual Tests       → User acceptance testing            │
└─────────────────────────────────────────────────────────────┘
```

## Critical Workflows

### Workflow 1: Device Registration & Authentication

**Objective:** Register a new POS device and authenticate successfully

**Steps:**
1. Admin registers device via web dashboard
2. Device receives API key (shown once)
3. Device authenticates with API key
4. Backend validates and activates device
5. Device status updates to "active"

**Test Script:**
```bash
#!/bin/bash

# 1. Register device (requires admin JWT token)
REGISTER_RESPONSE=$(curl -X POST http://localhost:5000/api/erp/pos/integration/devices/register \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_name": "Test POS Device 1",
    "device_fingerprint": "test-device-fp-001",
    "store_id": 1
  }')

echo "Register Response: $REGISTER_RESPONSE"

# Extract API key from response
API_KEY=$(echo $REGISTER_RESPONSE | jq -r '.api_key')
DEVICE_ID=$(echo $REGISTER_RESPONSE | jq -r '.device.id')

echo "Device ID: $DEVICE_ID"
echo "API Key: $API_KEY"

# 2. Authenticate device
AUTH_RESPONSE=$(curl -X POST http://localhost:5000/api/erp/pos/integration/devices/authenticate \
  -H "Content-Type: application/json" \
  -d "{
    \"device_fingerprint\": \"test-device-fp-001\",
    \"api_key\": \"$API_KEY\"
  }")

echo "Auth Response: $AUTH_RESPONSE"

# Expected: 200 OK with success message
```

**Expected Results:**
- ✅ Registration returns 201 with device details and API key
- ✅ API key is 32+ characters
- ✅ Authentication returns 200 with success message
- ✅ Device status is "active" in database

**Validation Queries:**
```sql
-- Check device was created
SELECT id, device_name, status, api_key_prefix, created_at 
FROM src_pos_devices 
WHERE device_fingerprint = 'test-device-fp-001';

-- Check audit log
SELECT event_type, details, created_at 
FROM src_pos_audit_events 
WHERE device_id = $DEVICE_ID 
ORDER BY created_at DESC;
```

### Workflow 2: Invoice Sync with QR Code Generation

**Objective:** Sync invoice from POS to backend and generate QR code

**Steps:**
1. POS creates invoice locally
2. Invoice queued in sync queue
3. Background worker syncs to backend
4. Backend stores invoice and generates token
5. QR code URL returned
6. Email receipt sent (if customer email provided)

**Test Script:**
```bash
#!/bin/bash

# Generate idempotency key (UUID v4)
IDEMPOTENCY_KEY=$(uuidgen)
TIMESTAMP=$(date +%s000)

# Sync invoice
SYNC_RESPONSE=$(curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: $TIMESTAMP" \
  -d "{
    \"idempotency_key\": \"$IDEMPOTENCY_KEY\",
    \"device_id\": $DEVICE_ID,
    \"bill_no\": \"INV-TEST-001\",
    \"items\": [
      {
        \"inventory_item_id\": 1,
        \"title\": \"Test Product\",
        \"sku\": \"TEST-001\",
        \"quantity\": 2,
        \"unit_price\": 100.00,
        \"line_total\": 200.00
      }
    ],
    \"payment_method\": \"cash\",
    \"total\": 200.00,
    \"tax_amount\": 0,
    \"discount_amount\": 0,
    \"customer_email\": \"test@example.com\",
    \"customer_name\": \"Test Customer\",
    \"created_at\": \"$(date -Iseconds)\"
  }")

echo "Sync Response: $SYNC_RESPONSE"

# Extract token
PUBLIC_TOKEN=$(echo $SYNC_RESPONSE | jq -r '.public_token')
PUBLIC_URL=$(echo $SYNC_RESPONSE | jq -r '.public_url')

echo "Public Token: $PUBLIC_TOKEN"
echo "Public URL: $PUBLIC_URL"

# Expected: 201 Created with sale_id, public_token, and public_url
```

**Expected Results:**
- ✅ Sync returns 201 with sale ID and token
- ✅ Token is unique and not previously used
- ✅ Public URL is accessible
- ✅ Email sent to customer (check logs)
- ✅ Invoice stored in src_erp_sales table
- ✅ Token stored in src_pos_invoice_tokens table

**Validation Queries:**
```sql
-- Check invoice was synced
SELECT id, bill_no, total, status, payment_status, created_at 
FROM src_erp_sales 
WHERE bill_no = 'INV-TEST-001';

-- Check token was generated
SELECT id, sale_id, token_prefix, created_at 
FROM src_pos_invoice_tokens 
WHERE sale_id = (SELECT id FROM src_erp_sales WHERE bill_no = 'INV-TEST-001');

-- Check sync queue (should be empty or marked as synced)
SELECT id, status, entity_id, created_at, synced_at 
FROM src_pos_sync_queue 
WHERE entity_id = 'INV-TEST-001';
```

### Workflow 3: Customer Views Digital Invoice via QR Code

**Objective:** Customer scans QR code and views digital invoice

**Steps:**
1. Customer scans QR code from receipt
2. Browser opens public invoice URL
3. Backend validates token
4. Invoice details displayed
5. Access logged for analytics

**Test Script:**
```bash
#!/bin/bash

# Access public invoice (no authentication required)
PUBLIC_RESPONSE=$(curl -X GET "http://localhost:5000/api/invoices/public/$PUBLIC_TOKEN" \
  -H "Accept: application/json")

echo "Public Invoice Response: $PUBLIC_RESPONSE"

# Verify invoice data
INVOICE_NUMBER=$(echo $PUBLIC_RESPONSE | jq -r '.invoice.bill_no')
INVOICE_TOTAL=$(echo $PUBLIC_RESPONSE | jq -r '.invoice.total')

echo "Invoice Number: $INVOICE_NUMBER"
echo "Total: $INVOICE_TOTAL"

# Expected: 200 OK with complete invoice details
```

**Expected Results:**
- ✅ Response returns 200 with invoice data
- ✅ Invoice number matches original
- ✅ Total amount correct
- ✅ Items array populated
- ✅ Customer name displayed
- ✅ QR code URL included
- ✅ Access logged in audit table

**Validation Queries:**
```sql
-- Check access log
SELECT COUNT(*) as access_count 
FROM src_pos_invoice_access_log 
WHERE token_hash = (
  SELECT token_hash 
  FROM src_pos_invoice_tokens 
  WHERE token_prefix = SUBSTRING($PUBLIC_TOKEN, 1, 8)
);

-- Should be >= 1
```

### Workflow 4: Offline Sync & Recovery

**Objective:** POS operates offline, then syncs when connection restored

**Steps:**
1. POS creates invoice while offline
2. Invoice queued locally in IndexedDB
3. Background worker detects offline status
4. Network restored
5. Worker detects online status
6. Queue processed automatically
7. All pending invoices synced

**Manual Test (POS App):**
1. Create invoice in POS app
2. Disconnect internet
3. Create 2 more invoices
4. Check sync queue (should show 2 pending)
5. Reconnect internet
6. Wait 30 seconds (default sync interval)
7. Check sync queue (should be empty)
8. Verify invoices in admin dashboard

**Expected Results:**
- ✅ Invoices created offline
- ✅ Queue shows "pending" status
- ✅ Worker auto-detects network restoration
- ✅ All invoices sync successfully
- ✅ No duplicates created
- ✅ Queue cleared after sync

### Workflow 5: Admin Device Management

**Objective:** Admin suspends and reactivates device

**Steps:**
1. Admin opens POS Management dashboard
2. Locates device in list
3. Suspends device
4. Device attempts to sync (should fail)
5. Admin reactivates device
6. Device syncs successfully

**Test Script:**
```bash
#!/bin/bash

# 1. Suspend device
SUSPEND_RESPONSE=$(curl -X PUT "http://localhost:5000/api/erp/pos/integration/devices/$DEVICE_ID/status" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended",
    "notes": "Testing suspension"
  }')

echo "Suspend Response: $SUSPEND_RESPONSE"

# 2. Try to sync with suspended device (should fail)
SYNC_FAIL=$(curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}')

echo "Sync with Suspended Device: $SYNC_FAIL"
# Expected: 403 Forbidden

# 3. Reactivate device
ACTIVATE_RESPONSE=$(curl -X PUT "http://localhost:5000/api/erp/pos/integration/devices/$DEVICE_ID/status" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }')

echo "Activate Response: $ACTIVATE_RESPONSE"

# 4. Sync should work again
SYNC_SUCCESS=$(curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}')

echo "Sync After Reactivation: $SYNC_SUCCESS"
# Expected: 201 Created
```

**Expected Results:**
- ✅ Device suspended successfully
- ✅ Sync attempts rejected with 403
- ✅ Device reactivated successfully
- ✅ Sync works after reactivation
- ✅ All changes logged in audit

### Workflow 6: Token Revocation & Replacement

**Objective:** Admin revokes compromised token and generates new one

**Steps:**
1. Admin identifies compromised token
2. Revokes token via admin dashboard
3. Old token becomes invalid
4. New token generated (optional)
5. Customer attempts to use old token (should fail)
6. New token works correctly

**Test Script:**
```bash
#!/bin/bash

SALE_ID=1

# 1. Revoke token
REVOKE_RESPONSE=$(curl -X POST "http://localhost:5000/api/erp/pos/integration/invoices/$SALE_ID/revoke-token" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Token compromised",
    "generate_replacement": true
  }')

echo "Revoke Response: $REVOKE_RESPONSE"

NEW_TOKEN=$(echo $REVOKE_RESPONSE | jq -r '.new_token')

# 2. Try to access with old token (should fail)
OLD_ACCESS=$(curl -X GET "http://localhost:5000/api/invoices/public/$PUBLIC_TOKEN")

echo "Old Token Access: $OLD_ACCESS"
# Expected: 404 Not Found or 410 Gone

# 3. Access with new token (should work)
NEW_ACCESS=$(curl -X GET "http://localhost:5000/api/invoices/public/$NEW_TOKEN")

echo "New Token Access: $NEW_ACCESS"
# Expected: 200 OK with invoice data
```

**Expected Results:**
- ✅ Old token revoked
- ✅ New token generated
- ✅ Old token access denied
- ✅ New token access granted
- ✅ Revocation logged

### Workflow 7: Rate Limiting & Security

**Objective:** Verify rate limiting prevents abuse

**Steps:**
1. Make legitimate requests (under limit)
2. Exceed rate limit
3. Receive 429 Too Many Requests
4. Wait for window to reset
5. Requests allowed again

**Test Script:**
```bash
#!/bin/bash

echo "Testing rate limiting..."

# Make 100 requests (at limit)
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:5000/api/erp/pos/integration/devices/authenticate \
    -H "Content-Type: application/json" \
    -d '{"device_fingerprint":"test","api_key":"test"}'
done

# These should fail with 429
echo "Exceeding limit..."
for i in {1..10}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST http://localhost:5000/api/erp/pos/integration/devices/authenticate \
    -H "Content-Type: application/json" \
    -d '{"device_fingerprint":"test","api_key":"test"}')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  echo "Request $((100+i)): HTTP $HTTP_CODE"
done

# Expected: HTTP 429 for requests 101-110
```

**Expected Results:**
- ✅ First 100 requests succeed
- ✅ Requests 101-110 return 429
- ✅ Retry-After header present
- ✅ Rate limit violations logged
- ✅ After 60 seconds, requests work again

## Performance Benchmarks

### Response Time Targets

| Endpoint | Target | Maximum |
|----------|--------|---------|
| `/devices/authenticate` | < 50ms | 200ms |
| `/invoices/sync` | < 100ms | 500ms |
| `/invoices/public/:token` | < 80ms | 300ms |
| `/devices` (list) | < 150ms | 1000ms |

### Load Testing

**Using Apache Bench:**
```bash
# Test public invoice endpoint
ab -n 1000 -c 10 http://localhost:5000/api/invoices/public/$TOKEN

# Target: > 100 req/sec, < 100ms avg response time
```

**Using Artillery:**
```yaml
# artillery-test.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Sustained load
scenarios:
  - name: Invoice sync workflow
    flow:
      - post:
          url: '/api/erp/pos/integration/invoices/sync'
          headers:
            Authorization: 'Bearer {{api_key}}'
            Content-Type: 'application/json'
          json:
            idempotency_key: '{{$uuid}}'
            device_id: 1
            bill_no: 'LOAD-TEST-{{$uuid}}'
            items: [...]
            total: 100.00
```

Run: `artillery run artillery-test.yml`

### Database Performance

**Index Verification:**
```sql
-- Check critical indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'src_pos_devices',
  'src_pos_invoice_tokens',
  'src_pos_sync_queue',
  'src_pos_audit_events'
);

-- Should include indexes on:
-- - src_pos_devices: api_key_hash, device_fingerprint, business_id
-- - src_pos_invoice_tokens: token_hash, sale_id
-- - src_pos_sync_queue: device_id, status
-- - src_pos_audit_events: device_id, event_type, created_at
```

## Security Testing

### Authentication Tests

**Test 1: Invalid API Key**
```bash
curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer invalid_key_123" \
  -d '{...}'
# Expected: 403 Forbidden
```

**Test 2: Missing API Key**
```bash
curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -d '{...}'
# Expected: 401 Unauthorized
```

**Test 3: Expired Timestamp**
```bash
curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-Timestamp: 1000000000000" \
  -d '{...}'
# Expected: 400 Bad Request (timestamp too old)
```

### Input Validation Tests

**Test 1: Missing Required Fields**
```bash
curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "device_id": 1,
    "items": []
  }'
# Expected: 400 Bad Request with validation errors
```

**Test 2: Invalid UUID**
```bash
curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "idempotency_key": "not-a-uuid",
    "device_id": 1,
    "items": [{...}],
    "total": 100
  }'
# Expected: 400 Bad Request (invalid UUID)
```

**Test 3: Negative Quantities**
```bash
curl -X POST http://localhost:5000/api/erp/pos/integration/invoices/sync \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "idempotency_key": "'$(uuidgen)'",
    "device_id": 1,
    "items": [{
      "title": "Test",
      "quantity": -5,
      "unit_price": 100,
      "line_total": -500
    }],
    "total": -500
  }'
# Expected: 400 Bad Request (quantity must be positive)
```

## Manual Testing Checklist

### POS App (Desktop)

**Device Setup:**
- [ ] Open Settings → Website Integration
- [ ] Enter backend URL (https://your-api.com)
- [ ] Enter website URL (https://your-site.com)
- [ ] Register device (provides device name)
- [ ] Copy API key (shown once)
- [ ] Save configuration
- [ ] Test connection (should succeed)
- [ ] Check device status (should show "Connected")

**Invoice Creation:**
- [ ] Create invoice in POS app
- [ ] Add customer name and email
- [ ] Complete sale with items
- [ ] Check QR code generated on receipt
- [ ] Verify invoice added to sync queue
- [ ] Wait 30 seconds
- [ ] Check queue cleared (synced)
- [ ] Open Settings → Website Integration → Sync tab
- [ ] Verify "Synced" count increased

**Offline Mode:**
- [ ] Disconnect internet
- [ ] Create 3 invoices
- [ ] Check sync queue (should show 3 pending)
- [ ] Reconnect internet
- [ ] Wait 30-60 seconds
- [ ] Check sync queue (should be empty)
- [ ] Verify invoices in admin dashboard

### Website (Customer Portal)

**QR Code Scanning:**
- [ ] Open /my-billing page
- [ ] Click "Scan QR Code"
- [ ] Allow camera access
- [ ] Scan invoice QR code from receipt
- [ ] Invoice details displayed
- [ ] Verify invoice number, date, items, total
- [ ] Click "Download PDF"
- [ ] PDF downloads successfully
- [ ] Click "Print"
- [ ] Print preview opens
- [ ] Click "Share"
- [ ] Share URL copied

**Manual Invoice Lookup:**
- [ ] Enter invoice number in search box
- [ ] Click "Find Invoice"
- [ ] Invoice displayed (if found)
- [ ] Error shown (if not found)

### Admin Dashboard

**Device Management:**
- [ ] Open /admin/pos-management
- [ ] Overview tab shows stats
- [ ] Devices tab lists all devices
- [ ] Search for device by name
- [ ] Filter by status (Active)
- [ ] Click suspend button
- [ ] Device status changes to "Suspended"
- [ ] Click activate button
- [ ] Device status changes to "Active"

**Invoice Management:**
- [ ] Switch to Invoices tab
- [ ] List of synced invoices displayed
- [ ] Click invoice to view details
- [ ] Invoice information complete
- [ ] Customer email shown

**Analytics:**
- [ ] Switch to Analytics tab
- [ ] Sales metrics displayed (Today/Week/Month)
- [ ] System health indicators shown
- [ ] All indicators "healthy"

## Deployment Verification

### Pre-Deployment Checklist

**Environment Variables:**
- [ ] `DATABASE_URL` set correctly
- [ ] `FRONTEND_URL` configured
- [ ] `RESEND_API_KEY` set (for emails)
- [ ] `GEMINI_API_KEY` set (for AI, optional)
- [ ] `JWT_SECRET` secure and unique
- [ ] `NODE_ENV=production`

**Database:**
- [ ] Migrations run successfully
- [ ] Tables created (src_pos_*)
- [ ] Indexes created
- [ ] Test connection successful

**Backend:**
- [ ] Server starts without errors
- [ ] `/api/health` endpoint responds
- [ ] CORS configured correctly
- [ ] HTTPS enabled (production)
- [ ] Rate limiting active

**Frontend:**
- [ ] Build completes successfully
- [ ] No console errors on load
- [ ] All routes accessible
- [ ] API calls work

### Post-Deployment Verification

**Smoke Tests (5 minutes):**
1. [ ] Register test device
2. [ ] Sync test invoice
3. [ ] View invoice via QR code
4. [ ] Check admin dashboard
5. [ ] Verify email sent

**Health Checks:**
```bash
# Backend health
curl https://your-api.com/api/health

# Database connection
curl https://your-api.com/api/erp/pos/integration/health \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Frontend
curl https://your-site.com/my-billing
# Should return 200
```

## Troubleshooting

### Common Issues

**Issue: Device authentication fails**
- Check API key is correct (64 characters)
- Verify device status is "active"
- Check backend logs for errors
- Verify database connection

**Issue: Invoices not syncing**
- Check network connectivity
- Verify background worker is running
- Check sync queue for errors
- Review browser console logs

**Issue: QR code not scanning**
- Verify QR code is visible on receipt
- Check camera permissions
- Try manual invoice lookup
- Verify token not revoked

**Issue: Rate limit errors**
- Review rate limit settings
- Check if legitimate spike in usage
- Adjust limits if needed
- Wait for window to reset

## Success Criteria

Integration is production-ready when:

✅ All 7 critical workflows pass  
✅ Performance meets targets  
✅ Security tests pass  
✅ Manual checklist complete  
✅ No critical errors in logs  
✅ Email delivery working  
✅ Admin dashboard functional  
✅ Zero data loss in offline mode  
✅ Audit logs capturing all events  
✅ Documentation complete  

---

**Testing Status:** ✅ Ready for Validation  
**Last Updated:** January 2025  
**Version:** 1.0.0

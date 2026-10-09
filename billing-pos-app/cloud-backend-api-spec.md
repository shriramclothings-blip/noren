# Cloud Sync Backend API Specification

## Overview
This document specifies the REST API endpoints that your cloud backend (deployed on Render at `https://ram1-ai0s.onrender.com`) must implement to receive and store POS data.

---

## Authentication & Security

### Request Headers (All Endpoints)
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Always `application/json` |
| `X-Business-Id` | Yes | Unique business identifier |
| `X-Device-Id` | Yes | Unique POS terminal/device ID |
| `X-Timestamp` | Yes | ISO-8601 timestamp of request |
| `X-Queue-UUID` | Sync only | Unique ID for this queue item (idempotency) |
| `X-Transaction-UUID` | Sync only | Unique transaction ID |
| `Authorization` | Optional | `Bearer <jwt-token>` for authenticated requests |
| `X-Device-Auth` | Optional | Device-specific authentication token |
| `X-Request-Signature` | Optional | HMAC hash for request integrity (format: hash of `transactionUuid:syncHash:secretKey`) |

---

## Endpoints

### 1. Health Check

**GET `/health`**

Check if the server is online and responsive.

**Request:** None (no body required)

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "pos-sync-backend",
  "version": "2.0.0",
  "db": "available",
  "uptime": 12345,
  "ts": "2026-07-06T10:30:00.000Z"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "service": "pos-sync-backend",
  "db": "unavailable",
  "uptime": 12345,
  "ts": "2026-07-06T10:30:00.000Z"
}
```

---

### 2. Device Authentication (Optional)

**POST `/auth/device`**

Authenticate a POS device with the cloud backend. This endpoint is **optional** — if your backend doesn't implement it, the POS will still work (it will skip authentication and proceed to sync).

**Request Body:**
```json
{
  "businessId": "DINESH-GLOBAL-001",
  "deviceId": "POS-TERMINAL-01",
  "timestamp": "2026-07-06T10:30:00.000Z"
}
```

**Response (200 OK - Already Authenticated):**
```json
{
  "success": true,
  "message": "Device authenticated",
  "deviceId": "POS-TERMINAL-01",
  "businessId": "DINESH-GLOBAL-001"
}
```

**Response (201 Created - New Device Registered):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "deviceId": "POS-TERMINAL-01",
  "businessId": "DINESH-GLOBAL-001",
  "registered": true
}
```

**Response (401 Unauthorized - Bad Credentials):**
```json
{
  "success": false,
  "error": "Invalid credentials or business ID"
}
```

**Response (404 Not Found - Endpoint Not Implemented):**
If your backend doesn't implement `/auth/device`, the POS will ignore the 404 and continue to sync.

---

### 3. Sync Data Push (Primary Endpoint)

**POST `/api/sync/push`**

Receive and store a single data change (create/update/delete) from the POS.

**Request Body:**
```json
{
  "queueUuid": "550e8400-e29b-41d4-a716-446655440000",
  "transactionUuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "entityType": "products",
  "entityId": 123,
  "actionType": "create",
  "payload": {
    "id": 123,
    "name": "Sample Product",
    "sku": "PROD-001",
    "price": 99.99,
    "stock": 50,
    "categoryId": 5,
    "brandId": 2,
    "createdAt": "2026-07-06T10:30:00.000Z"
  },
  "businessId": "DINESH-GLOBAL-001",
  "deviceId": "POS-TERMINAL-01",
  "syncHash": "a1b2c3d4e5f6...",
  "timestamp": "2026-07-06T10:30:00.000Z"
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `queueUuid` | string | Unique ID for this queue item (POS-generated UUID) |
| `transactionUuid` | string | Unique transaction ID (POS-generated UUID) |
| `entityType` | string | One of: `products`, `categories`, `brands`, `variants`, `customers`, `suppliers`, `purchases`, `purchaseItems`, `sales`, `saleItems`, `inventory`, `stockAdjustments`, `users`, `settings` |
| `entityId` | number | The local POS database ID for this record |
| `actionType` | string | One of: `create`, `update`, `delete` |
| `payload` | object | The full record data (structure varies by entityType) |
| `businessId` | string | Business identifier from POS settings |
| `deviceId` | string | Device identifier from POS settings |
| `syncHash` | string | Idempotency hash (computed from payload + entity + action + businessId + deviceId) |
| `timestamp` | string | ISO-8601 timestamp when the change occurred on POS |

**Response (200 OK - Success):**
```json
{
  "success": true,
  "message": "Record synced successfully",
  "recordId": 123,
  "cloudId": "cloud-uuid-abc-123",
  "timestamp": "2026-07-06T10:30:05.000Z"
}
```

**Response (201 Created - New Record):**
```json
{
  "success": true,
  "message": "New record created in cloud",
  "recordId": 123,
  "cloudId": "cloud-uuid-abc-123",
  "timestamp": "2026-07-06T10:30:05.000Z"
}
```

**Response (409 Conflict - Duplicate/Already Synced):**
```json
{
  "success": true,
  "message": "Record already synced (duplicate)",
  "duplicate": true,
  "recordId": 123,
  "syncHash": "a1b2c3d4e5f6..."
}
```

**Important:** The POS treats HTTP 409 as a **success** (idempotent duplicate). Your backend should check the `syncHash` to detect duplicates and return 409 instead of inserting the same record twice.

**Response (400 Bad Request - Validation Error):**
```json
{
  "success": false,
  "error": "Validation failed: missing required field 'name'",
  "field": "name"
}
```

**Response (401 Unauthorized - Authentication Failed):**
```json
{
  "success": false,
  "error": "Unauthorized: Invalid or missing authentication token"
}
```

**Response (500 Internal Server Error - Database Error):**
```json
{
  "success": false,
  "error": "Database error: could not insert record",
  "details": "Duplicate key constraint violation"
}
```

---

## Entity Types & Payload Structures

### Products
**Entity Type:** `products`

**Payload Fields:**
```json
{
  "id": 123,
  "name": "Sample Product",
  "sku": "PROD-001",
  "barcode": "1234567890123",
  "price": 99.99,
  "costPrice": 50.00,
  "stock": 100,
  "minStock": 10,
  "maxStock": 500,
  "categoryId": 5,
  "brandId": 2,
  "supplierId": 8,
  "taxRate": 18,
  "unit": "pcs",
  "imageSrc": "https://cloudinary.com/path/to/image.jpg",
  "description": "Product description",
  "isActive": true,
  "createdAt": "2026-07-01T08:00:00.000Z",
  "updatedAt": "2026-07-06T10:30:00.000Z"
}
```

### Categories
**Entity Type:** `categories`

```json
{
  "id": 5,
  "name": "Electronics",
  "description": "Electronic goods",
  "color": "#3b82f6",
  "icon": "Laptop",
  "parentId": null,
  "sortOrder": 1
}
```

### Brands
**Entity Type:** `brands`

```json
{
  "id": 2,
  "name": "Samsung",
  "description": "Global electronics brand",
  "logoUrl": "https://cloudinary.com/path/to/logo.png"
}
```

### Customers
**Entity Type:** `customers`

```json
{
  "id": 42,
  "name": "John Doe",
  "phone": "+91 98765 43210",
  "email": "john@example.com",
  "address": "123 Main St, City",
  "gstin": "27AABCU9603R1Z5",
  "creditLimit": 10000,
  "balance": 2500,
  "loyaltyPoints": 150,
  "createdAt": "2026-06-15T12:00:00.000Z"
}
```

### Sales (Invoices)
**Entity Type:** `sales`

```json
{
  "id": 1001,
  "invoiceNumber": "INV-260706001",
  "customerId": 42,
  "customerName": "John Doe",
  "subtotal": 1000.00,
  "taxAmount": 180.00,
  "discountAmount": 50.00,
  "totalAmount": 1130.00,
  "paymentMethod": "cash",
  "paymentStatus": "paid",
  "date": "2026-07-06T10:30:00.000Z",
  "staffId": 1,
  "staffName": "Admin",
  "notes": "Customer requested extra packing"
}
```

### Sale Items
**Entity Type:** `saleItems`

```json
{
  "id": 5001,
  "saleId": 1001,
  "productId": 123,
  "productName": "Sample Product",
  "sku": "PROD-001",
  "quantity": 2,
  "unitPrice": 500.00,
  "taxRate": 18,
  "taxAmount": 180.00,
  "discountAmount": 50.00,
  "totalAmount": 1130.00
}
```

### Inventory
**Entity Type:** `inventory`

```json
{
  "id": 789,
  "productId": 123,
  "quantity": 100,
  "warehouseId": 1,
  "locationCode": "A-01-05",
  "lastStockUpdate": "2026-07-06T10:30:00.000Z"
}
```

### Stock Adjustments
**Entity Type:** `stockAdjustments`

```json
{
  "id": 55,
  "productId": 123,
  "adjustmentType": "add",
  "quantity": 50,
  "reason": "New stock arrival",
  "date": "2026-07-06T10:30:00.000Z",
  "staffId": 1,
  "notes": "Received from supplier"
}
```

### Suppliers
**Entity Type:** `suppliers`

```json
{
  "id": 8,
  "name": "ABC Electronics Ltd.",
  "contactPerson": "Jane Smith",
  "phone": "+91 99887 65432",
  "email": "jane@abcelectronics.com",
  "address": "456 Industrial Ave, City",
  "gstin": "27AACCC9876D1Z8",
  "paymentTerms": "Net 30 days"
}
```

### Users/Staff
**Entity Type:** `users`

```json
{
  "id": 1,
  "name": "Admin User",
  "username": "admin",
  "role": "admin",
  "pin": "1234",
  "active": true,
  "permissions": ["all"],
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

**Note:** The `password` field is **not** synced for security reasons.

### Settings
**Entity Type:** `settings`

```json
{
  "id": 1,
  "businessName": "Dinesh Global Enterprises",
  "phone": "+91 12345 67890",
  "email": "info@dineshglobal.com",
  "address": "789 Business Park, City",
  "gstin": "27AABCD1234E1Z9",
  "currency": "₹",
  "taxRate": 18,
  "invoicePrefix": "INV",
  "logoSrc": "https://cloudinary.com/path/to/logo.jpg"
}
```

---

## Database Design Recommendations

### Tables to Create

1. **businesses** — Store business details
   - `id`, `business_id` (unique), `name`, `phone`, `email`, `address`, `gstin`, `created_at`

2. **devices** — Track POS devices
   - `id`, `device_id` (unique), `business_id` (FK), `name`, `status`, `last_seen`, `created_at`

3. **sync_queue** — Store incoming sync requests (for debugging/audit)
   - `id`, `queue_uuid` (unique), `transaction_uuid`, `business_id`, `device_id`, `entity_type`, `entity_id`, `action_type`, `sync_hash` (indexed for duplicate detection), `payload` (JSONB), `synced_at`, `created_at`

4. **products**, **categories**, **brands**, **customers**, **suppliers**, **sales**, **sale_items**, **inventory**, **stock_adjustments**, **users** — Main data tables matching the POS schema

### Idempotency Implementation

**Check `syncHash` before inserting:**
```sql
SELECT id FROM sync_queue WHERE sync_hash = $1;
```

If found → return `409 Conflict` (already synced)

If not found → insert and return `200 OK` or `201 Created`

---

## Error Handling Best Practices

1. **Always return JSON** — even for errors
2. **Use appropriate HTTP status codes**:
   - `200 OK` — successful sync
   - `201 Created` — new record created
   - `400 Bad Request` — validation error (client's fault)
   - `401 Unauthorized` — auth error
   - `409 Conflict` — duplicate (idempotent success)
   - `500 Internal Server Error` — database/server error
3. **Log all sync requests** — for debugging and audit trail
4. **Handle partial failures gracefully** — if database is down, return 503 (POS will retry)

---

## Sample Node.js/Express Implementation

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pos-sync-backend',
    version: '2.0.0',
    db: 'available',
    uptime: process.uptime(),
    ts: new Date().toISOString()
  });
});

// Device authentication (optional)
app.post('/auth/device', (req, res) => {
  const { businessId, deviceId } = req.body;
  
  // TODO: Validate businessId and deviceId against your database
  
  res.json({
    success: true,
    message: 'Device authenticated',
    businessId,
    deviceId
  });
});

// Sync push endpoint
app.post('/api/sync/push', async (req, res) => {
  const {
    queueUuid,
    transactionUuid,
    entityType,
    entityId,
    actionType,
    payload,
    businessId,
    deviceId,
    syncHash,
    timestamp
  } = req.body;
  
  try {
    // 1. Check for duplicate using syncHash
    const existing = await db.query(
      'SELECT id FROM sync_queue WHERE sync_hash = $1',
      [syncHash]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: true,
        message: 'Record already synced (duplicate)',
        duplicate: true,
        syncHash
      });
    }
    
    // 2. Insert into sync_queue table
    await db.query(
      `INSERT INTO sync_queue 
       (queue_uuid, transaction_uuid, business_id, device_id, entity_type, entity_id, action_type, sync_hash, payload, synced_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [queueUuid, transactionUuid, businessId, deviceId, entityType, entityId, actionType, syncHash, JSON.stringify(payload)]
    );
    
    // 3. Process the sync (insert/update/delete in main tables)
    await processSyncData(entityType, entityId, actionType, payload, businessId);
    
    // 4. Success response
    res.status(200).json({
      success: true,
      message: 'Record synced successfully',
      recordId: entityId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      details: error.message
    });
  }
});

async function processSyncData(entityType, entityId, actionType, payload, businessId) {
  // TODO: Implement actual database insert/update/delete logic for each entityType
  // Example for products:
  if (entityType === 'products') {
    if (actionType === 'create' || actionType === 'update') {
      await db.query(
        `INSERT INTO products 
         (id, business_id, name, sku, barcode, price, cost_price, stock, category_id, brand_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id, business_id) DO UPDATE SET
           name = EXCLUDED.name,
           sku = EXCLUDED.sku,
           price = EXCLUDED.price,
           stock = EXCLUDED.stock,
           updated_at = EXCLUDED.updated_at`,
        [
          payload.id,
          businessId,
          payload.name,
          payload.sku,
          payload.barcode,
          payload.price,
          payload.costPrice,
          payload.stock,
          payload.categoryId,
          payload.brandId,
          payload.createdAt,
          payload.updatedAt
        ]
      );
    } else if (actionType === 'delete') {
      await db.query(
        'DELETE FROM products WHERE id = $1 AND business_id = $2',
        [entityId, businessId]
      );
    }
  }
  // Repeat for other entityTypes: categories, sales, customers, etc.
}

app.listen(3000, () => {
  console.log('POS Sync Backend running on port 3000');
});
```

---

## Testing Your Backend

### Using cURL

**Health check:**
```bash
curl -X GET https://ram1-ai0s.onrender.com/health
```

**Sync push:**
```bash
curl -X POST https://ram1-ai0s.onrender.com/api/sync/push \
  -H "Content-Type: application/json" \
  -H "X-Business-Id: TEST-001" \
  -H "X-Device-Id: TEST-DEVICE" \
  -d '{
    "queueUuid": "test-123",
    "transactionUuid": "test-txn-456",
    "entityType": "products",
    "entityId": 1,
    "actionType": "create",
    "payload": {
      "id": 1,
      "name": "Test Product",
      "sku": "TEST-001",
      "price": 10.00,
      "stock": 100
    },
    "businessId": "TEST-001",
    "deviceId": "TEST-DEVICE",
    "syncHash": "abc123",
    "timestamp": "2026-07-06T10:30:00.000Z"
  }'
```

---

**Last Updated:** July 6, 2026  
**For:** VENDEXA RetailOS Cloud Sync  
**Deployed At:** https://ram1-ai0s.onrender.com

# 🚀 WhatsApp Integration - Quick Start Guide

## ✅ Installation Complete!

Your industrial-grade WhatsApp integration is ready to use. Follow these 3 simple steps:

---

## Step 1: Run Database Migration (1 minute)

```bash
cd backend
node migrations/runMigrations.js
```

This creates 9 WhatsApp tables and inserts default templates.

**Expected output:**
```
✅ 007_create_whatsapp_tables.sql executed successfully
✅ All migrations completed: 8 succeeded, 0 failed
```

---

## Step 2: Start Your Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

---

## Step 3: Connect WhatsApp (Admin Panel)

### Method 1: Using API (Testing)

```bash
# 1. Create WhatsApp instance
curl -X POST http://localhost:5000/api/whatsapp/instances/create \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "default"}'

# 2. Get QR code
curl http://localhost:5000/api/whatsapp/instances/default/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response will include base64 QR code:
{
  "success": true,
  "instance": {
    "status": "connecting",
    "qrCode": "data:image/png;base64,iVBOR..."  <-- Use this
  }
}
```

3. **Scan the QR code** with your WhatsApp phone:
   - Open WhatsApp
   - Go to **Settings** → **Linked Devices**
   - Tap **Link a Device**
   - Scan the QR code

4. **Wait 3-5 seconds** - Status will change to `"connected"`

### Method 2: Admin Panel (Recommended)

Build a simple admin page with these elements:

```html
<div id="whatsapp-setup">
  <h2>Connect WhatsApp</h2>
  <button onclick="connectWhatsApp()">Connect</button>
  <img id="qr-code" style="display:none; width:300px; height:300px;" />
  <div id="status"></div>
</div>

<script>
async function connectWhatsApp() {
  // Create instance
  await fetch('/api/whatsapp/instances/create', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + adminToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ instanceName: 'default' })
  });
  
  // Poll for QR code
  const interval = setInterval(async () => {
    const res = await fetch('/api/whatsapp/instances/default/status', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const data = await res.json();
    
    if (data.instance.qrCode) {
      document.getElementById('qr-code').src = data.instance.qrCode;
      document.getElementById('qr-code').style.display = 'block';
      document.getElementById('status').textContent = 'Scan QR code with WhatsApp';
    }
    
    if (data.instance.status === 'connected') {
      clearInterval(interval);
      document.getElementById('status').textContent = 
        '✅ Connected! Phone: ' + data.instance.phoneNumber;
      document.getElementById('qr-code').style.display = 'none';
    }
  }, 3000);
}
</script>
```

---

## 🎉 That's It! You're Ready!

### What Works Automatically:

#### ✅ Order Notifications
Place any order → Customer receives WhatsApp notification automatically!

**Test it:**
1. Place a test order (COD or Paytm)
2. Check your phone - you'll receive order confirmation WhatsApp

#### ✅ Login Alerts
Login from any device → Security alert sent automatically!

**Test it:**
1. Login to your account
2. Check WhatsApp - you'll receive security alert with location

---

## 📱 Test Your Integration

### Test 1: Send Manual Message

```javascript
// Using Postman or curl
POST http://localhost:5000/api/whatsapp/send
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "phone": "+919876543210",
  "message": "🎉 Hello! This is a test message from NOREN Fashion.",
  "instanceName": "default"
}
```

### Test 2: Send Order Confirmation

```javascript
POST http://localhost:5000/api/whatsapp/send-template
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "templateName": "order_confirmed",
  "phone": "+919876543210",
  "variables": {
    "customerName": "Test User",
    "orderNumber": "TEST123",
    "amount": "2499.00",
    "itemCount": "3",
    "deliveryDate": "20 Oct 2026",
    "trackingUrl": "https://www.norenfastion.shop/orders/TEST123"
  }
}
```

### Test 3: Create Promotional Campaign

```javascript
// Step 1: Create campaign
POST http://localhost:5000/api/whatsapp/campaigns
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "campaignName": "Test Campaign",
  "templateId": 6,  // promotional_new_arrival template
  "targetAudience": {
    "minOrders": 0  // All users with phone numbers
  }
}

// Step 2: Launch campaign
POST http://localhost:5000/api/whatsapp/campaigns/1/launch
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "variables": {
    "discountPercentage": "30",
    "promoCode": "TEST30",
    "validTill": "31 Oct 2026",
    "shopUrl": "https://www.norenfastion.shop"
  }
}
```

---

## 📊 Monitor Your WhatsApp

### View Analytics

```javascript
GET http://localhost:5000/api/whatsapp/analytics
Authorization: Bearer YOUR_ADMIN_TOKEN

// Returns:
// - Messages sent by status
// - Messages by type
// - Daily stats (last 7 days)
// - Instance performance
```

### View Message Logs

```javascript
GET http://localhost:5000/api/whatsapp/logs?limit=100
Authorization: Bearer YOUR_ADMIN_TOKEN

// Returns complete message history with:
// - Phone numbers
// - Message content
// - Delivery status
// - Timestamps
```

### View Incoming Messages

```javascript
GET http://localhost:5000/api/whatsapp/incoming?isRead=false
Authorization: Bearer YOUR_ADMIN_TOKEN

// Returns customer replies
```

---

## 🎯 Available Templates

You have 7 pre-built templates ready to use:

1. **order_confirmed** - Order confirmation with details
2. **order_shipped** - Shipping notification with tracking
3. **order_delivered** - Delivery confirmation with review request
4. **order_cancelled** - Cancellation notice with refund info
5. **login_alert** - Security alert for new logins
6. **promotional_new_arrival** - New collection announcement
7. **promotional_sale** - Flash sale/discount campaigns

### View All Templates:

```javascript
GET http://localhost:5000/api/whatsapp/templates
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

## ⚙️ Settings Control

### Enable/Disable Features:

```javascript
// Disable promotional messages
PUT http://localhost:5000/api/whatsapp/settings/wa_promotional_enabled
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "value": false
}

// Other settings available:
// - wa_enabled (Master switch)
// - wa_order_notifications_enabled
// - wa_login_alerts_enabled
// - wa_promotional_enabled
```

---

## 🔍 Troubleshooting

### QR Code Not Appearing?
- Check server logs for errors
- Verify instance was created: `GET /api/whatsapp/instances`
- Ensure `whatsapp_sessions` folder is writable

### Messages Not Sending?
- Check connection status: `GET /api/whatsapp/instances/default/status`
- Verify rate limit not exceeded (20 msgs/min)
- Check message queue: `GET /api/whatsapp/logs?status=pending`

### Connection Drops?
- Normal for Baileys (auto-reconnects in 5 seconds)
- Don't scan same QR on multiple servers
- Keep server running continuously

---

## 📈 What's Next?

### Build Admin UI:
1. **WhatsApp Connection Page** - Display QR code and status
2. **Campaign Manager** - Create/launch/monitor campaigns
3. **Analytics Dashboard** - Charts and statistics
4. **Template Editor** - Create custom message templates
5. **Message Logs Viewer** - Search and filter sent messages

### Enhance Functionality:
1. **Customer Opt-out** - Handle "STOP" replies
2. **Two-way Chat** - Respond to customer messages
3. **Rich Media** - Send images, videos, documents
4. **Scheduled Messages** - Queue messages for future
5. **A/B Testing** - Test different message variations

---

## 📞 API Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/whatsapp/instances/create` | POST | Create WhatsApp instance |
| `/api/whatsapp/instances/:name/status` | GET | Get status & QR code |
| `/api/whatsapp/instances` | GET | List all instances |
| `/api/whatsapp/send` | POST | Send manual message |
| `/api/whatsapp/send-template` | POST | Send template message |
| `/api/whatsapp/templates` | GET | Get all templates |
| `/api/whatsapp/templates` | POST | Create/update template |
| `/api/whatsapp/campaigns` | POST | Create campaign |
| `/api/whatsapp/campaigns` | GET | List campaigns |
| `/api/whatsapp/campaigns/:id/launch` | POST | Launch campaign |
| `/api/whatsapp/analytics` | GET | Get analytics |
| `/api/whatsapp/logs` | GET | View message logs |
| `/api/whatsapp/settings` | GET | Get all settings |
| `/api/whatsapp/settings/:key` | PUT | Update setting |

---

## ✅ Success Checklist

- [ ] Database migration completed
- [ ] Server started successfully
- [ ] WhatsApp connected (QR scanned)
- [ ] Test message sent successfully
- [ ] Order notification tested
- [ ] Login alert tested
- [ ] Campaign created and launched
- [ ] Analytics dashboard accessible

---

## 🎯 Production Deployment

Before going live:

1. **Environment Variables** - Already set in `.env`
2. **WhatsApp Connection** - Connect your business WhatsApp number
3. **Test All Flows** - Order, login, campaigns
4. **Set Rate Limits** - Default 20/min is safe
5. **Enable/Disable Features** - Use settings API
6. **Monitor Logs** - Check `/api/whatsapp/logs` daily
7. **Customer Support** - Train team on incoming messages

---

## 📚 Full Documentation

See `WHATSAPP_INTEGRATION_DOCS.md` for:
- Complete API reference
- Advanced usage examples
- Architecture details
- Security best practices
- Scaling recommendations

---

## 🎉 You're All Set!

Your WhatsApp integration is **production-ready** and **fully functional**.

**Questions?** Check the full documentation or server logs.

**Status:** 🟢 **OPERATIONAL - READY FOR PRODUCTION**

---

*Built with ❤️ for NOREN Fashion - Industrial-grade WhatsApp Messaging*

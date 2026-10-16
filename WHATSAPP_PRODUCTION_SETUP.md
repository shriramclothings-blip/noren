# 🌐 WhatsApp Production Setup (Until Render Redeploys)

## ⚠️ Render is Still Deploying

The visual setup page will be available after Render redeploys (~5 minutes).

**Meanwhile, use this API method:**

---

## 🚀 QUICK SETUP VIA API (3 Minutes)

### Step 1: Get Admin Token

Open your browser console on https://www.norenfastion.shop and run:

```javascript
fetch('https://noren-iqk3.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'admin@norenfashion.in',
    password: 'Noren@Admin2024'
  })
})
.then(r => r.json())
.then(d => {
  console.log('YOUR TOKEN:', d.token);
  localStorage.setItem('adminToken', d.token);
});
```

**Copy the token from console!**

---

### Step 2: Create WhatsApp Instance

```javascript
const TOKEN = 'YOUR_TOKEN_HERE'; // Paste token here

fetch('https://noren-iqk3.onrender.com/api/whatsapp/instances/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({instanceName: 'default'})
})
.then(r => r.json())
.then(d => console.log('Instance created:', d));
```

---

### Step 3: Get QR Code

```javascript
const TOKEN = localStorage.getItem('adminToken');

// Function to check QR
async function getQR() {
  const r = await fetch('https://noren-iqk3.onrender.com/api/whatsapp/instances/default/status', {
    headers: {'Authorization': 'Bearer ' + TOKEN}
  });
  const d = await r.json();
  
  if (d.instance.qrCode) {
    // Create image element
    const img = document.createElement('img');
    img.src = d.instance.qrCode;
    img.style.cssText = 'position:fixed;top:50px;left:50px;width:400px;height:400px;z-index:9999;border:3px solid #667eea;border-radius:10px;background:white;';
    document.body.appendChild(img);
    
    console.log('✅ QR Code displayed! Scan it with WhatsApp');
    return true;
  }
  
  if (d.instance.status === 'connected') {
    console.log('✅ Already connected! Phone:', d.instance.phoneNumber);
    return true;
  }
  
  console.log('⏳ Waiting for QR...');
  return false;
}

// Check every 3 seconds
const interval = setInterval(async () => {
  const done = await getQR();
  if (done) clearInterval(interval);
}, 3000);

getQR(); // Check immediately
```

---

### Step 4: Test Message

After scanning QR:

```javascript
const TOKEN = localStorage.getItem('adminToken');

fetch('https://noren-iqk3.onrender.com/api/whatsapp/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phone: '+919876543210', // YOUR PHONE
    message: '🎉 WhatsApp connected to NOREN Fashion! ✅',
    instanceName: 'default'
  })
})
.then(r => r.json())
.then(d => console.log('Message sent:', d));
```

---

## 📱 EASIEST: Use Postman/Thunder Client

### 1. Login
```http
POST https://noren-iqk3.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "admin@norenfashion.in",
  "password": "Noren@Admin2024"
}
```

Copy the `token` from response.

---

### 2. Create Instance
```http
POST https://noren-iqk3.onrender.com/api/whatsapp/instances/create
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "instanceName": "default"
}
```

---

### 3. Get QR Code
```http
GET https://noren-iqk3.onrender.com/api/whatsapp/instances/default/status
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response contains:**
```json
{
  "instance": {
    "qrCode": "data:image/png;base64,..." 
  }
}
```

**Copy the `qrCode` value, paste in browser, scan with WhatsApp!**

---

### 4. Send Test
```http
POST https://noren-iqk3.onrender.com/api/whatsapp/send
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "phone": "+919876543210",
  "message": "Test from NOREN! 🎉"
}
```

---

## ✅ Check Render Deployment

1. Go to: https://dashboard.render.com
2. Check your service status
3. Look for "Deploy in progress" or "Live"
4. Once deployed, the visual setup page will work:
   ```
   https://noren-iqk3.onrender.com/whatsapp-setup.html
   ```

**Typical deployment time:** 3-5 minutes

---

## 🔧 Manual Trigger Deployment

If Render hasn't auto-deployed:

1. Go to Render Dashboard
2. Select your service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 3-5 minutes

---

## 📊 What Works NOW (Without Visual Setup)

These APIs work immediately:

✅ `/api/whatsapp/instances/create` - Create connection  
✅ `/api/whatsapp/instances/default/status` - Get QR  
✅ `/api/whatsapp/send` - Send message  
✅ `/api/whatsapp/analytics` - View stats  
✅ `/api/whatsapp/logs` - Message history  

---

## 🎯 AFTER RENDER DEPLOYS

You'll have the beautiful visual setup page:

1. Login form
2. Live QR code display
3. Auto-connection detection
4. Test message button
5. Success confirmation

**Access:** https://noren-iqk3.onrender.com/whatsapp-setup.html

---

## 💡 TIP: Check Deployment

Run this to check if file exists:

```bash
curl -I https://noren-iqk3.onrender.com/whatsapp-setup.html
```

**If 200 OK:** Page is live!  
**If 404:** Still deploying...

---

## ✅ SUMMARY

**Right Now (APIs work):**
- Use Postman or browser console method above
- Connect WhatsApp in 3-4 API calls
- Takes 3 minutes

**After Render Deploys (5 min):**
- Use beautiful visual wizard
- Connect WhatsApp with 3 clicks
- Takes 1 minute

**Status:** 🟡 **Waiting for Render deployment**

---

*Check Render dashboard for deployment status!*

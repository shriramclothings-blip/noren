# VENDEXA RetailOS™ — Web Deployment Guide

## Production Build: Online POS Billing System

**Version:** 3.0.1  
**Status:** Production Ready ✓  
**Backend:** https://noren-iqk3.onrender.com/api  
**Deployment Target:** Vercel, Netlify, or any Node.js hosting

---

## Architecture Overview

### Frontend (Web Application)
- **Type:** React SPA (Single Page Application)
- **Build:** `npm run build:prod` → static files in `/build`
- **Storage:** IndexedDB (local cache) + Backend PostgreSQL
- **Auth:** JWT tokens + Device registration with backend
- **Offline Support:** Yes - queues invoices when offline

### Backend (Production)
- **URL:** https://noren-iqk3.onrender.com/api
- **Database:** Neon PostgreSQL (3 replicated databases)
- **Services:** 
  - Invoice sync with device registration
  - Auto-email invoices to customers
  - QR code generation (online-accessible)
  - Loyalty points & customer management
  - Inventory tracking across stores

---

## Pre-Deployment Checklist

- [x] Remove all Electron references
- [x] Remove LicenseGate component
- [x] Configure .env.production with backend URLs
- [x] Remove node_modules with `electron` and `electron-builder`
- [x] Set homepage to production URL
- [x] Create vercel.json with routing & security headers
- [x] API service layer with JWT auth + device registration
- [x] Invoice sync with idempotency keys & retry queue
- [x] Email templates configured in backend

---

## 1. Local Testing Before Deployment

### Build Production Bundle
```bash
# Install dependencies (clean install)
rm -rf node_modules package-lock.json
npm install

# Build for production
npm run build:prod

# Output: ./build/ (optimized static files)
```

### Verify Build
```bash
# Test build locally with serve
npx serve build

# Visit: http://localhost:3000
# Test invoice creation → should sync to backend
# Test offline mode → create invoice without connection
# Go online → should auto-sync queued invoices
```

### Check API Connectivity
```javascript
// In browser console:
import apiService from './services/apiService.js';

// Test backend connection
await apiService.testConnection();
// Should return: { connected: true, status: 'ok' }

// Test device registration
import deviceRegistration from './services/deviceRegistration.js';
await deviceRegistration.initializeDevice('YOUR_JWT_TOKEN');
```

---

## 2. Environment Variables

### .env.production (Already Configured)
```bash
REACT_APP_API_URL=https://noren-iqk3.onrender.com/api
REACT_APP_WEBSITE_URL=https://www.norenfastion.shop
REACT_APP_INVOICE_VIEW_URL=https://www.norenfastion.shop/my-billing/invoice
REACT_APP_AUTO_EMAIL_INVOICE=true
REACT_APP_EMAIL_ENABLED=true
REACT_APP_QR_TYPE=online
```

**Do NOT commit API keys to git!** Store in deployment platform's secrets.

---

## 3. Deployment Options

### Option A: Vercel (Recommended)
**Setup Time:** 5 minutes | **Cost:** Free tier available

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard:
# Project Settings → Environment Variables → Add production values
```

**Vercel automatically uses `vercel.json` for:**
- Build command: `npm run build:prod`
- Output directory: `build`
- Routing (SPA): All requests → index.html
- Security headers (CORS, CSP, etc.)
- Static caching strategies

### Option B: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Or drag-and-drop build/ folder in Netlify UI
```

Create `netlify.toml`:
```toml
[build]
command = "npm run build:prod"
publish = "build"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

### Option C: Docker (For VPS/Server)
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:prod
EXPOSE 3000
CMD ["npx", "serve", "build", "-l", "3000"]
```

```bash
docker build -t vendexa-web .
docker run -p 3000:3000 \
  -e REACT_APP_API_URL=https://noren-iqk3.onrender.com/api \
  vendexa-web
```

---

## 4. Post-Deployment Verification

### Test Invoice Creation & Email
1. **Login:** Use admin/admin123 (default staff credentials)
2. **Add Product:** Create a test product with ₹100 price
3. **Create Invoice:**
   - Add product to cart
   - Select customer (or walk-in)
   - Enter customer email
   - Complete checkout
4. **Verify:**
   - ✓ Invoice saved locally
   - ✓ Synced to backend (check Network tab)
   - ✓ Email sent to customer (check inbox)
   - ✓ QR code generates & points to https://www.norenfastion.shop/my-billing/invoice/[TOKEN]

### Test Offline Mode
1. **Go offline** (DevTools → Network → Offline)
2. **Create invoice** → Should queue with "Pending sync" badge
3. **Go online** → Should auto-sync
4. **Verify** in backend `/api/erp/pos/integration/invoices`

### Test Device Registration
1. **Open DevTools → Local Storage**
2. Verify these keys exist:
   - `pos_device_id` → Server device ID
   - `pos_api_key` → Authentication key
   - `pos_device_fingerprint` → Browser fingerprint

### Monitor Backend Sync
```bash
# Check backend logs (if accessible)
curl https://noren-iqk3.onrender.com/api/erp/pos/integration/overview

# Verify device is registered
curl -H "Authorization: Bearer [JWT_TOKEN]" \
  https://noren-iqk3.onrender.com/api/erp/pos/integration/devices
```

---

## 5. Performance Optimization

### Already Configured in vercel.json:
- ✓ Static assets cached for 1 year (immutable)
- ✓ API responses never cached (no-store)
- ✓ Gzip compression
- ✓ HTTP/2 server push
- ✓ CDN distribution globally

### Browser Performance:
- ✓ Code splitting enabled (React.lazy)
- ✓ No source maps in production
- ✓ IndexedDB for offline caching
- ✓ Service Worker ready for PWA (optional)

---

## 6. Security Checklist

### API Security
- [x] JWT authentication on protected routes
- [x] Device API key (bcrypt hashed on backend)
- [x] Idempotency keys prevent duplicate invoices
- [x] Rate limiting on backend (429 handling)

### Frontend Security
- [x] CSRF protection (SameSite cookies)
- [x] X-Frame-Options: SAMEORIGIN
- [x] X-Content-Type-Options: nosniff
- [x] CSP headers (Referrer-Policy)
- [x] No sensitive data in localStorage (only device ID)
- [x] JWT auto-cleared on 401/403

### Deployment Security
- [x] HTTPS enforced
- [x] Environment variables not in code
- [x] Build files minified/uglified
- [x] No debug mode in production

---

## 7. Troubleshooting

### Issue: "API not responding"
**Solution:** Check backend URL in .env
```bash
echo $REACT_APP_API_URL  # Should be https://noren-iqk3.onrender.com/api
```

### Issue: "Device not registered"
**Solution:** Clear localStorage and re-login
```javascript
localStorage.clear();
location.reload();
```

### Issue: "Invoices not syncing"
**Solution:** Check Network tab
- POST to `/api/erp/pos/integration/invoices/sync`
- Verify device_id header present
- Check backend logs for idempotency key conflicts

### Issue: "Email not sending"
**Solution:** Verify in backend .env
- `RESEND_API_KEY` configured
- `EMAIL_FROM` set correctly
- Customer email present in invoice payload

### Issue: "Build fails"
**Solution:** Clean install
```bash
rm -rf node_modules package-lock.json
npm install
npm run build:prod
```

---

## 8. Monitoring & Maintenance

### Health Checks
```bash
# Test API health every 5 min
curl https://noren-iqk3.onrender.com/api/health

# Monitor error rates
# Visit: Backend admin dashboard at https://noren-iqk3.onrender.com/admin/monitor
```

### Database Backups
- Automatic daily backups on Neon PostgreSQL
- 7-day retention
- Restore via Neon dashboard if needed

### Frontend Logs
- Browser console: DevTools → Console tab
- Sentry integration (optional): Add to .env
- Backend audit logs: `/api/erp/admin/audit-logs`

---

## 9. Scaling & Future Improvements

### Current Limits
- Single frontend instance (~100 concurrent users)
- Backend on Render free tier (~50 requests/sec)
- PostgreSQL: 3 replicated databases, auto-sync

### Upgrade Path
1. **Scale Frontend:** Add CDN (Cloudflare, AWS CloudFront)
2. **Scale Backend:** Upgrade Render plan → production tier
3. **Scale Database:** Upgrade Neon to dedicated compute
4. **Add Monitoring:** Sentry, DataDog, New Relic
5. **Add PWA:** Service Worker + offline first

---

## 10. Support & Documentation

### Backend API Docs
- Invoice Sync: `/api/erp/pos/integration/invoices/sync`
- Device Registration: `/api/erp/pos/integration/devices/register`
- Public Invoice View: `/api/invoices/public/{token}`
- See: `c:/Users/MAYUR/Downloads/Noren BY DGE/backend/routes/posIntegration.js`

### Frontend Services
- **apiService.js:** API wrapper with JWT + retry
- **deviceRegistration.js:** Browser fingerprinting + auth
- **posInvoiceSync.js:** Invoice sync + email + queue
- **useBackendSync.js:** React hook for data sync

### Key Files
```
billing-pos-app/
├── .env                      # Development config
├── .env.production           # Production config (REFERENCE ONLY)
├── vercel.json              # Vercel deployment config
├── package.json             # Scripts: build:prod
├── src/
│   ├── App.js               # No Electron refs
│   ├── services/
│   │   ├── apiService.js    # API wrapper
│   │   ├── deviceRegistration.js
│   │   └── posInvoiceSync.js
│   └── hooks/
│       └── useBackendSync.js
└── public/                   # Static assets
```

---

## 11. Quick Start for New Deployment

```bash
# 1. Clone repo
git clone https://github.com/your-org/vendexa-web.git
cd vendexa-web

# 2. Install
npm install --production  # Skip dev deps

# 3. Build
npm run build:prod

# 4. Deploy
vercel --prod
# Or: netlify deploy --prod
# Or: docker build & push

# 5. Test
# Visit https://pos.norenfastion.shop
# Login → Create invoice → Verify sync + email
```

---

## Contact & Support

- **Backend Issues:** https://noren-iqk3.onrender.com/status
- **Email:** supportnoren1@gmail.com
- **Issues:** GitHub Issues or support@norenfashion.in
- **Emergency:** +91-7984626447

---

**Last Updated:** October 2026  
**Status:** Production Ready ✓

# NOREN Support Portal — Deployment Guide

## Architecture

```
support.norenfashion.shop  (this app — React SPA)
          ↓
https://your-backend.onrender.com/api/support/*
          ↓
Existing Neon PostgreSQL Database
```

The support portal uses the **exact same backend and database** as `norenfashion.shop`.
No second backend. No duplicate data.

---

## Prerequisites

- The existing NOREN backend must be deployed and running
- The backend `.env` must be configured (see backend README)
- Your backend URL must be accessible at `VITE_API_URL`

---

## 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
VITE_API_URL=https://your-noren-backend.onrender.com
VITE_SOCKET_URL=https://your-noren-backend.onrender.com
VITE_PORTAL_NAME=NOREN Support Portal
```

**Never hardcode secrets in this file.**

---

## 2. Update Backend CORS

In your backend `.env`, add the support portal URL to `FRONTEND_URL`:

```env
FRONTEND_URL=https://norenfashion.shop,https://support.norenfashion.shop
```

The backend already supports comma-separated origins.

---

## 3. Build

```bash
npm install
npm run build
```

Output goes to `dist/`.

---

## 4. Deploy Options

### Option A: Vercel (Recommended)

1. Import the `support-portal` folder as a Vercel project
2. Set Root Directory to `support-portal`
3. Add env vars in Vercel dashboard
4. Deploy

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Option B: Render Static Site

1. Create new Static Site in Render
2. Root Directory: `support-portal`
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. Add env vars
6. Add rewrite rule: `/* → /index.html`

### Option C: Nginx

```nginx
server {
    listen 443 ssl;
    server_name support.norenfashion.shop;

    root /var/www/support-portal/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
}
```

---

## 5. Access Control

Only users with these roles can log in:
- `super_admin`
- `admin`
- `business_owner`
- `store_admin`

Customer accounts are automatically blocked.

To create a support portal user, promote them in the main admin panel or database:
```sql
UPDATE src_users SET role = 'admin' WHERE email = 'agent@norenfashion.shop';
```

---

## 6. New Backend Support Tables

These tables are **automatically created** when the backend starts (via `initSupportTables()` in `supportController.js`):

| Table | Description |
|-------|-------------|
| `src_support_tickets` | Main ticket records |
| `src_support_replies` | Ticket replies and internal notes |
| `src_support_sla_rules` | SLA time-targets by priority |
| `src_support_teams` | Support team definitions |
| `src_support_incidents` | Technical incident tracking |
| `src_support_kb_articles` | Knowledge base articles |
| `src_support_quick_replies` | Saved reply templates |
| `src_support_email_templates` | Email template library |

All other data (customers, orders, sellers, influencers, UTM analytics) is read directly from existing tables. **No duplication.**

---

## 7. Development

```bash
# Terminal 1: Start the existing NOREN backend
cd backend && npm run dev

# Terminal 2: Start the support portal
cd support-portal && npm run dev
```

Support portal runs on: `http://localhost:5176`
Backend API: `http://localhost:5000`

---

## 8. Security Notes

- All API routes at `/api/support/*` require a valid JWT from the existing auth system
- Server-side role checks enforce `admin`/`super_admin`/`business_owner`/`store_admin` only
- IP addresses only visible to `super_admin`
- All sensitive actions logged to `src_activity_logs`
- Payment credentials (signatures, keys) never exposed
- Passwords never stored or transmitted in frontend

---

## 9. Health Check

The existing backend health check at `/api/health` works for this portal too.
Monitor: `GET https://your-backend.onrender.com/api/health`

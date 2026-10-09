# Billing POS AI Integration — Complete Setup Guide

## Overview

You now have a complete Gemini AI-powered analyst assistant integrated into your billing system with:
- ✅ Secure backend proxy (Node.js + Express)
- ✅ Gemini API integration with prompt templates
- ✅ PII masking and safety filters
- ✅ Read-only enforcement (SELECT-only SQL)
- ✅ Frontend chat UI in "AI Reports" page
- ✅ Explainability (SQL + sources + confidence)
- ✅ Rate limiting and audit logging

## Architecture

```
┌─────────────────┐
│  React Frontend │
│  (src/pages/    │
│   ReportsAI.js) │
└────────┬────────┘
         │ POST /api/ai/query
         ↓
┌─────────────────────────────────────┐
│   Backend Proxy (Node.js Express)   │
│   ├─ Gemini API Client              │
│   ├─ NL→SQL Templates               │
│   ├─ Safety Filters (PII, SQL)      │
│   ├─ Rate Limiting                  │
│   └─ Audit Logging                  │
└────────┬────────────────────────────┘
         │ HTTPS
         ↓
   ┌──────────────┐
   │ Gemini API   │
   │ (Google)     │
   └──────────────┘
         
   ↑
   │ SELECT queries (read-only)
   │
   ↓
   ┌──────────────────┐
   │  IndexedDB       │
   │  (Browser local) │
   └──────────────────┘
```

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Verify `.env` Configuration

File: `backend/.env`
```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_PROJECT_ID=your_project_id_here
GEMINI_MODEL=gemini-1.5-flash
PORT=3000
CORS_ORIGIN=http://localhost:3000
```

### 3. Start Backend Service

```bash
npm start
```

Expected output:
```
AI Analyst Backend listening on port 3000
Environment: development
Gemini Project: projects/507144768353
```

### 4. In Another Terminal, Start Frontend

```bash
# From project root
npm install
npm start
```

This will start your React app on `http://localhost:3000`.

### 5. Navigate to AI Reports

- Open the app in your browser
- Click "AI Reports" in the sidebar (icon: Brain)
- You should see the chat interface

### 6. Test a Query

Try asking:
- "What were my top 5 products this month?"
- "Show me sales by store today"
- "How much low stock inventory do I have?"
- "What's my average order value?"

## Deployment (Production)

### Option A: Local Server (Development/Testing)

Already done above. Keep both frontend and backend running locally.

### Option B: Production Deployment (Recommended)

#### Backend Deployment (PM2 + Node.js)

1. **Install PM2 globally**:
```bash
npm install -g pm2
```

2. **Start the backend with PM2**:
```bash
cd backend
pm2 start index.js --name "billing-pos-ai" --instances 2 --env production
```

3. **Save PM2 config**:
```bash
pm2 save
pm2 startup
```

4. **Monitor**:
```bash
pm2 logs billing-pos-ai
pm2 status
```

#### Frontend Build

1. **Build React app**:
```bash
npm run build
```

2. **Update `.env` to point to production backend**:
Create `.env.production`:
```
REACT_APP_AI_BACKEND_URL=https://your-server.com:3000
```

3. **Package Electron app** (if using Electron):
```bash
npm run dist
```

#### Server & Firewall

1. Configure firewall to allow:
   - Port 3000 (backend) — restricted to local network or VPN
   - Port 80/443 (frontend served via nginx or similar)

2. Use HTTPS/TLS:
```bash
# Install mkcert or use Let's Encrypt
# Then configure Express for HTTPS in backend/index.js
```

3. Store secrets securely:
   - Use GCP Secret Manager or HashiCorp Vault
   - Rotate API keys regularly
   - Never commit `.env` to git

### Option C: Docker Deployment

Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t billing-pos-ai-backend:latest .
docker run -d --name billing-pos-ai \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  -p 3000:3000 \
  billing-pos-ai-backend:latest
```

## Configuration

### Backend Settings (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | (required) | Your Gemini API key |
| `GEMINI_PROJECT_ID` | (required) | GCP project ID |
| `GEMINI_MODEL` | gemini-1.5-flash | Model to use |
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | dev or production |
| `MAX_TOKENS` | 2000 | Max response length |
| `TEMPERATURE` | 0.7 | Creativity (0-1) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Requests per 15 min |
| `CORS_ORIGIN` | localhost:3000 | Allowed client origins |

### Frontend Settings (`.env` or `process.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `REACT_APP_AI_BACKEND_URL` | http://localhost:3000 | Backend API URL |

## Features Explained

### 1. Natural Language Understanding

Ask questions in plain English:
- "Top products this month"
- "Low stock alert"
- "Customer spending trends"
- "Profit by category"

The backend will:
1. Parse your intent
2. Call Gemini API for NL understanding
3. Generate SQL query
4. Validate SQL (SELECT-only)
5. Return answer + SQL + provenance

### 2. Safety & Security

- **PII Masking**: Automatically detects and masks emails, phone numbers, SSN
- **SQL Validation**: Enforces SELECT-only, blocks INSERT/UPDATE/DELETE/DROP
- **Rate Limiting**: 100 requests per 15 minutes (configurable per user)
- **Audit Logging**: All queries logged with userId, timestamp
- **HTTPS-only**: All API calls should use HTTPS in production

### 3. Explainability

Every response includes:
- `answer`: Natural language summary
- `sql`: SQL query used (for verification)
- `sources`: Data tables queried
- `confidence`: 0.0–1.0 confidence score
- `queryId`: Unique ID for auditing

Example response:
```json
{
  "queryId": "uuid-123",
  "answer": "Your top 5 products this month are...",
  "sql": "SELECT p.id, p.name, SUM(qty) FROM invoices...",
  "sources": ["invoices", "products"],
  "confidence": 0.85,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Database Integration

Currently uses local IndexedDB (browser storage). For production:

**Option A: Server Database (Recommended)**
- Connect backend to a server DB (PostgreSQL, MySQL, SQLite)
- Use connection pooling and read-only user
- Sync data from browser to server

**Option B: Export CSV**
- User exports sales/inventory CSVs
- Backend analyzes exported data

**Option C: Cloud Sync**
- Use cloud-sync-server.js (existing in your app)
- Backend reads from synced data

## Troubleshooting

### "Failed to connect to AI backend"
- Check backend is running: `npm start` from `backend/` directory
- Verify `PORT=3000` in `.env`
- Check CORS: `CORS_ORIGIN` includes your frontend URL
- Browser console for network errors

### "GEMINI_API_KEY not configured"
- Ensure `.env` has the API key
- Verify key is not expired in GCP
- Check GCP billing is enabled

### "Rate limit exceeded"
- Wait 15 minutes or adjust `RATE_LIMIT_MAX_REQUESTS`
- Check if using shared API key across multiple users

### "SQL validation failed"
- Gemini may return non-SELECT SQL
- The backend blocks it automatically
- Try rephrasing your question

### Backend crashes on startup
- Check Node version: `node -v` (need ≥14)
- Check deps: `npm install`
- Check for port conflicts: `lsof -i :3000` (Mac/Linux)

## Testing

### Manual Test (Curl)

```bash
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What were sales today?",
    "userId": "test-user"
  }'
```

Expected response:
```json
{
  "queryId": "...",
  "answer": "Based on data...",
  "sql": "SELECT SUM(total) FROM invoices WHERE date >= ...",
  "confidence": 0.8,
  "timestamp": "..."
}
```

### Unit Tests (Add Later)

Create `backend/test/`:
- Test PII masking
- Test SQL validation
- Test rate limiting
- Test Gemini API calls

## API Reference

### POST /api/ai/query

**Request:**
```json
{
  "query": "Show me top 5 products this month",
  "userId": "user123",
  "contextHints": {
    "timePeriod": "this_month",
    "includeRefunds": false
  }
}
```

**Response:**
```json
{
  "queryId": "550e8400-e29b-41d4-a716-446655440000",
  "answer": "Your top 5 products by revenue this month are...",
  "sql": "SELECT p.id, p.name, SUM(i.total) FROM products p...",
  "sources": ["invoices", "products"],
  "confidence": 0.87,
  "piiDetected": false,
  "timestamp": "2024-01-15T10:30:45.123Z",
  "elapsedMs": 2345
}
```

## Costs

- **Gemini API**: Pay-as-you-go, typically $0.0005–$0.005 per query
- **GCP**: Monitor in GCP Console → Billing
- **Set budgets and alerts** to avoid surprises

## Next Steps

1. ✅ Backend running
2. ✅ Frontend chat UI active
3. **TODO**: Connect to server database (optional)
4. **TODO**: Add more prompt templates for specific use cases
5. **TODO**: Implement data export (CSV/PDF reports)
6. **TODO**: Add role-based access control
7. **TODO**: Set up monitoring and alerting

## Support & Debugging

- Check backend logs: `pm2 logs billing-pos-ai`
- Check frontend console: Browser DevTools → Console
- Enable debug logging: `LOG_LEVEL=debug` in `.env`
- Review GCP API quota and errors in GCP Console

---

**You're all set!** 🎉

Your Billing POS system now has AI-powered natural language analytics. Start asking questions about your business data from the **AI Reports** page.

Questions? Check the troubleshooting section or review backend/README.md for more details.

# AI Analyst Backend for Billing POS System

A secure, read-only backend service that integrates Google Gemini AI with your billing system to provide natural language business analytics.

## Features

- **Gemini AI Integration**: Uses Google's Generative AI API for intelligent analysis.
- **Read-Only Enforcement**: All queries are SELECT-only; no data modifications.
- **PII Protection**: Automatic masking of sensitive information before sending to Gemini.
- **Explainability**: Returns SQL used, data sources, and confidence scores.
- **Rate Limiting**: Prevents abuse with configurable per-user and global limits.
- **Audit Logging**: Logs all queries for compliance and debugging.
- **Error Handling**: Graceful degradation and detailed error logging.

## Prerequisites

- Node.js 14+ and npm
- Gemini API Key (from GCP)
- `.env` file with configuration

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (use `.env.example` as template):
```bash
cp .env.example .env
```

3. Update `.env` with your Gemini API credentials:
```
GEMINI_API_KEY=your_key_here
GEMINI_PROJECT_ID=projects/your_project_id
```

## Running the Server

### Development
```bash
npm start
```
Server will start on `http://localhost:3000`

### Production (using PM2)
```bash
npm install -g pm2
pm2 start index.js --name "billing-pos-ai"
pm2 save
pm2 startup
```

## API Endpoints

### Health Check
```
GET /health
```
Returns: `{ "status": "ok", "timestamp": "..." }`

### Query Analyst
```
POST /api/ai/query
Content-Type: application/json

{
  "query": "What were our top 5 products sold this month?",
  "userId": "user123"
}
```

Response:
```json
{
  "queryId": "uuid-here",
  "answer": "Your top 5 products this month are...",
  "sql": "SELECT p.id, p.name, SUM(qty) FROM invoices...",
  "sources": ["invoices", "products"],
  "confidence": 0.85,
  "piiDetected": false,
  "timestamp": "2024-01-15T10:30:00Z",
  "elapsedMs": 1234
}
```

## Configuration

Edit `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| GEMINI_API_KEY | (required) | Your Gemini API key |
| GEMINI_MODEL | gemini-1.5-flash | Gemini model name |
| MAX_TOKENS | 2000 | Max tokens in response |
| TEMPERATURE | 0.7 | Model creativity (0-1) |
| RATE_LIMIT_MAX_REQUESTS | 100 | Global limit per 15 min |
| CORS_ORIGIN | localhost:3000 | Allowed client origins |

## Safety & Security

### PII Masking
- Automatically detects and masks: emails, phone numbers, SSN, credit cards
- Masks PII before sending to Gemini API
- Returns masked responses to client

### SQL Validation
- Enforces SELECT-only queries
- Blocks INSERT, UPDATE, DELETE, DROP, ALTER, etc.
- Prevents multi-statement SQL injection

### Rate Limiting
- 100 requests per 15 minutes globally
- 20 requests per user per 15 minutes
- Returns 429 if exceeded

## Integration with Frontend (React)

In your `src/pages/ReportsAI.js`:

```javascript
const query = "Show me sales by product this month";
const response = await fetch('http://localhost:3000/api/ai/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    userId: currentUser.id,
  }),
});

const data = await response.json();
console.log(data.answer);
console.log(data.sql);
```

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Ensure `GEMINI_API_KEY` is set in `.env`
- Check that the key is valid and hasn't expired

### "Rate limit exceeded"
- Wait 15 minutes or adjust `RATE_LIMIT_MAX_REQUESTS`
- Check user quota in `RATE_LIMIT_PER_USER`

### Gemini API errors
- Verify API is enabled in GCP Console
- Check project ID and API key permissions
- Review GCP logs for more details

## Logs

Server logs are output to console with details on:
- API calls and responses
- PII detection
- SQL validation
- Errors and exceptions
- Query performance (elapsedMs)

## Production Deployment

1. Use PM2 or systemd to manage process
2. Store secrets in GCP Secret Manager or Vault
3. Set `NODE_ENV=production`
4. Configure CORS for your production domain
5. Enable HTTPS/TLS for all requests
6. Set up monitoring and alerting on API errors
7. Review GCP billing and set spending limits

## Contributing

This backend is part of the Billing POS system. For changes:
1. Test locally with sample data
2. Verify no PII is logged
3. Validate SQL safety filters
4. Update tests and documentation

## License

MIT

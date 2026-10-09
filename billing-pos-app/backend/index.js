require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const pino = require('pino');

const geminiClient = require('./geminiClient');
const nlToSql = require('./nlToSql');
const safetyFilters = require('./safetyFilters');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',') }));
app.use(express.json({ limit: '1mb' }));

// Rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/ai/query
 * Main endpoint for NL analyst queries
 * Body: { query: string, userId: string, contextHints?: object }
 * Returns: { answer: string, sql?: string, sources?: array, confidence: number, queryId: string, timestamp: string }
 */
app.post('/api/ai/query', async (req, res) => {
  const queryId = uuidv4();
  const startTime = Date.now();

  try {
    const { query, userId, contextHints } = req.body;

    // Validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required and must be a non-empty string' });
    }
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sanitizedQuery = query.trim().substring(0, 5000);
    const sanitizedUserId = userId.trim().substring(0, 255);

    logger.info({ queryId, userId: sanitizedUserId, query: sanitizedQuery.substring(0, 100) }, 'Query received');

    // Step 1: Apply safety filters (PII masking)
    const { maskedQuery, piiDetected } = safetyFilters.maskPII(sanitizedQuery);
    if (piiDetected) {
      logger.warn({ queryId, userId: sanitizedUserId }, 'PII detected and masked');
    }

    // Step 2: Attempt to parse as SQL intent (template-based)
    const sqlIntent = nlToSql.parseIntent(maskedQuery, contextHints);
    logger.info({ queryId, intent: sqlIntent }, 'Intent parsed');

    // Step 3: Call Gemini API for NL understanding and SQL generation
    const geminiResponse = await geminiClient.generateResponse({
      query: maskedQuery,
      intent: sqlIntent,
      contextHints,
      queryId,
    });

    const { answer, generatedSql, confidence, sources } = geminiResponse;

    // Step 4: Validate generated SQL (SELECT-only enforcement)
    let validatedSql = null;
    if (generatedSql) {
      const isValid = safetyFilters.validateSelectOnlySQL(generatedSql);
      if (isValid) {
        validatedSql = generatedSql;
      } else {
        logger.warn({ queryId, sql: generatedSql }, 'SQL validation failed: non-SELECT statement detected');
      }
    }

    // Step 5: Build response with explainability
    const elapsedMs = Date.now() - startTime;
    const response = {
      queryId,
      answer: answer || 'Unable to generate answer. Please rephrase your question.',
      sql: validatedSql,
      sources: sources || [],
      confidence: confidence || 0.5,
      piiDetected,
      timestamp: new Date().toISOString(),
      elapsedMs,
    };

    // Step 6: Log query for audit
    logger.info({
      queryId,
      userId: sanitizedUserId,
      query: sanitizedQuery.substring(0, 100),
      confidence,
      elapsedMs,
      piiDetected,
    }, 'Query completed successfully');

    return res.json(response);

  } catch (error) {
    logger.error({ queryId, error: error.message, stack: error.stack }, 'Query failed');
    return res.status(500).json({
      error: 'Internal server error. Please try again later.',
      queryId,
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  logger.info(`AI Analyst Backend listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Gemini Project: ${process.env.GEMINI_PROJECT_ID}`);
});

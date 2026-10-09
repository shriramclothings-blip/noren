const axios = require('axios');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * Call Gemini API to generate analyst response
 * Uses the Generative AI REST endpoint
 */
async function generateResponse({ query, intent, contextHints, queryId }) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Build the prompt for the analyst
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(query, intent, contextHints);

    logger.info({ queryId, model: GEMINI_MODEL }, 'Calling Gemini API');

    // Call Gemini API v1/generateContent endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: userPrompt },
          ],
        },
      ],
      generationConfig: {
        temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
        maxOutputTokens: parseInt(process.env.MAX_TOKENS) || 2000,
      },
    };

    const response = await axios.post(url, payload, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Parse Gemini response
    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!content) {
      throw new Error('No content in Gemini response');
    }

    logger.info({ queryId, contentLength: content.length }, 'Gemini response received');

    // Parse structured response from LLM (JSON format)
    let parsed = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      logger.warn({ queryId, content }, 'Failed to parse JSON from Gemini, using raw content');
      parsed = { answer: content, sql: null, confidence: 0.5 };
    }

    return {
      answer: parsed.answer || content,
      generatedSql: parsed.sql || null,
      confidence: parsed.confidence || 0.6,
      sources: parsed.sources || [],
    };

  } catch (error) {
    logger.error({ queryId, error: error.message, stack: error.stack }, 'Gemini API call failed');
    throw error;
  }
}

/**
 * Build system prompt for Gemini analyst assistant
 */
function buildSystemPrompt() {
  return `You are a read-only business analyst for a billing POS system. Your role is to:
1. Answer questions about sales, inventory, customers, and expenses using provided data.
2. Always return responses in JSON format with: { "answer": "...", "sql": "...", "confidence": 0.0-1.0, "sources": ["..."] }
3. For data queries, provide SQL SELECT statements (no INSERT/UPDATE/DELETE).
4. Include the data sources you used (e.g., "invoices", "products", "customers").
5. Provide confidence scores (0.0-1.0) for your answer accuracy.
6. Never modify data. Always enforce SELECT-only operations.
7. If you cannot answer with confidence, state that clearly.
8. Mask any personally identifiable information in responses.
9. Keep answers concise and actionable.`;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(query, intent, contextHints) {
  const schema = `
Available data:
- invoices: id, date, total, customerId, items (qty, variantId, price), paymentMode, status
- products: id, name, category, barcode, stock, price, costPrice
- variants: id, productId, label, sku, barcode, stock, price
- customers: id, name, phone, email, total_spent, total_orders, dues, points
- expenses: id, date, category, amount, notes
- purchases: id, date, supplierId, items (qty, productId, costPrice), total

Time periods:
- Today: last 24 hours
- This week: last 7 days
- This month: last 30 days
- This quarter: last 90 days
- This year: last 365 days
  `;

  const contextStr = contextHints ? `\nContext hints: ${JSON.stringify(contextHints)}` : '';

  return `${schema}

Query: "${query}"
Intent detected: ${intent.type} (confidence: ${intent.confidence})
${contextStr}

Respond with JSON containing your analysis, any relevant SQL, and sources used. Ensure all SQL is SELECT-only.`;
}

module.exports = {
  generateResponse,
};

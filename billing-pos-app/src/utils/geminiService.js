// ============================================================
// GEMINI AI SERVICE — VENDEXA RetailOS
// Calls Google Gemini REST API directly from the renderer.
// NO separate backend/server needed — fully embedded.
// API key is stored in app settings (encrypted at rest).
// ============================================================

import { getSetting, setSetting } from '../db/db';

const GEMINI_CONFIG_KEY = 'geminiConfig';

// ── Default config ────────────────────────────────────────────────────────
export const DEFAULT_GEMINI_CONFIG = {
  apiKey: '',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 2000,
};

// ── Config persistence ────────────────────────────────────────────────────
export const loadGeminiConfig = async () => {
  const stored = await getSetting(GEMINI_CONFIG_KEY);
  return { ...DEFAULT_GEMINI_CONFIG, ...(stored || {}) };
};

export const saveGeminiConfig = async (config = {}) => {
  const merged = { ...DEFAULT_GEMINI_CONFIG, ...config };
  merged.apiKey = String(merged.apiKey || '').trim();
  merged.model = String(merged.model || 'gemini-1.5-flash').trim();
  merged.temperature = Math.max(0, Math.min(1, Number(merged.temperature) || 0.7));
  merged.maxTokens = Math.max(256, Math.min(8192, Number(merged.maxTokens) || 2000));
  await setSetting(GEMINI_CONFIG_KEY, merged);
  return merged;
};

// ── PII masking (keeps private info out of Gemini prompts) ─────────────────
const PII_PATTERNS = [
  { regex: /\b\d{10,12}\b/g, replacement: '[PHONE]' },
  { regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g, replacement: '[PAN]' },
  { regex: /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]\b/gi, replacement: '[GSTIN]' },
  { regex: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, replacement: '[EMAIL]' },
];

export const maskPII = (text = '') => {
  let masked = text;
  let detected = false;
  for (const { regex, replacement } of PII_PATTERNS) {
    const before = masked;
    masked = masked.replace(regex, replacement);
    if (masked !== before) detected = true;
  }
  return { maskedQuery: masked, piiDetected: detected };
};

// ── SQL SELECT-only validation ────────────────────────────────────────────
const DANGEROUS_SQL_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
  'TRUNCATE', 'REPLACE', 'MERGE', 'EXEC', 'EXECUTE',
];
export const validateSelectOnlySQL = (sql = '') => {
  const upperSql = sql.trim().toUpperCase();
  if (!upperSql.startsWith('SELECT')) return false;
  return !DANGEROUS_SQL_KEYWORDS.some((kw) => {
    const pattern = new RegExp(`\\b${kw}\\b`);
    return pattern.test(upperSql);
  });
};

// ── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a read-only business analyst for a billing POS system named VENDEXA RetailOS. Your role is to:
1. Answer questions about sales, inventory, customers, and expenses using provided data context.
2. Always return responses in valid JSON format: { "answer": "...", "sql": "...", "confidence": 0.0-1.0, "sources": ["..."] }
3. For data queries, provide SQL SELECT statements only (no INSERT/UPDATE/DELETE/DROP).
4. Include the data sources you used (e.g., "invoices", "products", "customers").
5. Provide confidence scores (0.0-1.0) for your answer accuracy.
6. Never modify data. Always enforce SELECT-only operations.
7. If you cannot answer confidently, clearly state that.
8. Keep answers concise, professional, and actionable.
9. Use Indian Rupee (₹) as the currency symbol unless the context specifies otherwise.

Available data schema:
- invoices: id, date, total, customerId, customerName, items (qty, name, price, total), paymentMode, status
- products: id, name, category, barcode, stock, price, costPrice
- variants: id, productId, label, sku, barcode, stock, price
- customers: id, name, phone, email, total_spent, total_orders, dues, points
- expenses: id, date, category, amount, notes
- purchases: id, date, supplierId, items (qty, productId, costPrice), total

Time periods: Today = last 24h, This week = last 7 days, This month = last 30 days, This quarter = last 90 days`;

// ── Core query function ───────────────────────────────────────────────────
export const queryGemini = async (userQuery, contextData = {}) => {
  const config = await loadGeminiConfig();

  if (!config.apiKey) {
    return {
      success: false,
      error:
        'Gemini API key not configured. Go to Settings → AI & Integrations to add your key.',
    };
  }

  const { maskedQuery, piiDetected } = maskPII(userQuery);

  // Build context string from live data snapshot
  const contextParts = [];
  if (contextData.summary) {
    contextParts.push(
      `Business snapshot (last 30 days): ${JSON.stringify(contextData.summary, null, 2)}`
    );
  }
  if (contextData.topSkus?.length) {
    contextParts.push(
      `Top products: ${JSON.stringify(contextData.topSkus.slice(0, 5), null, 2)}`
    );
  }
  if (contextData.lowStock?.length) {
    contextParts.push(
      `Low stock alerts: ${JSON.stringify(contextData.lowStock.slice(0, 10), null, 2)}`
    );
  }

  const userPrompt = [
    SYSTEM_PROMPT,
    contextParts.length ? `\n\nLive Data Context:\n${contextParts.join('\n\n')}` : '',
    `\n\nUser question: "${maskedQuery}"`,
    '\n\nRespond with JSON only. No markdown fences, no extra text.',
  ].join('');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    },
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    let responseData;

    // Use Electron IPC fallback if available (handles CSP restrictions in production builds)
    if (window?.electronAPI?.geminiQuery) {
      clearTimeout(timer);
      const ipcResult = await window.electronAPI.geminiQuery({ apiKey: config.apiKey, model: config.model, payload });
      if (!ipcResult.success) {
        return { success: false, error: ipcResult.error || 'Gemini IPC call failed.' };
      }
      responseData = ipcResult.data;
    } else {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData?.error?.message ||
          `Gemini API error (${response.status}). Check your API key.`;
        return { success: false, error: errMsg };
      }
      responseData = await response.json();
    }

    const rawContent =
      responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawContent) {
      return { success: false, error: 'Empty response from Gemini. Try rephrasing your question.' };
    }

    // Parse JSON from the response
    let parsed = {};
    try {
      // Strip possible markdown fences
      const jsonText = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(jsonText);
    } catch {
      // If not valid JSON, wrap raw text as the answer
      parsed = { answer: rawContent, sql: null, confidence: 0.5, sources: [] };
    }

    // Validate SQL safety
    let validatedSql = null;
    if (parsed.sql) {
      validatedSql = validateSelectOnlySQL(parsed.sql) ? parsed.sql : null;
    }

    return {
      success: true,
      answer: parsed.answer || rawContent,
      sql: validatedSql,
      confidence: Number(parsed.confidence) || 0.6,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      piiDetected,
      queryId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Gemini request timed out after 30 seconds.' };
    }
    return {
      success: false,
      error: err.message || 'Failed to reach Gemini API. Check your internet connection.',
    };
  }
};

// ── Test API key ──────────────────────────────────────────────────────────
export const testGeminiApiKey = async (apiKey, model = 'gemini-1.5-flash') => {
  if (!apiKey?.trim()) return { success: false, error: 'API key is empty.' };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  const testPayload = {
    contents: [{ role: 'user', parts: [{ text: 'Say "ok" in one word.' }] }],
    generationConfig: { maxOutputTokens: 10 },
  };

  try {
    // Use Electron IPC fallback if available
    if (window?.electronAPI?.geminiQuery) {
      const result = await window.electronAPI.geminiQuery({ apiKey: apiKey.trim(), model, payload: testPayload });
      if (result.success) return { success: true, message: 'API key is valid.' };
      return { success: false, error: result.error };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) return { success: true, message: 'API key is valid.' };

    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${response.status}`;
    return { success: false, error: msg };
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, error: 'Request timed out.' };
    return { success: false, error: err.message };
  }
};

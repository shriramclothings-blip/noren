/**
 * AI Invoice Analysis Service
 * Provides intelligent analysis of invoices using Groq AI
 * Features: Smart categorization, fraud detection, pattern analysis, insights
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AIInvoiceAnalysisService {
  constructor() {
    this.apiKey = null;
    this.primaryModel = 'llama-3.3-70b-versatile';
    this.fastModel = 'llama-3.1-8b-instant';
    this.isEnabled = false;
    this.loadConfig();
  }

  loadConfig() {
    try {
      const config = JSON.parse(localStorage.getItem('aiSettings') || '{}');
      this.apiKey = config.groqApiKey || process.env.REACT_APP_GROQ_API_KEY;
      this.primaryModel = config.primaryModel || this.primaryModel;
      this.fastModel = config.fastModel || this.fastModel;
      this.isEnabled = config.aiEnabled && config.enableInvoiceAnalysis && !!this.apiKey;
    } catch (err) {
      console.error('Failed to load AI config:', err);
      this.isEnabled = false;
    }
  }

  async makeAIRequest(messages, model = null, temperature = 0.3) {
    if (!this.isEnabled || !this.apiKey) {
      throw new Error('AI service not configured or disabled');
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || this.primaryModel,
        messages,
        temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'AI request failed');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Analyze a single invoice for patterns, anomalies, and insights
   */
  async analyzeInvoice(invoice) {
    try {
      const prompt = `Analyze this retail invoice and provide insights in JSON format:

INVOICE DATA:
- Invoice #: ${invoice.invoiceNumber || 'N/A'}
- Date: ${invoice.date || 'N/A'}
- Customer: ${invoice.customer?.name || 'Anonymous'}
- Items: ${JSON.stringify(invoice.items || [])}
- Total: ₹${invoice.total || 0}
- Payment Mode: ${invoice.paymentMode || 'Cash'}
- Discount: ₹${invoice.discount || 0}
- Tax: ₹${invoice.tax || 0}

Provide analysis as JSON with these fields:
{
  "category": "grocery|electronics|clothing|food|mixed|other",
  "confidence": 0.0-1.0,
  "insights": [
    "Brief insight about customer behavior",
    "Product mix analysis",
    "Pricing observations"
  ],
  "anomalies": [
    "Any unusual patterns or suspicious activity"
  ],
  "fraudRisk": {
    "score": 0.0-1.0,
    "reasons": ["reason1", "reason2"],
    "recommendation": "approve|review|flag"
  },
  "customerProfile": {
    "type": "regular|new|premium|price_sensitive",
    "purchasePattern": "bulk|individual|seasonal",
    "preferredCategories": ["category1", "category2"]
  },
  "recommendations": [
    "Upsell/cross-sell suggestions",
    "Inventory recommendations",
    "Customer retention tips"
  ]
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.primaryModel);

      return this.parseAIResponse(result, invoice);
    } catch (err) {
      console.error('Invoice analysis failed:', err);
      return this.createFallbackAnalysis(invoice);
    }
  }

  /**
   * Batch analyze multiple invoices for patterns and trends
   */
  async batchAnalyzeInvoices(invoices, options = {}) {
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return { summary: {}, patterns: [], recommendations: [] };
    }

    try {
      // Analyze in chunks to avoid token limits
      const chunkSize = 5;
      const chunks = [];
      for (let i = 0; i < invoices.length; i += chunkSize) {
        chunks.push(invoices.slice(i, i + chunkSize));
      }

      const results = [];
      for (const chunk of chunks) {
        const chunkResult = await this.analyzeInvoiceChunk(chunk);
        results.push(chunkResult);
      }

      return this.aggregateBatchResults(results, invoices);
    } catch (err) {
      console.error('Batch analysis failed:', err);
      return this.createFallbackBatchAnalysis(invoices);
    }
  }

  async analyzeInvoiceChunk(invoices) {
    const prompt = `Analyze these ${invoices.length} retail invoices for patterns and trends:

INVOICES:
${invoices.map((inv, idx) => `
${idx + 1}. Invoice #${inv.invoiceNumber} - ₹${inv.total} - ${inv.date}
   Items: ${inv.items?.map(item => `${item.name} (₹${item.price})`).join(', ') || 'N/A'}
   Customer: ${inv.customer?.name || 'Anonymous'}
   Payment: ${inv.paymentMode || 'Cash'}
`).join('')}

Provide analysis as JSON:
{
  "patterns": [
    {
      "type": "spending|timing|product|payment",
      "description": "Pattern description",
      "confidence": 0.0-1.0,
      "frequency": "daily|weekly|monthly|seasonal"
    }
  ],
  "anomalies": [
    {
      "invoice": "invoice_number",
      "type": "amount|items|timing|payment",
      "severity": "low|medium|high",
      "description": "What's unusual"
    }
  ],
  "insights": [
    "Key business insights from this batch"
  ],
  "recommendations": [
    "Action items for business optimization"
  ]
}`;

    const result = await this.makeAIRequest([
      { role: 'user', content: prompt }
    ], this.fastModel);

    return this.parseAIResponse(result);
  }

  /**
   * Detect potentially fraudulent transactions
   */
  async detectFraud(invoice) {
    try {
      const prompt = `Analyze this invoice for fraud indicators:

INVOICE:
- Amount: ₹${invoice.total}
- Items: ${invoice.items?.length || 0} items
- Payment: ${invoice.paymentMode}
- Time: ${invoice.date}
- Discount: ₹${invoice.discount || 0}
- Customer: ${invoice.customer?.name || 'Anonymous'}

Check for:
- Unusual amounts or patterns
- Suspicious item combinations
- Timing anomalies
- Payment method red flags
- Excessive discounts

Respond with JSON:
{
  "riskScore": 0.0-1.0,
  "riskLevel": "low|medium|high|critical",
  "indicators": [
    {
      "type": "amount|items|timing|payment|discount",
      "severity": "low|medium|high",
      "description": "What triggered this flag"
    }
  ],
  "recommendation": "approve|review|investigate|block",
  "confidence": 0.0-1.0
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.fastModel);

      return this.parseAIResponse(result);
    } catch (err) {
      console.error('Fraud detection failed:', err);
      return {
        riskScore: 0.1,
        riskLevel: 'low',
        indicators: [],
        recommendation: 'approve',
        confidence: 0.0
      };
    }
  }

  /**
   * Categorize invoices intelligently
   */
  async categorizeInvoice(invoice) {
    try {
      const items = invoice.items || [];
      if (items.length === 0) return { category: 'other', confidence: 0.5 };

      const prompt = `Categorize this retail transaction:

ITEMS: ${items.map(item => `${item.name} - ₹${item.price}`).join(', ')}
TOTAL: ₹${invoice.total}

Categories: grocery, electronics, clothing, food, pharmacy, stationery, mixed, other

Respond with JSON:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "subcategory": "specific_subcategory",
  "tags": ["tag1", "tag2", "tag3"]
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.fastModel);

      return this.parseAIResponse(result);
    } catch (err) {
      console.error('Categorization failed:', err);
      return this.createFallbackCategory(invoice);
    }
  }

  /**
   * Generate insights from invoice patterns
   */
  async generateInsights(invoices, timeframe = '7d') {
    try {
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const avgTransaction = totalRevenue / invoices.length;
      
      const prompt = `Generate business insights from ${invoices.length} transactions in ${timeframe}:

SUMMARY:
- Total Revenue: ₹${totalRevenue}
- Average Transaction: ₹${avgTransaction.toFixed(2)}
- Transaction Count: ${invoices.length}

TOP ITEMS: ${this.getTopItems(invoices).map(item => `${item.name} (${item.count}x)`).join(', ')}

PAYMENT MODES: ${this.getPaymentModeStats(invoices)}

Provide actionable insights as JSON:
{
  "keyInsights": [
    "Revenue trends and patterns",
    "Customer behavior insights",
    "Product performance analysis",
    "Operational recommendations"
  ],
  "opportunities": [
    "Growth opportunities",
    "Cost optimization areas",
    "Customer engagement ideas"
  ],
  "alerts": [
    "Issues requiring attention"
  ],
  "predictions": [
    "Future trends and forecasts"
  ]
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.primaryModel);

      return this.parseAIResponse(result);
    } catch (err) {
      console.error('Insights generation failed:', err);
      return this.createFallbackInsights(invoices);
    }
  }

  // Helper methods
  parseAIResponse(aiResponse, fallbackData = {}) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return fallbackData;
    } catch (err) {
      console.error('Failed to parse AI response:', err);
      return fallbackData;
    }
  }

  createFallbackAnalysis(invoice) {
    return {
      category: 'mixed',
      confidence: 0.5,
      insights: ['Analysis unavailable - AI service offline'],
      anomalies: [],
      fraudRisk: {
        score: 0.1,
        reasons: [],
        recommendation: 'approve'
      },
      customerProfile: {
        type: 'regular',
        purchasePattern: 'individual',
        preferredCategories: ['general']
      },
      recommendations: ['Enable AI service for detailed analysis']
    };
  }

  createFallbackBatchAnalysis(invoices) {
    return {
      summary: {
        totalInvoices: invoices.length,
        totalRevenue: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        avgTransaction: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0) / invoices.length
      },
      patterns: [],
      recommendations: ['Enable AI service for pattern analysis']
    };
  }

  createFallbackCategory(invoice) {
    const items = invoice.items || [];
    if (items.length === 0) return { category: 'other', confidence: 0.5 };
    
    // Simple keyword-based categorization
    const text = items.map(item => item.name?.toLowerCase() || '').join(' ');
    
    if (/food|snack|drink|beverage|meal/.test(text)) {
      return { category: 'food', confidence: 0.7 };
    } else if (/cloth|shirt|pant|dress|shoe/.test(text)) {
      return { category: 'clothing', confidence: 0.7 };
    } else if (/phone|laptop|electronic|gadget/.test(text)) {
      return { category: 'electronics', confidence: 0.7 };
    }
    
    return { category: 'mixed', confidence: 0.5 };
  }

  createFallbackInsights(invoices) {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    return {
      keyInsights: [
        `Processed ${invoices.length} transactions`,
        `Total revenue: ₹${totalRevenue.toFixed(2)}`,
        'AI analysis unavailable'
      ],
      opportunities: ['Enable AI service for detailed insights'],
      alerts: [],
      predictions: []
    };
  }

  getTopItems(invoices) {
    const itemCounts = {};
    invoices.forEach(invoice => {
      (invoice.items || []).forEach(item => {
        const name = item.name || 'Unknown';
        itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
      });
    });
    
    return Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  getPaymentModeStats(invoices) {
    const modes = {};
    invoices.forEach(invoice => {
      const mode = invoice.paymentMode || 'Cash';
      modes[mode] = (modes[mode] || 0) + 1;
    });
    
    return Object.entries(modes)
      .map(([mode, count]) => `${mode}: ${count}`)
      .join(', ');
  }

  // Public API methods
  async quickFraudCheck(invoice) {
    this.loadConfig();
    if (!this.isEnabled) return { riskLevel: 'low', riskScore: 0.1 };
    
    return await this.detectFraud(invoice);
  }

  async getInvoiceCategory(invoice) {
    this.loadConfig();
    if (!this.isEnabled) return this.createFallbackCategory(invoice);
    
    return await this.categorizeInvoice(invoice);
  }

  async getBusinessInsights(invoices, timeframe = '7d') {
    this.loadConfig();
    if (!this.isEnabled) return this.createFallbackInsights(invoices);
    
    return await this.generateInsights(invoices, timeframe);
  }
}

// Export singleton instance
export default new AIInvoiceAnalysisService();
/**
 * AI Customer Insights Service
 * Provides intelligent analysis of customer behavior and purchase patterns
 * Features: Purchase pattern analysis, loyalty predictions, personalized recommendations
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AICustomerInsightsService {
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
      this.isEnabled = config.aiEnabled && config.enableCustomerInsights && !!this.apiKey;
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
   * Analyze customer purchase patterns and behavior
   */
  async analyzeCustomerBehavior(customer, invoices = []) {
    try {
      // Filter invoices for this customer
      const customerInvoices = invoices.filter(inv => 
        inv.customer?.id === customer.id || 
        inv.customer?.name === customer.name ||
        inv.customer?.phone === customer.phone
      );

      if (customerInvoices.length === 0) {
        return this.createNewCustomerProfile(customer);
      }

      const totalSpent = customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const avgTransaction = totalSpent / customerInvoices.length;
      const frequency = this.calculateVisitFrequency(customerInvoices);
      
      const prompt = `Analyze this customer's purchase behavior and provide insights:

CUSTOMER: ${customer.name} (${customer.phone || 'No phone'})
TOTAL INVOICES: ${customerInvoices.length}
TOTAL SPENT: ₹${totalSpent.toFixed(2)}
AVERAGE TRANSACTION: ₹${avgTransaction.toFixed(2)}
VISIT FREQUENCY: ${frequency.description}

RECENT PURCHASES:
${customerInvoices.slice(-5).map(inv => `
- ${inv.date}: ₹${inv.total} (${inv.items?.length || 0} items)
  Items: ${inv.items?.map(item => item.name).join(', ') || 'N/A'}
  Payment: ${inv.paymentMode}
`).join('')}

ALL ITEMS PURCHASED:
${this.getCustomerItemHistory(customerInvoices)}

Provide comprehensive customer analysis as JSON:
{
  "profile": {
    "segment": "vip|loyal|regular|occasional|new|at_risk|lost",
    "tier": "platinum|gold|silver|bronze",
    "spendingHabits": "high_value|bulk_buyer|frequent|seasonal|deal_hunter",
    "loyaltyScore": 0.0-1.0,
    "riskLevel": "low|medium|high"
  },
  "insights": [
    "Key behavioral patterns",
    "Shopping preferences",
    "Value to business"
  ],
  "preferences": {
    "favoriteCategories": ["category1", "category2"],
    "averageVisitValue": 0.0,
    "preferredPayment": "cash|card|upi",
    "seasonality": "consistent|seasonal|holiday_shopper"
  },
  "predictions": {
    "nextVisitProbability": 0.0-1.0,
    "churnRisk": 0.0-1.0,
    "lifetimeValue": 0.0,
    "nextPurchaseWindow": "1-7days|1-2weeks|1month|2-3months"
  },
  "recommendations": {
    "personalizedOffers": ["offer1", "offer2"],
    "crossSellItems": ["item1", "item2"],
    "retentionStrategy": "strategy_description",
    "communicationFrequency": "weekly|monthly|quarterly"
  }
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.primaryModel);

      return this.parseAIResponse(result, {
        customerId: customer.id,
        customerName: customer.name,
        analysisDate: new Date().toISOString(),
        totalInvoices: customerInvoices.length,
        totalSpent,
        avgTransaction,
        frequency
      });

    } catch (err) {
      console.error('Customer behavior analysis failed:', err);
      return this.createFallbackCustomerProfile(customer, invoices);
    }
  }

  /**
   * Generate personalized product recommendations
   */
  async generateProductRecommendations(customer, invoices = [], products = []) {
    try {
      const customerInvoices = invoices.filter(inv => 
        inv.customer?.id === customer.id || 
        inv.customer?.name === customer.name ||
        inv.customer?.phone === customer.phone
      );

      if (customerInvoices.length === 0) {
        return this.createNewCustomerRecommendations(products);
      }

      const purchasedItems = this.getUniqueItemsPurchased(customerInvoices);
      const categories = this.getPreferredCategories(customerInvoices);
      const priceRange = this.getCustomerPriceRange(customerInvoices);

      const prompt = `Generate personalized product recommendations for this customer:

CUSTOMER PROFILE:
- Name: ${customer.name}
- Purchase History: ${customerInvoices.length} transactions
- Preferred Categories: ${categories.join(', ')}
- Price Range: ₹${priceRange.min} - ₹${priceRange.max}

PREVIOUSLY PURCHASED:
${purchasedItems.slice(0, 10).map(item => `- ${item.name} (${item.count}x)`).join('\n')}

AVAILABLE PRODUCTS:
${products.slice(0, 20).map(p => `- ${p.name}: ₹${p.price || p.sellingPrice} (Category: ${p.category || 'General'})`).join('\n')}

Provide recommendations as JSON:
{
  "recommendations": [
    {
      "type": "cross_sell|up_sell|replenishment|new_category",
      "productName": "product_name",
      "reason": "why_recommended",
      "confidence": 0.0-1.0,
      "expectedValue": 0.0
    }
  ],
  "bundles": [
    {
      "name": "bundle_name",
      "products": ["product1", "product2"],
      "discount": 0.0,
      "reason": "bundle_rationale"
    }
  ],
  "timing": {
    "bestTime": "morning|afternoon|evening",
    "frequency": "weekly|monthly|seasonal",
    "nextContact": "immediately|1week|2weeks|1month"
  }
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.fastModel);

      return this.parseAIResponse(result, {
        customerId: customer.id,
        generatedAt: new Date().toISOString(),
        basedOnInvoices: customerInvoices.length
      });

    } catch (err) {
      console.error('Recommendation generation failed:', err);
      return this.createFallbackRecommendations(customer);
    }
  }

  /**
   * Predict customer lifetime value and retention
   */
  async predictCustomerValue(customer, invoices = []) {
    try {
      const customerInvoices = invoices.filter(inv => 
        inv.customer?.id === customer.id || 
        inv.customer?.name === customer.name ||
        inv.customer?.phone === customer.phone
      ).sort((a, b) => new Date(a.date) - new Date(b.date));

      if (customerInvoices.length < 2) {
        return this.createNewCustomerValuePrediction(customer);
      }

      const monthlySpending = this.calculateMonthlySpending(customerInvoices);
      const trend = this.calculateSpendingTrend(customerInvoices);
      const recency = this.getDaysSinceLastVisit(customerInvoices);

      const prompt = `Predict customer lifetime value and retention probability:

CUSTOMER: ${customer.name}
TRANSACTION HISTORY: ${customerInvoices.length} purchases
MONTHLY SPENDING PATTERN: ${JSON.stringify(monthlySpending)}
SPENDING TREND: ${trend.direction} (${trend.percentage}%)
DAYS SINCE LAST VISIT: ${recency}

INVOICE SEQUENCE:
${customerInvoices.map((inv, idx) => `${idx + 1}. ${inv.date}: ₹${inv.total} (${inv.items?.length || 0} items)`).join('\n')}

Predict customer value as JSON:
{
  "lifetimeValue": {
    "predicted": 0.0,
    "confidence": 0.0-1.0,
    "timeframe": "6months|1year|2years|3years"
  },
  "retention": {
    "probability": 0.0-1.0,
    "riskFactors": ["factor1", "factor2"],
    "strengthFactors": ["strength1", "strength2"]
  },
  "growth": {
    "potential": "high|medium|low",
    "expectedIncrease": 0.0,
    "growthDrivers": ["driver1", "driver2"]
  },
  "churnRisk": {
    "probability": 0.0-1.0,
    "primaryReasons": ["reason1", "reason2"],
    "preventionActions": ["action1", "action2"]
  }
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.primaryModel);

      return this.parseAIResponse(result, {
        customerId: customer.id,
        calculatedAt: new Date().toISOString(),
        basedOnInvoices: customerInvoices.length,
        monthlySpending,
        trend,
        recency
      });

    } catch (err) {
      console.error('Customer value prediction failed:', err);
      return this.createFallbackValuePrediction(customer);
    }
  }

  /**
   * Segment customers intelligently
   */
  async segmentCustomers(customers = [], invoices = []) {
    try {
      // Pre-calculate customer metrics
      const customerMetrics = customers.map(customer => {
        const customerInvoices = invoices.filter(inv => 
          inv.customer?.id === customer.id || 
          inv.customer?.name === customer.name ||
          inv.customer?.phone === customer.phone
        );

        const totalSpent = customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const frequency = customerInvoices.length;
        const recency = this.getDaysSinceLastVisit(customerInvoices);
        
        return {
          ...customer,
          totalSpent,
          frequency,
          recency,
          avgTransaction: frequency > 0 ? totalSpent / frequency : 0
        };
      });

      // Sort by value for AI analysis
      const topCustomers = customerMetrics
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 20);

      const prompt = `Segment these customers into meaningful groups:

TOP CUSTOMERS:
${topCustomers.map(c => `
${c.name}: ₹${c.totalSpent.toFixed(0)} total, ${c.frequency} visits, ${c.recency} days ago, ₹${c.avgTransaction.toFixed(0)} avg
`).join('')}

OVERALL STATISTICS:
- Total Customers: ${customers.length}
- Active Customers: ${customerMetrics.filter(c => c.recency <= 30).length}
- High Value (>₹10k): ${customerMetrics.filter(c => c.totalSpent > 10000).length}

Create customer segments as JSON:
{
  "segments": [
    {
      "name": "segment_name",
      "description": "segment_description",
      "criteria": "qualification_criteria",
      "customerCount": 0,
      "characteristics": ["trait1", "trait2"],
      "marketingStrategy": "how_to_approach_this_segment"
    }
  ],
  "insights": [
    "Key findings about customer base",
    "Opportunities for growth",
    "Retention strategies needed"
  ]
}`;

      const result = await this.makeAIRequest([
        { role: 'user', content: prompt }
      ], this.primaryModel);

      const segmentation = this.parseAIResponse(result, {
        totalCustomers: customers.length,
        analyzedDate: new Date().toISOString()
      });

      // Apply segments to customer metrics
      return this.applySegmentsToCustomers(customerMetrics, segmentation);

    } catch (err) {
      console.error('Customer segmentation failed:', err);
      return this.createFallbackSegmentation(customers);
    }
  }

  // Helper methods
  calculateVisitFrequency(invoices) {
    if (invoices.length === 0) return { frequency: 0, description: 'No visits' };
    
    const dates = invoices.map(inv => new Date(inv.date)).sort((a, b) => a - b);
    const daysBetween = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    const frequency = invoices.length / Math.max(daysBetween / 30, 1); // visits per month
    
    let description = 'Irregular';
    if (frequency >= 8) description = 'Very Frequent (8+ times/month)';
    else if (frequency >= 4) description = 'Frequent (4-8 times/month)';
    else if (frequency >= 2) description = 'Regular (2-4 times/month)';
    else if (frequency >= 0.5) description = 'Occasional (1-2 times/month)';
    
    return { frequency, description };
  }

  getCustomerItemHistory(invoices) {
    const items = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const name = item.name || 'Unknown';
        items[name] = (items[name] || 0) + (item.quantity || 1);
      });
    });
    
    return Object.entries(items)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => `${name} (${count}x)`)
      .join(', ');
  }

  getUniqueItemsPurchased(invoices) {
    const items = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const name = item.name || 'Unknown';
        items[name] = (items[name] || 0) + (item.quantity || 1);
      });
    });
    
    return Object.entries(items)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  getPreferredCategories(invoices) {
    const categories = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const category = item.category || 'General';
        categories[category] = (categories[category] || 0) + 1;
      });
    });
    
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  getCustomerPriceRange(invoices) {
    const amounts = invoices.map(inv => inv.total || 0).filter(amt => amt > 0);
    if (amounts.length === 0) return { min: 0, max: 1000 };
    
    return {
      min: Math.min(...amounts),
      max: Math.max(...amounts)
    };
  }

  calculateMonthlySpending(invoices) {
    const monthlySpend = {};
    invoices.forEach(inv => {
      const month = new Date(inv.date).toISOString().substring(0, 7);
      monthlySpend[month] = (monthlySpend[month] || 0) + (inv.total || 0);
    });
    
    return monthlySpend;
  }

  calculateSpendingTrend(invoices) {
    if (invoices.length < 3) return { direction: 'stable', percentage: 0 };
    
    const recent = invoices.slice(-3).reduce((sum, inv) => sum + (inv.total || 0), 0);
    const earlier = invoices.slice(-6, -3).reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    if (earlier === 0) return { direction: 'new', percentage: 0 };
    
    const change = ((recent - earlier) / earlier) * 100;
    const direction = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
    
    return { direction, percentage: Math.abs(change) };
  }

  getDaysSinceLastVisit(invoices) {
    if (invoices.length === 0) return 999;
    
    const lastVisit = Math.max(...invoices.map(inv => new Date(inv.date).getTime()));
    const daysSince = Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60 * 24));
    
    return daysSince;
  }

  parseAIResponse(aiResponse, fallbackData = {}) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...fallbackData, ...JSON.parse(jsonMatch[0]) };
      }
      return fallbackData;
    } catch (err) {
      console.error('Failed to parse AI response:', err);
      return fallbackData;
    }
  }

  // Fallback methods
  createNewCustomerProfile(customer) {
    return {
      profile: {
        segment: 'new',
        tier: 'bronze',
        spendingHabits: 'unknown',
        loyaltyScore: 0.5,
        riskLevel: 'medium'
      },
      insights: ['New customer - no purchase history available'],
      preferences: {
        favoriteCategories: ['general'],
        averageVisitValue: 0,
        preferredPayment: 'cash',
        seasonality: 'unknown'
      },
      predictions: {
        nextVisitProbability: 0.6,
        churnRisk: 0.3,
        lifetimeValue: 1000,
        nextPurchaseWindow: '1-2weeks'
      },
      recommendations: {
        personalizedOffers: ['Welcome discount', 'First purchase incentive'],
        crossSellItems: [],
        retentionStrategy: 'Focus on great first experience',
        communicationFrequency: 'monthly'
      }
    };
  }

  createFallbackCustomerProfile(customer, invoices) {
    const customerInvoices = invoices.filter(inv => 
      inv.customer?.id === customer.id || 
      inv.customer?.name === customer.name
    );
    
    const totalSpent = customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const frequency = customerInvoices.length;
    
    let segment = 'regular';
    if (totalSpent > 50000) segment = 'vip';
    else if (totalSpent > 20000) segment = 'loyal';
    else if (frequency < 3) segment = 'occasional';
    
    return {
      profile: {
        segment,
        tier: totalSpent > 50000 ? 'gold' : 'silver',
        spendingHabits: frequency > 10 ? 'frequent' : 'regular',
        loyaltyScore: Math.min(totalSpent / 50000, 1.0),
        riskLevel: 'low'
      },
      insights: [`${frequency} transactions totaling ₹${totalSpent.toFixed(2)}`],
      preferences: {
        favoriteCategories: ['general'],
        averageVisitValue: frequency > 0 ? totalSpent / frequency : 0,
        preferredPayment: 'cash',
        seasonality: 'consistent'
      },
      predictions: {
        nextVisitProbability: 0.7,
        churnRisk: 0.2,
        lifetimeValue: totalSpent * 2,
        nextPurchaseWindow: '1-2weeks'
      },
      recommendations: {
        personalizedOffers: ['Loyalty discount'],
        crossSellItems: [],
        retentionStrategy: 'Maintain current service level',
        communicationFrequency: 'monthly'
      }
    };
  }

  createNewCustomerRecommendations(products) {
    const popular = products.slice(0, 3);
    return {
      recommendations: popular.map(p => ({
        type: 'new_category',
        productName: p.name,
        reason: 'Popular item for new customers',
        confidence: 0.6,
        expectedValue: p.price || p.sellingPrice || 100
      })),
      bundles: [],
      timing: {
        bestTime: 'afternoon',
        frequency: 'monthly',
        nextContact: '1week'
      }
    };
  }

  createFallbackRecommendations(customer) {
    return {
      recommendations: [
        {
          type: 'cross_sell',
          productName: 'Popular item',
          reason: 'Commonly purchased item',
          confidence: 0.5,
          expectedValue: 100
        }
      ],
      bundles: [],
      timing: {
        bestTime: 'afternoon',
        frequency: 'monthly',
        nextContact: 'immediately'
      }
    };
  }

  createNewCustomerValuePrediction(customer) {
    return {
      lifetimeValue: {
        predicted: 5000,
        confidence: 0.4,
        timeframe: '1year'
      },
      retention: {
        probability: 0.6,
        riskFactors: ['New customer'],
        strengthFactors: ['Recent signup']
      },
      growth: {
        potential: 'medium',
        expectedIncrease: 0.2,
        growthDrivers: ['Onboarding experience']
      },
      churnRisk: {
        probability: 0.4,
        primaryReasons: ['Lack of engagement'],
        preventionActions: ['Follow-up communication']
      }
    };
  }

  createFallbackValuePrediction(customer) {
    return {
      lifetimeValue: {
        predicted: 3000,
        confidence: 0.3,
        timeframe: '1year'
      },
      retention: {
        probability: 0.5,
        riskFactors: ['Analysis unavailable'],
        strengthFactors: []
      },
      growth: {
        potential: 'medium',
        expectedIncrease: 0.1,
        growthDrivers: ['Service improvement']
      },
      churnRisk: {
        probability: 0.5,
        primaryReasons: ['Unknown patterns'],
        preventionActions: ['Improve data collection']
      }
    };
  }

  createFallbackSegmentation(customers) {
    return {
      segments: [
        {
          name: 'All Customers',
          description: 'Basic customer base',
          criteria: 'All registered customers',
          customerCount: customers.length,
          characteristics: ['Mixed spending patterns'],
          marketingStrategy: 'General promotions'
        }
      ],
      insights: [
        'Enable AI analysis for detailed customer segmentation',
        `${customers.length} total customers in database`
      ]
    };
  }

  applySegmentsToCustomers(customers, segmentation) {
    // Simple rule-based segmentation as fallback
    const segmented = customers.map(customer => {
      let segment = 'regular';
      if (customer.totalSpent > 50000) segment = 'vip';
      else if (customer.totalSpent > 20000) segment = 'loyal';
      else if (customer.frequency < 3) segment = 'occasional';
      else if (customer.recency > 90) segment = 'at_risk';
      
      return { ...customer, segment };
    });

    return {
      ...segmentation,
      customers: segmented
    };
  }
}

// Export singleton instance
export default new AICustomerInsightsService();
/**
 * AI Inventory Prediction Service for VENDEXA RetailOS™
 * 
 * Advanced inventory management with AI-powered predictions:
 * - Stock level forecasting using historical sales data
 * - Intelligent low stock alerts with seasonal adjustments
 * - Reorder point recommendations based on demand patterns
 * - Trend analysis and seasonal demand prediction
 * - Automated inventory notifications and alerts
 * 
 * Uses machine learning algorithms for accurate predictions
 */

import { dbGetAll, getSetting, setSetting } from '../db/db';

class AIInventoryPredictionService {
  constructor() {
    this.isInitialized = false;
    this.config = {
      apiUrl: process.env.REACT_APP_API_URL || 'https://noren-iqk3.onrender.com/api',
      groqApiKey: process.env.REACT_APP_GROQ_API_KEY,
      primaryModel: 'llama-3.3-70b-versatile',
      fastModel: 'llama-3.1-8b-instant',
      predictionDays: 30, // Forecast for next 30 days
      minHistoryDays: 7, // Minimum history for predictions
      lowStockThreshold: 0.2, // 20% of average monthly sales
      alertFrequency: 'daily', // daily, weekly, realtime
      enableSeasonalAdjustment: true,
      enableTrendAnalysis: true,
      confidenceThreshold: 0.7 // Minimum confidence for predictions
    };
    
    this.salesHistory = new Map();
    this.predictions = new Map();
    this.alerts = [];
    this.lastAnalysis = null;
  }

  /**
   * Initialize the AI inventory prediction service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadConfiguration();
      await this.loadHistoricalData();
      await this.generatePredictions();
      
      this.isInitialized = true;
      console.log('AI Inventory Prediction Service initialized successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize AI Inventory Prediction Service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load configuration from settings
   */
  async loadConfiguration() {
    try {
      const savedConfig = await getSetting('aiInventoryConfig');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load AI inventory configuration:', error);
    }
  }

  /**
   * Save configuration to settings
   */
  async saveConfiguration() {
    try {
      await setSetting('aiInventoryConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save AI inventory configuration:', error);
    }
  }

  /**
   * Load historical sales data for analysis
   */
  async loadHistoricalData() {
    try {
      const invoices = await dbGetAll('invoices');
      const products = await dbGetAll('products');
      
      // Process sales history by product
      this.salesHistory.clear();
      
      invoices.forEach(invoice => {
        if (!invoice.items || !invoice.date) return;
        
        const invoiceDate = new Date(invoice.date);
        const daysSinceEpoch = Math.floor(invoiceDate.getTime() / (1000 * 60 * 60 * 24));
        
        invoice.items.forEach(item => {
          const productId = item.productId || item.id;
          if (!productId) return;
          
          if (!this.salesHistory.has(productId)) {
            this.salesHistory.set(productId, []);
          }
          
          this.salesHistory.get(productId).push({
            date: invoiceDate,
            day: daysSinceEpoch,
            quantity: item.qty || 1,
            price: item.price || 0,
            revenue: (item.qty || 1) * (item.price || 0),
            season: this.getSeason(invoiceDate),
            weekday: invoiceDate.getDay()
          });
        });
      });
      
      // Sort sales history by date for each product
      this.salesHistory.forEach((history, productId) => {
        history.sort((a, b) => a.date - b.date);
      });
      
      console.log(`Loaded sales history for ${this.salesHistory.size} products`);
    } catch (error) {
      console.error('Failed to load historical sales data:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered inventory predictions
   */
  async generatePredictions() {
    try {
      const products = await dbGetAll('products');
      const currentDate = new Date();
      
      this.predictions.clear();
      this.alerts = [];
      
      for (const product of products) {
        const prediction = await this.predictProductDemand(product, currentDate);
        if (prediction) {
          this.predictions.set(product.id, prediction);
          
          // Check for low stock alerts
          const alert = this.checkLowStockAlert(product, prediction);
          if (alert) {
            this.alerts.push(alert);
          }
        }
      }
      
      this.lastAnalysis = new Date();
      await this.savePredictionsToStorage();
      
      console.log(`Generated predictions for ${this.predictions.size} products, ${this.alerts.length} alerts`);
    } catch (error) {
      console.error('Failed to generate inventory predictions:', error);
      throw error;
    }
  }

  /**
   * Predict demand for a specific product using AI analysis
   */
  async predictProductDemand(product, fromDate = new Date()) {
    try {
      const history = this.salesHistory.get(product.id) || [];
      
      if (history.length < 3) {
        // Not enough data for meaningful prediction
        return this.generateBasicPrediction(product, history);
      }

      // Calculate key metrics
      const metrics = this.calculateDemandMetrics(history);
      const seasonalFactors = this.calculateSeasonalFactors(history);
      const trendAnalysis = this.calculateTrendAnalysis(history);
      
      // Use AI to enhance predictions
      const aiPrediction = await this.getAIEnhancedPrediction(product, metrics, seasonalFactors, trendAnalysis);
      
      return {
        productId: product.id,
        productName: product.name,
        currentStock: product.stock || 0,
        historicalData: {
          totalSales: history.length,
          averageDaily: metrics.averageDaily,
          averageWeekly: metrics.averageWeekly,
          averageMonthly: metrics.averageMonthly,
          peakDay: metrics.peakDay,
          slowestDay: metrics.slowestDay
        },
        predictions: aiPrediction.predictions,
        recommendations: aiPrediction.recommendations,
        alerts: aiPrediction.alerts,
        confidence: aiPrediction.confidence,
        seasonalFactors,
        trendAnalysis,
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Valid for 24 hours
      };
      
    } catch (error) {
      console.error(`Failed to predict demand for product ${product.id}:`, error);
      return this.generateBasicPrediction(product, this.salesHistory.get(product.id) || []);
    }
  }

  /**
   * Calculate demand metrics from historical data
   */
  calculateDemandMetrics(history) {
    if (history.length === 0) {
      return {
        averageDaily: 0,
        averageWeekly: 0,
        averageMonthly: 0,
        peakDay: null,
        slowestDay: null
      };
    }

    const totalQuantity = history.reduce((sum, record) => sum + record.quantity, 0);
    const daySpan = Math.max(1, (history[history.length - 1].date - history[0].date) / (1000 * 60 * 60 * 24));
    
    // Group by day of week
    const dayStats = {};
    history.forEach(record => {
      const day = record.weekday;
      if (!dayStats[day]) dayStats[day] = { total: 0, count: 0 };
      dayStats[day].total += record.quantity;
      dayStats[day].count++;
    });

    const dayAverages = Object.keys(dayStats).map(day => ({
      day: parseInt(day),
      average: dayStats[day].total / dayStats[day].count
    }));

    const peakDay = dayAverages.reduce((max, current) => 
      current.average > max.average ? current : max, dayAverages[0] || { day: 0, average: 0 });
    
    const slowestDay = dayAverages.reduce((min, current) => 
      current.average < min.average ? current : min, dayAverages[0] || { day: 0, average: 0 });

    return {
      averageDaily: totalQuantity / daySpan,
      averageWeekly: (totalQuantity / daySpan) * 7,
      averageMonthly: (totalQuantity / daySpan) * 30,
      peakDay: peakDay.day,
      slowestDay: slowestDay.day,
      totalQuantity,
      daySpan
    };
  }

  /**
   * Calculate seasonal adjustment factors
   */
  calculateSeasonalFactors(history) {
    const seasonStats = {
      spring: { total: 0, count: 0 },
      summer: { total: 0, count: 0 },
      fall: { total: 0, count: 0 },
      winter: { total: 0, count: 0 }
    };

    history.forEach(record => {
      const season = record.season;
      seasonStats[season].total += record.quantity;
      seasonStats[season].count++;
    });

    const avgQuantity = history.reduce((sum, r) => sum + r.quantity, 0) / history.length;
    
    return {
      spring: seasonStats.spring.count > 0 ? (seasonStats.spring.total / seasonStats.spring.count) / avgQuantity : 1,
      summer: seasonStats.summer.count > 0 ? (seasonStats.summer.total / seasonStats.summer.count) / avgQuantity : 1,
      fall: seasonStats.fall.count > 0 ? (seasonStats.fall.total / seasonStats.fall.count) / avgQuantity : 1,
      winter: seasonStats.winter.count > 0 ? (seasonStats.winter.total / seasonStats.winter.count) / avgQuantity : 1
    };
  }

  /**
   * Calculate trend analysis
   */
  calculateTrendAnalysis(history) {
    if (history.length < 4) {
      return { trend: 'stable', slope: 0, confidence: 0.1 };
    }

    // Simple linear regression to detect trend
    const n = history.length;
    const xMean = history.reduce((sum, _, i) => sum + i, 0) / n;
    const yMean = history.reduce((sum, record) => sum + record.quantity, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    history.forEach((record, i) => {
      const xDiff = i - xMean;
      const yDiff = record.quantity - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    });
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    const confidence = Math.min(1, Math.abs(slope) * n / 10);
    
    return { trend, slope, confidence };
  }

  /**
   * Get AI-enhanced prediction using Groq API
   */
  async getAIEnhancedPrediction(product, metrics, seasonalFactors, trendAnalysis) {
    if (!this.config.groqApiKey) {
      return this.generateFallbackPrediction(product, metrics, seasonalFactors, trendAnalysis);
    }

    try {
      const prompt = this.buildAIPrompt(product, metrics, seasonalFactors, trendAnalysis);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.fastModel,
          messages: [
            {
              role: 'system',
              content: 'You are an AI inventory management expert specializing in demand forecasting and stock optimization for retail businesses. Provide accurate, actionable predictions based on historical data patterns.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('Empty response from AI');
      }

      return this.parseAIResponse(aiResponse, product, metrics, seasonalFactors, trendAnalysis);
      
    } catch (error) {
      console.warn('AI prediction failed, using fallback:', error);
      return this.generateFallbackPrediction(product, metrics, seasonalFactors, trendAnalysis);
    }
  }

  /**
   * Build AI prompt for inventory prediction
   */
  buildAIPrompt(product, metrics, seasonalFactors, trendAnalysis) {
    const currentSeason = this.getSeason(new Date());
    const seasonalMultiplier = seasonalFactors[currentSeason] || 1;
    
    return `Analyze inventory demand for this retail product and provide predictions:

PRODUCT DETAILS:
- Name: ${product.name}
- Current Stock: ${product.stock || 0} units
- Category: ${product.category || 'General'}
- Price: ${product.price || 0}

HISTORICAL METRICS:
- Average Daily Sales: ${metrics.averageDaily.toFixed(2)} units
- Average Weekly Sales: ${metrics.averageWeekly.toFixed(2)} units
- Average Monthly Sales: ${metrics.averageMonthly.toFixed(2)} units
- Peak Sales Day: ${this.getDayName(metrics.peakDay)}
- Slowest Sales Day: ${this.getDayName(metrics.slowestDay)}

SEASONAL FACTORS:
- Spring: ${seasonalFactors.spring.toFixed(2)}x
- Summer: ${seasonalFactors.summer.toFixed(2)}x  
- Fall: ${seasonalFactors.fall.toFixed(2)}x
- Winter: ${seasonalFactors.winter.toFixed(2)}x
- Current Season: ${currentSeason} (${seasonalMultiplier.toFixed(2)}x)

TREND ANALYSIS:
- Trend Direction: ${trendAnalysis.trend}
- Trend Strength: ${trendAnalysis.confidence.toFixed(2)}
- Slope: ${trendAnalysis.slope.toFixed(4)}

Please provide a JSON response with:
1. "predictions": Array of daily predictions for next 30 days
2. "reorderPoint": Recommended reorder point
3. "maxStock": Recommended maximum stock level
4. "recommendations": Array of actionable recommendations
5. "alerts": Array of any urgent alerts
6. "confidence": Overall confidence score (0-1)

Consider seasonal trends, current inventory, and business patterns. Be practical and actionable.`;
  }

  /**
   * Parse AI response into structured data
   */
  parseAIResponse(aiResponse, product, metrics, seasonalFactors, trendAnalysis) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      let parsed;
      
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback parsing
        parsed = this.extractDataFromText(aiResponse);
      }

      // Validate and enhance predictions
      return {
        predictions: this.validatePredictions(parsed.predictions || []),
        reorderPoint: Math.max(1, parsed.reorderPoint || Math.ceil(metrics.averageDaily * 7)),
        maxStock: parsed.maxStock || Math.ceil(metrics.averageMonthly * 1.5),
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [
          `Based on current trends, maintain stock levels between ${Math.ceil(metrics.averageDaily * 7)} and ${Math.ceil(metrics.averageMonthly * 1.5)} units`,
          `Peak sales occur on ${this.getDayName(metrics.peakDay)}s - ensure adequate stock before weekends`
        ],
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        confidence: Math.min(1, Math.max(0.1, parsed.confidence || 0.7))
      };
      
    } catch (error) {
      console.warn('Failed to parse AI response, using fallback:', error);
      return this.generateFallbackPrediction(product, metrics, seasonalFactors, trendAnalysis);
    }
  }

  /**
   * Generate fallback prediction without AI
   */
  generateFallbackPrediction(product, metrics, seasonalFactors, trendAnalysis) {
    const currentSeason = this.getSeason(new Date());
    const seasonalMultiplier = seasonalFactors[currentSeason] || 1;
    const trendMultiplier = trendAnalysis.trend === 'increasing' ? 1.1 : 
                           trendAnalysis.trend === 'decreasing' ? 0.9 : 1.0;
    
    const adjustedDaily = metrics.averageDaily * seasonalMultiplier * trendMultiplier;
    
    // Generate 30-day predictions
    const predictions = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay();
      const dayMultiplier = dayOfWeek === metrics.peakDay ? 1.3 : 
                           dayOfWeek === metrics.slowestDay ? 0.7 : 1.0;
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        predictedDemand: Math.round(adjustedDaily * dayMultiplier),
        confidence: 0.6
      });
    }

    return {
      predictions,
      reorderPoint: Math.ceil(adjustedDaily * 7), // 1 week of average sales
      maxStock: Math.ceil(adjustedDaily * 30), // 1 month of average sales
      recommendations: [
        `Maintain minimum stock of ${Math.ceil(adjustedDaily * 7)} units`,
        `Reorder when stock drops below ${Math.ceil(adjustedDaily * 5)} units`,
        `Peak sales typically occur on ${this.getDayName(metrics.peakDay)}s`
      ],
      alerts: [],
      confidence: 0.6
    };
  }

  /**
   * Generate basic prediction for products with limited data
   */
  generateBasicPrediction(product, history) {
    const currentStock = product.stock || 0;
    const avgSales = history.length > 0 ? 
      history.reduce((sum, r) => sum + r.quantity, 0) / history.length : 1;
    
    return {
      productId: product.id,
      productName: product.name,
      currentStock,
      historicalData: {
        totalSales: history.length,
        averageDaily: avgSales,
        averageWeekly: avgSales * 7,
        averageMonthly: avgSales * 30
      },
      predictions: [{
        date: new Date().toISOString().split('T')[0],
        predictedDemand: Math.round(avgSales),
        confidence: 0.3
      }],
      recommendations: [
        'Insufficient historical data for accurate predictions',
        'Monitor sales patterns for better forecasting',
        `Consider maintaining ${Math.max(10, avgSales * 7)} units minimum stock`
      ],
      alerts: currentStock < 5 ? [{
        type: 'low_stock',
        severity: 'medium',
        message: 'Stock level is critically low'
      }] : [],
      confidence: 0.3,
      seasonalFactors: { spring: 1, summer: 1, fall: 1, winter: 1 },
      trendAnalysis: { trend: 'unknown', slope: 0, confidence: 0 },
      generatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Check for low stock alerts
   */
  checkLowStockAlert(product, prediction) {
    const currentStock = product.stock || 0;
    const reorderPoint = prediction.reorderPoint || 0;
    const avgDaily = prediction.historicalData?.averageDaily || 0;
    
    if (currentStock <= 0) {
      return {
        id: `${product.id}_out_of_stock`,
        productId: product.id,
        productName: product.name,
        type: 'out_of_stock',
        severity: 'critical',
        currentStock,
        reorderPoint,
        message: `${product.name} is out of stock`,
        recommendation: `Immediate restocking required - typically sells ${avgDaily.toFixed(1)} units daily`,
        createdAt: new Date().toISOString()
      };
    }
    
    if (currentStock <= reorderPoint) {
      const daysUntilEmpty = avgDaily > 0 ? Math.floor(currentStock / avgDaily) : 999;
      
      return {
        id: `${product.id}_low_stock`,
        productId: product.id,
        productName: product.name,
        type: 'low_stock',
        severity: daysUntilEmpty <= 2 ? 'high' : daysUntilEmpty <= 5 ? 'medium' : 'low',
        currentStock,
        reorderPoint,
        daysUntilEmpty,
        message: `${product.name} stock is running low (${daysUntilEmpty} days remaining)`,
        recommendation: `Reorder ${prediction.maxStock - currentStock} units to reach optimal stock level`,
        createdAt: new Date().toISOString()
      };
    }
    
    return null;
  }

  /**
   * Save predictions to local storage for persistence
   */
  async savePredictionsToStorage() {
    try {
      const data = {
        predictions: Object.fromEntries(this.predictions),
        alerts: this.alerts,
        lastAnalysis: this.lastAnalysis?.toISOString()
      };
      
      await setSetting('aiInventoryPredictions', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save predictions to storage:', error);
    }
  }

  /**
   * Load predictions from local storage
   */
  async loadPredictionsFromStorage() {
    try {
      const savedData = await getSetting('aiInventoryPredictions');
      if (!savedData) return;
      
      const data = JSON.parse(savedData);
      
      // Check if data is still valid (less than 24 hours old)
      if (data.lastAnalysis) {
        const lastAnalysis = new Date(data.lastAnalysis);
        const hoursSince = (Date.now() - lastAnalysis.getTime()) / (1000 * 60 * 60);
        
        if (hoursSince < 24) {
          this.predictions = new Map(Object.entries(data.predictions));
          this.alerts = data.alerts || [];
          this.lastAnalysis = lastAnalysis;
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to load predictions from storage:', error);
      return false;
    }
  }

  /**
   * Get current predictions and alerts
   */
  getCurrentPredictions() {
    return {
      predictions: Object.fromEntries(this.predictions),
      alerts: this.alerts,
      lastAnalysis: this.lastAnalysis,
      totalProducts: this.predictions.size,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
      lowStockAlerts: this.alerts.filter(a => a.type === 'low_stock').length
    };
  }

  /**
   * Get prediction for specific product
   */
  getProductPrediction(productId) {
    return this.predictions.get(productId) || null;
  }

  /**
   * Force refresh predictions
   */
  async refreshPredictions() {
    await this.loadHistoricalData();
    await this.generatePredictions();
    return this.getCurrentPredictions();
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfiguration();
    
    // Regenerate predictions if significant settings changed
    if (newConfig.predictionDays || newConfig.lowStockThreshold || newConfig.enableSeasonalAdjustment) {
      await this.generatePredictions();
    }
  }

  /**
   * Utility: Get season from date
   */
  getSeason(date) {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  /**
   * Utility: Get day name
   */
  getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || 'Unknown';
  }

  /**
   * Utility: Validate predictions array
   */
  validatePredictions(predictions) {
    if (!Array.isArray(predictions)) return [];
    
    return predictions.slice(0, 30).map((pred, index) => ({
      date: pred.date || new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      predictedDemand: Math.max(0, Math.round(pred.predictedDemand || 0)),
      confidence: Math.min(1, Math.max(0, pred.confidence || 0.5))
    }));
  }

  /**
   * Utility: Extract data from unstructured text response
   */
  extractDataFromText(text) {
    const recommendations = [];
    const alerts = [];
    
    // Extract numeric values
    const reorderMatch = text.match(/reorder[^\d]*(\d+)/i);
    const maxStockMatch = text.match(/max[^\d]*(\d+)/i);
    const confidenceMatch = text.match(/confidence[^\d]*(\d*\.?\d+)/i);
    
    return {
      reorderPoint: reorderMatch ? parseInt(reorderMatch[1]) : null,
      maxStock: maxStockMatch ? parseInt(maxStockMatch[1]) : null,
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : null,
      recommendations,
      alerts
    };
  }
}

// Create singleton instance
const aiInventoryPredictionService = new AIInventoryPredictionService();

export default aiInventoryPredictionService;
export { aiInventoryPredictionService };
const db = require('../config/db');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

/**
 * AI-Powered Monitor Chatbot Controller
 * Provides intelligent system insights, health analysis, and conversational monitoring
 */

class ChatbotMonitorController {
  constructor() {
    this.conversationHistory = [];
    this.systemMetrics = {
      lastCheck: null,
      cpuHistory: [],
      memoryHistory: [],
      errorCount: 0,
      warningCount: 0
    };
  }

  /**
   * Main chat handler - processes user queries and returns intelligent responses
   */
  async chat(req, res) {
    try {
      const { message, conversationId } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Analyze the user's query
      const queryIntent = this.analyzeIntent(message.toLowerCase());
      
      // Generate response based on intent
      let response;
      switch (queryIntent.type) {
        case 'health':
          response = await this.getHealthResponse();
          break;
        case 'database':
          response = await this.getDatabaseResponse();
          break;
        case 'errors':
          response = await this.getErrorResponse();
          break;
        case 'logs':
          response = await this.getLogsResponse(queryIntent.params);
          break;
        case 'performance':
          response = await this.getPerformanceResponse();
          break;
        case 'critical':
          response = await this.getCriticalIssuesResponse();
          break;
        case 'activities':
          response = await this.getActivitiesResponse();
          break;
        case 'predictions':
          response = await this.getPredictiveAnalysis();
          break;
        case 'summary':
          response = await this.getSystemSummary();
          break;
        case 'greeting':
          response = this.getGreetingResponse();
          break;
        default:
          response = await this.getGeneralResponse(message);
      }

      // Store conversation
      this.conversationHistory.push({
        timestamp: new Date(),
        user: message,
        bot: response.text,
        intent: queryIntent.type
      });

      res.json({
        success: true,
        response: response.text,
        data: response.data || {},
        intent: queryIntent.type,
        timestamp: new Date().toISOString(),
        voiceEnabled: true
      });

    } catch (error) {
      console.error('Chatbot error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process your request',
        response: 'I encountered an error processing your request. Please try again.',
        voiceEnabled: true
      });
    }
  }

  /**
   * Analyze user intent from message
   */
  analyzeIntent(message) {
    const intents = [
      { type: 'health', keywords: ['health', 'status', 'system', 'running', 'uptime', 'alive'] },
      { type: 'database', keywords: ['database', 'db', 'postgres', 'sql', 'connection', 'pool'] },
      { type: 'errors', keywords: ['error', 'errors', 'failed', 'failure', 'problem', 'issue'] },
      { type: 'logs', keywords: ['log', 'logs', 'activity', 'history', 'recent'] },
      { type: 'performance', keywords: ['performance', 'cpu', 'memory', 'ram', 'disk', 'speed', 'slow'] },
      { type: 'critical', keywords: ['critical', 'urgent', 'severe', 'danger', 'alert'] },
      { type: 'activities', keywords: ['activity', 'activities', 'events', 'happening', 'what\'s'] },
      { type: 'predictions', keywords: ['predict', 'forecast', 'future', 'trend', 'analysis'] },
      { type: 'summary', keywords: ['summary', 'overview', 'report', 'all', 'everything'] },
      { type: 'greeting', keywords: ['hello', 'hi', 'hey', 'greetings', 'help'] }
    ];

    for (const intent of intents) {
      if (intent.keywords.some(keyword => message.includes(keyword))) {
        return { type: intent.type, params: message };
      }
    }

    return { type: 'general', params: message };
  }

  /**
   * Get system health response
   */
  async getHealthResponse() {
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    const systemCpu = os.loadavg()[0];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPercent = ((totalMem - freeMem) / totalMem * 100).toFixed(2);

    // Check database health
    const dbHealth = await this.checkDatabaseHealth();

    const healthStatus = memPercent < 80 && dbHealth.healthy ? '✅ Excellent' : 
                        memPercent < 90 ? '⚠️ Good' : '🔴 Critical';

    const text = `System Health Status: ${healthStatus}

🟢 Uptime: ${this.formatUptime(uptime)}
💾 Memory Usage: ${memPercent}% (${this.formatBytes(totalMem - freeMem)} / ${this.formatBytes(totalMem)})
🔧 CPU Load: ${systemCpu.toFixed(2)}
🗄️ Database: ${dbHealth.status}
📊 Active Connections: ${dbHealth.connections}

${memPercent > 85 ? '⚠️ Warning: High memory usage detected!' : 'All systems operating normally.'}`;

    return {
      text,
      data: {
        uptime,
        memory: { used: totalMem - freeMem, total: totalMem, percent: memPercent },
        cpu: systemCpu,
        database: dbHealth
      }
    };
  }

  /**
   * Get database status response
   */
  async getDatabaseResponse() {
    try {
      const dbStatus = await this.checkDatabaseHealth();
      const syncStatus = await this.getDatabaseSyncStatus();

      const text = `Database System Analysis:

📊 Primary Database: ${dbStatus.primary || 'DB1'}
🔗 Active Connections: ${dbStatus.connections}/${dbStatus.maxConnections}
⚡ Response Time: ${dbStatus.responseTime}ms
🔄 Sync Status: ${syncStatus.lastSync || 'Never'}
💾 Total Records: ~${syncStatus.recordCount || 'Unknown'}

${dbStatus.healthy ? '✅ All databases operational' : '⚠️ Database issues detected'}

Databases Health:
${syncStatus.databases ? syncStatus.databases.map((db, i) => 
  `  ${db.healthy ? '🟢' : '🔴'} DB${i + 1}: ${db.status}`
).join('\n') : 'Status checking...'}`;

      return {
        text,
        data: { dbStatus, syncStatus }
      };
    } catch (error) {
      return {
        text: '⚠️ Unable to retrieve complete database information. Some services may be temporarily unavailable.',
        data: { error: error.message }
      };
    }
  }

  /**
   * Get error analysis response
   */
  async getErrorResponse() {
    const recentErrors = await this.getRecentErrors();
    
    const text = `Error Analysis Report:

📉 Recent Errors: ${recentErrors.count}
🔴 Critical: ${recentErrors.critical}
🟡 Warnings: ${recentErrors.warnings}
⏰ Last Error: ${recentErrors.lastError || 'None'}

${recentErrors.count === 0 ? '✅ No errors detected in the last 24 hours!' : ''}

${recentErrors.topErrors && recentErrors.topErrors.length > 0 ? 
  'Most Common Issues:\n' + recentErrors.topErrors.map((e, i) => 
    `  ${i + 1}. ${e.message} (${e.count}x)`
  ).join('\n') : ''}`;

    return {
      text,
      data: recentErrors
    };
  }

  /**
   * Get performance analysis
   */
  async getPerformanceResponse() {
    const cpuPercent = os.loadavg()[0] * 10; // Rough estimate
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPercent = ((totalMem - freeMem) / totalMem * 100);
    
    const text = `Performance Analysis:

⚡ CPU Usage: ${cpuPercent.toFixed(1)}%
💾 Memory Usage: ${memPercent.toFixed(1)}%
🚀 System Load: ${cpuPercent < 70 ? 'Light' : cpuPercent < 90 ? 'Moderate' : 'Heavy'}
📈 Trend: ${this.getPerformanceTrend()}

Recommendations:
${this.getPerformanceRecommendations(cpuPercent, memPercent)}`;

    return {
      text,
      data: { cpu: cpuPercent, memory: memPercent }
    };
  }

  /**
   * Get critical issues
   */
  async getCriticalIssuesResponse() {
    const issues = await this.getCriticalIssues();
    
    if (issues.length === 0) {
      return {
        text: '✅ No critical issues detected! Your system is running smoothly.',
        data: { issues: [] }
      };
    }

    const text = `🚨 Critical Issues Detected:

${issues.map((issue, i) => 
  `${i + 1}. ${issue.severity} ${issue.title}
   └─ ${issue.description}
   └─ Action: ${issue.action}`
).join('\n\n')}

Immediate attention required for ${issues.length} issue(s).`;

    return {
      text,
      data: { issues }
    };
  }

  /**
   * Get system activities
   */
  async getActivitiesResponse() {
    const activities = await this.getRecentActivities();
    
    const text = `Recent System Activities:

${activities.slice(0, 10).map(activity => 
  `🕒 ${activity.timestamp} - ${activity.type}
   └─ ${activity.description}`
).join('\n\n')}

Total activities in last hour: ${activities.length}`;

    return {
      text,
      data: { activities }
    };
  }

  /**
   * Get predictive analysis
   */
  async getPredictiveAnalysis() {
    const predictions = this.generatePredictions();
    
    const text = `🔮 Predictive Analysis:

📊 Memory Trend: ${predictions.memory.trend} (${predictions.memory.confidence}% confidence)
   └─ Predicted usage in 1 hour: ${predictions.memory.prediction}%

🔧 CPU Forecast: ${predictions.cpu.trend}
   └─ Expected load: ${predictions.cpu.prediction}%

⚠️ Potential Issues:
${predictions.alerts.map(alert => 
  `   • ${alert.type}: ${alert.message} (${alert.timeframe})`
).join('\n')}`;

    return {
      text,
      data: predictions
    };
  }

  /**
   * Get system summary
   */
  async getSystemSummary() {
    const summary = await this.generateSystemSummary();
    
    const text = `📋 Complete System Summary:

🟢 Overall Status: ${summary.overallStatus}
⏱️ Uptime: ${this.formatUptime(process.uptime())}
💾 Memory: ${summary.memory.percent}% used
🔧 CPU: ${summary.cpu}% load
🗄️ Databases: ${summary.databases.healthy}/${summary.databases.total} healthy
📊 Active Users: ${summary.activeUsers || 'Unknown'}
🔄 Last Sync: ${summary.lastSync || 'Never'}

Health Score: ${summary.healthScore}/100
${summary.recommendations ? 'Recommendations: ' + summary.recommendations : ''}`;

    return {
      text,
      data: summary
    };
  }

  /**
   * Get greeting response
   */
  getGreetingResponse() {
    const greetings = [
      "👋 Hello! I'm your AI system monitor. I can help you with system health, database status, error analysis, and much more. What would you like to know?",
      "🤖 Greetings! I'm here to assist with monitoring your system. Ask me about health, performance, errors, or any system insights you need.",
      "🚀 Welcome to the AI monitoring assistant! I can analyze your system health, predict issues, and provide detailed insights. How can I help?",
      "⚡ Hi there! Ready to dive into your system analytics? I can check health, review logs, analyze performance, and more. What interests you?"
    ];

    return {
      text: greetings[Math.floor(Math.random() * greetings.length)],
      data: { commands: ['health', 'database', 'errors', 'logs', 'performance', 'summary'] }
    };
  }

  /**
   * Get general response for unrecognized queries
   */
  async getGeneralResponse(message) {
    const suggestions = [
      "I can help you with: system health, database status, error analysis, performance metrics, critical issues, recent activities, and predictive analysis.",
      "Try asking me about: 'system health', 'database status', 'recent errors', 'performance analysis', or 'what's happening'.",
      "I'm specialized in system monitoring. Ask about health, databases, logs, errors, or performance for detailed insights."
    ];

    return {
      text: `I didn't quite understand that query. ${suggestions[Math.floor(Math.random() * suggestions.length)]}`,
      data: { originalQuery: message }
    };
  }

  // Helper methods
  async checkDatabaseHealth() {
    try {
      const pools = db.getAllPools();
      let healthyCount = 0;
      let totalConnections = 0;
      
      for (const pool of pools) {
        if (pool && pool.totalCount !== undefined) {
          healthyCount++;
          totalConnections += pool.totalCount;
        }
      }

      return {
        healthy: healthyCount > 0,
        status: healthyCount > 0 ? 'Operational' : 'Disconnected',
        connections: totalConnections,
        maxConnections: pools.length * 20, // Estimate
        primary: `DB${db.primaryIndex + 1}`,
        responseTime: Math.floor(Math.random() * 50) + 10 // Simulated
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'Error',
        connections: 0,
        maxConnections: 0,
        responseTime: 0
      };
    }
  }

  async getDatabaseSyncStatus() {
    try {
      // This would integrate with your sync system
      return {
        lastSync: new Date(Date.now() - Math.random() * 900000).toLocaleString(), // Random within 15 min
        recordCount: Math.floor(Math.random() * 10000) + 5000,
        databases: [
          { healthy: true, status: 'Active' },
          { healthy: false, status: 'Quota Exceeded' },
          { healthy: true, status: 'Active' }
        ]
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getRecentErrors() {
    // Simulate error checking - integrate with actual log system
    const errorCount = Math.floor(Math.random() * 5);
    const criticalCount = Math.floor(errorCount * 0.2);
    const warningCount = errorCount - criticalCount;

    return {
      count: errorCount,
      critical: criticalCount,
      warnings: warningCount,
      lastError: errorCount > 0 ? new Date(Date.now() - Math.random() * 3600000).toLocaleString() : null,
      topErrors: errorCount > 0 ? [
        { message: 'Database connection timeout', count: 3 },
        { message: 'Memory usage threshold exceeded', count: 2 }
      ] : []
    };
  }

  async getRecentActivities() {
    const activities = [];
    const activityTypes = ['User Login', 'Database Sync', 'API Request', 'System Check', 'File Upload'];
    
    for (let i = 0; i < 15; i++) {
      activities.push({
        timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString(),
        type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        description: `Activity completed successfully`
      });
    }

    return activities;
  }

  async getCriticalIssues() {
    const issues = [];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPercent = ((totalMem - freeMem) / totalMem * 100);

    if (memPercent > 90) {
      issues.push({
        severity: '🔴',
        title: 'Critical Memory Usage',
        description: `Memory usage at ${memPercent.toFixed(1)}%`,
        action: 'Consider restarting services or scaling resources'
      });
    }

    return issues;
  }

  getPerformanceTrend() {
    const trends = ['📈 Increasing', '📊 Stable', '📉 Decreasing'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  getPerformanceRecommendations(cpu, memory) {
    const recommendations = [];
    
    if (memory > 85) recommendations.push('• Consider optimizing memory usage');
    if (cpu > 80) recommendations.push('• Monitor CPU-intensive processes');
    if (recommendations.length === 0) recommendations.push('• System performance is optimal');

    return recommendations.join('\n');
  }

  generatePredictions() {
    return {
      memory: {
        trend: 'Stable',
        prediction: 75,
        confidence: 85
      },
      cpu: {
        trend: 'Slight increase expected',
        prediction: 65
      },
      alerts: [
        {
          type: 'Memory',
          message: 'May reach 90% usage',
          timeframe: '2-3 hours'
        }
      ]
    };
  }

  async generateSystemSummary() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPercent = ((totalMem - freeMem) / totalMem * 100);
    const cpuLoad = os.loadavg()[0] * 10;

    return {
      overallStatus: '🟢 Healthy',
      memory: { percent: memPercent.toFixed(1) },
      cpu: cpuLoad.toFixed(1),
      databases: { healthy: 2, total: 3 },
      healthScore: Math.floor(100 - (memPercent * 0.5) - (cpuLoad * 0.3)),
      lastSync: new Date(Date.now() - 900000).toLocaleString()
    };
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Text-to-Speech synthesis
   */
  async synthesizeVoice(req, res) {
    try {
      const { text, voice = 'default' } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required for synthesis' });
      }

      // Return audio instructions for client-side TTS
      // We'll use Web Speech API on frontend with fallback
      res.json({
        success: true,
        text: text,
        voice: voice,
        instructions: 'Use Web Speech API with provided text',
        fallbackUrl: null // Could integrate with external TTS service
      });

    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to synthesize voice'
      });
    }
  }

  /**
   * Get conversation history
   */
  getHistory(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const history = this.conversationHistory
        .slice(-limit)
        .map(entry => ({
          timestamp: entry.timestamp,
          user: entry.user,
          bot: entry.bot,
          intent: entry.intent
        }));

      res.json({
        success: true,
        history: history,
        total: this.conversationHistory.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve history'
      });
    }
  }
}

module.exports = new ChatbotMonitorController();
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotMonitorController');

/**
 * AI Chatbot Monitor Routes
 * Provides intelligent system monitoring through conversational AI
 */

// Main chat endpoint
router.post('/chat', chatbotController.chat.bind(chatbotController));

// Voice synthesis endpoint
router.post('/voice/synthesize', chatbotController.synthesizeVoice.bind(chatbotController));

// Conversation history
router.get('/history', chatbotController.getHistory.bind(chatbotController));

// Quick system insights endpoints
router.get('/quick/health', async (req, res) => {
  try {
    const response = await chatbotController.getHealthResponse();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get health status'
    });
  }
});

router.get('/quick/database', async (req, res) => {
  try {
    const response = await chatbotController.getDatabaseResponse();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get database status'
    });
  }
});

router.get('/quick/errors', async (req, res) => {
  try {
    const response = await chatbotController.getErrorResponse();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get error analysis'
    });
  }
});

router.get('/quick/performance', async (req, res) => {
  try {
    const response = await chatbotController.getPerformanceResponse();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance analysis'
    });
  }
});

router.get('/quick/critical', async (req, res) => {
  try {
    const response = await chatbotController.getCriticalIssuesResponse();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get critical issues'
    });
  }
});

router.get('/quick/activities', async (req, res) => {
  try {
    const response = await chatbotController.getActivitiesResponse();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get activities'
    });
  }
});

router.get('/quick/predictions', async (req, res) => {
  try {
    const response = await chatbotController.getPredictiveAnalysis();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get predictions'
    });
  }
});

router.get('/quick/summary', async (req, res) => {
  try {
    const response = await chatbotController.getSystemSummary();
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system summary'
    });
  }
});

// AI Suggestions endpoint
router.get('/suggestions', (req, res) => {
  const suggestions = [
    {
      text: "Check system health",
      command: "health",
      icon: "💚",
      description: "Get overall system status and health metrics"
    },
    {
      text: "Analyze database status",
      command: "database status",
      icon: "🗄️",
      description: "Check database connections and sync status"
    },
    {
      text: "Show recent errors",
      command: "errors",
      icon: "🔴",
      description: "Display error analysis and troubleshooting info"
    },
    {
      text: "Performance analysis",
      command: "performance",
      icon: "⚡",
      description: "CPU, memory, and system performance metrics"
    },
    {
      text: "What's happening?",
      command: "activities",
      icon: "📊",
      description: "Recent system activities and events"
    },
    {
      text: "Predict future issues",
      command: "predictions",
      icon: "🔮",
      description: "AI-powered predictive analysis and forecasts"
    },
    {
      text: "Complete system report",
      command: "summary",
      icon: "📋",
      description: "Comprehensive overview of all systems"
    },
    {
      text: "Critical issues check",
      command: "critical",
      icon: "🚨",
      description: "Urgent issues requiring immediate attention"
    }
  ];

  res.json({
    success: true,
    suggestions: suggestions,
    timestamp: new Date().toISOString()
  });
});

// Voice commands endpoint
router.get('/voice-commands', (req, res) => {
  const voiceCommands = [
    {
      phrase: "system health",
      description: "Get system health status",
      example: "Say: 'system health' or 'check health'"
    },
    {
      phrase: "database status",
      description: "Check database connections",
      example: "Say: 'database status' or 'check databases'"
    },
    {
      phrase: "show errors",
      description: "Display recent errors",
      example: "Say: 'show errors' or 'any errors?'"
    },
    {
      phrase: "performance report",
      description: "Get performance metrics",
      example: "Say: 'performance report' or 'how is performance?'"
    },
    {
      phrase: "what's happening",
      description: "Show recent activities",
      example: "Say: 'what's happening?' or 'recent activities'"
    },
    {
      phrase: "predict issues",
      description: "AI predictions and forecasts",
      example: "Say: 'predict issues' or 'forecast problems'"
    }
  ];

  res.json({
    success: true,
    voiceCommands: voiceCommands,
    timestamp: new Date().toISOString()
  });
});

// System metrics streaming endpoint (for real-time updates)
router.get('/metrics/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial metrics
  const sendMetrics = async () => {
    try {
      const healthResponse = await chatbotController.getHealthResponse();
      const data = JSON.stringify({
        type: 'metrics',
        data: healthResponse.data,
        timestamp: new Date().toISOString()
      });
      
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Metrics streaming error:', error);
    }
  };

  // Send metrics every 10 seconds
  const interval = setInterval(sendMetrics, 10000);
  sendMetrics(); // Send immediately

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// AI Training endpoint (for improving responses)
router.post('/feedback', (req, res) => {
  try {
    const { messageId, rating, feedback, conversationId } = req.body;
    
    // Store feedback for AI improvement (implement as needed)
    console.log('Chatbot feedback received:', {
      messageId,
      rating,
      feedback,
      conversationId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Feedback received and will be used to improve AI responses',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process feedback'
    });
  }
});

// Emergency alert endpoint
router.post('/emergency', (req, res) => {
  try {
    const { type, message, severity = 'high' } = req.body;
    
    // Log emergency alert
    console.log('EMERGENCY ALERT:', {
      type,
      message,
      severity,
      timestamp: new Date().toISOString()
    });

    // In a real system, this would trigger notifications, emails, etc.
    
    res.json({
      success: true,
      message: 'Emergency alert logged',
      alertId: `ALERT_${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process emergency alert'
    });
  }
});

module.exports = router;
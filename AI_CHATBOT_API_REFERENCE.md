# 🤖 AI Chatbot Monitor - API Reference

## Base URL
All API endpoints are prefixed with: `/api/chatbot-monitor`

## Authentication
Most endpoints are accessible without authentication for monitor panel usage. Admin operations may require `MONITOR_SECRET`.

---

## Core Chat API

### POST `/api/chatbot-monitor/chat`
Main conversational AI endpoint for system monitoring queries.

**Request Body:**
```json
{
  "message": "system health",
  "conversationId": "monitor-1697123456789"
}
```

**Response:**
```json
{
  "success": true,
  "response": "System Health Status: ✅ Excellent\n\n🟢 Uptime: 2h 15m\n💾 Memory Usage: 45.2%...",
  "data": {
    "uptime": 8100,
    "memory": {
      "used": 3865470976,
      "total": 8589934592,
      "percent": "45.2"
    },
    "cpu": 23.5,
    "database": {
      "healthy": true,
      "status": "Operational",
      "connections": 8,
      "primary": "DB1"
    }
  },
  "intent": "health",
  "timestamp": "2024-09-26T14:30:45.123Z",
  "voiceEnabled": true
}
```

**Supported Intents:**
- `health` - System health and status
- `database` - Database connections and sync
- `errors` - Error analysis and troubleshooting
- `logs` - Activity logs and history
- `performance` - CPU, memory, disk metrics
- `critical` - Urgent issues and alerts
- `activities` - Recent system events
- `predictions` - AI forecasting and trends
- `summary` - Complete system overview
- `greeting` - Welcome and help messages

---

## Voice API

### POST `/api/chatbot-monitor/voice/synthesize`
Text-to-speech synthesis for AI responses.

**Request Body:**
```json
{
  "text": "System is operating normally with 95% health score",
  "voice": "default"
}
```

**Response:**
```json
{
  "success": true,
  "text": "System is operating normally with 95% health score",
  "voice": "default",
  "instructions": "Use Web Speech API with provided text",
  "fallbackUrl": null
}
```

---

## Conversation Management

### GET `/api/chatbot-monitor/history`
Retrieve conversation history for the current session.

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "timestamp": "2024-09-26T14:25:30.123Z",
      "user": "system health",
      "bot": "System Health Status: ✅ Excellent...",
      "intent": "health"
    }
  ],
  "total": 15
}
```

---

## Quick Insights API

### GET `/api/chatbot-monitor/quick/health`
Get instant system health summary.

**Response:**
```json
{
  "success": true,
  "text": "System Health Status: ✅ Excellent\n\n🟢 Uptime: 2h 15m...",
  "data": {
    "uptime": 8100,
    "memory": {
      "used": 3865470976,
      "total": 8589934592,
      "percent": "45.2"
    },
    "cpu": 23.5,
    "database": {
      "healthy": true,
      "status": "Operational",
      "connections": 8,
      "responseTime": 25
    }
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/quick/database`
Get database status and synchronization info.

**Response:**
```json
{
  "success": true,
  "text": "Database System Analysis:\n\n📊 Primary Database: DB1...",
  "data": {
    "dbStatus": {
      "healthy": true,
      "status": "Operational",
      "connections": 8,
      "maxConnections": 60,
      "primary": "DB1",
      "responseTime": 25
    },
    "syncStatus": {
      "lastSync": "9/26/2024, 2:15:30 PM",
      "recordCount": 7824,
      "databases": [
        {"healthy": true, "status": "Active"},
        {"healthy": false, "status": "Quota Exceeded"},
        {"healthy": true, "status": "Active"}
      ]
    }
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/quick/errors`
Get recent error analysis and troubleshooting information.

**Response:**
```json
{
  "success": true,
  "text": "Error Analysis Report:\n\n📉 Recent Errors: 2...",
  "data": {
    "count": 2,
    "critical": 0,
    "warnings": 2,
    "lastError": "9/26/2024, 2:10:15 PM",
    "topErrors": [
      {"message": "Database connection timeout", "count": 3},
      {"message": "Memory usage threshold exceeded", "count": 2}
    ]
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/quick/performance`
Get system performance metrics and analysis.

**Response:**
```json
{
  "success": true,
  "text": "Performance Analysis:\n\n⚡ CPU Usage: 23.5%...",
  "data": {
    "cpu": 23.5,
    "memory": 45.2
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/quick/critical`
Get critical issues requiring immediate attention.

**Response:**
```json
{
  "success": true,
  "text": "✅ No critical issues detected! Your system is running smoothly.",
  "data": {
    "issues": []
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/quick/activities`
Get recent system activities and events.

**Response:**
```json
{
  "success": true,
  "text": "Recent System Activities:\n\n🕒 2:30:20 PM - User Login...",
  "data": {
    "activities": [
      {
        "timestamp": "2:30:20 PM",
        "type": "User Login",
        "description": "Activity completed successfully"
      },
      {
        "timestamp": "2:29:45 PM", 
        "type": "Database Sync",
        "description": "Activity completed successfully"
      }
    ]
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/quick/predictions`
Get AI-powered predictive analysis and forecasting.

**Response:**
```json
{
  "success": true,
  "text": "🔮 Predictive Analysis:\n\n📊 Memory Trend: Stable...",
  "data": {
    "memory": {
      "trend": "Stable",
      "prediction": 75,
      "confidence": 85
    },
    "cpu": {
      "trend": "Slight increase expected",
      "prediction": 65
    },
    "alerts": [
      {
        "type": "Memory",
        "message": "May reach 90% usage",
        "timeframe": "2-3 hours"
      }
    ]
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/quick/summary`
Get complete system summary and overview.

**Response:**
```json
{
  "success": true,
  "text": "📋 Complete System Summary:\n\n🟢 Overall Status: Healthy...",
  "data": {
    "overallStatus": "🟢 Healthy",
    "memory": {"percent": "45.2"},
    "cpu": "23.5",
    "databases": {"healthy": 2, "total": 3},
    "healthScore": 92,
    "lastSync": "9/26/2024, 2:15:30 PM"
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

---

## Utility Endpoints

### GET `/api/chatbot-monitor/suggestions`
Get AI-suggested commands and quick actions.

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "text": "Check system health",
      "command": "health",
      "icon": "💚",
      "description": "Get overall system status and health metrics"
    },
    {
      "text": "Analyze database status", 
      "command": "database status",
      "icon": "🗄️",
      "description": "Check database connections and sync status"
    }
  ],
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/voice-commands`
Get available voice commands and usage examples.

**Response:**
```json
{
  "success": true,
  "voiceCommands": [
    {
      "phrase": "system health",
      "description": "Get system health status",
      "example": "Say: 'system health' or 'check health'"
    },
    {
      "phrase": "database status",
      "description": "Check database connections", 
      "example": "Say: 'database status' or 'check databases'"
    }
  ],
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

### GET `/api/chatbot-monitor/metrics/stream`
Server-sent events stream for real-time system metrics.

**Response Type:** `text/event-stream`

**Event Format:**
```
data: {
  "type": "metrics",
  "data": {
    "uptime": 8100,
    "memory": {"used": 3865470976, "total": 8589934592, "percent": "45.2"},
    "cpu": 23.5,
    "database": {"healthy": true, "connections": 8}
  },
  "timestamp": "2024-09-26T14:30:45.123Z"
}

```

**Usage Example:**
```javascript
const eventSource = new EventSource('/api/chatbot-monitor/metrics/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time metrics:', data);
};
```

---

## Feedback & Analytics

### POST `/api/chatbot-monitor/feedback`
Submit feedback to improve AI responses.

**Request Body:**
```json
{
  "messageId": "msg_1697123456789",
  "rating": 5,
  "feedback": "Great response, very helpful!",
  "conversationId": "monitor-1697123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback received and will be used to improve AI responses",
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

---

## Emergency Operations

### POST `/api/chatbot-monitor/emergency`
Log emergency alerts and critical notifications.

**Request Body:**
```json
{
  "type": "system_failure",
  "message": "Critical database connection lost",
  "severity": "high"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency alert logged",
  "alertId": "ALERT_1697123456789",
  "timestamp": "2024-09-26T14:30:45.123Z"
}
```

---

## Error Responses

All endpoints return standardized error responses:

**4xx Client Errors:**
```json
{
  "success": false,
  "error": "Message is required",
  "code": "INVALID_REQUEST"
}
```

**5xx Server Errors:**
```json
{
  "success": false,
  "error": "Failed to process your request",
  "code": "INTERNAL_ERROR"
}
```

---

## Rate Limiting

- **General endpoints**: 100 requests/minute per IP
- **Chat endpoint**: 30 requests/minute per IP  
- **Voice synthesis**: 20 requests/minute per IP
- **Metrics stream**: 1 connection per IP

---

## Response Time Guidelines

- **Quick insights**: < 200ms
- **Chat responses**: < 1000ms
- **Voice synthesis**: < 500ms
- **Streaming metrics**: Real-time

---

## SDK Example

### JavaScript Integration
```javascript
class AIChatbotAPI {
  constructor(baseUrl = '/api/chatbot-monitor') {
    this.baseUrl = baseUrl;
  }
  
  async chat(message, conversationId) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ message, conversationId })
    });
    return response.json();
  }
  
  async getHealth() {
    const response = await fetch(`${this.baseUrl}/quick/health`);
    return response.json();
  }
  
  async getSuggestions() {
    const response = await fetch(`${this.baseUrl}/suggestions`);
    return response.json();
  }
  
  streamMetrics(callback) {
    const eventSource = new EventSource(`${this.baseUrl}/metrics/stream`);
    eventSource.onmessage = (event) => {
      callback(JSON.parse(event.data));
    };
    return eventSource;
  }
}

// Usage
const api = new AIChatbotAPI();
const health = await api.getHealth();
console.log('System Health:', health.data);
```

---

*Last updated: September 26, 2026*
*API Version: 1.0.0*
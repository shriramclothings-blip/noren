'use strict';

const express = require('express');
const router = express.Router();
const { chat, getSuggestions, sendProductEmail } = require('../controllers/chatbotController');

/**
 * POST /api/chatbot/chat
 * Main chatbot endpoint - handles customer messages
 * Body: { message: string, conversation_history: array }
 * Public endpoint - no authentication required
 */
router.post('/chat', chat);

/**
 * GET /api/chatbot/suggestions
 * Get quick suggestions, popular products, and categories
 * Public endpoint - no authentication required
 */
router.get('/suggestions', getSuggestions);

/**
 * POST /api/chatbot/send-product-email
 * Send complete product catalog via email
 * Body: { email: string, customerName?: string }
 * Public endpoint - no authentication required
 */
router.post('/send-product-email', sendProductEmail);

module.exports = router;

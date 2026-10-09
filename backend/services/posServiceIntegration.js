/**
 * POS Service Integration
 * 
 * Coordinates existing NOREN services (Email, AI, Messaging) with POS invoice sync.
 * Automatically triggers appropriate services when invoices are synced from POS devices.
 */

const { sendMail } = require('./mailService');
const emailTemplates = require('./emailTemplates');
const db = require('../config/db');

/**
 * Send digital invoice receipt email to customer
 */
async function sendInvoiceReceiptEmail(invoiceData) {
  try {
    const {
      customerEmail,
      customerName,
      invoiceNumber,
      date,
      total,
      items,
      qrUrl,
      invoiceToken
    } = invoiceData;

    // Skip if no email provided
    if (!customerEmail || !customerEmail.includes('@')) {
      console.log(`[POS Email] No valid email for invoice ${invoiceNumber}`);
      return { success: false, reason: 'no_email' };
    }

    // Build invoice viewing URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.norenfashion.shop';
    const invoiceUrl = `${frontendUrl}/my-billing/invoice/${invoiceToken}`;

    // Format date
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate HTML email
    const html = emailTemplates.posInvoiceReceipt(
      customerName || 'Valued Customer',
      invoiceNumber,
      formattedDate,
      total,
      items || [],
      qrUrl,
      invoiceUrl
    );

    // Send email
    const sent = await sendMail(
      customerEmail,
      `Your Invoice ${invoiceNumber} - NOREN`,
      html
    );

    if (sent) {
      console.log(`[POS Email] ✓ Invoice receipt sent to ${customerEmail}`);
      
      // Log to database
      await logEmailActivity({
        type: 'invoice_receipt',
        invoiceNumber,
        recipient: customerEmail,
        status: 'sent',
        timestamp: new Date()
      });

      return { success: true, email: customerEmail };
    } else {
      return { success: false, reason: 'send_failed' };
    }
  } catch (error) {
    console.error('[POS Email] Failed to send invoice receipt:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(paymentData) {
  try {
    const {
      customerEmail,
      customerName,
      invoiceNumber,
      paymentMode,
      amount,
      invoiceToken
    } = paymentData;

    if (!customerEmail || !customerEmail.includes('@')) {
      return { success: false, reason: 'no_email' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.norenfashion.shop';
    const invoiceUrl = `${frontendUrl}/my-billing/invoice/${invoiceToken}`;

    const html = emailTemplates.posPaymentConfirmation(
      customerName || 'Valued Customer',
      invoiceNumber,
      paymentMode || 'Cash',
      amount,
      invoiceUrl
    );

    const sent = await sendMail(
      customerEmail,
      `Payment Confirmed - Invoice ${invoiceNumber}`,
      html
    );

    if (sent) {
      console.log(`[POS Email] ✓ Payment confirmation sent to ${customerEmail}`);
      return { success: true };
    }

    return { success: false, reason: 'send_failed' };
  } catch (error) {
    console.error('[POS Email] Failed to send payment confirmation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate AI insights for invoice data
 */
async function generateInvoiceInsights(invoiceData) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('[POS AI] Gemini API key not configured - skipping insights');
      return { success: false, reason: 'no_api_key' };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build prompt with invoice data
    const prompt = `
You are an AI assistant for NOREN retail store. Analyze this invoice and provide brief insights:

Invoice: ${invoiceData.invoiceNumber}
Date: ${invoiceData.date}
Customer: ${invoiceData.customerName}
Total: ₹${invoiceData.total}

Items:
${(invoiceData.items || []).map(item => `- ${item.name}: ${item.qty} x ₹${item.price}`).join('\n')}

Provide:
1. Brief purchase pattern observation (1 sentence)
2. One personalized product recommendation
3. Loyalty insight if repeat customer

Keep response under 150 words, friendly and actionable.
`;

    const result = await model.generateContent(prompt);
    const insights = result.response.text();

    console.log(`[POS AI] ✓ Generated insights for invoice ${invoiceData.invoiceNumber}`);

    // Store insights in database
    await db.query(
      `INSERT INTO src_pos_audit_events (event_type, entity_type, entity_id, device_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['ai_insights', 'invoice', invoiceData.invoiceNumber, invoiceData.deviceId, insights]
    );

    return { success: true, insights };
  } catch (error) {
    console.error('[POS AI] Failed to generate insights:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send invoice notification via messaging system
 */
async function sendInvoiceNotification(invoiceData, userId) {
  try {
    if (!userId) {
      return { success: false, reason: 'no_user_id' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.norenfashion.shop';
    const invoiceUrl = `${frontendUrl}/my-billing/invoice/${invoiceData.invoiceToken}`;

    const message = {
      content: `Your invoice ${invoiceData.invoiceNumber} is ready! Total: ₹${invoiceData.total}. View here: ${invoiceUrl}`,
      type: 'invoice_notification',
      metadata: {
        invoiceNumber: invoiceData.invoiceNumber,
        total: invoiceData.total,
        invoiceUrl
      }
    };

    // Insert notification into messages table
    await db.query(
      `INSERT INTO src_social_messages (conversation_id, sender_id, content, message_type, metadata, created_at)
       SELECT c.id, 0, $1, $2, $3, NOW()
       FROM src_social_conversations c
       WHERE c.user1_id = $4 OR c.user2_id = $4
       LIMIT 1`,
      [message.content, message.type, JSON.stringify(message.metadata), userId]
    );

    console.log(`[POS Messaging] ✓ Notification sent to user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[POS Messaging] Failed to send notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate daily sales summary email for admin/manager
 */
async function generateDailySalesSummary(date = new Date()) {
  try {
    const dateStr = date.toISOString().split('T')[0];

    // Query daily sales data
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_invoices,
        SUM(total) as total_revenue,
        json_agg(json_build_object('item', item_name, 'quantity', item_qty)) as items
       FROM src_pos_invoice_tokens
       WHERE DATE(created_at) = $1`,
      [dateStr]
    );

    if (!result.rows.length || result.rows[0].total_invoices === '0') {
      console.log(`[POS Summary] No sales data for ${dateStr}`);
      return { success: false, reason: 'no_data' };
    }

    const { total_invoices, total_revenue, items } = result.rows[0];

    // Calculate top items
    const itemCounts = {};
    (items || []).forEach(item => {
      if (item.item) {
        itemCounts[item.item] = (itemCounts[item.item] || 0) + parseInt(item.quantity || 0);
      }
    });

    const topItems = Object.entries(itemCounts)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.norenfashion.shop';
    const invoiceListUrl = `${frontendUrl}/admin/pos-invoices`;

    const html = emailTemplates.posDailySalesSummary(
      dateStr,
      parseInt(total_invoices),
      parseFloat(total_revenue),
      topItems,
      invoiceListUrl
    );

    // Get admin emails
    const admins = await db.query(
      `SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`
    );

    for (const admin of admins.rows) {
      await sendMail(
        admin.email,
        `Daily Sales Summary - ${dateStr}`,
        html
      );
    }

    console.log(`[POS Summary] ✓ Daily summary sent to ${admins.rows.length} admins`);
    return { success: true, recipientCount: admins.rows.length };
  } catch (error) {
    console.error('[POS Summary] Failed to generate daily summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log email activity to database
 */
async function logEmailActivity(activity) {
  try {
    await db.query(
      `INSERT INTO src_pos_audit_events (event_type, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      ['email_sent', activity.type, activity.invoiceNumber, JSON.stringify(activity)]
    );
  } catch (error) {
    console.error('[POS Email] Failed to log email activity:', error);
  }
}

/**
 * Orchestrate all service integrations for a synced invoice
 */
async function processInvoiceServices(invoiceData, options = {}) {
  const {
    sendEmail = true,
    generateInsights = false,
    sendNotification = false
  } = options;

  const results = {
    email: null,
    ai: null,
    messaging: null
  };

  try {
    // 1. Send email receipt (if customer email provided)
    if (sendEmail && invoiceData.customerEmail) {
      results.email = await sendInvoiceReceiptEmail(invoiceData);
    }

    // 2. Generate AI insights (optional, for analytics)
    if (generateInsights) {
      results.ai = await generateInvoiceInsights(invoiceData);
    }

    // 3. Send messaging notification (if user ID available)
    if (sendNotification && invoiceData.userId) {
      results.messaging = await sendInvoiceNotification(invoiceData, invoiceData.userId);
    }

    console.log('[POS Services] Invoice processing complete:', {
      invoice: invoiceData.invoiceNumber,
      email: results.email?.success ? '✓' : '✗',
      ai: results.ai?.success ? '✓' : '✗',
      messaging: results.messaging?.success ? '✓' : '✗'
    });

    return results;
  } catch (error) {
    console.error('[POS Services] Failed to process invoice services:', error);
    return results;
  }
}

module.exports = {
  sendInvoiceReceiptEmail,
  sendPaymentConfirmationEmail,
  generateInvoiceInsights,
  sendInvoiceNotification,
  generateDailySalesSummary,
  processInvoiceServices
};

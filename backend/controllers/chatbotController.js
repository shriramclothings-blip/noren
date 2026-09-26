'use strict';

const { pool } = require('../config/db');
const https = require('https');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Helper: call Groq AI (Llama 3.1 70B)
async function callGroq(prompt, temperature = 0.7, maxTokens = 1024) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) {
    throw new Error('Groq API key not configured. Get your free key at https://console.groq.com');
  }

  const body = JSON.stringify({
    model: 'llama-3.1-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
    stream: false,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      GROQ_URL,
      { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body)
        } 
      },
      (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode !== 200) {
              const errMsg = json.error?.message || ('Groq API error: HTTP ' + res.statusCode);
              return reject(new Error(errMsg));
            }
            const text = json?.choices?.[0]?.message?.content;
            if (!text) return reject(new Error('Groq returned empty response'));
            resolve(text.trim());
          } catch (e) {
            reject(new Error('Failed to parse Groq response: ' + e.message));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Groq API timeout')); });
    req.write(body);
    req.end();
  });
}

// Helper: Fetch product information with images for context
async function fetchProductContext(query) {
  try {
    // Search products by title, category, or description with images
    const searchQuery = `%${query}%`;
    const result = await pool.query(
      `SELECT p.id, p.title, p.description, p.price, p.discount_percent, p.gender,
              c.name as category,
              (SELECT image_url FROM src_product_images 
               WHERE product_id = p.id AND is_primary = TRUE 
               LIMIT 1) as primary_image,
              (SELECT image_url FROM src_product_images 
               WHERE product_id = p.id 
               ORDER BY is_primary DESC, sort_order ASC 
               LIMIT 1) as first_image,
              (SELECT AVG(rating)::NUMERIC(3,1) FROM src_reviews 
               WHERE product_id = p.id AND is_hidden = FALSE) as avg_rating,
              (SELECT COUNT(*) FROM src_reviews 
               WHERE product_id = p.id AND is_hidden = FALSE) as review_count
       FROM src_products p
       LEFT JOIN src_categories c ON p.category_id = c.id
       WHERE p.deleted_at IS NULL 
         AND p.status = 'approved'
         AND (LOWER(p.title) LIKE LOWER($1) 
              OR LOWER(c.name) LIKE LOWER($1) 
              OR LOWER(p.description) LIKE LOWER($1))
       ORDER BY p.views DESC, p.created_at DESC
       LIMIT 6`,
      [searchQuery]
    );
    
    // Add product URLs and format for frontend
    return result.rows.map(p => ({
      id: p.id,
      name: p.title, // Map title to name for consistency
      title: p.title,
      description: p.description,
      price: p.price,
      discount_price: p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : null,
      category: p.category,
      rating: parseFloat(p.avg_rating) || 0,
      review_count: parseInt(p.review_count) || 0,
      image: p.primary_image || p.first_image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
      url: `https://www.norenfastion.shop/product/${p.id}`,
      final_price: p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : p.price,
      has_discount: p.discount_percent > 0,
    }));
  } catch (err) {
    console.error('Product context fetch error:', err);
    return [];
  }
}

// Helper: Fetch order information by order ID with full details
async function fetchOrderDetails(orderId) {
  try {
    // First try exact match, then partial match
    let result = await pool.query(
      `SELECT o.order_id, o.status, o.payment_status, o.total, o.subtotal, 
              o.delivery_charge, o.discount_amount, o.full_name, o.mobile, 
              o.address, o.city, o.state, o.pincode, o.created_at, o.updated_at,
              o.tracking_id, o.courier_name, o.estimated_delivery, o.notes
       FROM src_orders o
       WHERE UPPER(o.order_id) = UPPER($1)
       LIMIT 1`,
      [orderId]
    );
    
    // If not found, try partial match (in case user didn't include full ID)
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT o.order_id, o.status, o.payment_status, o.total, o.subtotal, 
                o.delivery_charge, o.discount_amount, o.full_name, o.mobile, 
                o.address, o.city, o.state, o.pincode, o.created_at, o.updated_at,
                o.tracking_id, o.courier_name, o.estimated_delivery, o.notes
         FROM src_orders o
         WHERE UPPER(o.order_id) LIKE UPPER($1)
         ORDER BY o.created_at DESC
         LIMIT 1`,
        [`%${orderId}%`]
      );
    }
    
    if (result.rows.length === 0) return null;
    
    const order = result.rows[0];
    
    // Fetch order items with product images
    const itemsResult = await pool.query(
      `SELECT oi.title, oi.size, oi.color, oi.quantity, oi.price, oi.line_total,
              oi.product_id,
              (SELECT image_url FROM src_product_images 
               WHERE product_id = oi.product_id AND is_primary = TRUE 
               LIMIT 1) as image
       FROM src_order_items oi
       WHERE oi.order_id = $1`,
      [order.order_id]
    );
    
    order.items = itemsResult.rows.map(item => ({
      ...item,
      image: item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200'
    }));
    
    return order;
  } catch (err) {
    console.error('Order fetch error:', err);
    return null;
  }
}

// Helper: Get general store information
async function getStoreInfo() {
  try {
    const [productsResult, categoriesResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM src_products WHERE deleted_at IS NULL AND status = 'approved'`),
      pool.query(`SELECT DISTINCT c.name as category FROM src_products p 
                  LEFT JOIN src_categories c ON p.category_id = c.id
                  WHERE p.deleted_at IS NULL AND p.status = 'approved' AND c.name IS NOT NULL 
                  ORDER BY c.name`),
    ]);
    
    return {
      total_products: parseInt(productsResult.rows[0]?.total || 0),
      categories: categoriesResult.rows.map(r => r.category),
    };
  } catch (err) {
    console.error('Store info fetch error:', err);
    return { total_products: 0, categories: [] };
  }
}

// Main chatbot endpoint
const chat = async (req, res) => {
  const { message, conversation_history = [] } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const userMessage = message.trim();
    
    // Detect intent from message
    const isOrderQuery = /order|track|status|delivery|shipped|delivered|order\s*id|#src/i.test(userMessage);
    const isProductQuery = /product|price|available|stock|buy|purchase|show|find|search|looking for|want|need/i.test(userMessage);
    
    let contextData = '';
    let specificData = null;
    
    // Check if message contains an order ID (format: SRC followed by alphanumeric)
    const orderIdMatch = userMessage.match(/SRC[A-Z0-9]+/i);
    
    if (isOrderQuery && orderIdMatch) {
      // Fetch order details
      const orderDetails = await fetchOrderDetails(orderIdMatch[0]);
      if (orderDetails) {
        specificData = { type: 'order', data: orderDetails };
        contextData = `\n\nORDER INFORMATION (Order ID: ${orderDetails.order_id}):\n` +
          `- Status: ${orderDetails.status}\n` +
          `- Payment Status: ${orderDetails.payment_status}\n` +
          `- Total Amount: ₹${orderDetails.total}\n` +
          `- Customer: ${orderDetails.full_name}\n` +
          `- Delivery Address: ${orderDetails.address}, ${orderDetails.city}, ${orderDetails.state} - ${orderDetails.pincode}\n` +
          `- Order Date: ${new Date(orderDetails.created_at).toLocaleDateString('en-IN')}\n` +
          (orderDetails.tracking_id ? `- Tracking ID: ${orderDetails.tracking_id}\n` : '') +
          (orderDetails.courier_name ? `- Courier: ${orderDetails.courier_name}\n` : '') +
          (orderDetails.estimated_delivery ? `- Estimated Delivery: ${new Date(orderDetails.estimated_delivery).toLocaleDateString('en-IN')}\n` : '') +
          `- Items Ordered:\n${orderDetails.items.map((item, i) => 
            `  ${i + 1}. ${item.title} (${item.size}, ${item.color}) - Qty: ${item.quantity} - ₹${item.line_total}`
          ).join('\n')}`;
      } else {
        contextData = `\n\nORDER NOT FOUND: No order found with ID ${orderIdMatch[0]}. The customer may have entered an incorrect order ID.`;
      }
    } else if (isProductQuery) {
      // Fetch relevant products
      const products = await fetchProductContext(userMessage);
      if (products.length > 0) {
        specificData = { type: 'products', data: products };
        contextData = `\n\nRELEVANT PRODUCTS FROM NOREN CATALOG:\n` +
          products.map((p, i) => 
            `${i + 1}. ${p.title}\n` +
            `   - Category: ${p.category || 'Fashion'}\n` +
            `   - Price: ₹${p.final_price} ${p.has_discount ? `(Original: ₹${p.price})` : ''}\n` +
            `   - Rating: ${p.rating > 0 ? p.rating + ' stars' : 'New product'} ${p.review_count > 0 ? `(${p.review_count} reviews)` : ''}\n` +
            `   - Description: ${p.description?.substring(0, 120) || 'Stylish fashion item'}...`
          ).join('\n\n');
      }
    }
    
    // Get general store info
    const storeInfo = await getStoreInfo();
    
    // Build conversation history (last 6 messages)
    const conversationContext = conversation_history.slice(-6).map(m =>
      `${m.role === 'user' ? 'Customer' : 'NOREN Assistant'}: ${m.content}`
    ).join('\n');
    
    // Build AI prompt
    const systemPrompt = `You are NOREN's AI Customer Support Assistant. You help customers with:
1. PRODUCT QUESTIONS - Answer questions about products, availability, prices, features, and recommendations
2. ORDER TRACKING - Provide order status, tracking information, and delivery updates
3. GENERAL HELP - Answer questions about shipping, returns, payments, and store policies

STORE INFORMATION:
- Website: www.norenfastion.shop
- Total Products Available: ${storeInfo.total_products}
- Categories: ${storeInfo.categories.join(', ') || 'Various fashion categories'}

GUIDELINES:
- Be friendly, helpful, and professional
- Use emojis sparingly (1-2 per response)
- Keep responses concise (3-5 sentences max unless more detail is needed)
- If you have specific product or order data, reference it directly
- If you don't have enough information, politely ask for more details
- For order tracking, always mention the order ID
- Always encourage customers to contact support@norenfastion.shop for complex issues
- Format prices in Indian Rupees (₹)
- Use natural, conversational language

${contextData}

${conversationContext ? `\nRECENT CONVERSATION:\n${conversationContext}\n` : ''}

Customer asks: ${userMessage}

Provide a helpful, friendly response:`;

    // Call Groq AI (Llama 3.1)
    const aiResponse = await callGroq(systemPrompt, 0.8, 800);
    
    // Return response
    res.json({
      response: aiResponse,
      context: specificData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ 
      message: 'Sorry, I encountered an error. Please try again or contact support@norenfastion.shop',
      error: err.message 
    });
  }
};

// Get popular products for chatbot suggestions
const getSuggestions = async (req, res) => {
  try {
    const [popularProducts, categories] = await Promise.all([
      pool.query(
        `SELECT p.id, p.title, p.price, p.discount_percent,
                c.name as category,
                (SELECT AVG(rating)::NUMERIC(3,1) FROM src_reviews 
                 WHERE product_id = p.id AND is_hidden = FALSE) as avg_rating
         FROM src_products p
         LEFT JOIN src_categories c ON p.category_id = c.id
         WHERE p.deleted_at IS NULL AND p.status = 'approved'
         ORDER BY p.views DESC, p.created_at DESC
         LIMIT 6`
      ),
      pool.query(
        `SELECT c.name as category, COUNT(*) as product_count
         FROM src_products p
         LEFT JOIN src_categories c ON p.category_id = c.id
         WHERE p.deleted_at IS NULL AND p.status = 'approved' AND c.name IS NOT NULL
         GROUP BY c.name
         ORDER BY product_count DESC
         LIMIT 8`
      ),
    ]);
    
    res.json({
      popular_products: popularProducts.rows.map(p => ({
        id: p.id,
        name: p.title,
        category: p.category,
        price: p.price,
        discount_price: p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : null,
        rating: parseFloat(p.avg_rating) || 0,
      })),
      categories: categories.rows,
      quick_questions: [
        "What are your best-selling products?",
        "Do you have any ongoing sales or discounts?",
        "What is your return policy?",
        "How long does delivery usually take?",
        "Track my order"
      ]
    });
  } catch (err) {
    console.error('Suggestions fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch suggestions' });
  }
};

module.exports = { chat, getSuggestions };

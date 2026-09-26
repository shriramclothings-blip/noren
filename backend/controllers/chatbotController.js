'use strict';

const { pool } = require('../config/db');
const https = require('https');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

// Helper: call Gemini AI
async function callGemini(prompt, temperature = 0.7, maxTokens = 1024) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) {
    throw new Error('Gemini API key not configured.');
  }

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens, topP: 0.9 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      `${GEMINI_URL}?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode !== 200) {
              const errMsg = json.error?.message || ('Gemini HTTP ' + res.statusCode);
              return reject(new Error(errMsg));
            }
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return reject(new Error('Gemini returned empty response'));
            resolve(text.trim());
          } catch (e) {
            reject(new Error('Failed to parse Gemini response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Gemini timeout')); });
    req.write(body);
    req.end();
  });
}

// Helper: Fetch product information with images for context
async function fetchProductContext(query) {
  try {
    // Search products by name, category, or description with images
    const searchQuery = `%${query}%`;
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.price, p.discount_price, p.category, 
              p.stock_quantity, p.status, p.brand, p.rating, p.review_count,
              (SELECT image_url FROM src_product_images 
               WHERE product_id = p.id AND is_primary = TRUE 
               LIMIT 1) as primary_image,
              (SELECT image_url FROM src_product_images 
               WHERE product_id = p.id 
               ORDER BY is_primary DESC, sort_order ASC 
               LIMIT 1) as first_image
       FROM src_products p
       WHERE p.deleted_at IS NULL 
         AND p.status = 'approved'
         AND (LOWER(p.name) LIKE LOWER($1) 
              OR LOWER(p.category) LIKE LOWER($1) 
              OR LOWER(p.description) LIKE LOWER($1)
              OR LOWER(p.brand) LIKE LOWER($1))
       ORDER BY p.rating DESC, p.review_count DESC
       LIMIT 6`,
      [searchQuery]
    );
    
    // Add product URLs and format for frontend
    return result.rows.map(p => ({
      ...p,
      image: p.primary_image || p.first_image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
      url: `https://www.norenfastion.shop/product/${p.id}`,
      final_price: p.discount_price || p.price,
      has_discount: !!p.discount_price,
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
    const [productsResult, categoriesResult, brandsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM src_products WHERE deleted_at IS NULL AND status = 'approved'`),
      pool.query(`SELECT DISTINCT category FROM src_products WHERE deleted_at IS NULL AND status = 'approved' AND category IS NOT NULL ORDER BY category`),
      pool.query(`SELECT DISTINCT brand FROM src_products WHERE deleted_at IS NULL AND status = 'approved' AND brand IS NOT NULL ORDER BY brand`),
    ]);
    
    return {
      total_products: parseInt(productsResult.rows[0]?.total || 0),
      categories: categoriesResult.rows.map(r => r.category),
      brands: brandsResult.rows.map(r => r.brand),
    };
  } catch (err) {
    console.error('Store info fetch error:', err);
    return { total_products: 0, categories: [], brands: [] };
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
            `${i + 1}. ${p.name}\n` +
            `   - Category: ${p.category || 'N/A'}\n` +
            `   - Brand: ${p.brand || 'N/A'}\n` +
            `   - Price: ₹${p.discount_price || p.price} ${p.discount_price ? `(Original: ₹${p.price})` : ''}\n` +
            `   - Stock: ${p.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}\n` +
            `   - Rating: ${p.rating || 'N/A'} (${p.review_count || 0} reviews)\n` +
            `   - Description: ${p.description?.substring(0, 150) || 'N/A'}...`
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
- Brands: ${storeInfo.brands.slice(0, 10).join(', ') || 'Multiple brands'}${storeInfo.brands.length > 10 ? ' and more' : ''}

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

    // Call Gemini AI
    const aiResponse = await callGemini(systemPrompt, 0.8, 800);
    
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
        `SELECT p.id, p.name, p.category, p.price, p.discount_price, p.rating
         FROM src_products p
         WHERE p.deleted_at IS NULL AND p.status = 'approved' AND p.stock_quantity > 0
         ORDER BY p.rating DESC, p.review_count DESC
         LIMIT 6`
      ),
      pool.query(
        `SELECT DISTINCT category, COUNT(*) as product_count
         FROM src_products
         WHERE deleted_at IS NULL AND status = 'approved'
         GROUP BY category
         ORDER BY product_count DESC
         LIMIT 8`
      ),
    ]);
    
    res.json({
      popular_products: popularProducts.rows,
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

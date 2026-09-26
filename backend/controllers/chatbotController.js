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
    model: 'openai/gpt-oss-120b', // Groq's flagship model - fast & powerful
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

// Helper: Fetch product information with SMART SEARCH
async function fetchProductContext(query) {
  try {
    // Extract meaningful keywords from query (remove common words)
    const stopWords = ['show', 'me', 'find', 'get', 'want', 'need', 'looking', 'for', 'any', 'some', 'the', 'a', 'an', 'with', 'have', 'do', 'you', 'your', 'tell', 'about', 'what', 'which', 'how', 'when', 'where', 'are', 'is', 'in', 'on', 'at', 'to', 'from'];
    
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    let result;
    
    // Strategy 1: Try exact phrase match first
    const searchQuery = `%${query}%`;
    result = await pool.query(
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
              OR LOWER(p.description) LIKE LOWER($1)
              OR LOWER(p.gender) LIKE LOWER($1))
       ORDER BY 
         CASE 
           WHEN LOWER(p.title) LIKE LOWER($1) THEN 1
           WHEN LOWER(c.name) LIKE LOWER($1) THEN 2
           ELSE 3
         END,
         p.views DESC, 
         p.created_at DESC
       LIMIT 8`,
      [searchQuery]
    );
    
    // Strategy 2: If no results, try searching with individual keywords
    if (result.rows.length === 0 && keywords.length > 0) {
      const keywordConditions = keywords.map((_, idx) => 
        `(LOWER(p.title) LIKE LOWER($${idx + 1}) OR LOWER(c.name) LIKE LOWER($${idx + 1}) OR LOWER(p.description) LIKE LOWER($${idx + 1}) OR LOWER(p.gender) LIKE LOWER($${idx + 1}))`
      ).join(' OR ');
      
      const keywordParams = keywords.map(k => `%${k}%`);
      
      result = await pool.query(
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
           AND (${keywordConditions})
         ORDER BY p.views DESC, p.created_at DESC
         LIMIT 8`,
        keywordParams
      );
    }
    
    // Strategy 3: If still no results, show popular/trending products
    if (result.rows.length === 0) {
      result = await pool.query(
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
         ORDER BY p.views DESC, p.created_at DESC
         LIMIT 6`
      );
    }
    
    // Add product URLs and format for frontend
    return result.rows.map(p => ({
      id: p.id,
      name: p.title,
      title: p.title,
      description: p.description,
      price: p.price,
      discount_price: p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : null,
      category: p.category,
      gender: p.gender,
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
    
    // Get general store info FIRST (needed for error messages)
    const storeInfo = await getStoreInfo();
    
    // Detect intent from message - Enhanced detection
    const isOrderQuery = /order|track|status|delivery|shipped|delivered|order\s*id|#src/i.test(userMessage);
    const isProductQuery = /product|price|available|stock|buy|purchase|show|find|search|looking for|want|need|dress|shirt|top|saree|kurti|jeans|clothes|clothing|fashion|wear|ethnic|western|men|women|kids|photo|image|picture/i.test(userMessage);
    
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
      // Fetch relevant products with SMART SEARCH
      const products = await fetchProductContext(userMessage);
      if (products.length > 0) {
        specificData = { type: 'products', data: products };
        const searchContext = products.length >= 6 ? 'exact matches' : 'relevant products';
        contextData = `\n\nFOUND ${products.length} ${searchContext.toUpperCase()} FROM DATABASE:\n` +
          products.map((p, i) => 
            `\nProduct ${i + 1}: ${p.title}\n` +
            `   - ID: ${p.id}\n` +
            `   - Category: ${p.category || 'Fashion'}${p.gender ? ` (${p.gender})` : ''}\n` +
            `   - Exact Price: ₹${p.final_price}${p.has_discount ? ` (${Math.round(((p.price - p.final_price) / p.price) * 100)}% OFF from ₹${p.price})` : ''}\n` +
            `   - Rating: ${p.rating > 0 ? p.rating.toFixed(1) + '/5 stars' : 'New'} ${p.review_count > 0 ? `(${p.review_count} reviews)` : ''}\n` +
            `   - Photo: Available below\n` +
            `   - Description: ${p.description?.substring(0, 150) || 'Premium NOREN fashion item'}${p.description?.length > 150 ? '...' : ''}`
          ).join('\n');
      } else {
        // This should rarely happen now with smart search fallback
        contextData = `\n\nSEARCH NOTE: Your smart search tried multiple strategies but found no exact matches for "${userMessage}". Showing popular items instead.`;
      }
    } else {
      // For general questions, still show some popular products
      const products = await fetchProductContext('popular');
      if (products.length > 0) {
        specificData = { type: 'products', data: products.slice(0, 4) };
        contextData = `\n\nFOR REFERENCE - POPULAR NOREN PRODUCTS:\n` +
          products.slice(0, 4).map((p, i) => 
            `${i + 1}. ${p.title} - ₹${p.final_price} (${p.category})`
          ).join('\n');
      }
    }
    
    // Build conversation history (last 6 messages)
    const conversationContext = conversation_history.slice(-6).map(m =>
      `${m.role === 'user' ? 'Customer' : 'NOREN Assistant'}: ${m.content}`
    ).join('\n');
    
    // Build AI prompt - SMART & FORGIVING MODE
    const systemPrompt = `You are NOREN's AI Customer Support Assistant with intelligent search capabilities.

CRITICAL RULES:
1. ONLY use real database information provided below
2. Be SMART about understanding vague or incomplete queries
3. If customer asks vaguely (e.g., "show something nice"), use the products found by smart search
4. ALWAYS mention product photos are shown when products are found
5. Use EXACT prices from database (₹ symbol)
6. Even if customer makes typos or incomplete requests, show them products
7. Be helpful and guide customers naturally

STORE INFORMATION:
- Website: www.norenfastion.shop
- Total Products: ${storeInfo.total_products}
- Categories: ${storeInfo.categories.join(', ') || 'Various fashion categories'}

${contextData ? `DATABASE RESULTS:${contextData}` : 'NO EXACT MATCHES - But showing popular products below to help the customer.'}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}

Customer asked: "${userMessage}"

YOUR RESPONSE GUIDELINES:
✅ If products found: Say something like "I found [X] products for you! Check them out below with photos and prices."
✅ If query is vague: Say "Here are some beautiful pieces from our collection" and show the products
✅ If customer made typo/mistake: Still show products and say "Here's what I found for you"
✅ Use exact prices from database
✅ Be conversational, warm, and helpful
✅ Keep response to 2-4 sentences (product cards show below)
✅ Guide them to browse more if they want

Your Response:`;


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
        title: p.title,
        category: p.category,
        price: p.price,
        discount_price: p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : null,
        discount_percent: p.discount_percent,
        final_price: p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : p.price,
        has_discount: p.discount_percent > 0,
        rating: parseFloat(p.avg_rating) || 0,
        review_count: parseInt(p.review_count) || 0,
        image: p.primary_image || p.first_image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        url: `https://www.norenfastion.shop/product/${p.id}`,
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

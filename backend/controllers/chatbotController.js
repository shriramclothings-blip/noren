'use strict';

const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');
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
    console.log(`🔍 Searching for order: ${orderId}`);
    
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
    
    console.log(`📊 Exact match results: ${result.rows.length}`);
    
    // If not found, try partial match (in case user didn't include full ID)
    if (result.rows.length === 0) {
      console.log(`🔄 Trying partial match for: ${orderId}`);
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
      console.log(`📊 Partial match results: ${result.rows.length}`);
    }
    
    if (result.rows.length === 0) {
      console.log(`❌ No order found for: ${orderId}`);
      return null;
    }
    
    const order = result.rows[0];
    console.log(`✅ Found order: ${order.order_id} (${order.status})`);
    
    // Fetch order items with product images
    const itemsResult = await pool.query(
      `SELECT oi.title, oi.size, oi.quantity, oi.price, 
              (oi.price * oi.quantity) as line_total,
              oi.product_id, oi.image_url as image
       FROM src_order_items oi
       WHERE oi.order_id = $1`,
      [order.id] // Use order.id instead of order.order_id for the relationship
    );
    
    order.items = itemsResult.rows.map(item => ({
      ...item,
      color: 'N/A', // Default color since it's not stored
      image: item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200'
    }));
    
    console.log(`📦 Order has ${order.items.length} items`);
    return order;
  } catch (err) {
    console.error('❌ Order fetch error:', err.message);
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

// Helper: Fetch all products for email catalog
async function fetchAllProductsForEmail() {
  try {
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
       ORDER BY c.name, p.views DESC, p.created_at DESC
       LIMIT 50`
    );
    
    return result.rows.map(p => ({
      id: p.id,
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
    console.error('All products fetch error:', err);
    return [];
  }
}

// Helper: Generate product catalog email HTML
function generateProductCatalogHTML(products, customerEmail, customerName) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Group products by category
  const productsByCategory = {};
  products.forEach(product => {
    const category = product.category || 'Uncategorized';
    if (!productsByCategory[category]) {
      productsByCategory[category] = [];
    }
    productsByCategory[category].push(product);
  });

  const categorySections = Object.entries(productsByCategory).map(([category, categoryProducts]) => `
    <div style="margin-bottom: 40px;">
      <h2 style="color: #2D3748; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #E2E8F0;">
        ${category}
      </h2>
      <div style="display: flex; flex-wrap: wrap; gap: 20px;">
        ${categoryProducts.map(product => `
          <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 15px; width: 280px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <img src="${product.image}" alt="${product.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
            <h3 style="color: #2D3748; font-size: 16px; margin: 10px 0; font-weight: 600;">${product.title}</h3>
            <p style="color: #4A5568; font-size: 14px; margin: 8px 0; line-height: 1.4;">${product.description ? product.description.substring(0, 120) + '...' : 'Premium fashion item from NOREN'}</p>
            
            <div style="margin: 10px 0;">
              ${product.has_discount ? `
                <span style="color: #E53E3E; font-size: 18px; font-weight: bold;">₹${product.final_price}</span>
                <span style="color: #A0AEC0; font-size: 14px; text-decoration: line-through; margin-left: 8px;">₹${product.price}</span>
                <span style="color: #38A169; font-size: 12px; margin-left: 8px; background: #F0FFF4; padding: 2px 6px; border-radius: 4px;">
                  ${Math.round(((product.price - product.final_price) / product.price) * 100)}% OFF
                </span>
              ` : `
                <span style="color: #2D3748; font-size: 18px; font-weight: bold;">₹${product.final_price}</span>
              `}
            </div>
            
            ${product.rating > 0 ? `
              <div style="margin: 8px 0; color: #4A5568; font-size: 14px;">
                ⭐ ${product.rating.toFixed(1)}/5 ${product.review_count > 0 ? `(${product.review_count} reviews)` : ''}
              </div>
            ` : ''}
            
            <a href="${product.url}" style="display: inline-block; background: #3182CE; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: 500; text-align: center; width: calc(100% - 40px);">
              View Product
            </a>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NOREN Product Catalog</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #F7FAFC;">
      <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700;">NOREN Fashion</h1>
          <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">Complete Product Catalog</p>
        </div>
        
        <!-- Greeting -->
        <div style="padding: 30px 40px; background: #F8F9FA; border-bottom: 1px solid #E9ECEF;">
          <h2 style="color: #2D3748; margin: 0 0 15px; font-size: 24px;">Hi ${customerName || 'Valued Customer'}! 👋</h2>
          <p style="color: #4A5568; margin: 0; font-size: 16px; line-height: 1.5;">
            Thank you for your interest in our products! As requested by our AI assistant, here's our complete product catalog with detailed information, pricing, and photos. 
            Browse through our collection and click on any product to visit our website for more details.
          </p>
          <div style="background: #EDF2F7; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <p style="margin: 0; color: #4A5568; font-size: 14px;">
              📧 <strong>Email sent by:</strong> NOREN AI Assistant<br>
              📅 <strong>Generated on:</strong> ${currentDate}<br>
              📦 <strong>Total Products:</strong> ${products.length} items
            </p>
          </div>
        </div>
        
        <!-- Products -->
        <div style="padding: 30px 40px;">
          ${categorySections}
        </div>
        
        <!-- Footer -->
        <div style="background: #2D3748; color: white; padding: 30px 40px; text-align: center;">
          <h3 style="margin: 0 0 15px; font-size: 20px;">Visit Our Store</h3>
          <p style="margin: 0 0 20px; opacity: 0.9;">Explore more products and place your order on our website</p>
          <a href="https://www.norenfastion.shop" style="display: inline-block; background: #3182CE; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 0 10px 10px;">
            Shop Now
          </a>
          <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
            <p>📧 support@norenfastion.shop | 🌐 www.norenfastion.shop</p>
            <p>This email was generated automatically by NOREN AI Assistant</p>
          </div>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

// Helper: Send product catalog email
async function sendProductCatalogEmail(customerEmail, customerName) {
  try {
    console.log(`📧 Preparing product catalog email for: ${customerEmail}`);
    
    // Fetch all products
    const products = await fetchAllProductsForEmail();
    
    if (products.length === 0) {
      console.log('❌ No products found for catalog');
      return {
        success: false,
        message: "Sorry, no products are currently available in our catalog."
      };
    }
    
    // Generate HTML email
    const emailHTML = generateProductCatalogHTML(products, customerEmail, customerName);
    const emailSubject = `NOREN Complete Product Catalog - ${products.length} Products Available!`;
    
    // Send email
    const emailSent = await sendMail(customerEmail, emailSubject, emailHTML);
    
    if (emailSent) {
      console.log(`✅ Product catalog email sent successfully to: ${customerEmail}`);
      
      // Log the email in the database for tracking
      try {
        await pool.query(
          `INSERT INTO src_email_sent (
            sender_email, sender_name, recipient_email, recipient_name,
            recipient_type, subject, body_html, email_type, status, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            process.env.EMAIL_FROM || 'noreply@norenfastion.shop',
            'NOREN AI Assistant',
            customerEmail,
            customerName || null,
            'customer',
            emailSubject,
            emailHTML,
            'ai_catalog',
            'sent',
            JSON.stringify({
              product_count: products.length,
              generated_by: 'ai_assistant',
              request_date: new Date().toISOString()
            })
          ]
        );
      } catch (dbErr) {
        console.error('Error logging email to database:', dbErr);
        // Don't fail the request if logging fails
      }
      
      return {
        success: true,
        message: `Perfect! I've sent a complete product catalog with ${products.length} products to ${customerEmail}. The email includes detailed photos, pricing, and direct links to each product. Please check your inbox (and spam folder just in case)!`,
        productCount: products.length,
        categories: [...new Set(products.map(p => p.category))].filter(Boolean)
      };
    } else {
      console.log(`❌ Failed to send product catalog email to: ${customerEmail}`);
      return {
        success: false,
        message: "Sorry, there was an issue sending the email. Please check your email address or try again later. You can also contact our support at support@norenfastion.shop"
      };
    }
    
  } catch (err) {
    console.error('Error in sendProductCatalogEmail:', err);
    return {
      success: false,
      message: "Sorry, there was a technical issue preparing your product catalog. Please try again later or contact support@norenfastion.shop"
    };
  }
}

// Main chatbot endpoint
const chat = async (req, res) => {
  const { message, conversation_history = [], user_context = {} } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const userMessage = message.trim();
    
    // Get general store info FIRST (needed for error messages)
    const storeInfo = await getStoreInfo();
    
    // Detect intent from message - IMPROVED SMART DETECTION
    const isOrderQuery = /order|track|status|delivery|shipped|delivered|order\s*id|#src/i.test(userMessage);
    
    // Detect email request - NEW FEATURE
    const isEmailRequest = /send\s+.*email|email\s+.*products|email\s+.*catalog|email\s+.*details|products\s+.*email|catalog\s+.*email|send.*all.*products|email.*all.*items|mail.*products/i.test(userMessage);
    
    // ONLY show products if user is CLEARLY asking about products
    const isProductQuery = /\b(product|show|find|search|looking for|want|need|buy|purchase|price|available|stock|dress|shirt|top|saree|kurti|jeans|clothes|clothing|fashion|wear|ethnic|western|kurta|lehenga|suit|outfit|collection)\b/i.test(userMessage);
    
    // Detect NON-product queries (shipping, returns, policies, help, etc.)
    const isGeneralQuery = /\b(ship|delivery|return|exchange|refund|policy|payment|cod|cancel|help|support|contact|email|phone|timing|hours|location|address|store|about|who|what is|how to|guide|size chart|measure)\b/i.test(userMessage);
    
    let contextData = '';
    let specificData = null;
    
    // Check if message contains an order ID (format: SRC followed by alphanumeric)
    const orderIdMatch = userMessage.match(/SRC[A-Z0-9]+/i);
    
    // Handle email request - NEW FEATURE
    if (isEmailRequest) {
      console.log('🔍 Email request detected:', userMessage);
      
      // Extract email from message or ask for it
      const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      
      if (emailMatch) {
        // Email found in message, send catalog
        const customerEmail = emailMatch[0];
        const customerName = user_context.user_name || 'Valued Customer';
        
        console.log(`📧 Sending product catalog to: ${customerEmail}`);
        const emailResult = await sendProductCatalogEmail(customerEmail, customerName);
        
        if (emailResult.success) {
          return res.json({
            response: emailResult.message,
            context: {
              type: 'email_sent',
              data: {
                email: customerEmail,
                productCount: emailResult.productCount,
                categories: emailResult.categories,
                sent_by: 'NOREN AI Assistant'
              }
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          return res.json({
            response: emailResult.message,
            context: { type: 'email_error', data: { error: true } },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Ask for email address
        const storeInfo = await getStoreInfo();
        return res.json({
          response: `I'd be happy to email you our complete product catalog with ${storeInfo.total_products}+ items including detailed photos, pricing, and descriptions! 📧\n\nPlease provide your email address and I'll send it right away. For example, just say: "Send catalog to john@example.com"`,
          context: { 
            type: 'email_request', 
            data: { 
              awaiting_email: true,
              total_products: storeInfo.total_products,
              categories: storeInfo.categories
            } 
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
    
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
            `  ${i + 1}. ${item.title} (Size: ${item.size || 'N/A'}) - Qty: ${item.quantity} - ₹${item.line_total || (item.price * item.quantity)}`
          ).join('\n')}`;
      } else {
        // Enhanced order not found response with helpful suggestions
        const searchId = orderIdMatch[0];
        
        // Check if there are similar order IDs (fuzzy matching)
        let similarOrders = [];
        try {
          const similarResult = await pool.query(
            `SELECT order_id, status, created_at, full_name 
             FROM src_orders 
             WHERE order_id ILIKE $1 
             OR SUBSTRING(order_id FROM 4) ILIKE $2
             ORDER BY created_at DESC 
             LIMIT 3`,
            [`%${searchId.substring(3)}%`, `%${searchId.substring(3)}%`]
          );
          similarOrders = similarResult.rows;
        } catch (err) {
          console.error('Error finding similar orders:', err);
        }
        
        contextData = `\n\nORDER NOT FOUND: No order found with ID "${searchId}".\n\n` +
          `POSSIBLE REASONS:\n` +
          `1. Order ID might be typed incorrectly (please double-check)\n` +
          `2. Order might be from a different website/store\n` +
          `3. Order might be very old or not yet processed\n\n` +
          (similarOrders.length > 0 ? 
            `SIMILAR ORDER IDs FOUND:\n${similarOrders.map((order, i) => 
              `${i + 1}. ${order.order_id} (${order.status}) - Customer: ${order.full_name} - ${new Date(order.created_at).toLocaleDateString('en-IN')}`
            ).join('\n')}\n\n` : '') +
          `WHAT TO DO NEXT:\n` +
          `- Check your email for the correct order ID\n` +
          `- Contact support at support@norenfastion.shop with your phone/email\n` +
          `- Provide your order confirmation email or screenshot`;
      }
    } else if (isProductQuery && !isGeneralQuery) {
      // ONLY fetch products if user is asking about products AND not asking general questions
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
      }
    } else {
      // For general/policy questions, DO NOT show products
      // Just provide context about available categories if needed
      contextData = `\n\nSTORE CONTEXT:\n` +
        `- Total Products: ${storeInfo.total_products}\n` +
        `- Available Categories: ${storeInfo.categories.join(', ')}\n` +
        `- Support Email: support@norenfastion.shop\n` +
        `- Website: www.norenfastion.shop\n\n` +
        `NOTE: Customer is asking a general/policy question, NOT looking for products. Answer their question directly without showing product recommendations.`;
    }
    
    // Build conversation history (last 6 messages)
    const conversationContext = conversation_history.slice(-6).map(m =>
      `${m.role === 'user' ? 'Customer' : 'NOREN Assistant'}: ${m.content}`
    ).join('\n');
    
    // Build AI prompt - CONTEXT-AWARE MODE
    const systemPrompt = `You are NOREN's AI Customer Support Assistant.

USER CONTEXT:
- Customer Name: ${user_context.user_name || 'Valued Customer'}
- Customer Email: ${user_context.email || 'Not provided'}
- User ID: ${user_context.user_id || 'Guest'}

CRITICAL RULES:
1. ONLY use real database information provided below
2. If customer asks about PRODUCTS → Show product cards with photos
3. If customer asks about POLICIES/HELP (shipping, returns, payment, etc.) → Answer directly WITHOUT showing products
4. If customer asks for EMAIL CATALOG → Ask for their email address and offer to send complete catalog
5. Use EXACT prices from database (₹ symbol)
6. Address the customer by name when appropriate
7. Be helpful and context-aware
8. If ORDER NOT FOUND → Be empathetic, provide helpful next steps, and offer alternatives

EMAIL CATALOG FEATURE:
- When customer asks to "email products", "send catalog", or similar requests
- Respond: "I can email you our complete product catalog! Please provide your email address."
- Example: "Send all products to john@example.com" or "Email catalog to me at jane@gmail.com"

SPECIAL HANDLING FOR ORDER NOT FOUND:
- Acknowledge their frustration professionally
- Suggest they double-check the order ID
- Offer alternative ways to help (phone/email lookup)
- Provide support contact information
- If similar orders shown, mention they can verify if any match

STORE INFORMATION:
- Website: www.norenfastion.shop
- Total Products: ${storeInfo.total_products}
- Categories: ${storeInfo.categories.join(', ')}
- Support: support@norenfastion.shop

CUSTOMER QUESTION TYPE:
${isEmailRequest ? '📧 EMAIL CATALOG REQUEST - Guide them to provide email address' : 
  isProductQuery && !isGeneralQuery ? '🛍️ PRODUCT SEARCH - Show products with photos' : 
  '❓ GENERAL/POLICY QUESTION - Answer directly, NO products'}

${contextData}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}

Customer asked: "${userMessage}"

YOUR RESPONSE GUIDELINES:
✅ If PRODUCT query: "I found X products for you! Check them below with photos."
✅ If GENERAL query: Answer their question directly about shipping/returns/policies
✅ If EMAIL request: "I can email you our complete catalog! Please provide your email address."
✅ Use conversational, warm tone
✅ Use customer's name occasionally (not every message)
✅ Keep response to 2-4 sentences
✅ Be helpful and guide them

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
        "Email me all product details",
        "Send product catalog to my email",
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

// Send product catalog via email - NEW FEATURE
const sendProductEmail = async (req, res) => {
  const { email, customerName } = req.body;
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ 
      success: false,
      message: 'Valid email address is required' 
    });
  }
  
  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Please provide a valid email address' 
    });
  }
  
  try {
    console.log(`📧 API: Sending product catalog to: ${email}`);
    const result = await sendProductCatalogEmail(email, customerName);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          email: email,
          productCount: result.productCount,
          categories: result.categories,
          sent_by: 'NOREN AI Assistant'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (err) {
    console.error('Send product email error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Sorry, there was an error sending the email. Please try again later.' 
    });
  }
};

module.exports = { chat, getSuggestions, sendProductEmail };

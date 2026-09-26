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

// Helper: Fetch specific product by ID or title
async function fetchSpecificProduct(query) {
  try {
    console.log(`🔍 Searching for specific product: ${query}`);
    
    // Try to extract product ID if present
    const productIdMatch = query.match(/\b(\d+)\b/);
    let result;
    
    if (productIdMatch) {
      // Search by ID first
      const productId = productIdMatch[1];
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
           AND p.id = $1
         LIMIT 1`,
        [productId]
      );
    }
    
    // If no ID match or no results, search by title/description
    if (!result || result.rows.length === 0) {
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
                OR LOWER(p.description) LIKE LOWER($1))
         ORDER BY 
           CASE 
             WHEN LOWER(p.title) LIKE LOWER($1) THEN 1
             ELSE 2
           END,
           p.views DESC, 
           p.created_at DESC
         LIMIT 3`,
        [searchQuery]
      );
    }
    
    // Format products for frontend
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
    console.error('Specific product fetch error:', err);
    return [];
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

// Helper: Generate product catalog email HTML with NOREN branding
function generateProductCatalogHTML(products, customerEmail, customerName, isSpecificProduct = false) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // NOREN Brand Colors
  const colors = {
    black: '#1a1a18',
    charcoal: '#2c2c29',
    graphite: '#3d3d39',
    beige: '#e8ddd0',
    sand: '#d4c4b0',
    stone: '#b8a898',
    cream: '#f5f0e8',
    gold: '#c9a96e',
    bronze: '#a8834a',
    champagne: '#e8d5a8',
    white: '#faf9f7',
    offWhite: '#f2ede6',
    lightGray: '#e6e0d8',
    midGray: '#9e9a94',
    darkGray: '#5a5750'
  };
  
  // Group products by category for catalog view
  const productsByCategory = {};
  if (!isSpecificProduct) {
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });
  }

  const productSections = isSpecificProduct ? 
    // Single product detailed view
    products.map(product => `
      <div style="margin-bottom: 40px; background: ${colors.white}; border: 1px solid ${colors.lightGray}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(26,26,24,0.08);">
        <div style="display: flex; flex-wrap: wrap; min-height: 400px;">
          <!-- Product Image -->
          <div style="flex: 1; min-width: 300px; background: ${colors.cream}; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <img src="${product.image}" alt="${product.title}" style="width: 100%; max-width: 350px; height: auto; max-height: 400px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">
          </div>
          
          <!-- Product Details -->
          <div style="flex: 1; min-width: 300px; padding: 40px;">
            <h2 style="color: ${colors.black}; font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; margin: 0 0 16px; letter-spacing: 0.5px;">${product.title}</h2>
            
            <div style="margin: 16px 0;">
              ${product.has_discount ? `
                <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px;">
                  <span style="color: ${colors.black}; font-size: 24px; font-weight: 700;">₹${product.final_price}</span>
                  <span style="color: ${colors.midGray}; font-size: 18px; text-decoration: line-through;">₹${product.price}</span>
                </div>
                <span style="color: ${colors.gold}; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; background: ${colors.champagne}; padding: 4px 8px; border-radius: 3px;">
                  ${Math.round(((product.price - product.final_price) / product.price) * 100)}% OFF
                </span>
              ` : `
                <span style="color: ${colors.black}; font-size: 24px; font-weight: 700;">₹${product.final_price}</span>
              `}
            </div>
            
            <div style="margin: 20px 0;">
              <p style="color: ${colors.darkGray}; font-size: 16px; line-height: 1.6; margin: 0;">
                ${product.description || 'Premium luxury fashion piece from NOREN. Crafted with attention to detail and designed for the modern lifestyle. Experience quiet luxury with bold identity.'}
              </p>
            </div>
            
            <div style="margin: 20px 0; padding: 16px; background: ${colors.cream}; border-radius: 6px;">
              <div style="display: flex; flex-wrap: wrap; gap: 20px; font-size: 14px; color: ${colors.darkGray};">
                ${product.category ? `<div><strong>Category:</strong> ${product.category}</div>` : ''}
                ${product.gender ? `<div><strong>For:</strong> ${product.gender}</div>` : ''}
                ${product.rating > 0 ? `
                  <div>
                    <strong>Rating:</strong> 
                    <span style="color: ${colors.gold};">⭐ ${product.rating.toFixed(1)}/5</span>
                    ${product.review_count > 0 ? `(${product.review_count} reviews)` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
            
            <a href="${product.url}" style="display: inline-block; background: ${colors.black}; color: ${colors.white}; padding: 16px 32px; text-decoration: none; border-radius: 4px; margin-top: 16px; font-weight: 600; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; transition: background 0.3s ease;">
              VIEW PRODUCT
            </a>
          </div>
        </div>
      </div>
    `).join('') :
    // Category-grouped catalog view
    Object.entries(productsByCategory).map(([category, categoryProducts]) => `
      <div style="margin-bottom: 50px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: ${colors.black}; font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; margin: 0 0 8px; letter-spacing: 1px;">${category}</h2>
          <div style="width: 48px; height: 1px; background: linear-gradient(90deg, transparent, ${colors.gold}, transparent); margin: 0 auto;"></div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
          ${categoryProducts.map(product => `
            <div style="border: 1px solid ${colors.lightGray}; border-radius: 8px; overflow: hidden; background: ${colors.white}; box-shadow: 0 2px 12px rgba(26,26,24,0.06); transition: transform 0.3s ease, box-shadow 0.3s ease;">
              <div style="position: relative; background: ${colors.cream};">
                <img src="${product.image}" alt="${product.title}" style="width: 100%; height: 240px; object-fit: cover;">
                ${product.has_discount ? `
                  <div style="position: absolute; top: 12px; right: 12px; background: ${colors.gold}; color: ${colors.white}; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 8px; border-radius: 3px;">
                    ${Math.round(((product.price - product.final_price) / product.price) * 100)}% OFF
                  </div>
                ` : ''}
              </div>
              
              <div style="padding: 20px;">
                <h3 style="color: ${colors.black}; font-size: 18px; font-weight: 600; margin: 0 0 8px; line-height: 1.3;">${product.title}</h3>
                <p style="color: ${colors.darkGray}; font-size: 14px; margin: 8px 0; line-height: 1.4;">
                  ${product.description ? product.description.substring(0, 100) + '...' : 'Premium fashion from NOREN'}
                </p>
                
                <div style="margin: 16px 0;">
                  ${product.has_discount ? `
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                      <span style="color: ${colors.black}; font-size: 20px; font-weight: 700;">₹${product.final_price}</span>
                      <span style="color: ${colors.midGray}; font-size: 14px; text-decoration: line-through;">₹${product.price}</span>
                    </div>
                  ` : `
                    <span style="color: ${colors.black}; font-size: 20px; font-weight: 700;">₹${product.final_price}</span>
                  `}
                </div>
                
                ${product.rating > 0 ? `
                  <div style="margin: 12px 0; color: ${colors.darkGray}; font-size: 13px;">
                    <span style="color: ${colors.gold};">⭐ ${product.rating.toFixed(1)}/5</span>
                    ${product.review_count > 0 ? ` (${product.review_count})` : ''}
                  </div>
                ` : ''}
                
                <a href="${product.url}" style="display: inline-block; background: ${colors.black}; color: ${colors.white}; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 12px; font-weight: 500; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; width: calc(100% - 48px); text-align: center;">
                  VIEW PRODUCT
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

  const emailTitle = isSpecificProduct ? 
    (products.length === 1 ? `${products[0].title} - Product Details` : 'Selected Products') :
    `Complete Product Catalog - ${products.length} Products Available!`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NOREN ${emailTitle}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: ${colors.offWhite};">
      <div style="max-width: 900px; margin: 0 auto; background: ${colors.white}; box-shadow: 0 8px 32px rgba(26,26,24,0.12);">
        
        <!-- Header -->
        <div style="background: ${colors.black}; color: ${colors.white}; padding: 40px; text-align: center; position: relative;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${colors.gold}, ${colors.champagne}, ${colors.gold});"></div>
          <h1 style="margin: 0; font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase;">NOREN</h1>
          <p style="margin: 12px 0 0; font-size: 14px; color: ${colors.stone}; letter-spacing: 0.15em; text-transform: uppercase;">Wear the Silence</p>
          <div style="margin: 20px auto 0; width: 48px; height: 1px; background: linear-gradient(90deg, transparent, ${colors.gold}, transparent);"></div>
          <p style="margin: 16px 0 0; font-size: 16px; opacity: 0.9;">${isSpecificProduct ? 'Product Details' : 'Product Catalog'}</p>
        </div>
        
        <!-- Greeting -->
        <div style="padding: 40px; background: ${colors.cream}; border-bottom: 1px solid ${colors.lightGray};">
          <h2 style="color: ${colors.black}; margin: 0 0 16px; font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600;">Hello ${customerName || 'Valued Customer'}! ✨</h2>
          <p style="color: ${colors.darkGray}; margin: 0; font-size: 16px; line-height: 1.6;">
            ${isSpecificProduct ? 
              'Thank you for your interest in this product! Here are the detailed information and photos you requested from our AI assistant.' :
              'Thank you for your interest in our collection! As requested by our AI assistant, here\'s our complete product catalog with detailed information, pricing, and photos.'
            }
          </p>
          <div style="background: ${colors.white}; padding: 20px; border-radius: 6px; margin-top: 20px; border: 1px solid ${colors.lightGray};">
            <p style="margin: 0; color: ${colors.darkGray}; font-size: 14px;">
              <strong style="color: ${colors.black};">📧 Email sent by:</strong> NOREN AI Assistant<br>
              <strong style="color: ${colors.black};">📅 Generated on:</strong> ${currentDate}<br>
              <strong style="color: ${colors.black};">📦 ${isSpecificProduct ? 'Product' : 'Total Products'}:</strong> ${products.length} ${products.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        
        <!-- Products -->
        <div style="padding: 40px;">
          ${productSections}
        </div>
        
        <!-- Footer -->
        <div style="background: ${colors.black}; color: ${colors.white}; padding: 40px; text-align: center;">
          <h3 style="margin: 0 0 16px; font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">Visit Our Store</h3>
          <p style="margin: 0 0 24px; color: ${colors.stone}; font-size: 16px;">Experience luxury fashion at NOREN</p>
          <a href="https://www.norenfastion.shop" style="display: inline-block; background: ${colors.gold}; color: ${colors.white}; padding: 16px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 8px 16px; transition: background 0.3s ease;">
            SHOP NOW
          </a>
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid ${colors.charcoal}; font-size: 14px; color: ${colors.stone};">
            <p style="margin: 0 0 8px;">📧 supportnoren1@gmail.com | 🌐 www.norenfastion.shop</p>
            <p style="margin: 0; font-size: 12px; opacity: 0.8;">This email was generated automatically by NOREN AI Assistant</p>
          </div>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

// Helper: Send product catalog or specific product email
async function sendProductCatalogEmail(customerEmail, customerName, isSpecificProduct = false, productQuery = '') {
  try {
    console.log(`📧 Preparing ${isSpecificProduct ? 'specific product' : 'catalog'} email for: ${customerEmail}`);
    
    let products = [];
    
    if (isSpecificProduct && productQuery) {
      // Fetch specific product(s)
      products = await fetchSpecificProduct(productQuery);
      if (products.length === 0) {
        console.log('❌ No specific products found');
        return {
          success: false,
          message: `Sorry, I couldn't find any products matching "${productQuery}". Please try with a different product name or browse our full catalog.`
        };
      }
    } else {
      // Fetch all products for catalog
      products = await fetchAllProductsForEmail();
      if (products.length === 0) {
        console.log('❌ No products found for catalog');
        return {
          success: false,
          message: "Sorry, no products are currently available in our catalog."
        };
      }
    }
    
    // Generate HTML email with appropriate template
    const emailHTML = generateProductCatalogHTML(products, customerEmail, customerName, isSpecificProduct);
    
    const emailSubject = isSpecificProduct ? 
      (products.length === 1 ? 
        `NOREN Product Details - ${products[0].title}` :
        `NOREN Selected Products - ${products.length} Items Found`
      ) :
      `NOREN Complete Product Catalog - ${products.length} Products Available!`;
    
    // Send email
    const emailSent = await sendMail(customerEmail, emailSubject, emailHTML);
    
    if (emailSent) {
      console.log(`✅ ${isSpecificProduct ? 'Specific product' : 'Catalog'} email sent successfully to: ${customerEmail}`);
      
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
            'transactional',
            'sent',
            JSON.stringify({
              product_count: products.length,
              is_specific_product: isSpecificProduct,
              product_query: productQuery || null,
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
        message: isSpecificProduct ? 
          (products.length === 1 ?
            `Perfect! I've sent detailed information about "${products[0].title}" to ${customerEmail}. The email includes high-quality photos, pricing, specifications, and a direct link to purchase. Please check your inbox (and spam folder just in case)!` :
            `Perfect! I've sent details about ${products.length} products matching "${productQuery}" to ${customerEmail}. The email includes detailed photos, pricing, and direct links. Please check your inbox (and spam folder just in case)!`
          ) :
          `Perfect! I've sent a complete product catalog with ${products.length} products to ${customerEmail}. The email includes detailed photos, pricing, and direct links to each product. Please check your inbox (and spam folder just in case)!`,
        productCount: products.length,
        categories: [...new Set(products.map(p => p.category))].filter(Boolean),
        isSpecificProduct,
        products: isSpecificProduct ? products.map(p => ({ id: p.id, title: p.title, price: p.final_price })) : undefined
      };
    } else {
      console.log(`❌ Failed to send email to: ${customerEmail}`);
      return {
        success: false,
        message: "Sorry, there was an issue sending the email. Please check your email address or try again later. You can also contact our support at supportnoren1@gmail.com"
      };
    }
    
  } catch (err) {
    console.error('Error in sendProductCatalogEmail:', err);
    return {
      success: false,
      message: "Sorry, there was a technical issue preparing your email. Please try again later or contact supportnoren1@gmail.com"
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
    
    // Detect email request - ENHANCED FEATURE
    const isEmailRequest = /send\s+.*email|email\s+.*products|email\s+.*catalog|email\s+.*details|products\s+.*email|catalog\s+.*email|send.*all.*products|email.*all.*items|mail.*products|email.*about|email.*me.*about/i.test(userMessage);
    
    // Detect specific product email request
    const isSpecificProductEmailRequest = /email\s+.*about\s+.*|send.*details.*about.*|email.*me.*about.*|email.*information.*about.*|mail.*about.*|send.*email.*about.*/i.test(userMessage);
    
    // ONLY show products if user is CLEARLY asking about products
    const isProductQuery = /\b(product|show|find|search|looking for|want|need|buy|purchase|price|available|stock|dress|shirt|top|saree|kurti|jeans|clothes|clothing|fashion|wear|ethnic|western|kurta|lehenga|suit|outfit|collection)\b/i.test(userMessage);
    
    // Detect NON-product queries (shipping, returns, policies, help, etc.)
    const isGeneralQuery = /\b(ship|delivery|return|exchange|refund|policy|payment|cod|cancel|help|support|contact|email|phone|timing|hours|location|address|store|about|who|what is|how to|guide|size chart|measure)\b/i.test(userMessage);
    
    let contextData = '';
    let specificData = null;
    
    // Check if message contains an order ID (format: SRC followed by alphanumeric)
    const orderIdMatch = userMessage.match(/SRC[A-Z0-9]+/i);
    
    // Handle email request - ENHANCED FEATURE
    if (isEmailRequest) {
      console.log('🔍 Email request detected:', userMessage);
      
      // Extract email from message or ask for it
      const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      
      if (emailMatch) {
        const customerEmail = emailMatch[0];
        const customerName = user_context.user_name || 'Valued Customer';
        
        // Check if this is a specific product request
        if (isSpecificProductEmailRequest) {
          // Extract product name/query from message
          let productQuery = '';
          
          // Try different patterns to extract product info
          const patterns = [
            /email.*about\s+(.*?)(?:\s+to\s+|$)/i,
            /send.*details.*about\s+(.*?)(?:\s+to\s+|$)/i,
            /email.*me.*about\s+(.*?)(?:\s+to\s+|$)/i,
            /mail.*about\s+(.*?)(?:\s+to\s+|$)/i,
            /email.*information.*about\s+(.*?)(?:\s+to\s+|$)/i,
            /send.*email.*about\s+(.*?)(?:\s+to\s+|$)/i
          ];
          
          for (const pattern of patterns) {
            const match = userMessage.match(pattern);
            if (match && match[1]) {
              productQuery = match[1].trim();
              break;
            }
          }
          
          // If no specific product found, try to extract from general context
          if (!productQuery) {
            // Remove email-related words and extract remaining product terms
            const cleanedMessage = userMessage
              .replace(/email|send|mail|about|to|me|details|information/gi, '')
              .replace(emailMatch[0], '')
              .trim();
            
            if (cleanedMessage.length > 0) {
              productQuery = cleanedMessage;
            }
          }
          
          if (productQuery) {
            console.log(`📧 Sending specific product email about: "${productQuery}" to: ${customerEmail}`);
            const emailResult = await sendProductCatalogEmail(customerEmail, customerName, true, productQuery);
            
            if (emailResult.success) {
              return res.json({
                response: emailResult.message,
                context: {
                  type: 'specific_product_email_sent',
                  data: {
                    email: customerEmail,
                    productCount: emailResult.productCount,
                    productQuery: productQuery,
                    products: emailResult.products,
                    isSpecificProduct: true,
                    sent_by: 'NOREN AI Assistant'
                  }
                },
                timestamp: new Date().toISOString(),
              });
            } else {
              return res.json({
                response: emailResult.message,
                context: { type: 'email_error', data: { error: true, productQuery } },
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
        
        // Default to catalog email if no specific product detected
        console.log(`📧 Sending product catalog to: ${customerEmail}`);
        const emailResult = await sendProductCatalogEmail(customerEmail, customerName, false);
        
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
        
        // Check if they mentioned a specific product but no email
        if (isSpecificProductEmailRequest) {
          return res.json({
            response: `I'd be happy to email you detailed information about that product! 📧\n\nPlease provide your email address and I'll send the details right away. For example: "Send details about [product name] to john@example.com"`,
            context: { 
              type: 'specific_product_email_request', 
              data: { 
                awaiting_email: true,
                message_context: userMessage
              } 
            },
            timestamp: new Date().toISOString(),
          });
        }
        
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

// Send product catalog or specific product via email - ENHANCED FEATURE
const sendProductEmail = async (req, res) => {
  const { email, customerName, productQuery, isSpecificProduct } = req.body;
  
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
    console.log(`📧 API: Sending ${isSpecificProduct ? 'specific product' : 'catalog'} email to: ${email}`);
    
    const result = await sendProductCatalogEmail(
      email, 
      customerName, 
      isSpecificProduct || false, 
      productQuery || ''
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          email: email,
          productCount: result.productCount,
          categories: result.categories,
          isSpecificProduct: result.isSpecificProduct,
          products: result.products,
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

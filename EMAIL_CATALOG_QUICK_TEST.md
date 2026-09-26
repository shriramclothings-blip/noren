# 🧪 Quick Test Guide - AI Email Catalog Feature

## 🚀 How to Test the New Feature

### Method 1: Test via Chatbot (Recommended)

1. **Open your frontend/website chatbot**
2. **Try these messages:**

```
Test 1: "Send me all product details on email"
Expected: AI asks for email address

Test 2: "Email catalog to test@example.com" 
Expected: AI sends catalog and confirms

Test 3: "Send all products to john@gmail.com"
Expected: Email sent with product catalog
```

### Method 2: Test via API Call

Use Postman or curl to test the direct API:

```bash
# Test the chatbot endpoint
curl -X POST http://localhost:5000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Email me all products",
    "user_context": {
      "user_name": "Test User",
      "email": "test@example.com"
    }
  }'

# Test the direct email API
curl -X POST http://localhost:5000/api/chatbot/send-product-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "customerName": "Test Customer"
  }'
```

### Method 3: Run Test Script

```bash
cd backend
node test-email-feature.js
```

## ✅ What to Expect

### Chatbot Responses

**When asking for email catalog:**
```
"I'd be happy to email you our complete product catalog with 50+ items 
including detailed photos, pricing, and descriptions! 📧

Please provide your email address and I'll send it right away."
```

**After providing email:**
```
"Perfect! I've sent a complete product catalog with 47 products to 
john@example.com. The email includes detailed photos, pricing, and 
direct links to each product. Please check your inbox!"
```

### Email Content

You'll receive a beautiful HTML email with:
- 🎨 Professional NOREN branding
- 📦 All products with photos and pricing
- 🏷️ Products grouped by category  
- 🔗 Direct "View Product" buttons
- 🤖 "Email sent by NOREN AI Assistant" attribution

## 🔧 Troubleshooting

### Email Not Sending?

1. **Check environment variables:**
   ```env
   RESEND_API_KEY=your_key_here
   EMAIL_FROM="NOREN <noreply@norenfastion.shop>"
   ```

2. **Check server logs:**
   ```bash
   # Look for these messages:
   ✅ [Mail sent] id: xxx | To: email@example.com
   ❌ [Mail error] RESEND_API_KEY not configured
   ```

3. **Database connection:**
   ```bash
   # Server should show:
   ✅ DB1 pool created
   ✅ DB2 pool created  
   ✅ DB3 pool created
   ```

### AI Not Detecting Email Requests?

The AI detects these patterns:
- "send email", "email products", "email catalog"
- "send all products", "email me", "catalog email"
- "email details", "mail products"

Try exact phrases like:
- "Send me all product details on email"
- "Email catalog to test@example.com"

## 📱 Frontend Integration

To integrate with your frontend chatbot:

1. **Update chatbot UI** to show email context:
```javascript
if (response.context?.type === 'email_sent') {
  showSuccessMessage('Email sent successfully!');
  // Show email confirmation UI
}
```

2. **Add email input field** when AI asks for email:
```javascript
if (response.context?.type === 'email_request') {
  showEmailInputForm();
  // Let user enter email easily
}
```

## 🎯 Test Scenarios

### Scenario 1: Complete Flow
1. User: "I want all products on email"
2. AI: Asks for email address
3. User: "Send to john@example.com"  
4. AI: Sends email and confirms
5. Customer receives beautiful product catalog

### Scenario 2: Direct Email
1. User: "Email catalog to jane@gmail.com"
2. AI: Immediately sends catalog
3. Customer receives email

### Scenario 3: Invalid Email
1. User: "Send to invalid-email"
2. AI: Asks for valid email format
3. User provides correct email
4. AI sends catalog

## ✨ Success Indicators

- ✅ AI detects email requests correctly
- ✅ Email addresses are validated  
- ✅ HTML email is generated with products
- ✅ Email is sent via Resend successfully
- ✅ Email is logged in database
- ✅ Customer receives professional catalog
- ✅ All product links work correctly

Your AI chatbot email feature is now ready! 🎉
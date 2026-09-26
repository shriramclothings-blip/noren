# NOREN AI Chatbot - Implementation Guide

## Overview
An AI-powered customer support chatbot has been successfully added to your main website. The chatbot helps customers with:
- 🛍️ **Product Queries** - Find products, check availability, pricing, and get recommendations
- 📦 **Order Tracking** - Track orders using Order ID
- ❓ **General Help** - Answer questions about shipping, returns, policies, and more

## Features

### 1. Smart Product Search
- Searches products by name, category, brand, or description
- Shows up to 10 relevant products with details
- Displays price, stock status, ratings, and reviews

### 2. Order Tracking
- Customers can track orders by providing their Order ID (format: SRC followed by alphanumeric)
- Shows order status, payment status, delivery address, and items
- Displays tracking information if available

### 3. AI-Powered Responses
- Uses Google Gemini AI for natural, contextual responses
- Maintains conversation history (last 6 messages) for context
- Provides quick suggestions for common questions

### 4. Beautiful UI
- Floating chat button (bottom-right corner)
- Gradient purple-pink theme matching your brand
- Typing indicators and timestamps
- Mobile-responsive design
- Quick action buttons for common questions

## How It Works

### Backend
1. **Controller** (`backend/controllers/chatbotController.js`)
   - `chat` - Main endpoint that processes customer messages
   - `getSuggestions` - Returns popular products and quick questions
   - Integrates with Gemini AI for intelligent responses
   - Queries database for product and order information

2. **Routes** (`backend/routes/chatbot.js`)
   - `POST /api/chatbot/chat` - Send messages (public endpoint)
   - `GET /api/chatbot/suggestions` - Get quick suggestions (public endpoint)

3. **Server Integration** (`backend/server.js`)
   - Routes registered at `/api/chatbot`

### Frontend
1. **Component** (`frontend/src/components/ChatBot.jsx`)
   - Floating chat widget
   - Message history with user and AI responses
   - Real-time typing indicators
   - Quick suggestion chips

2. **App Integration** (`frontend/src/App.jsx`)
   - Chatbot available on all public pages
   - Not shown on admin or influencer portals

## Usage Examples

### For Customers:

**Product Queries:**
- "Show me women's kurtis"
- "Do you have jeans available?"
- "What's the price of [product name]?"
- "Looking for ethnic wear"

**Order Tracking:**
- "Track my order SRCXYZ123"
- "What's the status of order #SRCABC456?"
- "Where is my order?"

**General Help:**
- "What's your return policy?"
- "How long does delivery take?"
- "Do you have any discounts?"

## Configuration

### Environment Variables Required
Make sure these are set in `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### API Endpoints
- Base URL: `https://noren-iqk3.onrender.com/api`
- Chat: `POST /api/chatbot/chat`
- Suggestions: `GET /api/chatbot/suggestions`

## Database Tables Used
- `src_products` - Product information
- `src_orders` - Order details
- `src_order_items` - Order line items
- `src_categories` - Product categories

## Files Modified/Created

### Backend Files:
1. ✅ `backend/controllers/chatbotController.js` - NEW
2. ✅ `backend/routes/chatbot.js` - NEW
3. ✅ `backend/server.js` - MODIFIED (added chatbot routes)

### Frontend Files:
1. ✅ `frontend/src/components/ChatBot.jsx` - NEW
2. ✅ `frontend/src/App.jsx` - MODIFIED (added ChatBot component)

## Testing the Chatbot

1. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Scenarios:**
   - Click the purple chat button in bottom-right corner
   - Ask about products: "Show me t-shirts"
   - Track an order: "Track order SRC[your-order-id]"
   - Ask general questions: "What's your shipping policy?"

## Customization

### Change Chatbot Appearance
Edit `frontend/src/components/ChatBot.jsx`:
- **Colors**: Look for gradient classes like `from-purple-600 to-pink-600`
- **Position**: Modify the `fixed bottom-6 right-6` classes
- **Size**: Adjust `w-[400px] h-[600px]` dimensions

### Modify AI Behavior
Edit `backend/controllers/chatbotController.js`:
- **Temperature**: Adjust AI creativity (line ~270, currently 0.8)
- **Max Tokens**: Change response length (line ~270, currently 800)
- **System Prompt**: Modify the chatbot personality and instructions

### Add More Quick Suggestions
Edit the `quick_questions` array in `getSuggestions` function:
```javascript
quick_questions: [
  "Your custom question here",
  "Another question",
  // Add more...
]
```

## Maintenance

### Monitor Chatbot Usage
The chatbot activity is logged in the backend console. Monitor for:
- Common queries (to improve suggestions)
- Failed order lookups (invalid Order IDs)
- API errors (Gemini rate limits)

### Update Product Context
The chatbot automatically queries the latest products from the database. No manual updates needed.

### AI API Costs
- Uses Google Gemini 3.5 Flash (free tier available)
- Monitor usage at: https://aistudio.google.com/
- Set up billing alerts if needed

## Troubleshooting

### Chatbot Not Appearing
1. Check if frontend is running: `npm run dev` in frontend folder
2. Look for console errors in browser DevTools
3. Verify ChatBot is imported in App.jsx

### "Gemini API key not configured" Error
1. Check `backend/.env` has valid `GEMINI_API_KEY`
2. Get new key from: https://aistudio.google.com/app/apikey
3. Restart backend server after updating .env

### Order Tracking Not Working
1. Verify order ID format: Must start with "SRC"
2. Check if order exists in database
3. Ensure `src_orders` table has the order

### Products Not Showing
1. Verify products are marked as `status='approved'`
2. Check `deleted_at` is NULL
3. Ensure products have stock quantity

## Future Enhancements

Consider adding:
- 📊 Analytics dashboard for chatbot metrics
- 🌐 Multi-language support
- 🎯 Personalized recommendations based on user history
- 📧 Email notifications for unresolved queries
- 🤖 Integration with WhatsApp/Telegram
- 💳 Direct checkout from chat
- 📸 Image recognition for product search

## Support

For issues or questions:
- Email: support@norenfastion.shop
- Check backend logs for detailed error messages
- Review browser console for frontend errors

---

**Created:** January 2025
**Status:** ✅ Active and Ready
**Version:** 1.0.0

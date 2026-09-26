import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, ShoppingBag, Package, ExternalLink } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// AI Avatar Component with animations
const AIAvatar = ({ isTyping }) => (
  <div className="relative w-10 h-10 flex-shrink-0">
    <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#a8834a] shadow-lg transition-all duration-300 ${isTyping ? 'scale-110 shadow-xl' : 'scale-100'}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className={`w-5 h-5 text-white ${isTyping ? 'animate-pulse' : ''}`} />
      </div>
    </div>
    {isTyping && (
      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#a8834a] opacity-20 animate-ping" />
    )}
  </div>
);

// Product Card Component
const ProductCard = ({ product }) => {
  const finalPrice = product.final_price || product.discount_price || product.price;
  const hasDiscount = product.has_discount || (product.discount_price && product.discount_price < product.price);
  
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-lg border border-[#e6e0d8] overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-[#c9a96e]"
    >
      <div className="aspect-[3/4] overflow-hidden bg-[#f5f0e8]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400';
          }}
        />
      </div>
      <div className="p-3">
        <h4 className="font-serif text-sm font-medium text-[#1a1a18] mb-1 line-clamp-2 group-hover:text-[#c9a96e] transition-colors">
          {product.name}
        </h4>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#c9a96e] font-semibold text-base">₹{finalPrice}</span>
          {hasDiscount && (
            <span className="text-[#9e9a94] text-xs line-through">₹{product.price}</span>
          )}
        </div>
        {product.rating > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#5a5750]">
            <span>⭐ {product.rating}</span>
            <span className="text-[#9e9a94]">({product.review_count || 0})</span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1 text-xs text-[#c9a96e] font-medium">
          <span>View Details</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </a>
  );
};

// Order Item Card Component
const OrderItemCard = ({ item }) => (
  <div className="flex gap-3 p-3 bg-[#f5f0e8] rounded-lg border border-[#e6e0d8]">
    <img
      src={item.image}
      alt={item.title}
      className="w-16 h-16 object-cover rounded"
      onError={(e) => {
        e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100';
      }}
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-[#1a1a18] truncate">{item.title}</p>
      <p className="text-xs text-[#5a5750]">{item.size} • {item.color}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-[#9e9a94]">Qty: {item.quantity}</span>
        <span className="text-sm font-semibold text-[#c9a96e]">₹{item.line_total}</span>
      </div>
    </div>
  </div>
);

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your NOREN style assistant. I can help you discover beautiful fashion, track your orders, and answer any questions. What brings you here today?',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Load suggestions on first open
      if (suggestions.length === 0) {
        loadSuggestions();
      }
    }
  }, [isOpen]);

  // Load quick suggestions
  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/chatbot/suggestions`);
      setSuggestions(response.data.quick_questions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  // Handle sending message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Prepare conversation history (last 6 messages for context)
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call chatbot API
      const response = await axios.post(`${API_URL}/chatbot/chat`, {
        message: userMessage,
        conversation_history: conversationHistory,
      });

      // Add AI response to chat
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: response.data.timestamp,
        context: response.data.context,
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support@norenfastion.shop for assistance. 😔',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button - NOREN Luxury Style */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-50 group"
          aria-label="Chat with NOREN Assistant"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(201, 169, 110, 0.25))' }}
        >
          {/* Pulse ring */}
          <div className="absolute -inset-2 bg-gradient-to-br from-[#c9a96e] to-[#a8834a] rounded-full opacity-20 animate-pulse" />
          
          {/* Main button */}
          <div className="relative w-16 h-16 bg-gradient-to-br from-[#1a1a18] to-[#2c2c29] rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl border border-[#c9a96e]/20">
            {/* Gold accent ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[#c9a96e] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '2px' }} />
            
            {/* Icon */}
            <div className="relative">
              <Sparkles className="w-7 h-7 text-[#c9a96e] group-hover:rotate-12 transition-transform duration-300" />
            </div>
            
            {/* Online indicator */}
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-[#1a1a18] animate-pulse" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-[#1a1a18] text-[#faf9f7] text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none" style={{ letterSpacing: '0.02em' }}>
            Need help? Chat with us
            <div className="absolute top-full right-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#1a1a18]" />
          </div>
        </button>
      )}

      {/* Chat Window - Luxury NOREN Design */}
      {isOpen && (
        <div 
          className="fixed bottom-8 right-8 z-50 w-[420px] max-w-[calc(100vw-4rem)] h-[650px] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom, #faf9f7, #f5f0e8)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(26, 26, 24, 0.2), 0 0 1px rgba(26, 26, 24, 0.1)',
            border: '1px solid rgba(201, 169, 110, 0.2)',
          }}
        >
          {/* Header - Elegant */}
          <div 
            className="relative px-6 py-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, #1a1a18 0%, #2c2c29 100%)',
              borderBottom: '1px solid rgba(201, 169, 110, 0.3)',
            }}
          >
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent opacity-50" />
            
            <div className="flex items-center gap-3">
              <AIAvatar isTyping={isLoading} />
              <div>
                <h3 className="font-serif text-[#faf9f7] font-semibold text-lg tracking-wide">NOREN</h3>
                <p className="text-[#c9a96e] text-xs" style={{ letterSpacing: '0.05em' }}>Style Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200"
              aria-label="Close chat"
            >
              <X className="w-5 h-5 text-[#faf9f7]" />
            </button>
          </div>

          {/* Messages - Elegant scrollable area */}
          <div 
            className="flex-1 overflow-y-auto px-5 py-6 space-y-5"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#c9a96e #f5f0e8',
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && <AIAvatar isTyping={false} />}
                
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#1a1a18] to-[#2c2c29] text-[#faf9f7] rounded-br-sm'
                        : msg.isError
                        ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
                        : 'bg-white text-[#1a1a18] rounded-bl-sm border border-[#e6e0d8]'
                    }`}
                    style={{
                      boxShadow: msg.role === 'user' 
                        ? '0 4px 12px rgba(26, 26, 24, 0.15)' 
                        : '0 2px 8px rgba(26, 26, 24, 0.06)',
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ letterSpacing: '0.01em' }}>
                      {msg.content}
                    </p>
                    
                    {/* Product Cards */}
                    {msg.context && msg.context.type === 'products' && msg.context.data.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-[#5a5750] font-medium">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Found {msg.context.data.length} products for you</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {msg.context.data.slice(0, 4).map((product, pidx) => (
                            <ProductCard key={pidx} product={product} />
                          ))}
                        </div>
                        {msg.context.data.length > 4 && (
                          <p className="text-xs text-[#9e9a94] italic">+ {msg.context.data.length - 4} more products available</p>
                        )}
                      </div>
                    )}
                    
                    {/* Order Details */}
                    {msg.context && msg.context.type === 'order' && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[#5a5750]">
                          <Package className="w-3.5 h-3.5" />
                          <span>Order #{msg.context.data.order_id}</span>
                        </div>
                        <div className="p-3 bg-[#f5f0e8] rounded-lg space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#5a5750]">Status:</span>
                            <span className="font-semibold text-[#1a1a18] capitalize">{msg.context.data.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5a5750]">Total:</span>
                            <span className="font-semibold text-[#c9a96e]">₹{msg.context.data.total}</span>
                          </div>
                          {msg.context.data.tracking_id && (
                            <div className="flex justify-between">
                              <span className="text-[#5a5750]">Tracking:</span>
                              <span className="font-mono text-[#1a1a18]">{msg.context.data.tracking_id}</span>
                            </div>
                          )}
                        </div>
                        {msg.context.data.items && msg.context.data.items.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-[#5a5750]">Items in this order:</p>
                            {msg.context.data.items.map((item, iidx) => (
                              <OrderItemCard key={iidx} item={item} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-[10px] mt-2 opacity-50" style={{ letterSpacing: '0.02em' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator with animation */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <AIAvatar isTyping={true} />
                <div 
                  className="bg-white rounded-2xl rounded-bl-sm px-5 py-3 border border-[#e6e0d8]"
                  style={{ boxShadow: '0 2px 8px rgba(26, 26, 24, 0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#c9a96e] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#c9a96e] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#c9a96e] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-[#5a5750]" style={{ letterSpacing: '0.05em' }}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions - Elegant chips */}
          {messages.length <= 2 && suggestions.length > 0 && !isLoading && (
            <div className="px-5 py-3 border-t border-[#e6e0d8]" style={{ background: '#faf9f7' }}>
              <p className="text-xs text-[#5a5750] mb-2.5 font-medium" style={{ letterSpacing: '0.05em' }}>Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs px-4 py-2 rounded-full border border-[#c9a96e] text-[#1a1a18] hover:bg-[#c9a96e] hover:text-white transition-all duration-200"
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input - Elegant design */}
          <div 
            className="px-5 py-4 border-t border-[#e6e0d8]"
            style={{ background: 'linear-gradient(to top, #faf9f7, #f5f0e8)' }}
          >
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-white border-2 border-[#e6e0d8] rounded-xl focus:outline-none focus:border-[#c9a96e] disabled:bg-[#f5f0e8] disabled:cursor-not-allowed text-sm text-[#1a1a18] placeholder-[#9e9a94] transition-all duration-200"
                  style={{ 
                    letterSpacing: '0.01em',
                    boxShadow: '0 2px 8px rgba(26, 26, 24, 0.04)',
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1a1a18] to-[#2c2c29] text-[#c9a96e] hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                aria-label="Send message"
                style={{ boxShadow: '0 4px 12px rgba(26, 26, 24, 0.15)' }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-[#9e9a94] mt-3 text-center" style={{ letterSpacing: '0.05em' }}>
              AI Assistant • For urgent support: <span className="text-[#c9a96e]">support@norenfastion.shop</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

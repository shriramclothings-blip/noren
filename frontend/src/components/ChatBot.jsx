import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ShoppingBag, Package, ExternalLink, Star } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// AI Avatar Component - Elegant animated assistant
const AIAvatar = ({ isTyping }) => (
  <div className="relative w-11 h-11 flex-shrink-0">
    <div 
      className="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-500"
      style={{
        background: 'linear-gradient(135deg, #c9a96e 0%, #a8834a 100%)',
        boxShadow: isTyping 
          ? '0 0 0 0 rgba(201, 169, 110, 0.4), 0 6px 20px rgba(201, 169, 110, 0.3)' 
          : '0 2px 12px rgba(201, 169, 110, 0.2)',
        transform: isTyping ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <Sparkles 
        className="text-white"
        style={{
          width: '22px',
          height: '22px',
          filter: isTyping ? 'brightness(1.2)' : 'brightness(1)',
          transition: 'all 0.3s',
        }}
      />
    </div>
    {isTyping && (
      <>
        <div 
          className="absolute -inset-1.5 rounded-full opacity-20"
          style={{
            background: 'linear-gradient(135deg, #c9a96e, #a8834a)',
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          }}
        />
        <div 
          className="absolute -inset-0.5 rounded-full opacity-30"
          style={{
            background: 'linear-gradient(135deg, #c9a96e, #a8834a)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      </>
    )}
  </div>
);

// Enhanced Product Card Component - More elegant
const ProductCard = ({ product }) => {
  const finalPrice = product.final_price || product.discount_price || product.price;
  const hasDiscount = product.has_discount || (product.discount_price && product.discount_price < product.price);
  
  return (
    <a
      href={product.url || `https://www.norenfastion.shop/product/${product.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e6e0d8',
        boxShadow: '0 2px 10px rgba(26, 26, 24, 0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(201, 169, 110, 0.15)';
        e.currentTarget.style.borderColor = '#c9a96e';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(26, 26, 24, 0.04)';
        e.currentTarget.style.borderColor = '#e6e0d8';
      }}
    >
      {/* Image Container */}
      <div style={{ 
        position: 'relative', 
        paddingBottom: '130%', 
        backgroundColor: '#f5f0e8', 
        overflow: 'hidden' 
      }}>
        {hasDiscount && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#c9a96e',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            zIndex: 2,
            letterSpacing: '0.02em',
          }}>
            SALE
          </div>
        )}
        <img
          src={product.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400'}
          alt={product.name || product.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400';
          }}
        />
      </div>
      
      {/* Product Details */}
      <div style={{ padding: '14px' }}>
        {product.category && (
          <p style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#9e9a94',
            marginBottom: '6px',
            fontWeight: 500,
          }}>
            {product.category}
          </p>
        )}
        
        <h4 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '15px',
          fontWeight: 600,
          color: '#1a1a18',
          marginBottom: '10px',
          lineHeight: '1.3',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '40px',
        }}>
          {product.name || product.title}
        </h4>
        
        {/* Price */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '10px' 
        }}>
          <span style={{ 
            color: '#c9a96e', 
            fontWeight: 700, 
            fontSize: '18px',
            fontFamily: "'Inter', sans-serif",
          }}>
            ₹{finalPrice}
          </span>
          {hasDiscount && (
            <span style={{ 
              color: '#9e9a94', 
              fontSize: '14px', 
              textDecoration: 'line-through',
              fontWeight: 400,
            }}>
              ₹{product.price}
            </span>
          )}
        </div>
        
        {/* Rating */}
        {product.rating > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginBottom: '12px',
            fontSize: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    fill: i < Math.round(product.rating) ? '#c9a96e' : 'none',
                    stroke: i < Math.round(product.rating) ? '#c9a96e' : '#d4c4b0',
                    strokeWidth: 1.5,
                  }}
                />
              ))}
            </div>
            <span style={{ color: '#5a5750', fontWeight: 500 }}>
              {product.rating.toFixed(1)}
            </span>
            {product.review_count > 0 && (
              <span style={{ color: '#9e9a94' }}>
                ({product.review_count})
              </span>
            )}
          </div>
        )}
        
        {/* View Button */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          color: '#c9a96e',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}>
          <span>View Product</span>
          <ExternalLink style={{ width: '13px', height: '13px' }} />
        </div>
      </div>
    </a>
  );
};

// Order Item Card Component
const OrderItemCard = ({ item }) => (
  <div style={{
    display: 'flex',
    gap: '14px',
    padding: '14px',
    backgroundColor: '#faf9f7',
    borderRadius: '10px',
    border: '1px solid #e6e0d8',
  }}>
    <img
      src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100'}
      alt={item.title}
      style={{
        width: '70px',
        height: '70px',
        objectFit: 'cover',
        borderRadius: '8px',
        flexShrink: 0,
        border: '1px solid #e6e0d8',
      }}
      onError={(e) => {
        e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100';
      }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ 
        fontSize: '14px', 
        fontWeight: 600, 
        color: '#1a1a18', 
        marginBottom: '6px',
        fontFamily: "'Cormorant Garamond', serif",
        lineHeight: '1.3',
      }}>
        {item.title}
      </p>
      <p style={{ 
        fontSize: '12px', 
        color: '#5a5750', 
        marginBottom: '8px',
        display: 'flex',
        gap: '8px',
      }}>
        <span style={{ 
          padding: '2px 8px', 
          backgroundColor: '#f5f0e8', 
          borderRadius: '4px',
          fontSize: '11px',
        }}>
          {item.size}
        </span>
        <span style={{ 
          padding: '2px 8px', 
          backgroundColor: '#f5f0e8', 
          borderRadius: '4px',
          fontSize: '11px',
        }}>
          {item.color}
        </span>
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#9e9a94', fontWeight: 500 }}>
          Qty: {item.quantity}
        </span>
        <span style={{ 
          fontSize: '16px', 
          fontWeight: 700, 
          color: '#c9a96e',
          fontFamily: "'Inter', sans-serif",
        }}>
          ₹{item.line_total}
        </span>
      </div>
    </div>
  </div>
);

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! 👋 Welcome to NOREN. I\'m your personal style assistant. I can help you discover beautiful fashion pieces, track your orders, and answer any questions. How may I assist you today?',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'Show me new arrivals',
    'Track my order',
    'What\'s your return policy?',
  ]);
  const [popularProducts, setPopularProducts] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      loadSuggestions();
    }
  }, [isOpen]);

  // Load quick suggestions with better error handling
  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/chatbot/suggestions`, {
        timeout: 5000, // 5 second timeout
      });
      if (response.data?.quick_questions && Array.isArray(response.data.quick_questions)) {
        setSuggestions(response.data.quick_questions);
      }
      // Load popular products for display
      if (response.data?.popular_products && Array.isArray(response.data.popular_products)) {
        setPopularProducts(response.data.popular_products);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      // Keep default suggestions on error
      setSuggestions([
        'Show me new arrivals',
        'Track my order',
        'What\'s your return policy?',
      ]);
      setPopularProducts([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await axios.post(`${API_URL}/chatbot/chat`, {
        message: userMessage,
        conversation_history: conversationHistory,
      }, {
        timeout: 30000, // 30 second timeout
      });

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
        content: error.response?.status === 500 
          ? 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment or contact our support team at support@norenfastion.shop.' 
          : 'Sorry, I encountered an error processing your request. Please try again or contact support@norenfastion.shop for assistance.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Elegant Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Chat with NOREN Assistant"
          className="chatbot-button"
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '32px',
            zIndex: 50,
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a1a18 0%, #2c2c29 100%)',
            border: '2px solid rgba(201, 169, 110, 0.4)',
            boxShadow: '0 8px 28px rgba(201, 169, 110, 0.25), 0 0 0 0 rgba(201, 169, 110, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'float 3s ease-in-out infinite',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 36px rgba(201, 169, 110, 0.35), 0 0 0 8px rgba(201, 169, 110, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(201, 169, 110, 0.25), 0 0 0 0 rgba(201, 169, 110, 0.4)';
          }}
        >
          <Sparkles style={{ width: '30px', height: '30px', color: '#c9a96e' }} />
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: '3px solid #1a1a18',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        </button>
      )}

      {/* Elegant Chat Window */}
      {isOpen && (
        <div 
          className="chatbot-window"
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '32px',
            zIndex: 50,
            width: '440px',
            maxWidth: 'calc(100vw - 4rem)',
            height: '680px',
            maxHeight: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(to bottom, #faf9f7 0%, #f5f0e8 100%)',
            borderRadius: '20px',
            boxShadow: '0 24px 70px rgba(26, 26, 24, 0.18), 0 0 1px rgba(26, 26, 24, 0.1)',
            border: '1px solid rgba(201, 169, 110, 0.25)',
            overflow: 'hidden',
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Elegant Header */}
          <div 
            style={{
              padding: '22px 26px',
              background: 'linear-gradient(135deg, #1a1a18 0%, #2c2c29 100%)',
              borderBottom: '1px solid rgba(201, 169, 110, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative gradient line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #c9a96e, transparent)',
              opacity: 0.6,
            }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <AIAvatar isTyping={isLoading} />
                <div>
                  <h3 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: '#faf9f7',
                    fontSize: '20px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    margin: 0,
                    lineHeight: 1,
                  }}>
                    NOREN
                  </h3>
                  <p style={{
                    color: '#c9a96e',
                    fontSize: '12px',
                    letterSpacing: '0.06em',
                    margin: '4px 0 0 0',
                    fontWeight: 500,
                  }}>
                    Style Assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                style={{
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'rotate(0deg)';
                }}
              >
                <X style={{ width: '22px', height: '22px', color: '#faf9f7' }} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '26px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '14px',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeIn 0.4s ease-out',
                }}
              >
                {msg.role === 'assistant' && <AIAvatar isTyping={false} />}
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                }}>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: '18px',
                      ...(msg.role === 'user' ? {
                        background: 'linear-gradient(135deg, #1a1a18 0%, #2c2c29 100%)',
                        color: '#faf9f7',
                        borderBottomRightRadius: '6px',
                        boxShadow: '0 4px 14px rgba(26, 26, 24, 0.12)',
                      } : msg.isError ? {
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderBottomLeftRadius: '6px',
                      } : {
                        backgroundColor: '#fff',
                        color: '#1a1a18',
                        border: '1px solid #e6e0d8',
                        borderBottomLeftRadius: '6px',
                        boxShadow: '0 2px 10px rgba(26, 26, 24, 0.04)',
                      }),
                    }}
                  >
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      letterSpacing: '0.01em',
                    }}>
                      {msg.content}
                    </p>
                    
                    {/* Product Cards - Always visible when context exists */}
                    {msg.context && msg.context.type === 'products' && msg.context.data && msg.context.data.length > 0 && (
                      <div style={{ marginTop: '18px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: '14px',
                          paddingBottom: '12px',
                          borderBottom: '1px solid #e6e0d8',
                        }}>
                          <ShoppingBag style={{ width: '16px', height: '16px', color: '#c9a96e' }} />
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#5a5750',
                            letterSpacing: '0.02em',
                          }}>
                            {msg.context.data.length} Product{msg.context.data.length !== 1 ? 's' : ''} Found
                          </span>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(2, 1fr)', 
                          gap: '14px' 
                        }}>
                          {msg.context.data.slice(0, 4).map((product, pidx) => (
                            <ProductCard key={pidx} product={product} />
                          ))}
                        </div>
                        {msg.context.data.length > 4 && (
                          <p style={{ 
                            marginTop: '12px', 
                            fontSize: '12px', 
                            color: '#9e9a94', 
                            fontStyle: 'italic',
                            textAlign: 'center',
                          }}>
                            + {msg.context.data.length - 4} more product{msg.context.data.length - 4 !== 1 ? 's' : ''} available
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Order Details */}
                    {msg.context && msg.context.type === 'order' && msg.context.data && (
                      <div style={{ marginTop: '18px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: '14px',
                          paddingBottom: '12px',
                          borderBottom: '1px solid #e6e0d8',
                        }}>
                          <Package style={{ width: '16px', height: '16px', color: '#c9a96e' }} />
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#5a5750',
                            fontFamily: "'Inter', monospace",
                          }}>
                            Order #{msg.context.data.order_id}
                          </span>
                        </div>
                        <div style={{ 
                          padding: '14px', 
                          backgroundColor: '#faf9f7', 
                          borderRadius: '10px', 
                          marginBottom: '14px',
                          border: '1px solid #e6e0d8',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', color: '#5a5750', fontWeight: 500 }}>Status</span>
                            <span style={{ 
                              fontSize: '13px', 
                              fontWeight: 600, 
                              color: '#1a1a18', 
                              textTransform: 'capitalize',
                              padding: '4px 12px',
                              backgroundColor: '#f5f0e8',
                              borderRadius: '12px',
                            }}>
                              {msg.context.data.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', color: '#5a5750', fontWeight: 500 }}>Total</span>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#c9a96e' }}>₹{msg.context.data.total}</span>
                          </div>
                          {msg.context.data.tracking_id && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px', color: '#5a5750', fontWeight: 500 }}>Tracking</span>
                              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#1a1a18', fontWeight: 600 }}>
                                {msg.context.data.tracking_id}
                              </span>
                            </div>
                          )}
                        </div>
                        {msg.context.data.items && msg.context.data.items.length > 0 && (
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#5a5750', marginBottom: '12px' }}>
                              Order Items
                            </p>
                            {msg.context.data.items.map((item, iidx) => (
                              <div key={iidx} style={{ marginBottom: iidx < msg.context.data.items.length - 1 ? '10px' : 0 }}>
                                <OrderItemCard item={item} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p style={{
                      fontSize: '10px',
                      marginTop: '10px',
                      opacity: 0.5,
                      letterSpacing: '0.02em',
                    }}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Elegant Typing Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-start' }}>
                <AIAvatar isTyping={true} />
                <div 
                  style={{
                    backgroundColor: '#fff',
                    padding: '14px 20px',
                    borderRadius: '18px',
                    borderBottomLeftRadius: '6px',
                    border: '1px solid #e6e0d8',
                    boxShadow: '0 2px 10px rgba(26, 26, 24, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[0, 150, 300].map((delay, i) => (
                        <span
                          key={i}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#c9a96e',
                            animation: `bounce 1.4s ease-in-out ${delay}ms infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#5a5750', 
                      letterSpacing: '0.06em',
                      fontWeight: 500,
                    }}>
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Popular Products with Photos */}
          {messages.length <= 2 && popularProducts.length > 0 && !isLoading && (
            <div style={{ 
              padding: '16px 22px', 
              borderTop: '1px solid #e6e0d8',
              backgroundColor: '#faf9f7',
            }}>
              <p style={{ 
                fontSize: '12px', 
                color: '#5a5750', 
                marginBottom: '12px', 
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <ShoppingBag style={{ width: '14px', height: '14px', color: '#c9a96e' }} />
                Popular Products
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '12px',
                marginBottom: '18px',
              }}>
                {popularProducts.slice(0, 4).map((product, idx) => (
                  <ProductCard key={idx} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          {messages.length <= 2 && suggestions.length > 0 && !isLoading && (
            <div style={{ 
              padding: '16px 22px', 
              borderTop: '1px solid #e6e0d8',
              backgroundColor: '#faf9f7',
            }}>
              <p style={{ 
                fontSize: '12px', 
                color: '#5a5750', 
                marginBottom: '12px', 
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                Quick Questions
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {suggestions.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      fontSize: '13px',
                      padding: '10px 16px',
                      borderRadius: '20px',
                      border: '1px solid #c9a96e',
                      backgroundColor: 'transparent',
                      color: '#1a1a18',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      letterSpacing: '0.01em',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#c9a96e';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 169, 110, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#1a1a18';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Elegant Input Area */}
          <div 
            style={{
              padding: '20px 22px',
              borderTop: '1px solid #e6e0d8',
              background: 'linear-gradient(to top, #faf9f7, #f5f0e8)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    backgroundColor: '#fff',
                    border: '2px solid #e6e0d8',
                    borderRadius: '14px',
                    fontSize: '14px',
                    color: '#1a1a18',
                    outline: 'none',
                    letterSpacing: '0.01em',
                    boxShadow: '0 2px 8px rgba(26, 26, 24, 0.03)',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#c9a96e';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(201, 169, 110, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e6e0d8';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 26, 24, 0.03)';
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                style={{
                  width: '52px',
                  height: '52px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '14px',
                  background: input.trim() && !isLoading 
                    ? 'linear-gradient(135deg, #1a1a18, #2c2c29)' 
                    : '#e6e0d8',
                  border: 'none',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  boxShadow: input.trim() && !isLoading 
                    ? '0 4px 14px rgba(26, 26, 24, 0.15)' 
                    : 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !isLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(26, 26, 24, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = input.trim() && !isLoading 
                    ? '0 4px 14px rgba(26, 26, 24, 0.15)' 
                    : 'none';
                }}
              >
                <Send style={{ 
                  width: '20px', 
                  height: '20px', 
                  color: input.trim() && !isLoading ? '#c9a96e' : '#9e9a94' 
                }} />
              </button>
            </div>
            <p style={{
              fontSize: '10px',
              color: '#9e9a94',
              marginTop: '14px',
              textAlign: 'center',
              letterSpacing: '0.05em',
            }}>
              AI-Powered Assistant • Need help? <span style={{ color: '#c9a96e', fontWeight: 600 }}>support@norenfastion.shop</span>
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Mobile responsive positioning */
        @media (max-width: 768px) {
          .chatbot-button {
            bottom: 88px !important;
            right: 20px !important;
            width: 60px !important;
            height: 60px !important;
          }
          
          .chatbot-window {
            bottom: 88px !important;
            right: 20px !important;
            width: calc(100vw - 2.5rem) !important;
            max-height: calc(100vh - 130px) !important;
          }
        }
        
        @media (max-width: 480px) {
          .chatbot-button {
            bottom: 84px !important;
            right: 16px !important;
            width: 56px !important;
            height: 56px !important;
          }
          
          .chatbot-window {
            bottom: 84px !important;
            right: 16px !important;
            width: calc(100vw - 2rem) !important;
            height: 600px !important;
            max-height: calc(100vh - 120px) !important;
          }
        }
      `}</style>
    </>
  );
}

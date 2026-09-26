import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ShoppingBag, Package, ExternalLink } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// AI Avatar Component with animations
const AIAvatar = ({ isTyping }) => (
  <div className="relative w-10 h-10 flex-shrink-0">
    <div 
      className="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, #c9a96e, #a8834a)',
        boxShadow: isTyping ? '0 4px 20px rgba(201, 169, 110, 0.4)' : '0 2px 10px rgba(201, 169, 110, 0.2)',
        transform: isTyping ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      <Sparkles 
        className="text-white transition-all duration-300"
        style={{
          width: '20px',
          height: '20px',
          opacity: isTyping ? 0.8 : 1,
        }}
      />
    </div>
    {isTyping && (
      <div 
        className="absolute -inset-1 rounded-full opacity-20"
        style={{
          background: 'linear-gradient(135deg, #c9a96e, #a8834a)',
          animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        }}
      />
    )}
  </div>
);

// Product Card Component
const ProductCard = ({ product }) => {
  const finalPrice = product.final_price || product.discount_price || product.price;
  const hasDiscount = product.has_discount || (product.discount_price && product.discount_price < product.price);
  
  return (
    <a
      href={product.url || `https://www.norenfastion.shop/product/${product.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e6e0d8',
        boxShadow: '0 2px 8px rgba(26, 26, 24, 0.06)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(26, 26, 24, 0.12)';
        e.currentTarget.style.borderColor = '#c9a96e';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 26, 24, 0.06)';
        e.currentTarget.style.borderColor = '#e6e0d8';
      }}
    >
      <div style={{ position: 'relative', paddingBottom: '133%', backgroundColor: '#f5f0e8', overflow: 'hidden' }}>
        <img
          src={product.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400'}
          alt={product.name}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400';
          }}
        />
      </div>
      <div style={{ padding: '12px' }}>
        <h4 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '14px',
          fontWeight: 500,
          color: '#1a1a18',
          marginBottom: '8px',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {product.name}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: '#c9a96e', fontWeight: 600, fontSize: '16px' }}>₹{finalPrice}</span>
          {hasDiscount && (
            <span style={{ color: '#9e9a94', fontSize: '12px', textDecoration: 'line-through' }}>₹{product.price}</span>
          )}
        </div>
        {product.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#5a5750' }}>
            <span>⭐ {product.rating}</span>
            <span style={{ color: '#9e9a94' }}>({product.review_count || 0})</span>
          </div>
        )}
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#c9a96e', fontWeight: 500 }}>
          <span>View Details</span>
          <ExternalLink style={{ width: '12px', height: '12px' }} />
        </div>
      </div>
    </a>
  );
};

// Order Item Card Component
const OrderItemCard = ({ item }) => (
  <div style={{
    display: 'flex',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f5f0e8',
    borderRadius: '8px',
    border: '1px solid #e6e0d8',
  }}>
    <img
      src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100'}
      alt={item.title}
      style={{
        width: '64px',
        height: '64px',
        objectFit: 'cover',
        borderRadius: '4px',
        flexShrink: 0,
      }}
      onError={(e) => {
        e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100';
      }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a18', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.title}
      </p>
      <p style={{ fontSize: '12px', color: '#5a5750', marginBottom: '8px' }}>
        {item.size} • {item.color}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#9e9a94' }}>Qty: {item.quantity}</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#c9a96e' }}>₹{item.line_total}</span>
      </div>
    </div>
  </div>
);

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! 👋 I\'m your NOREN style assistant. I can help you discover beautiful fashion, track your orders, and answer any questions. What brings you here today?',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
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
      if (suggestions.length === 0) {
        loadSuggestions();
      }
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/chatbot/suggestions`);
      setSuggestions(response.data.quick_questions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions(['Show me products', 'Track my order', 'What is your return policy?']);
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
        content: 'Sorry, I encountered an error. Please try again or contact support@norenfastion.shop for assistance.',
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
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Chat with NOREN Assistant"
          className="chatbot-button"
          style={{
            position: 'fixed',
            bottom: '92px', // Higher than WhatsApp (24px + 52px + 16px margin)
            right: '32px',
            zIndex: 50,
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a1a18 0%, #2c2c29 100%)',
            border: '2px solid rgba(201, 169, 110, 0.3)',
            boxShadow: '0 8px 24px rgba(201, 169, 110, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(201, 169, 110, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 169, 110, 0.3)';
          }}
        >
          <Sparkles style={{ width: '28px', height: '28px', color: '#c9a96e' }} />
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: '2px solid #1a1a18',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="chatbot-window"
          style={{
            position: 'fixed',
            bottom: '92px', // Same as button to align properly
            right: '32px',
            zIndex: 50,
            width: '420px',
            maxWidth: 'calc(100vw - 4rem)',
            height: '650px',
            maxHeight: 'calc(100vh - 140px)', // Account for bottom spacing
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(to bottom, #faf9f7, #f5f0e8)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(26, 26, 24, 0.2)',
            border: '1px solid rgba(201, 169, 110, 0.2)',
            overflow: 'hidden',
          }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #1a1a18 0%, #2c2c29 100%)',
            borderBottom: '1px solid rgba(201, 169, 110, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AIAvatar isTyping={isLoading} />
              <div>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: '#faf9f7',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  margin: 0,
                }}>NOREN</h3>
                <p style={{
                  color: '#c9a96e',
                  fontSize: '12px',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}>Style Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X style={{ width: '20px', height: '20px', color: '#faf9f7' }} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'assistant' && <AIAvatar isTyping={false} />}
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    ...(msg.role === 'user' ? {
                      background: 'linear-gradient(135deg, #1a1a18, #2c2c29)',
                      color: '#faf9f7',
                      borderBottomRightRadius: '4px',
                      boxShadow: '0 4px 12px rgba(26, 26, 24, 0.15)',
                    } : msg.isError ? {
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fecaca',
                      borderBottomLeftRadius: '4px',
                    } : {
                      backgroundColor: '#fff',
                      color: '#1a1a18',
                      border: '1px solid #e6e0d8',
                      borderBottomLeftRadius: '4px',
                      boxShadow: '0 2px 8px rgba(26, 26, 24, 0.06)',
                    }),
                  }}>
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </p>
                    
                    {/* Product Cards */}
                    {msg.context && msg.context.type === 'products' && msg.context.data.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#5a5750', fontWeight: 500 }}>
                          <ShoppingBag style={{ width: '14px', height: '14px' }} />
                          <span>Found {msg.context.data.length} products for you</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                          {msg.context.data.slice(0, 4).map((product, pidx) => (
                            <ProductCard key={pidx} product={product} />
                          ))}
                        </div>
                        {msg.context.data.length > 4 && (
                          <p style={{ marginTop: '8px', fontSize: '12px', color: '#9e9a94', fontStyle: 'italic' }}>
                            + {msg.context.data.length - 4} more products available
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Order Details */}
                    {msg.context && msg.context.type === 'order' && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#5a5750', fontWeight: 500 }}>
                          <Package style={{ width: '14px', height: '14px' }} />
                          <span>Order #{msg.context.data.order_id}</span>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: '#f5f0e8', borderRadius: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#5a5750' }}>Status:</span>
                            <span style={{ fontWeight: 600, color: '#1a1a18', textTransform: 'capitalize' }}>{msg.context.data.status}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#5a5750' }}>Total:</span>
                            <span style={{ fontWeight: 600, color: '#c9a96e' }}>₹{msg.context.data.total}</span>
                          </div>
                          {msg.context.data.tracking_id && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#5a5750' }}>Tracking:</span>
                              <span style={{ fontFamily: 'monospace', color: '#1a1a18' }}>{msg.context.data.tracking_id}</span>
                            </div>
                          )}
                        </div>
                        {msg.context.data.items && msg.context.data.items.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: '#5a5750', marginBottom: '8px' }}>Items in this order:</p>
                            {msg.context.data.items.map((item, iidx) => (
                              <div key={iidx} style={{ marginTop: iidx > 0 ? '8px' : 0 }}>
                                <OrderItemCard item={item} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p style={{
                      fontSize: '10px',
                      marginTop: '8px',
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
            
            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                <AIAvatar isTyping={true} />
                <div style={{
                  backgroundColor: '#fff',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  borderBottomLeftRadius: '4px',
                  border: '1px solid #e6e0d8',
                  boxShadow: '0 2px 8px rgba(26, 26, 24, 0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                    <span style={{ fontSize: '12px', color: '#5a5750', letterSpacing: '0.05em' }}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length <= 2 && suggestions.length > 0 && !isLoading && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e6e0d8', backgroundColor: '#faf9f7' }}>
              <p style={{ fontSize: '12px', color: '#5a5750', marginBottom: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                Quick questions:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {suggestions.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      fontSize: '12px',
                      padding: '8px 16px',
                      borderRadius: '999px',
                      border: '1px solid #c9a96e',
                      backgroundColor: 'transparent',
                      color: '#1a1a18',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      letterSpacing: '0.02em',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#c9a96e';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#1a1a18';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e6e0d8',
            background: 'linear-gradient(to top, #faf9f7, #f5f0e8)',
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#fff',
                    border: '2px solid #e6e0d8',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#1a1a18',
                    outline: 'none',
                    letterSpacing: '0.01em',
                    boxShadow: '0 2px 8px rgba(26, 26, 24, 0.04)',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#c9a96e'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e6e0d8'}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                style={{
                  width: '48px',
                  height: '48px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1a1a18, #2c2c29)',
                  border: 'none',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  boxShadow: '0 4px 12px rgba(26, 26, 24, 0.15)',
                  opacity: input.trim() && !isLoading ? 1 : 0.4,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !isLoading) {
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(26, 26, 24, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 26, 24, 0.15)';
                }}
              >
                <Send style={{ width: '20px', height: '20px', color: '#c9a96e' }} />
              </button>
            </div>
            <p style={{
              fontSize: '10px',
              color: '#9e9a94',
              marginTop: '12px',
              textAlign: 'center',
              letterSpacing: '0.05em',
            }}>
              AI Assistant • For urgent support: <span style={{ color: '#c9a96e' }}>support@norenfastion.shop</span>
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
        
        /* Mobile responsive positioning to avoid WhatsApp overlap */
        @media (max-width: 768px) {
          .chatbot-button {
            bottom: 92px !important;
            right: 20px !important;
            width: 56px !important;
            height: 56px !important;
          }
          
          .chatbot-window {
            bottom: 92px !important;
            right: 20px !important;
            width: calc(100vw - 2.5rem) !important;
            max-height: calc(100vh - 140px) !important;
          }
        }
        
        @media (max-width: 480px) {
          .chatbot-button {
            bottom: 88px !important;
            right: 16px !important;
          }
          
          .chatbot-window {
            bottom: 88px !important;
            right: 16px !important;
            width: calc(100vw - 2rem) !important;
          }
        }
      `}</style>
    </>
  );
}

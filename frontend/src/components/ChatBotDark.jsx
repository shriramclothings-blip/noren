// NOREN AI Chatbot - Dark Theme with Personalization
import { useState, useRef, useEffect } from 'react';
import { X, Send, Package, Edit3, RefreshCw, TrendingUp, MapPin, ChevronRight, Paperclip } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Dark Product Card for Carousel
const DarkProductCard = ({ product }) => {
  const finalPrice = product.final_price || product.discount_price || product.price;
  
  return (
    <a
      href={product.url || `https://www.norenfastion.shop/product/${product.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="dark-product-card"
      style={{
        display: 'inline-block',
        width: '140px',
        flexShrink: 0,
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        overflow: 'hidden',
        marginRight: '12px',
        border: '1px solid #2a2a2a',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = '#c9a96e';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#2a2a2a';
      }}
    >
      {/* Product Image */}
      <div style={{ position: 'relative', paddingBottom: '125%', backgroundColor: '#0a0a0a' }}>
        <img
          src={product.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300'}
          alt={product.name || product.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300';
          }}
        />
        <ChevronRight 
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            width: '16px',
            height: '16px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            padding: '2px',
          }}
        />
      </div>
      
      {/* Product Info */}
      <div style={{ padding: '10px' }}>
        <p style={{
          fontSize: '11px',
          color: '#999',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {product.category || 'Fashion'}
        </p>
        <p style={{
          fontSize: '13px',
          color: '#fff',
          fontWeight: 500,
          marginBottom: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {(product.name || product.title || '').substring(0, 20)}
        </p>
        <p style={{
          fontSize: '14px',
          color: '#c9a96e',
          fontWeight: 700,
        }}>
          ₹{finalPrice}
        </p>
      </div>
    </a>
  );
};

// Quick Action Button
const QuickActionButton = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #2a2a2a',
      borderRadius: '20px',
      color: '#fff',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#2a2a2a';
      e.currentTarget.style.borderColor = '#c9a96e';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#1a1a1a';
      e.currentTarget.style.borderColor = '#2a2a2a';
    }}
  >
    <Icon style={{ width: '16px', height: '16px', color: '#c9a96e' }} />
    <span>{label}</span>
  </button>
);

export default function ChatBotDark() {
  const { user } = useAuth(); // Get logged-in user data
  const [isOpen, setIsOpen] = useState(false);
  
  // Get user's name with fallbacks
  const userName = user?.full_name || user?.name || user?.first_name || 'there';
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${userName} 👋\nWelcome to NOREN!\n\nI'm your personal shopping assistant. You can ask me about our products, track your orders, shipping, or anything else — I'm here to help!`,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  // Load popular products
  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/chatbot/suggestions`, {
        timeout: 5000,
      });
      if (response.data?.popular_products && Array.isArray(response.data.popular_products)) {
        setPopularProducts(response.data.popular_products);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
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
        user_context: {
          user_id: user?.id,
          user_name: userName,
          email: user?.email,
        }
      }, {
        timeout: 30000,
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
        content: 'Sorry, I encountered an error. Please try again or contact support@norenfastion.shop.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (message) => {
    setInput(message);
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
      {/* Floating Button - Dark Theme */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Chat with NOREN"
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '32px',
            zIndex: 50,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c9a96e 0%, #a8834a 100%)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(201, 169, 110, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            border: '2px solid #c9a96e',
          }} />
        </button>
      )}

      {/* Chat Window - Dark Theme */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '32px',
            zIndex: 50,
            width: '400px',
            maxWidth: 'calc(100vw - 4rem)',
            height: '680px',
            maxHeight: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0a0a0a',
            borderRadius: '20px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
            border: '1px solid #1a1a1a',
            overflow: 'hidden',
          }}
        >
          {/* Header - Dark */}
          <div style={{
            padding: '20px',
            backgroundColor: '#000',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
                color: '#c9a96e',
                border: '1px solid #2a2a2a',
              }}>
                N
              </div>
              <div>
                <h3 style={{
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                  margin: 0,
                  letterSpacing: '0.5px',
                }}>
                  NOREN
                </h3>
                <p style={{
                  color: '#666',
                  fontSize: '11px',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }} />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X style={{ width: '18px', height: '18px', color: '#666' }} />
            </button>
          </div>

          {/* Messages Area - Dark */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
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
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#c9a96e',
                    flexShrink: 0,
                  }}>
                    N
                  </div>
                )}
                
                <div style={{
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor: msg.role === 'user' ? '#c9a96e' : '#1a1a1a',
                    color: msg.role === 'user' ? '#000' : '#fff',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                  
                  <p style={{
                    fontSize: '10px',
                    color: '#666',
                    marginTop: '6px',
                    marginLeft: msg.role === 'user' ? 'auto' : '0',
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-IN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  
                  {/* Product Carousel - Dark */}
                  {msg.context && msg.context.type === 'products' && msg.context.data && msg.context.data.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{
                        fontSize: '11px',
                        color: '#999',
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Here are some popular categories you might like:
                      </p>
                      <div style={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: '0',
                        paddingBottom: '8px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#2a2a2a #0a0a0a',
                      }}>
                        {msg.context.data.slice(0, 6).map((product, pidx) => (
                          <DarkProductCard key={pidx} product={product} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: '#c9a96e',
                }}>
                  N
                </div>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: '#1a1a1a',
                  display: 'flex',
                  gap: '4px',
                }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#666',
                        animation: `bounce 1.4s ease-in-out ${i * 150}ms infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions - Dark */}
          {messages.length <= 2 && !isLoading && (
            <div style={{
              padding: '0 20px 16px 20px',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}>
              <QuickActionButton 
                icon={Package} 
                label="Track My Order" 
                onClick={() => handleQuickAction('Track my order')}
              />
              <QuickActionButton 
                icon={Edit3} 
                label="Size Guide" 
                onClick={() => handleQuickAction('Size guide')}
              />
              <QuickActionButton 
                icon={MapPin} 
                label="Shipping Info" 
                onClick={() => handleQuickAction('Shipping information')}
              />
            </div>
          )}
          
          {messages.length <= 2 && !isLoading && (
            <div style={{
              padding: '0 20px 16px 20px',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}>
              <QuickActionButton 
                icon={RefreshCw} 
                label="Returns & Exchange" 
                onClick={() => handleQuickAction('Returns and exchange policy')}
              />
              <QuickActionButton 
                icon={TrendingUp} 
                label="Popular Products" 
                onClick={() => handleQuickAction('Show me popular products')}
              />
            </div>
          )}

          {/* Input Area - Dark */}
          <div style={{
            padding: '16px 20px 20px 20px',
            borderTop: '1px solid #1a1a1a',
            backgroundColor: '#000',
          }}>
            <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              backgroundColor: '#1a1a1a',
              borderRadius: '24px',
              padding: '4px 4px 4px 16px',
              border: '1px solid #2a2a2a',
            }}>
              <Paperclip style={{ width: '18px', height: '18px', color: '#666', cursor: 'pointer' }} />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '14px',
                  padding: '8px 0',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: input.trim() && !isLoading ? '#c9a96e' : '#2a2a2a',
                  border: 'none',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Send style={{ 
                  width: '16px', 
                  height: '16px', 
                  color: input.trim() && !isLoading ? '#000' : '#666'
                }} />
              </button>
            </div>
            <p style={{
              fontSize: '10px',
              color: '#666',
              textAlign: 'center',
              marginTop: '12px',
            }}>
              NOREN • Style for Every You
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
        
        @media (max-width: 768px) {
          /* Mobile responsive */
        }
      `}</style>
    </>
  );
}

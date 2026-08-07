import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { user, fetchWishlist } = useAuth();
  const [wishlisted, setWishlisted]   = useState(false);
  const [toggling, setToggling]       = useState(false);
  const [hovered, setHovered]         = useState(false);

  const discounted = product.discount_percent > 0
    ? Math.round(product.price * (1 - product.discount_percent / 100))
    : null;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return toast.error('Please sign in to save to wishlist');
    if (toggling) return;
    setToggling(true);
    try {
      const res = await api.post('/users/wishlist', { product_id: product.id });
      setWishlisted(res.data.wishlisted);
      fetchWishlist();
      toast.success(res.data.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        background: '#faf9f7',
        textDecoration: 'none',
        position: 'relative',
        transition: 'transform 0.3s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}>

      {/* Image container */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#f5f0e8', aspectRatio: '3/4' }}>
        <img
          src={product.primary_image || product.image_url || '/og-image.jpg'}
          alt={product.title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
          }}
          loading="lazy"
        />

        {/* Soft overlay on hover */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(26,26,24,0.12)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }} />

        {/* Badges */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {product.discount_percent > 0 && (
            <span className="badge-sale">{product.discount_percent}%</span>
          )}
          {product.is_trending && (
            <span className="badge-new">Trending</span>
          )}
        </div>

        {/* Wishlist */}
        <button onClick={handleWishlist} title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          data-wishlist-btn
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 36, height: 36,
            background: wishlisted ? '#1a1a18' : 'rgba(250,249,247,0.9)',
            border: 'none', cursor: toggling ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
            opacity: hovered || wishlisted ? 1 : 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1a1a18'}
          onMouseLeave={e => { if (!wishlisted) e.currentTarget.style.background = 'rgba(250,249,247,0.9)'; }}>
          <Heart size={14}
            color={wishlisted ? '#c9a96e' : '#1a1a18'}
            fill={wishlisted ? '#c9a96e' : 'none'}
            style={{ transition: 'all 0.2s' }}
          />
        </button>

        {/* Quick shop bar */}
        <div
          data-quickshop-bar
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#1a1a18',
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transform: hovered ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
          <ShoppingBag size={13} color="#c9a96e" />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#faf9f7' }}>Select Size</span>
        </div>
      </div>

      {/* Product info */}
      <div style={{ padding: '14px 4px 16px' }}>
        {product.category_name && (
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9e9a94', marginBottom: 5 }}>
            {product.category_name}
          </p>
        )}
        <h3 style={{ fontSize: 14, fontWeight: 400, color: '#1a1a18', lineHeight: 1.4, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', letterSpacing: '0.01em' }}>
          {product.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a18', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            {(discounted ?? product.price).toLocaleString('en-IN')}
          </span>
          {discounted && (
            <span style={{ fontSize: 12, color: '#b8a898', textDecoration: 'line-through' }}>
              {product.price.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

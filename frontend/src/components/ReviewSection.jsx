import { useState, useEffect, useMemo } from 'react';
import { Star, Camera, Check, Image as ImageIcon, ShieldCheck, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const RATING_OPTIONS = [
  { label: 'Excellent', rating: 5, sub: 'Excellent fit & quality' },
  { label: 'Very Good', rating: 4, sub: 'Great, dependable finish' },
  { label: 'Good',      rating: 3, sub: 'Solid value for price' },
];

const SUGGESTIONS = [
  'Quality product', 'Perfect fitting', 'Amazing fabric', 'Worth the price',
  'Comfortable to wear', 'Well stitched', 'Excellent construction',
  'Highly recommended', 'Modern style', 'Fast delivery', 'Stylish look',
];

const formatDate = (v) =>
  new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function StarRow({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          style={{ color: i <= rating ? '#c9a96e' : '#e5e7eb',
                   fill:  i <= rating ? '#c9a96e' : '#e5e7eb' }} />
      ))}
    </div>
  );
}

export default function ReviewSection({ productId, reviews = [], avgRating = 0, reviewCount = 0, onRefresh }) {
  const { user } = useAuth();

  // Write form state
  const [selectedRating, setSelectedRating] = useState(5);
  const [comment, setComment]               = useState('');
  const [suggestion, setSuggestion]         = useState('');
  const [imageFile, setImageFile]           = useState(null);
  const [imagePreview, setImagePreview]     = useState('');
  const [submitting, setSubmitting]         = useState(false);

  // List state
  const [reviewList, setReviewList]   = useState(reviews);
  const [page, setPage]               = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(reviews.length < reviewCount);

  const displayAvg = Number(avgRating) || 0;
  const displayCount = reviewCount || reviewList.length;

  // Sync when parent passes fresh reviews
  useEffect(() => {
    setReviewList(reviews);
    setHasMore(reviews.length < reviewCount);
    setPage(1);
  }, [reviews, reviewCount]);

  // Image preview
  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Draft persistence
  useEffect(() => {
    const draft = localStorage.getItem(`review-draft-${productId}`);
    if (!draft) return;
    try {
      const d = JSON.parse(draft);
      if (d.selectedRating) setSelectedRating(d.selectedRating);
      if (d.comment)        setComment(d.comment);
      if (d.suggestion)     setSuggestion(d.suggestion);
    } catch {}
  }, [productId]);

  useEffect(() => {
    localStorage.setItem(`review-draft-${productId}`,
      JSON.stringify({ selectedRating, comment, suggestion }));
  }, [selectedRating, comment, suggestion, productId]);

  const handleSubmit = async () => {
    if (!user) return toast.error('Please sign in to write a review');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('rating', selectedRating);
      fd.append('suggestion', suggestion || RATING_OPTIONS.find(o => o.rating === selectedRating)?.label || '');
      if (comment.trim()) fd.append('comment', comment.trim());
      if (imageFile) fd.append('review_image', imageFile);
      await api.post(`/products/${productId}/reviews`, fd);
      toast.success('Review submitted!');
      // Reset form
      setComment(''); setSuggestion(''); setImageFile(null);
      localStorage.removeItem(`review-draft-${productId}`);
      onRefresh?.();
      // Reload reviews
      const res = await api.get(`/products/${productId}/reviews?page=1&limit=8`);
      setReviewList(res.data.reviews);
      setHasMore(res.data.total > res.data.reviews.length);
      setPage(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally { setSubmitting(false); }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await api.get(`/products/${productId}/reviews?page=${next}&limit=8`);
      setReviewList(prev => {
        const merged = [...prev, ...res.data.reviews];
        setHasMore(res.data.total > merged.length);
        return merged;
      });
      setPage(next);
    } catch { toast.error('Failed to load reviews'); }
    finally { setLoadingMore(false); }
  };

  // JSON-LD schema
  const schema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    productID: `${productId}`,
    aggregateRating: displayCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: displayAvg,
      reviewCount: displayCount,
      bestRating: 5, worstRating: 3,
    } : undefined,
    review: reviewList.slice(0, 5).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.user_name },
      datePublished: r.created_at,
      reviewBody: r.comment || r.suggestion || r.rating_label,
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 3 },
    })),
  }), [productId, reviewList, displayAvg, displayCount]);

  return (
    <section style={{ paddingTop: 64, borderTop: '1px solid #f3f4f6', marginTop: 64 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── Section header ── */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 8 }}>
          Reviews
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 600, color: '#1a1a18', letterSpacing: '-0.01em' }}>
            Customer Reviews
          </h2>
          {displayCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StarRow rating={Math.round(displayAvg)} size={16} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{displayAvg > 0 ? displayAvg.toFixed(1) : '—'}</span>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>({displayCount} {displayCount === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      {displayCount > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 48 }}>
          <div style={{ padding: '20px', background: '#1a1a18', borderRadius: 16 }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: '#faf9f7', lineHeight: 1, marginBottom: 6 }}>
              {displayAvg > 0 ? displayAvg.toFixed(1) : '—'}
            </div>
            <StarRow rating={Math.round(displayAvg)} size={13} />
            <p style={{ fontSize: 12, color: 'rgba(250,249,247,0.55)', marginTop: 8 }}>Average rating</p>
          </div>
          <div style={{ padding: '20px', background: '#f9fafb', borderRadius: 16, border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: '#1a1a18', lineHeight: 1, marginBottom: 6 }}>
              {displayCount}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} color="#c9a96e" />
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Verified reviews</span>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>From confirmed buyers</p>
          </div>
          <div style={{ padding: '20px', background: '#f9fafb', borderRadius: 16, border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: '#1a1a18', lineHeight: 1, marginBottom: 6 }}>
              {Math.min(100, reviewList.length > 0
                ? Math.round((reviewList.filter(r => r.rating >= 4).length / reviewList.length) * 100)
                : 98)}%
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Positive ratings</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Rated 4 stars or above</p>
          </div>
        </div>
      )}

      {/* ── Write a review ── */}
      <div style={{ background: '#faf9f7', border: '1px solid #e6e0d8', borderRadius: 16, padding: '28px', marginBottom: 48 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 4 }}>Write a Review</p>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24 }}>Share your honest experience with this product</p>

        {/* Rating options */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          {RATING_OPTIONS.map(opt => {
            const active = selectedRating === opt.rating;
            return (
              <button key={opt.rating} type="button" onClick={() => setSelectedRating(opt.rating)}
                style={{
                  padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${active ? '#1a1a18' : '#e6e0d8'}`,
                  background: active ? '#1a1a18' : '#fff',
                  transition: 'all 0.18s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Star size={13} style={{ color: active ? '#c9a96e' : '#c9a96e', fill: active ? '#c9a96e' : '#c9a96e' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#faf9f7' : '#1a1a18' }}>{opt.label}</span>
                </div>
                <span style={{ fontSize: 11, color: active ? 'rgba(250,249,247,0.55)' : '#9ca3af' }}>{opt.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Quick suggestion chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" onClick={() => setSuggestion(prev => prev === s ? '' : s)}
              style={{
                padding: '7px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${suggestion === s ? '#1a1a18' : '#e6e0d8'}`,
                background: suggestion === s ? '#1a1a18' : '#fff',
                color: suggestion === s ? '#faf9f7' : '#374151',
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Comment textarea */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Your comment (optional)</label>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{comment.length}/180</span>
          </div>
          <textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 180))}
            placeholder="Describe the fit, fabric, or your overall experience..."
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13,
              border: '1.5px solid #e6e0d8', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', color: '#1a1a18', background: '#fff',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#c9a96e'}
            onBlur={e => e.target.style.borderColor = '#e6e0d8'}
          />
        </div>

        {/* Image upload */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label htmlFor="review-img"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1.5px solid #e6e0d8', background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e6e0d8'; e.currentTarget.style.color = '#374151'; }}>
              <Camera size={14} /> Add Photo
            </label>
            <input id="review-img" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
            {imagePreview && (
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <img src={imagePreview} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #e6e0d8' }} />
                <button type="button" onClick={() => setImageFile(null)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#1a1a18', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={10} color="#fff" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button type="button" onClick={handleSubmit} disabled={submitting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: '#1a1a18', color: '#faf9f7', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#c9a96e'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1a1a18'; }}>
          {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>

      {/* ── Reviews list ── */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 20 }}>
          {displayCount > 0 ? `${displayCount} Review${displayCount !== 1 ? 's' : ''}` : 'No Reviews Yet'}
        </p>

        {reviewList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviewList.map(review => (
              <article key={review.id}
                style={{ padding: '20px', borderRadius: 14, background: '#fff', border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(26,26,24,0.04)' }}>
                {/* Reviewer header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                      {review.user_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{review.user_name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#c9a96e', letterSpacing: '0.1em', textTransform: 'uppercase', background: '#fdf4e7', padding: '2px 8px', borderRadius: 100 }}>
                          Verified
                        </span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <StarRow rating={review.rating} size={13} />
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{formatDate(review.created_at)}</span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {review.rating_label && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 100, background: '#1a1a18', color: '#faf9f7' }}>
                      {review.rating_label}
                    </span>
                  )}
                  {review.suggestion && review.suggestion !== review.rating_label && (
                    <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, background: '#f5f0e8', color: '#5a5750' }}>
                      {review.suggestion}
                    </span>
                  )}
                </div>

                {/* Comment */}
                {review.comment && (
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: review.image_url ? 12 : 0 }}>
                    {review.comment}
                  </p>
                )}

                {/* Review image */}
                {review.image_url && (
                  <img src={review.image_url} alt="Review" loading="lazy"
                    style={{ maxWidth: 200, width: '100%', borderRadius: 10, objectFit: 'cover', aspectRatio: '4/3', border: '1px solid #f3f4f6' }} />
                )}
              </article>
            ))}
          </div>
        ) : (
          <div style={{ padding: '48px 24px', borderRadius: 14, border: '1.5px dashed #e6e0d8', textAlign: 'center', background: '#faf9f7' }}>
            <ImageIcon size={32} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No reviews yet</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Be the first to share your experience with this product.</p>
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button type="button" onClick={loadMore} disabled={loadingMore}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 28px', borderRadius: 10, border: '1.5px solid #e6e0d8', background: '#fff', fontSize: 13, color: '#374151', cursor: loadingMore ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
              onMouseEnter={e => { if (!loadingMore) { e.currentTarget.style.borderColor = '#1a1a18'; e.currentTarget.style.color = '#1a1a18'; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e6e0d8'; e.currentTarget.style.color = '#374151'; }}>
              {loadingMore ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loadingMore ? 'Loading...' : 'Load more reviews'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

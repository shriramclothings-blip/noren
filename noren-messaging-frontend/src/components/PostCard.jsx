import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Repeat, MoreHorizontal } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function PostCard({ post }) {
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(parseInt(post.likes_count) || 0);
  const [isSaved, setIsSaved] = useState(post.is_saved);
  const [isReposted, setIsReposted] = useState(post.is_reposted);
  const [repostsCount, setRepostsCount] = useState(parseInt(post.reposts_count) || 0);
  const [commentsCount, setCommentsCount] = useState(parseInt(post.comments_count) || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState([]);
  const [newComment, setNewComment] = useState('');

  const handleLikeToggle = async () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    try {
      await api.post('/social/likes/toggle', { target_type: 'post', target_id: post.id });
    } catch {
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    }
  };

  const handleBookmarkToggle = async () => {
    setIsSaved(!isSaved);
    try {
      await api.post('/social/bookmarks/toggle', { target_type: 'post', target_id: post.id });
      toast.success(!isSaved ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch {
      setIsSaved(isSaved);
    }
  };

  const handleRepostToggle = async () => {
    setIsReposted(!isReposted);
    setRepostsCount(prev => isReposted ? prev - 1 : prev + 1);
    try {
      await api.post('/social/reposts/toggle', { target_type: 'post', target_id: post.id });
    } catch {
      setIsReposted(isReposted);
      setRepostsCount(repostsCount);
    }
  };

  const loadComments = async () => {
    setShowComments(!showComments);
    if (!showComments) {
      try {
        const res = await api.get(`/social/comments?target_type=post&target_id=${post.id}`);
        setCommentsList(res.data);
      } catch {}
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post('/social/comments', {
        target_type: 'post',
        target_id: post.id,
        comment_text: newComment.trim(),
      });
      setCommentsList(prev => [...prev, res.data]);
      setCommentsCount(prev => prev + 1);
      setNewComment('');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success('Link copied to clipboard');
  };

  const mediaList = post.media || [];

  return (
    <article className="glass-card rounded-2xl border border-white/10 mb-6 overflow-hidden transition-all hover:border-white/20 shadow-xl">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <Link to={`/profile/${post.author_username || post.user_id}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden ring-2 ring-white/20 group-hover:ring-white/50 transition-all">
            {post.author_avatar ? (
              <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-neutral-300">
                {post.author_name?.[0]}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-white group-hover:text-neutral-300 transition-colors">
                {post.author_name}
              </h4>
              {post.author_verified && (
                <span className="w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center text-[9px] font-black">
                  ✓
                </span>
              )}
            </div>
            {post.location && <p className="text-xs text-neutral-400">{post.location}</p>}
          </div>
        </Link>

        <button onClick={handleCopyLink} className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media Carousel / Video */}
      {mediaList.length > 0 && (
        <div className="relative bg-black max-h-[500px] flex items-center justify-center overflow-hidden">
          {mediaList[0].media_type === 'video' ? (
            <video src={mediaList[0].media_url} controls className="max-h-[500px] w-full object-contain" />
          ) : (
            <img src={mediaList[0].media_url} alt={post.alt_text || ''} className="max-h-[500px] w-full object-cover" />
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                isLiked ? 'text-rose-500' : 'text-neutral-300 hover:text-rose-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
              <span>{likesCount}</span>
            </button>

            <button
              onClick={loadComments}
              className="flex items-center gap-1.5 text-sm font-semibold text-neutral-300 hover:text-white transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{commentsCount}</span>
            </button>

            <button
              onClick={handleRepostToggle}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                isReposted ? 'text-emerald-400' : 'text-neutral-300 hover:text-emerald-400'
              }`}
            >
              <Repeat className="w-5 h-5" />
              <span>{repostsCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleBookmarkToggle} className={`text-neutral-300 hover:text-amber-400 ${isSaved ? 'text-amber-400 fill-amber-400' : ''}`}>
              <Bookmark className="w-5 h-5" />
            </button>
            <button onClick={handleCopyLink} className="text-neutral-300 hover:text-white">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-neutral-200 leading-relaxed">
            <span className="font-bold mr-2 text-white">{post.author_name}</span>
            {post.caption}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-[11px] text-neutral-500 mt-2 uppercase tracking-wider font-semibold">
          {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>

        {/* Comments Drawer */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {commentsList.map((comm) => (
                <div key={comm.id} className="text-xs bg-neutral-900/80 p-2.5 rounded-xl border border-white/10">
                  <span className="font-bold text-white mr-2">{comm.author_name}:</span>
                  <span className="text-neutral-200">{comm.comment_text}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl glass-input"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl btn-liquid-solid font-medium text-xs transition-colors"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

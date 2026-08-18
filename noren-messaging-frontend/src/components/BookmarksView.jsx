import { useState, useEffect } from 'react';
import api from '../utils/api';
import PostCard from './PostCard';
import { Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BookmarksView() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/bookmarks');
      setPosts(res.data.posts || []);
    } catch {
      toast.error('Failed to load saved bookmarks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl flex items-center gap-3">
        <div className="p-3 rounded-full bg-white/10 border border-white/20">
          <Bookmark className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Saved Bookmarks</h2>
          <p className="text-xs text-neutral-400">Your private collection of saved posts and content.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8 text-neutral-400 font-medium">Loading saved bookmarks...</div>
      ) : !posts.length ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-2 shadow-xl">
          <Bookmark className="w-10 h-10 text-white/40 mx-auto" />
          <h4 className="text-lg font-bold text-white">No Saved Bookmarks</h4>
          <p className="text-xs text-neutral-400">Save posts to review them anytime here privately.</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={(deletedId) => setPosts((prev) => prev.filter((p) => p.id !== deletedId))}
          />
        ))
      )}
    </div>
  );
}

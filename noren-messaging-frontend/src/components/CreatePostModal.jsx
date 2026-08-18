import { useState } from 'react';
import { X, Image, Video, MapPin, Eye, Lock } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function CreatePostModal({ onClose, onPostCreated }) {
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [location, setLocation] = useState('');
  const [altText, setAltText] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [disableComments, setDisableComments] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaUrl.trim()) {
      toast.error('Please provide an image or video URL');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/social/posts', {
        caption,
        location,
        alt_text: altText,
        privacy,
        is_comments_disabled: disableComments,
        is_likes_hidden: hideLikes,
        media: [
          {
            media_type: mediaType,
            media_url: mediaUrl.trim(),
            sort_order: 0,
          },
        ],
      });
      toast.success('Post created successfully!');
      onPostCreated();
      onClose();
    } catch {
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Create New Post</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Media Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="image"
                  checked={mediaType === 'image'}
                  onChange={() => setMediaType('image')}
                />
                Image
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  value="video"
                  checked={mediaType === 'video'}
                  onChange={() => setMediaType('video')}
                />
                Video
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Media URL</label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Caption & Hashtags</label>
            <textarea
              rows="3"
              placeholder="Write a caption... #noren #social"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl glass-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
              <input
                type="text"
                placeholder="Surat, India"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alt Text</label>
              <input
                type="text"
                placeholder="Accessibility description"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Hide Likes Count</span>
              <input
                type="checkbox"
                checked={hideLikes}
                onChange={(e) => setHideLikes(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Disable Comments</span>
              <input
                type="checkbox"
                checked={disableComments}
                onChange={(e) => setDisableComments(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20"
          >
            {submitting ? 'Sharing Post...' : 'Share Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

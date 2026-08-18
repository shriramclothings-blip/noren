import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await api.post('/social/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data.url;
      const fileType = files[0].type.startsWith('video') ? 'video' : 'image';
      setMediaUrl(uploadedUrl);
      setMediaType(fileType);
      toast.success('Media uploaded from device!');
    } catch {
      toast.error('Failed to upload file from device');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaUrl.trim()) {
      toast.error('Please upload a file from your device or provide a media URL');
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Create New Post</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker from Device / Gallery */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Upload Photo / Video from Device</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[140px] rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center p-4 cursor-pointer text-center relative overflow-hidden"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                  <span className="text-xs font-semibold">Uploading from device...</span>
                </div>
              ) : mediaUrl ? (
                <div className="w-full h-36 relative rounded-xl overflow-hidden group">
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                    <Upload className="w-4 h-4" /> Change File
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-300">
                  <div className="p-3 rounded-full bg-white/10 border border-white/20">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs font-bold text-white">Click to Select Photo or Video from Gallery</p>
                  <p className="text-[10px] text-neutral-400">Supports JPG, PNG, WEBP, MP4, MOV up to 100MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Or Paste Direct Link */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Or Direct Media URL Link (Optional)</label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl glass-input text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Caption & Hashtags</label>
            <textarea
              rows="3"
              placeholder="Write a caption... #noren #social"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl glass-input text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Location</label>
              <input
                type="text"
                placeholder="Surat, India"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl glass-input text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Alt Text</label>
              <input
                type="text"
                placeholder="Accessibility description"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl glass-input text-white"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span>Hide Likes Count</span>
              <input
                type="checkbox"
                checked={hideLikes}
                onChange={(e) => setHideLikes(e.target.checked)}
                className="rounded border-white/20 bg-neutral-900 text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span>Disable Comments</span>
              <input
                type="checkbox"
                checked={disableComments}
                onChange={(e) => setDisableComments(e.target.checked)}
                className="rounded border-white/20 bg-neutral-900 text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full py-3 rounded-xl btn-liquid-solid font-semibold text-sm transition-all shadow-lg disabled:opacity-50"
          >
            {submitting ? 'Sharing Post...' : 'Share Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, Loader2, Layers, Grid, Trash2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function CreatePostModal({ onClose, onPostCreated }) {
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [altText, setAltText] = useState('');
  const [postMode, setPostMode] = useState('carousel'); // 'carousel' or 'individual'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      name: file.name,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) {
      toast.error('Please select at least one photo or video from your device');
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);
    toast.loading(`Publishing ${selectedFiles.length} media file(s)...`, { id: 'bulkPost' });

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('caption', caption);
    formData.append('location', location);
    formData.append('mode', postMode);

    try {
      const res = await api.post('/social/posts/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });

      toast.success(`🎉 ${res.data.message || 'Posts published successfully!'}`, { id: 'bulkPost' });
      onPostCreated();
      onClose();
    } catch (err) {
      console.error('Bulk post upload error:', err);
      toast.error('Failed to upload bulk posts', { id: 'bulkPost' });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 my-8">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white">Create & Bulk Upload Posts</h3>
            <p className="text-xs text-neutral-400">Upload multiple photos and videos at once</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setPostMode('carousel')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                postMode === 'carousel'
                  ? 'btn-liquid-solid text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Carousel Post (1 Multi-Slide)</span>
            </button>
            <button
              type="button"
              onClick={() => setPostMode('individual')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                postMode === 'individual'
                  ? 'btn-liquid-solid text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Bulk Individual Posts</span>
            </button>
          </div>

          {/* Multiple File Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-neutral-300">
                Select Photos & Videos from Device ({selectedFiles.length} selected)
              </label>
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setSelectedFiles([]); setPreviews([]); }}
                  className="text-[11px] font-semibold text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[120px] rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center p-4 cursor-pointer text-center relative overflow-hidden"
            >
              <div className="flex flex-col items-center gap-2 text-neutral-300">
                <div className="p-3 rounded-full bg-white/10 border border-white/20">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-bold text-white">Click to Add Multiple Photos or Videos from Device</p>
                <p className="text-[10px] text-neutral-400">Select multiple files at once. 100% permanent storage.</p>
              </div>
            </div>

            {/* Selected File Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3 max-h-48 overflow-y-auto p-1 border border-white/10 rounded-2xl">
                {previews.map((p, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-white/20">
                    {p.type === 'video' ? (
                      <video src={p.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Caption & Hashtags</label>
            <textarea
              rows="3"
              placeholder="Write a caption for your bulk upload... #NOREN #Fashion"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl glass-input text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Location</label>
            <input
              type="text"
              placeholder="Mumbai, India"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl glass-input text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedFiles.length}
            className="w-full py-3 rounded-xl btn-liquid-solid font-semibold text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-black"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing ({uploadProgress}%)</span>
              </>
            ) : (
              <span>Publish {selectedFiles.length ? `${selectedFiles.length} File(s)` : 'Posts'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

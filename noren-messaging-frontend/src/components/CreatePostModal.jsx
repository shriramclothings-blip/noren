import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, Loader2, Layers, Grid, Trash2, Plus, Sparkles, FolderPlus, Tv } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function CreatePostModal({ onClose, onPostCreated }) {
  const [activeTab, setActiveTab] = useState('bulk'); // 'bulk', 'video', or 'single'
  const [postMode, setPostMode] = useState('carousel'); // 'carousel' or 'individual'
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [singleMediaUrl, setSingleMediaUrl] = useState('');
  const [singleMediaType, setSingleMediaType] = useState('image');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (activeTab === 'single' || activeTab === 'video') {
      const file = files[0];
      setSelectedFiles([file]);
      const url = URL.createObjectURL(file);
      setSingleMediaUrl(url);
      setSingleMediaType(file.type.startsWith('video') ? 'video' : 'image');
      setPreviews([{ url, type: file.type.startsWith('video') ? 'video' : 'image', name: file.name }]);
      if (activeTab === 'video') setAspectRatio('16:9');
      return;
    }

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
    if (!selectedFiles.length && !singleMediaUrl.trim()) {
      toast.error('Please select at least one photo or video from your device');
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);
    toast.loading(`Publishing ${selectedFiles.length || 1} media file(s)...`, { id: 'postUpload' });

    try {
      if (activeTab === 'single' && singleMediaUrl.startsWith('http')) {
        await api.post('/social/posts', {
          caption,
          location,
          privacy: 'public',
          media: [{ media_type: singleMediaType, media_url: singleMediaUrl.trim(), aspect_ratio: aspectRatio, sort_order: 0 }],
        });
      } else {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('caption', caption);
        formData.append('location', location);
        formData.append('mode', postMode);
        formData.append('aspect_ratio', activeTab === 'video' ? '16:9' : aspectRatio);

        await api.post('/social/posts/bulk-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percent);
          },
        });
      }

      toast.success('🎉 Published successfully!', { id: 'postUpload' });
      onPostCreated();
      onClose();
    } catch (err) {
      console.error('Post creation error:', err);
      toast.error('Failed to publish post', { id: 'postUpload' });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-6 border border-white/20 shadow-2xl space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Create & Upload Media</span>
            </h3>
            <p className="text-xs text-neutral-400">Bulk upload photos, reels, and YouTube-style 16:9 videos</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-extrabold">
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'bulk' ? 'btn-liquid-solid text-black shadow-lg' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>📁 Bulk</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('video'); setAspectRatio('16:9'); }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'video' ? 'btn-liquid-solid text-black shadow-lg' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-400" />
            <span>📺 16:9 Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'single' ? 'btn-liquid-solid text-black shadow-lg' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>📸 Single</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'bulk' && (
            <>
              <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-black/40 border border-white/10 text-xs">
                <span className="font-bold text-neutral-300 pl-2">Publish Mode:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPostMode('carousel')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                      postMode === 'carousel' ? 'bg-amber-400 text-black shadow' : 'bg-white/10 text-neutral-400'
                    }`}
                  >
                    Multi-Slide Carousel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostMode('individual')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                      postMode === 'individual' ? 'bg-amber-400 text-black shadow' : 'bg-white/10 text-neutral-400'
                    }`}
                  >
                    Separate Posts
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-white">
                    Device Gallery Media ({selectedFiles.length} selected)
                  </label>
                  {selectedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSelectedFiles([]); setPreviews([]); }}
                      className="text-[11px] font-bold text-rose-400 hover:underline"
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
                  className="w-full min-h-[130px] rounded-2xl border-2 border-dashed border-amber-400/40 hover:border-amber-400 bg-amber-400/5 hover:bg-amber-400/10 transition-all flex flex-col items-center justify-center p-4 cursor-pointer text-center relative overflow-hidden group shadow-inner"
                >
                  <div className="flex flex-col items-center gap-2 text-neutral-200">
                    <div className="p-3 rounded-full bg-amber-400/20 text-amber-400 ring-4 ring-amber-400/10 group-hover:scale-110 transition-transform">
                      <FolderPlus className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-black text-white">Choose Multiple Photos & Videos from Gallery</p>
                    <p className="text-xs text-amber-300/80 font-semibold">Select 1 to 20+ files at once (Up to 1GB per file)</p>
                  </div>
                </div>

                {previews.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-400">Selected Items:</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add More Files
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto p-2 border border-white/10 rounded-2xl bg-black/40">
                      {previews.map((p, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-white/20 shadow-md">
                          {p.type === 'video' ? (
                            <video src={p.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg opacity-90 group-hover:opacity-100 transition-opacity"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'video' && (
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                <Tv className="w-4 h-4" /> Upload Widescreen 16:9 Horizontal Video (YouTube Style)
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video rounded-2xl border-2 border-dashed border-amber-400/50 hover:border-amber-400 bg-amber-400/10 transition-all flex flex-col items-center justify-center p-4 cursor-pointer text-center relative overflow-hidden"
              >
                {singleMediaUrl ? (
                  <video src={singleMediaUrl} controls className="w-full h-full object-contain bg-black" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-amber-300">
                    <Video className="w-8 h-8 text-amber-400 animate-bounce" />
                    <p className="text-sm font-black text-white">Click to Select Widescreen 16:9 Video from Device</p>
                    <p className="text-xs text-neutral-400">Optimized for horizontal watching on NOREN Watch</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'single' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">Upload File or Paste Media URL</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[110px] rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center p-3 cursor-pointer text-center"
              >
                {singleMediaUrl ? (
                  <div className="w-full h-28 relative rounded-xl overflow-hidden">
                    {singleMediaType === 'video' ? (
                      <video src={singleMediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={singleMediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-neutral-300">
                    <Upload className="w-5 h-5 text-white" />
                    <p className="text-xs font-bold text-white">Click to Select Photo or Video File</p>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="Or paste direct image/video URL link..."
                value={singleMediaUrl}
                onChange={(e) => setSingleMediaUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white mt-2"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Caption & Hashtags</label>
            <textarea
              rows="3"
              placeholder="Write a title/caption... #NOREN #Watch"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl glass-input text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Location</label>
            <input
              type="text"
              placeholder="Mumbai, India"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || (activeTab === 'bulk' && !selectedFiles.length) || (activeTab === 'video' && !selectedFiles.length && !singleMediaUrl)}
            className="w-full py-3.5 rounded-xl btn-liquid-solid font-black text-sm transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 text-black"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing ({uploadProgress}%)</span>
              </>
            ) : (
              <span>Publish {activeTab === 'video' ? 'Widescreen Video' : selectedFiles.length ? `${selectedFiles.length} Media Items` : 'Post'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

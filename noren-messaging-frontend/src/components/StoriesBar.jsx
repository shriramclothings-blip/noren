import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StoriesBar() {
  const [storyGroups, setStoryGroups] = useState([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('#000000');
  const [isCloseFriends, setIsCloseFriends] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await api.get('/social/stories');
      setStoryGroups(res.data);
    } catch (err) {
      console.error('Failed to load stories:', err);
    }
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!mediaUrl && !textContent) {
      toast.error('Add an image URL or text content for your story');
      return;
    }
    try {
      await api.post('/social/stories', {
        media_type: mediaUrl ? 'image' : 'text',
        media_url: mediaUrl || null,
        text_content: textContent || null,
        background_color: bgColor,
        is_close_friends: isCloseFriends,
      });
      toast.success('Story created!');
      setShowCreateModal(false);
      setMediaUrl('');
      setTextContent('');
      fetchStories();
    } catch {
      toast.error('Failed to create story');
    }
  };

  const handleStoryView = async (storyId, emoji = null) => {
    try {
      await api.post(`/social/stories/${storyId}/view`, { reaction_emoji: emoji });
    } catch {}
  };

  const openStoryViewer = (group) => {
    setActiveStoryGroup(group);
    setActiveStoryIndex(0);
    if (group.stories?.[0]) {
      handleStoryView(group.stories[0].id);
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-4 mb-6 overflow-x-auto border border-white/10 shadow-xl">
      <div className="flex items-center gap-4 min-w-max">
        {/* Create Story Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-dashed border-white/40 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-medium text-neutral-300">Your Story</span>
        </button>

        {/* Story Rings */}
        {storyGroups.map((group) => (
          <button
            key={group.user_id}
            onClick={() => openStoryViewer(group)}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div
              className={`w-16 h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                group.has_unviewed
                  ? 'bg-gradient-to-tr from-white via-neutral-400 to-neutral-700'
                  : 'bg-neutral-800'
              }`}
            >
              <div className="w-full h-full rounded-full bg-black p-0.5 overflow-hidden">
                {group.author_avatar ? (
                  <img src={group.author_avatar} alt={group.author_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-neutral-300">
                    {group.author_name?.[0]}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-neutral-300 truncate max-w-[4rem]">
              {group.author_name}
            </span>
          </button>
        ))}
      </div>

      {/* Full-Screen Story Viewer Modal */}
      {activeStoryGroup && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <button
            onClick={() => setActiveStoryGroup(null)}
            className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full bg-neutral-900/80 border border-white/20"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="w-full max-w-sm h-[80vh] rounded-3xl overflow-hidden relative flex flex-col justify-between p-6 shadow-2xl border border-white/20"
            style={{ backgroundColor: activeStoryGroup.stories[activeStoryIndex]?.background_color || '#000000' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-white/30">
                {activeStoryGroup.author_avatar && (
                  <img src={activeStoryGroup.author_avatar} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{activeStoryGroup.author_name}</h4>
                <p className="text-xs text-neutral-400">24h Ephemeral Story</p>
              </div>
            </div>

            {/* Content */}
            <div className="my-auto flex items-center justify-center text-center">
              {activeStoryGroup.stories[activeStoryIndex]?.media_url ? (
                <img
                  src={activeStoryGroup.stories[activeStoryIndex].media_url}
                  alt=""
                  className="max-h-96 object-contain rounded-xl"
                />
              ) : (
                <p className="text-xl font-extrabold text-white px-4">
                  {activeStoryGroup.stories[activeStoryIndex]?.text_content}
                </p>
              )}
            </div>

            {/* Reactions Footer */}
            <div className="flex items-center justify-around z-10 bg-black/80 backdrop-blur-xl py-3 px-4 rounded-full border border-white/20">
              {['❤️', '🔥', '👏', '😂', '😮'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleStoryView(activeStoryGroup.stories[activeStoryIndex]?.id, emoji);
                    toast.success(`Reacted ${emoji}`);
                  }}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Create 24h Story</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Text Caption / Content</label>
                <textarea
                  rows="3"
                  placeholder="What's happening?"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl glass-input"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="closeFriends"
                  checked={isCloseFriends}
                  onChange={(e) => setIsCloseFriends(e.target.checked)}
                  className="rounded border-white/20 bg-neutral-900 text-white"
                />
                <label htmlFor="closeFriends" className="text-xs text-neutral-300 font-medium">
                  Close Friends Only
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl btn-liquid-solid font-semibold text-sm transition-all shadow-lg"
              >
                Share to Story
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

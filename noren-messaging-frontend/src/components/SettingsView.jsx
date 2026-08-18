import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function SettingsView() {
  const [whoCanMessage, setWhoCanMessage] = useState('everyone');
  const [whoCanComment, setWhoCanComment] = useState('everyone');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [hiddenWords, setHiddenWords] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/social/privacy-settings');
      setWhoCanMessage(res.data.who_can_message || 'everyone');
      setWhoCanComment(res.data.who_can_comment || 'everyone');
      setShowOnlineStatus(res.data.show_online_status !== false);
      setShowReadReceipts(res.data.show_read_receipts !== false);
      setHiddenWords((res.data.hidden_words || []).join(', '));
    } catch {}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const wordsArray = hiddenWords.split(',').map(w => w.trim()).filter(Boolean);
      await api.put('/social/privacy-settings', {
        who_can_message: whoCanMessage,
        who_can_comment: whoCanComment,
        show_online_status: showOnlineStatus,
        show_read_receipts: showReadReceipts,
        hidden_words: wordsArray,
      });
      toast.success('Privacy settings updated');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl">
        <h2 className="text-xl font-black text-white mb-1">Privacy & Safety Settings</h2>
        <p className="text-xs text-neutral-400 mb-6">Manage who can message, comment, tag you, and view your activity.</p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Interaction Permissions */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Interactions</h4>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Who can message you?</label>
              <select
                value={whoCanMessage}
                onChange={(e) => setWhoCanMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
              >
                <option value="everyone" className="bg-black text-white">Everyone</option>
                <option value="following" className="bg-black text-white">People You Follow</option>
                <option value="no_one" className="bg-black text-white">No One</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Who can comment on your posts?</label>
              <select
                value={whoCanComment}
                onChange={(e) => setWhoCanComment(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
              >
                <option value="everyone" className="bg-black text-white">Everyone</option>
                <option value="following" className="bg-black text-white">People You Follow</option>
                <option value="no_one" className="bg-black text-white">No One</option>
              </select>
            </div>
          </div>

          {/* Activity Status */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Activity & Presence</h4>

            <div className="flex items-center justify-between text-xs text-neutral-300">
              <div>
                <span className="block font-semibold text-white">Show Online Status</span>
                <span className="text-[11px] text-neutral-400">Allow users to see when you're active</span>
              </div>
              <input
                type="checkbox"
                checked={showOnlineStatus}
                onChange={(e) => setShowOnlineStatus(e.target.checked)}
                className="rounded border-white/20 bg-neutral-900 text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-300">
              <div>
                <span className="block font-semibold text-white">Show Read Receipts</span>
                <span className="text-[11px] text-neutral-400">Let users see when you've read their messages</span>
              </div>
              <input
                type="checkbox"
                checked={showReadReceipts}
                onChange={(e) => setShowReadReceipts(e.target.checked)}
                className="rounded border-white/20 bg-neutral-900 text-white"
              />
            </div>
          </div>

          {/* Content Filtering */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Content Filters</h4>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Hidden Words & Phrase Filter</label>
              <input
                type="text"
                placeholder="Comma separated words (e.g. spam, badword)"
                value={hiddenWords}
                onChange={(e) => setHiddenWords(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
              />
              <p className="text-[10px] text-neutral-500 mt-1">Comments containing these words will be automatically filtered.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl btn-liquid-solid font-semibold text-sm transition-all shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

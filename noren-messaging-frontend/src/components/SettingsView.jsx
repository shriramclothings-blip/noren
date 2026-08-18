import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Lock, Eye, Bell, Shield, User, Save } from 'lucide-react';

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
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h2 className="text-xl font-black text-white mb-1">Privacy & Safety Settings</h2>
        <p className="text-xs text-slate-400 mb-6">Manage who can message, comment, tag you, and view your activity.</p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Interaction Permissions */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Interactions</h4>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Who can message you?</label>
              <select
                value={whoCanMessage}
                onChange={(e) => setWhoCanMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input"
              >
                <option value="everyone" className="bg-slate-900">Everyone</option>
                <option value="following" className="bg-slate-900">People You Follow</option>
                <option value="no_one" className="bg-slate-900">No One</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Who can comment on your posts?</label>
              <select
                value={whoCanComment}
                onChange={(e) => setWhoCanComment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input"
              >
                <option value="everyone" className="bg-slate-900">Everyone</option>
                <option value="following" className="bg-slate-900">People You Follow</option>
                <option value="no_one" className="bg-slate-900">No One</option>
              </select>
            </div>
          </div>

          {/* Activity Status */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Activity & Presence</h4>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="block font-semibold text-white">Show Online Status</span>
                <span className="text-[11px] text-slate-400">Allow users to see when you're active</span>
              </div>
              <input
                type="checkbox"
                checked={showOnlineStatus}
                onChange={(e) => setShowOnlineStatus(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="block font-semibold text-white">Show Read Receipts</span>
                <span className="text-[11px] text-slate-400">Let users see when you've read their messages</span>
              </div>
              <input
                type="checkbox"
                checked={showReadReceipts}
                onChange={(e) => setShowReadReceipts(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-cyan-500"
              />
            </div>
          </div>

          {/* Content Filtering */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Content Filters</h4>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hidden Words & Phrase Filter</label>
              <input
                type="text"
                placeholder="Comma separated words (e.g. spam, badword)"
                value={hiddenWords}
                onChange={(e) => setHiddenWords(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input"
              />
              <p className="text-[10px] text-slate-500 mt-1">Comments containing these words will be automatically filtered.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

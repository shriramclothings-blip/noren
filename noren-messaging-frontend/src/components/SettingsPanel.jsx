import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

/**
 * SettingsPanel Component
 * Privacy settings, account settings, security
 */

export default function SettingsPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('privacy'); // privacy, account, notifications, security
  const [loading, setLoading] = useState(false);

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    who_can_message: 'everyone',
    who_can_comment: 'everyone',
    who_can_tag: 'everyone',
    hidden_words: [],
    activity_status: true,
    online_status: true
  });

  // Account Settings
  const [accountSettings, setAccountSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    private_account: false,
    verified_badge: false
  });

  // Notification Preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    likes_enabled: true,
    comments_enabled: true,
    messages_enabled: true,
    stories_enabled: true,
    calls_enabled: true
  });

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [restrictedUsers, setRestrictedUsers] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [privacy, account, notif, blocked, restricted] = await Promise.all([
        api.get('/social/settings/privacy'),
        api.get('/social/settings/account'),
        api.get('/social/settings/notifications'),
        api.get('/social/settings/blocked-users'),
        api.get('/social/settings/restricted-users')
      ]);

      if (privacy.data) setPrivacySettings(privacy.data);
      if (account.data) setAccountSettings(account.data);
      if (notif.data) setNotificationPrefs(notif.data);
      setBlockedUsers(blocked.data?.blocked_users || []);
      setRestrictedUsers(restricted.data?.restricted_users || []);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async () => {
    try {
      await api.put('/social/settings/privacy', privacySettings);
      toast.success('Privacy settings updated');
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      toast.error('Failed to update privacy settings');
    }
  };

  const updateAccountSettings = async () => {
    try {
      await api.put('/social/settings/account', accountSettings);
      toast.success('Account settings updated');
    } catch (error) {
      console.error('Failed to update account settings:', error);
      toast.error('Failed to update account settings');
    }
  };

  const updateNotificationPrefs = async () => {
    try {
      await api.put('/social/settings/notifications', notificationPrefs);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      toast.error('Failed to update notification preferences');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-4">
            {['privacy', 'account', 'notifications', 'security'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-2 rounded-lg mb-2 capitalize font-medium transition ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {loading ? (
              <div className="text-center py-8">Loading settings...</div>
            ) : activeTab === 'privacy' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Privacy Settings</h2>

                {/* Who Can Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Who can message you?
                  </label>
                  <select
                    value={privacySettings.who_can_message}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      who_can_message: e.target.value
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers Only</option>
                    <option value="following">People You Follow</option>
                    <option value="none">No One</option>
                  </select>
                </div>

                {/* Who Can Comment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Who can comment on your posts?
                  </label>
                  <select
                    value={privacySettings.who_can_comment}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      who_can_comment: e.target.value
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers Only</option>
                    <option value="following">People You Follow</option>
                    <option value="none">No One</option>
                  </select>
                </div>

                {/* Who Can Tag */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Who can tag you?
                  </label>
                  <select
                    value={privacySettings.who_can_tag}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      who_can_tag: e.target.value
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers Only</option>
                    <option value="following">People You Follow</option>
                    <option value="none">No One</option>
                  </select>
                </div>

                {/* Activity Status */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Show activity status
                  </label>
                  <input
                    type="checkbox"
                    checked={privacySettings.activity_status}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      activity_status: e.target.checked
                    })}
                    className="w-5 h-5 rounded"
                  />
                </div>

                {/* Online Status */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Show when you're online
                  </label>
                  <input
                    type="checkbox"
                    checked={privacySettings.online_status}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      online_status: e.target.checked
                    })}
                    className="w-5 h-5 rounded"
                  />
                </div>

                <button
                  onClick={updatePrivacySettings}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
                >
                  Save Privacy Settings
                </button>
              </div>
            ) : activeTab === 'account' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Account Settings</h2>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Private Account
                  </label>
                  <input
                    type="checkbox"
                    checked={accountSettings.private_account}
                    onChange={(e) => setAccountSettings({
                      ...accountSettings,
                      private_account: e.target.checked
                    })}
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={accountSettings.email_notifications}
                    onChange={(e) => setAccountSettings({
                      ...accountSettings,
                      email_notifications: e.target.checked
                    })}
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={accountSettings.push_notifications}
                    onChange={(e) => setAccountSettings({
                      ...accountSettings,
                      push_notifications: e.target.checked
                    })}
                    className="w-5 h-5 rounded"
                  />
                </div>

                <button
                  onClick={updateAccountSettings}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
                >
                  Save Account Settings
                </button>
              </div>
            ) : activeTab === 'notifications' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Notification Preferences</h2>

                <div className="space-y-4">
                  {Object.entries(notificationPrefs).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                        {key.replace('_', ' ')}
                      </label>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotificationPrefs({
                          ...notificationPrefs,
                          [key]: e.target.checked
                        })}
                        className="w-5 h-5 rounded"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={updateNotificationPrefs}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
                >
                  Save Notification Preferences
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Security</h2>

                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Blocked Users</h3>
                  {blockedUsers.length === 0 ? (
                    <p className="text-gray-500">No blocked users</p>
                  ) : (
                    <div className="space-y-2">
                      {blockedUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-gray-900 dark:text-white">{u.name}</span>
                          <button
                            onClick={() => toast.promise(
                              api.post(`/social/settings/unblock-user/${u.id}`),
                              {
                                loading: 'Unblocking...',
                                success: 'User unblocked',
                                error: 'Failed to unblock user'
                              }
                            )}
                            className="text-red-500 hover:text-red-600 text-sm font-semibold"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Restricted Users</h3>
                  {restrictedUsers.length === 0 ? (
                    <p className="text-gray-500">No restricted users</p>
                  ) : (
                    <div className="space-y-2">
                      {restrictedUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-gray-900 dark:text-white">{u.name}</span>
                          <button
                            onClick={() => toast.promise(
                              api.post(`/social/settings/unrestrict-user/${u.id}`),
                              {
                                loading: 'Unrestricting...',
                                success: 'User unrestricted',
                                error: 'Failed to unrestrict user'
                              }
                            )}
                            className="text-red-500 hover:text-red-600 text-sm font-semibold"
                          >
                            Unrestrict
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

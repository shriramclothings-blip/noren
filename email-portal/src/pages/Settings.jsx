import { useState } from 'react'
import Card from '@/components/common/Card'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

const Settings = () => {
  const user = useAuthStore(state => state.user)
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'sender', name: 'Sender Identities' },
    { id: 'audit', name: 'Audit Log' }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Personal Information">
            <div className="space-y-4">
              <Input
                label="Name"
                value={user?.name || ''}
                fullWidth
                disabled
              />
              <Input
                label="Email"
                value={user?.email || ''}
                fullWidth
                disabled
              />
              <Input
                label="Role"
                value={user?.role || ''}
                fullWidth
                disabled
              />
              <Button variant="outline" fullWidth>
                Edit Profile
              </Button>
            </div>
          </Card>

          <Card title="Security">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Change your password to keep your account secure.</p>
              <Button variant="outline" fullWidth>
                Change Password
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Sender Identities Tab */}
      {activeTab === 'sender' && (
        <Card title="Sender Identities">
          <p className="text-sm text-gray-600 mb-4">
            Manage verified email addresses that you can send emails from.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">noreply@norenfastion.shop</p>
                <p className="text-sm text-gray-500">Default sender</p>
              </div>
              <Badge variant="success">Verified</Badge>
            </div>
          </div>
          <Button variant="outline" fullWidth className="mt-4">
            Add Sender Identity
          </Button>
        </Card>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card title="Audit Log">
          <p className="text-sm text-gray-600">
            View all actions performed in your email portal.
          </p>
          <p className="text-sm text-gray-500 mt-4">No audit logs to display.</p>
        </Card>
      )}
    </div>
  )
}

export default Settings
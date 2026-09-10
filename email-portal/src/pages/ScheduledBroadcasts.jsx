import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import CreateBroadcastModal from '@/components/broadcasts/CreateBroadcastModal'
import { MdSchedule, MdAdd, MdDelete, MdPlayArrow, MdPause, MdEdit } from 'react-icons/md'
import emailService from '@/services/emailService'
import { formatDateTime } from '@/utils/formatting'
import toast from 'react-hot-toast'

const ScheduledBroadcasts = () => {
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState(null)
  const [toggling, setToggling] = useState(null)

  useEffect(() => {
    loadBroadcasts()
  }, [])

  const loadBroadcasts = async () => {
    setLoading(true)
    try {
      const data = await emailService.getScheduledBroadcasts()
      setBroadcasts(data.broadcasts || [])
    } catch (error) {
      toast.error('Failed to load scheduled broadcasts')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (broadcast) => {
    setToggling(broadcast.id)
    try {
      await emailService.toggleBroadcast(broadcast.id, !broadcast.is_active)
      toast.success(`Broadcast ${broadcast.is_active ? 'paused' : 'activated'}`)
      loadBroadcasts()
    } catch (error) {
      toast.error('Failed to toggle broadcast')
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete broadcast "${name}"?`)) return
    
    try {
      await emailService.deleteBroadcast(id)
      toast.success('Broadcast deleted')
      loadBroadcasts()
    } catch (error) {
      toast.error('Failed to delete broadcast')
    }
  }

  const handleEdit = (broadcast) => {
    setEditingBroadcast(broadcast)
    setShowCreateModal(true)
  }

  const handleModalClose = () => {
    setShowCreateModal(false)
    setEditingBroadcast(null)
  }

  const getFrequencyLabel = (frequency, customDays) => {
    switch (frequency) {
      case 'daily':
        return 'Every day'
      case 'weekly':
        return 'Weekly'
      case 'custom':
        if (customDays && customDays.length > 0) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          return customDays.map(d => days[d]).join(', ')
        }
        return 'Custom'
      case 'one_time':
        return 'One time'
      default:
        return frequency
    }
  }

  const getNextRunTime = (broadcast) => {
    if (!broadcast.next_run_at) return 'Not scheduled'
    const next = new Date(broadcast.next_run_at)
    const now = new Date()
    const diff = next - now
    
    if (diff < 0) return 'Overdue'
    if (diff < 3600000) return 'Within 1 hour'
    if (diff < 86400000) return 'Today'
    return formatDateTime(broadcast.next_run_at)
  }

  if (loading) return <Loading text="Loading scheduled broadcasts..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Broadcasts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Send automated emails daily, weekly, or at custom intervals
          </p>
        </div>
        <Button icon={<MdAdd />} onClick={() => setShowCreateModal(true)}>
          Create Broadcast
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">📅 Scheduled Broadcasts</h3>
        <p className="text-sm text-blue-700">
          Set up recurring email campaigns that run automatically at specific times. 
          Perfect for daily newsletters, weekly updates, or custom schedules.
        </p>
      </div>

      <Card>
        {broadcasts.length === 0 ? (
          <EmptyState
            icon={MdSchedule}
            title="No scheduled broadcasts"
            description="Create automated email broadcasts that run on a schedule."
            actionLabel="Create Broadcast"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="overflow-hidden">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Broadcast</th>
                  <th className="table-header-cell">Frequency</th>
                  <th className="table-header-cell">Time</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Next Run</th>
                  <th className="table-header-cell">Total Sent</th>
                  <th className="table-header-cell">Created</th>
                  <th className="table-header-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {broadcasts.map((broadcast) => (
                  <tr key={broadcast.id} className="table-row">
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-gray-900">
                          {broadcast.name}
                        </div>
                        {broadcast.description && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {broadcast.description}
                          </p>
                        )}
                        {broadcast.subject && (
                          <p className="text-xs text-gray-400 mt-1">
                            Subject: {broadcast.subject}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant="info">
                        {getFrequencyLabel(broadcast.frequency, broadcast.custom_days)}
                      </Badge>
                    </td>
                    <td className="table-cell text-gray-500 font-mono text-sm">
                      {broadcast.send_time || 'Not set'}
                    </td>
                    <td className="table-cell">
                      <Badge variant={broadcast.is_active ? 'success' : 'gray'}>
                        {broadcast.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {getNextRunTime(broadcast)}
                    </td>
                    <td className="table-cell text-gray-500">
                      {broadcast.total_sent || 0}
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {formatDateTime(broadcast.created_at)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(broadcast)}
                          className="text-blue-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <MdEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleToggle(broadcast)}
                          disabled={toggling === broadcast.id}
                          className={`${
                            broadcast.is_active 
                              ? 'text-orange-400 hover:text-orange-600' 
                              : 'text-green-400 hover:text-green-600'
                          } disabled:opacity-50`}
                          title={broadcast.is_active ? 'Pause' : 'Activate'}
                        >
                          {broadcast.is_active ? (
                            <MdPause size={18} />
                          ) : (
                            <MdPlayArrow size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(broadcast.id, broadcast.name)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateBroadcastModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSuccess={loadBroadcasts}
        editingBroadcast={editingBroadcast}
      />
    </div>
  )
}

export default ScheduledBroadcasts

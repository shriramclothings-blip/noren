import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import CreateAutomationModal from '@/components/automation/CreateAutomationModal'
import { MdAutorenew, MdAdd, MdDelete, MdEdit, MdPlayArrow, MdPause } from 'react-icons/md'
import emailService from '@/services/emailService'
import { formatDateTime, formatNumber } from '@/utils/formatting'
import toast from 'react-hot-toast'

const Automation = () => {
  const [loading, setLoading] = useState(true)
  const [automations, setAutomations] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toggling, setToggling] = useState(null)

  useEffect(() => {
    loadAutomations()
  }, [])

  const loadAutomations = async () => {
    setLoading(true)
    try {
      const data = await emailService.getAutomations()
      setAutomations(data.automations || [])
    } catch (error) {
      toast.error('Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (automation) => {
    setToggling(automation.id)
    try {
      await emailService.toggleAutomation(automation.id, !automation.is_active)
      toast.success(`Automation ${automation.is_active ? 'paused' : 'activated'}`)
      loadAutomations()
    } catch (error) {
      toast.error('Failed to toggle automation')
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete automation "${name}"?`)) return
    
    try {
      await emailService.deleteAutomation(id)
      toast.success('Automation deleted')
      loadAutomations()
    } catch (error) {
      toast.error('Failed to delete automation')
    }
  }

  const getTriggerLabel = (triggerType) => {
    const labels = {
      user_signup: 'User Signup',
      order_placed: 'Order Placed',
      order_shipped: 'Order Shipped',
      order_delivered: 'Order Delivered',
      cart_abandoned: 'Cart Abandoned',
      subscription: 'Newsletter Subscription',
      custom: 'Custom Event'
    }
    return labels[triggerType] || triggerType
  }

  if (loading) return <Loading text="Loading automations..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Automation</h1>
          <p className="text-sm text-gray-600 mt-1">
            Automate emails based on user actions and events
          </p>
        </div>
        <Button icon={<MdAdd />} onClick={() => setShowCreateModal(true)}>
          Create Automation
        </Button>
      </div>

      <Card>
        {automations.length === 0 ? (
          <EmptyState
            icon={MdAutorenew}
            title="No automations"
            description="Create automated email workflows to engage your audience."
            actionLabel="Create Automation"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="overflow-hidden">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Automation</th>
                  <th className="table-header-cell">Trigger</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Delay</th>
                  <th className="table-header-cell">Sent</th>
                  <th className="table-header-cell">Created</th>
                  <th className="table-header-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {automations.map((automation) => (
                  <tr key={automation.id} className="table-row">
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-gray-900">
                          {automation.name}
                        </div>
                        {automation.description && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {automation.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant="gray">
                        {getTriggerLabel(automation.trigger_type)}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <Badge variant={automation.is_active ? 'success' : 'gray'}>
                        {automation.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </td>
                    <td className="table-cell text-gray-500">
                      {automation.delay_minutes === 0 
                        ? 'Immediate' 
                        : `${automation.delay_minutes} min`}
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatNumber(automation.total_sent || 0)}
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {formatDateTime(automation.created_at)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggle(automation)}
                          disabled={toggling === automation.id}
                          className={`${
                            automation.is_active 
                              ? 'text-orange-400 hover:text-orange-600' 
                              : 'text-green-400 hover:text-green-600'
                          } disabled:opacity-50`}
                          title={automation.is_active ? 'Pause' : 'Activate'}
                        >
                          {automation.is_active ? (
                            <MdPause size={18} />
                          ) : (
                            <MdPlayArrow size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(automation.id, automation.name)}
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

      <CreateAutomationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadAutomations}
      />
    </div>
  )
}

export default Automation
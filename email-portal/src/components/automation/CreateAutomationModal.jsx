import { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { MdClose, MdAutorenew } from 'react-icons/md'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const CreateAutomationModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'user_signup',
    trigger_conditions: '',
    template_id: '',
    delay_minutes: 0,
    is_active: true
  })

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      const data = await emailService.getTemplates()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Automation name is required')
      return
    }

    if (!formData.template_id) {
      toast.error('Please select an email template')
      return
    }

    setLoading(true)

    try {
      const automationData = {
        ...formData,
        delay_minutes: parseInt(formData.delay_minutes) || 0,
        trigger_conditions: formData.trigger_conditions ? JSON.parse(formData.trigger_conditions) : {}
      }

      await emailService.createAutomation(automationData)
      toast.success('Automation created successfully!')
      onSuccess()
      onClose()
      setFormData({
        name: '',
        description: '',
        trigger_type: 'user_signup',
        trigger_conditions: '',
        template_id: '',
        delay_minutes: 0,
        is_active: true
      })
    } catch (error) {
      toast.error(error.message || 'Failed to create automation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Automation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Automation Name */}
          <Input
            label="Automation Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Welcome Email Sequence"
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="input"
              placeholder="Send welcome email when user signs up"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trigger Event
            </label>
            <select
              name="trigger_type"
              value={formData.trigger_type}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="user_signup">User Signup</option>
              <option value="order_placed">Order Placed</option>
              <option value="order_shipped">Order Shipped</option>
              <option value="order_delivered">Order Delivered</option>
              <option value="cart_abandoned">Cart Abandoned</option>
              <option value="subscription">Newsletter Subscription</option>
              <option value="custom">Custom Event</option>
            </select>
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delay (minutes)
            </label>
            <input
              type="number"
              name="delay_minutes"
              value={formData.delay_minutes}
              onChange={handleChange}
              min="0"
              className="input"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Wait this many minutes after trigger before sending email (0 = immediate)
            </p>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Template *
            </label>
            <select
              name="template_id"
              value={formData.template_id}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Conditions (Advanced) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trigger Conditions (JSON, optional)
            </label>
            <textarea
              name="trigger_conditions"
              value={formData.trigger_conditions}
              onChange={handleChange}
              rows={3}
              className="input font-mono text-xs"
              placeholder='{"min_order_value": 100, "product_category": "clothing"}'
            />
            <p className="text-xs text-gray-500 mt-1">
              Advanced: JSON object with custom conditions
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              id="is_active"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Start automation immediately after creation
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={<MdAutorenew />}
              loading={loading}
            >
              Create Automation
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default CreateAutomationModal

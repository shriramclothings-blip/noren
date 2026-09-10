import { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { MdClose, MdSend, MdSchedule } from 'react-icons/md'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const CreateCampaignModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template_id: '',
    campaign_type: 'one_time',
    audience_type: 'all_contacts',
    audience_filter: '',
    custom_recipient_list: '',
    scheduled_at: ''
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
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Campaign name is required')
      return
    }
    
    if (!formData.subject.trim()) {
      toast.error('Subject is required')
      return
    }

    setLoading(true)

    try {
      await emailService.createCampaign(formData)
      toast.success('Campaign created successfully!')
      onSuccess()
      onClose()
      setFormData({
        name: '',
        subject: '',
        template_id: '',
        campaign_type: 'one_time',
        audience_type: 'all_contacts',
        audience_filter: '',
        custom_recipient_list: '',
        scheduled_at: ''
      })
    } catch (error) {
      toast.error(error.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Campaign</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campaign Name */}
          <Input
            label="Campaign Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Summer Sale Campaign"
            required
          />

          {/* Subject Line */}
          <Input
            label="Email Subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="🔥 Summer Sale - Up to 50% Off!"
            required
          />

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Template
            </label>
            <select
              name="template_id"
              value={formData.template_id}
              onChange={handleChange}
              className="input"
            >
              <option value="">Select template (optional)</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campaign Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Type
            </label>
            <select
              name="campaign_type"
              value={formData.campaign_type}
              onChange={handleChange}
              className="input"
            >
              <option value="one_time">One Time</option>
              <option value="recurring">Recurring</option>
            </select>
          </div>

          {/* Audience Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send To
            </label>
            <select
              name="audience_type"
              value={formData.audience_type}
              onChange={handleChange}
              className="input"
            >
              <option value="all_contacts">All Contacts</option>
              <option value="segment">Specific Segment</option>
              <option value="custom_list">Custom Email List</option>
            </select>
          </div>

          {/* Custom Email List (if custom_list selected) */}
          {formData.audience_type === 'custom_list' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email List (comma or newline separated)
              </label>
              <textarea
                name="custom_recipient_list"
                value={formData.custom_recipient_list}
                onChange={handleChange}
                rows={4}
                className="input"
                placeholder="email1@example.com, email2@example.com&#10;email3@example.com"
              />
            </div>
          )}

          {/* Scheduling */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule (optional)
            </label>
            <input
              type="datetime-local"
              name="scheduled_at"
              value={formData.scheduled_at}
              onChange={handleChange}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to send immediately
            </p>
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
              icon={formData.scheduled_at ? <MdSchedule /> : <MdSend />}
              loading={loading}
            >
              {formData.scheduled_at ? 'Schedule Campaign' : 'Create & Send'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default CreateCampaignModal

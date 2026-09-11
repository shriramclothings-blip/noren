import { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { MdClose, MdSchedule } from 'react-icons/md'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const CreateBroadcastModal = ({ isOpen, onClose, onSuccess, editingBroadcast }) => {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    template_id: '',
    company_name: 'Dinesh Global Pvt Ltd',
    frequency: 'daily',
    custom_days: [],
    send_time: '09:00',
    send_hour: '09',
    send_minute: '00',
    send_period: 'AM',
    audience_type: 'all_contacts',
    custom_recipient_list: '',
    is_active: true
  })

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      if (editingBroadcast) {
        // Parse 24-hour time to 12-hour
        const time24 = editingBroadcast.send_time || '09:00';
        const [hours24, minutes] = time24.split(':');
        const hour24 = parseInt(hours24);
        const period = hour24 >= 12 ? 'PM' : 'AM';
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;

        setFormData({
          name: editingBroadcast.name || '',
          description: editingBroadcast.description || '',
          subject: editingBroadcast.subject || '',
          template_id: editingBroadcast.template_id || '',
          company_name: editingBroadcast.company_name || 'Dinesh Global Pvt Ltd',
          frequency: editingBroadcast.frequency || 'daily',
          custom_days: editingBroadcast.custom_days || [],
          send_time: time24,
          send_hour: hour12.toString().padStart(2, '0'),
          send_minute: minutes || '00',
          send_period: period,
          audience_type: editingBroadcast.audience_type || 'all_contacts',
          custom_recipient_list: editingBroadcast.custom_recipient_list || '',
          is_active: editingBroadcast.is_active !== undefined ? editingBroadcast.is_active : true
        })
      } else {
        // Reset for new broadcast
        setFormData({
          name: '',
          description: '',
          subject: '',
          template_id: '',
          company_name: 'Dinesh Global Pvt Ltd',
          frequency: 'daily',
          custom_days: [],
          send_time: '09:00',
          send_hour: '09',
          send_minute: '00',
          send_period: 'AM',
          audience_type: 'all_contacts',
          custom_recipient_list: '',
          is_active: true
        })
      }
    }
  }, [isOpen, editingBroadcast])

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
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Update send_time when hour, minute, or period changes
      if (name === 'send_hour' || name === 'send_minute' || name === 'send_period') {
        const hour = name === 'send_hour' ? value : prev.send_hour;
        const minute = name === 'send_minute' ? value : prev.send_minute;
        const period = name === 'send_period' ? value : prev.send_period;
        
        // Convert to 24-hour format
        let hour24 = parseInt(hour);
        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        
        updated.send_time = `${hour24.toString().padStart(2, '0')}:${minute}`;
      }

      return updated;
    });
  }

  const handleDayToggle = (day) => {
    setFormData(prev => {
      const days = prev.custom_days.includes(day)
        ? prev.custom_days.filter(d => d !== day)
        : [...prev.custom_days, day].sort((a, b) => a - b)
      return { ...prev, custom_days: days }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Broadcast name is required')
      return
    }

    if (!formData.subject.trim()) {
      toast.error('Email subject is required')
      return
    }

    if (!formData.send_time) {
      toast.error('Send time is required')
      return
    }

    if (formData.frequency === 'custom' && formData.custom_days.length === 0) {
      toast.error('Please select at least one day for custom frequency')
      return
    }

    setLoading(true)

    try {
      const broadcastData = {
        ...formData,
        company_name: formData.company_name || 'Dinesh Global Pvt Ltd'
      }

      if (editingBroadcast) {
        await emailService.updateBroadcast(editingBroadcast.id, broadcastData)
        toast.success('Broadcast updated successfully!')
      } else {
        await emailService.createBroadcast(broadcastData)
        toast.success('Broadcast created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error.message || `Failed to ${editingBroadcast ? 'update' : 'create'} broadcast`)
    } finally {
      setLoading(false)
    }
  }

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingBroadcast ? 'Edit' : 'Create'} Scheduled Broadcast
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Broadcast Name */}
          <Input
            label="Broadcast Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Daily Newsletter"
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
              placeholder="Daily newsletter with latest updates and tips"
            />
          </div>

          {/* Company Name */}
          <Input
            label="Company Name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            placeholder="Dinesh Global Pvt Ltd"
          />
          <p className="text-xs text-gray-500 -mt-2">
            This will be displayed in the email template
          </p>

          {/* Email Subject */}
          <Input
            label="Email Subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Daily Update from Dinesh Global"
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
              <option value="">Use custom content</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="daily">Daily (Every day)</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom (Select days)</option>
              <option value="one_time">One Time</option>
            </select>
          </div>

          {/* Custom Days Selection */}
          {formData.frequency === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Days
              </label>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeek.map(day => (
                  <label
                    key={day.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.custom_days.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Send Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send Time
            </label>
            <div className="flex space-x-2">
              {/* Hour */}
              <select
                name="send_hour"
                value={formData.send_hour}
                onChange={handleChange}
                className="input flex-1"
                required
              >
                <option value="01">01</option>
                <option value="02">02</option>
                <option value="03">03</option>
                <option value="04">04</option>
                <option value="05">05</option>
                <option value="06">06</option>
                <option value="07">07</option>
                <option value="08">08</option>
                <option value="09">09</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
              </select>
              
              <span className="text-2xl text-gray-500 self-center">:</span>
              
              {/* Minute */}
              <select
                name="send_minute"
                value={formData.send_minute}
                onChange={handleChange}
                className="input flex-1"
                required
              >
                <option value="00">00</option>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </select>
              
              {/* AM/PM */}
              <select
                name="send_period"
                value={formData.send_period}
                onChange={handleChange}
                className="input flex-1"
                required
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Emails will be sent at this time (e.g., 09:00 AM)
            </p>
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
              <option value="subscribers">Subscribers Only</option>
              <option value="customers">Customers Only</option>
              <option value="custom_list">Custom Email List</option>
            </select>
          </div>

          {/* Custom Email List */}
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
              Start broadcast immediately (will send at next scheduled time)
            </label>
          </div>

          {/* Preview Info */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-gray-900 mb-2">📋 Broadcast Summary</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• <strong>Frequency:</strong> {formData.frequency === 'daily' ? 'Every day' : formData.frequency === 'weekly' ? 'Weekly' : formData.frequency === 'custom' ? `${formData.custom_days.length} days/week` : 'One time'}</li>
              <li>• <strong>Time:</strong> {formData.send_time}</li>
              <li>• <strong>Company:</strong> {formData.company_name}</li>
              <li>• <strong>Audience:</strong> {formData.audience_type === 'all_contacts' ? 'All contacts' : formData.audience_type === 'subscribers' ? 'Subscribers' : formData.audience_type === 'customers' ? 'Customers' : 'Custom list'}</li>
            </ul>
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
              icon={<MdSchedule />}
              loading={loading}
            >
              {editingBroadcast ? 'Update' : 'Create'} Broadcast
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default CreateBroadcastModal

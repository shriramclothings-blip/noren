import { useState } from 'react'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { MdClose, MdPersonAdd } from 'react-icons/md'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const AddContactModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    company: '',
    tags: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      // The contacts are auto-collected from users, customers, etc.
      // For manual addition, we'll create a custom contact entry
      const contactData = {
        email: formData.email.trim(),
        name: formData.name.trim() || null,
        phone: formData.phone.trim() || null,
        metadata: {
          company: formData.company.trim() || null,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
        },
        source_type: 'manual',
        status: 'active'
      }

      await emailService.addContact(contactData)
      toast.success('Contact added successfully!')
      onSuccess()
      onClose()
      setFormData({
        email: '',
        name: '',
        phone: '',
        company: '',
        tags: ''
      })
    } catch (error) {
      toast.error(error.message || 'Failed to add contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Contact</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contact@example.com"
            required
          />

          {/* Name */}
          <Input
            label="Name (optional)"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
          />

          {/* Phone */}
          <Input
            label="Phone (optional)"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 234 567 8900"
          />

          {/* Company */}
          <Input
            label="Company (optional)"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Acme Inc."
          />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (optional)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="input"
              placeholder="vip, customer, subscriber (comma separated)"
            />
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
              icon={<MdPersonAdd />}
              loading={loading}
            >
              Add Contact
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default AddContactModal

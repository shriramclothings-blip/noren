import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdSend, MdSave, MdAttachFile } from 'react-icons/md'
import Card from '@/components/common/Card'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const Compose = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSend = async () => {
    if (!formData.to || !formData.subject || !formData.body) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      await emailService.sendEmail(formData)
      toast.success('Email sent successfully!')
      navigate('/sent')
    } catch (error) {
      toast.error(error.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    try {
      await emailService.saveDraft(formData)
      toast.success('Draft saved!')
    } catch (error) {
      toast.error('Failed to save draft')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card
        title="Compose Email"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft} icon={<MdSave />}>
              Save Draft
            </Button>
            <Button size="sm" onClick={handleSend} loading={loading} icon={<MdSend />}>
              Send
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="To"
            name="to"
            value={formData.to}
            onChange={handleChange}
            placeholder="recipient@example.com"
            required
            fullWidth
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cc"
              name="cc"
              value={formData.cc}
              onChange={handleChange}
              placeholder="cc@example.com"
              fullWidth
            />
            <Input
              label="Bcc"
              name="bcc"
              value={formData.bcc}
              onChange={handleChange}
              placeholder="bcc@example.com"
              fullWidth
            />
          </div>

          <Input
            label="Subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Email subject"
            required
            fullWidth
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleChange}
              rows={12}
              className="input"
              placeholder="Write your email..."
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" icon={<MdAttachFile />}>
              Attach File
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Compose
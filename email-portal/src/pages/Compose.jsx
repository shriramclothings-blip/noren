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
      // Parse email addresses (comma or semicolon separated)
      const parseEmails = (emailString) => {
        if (!emailString || !emailString.trim()) return []
        return emailString
          .split(/[,;]/)
          .map(e => e.trim())
          .filter(e => e)
          .map(email => ({ email, name: null, type: 'other' }))
      }

      // Format data for backend API
      const emailData = {
        recipients: parseEmails(formData.to),
        subject: formData.subject,
        body_html: formData.body,
        body_plain: formData.body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
        cc: formData.cc ? formData.cc.split(/[,;]/).map(e => e.trim()).filter(e => e) : [],
        bcc: formData.bcc ? formData.bcc.split(/[,;]/).map(e => e.trim()).filter(e => e) : []
      }

      await emailService.sendEmail(emailData)
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
      const parseEmails = (emailString) => {
        if (!emailString || !emailString.trim()) return []
        return emailString
          .split(/[,;]/)
          .map(e => e.trim())
          .filter(e => e)
          .map(email => ({ email }))
      }

      const draftData = {
        recipients: parseEmails(formData.to),
        cc: parseEmails(formData.cc),
        bcc: parseEmails(formData.bcc),
        subject: formData.subject,
        body_html: formData.body,
        body_plain: formData.body.replace(/<[^>]*>/g, '')
      }

      await emailService.saveDraft(draftData)
      toast.success('Draft saved!')
    } catch (error) {
      toast.error(error.message || 'Failed to save draft')
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
            placeholder="recipient@example.com (comma-separated for multiple)"
            required
            fullWidth
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cc"
              name="cc"
              value={formData.cc}
              onChange={handleChange}
              placeholder="cc@example.com (optional)"
              fullWidth
            />
            <Input
              label="Bcc"
              name="bcc"
              value={formData.bcc}
              onChange={handleChange}
              placeholder="bcc@example.com (optional)"
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
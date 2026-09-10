import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import { MdDescription, MdAdd } from 'react-icons/md'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const Templates = () => {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const data = await emailService.getTemplates()
      setTemplates(data.templates || [])
    } catch (error) {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading text="Loading templates..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <Button icon={<MdAdd />}>Create Template</Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={MdDescription}
            title="No templates"
            description="Create reusable email templates to save time."
            actionLabel="Create Template"
            onAction={() => toast.info('Template creation coming soon')}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{template.subject}</p>
              <div className="flex items-center justify-between">
                <Badge variant="primary">{template.category}</Badge>
                <Button size="sm" variant="ghost">Use Template</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Templates
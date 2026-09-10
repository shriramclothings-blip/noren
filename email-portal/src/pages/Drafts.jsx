import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import { MdDrafts } from 'react-icons/md'
import emailService from '@/services/emailService'
import { formatDateTime } from '@/utils/formatting'
import toast from 'react-hot-toast'

const Drafts = () => {
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState([])

  useEffect(() => {
    loadDrafts()
  }, [])

  const loadDrafts = async () => {
    try {
      const data = await emailService.getDrafts()
      setDrafts(data.drafts || [])
    } catch (error) {
      toast.error('Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading text="Loading drafts..." />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Drafts</h1>
      <Card>
        {drafts.length === 0 ? (
          <EmptyState
            icon={MdDrafts}
            title="No drafts"
            description="Your draft emails will appear here."
          />
        ) : (
          <div className="divide-y">
            {drafts.map((draft) => (
              <div key={draft.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{draft.to_email || 'No recipient'}</p>
                    <p className="text-sm text-gray-600">{draft.subject || 'No subject'}</p>
                  </div>
                  <span className="text-sm text-gray-500">{formatDateTime(draft.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default Drafts
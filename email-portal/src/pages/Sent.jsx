import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import { MdSend, MdAdd } from 'react-icons/md'
import emailService from '@/services/emailService'
import { formatDateTime } from '@/utils/formatting'
import toast from 'react-hot-toast'

const Sent = () => {
  const [loading, setLoading] = useState(true)
  const [emails, setEmails] = useState([])

  useEffect(() => {
    loadSentEmails()
  }, [])

  const loadSentEmails = async () => {
    try {
      const data = await emailService.getSentEmails({ limit: 50 })
      setEmails(data.emails || [])
    } catch (error) {
      toast.error('Failed to load sent emails')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading text="Loading sent emails..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sent Emails</h1>
        <Link to="/compose">
          <Button icon={<MdAdd />}>Compose Email</Button>
        </Link>
      </div>

      <Card>
        {emails.length === 0 ? (
          <EmptyState
            icon={MdSend}
            title="No sent emails"
            description="Emails you send will appear here."
            actionLabel="Compose Email"
            onAction={() => window.location.href = '/compose'}
          />
        ) : (
          <div className="overflow-hidden">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">To</th>
                  <th className="table-header-cell">Subject</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Sent</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {emails.map((email) => (
                  <tr key={email.id} className="table-row">
                    <td className="table-cell font-medium text-gray-900">{email.to_email}</td>
                    <td className="table-cell text-gray-500">{email.subject}</td>
                    <td className="table-cell">
                      <Badge variant={email.status === 'delivered' ? 'success' : 'gray'}>
                        {email.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {formatDateTime(email.sent_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Sent
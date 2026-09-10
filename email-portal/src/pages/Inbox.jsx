import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import { MdInbox } from 'react-icons/md'

const Inbox = () => {
  const [loading, setLoading] = useState(true)
  const [emails, setEmails] = useState([])

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }, [])

  if (loading) return <Loading text="Loading inbox..." />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inbox</h1>
      <Card>
        <EmptyState
          icon={MdInbox}
          title="No emails in inbox"
          description="Your inbox is empty. Emails you receive will appear here."
        />
      </Card>
    </div>
  )
}

export default Inbox
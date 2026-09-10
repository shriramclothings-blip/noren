import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import { MdContacts, MdAdd, MdFileUpload } from 'react-icons/md'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const Contacts = () => {
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const data = await emailService.getContacts({ limit: 50 })
      setContacts(data.contacts || [])
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading text="Loading contacts..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <div className="flex space-x-2">
          <Button variant="outline" icon={<MdFileUpload />}>Import</Button>
          <Button icon={<MdAdd />}>Add Contact</Button>
        </div>
      </div>

      <Card>
        {contacts.length === 0 ? (
          <EmptyState
            icon={MdContacts}
            title="No contacts"
            description="Add contacts or import from a file."
            actionLabel="Add Contact"
            onAction={() => toast.info('Contact management coming soon')}
          />
        ) : (
          <div className="overflow-hidden">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Status</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {contacts.map((contact) => (
                  <tr key={contact.email} className="table-row">
                    <td className="table-cell font-medium text-gray-900">{contact.email}</td>
                    <td className="table-cell text-gray-500">{contact.name || '-'}</td>
                    <td className="table-cell text-gray-500">{contact.source_type}</td>
                    <td className="table-cell text-gray-500">{contact.status}</td>
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

export default Contacts
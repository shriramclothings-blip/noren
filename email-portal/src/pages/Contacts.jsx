import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import Input from '@/components/common/Input'
import AddContactModal from '@/components/contacts/AddContactModal'
import ImportContactsModal from '@/components/contacts/ImportContactsModal'
import { MdContacts, MdAdd, MdFileUpload, MdSearch, MdEmail, MdDelete } from 'react-icons/md'
import emailService from '@/services/emailService'
import { formatDateTime } from '@/utils/formatting'
import toast from 'react-hot-toast'

const Contacts = () => {
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)

  useEffect(() => {
    loadContacts()
  }, [search, typeFilter, page])

  const loadContacts = async () => {
    setLoading(true)
    try {
      const params = {
        limit: 50,
        offset: (page - 1) * 50,
        search: search || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      }
      const data = await emailService.getContacts(params)
      setContacts(data.contacts || [])
      setTotalContacts(data.total || 0)
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (email) => {
    if (!confirm(`Delete contact ${email}?`)) return
    
    try {
      await emailService.deleteContact(email)
      toast.success('Contact deleted')
      loadContacts()
    } catch (error) {
      toast.error('Failed to delete contact')
    }
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1) // Reset to first page on search
  }

  const getTypeBadgeVariant = (type) => {
    switch (type) {
      case 'customer': return 'success'
      case 'subscriber': return 'info'
      case 'manual': return 'gray'
      default: return 'gray'
    }
  }

  const totalPages = Math.ceil(totalContacts / 50)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            icon={<MdFileUpload />}
            onClick={() => setShowImportModal(true)}
          >
            Import
          </Button>
          <Button 
            icon={<MdAdd />}
            onClick={() => setShowAddModal(true)}
          >
            Add Contact
          </Button>
        </div>
      </div>

      <Card>
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search by email or name..."
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="w-48">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="input"
              >
                <option value="all">All Types</option>
                <option value="customer">Customers</option>
                <option value="subscriber">Subscribers</option>
                <option value="seller">Sellers</option>
                <option value="influencer">Influencers</option>
                <option value="employee">Employees</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total: {totalContacts} contacts</span>
            {totalPages > 1 && (
              <span>Page {page} of {totalPages}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12">
            <Loading text="Loading contacts..." />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={MdContacts}
            title="No contacts"
            description={search ? 'No contacts match your search' : 'Add contacts or import from a file.'}
            actionLabel={search ? undefined : "Add Contact"}
            onAction={search ? undefined : () => setShowAddModal(true)}
          />
        ) : (
          <>
            <div className="overflow-hidden">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Email</th>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell">Type</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Added</th>
                    <th className="table-header-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {contacts.map((contact) => (
                    <tr key={contact.email} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <MdEmail className="text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">
                            {contact.email}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">
                        {contact.name || '-'}
                      </td>
                      <td className="table-cell">
                        <Badge variant={getTypeBadgeVariant(contact.source_type)}>
                          {contact.source_type}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Badge variant={contact.status === 'active' ? 'success' : 'gray'}>
                          {contact.status || 'active'}
                        </Badge>
                      </td>
                      <td className="table-cell text-gray-500 text-sm">
                        {contact.created_at ? formatDateTime(contact.created_at) : '-'}
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => handleDelete(contact.email)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete contact"
                        >
                          <MdDelete size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadContacts}
      />

      <ImportContactsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadContacts}
      />
    </div>
  )
}

export default Contacts
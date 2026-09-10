import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import CreateCampaignModal from '@/components/campaigns/CreateCampaignModal'
import { MdCampaign, MdAdd, MdDelete, MdVisibility, MdSend } from 'react-icons/md'
import emailService from '@/services/emailService'
import { formatNumber, formatPercentage, formatDateTime } from '@/utils/formatting'
import toast from 'react-hot-toast'

const Campaigns = () => {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const data = await emailService.getCampaigns()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    
    setDeletingId(id)
    try {
      await emailService.deleteCampaign(id)
      toast.success('Campaign deleted')
      loadCampaigns()
    } catch (error) {
      toast.error('Failed to delete campaign')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSendNow = async (campaign) => {
    if (!confirm(`Send campaign "${campaign.name}" now?`)) return
    
    try {
      await emailService.sendCampaign(campaign.id)
      toast.success('Campaign sent successfully!')
      loadCampaigns()
    } catch (error) {
      toast.error('Failed to send campaign')
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'sent': return 'success'
      case 'scheduled': return 'info'
      case 'draft': return 'gray'
      case 'sending': return 'warning'
      default: return 'gray'
    }
  }

  if (loading) return <Loading text="Loading campaigns..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Button icon={<MdAdd />} onClick={() => setShowCreateModal(true)}>
          Create Campaign
        </Button>
      </div>

      <Card>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={MdCampaign}
            title="No campaigns"
            description="Create your first email campaign to reach your audience."
            actionLabel="Create Campaign"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="overflow-hidden">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Campaign</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Recipients</th>
                  <th className="table-header-cell">Sent</th>
                  <th className="table-header-cell">Open Rate</th>
                  <th className="table-header-cell">Created</th>
                  <th className="table-header-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="table-row">
                    <td className="table-cell">
                      <div>
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {campaign.name}
                        </Link>
                        {campaign.subject && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {campaign.subject}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant={getStatusBadgeVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {campaign.campaign_type || 'one_time'}
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatNumber(campaign.recipient_count || 0)}
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatNumber(campaign.sent_count || 0)}
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatPercentage(campaign.open_rate || 0)}
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {formatDateTime(campaign.created_at)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="text-gray-400 hover:text-gray-600"
                          title="View details"
                        >
                          <MdVisibility size={18} />
                        </Link>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleSendNow(campaign)}
                            className="text-blue-400 hover:text-blue-600"
                            title="Send now"
                          >
                            <MdSend size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          disabled={deletingId === campaign.id}
                          className="text-red-400 hover:text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadCampaigns}
      />
    </div>
  )
}

export default Campaigns
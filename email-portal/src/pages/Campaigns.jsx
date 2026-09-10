import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import { MdCampaign, MdAdd } from 'react-icons/md'
import emailService from '@/services/emailService'
import { formatNumber, formatPercentage, formatDateTime } from '@/utils/formatting'
import toast from 'react-hot-toast'

const Campaigns = () => {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState([])

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

  if (loading) return <Loading text="Loading campaigns..." />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Button icon={<MdAdd />}>Create Campaign</Button>
      </div>

      <Card>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={MdCampaign}
            title="No campaigns"
            description="Create your first email campaign to reach your audience."
            actionLabel="Create Campaign"
            onAction={() => toast.info('Campaign creation coming soon')}
          />
        ) : (
          <div className="overflow-hidden">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Campaign</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Recipients</th>
                  <th className="table-header-cell">Open Rate</th>
                  <th className="table-header-cell">Click Rate</th>
                  <th className="table-header-cell">Created</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="table-row">
                    <td className="table-cell">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <Badge variant={campaign.status === 'sent' ? 'success' : 'gray'}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatNumber(campaign.recipient_count || 0)}
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatPercentage(campaign.open_rate || 0)}
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatPercentage(campaign.click_rate || 0)}
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {formatDateTime(campaign.created_at)}
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

export default Campaigns
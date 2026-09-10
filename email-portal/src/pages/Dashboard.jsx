import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdEmail, MdCampaign, MdContacts, MdTrendingUp, MdArrowForward } from 'react-icons/md'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import Badge from '@/components/common/Badge'
import emailService from '@/services/emailService'
import { formatNumber, formatPercentage } from '@/utils/formatting'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSent: 0,
    totalCampaigns: 0,
    totalContacts: 0,
    avgOpenRate: 0
  })
  const [recentCampaigns, setRecentCampaigns] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load analytics overview
      const analyticsData = await emailService.getAnalyticsOverview({ days: 30 })
      if (analyticsData) {
        setStats({
          totalSent: analyticsData.total_sent || 0,
          totalCampaigns: analyticsData.total_campaigns || 0,
          totalContacts: analyticsData.total_contacts || 0,
          avgOpenRate: analyticsData.avg_open_rate || 0
        })
      }

      // Load recent campaigns
      const campaignsData = await emailService.getCampaigns({ limit: 5, sort: 'newest' })
      if (campaignsData?.campaigns) {
        setRecentCampaigns(campaignsData.campaigns)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading text="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening with your email campaigns.
        </p>
        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Demo Mode - Backend Integration Pending
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding={false}>
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <MdEmail className="w-6 h-6 text-primary-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sent</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalSent)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <MdCampaign className="w-6 h-6 text-success-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalCampaigns)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                  <MdContacts className="w-6 h-6 text-warning-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalContacts)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MdTrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Open Rate</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(stats.avgOpenRate)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card
        title="Recent Campaigns"
        actions={
          <Link
            to="/campaigns"
            className="text-sm font-medium text-primary-600 hover:text-primary-500 flex items-center"
          >
            View all
            <MdArrowForward className="ml-1" />
          </Link>
        }
      >
        {recentCampaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No campaigns yet</p>
            <Link to="/campaigns" className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-500">
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Campaign</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Recipients</th>
                  <th className="table-header-cell">Open Rate</th>
                  <th className="table-header-cell">Created</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {recentCampaigns.map((campaign) => (
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
                      <Badge variant={campaign.status === 'sent' ? 'success' : 'warning'}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatNumber(campaign.recipient_count || 0)}
                    </td>
                    <td className="table-cell text-gray-500">
                      {formatPercentage(campaign.open_rate || 0)}
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Link to="/compose">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <MdEmail className="w-5 h-5 text-primary-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Compose Email</p>
                <p className="text-xs text-gray-500">Send a new email</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/campaigns">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <MdCampaign className="w-5 h-5 text-success-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Create Campaign</p>
                <p className="text-xs text-gray-500">Start a new campaign</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/analytics">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MdTrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">View Analytics</p>
                <p className="text-xs text-gray-500">Track performance</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
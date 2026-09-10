import Card from '@/components/common/Card'
import { MdAnalytics } from 'react-icons/md'

const Analytics = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card padding={false}>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Emails Sent</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
        </Card>
        
        <Card padding={false}>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Average Open Rate</p>
            <p className="text-2xl font-bold text-gray-900">0%</p>
          </div>
        </Card>
        
        <Card padding={false}>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Average Click Rate</p>
            <p className="text-2xl font-bold text-gray-900">0%</p>
          </div>
        </Card>
        
        <Card padding={false}>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Bounce Rate</p>
            <p className="text-2xl font-bold text-gray-900">0%</p>
          </div>
        </Card>
      </div>

      <Card title="Performance Over Time">
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <MdAnalytics className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>Analytics charts coming soon...</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Analytics
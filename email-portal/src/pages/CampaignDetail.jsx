import { useParams } from 'react-router-dom'
import Card from '@/components/common/Card'

const CampaignDetail = () => {
  const { id } = useParams()
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Campaign Details</h1>
      <Card>
        <p className="text-gray-600">Campaign ID: {id}</p>
        <p className="mt-2 text-sm text-gray-500">Detailed campaign view coming soon...</p>
      </Card>
    </div>
  )
}

export default CampaignDetail
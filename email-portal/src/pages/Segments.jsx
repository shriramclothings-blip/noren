import Card from '@/components/common/Card'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import { MdPeople, MdAdd } from 'react-icons/md'
import toast from 'react-hot-toast'

const Segments = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audience Segments</h1>
        <Button icon={<MdAdd />}>Create Segment</Button>
      </div>

      <Card>
        <EmptyState
          icon={MdPeople}
          title="No segments"
          description="Create audience segments to target specific groups of contacts."
          actionLabel="Create Segment"
          onAction={() => toast.info('Segment creation coming soon')}
        />
      </Card>
    </div>
  )
}

export default Segments
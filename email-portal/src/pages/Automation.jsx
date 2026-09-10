import Card from '@/components/common/Card'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/common/Button'
import { MdAutorenew, MdAdd } from 'react-icons/md'
import toast from 'react-hot-toast'

const Automation = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Automation</h1>
        <Button icon={<MdAdd />}>Create Automation</Button>
      </div>

      <Card>
        <EmptyState
          icon={MdAutorenew}
          title="No automations"
          description="Create automated email workflows to engage your audience."
          actionLabel="Create Automation"
          onAction={() => toast.info('Automation creation coming soon')}
        />
      </Card>
    </div>
  )
}

export default Automation
import { MdInbox } from 'react-icons/md'
import Button from './Button'

const EmptyState = ({ 
  icon: Icon = MdInbox,
  title = 'No data found',
  description = '',
  action = null,
  actionLabel = '',
  onAction = null
}) => {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
      )}
      {(action || (actionLabel && onAction)) && (
        <div className="mt-6">
          {action || (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
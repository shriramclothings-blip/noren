import clsx from 'clsx'

const Card = ({ 
  children, 
  title = '', 
  subtitle = '',
  actions = null,
  footer = null,
  className = '',
  padding = true,
  ...props 
}) => {
  return (
    <div className={clsx('card', className)} {...props}>
      {(title || subtitle || actions) && (
        <div className="card-header flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}
      
      <div className={padding ? 'card-body' : ''}>
        {children}
      </div>
      
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  )
}

export default Card
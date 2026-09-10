import { getInitials, getAvatarColor } from '@/utils/helpers'

const Avatar = ({ 
  name = '', 
  src = null,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }

  const bgColor = getAvatarColor(name)
  const initials = getInitials(name)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  )
}

export default Avatar
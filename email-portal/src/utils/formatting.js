import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

// Format date for display
export const formatDate = (date, formatString = 'MMM d, yyyy') => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatString)
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

// Format datetime for display
export const formatDateTime = (date) => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (isToday(dateObj)) {
      return `Today at ${format(dateObj, 'h:mm a')}`
    } else if (isYesterday(dateObj)) {
      return `Yesterday at ${format(dateObj, 'h:mm a')}`
    } else {
      return format(dateObj, 'MMM d, yyyy \'at\' h:mm a')
    }
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return ''
  }
}

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return ''
  }
}

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

// Format number with commas
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString()
}

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%'
  return `${(value * 100).toFixed(decimals)}%`
}

// Format currency
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '$0.00'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') return ''
  
  if (text.length <= maxLength) return text
  
  return text.substring(0, maxLength - suffix.length).trim() + suffix
}

// Strip HTML tags
export const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return ''
  
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

// Extract plain text with word limit
export const extractText = (html, wordLimit = 50) => {
  if (!html) return ''
  
  const text = stripHtml(html)
  const words = text.split(/\s+/).filter(word => word.length > 0)
  
  if (words.length <= wordLimit) return text
  
  return words.slice(0, wordLimit).join(' ') + '...'
}

// Capitalize first letter
export const capitalize = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Convert to title case
export const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return ''
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Format email address for display (hide part of email)
export const formatEmailAddress = (email, hidePartial = false) => {
  if (!email || typeof email !== 'string') return ''
  
  if (!hidePartial) return email
  
  const [localPart, domain] = email.split('@')
  if (!domain) return email
  
  const hiddenLocal = localPart.length > 2 
    ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
    : localPart
    
  return `${hiddenLocal}@${domain}`
}

// Format campaign status for display
export const formatCampaignStatus = (status) => {
  const statusMap = {
    'draft': 'Draft',
    'scheduled': 'Scheduled',
    'sending': 'Sending',
    'sent': 'Sent',
    'paused': 'Paused',
    'cancelled': 'Cancelled',
    'failed': 'Failed'
  }
  
  return statusMap[status] || capitalize(status)
}

// Format template category
export const formatTemplateCategory = (category) => {
  const categoryMap = {
    'marketing': 'Marketing',
    'transactional': 'Transactional',
    'newsletter': 'Newsletter',
    'welcome': 'Welcome',
    'announcement': 'Announcement',
    'promotion': 'Promotion',
    'other': 'Other'
  }
  
  return categoryMap[category] || toTitleCase(category)
}

// Format email metrics
export const formatEmailMetrics = (metrics) => {
  if (!metrics || typeof metrics !== 'object') return {}
  
  return {
    sent: formatNumber(metrics.sent || 0),
    delivered: formatNumber(metrics.delivered || 0),
    opened: formatNumber(metrics.opened || 0),
    clicked: formatNumber(metrics.clicked || 0),
    bounced: formatNumber(metrics.bounced || 0),
    unsubscribed: formatNumber(metrics.unsubscribed || 0),
    openRate: formatPercentage(metrics.open_rate || 0),
    clickRate: formatPercentage(metrics.click_rate || 0),
    bounceRate: formatPercentage(metrics.bounce_rate || 0),
    unsubscribeRate: formatPercentage(metrics.unsubscribe_rate || 0)
  }
}
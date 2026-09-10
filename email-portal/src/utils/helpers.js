import { ADMIN_ROLES, MARKETING_ROLES } from './constants'

// Check if user has admin role
export const isAdmin = (user) => {
  return user && ADMIN_ROLES.includes(user.role)
}

// Check if user has marketing access
export const hasMarketingAccess = (user) => {
  return user && MARKETING_ROLES.includes(user.role)
}

// Check if user has specific role
export const hasRole = (user, roles) => {
  if (!user || !user.role) return false
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(user.role)
}

// Generate unique ID
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Deep clone object
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

// Debounce function
export const debounce = (func, wait = 300) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function
export const throttle = (func, limit = 300) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Download file from blob
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// Copy text to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      textArea.remove()
      return true
    } catch (error) {
      textArea.remove()
      return false
    }
  }
}

// Get initials from name
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?'
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Generate random color for avatar
export const getAvatarColor = (name) => {
  if (!name || typeof name !== 'string') return '#6b7280'
  
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
  ]
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  return colors[Math.abs(hash) % colors.length]
}

// Parse query string to object
export const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString)
  const result = {}
  
  for (const [key, value] of params.entries()) {
    result[key] = value
  }
  
  return result
}

// Build query string from object
export const buildQueryString = (params) => {
  const searchParams = new URLSearchParams()
  
  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, value)
    }
  })
  
  return searchParams.toString()
}

// Group array by key
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key]
    if (!result[group]) {
      result[group] = []
    }
    result[group].push(item)
    return result
  }, {})
}

// Sort array of objects
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal === bVal) return 0
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
}

// Remove duplicates from array
export const unique = (array, key = null) => {
  if (!key) {
    return [...new Set(array)]
  }
  
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

// Chunk array into smaller arrays
export const chunk = (array, size) => {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Calculate percentage
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0
  return (value / total) * 100
}

// Format error message for display
export const formatErrorMessage = (error) => {
  if (typeof error === 'string') return error
  
  if (error.message) return error.message
  
  if (error.response?.data?.message) return error.response.data.message
  
  return 'An unexpected error occurred'
}

// Check if object is empty
export const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true
  if (Array.isArray(obj)) return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

// Wait for specified milliseconds
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Retry async function
export const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  let lastError
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await sleep(delay * attempt)
      }
    }
  }
  
  throw lastError
}

// Convert camelCase to Title Case
export const camelToTitle = (str) => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

// Get status color
export const getStatusColor = (status) => {
  const colorMap = {
    draft: 'gray',
    scheduled: 'blue',
    sending: 'yellow',
    sent: 'green',
    delivered: 'green',
    paused: 'orange',
    cancelled: 'red',
    failed: 'red',
    bounced: 'red',
    active: 'green',
    inactive: 'gray'
  }
  
  return colorMap[status?.toLowerCase()] || 'gray'
}

// Get status badge class
export const getStatusBadgeClass = (status) => {
  const color = getStatusColor(status)
  return `badge-${color}`
}

// Calculate reading time
export const calculateReadingTime = (text, wordsPerMinute = 200) => {
  if (!text) return 0
  
  const words = text.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  
  return minutes
}

// Sanitize HTML (basic)
export const sanitizeHtml = (html) => {
  const temp = document.createElement('div')
  temp.textContent = html
  return temp.innerHTML
}

// Check if mobile device
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Get browser info
export const getBrowserInfo = () => {
  const ua = navigator.userAgent
  let browser = 'Unknown'
  
  if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Edge')) browser = 'Edge'
  else if (ua.includes('Opera')) browser = 'Opera'
  
  return {
    browser,
    isMobile: isMobile(),
    userAgent: ua
  }
}

export default {
  isAdmin,
  hasMarketingAccess,
  hasRole,
  generateId,
  deepClone,
  debounce,
  throttle,
  downloadFile,
  copyToClipboard,
  getInitials,
  getAvatarColor,
  parseQueryString,
  buildQueryString,
  groupBy,
  sortBy,
  unique,
  chunk,
  calculatePercentage,
  formatErrorMessage,
  isEmpty,
  sleep,
  retry,
  camelToTitle,
  getStatusColor,
  getStatusBadgeClass,
  calculateReadingTime,
  sanitizeHtml,
  isMobile,
  getBrowserInfo
}
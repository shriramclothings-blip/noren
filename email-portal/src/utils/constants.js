// Application constants

// Campaign statuses
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
}

// Template categories
export const TEMPLATE_CATEGORY = {
  MARKETING: 'marketing',
  TRANSACTIONAL: 'transactional',
  NEWSLETTER: 'newsletter',
  WELCOME: 'welcome',
  ANNOUNCEMENT: 'announcement',
  PROMOTION: 'promotion',
  OTHER: 'other'
}

// Audience types
export const AUDIENCE_TYPE = {
  SEGMENT: 'segment',
  SUBSCRIBERS: 'subscribers',
  CUSTOMERS: 'customers',
  SELLERS: 'sellers',
  INFLUENCERS: 'influencers',
  EMPLOYEES: 'employees',
  CUSTOM: 'custom'
}

// Email status
export const EMAIL_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  BOUNCED: 'bounced',
  FAILED: 'failed'
}

// User roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  BUSINESS_OWNER: 'business_owner',
  STORE_MANAGER: 'store_manager',
  MARKETING: 'marketing',
  USER: 'user'
}

// Admin roles (full access)
export const ADMIN_ROLES = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.BUSINESS_OWNER
]

// Marketing roles (email portal access)
export const MARKETING_ROLES = [
  ...ADMIN_ROLES,
  USER_ROLES.STORE_MANAGER
]

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0
}

// Date ranges for analytics
export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_90_DAYS: 'last_90_days',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom'
}

// Suppression reasons
export const SUPPRESSION_REASON = {
  UNSUBSCRIBE: 'unsubscribe',
  BOUNCE: 'bounce',
  COMPLAINT: 'complaint',
  MANUAL: 'manual'
}

// Automation triggers
export const AUTOMATION_TRIGGER = {
  USER_SIGNUP: 'user_signup',
  PURCHASE: 'purchase',
  ABANDONED_CART: 'abandoned_cart',
  WELCOME_SERIES: 'welcome_series',
  BIRTHDAY: 'birthday',
  CUSTOM: 'custom'
}

// Automation status
export const AUTOMATION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAUSED: 'paused'
}

// Sort options
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  MOST_POPULAR: 'most_popular'
}

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
}

// Editor toolbar options
export const EDITOR_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ]
}

// Toast notification durations
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000,
  WARNING: 4000
}

// Local storage keys
export const STORAGE_KEYS = {
  AUTH: 'noren-email-auth',
  THEME: 'noren-email-theme',
  SIDEBAR: 'noren-email-sidebar',
  PREFERENCES: 'noren-email-preferences'
}

// API endpoints (relative to base URL)
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  PROFILE: '/auth/profile',
  
  // Email Portal
  TEMPLATES: '/email/templates',
  DRAFTS: '/email/drafts',
  SEND: '/email/send',
  SENT: '/email/sent',
  CAMPAIGNS: '/email/campaigns',
  SEGMENTS: '/email/segments',
  CONTACTS: '/email/contacts',
  SUPPRESSION: '/email/suppression',
  AUTOMATIONS: '/email/automations',
  ANALYTICS: '/email/analytics',
  SETTINGS: '/email/settings'
}

// Chart colors for analytics
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  GRAY: '#6b7280',
  PURPLE: '#8b5cf6',
  PINK: '#ec4899',
  INDIGO: '#6366f1'
}

// Email validation regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Campaign send limits (for safety)
export const CAMPAIGN_LIMITS = {
  MAX_RECIPIENTS: 50000,
  RATE_LIMIT_PER_HOUR: 10000,
  MIN_SCHEDULE_HOURS: 1 // Must schedule at least 1 hour in advance
}

// Draft auto-save interval (milliseconds)
export const DRAFT_AUTOSAVE_INTERVAL = 30000 // 30 seconds

// Metrics refresh interval (milliseconds)
export const METRICS_REFRESH_INTERVAL = 60000 // 1 minute

export default {
  CAMPAIGN_STATUS,
  TEMPLATE_CATEGORY,
  AUDIENCE_TYPE,
  EMAIL_STATUS,
  USER_ROLES,
  ADMIN_ROLES,
  MARKETING_ROLES,
  PAGINATION,
  DATE_RANGES,
  SUPPRESSION_REASON,
  AUTOMATION_TRIGGER,
  AUTOMATION_STATUS,
  SORT_OPTIONS,
  FILE_LIMITS,
  EDITOR_MODULES,
  TOAST_DURATION,
  STORAGE_KEYS,
  API_ENDPOINTS,
  CHART_COLORS,
  EMAIL_REGEX,
  CAMPAIGN_LIMITS,
  DRAFT_AUTOSAVE_INTERVAL,
  METRICS_REFRESH_INTERVAL
}
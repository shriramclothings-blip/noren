// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Multiple email validation (comma or semicolon separated)
export const isValidEmailList = (emailList) => {
  if (!emailList || typeof emailList !== 'string') return false
  
  const emails = emailList
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email.length > 0)
  
  return emails.length > 0 && emails.every(email => isValidEmail(email))
}

// Parse email list into array
export const parseEmailList = (emailList) => {
  if (!emailList || typeof emailList !== 'string') return []
  
  return emailList
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email.length > 0 && isValidEmail(email))
}

// Validate required fields
export const validateRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return value !== null && value !== undefined
}

// Validate email subject (not empty, reasonable length)
export const validateSubject = (subject) => {
  if (!subject || typeof subject !== 'string') return false
  const trimmed = subject.trim()
  return trimmed.length > 0 && trimmed.length <= 200
}

// Validate email body (not empty)
export const validateEmailBody = (body) => {
  if (!body || typeof body !== 'string') return false
  // Remove HTML tags and check if there's actual content
  const textContent = body.replace(/<[^>]*>/g, '').trim()
  return textContent.length > 0
}

// Validate campaign name
export const validateCampaignName = (name) => {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 3 && trimmed.length <= 100
}

// Validate template name
export const validateTemplateName = (name) => {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 50
}

// Validate segment name
export const validateSegmentName = (name) => {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 50
}

// Form validation helper
export const createValidator = (rules) => {
  return (data) => {
    const errors = {}
    
    Object.keys(rules).forEach(field => {
      const value = data[field]
      const fieldRules = rules[field]
      
      fieldRules.forEach(rule => {
        if (typeof rule === 'function') {
          const result = rule(value, data)
          if (result !== true) {
            errors[field] = result
          }
        }
      })
    })
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required') => (value) => {
    return validateRequired(value) || message
  },
  
  email: (message = 'Invalid email address') => (value) => {
    return !value || isValidEmail(value) || message
  },
  
  emailList: (message = 'Invalid email addresses') => (value) => {
    return !value || isValidEmailList(value) || message
  },
  
  minLength: (min, message) => (value) => {
    if (!value || typeof value !== 'string') return true
    return value.trim().length >= min || message || `Must be at least ${min} characters`
  },
  
  maxLength: (max, message) => (value) => {
    if (!value || typeof value !== 'string') return true
    return value.trim().length <= max || message || `Must be no more than ${max} characters`
  },
  
  subject: (message = 'Invalid subject line') => (value) => {
    return !value || validateSubject(value) || message
  },
  
  emailBody: (message = 'Email body cannot be empty') => (value) => {
    return !value || validateEmailBody(value) || message
  }
}
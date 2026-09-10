import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Email API instance
const emailApi = axios.create({
  baseURL: import.meta.env.VITE_EMAIL_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
const addAuthInterceptor = (apiInstance) => {
  apiInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('noren-email-auth')
      if (token) {
        try {
          const auth = JSON.parse(token)
          if (auth.state?.token) {
            config.headers.Authorization = `Bearer ${auth.state.token}`
          }
        } catch (error) {
          console.error('Error parsing auth token:', error)
        }
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )
}

// Response interceptor to handle errors globally
const addResponseInterceptor = (apiInstance) => {
  apiInstance.interceptors.response.use(
    (response) => {
      return response
    },
    (error) => {
      // Handle network errors
      if (!error.response) {
        const networkError = {
          message: 'Network error. Please check your connection and try again.',
          status: 0,
          code: 'NETWORK_ERROR',
          data: null
        }
        console.error('Network Error:', error)
        return Promise.reject(networkError)
      }

      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        console.warn('Unauthorized access - redirecting to login')
        localStorage.removeItem('noren-email-auth')
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }

      // Handle 403 Forbidden
      if (error.response.status === 403) {
        console.warn('Access forbidden:', error.response.data?.message)
      }

      // Handle 404 Not Found
      if (error.response.status === 404) {
        console.warn('Resource not found:', error.config?.url)
      }

      // Handle 500 Server errors
      if (error.response.status >= 500) {
        console.error('Server error:', error.response.data)
      }
      
      // Format error for consistent handling
      const formattedError = {
        message: error.response?.data?.message || error.message || 'An unexpected error occurred',
        status: error.response?.status,
        code: error.response?.data?.code || `HTTP_${error.response?.status}`,
        data: error.response?.data,
        originalError: error
      }
      
      return Promise.reject(formattedError)
    }
  )
}

// Add interceptors to both instances
addAuthInterceptor(api)
addAuthInterceptor(emailApi)
addResponseInterceptor(api)
addResponseInterceptor(emailApi)

// Make instances available globally for debugging
window.api = api
window.emailApi = emailApi

export { api, emailApi }
export default api
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
      if (error.response?.status === 401) {
        // Unauthorized - clear auth and redirect to login
        localStorage.removeItem('noren-email-auth')
        window.location.href = '/login'
      }
      
      // Format error for consistent handling
      const formattedError = {
        message: error.response?.data?.message || error.message || 'An error occurred',
        status: error.response?.status,
        code: error.response?.data?.code,
        data: error.response?.data
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
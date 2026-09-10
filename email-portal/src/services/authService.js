import { api } from './api'

class AuthService {
  // Login with email and password
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Register new user
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Refresh token
  async refreshToken(refreshToken) {
    try {
      const response = await api.post('/auth/refresh', { refreshToken })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Logout
  async logout() {
    try {
      const response = await api.post('/auth/logout')
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Get current user profile
  async getProfile() {
    try {
      const response = await api.get('/auth/profile')
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Update user profile
  async updateProfile(userData) {
    try {
      const response = await api.put('/auth/profile', userData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await api.put('/auth/change-password', passwordData)
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password: newPassword
      })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Verify email
  async verifyEmail(token) {
    try {
      const response = await api.post('/auth/verify-email', { token })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Resend verification email
  async resendVerification(email) {
    try {
      const response = await api.post('/auth/resend-verification', { email })
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    try {
      const auth = localStorage.getItem('noren-email-auth')
      if (!auth) return false
      
      const authData = JSON.parse(auth)
      return authData.state?.isAuthenticated && authData.state?.token
    } catch (error) {
      return false
    }
  }

  // Get stored token
  getToken() {
    try {
      const auth = localStorage.getItem('noren-email-auth')
      if (!auth) return null
      
      const authData = JSON.parse(auth)
      return authData.state?.token
    } catch (error) {
      return null
    }
  }

  // Get stored user
  getUser() {
    try {
      const auth = localStorage.getItem('noren-email-auth')
      if (!auth) return null
      
      const authData = JSON.parse(auth)
      return authData.state?.user
    } catch (error) {
      return null
    }
  }
}

export default new AuthService()
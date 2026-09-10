import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Mock mode when backend is not available
const MOCK_MODE = true

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: MOCK_MODE ? { 
        id: 1,
        name: 'Admin User', 
        email: 'admin@norenfashion.in', 
        role: 'admin' 
      } : null,
      token: MOCK_MODE ? 'mock-jwt-token-12345' : null,
      isAuthenticated: MOCK_MODE ? true : false,
      isLoading: false,
      error: null,

      // Actions
      login: (userData, token) => {
        if (MOCK_MODE) {
          set({
            user: { 
              id: 1,
              name: 'Admin User', 
              email: 'admin@norenfashion.in', 
              role: 'admin' 
            },
            token: 'mock-jwt-token-12345',
            isAuthenticated: true,
            error: null,
            isLoading: false
          })
          return
        }
        
        set({
          user: userData,
          token: token,
          isAuthenticated: true,
          error: null,
          isLoading: false
        })
        
        // Set axios default header
        if (window.axios) {
          window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false
        })
        
        // Clear axios default header
        if (window.axios) {
          delete window.axios.defaults.headers.common['Authorization']
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error, isLoading: false })
      },

      clearError: () => {
        set({ error: null })
      },

      updateUser: (userData) => {
        set(state => ({
          user: { ...state.user, ...userData }
        }))
      },

      // Check if user has required role
      hasRole: (requiredRoles) => {
        const { user } = get()
        if (!user || !user.role) return false
        
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
        return roles.includes(user.role)
      },

      // Check if user is admin
      isAdmin: () => {
        const { user } = get()
        return user && ['admin', 'super_admin', 'business_owner'].includes(user.role)
      },

      // Check if user has marketing access
      hasMarketingAccess: () => {
        const { user } = get()
        return user && ['admin', 'super_admin', 'business_owner', 'store_manager'].includes(user.role)
      }
    }),
    {
      name: 'noren-email-auth',
      getStorage: () => localStorage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore
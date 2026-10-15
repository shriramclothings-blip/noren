/**
 * API Service Layer
 * Production-grade wrapper for all backend API calls
 * Features: JWT auth, device-id headers, retry logic, error handling, request/response interceptors
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://noren-iqk3.onrender.com/api';
const REQUEST_TIMEOUT = parseInt(process.env.REACT_APP_REQUEST_TIMEOUT) || 30000;
const MAX_RETRIES = parseInt(process.env.REACT_APP_RETRY_ATTEMPTS) || 3;
const RETRY_DELAY = parseInt(process.env.REACT_APP_RETRY_DELAY) || 2000;

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = REQUEST_TIMEOUT;
    this.maxRetries = MAX_RETRIES;
    this.retryDelay = RETRY_DELAY;
  }

  /**
   * Get stored JWT token
   */
  getAuthToken() {
    return localStorage.getItem('pos_jwt_token') || null;
  }

  /**
   * Set JWT token
   */
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('pos_jwt_token', token);
    } else {
      localStorage.removeItem('pos_jwt_token');
    }
  }

  /**
   * Get device ID (registered with backend)
   */
  getDeviceId() {
    return localStorage.getItem('pos_device_id') || null;
  }

  /**
   * Set device ID
   */
  setDeviceId(deviceId) {
    if (deviceId) {
      localStorage.setItem('pos_device_id', deviceId);
    } else {
      localStorage.removeItem('pos_device_id');
    }
  }

  /**
   * Get API key (from device registration)
   */
  getApiKey() {
    return localStorage.getItem('pos_api_key') || null;
  }

  /**
   * Set API key
   */
  setApiKey(apiKey) {
    if (apiKey) {
      localStorage.setItem('pos_api_key', apiKey);
    } else {
      localStorage.removeItem('pos_api_key');
    }
  }

  /**
   * Build default headers for requests
   */
  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Client': 'VENDEXA-RetailOS-Web',
      'X-Client-Version': '3.0.1',
      ...customHeaders,
    };

    // Add JWT token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add device ID if available
    const deviceId = this.getDeviceId();
    if (deviceId) {
      headers['X-Device-ID'] = deviceId;
    }

    // Add API key if available (for POS device auth)
    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    return headers;
  }

  /**
   * Build full URL
   */
  buildURL(endpoint) {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    // Ensure baseURL doesn't end with slash
    const cleanBaseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    
    return `${cleanBaseURL}/${cleanEndpoint}`;
  }

  /**
   * Sleep helper for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    // Timeout errors
    if (error.name === 'AbortError') {
      return true;
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limit errors (429)
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request(endpoint, options = {}, retryCount = 0) {
    const url = this.buildURL(endpoint);
    const headers = this.getHeaders(options.headers);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // Parse response
      const data = await response.json().catch(() => null);
      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      // Log error
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);

      // Retry logic
      if (this.isRetryableError(error) && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`[API Retry] Attempt ${retryCount + 1}/${this.maxRetries} after ${delay}ms`);
        await this.sleep(delay);
        return this.request(endpoint, options, retryCount + 1);
      }

      // Re-throw error after retries exhausted
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  /**
   * Test connection to backend
   */
  async testConnection() {
    try {
      const response = await this.get('/health');
      return {
        connected: true,
        status: response?.status,
        timestamp: response?.timestamp,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      baseURL: this.baseURL,
      hasDeviceId: !!this.getDeviceId(),
      hasApiKey: !!this.getApiKey(),
      hasAuthToken: !!this.getAuthToken(),
      online: navigator.onLine,
    };
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;

// Also export the class for testing
export { ApiService };

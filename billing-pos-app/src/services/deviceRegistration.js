/**
 * Device Registration Service
 * Auto-registers the web POS device with backend on first load
 * Handles device fingerprinting, authentication, and token management
 */

import apiService from './apiService';

class DeviceRegistrationService {
  constructor() {
    this.deviceFingerprint = null;
    this.deviceId = null;
    this.apiKey = null;
    this.isRegistered = false;
    this.registrationPromise = null;
  }

  /**
   * Generate unique device fingerprint for web browser
   * Uses browser features + timestamp to create a unique identifier
   */
  generateDeviceFingerprint() {
    if (this.deviceFingerprint) {
      return this.deviceFingerprint;
    }

    // Check if already stored
    const stored = localStorage.getItem('pos_device_fingerprint');
    if (stored) {
      this.deviceFingerprint = stored;
      return stored;
    }

    // Generate new fingerprint
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      window.screen.width + 'x' + window.screen.height,
      window.screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown',
      window.devicePixelRatio || 1,
    ];

    // Add some randomness to ensure uniqueness across browser sessions
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestampPart = Date.now().toString(36);
    
    const fingerprint = this.hashString(components.join('|') + randomPart + timestampPart);
    
    // Store for future use
    localStorage.setItem('pos_device_fingerprint', fingerprint);
    this.deviceFingerprint = fingerprint;
    
    return fingerprint;
  }

  /**
   * Simple hash function for fingerprinting
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'WEB-' + Math.abs(hash).toString(36).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
  }

  /**
   * Get device name for registration
   */
  getDeviceName() {
    const stored = localStorage.getItem('pos_device_name');
    if (stored) return stored;

    // Generate descriptive name
    const browser = this.getBrowserName();
    const os = this.getOSName();
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const deviceName = `${browser} on ${os} (${timestamp})`;
    localStorage.setItem('pos_device_name', deviceName);
    
    return deviceName;
  }

  /**
   * Detect browser name
   */
  getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Browser';
  }

  /**
   * Detect OS name
   */
  getOSName() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Check if device is already registered
   */
  isDeviceRegistered() {
    const deviceId = localStorage.getItem('pos_device_id');
    const apiKey = localStorage.getItem('pos_api_key');
    const fingerprint = localStorage.getItem('pos_device_fingerprint');
    
    return !!(deviceId && apiKey && fingerprint);
  }

  /**
   * Load stored device credentials
   */
  loadStoredCredentials() {
    this.deviceFingerprint = localStorage.getItem('pos_device_fingerprint');
    this.deviceId = localStorage.getItem('pos_device_id');
    this.apiKey = localStorage.getItem('pos_api_key');
    this.isRegistered = !!(this.deviceId && this.apiKey && this.deviceFingerprint);

    if (this.isRegistered) {
      // Set in apiService
      apiService.setDeviceId(this.deviceId);
      apiService.setApiKey(this.apiKey);
    }

    return this.isRegistered;
  }

  /**
   * Register device with backend
   * Note: Requires JWT authentication (user must be logged in first)
   */
  async registerDevice(jwtToken) {
    try {
      // If already registered, authenticate instead
      if (this.isDeviceRegistered()) {
        return await this.authenticateDevice();
      }

      const fingerprint = this.generateDeviceFingerprint();
      const deviceName = this.getDeviceName();

      console.log('[Device Registration] Registering new device:', { fingerprint, deviceName });

      // Set JWT token for this request
      apiService.setAuthToken(jwtToken);

      // Call backend registration endpoint
      const response = await apiService.post('/erp/pos/integration/devices/register', {
        device_fingerprint: fingerprint,
        device_name: deviceName,
        // store_id can be set later if needed
      });

      if (response && response.device && response.api_key) {
        // Store credentials
        this.deviceId = response.device.id;
        this.apiKey = response.api_key;
        this.deviceFingerprint = fingerprint;
        this.isRegistered = true;

        localStorage.setItem('pos_device_id', this.deviceId);
        localStorage.setItem('pos_api_key', this.apiKey);
        localStorage.setItem('pos_device_fingerprint', fingerprint);

        // Update apiService
        apiService.setDeviceId(this.deviceId);
        apiService.setApiKey(this.apiKey);

        console.log('[Device Registration] ✓ Device registered successfully:', {
          deviceId: this.deviceId,
          deviceName,
          status: response.device.status,
        });

        return {
          success: true,
          deviceId: this.deviceId,
          deviceName,
          message: 'Device registered successfully',
        };
      } else {
        throw new Error('Invalid registration response from backend');
      }

    } catch (error) {
      console.error('[Device Registration] Failed to register device:', error.message);
      
      return {
        success: false,
        error: error.message,
        needsRetry: error.status === 401 || error.status === 403,
      };
    }
  }

  /**
   * Authenticate existing device with backend
   * Verifies device credentials are still valid
   */
  async authenticateDevice() {
    try {
      const fingerprint = localStorage.getItem('pos_device_fingerprint');
      const apiKey = localStorage.getItem('pos_api_key');

      if (!fingerprint || !apiKey) {
        throw new Error('Device credentials not found');
      }

      console.log('[Device Auth] Authenticating device:', fingerprint);

      // Call authentication endpoint (no JWT required)
      const response = await apiService.post('/erp/pos/integration/devices/authenticate', {
        device_fingerprint: fingerprint,
        api_key: apiKey,
      });

      if (response && response.device_id) {
        // Update stored device ID if changed
        if (response.device_id !== this.deviceId) {
          this.deviceId = response.device_id;
          localStorage.setItem('pos_device_id', response.device_id);
          apiService.setDeviceId(response.device_id);
        }

        this.isRegistered = true;

        console.log('[Device Auth] ✓ Device authenticated successfully:', {
          deviceId: response.device_id,
          businessId: response.business_id,
        });

        return {
          success: true,
          deviceId: response.device_id,
          businessId: response.business_id,
          storeId: response.store_id,
        };
      } else {
        throw new Error('Invalid authentication response');
      }

    } catch (error) {
      console.error('[Device Auth] Authentication failed:', error.message);

      // If auth fails, clear credentials and require re-registration
      if (error.status === 401 || error.status === 403) {
        this.clearCredentials();
      }

      return {
        success: false,
        error: error.message,
        needsReregistration: error.status === 401 || error.status === 403,
      };
    }
  }

  /**
   * Initialize device (register or authenticate)
   * Should be called on app startup after user login
   */
  async initializeDevice(jwtToken) {
    // Prevent concurrent initialization
    if (this.registrationPromise) {
      return this.registrationPromise;
    }

    this.registrationPromise = (async () => {
      try {
        // Load stored credentials
        const hasCredentials = this.loadStoredCredentials();

        if (hasCredentials) {
          // Try to authenticate existing device
          const authResult = await this.authenticateDevice();
          
          if (authResult.success) {
            return authResult;
          }

          // If authentication fails, try to register
          if (authResult.needsReregistration && jwtToken) {
            console.log('[Device Init] Re-registering device after auth failure');
            return await this.registerDevice(jwtToken);
          }

          return authResult;
        } else {
          // No credentials, register new device
          if (!jwtToken) {
            return {
              success: false,
              error: 'JWT token required for device registration',
              needsLogin: true,
            };
          }

          return await this.registerDevice(jwtToken);
        }
      } finally {
        this.registrationPromise = null;
      }
    })();

    return this.registrationPromise;
  }

  /**
   * Clear device credentials (for logout or re-registration)
   */
  clearCredentials() {
    this.deviceFingerprint = null;
    this.deviceId = null;
    this.apiKey = null;
    this.isRegistered = false;

    localStorage.removeItem('pos_device_id');
    localStorage.removeItem('pos_api_key');
    // Keep fingerprint for re-registration
    // localStorage.removeItem('pos_device_fingerprint');

    apiService.setDeviceId(null);
    apiService.setApiKey(null);

    console.log('[Device Registration] Credentials cleared');
  }

  /**
   * Get current device status
   */
  getDeviceStatus() {
    return {
      isRegistered: this.isRegistered,
      deviceId: this.deviceId,
      deviceFingerprint: this.deviceFingerprint,
      deviceName: this.getDeviceName(),
      hasApiKey: !!this.apiKey,
      browser: this.getBrowserName(),
      os: this.getOSName(),
    };
  }

  /**
   * Test device connection to backend
   */
  async testConnection() {
    try {
      const result = await apiService.testConnection();
      return {
        ...result,
        deviceStatus: this.getDeviceStatus(),
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        deviceStatus: this.getDeviceStatus(),
      };
    }
  }
}

// Export singleton instance
const deviceRegistration = new DeviceRegistrationService();
export default deviceRegistration;

// Also export the class
export { DeviceRegistrationService };

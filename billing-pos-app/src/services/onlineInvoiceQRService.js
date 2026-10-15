/**
 * Online Invoice QR Service
 * Generates QR codes that point to web-based invoices on the deployed backend
 */

import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.REACT_APP_API_URL || 'https://noren-iqk3.onrender.com/api';
const WEBSITE_URL = process.env.REACT_APP_WEBSITE_URL || 'https://www.norenfastion.shop';
const INVOICE_VIEW_URL = process.env.REACT_APP_INVOICE_VIEW_URL || `${WEBSITE_URL}/my-billing/invoice`;

class OnlineInvoiceQRService {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const config = JSON.parse(localStorage.getItem('invoiceQRSettings') || '{}');
      return {
        qrType: config.qrType || 'online',
        qrSize: config.qrSize || 400,
        includeQROnInvoice: config.includeQROnInvoice !== false,
        qrPosition: config.qrPosition || 'bottom-right',
        websiteUrl: config.websiteUrl || WEBSITE_URL,
        invoiceViewUrl: config.invoiceViewUrl || INVOICE_VIEW_URL,
        autoEmailInvoice: config.autoEmailInvoice || false,
      };
    } catch (err) {
      console.error('Failed to load QR config:', err);
      return {
        qrType: 'online',
        qrSize: 400,
        includeQROnInvoice: true,
        qrPosition: 'bottom-right',
        websiteUrl: WEBSITE_URL,
        invoiceViewUrl: INVOICE_VIEW_URL,
        autoEmailInvoice: false,
      };
    }
  }

  /**
   * Generate secure token for invoice access
   */
  generateInvoiceToken(invoiceData) {
    const timestamp = Date.now();
    const randomId = uuidv4().replace(/-/g, '');
    const invoiceId = invoiceData.invoiceNumber || invoiceData.id || timestamp;
    
    // Create a secure token format
    return `INV_${randomId.substring(0, 8)}-${timestamp.toString(36)}-${invoiceId}`;
  }

  /**
   * Upload invoice data to backend and get public token
   */
  async uploadInvoiceToBackend(invoiceData) {
    try {
      const token = this.generateInvoiceToken(invoiceData);
      
      // Prepare invoice data for backend
      const invoicePayload = {
        token,
        invoiceNumber: invoiceData.invoiceNumber,
        date: invoiceData.date || new Date().toISOString(),
        customer: invoiceData.customer || { name: 'Walk-in Customer' },
        items: invoiceData.items || [],
        total: invoiceData.total || 0,
        tax: invoiceData.tax || 0,
        discount: invoiceData.discount || 0,
        paymentMode: invoiceData.paymentMode || 'Cash',
        notes: invoiceData.notes || '',
        company: invoiceData.company || {},
        metadata: {
          generatedBy: 'VENDEXA RetailOS',
          posVersion: '3.0.1',
          uploadedAt: new Date().toISOString(),
        }
      };

      const response = await fetch(`${API_URL}/erp/pos/integration/invoices/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': localStorage.getItem('pos_device_id') || 'unknown',
          'Authorization': `Bearer ${localStorage.getItem('pos_api_key') || ''}`
        },
        body: JSON.stringify(invoicePayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload invoice');
      }

      const result = await response.json();
      
      // Store the token locally for future reference
      this.storeInvoiceToken(invoiceData.invoiceNumber || invoiceData.id, token);
      
      return {
        token,
        uploadSuccess: true,
        invoiceUrl: `${this.config.invoiceViewUrl}/${token}`,
        backendResponse: result
      };

    } catch (err) {
      console.error('Invoice upload failed:', err);
      
      // Return fallback token for offline mode
      const fallbackToken = this.generateInvoiceToken(invoiceData);
      this.storeInvoiceToken(invoiceData.invoiceNumber || invoiceData.id, fallbackToken, { offline: true });
      
      return {
        token: fallbackToken,
        uploadSuccess: false,
        invoiceUrl: `${this.config.invoiceViewUrl}/${fallbackToken}`,
        error: err.message,
        offline: true
      };
    }
  }

  /**
   * Generate online QR code for invoice
   */
  async generateOnlineQRCode(invoiceData, options = {}) {
    const config = this.loadConfig();
    
    try {
      // Upload invoice and get token
      const uploadResult = await this.uploadInvoiceToBackend(invoiceData);
      
      // Generate QR code pointing to online invoice
      const qrOptions = {
        errorCorrectionLevel: 'H', // High error correction for better scanning
        type: 'image/png',
        quality: 1.0,
        margin: 4,
        width: options.size || config.qrSize || 400,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        }
      };

      const qrDataURL = await QRCode.toDataURL(uploadResult.invoiceUrl, qrOptions);
      
      return {
        qrDataURL,
        invoiceUrl: uploadResult.invoiceUrl,
        token: uploadResult.token,
        uploadSuccess: uploadResult.uploadSuccess,
        offline: uploadResult.offline,
        size: qrOptions.width,
        format: 'PNG'
      };

    } catch (err) {
      console.error('Online QR generation failed:', err);
      throw new Error(`Failed to generate online QR code: ${err.message}`);
    }
  }

  /**
   * Generate local QR code (fallback)
   */
  async generateLocalQRCode(invoiceData, options = {}) {
    try {
      // Create compact invoice data for QR
      const compactData = {
        inv: invoiceData.invoiceNumber,
        date: invoiceData.date,
        total: invoiceData.total,
        customer: invoiceData.customer?.name || 'Walk-in',
        items: (invoiceData.items || []).length,
        mode: invoiceData.paymentMode
      };

      const qrOptions = {
        errorCorrectionLevel: 'M', // Medium for more data capacity
        type: 'image/png',
        quality: 1.0,
        margin: 2,
        width: options.size || 300,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        }
      };

      const qrDataURL = await QRCode.toDataURL(JSON.stringify(compactData), qrOptions);
      
      return {
        qrDataURL,
        data: compactData,
        type: 'local',
        size: qrOptions.width,
        format: 'PNG'
      };

    } catch (err) {
      console.error('Local QR generation failed:', err);
      throw new Error(`Failed to generate local QR code: ${err.message}`);
    }
  }

  /**
   * Generate QR code based on configuration
   */
  async generateInvoiceQRCode(invoiceData, options = {}) {
    const config = this.loadConfig();
    
    if (config.qrType === 'online') {
      try {
        return await this.generateOnlineQRCode(invoiceData, options);
      } catch (err) {
        console.warn('Online QR generation failed, falling back to local:', err);
        return await this.generateLocalQRCode(invoiceData, options);
      }
    } else {
      return await this.generateLocalQRCode(invoiceData, options);
    }
  }

  /**
   * Store invoice token locally for tracking
   */
  storeInvoiceToken(invoiceId, token, metadata = {}) {
    try {
      const tokens = JSON.parse(localStorage.getItem('invoice_tokens') || '{}');
      tokens[invoiceId] = {
        token,
        generatedAt: new Date().toISOString(),
        ...metadata
      };
      
      // Keep only last 100 tokens
      const entries = Object.entries(tokens);
      if (entries.length > 100) {
        const recent = entries.slice(-100);
        localStorage.setItem('invoice_tokens', JSON.stringify(Object.fromEntries(recent)));
      } else {
        localStorage.setItem('invoice_tokens', JSON.stringify(tokens));
      }
    } catch (err) {
      console.error('Failed to store invoice token:', err);
    }
  }

  /**
   * Get stored token for invoice
   */
  getStoredToken(invoiceId) {
    try {
      const tokens = JSON.parse(localStorage.getItem('invoice_tokens') || '{}');
      return tokens[invoiceId] || null;
    } catch (err) {
      console.error('Failed to get stored token:', err);
      return null;
    }
  }

  /**
   * Test connection to backend
   */
  async testBackendConnection() {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      const data = await response.json();
      return {
        connected: response.ok && data.status === 'ok',
        response: data
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message
      };
    }
  }

  /**
   * Get QR code for existing invoice
   */
  async getQRCodeForInvoice(invoiceId) {
    const stored = this.getStoredToken(invoiceId);
    if (stored && !stored.offline) {
      const config = this.loadConfig();
      const invoiceUrl = `${config.invoiceViewUrl}/${stored.token}`;
      
      try {
        const qrDataURL = await QRCode.toDataURL(invoiceUrl, {
          errorCorrectionLevel: 'H',
          width: config.qrSize,
          margin: 4
        });
        
        return {
          qrDataURL,
          invoiceUrl,
          token: stored.token,
          fromCache: true
        };
      } catch (err) {
        console.error('Failed to generate QR from stored token:', err);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Batch upload multiple invoices
   */
  async batchUploadInvoices(invoices, onProgress = null) {
    const results = [];
    let processed = 0;
    
    for (const invoice of invoices) {
      try {
        const result = await this.uploadInvoiceToBackend(invoice);
        results.push({ invoice: invoice.invoiceNumber, success: true, ...result });
      } catch (err) {
        results.push({ 
          invoice: invoice.invoiceNumber, 
          success: false, 
          error: err.message 
        });
      }
      
      processed++;
      if (onProgress) {
        onProgress(processed, invoices.length);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Email invoice QR code to customer
   */
  async emailInvoiceQRCode(invoiceData, customerEmail) {
    try {
      const qrResult = await this.generateOnlineQRCode(invoiceData);
      
      const emailPayload = {
        to: customerEmail,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceUrl: qrResult.invoiceUrl,
        qrCodeData: qrResult.qrDataURL,
        customer: invoiceData.customer,
        total: invoiceData.total,
        date: invoiceData.date
      };

      const response = await fetch(`${API_URL}/erp/pos/integration/invoices/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': localStorage.getItem('pos_device_id') || 'unknown',
          'Authorization': `Bearer ${localStorage.getItem('pos_api_key') || ''}`
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      return await response.json();
    } catch (err) {
      console.error('Email sending failed:', err);
      throw err;
    }
  }
}

// Export singleton instance
export default new OnlineInvoiceQRService();
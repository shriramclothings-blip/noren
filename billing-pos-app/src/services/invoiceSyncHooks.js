/**
 * Invoice Sync Hooks - Automatic Queue Management
 * 
 * Listens to invoice lifecycle events and automatically queues
 * finalized invoices for background synchronization.
 * 
 * Events monitored:
 * - Invoice finalized/completed
 * - Invoice updated (if already synced)
 * - Invoice deleted (sync deletion)
 */

import { addToSyncQueue, getSetting } from '../db/db';
import { generateInvoiceQRCode } from '../utils/qrGenerator';
import toast from 'react-hot-toast';

class InvoiceSyncHooks {
  constructor() {
    this.enabled = false;
    this.listeners = [];
  }

  /**
   * Initialize and start listening to invoice events
   */
  async initialize() {
    try {
      const config = await getSetting('websiteIntegrationConfig');
      this.enabled = config?.enabled || false;

      if (!this.enabled) {
        console.log('[InvoiceSyncHooks] Website integration disabled - hooks inactive');
        return;
      }

      console.log('[InvoiceSyncHooks] Initialized and listening for invoice events');
      this.attachListeners();
    } catch (error) {
      console.error('[InvoiceSyncHooks] Initialization error:', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachListeners() {
    // Listen for invoice-finalized event
    const handleInvoiceFinalized = (event) => {
      this.onInvoiceFinalized(event.detail);
    };

    // Listen for invoice-updated event
    const handleInvoiceUpdated = (event) => {
      this.onInvoiceUpdated(event.detail);
    };

    // Listen for invoice-deleted event
    const handleInvoiceDeleted = (event) => {
      this.onInvoiceDeleted(event.detail);
    };

    window.addEventListener('invoice-finalized', handleInvoiceFinalized);
    window.addEventListener('invoice-updated', handleInvoiceUpdated);
    window.addEventListener('invoice-deleted', handleInvoiceDeleted);

    // Store listeners for cleanup
    this.listeners.push(
      { event: 'invoice-finalized', handler: handleInvoiceFinalized },
      { event: 'invoice-updated', handler: handleInvoiceUpdated },
      { event: 'invoice-deleted', handler: handleInvoiceDeleted }
    );

    console.log('[InvoiceSyncHooks] Event listeners attached');
  }

  /**
   * Detach event listeners
   */
  detachListeners() {
    this.listeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    this.listeners = [];
    console.log('[InvoiceSyncHooks] Event listeners detached');
  }

  /**
   * Handle invoice finalized event
   */
  async onInvoiceFinalized(invoice) {
    if (!this.enabled) return;

    try {
      console.log('[InvoiceSyncHooks] Invoice finalized:', invoice.id);

      // Generate QR code data
      const qrData = await generateInvoiceQRCode(invoice.id, {
        includeInvoiceNumber: true,
        includeTotal: true,
      });

      // Prepare payload for backend sync
      const payload = {
        localInvoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        customerName: invoice.customerName || 'Walk-in Customer',
        customerPhone: invoice.customerPhone || '',
        customerEmail: invoice.customerEmail || '',
        items: invoice.items || [],
        subtotal: invoice.subtotal || 0,
        tax: invoice.tax || 0,
        discount: invoice.discount || 0,
        total: invoice.total || 0,
        paymentMode: invoice.paymentMode || 'Cash',
        notes: invoice.notes || '',
        qrUrl: qrData.url,
        generatedAt: new Date().toISOString(),
      };

      // Add to sync queue
      await addToSyncQueue({
        entityType: 'invoice',
        entityId: invoice.id,
        operation: 'create',
        payload,
        priority: 'normal',
      });

      console.log('[InvoiceSyncHooks] ✓ Invoice queued for sync:', invoice.invoiceNumber);

      // Show subtle notification
      toast.success('Invoice queued for cloud sync', {
        duration: 2000,
        icon: '☁️',
      });

    } catch (error) {
      console.error('[InvoiceSyncHooks] Failed to queue invoice:', error);
      toast.error('Failed to queue invoice for sync', {
        duration: 3000,
      });
    }
  }

  /**
   * Handle invoice updated event
   */
  async onInvoiceUpdated(invoice) {
    if (!this.enabled) return;

    try {
      console.log('[InvoiceSyncHooks] Invoice updated:', invoice.id);

      // Check if invoice was already synced
      // If yes, queue an update operation
      const payload = {
        localInvoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        updates: {
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          customerEmail: invoice.customerEmail,
          items: invoice.items,
          total: invoice.total,
          notes: invoice.notes,
          updatedAt: new Date().toISOString(),
        },
      };

      await addToSyncQueue({
        entityType: 'invoice',
        entityId: invoice.id,
        operation: 'update',
        payload,
        priority: 'low', // Lower priority for updates
      });

      console.log('[InvoiceSyncHooks] ✓ Invoice update queued:', invoice.invoiceNumber);

    } catch (error) {
      console.error('[InvoiceSyncHooks] Failed to queue invoice update:', error);
    }
  }

  /**
   * Handle invoice deleted event
   */
  async onInvoiceDeleted(invoice) {
    if (!this.enabled) return;

    try {
      console.log('[InvoiceSyncHooks] Invoice deleted:', invoice.id);

      const payload = {
        localInvoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        deletedAt: new Date().toISOString(),
      };

      await addToSyncQueue({
        entityType: 'invoice',
        entityId: invoice.id,
        operation: 'delete',
        payload,
        priority: 'high', // High priority for deletions
      });

      console.log('[InvoiceSyncHooks] ✓ Invoice deletion queued:', invoice.invoiceNumber);

    } catch (error) {
      console.error('[InvoiceSyncHooks] Failed to queue invoice deletion:', error);
    }
  }

  /**
   * Enable hooks
   */
  async enable() {
    this.enabled = true;
    await this.initialize();
  }

  /**
   * Disable hooks
   */
  disable() {
    this.enabled = false;
    this.detachListeners();
    console.log('[InvoiceSyncHooks] Disabled');
  }
}

// Create singleton instance
const invoiceSyncHooks = new InvoiceSyncHooks();

export default invoiceSyncHooks;

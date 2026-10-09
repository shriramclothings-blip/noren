import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  calcInvoiceTotals,
  printInvoicePDF,
  remotePrintInvoice,
  downloadInvoicePDF,
  autoPrintInvoice,
  formatDate,
  broadcastCustomerDisplayState,
} from '../utils/helpers';
import { Search, Plus, Minus, Trash2, Printer, Save, Camera, Package, ShoppingCart, Monitor, PauseCircle, MessageCircle, Star, Cloud } from 'lucide-react';
import Modal from '../components/Modal';
import CustomerSelector from '../components/CustomerSelector';
import PartitionPaymentModal from '../components/PartitionPaymentModal';
import ResizableThreePane from '../components/ResizableThreePane';
import InvoiceSendModal from '../components/InvoiceSendModal';
import toast from 'react-hot-toast';
import Quagga from 'quagga';
import UpiPaymentModal from '../components/UpiPaymentModal';
import HoldBillManager from '../components/HoldBillManager';
import { loadPaymentSettings } from '../payments/settings';
import { updatePaymentAttempt } from '../payments/paymentStore';
import { reserveProfessionalInvoiceNumber, saveHeldBill, getAllHeldBills, removeHeldBill, getSetting } from '../db/db';
import { normalizeBarcodeValue, extractSizeCodeFromBarcode, extractBaseBarcode, mapSizeCodeToLabel } from '../utils/barcodeEngine';
import { useNetworkSync } from '../context/NetworkSyncContext';
import { playCheckoutSound, playUpiSuccessSound } from '../utils/soundManager';


export default function POS() {
  const { products, invoices, customers, addInvoice, company, currentUser, getVariantByCode, printSettings, invoiceTextStyles } = useApp();
  const { deviceRole, isConnected, requestRemotePrint } = useNetworkSync();
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  // Fixed-amount discount (₹), not percentage
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(company.taxRate != null ? Number(company.taxRate) : 18);
  const [showScanner, setShowScanner] = useState(false);
  const [showSuccess, setShowSuccess] = useState(null);
  const [invoiceSendTarget, setInvoiceSendTarget] = useState(null); // invoice to send via WhatsApp PDF modal
  const [notes, setNotes] = useState('');
  const [showUpi, setShowUpi] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [upiDraft, setUpiDraft] = useState(null);
  const [showPartition, setShowPartition] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null); // [{method, amount}]
  const [reviewSignature, setReviewSignature] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [heldBills, setHeldBills] = useState([]);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [posSettings, setPosSettings] = useState({
    requireCustomer: false,
    allowNegativeStock: true,
    defaultPaymentMode: 'Cash',
    defaultTaxRate: company?.taxRate != null ? Number(company.taxRate) : 18,
    autoPrintAfterCheckout: false,
    reviewBeforeCheckout: false,
    maxDiscountPct: 100,
  });
  const [loyaltySettings, setLoyaltySettings] = useState({
    pointsPer100: 10,
    redeemRate: 0.5,
    minRedeemPoints: 10,
    maxRedeemPct: 100,
    expiryDays: 0,
  });
  const scannerRef = useRef(null);
  const searchInputRef = useRef(null);
  const finalizeUpiRef = useRef(false);
  const finalizeCheckoutRef = useRef(false);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const getProductSizeOptions = (product) => {
    if (!product?.sizes || typeof product.sizes !== 'object') return [];
    return Object.keys(product.sizes).filter((key) => product.sizes[key] !== undefined);
  };

  const getProductVariantOptions = (product) => Array.isArray(product?.variants) ? product.variants.filter(Boolean) : [];

  const [quickAddProduct, setQuickAddProduct] = useState(null);
  const [quickAddSize, setQuickAddSize] = useState('');
  const [quickAddVariantId, setQuickAddVariantId] = useState('');
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pos:favorites') || '[]'); } catch { return []; }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = (productId) => {
    setFavoriteIds(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId].slice(0, 12);
      localStorage.setItem('pos:favorites', JSON.stringify(next));
      return next;
    });
  };

  const favoriteProducts = useMemo(() => products.filter(p => favoriteIds.includes(p.id)), [products, favoriteIds]);

  const openQuickAdd = (product) => {
    const sizeOptions = getProductSizeOptions(product);
    const variantOptions = getProductVariantOptions(product);

    if (sizeOptions.length === 0 && variantOptions.length === 0) {
      addToCart(product);
      return;
    }

    setQuickAddProduct(product);
    setQuickAddSize(product.defaultSize || sizeOptions[0] || '');
    setQuickAddVariantId(product.defaultVariantId || variantOptions[0]?.id || '');
  };

  const addToCart = useCallback((product, selection = {}) => {
    const sizeOptions = getProductSizeOptions(product);
    const variantOptions = getProductVariantOptions(product);
    const selectedSize = selection.size || product.defaultSize || (sizeOptions.length === 1 ? sizeOptions[0] : '');
    const selectedVariant = selection.variantId
      ? variantOptions.find((variant) => String(variant?.id) === String(selection.variantId))
      : (product.defaultVariantId
        ? variantOptions.find((variant) => String(variant?.id) === String(product.defaultVariantId))
        : variantOptions[0]);

    const sizeRecord = selectedSize && product.sizes && typeof product.sizes === 'object' ? product.sizes[selectedSize] : null;
    const chosenPrice = Number(selection.price ?? selectedVariant?.price ?? selectedVariant?.salePrice ?? sizeRecord?.price ?? sizeRecord?.salePrice ?? product.price ?? product.salePrice ?? 0);
    const chosenTaxRate = Number(selection.taxRate ?? selectedVariant?.taxRate ?? product.taxRate ?? taxRate);
    const lineKey = `${product.id}:${selectedVariant?.id || ''}:${selectedSize || ''}`;

    // Use variant label for proper display in cart and invoice
    const variantDisplayName = selectedVariant
      ? (selectedVariant.label || [selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ') || selectedVariant.name || '')
      : selectedSize || '';

    setCart(prev => {
      const existing = prev.find(i => i.lineKey === lineKey);
      if (existing) return prev.map(i => i.lineKey === lineKey ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        productId: product.id,
        lineKey,
        name: product.name,
        price: chosenPrice,
        qty: 1,
        taxRate: chosenTaxRate,
        hsn: product.hsn || '',
        size: variantDisplayName,
        variantId: selectedVariant?.id || null,
        variantName: variantDisplayName,
        barcode: selectedVariant?.barcode || product.barcode || '',
        sku: selectedVariant?.sku || product.sku || '',
      }];
    });

    const displayLabel = variantDisplayName ? ` (${variantDisplayName})` : '';
    toast.success(`${product.name}${displayLabel} added`, { duration: 1000 });
  }, [taxRate]);

  const updateQty = (lineKey, qty) => {
    if (qty <= 0) return removeFromCart(lineKey);
    setCart(prev => prev.map(i => i.lineKey === lineKey ? { ...i, qty } : i));
  };

  const updatePrice = (lineKey, price) => {
    setCart(prev => prev.map(i => i.lineKey === lineKey ? { ...i, price: parseFloat(price) || 0 } : i));
  };

  const removeFromCart = (lineKey) => setCart(prev => prev.filter(i => i.lineKey !== lineKey));

  const { subtotal, discountAmt, taxAmt, total, taxBreakdown } = calcInvoiceTotals(cart, discount, taxRate);

  useEffect(() => {
    let active = true;

    const loadRuntimeSettings = async () => {
      try {
        const [savedPos, savedLoyalty] = await Promise.all([
          getSetting('posSettings'),
          getSetting('loyaltySettings'),
        ]);

        if (!active) return;

        const mergedPos = {
          requireCustomer: false,
          allowNegativeStock: true,
          defaultPaymentMode: 'Cash',
          defaultTaxRate: company?.taxRate != null ? Number(company.taxRate) : 18,
          autoPrintAfterCheckout: false,
          reviewBeforeCheckout: false,
          maxDiscountPct: 100,
          ...(savedPos || {}),
        };
        const mergedLoyalty = {
          pointsPer100: 10,
          redeemRate: 0.5,
          minRedeemPoints: 10,
          maxRedeemPct: 100,
          expiryDays: 0,
          ...(savedLoyalty || {}),
        };

        setPosSettings(mergedPos);
        setLoyaltySettings(mergedLoyalty);
        setPaymentMode(mergedPos.defaultPaymentMode || 'Cash');
        setTaxRate(mergedPos.defaultTaxRate != null ? Number(mergedPos.defaultTaxRate) : (company?.taxRate != null ? Number(company.taxRate) : 18));
      } catch {
        // keep local defaults
      }
    };

    loadRuntimeSettings();

    const onPosSettingsChanged = (event) => {
      const next = event?.detail;
      if (!next || !active) return;
      setPosSettings(next);
      setPaymentMode(next.defaultPaymentMode || 'Cash');
      setTaxRate(Number(next.defaultTaxRate) || Number(company?.taxRate) || 18);
    };

    const onLoyaltySettingsChanged = (event) => {
      const next = event?.detail;
      if (!next || !active) return;
      setLoyaltySettings((prev) => ({ ...prev, ...next }));
    };

    window.addEventListener('pos-settings-changed', onPosSettingsChanged);
    window.addEventListener('loyalty-settings-changed', onLoyaltySettingsChanged);

    return () => {
      active = false;
      window.removeEventListener('pos-settings-changed', onPosSettingsChanged);
      window.removeEventListener('loyalty-settings-changed', onLoyaltySettingsChanged);
    };
  }, [company?.taxRate]);

  const totalItemsQty = useMemo(
    () => cart.reduce((s, it) => s + (Number(it?.qty) || 0), 0),
    [cart]
  );

  const maxAllowedDiscountAmount = useMemo(() => {
    const pct = Math.min(100, Math.max(0, Number(posSettings?.maxDiscountPct) || 0));
    return Math.max(0, (Number(subtotal) || 0) * (pct / 100));
  }, [posSettings?.maxDiscountPct, subtotal]);

  const getAvailableStockForLine = useCallback((line) => {
    const product = products.find((entry) => String(entry.id) === String(line.productId));
    if (!product) return null;

    if (line.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((entry) => String(entry.id) === String(line.variantId));
      if (variant && typeof variant.stock === 'number') {
        return Number(variant.stock || 0);
      }
    }

    if (typeof product.stock === 'number') {
      return Number(product.stock || 0);
    }

    return null;
  }, [products]);

  const validateCheckoutGuards = useCallback(() => {
    if (posSettings?.requireCustomer && !selectedCustomer) {
      return { ok: false, error: 'Customer is required before checkout' };
    }

    if (Number(discount || 0) > maxAllowedDiscountAmount + 0.001) {
      return {
        ok: false,
        error: `Discount exceeds max allowed (${formatCurrency(maxAllowedDiscountAmount, company.currency)})`,
      };
    }

    if (posSettings?.allowNegativeStock === false) {
      const insufficient = cart.find((item) => {
        const available = getAvailableStockForLine(item);
        return available !== null && Number(item.qty || 0) > available;
      });
      if (insufficient) {
        return {
          ok: false,
          error: `Insufficient stock for ${insufficient.name}`,
        };
      }
    }

    return { ok: true };
  }, [
    cart,
    company.currency,
    discount,
    getAvailableStockForLine,
    maxAllowedDiscountAmount,
    posSettings,
    selectedCustomer,
  ]);

  const currentBillSignature = useMemo(() => {
    // Signature used to ensure "Payment OK" only applies to the reviewed cart.
    // Any cart/total changes will force a new Review Receipt.
    return JSON.stringify({
      cart,
      discount: Number(discount) || 0,
      taxRate: Number(taxRate) || 0,
      customerId: selectedCustomer?.id || null,
      paymentMode: String(paymentMode || ''),
      paymentBreakdown: paymentBreakdown || null,
    });
  }, [cart, discount, taxRate, selectedCustomer?.id, paymentMode, paymentBreakdown]);

  // If cart/totals change after review, invalidate the review signature automatically.
  useEffect(() => {
    if (reviewSignature && reviewSignature !== currentBillSignature) {
      setReviewSignature(null);
    }
  }, [reviewSignature, currentBillSignature]);

  const openCustomerDisplay = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.openCustomerDisplay) {
      await window.electronAPI.openCustomerDisplay();
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}#customer-display`;
    window.open(url, 'CustomerDisplay', 'width=1100,height=700');
  };

  const broadcastCustomerDisplay = useCallback((status = 'ready', extra = {}) => {
    broadcastCustomerDisplayState({
      type: 'customer-display-update',
      timestamp: Date.now(),
      state: {
        invoiceNumber: showSuccess?.invoiceNumber || null,
        status,
        customerName: selectedCustomer?.name || 'Walking Customer',
        paymentMode: paymentBreakdown?.length ? 'Split' : paymentMode,
        total: total || 0,
        subtotal: subtotal || 0,
        discount: discountAmt || 0,
        tax: taxAmt || 0,
        totalItemsQty,
        items: cart.map(item => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          size: item.size || item.variantSize || '',
          variantId: item.variantId || item.variant?.id || null,
        })),
        ...extra,
      },
    });
  }, [cart, discountAmt, paymentBreakdown, paymentMode, selectedCustomer, showSuccess, subtotal, taxAmt, total, totalItemsQty]);

  useEffect(() => {
    if (showUpi) {
      broadcastCustomerDisplay('waiting', { paymentStatus: 'awaiting', qrData: null });
    } else {
      broadcastCustomerDisplay('ready');
    }
  }, [broadcastCustomerDisplay, showUpi, cart, selectedCustomer, discountAmt, taxAmt, subtotal, total, totalItemsQty, paymentMode, paymentBreakdown]);

  const buildInvoiceData = useCallback((invoiceNumber, overrides = {}) => {
    const payMode = paymentBreakdown?.length ? 'Split' : paymentMode;
    const status = String(payMode).toLowerCase() === 'credit' ? 'Unpaid' : 'Paid';

    return {
      invoiceNumber,
      // Keep invoiceBarcode identical to invoiceNumber (scannable & compact)
      invoiceBarcode: invoiceNumber,
      date: new Date().toISOString(),
      items: cart,
      totalItemsQty,
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || 'Walking Customer',
      customerPhone: selectedCustomer?.phone || '',
      customerAddress: selectedCustomer?.address || '',
      subtotal,
      discountAmt,
      taxAmt,
      total,
      // Store discount amount (fixed)
      discount,
      discountType: 'amount',
      taxRate,
      taxBreakdown,
      paymentMode: payMode,
      paymentBreakdown: paymentBreakdown?.length ? paymentBreakdown : null,
      status,
      notes,
      redeemedPoints: selectedCustomer?._redeemPoints || 0,
      ...overrides,
    };
  }, [
    cart,
    discount,
    discountAmt,
    notes,
    paymentBreakdown,
    paymentMode,
    selectedCustomer,
    subtotal,
    taxAmt,
    taxBreakdown,
    taxRate,
    total,
    totalItemsQty,
  ]);

  const validatePartitionPayment = useCallback(() => {
    if (!paymentBreakdown?.length) return { ok: true };
    const sum = paymentBreakdown.reduce((s, p) => s + (Number(p?.amount) || 0), 0);
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    if (round2(sum) !== round2(total)) {
      return { ok: false, error: 'Partition payment must match the total exactly' };
    }
    return { ok: true };
  }, [paymentBreakdown, total]);

  const handleReviewReceipt = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    const guard = validateCheckoutGuards();
    if (!guard.ok) return toast.error(guard.error);
    const v = validatePartitionPayment();
    if (!v.ok) return toast.error(v.error);

    const preview = buildInvoiceData(`PREVIEW-${new Date().toISOString().slice(11, 19).replaceAll(':', '')}`, {
      isPreview: true,
      status: 'Preview',
    });

    try {
      await printInvoicePDF(preview, company, 'thermal', { mode: 'preview', printSettings, invoiceTextStyles, forceDialog: true });
      setReviewSignature(currentBillSignature);
      toast.success('Preview receipt printed');
    } catch {
      toast.error('Failed to print preview receipt');
    }
  };

  const handleReviewReceiptRemote = async () => {
    // Check if device is client and connected
    if (deviceRole !== 'client') {
      toast.error('Remote print is only available on client devices');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to main device. Please connect first.');
      return;
    }

    if (cart.length === 0) return toast.error('Cart is empty');
    const guard = validateCheckoutGuards();
    if (!guard.ok) return toast.error(guard.error);
    const v = validatePartitionPayment();
    if (!v.ok) return toast.error(v.error);

    const preview = buildInvoiceData(`PREVIEW-${new Date().toISOString().slice(11, 19).replaceAll(':', '')}`, {
      isPreview: true,
      status: 'Preview',
    });

    try {
      toast.loading('Sending preview to main device...', { id: 'remote-preview' });
      
      await remotePrintInvoice(
        preview, 
        company, 
        'thermal', 
        { mode: 'preview', printSettings, invoiceTextStyles },
        requestRemotePrint
      );
      
      setReviewSignature(currentBillSignature);
      toast.success('Preview sent to main device!', { id: 'remote-preview' });
    } catch (error) {
      console.error('Remote preview print failed:', error);
      toast.error(error?.message || 'Failed to send preview', { id: 'remote-preview' });
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    const guard = validateCheckoutGuards();
    if (!guard.ok) return toast.error(guard.error);
    if (posSettings?.reviewBeforeCheckout) {
      return toast.error('Use Review Receipt and then Payment OK to finalize this sale');
    }
    const v = validatePartitionPayment();
    if (!v.ok) return toast.error(v.error);

    // Double-click / fast billing lock
    if (finalizeCheckoutRef.current) return;
    finalizeCheckoutRef.current = true;
    setIsProcessing(true);

    try {
      const invoiceNumber = await reserveProfessionalInvoiceNumber(company);
      const invoiceData = buildInvoiceData(invoiceNumber);

      // UPI flow (single-mode only): do NOT create invoice before payment is verified.
      if (!paymentBreakdown?.length && String(paymentMode).toUpperCase() === 'UPI') {
        try {
          const s = await loadPaymentSettings();
          setPaymentSettings(s);
        } catch {
          setPaymentSettings(null);
        }
        finalizeUpiRef.current = false;
        setUpiDraft(invoiceData);
        setShowUpi(true);
        broadcastCustomerDisplay('waiting', { qrData: null, paymentStatus: 'pending' });
        return;
      }

      const id = await addInvoice(invoiceData);
      setShowSuccess({ ...invoiceData, id });
      broadcastCustomerDisplay('paid', { paymentStatus: 'paid' });
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setNotes('');
      setPaymentBreakdown(null);
      setReviewSignature(null);
      toast.success('Invoice created!');
      playCheckoutSound();
      if (printSettings?.billPrint?.behavior?.autoPrintAfterCheckout || posSettings?.autoPrintAfterCheckout) {
        autoPrintInvoice({ ...invoiceData, id }, company, 'thermal', { printSettings, invoiceTextStyles }).catch(() => {});
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to create invoice');
    } finally {
      setIsProcessing(false);
      finalizeCheckoutRef.current = false;
    }
  };

  // ─── Remote Print Handler ──────────────────────────────────────────────
  const handleRemotePrintFromPOS = async (invoice) => {
    // Check if device is client and connected
    if (deviceRole !== 'client') {
      toast.error('Remote print is only available on client devices');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to main device. Please connect first.');
      return;
    }

    try {
      toast.loading('Sending print request to main device...', { id: 'pos-remote-print' });
      
      await remotePrintInvoice(
        invoice, 
        company, 
        'thermal', 
        { printSettings, invoiceTextStyles },
        requestRemotePrint
      );
      
      toast.success('Print request sent to main device!', { id: 'pos-remote-print' });
    } catch (error) {
      console.error('Remote print failed:', error);
      toast.error(error?.message || 'Failed to send print request', { id: 'pos-remote-print' });
    }
  };

  const handlePaymentOk = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    const guard = validateCheckoutGuards();
    if (!guard.ok) return toast.error(guard.error);
    if (!reviewSignature || reviewSignature !== currentBillSignature) {
      return toast.error('Please use Review Receipt before Payment OK');
    }
    const v = validatePartitionPayment();
    if (!v.ok) return toast.error(v.error);

    if (finalizeCheckoutRef.current) return;
    finalizeCheckoutRef.current = true;
    setIsProcessing(true);

    try {
      const invoiceNumber = await reserveProfessionalInvoiceNumber(company);
      const invoiceData = buildInvoiceData(invoiceNumber);

      const id = await addInvoice(invoiceData);
      broadcastCustomerDisplay('paid', { paymentStatus: 'paid' });
      toast.success(`Payment OK — Saved (${invoiceNumber})`);
      playCheckoutSound();

      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setNotes('');
      setPaymentBreakdown(null);
      setReviewSignature(null);
      setShowSuccess({ ...invoiceData, id, paperless: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to finalize sale');
    } finally {
      setIsProcessing(false);
      finalizeCheckoutRef.current = false;
    }
  };

  // Load held bills from IndexedDB on mount
  useEffect(() => {
    getAllHeldBills().then(bills => setHeldBills(bills || [])).catch(() => {});
  }, []);

  const holdBill = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    const totalQty = cart.reduce((s, i) => s + (i.qty || 0), 0);
    const bill = {
      id: Date.now(),
      cart, selectedCustomer,
      customerName: selectedCustomer?.name || 'Walking Customer',
      discount, taxRate, paymentMode, paymentBreakdown, notes, total, totalQty,
      heldAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    await saveHeldBill(bill);
    setHeldBills(prev => [...prev, bill]);
    setCart([]); setSelectedCustomer(null); setDiscount(0);
    setNotes(''); setPaymentBreakdown(null); setReviewSignature(null);
    toast.success('Bill held — start new billing');
  };

  const resumeBill = async (bill) => {
    setCart(bill.cart || []);
    setSelectedCustomer(bill.selectedCustomer || null);
    setDiscount(Number(bill.discount) || 0);
    setTaxRate(Number(bill.taxRate) || 0);
    setPaymentMode(bill.paymentMode || 'Cash');
    setPaymentBreakdown(bill.paymentBreakdown || null);
    setNotes(bill.notes || '');
    setReviewSignature(null);
    await removeHeldBill(bill.id);
    setHeldBills(prev => prev.filter(item => item.id !== bill.id));
    toast.success('Held bill resumed');
  };

  const deleteHeldBill = async (billId) => {
    await removeHeldBill(billId);
    setHeldBills(prev => prev.filter(bill => bill.id !== billId));
    toast.success('Held bill removed');
  };
// Enhanced barcode scanner with keyboard support (plug & play scanner gun)
  useEffect(() => {
    let buffer = '';
    let lastTs = 0;
    let timeoutId = null;

    const MIN_BARCODE_LEN = 3;
    const MAX_INTER_CHAR_DELAY_MS = 160;
    const IDLE_FINALIZE_MS = 220;

    const clearScanBuffer = () => {
      buffer = '';
      lastTs = 0;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const matchProduct = (code) => {
      const normalized = normalizeBarcodeValue(code || '');
      if (!normalized) return null;
      return products.find((p) => {
        const barcode = normalizeBarcodeValue(p.barcode || '');
        const sku = normalizeBarcodeValue(p.sku || '');
        return barcode === normalized || sku === normalized || barcode.includes(normalized) || sku.includes(normalized);
      });
    };

    const handleScannedCode = async (rawCode) => {
      const code = normalizeBarcodeValue(rawCode || '');
      if (code.length < MIN_BARCODE_LEN) {
        clearScanBuffer();
        return;
      }

      setSearch('');
      clearScanBuffer();

      // PROFESSIONAL SIZE SYSTEM: Try variant barcode first (instant add without size selection)
      try {
        const variant = await getVariantByCode(code);
        if (variant) {
          const product = products.find(p => p.id === variant.productId);
          if (product) {
            // Add directly with variant details - NO SIZE SELECTION MODAL NEEDED
            const chosenPrice = Number(variant.price ?? product.price ?? 0);
            const chosenTaxRate = Number(variant.taxRate ?? product.taxRate ?? 18);
            const variantId = variant.id || null;   // FIX: use variant.id not variant.variantId
            const variantLabel = [variant.size, variant.color].filter(Boolean).join(' / ') || variant.label || '';
            const lineKey = `${product.id}:${variantId || variant.label}`;
            
            setCart(prev => {
              const existing = prev.find(i => i.lineKey === lineKey);
              if (existing) {
                return prev.map(i => i.lineKey === lineKey ? { ...i, qty: i.qty + 1 } : i);
              }
              return [...prev, {
                productId: product.id,
                lineKey,
                name: `${product.name}${variantLabel ? ' - ' + variantLabel : ''}`,
                price: chosenPrice,
                qty: 1,
                taxRate: chosenTaxRate,
                hsn: product.hsn || '',
                size: variantLabel,
                variantId,
                barcode: variant.barcode || '',
                sku: variant.sku || '',
              }];
            });
            
            toast.success(`${product.name}${variantLabel ? ' (' + variantLabel + ')' : ''} added`, { duration: 1000 });
            searchInputRef.current?.focus?.();
            return;
          }
        }
      } catch (err) {
        console.error('Variant lookup error:', err);
      }

      // NEW: Try size-code barcode matching (e.g., SHIRT001M)
      // Extract size code and try to find matching product + variant
      const sizeCode = extractSizeCodeFromBarcode(code);
      if (sizeCode) {
        const baseBarcode = extractBaseBarcode(code);
        const sizeLabel = mapSizeCodeToLabel(sizeCode);
        
        // Find product matching base barcode
        const matchingProduct = products.find((p) => {
          const barcode = normalizeBarcodeValue(p.barcode || '');
          const sku = normalizeBarcodeValue(p.sku || '');
          const baseNorm = normalizeBarcodeValue(baseBarcode || '');
          return barcode === baseNorm || sku === baseNorm || baseNorm.includes(barcode) || baseNorm.includes(sku);
        });

        if (matchingProduct && sizeLabel) {
          // Try to find variant with matching size
          const variants = Array.isArray(matchingProduct.variants) ? matchingProduct.variants : [];
          const matchingVariant = variants.find(v => 
            String(v?.label || '').toUpperCase() === String(sizeLabel || '').toUpperCase()
          );

          if (matchingVariant) {
            const chosenPrice = Number(matchingVariant.price ?? matchingProduct.price ?? 0);
            const chosenTaxRate = Number(matchingVariant.taxRate ?? matchingProduct.taxRate ?? 18);
            const lineKey = `${matchingProduct.id}:${matchingVariant.id}`;

            setCart(prev => {
              const existing = prev.find(i => i.lineKey === lineKey);
              if (existing) {
                return prev.map(i => i.lineKey === lineKey ? { ...i, qty: i.qty + 1 } : i);
              }
              return [...prev, {
                productId: matchingProduct.id,
                lineKey,
                name: `${matchingProduct.name} - ${sizeLabel}`,
                price: chosenPrice,
                qty: 1,
                taxRate: chosenTaxRate,
                hsn: matchingProduct.hsn || '',
                size: sizeLabel,
                variantId: matchingVariant.id,
                barcode: code,
                sku: matchingVariant.sku || '',
              }];
            });

            toast.success(`${matchingProduct.name} (${sizeLabel}) added`, { duration: 1000 });
            searchInputRef.current?.focus?.();
            return;
          }
        }
      }

      // Fallback: Try legacy product barcode
      const product = matchProduct(code);
      if (product) {
        addToCart(product);
        searchInputRef.current?.focus?.();
        return;
      }

      if (code.startsWith('CUST-')) {
        const inv = invoices.find((i) => String(i.customerBarcode || '') === code);
        if (inv?.customerId) {
          const cust = customers.find((c) => c.id === inv.customerId);
          if (cust) {
            setSelectedCustomer(cust);
            toast.success(`Customer selected: ${cust.name}`, { duration: 1500 });
            searchInputRef.current?.focus?.();
          } else {
            toast.error('Customer not found for this bill barcode');
          }
        } else {
          toast.error('No invoice found for this bill barcode');
        }
        return;
      }

      // Nothing found — show clear error message
      toast.error(`Barcode not registered: "${code}"`, { duration: 2500 });
      searchInputRef.current?.focus?.();
    };

    const finalize = () => handleScannedCode(buffer);

    const onKeyDown = (e) => {
      if (showScanner) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = performance.now();
      const delta = lastTs ? now - lastTs : 0;
      if (delta > MAX_INTER_CHAR_DELAY_MS && buffer.length) {
        finalize();
      }
      lastTs = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.trim().length >= MIN_BARCODE_LEN) {
          e.preventDefault();
          finalize();
        } else {
          clearScanBuffer();
        }
        return;
      }

      if (e.key.length !== 1) return;
      buffer += e.key;
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (buffer.trim().length >= MIN_BARCODE_LEN) finalize();
        else clearScanBuffer();
      }, IDLE_FINALIZE_MS);
    };

    const onPaste = (e) => {
      const pasted = e.clipboardData?.getData('text/plain')?.trim();
      if (!pasted || pasted.length < MIN_BARCODE_LEN) return;
      e.preventDefault();
      handleScannedCode(pasted);
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('paste', onPaste, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('paste', onPaste, true);
      clearScanBuffer();
    };
  }, [showScanner, products, invoices, customers, addToCart, getVariantByCode]);


  return (
    <div className="h-screen overflow-hidden">
      <ResizableThreePane
        storageKey="pos:layout:3pane:v1"
        defaultLeft={460}
        defaultMiddle={520}
        minLeft={320}
        minMiddle={380}
        minRight={360}
        left={
          <div className="h-full flex flex-col overflow-hidden p-3">
            <div className="card p-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    className="input pl-8 py-2 text-sm"
                    placeholder="Search name / SKU / barcode…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <button onClick={() => setShowScanner(true)} className="btn-secondary btn-sm">
                  <Camera size={14} /> Scan
                </button>
              </div>
            </div>

            <div className="card flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Choose Items</p>
                  <p className="text-xs text-gray-400">{filtered.length} products</p>
                </div>
                <button
                  onClick={() => setShowFavoritesOnly(f => !f)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${showFavoritesOnly ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-amber-50 hover:text-amber-600'}`}
                  title="Toggle Quick Keys / Favorites"
                >
                  <Star size={12} /> Quick Keys {favoriteProducts.length > 0 && `(${favoriteProducts.length})`}
                </button>
              </div>

              {/* Quick Keys / Favorites Strip */}
              {favoriteProducts.length > 0 && (
                <div className="px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] text-amber-600 font-semibold mb-1.5 flex items-center gap-1"><Star size={10} /> QUICK KEYS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {favoriteProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => openQuickAdd(p)}
                        className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-all flex items-center gap-1"
                        title={`${p.name} — ${formatCurrency(p.price, company.currency)}`}
                      >
                        {p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name}
                        <span className="text-[10px] opacity-70">{formatCurrency(p.price, company.currency)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 p-3 overflow-y-auto flex-1">
                {(showFavoritesOnly ? favoriteProducts : filtered).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => openQuickAdd(product)}
                    className="border border-gray-100 dark:border-gray-800 rounded-xl p-2 text-left hover:border-primary-300 hover:shadow-sm transition-all active:scale-[0.99] bg-white dark:bg-gray-900 flex flex-col relative"
                    title="Add to cart"
                  >
                    {/* Favorite star */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                      className={`absolute top-1.5 right-1.5 z-10 p-0.5 rounded-full transition-all ${favoriteIds.includes(product.id) ? 'text-amber-500' : 'text-gray-200 hover:text-amber-400'}`}
                      title={favoriteIds.includes(product.id) ? 'Remove from Quick Keys' : 'Add to Quick Keys'}
                    >
                      <Star size={11} fill={favoriteIds.includes(product.id) ? 'currentColor' : 'none'} />
                    </button>
                    {/* Product image */}
                    {product.imageUrl ? (
                      <div className="w-full h-20 rounded-lg overflow-hidden mb-2 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-20 rounded-lg mb-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Package size={28} className="text-gray-200 dark:text-gray-700" />
                      </div>
                    )}
                    <p className="text-xs font-semibold truncate leading-tight">{product.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary-600 font-bold text-xs">
                        {formatCurrency(product.price, company.currency)}
                      </span>
                      <span className={`text-[10px] ${product.stock <= (product.minStock || 5) ? 'text-red-500' : 'text-gray-400'}`}>
                        {typeof product.stock === 'number' ? `Stk ${product.stock}` : '∞'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{product.category || ''}</p>
                  </button>
                ))}
                {(showFavoritesOnly ? favoriteProducts : filtered).length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-400">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p>{showFavoritesOnly ? 'No Quick Keys set. Click ★ on products to pin them.' : 'No products found'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
        middle={
          <div className="h-full flex flex-col overflow-hidden p-3">
            <div className="card p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Selected Items</p>
                  <p className="text-xs text-gray-400">
                    {cart.length} lines • {totalItemsQty} qty
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    if (!cart.length) return;
                    if (window.confirm('Clear cart?')) {
                      setCart([]);
                      setDiscount(0);
                      setNotes('');
                      setPaymentBreakdown(null);
                      setReviewSignature(null);
                    }
                  }}
                  disabled={!cart.length || isProcessing}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="card flex-1 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-[11px] text-gray-500">
                <div className="col-span-6">Item</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="overflow-y-auto h-full p-2 space-y-2">
                {cart.length === 0 && (
                  <div className="text-center py-16 text-gray-300 dark:text-gray-600">
                    <ShoppingCart size={44} className="mx-auto mb-3" />
                    <p className="text-sm">No items selected</p>
                    <p className="text-xs text-gray-400 mt-1">Search and click products to add</p>
                  </div>
                )}

                {cart.map((item) => (
                  <div key={item.lineKey} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <div className="col-span-6 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-gray-500">
                        {item.variantName ? <span>{item.variantName}</span> : null}
                        {item.size ? <span>• {item.size}</span> : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">Edit rate:</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updatePrice(item.lineKey, e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateQty(item.lineKey, item.qty - 1)}
                        className="pos-icon-btn"
                        title="Minus"
                        disabled={isProcessing}
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateQty(item.lineKey, parseInt(e.target.value) || 1)}
                        className="w-12 text-center text-sm font-semibold bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg py-1"
                        min={1}
                      />
                      <button
                        onClick={() => updateQty(item.lineKey, item.qty + 1)}
                        className="pos-icon-btn"
                        title="Plus"
                        disabled={isProcessing}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="col-span-2 text-right text-xs text-gray-500">
                      {formatCurrency(item.price, company.currency)}
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(item.price * item.qty, company.currency)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.lineKey)}
                        className="pos-icon-btn text-red-500"
                        title="Remove"
                        disabled={isProcessing}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col overflow-hidden p-3">
            <div className="card p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Payment & Checkout</p>
                  <p className="text-xs text-gray-400">Fast billing • accurate totals • paper-saving flow</p>
                </div>
                <button
                  onClick={() => setShowHeldBills(true)}
                  className="relative flex items-center gap-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 text-xs font-medium"
                  title="Hold current bill / View held bills"
                >
                  <PauseCircle size={14} />
                  Hold
                  {heldBills.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {heldBills.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="card p-3 mb-3 space-y-3">
              <CustomerSelector selectedCustomer={selectedCustomer} onSelect={setSelectedCustomer} company={company} />

              {/* Loyalty Points Display & Redeem */}
              {selectedCustomer && (() => {
                const pts = Number(selectedCustomer.points || 0);
                const redeemRate = Number(loyaltySettings?.redeemRate) || 0.5;
                const redeemValue = pts * redeemRate;
                return pts > 0 ? (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-amber-500" />
                      <div>
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{pts.toLocaleString()} pts available</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500">= {formatCurrency(redeemValue, company.currency)} discount</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const minRedeemPoints = Math.max(0, Number(loyaltySettings?.minRedeemPoints) || 0);
                        const maxRedeemPct = Math.min(100, Math.max(0, Number(loyaltySettings?.maxRedeemPct) || 100));
                        const redeemRate = Number(loyaltySettings?.redeemRate) || 0.5;
                        if (pts < minRedeemPoints) {
                          return toast.error(`Minimum ${minRedeemPoints} points required to redeem`);
                        }
                        const maxByTotal = redeemRate > 0 ? Math.floor(total / redeemRate) : 0;
                        const maxByPolicy = redeemRate > 0 ? Math.floor((total * (maxRedeemPct / 100)) / redeemRate) : 0;
                        const maxRedeem = Math.min(pts, maxByTotal, maxByPolicy || maxByTotal);
                        if (maxRedeem <= 0) return toast.error('No redeemable points for this bill');
                        const ptsToRedeem = window.prompt(`Redeem points (max ${maxRedeem} pts = ${formatCurrency(maxRedeem * 0.5, company.currency)}):`, String(maxRedeem));
                        if (!ptsToRedeem) return;
                        const p = parseInt(ptsToRedeem);
                        if (isNaN(p) || p <= 0) return toast.error('Invalid points');
                        if (p > pts) return toast.error('Insufficient points');
                        if (p < minRedeemPoints) return toast.error(`Minimum ${minRedeemPoints} points required`);
                        const discountFromPoints = p * redeemRate;
                        setDiscount(prev => Math.round((prev + discountFromPoints) * 100) / 100);
                        setSelectedCustomer(prev => ({ ...prev, _redeemPoints: (prev._redeemPoints || 0) + p }));
                        toast.success(`${p} pts redeemed = ${formatCurrency(discountFromPoints, company.currency)} discount applied`);
                      }}
                      className="text-xs px-2 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold"
                      disabled={isProcessing}
                    >
                      Redeem
                    </button>
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Discount (₹)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={discount}
                    min={0}
                    max={Math.max(0, maxAllowedDiscountAmount)}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(parseFloat(e.target.value) || 0, maxAllowedDiscountAmount)))}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="label">Tax %</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={taxRate}
                    min={0}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowPartition(true)}
                  disabled={cart.length === 0 || isProcessing}
                  className="btn-secondary btn-sm w-full justify-center"
                >
                  Partition Payment
                </button>
                <div>
                  <label className="label">Payment Mode</label>
                  <select
                    className="input py-2 text-sm"
                    value={paymentBreakdown?.length ? 'Split' : paymentMode}
                    onChange={(e) => { setPaymentMode(e.target.value); setPaymentBreakdown(null); setReviewSignature(null); }}
                    disabled={isProcessing}
                  >
                    {['Cash', 'UPI', 'Card', 'Credit', 'Cheque', 'Net Banking', 'Split'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {paymentBreakdown?.length ? (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Split Summary</span>
                    <button
                      type="button"
                      onClick={() => { setPaymentBreakdown(null); setReviewSignature(null); }}
                      className="text-red-500 hover:underline"
                      disabled={isProcessing}
                    >
                      Clear
                    </button>
                  </div>
                  {paymentBreakdown.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>{p.method}</span>
                      <span className="font-semibold">{formatCurrency(p.amount, company.currency)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="card p-3 flex-1 overflow-auto space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Total Items</span>
                <span className="font-semibold">{totalItemsQty}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal, company.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount</span>
                <span className="font-semibold">-{formatCurrency(discountAmt, company.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>GST / Tax</span>
                <span className="font-semibold">{formatCurrency(taxAmt, company.currency)}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total, company.currency)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleReviewReceipt}
                  disabled={cart.length === 0 || isProcessing}
                  className="btn-secondary w-full justify-center"
                >
                  Review Receipt
                </button>
                <button
                  type="button"
                  onClick={handlePaymentOk}
                  disabled={cart.length === 0 || isProcessing || !(reviewSignature && reviewSignature === currentBillSignature)}
                  className="btn-secondary w-full justify-center"
                  title="Finalize without printing again (after preview)"
                >
                  Payment OK
                </button>
              </div>

              {/* Remote Preview Button - Only show for client devices */}
              {deviceRole === 'client' && isConnected && (
                <button
                  type="button"
                  onClick={handleReviewReceiptRemote}
                  disabled={cart.length === 0 || isProcessing}
                  className="btn-secondary w-full justify-center py-2.5 text-sm mt-2 gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Cloud size={16} /> Preview on Main Device
                </button>
              )}

              <button
                onClick={holdBill}
                disabled={cart.length === 0 || isProcessing}
                className="btn-secondary w-full justify-center py-2.5 text-sm mt-1 gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <PauseCircle size={16} /> Hold Bill
              </button>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
                className="btn-primary w-full justify-center py-3 text-base mt-2"
              >
                <Save size={18} /> Checkout
              </button>

              <button
                type="button"
                onClick={openCustomerDisplay}
                className="btn-secondary w-full justify-center py-3 text-base mt-2"
              >
                <Monitor size={18} /> Open Customer Display
              </button>

              {isProcessing && (
                <div className="text-xs text-gray-400 text-center pt-2">
                  Processing… please wait (duplicate billing protection enabled)
                </div>
              )}

              <div className="pt-3">
                <label className="label">Notes</label>
                <textarea
                  className="input text-sm py-2 resize-none"
                  rows={2}
                  placeholder="Notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>
        }
      />

      {/* Partition Payment Modal */}
      <PartitionPaymentModal
        open={showPartition}
        onClose={() => setShowPartition(false)}
        total={total}
        currency={company?.currency}
        initialBreakdown={paymentBreakdown}
        onConfirm={(bd) => {
          setPaymentBreakdown(bd);
          setPaymentMode('Split');
          setReviewSignature(null);
          setShowPartition(false);
        }}
      />

      {/* Barcode Scanner Modal */}
      <Modal open={showScanner} onClose={() => { setShowScanner(false); try { Quagga.stop(); } catch {} }} title="Barcode Scanner">
        <div ref={scannerRef} className="w-full h-64 bg-black rounded-xl overflow-hidden" />
        <p className="text-center text-sm text-gray-500 mt-3">Point camera at barcode</p>
      </Modal>

      <Modal open={!!quickAddProduct} onClose={() => setQuickAddProduct(null)} title={`Add ${quickAddProduct?.name || 'Item'}`} size="sm">
        <div className="space-y-4">
          {/* Product image in quick-add modal */}
          {quickAddProduct?.imageUrl && (
            <div className="flex justify-center">
              <img
                src={quickAddProduct.imageUrl}
                alt={quickAddProduct.name}
                className="h-28 w-28 rounded-xl object-cover border border-gray-100 dark:border-gray-800 shadow-sm"
              />
            </div>
          )}
          {getProductSizeOptions(quickAddProduct).length > 0 && (
            <div>
              <label className="label">Size</label>
              <select
                className="input py-2 text-sm"
                value={quickAddSize}
                onChange={(e) => setQuickAddSize(e.target.value)}
              >
                {getProductSizeOptions(quickAddProduct).map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          )}

          {getProductVariantOptions(quickAddProduct).length > 0 && (
            <div>
              <label className="label">Variant</label>
              <select
                className="input py-2 text-sm"
                value={quickAddVariantId}
                onChange={(e) => setQuickAddVariantId(e.target.value)}
              >
                {getProductVariantOptions(quickAddProduct).map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn-secondary" onClick={() => setQuickAddProduct(null)}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!quickAddProduct) return;
              addToCart(quickAddProduct, { size: quickAddSize, variantId: quickAddVariantId });
              setQuickAddProduct(null);
            }}
          >
            Add to Cart
          </button>
        </div>
      </Modal>

      {/* UPI Payment Modal */}
      <UpiPaymentModal
        open={showUpi}
        onClose={() => setShowUpi(false)}
        settings={paymentSettings}
        amount={upiDraft?.total || total}
        invoiceNumber={upiDraft?.invoiceNumber}
        customerPhone={upiDraft?.customerPhone}
        currentUser={currentUser}
        invoiceDraft={upiDraft}
        onPaymentSuccess={async ({ orderId, txnId, attemptId, manual }) => {
          if (finalizeUpiRef.current) return;
          finalizeUpiRef.current = true;

          try {
            const draft = upiDraft;
            if (!draft) {
              toast.error('Unable to finalize: invoice draft missing');
              return;
            }

            const finalInvoice = {
              ...draft,
              paymentMode: 'UPI',
              status: 'Paid',
              upiOrderId: orderId || null,
              upiTxnId: txnId || null,
              paymentAttemptId: attemptId || null,
              manualUpiConfirm: manual === true,
            };

            const id = await addInvoice(finalInvoice);
            const saved = { ...finalInvoice, id };
            setShowSuccess(saved);

            // Link attempt -> invoice (idempotency / audit)
            try {
              if (attemptId) await updatePaymentAttempt(attemptId, { invoiceId: id });
            } catch {}

            // Reset billing state (same as normal checkout)
            setCart([]);
            setSelectedCustomer(null);
            setDiscount(0);
            setNotes('');
            setPaymentBreakdown(null);
            setReviewSignature(null);
            toast.success('UPI payment successful — invoice created!');
            playUpiSuccessSound();

            // Auto print (best-effort; never block billing)
            try {
              await autoPrintInvoice(saved, company, 'thermal', { printSettings, invoiceTextStyles });
            } catch {}
          } finally {
            setShowUpi(false);
            setUpiDraft(null);
          }
        }}
      />

      {/* Success Modal - Invoice Generated */}
      <HoldBillManager
        open={showHeldBills}
        onClose={() => setShowHeldBills(false)}
        heldBills={heldBills}
        onResume={resumeBill}
        onDelete={deleteHeldBill}
      />

      <Modal open={!!showSuccess} onClose={() => setShowSuccess(null)} title="" size="sm">
        {showSuccess && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <Save size={28} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{showSuccess.invoiceNumber}</p>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{showSuccess.customerName}</p>
              {showSuccess.customerPhone && (
                <p className="text-sm text-gray-400 mt-0.5">📞 {showSuccess.customerPhone}</p>
              )}
              <p className="text-4xl font-bold text-primary-600 dark:text-primary-400 mt-3">{formatCurrency(showSuccess.total, company.currency)}</p>
              <div className="flex gap-2 justify-center mt-3">
                <span className="badge-green">{showSuccess.paymentMode}</span>
                <span className="badge-blue">{formatDate(showSuccess.date)}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
              {/* Send Invoice PDF via WhatsApp */}
              {showSuccess.customerPhone ? (
                <button
                  onClick={() => { setInvoiceSendTarget(showSuccess); setShowSuccess(null); }}
                  className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
                >
                  <MessageCircle size={18} /> Send Invoice via WhatsApp
                </button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                  <span>💡 Add customer phone to enable WhatsApp invoice sharing.</span>
                </div>
              )}
              {showSuccess.paperless ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Saved successfully (paper saving mode — no duplicate print).
                </p>
              ) : (
                <>
                  <button onClick={() => { downloadInvoicePDF(showSuccess, company, 'a4', { printSettings, invoiceTextStyles }); }} className="btn-primary w-full justify-center py-3 gap-2">
                    <Printer size={18} /> Download PDF
                  </button>
                  <button onClick={() => { printInvoicePDF(showSuccess, company, 'thermal', { printSettings, invoiceTextStyles, forceDialog: true }); }} className="btn-secondary w-full justify-center py-3 gap-2">
                    <Printer size={18} /> Print Bill
                  </button>
                  {/* Remote Print Button - Only show for client devices */}
                  {deviceRole === 'client' && isConnected && (
                    <button 
                      onClick={() => handleRemotePrintFromPOS(showSuccess)} 
                      className="w-full justify-center py-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center shadow-sm"
                    >
                      <Cloud size={18} /> Print on Main Device
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setShowSuccess(null)} className="w-full py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice Send Modal — WhatsApp PDF sharing */}
      <InvoiceSendModal
        open={!!invoiceSendTarget}
        onClose={() => setInvoiceSendTarget(null)}
        invoice={invoiceSendTarget}
        customer={selectedCustomer || (invoiceSendTarget ? { name: invoiceSendTarget.customerName, phone: invoiceSendTarget.customerPhone } : null)}
        company={company}
        printSettings={printSettings}
      />
    </div>
  );
}

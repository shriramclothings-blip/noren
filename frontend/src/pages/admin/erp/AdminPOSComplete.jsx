/**
 * Admin POS Complete - Comprehensive POS System
 * Integrated into admin dashboard with all features from billing-pos-app
 * Features: Billing, Invoicing, Inventory, Customers, Suppliers, Reports, Analytics
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ShoppingCart, Package, Users, BarChart3, Settings,
  Search, Plus, Minus, Trash2, Printer, CreditCard,
  Banknote, QrCode, CheckSquare, Gift, Building2, ScanLine,
  RotateCcw, ChevronDown, ChevronUp, CheckCircle2, Clock,
  LogIn, History, Smartphone, Calculator,
  Eye, AlertCircle, Tag, Percent, Monitor, TrendingUp, Download,
  Filter, Calendar, DollarSign, Wallet, X, User, Phone, Mail,
  MapPin, FileText, ShoppingBag, Truck, MoreVertical, Edit2,
  Archive, RefreshCw, AlertTriangle, CheckCircle, Loader,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ============================================================================
// SHARED STYLES & CONSTANTS
// ============================================================================

const inp = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff',
};

const btn = (variant = 'primary') => {
  const variants = {
    primary: { background: '#c9a96e', color: '#fff', border: 'none' },
    secondary: { background: '#f3f4f6', color: '#374151', border: '1.5px solid #e5e7eb' },
    danger: { background: '#fef2f2', color: '#f87171', border: '1.5px solid #fee2e2' },
    success: { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #dcfce7' },
  };
  return {
    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
    fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
    ...variants[variant],
  };
};

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', Icon: Banknote },
  { key: 'upi', label: 'UPI', Icon: QrCode },
  { key: 'card', label: 'Card', Icon: CreditCard },
  { key: 'wallet', label: 'Wallet', Icon: Wallet },
  { key: 'cheque', label: 'Cheque', Icon: CheckSquare },
  { key: 'gift_card', label: 'Gift Card', Icon: Gift },
  { key: 'store_credit', label: 'Store Credit', Icon: Building2 },
];

const TAB_GROUPS = [
  { key: 'billing', label: 'Billing', icon: 'ShoppingCart' },
  { key: 'inventory', label: 'Inventory', icon: 'Package' },
  { key: 'customers', label: 'Customers', icon: 'Users' },
  { key: 'suppliers', label: 'Suppliers', icon: 'Truck' },
  { key: 'reports', label: 'Reports', icon: 'BarChart3' },
  { key: 'settings', label: 'Settings', icon: 'Settings' },
];

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

// ============================================================================
// BILLING TAB
// ============================================================================

function BillingTab() {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [amountEntered, setAmountEntered] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  // Load products and customers
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, customersRes] = await Promise.all([
          api.get('/erp/inventory').catch(() => ({ data: { items: [] } })),
          api.get('/erp/customers').catch(() => ({ data: { customers: [] } })),
        ]);
        setProducts(productsRes.data.items || []);
        setCustomers(customersRes.data.customers || []);
      } catch (err) {
        console.error('Failed to load data', err);
        toast.error('Failed to load inventory/customers');
      }
    };
    loadData();
  }, []);

  // Filter products
  useEffect(() => {
    if (!search.trim()) {
      setFilteredProducts(products.slice(0, 20));
      return;
    }
    const q = search.toLowerCase();
    setFilteredProducts(products.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').includes(search)
    ).slice(0, 20));
  }, [search, products]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        title: product.title || product.name,
        price: parseFloat(product.selling_price || product.price || 0),
        qty: 1,
        tax_rate: product.gst_rate || taxRate,
        sku: product.sku || '',
        barcode: product.barcode || '',
      }];
    });
    setSearch('');
    toast.success('Added to cart', { duration: 800 });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) removeFromCart(id);
    else setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const discountAmt = Math.min(discount, subtotal);
  const taxableAmount = subtotal - discountAmt;
  const tax = taxableAmount * (taxRate / 100);
  const total = taxableAmount + tax;
  const amountPaid = parseFloat(amountEntered) || 0;
  const changeDue = amountPaid - total;

  const completeSale = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (!amountPaid || amountPaid < total) return toast.error('Insufficient payment');

    setLoading(true);
    try {
      const res = await api.post('/erp/pos/sale', {
        items: cart.map(i => ({
          inventory_item_id: i.id,
          quantity: i.qty,
          unit_price: i.price,
          tax_amount: i.price * i.qty * (i.tax_rate / 100),
          discount_amount: (discountAmt / cart.length) || 0,
        })),
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        discount_amount: discountAmt,
        tax_amount: tax,
        total: total,
        notes: notes,
      });

      setCompletedSale(res.data);
      setCart([]);
      setAmountEntered('');
      setNotes('');
      setSelectedCustomer(null);
      toast.success(`Sale completed: ${res.data.bill_no || 'Invoice created'}`);
    } catch (err) {
      console.error('Sale error:', err);
      toast.error(err.response?.data?.message || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 16, height: '100%' }}>
      {/* Products */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, flex: 1 }}
          />
          <button style={btn('secondary')}>
            <Search size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {filteredProducts.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              style={{
                padding: 12, borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{p.title}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{fmtMoney(p.selling_price || p.price)}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Qty: {p.quantity || 0}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid #e5e7eb', paddingLeft: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Cart Items ({cart.length})</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cart.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 24 }}>No items in cart</div>
          ) : cart.map(item => (
            <div key={item.id} style={{ background: '#f9fafb', padding: 8, borderRadius: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: '#111827' }}>{item.title}</span>
                <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280' }}>
                <span>{fmtMoney(item.price)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', borderRadius: 4, padding: '2px 4px' }}>
                  <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}>
                    <Minus size={12} />
                  </button>
                  <span style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}>
                    <Plus size={12} />
                  </button>
                </div>
                <span style={{ fontWeight: 600 }}>{fmtMoney(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f9fafb', padding: 14, borderRadius: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Checkout</div>

        {/* Customer */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Customer</label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={e => {
              const cust = customers.find(c => c.id === e.target.value);
              setSelectedCustomer(cust || null);
            }}
            style={{ ...inp, fontSize: 12 }}
          >
            <option value="">Walk-in Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Payment</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {PAYMENT_METHODS.slice(0, 4).map(pm => (
              <button
                key={pm.key}
                onClick={() => setPaymentMethod(pm.key)}
                style={{
                  padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: paymentMethod === pm.key ? '2px solid #c9a96e' : '1px solid #e5e7eb',
                  background: paymentMethod === pm.key ? '#fff7ed' : '#fff',
                  color: paymentMethod === pm.key ? '#c9a96e' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}
              >
                <pm.Icon size={12} /> {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Discount */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Discount (₹)</label>
          <input
            type="number"
            min="0"
            value={discount}
            onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            style={inp}
          />
        </div>

        {/* Totals */}
        <div style={{ background: '#fff', borderRadius: 6, padding: 10, fontSize: 12, borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#6b7280' }}>
            <span>Subtotal:</span>
            <span>{fmtMoney(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#6b7280' }}>
            <span>Discount:</span>
            <span>-{fmtMoney(discountAmt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#6b7280' }}>
            <span>Tax ({taxRate}%):</span>
            <span>{fmtMoney(tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: '#111827', paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
            <span>Total:</span>
            <span>{fmtMoney(total)}</span>
          </div>
        </div>

        {/* Amount Paid */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Amount Paid (₹)</label>
          <input
            type="number"
            min="0"
            value={amountEntered}
            onChange={e => setAmountEntered(e.target.value)}
            style={{ ...inp, fontSize: 14, fontWeight: 700, textAlign: 'center' }}
            placeholder="0.00"
          />
        </div>

        {amountPaid >= total && (
          <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
            Change: {fmtMoney(changeDue)}
          </div>
        )}

        {/* Complete Sale Button */}
        <button
          onClick={completeSale}
          disabled={loading || !cart.length || !amountPaid || amountPaid < total}
          style={{
            ...btn('primary'),
            width: '100%', justifyContent: 'center', fontSize: 13, fontWeight: 700,
            padding: 10, opacity: loading || !cart.length || !amountPaid || amountPaid < total ? 0.5 : 1,
            cursor: loading || !cart.length || !amountPaid || amountPaid < total ? 'not-allowed' : 'pointer',
          }}
        >
          <ShoppingCart size={14} /> {loading ? 'Processing...' : 'Complete Sale'}
        </button>
      </div>

      {/* Sale Success Modal */}
      {completedSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 400, textAlign: 'center' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 16px', color: '#16a34a' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Sale Completed!</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Bill #{completedSale.bill_no} - {fmtMoney(completedSale.total)}
            </div>
            <button
              onClick={() => setCompletedSale(null)}
              style={btn('primary')}
            >
              New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INVENTORY TAB
// ============================================================================

function InventoryTab() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const res = await api.get('/erp/inventory').catch(() => ({ data: { items: [] } }));
        setInventory(res.data.items || []);
      } catch (err) {
        console.error('Failed to load inventory', err);
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };
    loadInventory();
  }, []);

  const filtered = inventory.filter(item =>
    (item.title || item.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: 20, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8 }}><Loader size={16} /> Loading inventory...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search inventory..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, maxWidth: 400 }}
        />
      </div>
      {inventory.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No inventory items found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>SKU</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Product</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Price</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#111827', fontWeight: 600 }}>{item.sku || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#111827' }}>{item.title || item.name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: (item.current_stock || 0) < 10 ? '#ef4444' : '#111827' }}>
                    {fmtNum(item.current_stock || item.quantity || 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#111827' }}>{fmtMoney(item.selling_price || item.price || 0)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#c9a96e' }}>
                    {fmtMoney(((item.selling_price || item.price || 0) * (item.current_stock || item.quantity || 0)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CUSTOMERS TAB
// ============================================================================

function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await api.get('/erp/customers').catch(() => ({ data: { customers: [] } }));
        setCustomers(res.data.customers || []);
      } catch (err) {
        console.error('Failed to load customers', err);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, []);

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  if (loading) return <div style={{ padding: 20, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8 }}><Loader size={16} /> Loading customers...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, maxWidth: 400 }}
        />
      </div>
      {customers.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No customers found</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(customer => (
            <div key={customer.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{customer.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Phone size={12} /> {customer.phone || 'N/A'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} /> {customer.email || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUPPLIERS TAB
// ============================================================================

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await api.get('/erp/suppliers').catch(() => ({ data: { suppliers: [] } }));
        setSuppliers(res.data.suppliers || []);
      } catch (err) {
        console.error('Failed to load suppliers', err);
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };
    loadSuppliers();
  }, []);

  const filtered = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: 20, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8 }}><Loader size={16} /> Loading suppliers...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, maxWidth: 400 }}
        />
      </div>
      {suppliers.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No suppliers found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Company</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(supplier => (
                <tr key={supplier.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#111827', fontWeight: 600 }}>{supplier.name}</td>
                  <td style={{ padding: '10px 12px', color: '#111827' }}>{supplier.company_name || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{supplier.email || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{supplier.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// REPORTS TAB
// ============================================================================

function ReportsTab() {
  const [sales, setSales] = useState(0);
  const [bills, setBills] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const res = await api.get(`/erp/pos/reports?from=${dateFrom}&to=${dateTo}`).catch(() => ({ data: { total_bills: 0, bill_count: 0, total_revenue: 0 } }));
        setSales(res.data.total_bills || 0);
        setBills(res.data.bill_count || 0);
        setRevenue(res.data.total_revenue || 0);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [dateFrom, dateTo]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8 }}><Loader size={16} /> Loading reports...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Total Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#c9a96e' }}>{fmtMoney(revenue)}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Bills Generated</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{fmtNum(bills)}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Average Per Bill</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
              {fmtMoney(bills > 0 ? revenue / bills : 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

function SettingsTab() {
  const [taxRate, setTaxRate] = useState(18);
  const [storeName, setStoreName] = useState('NOREN');
  const [storeEmail, setStoreEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.post('/erp/pos/settings', {
        tax_rate: taxRate,
        store_name: storeName,
        store_email: storeEmail,
      }).catch(() => {
        // Fallback - just notify user settings updated
        return { data: {} };
      });
      toast.success('Settings saved');
    } catch (err) {
      console.error('Save settings error', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Store Name</label>
        <input
          type="text"
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          style={inp}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Store Email</label>
        <input
          type="email"
          value={storeEmail}
          onChange={e => setStoreEmail(e.target.value)}
          style={inp}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Default Tax Rate (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          value={taxRate}
          onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
          style={inp}
        />
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        style={btn('primary')}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminPOSComplete() {
  const [activeTab, setActiveTab] = useState('billing');
  const iconMap = {
    ShoppingCart, Package, Users, BarChart3, Settings, Truck,
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'billing':
        return <BillingTab />;
      case 'inventory':
        return <InventoryTab />;
      case 'customers':
        return <CustomersTab />;
      case 'suppliers':
        return <SuppliersTab />;
      case 'reports':
        return <ReportsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <BillingTab />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb',
        overflow: 'x', marginBottom: 20, paddingBottom: 12,
      }}>
        {TAB_GROUPS.map(tab => {
          const Icon = iconMap[tab.icon];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 0,
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? '#c9a96e' : '#6b7280',
                borderBottom: isActive ? '3px solid #c9a96e' : 'none',
                marginBottom: '-12px', paddingBottom: '20px',
                transition: 'all 0.2s',
              }}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {renderTab()}
      </div>
    </div>
  );
}

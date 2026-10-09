import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate, formatCurrency, getCustomerBehaviorBadgeClass, getCustomerBehaviorLabel } from '../utils/helpers';
import { User, Search, Plus, X, Phone, MapPin, ShoppingBag, ChevronDown, Check, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import WhatsAppButton from './WhatsAppButton';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', phone: '', address: '', notes: '', customer_behavior_type: null };

/**
 * CustomerSelector — compact inline component for POS billing.
 * Props:
 *   selectedCustomer  — current customer object or null
 *   onSelect(customer) — called when a customer is chosen (null = walk-in)
 *   company           — company object for currency formatting
 */
export default function CustomerSelector({ selectedCustomer, onSelect, company }) {
  const { customers, addCustomer, updateCustomer, invoices } = useApp();

  // Search dropdown state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Quick-add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState(null); // existing customer with same phone

  // Returning customer info panel
  const [showInfo, setShowInfo] = useState(false);

  // ── Search filtering ──────────────────────────────────────────────
  const filteredCustomers = customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(searchQuery);
  }).slice(0, 8); // cap suggestions for performance

  // ── Close dropdown on outside click ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const checkDuplicate = useCallback((phone) => {
    if (!phone || phone.length < 6) { setDuplicate(null); return; }
    const found = customers.find(c => c.phone === phone && (!form.id || c.id !== form.id));
    setDuplicate(found || null);
  }, [customers, form.id]);

  const handlePhoneChange = (val) => {
    setForm(f => ({ ...f, phone: val }));
    checkDuplicate(val);
  };

  const openAddModal = (prefillPhone = '') => {
    setForm({ ...EMPTY_FORM, phone: prefillPhone });
    setDuplicate(null);
    if (prefillPhone) checkDuplicate(prefillPhone);
    setShowAddModal(true);
    setSearchOpen(false);
  };

  // ── Quick-add: save ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Customer name is required');
    if (!form.phone.trim()) return toast.error('Phone number is required');
    setSaving(true);
    try {
      const id = await addCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        customer_behavior_type: form.customer_behavior_type || null,
        behavior_last_updated: form.customer_behavior_type ? new Date().toISOString() : null,
        dues: 0,
        points: 0,
        creditLimit: 0,
        total_orders: 0,
        total_spent: 0,
        last_purchase: null,
      });
      // Build the object to select immediately (id returned from dbAdd)
      const newCustomer = {
        id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        customer_behavior_type: form.customer_behavior_type || null,
      };
      onSelect(newCustomer);
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setDuplicate(null);
      toast.success(`${newCustomer.name} added & selected`);
    } catch (err) {
      toast.error('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  // ── Use duplicate instead of creating new ────────────────────────
  const handleUseDuplicate = () => {
    onSelect(duplicate);
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setDuplicate(null);
    toast.success(`${duplicate.name} selected`);
  };

  // ── Update duplicate with new details ────────────────────────────
  const handleUpdateDuplicate = async () => {
    setSaving(true);
    try {
      const updated = {
        ...duplicate,
        name: form.name.trim() || duplicate.name,
        address: form.address.trim() || duplicate.address,
        notes: form.notes.trim() || duplicate.notes,
        customer_behavior_type: form.customer_behavior_type || duplicate.customer_behavior_type || null,
        behavior_last_updated: form.customer_behavior_type ? new Date().toISOString() : duplicate.behavior_last_updated || null,
      };
      await updateCustomer(updated);
      onSelect(updated);
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setDuplicate(null);
      toast.success('Customer details updated');
    } catch {
      toast.error('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  // ── Customer purchase history ─────────────────────────────────────
  const customerInvoices = selectedCustomer
    ? invoices
        .filter(i => i.customerId === selectedCustomer.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const handleBehaviorUpdate = async (type) => {
    if (!selectedCustomer) return;
    const updatedCustomer = {
      ...selectedCustomer,
      customer_behavior_type: type,
      behavior_last_updated: type ? new Date().toISOString() : null,
    };
    try {
      await updateCustomer(updatedCustomer);
      onSelect(updatedCustomer);
      toast.success(type ? `${getCustomerBehaviorLabel(type)} saved` : 'Behavior tag cleared');
    } catch {
      toast.error('Failed to update customer behavior');
    }
  };

  const totalSpent = customerInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const lastPurchase = customerInvoices[0]?.date || selectedCustomer?.last_purchase;

  // ── Keyboard navigation in dropdown ──────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    if (e.key === 'Enter' && filteredCustomers.length > 0) {
      onSelect(filteredCustomers[0]);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
      {/* ── Selected customer display ── */}
      {selectedCustomer ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {selectedCustomer.name?.[0]?.toUpperCase()}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedCustomer.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${getCustomerBehaviorBadgeClass(selectedCustomer.customer_behavior_type)}`}>
                  {getCustomerBehaviorLabel(selectedCustomer.customer_behavior_type)}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedCustomer.phone}</p>
            </div>
            {/* WhatsApp quick-send */}
            {selectedCustomer.phone && (
              <WhatsAppButton
                customer={selectedCustomer}
                company={company}
                variant="icon"
                size="sm"
                title={`WhatsApp ${selectedCustomer.name}`}
              />
            )}
            {/* History toggle */}
            {customerInvoices.length > 0 && (
              <button
                onClick={() => setShowInfo(v => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0"
                title="View purchase history"
              >
                <ShoppingBag size={12} />
                {customerInvoices.length}
                <ChevronDown size={12} className={`transition-transform ${showInfo ? 'rotate-180' : ''}`} />
              </button>
            )}
            {/* Clear */}
            <button
              onClick={() => { onSelect(null); setShowInfo(false); }}
              className="p-1 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800 text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Remove customer"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mt-2">
            <button
              type="button"
              onClick={() => handleBehaviorUpdate('genuine')}
              className="btn-secondary btn-sm w-full"
            >
              Mark Genuine
            </button>
            <button
              type="button"
              onClick={() => handleBehaviorUpdate('bargain')}
              className="btn-secondary btn-sm w-full"
            >
              Mark Bargain
            </button>
            <button
              type="button"
              onClick={() => handleBehaviorUpdate(null)}
              className="btn-secondary btn-sm w-full"
            >
              Clear Tag
            </button>
          </div>

          {/* Returning customer info panel */}
          {showInfo && customerInvoices.length > 0 && (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 space-y-2 animate-fade-in">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-primary-600">{customerInvoices.length}</p>
                  <p className="text-xs text-gray-400">Orders</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalSpent, company?.currency)}</p>
                  <p className="text-xs text-gray-400">Total Spent</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{lastPurchase ? formatDate(lastPurchase) : '—'}</p>
                  <p className="text-xs text-gray-400">Last Visit</p>
                </div>
              </div>
              {/* Last 3 invoices */}
              <div className="space-y-1">
                {customerInvoices.slice(0, 3).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-primary-600">{inv.invoiceNumber}</span>
                    <span>{formatDate(inv.date)}</span>
                    <span className="font-semibold">{formatCurrency(inv.total, company?.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── No customer selected — show selector ── */
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setSearchOpen(v => !v)}
            className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-colors text-left"
          >
            <User size={15} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400 flex-1">Walking Customer — tap to add</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${searchOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {searchOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-slide-up">
              {/* Search input */}
              <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    className="input pl-8 py-1.5 text-sm"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-56 overflow-y-auto">
                {/* Walk-in option */}
                <button
                  onClick={() => { onSelect(null); setSearchOpen(false); setSearchQuery(''); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-500">Continue as Walking Customer</span>
                </button>

                {/* Existing customers */}
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { onSelect(c); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getCustomerBehaviorBadgeClass(c.customer_behavior_type)}`}>
                          {getCustomerBehaviorLabel(c.customer_behavior_type)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                    </div>
                    {c.dues > 0 && (
                      <span className="text-xs text-red-500 font-medium flex-shrink-0">
                        Due: {formatCurrency(c.dues, company?.currency)}
                      </span>
                    )}
                  </button>
                ))}

                {/* No results + quick add */}
                {filteredCustomers.length === 0 && searchQuery && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center">No customer found</div>
                )}
              </div>

              {/* Add new customer */}
              <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => openAddModal(
                    /^\d+$/.test(searchQuery) ? searchQuery : ''
                  )}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-sm font-medium transition-colors"
                >
                  <Plus size={15} />
                  {searchQuery ? `Add "${searchQuery}" as walking customer` : 'Add Walking Customer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Add Customer Modal ── */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setDuplicate(null); }} title="Add Walking Customer" size="sm">
        <div className="space-y-3">
          {/* Duplicate warning */}
          {duplicate && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Customer already exists</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    <strong>{duplicate.name}</strong> · {duplicate.phone}
                    {duplicate.address && ` · ${duplicate.address}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={handleUseDuplicate}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors"
                >
                  <Check size={13} /> Use Existing
                </button>
                <button
                  onClick={handleUpdateDuplicate}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Update Details
                </button>
              </div>
            </div>
          )}

          {/* Form fields */}
          <div>
            <label className="label">Customer Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="label">Customer Type</label>
            <select
              className="input"
              value={form.customer_behavior_type || ''}
              onChange={e => setForm(f => ({ ...f, customer_behavior_type: e.target.value || null }))}
            >
              <option value="">Regular Customer</option>
              <option value="genuine">Genuine Customer</option>
              <option value="bargain">Bargain Customer</option>
            </select>
          </div>

          <div>
            <label className="label">Phone Number <span className="text-red-500">*</span></label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Mobile number"
                type="tel"
                value={form.phone}
                onChange={e => handlePhoneChange(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Address <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                className="input pl-9 resize-none"
                rows={2}
                placeholder="Street, city..."
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Any notes about this customer..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 justify-center"
            >
              {saving ? 'Saving...' : 'Save & Select'}
            </button>
            <button
              onClick={() => { setShowAddModal(false); setDuplicate(null); }}
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

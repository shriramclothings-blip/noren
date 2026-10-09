import React, { useState, useEffect } from 'react';
import { Type, Eye, RotateCcw, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSetting, setSetting } from '../db/db';
import {
  DEFAULT_INVOICE_TEXT_STYLES,
  validateInvoiceTextStyles,
  getElementLabel,
  getElementDescription,
  getElementGroups,
  exportInvoiceTextStyles,
  importInvoiceTextStyles,
} from '../utils/invoiceTextStyles';

/**
 * Invoice Text Styles Panel Component
 * 
 * Allows users to customize the appearance of different invoice text elements:
 * - Font Weight: Normal or Bold
 * - Opacity: Normal or Faded
 */
export default function InvoiceTextStylesPanel() {
  const [styles, setStyles] = useState(DEFAULT_INVOICE_TEXT_STYLES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved styles from database on mount
  useEffect(() => {
    const loadStyles = async () => {
      try {
        const savedStyles = await getSetting('invoiceTextStyles');
        if (savedStyles) {
          setStyles(importInvoiceTextStyles(savedStyles));
        }
      } catch (error) {
        console.error('Failed to load invoice text styles:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStyles();
  }, []);

  // Update a specific element's style
  const updateElementStyle = (element, property, value) => {
    setStyles(prev => ({
      ...prev,
      [element]: {
        ...prev[element],
        [property]: value,
      },
    }));
    setHasChanges(true);
  };

  // Save styles to database
  const handleSave = async () => {
    setSaving(true);
    try {
      const validatedStyles = validateInvoiceTextStyles(styles);
      const exportedStyles = exportInvoiceTextStyles(validatedStyles);
      
      await setSetting('invoiceTextStyles', exportedStyles);
      
      // Emit event for other components to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('invoice-text-styles-changed', { 
          detail: exportedStyles 
        }));
      }
      
      toast.success('Invoice text styles saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save invoice text styles:', error);
      toast.error('Failed to save text styles');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default styles
  const handleReset = () => {
    if (window.confirm('Reset all text styles to default? This cannot be undone.')) {
      setStyles(DEFAULT_INVOICE_TEXT_STYLES);
      setHasChanges(true);
      toast.success('Text styles reset to default');
    }
  };

  // Preview example showing current style
  const renderPreview = (element) => {
    const style = styles[element];
    const fontWeight = style.fontWeight === 'bold' ? '700' : '400';
    const opacity = style.opacity === 'faded' ? '0.6' : '1';
    
    return (
      <div 
        className="text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ fontWeight, opacity }}
      >
        {getElementLabel(element)}: ₹1,234.56
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading text styles...</div>
      </div>
    );
  }

  const elementGroups = getElementGroups();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Type className="text-primary-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Invoice Text Styling
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customize how different text elements appear on printed invoices. 
            Make important amounts bold or fade less important information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Reset to default styles"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Help Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">How Text Styling Works:</p>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Bold</strong>: Makes text stand out with heavier font weight</li>
            <li>• <strong>Normal</strong>: Standard font weight (default for most items)</li>
            <li>• <strong>Faded</strong>: Reduces opacity to 60% (good for less important info)</li>
            <li>• Changes apply to all future invoice prints</li>
          </ul>
        </div>
      </div>

      {/* Style Controls by Group */}
      {elementGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="card p-5 space-y-4">
          <h4 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">
            {group.label}
          </h4>
          
          <div className="space-y-4">
            {group.elements.map((element) => {
              const elementStyle = styles[element];
              
              return (
                <div key={element} className="space-y-3">
                  {/* Element Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-sm text-gray-900 dark:text-white">
                        {getElementLabel(element)}
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {getElementDescription(element)}
                      </p>
                    </div>
                    
                    {/* Preview */}
                    <div className="flex items-center gap-2">
                      <Eye size={14} className="text-gray-400" />
                      {renderPreview(element)}
                    </div>
                  </div>

                  {/* Style Controls */}
                  <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {/* Font Weight */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Font Weight
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateElementStyle(element, 'fontWeight', 'normal')}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                            elementStyle.fontWeight === 'normal'
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          onClick={() => updateElementStyle(element, 'fontWeight', 'bold')}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all font-bold ${
                            elementStyle.fontWeight === 'bold'
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                          }`}
                        >
                          Bold
                        </button>
                      </div>
                    </div>

                    {/* Opacity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Opacity
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateElementStyle(element, 'opacity', 'normal')}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                            elementStyle.opacity === 'normal'
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          onClick={() => updateElementStyle(element, 'opacity', 'faded')}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all opacity-60 ${
                            elementStyle.opacity === 'faded'
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                          }`}
                        >
                          Faded
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save Footer */}
      {hasChanges && (
        <div className="sticky bottom-0 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle size={18} />
            <span>You have unsaved changes</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Common Presets Section */}
      <div className="card p-5 space-y-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <Type size={16} className="text-indigo-600" />
          Quick Presets
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Preset 1: Professional */}
          <button
            onClick={() => {
              setStyles({
                ...DEFAULT_INVOICE_TEXT_STYLES,
                total: { fontWeight: 'bold', opacity: 'normal' },
                subtotal: { fontWeight: 'normal', opacity: 'faded' },
                discount: { fontWeight: 'normal', opacity: 'faded' },
                tax: { fontWeight: 'normal', opacity: 'faded' },
              });
              setHasChanges(true);
              toast.success('Applied Professional preset');
            }}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 transition-all text-left"
          >
            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Professional</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Bold total, faded breakdowns</p>
          </button>

          {/* Preset 2: Minimal */}
          <button
            onClick={() => {
              setStyles({
                ...DEFAULT_INVOICE_TEXT_STYLES,
                total: { fontWeight: 'bold', opacity: 'normal' },
                subtotal: { fontWeight: 'normal', opacity: 'normal' },
                discount: { fontWeight: 'normal', opacity: 'normal' },
                tax: { fontWeight: 'normal', opacity: 'normal' },
              });
              setHasChanges(true);
              toast.success('Applied Minimal preset');
            }}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 transition-all text-left"
          >
            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Minimal</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Everything normal weight</p>
          </button>

          {/* Preset 3: High Contrast */}
          <button
            onClick={() => {
              setStyles({
                ...DEFAULT_INVOICE_TEXT_STYLES,
                total: { fontWeight: 'bold', opacity: 'normal' },
                subtotal: { fontWeight: 'bold', opacity: 'normal' },
                discount: { fontWeight: 'bold', opacity: 'normal' },
                tax: { fontWeight: 'bold', opacity: 'normal' },
                date: { fontWeight: 'normal', opacity: 'faded' },
                footerMessage: { fontWeight: 'normal', opacity: 'faded' },
              });
              setHasChanges(true);
              toast.success('Applied High Contrast preset');
            }}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 transition-all text-left"
          >
            <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">High Contrast</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Bold totals, faded extras</p>
          </button>
        </div>
      </div>
    </div>
  );
}

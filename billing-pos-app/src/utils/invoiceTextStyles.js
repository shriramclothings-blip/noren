/**
 * Invoice Text Styling Utility
 * 
 * This module manages custom text styling (font weight and opacity) for invoice elements.
 * Allows customization of how different invoice line items appear (bold/normal, faded/normal).
 */

// Default styling configuration for all invoice text elements
export const DEFAULT_INVOICE_TEXT_STYLES = {
  subtotal: {
    fontWeight: 'normal',  // 'normal' or 'bold'
    opacity: 'normal',     // 'normal' or 'faded'
  },
  discount: {
    fontWeight: 'normal',
    opacity: 'normal',
  },
  tax: {
    fontWeight: 'normal',
    opacity: 'normal',
  },
  total: {
    fontWeight: 'bold',    // Total is bold by default
    opacity: 'normal',
  },
  paymentMode: {
    fontWeight: 'normal',
    opacity: 'normal',
  },
  customerName: {
    fontWeight: 'normal',
    opacity: 'normal',
  },
  invoiceNumber: {
    fontWeight: 'bold',
    opacity: 'normal',
  },
  date: {
    fontWeight: 'normal',
    opacity: 'faded',
  },
  itemName: {
    fontWeight: 'bold',
    opacity: 'normal',
  },
  itemPrice: {
    fontWeight: 'normal',
    opacity: 'normal',
  },
  footerMessage: {
    fontWeight: 'normal',
    opacity: 'faded',
  },
};

/**
 * Get CSS inline style string for a given element's styling configuration
 * @param {Object} styleConfig - Style config with fontWeight and opacity
 * @returns {string} - Inline CSS style string
 */
export const getInlineStyle = (styleConfig) => {
  if (!styleConfig) return '';
  
  const styles = [];
  
  // Font weight
  if (styleConfig.fontWeight === 'bold') {
    styles.push('font-weight: 700');
  } else if (styleConfig.fontWeight === 'normal') {
    styles.push('font-weight: 400');
  }
  
  // Opacity
  if (styleConfig.opacity === 'faded') {
    styles.push('opacity: 0.6');
  } else if (styleConfig.opacity === 'normal') {
    styles.push('opacity: 1');
  }
  
  return styles.length > 0 ? styles.join('; ') : '';
};

/**
 * Merge user settings with default styles
 * @param {Object} userStyles - User's custom styles
 * @returns {Object} - Merged styles with defaults
 */
export const mergeInvoiceTextStyles = (userStyles = {}) => {
  const merged = { ...DEFAULT_INVOICE_TEXT_STYLES };
  
  if (userStyles && typeof userStyles === 'object') {
    Object.keys(merged).forEach(key => {
      if (userStyles[key] && typeof userStyles[key] === 'object') {
        merged[key] = {
          ...merged[key],
          ...userStyles[key],
        };
      }
    });
  }
  
  return merged;
};

/**
 * Get human-readable label for element keys
 * @param {string} key - Element key
 * @returns {string} - Human-readable label
 */
export const getElementLabel = (key) => {
  const labels = {
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax / GST',
    total: 'Total Amount',
    paymentMode: 'Payment Mode',
    customerName: 'Customer Name',
    invoiceNumber: 'Invoice Number',
    date: 'Date/Time',
    itemName: 'Item Names',
    itemPrice: 'Item Prices',
    footerMessage: 'Footer Message',
  };
  
  return labels[key] || key;
};

/**
 * Get element description for help text
 * @param {string} key - Element key
 * @returns {string} - Description
 */
export const getElementDescription = (key) => {
  const descriptions = {
    subtotal: 'Total before discounts and taxes',
    discount: 'Discount amount line',
    tax: 'Tax/GST amount line',
    total: 'Final total amount (grand total)',
    paymentMode: 'Payment method (Cash, Card, etc.)',
    customerName: 'Customer name on invoice',
    invoiceNumber: 'Invoice reference number',
    date: 'Invoice date and time',
    itemName: 'Product/item names in table',
    itemPrice: 'Item prices and amounts',
    footerMessage: 'Thank you message at bottom',
  };
  
  return descriptions[key] || '';
};

/**
 * Validate text styles configuration
 * @param {Object} styles - Styles to validate
 * @returns {Object} - Validated styles
 */
export const validateInvoiceTextStyles = (styles) => {
  if (!styles || typeof styles !== 'object') {
    return DEFAULT_INVOICE_TEXT_STYLES;
  }
  
  const validated = {};
  
  Object.keys(DEFAULT_INVOICE_TEXT_STYLES).forEach(key => {
    const style = styles[key];
    
    if (style && typeof style === 'object') {
      validated[key] = {
        fontWeight: ['normal', 'bold'].includes(style.fontWeight) ? style.fontWeight : 'normal',
        opacity: ['normal', 'faded'].includes(style.opacity) ? style.opacity : 'normal',
      };
    } else {
      validated[key] = { ...DEFAULT_INVOICE_TEXT_STYLES[key] };
    }
  });
  
  return validated;
};

/**
 * Get grouped elements for settings UI
 * @returns {Array} - Array of element groups
 */
export const getElementGroups = () => {
  return [
    {
      label: 'Invoice Header',
      elements: ['invoiceNumber', 'date', 'customerName', 'paymentMode'],
    },
    {
      label: 'Item Table',
      elements: ['itemName', 'itemPrice'],
    },
    {
      label: 'Totals Section',
      elements: ['subtotal', 'discount', 'tax', 'total'],
    },
    {
      label: 'Footer',
      elements: ['footerMessage'],
    },
  ];
};

/**
 * Export styles for saving to database
 * @param {Object} styles - Current styles
 * @returns {Object} - Styles ready for storage
 */
export const exportInvoiceTextStyles = (styles) => {
  return validateInvoiceTextStyles(styles);
};

/**
 * Import styles from database
 * @param {Object} savedStyles - Saved styles from database
 * @returns {Object} - Merged and validated styles
 */
export const importInvoiceTextStyles = (savedStyles) => {
  return mergeInvoiceTextStyles(savedStyles);
};

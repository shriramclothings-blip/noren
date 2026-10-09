/**
 * Thermal Printer Utilities
 * Industrial-grade barcode label printing for 58mm and 80mm thermal printers
 * Optimized for perfect sticker label alignment and print quality
 */

export const THERMAL_PRINTER_TYPES = {
  THERMAL_58MM: {
    id: 'thermal58',
    name: '58mm Thermal Printer',
    width: 58,
    labelWidth: 50,  // Usable width accounting for margins
    labelHeight: 25,
    dpi: 203,
    description: 'Standard thermal printer (TSC TE200, Zebra, Xprinter)',
  },
  THERMAL_80MM: {
    id: 'thermal80',
    name: '80mm Thermal Printer',
    width: 80,
    labelWidth: 70,
    labelHeight: 40,
    dpi: 203,
    description: 'Wide thermal printer (Zebra, Datamax)',
  },
  A4_SHEET: {
    id: 'a4',
    name: 'A4 Paper Sheet',
    width: 210,
    labelWidth: 50,  // 25x50mm labels per sticker
    labelHeight: 25,
    labelsPerPage: 27,  // 3x9 grid
    description: 'A4 sheet printing for bulk label creation',
  },
};

/**
 * Get printer specifications by type
 */
export const getPrinterSpecs = (printerType) => {
  return THERMAL_PRINTER_TYPES[
    Object.keys(THERMAL_PRINTER_TYPES).find(key => THERMAL_PRINTER_TYPES[key].id === printerType)
  ] || THERMAL_PRINTER_TYPES.THERMAL_58MM;
};

/**
 * Barcode format validation for thermal printers
 * CODE128 is most reliable for thermal printers
 */
export const THERMAL_BARCODE_FORMATS = {
  CODE128: 'CODE128',      // Most compatible with thermal
  EAN13: 'EAN13',          // Good for retail
  UPCA: 'UPCA',            // Good for retail
  CODE39: 'CODE39',        // Wide but reliable
};

/**
 * Thermal printer presets with optimized margins and spacing
 */
export const THERMAL_PRINTER_PRESETS = {
  TSC_TE200: {
    name: 'TSC TE200',
    width: 58,
    height: 203,  // Max height mm
    leftMargin: 2,
    topMargin: 2,
    rightMargin: 2,
    bottomMargin: 2,
    dpi: 203,
    maxPrintWidth: 54,
    notes: '25x50mm label roll, high quality',
  },
  ZEBRA_2844: {
    name: 'Zebra ZD420',
    width: 58,
    height: 203,
    leftMargin: 2,
    topMargin: 2,
    rightMargin: 2,
    bottomMargin: 2,
    dpi: 203,
    maxPrintWidth: 54,
    notes: 'Zebra thermal, 58mm wide',
  },
  XPRINTER_58: {
    name: 'Xprinter XP-58MM',
    width: 58,
    height: 203,
    leftMargin: 3,
    topMargin: 3,
    rightMargin: 3,
    bottomMargin: 3,
    dpi: 203,
    maxPrintWidth: 52,
    notes: 'Budget-friendly 58mm thermal',
  },
  ZEBRA_880: {
    name: 'Zebra Z840',
    width: 80,
    height: 203,
    leftMargin: 2,
    topMargin: 2,
    rightMargin: 2,
    bottomMargin: 2,
    dpi: 203,
    maxPrintWidth: 76,
    notes: '80mm wide thermal for larger labels',
  },
};

/**
 * Validate barcode value for thermal printing
 */
export const validateBarcodeForThermal = (barcode, format = 'CODE128') => {
  if (!barcode) return false;
  
  const barcodeStr = String(barcode).trim();
  
  switch (format) {
    case 'EAN13':
      return /^\d{12,13}$/.test(barcodeStr);
    case 'CODE128':
      return barcodeStr.length > 0 && barcodeStr.length <= 48;
    case 'CODE39':
      return /^[A-Z0-9\-. $/+%]*$/.test(barcodeStr);
    case 'UPCA':
      return /^\d{11,12}$/.test(barcodeStr);
    default:
      return barcodeStr.length > 0;
  }
};

/**
 * Optimize image quality for thermal printing
 * Returns DPI multiplier for canvas rendering
 */
export const getThermalPrintQuality = (printerType) => {
  const specs = getPrinterSpecs(printerType);
  // Higher multiplier = sharper output, but slower
  return specs.id === 'a4' ? 2 : 1.5;  // Thermal needs less scaling
};

/**
 * Calculate optimal barcode size for label
 */
export const getOptimalBarcodeSize = (labelWidth, labelHeight, hasText = true) => {
  const availableHeight = hasText ? labelHeight - 8 : labelHeight - 4; // Space for text
  return {
    width: labelWidth - 4,     // Leave 2mm margin on each side
    height: Math.min(availableHeight, 15), // Max 15mm height for thermal
  };
};

/**
 * Get print margins for different printer types
 */
export const getPrintMargins = (printerType) => {
  if (printerType === 'a4') {
    return { top: 8, left: 8, right: 8, bottom: 8 };
  }
  
  // For thermal: minimal margins for better space usage
  return { top: 2, left: 2, right: 2, bottom: 2 };
};

/**
 * Format label data for thermal printing
 */
export const formatLabelForThermal = (product, company = {}) => {
  const currency = company.currency || '₹';
  
  return {
    name: (product.name || 'Product').substring(0, 20),
    sku: (product.sku || product.id || '').substring(0, 15),
    barcode: product.barcode || `SKU${product.id}`,
    price: `${currency}${Number(product.price || product.salePrice || 0).toFixed(2)}`,
    size: product.sizeLabel || product.label || null,
  };
};

/**
 * Check if printer is thermal type
 */
export const isThermalPrinter = (printerType) => {
  return printerType === 'thermal58' || printerType === 'thermal80';
};

/**
 * Get printing tip for user
 */
export const getPrinterTips = (printerType) => {
  const tips = {
    thermal58: [
      '✓ Load 25×50mm sticker roll in printer',
      '✓ Set print density to medium-high',
      '✓ Ensure label gap sensor is calibrated',
      '✓ Use thermal-sensitive label material',
    ],
    thermal80: [
      '✓ Use 80mm wide sticker roll',
      '✓ Align labels properly in feed',
      '✓ Print density: medium to high',
      '✓ Thermal labels work best',
    ],
    a4: [
      '✓ Use A4 thermal label sheets',
      '✓ Print at high quality setting',
      '✓ Ensure alignment before first sheet',
      '✓ Cut labels along guide lines',
    ],
  };
  
  return tips[printerType] || tips.thermal58;
};

const thermalPrinterUtils = {
  THERMAL_PRINTER_TYPES,
  THERMAL_PRINTER_PRESETS,
  THERMAL_BARCODE_FORMATS,
  getPrinterSpecs,
  validateBarcodeForThermal,
  getThermalPrintQuality,
  getOptimalBarcodeSize,
  getPrintMargins,
  formatLabelForThermal,
  isThermalPrinter,
  getPrinterTips,
};

export default thermalPrinterUtils;

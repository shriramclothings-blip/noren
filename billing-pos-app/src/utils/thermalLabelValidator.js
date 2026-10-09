/**
 * Thermal Label Validation System
 * Validates label dimensions, content fit, and barcode readability
 * Ensures production-ready, reliable label printing
 */

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - List of validation errors
 * @property {string[]} warnings - List of validation warnings
 * @property {Object} metadata - Validation metadata
 */

/**
 * Standard thermal label sizes (in mm)
 */
export const THERMAL_LABEL_SIZES = {
  shelf50x25: { width: 50, height: 25, name: '50×25mm Shelf Label', dpi: 203 },
  shelf4x6: { width: 101.6, height: 152.4, name: '4×6 Thermal Label', dpi: 203 },
  shelf3x5: { width: 76.2, height: 127, name: '3×5 Thermal Label', dpi: 203 },
  thermal58mm: { width: 58, height: 25, name: '58mm Thermal Sticker', dpi: 203 },
  thermal80mm: { width: 80, height: 25, name: '80mm Thermal Sticker', dpi: 203 },
};

/**
 * Printer configurations for different thermal printer models
 */
export const PRINTER_CONFIGS = {
  xprinter: {
    name: 'XPrinter',
    dpi: 203,
    minMargin: 1.5,
    maxMargin: 3,
    supportedSizes: ['shelf50x25', 'thermal58mm', 'thermal80mm', 'shelf4x6', 'shelf3x5'],
  },
  tvs: {
    name: 'TVS',
    dpi: 203,
    minMargin: 1,
    maxMargin: 2.5,
    supportedSizes: ['shelf50x25', 'thermal58mm', 'thermal80mm', 'shelf4x6', 'shelf3x5'],
  },
  tsc: {
    name: 'TSC',
    dpi: [203, 300],
    minMargin: 0.5,
    maxMargin: 2,
    supportedSizes: ['shelf50x25', 'thermal58mm', 'thermal80mm', 'shelf4x6', 'shelf3x5'],
  },
  zebra: {
    name: 'Zebra',
    dpi: [203, 300],
    minMargin: 1,
    maxMargin: 3,
    supportedSizes: ['shelf50x25', 'thermal58mm', 'thermal80mm', 'shelf4x6', 'shelf3x5'],
  },
  generic: {
    name: 'Generic Thermal Printer',
    dpi: 203,
    minMargin: 1.5,
    maxMargin: 3,
    supportedSizes: ['shelf50x25', 'thermal58mm', 'thermal80mm'],
  },
};

/**
 * Barcode specification for Code 128
 */
export const BARCODE_CODE128_SPECS = {
  format: 'CODE128',
  minWidth: 0.3, // mm - minimum module width for scanability
  maxWidth: 0.65, // mm - maximum module width for common scanners
  minHeight: 5, // mm - minimum bar height for readability
  quietZone: 10, // pixels minimum quiet zone on all sides
  scannerReadableHeightMm: 6, // mm - minimum height for scanner to reliably read
  humanReadableHeightMm: 4, // mm - space needed for human-readable text below barcode
};

/**
 * Validate label dimensions
 * @param {number} width - Label width in mm
 * @param {number} height - Label height in mm
 * @returns {ValidationResult}
 */
export function validateLabelDimensions(width, height) {
  const errors = [];
  const warnings = [];

  if (!width || width < 10) {
    errors.push('Label width must be at least 10mm');
  }
  if (!height || height < 10) {
    errors.push('Label height must be at least 10mm');
  }
  if (width > 300) {
    errors.push('Label width cannot exceed 300mm');
  }
  if (height > 300) {
    errors.push('Label height cannot exceed 300mm');
  }

  if (width < 25) {
    warnings.push('Label width is very narrow; text may not fit properly');
  }
  if (height < 20) {
    warnings.push('Label height is very short; barcode and text may overlap');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: { width, height },
  };
}

/**
 * Validate barcode parameters for Code 128
 * @param {number} barcodeValue - Barcode string
 * @param {number} moduleWidth - Barcode module width in mm
 * @param {number} height - Barcode height in mm
 * @returns {ValidationResult}
 */
export function validateBarcodeParams(barcodeValue, moduleWidth, height) {
  const errors = [];
  const warnings = [];

  if (!barcodeValue || String(barcodeValue).trim().length === 0) {
    errors.push('Barcode value cannot be empty');
  }
  if (String(barcodeValue).length > 128) {
    errors.push('Code 128 barcode cannot exceed 128 characters');
  }

  if (moduleWidth < BARCODE_CODE128_SPECS.minWidth) {
    errors.push(
      `Barcode module width (${moduleWidth}mm) is too narrow. Minimum: ${BARCODE_CODE128_SPECS.minWidth}mm for scanner readability`,
    );
  }
  if (moduleWidth > BARCODE_CODE128_SPECS.maxWidth) {
    warnings.push(
      `Barcode module width (${moduleWidth}mm) exceeds recommended maximum (${BARCODE_CODE128_SPECS.maxWidth}mm). Some scanners may have difficulty reading.`,
    );
  }

  if (height < BARCODE_CODE128_SPECS.minHeight) {
    errors.push(
      `Barcode height (${height}mm) is too short. Minimum: ${BARCODE_CODE128_SPECS.minHeight}mm for readability`,
    );
  }
  if (height < BARCODE_CODE128_SPECS.scannerReadableHeightMm) {
    warnings.push(`Barcode height (${height}mm) may be difficult for scanners. Recommended: ≥${BARCODE_CODE128_SPECS.scannerReadableHeightMm}mm`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: { barcodeValue, moduleWidth, height },
  };
}

/**
 * Validate label content fit (product name, SKU, price, barcode, etc.)
 * @param {Object} options - Validation options
 * @param {number} options.labelWidth - Label width in mm
 * @param {number} options.labelHeight - Label height in mm
 * @param {number} options.barcodeHeight - Barcode image height in mm
 * @param {boolean} options.showProductName - Include product name
 * @param {boolean} options.showSku - Include SKU
 * @param {boolean} options.showPrice - Include price
 * @param {boolean} options.showSize - Include size
 * @returns {ValidationResult}
 */
export function validateLabelContentFit(options) {
  const {
    labelWidth = 50,
    labelHeight = 25,
    barcodeHeight = 8,
    showProductName = true,
    showSku = true,
    showPrice = true,
    showSize = false,
  } = options;

  const errors = [];
  const warnings = [];

  // Minimum space requirements (in mm)
  const padding = 1.2;
  const barcodeTextHeight = 1.8; // For barcode number text below bars
  const barcodeGap = 1;
  const skuPriceLineHeight = (showSku || showPrice) ? 1.5 : 0;
  const productNameHeight = showProductName ? 2 : 0;
  const sizeHeight = showSize ? 1.5 : 0;

  const totalRequiredHeight =
    padding +
    productNameHeight +
    barcodeHeight +
    barcodeGap +
    barcodeTextHeight +
    sizeHeight +
    skuPriceLineHeight +
    padding;

  if (totalRequiredHeight > labelHeight) {
    const overage = (totalRequiredHeight - labelHeight).toFixed(1);
    errors.push(
      `Content does not fit: required ${totalRequiredHeight.toFixed(1)}mm, but label is only ${labelHeight}mm tall. Reduce by ${overage}mm or increase label height.`,
    );
  } else if (totalRequiredHeight > labelHeight - 1) {
    warnings.push(
      `Content is tight (${totalRequiredHeight.toFixed(1)}mm in ${labelHeight}mm). Consider increasing label height or reducing content.`,
    );
  }

  // Width validation
  const minContentWidth = labelWidth - padding * 2;
  if (minContentWidth < 5) {
    errors.push(`Label width is too narrow (${labelWidth}mm) for content`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      labelWidth,
      labelHeight,
      totalRequiredHeight: totalRequiredHeight.toFixed(1),
      contentWidth: minContentWidth,
    },
  };
}

/**
 * Validate complete label for production readiness
 * @param {Object} labelConfig - Complete label configuration
 * @returns {ValidationResult}
 */
export function validateCompleteLabel(labelConfig) {
  const {
    labelWidth = 50,
    labelHeight = 25,
    barcodeValue = '',
    barcodeModuleWidth = 0.6,
    barcodeHeight = 8,
    showProductName = true,
    showSku = true,
    showPrice = true,
    showSize = false,
    printerModel = 'generic',
  } = labelConfig;

  const allErrors = [];
  const allWarnings = [];

  // Validate dimensions
  const dimValidation = validateLabelDimensions(labelWidth, labelHeight);
  allErrors.push(...dimValidation.errors);
  allWarnings.push(...dimValidation.warnings);

  // Validate barcode
  const barcodeValidation = validateBarcodeParams(barcodeValue, barcodeModuleWidth, barcodeHeight);
  allErrors.push(...barcodeValidation.errors);
  allWarnings.push(...barcodeValidation.warnings);

  // Validate content fit
  const contentValidation = validateLabelContentFit({
    labelWidth,
    labelHeight,
    barcodeHeight,
    showProductName,
    showSku,
    showPrice,
    showSize,
  });
  allErrors.push(...contentValidation.errors);
  allWarnings.push(...contentValidation.warnings);

  // Validate printer compatibility
  const printer = PRINTER_CONFIGS[printerModel] || PRINTER_CONFIGS.generic;
  if (!printer.supportedSizes.some((size) => {
    const spec = THERMAL_LABEL_SIZES[size];
    return spec && Math.abs(spec.width - labelWidth) < 0.5 && Math.abs(spec.height - labelHeight) < 0.5;
  })) {
    allWarnings.push(
      `Label size (${labelWidth}×${labelHeight}mm) may not be standard for ${printer.name}. Verify printer supports custom sizes.`,
    );
  }

  // Special validation for 50×25 shelf labels
  if (labelWidth === 50 && labelHeight === 25) {
    if (barcodeHeight < 6) {
      allWarnings.push('For 50×25mm shelf labels, barcode height < 6mm may be hard to scan. Recommended: 6-8mm');
    }
    if (barcodeModuleWidth < 0.5) {
      allWarnings.push('For 50×25mm shelf labels, barcode modules < 0.5mm may print too thin. Recommended: 0.5-0.65mm');
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    metadata: {
      labelSize: `${labelWidth}×${labelHeight}mm`,
      barcode: barcodeValue,
      printer: printer.name,
      dpi: Array.isArray(printer.dpi) ? printer.dpi.join(', ') : printer.dpi,
    },
    isProductionReady: allErrors.length === 0 && allWarnings.length === 0,
  };
}

/**
 * Get DPI-based barcode module width for scanner readability
 * @param {number} dpi - Printer DPI (203 or 300)
 * @param {number} targetModuleWidthMm - Target module width in mm
 * @returns {number} Module width in pixels for the given DPI
 */
export function calculateModuleWidthInPixels(dpi, targetModuleWidthMm) {
  // Convert mm to inches: 1 inch = 25.4mm
  const inchesPerMm = 1 / 25.4;
  const moduleWidthInches = targetModuleWidthMm * inchesPerMm;
  return Math.round(moduleWidthInches * dpi);
}

/**
 * Calculate barcode dimensions for a given DPI and label size
 * @param {Object} options - Calculation options
 * @param {number} options.labelWidthMm - Label width in mm
 * @param {number} options.labelHeightMm - Label height in mm
 * @param {number} options.dpi - Printer DPI
 * @returns {Object} Barcode dimensions recommendations
 */
export function calculateBarcodeForDPI(options) {
  const { labelWidthMm = 50, labelHeightMm = 25, dpi = 203 } = options;
  const pixelsPerMm = dpi / 25.4;

  // For 50×25, optimal barcode parameters at 203 DPI
  if (labelWidthMm === 50 && labelHeightMm === 25) {
    return {
      dpi,
      moduleWidthMm: 0.58, // Optimal for 203 DPI on thermal printers
      barcodeHeightMm: 7,
      barcodeHeightPixels: Math.round(7 * pixelsPerMm),
      recommendedDPI: 203, // Standard for most thermal label printers
      notes: 'Optimized for retail shelf labels',
    };
  }

  // For other sizes, calculate proportionally
  const moduleWidthMm = Math.min(0.65, Math.max(0.3, (labelWidthMm * 0.12)));
  const barcodeHeightMm = Math.min(10, Math.max(5, labelHeightMm * 0.3));

  return {
    dpi,
    moduleWidthMm,
    barcodeHeightMm,
    barcodeHeightPixels: Math.round(barcodeHeightMm * pixelsPerMm),
    recommendedDPI: 203,
    notes: 'Calculated for standard thermal printing',
  };
}

/**
 * Generate comprehensive validation report for production
 * @param {Object[]} labels - Array of label configurations
 * @returns {Object} Comprehensive validation report
 */
export function generateValidationReport(labels) {
  const report = {
    timestamp: new Date().toISOString(),
    totalLabels: labels.length,
    validLabels: 0,
    invalidLabels: 0,
    allErrors: [],
    allWarnings: [],
    productionReady: false,
    labelValidations: [],
  };

  labels.forEach((label, idx) => {
    const validation = validateCompleteLabel(label);
    report.labelValidations.push({
      index: idx,
      ...validation,
    });

    if (validation.valid) {
      report.validLabels++;
    } else {
      report.invalidLabels++;
      report.allErrors.push(...validation.errors.map((e) => `Label ${idx + 1}: ${e}`));
    }

    report.allWarnings.push(...validation.warnings.map((w) => `Label ${idx + 1}: ${w}`));
  });

  report.productionReady = report.invalidLabels === 0;

  return report;
}

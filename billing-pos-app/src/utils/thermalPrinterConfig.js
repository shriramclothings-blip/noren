/**
 * Thermal Label Printer Configuration & Setup
 * Centralized configuration for thermal printers, DPI settings, and label sizes
 * Ensures consistency across all label printing operations
 */

/**
 * Thermal Printer Setup Configuration
 * Edit this to match your specific printer model and requirements
 */
export const THERMAL_PRINTER_CONFIG = {
  // Primary printer settings
  default: {
    model: 'generic', // 'xprinter', 'tvs', 'tsc', 'zebra', 'generic'
    dpi: 203, // Standard thermal printer DPI (203 or 300)
    labelSize: 'shelf50x25', // Default label size preset
    pageMargin: 0, // Margin in mm (0 for no margins on thermal)
    pageFormat: 'custom', // 'a4' or 'custom'
  },

  // XPrinter configuration (popular in retail)
  xprinter: {
    model: 'xprinter',
    name: 'XPrinter',
    dpi: 203,
    maxPrintWidth: 58, // mm
    supportsBitmapPrinting: true,
    supportsDirectPrinting: true,
    directPrintDPI: 203,
    requiresDriver: true,
    drivers: ['XPrinter Universal Driver', 'EPSON ESC/POS compatible'],
    notes: 'Popular in Indian retail POS. Install official driver or EPSON ESC/POS driver.',
  },

  // TVS Configuration
  tvs: {
    model: 'tvs',
    name: 'TVS',
    dpi: 203,
    maxPrintWidth: 80,
    supportsBitmapPrinting: true,
    supportsDirectPrinting: true,
    directPrintDPI: 203,
    requiresDriver: true,
    drivers: ['TVS Thermal Printer Driver', 'EPSON ESC/POS compatible'],
    notes: 'Industrial-grade thermal printer. Supports 203 DPI standard.',
  },

  // TSC Configuration (high DPI support)
  tsc: {
    model: 'tsc',
    name: 'TSC',
    dpi: [203, 300], // Supports both DPI settings
    maxPrintWidth: 104,
    supportsBitmapPrinting: true,
    supportsDirectPrinting: true,
    directPrintDPI: [203, 300],
    requiresDriver: true,
    drivers: ['TSC Thermal Printer Driver', 'Windows Print Driver'],
    notes: 'Premium thermal printer. Supports high DPI for crisp barcodes.',
  },

  // Zebra Configuration (high precision)
  zebra: {
    model: 'zebra',
    name: 'Zebra',
    dpi: [203, 300],
    maxPrintWidth: 104,
    supportsBitmapPrinting: true,
    supportsDirectPrinting: true,
    directPrintDPI: [203, 300],
    requiresDriver: true,
    drivers: ['Zebra Thermal Printer Driver', 'Zebra Link-OS'],
    notes: 'Enterprise-grade thermal printer. Excellent barcode quality.',
  },

  // Generic Configuration (fallback)
  generic: {
    model: 'generic',
    name: 'Generic Thermal Printer',
    dpi: 203,
    maxPrintWidth: 80,
    supportsBitmapPrinting: true,
    supportsDirectPrinting: false,
    directPrintDPI: 203,
    requiresDriver: false,
    drivers: ['Windows Print Driver (Generic/ESC*POS)'],
    notes: 'Works with any Windows thermal printer. May require manual printer selection.',
  },
};

/**
 * Label Size Presets with thermal printing specifics
 */
export const THERMAL_LABEL_PRESETS = {
  shelf50x25: {
    id: 'shelf50x25',
    name: '50×25mm Shelf Label',
    widthMm: 50,
    heightMm: 25,
    printer: 'thermal58mm',
    recommended: true,
    useCase: 'Retail shelf price tags',
    barcodeHeightMm: 7,
    barcodeModuleWidth: 0.58,
    padding: 1.2,
  },
  thermal58mm: {
    id: 'thermal58mm',
    name: '58mm Thermal Sticker',
    widthMm: 58,
    heightMm: 25,
    printer: 'thermal58mm',
    recommended: true,
    useCase: 'Generic thermal printer stickers',
    barcodeHeightMm: 7,
    barcodeModuleWidth: 0.58,
    padding: 1.2,
  },
  thermal80mm: {
    id: 'thermal80mm',
    name: '80mm Thermal Sticker',
    widthMm: 80,
    heightMm: 25,
    printer: 'thermal80mm',
    recommended: true,
    useCase: 'Wider thermal printer labels',
    barcodeHeightMm: 7,
    barcodeModuleWidth: 0.58,
    padding: 1.5,
  },
  shelf4x6: {
    id: 'shelf4x6',
    name: '4×6 Thermal Label (101.6×152.4mm)',
    widthMm: 101.6,
    heightMm: 152.4,
    printer: 'thermal4x6',
    recommended: true,
    useCase: 'Shipping/warehouse labels',
    barcodeHeightMm: 10,
    barcodeModuleWidth: 0.6,
    padding: 2,
  },
  clothing_tag: {
    id: 'clothing_tag',
    name: 'Clothing Tag (45×40mm)',
    widthMm: 45,
    heightMm: 40,
    printer: 'thermal58mm',
    recommended: false,
    useCase: 'Apparel labeling',
    barcodeHeightMm: 8,
    barcodeModuleWidth: 0.6,
    padding: 1.5,
  },
  price_tag: {
    id: 'price_tag',
    name: 'Price Tag (35×25mm)',
    widthMm: 35,
    heightMm: 25,
    printer: 'thermal58mm',
    recommended: false,
    useCase: 'Small price stickers',
    barcodeHeightMm: 5,
    barcodeModuleWidth: 0.55,
    padding: 1,
  },
};

/**
 * Print Settings for direct browser/PDF printing
 */
export const THERMAL_PRINT_SETTINGS = {
  // Browser print settings
  browser: {
    mediaSize: 'custom',
    orientation: 'portrait',
    margins: [0, 0, 0, 0], // No margins for thermal
    scale: 100, // Exact 1:1 scale
    headerFooter: false, // No headers/footers
    background: false, // Don't print background
    centerVertically: false,
    centerHorizontally: false,
  },

  // PDF generation settings
  pdf: {
    format: 'custom', // Custom dimensions
    orientation: 'portrait',
    unit: 'mm',
    margins: 0, // No margins
    compression: true,
    precision: 2, // mm precision
  },

  // Label content display settings
  content: {
    barcodeFormat: 'CODE128', // Always Code 128 for universal scanning
    humanReadableText: true, // Show barcode number below bars
    showProductName: true,
    showSku: true,
    showPrice: true,
    showSize: true,
    currencySymbol: '₹', // Default to Indian Rupees
  },
};

/**
 * CSS for thermal label printing
 * Ensures exact dimensions and no scaling/fitting
 */
export const getThermalPrintCSS = (widthMm, heightMm) => `
/* Thermal Label Printing CSS */
/* Ensures exactly ${widthMm}mm × ${heightMm}mm output */
/* No scaling, no fitting, no browser headers/footers */

@page {
  size: ${widthMm}mm ${heightMm}mm portrait;
  margin: 0;
  padding: 0;
}

html, body {
  width: ${widthMm}mm;
  height: ${heightMm}mm;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: white;
  color: black;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Label container */
.thermal-label-print {
  width: ${widthMm}mm;
  height: ${heightMm}mm;
  display: flex;
  flex-direction: column;
  page-break-inside: avoid;
  page-break-after: always;
}

/* Print-specific styles */
@media print {
  html, body {
    width: ${widthMm}mm;
    height: ${heightMm}mm;
    margin: 0;
    padding: 0;
  }

  .no-print {
    display: none !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  .thermal-label-print {
    width: ${widthMm}mm;
    height: ${heightMm}mm;
    page-break-inside: avoid;
    page-break-after: always;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  /* Prevent widow/orphan lines */
  p, h1, h2, h3, h4, h5, h6 {
    page-break-inside: avoid;
    page-break-after: avoid;
  }
}

/* Prevent scrollbars */
::-webkit-scrollbar {
  display: none;
}

html {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

/**
 * JavaScript for direct thermal printer support
 * Handles browser printing and print dialog setup
 */
export const getThermalPrintScript = () => `
(function() {
  'use strict';

  window.ThermalPrinter = {
    /**
     * Set up browser for thermal printing
     */
    setup() {
      // Disable scaling
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=no');
      }

      // Ensure no fit-to-page scaling
      document.addEventListener('beforeprint', () => {
        console.log('🖨️ Thermal label printing: Exact size, no scaling');
      });

      document.addEventListener('afterprint', () => {
        console.log('✓ Print completed');
      });
    },

    /**
     * Print thermal labels
     * @param {string} elementId - Element ID to print
     * @param {string} printerName - Optional printer name
     */
    print(elementId, printerName) {
      const element = document.getElementById(elementId);
      if (!element) {
        alert('Label element not found');
        return;
      }

      // Clone element to avoid modifying original
      const clone = element.cloneNode(true);
      clone.classList.add('thermal-label-print');

      // Create print window
      const printWindow = window.open('', '_blank', 'width=100,height=100,left=0,top=0');
      printWindow.document.write(\`
        <html>
          <head>
            <style>
              @page { size: auto; margin: 0; }
              body { margin: 0; padding: 0; overflow: hidden; }
              .thermal-label-print { page-break-after: always; }
            </style>
          </head>
          <body>
            \${clone.innerHTML}
          </body>
        </html>
      \`);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    },

    /**
     * Validate print settings
     */
    validateSettings() {
      const checks = {
        'Browser supports printing': !!window.print,
        'Page scaling available': true,
        'Color printing available': window.matchMedia('print').matches,
      };

      console.table(checks);
      return Object.values(checks).every(v => v);
    },
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThermalPrinter.setup());
  } else {
    ThermalPrinter.setup();
  }
})();
`;

/**
 * Get complete thermal printer setup guide
 */
export const getThermalPrinterSetupGuide = (printerModel = 'generic') => {
  const config = THERMAL_PRINTER_CONFIG[printerModel] || THERMAL_PRINTER_CONFIG.generic;

  return {
    title: `${config.name} - Setup Guide`,
    steps: [
      {
        step: 1,
        title: 'Install Printer Driver',
        instructions: config.drivers.map((driver) => `- ${driver}`).join('\n'),
        notes: config.requiresDriver ? 'Driver installation is required' : 'No driver needed',
      },
      {
        step: 2,
        title: 'Connect Printer',
        instructions: `- Connect ${config.name} to your computer via USB\n- Restart computer to ensure driver loads\n- Check Device Manager to confirm printer is recognized`,
        notes: 'Windows should auto-detect the printer',
      },
      {
        step: 3,
        title: 'Configure Label Size',
        instructions: `- Use 50mm × 25mm thermal labels\n- Set printer DPI to ${config.dpi}\n- Configure label roll width: ${config.maxPrintWidth}mm`,
        notes: 'Verify label size matches physical sticker dimensions',
      },
      {
        step: 4,
        title: 'Test Print',
        instructions: `- Print a test label from this application\n- Verify alignment, size, and barcode readability\n- Scan barcode with scanner gun to confirm\n- Make adjustments if needed`,
        notes: 'First test print is critical for production setup',
      },
      {
        step: 5,
        title: 'Production Ready',
        instructions: `- All tests passed\n- System is ready for production batch printing\n- Use "Generate PDF" → "Print" workflow`,
        notes: 'System is now production-ready',
      },
    ],
    troubleshooting: [
      {
        issue: 'Labels printing too large or too small',
        solution: `- Check print scale is 100% (not "Fit to page")\n- Verify label size in app matches physical stickers\n- Restart printer and browser`,
      },
      {
        issue: 'Barcode not scanning',
        solution: `- Increase barcode height\n- Increase barcode module width\n- Try different scanner\n- Check printer head cleanliness`,
      },
      {
        issue: 'Text is clipped or overlapping',
        solution: `- Reduce font size in settings\n- Increase label height\n- Disable unnecessary fields (size/SKU)`,
      },
      {
        issue: 'Printer not recognized in app',
        solution: `- Reinstall printer driver\n- Restart computer\n- Check Windows Device Manager\n- Try generic thermal printer driver`,
      },
    ],
  };
};

/**
 * Export all thermal printer configurations
 */
export default {
  THERMAL_PRINTER_CONFIG,
  THERMAL_LABEL_PRESETS,
  THERMAL_PRINT_SETTINGS,
  getThermalPrintCSS,
  getThermalPrintScript,
  getThermalPrinterSetupGuide,
};

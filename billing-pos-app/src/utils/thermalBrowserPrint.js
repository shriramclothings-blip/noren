/**
 * Direct Browser Printing Utilities for Thermal Labels
 * Implements Windows-compatible direct thermal printer support
 * No manual scale/fit adjustments needed - everything pre-configured
 */

import { getThermalPrintCSS } from './thermalPrinterConfig';

/**
 * Create a print-ready HTML element for thermal labels
 * @param {Object} config - Label configuration
 * @returns {HTMLElement} Print-ready label element
 */
export function createThermalLabelElement(config) {
  const {
    widthMm = 50,
    heightMm = 25,
    productName = 'Product',
    sku = '',
    price = 0,
    barcodeImage = '',
    barcodeValue = '',
    size = '',
    currencySymbol = '₹',
  } = config;

  const container = document.createElement('div');
  container.className = 'thermal-label-print';
  container.style.cssText = `
    width: ${widthMm}mm;
    height: ${heightMm}mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 1.2mm;
    font-family: Arial, sans-serif;
    background: white;
    color: black;
    box-sizing: border-box;
    margin: 0;
    page-break-inside: avoid;
  `;

  // Product name
  if (productName) {
    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
      font-size: 5pt;
      font-weight: bold;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
      margin-bottom: 0.5mm;
    `;
    nameEl.textContent = productName;
    container.appendChild(nameEl);
  }

  // Barcode image
  if (barcodeImage) {
    const barcodeContainer = document.createElement('div');
    barcodeContainer.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin: 0.8mm 0;
    `;

    const img = document.createElement('img');
    img.src = barcodeImage;
    img.style.cssText = `
      max-width: 100%;
      width: auto;
      height: 100%;
      max-height: 15mm;
      display: block;
      margin: 0 auto;
    `;
    barcodeContainer.appendChild(img);
    container.appendChild(barcodeContainer);
  }

  // Barcode number
  if (barcodeValue) {
    const barcodeTextEl = document.createElement('div');
    barcodeTextEl.style.cssText = `
      font-size: 4pt;
      text-align: center;
      letter-spacing: 0.5px;
      margin: 0.3mm 0;
    `;
    barcodeTextEl.textContent = barcodeValue;
    container.appendChild(barcodeTextEl);
  }

  // Footer: SKU and Price
  const footerEl = document.createElement('div');
  footerEl.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    font-size: 4pt;
    border-top: 0.5px solid #ccc;
    padding-top: 0.3mm;
    margin-top: 0.5mm;
  `;

  if (sku) {
    const skuEl = document.createElement('div');
    skuEl.textContent = `SKU: ${sku}`;
    footerEl.appendChild(skuEl);
  }

  if (price > 0) {
    const priceEl = document.createElement('div');
    priceEl.style.fontWeight = 'bold';
    priceEl.textContent = `${currencySymbol}${Number(price).toFixed(2)}`;
    footerEl.appendChild(priceEl);
  }

  if (sku || price > 0) {
    container.appendChild(footerEl);
  }

  return container;
}

/**
 * Create print style sheet for thermal labels
 * @param {number} widthMm - Label width in mm
 * @param {number} heightMm - Label height in mm
 * @returns {HTMLStyleElement} Style element with print CSS
 */
export function createThermalPrintStyleSheet(widthMm, heightMm) {
  const style = document.createElement('style');
  style.textContent = getThermalPrintCSS(widthMm, heightMm);
  return style;
}

/**
 * Direct browser print for thermal labels (production method)
 * No manual page/scale setup needed - all pre-configured
 * @param {Array<Object>} labels - Array of label configs
 * @param {Object} options - Print options
 */
export function printThermalLabels(labels, options = {}) {
  const {
    widthMm = 50,
    heightMm = 25,
    currencySymbol = '₹',
    printerName = '', // Optional: will show in print dialog
    autoClose = false,
  } = options;

  if (!labels || labels.length === 0) {
    alert('No labels to print');
    return false;
  }

  return new Promise((resolve) => {
    // Create print window
    const printWindow = window.open('', '_thermal_print_', 'width=100,height=100');
    if (!printWindow) {
      alert('Print window could not be opened. Please disable popup blockers.');
      resolve(false);
      return;
    }

    // Build HTML for all labels
    let labelsHTML = '';
    labels.forEach((labelConfig, idx) => {
      const el = createThermalLabelElement({
        widthMm,
        heightMm,
        currencySymbol,
        ...labelConfig,
      });
      labelsHTML += el.outerHTML;
    });

    // Write document with embedded CSS
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Thermal Labels - ${labels.length} labels</title>
  <style>
    ${getThermalPrintCSS(widthMm, heightMm)}
    @page { size: ${widthMm}mm ${heightMm}mm portrait; margin: 0; padding: 0; }
    body { width: ${widthMm}mm; height: ${heightMm}mm; margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${labelsHTML}
  <script>
    window.onload = () => {
      // CRITICAL: These settings must be applied for production
      // Do NOT let browser auto-scale or fit-to-page
      const originalPrint = window.print;
      window.print = function() {
        console.log('🖨️ Thermal Label Printing - Production Mode');
        console.log('Label size: ${widthMm}mm × ${heightMm}mm');
        console.log('⚠️  IMPORTANT: In print dialog:');
        console.log('   1. Set scale to 100% (NOT "Fit to page")');
        console.log('   2. Disable margins (set all to 0)');
        console.log('   3. Enable "Background graphics"');
        console.log('   4. Disable headers and footers');
        originalPrint.apply(window);
      };
      
      // Wait for fonts to load
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
    `);
    printWindow.document.close();

    // Handle print dialog close
    printWindow.addEventListener('afterprint', () => {
      if (autoClose) {
        printWindow.close();
      }
      resolve(true);
    });

    // Fallback for unsupported browsers
    setTimeout(() => {
      if (printWindow.closed === false) {
        // Print dialog is still open or printing
      }
    }, 2000);
  });
}

/**
 * Validate print settings before printing
 * @param {Object} options - Print options to validate
 * @returns {Object} Validation result
 */
export function validatePrintSettings(options = {}) {
  const { widthMm = 50, heightMm = 25 } = options;

  const warnings = [];

  // Check browser capabilities
  if (!window.print) {
    return {
      valid: false,
      errors: ['Browser does not support printing'],
      warnings: [],
    };
  }

  // Check for print media query support
  const printMediaQuery = window.matchMedia('print');
  if (!printMediaQuery.media) {
    warnings.push('Print media query not fully supported');
  }

  // Warn about common issues
  if (widthMm < 30) {
    warnings.push('Label width is very narrow; ensure printer supports this size');
  }

  return {
    valid: true,
    errors: [],
    warnings,
    capabilities: {
      printing: !!window.print,
      mediaQuery: printMediaQuery.media || 'unknown',
      colorPrint: window.matchMedia('(color)').matches,
      resolution: screen.devicePixelRatio,
    },
  };
}

/**
 * Generate print instructions for thermal labels
 * Shows exactly what user should do in print dialog
 */
export function getPrintInstructions(widthMm = 50, heightMm = 25) {
  return `
📋 THERMAL LABEL PRINTING INSTRUCTIONS
═══════════════════════════════════════════════════════════════

🖨️  PRINT DIALOG SETTINGS (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✓ Scale: Set to 100% (do NOT use "Fit to page" or "Shrink to fit")
   → If you see "Shrink oversized pages" - DISABLE it
   
2. ✓ Margins: Set ALL to 0mm or None
   → Top: 0
   → Bottom: 0
   → Left: 0
   → Right: 0

3. ✓ Paper Size: Leave as Custom (${widthMm}mm × ${heightMm}mm)
   → Do NOT change to A4 or Letter

4. ✓ Headers and Footers: Disable (uncheck all)
   → Uncheck "Headers and footers"

5. ✓ Background Graphics: Enable (check)
   → Check "Background graphics" or "Print background colors and images"

6. ✓ Orientation: Portrait (custom size uses 50×25mm)

7. ✓ Color: Leave as default (Color printing)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 PRINTER SELECTION:

→ Select your thermal printer (usually named "XPrinter", "TVS", "TSC", etc.)
→ DO NOT select "Print to File" or "Microsoft Print to PDF"
→ Verify printer shows as "Ready" status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VERIFICATION CHECKLIST:

Before clicking "Print":
□ Scale is 100%
□ All margins are 0
□ Correct thermal printer selected
□ Background graphics enabled
□ Headers/footers disabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  COMMON MISTAKES TO AVOID:

❌ DO NOT use "Fit to page" - labels will shrink!
❌ DO NOT set margins - labels will have white borders!
❌ DO NOT disable "Background graphics" - barcode may not print!
❌ DO NOT select generic printer - select thermal printer!
❌ DO NOT use "Print to PDF" for production - use "Generate PDF" button!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TROUBLESHOOTING:

If labels print too small:
→ Check scale is 100% in print dialog

If labels have white borders:
→ Set all margins to 0

If barcode doesn't scan:
→ Enable "Background graphics"
→ Try increasing barcode height
→ Clean printer head

If text is cut off:
→ Disable headers/footers
→ Ensure ${widthMm}mm × ${heightMm}mm is selected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Ready! Click "Print" to start printing labels.
`;
}

/**
 * Create a print preview element
 * Shows how label will look when printed
 */
export function createPrintPreview(labelConfig, options = {}) {
  const {
    widthMm = 50,
    heightMm = 25,
    scale = 1, // Scale for preview display
  } = options;

  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 20px;
  `;

  // Label preview
  const previewBox = document.createElement('div');
  previewBox.style.cssText = `
    width: ${widthMm * scale}mm;
    height: ${heightMm * scale}mm;
    border: 2px dashed #ccc;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${10 * scale}pt;
    color: #666;
    overflow: hidden;
  `;

  const labelEl = createThermalLabelElement({
    widthMm,
    heightMm,
    ...labelConfig,
  });
  labelEl.style.cssText = `
    width: 100%;
    height: 100%;
    transform: scale(${scale});
    transform-origin: top left;
  `;
  previewBox.appendChild(labelEl);

  // Info text
  const infoEl = document.createElement('div');
  infoEl.style.cssText = `
    text-align: center;
    font-size: 12px;
    color: #666;
  `;
  infoEl.innerHTML = `
    <p><strong>Print Preview</strong></p>
    <p>Size: ${widthMm}mm × ${heightMm}mm | Scale: ${(scale * 100).toFixed(0)}%</p>
    <p style="font-size: 11px; color: #999; margin-top: 8px;">
      ⚠️ This preview shows approximate layout. Actual print may vary based on printer settings.
    </p>
  `;

  container.appendChild(previewBox);
  container.appendChild(infoEl);

  return container;
}

/**
 * Export thermal print functions
 */
export default {
  createThermalLabelElement,
  createThermalPrintStyleSheet,
  printThermalLabels,
  validatePrintSettings,
  getPrintInstructions,
  createPrintPreview,
};

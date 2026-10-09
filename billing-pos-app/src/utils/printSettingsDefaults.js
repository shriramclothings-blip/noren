export const PRINT_SETTINGS_STORAGE_KEY = 'printSettings';

export const PRINT_SETTINGS_SCHEMA_VERSION = 1;

export const DEFAULT_PRINT_SETTINGS = {
  schemaVersion: PRINT_SETTINGS_SCHEMA_VERSION,

  billPrint: {
    paperPreset: 'thermal80', // 58mm/72mm/80mm/A4/HalfA4/Custom
    custom: {
      widthMm: 80,
      heightMm: 200,
      marginsMm: 3,
      paddingMm: 0,
    },
    typography: {
      fontSizePt: 10,
      lineSpacing: 1.2,
    },
    layout: {
      showLogo: true,
      showGstNumber: true,
      showBarcode: true,
      showQrCode: undefined,
      showProductSku: true,
      showProductSize: true,
      showDiscounts: true,
      showTaxes: true,
      footerMessage: true,
    },
    behavior: {
      autoPrintAfterCheckout: false,
      printPreview: false,
      silentPrinting: true,
      multipleCopies: 1,
      duplicateBillPrint: false,
    },
    thermalOptimization: {
      printDensity: 'balanced', // compact/balanced/large
      darkModePrinting: false,
      compactSpacing: true,
      thermalQualityMode: 'standard',
    },
  },

  barcode: {
    typeSupport: {
      CODE128: true,
      CODE39: true,
      EAN13: false,
      UPC: false,
      QR_CODE: false,
    },
    defaultBarcodeFormat: 'CODE128',

    labelPreset: 'shelf', // small sticker/clothing tag/shelf label/price tag/warehouse label/custom
    custom: {
      widthMm: 40,
      heightMm: 30,
      paddingMm: 0,
      gapMm: 2,
      orientation: 'portrait',
      fontSizePt: 8,
    },

    display: {
      showProductName: true,
      showSku: true,
      showPrice: true,
      showMrp: false,
      showProductSize: true,
      showVariant: true,
      showBrand: false,
      showQrCode: false,
    },

    quality: {
      dpi: 203,
      barcodeScaling: 1.0,
      sharpRenderingMode: true,
      scannerOptimizationMode: 'standard',
    },
  },

  labelPrint: {
    sizeWiseLabels: true,
    variantWiseLabels: true,
    multipleLabelsPerProduct: 1,
    batchPrintQuantity: 1,
    autoDuplicateLabels: false,
  },

  kot: {
    compactLayout: true,
    fontSizePt: 10,
    autoPrint: false,
    categoryGrouping: true,
    notesPrinting: true,
    timestampToggle: false,
  },

  printers: {
    defaultPrinter: '',
    barcodePrinter: '',
    billPrinter: '',
    kitchenPrinter: '',
    autoDetect: true,
    status: {
      lastScanAt: null,
      lastDetected: [],
    },
  },
};


import JsBarcode from 'jsbarcode';
import { normalizeBarcodeFormat } from './barcodeEngine';

const MM_TO_PX_BASE = 3.7795275591;
const getPxPerMm = () => (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1) * MM_TO_PX_BASE;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createBarcodeCanvas = (value, moduleWidthMm = 0.75, heightMm = 18, options = {}) => {
  try {
    if (!value) return null;
    const pxPerMm = getPxPerMm();
    const moduleWidthPx = clamp(Math.round(moduleWidthMm * pxPerMm), 1, 20);
    const barcodeHeightPx = clamp(Math.round(heightMm * pxPerMm), 8, 200);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(400, moduleWidthPx * 120);
    canvas.height = barcodeHeightPx;

    JsBarcode(canvas, String(value), {
      format: normalizeBarcodeFormat(options.format || 'CODE128'),
      width: moduleWidthPx,
      height: barcodeHeightPx,
      displayValue: options.displayValue !== undefined ? options.displayValue : true,
      fontSize: options.fontSize || 10,
      margin: options.margin !== undefined ? options.margin : 2,
      lineColor: options.lineColor || '#000000',
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Barcode generation failed:', err);
    return null;
  }
};

export const generateCustomerBarcode = (invoiceId) => {
  if (!invoiceId) return null;
  return `CUST-${String(invoiceId).padStart(10, '0')}`;
};

export const generateBarcodeImage = (
  value,
  moduleWidthMm = 0.75,
  heightMm = 18,
  format = 'CODE128',
) => createBarcodeCanvas(value, moduleWidthMm, heightMm, {
  format,
  displayValue: true,
  fontSize: 10,
  margin: 4,
});

export const generateBarcodeLabelImage = (
  value,
  moduleWidthMm = 0.75,
  heightMm = 18,
  format = 'CODE128',
) => createBarcodeCanvas(value, moduleWidthMm, heightMm, {
  format,
  displayValue: false,
  fontSize: 8,
  margin: 2,
});

export const generateQRCodeValue = (data) => {
  return `QR:${JSON.stringify(data)}`.substring(0, 50);
};

export const isValidBarcode = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return false;
  return barcode.length >= 8 && barcode.length <= 18;
};

export const identifyBarcodeType = (value) => {
  if (!value) return 'unknown';
  if (value.startsWith('CUST-')) return 'customer';
  if (value.startsWith('QR:')) return 'qr';
  if (value.startsWith('INV-')) return 'invoice';
  if (/^\d{8,}$/.test(value)) return 'numeric';
  return 'alphanumeric';
};

export const generateLabelPrintData = (product) => {
  return {
    productName: (product.name || 'Product').substring(0, 25),
    barcode: product.barcode || `SKU${product.id}`,
    sku: product.sku || `SKU-${product.id}`,
    price: product.price || 0,
    brand: product.brand || 'N/A',
    size: product.size || '',
    category: product.category || '',
  };
};

export const generateESCPOSBarcode = (value, format = 'CODE128') => {
  const commands = {
    'CODE128': [0x1d, 0x6b, 0x49],
    'EAN13': [0x1d, 0x6b, 0x02],
    'EAN8': [0x1d, 0x6b, 0x03],
  };
  const cmd = commands[format] || commands['CODE128'];
  return {
    commands: cmd,
    value,
    checksum: calculateChecksum(value),
  };
};

function calculateChecksum(value) {
  let sum = 0;
  for (let i = 0; i < value.length; i++) {
    sum += value.charCodeAt(i);
  }
  return sum % 256;
}

export const generateBatchBarcodeData = (products, quantity = 1) => {
  return products.flatMap(product =>
    Array(quantity).fill().map((_, idx) => ({
      ...generateLabelPrintData(product),
      index: idx + 1,
      barcodeImage: generateBarcodeLabelImage(product.barcode || `SKU${product.id}`),
    }))
  );
};

export const generateInvoiceCustomerBarcode = (invoice) => {
  if (!invoice.id) return null;
  return {
    value: generateCustomerBarcode(invoice.id),
    customerId: invoice.customerId || null,
    invoiceId: invoice.id,
    image: generateBarcodeImage(generateCustomerBarcode(invoice.id), 0.75, 40),
  };
};

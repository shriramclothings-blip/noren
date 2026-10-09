import {
  buildBarcodeLookup,
  buildVariantBarcodeSeed,
  ensureUniqueBarcode,
  generateProductBarcode,
  generateVariantBarcode,
  normalizeBarcodeFormat,
  normalizeBarcodeValue,
} from './barcodeEngine';

describe('barcodeEngine', () => {
  test('normalizes GS1 to CODE128', () => {
    expect(normalizeBarcodeFormat('GS1')).toBe('CODE128');
    expect(normalizeBarcodeFormat('EAN13')).toBe('EAN13');
  });

  test('normalizes barcode values for storage and lookup', () => {
    expect(normalizeBarcodeValue('  sku- shirt 001  ')).toBe('SKU-SHIRT-001');
    expect(normalizeBarcodeValue('  ')).toBe('');
  });

  test('generates unique product barcodes', () => {
    const barcode = generateProductBarcode(
      { sku: 'shirt001', name: 'Cotton Shirt' },
      { barcodePrefix: 'SKU' },
      ['SKU-SHIRT001']
    );

    expect(barcode).toBe('SKU-SHIRT001-1');
  });

  test('generates unique variant barcodes using prefix and size', () => {
    const barcode = generateVariantBarcode(
      { sku: 'shirt001' },
      'M',
      { barcodePrefix: 'SKU', variantBarcodePrefix: 'VAR' },
      ['VAR-SHIRT001-M']
    );

    expect(barcode).toBe('VAR-SHIRT001-M-1');
  });

  test('buildBarcodeLookup returns all barcode values', () => {
    expect(
      buildBarcodeLookup(
        [{ barcode: 'P-001' }, { barcode: 'P-002' }],
        [{ barcode: 'V-001' }]
      )
    ).toEqual(['P-001', 'P-002', 'V-001']);
  });

  test('ensureUniqueBarcode preserves current value while resolving duplicates', () => {
    expect(ensureUniqueBarcode('SKU-TEST', ['SKU-TEST'], 'SKU-TEST')).toBe('SKU-TEST');
    expect(ensureUniqueBarcode('SKU-TEST', ['SKU-TEST'], '')).toBe('SKU-TEST-1');
  });

  test('variant seed remains deterministic', () => {
    expect(buildVariantBarcodeSeed({ sku: 'shirt001' }, 'M', { barcodePrefix: 'SKU' })).toBe('SKU-SHIRT001-M');
  });
});

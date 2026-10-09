import { buildSizeWiseBarcodeItems } from './barcodePrintUtils';

describe('buildSizeWiseBarcodeItems', () => {
  it('builds printable items for each size variant using product defaults', () => {
    const products = [
      {
        id: 1,
        name: 'Cotton Shirt',
        barcode: 'SHIRT-BASE',
        sku: 'SHIRT001',
        price: 199,
        costPrice: 120,
      },
    ];

    const variants = [
      {
        id: 10,
        productId: 1,
        label: 'M',
        barcode: 'SHIRT001-M',
        sku: 'SHIRT001-M',
        price: null,
        costPrice: null,
        stock: 5,
      },
    ];

    expect(buildSizeWiseBarcodeItems(products, variants)).toEqual([
      {
        id: 'variant-10',
        productId: 1,
        variantId: 10,
        name: 'Cotton Shirt (M)',
        productName: 'Cotton Shirt',
        sizeLabel: 'M',
        barcode: 'SHIRT-BASE',
        sku: 'SHIRT001-M',
        price: 199,
        costPrice: 120,
        stock: 5,
      },
    ]);
  });

  it('skips variants whose product is no longer available', () => {
    const products = [];
    const variants = [
      {
        id: 11,
        productId: 99,
        label: 'L',
        barcode: 'LOST-L',
        sku: 'LOST-L',
        stock: 2,
      },
    ];

    expect(buildSizeWiseBarcodeItems(products, variants)).toEqual([]);
  });
});

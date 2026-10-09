import { buildOfflineUpiUri, computeInventoryAnalytics, buildInvoiceNumber } from './inventoryAnalytics';

describe('enterprise inventory and payment helpers', () => {
  test('buildOfflineUpiUri formats a local UPI payment URI', () => {
    const uri = buildOfflineUpiUri({
      upiId: 'merchant@upi',
      merchantName: 'VENDEXA RetailOS',
      invoiceNumber: 'I_SRC-240500226',
      amount: 999,
    });

    expect(uri).toContain('upi://pay?pa=merchant%40upi');
    expect(uri).toContain('pn=Shri%20Ram%20Clothing');
    expect(uri).toContain('am=999');
    expect(uri).toContain('tn=I_SRC-240500226');
  });

  test('computeInventoryAnalytics flags fast-moving, slow-moving, and dead stock', () => {
    const products = [
      {
        id: 1,
        name: 'Cotton Shirt',
        category: 'Topwear',
        sizeType: 'topwear',
        stock: 5,
        minStock: 8,
        purchaseQuantity: 30,
        soldQuantity: 25,
        lastSoldDate: '2026-05-20T00:00:00.000Z',
        sizes: {
          S: { stock: 1, soldQuantity: 12, purchaseQuantity: 15 },
          M: { stock: 2, soldQuantity: 6, purchaseQuantity: 8 },
          L: { stock: 2, soldQuantity: 7, purchaseQuantity: 8 },
        },
      },
      {
        id: 2,
        name: 'Denim Pant',
        category: 'Bottomwear',
        sizeType: 'bottomwear',
        stock: 50,
        minStock: 10,
        purchaseQuantity: 20,
        soldQuantity: 1,
        lastSoldDate: '2025-01-01T00:00:00.000Z',
        sizes: {
          32: { stock: 20, soldQuantity: 0, purchaseQuantity: 20 },
          34: { stock: 30, soldQuantity: 1, purchaseQuantity: 20 },
        },
      },
    ];

    const result = computeInventoryAnalytics(products);

    expect(result.fastMoving.length).toBeGreaterThan(0);
    expect(result.slowMoving.length).toBeGreaterThan(0);
    expect(result.deadStock.length).toBeGreaterThan(0);
    expect(result.lowStockAlerts.length).toBeGreaterThan(0);
    expect(result.sizePerformance.length).toBeGreaterThan(0);
  });

  test('buildInvoiceNumber creates stable sequential invoice numbers', () => {
    const first = buildInvoiceNumber({ prefix: 'I_SRC', dateKey: '240525', sequence: 226, digits: 6 });
    const second = buildInvoiceNumber({ prefix: 'I_SRC', dateKey: '240525', sequence: 227, digits: 6 });

    expect(first).toBe('I_SRC-240525226');
    expect(second).toBe('I_SRC-240525227');
  });
});

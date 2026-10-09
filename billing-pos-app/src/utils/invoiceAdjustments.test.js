import { calculateInvoiceAdjustment } from './invoiceAdjustments';

describe('calculateInvoiceAdjustment', () => {
  it('reduces the invoice total and sets a paid status when a post-checkout discount is applied', () => {
    const invoice = {
      id: 1,
      subtotal: 2000,
      discountAmt: 0,
      taxAmt: 0,
      total: 2000,
      taxRate: 0,
      items: [{ name: 'Shirt', qty: 1, price: 2000 }],
      paidAmount: 1800,
      balanceAmount: 200,
      status: 'Partial',
    };

    const result = calculateInvoiceAdjustment(invoice, {
      type: 'discount',
      amount: 200,
      paidAmount: 1800,
      reason: 'Customer bargain',
      notes: 'Family discount',
    });

    expect(result.total).toBe(1800);
    expect(result.discountAmt).toBe(200);
    expect(result.balanceAmount).toBe(0);
    expect(result.status).toBe('Paid');
    expect(result.adjustmentReason).toBe('Customer bargain');
  });
});

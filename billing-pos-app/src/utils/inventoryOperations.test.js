import { getInventoryDeltaForOperation } from './inventoryOperations';

describe('inventoryOperations', () => {
  it('returns a negative delta for sales and transfer outs', () => {
    expect(getInventoryDeltaForOperation({ type: 'sale', quantity: 3 })).toBe(-3);
    expect(getInventoryDeltaForOperation({ type: 'transfer-out', quantity: 2 })).toBe(-2);
  });

  it('returns a positive delta for returns and transfer ins', () => {
    expect(getInventoryDeltaForOperation({ type: 'refund', quantity: 4 })).toBe(4);
    expect(getInventoryDeltaForOperation({ type: 'transfer-in', quantity: 1 })).toBe(1);
  });
});

export function getInventoryDeltaForOperation({ type, quantity = 0 }) {
  const qty = Math.abs(Number(quantity || 0));
  switch (String(type || '').toLowerCase()) {
    case 'sale':
    case 'transfer-out':
    case 'out':
      return -qty;
    case 'refund':
    case 'return':
    case 'stock-in':
    case 'transfer-in':
    case 'adjustment':
      return qty;
    case 'adjustment-negative':
      return -qty;
    default:
      return 0;
  }
}

export function formatMovementType(type = '') {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('transfer')) return 'Transfer';
  if (normalized.includes('return')) return 'Return';
  if (normalized.includes('sale')) return 'Sale';
  if (normalized.includes('stock')) return 'Stock';
  return 'Adjustment';
}

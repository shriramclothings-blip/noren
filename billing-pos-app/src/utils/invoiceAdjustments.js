export const calculateInvoiceAdjustment = (invoice = {}, adjustment = {}) => {
  const originalTotal = Number(invoice?.total || 0);
  const originalDiscount = Number(invoice?.discountAmt || 0);
  const originalSubtotal = Number(invoice?.subtotal || 0);
  const originalTax = Number(invoice?.taxAmt || 0);
  const adjustmentAmount = Math.max(0, Number(adjustment?.amount || 0));
  const paidValue = adjustment?.paidAmount !== undefined && adjustment?.paidAmount !== null
    ? adjustment.paidAmount
    : (invoice?.paidAmount !== undefined && invoice?.paidAmount !== null ? invoice.paidAmount : originalTotal);
  const paidAmount = Math.max(0, Number(paidValue || 0));
  const type = String(adjustment?.type || 'discount').toLowerCase();

  let nextDiscount = originalDiscount;
  let nextTotal = originalTotal;
  let nextSubtotal = originalSubtotal;
  let nextTax = originalTax;

  if (type === 'discount') {
    nextDiscount = Math.min(originalSubtotal, originalDiscount + adjustmentAmount);
    nextTotal = Math.max(0, originalTotal - adjustmentAmount);
  } else if (type === 'charge') {
    nextTotal = originalTotal + adjustmentAmount;
    nextSubtotal = originalSubtotal + adjustmentAmount;
  }

  const balanceAmount = Math.max(0, nextTotal - paidAmount);
  let status = 'Unpaid';
  if (balanceAmount <= 0) {
    status = 'Paid';
  } else if (paidAmount > 0) {
    status = 'Partial';
  }

  return {
    subtotal: nextSubtotal,
    discountAmt: nextDiscount,
    taxAmt: nextTax,
    total: nextTotal,
    paidAmount,
    balanceAmount,
    status,
    adjustmentReason: adjustment?.reason || '',
    adjustmentNotes: adjustment?.notes || '',
    adjustmentType: type,
    adjustedAt: new Date().toISOString(),
  };
};

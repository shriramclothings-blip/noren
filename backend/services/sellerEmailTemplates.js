'use strict';
/**
 * NOREN Seller Email Templates
 * All seller-facing transactional emails — matching NOREN brand exactly.
 */

const YEAR = new Date().getFullYear();
const SITE        = process.env.FRONTEND_URL?.split(',')[0] || 'https://www.norenfastion.shop';
const SELLER_SITE = process.env.SELLER_PORTAL_URL            || 'https://sell.norenfastion.shop';

// ─── Shared primitives ───────────────────────────────────────────────────────

const header = () => `
<div style="background:#1a1a18;padding:28px 40px;text-align:center">
  <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
  <div style="font-size:8px;letter-spacing:0.28em;color:#c9a96e;margin-top:4px;text-transform:uppercase">Seller Portal</div>
</div>`;

const footer = () => `
<div style="padding:18px 40px 24px;text-align:center;border-top:1px solid #e6e0d8;margin-top:8px">
  <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em;margin:0">© ${YEAR} NOREN. Timeless By Design.</p>
  <p style="color:#d1cdc8;font-size:10px;margin:6px 0 0">Seller support: <a href="mailto:supportnoren1@gmail.com" style="color:#c9a96e;text-decoration:none">supportnoren1@gmail.com</a></p>
  <p style="color:#d1cdc8;font-size:10px;margin:4px 0 0"><a href="${SELLER_SITE}" style="color:#c9a96e;text-decoration:none">Go to Seller Portal →</a></p>
</div>`;

const wrap = (bodyHtml) => `
<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:auto;background:#faf9f7;padding:0">
  ${header()}
  <div style="padding:36px 40px 28px;border:1px solid #e6e0d8;border-top:none">${bodyHtml}</div>
  ${footer()}
</div>`;

const badge  = (label, color = '#c9a96e') =>
  `<p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${color};margin:0 0 12px">${label}</p>`;
const h2     = (text) =>
  `<h2 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a18;margin:0 0 18px">${text}</h2>`;
const para   = (text) =>
  `<p style="color:#5a5750;line-height:1.8;font-size:14px;margin-bottom:18px">${text}</p>`;
const infoBox = (rows) => `
<div style="background:#f5f0e8;padding:18px 22px;margin-bottom:22px;border-radius:2px">
  <table style="width:100%;font-size:13px;border-collapse:collapse">
    ${rows.map(([l, v]) => `<tr>
      <td style="color:#9e9a94;padding:5px 0;width:42%;vertical-align:top">${l}</td>
      <td style="color:#1a1a18;font-weight:500;padding:5px 0">${v}</td>
    </tr>`).join('')}
  </table>
</div>`;
const btn    = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#1a1a18;color:#faf9f7;padding:13px 32px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:20px">${text}</a>`;
const alertBox = (text, color = '#c9a96e') =>
  `<div style="border-left:3px solid ${color};padding:12px 18px;background:#faf7f2;margin-bottom:20px;font-size:13px;color:#5a5750;line-height:1.7">${text}</div>`;
const divider = () => `<div style="height:1px;background:#e6e0d8;margin:22px 0"></div>`;

// ─── 1. Welcome — Seller Account Created ─────────────────────────────────────
const sellerWelcome = (name, email) => wrap(`
  ${badge('Welcome to NOREN Seller Portal')}
  ${h2(`Hi ${name}, your seller account is ready.`)}
  ${para('You have successfully registered as a seller on NOREN. Here\'s what to do next to start selling:')}
  <div style="background:#1a1a18;padding:20px 24px;margin-bottom:22px;border-radius:2px">
    <table style="width:100%;font-size:13px;color:#faf9f7">
      <tr><td style="padding:6px 0">1.</td><td style="padding:6px 0;font-weight:500">Complete your business profile</td></tr>
      <tr><td style="padding:6px 0">2.</td><td style="padding:6px 0;font-weight:500">Upload KYC documents (GST, PAN, Bank)</td></tr>
      <tr><td style="padding:6px 0">3.</td><td style="padding:6px 0;font-weight:500">Wait for admin verification (1–2 business days)</td></tr>
      <tr><td style="padding:6px 0">4.</td><td style="padding:6px 0;font-weight:500">Start listing your products!</td></tr>
    </table>
  </div>
  ${infoBox([['Registered Email', email], ['Portal URL', SELLER_SITE]])}
  ${btn('Go to Seller Portal', SELLER_SITE)}
  ${para('If you did not create this account, please contact us immediately at supportnoren1@gmail.com')}
`);

// ─── 2. KYC Submitted Confirmation ───────────────────────────────────────────
const sellerKYCSubmitted = (name) => wrap(`
  ${badge('KYC Documents Received')}
  ${h2(`Hi ${name}, your KYC is under review.`)}
  ${para('We have received your verification documents. Our compliance team will review them within <strong style="color:#1a1a18">1–2 business days</strong>.')}
  ${alertBox('You will receive an email once your KYC is approved or if any documents need to be resubmitted.')}
  ${infoBox([
    ['Status', 'Under Review'],
    ['Expected', '1–2 business days'],
    ['Support', 'supportnoren1@gmail.com'],
  ])}
  ${btn('View KYC Status', `${SELLER_SITE}/kyc`)}
`);

// ─── 3. KYC Approved ─────────────────────────────────────────────────────────
const sellerKYCApproved = (name, brandName) => wrap(`
  ${badge('KYC Verified ✓', '#16a34a')}
  ${h2(`Hi ${name}, your KYC is verified!`)}
  ${para(`Congratulations! Your identity and business documents have been verified. Your NOREN seller account for <strong style="color:#1a1a18">${brandName || name}</strong> is now fully active.`)}
  ${alertBox('You can now list products, receive orders, and earn commissions on every sale.', '#16a34a')}
  ${infoBox([
    ['Account Status', 'Active ✓'],
    ['KYC Status', 'Verified ✓'],
    ['Platform', 'NOREN Marketplace'],
  ])}
  ${btn('Start Listing Products', `${SELLER_SITE}/products/new`)}
`);

// ─── 4. KYC Rejected ─────────────────────────────────────────────────────────
const sellerKYCRejected = (name, reason) => wrap(`
  ${badge('KYC Update Required', '#dc2626')}
  ${h2(`Hi ${name}, your KYC needs attention.`)}
  ${para('We were unable to verify your submitted documents. Please review the reason below and resubmit.')}
  ${alertBox(`<strong>Reason:</strong> ${reason || 'Documents could not be verified. Please ensure they are clear, valid and match your business registration.'}`, '#dc2626')}
  <p style="color:#5a5750;font-size:13px;margin-bottom:20px">Common reasons for rejection:</p>
  <ul style="color:#5a5750;font-size:13px;line-height:2;padding-left:20px;margin-bottom:20px">
    <li>Blurry or unreadable document scan</li>
    <li>Document name doesn't match account name</li>
    <li>Expired documents</li>
    <li>Missing required documents</li>
  </ul>
  ${btn('Resubmit Documents', `${SELLER_SITE}/kyc`)}
`);

// ─── 5. Account Approved / Activated ─────────────────────────────────────────
const sellerAccountApproved = (name, brandName) => wrap(`
  ${badge('Seller Account Approved ✓', '#16a34a')}
  ${h2(`Welcome to NOREN Marketplace, ${brandName || name}!`)}
  ${para('Your seller account has been reviewed and approved by our team. You are now live on NOREN.')}
  ${alertBox('Customers can now discover and purchase your products. Start by listing your first product!', '#16a34a')}
  ${infoBox([
    ['Brand Name', brandName || name],
    ['Status', 'Active'],
    ['Commission Rate', '10% per sale (standard)'],
    ['Payout Cycle', 'Weekly settlements'],
  ])}
  ${btn('Go to Your Dashboard', `${SELLER_SITE}/dashboard`)}
`);

// ─── 6. Account Suspended ────────────────────────────────────────────────────
const sellerAccountSuspended = (name, reason) => wrap(`
  ${badge('Account Suspended', '#dc2626')}
  ${h2(`Hi ${name}, your seller account has been suspended.`)}
  ${para('Your NOREN seller account has been temporarily suspended. Your product listings are hidden from the marketplace until this is resolved.')}
  ${alertBox(`<strong>Reason:</strong> ${reason || 'Policy violation or compliance issue. Please contact support for details.'}`, '#dc2626')}
  ${para('To appeal or get more information, please contact our seller support team.')}
  ${btn('Contact Seller Support', 'mailto:supportnoren1@gmail.com')}
  ${para('We aim to resolve all suspension cases within 24–48 hours of your response.')}
`);

// ─── 7. Product Submitted for Review ─────────────────────────────────────────
const sellerProductSubmitted = (name, productTitle) => wrap(`
  ${badge('Product Under Review')}
  ${h2(`Hi ${name}, your product is being reviewed.`)}
  ${para(`Your product listing <strong style="color:#1a1a18">"${productTitle}"</strong> has been submitted and is now in our review queue.`)}
  ${alertBox('Our team reviews all product listings for quality, accuracy, and compliance with NOREN\'s seller guidelines. This typically takes 24–48 hours.')}
  ${infoBox([
    ['Product', productTitle],
    ['Status', 'Pending Review'],
    ['Expected', '24–48 hours'],
  ])}
  ${btn('View My Products', `${SELLER_SITE}/products`)}
  ${para('You will receive an email as soon as your product is approved or if any changes are required.')}
`);

// ─── 8. Product Approved — Now Live ──────────────────────────────────────────
const sellerProductApproved = (name, productTitle, productId) => wrap(`
  ${badge('Product Live ✓', '#16a34a')}
  ${h2(`Hi ${name}, your product is now live!`)}
  ${para(`Great news! Your product <strong style="color:#1a1a18">"${productTitle}"</strong> has been approved and is now visible to customers on the NOREN marketplace.`)}
  ${alertBox('Customers can now add it to their cart and purchase it. You\'ll receive email notifications for every new order.', '#16a34a')}
  ${infoBox([
    ['Product', productTitle],
    ['Status', 'Live on NOREN ✓'],
    ['View on Store', `${SITE}/product/${productId}`],
  ])}
  ${btn('View on NOREN Store', productId ? `${SITE}/product/${productId}` : `${SITE}/shop`)}
  ${btn('Add More Products', `${SELLER_SITE}/products/new`)}
`);

// ─── 9. Product Rejected ─────────────────────────────────────────────────────
const sellerProductRejected = (name, productTitle, reason) => wrap(`
  ${badge('Product Needs Changes', '#dc2626')}
  ${h2(`Hi ${name}, your product listing needs attention.`)}
  ${para(`Your product <strong style="color:#1a1a18">"${productTitle}"</strong> could not be approved in its current form.`)}
  ${alertBox(`<strong>Admin Feedback:</strong> ${reason || 'Please review your product listing — ensure images are clear, description is accurate, and pricing is correct.'}`, '#dc2626')}
  <p style="color:#5a5750;font-size:13px;margin-bottom:14px">Common reasons for rejection:</p>
  <ul style="color:#5a5750;font-size:13px;line-height:2;padding-left:20px;margin-bottom:20px">
    <li>Low quality or misleading product images</li>
    <li>Incorrect or missing product details</li>
    <li>Price does not match product description</li>
    <li>Product violates NOREN seller guidelines</li>
  </ul>
  ${btn('Edit & Resubmit', `${SELLER_SITE}/products`)}
`);

// ─── 10. New Order Received ───────────────────────────────────────────────────
const sellerNewOrder = (name, order) => wrap(`
  ${badge('New Order Received 🛍️', '#c9a96e')}
  ${h2(`Hi ${name}, you have a new order!`)}
  ${para('A customer has placed an order for your product on NOREN. Please ensure it is packed and ready for pickup.')}
  ${infoBox([
    ['Order ID',    order.order_id || '—'],
    ['Product',     order.title || '—'],
    ['Size',        order.size || '—'],
    ['Quantity',    order.quantity || '—'],
    ['Order Total', `₹${Number(order.line_total || 0).toLocaleString('en-IN')}`],
    ['Your Payout', `₹${Number(order.seller_payout || 0).toLocaleString('en-IN')}`],
    ['Order Date',  order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'],
  ])}
  ${alertBox('Pack the item securely. Our logistics partner will arrange pickup. Keep the order ID handy for tracking.')}
  ${btn('View Order Details', `${SELLER_SITE}/orders`)}
`);

// ─── 11. Order Delivered ──────────────────────────────────────────────────────
const sellerOrderDelivered = (name, order) => wrap(`
  ${badge('Order Delivered ✓', '#16a34a')}
  ${h2(`Hi ${name}, an order has been delivered!`)}
  ${para(`Order <strong style="color:#1a1a18">#${order.order_id}</strong> for <strong style="color:#1a1a18">"${order.title}"</strong> has been successfully delivered to the customer.`)}
  ${infoBox([
    ['Order ID',    order.order_id || '—'],
    ['Product',     order.title || '—'],
    ['Quantity',    order.quantity || '—'],
    ['Sale Value',  `₹${Number(order.line_total || 0).toLocaleString('en-IN')}`],
    ['Commission',  `₹${Number(order.commission_amount || 0).toLocaleString('en-IN')} (${order.commission_rate || 10}%)`],
    ['Your Payout', `₹${Number(order.seller_payout || 0).toLocaleString('en-IN')}`],
  ])}
  ${alertBox('Your earnings for this order will be added to your next payout cycle.', '#16a34a')}
  ${btn('View Earnings', `${SELLER_SITE}/payouts`)}
`);

// ─── 12. Order Cancelled ──────────────────────────────────────────────────────
const sellerOrderCancelled = (name, order) => wrap(`
  ${badge('Order Cancelled', '#9ca3af')}
  ${h2(`Hi ${name}, an order has been cancelled.`)}
  ${para(`Order <strong style="color:#1a1a18">#${order.order_id}</strong> for <strong style="color:#1a1a18">"${order.title}"</strong> has been cancelled by the customer.`)}
  ${infoBox([
    ['Order ID', order.order_id || '—'],
    ['Product',  order.title || '—'],
    ['Reason',   order.cancellation_reason || 'Customer request'],
  ])}
  ${para('No payout will be processed for this order. Your stock has been restocked automatically.')}
  ${btn('View My Orders', `${SELLER_SITE}/orders`)}
`);

// ─── 13. Payout Initiated ─────────────────────────────────────────────────────
const sellerPayoutInitiated = (name, payout) => wrap(`
  ${badge('Payout Initiated 💰', '#c9a96e')}
  ${h2(`Hi ${name}, your payout is being processed.`)}
  ${para('NOREN has initiated a payout to your registered bank account. Please allow 2–3 business days for it to reflect.')}
  ${infoBox([
    ['Amount',          `₹${Number(payout.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Payment Method',  payout.payment_method || 'Bank Transfer'],
    ['Period',          payout.period_start && payout.period_end ? `${payout.period_start} – ${payout.period_end}` : 'Current cycle'],
    ['Reference',       payout.transaction_ref || 'Processing…'],
    ['Status',          'Processing'],
  ])}
  ${alertBox('Once credited, you will receive a confirmation email. If not credited within 3 business days, contact our seller support.')}
  ${btn('View Payout History', `${SELLER_SITE}/payouts`)}
`);

// ─── 14. Payout Completed ─────────────────────────────────────────────────────
const sellerPayoutPaid = (name, payout) => wrap(`
  ${badge('Payout Successful ✓', '#16a34a')}
  ${h2(`Hi ${name}, your payout has been sent!`)}
  ${para('Your earnings have been transferred to your registered bank account successfully.')}
  ${infoBox([
    ['Amount Paid',    `₹${Number(payout.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Payment Method', payout.payment_method || 'Bank Transfer'],
    ['Transaction Ref',payout.transaction_ref || '—'],
    ['Paid On',        payout.paid_at ? new Date(payout.paid_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })],
  ])}
  ${alertBox('Please allow up to 24 hours for the amount to reflect in your bank account depending on your bank.', '#16a34a')}
  ${btn('View Payout Details', `${SELLER_SITE}/payouts`)}
`);

// ─── 15. Low Stock Warning ────────────────────────────────────────────────────
const sellerLowStock = (name, products) => wrap(`
  ${badge('Low Stock Alert ⚠️', '#f59e0b')}
  ${h2(`Hi ${name}, some products are running low.`)}
  ${para('The following products have low stock levels. Update your inventory to avoid missing out on orders.')}
  <div style="background:#f5f0e8;padding:16px 20px;margin-bottom:20px;border-radius:2px">
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <tr style="border-bottom:1px solid #e6e0d8">
        <th style="text-align:left;padding:6px 0;color:#9e9a94;font-weight:600">Product</th>
        <th style="text-align:right;padding:6px 0;color:#9e9a94;font-weight:600">Stock Left</th>
      </tr>
      ${products.map(p => `<tr>
        <td style="padding:7px 0;color:#1a1a18;font-weight:500">${p.title}</td>
        <td style="text-align:right;padding:7px 0;color:${p.stock <= 2 ? '#dc2626' : '#f59e0b'};font-weight:700">${p.stock} units</td>
      </tr>`).join('')}
    </table>
  </div>
  ${btn('Update Stock', `${SELLER_SITE}/products`)}
`);

// ─── 16. Monthly Performance Summary ─────────────────────────────────────────
const sellerMonthlySummary = (name, stats, month) => wrap(`
  ${badge(`${month} Performance Summary`)}
  ${h2(`Hi ${name}, here's your monthly report.`)}
  ${para(`Here's a summary of your seller performance on NOREN for <strong style="color:#1a1a18">${month}</strong>.`)}
  <div style="background:#1a1a18;padding:24px;margin-bottom:22px;border-radius:2px">
    <table style="width:100%;font-size:14px;color:#faf9f7;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#9e9a94">Total Orders</td><td style="text-align:right;padding:8px 0;font-weight:700;color:#c9a96e">${stats.orders || 0}</td></tr>
      <tr><td style="padding:8px 0;color:#9e9a94">Gross Revenue</td><td style="text-align:right;padding:8px 0;font-weight:700;color:#c9a96e">₹${Number(stats.revenue || 0).toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:8px 0;color:#9e9a94">Commission Charged</td><td style="text-align:right;padding:8px 0;font-weight:700;color:#9e9a94">₹${Number(stats.commission || 0).toLocaleString('en-IN')}</td></tr>
      <tr style="border-top:1px solid #2d2d2b"><td style="padding:10px 0;color:#faf9f7;font-weight:600">Net Earnings</td><td style="text-align:right;padding:10px 0;font-weight:800;color:#c9a96e;font-size:18px">₹${Number(stats.payout || 0).toLocaleString('en-IN')}</td></tr>
    </table>
  </div>
  ${infoBox([
    ['Products Listed',  stats.products || 0],
    ['Approved Products',stats.approved_products || 0],
    ['Best Seller',      stats.best_seller || '—'],
  ])}
  ${btn('View Full Dashboard', `${SELLER_SITE}/dashboard`)}
`);

// ─── 17. New Message from Admin ───────────────────────────────────────────────
const sellerAdminMessage = (name, subject, message) => wrap(`
  ${badge('Message from NOREN Admin')}
  ${h2(`Hi ${name}, you have a message.`)}
  ${infoBox([['Subject', subject]])}
  <div style="background:#f5f0e8;padding:18px 22px;margin-bottom:22px;border-radius:2px;font-size:14px;color:#5a5750;line-height:1.8">
    ${message}
  </div>
  ${divider()}
  ${para('If you have questions, reply to this email or visit your seller dashboard.')}
  ${btn('Go to Seller Portal', SELLER_SITE)}
`);

module.exports = {
  sellerWelcome,
  sellerKYCSubmitted,
  sellerKYCApproved,
  sellerKYCRejected,
  sellerAccountApproved,
  sellerAccountSuspended,
  sellerProductSubmitted,
  sellerProductApproved,
  sellerProductRejected,
  sellerNewOrder,
  sellerOrderDelivered,
  sellerOrderCancelled,
  sellerPayoutInitiated,
  sellerPayoutPaid,
  sellerLowStock,
  sellerMonthlySummary,
  sellerAdminMessage,
};

'use strict';
/**
 * NOREN Email Templates — centralised HTML builders
 * All templates share the same brand header/footer.
 */

const YEAR = new Date().getFullYear();
const SITE = process.env.FRONTEND_URL || 'https://www.norenfashion.shop';

const header = () => `
<div style="background:#1a1a18;padding:28px 40px;text-align:center">
  <div style="font-family:Georgia,serif;font-weight:600;font-size:26px;letter-spacing:0.35em;color:#faf9f7;text-transform:uppercase">NOREN</div>
  <div style="font-size:8px;letter-spacing:0.28em;color:#5a5750;margin-top:4px;text-transform:uppercase">Fashion House</div>
</div>`;

const footer = (unsubscribeNote = '') => `
<div style="padding:18px 40px 24px;text-align:center;border-top:1px solid #e6e0d8;margin-top:8px">
  <p style="color:#b8a898;font-size:11px;letter-spacing:0.06em;margin:0">© ${YEAR} NOREN. Timeless By Design.</p>
  <p style="color:#d1cdc8;font-size:10px;margin:6px 0 0">Questions? Contact us at <a href="mailto:supportnoren1@gmail.com" style="color:#c9a96e;text-decoration:none">supportnoren1@gmail.com</a></p>
  ${unsubscribeNote ? `<p style="color:#d1cdc8;font-size:10px;margin:4px 0 0">${unsubscribeNote}</p>` : ''}
</div>`;

const wrap = (bodyHtml, unsubscribeNote = '') => `
<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:auto;background:#faf9f7;padding:0">
  ${header()}
  <div style="padding:36px 40px 28px;border:1px solid #e6e0d8;border-top:none">${bodyHtml}</div>
  ${footer(unsubscribeNote)}
</div>`;

const badge = (label, color = '#c9a96e') =>
  `<p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${color};margin:0 0 12px">${label}</p>`;

const h2 = (text) =>
  `<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#1a1a18;margin:0 0 20px">${text}</h2>`;

const para = (text) =>
  `<p style="color:#5a5750;line-height:1.8;font-size:14px;margin-bottom:20px">${text}</p>`;

const infoBox = (rows) => `
<div style="background:#f5f0e8;padding:20px 24px;margin-bottom:24px;border-radius:2px">
  <table style="width:100%;font-size:13px;border-collapse:collapse">
    ${rows.map(([label, value]) => `
    <tr>
      <td style="color:#9e9a94;padding:5px 0;width:42%;vertical-align:top">${label}</td>
      <td style="color:#1a1a18;font-weight:500;padding:5px 0">${value}</td>
    </tr>`).join('')}
  </table>
</div>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#1a1a18;color:#faf9f7;padding:14px 36px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:24px">${text}</a>`;

const otpBox = (otp) => `
<div style="background:#1a1a18;padding:24px;text-align:center;margin:24px 0;border-radius:2px">
  <p style="color:#b8a898;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 10px">Your One-Time Password</p>
  <div style="font-family:Georgia,serif;font-size:40px;font-weight:700;letter-spacing:0.22em;color:#c9a96e">${otp}</div>
  <p style="color:#5a5750;font-size:11px;margin:10px 0 0">Valid for <strong style="color:#faf9f7">10 minutes</strong> · Do not share with anyone</p>
</div>`;

const divider = () => `<div style="height:1px;background:#e6e0d8;margin:24px 0"></div>`;

module.exports = {
  // ─────────────────────────────────────────────────────────────
  // AUTH: OTP for forgot-password / change-password verification
  // ─────────────────────────────────────────────────────────────
  forgotPasswordOTP: (name, otp) => wrap(`
    ${badge('Password Reset')}
    ${h2(`Hi ${name},`)}
    ${para('We received a request to reset your NOREN account password. Use the OTP below to verify your identity and set a new password.')}
    ${otpBox(otp)}
    ${para('If you did not request this, you can safely ignore this email. Your account remains secure.')}
    ${divider()}
    <p style="color:#b8a898;font-size:12px;margin:0">For security, never share your OTP with anyone — including NOREN support.</p>
  `),

  // ─────────────────────────────────────────────────────────────
  // AUTH: Password changed confirmation
  // ─────────────────────────────────────────────────────────────
  passwordChanged: (name, time) => wrap(`
    ${badge('Security Alert', '#dc2626')}
    ${h2(`Hi ${name},`)}
    ${para(`Your NOREN account password was successfully changed on <strong style="color:#1a1a18">${time} IST</strong>.`)}
    ${para('If you did not make this change, contact us immediately.')}
    ${btn('Contact Support', 'mailto:supportnoren1@gmail.com')}
  `),

  // ─────────────────────────────────────────────────────────────
  // SUBSCRIBE: Newsletter subscription confirmed
  // ─────────────────────────────────────────────────────────────
  subscribeConfirm: (email) => wrap(`
    ${badge('You\u2019re In', '#c9a96e')}
    ${h2('Welcome to NOREN Insiders')}
    ${para('You\'ve successfully subscribed to the NOREN newsletter. Expect exclusive early access to new collections, private sale alerts, and curated style inspiration — delivered to your inbox.')}
    ${infoBox([['Subscribed Email', email]])}
    ${btn('Explore the Collection', SITE)}
    ${divider()}
    <p style="color:#b8a898;font-size:12px;margin:0">You can unsubscribe at any time by replying "UNSUBSCRIBE" to any NOREN newsletter.</p>
  `, 'You received this because you subscribed at norenfashion.shop'),

  // ─────────────────────────────────────────────────────────────
  // EMPLOYEE: Welcome email with credentials
  // ─────────────────────────────────────────────────────────────
  employeeWelcome: (name, email, password, role, businessName) => wrap(`
    ${badge('Welcome to the Team', '#c9a96e')}
    ${h2(`Hi ${name},`)}
    ${para(`Your employee account at <strong style="color:#1a1a18">NOREN${businessName ? ' — ' + businessName : ''}</strong> has been created. Below are your login credentials. Please change your password after your first login.`)}
    ${infoBox([
      ['Full Name', name],
      ['Email', email],
      ['Temporary Password', `<code style="background:#e6e0d8;padding:2px 8px;font-size:13px;letter-spacing:0.08em;border-radius:2px">${password}</code>`],
      ['Role', role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
    ])}
    ${btn('Sign In to Dashboard', SITE + '/login')}
    ${divider()}
    <p style="color:#b8a898;font-size:12px;margin:0">⚠️ For your security, change your password immediately after your first login. Never share your credentials.</p>
  `),

  // ─────────────────────────────────────────────────────────────
  // EMPLOYEE: Offer letter / Welcome letter
  // ─────────────────────────────────────────────────────────────
  employeeOfferLetter: (name, role, businessName, startDate) => {
    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    return wrap(`
      ${badge('Offer Letter', '#c9a96e')}
      <p style="font-size:13px;color:#9e9a94;margin:0 0 20px">Date: ${today}</p>
      ${h2(`Dear ${name},`)}
      ${para(`We are delighted to extend this offer of employment to you for the position of <strong style="color:#1a1a18">${role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong> at <strong style="color:#1a1a18">NOREN Fashion${businessName ? ' — ' + businessName : ''}</strong>.`)}
      ${para(`Your joining date is confirmed as <strong style="color:#1a1a18">${startDate || today}</strong>. We believe your skills and experience will be a great asset to our team.`)}
      ${para('At NOREN, we are committed to building a culture of excellence, creativity, and inclusivity. We look forward to your contributions and to supporting your professional growth.')}
      ${infoBox([
        ['Position', role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
        ['Organization', `NOREN Fashion${businessName ? ' — ' + businessName : ''}`],
        ['Joining Date', startDate || today],
      ])}
      ${para('Please confirm your acceptance by signing in to your dashboard and completing your onboarding steps.')}
      ${btn('Accept & Sign In', SITE + '/login')}
      ${divider()}
      <p style="color:#5a5750;font-size:13px;margin:0">Warmly,<br><strong>The NOREN Team</strong><br>Human Resources</p>
    `);
  },

  // ─────────────────────────────────────────────────────────────
  // INFLUENCER: Welcome / account created
  // ─────────────────────────────────────────────────────────────
  influencerWelcome: (name, email, password, commissionType, commissionRate) => wrap(`
    ${badge('Welcome, Influencer', '#c9a96e')}
    ${h2(`Hi ${name},`)}
    ${para('Congratulations! You have been onboarded as a NOREN Brand Ambassador. Your influencer account is now active.')}
    ${infoBox([
      ['Email', email],
      ['Temporary Password', `<code style="background:#e6e0d8;padding:2px 8px;font-size:13px;letter-spacing:0.08em;border-radius:2px">${password}</code>`],
      ['Commission Type', commissionType === 'percentage' ? 'Percentage' : 'Fixed'],
      ['Commission Rate', commissionType === 'percentage' ? `${commissionRate}%` : `₹${commissionRate} per order`],
    ])}
    ${btn('Go to Influencer Dashboard', SITE + '/influencer/dashboard')}
    ${divider()}
    <p style="color:#b8a898;font-size:12px;margin:0">Change your password after first login. Your unique tracking links will be available in your dashboard.</p>
  `),

  // ─────────────────────────────────────────────────────────────
  // INFLUENCER: Payout created / processed
  // ─────────────────────────────────────────────────────────────
  influencerPayout: (name, amount, status, conversionCount, payoutRef, txnRef) => {
    const statusMessages = {
      pending: { badge: 'Payout Initiated', color: '#9e9a94', msg: 'Your payout request has been initiated and is pending approval from the NOREN finance team.' },
      approved: { badge: 'Payout Approved', color: '#2563eb', msg: 'Great news! Your payout has been approved and is being processed.' },
      processing: { badge: 'Payout Processing', color: '#d97706', msg: 'Your payout is currently being processed. Funds will be credited shortly.' },
      paid: { badge: 'Payout Completed ✓', color: '#16a34a', msg: 'Your payout has been successfully processed. The funds have been transferred to your registered payment account.' },
      failed: { badge: 'Payout Failed', color: '#dc2626', msg: 'Unfortunately, your payout could not be processed. Please contact support or verify your payment details.' },
    };
    const s = statusMessages[status] || statusMessages.pending;
    const rows = [
      ['Amount', `<strong style="color:#1a1a18;font-size:16px">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>`],
      ['Conversions Included', String(conversionCount)],
      ['Payout Reference', payoutRef || '—'],
    ];
    if (txnRef) rows.push(['Transaction Reference', txnRef]);
    return wrap(`
      ${badge(s.badge, s.color)}
      ${h2(`Hi ${name},`)}
      ${para(s.msg)}
      ${infoBox(rows)}
      ${btn('View Payout Details', SITE + '/influencer/payouts')}
      ${divider()}
      <p style="color:#b8a898;font-size:12px;margin:0">Questions about your payout? Reply to this email or contact supportnoren1@gmail.com</p>
    `);
  },

  // ─────────────────────────────────────────────────────────────
  // INFLUENCER: New commission earned
  // ─────────────────────────────────────────────────────────────
  influencerCommission: (name, commission, orderTotal, orderId, commissionStatus) => wrap(`
    ${badge('Commission Earned 🎉', '#16a34a')}
    ${h2(`Hi ${name},`)}
    ${para('A new order placed via your referral link has been attributed to you.')}
    ${infoBox([
      ['Order Reference', `#${orderId}`],
      ['Order Total', `₹${Number(orderTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Your Commission', `<strong style="color:#16a34a;font-size:15px">₹${Number(commission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>`],
      ['Status', commissionStatus.charAt(0).toUpperCase() + commissionStatus.slice(1)],
    ])}
    ${btn('View Conversions', SITE + '/influencer/conversions')}
  `),

  // ─────────────────────────────────────────────────────────────
  // INFLUENCER: Commission status updated
  // ─────────────────────────────────────────────────────────────
  influencerCommissionUpdate: (name, commission, orderId, oldStatus, newStatus) => wrap(`
    ${badge('Commission Update', newStatus === 'approved' ? '#16a34a' : newStatus === 'rejected' ? '#dc2626' : '#2563eb')}
    ${h2(`Hi ${name},`)}
    ${para(`Your commission for order <strong style="color:#1a1a18">#${orderId}</strong> has been updated.`)}
    ${infoBox([
      ['Commission Amount', `₹${Number(commission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Previous Status', oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1)],
      ['New Status', `<strong style="color:${newStatus === 'approved' ? '#16a34a' : newStatus === 'rejected' ? '#dc2626' : '#2563eb'}">${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong>`],
    ])}
    ${btn('View in Dashboard', SITE + '/influencer/conversions')}
  `),

  // ─────────────────────────────────────────────────────────────
  // ORDER: Confirmation email (rich with item table)
  // ─────────────────────────────────────────────────────────────
  orderConfirm: (name, orderId, total, items, address) => {
    const rows = items.map(i => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e6e0d8;font-size:13px;color:#2c2c29">
        ${i.image_url ? `<img src="${i.image_url}" style="width:44px;height:44px;object-fit:cover;border-radius:2px;float:left;margin-right:10px;vertical-align:middle" />` : ''}
        ${i.title} ${i.size ? `<span style="color:#9e9a94;font-size:11px">(${i.size})</span>` : ''}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e6e0d8;text-align:center;color:#5a5750;font-size:13px">×${i.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e6e0d8;text-align:right;font-size:13px;color:#1a1a18;font-weight:500">₹${(i.price * i.quantity).toLocaleString('en-IN')}</td>
    </tr>`).join('');
    const addrStr = address ? `${address.address}, ${address.city}, ${address.state} – ${address.pincode}` : '';
    return wrap(`
      ${badge('Order Confirmed ✓', '#16a34a')}
      ${h2(`Hi ${name},`)}
      ${para('Your order has been confirmed. We are preparing your pieces with care.')}
      ${infoBox([['Order Reference', `<strong style="font-family:Georgia,serif;font-size:15px;letter-spacing:0.06em">#${orderId}</strong>`]])}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr style="background:#f5f0e8">
            <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#5a5750">Item</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#5a5750">Qty</th>
            <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#5a5750">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="background:#f5f0e8;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5a5750">Total Amount</span>
        <span style="font-size:20px;font-weight:700;color:#1a1a18;font-family:Georgia,serif">₹${Number(total).toLocaleString('en-IN')}</span>
      </div>
      ${addrStr ? infoBox([['Delivery To', addrStr]]) : ''}
      ${btn('Track Your Order', SITE + '/orders')}
    `);
  },

  // ─────────────────────────────────────────────────────────────
  // ORDER: Status update (shipped / delivered / cancelled)
  // ─────────────────────────────────────────────────────────────
  orderStatusUpdate: (name, orderId, status, trackingId, awb) => {
    const statusConfig = {
      shipped:   { badge: 'Shipped 📦',   color: '#2563eb', msg: 'Great news! Your order has been dispatched and is on its way to you.' },
      delivered: { badge: 'Delivered ✓',  color: '#16a34a', msg: 'Your order has been delivered. We hope you love your new pieces from NOREN.' },
      cancelled: { badge: 'Order Cancelled', color: '#dc2626', msg: 'Your order has been cancelled. If you didn\'t request this or have questions, please contact our support team.' },
      confirmed: { badge: 'Order Confirmed ✓', color: '#16a34a', msg: 'Your order has been confirmed and is being prepared.' },
      processing:{ badge: 'Processing',   color: '#d97706', msg: 'Your order is currently being processed by our team.' },
    };
    const s = statusConfig[status] || statusConfig.processing;
    const rows = [['Order Reference', `#${orderId}`], ['Status', s.badge]];
    if (trackingId) rows.push(['Tracking ID', trackingId]);
    if (awb) rows.push(['AWB Number', awb]);
    return wrap(`
      ${badge(s.badge, s.color)}
      ${h2(`Hi ${name},`)}
      ${para(s.msg)}
      ${infoBox(rows)}
      ${btn('View Order Details', SITE + '/orders')}
    `);
  },

  // ─────────────────────────────────────────────────────────────
  // PRODUCT: Email a product to customer(s)
  // ─────────────────────────────────────────────────────────────
  productEmail: (recipientName, product, message) => {
    const discountedPrice = product.discount_percent > 0
      ? Math.round(product.price * (1 - product.discount_percent / 100))
      : null;
    return wrap(`
      ${badge('Curated For You', '#c9a96e')}
      ${h2(product.title)}
      ${message ? para(message) : para('We thought you\'d love this piece from our latest NOREN collection.')}
      ${product.primary_image ? `
      <div style="text-align:center;margin-bottom:20px">
        <img src="${product.primary_image}" alt="${product.title}" style="max-width:280px;width:100%;height:auto;border-radius:2px;object-fit:cover" />
      </div>` : ''}
      ${infoBox([
        ['Category', product.category_name || '\u2014'],
        ['Price', discountedPrice
          ? `<span style="text-decoration:line-through;color:#9e9a94;margin-right:8px">\u20b9${Number(product.price).toLocaleString('en-IN')}</span><strong style="color:#16a34a">\u20b9${Number(discountedPrice).toLocaleString('en-IN')}</strong> <span style="background:#e6f4ea;color:#16a34a;font-size:10px;padding:2px 6px;border-radius:2px">${product.discount_percent}% OFF</span>`
          : `\u20b9${Number(product.price).toLocaleString('en-IN')}`
        ],
        ...(product.description ? [['Description', product.description.slice(0, 200) + (product.description.length > 200 ? '\u2026' : '')]] : []),
      ])}
      ${btn('View & Shop Now', SITE + '/product/' + product.id)}
      ${divider()}
      <p style="color:#b8a898;font-size:12px;margin:0">You received this because you are a valued NOREN customer. <a href="mailto:supportnoren1@gmail.com" style="color:#c9a96e;text-decoration:none">Unsubscribe</a></p>
    `, 'You received this because you are a NOREN customer');
  },

  // ─────────────────────────────────────────────────────────────
  // OFFER: General promotional email
  // ─────────────────────────────────────────────────────────────
  offerEmail: (name, subject, message, ctaText, ctaUrl, type) => {
    const typeConfig = {
      new_launch:  { badge: 'New Collection', color: '#c9a96e' },
      deal:        { badge: 'Special Deal',   color: '#16a34a' },
      offer:       { badge: 'Exclusive Offer',color: '#dc2626' },
      update:      { badge: 'Update',         color: '#2563eb' },
      custom:      { badge: 'From NOREN',     color: '#5a5750' },
    };
    const t = typeConfig[type] || typeConfig.custom;
    return wrap(`
      ${badge(t.badge, t.color)}
      ${h2(subject)}
      ${name ? para(`Hi ${name},`) : ''}
      <div style="color:#5a5750;line-height:1.9;font-size:14px;white-space:pre-wrap;margin-bottom:24px">${message}</div>
      ${btn(ctaText || 'Explore Now', ctaUrl || SITE)}
      ${divider()}
      <p style="color:#b8a898;font-size:12px;margin:0">You received this because you are subscribed to NOREN updates. <a href="mailto:supportnoren1@gmail.com" style="color:#c9a96e;text-decoration:none">Unsubscribe</a></p>
    `, 'You received this because you are subscribed to NOREN newsletters');
  },
};

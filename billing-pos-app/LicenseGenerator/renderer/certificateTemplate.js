/**
 * certificateTemplate.js
 * 3-page professional license certificate with guilloché legal document border
 * Official Company Logo: IMG_8810.PNG
 * Contact: 7984626447 | Dinesh Global Enterprises Pvt Ltd
 */

/* ── Inline Vector Legal Document Border (Guilloché Engraved) ─────────────── */
const BORDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;">
<defs>
  <linearGradient id="gOuter" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#062e1d"/><stop offset="30%" stop-color="#0B5D3B"/><stop offset="70%" stop-color="#0e7a4e"/><stop offset="100%" stop-color="#062e1d"/>
  </linearGradient>
  <pattern id="guillocheH" x="0" y="0" width="40" height="18" patternUnits="userSpaceOnUse">
    <path d="M0,9 C5,2 10,2 15,9 C20,16 25,16 30,9 C35,2 40,2 45,9" fill="none" stroke="#1a7a4e" stroke-width="0.6" opacity="0.7"/>
    <path d="M0,9 C5,16 10,16 15,9 C20,2 25,2 30,9 C35,16 40,16 45,9" fill="none" stroke="#0d4a2e" stroke-width="0.4" opacity="0.6"/>
  </pattern>
  <pattern id="guillocheV" x="0" y="0" width="18" height="40" patternUnits="userSpaceOnUse">
    <path d="M9,0 C2,5 2,10 9,15 C16,20 16,25 9,30 C2,35 2,40 9,45" fill="none" stroke="#1a7a4e" stroke-width="0.6" opacity="0.7"/>
  </pattern>
  <pattern id="microHatch" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="4" y2="4" stroke="#0a4a2d" stroke-width="0.25" opacity="0.5"/>
  </pattern>
</defs>
<rect x="6" y="6" width="782" height="1111" rx="4" ry="4" fill="none" stroke="url(#gOuter)" stroke-width="9"/>
<rect x="15" y="15" width="764" height="1093" rx="3" ry="3" fill="url(#microHatch)" stroke="#0B5D3B" stroke-width="1.2"/>
<rect x="24" y="24" width="746" height="1075" rx="2" ry="2" fill="none" stroke="#0B5D3B" stroke-width="2.5"/>
<rect x="28" y="28" width="738" height="1067" rx="2" ry="2" fill="none" stroke="#1a7a4e" stroke-width="0.8"/>
<rect x="32" y="32" width="730" height="1059" rx="2" ry="2" fill="none" stroke="#0B5D3B" stroke-width="1.5"/>
<!-- Corner Rosettes -->
<g transform="translate(15,15)">
  <circle cx="14" cy="14" r="11" fill="#0B5D3B" stroke="#62c999" stroke-width="0.8"/>
  <circle cx="14" cy="14" r="3.5" fill="#0e7a4e"/>
</g>
<g transform="translate(779,15) scale(-1,1)">
  <circle cx="14" cy="14" r="11" fill="#0B5D3B" stroke="#62c999" stroke-width="0.8"/>
  <circle cx="14" cy="14" r="3.5" fill="#0e7a4e"/>
</g>
<g transform="translate(15,1108) scale(1,-1)">
  <circle cx="14" cy="14" r="11" fill="#0B5D3B" stroke="#62c999" stroke-width="0.8"/>
  <circle cx="14" cy="14" r="3.5" fill="#0e7a4e"/>
</g>
<g transform="translate(779,1108) scale(-1,-1)">
  <circle cx="14" cy="14" r="11" fill="#0B5D3B" stroke="#62c999" stroke-width="0.8"/>
  <circle cx="14" cy="14" r="3.5" fill="#0e7a4e"/>
</g>
</svg>`;

/* ── Watermark seal ───────────────────────────────────────────────────────── */
const SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <circle cx="80" cy="80" r="76" fill="none" stroke="#0B5D3B" stroke-width="3" opacity="0.09"/>
  <circle cx="80" cy="80" r="68" fill="none" stroke="#0e7a4e" stroke-width="1.5" opacity="0.07"/>
  <circle cx="80" cy="80" r="58" fill="none" stroke="#0B5D3B" stroke-width="1" opacity="0.06"/>
  <circle cx="80" cy="80" r="46" fill="none" stroke="#0e7a4e" stroke-width="0.8" opacity="0.05"/>
  <g transform="translate(80,80)" stroke="#0B5D3B" stroke-width="1.5" opacity="0.07">
    <line x1="-72" y1="0" x2="72" y2="0"/>
    <line x1="-72" y1="0" x2="72" y2="0" transform="rotate(30)"/>
    <line x1="-72" y1="0" x2="72" y2="0" transform="rotate(60)"/>
    <line x1="-72" y1="0" x2="72" y2="0" transform="rotate(90)"/>
    <line x1="-72" y1="0" x2="72" y2="0" transform="rotate(120)"/>
    <line x1="-72" y1="0" x2="72" y2="0" transform="rotate(150)"/>
  </g>
  <text x="80" y="66" text-anchor="middle" font-size="10" font-family="serif" fill="#0B5D3B"
        opacity="0.12" font-weight="bold" letter-spacing="2">DINESH GLOBAL</text>
  <text x="80" y="82" text-anchor="middle" font-size="16" font-family="serif" fill="#0B5D3B"
        opacity="0.12" font-weight="bold">VENDEXA</text>
  <text x="80" y="96" text-anchor="middle" font-size="9" font-family="serif" fill="#0B5D3B"
        opacity="0.11" font-weight="bold" letter-spacing="1">ENTERPRISES PVT LTD</text>
  <text x="80" y="112" text-anchor="middle" font-size="9" fill="#0B5D3B" opacity="0.09">★ ★ ★ ★ ★</text>
</svg>`;

/* ── Build full 3-page certificate HTML ───────────────────────────────────── */
function buildCertificateHTML(r, editionLabelFn) {
  const edition   = editionLabelFn(r.edition);
  const issuedOn  = r.createdAtDisplay || new Date(r.createdAt).toLocaleDateString('en-IN',
    { day: '2-digit', month: 'long', year: 'numeric' });
  const validUntil = r.expiry === 'LIFETIME' ? 'Lifetime (Perpetual)' : r.expiry;
  const amount    = r.saleAmount ? '\u20B9' + parseFloat(r.saleAmount).toLocaleString('en-IN') : 'N/A';
  const certId    = 'CERT-' + r.id.toUpperCase();

  const CSS = `
@page{ size:A4 portrait; margin:0; }
*{ box-sizing:border-box; }
body{ margin:0; padding:0; font-family:'Georgia',serif; background:#fff; color:#111; }
.page{ page-break-after:always; position:relative; width:210mm; min-height:297mm; overflow:hidden; }
.page:last-child{ page-break-after:auto; }
.page-border{
  position:absolute; top:0; left:0; width:100%; height:100%;
  pointer-events:none; z-index:1;
}
.content{ position:absolute; top:18mm; left:18mm; right:18mm; bottom:16mm; z-index:5; }
.header{ text-align:center; margin-bottom:4mm; }
.company{ font-size:10.5pt; color:#0B5D3B; letter-spacing:3px; text-transform:uppercase; font-weight:700; }
.rule-double{ border:none; border-top:2.5px double #0B5D3B; margin:2.5mm 0; opacity:0.5; }
.rule{ border:none; border-top:1px solid #0B5D3B; margin:2mm 0; opacity:0.35; }
.title{ font-size:24pt; font-weight:800; color:#0B5D3B; margin:2mm 0; letter-spacing:2px; }
.subtitle{ font-size:10.5pt; color:#444; font-style:italic; margin-bottom:1mm; }
.seal{ position:absolute; top:38%; left:50%; transform:translate(-50%,-50%); opacity:0.1; z-index:0; pointer-events:none; }
.cert-box{ background:rgba(11,93,59,0.05); border:2px double #0B5D3B; border-radius:3px; padding:4mm 5mm; text-align:center; margin:3mm 0; }
.key-label{ font-size:7.5pt; color:#0B5D3B; text-transform:uppercase; letter-spacing:2.5px; margin-bottom:1.5mm; font-weight:700; }
.key-value{ font-family:'Courier New',monospace; font-size:13pt; font-weight:800; color:#062e1d; letter-spacing:2.5px; word-break:break-all; }
table{ width:100%; border-collapse:collapse; margin:2.5mm 0; }
td{ padding:1.8mm 2mm; border-bottom:0.7px solid #c0ddd0; font-size:9pt; }
td:first-child{ color:#0B5D3B; width:42%; font-weight:700; text-transform:uppercase; font-size:7.5pt; letter-spacing:0.8px; }
td:last-child{ font-weight:600; color:#111; }
.badge{ display:inline-block; background:#0B5D3B; color:#fff; border-radius:2px; padding:1mm 3mm; font-size:8.5pt; font-weight:700; letter-spacing:1px; }
.footer{ text-align:center; font-size:7pt; color:#555; border-top:1px solid #0B5D3B; padding-top:2.5mm; margin-top:3mm; line-height:1.5; }
.contact-box{ background:rgba(11,93,59,0.04); border:1px dashed #0B5D3B; border-radius:2px; padding:2mm 3mm; text-align:center; margin:2.5mm 0; font-size:9pt; }
.contact-box strong{ color:#0B5D3B; }
/* Terms pages */
.terms-content{ position:absolute; top:18mm; left:18mm; right:18mm; bottom:16mm; z-index:5; overflow:hidden; }
.terms-title{ font-size:15pt; font-weight:700; color:#0B5D3B; text-align:center; margin-bottom:4mm; border-bottom:2.5px double #0B5D3B; padding-bottom:2mm; font-family:'Georgia',serif; }
.ts{ margin-bottom:3.5mm; }
.ts h3{ font-size:9pt; color:#0B5D3B; margin-bottom:1mm; font-weight:700; }
.ts p{ font-size:7.5pt; line-height:1.5; text-align:justify; margin:1mm 0; }
.ts ul{ font-size:7.5pt; line-height:1.5; margin:1mm 0; padding-left:4mm; }
.ts li{ margin:0.5mm 0; }
.pg-foot{ text-align:right; font-size:7pt; color:#777; margin-top:4mm; }
@media print{ body{ print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>VENDEXA License Certificate \u2014 ${r.customerName}</title>
<style>${CSS}</style>
</head><body>

<!-- PAGE 1: MAIN CERTIFICATE -->
<div class="page">
  <div class="page-border">${BORDER_SVG}</div>
  <div class="seal">${SEAL_SVG}</div>
  <div class="content">
    <div class="header">
      <div style="text-align:center;margin-bottom:6px;">
        <img src="../IMG_8810.PNG" style="height:46px;object-fit:contain;" alt="Dinesh Global Enterprises Logo" />
      </div>
      <div class="company">Dinesh Global Enterprises Pvt Ltd</div>
      <hr class="rule-double"/>
      <div class="title">VENDEXA RetailOS\u2122</div>
      <div class="subtitle">Official Software License Certificate</div>
      <hr class="rule"/>
      <div style="font-size:7.5pt;color:#0B5D3B;letter-spacing:1px;font-weight:700;margin-top:1.5mm;">
        CERTIFICATE REF: ${certId} &nbsp;|&nbsp; ISSUED ON: ${issuedOn}
      </div>
    </div>

    <p style="text-align:center;font-size:9.5pt;margin:3mm 0 2mm 0;line-height:1.4;">
      This certifies that the undermentioned entity has been granted a non-exclusive, non-transferable,
      authenticated software license to use <strong>VENDEXA RetailOS\u2122</strong> subject to the Terms &amp; Conditions printed herein.
    </p>

    <table>
      <tr><td>Licensee Customer Name</td><td>${r.customerName || 'N/A'}</td></tr>
      <tr><td>Business / Shop Name</td><td>${r.businessName || '\u2014'}</td></tr>
      <tr><td>Contact Phone Number</td><td>${r.phone || 'N/A'}</td></tr>
      <tr><td>Email Address</td><td>${r.email || '\u2014'}</td></tr>
      <tr><td>City / Location</td><td>${r.city || '\u2014'}</td></tr>
      <tr><td>Software Edition</td><td><span class="badge">${edition}</span></td></tr>
      <tr><td>License Term / Validity</td><td><strong style="color:#0B5D3B;">${validUntil}</strong></td></tr>
      <tr><td>Hardware Lock Device ID</td><td><span style="font-family:'Courier New',monospace;font-size:8.5pt;">${r.deviceId || 'NOT LOCKED'}</span></td></tr>
      <tr><td>Authorized Terminal Seats</td><td>${r.floatingSeats || 1} Seat(s)</td></tr>
      <tr><td>Invoice / Fee Reference</td><td>${amount} (${r.status || 'Active'})</td></tr>
    </table>

    <div class="cert-box">
      <div class="key-label">\u2605 AUTHENTICATED HMAC LICENSE ACTIVATION KEY \u2605</div>
      <div class="key-value">${r.licenseKey}</div>
    </div>

    <div class="contact-box">
      <strong>Support &amp; Verification Contact:</strong> +91-7984626447 &nbsp;|&nbsp;
      <strong>Publisher:</strong> Dinesh Global Enterprises Pvt Ltd
    </div>

    <div class="footer">
      This document constitutes a binding software license agreement between Dinesh Global Enterprises Pvt Ltd and the Licensee.<br/>
      Cryptographic Signature: HMAC-SHA256 &nbsp;|&nbsp; 100% Offline Validated &nbsp;|&nbsp; Page 1 of 3
    </div>
  </div>
</div>

<!-- PAGE 2: TERMS & CONDITIONS (PART 1) -->
<div class="page">
  <div class="page-border">${BORDER_SVG}</div>
  <div class="terms-content">
    <div class="terms-title">SOFTWARE LICENSE TERMS &amp; CONDITIONS</div>

    <div class="ts">
      <h3>1. GRANT OF LICENSE</h3>
      <p>Dinesh Global Enterprises Pvt Ltd ("Licensor") hereby grants to the entity named on Page 1 ("Licensee") a non-exclusive, non-transferable, limited license to install and execute VENDEXA RetailOS\u2122 ("Software") on the specified number of authorized terminal hardware devices.</p>
    </div>

    <div class="ts">
      <h3>2. HARDWARE BINDING &amp; DEVICE LOCK</h3>
      <p>The Software is bound to the specific Hardware Device ID fingerprint provided at activation. Transferring the license key to an unauthorized hardware device without explicit written consent from Licensor is strictly prohibited and will void activation.</p>
    </div>

    <div class="ts">
      <h3>3. PERPETUAL &amp; SUBSCRIPTION TERMS</h3>
      <p><strong>Lifetime Licenses:</strong> Granted perpetually for the major version purchased.<br/>
      <strong>Annual Subscriptions:</strong> Valid for 365 days from issuance date. Renewal must be completed prior to expiry to avoid POS interruption.</p>
    </div>

    <div class="ts">
      <h3>4. RESTRICTIONS ON USE</h3>
      <ul>
        <li>Licensee shall not reverse-engineer, decompile, or disassemble the Software.</li>
        <li>Licensee shall not rent, lease, sub-license, or redistribute the activation key to third parties.</li>
        <li>Licensee shall not tamper with offline cryptographic verification files or HMAC tokens.</li>
      </ul>
    </div>

    <div class="pg-foot">VENDEXA RetailOS\u2122 Software License Agreement &nbsp;|&nbsp; Page 2 of 3</div>
  </div>
</div>

<!-- PAGE 3: TERMS & CONDITIONS (PART 2) -->
<div class="page">
  <div class="page-border">${BORDER_SVG}</div>
  <div class="terms-content">
    <div class="terms-title">WARRANTY, SUPPORT &amp; LEGAL JURISDICTION</div>

    <div class="ts">
      <h3>5. DATA PRIVACY &amp; OFFLINE OPERATION</h3>
      <p>VENDEXA RetailOS\u2122 operates 100% offline. All financial data, transactions, inventory databases, and customer records remain strictly on Licensee's local hardware storage. Licensor does not collect or transmit store telemetry.</p>
    </div>

    <div class="ts">
      <h3>6. LIMITED WARRANTY &amp; LIABILITY</h3>
      <p>The Software is provided "AS IS". Licensor's maximum total financial liability under any legal claim shall not exceed the total license fee paid by Licensee for this software license.</p>
    </div>

    <div class="ts">
      <h3>7. SUPPORT &amp; MAINTENANCE</h3>
      <p>Technical support is available directly via telephone at <strong>+91-7984626447</strong>. Upgrades within the same major version are included free of charge.</p>
    </div>

    <div class="ts">
      <h3>8. GOVERNING LAW</h3>
      <p>This agreement shall be governed by and construed in accordance with the laws of India. Courts of Mumbai, Maharashtra shall have exclusive jurisdiction.</p>
    </div>

    <div style="margin-top:12mm;display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="text-align:center;">
        <div style="border-bottom:1px solid #0B5D3B;width:55mm;margin-bottom:1mm;"></div>
        <div style="font-size:7.5pt;color:#0B5D3B;font-weight:700;">LICENSEE ACCEPTANCE SIGNATURE</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Georgia',serif;font-style:italic;font-size:9pt;color:#0B5D3B;margin-bottom:1mm;">Dinesh Global Enterprises</div>
        <div style="border-bottom:1px solid #0B5D3B;width:55mm;margin-bottom:1mm;"></div>
        <div style="font-size:7.5pt;color:#0B5D3B;font-weight:700;">AUTHORIZED ISSUING AUTHORITY</div>
      </div>
    </div>

    <div class="pg-foot">VENDEXA RetailOS\u2122 Software License Agreement &nbsp;|&nbsp; Page 3 of 3</div>
  </div>
</div>

</body></html>`;
}

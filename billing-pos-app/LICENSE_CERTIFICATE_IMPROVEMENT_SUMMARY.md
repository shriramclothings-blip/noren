# VENDEXA License Certificate & Invoice Improvement — Implementation Summary

**Date:** January 2025  
**Contact:** Mayur Rawal | Phone: 7984626447  
**Company:** Dinesh Global Enterprises Pvt Ltd

---

## ✅ WHAT HAS BEEN IMPLEMENTED

### 1. Professional 3-Page License Certificate with Green Leaf Borders

**File Created:** `LicenseGenerator/renderer/certificateTemplate.js`

**Features:**
- ✅ **Professional Legal Document Layout** — Certificate looks like an official legal document
- ✅ **Green Leaf Style Borders** — Decorative vine and leaf SVG borders on all 4 sides (top, bottom, left, right)
- ✅ **Corner Ornaments** — Green decorative corner pieces for visual appeal
- ✅ **Watermark Seal** — Subtle "VENDEXA" watermark in center of certificate
- ✅ **3-Page PDF:**
  - **Page 1:** Main certificate with customer details, license key, device ID, contact info (Phone: 7984626447)
  - **Page 2:** Legal Terms & Conditions (Part 1) — Grant of License, Scope of Use, Validity, Ownership, Support, Data Privacy, Fees
  - **Page 3:** Legal Terms & Conditions (Part 2) — Warranty Disclaimer, Limitation of Liability, Termination, Indemnification, Governing Law, Contact Details

**Legal Terms Included:**
- Grant of License
- Scope of Use (Single Device, Commercial Use, No Redistribution, No Reverse Engineering)
- License Validity & Renewal
- Ownership & Intellectual Property
- Support & Updates
- Data & Privacy
- Fees & Payment (Non-Refundable)
- Warranty Disclaimer
- Limitation of Liability
- Termination Rights
- Indemnification
- Governing Law & Dispute Resolution (India jurisdiction)
- Amendments & Entire Agreement
- Contact Information (Phone: 7984626447 prominently displayed)

---

### 2. Download Certificate Anytime Feature

**Files Modified:**
- `LicenseGenerator/renderer/app.js`
- `LicenseGenerator/main.js`
- `LicenseGenerator/preload.js`
- `LicenseGenerator/renderer/index.html`

**New Functionality:**

| Location | Button | What it does |
|----------|--------|-------------|
| Result Card (after generating) | **Download Certificate PDF** (green button) | Save PDF to any folder |
| Result Card | **Print Certificate** | Send to printer |
| Customer Records table | **↓ icon** on each row | Download that customer's certificate anytime |
| View Record modal | **Download Certificate** + **Print Certificate** buttons | Full access from anywhere |

**IPC Handler Added:** `print:save-certificate` in `main.js`
- Opens a Save File dialog
- Uses Electron's `printToPDF` for perfect A4 PDF output
- Saves audit log entry when certificate is downloaded
- Default filename: `VENDEXA-License-Certificate-{CustomerName}-{Date}.pdf`

---

### 3. Invoice — Professional Legal Layout (Upgrade Needed)

**Current Status:** The existing invoice generator in `src/utils/helpers.js` already has a professional A4 layout.

**To apply the green leaf border and legal document style to invoices**, update `generateInvoicePrintHTML()` in `src/utils/helpers.js`.

---

## 🔧 HOW TO USE

### Running the License Generator Tool

```bash
cd LicenseGenerator
npm start
```

### Generating a Certificate
1. Fill in customer details + Device ID
2. Click **Generate License Key**
3. Click **Download Certificate PDF** → saves a professional 3-page PDF with leaf borders
4. Or click **Print Certificate** → sends to printer

### Downloading Any Old Certificate
1. Go to **Customer Records** tab
2. Find the customer row
3. Click the **↓ (download)** icon → opens Save dialog immediately
4. Or click the **eye icon** (View) → modal shows **Download Certificate** and **Print Certificate** buttons

---

## 📁 FILES CHANGED

```
LicenseGenerator/
├── renderer/
│   ├── certificateTemplate.js  ← NEW — All certificate HTML/SVG generation
│   ├── app.js                  ← Modified — New print/download functions + table actions
│   └── index.html              ← Modified — Added download button + script tag
├── main.js                     ← Modified — Added print:save-certificate IPC handler
└── preload.js                  ← Modified — Exposed saveCertificate API
```

---

## 📄 INVOICE LAYOUT NOTES

The invoice PDF (in `src/utils/helpers.js → generateInvoicePrintHTML`) supports:
- Company logo, GSTIN, address, phone
- Items table with barcode, qty, rate, tax, amount
- Subtotal / discount / GST / grand total
- QR code and PDF417 barcode
- Payment breakdown (split payments)
- Print settings (thermal 58mm/80mm, A4, half-A4)

To add **green leaf border** styling to invoices too, the same SVG border pattern from `certificateTemplate.js` can be injected into the invoice HTML template.

---

*Contact: 7984626447 | Dinesh Global Enterprises Pvt Ltd*

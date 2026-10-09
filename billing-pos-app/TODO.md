# TODO - Shri Ram Clothings Billing System Upgrade

## Step 1: Global Rename (branding + installer)
- [ ] Replace remaining old branding strings in React UI (app title/login/dashboard/invoice header/settings/about)
- [ ] Update Electron menu/about title text
- [ ] Update package.json build names + NSIS shortcutName
- [ ] Ensure invoice default company name uses “Shri Ram Clothings Billing System”

## Step 2: Invoice Print/Download Fix (no feature break)
- [ ] Split helper functions: download ONLY vs print ONLY
- [ ] Update POS buttons: “Download PDF” -> downloadInvoicePDF; “Print Bill” -> printInvoicePDF
- [ ] Update Invoices page print buttons similarly

## Step 3: Professional Invoice PDF Redesign
- [ ] Rewrite generateInvoicePDF layout (A4 + thermal)
- [ ] Ensure correct alignment, spacing, table structure, GST sections, totals block
- [ ] Add required bill content: shop details, invoice no, date/time, customer details, product details w/ barcode/SKU, discount, GST, grand total, payment method, cashier name, thank you

## Step 4: ₹ Currency Rendering Fix
- [ ] Add Unicode-safe font handling for jsPDF output
- [ ] Verify outputs show “₹450.00” (not ¹450.00) in A4 and thermal

## Step 5: DB Schema Upgrade (for later features)
- [ ] Bump IndexedDB version and add customerBarcode + required fields for products
- [ ] Create customerBarcode on customer creation (and migration for existing customers)

## Step 6: Customer Barcode Scan -> Customer Detection (later)
- [ ] Implement scan flow and matching against stored customerBarcode
- [ ] Auto-load customer profile + purchase history + last visit

## Step 7: Thermal Printer + TSC TE200 direct printing (later)
- [ ] Add direct ESC/POS 58/80 printing
- [ ] Add TSC TE200 25×50 label printing

## Step 8: Multi barcode label printing + preview (later)
- [ ] Upgrade BarcodePrinter for multiple batches and label preview

## Step 9: Shreyans scanner improvements (later)
- [ ] Improve keyboard-mode scanner heuristics and auto-add to cart

## Step 10: Reports/Analytics/Exports (later)
- [ ] Upgrade analytics filters + calculations (growth, best categories)
- [ ] Add Excel (.xlsx) / CSV / PDF exports for required datasets

## Step 11: Performance hardening
- [ ] Validate no freezes, fast invoice generation, low RAM


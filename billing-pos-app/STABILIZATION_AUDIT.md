# Billing POS – Stabilization Audit (Work-in-progress)

This document tracks the **professional stabilization process** for this desktop POS app (Electron + React + IndexedDB).

## 1) Goals
- Keep existing features (no rewrites).
- Systematically test every workflow and fix root causes.
- Add diagnostics + automated tests to prevent regressions.
- Improve performance + reliability until “production-ready”.

## 2) Current stack summary
- Desktop: **Electron**
- UI: **React (CRA)**
- Storage: **IndexedDB** via `idb` (`src/db/db.js`)
- Invoices: `jsPDF` + HTML print for Electron (`window.electronAPI.printHTML` / `savePDF`)
- Barcodes: `JsBarcode` (generation), `Quagga` (camera scan), keyboard-emulation scanner heuristics in POS page
- Exports: CSV/Excel/PDF (`src/utils/exportUtils.js`, `src/utils/helpers.js`)

## 3) Test matrix (to be executed feature-by-feature)
For each item: **Test → Reproduce → Root cause → Fix → Retest → Regression test**.

### 3.1 Authentication / Session
- Login (default + invalid password)
- Lock screen PIN
- Logout

### 3.2 Inventory / Products
- Add product (name/sku/barcode/price/stock/tax)
- Edit product
- Delete product
- Categories add/select/filter
- Low stock alerts
- Export inventory: CSV / Excel / PDF

### 3.3 POS / Billing
- Search by name / SKU / barcode
- Add to cart, increment qty, decrement qty, remove
- Edit price in cart
- Discount %, GST%, mixed GST per item
- Total calculations (rounding)
- Payment modes + status (Paid/Unpaid)
- Save invoice

### 3.4 Invoices
- List/filter/search
- View details
- Returns (refund invoice correctness)
- Invoice download (PDF)
- Invoice print (A4 + Thermal)

### 3.5 Customers
- Create/edit customer
- Link invoice to customer
- Customer history
- Customer barcode flows (scan old invoice barcode → load customer)

### 3.6 Reports / Analytics
- Today / 7d / 30d / 90d / 6m / 1y / custom ranges
- Revenue totals (exclude refunds, exclude cancelled)
- Top products/customers/categories
- Exports: CSV / Excel / PDF

### 3.7 Printing / Hardware
- Printer list detection
- Print invoice: default printer + select printer
- Thermal formatting
- Barcode label print (TSC TE200 25×50mm)
- Scanner reliability: focus handling, debounce, duplicate scans

## 4) Findings & fixes log

### Fixed
1. **Build / Excel export broke production builds**
   - Symptom: `npm run build` failed with `xlsx does not contain a default export`.
   - Fix: switch to `import * as XLSX from 'xlsx'` and clean ESLint warning.
   - Files: `src/utils/exportUtils.js`

### Open issues (to triage next)
- [ ] Verify POS “click-to-add” and scanner flows with realistic data and keyboard-emulation scanner timings.
- [ ] Validate invoice print vs download flows in Electron build (ensure “Print” does not trigger download).
- [ ] Verify return/refund math (tax/discount handling) and reporting exclusions.
- [ ] Verify barcode label printing workflow for TSC TE200 (25×50mm) + margins + sharpness.

## 5) Next actions
- Add centralized logging + crash-safe error boundaries.
- Add automated unit tests for totals/analytics and integration tests for key workflows.
- Triage and fix issues module-by-module, updating this document.

